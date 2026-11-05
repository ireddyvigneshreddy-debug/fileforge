'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 40,
  glow = true,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none group-hover:scale-105 transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Dynamic Ambient Backglow */}
      {glow && (
        <div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-indigo-500/25 to-fuchsia-500/30 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Cyber-Forge Modern Geometric Monogram SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)]"
      >
        <defs>
          {/* Badge Background Gradients */}
          <linearGradient id="badgeBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#080c14" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="badgeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#6366f1" />
            <stop offset="70%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Primary Top Origami Blade (Cyan to Electric Blue) */}
          <linearGradient id="bladeTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Vertical Anvil Pillar (Deep Indigo / Violet) */}
          <linearGradient id="pillarLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="40%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Forge Heat Crossbar (Neon Magenta to Orange Fire) */}
          <linearGradient id="forgeHeat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="60%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* 3D Isometric Shadow Overlay */}
          <linearGradient id="facetShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          {/* Core Spark Glow Filter */}
          <filter id="logoSparkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Hex-Squircle Shield Container */}
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="18"
          fill="url(#badgeBase)"
          stroke="url(#badgeBorder)"
          strokeWidth="1.75"
        />

        {/* Subtle Internal Geometric Grid Lines */}
        <path
          d="M 12 32 H 52 M 32 12 V 52"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* --- 3D FORGED 'F' MONOGRAM RIBBONS --- */}

        {/* 1. Left Vertical Pillar (Anvil spine) */}
        <path
          d="M 17 17 C 17 15.34 18.34 14 20 14 H 26 V 47 C 26 48.66 24.66 50 23 50 H 20 C 18.34 50 17 48.66 17 47 Z"
          fill="url(#pillarLeft)"
        />

        {/* 2. Top Horizontal Forging Arm (Angular Arrow / Prism Header) */}
        <path
          d="M 23 14 H 46 C 47.66 14 48.74 15.65 48.06 17.17 L 44.8 24.5 C 44.35 25.52 43.34 26.17 42.22 26.17 H 23 V 14 Z"
          fill="url(#bladeTop)"
        />

        {/* 3. Top Specular Bevel Accent */}
        <path
          d="M 24 15 H 45.5 L 43.8 19 H 24 Z"
          fill="rgba(255, 255, 255, 0.35)"
        />

        {/* 4. Middle Forge Heat Ribbon (Glowing Magenta-Orange transformation bar) */}
        <path
          d="M 23 29.5 H 39 C 40.66 29.5 41.74 31.15 41.06 32.67 L 38.6 38.2 C 38.15 39.22 37.14 39.87 36.02 39.87 H 23 V 29.5 Z"
          fill="url(#forgeHeat)"
        />

        {/* 5. Isometric Shadow Fold connecting Pillar & Ribbons */}
        <path
          d="M 23 14 L 26 17 V 47 L 23 50 Z"
          fill="url(#facetShadow)"
          opacity="0.6"
        />

        {/* 6. Glowing Quantum Core Diamond Spark */}
        <g filter="url(#logoSparkGlow)">
          <polygon
            points="46,14 49,18 46,22 43,18"
            fill="#a5f3fc"
          />
          <circle
            cx="46"
            cy="18"
            r="1.2"
            fill="#ffffff"
          />
        </g>
      </svg>
    </div>
  );
};
