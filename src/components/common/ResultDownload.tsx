'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Download, CheckCircle2, RotateCcw, ArrowRight, Eye, ShieldCheck, Sparkles } from 'lucide-react';
import { ProcessedResult } from '@/types/tools';

interface ResultDownloadProps {
  result: ProcessedResult;
  onReset: () => void;
}

export const ResultDownload: React.FC<ResultDownloadProps> = ({ result, onReset }) => {
  useEffect(() => {
    // Burst celebration cosmic confetti
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#00f0ff', '#8b5cf6', '#10b981', '#38bdf8', '#c084fc'],
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
    <div className="relative p-6 sm:p-10 rounded-3xl bg-slate-950/85 border border-emerald-500/35 text-center space-y-6 backdrop-blur-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.25)] overflow-hidden">
      {/* Corner HUD Reticles */}
      <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

      {/* Top Station Telemetry Tag */}
      <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-emerald-400/80 border-b border-emerald-500/20 pb-2.5">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          [MISSION_COMPLETE // PAYLOAD_COMPILED]
        </span>
        <span className="text-cyan-400 font-bold">[CHECKSUM_VERIFIED]</span>
      </div>

      {/* Central Holographic Check Beacon */}
      <div className="relative w-18 h-18 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
        <CheckCircle2 className="w-9 h-9" />
        <div className="absolute -inset-1.5 rounded-full border border-dashed border-emerald-400/40 animate-spin pointer-events-none" style={{ animationDuration: '10s' }} />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wide text-glow-emerald">
          PAYLOAD READY FOR RETRIEVAL
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 font-mono">
          Processed 100% in-browser with zero telemetry egress.
        </p>
      </div>

      {/* File Size Comparison Telemetry HUD */}
      {result.originalSize > 0 && (
        <div className="inline-flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-white/10 text-xs font-mono shadow-inner">
          <div className="text-slate-400">
            <span>INPUT: </span>
            <span className="font-semibold text-slate-200">{formatSize(result.originalSize)}</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <div className="text-emerald-400 font-bold">
            <span>OUTPUT: </span>
            <span className="text-white bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
              {formatSize(result.newSize)}
            </span>
          </div>

          {hasSavings && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              REDUCED {savingsPercent}%
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 font-mono">
        <a
          href={result.downloadUrl}
          download={result.fileName}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wide uppercase shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>
            {result.additionalFiles && result.additionalFiles.length > 1
              ? `DOWNLOAD ALL (${result.fileName.endsWith('.zip') ? 'ZIP' : 'BUNDLE'})`
              : `DOWNLOAD ${result.fileName}`}
          </span>
        </a>

        {result.previewUrl && (
          <a
            href={result.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs sm:text-sm font-semibold tracking-wider flex items-center justify-center gap-2 transition hover:border-cyan-400"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>VIEW PREVIEW</span>
          </a>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold tracking-wider flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>NEW TASK</span>
        </button>
      </div>

      {/* Additional Files List */}
      {result.additionalFiles && result.additionalFiles.length > 0 && (
        <div className="pt-4 border-t border-white/10 text-left space-y-2 font-mono">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-cyan-400">
              INDIVIDUAL PAYLOADS ({result.additionalFiles.length}):
            </p>
            <span className="text-[10px] text-slate-500">Download separately or use the main button</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {result.additionalFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-cyan-500/30 text-xs text-slate-300 transition"
              >
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <span className="w-5 h-5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{f.name}</span>
                  {f.blob && (
                    <span className="text-[10px] text-slate-500 shrink-0">
                      ({formatSize(f.blob.size)})
                    </span>
                  )}
                </div>
                <a
                  href={f.url}
                  download={f.name}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold transition"
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
