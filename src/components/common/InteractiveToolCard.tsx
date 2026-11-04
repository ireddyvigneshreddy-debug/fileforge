'use client';

import React, { useState } from 'react';
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const getCategoryTheme = (cat: ToolCategory) => {
    switch (cat) {
      case 'pdf':
        return {
          color: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          accent: 'rgba(244, 63, 94, 0.15)',
        };
      case 'image':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          accent: 'rgba(16, 185, 129, 0.15)',
        };
      case 'document':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          accent: 'rgba(245, 158, 11, 0.15)',
        };
      case 'utility':
        return {
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          accent: 'rgba(139, 92, 246, 0.15)',
        };
    }
  };

  const theme = getCategoryTheme(tool.category);

  return (
    <Link
      href={`/tools/${tool.slug}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1.5"
      style={{
        boxShadow: isHovered
          ? `0 18px 36px -12px ${theme.accent}, 0 0 20px 0 ${theme.accent}`
          : undefined,
      }}
    >
      {/* Interactive Cursor Spotlight Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, ${theme.accent}, transparent 80%)`,
          }}
        />
      )}

      {/* Subtle background glow */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none ${theme.bg}`}
      />

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-md`}
          >
            <IconRenderer name={tool.icon} className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Star Favorite Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => onToggleFavorite(tool.slug, e)}
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
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
            <span>{tool.name}</span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1.5 transition-all" />
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
        <span className="text-slate-500 font-medium">100% Client-Side</span>
        <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
          Open Tool <ArrowRight className="w-3 h-3 inline" />
        </span>
      </div>
    </Link>
  );
};
