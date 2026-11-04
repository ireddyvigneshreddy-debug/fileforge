'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Camera, FileText, Lock, Sparkles, Zap, ArrowRight, Shield, Layers, Scan } from 'lucide-react';

export const Hero3DStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 6, rotateY: 0, glareX: 50, glareY: 50 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeSlate, setActiveSlate] = useState<number | null>(null);

  // Mouse move handler over 3D stage
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth tilt angles
    const rotateX = 6 - ((y - centerY) / centerY) * 12; // -6deg to +18deg
    const rotateY = ((x - centerX) / centerX) * 16;     // -16deg to +16deg
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleMouseEnter = () => setIsInteracting(true);
  const handleMouseLeave = () => {
    setIsInteracting(false);
    setActiveSlate(null);
    setTilt({ rotateX: 6, rotateY: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl mx-auto py-8 sm:py-12 px-2 sm:px-4 perspective-1200 select-none"
      style={{ perspective: '1200px' }}
    >
      {/* 3D Floor Perspective Ground Plane */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-48 cyber-grid-3d pointer-events-none opacity-40 transition-opacity duration-500"
        style={{
          transform: `rotateX(72deg) translateZ(-40px) scale(${isInteracting ? 1.05 : 1})`,
          transformOrigin: 'bottom center',
        }}
      />

      {/* Ambient 3D Spotlight Aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-purple-600/20 blur-3xl pointer-events-none rounded-full transition-transform duration-700"
        style={{
          transform: `translate(-50%, -50%) rotate(${tilt.rotateY * 2}deg) scale(${isInteracting ? 1.15 : 1})`,
        }}
      />

      {/* 3D Floating Isometric Stage */}
      <div
        className="relative preserve-3d transition-transform duration-200 ease-out grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center"
        style={{
          transform: `rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* SLATE 1: 3D Camera Scanner */}
        <Link
          href="/tools/scan-to-pdf"
          onMouseEnter={() => setActiveSlate(1)}
          onMouseLeave={() => setActiveSlate(null)}
          className="group relative rounded-3xl p-6 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 backdrop-blur-xl shadow-2xl cursor-pointer overflow-hidden flex flex-col justify-between h-72 md:h-80"
          style={{
            transform: activeSlate === 1
              ? 'translateZ(60px) rotateY(-4deg) scale(1.05)'
              : 'translateZ(20px) rotateY(8deg) scale(0.98)',
            transformStyle: 'preserve-3d',
            boxShadow: activeSlate === 1
              ? '0 30px 60px -15px rgba(16, 185, 129, 0.35), 0 0 35px rgba(16, 185, 129, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.25s ease',
          }}
        >
          {/* Laser Scanning Line Animation */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent blur-[1px] animate-laser shadow-[0_0_12px_#34d399] z-20 pointer-events-none" />

          {/* Holographic scanner grid backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

          {/* Header Tag */}
          <div className="flex items-center justify-between relative z-10" style={{ transform: 'translateZ(25px)' }}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold tracking-wider uppercase shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Direct Camera
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          {/* 3D Mock Viewfinder Display */}
          <div
            className="relative my-auto p-4 rounded-2xl bg-black/50 border border-emerald-500/20 flex flex-col items-center justify-center text-center space-y-2 group-hover:border-emerald-500/50 transition-colors"
            style={{ transform: 'translateZ(35px)' }}
          >
            {/* Viewfinder Target Corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Camera Scan to PDF</p>
              <p className="text-[10px] text-emerald-300/80">Capture documents in 4K with auto-crop</p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold relative z-10 pt-2 border-t border-emerald-500/20" style={{ transform: 'translateZ(20px)' }}>
            <span className="text-[11px] text-slate-400 font-normal">No app download needed</span>
            <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Scanner <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* SLATE 2: 3D Central File Forge Studio (Elevated Hero Centerpiece) */}
        <Link
          href="/tools/compress-pdf"
          onMouseEnter={() => setActiveSlate(2)}
          onMouseLeave={() => setActiveSlate(null)}
          className="group relative rounded-3xl p-7 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-blue-500/40 hover:border-cyan-400 transition-all duration-300 backdrop-blur-2xl shadow-2xl cursor-pointer overflow-hidden flex flex-col justify-between h-80 md:h-92 z-20"
          style={{
            transform: activeSlate === 2
              ? 'translateZ(85px) scale(1.08)'
              : 'translateZ(50px) scale(1.02)',
            transformStyle: 'preserve-3d',
            boxShadow: activeSlate === 2
              ? '0 35px 70px -15px rgba(59, 130, 246, 0.45), 0 0 45px rgba(6, 182, 212, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
              : '0 25px 50px -15px rgba(59, 130, 246, 0.3), 0 0 25px rgba(59, 130, 246, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.25s ease',
          }}
        >
          {/* 3D Dynamic Specular Light Glare */}
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl opacity-50 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.3) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 75%)`,
            }}
          />

          {/* Header Tag */}
          <div className="flex items-center justify-between relative z-10" style={{ transform: 'translateZ(35px)' }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/30 to-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-[10px] font-extrabold tracking-wider uppercase shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />
              Most Popular • Instant Engine
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-[1px] shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <div className="w-full h-full bg-slate-950/80 rounded-[11px] flex items-center justify-center text-cyan-400">
                <Zap className="w-4 h-4 fill-cyan-400" />
              </div>
            </div>
          </div>

          {/* Multi-layered 3D Document Deck */}
          <div
            className="relative my-auto flex flex-col items-center justify-center py-2"
            style={{ transform: 'translateZ(50px)' }}
          >
            {/* Stacked 3D Paper Layer 1 (Back) */}
            <div
              className="absolute w-44 h-24 rounded-xl bg-blue-900/30 border border-blue-400/20 -rotate-6 transition-transform group-hover:-rotate-12 duration-300"
              style={{ transform: 'translateZ(-15px)' }}
            />
            {/* Stacked 3D Paper Layer 2 (Middle) */}
            <div
              className="absolute w-44 h-24 rounded-xl bg-indigo-900/40 border border-cyan-400/20 rotate-4 transition-transform group-hover:rotate-8 duration-300"
              style={{ transform: 'translateZ(-5px)' }}
            />
            {/* Front Paper Slate */}
            <div
              className="relative w-48 h-26 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/20 p-3 shadow-2xl flex items-center gap-3"
              style={{ transform: 'translateZ(15px)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">Compress PDF</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">-80%</span>
                </div>
                <p className="text-[10px] text-slate-400">Shrink size with zero quality loss</p>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-3/4 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Feature Pills */}
          <div className="flex items-center justify-center gap-2 relative z-10 text-[10px]" style={{ transform: 'translateZ(30px)' }}>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">Merge</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">Split</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">Word to PDF</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">Convert</span>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 relative z-10 pt-2 border-t border-white/10" style={{ transform: 'translateZ(25px)' }}>
            <span className="text-[11px] text-slate-400 font-normal">Offline Ready Engine</span>
            <span className="flex items-center gap-1 group-hover:translate-x-1.5 transition-transform text-white group-hover:text-cyan-300">
              Open 46 Tools <ArrowRight className="w-4 h-4 text-cyan-400" />
            </span>
          </div>
        </Link>

        {/* SLATE 3: 3D Offline Security Vault */}
        <Link
          href="/tools/lock-pdf"
          onMouseEnter={() => setActiveSlate(3)}
          onMouseLeave={() => setActiveSlate(null)}
          className="group relative rounded-3xl p-6 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-purple-500/30 hover:border-purple-400 transition-all duration-300 backdrop-blur-xl shadow-2xl cursor-pointer overflow-hidden flex flex-col justify-between h-72 md:h-80"
          style={{
            transform: activeSlate === 3
              ? 'translateZ(60px) rotateY(4deg) scale(1.05)'
              : 'translateZ(20px) rotateY(-8deg) scale(0.98)',
            transformStyle: 'preserve-3d',
            boxShadow: activeSlate === 3
              ? '0 30px 60px -15px rgba(168, 85, 247, 0.35), 0 0 35px rgba(168, 85, 247, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.25s ease',
          }}
        >
          {/* Subtle background security matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

          {/* Header Tag */}
          <div className="flex items-center justify-between relative z-10" style={{ transform: 'translateZ(25px)' }}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold tracking-wider uppercase shadow-inner">
              <Shield className="w-3 h-3 text-purple-400" />
              100% Client-Side
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* 3D Vault Emblem Display */}
          <div
            className="relative my-auto p-4 rounded-2xl bg-black/50 border border-purple-500/20 flex flex-col items-center justify-center text-center space-y-2 group-hover:border-purple-500/50 transition-colors"
            style={{ transform: 'translateZ(35px)' }}
          >
            {/* Concentric rotating security rings */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-dashed border-purple-400/40 animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-2 rounded-full border border-purple-500/30" />
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-white tracking-wide">AES-256 Offline Vault</p>
              <p className="text-[10px] text-purple-300/80">Processed in RAM • Zero server logs</p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold relative z-10 pt-2 border-t border-purple-500/20" style={{ transform: 'translateZ(20px)' }}>
            <span className="text-[11px] text-slate-400 font-normal">Works without internet</span>
            <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Protect Files <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* 3D Interactive Badge Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-slate-300 font-medium">3D Interactive Stage</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-500 text-[11px] hidden sm:inline">Move cursor to tilt in real-time</span>
        </div>
      </div>
    </div>
  );
};
