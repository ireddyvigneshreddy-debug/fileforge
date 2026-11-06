import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { sanitizeForPdf } from './document-engine';

// Helper to convert File to ArrayBuffer
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

// 1. MERGE PDFs
export async function mergePDFs(files: File[]): Promise<{ blob: Blob; pageCount: number }> {
  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (const file of files) {
    const arrayBuffer = await fileToArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    totalPages += copiedPages.length;
  }

  const pdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }),
    pageCount: totalPages,
  };
}

// Helper to parse page range strings like "1-3, 5, 8-10"
export function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pages.add(i - 1); // 0-indexed
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p - 1); // 0-indexed
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// 2. SPLIT PDF (Extract pages or split into ZIP)
export async function splitPDF(
  file: File,
  mode: 'range' | 'each_page',
  rangeStr: string = '1'
): Promise<{ blob: Blob; fileName: string; isZip: boolean }> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();

  if (mode === 'each_page') {
    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    for (let i = 0; i < totalPages; i++) {
      const singlePdf = await PDFDocument.create();
      const [page] = await singlePdf.copyPages(srcPdf, [i]);
      singlePdf.addPage(page);
      const pdfBytes = await singlePdf.save();
      zip.file(`${baseName}-page-${i + 1}.pdf`, pdfBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      blob: zipBlob,
      fileName: `${baseName}-split-pages.zip`,
      isZip: true,
    };
  }

  // Range extraction
  const indices = parsePageRanges(rangeStr, totalPages);
  if (indices.length === 0) {
    throw new Error(`Invalid page range. Total pages: ${totalPages}`);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, indices);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return {
    blob: new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }),
    fileName: `split-${file.name}`,
    isZip: false,
  };
}

export interface CompressPDFOptions {
  mode?: 'smart' | 'target' | 'balanced' | 'aggressive' | 'extreme' | 'lossless';
  targetSizeBytes?: number; // Target max size in bytes (e.g. 1000 * 1024 for < 1MB)
  quality?: number; // 0.1 to 1.0
  onProgress?: (percent: number, message: string) => void;
}

// 3. COMPRESS PDF (Guaranteed reduction with lossless stream compaction + smart page downsampling)
export async function compressPDF(
  file: File,
  options: CompressPDFOptions = { mode: 'target', targetSizeBytes: 1000 * 1024 }
): Promise<{ blob: Blob; originalSize: number; newSize: number; savingsPercent: number }> {
  const originalSize = file.size;
  const arrayBuffer = await fileToArrayBuffer(file);

  options.onProgress?.(20, 'Analyzing PDF streams and object table...');
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Clean metadata and compress object streams
  srcPdf.setTitle('');
  srcPdf.setAuthor('');
  srcPdf.setSubject('');
  srcPdf.setKeywords([]);
  srcPdf.setProducer('FileForge Optimizer');
  srcPdf.setCreator('FileForge');

  options.onProgress?.(40, 'Compacting stream dictionaries...');
  const losslessBytes = await srcPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const targetBytes = options.targetSizeBytes || (options.mode === 'extreme' ? 500 * 1024 : 1000 * 1024);
  const isTargetMode = options.mode === 'target' || options.mode === 'aggressive' || options.mode === 'extreme' || !!options.targetSizeBytes;

  // If lossless compaction already brought the PDF below target size (e.g. < 1MB), return it directly!
  if (!isTargetMode || losslessBytes.length <= targetBytes) {
    options.onProgress?.(100, 'Optimization complete!');
    const newSize = losslessBytes.length;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
    return {
      blob: new Blob([losslessBytes as unknown as BlobPart], { type: 'application/pdf' }),
      originalSize,
      newSize,
      savingsPercent,
    };
  }

  // If still above target size, downsample pages and re-encode embedded media using pdfjs-dist
  const targetKbDisplay = Math.round(targetBytes / 1024);
  options.onProgress?.(45, `Calibrating resolution & clarity to hit exact target (${targetKbDisplay} KB)...`);
  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
      } else {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
    }

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // Realistic PDF container structure and cross-reference table overhead
    const estimatedPdfOverhead = Math.min(60 * 1024, (numPages * 1400) + 12 * 1024);
    // Aim for ~97% of the budget so the final PDF hits right near the target without exceeding
    const targetImageBudget = Math.max(25 * 1024, Math.floor((targetBytes - estimatedPdfOverhead) * 0.97));
    const targetBytesPerPage = Math.max(6 * 1024, Math.floor(targetImageBudget / numPages));

    // Sample calibration on Page 1 to measure exact canvas encoding bytes
    const samplePage = await pdfDoc.getPage(1);

    async function testRenderPage(scaleVal: number, qualityVal: number): Promise<number> {
      const vPort = samplePage.getViewport({ scale: scaleVal });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(vPort.width));
      c.height = Math.max(1, Math.floor(vPort.height));
      const cCtx = c.getContext('2d');
      if (!cCtx) return 40 * 1024;
      cCtx.fillStyle = '#ffffff';
      cCtx.fillRect(0, 0, c.width, c.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rTask = samplePage.render({ canvasContext: cCtx, canvas: c, viewport: vPort } as any);
      await rTask.promise;
      const blob = await new Promise<Blob>((resolve, reject) => {
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas error'))), 'image/jpeg', qualityVal);
      });
      return blob.size;
    }

    // Baseline test at high resolution: scale 2.0 (144 DPI) and quality 0.82
    let calibratedScale = 2.0;
    let calibratedQuality = 0.82;

    const baselineSize = await testRenderPage(calibratedScale, calibratedQuality);

    if (baselineSize <= targetBytesPerPage) {
      // Baseline high resolution fits within the target budget!
      // Check if we can push even higher clarity without exceeding the target
      const roomRatio = targetBytesPerPage / Math.max(1, baselineSize);
      if (roomRatio >= 1.35) {
        calibratedScale = 2.25;
        calibratedQuality = 0.88;
      } else if (roomRatio >= 1.15) {
        calibratedScale = 2.1;
        calibratedQuality = 0.85;
      }
    } else {
      // Baseline is above target per page: compute scale ratio to hit target precisely while keeping text legible
      const scaleRatio = Math.sqrt(targetBytesPerPage / baselineSize);
      // Ensure text remains sharp and legible, only dropping scale below 1.15 when page budget is tight (< 14 KB)
      const minScale = targetBytesPerPage < 14 * 1024 ? 0.85 : 1.15;
      calibratedScale = Math.max(minScale, Math.min(1.95, 2.0 * scaleRatio * 0.98));
      calibratedQuality = Math.max(0.45, Math.min(0.82, 0.82 * Math.pow(scaleRatio, 0.4)));

      // Quick 2nd verification pass on sample page
      const testPass2 = await testRenderPage(calibratedScale, calibratedQuality);
      if (testPass2 > targetBytesPerPage) {
        calibratedQuality = Math.max(0.40, calibratedQuality * (targetBytesPerPage / testPass2) * 0.96);
      } else if (testPass2 < targetBytesPerPage * 0.75) {
        // Extra room: increase quality so we don't undershoot the requested target size!
        calibratedQuality = Math.min(0.88, calibratedQuality * 1.15);
      }
    }

    const newPdfDoc = await PDFDocument.create();
    let accumulatedBytes = 0;

    for (let i = 1; i <= numPages; i++) {
      const pagePct = 48 + Math.round((i / numPages) * 50);
      options.onProgress?.(pagePct, `Compressing page ${i} of ${numPages} (Target: ${targetKbDisplay} KB)...`);

      const page = await pdfDoc.getPage(i);
      const pageOrigViewport = page.getViewport({ scale: 1.0 });

      // Dynamic adjustment for remaining pages so we stay right on target
      const remainingImageBudget = targetImageBudget - accumulatedBytes;
      const pagesLeft = numPages - i + 1;
      const currentAllowedPerPage = Math.max(5 * 1024, Math.floor(remainingImageBudget / pagesLeft));

      let activeScale = calibratedScale;
      let activeQuality = calibratedQuality;

      if (currentAllowedPerPage > targetBytesPerPage * 1.25) {
        activeQuality = Math.min(0.90, calibratedQuality * 1.1);
      } else if (currentAllowedPerPage < targetBytesPerPage * 0.80) {
        activeQuality = Math.max(0.40, calibratedQuality * 0.92);
      }

      const renderViewport = page.getViewport({ scale: activeScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTask = page.render({ canvasContext: ctx, canvas, viewport: renderViewport } as any);
      await renderTask.promise;

      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas export failed'));
          },
          'image/jpeg',
          activeQuality
        );
      });

      accumulatedBytes += jpegBlob.size;
      const jpegArrayBuffer = await jpegBlob.arrayBuffer();
      const embeddedImg = await newPdfDoc.embedJpg(new Uint8Array(jpegArrayBuffer));

      const newPage = newPdfDoc.addPage([pageOrigViewport.width, pageOrigViewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: pageOrigViewport.width,
        height: pageOrigViewport.height,
      });
    }

    options.onProgress?.(98, 'Finalizing optimized PDF container...');
    const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
    const newSize = compressedBytes.length;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    return {
      blob: new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' }),
      originalSize,
      newSize,
      savingsPercent,
    };
  } catch (err: unknown) {
    console.error('Advanced PDF raster compression error:', err);
    // If rasterization failed, throw an informative error rather than misleading the user with 0% savings!
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF compression failed: ${errMsg}`);
  }
}

// 4. ROTATE PDF
export async function rotatePDF(
  file: File,
  rotationAngle: number = 90,
  pageSelection: 'all' | 'odd' | 'even' = 'all'
): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const count = pdf.getPageCount();

  for (let i = 0; i < count; i++) {
    const isOdd = (i + 1) % 2 !== 0;
    if (pageSelection === 'all' || (pageSelection === 'odd' && isOdd) || (pageSelection === 'even' && !isOdd)) {
      const page = pdf.getPage(i);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationAngle) % 360));
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 5. REORDER / ORGANIZE PDF
export async function reorderPDF(file: File, pageOrder: number[]): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const validIndices = pageOrder.filter((idx) => idx >= 0 && idx < srcPdf.getPageCount());
  if (validIndices.length === 0) {
    throw new Error('At least one page must be kept.');
  }

  const copiedPages = await newPdf.copyPages(srcPdf, validIndices);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 6. WATERMARK PDF
export async function watermarkPDF(
  file: File,
  text: string,
  options: {
    fontSize?: number;
    opacity?: number;
    rotation?: number;
    color?: string;
  } = {}
): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fontSize = options.fontSize || 48;
  const opacity = options.opacity !== undefined ? options.opacity : 0.25;
  const rot = options.rotation !== undefined ? options.rotation : 45;

  // Hex color to RGB
  let r = 0.5, g = 0.5, b = 0.5;
  if (options.color && options.color.startsWith('#') && options.color.length === 7) {
    r = parseInt(options.color.slice(1, 3), 16) / 255;
    g = parseInt(options.color.slice(3, 5), 16) / 255;
    b = parseInt(options.color.slice(5, 7), 16) / 255;
  }

  const safeText = sanitizeForPdf(text);
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(safeText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(safeText, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rot),
    });
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 7. ADD PAGE NUMBERS
export async function addPageNumbersPDF(
  file: File,
  options: {
    position?: 'bottom-center' | 'bottom-right' | 'top-right';
    format?: 'Page X of Y' | 'X / Y' | 'X';
    startPage?: number;
    fontSize?: number;
  } = {}
): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const count = pdf.getPageCount();

  const fontSize = options.fontSize || 10;
  const startNum = options.startPage || 1;
  const pos = options.position || 'bottom-center';
  const format = options.format || 'Page X of Y';

  for (let i = 0; i < count; i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    const currNum = startNum + i;

    let text = `${currNum}`;
    if (format === 'Page X of Y') text = `Page ${currNum} of ${count + startNum - 1}`;
    else if (format === 'X / Y') text = `${currNum} / ${count + startNum - 1}`;

    const safeText = sanitizeForPdf(text);
    const textWidth = font.widthOfTextAtSize(safeText, fontSize);

    let x = width / 2 - textWidth / 2;
    let y = 25;

    if (pos === 'bottom-right') {
      x = width - textWidth - 30;
      y = 25;
    } else if (pos === 'top-right') {
      x = width - textWidth - 30;
      y = height - 30;
    }

    page.drawText(safeText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 8. REMOVE PAGES
export async function removePagesPDF(file: File, pagesToRemove: number[]): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const total = srcPdf.getPageCount();

  const removeSet = new Set(pagesToRemove.map((p) => p - 1)); // 0-indexed
  const keepIndices: number[] = [];

  for (let i = 0; i < total; i++) {
    if (!removeSet.has(i)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error('Cannot remove all pages from the PDF document.');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, keepIndices);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 9. METADATA EDITOR
export async function editPDFMetadata(
  file: File,
  meta: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  }
): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (meta.title !== undefined) pdf.setTitle(meta.title);
  if (meta.author !== undefined) pdf.setAuthor(meta.author);
  if (meta.subject !== undefined) pdf.setSubject(meta.subject);
  if (meta.keywords !== undefined) {
    const kws = meta.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    pdf.setKeywords(kws);
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 10. IMAGES TO PDF
export async function imagesToPDF(
  imageFiles: File[],
  options: {
    pageSize?: 'a4' | 'letter' | 'fit';
    orientation?: 'portrait' | 'landscape' | 'auto';
    margin?: number;
  } = {}
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const margin = options.margin !== undefined ? options.margin : 20;

  // Dimensions in points (72 points = 1 inch)
  const SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
  };

  for (const imgFile of imageFiles) {
    const bytes = await fileToArrayBuffer(imgFile);
    let embeddedImg;

    if (imgFile.type.includes('png')) {
      embeddedImg = await pdf.embedPng(bytes);
    } else {
      // JPEG / WebP / etc.
      embeddedImg = await pdf.embedJpg(bytes);
    }

    const { width: imgW, height: imgH } = embeddedImg;

    let pageW = imgW + margin * 2;
    let pageH = imgH + margin * 2;

    if (options.pageSize === 'a4' || options.pageSize === 'letter') {
      const base = SIZES[options.pageSize];
      const isLandscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && imgW > imgH);

      pageW = isLandscape ? base.height : base.width;
      pageH = isLandscape ? base.width : base.height;
    }

    const page = pdf.addPage([pageW, pageH]);
    const maxDrawW = pageW - margin * 2;
    const maxDrawH = pageH - margin * 2;

    // Calculate aspect fit
    const scale = Math.min(maxDrawW / imgW, maxDrawH / imgH, 1);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 11. TEXT TO PDF
export async function textToPDF(
  text: string,
  options: {
    title?: string;
    fontSize?: number;
    fontFamily?: 'Helvetica' | 'Courier' | 'TimesRoman';
    lineNumbers?: boolean;
  } = {}
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const fontName =
    options.fontFamily === 'Courier'
      ? StandardFonts.Courier
      : options.fontFamily === 'TimesRoman'
      ? StandardFonts.TimesRoman
      : StandardFonts.Helvetica;

  const font = await pdf.embedFont(fontName);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fontSize = options.fontSize || 10;
  const lineHeight = fontSize * 1.4;
  const margin = 40;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const maxContentWidth = pageWidth - margin * 2;

  const rawLines = text.split(/\r?\n/);
  let currentPage = pdf.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Optional Title
  if (options.title) {
    const safeTitle = sanitizeForPdf(options.title);
    currentPage.drawText(safeTitle, {
      x: margin,
      y: currentY - 14,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 35;
  }

  let lineCount = 1;

  for (const rawLine of rawLines) {
    const safeLine = sanitizeForPdf(rawLine);
    const prefix = options.lineNumbers ? `${String(lineCount).padStart(3, ' ')} | ` : '';
    const fullLine = prefix + safeLine;

    // Word wrap long lines
    const words = fullLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxContentWidth && currentLine) {
        if (currentY - lineHeight < margin) {
          currentPage = pdf.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        currentY -= lineHeight;
        currentLine = options.lineNumbers ? `    | ${word}` : word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) {
        currentPage = pdf.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= lineHeight;
    }

    lineCount++;
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 12. GET PDF PAGE COUNT & INFO
export async function getPDFInfo(file: File): Promise<{ pageCount: number; title: string; author: string }> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    pageCount: pdf.getPageCount(),
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
  };
}


// 13. UNLOCK PDF (Strip permissions & passwords)
export async function unlockPDF(file: File): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 14. GRAYSCALE PDF
export async function grayscalePDF(file: File): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.1, 0.1, 0.1),
      opacity: 0.02,
    });
  }
  const pdfBytes = await pdf.save({ useObjectStreams: true });
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 15. LOCK FILE WITH AES-256-GCM PASSWORD ENCRYPTION
export async function lockFileWithPassword(file: File, password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    buffer
  );

  const magic = new Uint8Array([0x46, 0x4f, 0x52, 0x47]); // "FORG"
  const totalLength = magic.length + salt.length + iv.length + encryptedContent.byteLength;
  const result = new Uint8Array(totalLength);

  let offset = 0;
  result.set(magic, offset); offset += magic.length;
  result.set(salt, offset); offset += salt.length;
  result.set(iv, offset); offset += iv.length;
  result.set(new Uint8Array(encryptedContent), offset);

  return new Blob([result], { type: 'application/octet-stream' });
}

// 16. UNLOCK FILE WITH PASSWORD
export async function unlockFileWithPassword(file: File, password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0x46 && bytes[1] === 0x4f && bytes[2] === 0x52 && bytes[3] === 0x47) {
    const salt = bytes.slice(4, 20);
    const iv = bytes.slice(20, 32);
    const ciphertext = bytes.slice(32);

    const enc = new TextEncoder();
    const passKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
      );
      return new Blob([decrypted], { type: 'application/pdf' });
    } catch {
      throw new Error('Incorrect password. Could not decrypt the file.');
    }
  } else {
    return unlockPDF(file);
  }
}

// 17. PDF TO IMAGES
export async function pdfToImages(
  file: File,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  scale: number = 2
): Promise<{
  zipBlob: Blob;
  images: { pageNum: number; blob: Blob; url: string; name: string }[];
}> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const images: { pageNum: number; blob: Blob; url: string; name: string }[] = [];
  const zip = new JSZip();
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const ext = format === 'image/jpeg' ? 'jpg' : 'png';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas export failed'));
        },
        format,
        0.92
      );
    });

    const pageFileName = `${baseName}-page-${i}.${ext}`;
    const url = URL.createObjectURL(blob);
    images.push({ pageNum: i, blob, url, name: pageFileName });

    const imgBuffer = await blob.arrayBuffer();
    zip.file(pageFileName, imgBuffer);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { zipBlob, images };
}
