'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  layer: number; // 1: far, 2: mid, 3: near
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
}

interface Debris {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  angle: number;
  vRot: number;
  points: number[];
  opacity: number;
}

export const DeepSpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let debrisList: Debris[] = [];
    let shootingStar: ShootingStar | null = null;
    let nextShootingStarTime = Date.now() + 2500;

    // Mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let isMobile = false;

    // Color palette for distant astral bodies
    const starColors = [
      '#ffffff',
      '#e0f2fe', // ice blue
      '#bae6fd', // celestial cyan
      '#f5d0fe', // soft nebula purple
      '#c4b5fd', // electric lavender
      '#ffffff',
    ];

    const initCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      isMobile = width < 768;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);

      // Star count optimized for 60-120fps
      const starCount = isMobile ? 75 : 170;
      stars = [];

      for (let i = 0; i < starCount; i++) {
        // Layers: 60% far, 28% mid, 12% near
        const rand = Math.random();
        let layer = 1;
        let size = Math.random() * 0.9 + 0.4;
        let baseAlpha = Math.random() * 0.5 + 0.2;

        if (rand > 0.88) {
          layer = 3;
          size = Math.random() * 1.4 + 1.6;
          baseAlpha = Math.random() * 0.4 + 0.6;
        } else if (rand > 0.6) {
          layer = 2;
          size = Math.random() * 1.0 + 1.0;
          baseAlpha = Math.random() * 0.4 + 0.4;
        }

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          layer,
          baseAlpha,
          twinkleSpeed: Math.random() * 0.04 + 0.015,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }

      // Micro-asteroids / cosmic debris (desktop only for performance)
      debrisList = [];
      if (!isMobile) {
        const debrisCount = 7;
        for (let i = 0; i < debrisCount; i++) {
          const numVerts = Math.floor(Math.random() * 3) + 5; // 5-7 sided polygon
          const points: number[] = [];
          for (let v = 0; v < numVerts; v++) {
            points.push(0.7 + Math.random() * 0.6);
          }

          debrisList.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3.5 + 2.5,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() * 0.12 + 0.05), // slow downward cosmic drift
            angle: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.008,
            points,
            opacity: Math.random() * 0.25 + 0.12,
          });
        }
      }
    };

    initCanvasSize();

    // Mouse movement listener with smooth dampening
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      targetMouseX = (e.clientX - width / 2) * 0.035;
      targetMouseY = (e.clientY - height / 2) * 0.035;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', initCanvasSize);

    // Animation loop
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      // Fill pitch black void
      ctx.fillStyle = '#03050a';
      ctx.fillRect(0, 0, width, height);

      // Draw faint deep-space background grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      const offsetX = mouseX * 0.2 % gridSize;
      const offsetY = mouseY * 0.2 % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.restore();

      // Render Stars with multi-layered parallax
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Layer parallax multiplier
        const pFactor = star.layer === 3 ? 0.9 : star.layer === 2 ? 0.45 : 0.18;
        const drawX = star.x - mouseX * pFactor;
        const drawY = star.y - mouseY * pFactor;

        // Twinkle calculation
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase);
        const currentAlpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle * 0.25));

        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha;

        if (star.layer === 3 && currentAlpha > 0.65) {
          // Subtle diamond glow cross on nearest bright stars
          ctx.beginPath();
          ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fillRect(drawX - star.size * 2, drawY - 0.5, star.size * 4, 1);
          ctx.fillRect(drawX - 0.5, drawY - star.size * 2, 1, star.size * 4);
        } else {
          ctx.beginPath();
          ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render cosmic debris (micro-asteroids)
      ctx.globalAlpha = 1;
      for (let d = 0; d < debrisList.length; d++) {
        const item = debrisList[d];
        item.x += item.vx;
        item.y += item.vy;
        item.angle += item.vRot;

        // Wrap around boundaries
        if (item.x < -20) item.x = width + 20;
        if (item.x > width + 20) item.x = -20;
        if (item.y > height + 20) item.y = -20;

        const pX = item.x - mouseX * 0.35;
        const pY = item.y - mouseY * 0.35;

        ctx.save();
        ctx.translate(pX, pY);
        ctx.rotate(item.angle);
        ctx.fillStyle = `rgba(148, 163, 184, ${item.opacity})`;
        ctx.strokeStyle = `rgba(0, 240, 255, ${item.opacity * 0.5})`;
        ctx.lineWidth = 0.75;

        ctx.beginPath();
        const numP = item.points.length;
        for (let p = 0; p < numP; p++) {
          const theta = (p / numP) * Math.PI * 2;
          const r = item.size * item.points[p];
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Shooting stars (random cosmic streaks)
      const currentTime = Date.now();
      if (!shootingStar && currentTime > nextShootingStarTime) {
        shootingStar = {
          x: Math.random() * (width * 0.75),
          y: Math.random() * (height * 0.4),
          length: Math.random() * 90 + 70,
          speed: Math.random() * 850 + 600,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
          opacity: 1,
          active: true,
        };
      }

      if (shootingStar && shootingStar.active) {
        shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed * dt;
        shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed * dt;
        shootingStar.opacity -= dt * 1.5;

        if (shootingStar.opacity <= 0 || shootingStar.x > width + 100 || shootingStar.y > height + 100) {
          shootingStar = null;
          nextShootingStarTime = currentTime + Math.random() * 6000 + 4000;
        } else {
          ctx.save();
          const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
          const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

          const grad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
          grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
          grad.addColorStop(0.7, `rgba(168, 85, 247, ${shootingStar.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${shootingStar.opacity})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(shootingStar.x, shootingStar.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Draw single frame and do not loop
      render(performance.now());
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    // Pause when tab is hidden to save GPU / battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!prefersReducedMotion) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', initCanvasSize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* HTML5 Parallax Canvas Starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Atmospheric Nebula Ambient Dust Clouds */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-indigo-700/18 via-purple-600/10 to-transparent blur-[120px] rounded-full pointer-events-none animate-pulse-subtle" />
      <div className="absolute top-1/4 -right-40 w-[650px] h-[650px] bg-gradient-to-bl from-cyan-600/14 via-blue-700/10 to-transparent blur-[130px] rounded-full pointer-events-none animate-aurora" />
      <div className="absolute -bottom-36 left-1/3 w-[700px] h-[550px] bg-gradient-to-t from-purple-800/15 via-indigo-900/10 to-transparent blur-[140px] rounded-full pointer-events-none" />

      {/* Subtle Station HUD Vignette Frame */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_45%,rgba(2,4,10,0.8)_100%] pointer-events-none" />

      {/* Corner HUD Telemetry Markers */}
      <div className="hidden lg:block absolute top-4 left-6 text-[9px] font-mono tracking-widest text-cyan-400/35 uppercase select-none">
        [SYS_COORD // ORBITAL_STATION_ALPHA // POS: 42°19&apos;N 18°22&apos;W]
      </div>
      <div className="hidden lg:block absolute top-4 right-6 text-[9px] font-mono tracking-widest text-purple-400/35 uppercase select-none">
        [DEEP_SPACE_TELEMETRY // SECURE_ISOLATION_ACTIVE]
      </div>
      <div className="hidden lg:block absolute bottom-4 left-6 text-[9px] font-mono tracking-widest text-slate-500/35 uppercase select-none">
        [SYS_STATUS: 100%_CLIENT_SIDE // ZERO_OUTBOUND_EGRESS]
      </div>
      <div className="hidden lg:block absolute bottom-4 right-6 text-[9px] font-mono tracking-widest text-cyan-400/35 uppercase select-none">
        [QUANTUM_WASM_ARRAY // READY]
      </div>
    </div>
  );
};
