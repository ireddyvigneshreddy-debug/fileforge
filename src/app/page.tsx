'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QuickFindModal } from '@/components/common/QuickFindModal';
import { InteractiveToolCard } from '@/components/common/InteractiveToolCard';
import { Hero3DStage } from '@/components/common/Hero3DStage';
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
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100 selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
      {/* Interactive Drag & Drop Anywhere Detector */}
      <GlobalDropDetector />

      <Navbar onSearchClick={() => setIsQuickFindOpen(true)} />

      {/* Spotlight Command Palette Modal */}
      <QuickFindModal isOpen={isQuickFindOpen} onClose={() => setIsQuickFindOpen(false)} />

      <main className="flex-1 w-full space-y-12 py-10 relative z-10">
        {/* HERO SECTION WITH COMMAND STATION TELEMETRY & SEARCH */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-float">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>ORBITAL_STATION // ZERO_CLOUD_UPLOADS // 100% PRIVATE</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white leading-tight">
              DEEP-SPACE COMMAND.{' '}
              <span className="gradient-text text-glow-cyan">ZERO-CLOUD SUITE.</span>
            </h1>
            <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-xl mx-auto leading-relaxed">
              Client-side quantum array: convert, compress, scan, encrypt, and process 46 formats directly in your browser.
            </p>
          </div>

          {/* Interactive Live Search Bar with Instant Auto-Complete Dropdown */}
          <div className="max-w-xl mx-auto relative group">
            <div className="relative flex items-center bg-slate-950/80 hover:bg-slate-950 focus-within:bg-slate-950 rounded-2xl border border-cyan-500/30 hover:border-cyan-400 focus-within:border-cyan-400 px-4 py-3.5 shadow-[0_0_25px_-5px_rgba(0,240,255,0.2)] backdrop-blur-xl transition-all duration-300">
              {/* Corner HUD Reticles */}
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-cyan-400/50 pointer-events-none" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-cyan-400/50 pointer-events-none" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-cyan-400/50 pointer-events-none" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-cyan-400/50 pointer-events-none" />

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
                className="w-full bg-transparent text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none"
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
                  <kbd className="text-[10px] font-mono bg-slate-900 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/40">
                    ⌘K
                  </kbd>
                  <kbd className="text-[10px] font-mono bg-slate-900 text-cyan-400 px-1.5 py-0.5 rounded-md border border-cyan-500/40">
                    /
                  </kbd>
                </div>
              )}
            </div>

            {/* Instant Live Search Auto-complete Flyout */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950/98 border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.3)] backdrop-blur-2xl p-2 z-40 max-h-80 overflow-y-auto divide-y divide-white/5 animate-in fade-in duration-150 text-left">
                <div className="px-3 py-1.5 text-[10px] font-mono font-semibold text-cyan-400 flex items-center justify-between">
                  <span>TELEMETRY SUGGESTIONS ({filteredTools.length})</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    WASM_OFFLINE_READY
                  </span>
                </div>
                {filteredTools.slice(0, 5).map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-500/10 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <IconRenderer name={tool.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-white group-hover:text-cyan-300 transition truncate">
                            {tool.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 uppercase">
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
            <div className="mt-2 text-xs font-mono text-cyan-400/60 flex items-center justify-center gap-2">
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>[DROP ANY PAYLOAD ANYWHERE ON SCREEN FOR INSTANT AUTODETECT]</span>
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

                {/* Interactive Tactical HUD Category Tabs */}
                <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 scrollbar-none pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'btn-3d bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                        : 'btn-3d-slate bg-slate-950/80 border border-cyan-500/25 text-slate-300 hover:text-cyan-300 hover:border-cyan-400'
                    }`}
                  >
                    [ALL_PROTOCOLS ({categoryCounts.all})]
                  </button>

                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'btn-3d bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                          : 'btn-3d-slate bg-slate-950/80 border border-cyan-500/25 text-slate-300 hover:text-cyan-300 hover:border-cyan-400'
                      }`}
                    >
                      <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                      <span>[{cat.label.toUpperCase()}]</span>
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

        {/* ORBITAL STATION TELEMETRY STATS BANNER */}
        <section className="max-w-4xl mx-auto px-4 pt-4">
          <div className="relative glass-panel-hud rounded-2xl p-4 sm:p-5 border border-cyan-500/30 flex flex-wrap items-center justify-around gap-4 text-center text-xs font-mono text-slate-400 shadow-[0_0_30px_-5px_rgba(0,240,255,0.15)]">
            {/* Corner HUD Reticles */}
            <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-cyan-400 pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-cyan-400 pointer-events-none" />

            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-white font-bold tracking-wider">[46 CLIENT_WASM_ENGINES]</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-white font-bold tracking-wider">[0_BYTES CLOUD_EGRESS]</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-white font-bold tracking-wider">[100% PRIVATE HARDWARE]</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
