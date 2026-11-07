'use client';

import React from 'react';
import { Sparkles, Layers, Scan, ShieldCheck, Wrench } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'tools' | 'ai' | 'pipeline' | 'ocr';
  onTabChange: (tab: 'tools' | 'ai' | 'pipeline' | 'ocr') => void;
  onOpenSecurity: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSecurity,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 shadow-[0_-8px_20px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto text-[10px] font-medium text-slate-400">
        {/* 1. Tools */}
        <button
          type="button"
          onClick={() => onTabChange('tools')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
            activeTab === 'tools' ? 'text-blue-400 font-bold bg-blue-500/10' : 'hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4 mb-0.5" />
          <span>Tools</span>
        </button>

        {/* 2. AI Chat & Summarizer */}
        <button
          type="button"
          onClick={() => onTabChange('ai')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
            activeTab === 'ai' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-cyan-400" />
          <span>AI Chat</span>
        </button>

        {/* 3. Batch Pipeline Studio */}
        <button
          type="button"
          onClick={() => onTabChange('pipeline')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
            activeTab === 'pipeline' ? 'text-indigo-400 font-bold bg-indigo-500/10' : 'hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Pipeline</span>
        </button>

        {/* 4. Client-side OCR */}
        <button
          type="button"
          onClick={() => onTabChange('ocr')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
            activeTab === 'ocr' ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'hover:text-white'
          }`}
        >
          <Scan className="w-4 h-4 mb-0.5 text-emerald-400" />
          <span>OCR</span>
        </button>

        {/* 5. Security & Auto-Purge */}
        <button
          type="button"
          onClick={onOpenSecurity}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl hover:text-white transition"
        >
          <ShieldCheck className="w-4 h-4 mb-0.5 text-emerald-400" />
          <span>Security</span>
        </button>
      </div>
    </nav>
  );
};
