'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Zap, Command, WifiOff } from 'lucide-react';
import { TOOLS } from '@/lib/tools-registry';
import { IconRenderer } from '@/components/common/IconRenderer';

interface QuickFindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickFindModal: React.FC<QuickFindModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle escape & keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);

  // Multi-word intelligent offline search matching
  const results = words.length === 0
    ? TOOLS.slice(0, 14)
    : TOOLS.filter((t) => {
        const haystack = `${t.name} ${t.description} ${t.category} ${t.keywords.join(' ')} ${t.slug}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });

  // Keyboard navigation up / down / enter
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, results.length - 1)));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onClose();
        router.push(`/tools/${results[selectedIndex].slug}`);
      }
    };
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, results, selectedIndex, onClose, router]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]">
        {/* Top Search Input */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/10 gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 46 tools (e.g. compress pdf, camera, word, qr)..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-white/5">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{query ? `Matching Tools (${results.length})` : 'Quick Access Catalog'}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% Offline Ready
            </span>
          </div>

          {results.map((tool, idx) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              onClick={onClose}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition group cursor-pointer ${
                selectedIndex === idx ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${getCategoryBadgeClass(
                    tool.category
                  )}`}
                >
                  <IconRenderer name={tool.icon} className="w-4 h-4" />
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition truncate">
                      {tool.name}
                    </span>
                    {tool.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold uppercase">
                        {tool.badge}
                      </span>
                    )}
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

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline text-[10px] text-slate-500 group-hover:text-cyan-400 font-medium">Launch</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          ))}

          {results.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-2">
              <p className="text-white font-medium">No tools matching &ldquo;{query}&rdquo;</p>
              <p className="text-slate-500 text-xs">Try searching for keywords like &ldquo;pdf&rdquo;, &ldquo;image&rdquo;, &ldquo;compress&rdquo;, &ldquo;scan&rdquo;, or &ldquo;convert&rdquo;.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 sm:px-5 py-3 border-t border-white/10 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Works 100% Offline • In-Browser Execution</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">↑↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">ESC</kbd>
              <span>to close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
