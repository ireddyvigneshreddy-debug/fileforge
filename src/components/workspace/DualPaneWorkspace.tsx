'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Layers,
  Scan,
  ShieldCheck,
  Search,
  Star,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Lock,
  Scissors,
  Combine,
  Wrench,
  Clock,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { TOOLS, CATEGORIES, ToolDefinition, ToolCategory } from '@/lib/tools-registry';
import { BatchPipelineStudio } from '@/components/pipeline/BatchPipelineStudio';
import { ClientSideOCRScanner } from '@/components/ocr/ClientSideOCRScanner';
import { AutoPurgeSecurityModal } from '@/components/security/AutoPurgeSecurityModal';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface DualPaneWorkspaceProps {
  children?: React.ReactNode;
  activeTool?: ToolDefinition;
}

export const DualPaneWorkspace: React.FC<DualPaneWorkspaceProps> = ({
  children,
  activeTool,
}) => {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'tools' | 'pipeline' | 'ocr'>('tools');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [purgeTimerMinutes, setPurgeTimerMinutes] = useState(60);

  // Auto-switch tab if current URL is one of the flagship studio tools
  useEffect(() => {
    if (pathname.includes('batch-pipeline')) {
      setActiveTab('pipeline');
    } else if (pathname.includes('ocr-extract-text')) {
      setActiveTab('ocr');
    }
  }, [pathname]);

  // Load favorites and purge timer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFavs = localStorage.getItem('fileforge_favorites');
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
        const savedPurge = localStorage.getItem('fileforge_purge_interval');
        if (savedPurge) setPurgeTimerMinutes(parseInt(savedPurge, 10));
      } catch (e) {
        console.warn('Workspace storage error:', e);
      }
    }
  }, []);

  const filteredSidebarTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const q = sidebarFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, sidebarFilter]);

  // Categorized tool counts
  const counts = useMemo(() => {
    return {
      all: TOOLS.length,
      pdf: TOOLS.filter((t) => t.category === 'pdf').length,
      image: TOOLS.filter((t) => t.category === 'image').length,
      document: TOOLS.filter((t) => t.category === 'document').length,
      ai: TOOLS.filter((t) => t.category === 'ai').length,
      utility: TOOLS.filter((t) => t.category === 'utility').length,
    };
  }, []);

  const handleWipeNow = () => {
    if (typeof window !== 'undefined') {
      // Clear memory buffers
      sessionStorage.clear();
      // Revoke any known object URLs
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-140px)] w-full relative">
      {/* 1. COLLAPSIBLE SIDEBAR (DESKTOP / TABLET) */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/10 bg-slate-950/70 backdrop-blur-xl transition-all duration-300 z-20 shrink-0 ${
          isSidebarCollapsed ? 'w-18' : 'w-72 lg:w-80'
        }`}
      >
        {/* Sidebar Header & Toggle */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Tool Catalog</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition mx-auto cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Search & Category Tabs (Expanded State) */}
        {!isSidebarCollapsed && (
          <div className="p-3.5 space-y-3 border-b border-white/5">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter 48 tools..."
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
                className="w-full bg-slate-900/90 pl-8 pr-3 py-1.5 rounded-xl border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Quick Category Chips */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'ai', label: 'AI & OCR', count: counts.ai },
                { id: 'pdf', label: 'PDF', count: counts.pdf },
                { id: 'image', label: 'Image', count: counts.image },
                { id: 'document', label: 'Docs', count: counts.document },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as ToolCategory | 'all')}
                  className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Tool Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredSidebarTools.map((tool) => {
            const isActive = activeTool?.slug === tool.slug || pathname.includes(tool.slug);

            if (isSidebarCollapsed) {
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition group relative ${
                    isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  title={`${tool.name} (${tool.category})`}
                >
                  <FileText className="w-4 h-4" />
                </Link>
              );
            }

            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition group ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tool.category === 'ai'
                        ? 'bg-cyan-400'
                        : tool.category === 'pdf'
                        ? 'bg-rose-400'
                        : tool.category === 'image'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-medium truncate">{tool.name}</span>
                </div>
                {tool.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300 group-hover:text-white shrink-0 ml-1">
                    {tool.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer Security Status */}
        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-emerald-300 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Purge ({purgeTimerMinutes}m)</span>
            </button>
            <span className="text-[9px] font-mono text-slate-500">WASM RAM</span>
          </div>
        )}
      </aside>

      {/* 2. CENTRAL SPACIOUS WORKSPACE STAGE */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 pb-20 md:pb-8">
        {/* Workspace Telemetry & Privacy Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">100% Client-Side WebAssembly (WASM) Engine</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Zero bytes uploaded to servers • Total privacy in device RAM</span>
          </div>

          <button
            type="button"
            onClick={() => setIsSecurityModalOpen(true)}
            className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; Auto-Purge</span>
          </button>
        </div>

        {/* WORKSPACE TAB SWITCHER */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-950/80 border border-white/10 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Active Tool Workstation</span>
            {activeTool && <span className="text-[10px] opacity-80">({activeTool.name})</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>Batch Pipeline Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ocr'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scan className="w-4 h-4 text-emerald-300" />
            <span>Client-Side OCR Scanner</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT PANELS */}
        <div className="flex-1 w-full">
          {activeTab === 'tools' && (
            <div className="w-full transition-opacity duration-200">
              {children}
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="w-full transition-opacity duration-200">
              <BatchPipelineStudio />
            </div>
          )}

          {activeTab === 'ocr' && (
            <div className="w-full transition-opacity duration-200">
              <ClientSideOCRScanner />
            </div>
          )}
        </div>
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION (TOUCH OPTIMIZED) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
      />

      {/* 4. SECURITY & AUTO-DESTRUCTION MODAL */}
      <AutoPurgeSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onWipeNow={handleWipeNow}
      />
    </div>
  );
};
