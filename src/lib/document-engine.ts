import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Encodings } from '@pdf-lib/standard-fonts';

// Unicode transliteration map for characters outside standard WinAnsi
const UNICODE_TO_WINANSI_MAP: Record<string, string> = {
  // Arrows
  '→': '->',
  '←': '<-',
  '↔': '<->',
  '⇒': '=>',
  '⇐': '<=',
  '⇔': '<=>',
  '➔': '->',
  '➜': '->',
  '➡': '->',
  '↑': '^',
  '↓': 'v',
  '▲': '^',
  '▼': 'v',
  '◀': '<',
  '▶': '>',

  // Quotes and dashes
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '‚': ',',
  '„': ',,',
  '‹': '<',
  '›': '>',
  '–': '-',
  '—': '--',
  '―': '--',
  '…': '...',

  // Bullets & symbols
  '•': '*',
  '◦': 'o',
  '▪': '*',
  '▫': '*',
  '‣': '>',
  '⁃': '-',
  '·': '.',
  '∙': '.',
  '✓': '[v]',
  '✔': '[v]',
  '✕': '[x]',
  '✖': '[x]',
  '✗': '[x]',
  '☐': '[ ]',
  '☑': '[x]',
  '☒': '[x]',
  '★': '*',
  '☆': '*',
  '✦': '*',
  '✧': '*',
  '❤': '<3',
  '♥': '<3',

  // Math & Currency
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '≈': '~=',
  '≡': '==',
  '±': '+/-',
  '×': 'x',
  '÷': '/',
  '√': 'sqrt',
  '∞': 'inf',
  '∑': 'sum',
  '∏': 'prod',
  'π': 'pi',
  'µ': 'u',
  '₹': 'Rs.',
  '₽': 'RUB',
  '₿': 'BTC',
  '℃': 'C',
  '℉': 'F',
  '°': ' deg',
  '§': 'Sec.',
  '¶': 'P.',
  '©': '(C)',
  '®': '(R)',
  '™': '(TM)',

  // Non-breaking spaces and zero-width chars
  '\u00A0': ' ',
  '\u200B': '',
  '\u200C': '',
  '\u200D': '',
  '\uFEFF': '',
  '\t': '    ',
};

// Ensures text is strictly encodable in standard PDF WinAnsi font without crashing
export function sanitizeForPdf(text: string): string {
  if (!text) return '';

  // 1. XML entity decoding
  let s = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  // 2. Direct symbol transliterations
  for (const [key, val] of Object.entries(UNICODE_TO_WINANSI_MAP)) {
    if (s.includes(key)) {
      s = s.replaceAll(key, val);
    }
  }

  // 3. Ensure every character is strictly encodable in WinAnsi
  const winAnsi = Encodings.WinAnsi;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i);
    if (cp === undefined) continue;

    if (winAnsi.canEncodeUnicodeCodePoint(cp)) {
      out += s[i];
    } else {
      if (cp > 0xffff) {
        i++; // skip surrogate pair low byte
      }
      out += ' ';
    }
  }

  return out;
}

// 1. CSV TO EXCEL (XLSX)
export async function csvToExcel(file: File): Promise<Blob> {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string' });
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// 2. EXCEL TO CSV
export async function excelToCsv(file: File, sheetIndex: number = 0): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
  if (!sheetName) throw new Error('No worksheets found in this Excel file.');

  const worksheet = workbook.Sheets[sheetName];
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// 3. JSON TO CSV
export function jsonToCsv(jsonString: string): string {
  const parsed = JSON.parse(jsonString);
  const data = Array.isArray(parsed) ? parsed : [parsed];

  if (data.length === 0) return '';

  // Extract all unique keys
  const headers = Array.from(
    new Set(data.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : ['value'])))
  );

  const csvRows: string[] = [];
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const item of data) {
    const row = headers.map((header) => {
      let val = typeof item === 'object' && item !== null ? item[header] : item;
      if (val === undefined || val === null) val = '';
      else if (typeof val === 'object') val = JSON.stringify(val);
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

// 4. CSV TO JSON
export function csvToJson(csvString: string): string {
  const workbook = XLSX.read(csvString, { type: 'string' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return '[]';
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
  return JSON.stringify(data, null, 2);
}

// 5. EXCEL TO PDF (Render tabular sheets to PDF)
export async function excelToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4 (841.89 x 595.28)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 35;
  const usableWidth = pageWidth - margin * 2;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data: (string | number | boolean)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
    });

    if (data.length === 0) continue;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Sheet Title
    page.drawText(sanitizeForPdf(`Sheet: ${sheetName}`), {
      x: margin,
      y: currentY - 14,
      size: 15,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });
    currentY -= 35;

    // Determine column widths
    const colCount = Math.min(10, Math.max(...data.map((r) => r.length)));
    const colWidth = usableWidth / Math.max(1, colCount);
    const rowHeight = 22;

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      if (currentY - rowHeight < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      const row = data[rowIndex];
      const isHeader = rowIndex === 0;

      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const cellX = margin + colIndex * colWidth;
        const rawVal = row[colIndex] !== undefined ? String(row[colIndex]) : '';
        const cellVal = sanitizeForPdf(rawVal);

        // Truncate cell text if too long
        let displayText = cellVal;
        while (font.widthOfTextAtSize(displayText, 9) > colWidth - 8 && displayText.length > 3) {
          displayText = displayText.slice(0, -4) + '...';
        }

        page.drawText(displayText, {
          x: cellX + 4,
          y: currentY - 14,
          size: 9,
          font: isHeader ? boldFont : font,
          color: isHeader ? rgb(0, 0, 0) : rgb(0.2, 0.2, 0.2),
        });
      }

      currentY -= rowHeight;
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 6. POWERPOINT (PPTX) TO PDF
export async function pptxToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  // 16:9 Presentation slide dimensions in points (960 x 540)
  const slideWidth = 960;
  const slideHeight = 540;

  // Find all slide XML files in ppt/slides/
  const slideFiles = Object.keys(zip.files)
    .filter((path) => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    // If not standard pptx, create cover page with file title
    const page = pdf.addPage([slideWidth, slideHeight]);
    page.drawText(sanitizeForPdf(file.name.replace(/\.[^/.]+$/, '')), {
      x: 80,
      y: 280,
      size: 32,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText('Presentation slides converted with FileForge', {
      x: 80,
      y: 230,
      size: 16,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const xmlContent = await zip.files[slidePath].async('string');

      // Extract text content from <a:t> elements
      const textMatches = Array.from(xmlContent.matchAll(/<a:t(?: [^>]*)?>([\s\S]*?)<\/a:t>/g)).map((m) =>
        sanitizeForPdf(m[1])
      );

      const page = pdf.addPage([slideWidth, slideHeight]);

      // Slide background border
      page.drawRectangle({
        x: 20,
        y: 20,
        width: slideWidth - 40,
        height: slideHeight - 40,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });

      // Slide number badge
      page.drawText(`Slide ${i + 1} of ${slideFiles.length}`, {
        x: slideWidth - 140,
        y: 35,
        size: 11,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      if (textMatches.length > 0) {
        // First significant text as slide Title
        const title = textMatches[0];
        page.drawText(title.slice(0, 70), {
          x: 60,
          y: slideHeight - 90,
          size: 26,
          font: boldFont,
          color: rgb(0.08, 0.15, 0.35),
        });

        // Remaining text as bullet points
        let textY = slideHeight - 160;
        const bullets = textMatches.slice(1).filter((t) => t.trim().length > 0);

        for (const bullet of bullets.slice(0, 10)) {
          if (textY < 80) break;
          page.drawText(`*  ${bullet.slice(0, 90)}`, {
            x: 75,
            y: textY,
            size: 16,
            font,
            color: rgb(0.2, 0.25, 0.3),
          });
          textY -= 32;
        }
      } else {
        page.drawText(`Slide ${i + 1}`, {
          x: 60,
          y: slideHeight / 2,
          size: 28,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

// 7. WORD (DOCX) TO PDF
export async function docxToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 48;
  const maxW = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Read word/document.xml
  const docFile = zip.files['word/document.xml'];
  if (!docFile) {
    throw new Error('Invalid Word file: word/document.xml missing');
  }

  const xml = await docFile.async('string');

  // Parse paragraphs <w:p>
  const paragraphRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
  interface ParagraphItem {
    text: string;
    isHeading: boolean;
    isBullet: boolean;
  }
  const paragraphs: ParagraphItem[] = [];
  let pMatch;

  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    const isHeading =
      /<w:pStyle\s+[^>]*w:val=["'](?:Heading|Title|Sub)/i.test(pContent) ||
      /<w:b(?:\s+[^>]*)?\/>/.test(pContent);
    const isBullet = /<w:numPr>/i.test(pContent);

    // Extract all text runs inside <w:t>
    const textMatches = Array.from(pContent.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)).map((m) => m[1]);
    const rawText = textMatches.join('').trim();
    if (rawText) {
      const sanitized = sanitizeForPdf(rawText);
      if (sanitized) {
        paragraphs.push({
          text: sanitized,
          isHeading,
          isBullet,
        });
      }
    }
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const item = paragraphs[i];
    const para = item.text;
    const isMainTitle = i === 0 && item.isHeading;
    const fontSize = isMainTitle ? 18 : item.isHeading ? 13 : 10;
    const usedFont = item.isHeading ? boldFont : font;
    const lineSpacing = fontSize * 1.4;

    const words = para.split(/\s+/).filter(Boolean);
    let currentLine = item.isBullet ? '* ' : '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = usedFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxW && currentLine) {
        if (currentY - lineSpacing < margin) {
          page = pdf.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        page.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: usedFont,
          color: item.isHeading ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.2, 0.2),
        });
        currentY -= lineSpacing;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY - lineSpacing < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      page.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: usedFont,
        color: item.isHeading ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.2, 0.2),
      });
      currentY -= lineSpacing + (item.isHeading ? 6 : 4);
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
