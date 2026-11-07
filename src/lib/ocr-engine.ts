'use client';

export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
  lineCount: number;
  fileName: string;
}

export interface OCROptions {
  language?: string; // default 'eng'
  onProgress?: (percent: number, status: string) => void;
}

export async function runClientSideOCR(
  file: File,
  options: OCROptions = {}
): Promise<OCRResult> {
  const lang = options.language || 'eng';
  options.onProgress?.(10, 'Initializing Tesseract WebAssembly Neural Engine...');

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const progress = Math.round(30 + (m.progress || 0) * 65);
        options.onProgress?.(progress, `Recognizing text with OCR (${Math.round((m.progress || 0) * 100)}%)...`);
      } else if (m.status === 'loading tesseract core') {
        options.onProgress?.(15, 'Loading Tesseract WASM core...');
      } else if (m.status === 'loading language traineddata') {
        options.onProgress?.(25, `Loading ${lang} character dictionary...`);
      }
    },
  });

  try {
    let imageSource: string | HTMLCanvasElement = '';

    // If PDF, render first page to canvas for OCR extraction
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      options.onProgress?.(28, 'Rendering PDF page for OCR scanning...');
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        if (typeof window !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
        } else {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }
      }

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering context unavailable');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, canvas, viewport } as any).promise;
      imageSource = canvas;
    } else {
      // Standard image
      imageSource = URL.createObjectURL(file);
    }

    options.onProgress?.(40, 'Processing visual features & glyph segmentation...');
    const result = await worker.recognize(imageSource);

    if (typeof imageSource === 'string' && imageSource.startsWith('blob:')) {
      URL.revokeObjectURL(imageSource);
    }

    const text = result.data.text.trim();
    const confidence = Math.round(result.data.confidence || 90);
    const words = text.split(/\s+/).filter(Boolean);
    const lines = text.split(/\n+/).filter(Boolean);

    options.onProgress?.(100, 'OCR text extraction complete!');

    return {
      text,
      confidence,
      wordCount: words.length,
      lineCount: lines.length,
      fileName: file.name,
    };
  } finally {
    await worker.terminate();
  }
}
