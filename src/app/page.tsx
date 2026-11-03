'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { IconRenderer } from '@/components/common/IconRenderer';
import { QuickFindModal } from '@/components/common/QuickFindModal';
import { TOOLS, CATEGORIES, ToolCategory, ToolDefinition } from '@/lib/tools-registry';
import {
  Search,
  ShieldCheck,
  ArrowRight,
  Zap,
  Sparkles,
  Flame,
} from 'lucide-react';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [isQuickFindOpen, setIsQuickFindOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Cmd+K' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && document.activeElement !== searchInputRef.current)
      ) {
        e.preventDefault();
        setIsQuickFindOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTools = useMemo(() => {
    if (selectedCategory === 'all') return TOOLS;
    return TOOLS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: TOOLS.length,
      pdf: TOOLS.filter((t) => t.category === 'pdf').length,
      image: TOOLS.filter((t) => t.category === 'image').length,
      document: TOOLS.filter((t) => t.category === 'document').length,
      utility: TOOLS.filter((t) => t.category === 'utility').length,
    };
  }, []);

  const popularTools = useMemo(() => {
    const popularSlugs = [
      'compress-pdf',
      'word-to-pdf',
      'merge-pdf',
      'compress-files',
      'compress-image',
      'ppt-to-pdf',
      'convert-image',
      'lock-pdf',
    ];
    return popularSlugs
      .map((slug) => TOOLS.find((t) => t.slug === slug))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, []);

  const getCategoryTheme = (cat: ToolCategory) => {
    switch (cat) {
      case 'pdf':
        return {
          color: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          glow: 'from-rose-500/20 to-orange-500/10',
        };
      case 'image':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          glow: 'from-emerald-500/20 to-teal-500/10',
        };
      case 'document':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          glow: 'from-amber-500/20 to-yellow-500/10',
        };
      case 'utility':
        return {
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          glow: 'from-purple-500/20 to-indigo-500/10',
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] ambient-glow-1 pointer-events-none" />

      <Navbar onSearchClick={() => setIsQuickFindOpen(true)} />

      {/* Spotlight Command Palette Modal */}
      <QuickFindModal isOpen={isQuickFindOpen} onClose={() => setIsQuickFindOpen(false)} />

      <main className="flex-1 w-full space-y-12 py-10 relative z-10">
        {/* HERO SECTION — MINIMAL & PUNCHY */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium animate-float">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% In-Browser • Zero Uploads</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Every File Tool.{' '}
              <span className="gradient-text">Instant &amp; Private.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
              Fast client-side utilities for PDF, image, document &amp; file processing.
            </p>
          </div>

          {/* Minimal Search Trigger */}
          <div className="max-w-xl mx-auto relative group">
            <div
              onClick={() => setIsQuickFindOpen(true)}
              className="flex items-center bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-white/10 hover:border-blue-500/40 px-4 py-3 shadow-xl backdrop-blur-xl cursor-pointer transition"
            >
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                readOnly
                placeholder="Search 45 tools..."
                className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-500 cursor-pointer focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700">
                  ⌘K
                </kbd>
                <kbd className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700">
                  /
                </kbd>
              </div>
            </div>
          </div>

          {/* Quick Trending Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
            {[
              { name: 'Compress Files', slug: 'compress-files' },
              { name: 'Merge PDF', slug: 'merge-pdf' },
              { name: 'PPT to PDF', slug: 'ppt-to-pdf' },
              { name: 'Compress Image', slug: 'compress-image' },
              { name: 'Word to PDF', slug: 'word-to-pdf' },
              { name: 'Lock PDF', slug: 'lock-pdf' },
              { name: 'QR Code', slug: 'qr-code-studio' },
            ].map((p) => (
              <Link
                key={p.slug}
                href={`/tools/${p.slug}`}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-[11px]"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </section>

        {/* POPULAR TOOLS — IMMEDIATE ACTION FOR USERS */}
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
                  Quick start into the most common conversion &amp; compression tasks
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Instant • Zero Uploads</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {popularTools.map((tool) => {
              const theme = getCategoryTheme(tool.category);
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group relative p-4 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/10 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.color} group-hover:scale-110 transition-transform duration-200 shadow-md`}
                      >
                        <IconRenderer name={tool.icon} className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-medium capitalize">
                        {tool.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
                        <span>{tool.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-slate-500">Free forever</span>
                    <span className="text-blue-400 font-semibold group-hover:underline flex items-center gap-0.5">
                      Launch →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ALL TOOLS CATALOG WITH TABS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                All Tools
              </h2>
              <p className="text-xs text-slate-400">
                Browse our complete suite of {TOOLS.length} private client-side utilities
              </p>
            </div>

            {/* Minimal Pill Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All ({categoryCounts.all})
              </button>

              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
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

          {/* Clean, Breathable Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredTools.map((tool) => {
              const theme = getCategoryTheme(tool.category);
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.color} group-hover:scale-105 transition-transform`}
                      >
                        <IconRenderer name={tool.icon} className="w-5 h-5" />
                      </div>

                      {tool.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-[10px] uppercase tracking-wider">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                        <span>{tool.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition text-blue-400" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* MINIMAL STATS / PRIVACY BANNER */}
        <section className="max-w-4xl mx-auto px-4 pt-4">
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-wrap items-center justify-around gap-4 text-center text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">45 In-Browser Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">0 KB Uploaded to Cloud</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-medium">100% Free Forever</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
