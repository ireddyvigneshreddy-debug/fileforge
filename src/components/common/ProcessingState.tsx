'use client';

import React from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

interface ProcessingStateProps {
  progress: number;
  message: string;
  onCancel?: () => void;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ progress, message, onCancel }) => {
  return (
    <div className="p-8 rounded-2xl bg-slate-900/80 border border-blue-500/20 text-center space-y-5 animate-pulse">
      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Processing locally...</span>
        </h4>
        <p className="text-xs text-slate-400">{message || 'Executing client-side WebAssembly engine'}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
        <div
          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.max(10, Math.min(100, progress))}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] text-slate-500">Zero data leaves your machine • 100% private</p>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-medium transition flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Operation</span>
          </button>
        )}
      </div>
    </div>
  );
};
