'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { ToolDefinition, ToolCategory } from '@/lib/tools-registry';
import { IconRenderer } from '@/components/common/IconRenderer';

interface InteractiveToolCardProps {
  tool: ToolDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string, e: React.MouseEvent) => void;
  showBadge?: boolean;
}

export const InteractiveToolCard: React.FC<InteractiveToolCardProps> = ({
  tool,
  isFavorite = false,
  onToggleFavorite,
  showBadge = true,
}) => {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only enable 3D interactive tilt on desktop devices with hover & fine pointer
    const checkDesktop = () => {
      const isFinePointer = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches;
      setIsDesktop(isFinePointer);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDesktop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 8.5;
    const rotateY = ((x - centerX) / centerX) * 8.5;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleMouseEnter = () => {
    if (isDesktop) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isDesktop) {
      setIsHovered(false);
      setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
    }
  };

  const getCategoryTheme = (cat: ToolCategory) => {
    switch (cat) {
      case 'pdf':
        return {
          color: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/25',
          accent: 'rgba(244, 63, 94, 0.25)',
          glow: 'rgba(244, 63, 94, 0.4)',
        };
      case 'image':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/25',
          accent: 'rgba(16, 185, 129, 0.25)',
          glow: 'rgba(16, 185, 129, 0.4)',
        };
      case 'document':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/25',
          accent: 'rgba(245, 158, 11, 0.25)',
          glow: 'rgba(245, 158, 11, 0.4)',
        };
      case 'utility':
        return {
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/25',
          accent: 'rgba(139, 92, 246, 0.25)',
          glow: 'rgba(139, 92, 246, 0.4)',
        };
    }
  };

  const theme = getCategoryTheme(tool.category);

  // MOBILE: Ultra-lightweight, 0 3D layers, zero touch lag, instant 120 FPS scrolling
  if (!isDesktop) {
    return (
      <Link
        href={`/tools/${tool.slug}`}
        className="group relative p-4 rounded-2xl bg-slate-900/80 border border-white/10 active:border-cyan-400/50 flex flex-col justify-between overflow-hidden shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.color}`}
            >
              <IconRenderer name={tool.icon} className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1.5">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(tool.slug, e);
                  }}
                  className={`p-1.5 rounded-lg ${
                    isFavorite
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-slate-500 hover:text-amber-400'
                  }`}
                  aria-label="Toggle favorite"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite ? 'fill-amber-400' : ''
                    }`}
                  />
                </button>
              )}

              {showBadge && tool.badge && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-[10px] uppercase tracking-wider">
                  {tool.badge}
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-medium capitalize">
                {tool.category}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>{tool.name}</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>

        <div className="pt-2.5 mt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-slate-500 font-medium">100% In-Browser</span>
          <span className="text-blue-400 font-semibold flex items-center gap-1">
            Open <ArrowRight className="w-3 h-3 inline" />
          </span>
        </div>
      </Link>
    );
  }

  // DESKTOP: Full 3D interactive tilt, parallax translateZ, and specular glare
  return (
    <div className="perspective-1000 w-full" style={{ perspective: '1000px' }}>
      <Link
        href={`/tools/${tool.slug}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between overflow-hidden shadow-xl"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg) translateZ(12px) scale3d(1.025, 1.025, 1.025)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered
            ? 'transform 0.08s ease-out, box-shadow 0.2s ease, border-color 0.2s ease'
            : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s ease, border-color 0.3s ease',
          boxShadow: isHovered
            ? `0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 10px 25px -5px ${theme.accent}, 0 0 15px 0 ${theme.glow}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)`
            : '0 4px 16px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.07)',
        }}
      >
        {isHovered && (
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 transition-opacity duration-200 z-30"
            style={{
              background: `radial-gradient(320px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 80%)`,
            }}
          />
        )}

        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div
          className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none ${theme.bg}`}
          style={{ transform: 'translateZ(-10px)' }}
        />

        <div className="space-y-3 relative z-10" style={{ transformStyle: 'preserve-3d' }}>
          <div className="flex items-center justify-between" style={{ transformStyle: 'preserve-3d' }}>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}
              style={{
                transform: isHovered ? 'translateZ(26px)' : 'translateZ(0px)',
                boxShadow: isHovered ? `0 8px 16px -4px ${theme.accent}` : undefined,
                transition: 'transform 0.2s ease-out, box-shadow 0.2s ease',
              }}
            >
              <IconRenderer name={tool.icon} className="w-5 h-5" />
            </div>

            <div
              className="flex items-center gap-1.5"
              style={{
                transform: isHovered ? 'translateZ(20px)' : 'translateZ(0px)',
                transition: 'transform 0.2s ease-out',
              }}
            >
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(tool.slug, e);
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isFavorite
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-slate-500 hover:text-amber-400 hover:bg-white/5 opacity-0 group-hover:opacity-100'
                  }`}
                  title={isFavorite ? 'Remove from Pinned Favorites' : 'Pin to Favorites'}
                  aria-label="Toggle favorite"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite ? 'fill-amber-400 animate-star-pop' : ''
                    }`}
                  />
                </button>
              )}

              {showBadge && tool.badge && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-[10px] uppercase tracking-wider shadow-sm">
                  {tool.badge}
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-medium capitalize">
                {tool.category}
              </span>
            </div>
          </div>

          <div
            style={{
              transform: isHovered ? 'translateZ(18px)' : 'translateZ(0px)',
              transition: 'transform 0.2s ease-out',
            }}
          >
            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
              <span>{tool.name}</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1.5 transition-all" />
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>

        <div
          className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 relative z-10"
          style={{
            transform: isHovered ? 'translateZ(14px)' : 'translateZ(0px)',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <span className="text-slate-500 font-medium">100% In-Browser</span>
          <span className="text-blue-400 font-semibold group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all flex items-center gap-1">
            Open Tool <ArrowRight className="w-3 h-3 inline" />
          </span>
        </div>
      </Link>
    </div>
  );
};
