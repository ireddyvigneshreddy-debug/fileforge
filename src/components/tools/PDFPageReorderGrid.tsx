'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GripVertical,
  RotateCw,
  RotateCcw,
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
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';

export interface PageReorderItem {
  id: string;
  originalIndex: number; // 0-based index in the source PDF
  originalPageNumber: number; // 1-based original page number
  previewUrl: string | null;
  aspectRatio: number;
  rotation: number; // 0, 90, 180, 270
  isExcluded: boolean;
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

  // Controls view
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualStr, setManualStr] = useState<string>(initialOrderStr);

  const abortControllerRef = useRef<{ aborted: boolean }>({ aborted: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent whenever pages change
  const notifyParent = useCallback(
    (currentPages: PageReorderItem[]) => {
      const activePages = currentPages.filter((p) => !p.isExcluded);
      const orderIndices = activePages.map((p) => p.originalIndex);
      const rotations = activePages.map((p) => p.rotation);
      const orderString = activePages.map((p) => p.originalPageNumber).join(', ');

      setManualStr(orderString);
      onOrderChange({
        orderIndices,
        rotations,
        orderString,
        totalPages: currentPages.length,
        activeCount: activePages.length,
      });
    },
    [onOrderChange]
  );

  // Render PDF pages on file change
  useEffect(() => {
    if (!file) {
      setPages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    abortControllerRef.current.aborted = true;
    const currentAbort = { aborted: false };
    abortControllerRef.current = currentAbort;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setLoadProgress({ current: 0, total: 0 });

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

        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;
        if (currentAbort.aborted || !isMounted) return;

        const numPages = pdfDoc.numPages;
        setLoadProgress({ current: 0, total: numPages });

        // Initial placeholder items so user immediately sees cards and count
        const initialItems: PageReorderItem[] = Array.from({ length: numPages }, (_, i) => ({
          id: `page-orig-${i}-${Date.now()}`,
          originalIndex: i,
          originalPageNumber: i + 1,
          previewUrl: null,
          aspectRatio: 0.707, // standard A4 portrait default
          rotation: 0,
          isExcluded: false,
        }));

        setPages(initialItems);
        notifyParent(initialItems);

        // Progressively render thumbnail previews
        for (let i = 1; i <= numPages; i++) {
          if (currentAbort.aborted || !isMounted) break;

          try {
            const page = await pdfDoc.getPage(i);
            const unscaledViewport = page.getViewport({ scale: 1.0 });

            // Scale to crisp thumbnail width (~180px)
            const targetWidth = 180;
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
              await renderTask.promise;

              if (currentAbort.aborted || !isMounted) break;

              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
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
            console.warn(`Failed rendering preview for page ${i}:`, renderErr);
          }

          setLoadProgress({ current: i, total: numPages });
        }
      } catch (err: unknown) {
        if (!currentAbort.aborted && isMounted) {
          console.error('PDF load failed:', err);
          setError(err instanceof Error ? err.message : 'Unable to read PDF pages.');
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

  const handleDragLeave = () => {
    // only clear if leaving card
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

  // Move buttons (left / right) for touch / keyboard users
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

  // Rotate single page
  const rotatePage = (index: number, angleDelta: number) => {
    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== index) return p;
        const newRot = (p.rotation + angleDelta + 360) % 360;
        return { ...p, rotation: newRot };
      });
      notifyParent(updated);
      return updated;
    });
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

  // Duplicate page
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

  // Quick batch operations
  const resetToOriginal = () => {
    setPages((prev) => {
      // Sort back by originalIndex, un-exclude all, reset rotations
      const originalMap = new Map<number, PageReorderItem>();
      prev.forEach((p) => {
        if (!originalMap.has(p.originalIndex)) {
          originalMap.set(p.originalIndex, { ...p, rotation: 0, isExcluded: false });
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

  // Parse manual input string to rearrange pages
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

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Header & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
            {activePages.length}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Interactive Page Organizer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Drag & Drop
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {activePages.length} of {pages.length} pages will be compiled
              {excludedPages.length > 0 && ` (${excludedPages.length} excluded)`}
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={resetToOriginal}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px]"
            title="Reset sequence to original PDF page order"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={reverseOrder}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px]"
            title="Reverse the entire page sequence"
          >
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
            <span>Reverse</span>
          </button>
          <button
            type="button"
            onClick={() => rotateAll(90)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 text-[11px]"
            title="Rotate all pages 90° clockwise"
          >
            <RotateCw className="w-3 h-3 text-blue-400" />
            <span>Rotate All</span>
          </button>
          {excludedPages.length > 0 && (
            <button
              type="button"
              onClick={restoreAll}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1 text-[11px]"
              title="Restore all removed pages"
            >
              <Undo2 className="w-3 h-3" />
              <span>Restore All</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 text-[11px] ${
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

      {/* Loading & Progress Banner */}
      {isLoading && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span>Rendering visual page thumbnails...</span>
              <span className="font-mono text-[11px]">
                {loadProgress.current} / {loadProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <div
                className="bg-blue-400 h-1 transition-all duration-200"
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
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {pages.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;
          const isCurrentExcluded = item.isExcluded;

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
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative flex flex-col rounded-2xl border transition-all duration-200 select-none overflow-hidden ${
                isDragging
                  ? 'opacity-40 scale-95 border-blue-400 ring-2 ring-blue-500/50 bg-blue-500/10'
                  : isOver
                  ? 'border-blue-400 ring-2 ring-blue-400 bg-blue-500/15 scale-102'
                  : isCurrentExcluded
                  ? 'border-white/5 bg-slate-950/40 opacity-50 grayscale'
                  : 'border-white/10 hover:border-blue-500/40 bg-slate-900/60 hover:bg-slate-900/80 shadow-lg shadow-black/20'
              }`}
            >
              {/* Card Header: Position & Origin Badges */}
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/5 bg-slate-950/60 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold px-1.5 py-0.5 rounded-md ${
                      isCurrentExcluded
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/20 text-blue-300 font-mono'
                    }`}
                  >
                    {isCurrentExcluded ? 'Removed' : `#${activeIndex}`}
                  </span>
                  {item.rotation !== 0 && (
                    <span className="text-[10px] text-amber-300/90 font-mono">
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

              {/* Card Body: Thumbnail Preview */}
              <div
                className="relative flex items-center justify-center p-3 min-h-[160px] bg-slate-950/30 overflow-hidden cursor-grab active:cursor-grabbing"
                title="Drag to rearrange page position"
              >
                {/* Drag Handle Overlay - Always visible on mobile, hover on desktop */}
                <div className="absolute top-2 left-2 z-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md rounded-md p-1 text-slate-300 pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {item.previewUrl ? (
                  <div
                    className="relative transition-transform duration-300 ease-out shadow-md shadow-black/40 rounded-sm overflow-hidden"
                    style={{
                      transform: `rotate(${item.rotation}deg)`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={`Page ${item.originalPageNumber}`}
                      className="w-auto h-auto max-h-[145px] object-contain rounded-sm pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1.5 py-8">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-[10px]">Loading preview...</span>
                  </div>
                )}

                {/* Excluded Overlay */}
                {isCurrentExcluded && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 p-2 text-center">
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
            Tip: Click and drag any card or use the arrow buttons to rearrange
          </span>
        </div>
      )}
    </div>
  );
};
