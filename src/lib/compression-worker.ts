/**
 * Dedicated Web Worker & OffscreenCanvas client-side compression pipeline.
 * Offloads heavy canvas rendering, pixel quantization, and JPEG/WebP encoding
 * off the main UI thread so the browser remains 100% fluid and responsive.
 */

export interface EncodeTaskOptions {
  width: number;
  height: number;
  quality: number;
  mimeType?: string;
  signal?: AbortSignal;
}

export interface EncodeTaskResult {
  buffer: ArrayBuffer;
  size: number;
}

// Inline worker script source (avoids bundler asset resolution and CORS issues)
const WORKER_SCRIPT = `
self.onmessage = async (e) => {
  const { id, type, bitmap, width, height, quality, mimeType } = e.data;
  if (type === 'encode-bitmap') {
    try {
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not supported in this worker environment.');
      }
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Failed to acquire OffscreenCanvas 2D context');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);

      // Close bitmap immediately to release GPU/RAM memory
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }

      const blob = await canvas.convertToBlob({
        type: mimeType || 'image/jpeg',
        quality: quality !== undefined ? quality : 0.75,
      });

      const buffer = await blob.arrayBuffer();
      self.postMessage({ id, success: true, buffer, size: blob.size }, [buffer]);
    } catch (err) {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      self.postMessage({
        id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
`;

export class CompressionWorkerBridge {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private nextTaskId = 1;
  private pendingTasks = new Map<
    number,
    {
      resolve: (res: EncodeTaskResult) => void;
      reject: (err: Error) => void;
      cleanup?: () => void;
    }
  >();
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private supportsWorker = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      this.supportsWorker = false;
      return;
    }

    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      this.blobUrl = URL.createObjectURL(blob);
      const w = new Worker(this.blobUrl);

      w.onmessage = (e: MessageEvent) => {
        const { id, success, buffer, size, error } = e.data;
        const task = this.pendingTasks.get(id);
        if (!task) return;
        this.pendingTasks.delete(id);
        task.cleanup?.();

        if (success) {
          task.resolve({ buffer, size });
        } else {
          task.reject(new Error(error || 'Worker encoding failed'));
        }
      };

      w.onerror = (e: ErrorEvent) => {
        console.warn('Compression worker error, falling back to main-thread processing:', e);
        this.supportsWorker = false;
        // Reject all pending tasks with fallback
        for (const [id, task] of this.pendingTasks.entries()) {
          this.pendingTasks.delete(id);
          task.cleanup?.();
          task.reject(new Error('Compression worker crashed'));
        }
      };

      this.worker = w;
      this.supportsWorker = true;
    } catch (err) {
      console.warn('Unable to initialize compression worker, falling back to main-thread execution:', err);
      this.supportsWorker = false;
    }
  }

  /**
   * Encodes an ImageBitmap into JPEG/WebP bytes.
   * Runs in the Web Worker when available, or executes synchronously on the main thread via OffscreenCanvas / HTMLCanvasElement.
   */
  async encodeImageBitmap(
    bitmap: ImageBitmap,
    options: EncodeTaskOptions
  ): Promise<EncodeTaskResult> {
    const { width, height, quality, mimeType = 'image/jpeg', signal } = options;

    if (signal?.aborted) {
      if (typeof bitmap.close === 'function') bitmap.close();
      throw new DOMException('Operation aborted', 'AbortError');
    }

    // Attempt Web Worker offloading
    const activeWorker = this.worker;
    if (this.supportsWorker && activeWorker) {
      return new Promise<EncodeTaskResult>((resolve, reject) => {
        const id = this.nextTaskId++;

        let abortListener: (() => void) | undefined;
        if (signal) {
          abortListener = () => {
            if (this.pendingTasks.has(id)) {
              this.pendingTasks.delete(id);
              reject(new DOMException('Operation aborted', 'AbortError'));
            }
          };
          signal.addEventListener('abort', abortListener, { once: true });
        }

        const cleanup = () => {
          if (signal && abortListener) {
            signal.removeEventListener('abort', abortListener);
          }
        };

        this.pendingTasks.set(id, { resolve, reject, cleanup });

        try {
          // Transfer ImageBitmap ownership to worker with 0-copy
          activeWorker.postMessage(
            {
              id,
              type: 'encode-bitmap',
              bitmap,
              width,
              height,
              quality,
              mimeType,
            },
            [bitmap]
          );
        } catch (postErr) {
          this.pendingTasks.delete(id);
          cleanup();
          // If transfer failed, fallback to main thread
          this.fallbackEncode(bitmap, width, height, quality, mimeType)
            .then(resolve)
            .catch(reject);
        }
      });
    }

    // Fallback path on main thread (clean and non-leaking)
    return this.fallbackEncode(bitmap, width, height, quality, mimeType);
  }

  private async fallbackEncode(
    bitmap: ImageBitmap,
    width: number,
    height: number,
    quality: number,
    mimeType: string
  ): Promise<EncodeTaskResult> {
    try {
      // 1. If main thread supports OffscreenCanvas
      if (typeof OffscreenCanvas !== 'undefined') {
        const offCanvas = new OffscreenCanvas(width, height);
        const ctx = offCanvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);
          const blob = await offCanvas.convertToBlob({ type: mimeType, quality });
          const buffer = await blob.arrayBuffer();
          return { buffer, size: blob.size };
        }
      }

      // 2. Fallback to reusable DOM Canvas
      if (typeof document !== 'undefined') {
        if (!this.fallbackCanvas) {
          this.fallbackCanvas = document.createElement('canvas');
        }
        const canvas = this.fallbackCanvas;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Canvas export failed'));
            },
            mimeType,
            quality
          );
        });

        const buffer = await blob.arrayBuffer();
        return { buffer, size: blob.size };
      }

      throw new Error('No canvas implementation available for image encoding');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
    }
  }

  /**
   * Terminate worker and clean up all allocated memory.
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    for (const [, task] of this.pendingTasks.entries()) {
      task.cleanup?.();
      task.reject(new DOMException('Operation aborted', 'AbortError'));
    }
    this.pendingTasks.clear();
    this.fallbackCanvas = null;
  }
}
