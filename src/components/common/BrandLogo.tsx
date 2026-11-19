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
      {/* Dynamic Ambient Holographic Glow */}
      {glow && (
        <div
          className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-cyan-500/40 via-indigo-500/35 to-fuchsia-500/40 blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Futuristic & Premium Obsidian-Prism Monogram SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)]"
      >
        <defs>
          {/* Background Luxury Deep Obsidian Radial Glass */}
          <radialGradient id="obsidianGlass" cx="45%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#131b2e" />
            <stop offset="40%" stopColor="#0a0f1d" />
            <stop offset="80%" stopColor="#040711" />
            <stop offset="100%" stopColor="#020308" />
          </radialGradient>

          {/* Celestial Quantum Plasma Glow */}
          <radialGradient id="quantumGlow" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#ec4899" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Outer Chamfered Luxury Titanium / Iridescent Border */}
          <linearGradient id="titaniumRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="25%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="75%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Subtle Inner Bevel Shadow for Glass Inset Depth */}
          <linearGradient id="innerBevelLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="15%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="85%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </linearGradient>

          {/* Vertical Anvil Spine (Forged Cyber-Titanium) */}
          <linearGradient id="spineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="20%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>

          {/* Top Laser Aerodynamic Origami Blade */}
          <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="30%" stopColor="#00f0ff" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Top Specular Chrome Flare */}
          <linearGradient id="topSpecular" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          {/* Active Fusion Forge Crossbar (Hot Hyper-Plasma) */}
          <linearGradient id="forgePlasma" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="40%" stopColor="#fb7185" />
            <stop offset="75%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>

          {/* Middle Blade Specular Edge */}
          <linearGradient id="midSpecular" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#fef08a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* 3D Bevel Crease Facet Shadow */}
          <linearGradient id="creaseFacet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="40%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Stellar Nova Beacon Filter */}
          <filter id="stellarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur1" />
            <feGaussianBlur stdDeviation="20" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Core Monogram Ambient Glow */}
          <filter id="monogramAura" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base Squircle Container */}
        <rect
          x="24"
          y="24"
          width="464"
          height="464"
          rx="144"
          fill="url(#obsidianGlass)"
          stroke="url(#titaniumRim)"
          strokeWidth="12"
        />

        {/* 2. Luxury Inner Glass Reflection Rim */}
        <rect
          x="30"
          y="30"
          width="452"
          height="452"
          rx="138"
          fill="none"
          stroke="url(#innerBevelLight)"
          strokeWidth="2.5"
          opacity="0.85"
        />

        {/* 3. Quantum Ambient Core Plasma */}
        <circle cx="256" cy="256" r="205" fill="url(#quantumGlow)" />

        {/* 4. Subtle Precision Optical Blueprint Rings */}
        <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1.5" strokeDasharray="4 8" />
        <circle cx="256" cy="256" r="135" fill="none" stroke="rgba(129, 140, 248, 0.06)" strokeWidth="1" />
        <circle cx="256" cy="256" r="80" fill="none" stroke="rgba(236, 72, 153, 0.05)" strokeWidth="1" strokeDasharray="2 6" />

        {/* Center Crosshairs Reticle */}
        <path
          d="M 72 256 H 104 M 408 256 H 440 M 256 72 V 104 M 256 408 V 440"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* 5. 3D Quantum-Forged 'F' Monogram */}
        <g filter="url(#monogramAura)">
          {/* Anvil Spine */}
          <path
            d="M 134 136 C 134 120 146 108 162 108 H 206 V 376 C 206 392 194 404 178 404 H 162 C 146 404 134 392 134 376 Z"
            fill="url(#spineGrad)"
          />

          {/* Spine Specular Light Edge */}
          <path
            d="M 136 140 C 136 124 146 114 160 114 H 168 V 398 H 160 C 146 398 136 388 136 374 Z"
            fill="rgba(255, 255, 255, 0.22)"
          />

          {/* Top Aerodynamic Laser Origami Arm */}
          <path
            d="M 182 108 H 368 C 382 108 392 122 386 136 L 358 198 C 353 208 343 214 332 214 H 182 V 108 Z"
            fill="url(#bladeGrad)"
          />

          {/* Top Laser Arm - Polished Mirror Bevel */}
          <path
            d="M 186 114 H 364 C 372 114 378 122 374 130 L 360 156 C 357 162 351 166 344 166 H 186 V 114 Z"
            fill="url(#topSpecular)"
          />

          {/* Middle Fusion Forge Plasma Crossbar */}
          <path
            d="M 182 238 H 316 C 330 238 340 252 334 266 L 310 314 C 305 324 295 330 284 330 H 182 V 238 Z"
            fill="url(#forgePlasma)"
          />

          {/* Middle Bar - Specular Upper Edge */}
          <path
            d="M 186 242 H 312 L 298 270 H 186 V 242 Z"
            fill="url(#midSpecular)"
          />

          {/* Isometric 3D Shadow Fold */}
          <path
            d="M 182 108 L 206 132 V 380 L 182 404 Z"
            fill="url(#creaseFacet)"
            opacity="0.85"
          />
          <path
            d="M 182 108 L 186 112 V 400 L 182 404 Z"
            fill="rgba(255, 255, 255, 0.35)"
          />
        </g>

        {/* 6. Hyper-Stellar Beacon Nova */}
        <g filter="url(#stellarGlow)">
          <path
            d="M 368 82 Q 368 118 404 118 Q 368 118 368 154 Q 368 118 332 118 Q 368 118 368 82 Z"
            fill="#ffffff"
          />
          <path
            d="M 368 96 Q 368 118 390 118 Q 368 118 368 140 Q 368 118 346 118 Q 368 118 368 96 Z"
            fill="#a5f3fc"
          />
          <circle cx="368" cy="118" r="6" fill="#ffffff" />
          <circle cx="368" cy="118" r="12" fill="#38bdf8" opacity="0.4" />
          <line x1="320" y1="142" x2="416" y2="94" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
};
