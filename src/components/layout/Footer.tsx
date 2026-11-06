import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl py-8 mt-16 text-xs text-slate-500 font-mono relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 text-slate-400">
          <BrandLogo size={22} glow={false} />
          <span className="font-bold text-white tracking-wider text-glow-cyan">FILEFORGE PRO</span>
          <span className="text-[10px] text-cyan-400/70 hidden sm:inline">[ORBITAL_STATION // WASM_CORE]</span>
        </div>

        {/* Minimal Navigation */}
        <div className="flex items-center gap-4 text-slate-400 text-xs">
          <Link href="/#pdf" className="hover:text-cyan-300 transition">
            [PDF]
          </Link>
          <Link href="/#image" className="hover:text-cyan-300 transition">
            [IMAGE]
          </Link>
          <Link href="/#document" className="hover:text-cyan-300 transition">
            [OFFICE]
          </Link>
          <Link href="/#utility" className="hover:text-cyan-300 transition">
            [SECURITY]
          </Link>
        </div>

        {/* Privacy Pill */}
        <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-semibold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>ZERO_SERVER_UPLOADS // 100% PRIVATE</span>
        </div>
      </div>
    </footer>
  );
};
