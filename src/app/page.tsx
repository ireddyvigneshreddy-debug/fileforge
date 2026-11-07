'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QuickFindModal } from '@/components/common/QuickFindModal';
import { InteractiveToolCard } from '@/components/common/InteractiveToolCard';
import { Hero3DStage } from '@/components/common/Hero3DStage';
import { HeroLiveDropzoneCard } from '@/components/common/HeroLiveDropzoneCard';
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
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

  // Filtered tools based on multi-word tokens for live search, or category when not searching
  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      return TOOLS.filter((t) => {
        const haystack = `${t.name} ${t.description} ${t.category} ${t.keywords.join(' ')} ${t.slug}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    if (selectedCategory === 'all') {
      return TOOLS;
    }
    return TOOLS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: TOOLS.length,
      ai: TOOLS.filter((t) => t.category === 'ai').length,
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
      'ai-document-chat',
      'batch-pipeline',
      'ocr-extract-text',
      'scan-to-pdf',
      'compress-pdf',
      'word-to-pdf',
      'merge-pdf',
      'compress-image',
    ];
    return popularSlugs
      .map((slug) => TOOLS.find((t) => t.slug === slug))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Interactive Drag & Drop Anywhere Detector */}
      <GlobalDropDetector />

      {/* Dynamic Animated Ambient Aura Lighting (Desktop only to prevent mobile GPU lag) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] ambient-glow-1 pointer-events-none" />
      <div className="hidden md:block absolute top-32 left-1/4 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/10 to-transparent blur-3xl pointer-events-none animate-aurora" />
      <div className="hidden md:block absolute top-64 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-purple-600/10 via-blue-600/10 to-transparent blur-3xl pointer-events-none animate-pulse-subtle" />

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

          {/* Interactive Live Search Bar with Instant Auto-Complete Dropdown */}
          <div className="max-w-xl mx-auto relative group">
            <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 focus-within:bg-slate-900 rounded-2xl border border-white/10 hover:border-blue-500/40 focus-within:border-cyan-400 px-4 py-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
              <Search className="w-4 h-4 text-cyan-400 mr-3 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Search 46 tools (e.g. compress pdf, camera, word, qr)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
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

            {/* Instant Live Search Auto-complete Flyout */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/98 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-40 max-h-80 overflow-y-auto divide-y divide-white/5 animate-in fade-in duration-150 text-left">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Quick Suggestions ({filteredTools.length})</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Offline Ready
                  </span>
                </div>
                {filteredTools.slice(0, 5).map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-cyan-400 shrink-0">
                        <IconRenderer name={tool.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition truncate">
                            {tool.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 uppercase">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{tool.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}

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
              { name: '🤖 AI Document Q&A', slug: 'ai-document-chat' },
              { name: '🔄 Batch Pipeline', slug: 'batch-pipeline' },
              { name: '👁️ OCR Scanner', slug: 'ocr-extract-text' },
              { name: '📷 Camera Scan', slug: 'scan-to-pdf' },
              { name: 'Compress PDF', slug: 'compress-pdf' },
              { name: 'Merge PDF', slug: 'merge-pdf' },
              { name: 'Word to PDF', slug: 'word-to-pdf' },
              { name: 'Lock PDF', slug: 'lock-pdf' },
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

          {/* Interactive Live-Dropzone Preview Card */}
          <div className="pt-2">
            <HeroLiveDropzoneCard />
          </div>
        </section>

        {/* DEDICATED LIVE SEARCH RESULTS (Shown immediately when searching) */}
        {searchQuery.trim() ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cyan-500/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Results for &ldquo;{searchQuery}&rdquo;</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-extrabold uppercase">
                      {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} found
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Instant client-side results running 100% offline
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Search</span>
              </button>
            </div>

            {/* Results Grid */}
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
              <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No tools found matching &quot;{searchQuery}&quot;</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Try searching for common terms like &quot;pdf&quot;, &quot;image&quot;, &quot;scan&quot;, &quot;word&quot;, &quot;compress&quot;, or &quot;lock&quot;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Show All 46 Tools
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* 3D INTERACTIVE ISOMETRIC SHOWCASE STAGE (Desktop Only) */}
            <div className="hidden md:block">
              <Hero3DStage />
            </div>

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
                    className="text-xs text-slate-500 hover:text-rose-400 transition cursor-pointer"
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

            {/* ALL TOOLS CATALOG WITH STICKY INTERACTIVE TABS */}
            <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-2">
              <div className="sticky top-16 z-30 bg-[#080c14]/90 backdrop-blur-xl py-3 px-4 sm:px-6 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Tool Catalog</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'})
                    </span>
                  </h2>
                </div>

                {/* Interactive 3D Pill Tabs */}
                <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'btn-3d bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                        : 'btn-3d-slate bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                    }`}
                  >
                    All ({categoryCounts.all})
                  </button>

                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'btn-3d bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                          : 'btn-3d-slate bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                      <span className="text-[10px] opacity-75 font-normal">({categoryCounts[cat.id]})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools Grid */}
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
            </section>
          </>
        )}

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
