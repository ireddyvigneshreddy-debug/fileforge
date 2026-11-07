'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  ArrowRight,
  Zap,
  Star,
  Flame,
  ShieldCheck,
  Sparkles,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  Scan,
} from 'lucide-react';
import { TOOLS, ToolDefinition, ToolCategory } from '@/lib/tools-registry';
import { IconRenderer } from '@/components/common/IconRenderer';

interface QuickFindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Lightning-Fast Fuzzy Search Scoring Function
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 1000;
  if (t.startsWith(q)) return 850 + Math.max(0, 50 - t.length);

  // Word boundary match: e.g. "comp" -> "Compress PDF"
  const words = t.split(/[\s-_/]+/);
  for (const w of words) {
    if (w.startsWith(q)) return 750 + Math.max(0, 30 - w.length);
  }

  // Acronym match: e.g. "ocr", "c2p"
  const acronym = words.map((w) => w[0]).join('');
  if (acronym.includes(q)) return 650;

  // Subsequence match with consecutive bonus
  let qIdx = 0;
  let score = 0;
  let consecutive = 0;

  for (let i = 0; i < t.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      consecutive++;
      score += 15 + consecutive * 8;
      if (qIdx === q.length) {
        return score + Math.max(0, 80 - i);
      }
    } else {
      consecutive = 0;
    }
  }

  return 0;
}

function scoreTool(query: string, tool: ToolDefinition): number {
  if (!query) return 1;
  const q = query.trim().toLowerCase();

  const nameScore = fuzzyScore(q, tool.name) * 3;
  const slugScore = fuzzyScore(q, tool.slug) * 2;
  const catScore = tool.category.toLowerCase().startsWith(q) ? 400 : 0;

  let maxKwScore = 0;
  for (const kw of tool.keywords) {
    const s = fuzzyScore(q, kw);
    if (s > maxKwScore) maxKwScore = s;
  }

  const descScore = tool.description.toLowerCase().includes(q) ? 120 : 0;
  return Math.max(nameScore, slugScore, catScore, maxKwScore * 1.5, descScore);
}

export const QuickFindModal: React.FC<QuickFindModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load pinned favorites
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fileforge_favorites');
        if (saved) setFavorites(JSON.parse(saved));
      } catch {
        // Ignore storage error
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedCategory('all');
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

  // Fuzzy filter & ranking
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    let pool = TOOLS;
    if (selectedCategory !== 'all') {
      pool = TOOLS.filter((t) => t.category === selectedCategory);
    }

    if (!q) {
      return pool.slice(0, 16);
    }

    const scored = pool
      .map((tool) => ({ tool, score: scoreTool(q, tool) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.tool);

    return scored;
  }, [query, selectedCategory]);

  // Categories list for tabs
  const categoriesList: { id: ToolCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'Layers' },
    { id: 'ai', label: 'AI & OCR', icon: 'Sparkles' },
    { id: 'pdf', label: 'PDF Tools', icon: 'FileText' },
    { id: 'image', label: 'Image Studio', icon: 'ImageIcon' },
    { id: 'document', label: 'Docs', icon: 'FileSpreadsheet' },
    { id: 'utility', label: 'Security', icon: 'ShieldCheck' },
  ];

  // Keyboard navigation
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
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle category tabs with Tab
        const catIds: (ToolCategory | 'all')[] = ['all', 'ai', 'pdf', 'image', 'document', 'utility'];
        const currentIdx = catIds.indexOf(selectedCategory);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + catIds.length) % catIds.length
          : (currentIdx + 1) % catIds.length;
        setSelectedCategory(catIds[nextIdx]);
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, results, selectedIndex, selectedCategory, onClose, router]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'ai':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'pdf':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      case 'image':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'document':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'utility':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/25';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 px-3 sm:px-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] backdrop-blur-2xl">
        {/* Top Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/10 gap-3 bg-slate-950/70">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 51 tools with fuzzy match (e.g. ocr, compress, ai chat, lock)..."
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
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700 shrink-0 hidden sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Quick Category Filter Bar Inside Modal */}
        <div className="px-4 py-2 border-b border-white/5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline-block font-mono">
            Tab ⇥ to cycle
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-white/5">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{query ? `Fuzzy Matches (${results.length})` : 'Popular & Pinned Tools'}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% In-Browser WASM
            </span>
          </div>

          {results.map((tool, idx) => {
            const isFav = favorites.includes(tool.slug);
            const isSelected = selectedIndex === idx;

            return (
              <Link
                key={tool.slug}
                data-index={idx}
                href={`/tools/${tool.slug}`}
                onClick={onClose}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition group cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/25 border border-blue-400/40 shadow-sm'
                    : 'hover:bg-white/5 border border-transparent'
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
                      {isFav && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                      {tool.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-cyan-300 font-bold uppercase shrink-0">
                          {tool.badge}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-semibold border uppercase tracking-wider hidden sm:inline-block ${getCategoryBadgeClass(
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
                  <span
                    className={`text-[10px] font-medium transition ${
                      isSelected ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'
                    }`}
                  >
                    Open
                  </span>
                  <ArrowRight
                    className={`w-4 h-4 transition ${
                      isSelected ? 'text-cyan-300 translate-x-1' : 'text-slate-500 group-hover:text-cyan-400'
                    }`}
                  />
                </div>
              </Link>
            );
          })}

          {results.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-2">
              <p className="text-white font-medium">No tools found matching &ldquo;{query}&rdquo;</p>
              <p className="text-slate-500 text-xs">
                Try searching for keywords like &ldquo;ai&rdquo;, &ldquo;pdf&rdquo;, &ldquo;ocr&rdquo;, &ldquo;compress&rdquo;, or &ldquo;scan&rdquo;.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Zero Network Latency • 100% Private</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                ↵
              </kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                Tab
              </kbd>
              <span>category</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                ESC
              </kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
