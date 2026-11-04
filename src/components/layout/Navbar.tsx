'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CATEGORIES } from '@/lib/tools-registry';
import { PWAInstallButton } from '@/components/common/PWARegistration';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check initial mode
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
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950/80 rounded-[11px] flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
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
            href="/#pdf"
            className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            PDF Tools
          </Link>
          <Link
            href="/#image"
            className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            Image Tools
          </Link>
          <Link
            href="/#document"
            className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            Office & Docs
          </Link>
          <Link
            href="/#utility"
            className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
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

          <button
            onClick={onSearchClick}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-sm flex items-center gap-2 transition"
            title="Search tools (Press /)"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline text-xs text-slate-400">Search 40+ tools...</span>
            <kbd className="hidden lg:inline text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              /
            </kbd>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 border-b border-white/10 px-4 pt-2 pb-4 space-y-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/#${cat.id}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base text-slate-200 hover:bg-white/5"
            >
              {cat.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Files never leave your browser</span>
          </div>
        </div>
      )}
    </header>
  );
};
