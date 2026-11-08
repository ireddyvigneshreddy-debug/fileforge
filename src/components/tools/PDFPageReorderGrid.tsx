'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GripVertical,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Undo2,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowLeftRight,
  Maximize2,
  X,
  CheckSquare,
  Square,
  Grid,
} from 'lucide-react';

export interface PageReorderItem {
  id: string;
  originalIndex: number; // 0-based index in the source PDF
  originalPageNumber: number; // 1-based original page number
  previewUrl: string | null;
  aspectRatio: number;
  rotation: number; // 0, 90, 180, 270
  isExcluded: boolean;
  selected?: boolean;
}

export interface ReorderChangeEvent {
  orderIndices: number[]; // 0-based indices for PDFEngine.reorderPDF
  rotations: number[]; // Rotations aligned with orderIndices
  orderString: string; // 1-based human-readable string (e.g. "2, 1, 3")
  totalPages: number;
  activeCount: number;
}

interface PDFPageReorderGridProps {
  file: File | null;
  onOrderChange: (event: ReorderChangeEvent) => void;
  initialOrderStr?: string;
}

// Generates an instant, zero-delay SVG placeholder so cards are NEVER stuck on a blank spinner
const createPlaceholderSvg = (pageNum: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="190" viewBox="0 0 140 190" fill="#0f172a">
    <rect width="140" height="190" rx="8" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="18" y="24" width="60" height="8" rx="3" fill="#38bdf8" fill-opacity="0.4"/>
    <rect x="18" y="44" width="104" height="6" rx="2" fill="#334155"/>
    <rect x="18" y="58" width="94" height="6" rx="2" fill="#334155"/>
    <rect x="18" y="72" width="100" height="6" rx="2" fill="#334155"/>
    <rect x="18" y="86" width="70" height="6" rx="2" fill="#334155"/>
    <circle cx="70" cy="135" r="22" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="70" y="141" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">${pageNum}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const PDFPageReorderGrid: React.FC<PDFPageReorderGridProps> = ({
  file,
  onOrderChange,
  initialOrderStr = '',
}) => {
  const [pages, setPages] = useState<PageReorderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // View & UI controls
  const [gridSize, setGridSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualStr, setManualStr] = useState<string>(initialOrderStr);

  // Zoom / Fullscreen Modal (Paperknife feature)
  const [zoomPage, setZoomPage] = useState<PageReorderItem | null>(null);
  const [zoomHighResUrl, setZoomHighResUrl] = useState<string | null>(null);
  const [isZoomLoading, setIsZoomLoading] = useState<boolean>(false);

  // Cache loaded PDF document reference for high-res zoom
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  // Stable reference to onOrderChange to completely avoid infinite re-render cycles
  const onOrderChangeRef = useRef(onOrderChange);
  useEffect(() => {
    onOrderChangeRef.current = onOrderChange;
  }, [onOrderChange]);

  const abortControllerRef = useRef<{ aborted: boolean }>({ aborted: false });
  const isFirstLoadRef = useRef<boolean>(true);

  // Stable callback to notify parent
  const notifyParent = useCallback((currentPages: PageReorderItem[]) => {
    const activePages = currentPages.filter((p) => !p.isExcluded);
    const orderIndices = activePages.map((p) => p.originalIndex);
    const rotations = activePages.map((p) => p.rotation);
    const orderString = activePages.map((p) => p.originalPageNumber).join(', ');

    setManualStr(orderString);
    if (onOrderChangeRef.current) {
      onOrderChangeRef.current({
        orderIndices,
        rotations,
        orderString,
        totalPages: currentPages.length,
        activeCount: activePages.length,
      });
    }
  }, []);

  // Main file loader effect - ONLY triggers when `file` changes!
  useEffect(() => {
    if (!file) {
      setPages([]);
      setIsLoading(false);
      setError(null);
      pdfDocRef.current = null;
      return;
    }

    // Cancel any previous render job
    abortControllerRef.current.aborted = true;
    const currentAbort = { aborted: false };
    abortControllerRef.current = currentAbort;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setLoadProgress({ current: 0, total: 0 });
    isFirstLoadRef.current = true;

    const loadThumbnails = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (currentAbort.aborted || !isMounted) return;

        // Dynamically import pdfjs
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          if (typeof window !== 'undefined') {
            pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
          } else {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          }
        }

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
          cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        if (currentAbort.aborted || !isMounted) return;

        pdfDocRef.current = pdfDoc;
        const numPages = pdfDoc.numPages;
        setLoadProgress({ current: 0, total: numPages });

        // Step 1: Immediately generate placeholder items with instant SVG previews
        // The user sees the full grid and can start interacting IMMEDIATELY!
        const initialItems: PageReorderItem[] = Array.from({ length: numPages }, (_, i) => ({
          id: `page-orig-${i}-${Date.now()}`,
          originalIndex: i,
          originalPageNumber: i + 1,
          previewUrl: createPlaceholderSvg(i + 1),
          aspectRatio: 0.707,
          rotation: 0,
          isExcluded: false,
          selected: false,
        }));

        setPages(initialItems);
        notifyParent(initialItems);

        // Step 2: Background progressive thumbnail rendering with micro-yielding
        // Yielding execution via setTimeout keeps mobile browser at 60 FPS without lag
        for (let i = 1; i <= numPages; i++) {
          if (currentAbort.aborted || !isMounted) break;

          try {
            const page = await pdfDoc.getPage(i);
            const unscaledViewport = page.getViewport({ scale: 1.0 });

            // Ultra-lightweight thumbnail target width: 140px (~10ms render time)
            const targetWidth = 140;
            const scale = targetWidth / Math.max(1, unscaledViewport.width);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const renderTask = page.render({ canvasContext: ctx, viewport } as any);

              // 3.5s timeout safeguard per page so complex pages never freeze the pipeline
              await Promise.race([
                renderTask.promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Render timeout')), 3500)),
              ]);

              if (currentAbort.aborted || !isMounted) break;

              const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
              const ratio = viewport.width / viewport.height;

              setPages((prev) =>
                prev.map((item) =>
                  item.originalIndex === i - 1
                    ? { ...item, previewUrl: dataUrl, aspectRatio: ratio }
                    : item
                )
              );
            }
          } catch (renderErr) {
            console.warn(`Render fallback for page ${i}:`, renderErr);
            // Fallback SVG already in place, no crash or freeze!
          }

          setLoadProgress({ current: i, total: numPages });

          // Micro-yield main thread every page so UI gestures and drags remain 100% fluid
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      } catch (err: unknown) {
        if (!currentAbort.aborted && isMounted) {
          console.error('PDF load error:', err);
          setError(err instanceof Error ? err.message : 'Unable to read PDF file.');
        }
      } finally {
        if (!currentAbort.aborted && isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      isMounted = false;
      currentAbort.aborted = true;
    };
  }, [file, notifyParent]);

  // High-Res Zoom Modal Render
  const openZoomModal = async (item: PageReorderItem) => {
    setZoomPage(item);
    setZoomHighResUrl(item.previewUrl);
    setIsZoomLoading(true);

    if (pdfDocRef.current) {
      try {
        const page = await pdfDocRef.current.getPage(item.originalPageNumber);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = Math.min(800, window.innerWidth * 0.9);
        const scale = targetWidth / Math.max(1, unscaledViewport.width);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
          const highRes = canvas.toDataURL('image/jpeg', 0.9);
          setZoomHighResUrl(highRes);
        }
      } catch (e) {
        console.warn('High-res render fallback:', e);
      } finally {
        setIsZoomLoading(false);
      }
    } else {
      setIsZoomLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      notifyParent(updated);
      return updated;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move page with tap buttons (essential for mobile & touch)
  const moveItem = (index: number, delta: number) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, item);
      notifyParent(updated);
      return updated;
    });
  };

  // Rotate single page 90 degrees clockwise
  const rotatePage = (index: number, angleDelta: number = 90) => {
    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== index) return p;
        const newRot = (p.rotation + angleDelta + 360) % 360;
        return { ...p, rotation: newRot };
      });
      notifyParent(updated);
      return updated;
    });

    if (zoomPage && zoomPage.originalIndex === pages[index]?.originalIndex) {
      setZoomPage((prev) => (prev ? { ...prev, rotation: (prev.rotation + angleDelta + 360) % 360 } : null));
    }
  };

  // Toggle exclusion / deletion of single page
  const toggleExcludePage = (index: number) => {
    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== index) return p;
        return { ...p, isExcluded: !p.isExcluded };
      });
      notifyParent(updated);
      return updated;
    });
  };

  // Duplicate page in place
  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const source = prev[index];
      const clone: PageReorderItem = {
        ...source,
        id: `page-copy-${source.originalIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, clone);
      notifyParent(updated);
      return updated;
    });
  };

  // Multi-select toggle
  const toggleSelectPage = (index: number) => {
    setPages((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  // Batch actions on selected pages
  const rotateSelected = (deg: number = 90) => {
    setPages((prev) => {
      const updated = prev.map((p) =>
        p.selected ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
      );
      notifyParent(updated);
      return updated;
    });
  };

  const deleteSelected = () => {
    setPages((prev) => {
      const updated = prev.map((p) => (p.selected ? { ...p, isExcluded: true } : p));
      notifyParent(updated);
      return updated;
    });
  };

  // Quick batch operations
  const resetToOriginal = () => {
    setPages((prev) => {
      const originalMap = new Map<number, PageReorderItem>();
      prev.forEach((p) => {
        if (!originalMap.has(p.originalIndex)) {
          originalMap.set(p.originalIndex, { ...p, rotation: 0, isExcluded: false, selected: false });
        }
      });
      const sorted = Array.from(originalMap.values()).sort((a, b) => a.originalIndex - b.originalIndex);
      notifyParent(sorted);
      return sorted;
    });
  };

  const reverseOrder = () => {
    setPages((prev) => {
      const reversed = [...prev].reverse();
      notifyParent(reversed);
      return reversed;
    });
  };

  const rotateAll = (deg: number) => {
    setPages((prev) => {
      const updated = prev.map((p) => ({
        ...p,
        rotation: (p.rotation + deg + 360) % 360,
      }));
      notifyParent(updated);
      return updated;
    });
  };

  const restoreAll = () => {
    setPages((prev) => {
      const updated = prev.map((p) => ({ ...p, isExcluded: false }));
      notifyParent(updated);
      return updated;
    });
  };

  // Parse manual input string
  const applyManualString = (str: string) => {
    setManualStr(str);
    const parsedNumbers = str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (parsedNumbers.length === 0) return;

    setPages((prev) => {
      const pageLookup = new Map<number, PageReorderItem>();
      prev.forEach((p) => {
        if (!pageLookup.has(p.originalPageNumber)) {
          pageLookup.set(p.originalPageNumber, p);
        }
      });

      const nextPages: PageReorderItem[] = [];
      parsedNumbers.forEach((num, idx) => {
        const existing = pageLookup.get(num);
        if (existing) {
          nextPages.push({
            ...existing,
            id: `page-manual-${num}-${idx}-${Date.now()}`,
            isExcluded: false,
          });
        }
      });

      if (nextPages.length > 0) {
        notifyParent(nextPages);
        return nextPages;
      }
      return prev;
    });
  };

  const activePages = pages.filter((p) => !p.isExcluded);
  const excludedPages = pages.filter((p) => p.isExcluded);
  const selectedPages = pages.filter((p) => p.selected && !p.isExcluded);

  if (!file) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-200">No PDF selected yet</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload a PDF above to visually preview pages and freely drag, drop, rotate, and reorganize them in any order.
        </p>
      </div>
    );
  }

  // Grid columns class based on density setting
  const gridColsClass =
    gridSize === 'compact'
      ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
      : gridSize === 'large'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Bar (Paperknife Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs shadow-inner">
            {activePages.length}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Interactive Page Organizer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                Drag & Drop
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {activePages.length} of {pages.length} pages included
              {excludedPages.length > 0 && ` (${excludedPages.length} excluded)`}
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Grid Size Switcher */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setGridSize('compact')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                gridSize === 'compact' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact grid (more pages on screen)"
            >
              Small
            </button>
            <button
              type="button"
              onClick={() => setGridSize('normal')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                gridSize === 'normal' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Standard grid"
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setGridSize('large')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                gridSize === 'large' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Large cards (high detail)"
            >
              Large
            </button>
          </div>

          <button
            type="button"
            onClick={resetToOriginal}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Reset sequence to original PDF page order"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={reverseOrder}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Reverse the entire page sequence"
          >
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
            <span>Reverse</span>
          </button>
          <button
            type="button"
            onClick={() => rotateAll(90)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Rotate all pages 90° clockwise"
          >
            <RotateCw className="w-3 h-3 text-blue-400" />
            <span>Rotate All</span>
          </button>
          {excludedPages.length > 0 && (
            <button
              type="button"
              onClick={restoreAll}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Restore all removed pages"
            >
              <Undo2 className="w-3 h-3" />
              <span>Restore All</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 text-[11px] cursor-pointer ${
              showManualInput
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border-white/10'
            }`}
            title="Toggle manual comma-separated text mode"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Text Mode</span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Floating Action Bar */}
      {selectedPages.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-950/90 border border-blue-500/40 text-xs text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white font-bold text-[11px]">
              {selectedPages.length} selected
            </span>
            <button
              type="button"
              onClick={() => selectAll(false)}
              className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => rotateSelected(90)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCw className="w-3 h-3 text-blue-300" />
              <span>Rotate Selected</span>
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Progress Indicator (Non-blocking background scan) */}
      {isLoading && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span>Sharpening high-res page thumbnails...</span>
              <span className="font-mono text-slate-300">
                {loadProgress.current} / {loadProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <div
                className="bg-blue-400 h-1 transition-all duration-150"
                style={{
                  width: `${loadProgress.total ? (loadProgress.current / loadProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual text mode input (collapsible) */}
      {showManualInput && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 animate-in fade-in slide-in-from-top-1">
          <label className="block text-xs font-medium text-slate-300">
            Manual Page Sequence (Comma Separated):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualStr}
              onChange={(e) => setManualStr(e.target.value)}
              className="flex-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-white font-mono"
              placeholder="e.g. 2, 1, 3, 4"
            />
            <button
              type="button"
              onClick={() => applyManualString(manualStr)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Type page numbers in your preferred order. The visual cards below will update automatically.
          </p>
        </div>
      )}

      {/* Interactive Page Cards Grid */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4`}>
        {pages.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;
          const isCurrentExcluded = item.isExcluded;
          const isSelected = !!item.selected;

          // Compute 1-based output position among active pages
          let activeIndex = -1;
          if (!isCurrentExcluded) {
            let count = 0;
            for (let i = 0; i <= index; i++) {
              if (!pages[i].isExcluded) count++;
            }
            activeIndex = count;
          }

          return (
            <div
              key={item.id}
              draggable={!isCurrentExcluded}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative flex flex-col rounded-2xl border transition-all duration-150 select-none overflow-hidden ${
                isDragging
                  ? 'opacity-40 scale-95 border-blue-400 ring-2 ring-blue-500/50 bg-blue-500/10'
                  : isOver
                  ? 'border-blue-400 ring-2 ring-blue-400 bg-blue-500/15 scale-102'
                  : isSelected
                  ? 'border-blue-400 ring-2 ring-blue-500/60 bg-blue-950/40 shadow-lg'
                  : isCurrentExcluded
                  ? 'border-white/5 bg-slate-950/40 opacity-50 grayscale'
                  : 'border-white/10 hover:border-blue-500/40 bg-slate-900/70 hover:bg-slate-900/90 shadow-md shadow-black/20'
              }`}
            >
              {/* Card Header: Position & Origin Badges & Selection Checkbox */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5 bg-slate-950/70 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSelectPage(index)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={isSelected ? 'Deselect page' : 'Select page for batch actions'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  <span
                    className={`font-semibold px-1.5 py-0.5 rounded-md text-[10px] ${
                      isCurrentExcluded
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/25 text-blue-300 font-mono'
                    }`}
                  >
                    {isCurrentExcluded ? 'Removed' : `#${activeIndex}`}
                  </span>

                  {item.rotation !== 0 && (
                    <span className="text-[10px] text-amber-300 font-mono">
                      {item.rotation}°
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>Orig:</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {item.originalPageNumber}
                  </span>
                </div>
              </div>

              {/* Card Body: Thumbnail Preview with Tap-to-Zoom */}
              <div
                className="relative flex items-center justify-center p-2.5 min-h-[140px] sm:min-h-[160px] bg-slate-950/40 overflow-hidden cursor-grab active:cursor-grabbing"
                title="Drag to rearrange or click to enlarge preview"
              >
                {/* Drag Handle Indicator */}
                <div className="absolute top-2 left-2 z-10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md rounded-md p-1 text-slate-300 pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Enlarge / Zoom Button */}
                <button
                  type="button"
                  onClick={() => openZoomModal(item)}
                  className="absolute top-2 right-2 z-10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-blue-600 backdrop-blur-md rounded-md p-1 text-slate-300 hover:text-white cursor-pointer"
                  title="Enlarge preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Thumbnail Image */}
                {item.previewUrl && (
                  <div
                    onClick={() => openZoomModal(item)}
                    className="relative transition-transform duration-200 ease-out shadow-md shadow-black/40 rounded-sm overflow-hidden cursor-pointer"
                    style={{
                      transform: `rotate(${item.rotation}deg)`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={`Page ${item.originalPageNumber}`}
                      className="w-auto h-auto max-h-[125px] sm:max-h-[145px] object-contain rounded-sm pointer-events-none"
                    />
                  </div>
                )}

                {/* Excluded Overlay */}
                {isCurrentExcluded && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 p-2 text-center z-20">
                    <EyeOff className="w-5 h-5 text-rose-400" />
                    <span className="text-[11px] font-medium text-rose-300">Page Excluded</span>
                    <button
                      type="button"
                      onClick={() => toggleExcludePage(index)}
                      className="mt-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Restore Page
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer: Action Controls with accessible mobile touch targets */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-slate-950/80 border-t border-white/5 text-slate-400">
                {/* Move Left / Right Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 sm:bg-transparent hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Move page left"
                    aria-label={`Move page ${item.originalPageNumber} left`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === pages.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 sm:bg-transparent hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Move page right"
                    aria-label={`Move page ${item.originalPageNumber} right`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Rotation & Duplicate & Exclude */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => rotatePage(index, 90)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-500/20 hover:text-blue-300 transition-colors cursor-pointer"
                    title="Rotate 90° clockwise"
                    aria-label={`Rotate page ${item.originalPageNumber} 90 degrees`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicatePage(index)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Duplicate page"
                    aria-label={`Duplicate page ${item.originalPageNumber}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExcludePage(index)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                      isCurrentExcluded
                        ? 'hover:bg-emerald-500/20 text-emerald-400'
                        : 'hover:bg-rose-500/20 hover:text-rose-400'
                    }`}
                    title={isCurrentExcluded ? 'Restore page' : 'Delete / exclude page'}
                    aria-label={isCurrentExcluded ? `Restore page ${item.originalPageNumber}` : `Exclude page ${item.originalPageNumber}`}
                  >
                    {isCurrentExcluded ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer Pill */}
      {activePages.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>
              Target Sequence: <span className="font-mono text-slate-200">{manualStr}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Tip: Drag cards or use &lt; &gt; arrows to organize. Click any page to enlarge.
          </span>
        </div>
      )}

      {/* Zoom / Fullscreen Modal (Paperknife style) */}
      {zoomPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-slate-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold font-mono">
                  Original Page #{zoomPage.originalPageNumber}
                </span>
                {zoomPage.rotation !== 0 && (
                  <span className="text-amber-300 font-mono text-[11px]">
                    Rotated {zoomPage.rotation}°
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = pages.findIndex((p) => p.id === zoomPage.id);
                    if (idx !== -1) rotatePage(idx, 90);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPage(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image View */}
            <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60">
              {isZoomLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
                </div>
              )}
              {zoomHighResUrl && (
                <div
                  className="transition-transform duration-200"
                  style={{ transform: `rotate(${zoomPage.rotation}deg)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={zoomHighResUrl}
                    alt={`Page ${zoomPage.originalPageNumber} Preview`}
                    className="max-h-[65vh] object-contain rounded shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-slate-900/60 text-xs text-slate-400">
              <span>Click outside or press X to close</span>
              <button
                type="button"
                onClick={() => setZoomPage(null)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
