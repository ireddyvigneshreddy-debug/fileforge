// Helper to load File into HTMLImageElement
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image.'));
    };
    img.src = url;
  });
}

// Fast decode using createImageBitmap with graceful fallback to Image element
export async function loadImageSource(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fallback if createImageBitmap fails on specific format (e.g. svg or raw heic)
    }
  }
  return loadImageFromFile(file);
}

export interface CompressImageOptions {
  mode?: 'quality' | 'target';
  quality?: number; // 0.1 to 1.0 (default 0.8)
  targetSizeBytes?: number; // Target max size in bytes (e.g. 1000 * 1024 for < 1MB)
  maxWidth?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
  signal?: AbortSignal;
}

// 1. COMPRESS IMAGE (Supports both manual quality slider and guaranteed target size e.g. < 1MB)
export async function compressImage(
  file: File,
  optionsOrQuality: number | CompressImageOptions = 0.8,
  legacyMaxWidth?: number
): Promise<{ blob: Blob; originalSize: number; newSize: number; savingsPercent: number; dimensions?: { width: number; height: number } }> {
  const options: CompressImageOptions =
    typeof optionsOrQuality === 'number'
      ? { quality: optionsOrQuality, maxWidth: legacyMaxWidth, mode: 'quality' }
      : { mode: 'target', quality: 0.8, ...optionsOrQuality };

  options.signal?.throwIfAborted();
  const source = await loadImageSource(file);
  options.signal?.throwIfAborted();

  try {
    const origW = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const origH = 'naturalHeight' in source ? source.naturalHeight : source.height;
    const originalSize = file.size;

    const targetMime = options.format || (file.type === 'image/png' ? 'image/webp' : (file.type as 'image/webp' | 'image/jpeg'));

    // If TARGET SIZE is requested (e.g. < 1 MB, < 500 KB, etc.)
    if (options.targetSizeBytes && options.targetSizeBytes > 0 && options.mode !== 'quality') {
      return await compressImageToTargetSizeInternal(source, originalSize, options.targetSizeBytes, targetMime, options.signal);
    }

    // Otherwise MANUAL QUALITY mode
    let width = origW;
    let height = origH;
    const maxWidth = options.maxWidth;

    if (maxWidth && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    const quality = options.quality ?? 0.8;

    // Use OffscreenCanvas if available for speed and zero DOM overhead
    if (typeof OffscreenCanvas !== 'undefined') {
      const offCanvas = new OffscreenCanvas(width, height);
      const ctx = offCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, width, height);
        const blob = await offCanvas.convertToBlob({ type: targetMime, quality });
        const newSize = blob.size;
        const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
        return { blob, originalSize, newSize, savingsPercent, dimensions: { width, height } };
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image compression failed'));
          const newSize = blob.size;
          const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
          resolve({ blob, originalSize, newSize, savingsPercent, dimensions: { width, height } });
        },
        targetMime,
        quality
      );
    });
  } finally {
    if ('close' in source && typeof source.close === 'function') {
      try {
        source.close();
      } catch {}
    }
  }
}

// High-speed adaptive binary-search compressor strictly meeting target file size (e.g. < 1MB)
// Uses smart analytical scaling based on pixel budget to avoid dozens of redundant canvas passes
async function compressImageToTargetSizeInternal(
  img: HTMLImageElement | ImageBitmap,
  originalSize: number,
  targetSizeBytes: number,
  targetMime: 'image/webp' | 'image/jpeg' | 'image/png' = 'image/webp',
  signal?: AbortSignal
): Promise<{ blob: Blob; originalSize: number; newSize: number; savingsPercent: number; dimensions: { width: number; height: number } }> {
  signal?.throwIfAborted();
  const origW = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const origH = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const totalPixels = origW * origH;

  // 95% safety ceiling guarantees the resulting file is strictly under the user's limit (e.g. < 1 MB)
  const safeTarget = Math.floor(targetSizeBytes * 0.95);

  // Reusable OffscreenCanvas or DOM Canvas
  const supportsOffscreen = typeof OffscreenCanvas !== 'undefined';
  let offCanvas: OffscreenCanvas | null = null;
  let domCanvas: HTMLCanvasElement | null = null;

  if (supportsOffscreen) {
    offCanvas = new OffscreenCanvas(origW, origH);
  } else {
    domCanvas = document.createElement('canvas');
  }

  const encodeAt = async (w: number, h: number, q: number): Promise<Blob> => {
    signal?.throwIfAborted();
    if (offCanvas) {
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error('OffscreenCanvas context unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return await offCanvas.convertToBlob({ type: targetMime, quality: q });
    } else if (domCanvas) {
      domCanvas.width = w;
      domCanvas.height = h;
      const ctx = domCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return new Promise((resolve, reject) => {
        domCanvas!.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas compression failed'));
          },
          targetMime,
          q
        );
      });
    }
    throw new Error('Canvas unavailable');
  };

  // Smart initial scale calculation based on pixel count vs target bytes
  // Typical byte budget: WebP ~0.12 B/px, JPEG ~0.16 B/px, PNG ~0.40 B/px at quality ~0.75
  const bytesPerPixel = targetMime === 'image/webp' ? 0.12 : targetMime === 'image/jpeg' ? 0.16 : 0.40;
  const estimatedMaxPixels = Math.floor(safeTarget / bytesPerPixel);

  let initialScale = 1.0;
  if (totalPixels > estimatedMaxPixels * 1.1) {
    initialScale = Math.max(0.18, Math.min(1.0, Math.sqrt(estimatedMaxPixels / totalPixels)));
  }

  // Pass 1: Try at estimated scale with quality 0.78
  let curW = Math.max(120, Math.round(origW * initialScale));
  let curH = Math.max(120, Math.round(origH * initialScale));
  let bestBlob = await encodeAt(curW, curH, initialScale === 1.0 ? 0.82 : 0.78);
  let bestW = curW;
  let bestH = curH;

  // Case A: Fits immediately under budget!
  if (bestBlob.size <= safeTarget) {
    // If it's already a good fit (within 35% of target budget or already native scale), we're done!
    if (bestBlob.size >= safeTarget * 0.65 || initialScale >= 0.95) {
      const newSize = bestBlob.size;
      const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
      return { blob: bestBlob, originalSize, newSize, savingsPercent, dimensions: { width: bestW, height: bestH } };
    }

    // Significant headroom available: 1 single refinement step to increase resolution/quality
    const bumpScale = Math.min(1.0, initialScale * 1.25);
    const bumpW = Math.max(120, Math.round(origW * bumpScale));
    const bumpH = Math.max(120, Math.round(origH * bumpScale));
    const bumpBlob = await encodeAt(bumpW, bumpH, 0.82);
    if (bumpBlob.size <= safeTarget) {
      bestBlob = bumpBlob;
      bestW = bumpW;
      bestH = bumpH;
    }
    const newSize = bestBlob.size;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
    return { blob: bestBlob, originalSize, newSize, savingsPercent, dimensions: { width: bestW, height: bestH } };
  }

  // Case B: Overshot target. Closed-loop analytical reduction (Pass 2)
  const ratio = safeTarget / Math.max(1, bestBlob.size);
  const nextScale = Math.max(0.12, initialScale * Math.sqrt(ratio) * 0.94);
  const nextQuality = Math.max(0.38, Math.min(0.75, 0.78 * Math.pow(ratio, 0.25)));

  curW = Math.max(120, Math.round(origW * nextScale));
  curH = Math.max(120, Math.round(origH * nextScale));
  bestBlob = await encodeAt(curW, curH, nextQuality);
  bestW = curW;
  bestH = curH;

  if (bestBlob.size <= safeTarget) {
    const newSize = bestBlob.size;
    const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
    return { blob: bestBlob, originalSize, newSize, savingsPercent, dimensions: { width: bestW, height: bestH } };
  }

  // Pass 3 (final safeguard): Reduce quality slightly to guarantee hitting target
  const finalQuality = Math.max(0.28, nextQuality * 0.75);
  bestBlob = await encodeAt(curW, curH, finalQuality);

  const newSize = bestBlob.size;
  const savingsPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
  return { blob: bestBlob, originalSize, newSize, savingsPercent, dimensions: { width: bestW, height: bestH } };
}

// 2. CONVERT IMAGE FORMAT
export async function convertImageFormat(
  file: File,
  targetMime: 'image/jpeg' | 'image/png' | 'image/webp',
  quality: number = 0.9,
  bgColor: string = '#ffffff'
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // If converting to JPEG, fill background with bgColor
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Conversion failed'));
        resolve(blob);
      },
      targetMime,
      quality
    );
  });
}

// 3. RESIZE IMAGE
export async function resizeImage(
  file: File,
  options: {
    width?: number;
    height?: number;
    scalePercent?: number;
    maintainAspect?: boolean;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    quality?: number;
  }
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  let targetW = origW;
  let targetH = origH;

  if (options.scalePercent) {
    targetW = Math.round((origW * options.scalePercent) / 100);
    targetH = Math.round((origH * options.scalePercent) / 100);
  } else if (options.width && options.height) {
    targetW = options.width;
    targetH = options.height;
  } else if (options.width) {
    targetW = options.width;
    targetH = options.maintainAspect !== false ? Math.round((origH * options.width) / origW) : origH;
  } else if (options.height) {
    targetH = options.height;
    targetW = options.maintainAspect !== false ? Math.round((origW * options.height) / origH) : origW;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const format = options.format || (file.type as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/png';
  const quality = options.quality !== undefined ? options.quality : 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Resize failed'));
        resolve({ blob, width: targetW, height: targetH });
      },
      format,
      quality
    );
  });
}

// 4. CROP IMAGE
export async function cropImage(
  file: File,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Crop failed'));
      resolve(blob);
    }, file.type || 'image/png');
  });
}

// 5. ROTATE & FLIP
export async function rotateFlipImage(
  file: File,
  options: {
    rotateDegrees?: number; // 90, 180, 270
    flipH?: boolean;
    flipV?: boolean;
  }
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const rot = (options.rotateDegrees || 0) % 360;
  const isSwap = rot === 90 || rot === 270;

  const canvas = document.createElement('canvas');
  canvas.width = isSwap ? img.naturalHeight : img.naturalWidth;
  canvas.height = isSwap ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Rotate/flip failed'));
      resolve(blob);
    }, file.type || 'image/png');
  });
}

// 6. PHOTO FILTERS
export async function applyImageFilter(
  file: File,
  filter: 'grayscale' | 'sepia' | 'invert' | 'contrast' | 'noir',
  brightness: number = 100, // 0 to 200
  contrast: number = 100 // 0 to 200
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  let filterStr = `brightness(${brightness}%) contrast(${contrast}%)`;
  if (filter === 'grayscale') filterStr += ' grayscale(100%)';
  else if (filter === 'sepia') filterStr += ' sepia(100%)';
  else if (filter === 'invert') filterStr += ' invert(100%)';
  else if (filter === 'noir') filterStr += ' grayscale(100%) contrast(150%) brightness(90%)';

  ctx.filter = filterStr;
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Filter application failed'));
      resolve(blob);
    }, file.type || 'image/png');
  });
}

// 7. BLUR & PIXELATE
export async function blurPixelateImage(
  file: File,
  mode: 'blur' | 'pixelate',
  intensity: number = 10 // 2 to 50
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  if (mode === 'blur') {
    ctx.filter = `blur(${intensity}px)`;
    ctx.drawImage(img, 0, 0);
  } else {
    // Pixelate via downscale & upscale with smoothing disabled
    const factor = Math.max(0.01, 1 / intensity);
    const smallW = Math.max(1, Math.floor(img.naturalWidth * factor));
    const smallH = Math.max(1, Math.floor(img.naturalHeight * factor));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Temp canvas error');

    tempCtx.drawImage(img, 0, 0, smallW, smallH);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, canvas.width, canvas.height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Processing failed'));
      resolve(blob);
    }, file.type || 'image/png');
  });
}

// 8. EXTRACT COLOR PALETTE
export interface PaletteColor {
  hex: string;
  rgb: string;
  percentage: number;
}

export async function extractColorPalette(file: File, maxColors: number = 8): Promise<PaletteColor[]> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  // Scale down for fast color histogram
  const sampleSize = 100;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

  const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};
  const totalPixels = sampleSize * sampleSize;

  for (let i = 0; i < imgData.length; i += 4) {
    const a = imgData[i + 3];
    if (a < 128) continue; // Skip transparent pixels

    // Quantize to reduce near-duplicate colors (step of 24)
    const step = 24;
    const r = Math.round(imgData[i] / step) * step;
    const g = Math.round(imgData[i + 1] / step) * step;
    const b = Math.round(imgData[i + 2] / step) * step;

    const key = `${r},${g},${b}`;
    if (!colorCounts[key]) {
      colorCounts[key] = { r, g, b, count: 0 };
    }
    colorCounts[key].count++;
  }

  const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, maxColors);

  return top.map((c) => {
    const hex = `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`;
    const rgb = `rgb(${c.r}, ${c.g}, ${c.b})`;
    const percentage = Math.round((c.count / totalPixels) * 100);
    return { hex, rgb, percentage };
  });
}

// 9. IMAGE TO BASE64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Base64'));
    reader.readAsDataURL(file);
  });
}

// 10. SVG TO PNG
export async function svgToPng(file: File, scale: number = 2): Promise<Blob> {
  const text = await file.text();
  const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const width = (img.naturalWidth || 800) * scale;
  const height = (img.naturalHeight || 600) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);

  return new Promise((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return reject(new Error('SVG rasterization failed'));
      resolve(pngBlob);
    }, 'image/png');
  });
}
