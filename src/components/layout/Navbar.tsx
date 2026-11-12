'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Sparkles,
  Layers,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Menu,
  X,
  Sun,
  Moon,
  Bug,
  Mail,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/tools-registry';
import { PWAInstallButton } from '@/components/common/PWARegistration';
import { QuickFindModal } from '@/components/common/QuickFindModal';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { BrandLogo } from '@/components/common/BrandLogo';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const handleOpenSearch = useCallback(() => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      setInternalSearchOpen(true);
    }
  }, [onSearchClick]);

  // Global keyboard shortcut ('/' or 'Cmd+K' / 'Ctrl+K') on every page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        handleOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenSearch]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      setIsDark(isHtmlDark);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof document === 'undefined') return;
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <BrandLogo size={40} />
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                File<span className="gradient-text font-black">Forge</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold ml-1">
                  Pro
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/#ai"
              className="px-2.5 py-1.5 rounded-lg text-xs lg:text-sm text-cyan-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 font-semibold"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI &amp; OCR
            </Link>
            <Link
              href="/#pdf"
              className="px-2.5 py-1.5 rounded-lg text-xs lg:text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              PDF Tools
            </Link>
            <Link
              href="/#image"
              className="px-2.5 py-1.5 rounded-lg text-xs lg:text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Image Tools
            </Link>
            <Link
              href="/#document"
              className="px-2.5 py-1.5 rounded-lg text-xs lg:text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Office &amp; Docs
            </Link>
            <Link
              href="/#utility"
              className="px-2.5 py-1.5 rounded-lg text-xs lg:text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              Utilities
            </Link>
          </nav>

          {/* Right Action: Privacy Badge & Search & Theme */}
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton />

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Client-Side Privacy</span>
            </div>

            {/* Universal Search Button */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-sm flex items-center gap-2 transition cursor-pointer shadow-sm hover:border-cyan-500/30"
              title="Search tools (Press / or ⌘K)"
              aria-label="Search all tools"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline text-xs text-slate-300 font-medium">Search 51 tools...</span>
              <kbd className="hidden lg:inline text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                /
              </kbd>
            </button>

            {/* Direct Feedback / Report Issue Button */}
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/25 text-xs font-semibold transition cursor-pointer"
              title="Report an error or request a fix"
            >
              <Bug className="w-3.5 h-3.5 text-cyan-400" />
              <span>Report Issue</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/98 border-b border-white/10 px-4 pt-3 pb-5 space-y-3">
            {/* Quick Mobile Search Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenSearch();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-600/15 border border-cyan-500/30 text-cyan-300 font-semibold text-sm hover:bg-blue-600/25 transition cursor-pointer"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Search all 51 tools...</span>
              <span className="ml-auto text-[10px] text-emerald-400 font-normal bg-emerald-500/10 px-2 py-0.5 rounded">
                Offline Ready
              </span>
            </button>

            {/* Mobile Feedback & Fix Request Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setFeedbackOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-semibold text-sm hover:bg-cyan-500/20 transition cursor-pointer"
            >
              <Bug className="w-4 h-4 text-cyan-400" />
              <span>Report an Issue or Request Fix</span>
            </button>

            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/#${cat.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/5"
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% In-Browser • Zero Cloud Uploads</span>
            </div>
          </div>
        )}
      </header>

      {/* Built-in Spotlight Search Modal for all pages without external state */}
      {!onSearchClick && (
        <QuickFindModal
          isOpen={internalSearchOpen}
          onClose={() => setInternalSearchOpen(false)}
        />
      )}

      {/* Universal Feedback & Issue Reporting Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
};
