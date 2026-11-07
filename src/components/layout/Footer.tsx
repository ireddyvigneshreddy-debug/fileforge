'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, Bug, Copy, Check, MessageSquare } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

const DEVELOPER_EMAIL = 'ireddyvigneshreddy@gmail.com';

export const Footer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(DEVELOPER_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-10 mt-16 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Developer Feedback & Issue Reporting Strip */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm flex items-center gap-2">
                <span>Encountered an error or want a tool improved?</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono uppercase">
                  Fast Fixes
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Report bugs, compression quality issues, or request fixes directly to the developer:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            {/* Email display and copy */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <a
                href={`mailto:${DEVELOPER_EMAIL}`}
                className="font-mono text-cyan-300 hover:text-cyan-200 transition font-medium select-all"
              >
                {DEVELOPER_EMAIL}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                title="Copy email"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Direct Mailto CTA */}
            <a
              href={`mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(
                '[FileForge Bug Report / Fix Request]'
              )}&body=${encodeURIComponent(
                'Hi Vignesh,\n\nI want to report an issue / request a fix:\n\nTool / Page:\nIssue description:\n'
              )}`}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/10 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-950" />
              <span>Email Report</span>
            </a>
          </div>
        </div>

        {/* Main Footer Links & Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 text-slate-400">
            <BrandLogo size={22} glow={false} />
            <span className="font-semibold text-white">FileForge Pro</span>
            <span>&mdash; 51 Private Local-First Tools</span>
          </div>

          {/* Minimal Navigation */}
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/#ai" className="hover:text-white transition">
              AI &amp; OCR
            </Link>
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
            <span>Zero Server Uploads &bull; 100% Private</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
