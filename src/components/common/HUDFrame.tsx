'use client';

import React from 'react';

interface HUDFrameProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'blue';
  telemetry?: string;
  statusBadge?: string;
  isInteractive?: boolean;
}

export const HUDFrame: React.FC<HUDFrameProps> = ({
  children,
  className = '',
  glowColor = 'cyan',
  telemetry,
  statusBadge,
  isInteractive = false,
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'purple':
        return {
          border: 'border-purple-500/25',
          reticle: 'text-purple-400',
          shadow: 'shadow-[0_0_25px_-5px_rgba(168,85,247,0.15)]',
          hoverBorder: 'hover:border-purple-400/60',
          hoverShadow: 'hover:shadow-[0_0_35px_rgba(168,85,247,0.25)]',
          badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        };
      case 'emerald':
        return {
          border: 'border-emerald-500/25',
          reticle: 'text-emerald-400',
          shadow: 'shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]',
          hoverBorder: 'hover:border-emerald-400/60',
          hoverShadow: 'hover:shadow-[0_0_35px_rgba(16,185,129,0.25)]',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        };
      case 'amber':
        return {
          border: 'border-amber-500/25',
          reticle: 'text-amber-400',
          shadow: 'shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]',
          hoverBorder: 'hover:border-amber-400/60',
          hoverShadow: 'hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]',
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      case 'blue':
        return {
          border: 'border-blue-500/25',
          reticle: 'text-blue-400',
          shadow: 'shadow-[0_0_25px_-5px_rgba(59,130,246,0.15)]',
          hoverBorder: 'hover:border-blue-400/60',
          hoverShadow: 'hover:shadow-[0_0_35px_rgba(59,130,246,0.25)]',
          badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
        };
      case 'cyan':
      default:
        return {
          border: 'border-cyan-500/25',
          reticle: 'text-cyan-400',
          shadow: 'shadow-[0_0_25px_-5px_rgba(0,240,255,0.15)]',
          hoverBorder: 'hover:border-cyan-400/60',
          hoverShadow: 'hover:shadow-[0_0_35px_rgba(0,240,255,0.25)]',
          badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  const style = getGlowStyles();

  return (
    <div
      className={`relative rounded-2xl sm:rounded-3xl bg-slate-950/70 backdrop-blur-xl border ${style.border} ${style.shadow} ${
        isInteractive ? `${style.hoverBorder} ${style.hoverShadow} transition-all duration-300` : ''
      } ${className}`}
    >
      {/* Corner HUD Reticles */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm pointer-events-none ${style.reticle}`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-sm pointer-events-none ${style.reticle}`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-sm pointer-events-none ${style.reticle}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-sm pointer-events-none ${style.reticle}`} />

      {/* Top Telemetry Header Bar (if present) */}
      {(telemetry || statusBadge) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-[10px] font-mono tracking-wider text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${style.reticle} animate-pulse`} />
            <span className="uppercase">{telemetry || 'TELEMETRY_LINK // ACTIVE'}</span>
          </div>
          {statusBadge && (
            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${style.badgeBg} uppercase`}>
              {statusBadge}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
