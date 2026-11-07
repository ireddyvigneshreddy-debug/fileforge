'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Download, CheckCircle2, RotateCcw, ArrowRight, Eye, Mail } from 'lucide-react';
import { ProcessedResult } from '@/types/tools';

interface ResultDownloadProps {
  result: ProcessedResult;
  onReset: () => void;
}

export const ResultDownload: React.FC<ResultDownloadProps> = ({ result, onReset }) => {
  useEffect(() => {
    // Burst celebration confetti!
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'],
    });
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasSavings = result.originalSize > 0 && result.newSize < result.originalSize;
  const savingsPercent = hasSavings
    ? Math.round(((result.originalSize - result.newSize) / result.originalSize) * 100)
    : 0;

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-bold text-white">Your File Is Ready!</h3>
        <p className="text-xs sm:text-sm text-slate-400">Processed in milliseconds directly in your browser.</p>
      </div>

      {/* File Size Comparison Badge */}
      {result.originalSize > 0 && (
        <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs">
          <div className="text-slate-400">
            <span>Original: </span>
            <span className="font-semibold text-slate-300">{formatSize(result.originalSize)}</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <div className="text-emerald-400 font-medium">
            <span>Result: </span>
            <span className="font-bold">{formatSize(result.newSize)}</span>
          </div>

          {hasSavings && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
              Saved {savingsPercent}%
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={result.downloadUrl}
          download={result.fileName}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>
            {result.additionalFiles && result.additionalFiles.length > 1
              ? `Download All (${result.fileName.endsWith('.zip') ? 'ZIP' : 'Bundle'})`
              : `Download ${result.fileName}`}
          </span>
        </a>

        {result.previewUrl && (
          <a
            href={result.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>Preview</span>
          </a>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-sm font-medium flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>Process Another</span>
        </button>
      </div>

      {/* Direct Feedback & Fix Request Link */}
      <div className="pt-2 text-center">
        <a
          href={`mailto:ireddyvigneshreddy@gmail.com?subject=${encodeURIComponent(
            `[FileForge Result Feedback] Report on ${result.fileName}`
          )}&body=${encodeURIComponent(
            `Hello Vignesh,\n\nI processed "${result.fileName}" on FileForge Pro.\n- Original Size: ${formatSize(result.originalSize)}\n- Result Size: ${formatSize(result.newSize)}\n\nIssue / Feedback:\n(Describe if anything was blurry, unexpected size, or not working as expected...)\n`
          )}`}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-400 transition"
        >
          <Mail className="w-3.5 h-3.5 text-cyan-400" />
          <span>Something not looking right? Report an issue directly to developer (ireddyvigneshreddy@gmail.com)</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
        </a>
      </div>

      {/* Additional Files (e.g. for batch processing or split ZIP) */}
      {result.additionalFiles && result.additionalFiles.length > 0 && (
        <div className="pt-4 border-t border-white/10 text-left space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300">
              Individual Files ({result.additionalFiles.length}):
            </p>
            <span className="text-[11px] text-slate-400">Download separately or use the main button for all</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {result.additionalFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5 hover:border-white/10 text-xs text-slate-300 transition"
              >
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{f.name}</span>
                  {f.blob && (
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({formatSize(f.blob.size)})
                    </span>
                  )}
                </div>
                <a
                  href={f.url}
                  download={f.name}
                  className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[11px] font-semibold transition"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
