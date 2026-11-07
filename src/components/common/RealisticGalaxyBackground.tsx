'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Star {
  // Cylindrical / Galactic coordinates
  radius: number;
  angle: number;
  speed: number;
  z: number; // thickness of galactic disk
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface DistantStar {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export const RealisticGalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse for gentle 3D parallax tilt
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse (-1 to 1)
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetTiltX = nx * 0.18; // Max horizontal tilt in radians
      targetTiltY = ny * 0.12; // Max vertical tilt in radians
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    // -------------------------------------------------------------
    // GENERATE 3D SPIRAL GALAXY STARS
    // -------------------------------------------------------------
    const GALAXY_STAR_COUNT = 1400;
    const ARMS_COUNT = 3;
    const GALAXY_MAX_RADIUS = Math.min(window.innerWidth, window.innerHeight) * 0.48;

    // Palette: realistic cosmic stellar colors
    const coreColors = [
      'rgba(255, 255, 255, ',
      'rgba(255, 240, 215, ',
      'rgba(254, 215, 170, ',
      'rgba(253, 230, 138, ',
    ];
    const armColors = [
      'rgba(147, 197, 253, ', // Ice blue
      'rgba(103, 232, 249, ', // Neon cyan
      'rgba(196, 181, 253, ', // Lavender violet
      'rgba(165, 180, 252, ', // Electric indigo
      'rgba(244, 114, 182, ', // Subtle magenta ionization
    ];

    const galaxyStars: Star[] = [];

    for (let i = 0; i < GALAXY_STAR_COUNT; i++) {
      // Distribute stars with higher density towards galactic center
      const rRatio = Math.pow(Math.random(), 1.7);
      const radius = 12 + rRatio * GALAXY_MAX_RADIUS;

      // Assign to spiral arm with natural angular spread
      const armIndex = i % ARMS_COUNT;
      const armAngleOffset = (armIndex * 2 * Math.PI) / ARMS_COUNT;
      // Logarithmic spiral twist
      const spiralTwist = Math.log(radius / 10 + 1) * 2.8;
      // Dispersion around the arm spine (tighter near center, broader at tips)
      const dispersion = (Math.random() - 0.5) * (0.35 + (radius / GALAXY_MAX_RADIUS) * 0.45);
      const angle = armAngleOffset + spiralTwist + dispersion;

      // Disk vertical thickness (z) has Gaussian-like distribution, thinner at rim
      const diskThickness = (1 - radius / GALAXY_MAX_RADIUS) * 45 + 15;
      const z = (Math.random() - 0.5) * diskThickness;

      // Rotation speed follows flat galactic rotation curve (approx ~1/r^0.3)
      const speed = (0.0018 / Math.pow(radius / 25, 0.45)) * (0.8 + Math.random() * 0.4);

      // Color choice: Core is warm amber/gold; arms are blue/cyan/violet
      const isCore = radius < GALAXY_MAX_RADIUS * 0.28;
      const palette = isCore ? coreColors : armColors;
      const color = palette[Math.floor(Math.random() * palette.length)];

      const size = Math.random() < 0.12 ? 1.6 + Math.random() * 0.9 : 0.6 + Math.random() * 0.8;
      const baseAlpha = isCore
        ? 0.45 + Math.random() * 0.45
        : 0.25 + Math.random() * 0.55;

      galaxyStars.push({
        radius,
        angle,
        speed,
        z,
        size,
        baseAlpha,
        twinkleSpeed: 0.015 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2,
        color,
      });
    }

    // -------------------------------------------------------------
    // GENERATE DISTANT DEEP SPACE STARS
    // -------------------------------------------------------------
    const DISTANT_STAR_COUNT = 180;
    const distantStars: DistantStar[] = [];
    for (let i = 0; i < DISTANT_STAR_COUNT; i++) {
      distantStars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: 0.2 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.1,
        alpha: 0.15 + Math.random() * 0.5,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Fixed 3D orientation: Tilt galaxy ~64 deg on X axis for iconic perspective disk
    const BASE_TILT_X = 1.12; // ~64 degrees tilt
    const BASE_TILT_Z = 0.35; // ~20 degrees rotational angle

    let lastTime = performance.now();

    // -------------------------------------------------------------
    // RENDER LOOP
    // -------------------------------------------------------------
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Smooth lerp mouse parallax
      currentTiltX += (targetTiltX - currentTiltX) * 0.04;
      currentTiltY += (targetTiltY - currentTiltY) * 0.04;

      const tiltX = BASE_TILT_X + currentTiltY;
      const tiltZ = BASE_TILT_Z + currentTiltX;

      // Center galaxy slightly upper-center for optimum aesthetic behind hero dropzones
      const centerX = screenW * 0.5;
      const centerY = screenH * 0.42;

      ctx.clearRect(0, 0, screenW, screenH);

      // 1. Draw distant background stars with subtle parallax
      for (let i = 0; i < distantStars.length; i++) {
        const star = distantStars[i];
        star.phase += star.twinkleSpeed;
        const currentAlpha = star.alpha * (0.7 + 0.3 * Math.sin(star.phase));

        const px = star.x + currentTiltX * 25 * star.z;
        const py = star.y + currentTiltY * 25 * star.z;

        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Galactic Core Radiant Glow (volumetric central nebula)
      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        GALAXY_MAX_RADIUS * 0.7
      );
      coreGradient.addColorStop(0, 'rgba(254, 243, 199, 0.18)'); // soft warm core
      coreGradient.addColorStop(0.15, 'rgba(56, 189, 248, 0.12)'); // cyan halo
      coreGradient.addColorStop(0.4, 'rgba(99, 102, 241, 0.07)'); // indigo haze
      coreGradient.addColorStop(0.7, 'rgba(168, 85, 247, 0.03)'); // purple dust
      coreGradient.addColorStop(1, 'rgba(8, 12, 20, 0)');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1.0, Math.cos(tiltX)); // Flatten core circle to match galaxy tilt
      ctx.rotate(tiltZ);
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(0, 0, GALAXY_MAX_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Render 3D Galaxy Stars
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const cosZ = Math.cos(tiltZ);
      const sinZ = Math.sin(tiltZ);

      const fov = 750; // Camera perspective distance

      for (let i = 0; i < galaxyStars.length; i++) {
        const star = galaxyStars[i];

        // Orbit rotation
        star.angle += star.speed * (dt * 60);
        star.twinklePhase += star.twinkleSpeed;

        // Position on galactic disk plane before tilt
        const rawX = Math.cos(star.angle) * star.radius;
        const rawY = Math.sin(star.angle) * star.radius;
        const rawZ = star.z;

        // Apply Z-axis rotation (galaxy orientation)
        const rotX = rawX * cosZ - rawY * sinZ;
        const rotY = rawX * sinZ + rawY * cosZ;
        const rotZ = rawZ;

        // Apply X-axis tilt (3D perspective slant)
        const tiltedY = rotY * cosX - rotZ * sinX;
        const tiltedZ = rotY * sinX + rotZ * cosX;
        const tiltedX = rotX;

        // Perspective 3D projection
        const depth = fov / (fov + tiltedZ);
        const screenX = centerX + tiltedX * depth;
        const screenY = centerY + tiltedY * depth;

        // Depth-based sizing & alpha
        const twinkle = 0.8 + 0.2 * Math.sin(star.twinklePhase);
        const finalAlpha = Math.max(0.04, Math.min(0.9, star.baseAlpha * depth * twinkle));
        const finalSize = Math.max(0.4, star.size * depth);

        // Render star particle
        ctx.fillStyle = `${star.color}${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // Optional tiny glow for bright larger stars
        if (star.size > 1.8 && finalAlpha > 0.45) {
          ctx.fillStyle = `${star.color}${(finalAlpha * 0.25).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, finalSize * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-1000"
      style={{ opacity: 0.85 }}
    >
      {/* 3D Realistic Galaxy Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />

      {/* Subtle Cosmic Ambient Corner Vignettes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-900/15 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-gradient-to-tl from-cyan-900/12 via-blue-900/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
};
