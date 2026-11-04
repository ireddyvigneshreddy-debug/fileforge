'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QuickFindModal } from '@/components/common/QuickFindModal';
import { InteractiveToolCard } from '@/components/common/InteractiveToolCard';
import { GlobalDropDetector } from '@/components/common/GlobalDropDetector';
import { IconRenderer } from '@/components/common/IconRenderer';
import { TOOLS, CATEGORIES, ToolCategory, ToolDefinition } from '@/lib/tools-registry';
import {
  Search,
  ShieldCheck,
  Zap,
  Sparkles,
  Flame,
  Star,
  X,
  UploadCloud,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickFindOpen, setIsQuickFindOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load pinned favorites from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fileforge_favorites');
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to parse favorites:', e);
      }
    }
  }, []);

  const toggleFavorite = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      if (typeof window !== 'undefined') {
        localStorage.setItem('fileforge_favorites', JSON.stringify(next));
      }
      return next;
    });
  };

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && document.activeElement !== searchInputRef.current)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered tools based on category and live search query
  const filteredTools = useMemo(() => {
    let list = selectedCategory === 'all' ? TOOLS : TOOLS.filter((t) => t.category === selectedCategory);

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: TOOLS.length,
      pdf: TOOLS.filter((t) => t.category === 'pdf').length,
      image: TOOLS.filter((t) => t.category === 'image').length,
      document: TOOLS.filter((t) => t.category === 'document').length,
      utility: TOOLS.filter((t) => t.category === 'utility').length,
    };
  }, []);

  // Favorite tools objects
  const favoriteTools = useMemo(() => {
    return favorites
      .map((slug) => TOOLS.find((t) => t.slug === slug))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, [favorites]);

  const popularTools = useMemo(() => {
    const popularSlugs = [
      'scan-to-pdf',
      'compress-pdf',
      'word-to-pdf',
      'merge-pdf',
      'compress-image',
      'images-to-pdf',
      'ppt-to-pdf',
      'lock-pdf',
    ];
    return popularSlugs
      .map((slug) => TOOLS.find((t) => t.slug === slug))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Interactive Drag & Drop Anywhere Detector */}
      <GlobalDropDetector />

      {/* Dynamic Animated Ambient Aura Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] ambient-glow-1 pointer-events-none" />
      <div className="absolute top-32 left-1/4 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/10 to-transparent blur-3xl pointer-events-none animate-aurora" />
      <div className="absolute top-64 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-purple-600/10 via-blue-600/10 to-transparent blur-3xl pointer-events-none animate-pulse-subtle" />

      <Navbar onSearchClick={() => setIsQuickFindOpen(true)} />

      {/* Spotlight Command Palette Modal */}
      <QuickFindModal isOpen={isQuickFindOpen} onClose={() => setIsQuickFindOpen(false)} />

      <main className="flex-1 w-full space-y-12 py-10 relative z-10">
        {/* HERO SECTION WITH INTERACTIVE SEARCH & CHIPS */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold shadow-inner shadow-blue-500/20 animate-float">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% In-Browser • Zero Cloud Uploads • Offline Ready</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Every File Tool.{' '}
              <span className="gradient-text">Instant &amp; Private.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
              Fast, privacy-first utilities for PDF, image, camera scan, document &amp; file processing.
            </p>
          </div>

          {/* Interactive Live Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 focus-within:bg-slate-900 rounded-2xl border border-white/10 hover:border-blue-500/40 focus-within:border-cyan-400 px-4 py-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
              <Search className="w-4 h-4 text-cyan-400 mr-3 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 46 tools (e.g. compress pdf, camera, word)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <kbd className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700">
                    ⌘K
                  </kbd>
                  <kbd className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700">
                    /
                  </kbd>
                </div>
              )}
            </div>

            {/* Quick File Drop Hint */}
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-center gap-2">
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tip: Drag &amp; drop any file anywhere on the screen to auto-detect the best tool!</span>
            </div>
          </div>

          {/* Interactive Quick Trending Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Trending:</span>
            {[
              { name: '📷 Camera Scan', slug: 'scan-to-pdf' },
              { name: 'Compress PDF', slug: 'compress-pdf' },
              { name: 'Merge PDF', slug: 'merge-pdf' },
              { name: 'Compress Image', slug: 'compress-image' },
              { name: 'Word to PDF', slug: 'word-to-pdf' },
              { name: 'PPT to PDF', slug: 'ppt-to-pdf' },
              { name: 'Lock PDF', slug: 'lock-pdf' },
              { name: 'QR Code', slug: 'qr-code-studio' },
            ].map((p) => (
              <Link
                key={p.slug}
                href={`/tools/${p.slug}`}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 border border-white/5 text-slate-400 hover:text-white transition-all text-[11px] hover:scale-105"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </section>

        {/* PINNED / FAVORITES SECTION (Shown if user has pinned tools) */}
        {favoriteTools.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Your Pinned Tools</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold uppercase">
                      Quick Access ({favoriteTools.length})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tools you pinned for one-click access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFavorites([]);
                  localStorage.removeItem('fileforge_favorites');
                }}
                className="text-xs text-slate-500 hover:text-rose-400 transition"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {favoriteTools.map((tool) => (
                <InteractiveToolCard
                  key={tool.slug}
                  tool={tool}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        {/* POPULAR TOOLS SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-amber-400/20" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Popular Tools</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold uppercase tracking-wider">
                    Most Used
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Quick start into the most common conversion, camera scan &amp; compression tasks
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Instant • Zero Uploads</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularTools.map((tool) => (
              <InteractiveToolCard
                key={tool.slug}
                tool={tool}
                isFavorite={favorites.includes(tool.slug)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>

        {/* ALL TOOLS CATALOG WITH INTERACTIVE TABS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>All Tools</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} shown)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Browse our complete suite of {TOOLS.length} private client-side utilities
              </p>
            </div>

            {/* Interactive Pill Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                    : 'bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All ({categoryCounts.all})
              </button>

              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                      : 'bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-60">({categoryCounts[cat.id]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tools Grid */}
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredTools.map((tool) => (
                <InteractiveToolCard
                  key={tool.slug}
                  tool={tool}
                  isFavorite={favorites.includes(tool.slug)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/10 space-y-3">
              <Layers className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-white">No tools found matching &quot;{searchQuery}&quot;</h3>
              <p className="text-xs text-slate-400">Try searching for &quot;pdf&quot;, &quot;image&quot;, &quot;compress&quot;, or clear the search.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              >
                Show All 46 Tools
              </button>
            </div>
          )}
        </section>

        {/* INTERACTIVE STATS / PRIVACY BANNER */}
        <section className="max-w-4xl mx-auto px-4 pt-4">
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-wrap items-center justify-around gap-4 text-center text-xs text-slate-400">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-slate-300 font-medium">46 Client-Side Tools</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-slate-300 font-medium">0 KB Uploaded to Cloud</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-slate-300 font-medium">100% Free &amp; Offline Ready</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
