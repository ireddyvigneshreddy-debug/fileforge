'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Shield, Cpu, Activity } from 'lucide-react';

interface ProcessingStateProps {
  progress: number;
  message: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ progress, message }) => {
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  const telemetryLines = [
    'QUANTUM_CORE // CLIENT-SIDE WASM ACCELERATION ACTIVE',
    'ORBITAL_PIPELINE // STREAM DECOMPRESSION ENGAGED',
    'ISOLATION_MATRIX // ZERO NETWORK EGRESS CONFIRMED',
    'CALIBRATION_ARRAY // OPTIMIZING RESOLUTION & GLYPH CLARITY',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryIndex((prev) => (prev + 1) % telemetryLines.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [telemetryLines.length]);

  return (
    <div className="relative p-8 sm:p-12 rounded-3xl bg-slate-950/85 border border-cyan-500/30 text-center space-y-7 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(0,240,255,0.2)] overflow-hidden">
      {/* Laser Scanning Bar Sweep */}
      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm pointer-events-none animate-laser" />
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none animate-laser" />

      {/* Corner HUD Reticles */}
      <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

      {/* Top Station Telemetry Tag */}
      <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-cyan-400/70 border-b border-cyan-500/15 pb-2.5">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          ORBITAL_WORKSTATION // CORE_BUSY
        </span>
        <span className="text-purple-400 font-bold tracking-widest">[PID: 0x8F4A]</span>
      </div>

      {/* 3D Deep-Space Orbital Gyroscope / Planetary Ring Scanner */}
      <div className="relative w-28 h-28 mx-auto flex items-center justify-center select-none">
        {/* Core Glow Aura */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />

        {/* Central Quantum Reactor Sphere */}
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 via-blue-600 to-purple-700 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.8)] z-10">
          <Cpu className="w-5 h-5 text-white animate-pulse" />
        </div>

        {/* Outer Orbital Ring (Tilted 65deg X, rotating clockwise) */}
        <div
          className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/50 pointer-events-none"
          style={{
            transform: 'rotateX(68deg) rotateY(15deg)',
            animation: 'spin 4s linear infinite',
          }}
        >
          {/* Orbital Satellite Node */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_10px_#00f0ff]" />
        </div>

        {/* Inner Counter-Orbital Ring (Tilted opposing axis, rotating counter-clockwise) */}
        <div
          className="absolute w-20 h-20 rounded-full border border-purple-400/60 pointer-events-none"
          style={{
            transform: 'rotateX(60deg) rotateY(-35deg)',
            animation: 'spin 3s linear infinite reverse',
          }}
        >
          {/* Second Orbital Satellite Node */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc]" />
        </div>

        {/* Outer Laser Scanning Coordinate Ring */}
        <div
          className="absolute w-28 h-28 rounded-full border border-white/10 pointer-events-none"
          style={{
            transform: 'rotateX(75deg)',
            animation: 'spin 7s linear infinite',
          }}
        />
      </div>

      {/* Telemetry Status Messages */}
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-glow-cyan">SYSTEM ENGAGED: PROCESSING LOCAL PAYLOAD</span>
        </h4>
        <p className="text-xs sm:text-sm text-slate-300 font-medium">
          {message || 'Executing client-side quantum WebAssembly engine...'}
        </p>
        <div className="text-[10px] font-mono text-cyan-400/80 tracking-wider h-4 transition-all duration-300">
          » {telemetryLines[telemetryIndex]}
        </div>
      </div>

      {/* Cybernetic HUD Progress Bar with Telemetry Readout */}
      <div className="w-full max-w-md mx-auto space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>PROGRESS</span>
          <span className="text-cyan-400 font-bold">{Math.round(Math.max(5, Math.min(100, progress)))}%</span>
          <span>EST: REALTIME</span>
        </div>
        <div className="w-full bg-slate-900/90 rounded-full h-3 p-0.5 overflow-hidden border border-cyan-500/30 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
          <div
            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.6)]"
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      {/* Security Telemetry Footer */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% PRIVATE HARDWARE SANDBOX • ZERO DATA TRANSMITTED TO ORBITAL CLOUD</span>
      </div>
    </div>
  );
};
