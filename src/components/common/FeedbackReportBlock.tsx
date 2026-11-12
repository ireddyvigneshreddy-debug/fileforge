'use client';

import React, { useState } from 'react';
import {
  Mail,
  Copy,
  Check,
  Send,
  AlertCircle,
  Bug,
  MessageSquare,
  Sparkles,
  ExternalLink,
  LifeBuoy,
} from 'lucide-react';

interface FeedbackReportBlockProps {
  toolName?: string;
  toolSlug?: string;
  initialError?: string | null;
  compact?: boolean;
}

const DEVELOPER_EMAIL = 'ireddyvigneshreddy@gmail.com';

type ReportType = 'bug' | 'quality' | 'feature' | 'other';

export const FeedbackReportBlock: React.FC<FeedbackReportBlockProps> = ({
  toolName,
  toolSlug,
  initialError,
  compact = false,
}) => {
  const [reportType, setReportType] = useState<ReportType>(
    initialError ? 'bug' : 'bug'
  );
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(DEVELOPER_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const generateMailtoUrl = () => {
    const typeLabel =
      reportType === 'bug'
        ? 'Bug / Processing Error'
        : reportType === 'quality'
        ? 'Output Quality / Compression Issue'
        : reportType === 'feature'
        ? 'Feature / Improvement Request'
        : 'Feedback';

    const subject = encodeURIComponent(
      `[FileForge Report] ${typeLabel}${toolName ? ` - ${toolName}` : ''}`
    );

    const lines: string[] = [
      `Hello Vignesh,`,
      ``,
      `I would like to report an issue / request a fix on FileForge Pro:`,
      ``,
      `--- ISSUE DETAILS ---`,
      `Report Type: ${typeLabel}`,
      toolName ? `Tool: ${toolName} (${toolSlug || ''})` : `Location: ${typeof window !== 'undefined' ? window.location.href : 'FileForge'}`,
      initialError ? `Error Message: ${initialError}` : '',
      ``,
      `--- USER DESCRIPTION ---`,
      message.trim() || `(Describe what went wrong or what happened here...)`,
      ``,
      `--- SYSTEM TELEMETRY ---`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
      `Screen: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}`,
      `Time: ${new Date().toISOString()}`,
      ``,
      `Thank you!`,
    ].filter((line) => line !== undefined);

    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = generateMailtoUrl();
    if (typeof window !== 'undefined') {
      window.location.href = mailtoUrl;
    }
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  return (
    <div
      className={`rounded-2xl border transition relative overflow-hidden text-left ${
        initialError
          ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.1)]'
          : 'bg-slate-900/80 border-white/10 shadow-xl'
      } ${compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'}`}
    >
      {/* Decorative gradient corner glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              initialError
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
            }`}
          >
            {initialError ? <AlertCircle className="w-5 h-5" /> : <LifeBuoy className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{initialError ? 'Report Processing Error' : 'Report an Issue or Request a Fix'}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                Direct Developer Support
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Found a bug, blurriness, or tool error? Let me know directly and I will fix it immediately.
            </p>
          </div>
        </div>

        {/* Direct Email Pill with Copy Button */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs shrink-0">
          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <a
            href={`mailto:${DEVELOPER_EMAIL}`}
            className="font-mono text-cyan-300 hover:text-cyan-200 transition font-medium select-all"
            title="Click to compose email"
          >
            {DEVELOPER_EMAIL}
          </a>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Copy email address"
            aria-label="Copy email address"
          >
            {copied ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                <Check className="w-3.5 h-3.5" />
                Copied
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* If an initial error was passed (e.g. from ToolRunner catch) */}
      {initialError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-400 uppercase text-[10px] tracking-wider">
            <Bug className="w-3.5 h-3.5" />
            <span>Detected Error Output:</span>
          </div>
          <div className="break-words select-all">{initialError}</div>
        </div>
      )}

      {/* Interactive Form */}
      <form onSubmit={handleSendEmail} className="mt-4 space-y-4 relative z-10">
        {/* Report Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Issue Category:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'bug', label: 'Bug / Processing Failed', icon: Bug },
              { id: 'quality', label: 'Quality / Size Calibration Issue', icon: AlertCircle },
              { id: 'feature', label: 'Feature Request / Fix Request', icon: Sparkles },
              { id: 'other', label: 'Other Feedback', icon: MessageSquare },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = reportType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setReportType(type.id as ReportType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow-sm'
                      : 'bg-slate-950/60 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message / Details Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Details or Steps to Reproduce:
            </label>
            <span className="text-[10px] text-slate-500">
              {toolName ? `Applies to ${toolName}` : 'All 51 local-first tools'}
            </span>
          </div>
          <textarea
            rows={compact ? 2 : 3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              toolName
                ? `e.g. When using ${toolName}, I selected a 3.28 MB file and set 925 KB target, but it compressed to 700 KB...`
                : 'Describe what happened, what file type or size you were converting, or what fix you need...'
            }
            className="w-full bg-slate-950/90 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-y font-sans leading-relaxed"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sends directly to Developer mailbox ({DEVELOPER_EMAIL})</span>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={`mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(
                `[FileForge Inquiry] Support / Fix Request${toolName ? ` - ${toolName}` : ''}`
              )}`}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Blank Email</span>
            </a>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span>Send Report via Email</span>
            </button>
          </div>
        </div>

        {sentSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-300">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Opening your email client to send to <strong>{DEVELOPER_EMAIL}</strong>. Thank you for helping improve FileForge!
            </span>
          </div>
        )}
      </form>
    </div>
  );
};
