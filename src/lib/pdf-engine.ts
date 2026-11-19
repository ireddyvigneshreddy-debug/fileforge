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

import { CompressionWorkerBridge, EncodeTaskResult } from './compression-worker';

export interface CompressPDFOptions {
  mode?: 'smart' | 'target' | 'balanced' | 'aggressive' | 'extreme' | 'lossless' | 'quality';
  targetSizeBytes?: number; // Target max size in bytes (e.g. 1000 * 1024 for < 1MB)
  quality?: number; // 0.1 to 1.0
  onProgress?: (percent: number, message: string) => void;
  signal?: AbortSignal;
  exactPadding?: boolean; // Strictly opt-in byte alignment (default false)
}

/**
 * Exact byte alignment for PDFs using compliant trailing PDF comments.
 * The comment syntax '% FF-Align: ...' is ignored by PDF parsers and visual viewers,
 * but ensures the output file matches the exact byte count specified by the user.
 */
function alignPdfBytesToTarget(bytes: Uint8Array, targetBytes: number): Uint8Array {
  if (bytes.length >= targetBytes) return bytes;
  const diff = targetBytes - bytes.length;
  if (diff <= 0) return bytes;

  let padString = '';
  if (diff >= 16) {
    const prefix = '\n% FF-Align: ';
    const padLen = diff - prefix.length - 1; // 1 for trailing \n
    if (padLen >= 0) {
      padString = prefix + '0'.repeat(padLen) + '\n';
    }
  } else if (diff >= 4) {
    const prefix = '\n% ';
    const padLen = diff - prefix.length - 1;
    padString = prefix + '0'.repeat(padLen) + '\n';
  } else {
    padString = ' '.repeat(diff);
  }

  const padBytes = new TextEncoder().encode(padString);
  if (padBytes.length !== diff) {
    const adjusted = new Uint8Array(diff);
    adjusted.fill(0x20); // space padding
    adjusted.set(padBytes.subarray(0, diff));
    const aligned = new Uint8Array(targetBytes);
    aligned.set(bytes, 0);
    aligned.set(adjusted, bytes.length);
    return aligned;
  }

  const aligned = new Uint8Array(targetBytes);
  aligned.set(bytes, 0);
  aligned.set(padBytes, bytes.length);
  return aligned;
}

// 3. COMPRESS PDF (Guaranteed reduction with lossless stream compaction + fast adaptive downsampling)
export async function compressPDF(
  file: File,
  options: CompressPDFOptions = { mode: 'target', targetSizeBytes: 1000 * 1024 }
): Promise<{ blob: Blob; originalSize: number; newSize: number; savingsPercent: number }> {
  options.signal?.throwIfAborted();
  const originalSize = file.size;
  const arrayBuffer = await fileToArrayBuffer(file);
  options.signal?.throwIfAborted();

  const targetBytes = options.targetSizeBytes || (options.mode === 'extreme' ? 500 * 1024 : 1000 * 1024);
  const isTargetMode =
    options.mode === 'target' ||
    options.mode === 'aggressive' ||
    options.mode === 'extreme' ||
    (options.mode !== 'balanced' && options.mode !== 'lossless' && options.mode !== 'smart' && !!options.targetSizeBytes);

  // Skip wasted full-file lossless re-save on large/image-heavy PDFs:
  // Lossless object-stream compaction typically saves 5-15% at most.
  // Running srcPdf.save() on a 20-100MB file takes seconds, spikes hundreds of MB of RAM,
  // and will never reduce a large PDF to a small target (e.g. 30MB down to 1MB).
  // Only attempt lossless pass when explicitly requested, for small files in smart mode,
  // or when the file is already near or below the target size.
  const shouldAttemptLossless =
    options.mode === 'lossless' ||
    (options.mode === 'smart' && originalSize <= 8 * 1024 * 1024) ||
    (isTargetMode && (originalSize <= targetBytes || (originalSize <= 5 * 1024 * 1024 && originalSize <= targetBytes * 1.15)));

  if (shouldAttemptLossless) {
    options.onProgress?.(15, 'Analyzing PDF streams and object table...');
    const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    options.signal?.throwIfAborted();

    // Clean metadata and compress object streams
    srcPdf.setTitle('');
    srcPdf.setAuthor('');
    srcPdf.setSubject('');
    srcPdf.setKeywords([]);
    srcPdf.setProducer('FileForge Optimizer');
    srcPdf.setCreator('FileForge');

    options.onProgress?.(30, 'Compacting stream dictionaries...');
    const losslessBytes = await srcPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    options.signal?.throwIfAborted();

    // If lossless compaction already brought the PDF below target size, return it directly!
    if (isTargetMode && losslessBytes.length <= targetBytes) {
      options.onProgress?.(100, 'Optimization complete!');
      let finalLosslessBytes: Uint8Array = new Uint8Array(losslessBytes);

      // Only pad if strictly opted in
      if (options.exactPadding && targetBytes && finalLosslessBytes.length < targetBytes && originalSize > targetBytes) {
        finalLosslessBytes = alignPdfBytesToTarget(finalLosslessBytes, targetBytes);
      }

      const newSize = finalLosslessBytes.length;
      const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
      return {
        blob: new Blob([finalLosslessBytes as unknown as BlobPart], { type: 'application/pdf' }),
        originalSize,
        newSize,
        savingsPercent,
      };
    }

    // If lossless mode was requested or smart mode already achieved significant savings (> 12%):
    if (options.mode === 'lossless' || (options.mode === 'smart' && losslessBytes.length < originalSize * 0.88)) {
      options.onProgress?.(100, 'Optimization complete!');
      const finalLosslessBytes = new Uint8Array(losslessBytes);
      const newSize = finalLosslessBytes.length;
      const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
      return {
        blob: new Blob([finalLosslessBytes as unknown as BlobPart], { type: 'application/pdf' }),
        originalSize,
        newSize,
        savingsPercent,
      };
    }
  }

  // Downsample pages and re-encode embedded media using pipelined worker & bounded memory
  const targetKbDisplay = Math.round(targetBytes / 1024);
  options.onProgress?.(
    40,
    isTargetMode ? `Calibrating resolution to hit target (${targetKbDisplay} KB)...` : 'Optimizing page resolutions...'
  );

  const workerBridge = new CompressionWorkerBridge();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any = null;

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
    pdfDoc = await loadingTask.promise;
    options.signal?.throwIfAborted();
    const numPages = pdfDoc.numPages;

    // Accurate PDF container structural overhead (approx 380 bytes per page + 1500 bytes for catalog & info)
    const estimatedPdfOverhead = Math.floor(numPages * 380 + 1500);
    // Aim for 98% of remaining budget to maximize real visual sharpness and text clarity
    const targetImageBudget = Math.max(15 * 1024, Math.floor((targetBytes - estimatedPdfOverhead) * 0.98));
    const targetBytesPerPage = Math.max(4 * 1024, Math.floor(targetImageBudget / numPages));

    // Inspect first page to determine page dimensions
    const firstPage = await pdfDoc.getPage(1);
    const firstVp = firstPage.getViewport({ scale: 1.0 });
    const pageArea = Math.max(1, firstVp.width * firstVp.height);
    firstPage.cleanup(); // Clean up first inspection page immediately

    // Analytical calculation of optimal scale and quality
    let activeScale: number;
    let activeQuality: number;

    if (!isTargetMode && options.quality !== undefined) {
      // Quality-based mode
      activeQuality = Math.max(0.25, Math.min(0.95, options.quality));
      activeScale = Math.max(0.75, Math.min(1.8, 0.80 + options.quality * 0.85));
    } else {
      // Target KB mode: calculate optimal scale based on pixel budget (~0.10 bytes/pixel for JPEG at quality 0.75)
      const targetScale = Math.sqrt((targetBytesPerPage * 9.5) / pageArea);
      activeScale = Math.max(0.65, Math.min(1.8, targetScale));
      activeQuality = Math.max(0.38, Math.min(0.85, 0.50 + 0.35 * (activeScale / 1.8)));
    }

    const newPdfDoc = await PDFDocument.create();
    let accumulatedBytes = 0;

    // Hard ceiling on max pixel dimension (1400px gives ultra-sharp 150-200 DPI while preventing multi-megabyte canvas allocations)
    const MAX_PAGE_PIXEL_DIM = 1400;

    // Single reusable canvas for rendering when OffscreenCanvas is unavailable
    let reusableCanvas: HTMLCanvasElement | null = null;

    // Pipelining queue: Keep at most 2 rendered pages encoding in worker while next is rendering
    interface InFlightPage {
      pageWidth: number;
      pageHeight: number;
      encodePromise: Promise<EncodeTaskResult>;
    }
    const inFlight: InFlightPage[] = [];
    const CONCURRENCY = 2;

    const drainOnePage = async () => {
      const item = inFlight.shift();
      if (!item) return;
      const { buffer, size } = await item.encodePromise;
      accumulatedBytes += size;
      const embeddedImg = await newPdfDoc.embedJpg(new Uint8Array(buffer));
      const newPage = newPdfDoc.addPage([item.pageWidth, item.pageHeight]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: item.pageWidth,
        height: item.pageHeight,
      });
    };

    for (let i = 1; i <= numPages; i++) {
      options.signal?.throwIfAborted();

      const pagePct = 42 + Math.round((i / numPages) * 52);
      options.onProgress?.(
        pagePct,
        `Compressing page ${i} of ${numPages}${isTargetMode ? ` (Target: ${targetKbDisplay} KB)` : ''}...`
      );

      const page = await pdfDoc.getPage(i);
      const pageOrigViewport = page.getViewport({ scale: 1.0 });

      // Dynamic closed-loop adjustment for remaining pages in target mode
      if (isTargetMode && i > 1) {
        const pagesLeft = numPages - i + 1;
        const remainingBudget = Math.max(3 * 1024 * pagesLeft, targetImageBudget - accumulatedBytes);
        const targetForThisPage = Math.max(3 * 1024, Math.floor(remainingBudget / pagesLeft));

        const avgActualPerPage = accumulatedBytes / (i - 1);
        const dynamicRatio = targetForThisPage / Math.max(1, avgActualPerPage);
        activeScale = Math.max(0.60, Math.min(1.8, activeScale * Math.pow(dynamicRatio, 0.45)));
        activeQuality = Math.max(0.35, Math.min(0.85, activeQuality * Math.pow(dynamicRatio, 0.25)));
      }

      // Constrain effective scale so neither canvas width nor height exceeds MAX_PAGE_PIXEL_DIM
      const maxDim = Math.max(pageOrigViewport.width, pageOrigViewport.height);
      const maxAllowedScale = MAX_PAGE_PIXEL_DIM / Math.max(1, maxDim);
      const effectiveScale = Math.min(activeScale, Math.max(0.35, maxAllowedScale));

      const renderViewport = page.getViewport({ scale: effectiveScale });
      const renderW = Math.max(1, Math.floor(renderViewport.width));
      const renderH = Math.max(1, Math.floor(renderViewport.height));

      let bitmap: ImageBitmap;

      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(renderW, renderH);
        const ctx = offscreen.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, renderW, renderH);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderTask = page.render({ canvasContext: ctx, viewport: renderViewport, intent: 'display' } as any);
        await renderTask.promise;
        bitmap = offscreen.transferToImageBitmap();
      } else {
        if (!reusableCanvas) reusableCanvas = document.createElement('canvas');
        reusableCanvas.width = renderW;
        reusableCanvas.height = renderH;
        const ctx = reusableCanvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, renderW, renderH);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderTask = page.render({ canvasContext: ctx, canvas: reusableCanvas, viewport: renderViewport, intent: 'display' } as any);
        await renderTask.promise;
        bitmap = await createImageBitmap(reusableCanvas);
      }

      // Clean up pdfjs page structures from memory immediately
      page.cleanup();

      // Dispatch async encoding off the main thread to Web Worker
      const encodePromise = workerBridge.encodeImageBitmap(bitmap, {
        width: renderW,
        height: renderH,
        quality: activeQuality,
        mimeType: 'image/jpeg',
        signal: options.signal,
      });

      inFlight.push({
        pageWidth: pageOrigViewport.width,
        pageHeight: pageOrigViewport.height,
        encodePromise,
      });

      if (inFlight.length >= CONCURRENCY) {
        await drainOnePage();
      }
    }

    // Drain remaining in-flight pages
    while (inFlight.length > 0) {
      await drainOnePage();
    }

    options.signal?.throwIfAborted();
    options.onProgress?.(98, 'Finalizing optimized PDF container...');
    const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
    let finalBytes: Uint8Array = new Uint8Array(compressedBytes);

    // Only align bytes if strictly opted in
    if (options.exactPadding && isTargetMode && targetBytes && finalBytes.length < targetBytes && originalSize > targetBytes) {
      finalBytes = alignPdfBytesToTarget(finalBytes, targetBytes);
    }

    const newSize = finalBytes.length;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    return {
      blob: new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' }),
      originalSize,
      newSize,
      savingsPercent,
    };
  } catch (err: unknown) {
    if (options.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }
    console.error('Advanced PDF raster compression error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF compression failed: ${errMsg}`);
  } finally {
    workerBridge.terminate();
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch (e) {
        console.warn('PDFDoc destroy fallback:', e);
      }
    }
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

export interface ReorderPagePlanItem {
  type: 'original' | 'image';
  originalIndex?: number;
  imageFile?: File;
  rotation?: number;
}

// Helper to convert any image format (JPG, PNG, WebP) to PDF-compatible bytes
async function prepareImageBytesForPdf(file: File): Promise<{ bytes: Uint8Array; isPng: boolean }> {
  if (file.type.includes('png')) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), isPng: true };
  }
  if (file.type.includes('jpeg') || file.type.includes('jpg')) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), isPng: false };
  }
  // Convert WebP / GIF / etc. via canvas to high-res JPEG
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bmp, 0, 0);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.94));
        if (blob) {
          return { bytes: new Uint8Array(await blob.arrayBuffer()), isPng: false };
        }
      }
    } catch (e) {
      console.warn('Image rasterization fallback:', e);
    }
  }
  return { bytes: new Uint8Array(await file.arrayBuffer()), isPng: false };
}

// 5. REORDER / ORGANIZE PDF (Supports reordering, rotating, and replacing/inserting images from device)
export async function reorderPDF(
  file: File,
  pageOrder: (number | ReorderPagePlanItem)[],
  pageRotations?: number[] | Record<number, number>
): Promise<Blob> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  // Get default page dimensions from source PDF (fallback to standard A4)
  const firstSrcPage = srcPdf.getPages()[0];
  const defaultPageW = firstSrcPage ? firstSrcPage.getWidth() : 595.28;
  const defaultPageH = firstSrcPage ? firstSrcPage.getHeight() : 841.89;

  // Normalize items
  const planItems: ReorderPagePlanItem[] = [];
  pageOrder.forEach((item, i) => {
    if (typeof item === 'number') {
      let rot = 0;
      if (Array.isArray(pageRotations)) rot = pageRotations[i] || 0;
      else if (pageRotations && typeof pageRotations === 'object') rot = pageRotations[item] || 0;
      planItems.push({ type: 'original', originalIndex: item, rotation: rot });
    } else if (item && typeof item === 'object') {
      let rot = item.rotation || 0;
      if (rot === 0) {
        if (Array.isArray(pageRotations)) rot = pageRotations[i] || 0;
        else if (item.originalIndex !== undefined && pageRotations && typeof pageRotations === 'object') {
          rot = pageRotations[item.originalIndex] || 0;
        }
      }
      planItems.push({ ...item, rotation: rot });
    }
  });

  const validItems = planItems.filter((it) => {
    if (it.type === 'original') {
      return it.originalIndex !== undefined && it.originalIndex >= 0 && it.originalIndex < srcPdf.getPageCount();
    }
    if (it.type === 'image') {
      return !!it.imageFile;
    }
    return false;
  });

  if (validItems.length === 0) {
    throw new Error('At least one page must be kept.');
  }

  for (const item of validItems) {
    if (item.type === 'original' && item.originalIndex !== undefined) {
      const [copiedPage] = await newPdf.copyPages(srcPdf, [item.originalIndex]);
      const extraRot = item.rotation || 0;
      if (extraRot) {
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRot + extraRot) % 360));
      }
      newPdf.addPage(copiedPage);
    } else if (item.type === 'image' && item.imageFile) {
      // Embed image selected directly from device
      const { bytes, isPng } = await prepareImageBytesForPdf(item.imageFile);
      const embedded = isPng ? await newPdf.embedPng(bytes) : await newPdf.embedJpg(bytes);

      const imgW = embedded.width;
      const imgH = embedded.height;

      // Fit image neatly inside document bounds
      const margin = 0;
      const pageW = defaultPageW;
      const pageH = defaultPageH;
      const scale = Math.min(pageW / imgW, pageH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const newPage = newPdf.addPage([pageW, pageH]);
      newPage.drawImage(embedded, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH,
        rotate: degrees((item.rotation || 0) % 360),
      });
    }
  }

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

// 10. IMAGES TO PDF (Borderless exact image pages by default, zero white margins)
export async function imagesToPDF(
  imageFiles: File[],
  options: {
    pageSize?: 'a4' | 'letter' | 'fit';
    orientation?: 'portrait' | 'landscape' | 'auto';
    margin?: number;
  } = {}
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const pageSize = options.pageSize || 'fit';
  // Default margin is 0: borderless exact image fit with no white borders
  const margin = options.margin !== undefined ? Math.max(0, options.margin) : 0;

  // Dimensions in points (72 points = 1 inch)
  const SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 },
  };

  for (const imgFile of imageFiles) {
    const { bytes, isPng } = await prepareImageBytesForPdf(imgFile);
    let embeddedImg;

    try {
      embeddedImg = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    } catch {
      // Fallback: rasterize via canvas if direct embedding failed
      if (typeof window !== 'undefined') {
        const bmp = await createImageBitmap(imgFile);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bmp, 0, 0);
          const fallbackBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
          if (fallbackBlob) {
            const fallbackBytes = new Uint8Array(await fallbackBlob.arrayBuffer());
            embeddedImg = await pdf.embedJpg(fallbackBytes);
          }
        }
      }
      if (!embeddedImg) {
        throw new Error(`Failed to process image: ${imgFile.name}`);
      }
    }

    const { width: imgW, height: imgH } = embeddedImg;

    let pageW: number;
    let pageH: number;
    let drawW: number;
    let drawH: number;
    let x: number;
    let y: number;

    if (pageSize === 'fit') {
      // EXACT IMAGE AS PDF - 100% BORDERLESS at standard document scale
      const basePoints = 595.28; // Standard A4 width reference in points
      let naturalW = imgW;
      let naturalH = imgH;

      // If raw image pixel dimensions are large (e.g. 3000x4000 camera photo), normalize page coordinate points to standard document scale
      if (imgW > 1200 || imgH > 1200) {
        if (imgW >= imgH) {
          naturalW = (imgW / imgH) * basePoints;
          naturalH = basePoints;
        } else {
          naturalW = basePoints;
          naturalH = (imgH / imgW) * basePoints;
        }
      }

      if (margin === 0) {
        pageW = naturalW;
        pageH = naturalH;
        drawW = naturalW;
        drawH = naturalH;
        x = 0;
        y = 0;
      } else {
        pageW = naturalW + margin * 2;
        pageH = naturalH + margin * 2;
        drawW = naturalW;
        drawH = naturalH;
        x = margin;
        y = margin;
      }
    } else {
      // Fixed page size (A4 / Letter)
      const base = SIZES[pageSize] || SIZES.a4;
      const isLandscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && imgW > imgH);

      pageW = isLandscape ? base.height : base.width;
      pageH = isLandscape ? base.width : base.height;

      const maxDrawW = Math.max(1, pageW - margin * 2);
      const maxDrawH = Math.max(1, pageH - margin * 2);

      const scale = Math.min(maxDrawW / imgW, maxDrawH / imgH);
      drawW = imgW * scale;
      drawH = imgH * scale;

      x = (pageW - drawW) / 2;
      y = (pageH - drawH) / 2;
    }

    const page = pdf.addPage([pageW, pageH]);
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

// 14. GRAYSCALE PDF (True monochrome/black-and-white conversion)
export async function grayscalePDF(
  file: File,
  options: {
    onProgress?: (percent: number, message: string) => void;
    signal?: AbortSignal;
  } = {}
): Promise<Blob> {
  options.signal?.throwIfAborted();
  const arrayBuffer = await fileToArrayBuffer(file);
  options.signal?.throwIfAborted();

  options.onProgress?.(10, 'Initializing grayscale monochrome rendering engine...');

  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any = null;

  try {
    pdfDoc = await loadingTask.promise;
    options.signal?.throwIfAborted();
    const numPages = pdfDoc.numPages;
    const newPdfDoc = await PDFDocument.create();

    let canvas: HTMLCanvasElement | null = null;

    for (let i = 1; i <= numPages; i++) {
      options.signal?.throwIfAborted();
      const pct = Math.round(15 + (i / numPages) * 75);
      options.onProgress?.(pct, `Converting page ${i} of ${numPages} to true grayscale...`);

      const page = await pdfDoc.getPage(i);
      const origVp = page.getViewport({ scale: 1.0 });

      // Crisp rendering at scale up to 1.75x (bounded to 2000px max dimension for memory safety)
      const maxDim = Math.max(origVp.width, origVp.height);
      const scale = Math.min(1.75, Math.max(1.0, 2000 / Math.max(1, maxDim)));
      const renderVp = page.getViewport({ scale });

      const w = Math.max(1, Math.floor(renderVp.width));
      const h = Math.max(1, Math.floor(renderVp.height));

      if (!canvas) canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        page.cleanup();
        throw new Error('Canvas 2D context unavailable');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTask = page.render({ canvasContext: ctx, canvas, viewport: renderVp, intent: 'display' } as any);
      await renderTask.promise;
      page.cleanup();

      // True pixel luminance grayscale conversion (Rec. 709)
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const len = data.length;
      for (let j = 0; j < len; j += 4) {
        const gray = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) | 0;
        data[j] = gray;
        data[j + 1] = gray;
        data[j + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Grayscale canvas export failed'));
          },
          'image/jpeg',
          0.92
        );
      });

      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const embedded = await newPdfDoc.embedJpg(jpegBytes);
      const newPage = newPdfDoc.addPage([origVp.width, origVp.height]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: origVp.width,
        height: origVp.height,
      });
    }

    options.onProgress?.(95, 'Finalizing grayscale PDF document...');
    const finalBytes = await newPdfDoc.save({ useObjectStreams: true });
    return new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
  } finally {
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch (e) {
        console.warn('PDFDoc destroy fallback:', e);
      }
    }
  }
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
  scale: number = 2,
  onProgress?: (percent: number, message: string) => void,
  signal?: AbortSignal
): Promise<{
  zipBlob: Blob;
  images: { pageNum: number; blob: Blob; url: string; name: string }[];
}> {
  signal?.throwIfAborted();
  const arrayBuffer = await fileToArrayBuffer(file);
  signal?.throwIfAborted();

  onProgress?.(10, 'Loading PDF document for image export...');
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any = null;

  try {
    pdfDoc = await loadingTask.promise;
    signal?.throwIfAborted();
    const numPages = pdfDoc.numPages;

    const images: { pageNum: number; blob: Blob; url: string; name: string }[] = [];
    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';

    // Single reusable canvas across all iterations to prevent memory thrashing
    const canvas = document.createElement('canvas');

    for (let i = 1; i <= numPages; i++) {
      signal?.throwIfAborted();
      const pct = Math.round(15 + (i / numPages) * 75);
      onProgress?.(pct, `Exporting page ${i} of ${numPages} as ${ext.toUpperCase()}...`);

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        page.cleanup();
        continue;
      }

      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTask = page.render({ canvasContext: ctx, canvas, viewport } as any);
      await renderTask.promise;
      page.cleanup();

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
      // Store already-compressed images directly without redundant DEFLATE compression
      zip.file(pageFileName, imgBuffer, { compression: 'STORE' });
    }

    onProgress?.(95, 'Packaging images into ZIP archive...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'STORE',
    });
    return { zipBlob, images };
  } finally {
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch (e) {
        console.warn('PDFDoc destroy fallback:', e);
      }
    }
  }
}
