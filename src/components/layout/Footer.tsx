import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-slate-950/60 py-8 mt-16 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 text-slate-400">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">FileForge Pro</span>
          <span>&mdash; Local-first file utilities</span>
        </div>

        {/* Minimal Navigation */}
        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/#pdf" className="hover:text-white transition">
            PDF
          </Link>
          <Link href="/#image" className="hover:text-white transition">
            Image
          </Link>
          <Link href="/#document" className="hover:text-white transition">
            Office
          </Link>
          <Link href="/#utility" className="hover:text-white transition">
            Security
          </Link>
        </div>

        {/* Privacy Pill */}
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Server Uploads</span>
        </div>
      </div>
    </footer>
  );
};
