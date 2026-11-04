'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, ArrowRight, Sparkles, FileText } from 'lucide-react';
import { TOOLS, ToolDefinition } from '@/lib/tools-registry';
import { IconRenderer } from '@/components/common/IconRenderer';

export const GlobalDropDetector: React.FC = () => {
  const router = useRouter();
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [detectedFile, setDetectedFile] = useState<{ name: string; size: number; ext: string } | null>(null);
  const [suggestedTools, setSuggestedTools] = useState<ToolDefinition[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDraggingGlobal(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDraggingGlobal(false);
        dragCounter = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingGlobal(false);

      if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

      const file = e.dataTransfer.files[0];
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase() || '';

      setDetectedFile({
        name,
        size: file.size,
        ext,
      });

      // Match tools based on file extension
      const matches: ToolDefinition[] = [];

      if (ext === 'pdf') {
        matches.push(
          ...TOOLS.filter((t) =>
            ['merge-pdf', 'split-pdf', 'compress-pdf', 'lock-pdf', 'rotate-pdf', 'pdf-to-images'].includes(t.slug)
          )
        );
      } else if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'bmp', 'gif'].includes(ext)) {
        matches.push(
          ...TOOLS.filter((t) =>
            ['compress-image', 'images-to-pdf', 'convert-image', 'resize-image', 'scan-to-pdf', 'crop-image'].includes(t.slug)
          )
        );
      } else if (['doc', 'docx'].includes(ext)) {
        matches.push(...TOOLS.filter((t) => ['word-to-pdf', 'file-inspector'].includes(t.slug)));
      } else if (['ppt', 'pptx'].includes(ext)) {
        matches.push(...TOOLS.filter((t) => ['ppt-to-pdf', 'file-inspector'].includes(t.slug)));
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        matches.push(...TOOLS.filter((t) => ['excel-to-pdf', 'excel-to-csv', 'csv-to-excel'].includes(t.slug)));
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        matches.push(...TOOLS.filter((t) => ['unzip-files', 'compress-files'].includes(t.slug)));
      } else {
        matches.push(...TOOLS.filter((t) => ['file-hash', 'file-inspector', 'compress-files'].includes(t.slug)));
      }

      setSuggestedTools(matches.slice(0, 6));
      setShowModal(true);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSelectTool = (slug: string) => {
    setShowModal(false);
    router.push(`/tools/${slug}`);
  };

  return (
    <>
      {/* Animated Full-Screen Drop Overlay */}
      {isDraggingGlobal && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-slate-950/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 border-4 border-dashed border-cyan-400 animate-in fade-in duration-150">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50 animate-bounce mb-6">
            <UploadCloud className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
            Drop file anywhere!
          </h2>
          <p className="text-sm text-cyan-300 mt-2 max-w-md text-center">
            FileForge will instantly detect the format and suggest the best private tools.
          </p>
        </div>
      )}

      {/* Suggested Tools Modal */}
      {showModal && detectedFile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl p-6 text-slate-100 relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* File info pill */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase">
                    .{detectedFile.ext}
                  </span>
                  <span className="text-xs text-slate-400">{formatSize(detectedFile.size)}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                  {detectedFile.name}
                </h3>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Recommended Tools for This File:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {suggestedTools.map((tool) => (
                  <button
                    key={tool.slug}
                    type="button"
                    onClick={() => handleSelectTool(tool.slug)}
                    className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-blue-600/15 border border-white/10 hover:border-cyan-500/50 transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <IconRenderer name={tool.icon} className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
              <span>All operations execute locally in your browser.</span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
