'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, ArrowRight, Zap, Command } from 'lucide-react';
import { TOOLS } from '@/lib/tools-registry';
import { IconRenderer } from '@/components/common/IconRenderer';

interface QuickFindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickFindModal: React.FC<QuickFindModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();
  const results = !q
    ? TOOLS.slice(0, 12)
    : TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.keywords.some((k) => k.toLowerCase().includes(q))
      );

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'pdf':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'image':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'document':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'utility':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Top Search Input */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any tool or format (e.g. merge, ppt, compress, watermark, qr)..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-1 divide-y divide-white/5">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{query ? `Search Results (${results.length})` : 'Popular Quick Access'}</span>
            <span className="text-[10px] text-slate-500">45 Tools Total</span>
          </div>

          {results.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              onClick={onClose}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${getCategoryBadgeClass(
                    tool.category
                  )}`}
                >
                  <IconRenderer name={tool.icon} className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition truncate">
                      {tool.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getCategoryBadgeClass(
                        tool.category
                      )}`}
                    >
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{tool.description}</p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition shrink-0 ml-3" />
            </Link>
          ))}

          {results.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
              No tools matching &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>100% In-Browser Execution • Zero Uploads</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">ESC</kbd>
            <span>to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
