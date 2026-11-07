'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Star {
  radius: number;
  angle: number;
  speed: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isBright?: boolean;
}

interface DistantStar {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
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

    // Track mouse for 3D perspective parallax
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetTiltX = nx * 0.22; // Horizontal yaw tilt
      targetTiltY = ny * 0.16; // Vertical pitch tilt
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    // -------------------------------------------------------------
    // GALAXY SPECIFICATIONS
    // -------------------------------------------------------------
    const GALAXY_STAR_COUNT = 2400;
    const ARMS_COUNT = 3;
    const GALAXY_MAX_RADIUS = Math.max(window.innerWidth, window.innerHeight) * 0.65;

    // Rich cosmic color palettes (Core: warm golden/stellar white; Arms: electric cyan, cobalt, violet, magenta)
    const coreColors = [
      'rgba(255, 255, 255, ',
      'rgba(254, 240, 215, ',
      'rgba(253, 230, 138, ',
      'rgba(251, 191, 36, ',
    ];
    const armColors = [
      'rgba(56, 189, 248, ', // Electric cyan
      'rgba(96, 165, 250, ', // Vibrant sky blue
      'rgba(129, 140, 248, ', // Deep indigo
      'rgba(192, 132, 252, ', // Cosmic purple
      'rgba(244, 114, 182, ', // Ionized hydrogen magenta
      'rgba(255, 255, 255, ', // Brilliant young stellar clusters
    ];

    const galaxyStars: Star[] = [];

    for (let i = 0; i < GALAXY_STAR_COUNT; i++) {
      // Non-linear radial distribution: dense galactic center, extended swirling arms
      const rRatio = Math.pow(Math.random(), 1.6);
      const radius = 10 + rRatio * GALAXY_MAX_RADIUS;

      // Spiral arms with logarithmic wind
      const armIndex = i % ARMS_COUNT;
      const armAngleOffset = (armIndex * 2 * Math.PI) / ARMS_COUNT;
      const spiralTwist = Math.log(radius / 12 + 1) * 3.1;
      const dispersion = (Math.random() - 0.5) * (0.32 + (radius / GALAXY_MAX_RADIUS) * 0.48);
      const angle = armAngleOffset + spiralTwist + dispersion;

      // Vertical disk height with central bulge
      const diskThickness = (1 - radius / GALAXY_MAX_RADIUS) * 75 + 18;
      const z = (Math.random() - 0.5) * diskThickness;

      // Orbital speed: Keplerian decline for organic fluid spiral rotation
      const speed = (0.0022 / Math.pow(radius / 20, 0.46)) * (0.85 + Math.random() * 0.3);

      const isCore = radius < GALAXY_MAX_RADIUS * 0.25;
      const palette = isCore ? coreColors : armColors;
      const color = palette[Math.floor(Math.random() * palette.length)];

      const isBright = Math.random() < 0.04;
      const size = isBright
        ? 2.2 + Math.random() * 1.4
        : Math.random() < 0.25
        ? 1.2 + Math.random() * 0.8
        : 0.6 + Math.random() * 0.6;

      const baseAlpha = isCore
        ? 0.65 + Math.random() * 0.35
        : 0.45 + Math.random() * 0.45;

      galaxyStars.push({
        radius,
        angle,
        speed,
        z,
        size,
        baseAlpha,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        color,
        isBright,
      });
    }

    // -------------------------------------------------------------
    // DISTANT BACKGROUND STARS (DEEP SPACE VOID)
    // -------------------------------------------------------------
    const DISTANT_STAR_COUNT = 320;
    const distantStars: DistantStar[] = [];
    const bgStarColors = ['rgba(255,255,255,', 'rgba(186,230,253,', 'rgba(233,213,255,', 'rgba(254,243,199,'];
    for (let i = 0; i < DISTANT_STAR_COUNT; i++) {
      distantStars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: 0.2 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.3,
        alpha: 0.25 + Math.random() * 0.65,
        twinkleSpeed: 0.015 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
        color: bgStarColors[Math.floor(Math.random() * bgStarColors.length)],
      });
    }

    // -------------------------------------------------------------
    // OCCASIONAL SHOOTING STARS / METEORS
    // -------------------------------------------------------------
    const shootingStars: ShootingStar[] = [];
    let nextShootingStarTime = performance.now() + 2000;

    const spawnShootingStar = (w: number, h: number) => {
      shootingStars.push({
        x: Math.random() * w * 0.8 + w * 0.1,
        y: Math.random() * h * 0.4,
        length: 70 + Math.random() * 100,
        speed: 12 + Math.random() * 10,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.35,
        alpha: 1.0,
        active: true,
      });
    };

    // Realistic 3D Tilt Parameters
    const BASE_TILT_X = 1.08; // ~62 deg slant
    const BASE_TILT_Z = 0.38; // ~22 deg axial orientation

    let lastTime = performance.now();

    // -------------------------------------------------------------
    // RENDER LOOP
    // -------------------------------------------------------------
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Smooth mouse parallax interpolation
      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;

      const tiltX = BASE_TILT_X + currentTiltY;
      const tiltZ = BASE_TILT_Z + currentTiltX;

      const centerX = screenW * 0.5;
      const centerY = screenH * 0.44;

      // Dark space background clear
      ctx.clearRect(0, 0, screenW, screenH);

      // Deep space atmospheric base tint
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, screenW, screenH);

      // 1. Distant Background Starfield
      for (let i = 0; i < distantStars.length; i++) {
        const star = distantStars[i];
        star.phase += star.twinkleSpeed;
        const currentAlpha = star.alpha * (0.65 + 0.35 * Math.sin(star.phase));

        const px = star.x + currentTiltX * 30 * star.z;
        const py = star.y + currentTiltY * 30 * star.z;

        ctx.fillStyle = `${star.color}${currentAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Cosmic Ambient Nebulae (multi-layered volumetric cloud glow)
      // Large atmospheric nebular cloud 1 (Cyan / Deep Indigo)
      const nebula1 = ctx.createRadialGradient(
        centerX - 80,
        centerY - 40,
        50,
        centerX - 80,
        centerY - 40,
        GALAXY_MAX_RADIUS * 0.95
      );
      nebula1.addColorStop(0, 'rgba(6, 182, 212, 0.16)'); // Cyan core
      nebula1.addColorStop(0.35, 'rgba(59, 130, 246, 0.11)'); // Blue
      nebula1.addColorStop(0.65, 'rgba(99, 102, 241, 0.06)'); // Indigo
      nebula1.addColorStop(1, 'rgba(5, 8, 17, 0)');

      ctx.fillStyle = nebula1;
      ctx.beginPath();
      ctx.arc(centerX - 80, centerY - 40, GALAXY_MAX_RADIUS * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric nebular cloud 2 (Magenta / Purple)
      const nebula2 = ctx.createRadialGradient(
        centerX + 120,
        centerY + 60,
        30,
        centerX + 120,
        centerY + 60,
        GALAXY_MAX_RADIUS * 0.75
      );
      nebula2.addColorStop(0, 'rgba(217, 70, 239, 0.12)'); // Magenta
      nebula2.addColorStop(0.4, 'rgba(147, 51, 234, 0.08)'); // Purple
      nebula2.addColorStop(1, 'rgba(5, 8, 17, 0)');

      ctx.fillStyle = nebula2;
      ctx.beginPath();
      ctx.arc(centerX + 120, centerY + 60, GALAXY_MAX_RADIUS * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // 3. Central Luminous Galactic Core
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        GALAXY_MAX_RADIUS * 0.45
      );
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); // Super-bright core center
      coreGrad.addColorStop(0.08, 'rgba(254, 243, 199, 0.75)'); // Radiant warm white
      coreGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0.45)'); // Golden inner aura
      coreGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)'); // Cyan ionization
      coreGrad.addColorStop(0.7, 'rgba(99, 102, 241, 0.12)'); // Indigo boundary
      coreGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1.0, Math.cos(tiltX)); // Flatten circle into elliptical disk
      ctx.rotate(tiltZ);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, GALAXY_MAX_RADIUS * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. 3D Spiral Galaxy Stars
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const cosZ = Math.cos(tiltZ);
      const sinZ = Math.sin(tiltZ);

      const fov = 850;

      for (let i = 0; i < galaxyStars.length; i++) {
        const star = galaxyStars[i];

        // Orbit update
        star.angle += star.speed * (dt * 60);
        star.twinklePhase += star.twinkleSpeed;

        // Position on galactic disk plane before tilt
        const rawX = Math.cos(star.angle) * star.radius;
        const rawY = Math.sin(star.angle) * star.radius;
        const rawZ = star.z;

        // Rotate in disk plane (tiltZ)
        const rotX = rawX * cosZ - rawY * sinZ;
        const rotY = rawX * sinZ + rawY * cosZ;
        const rotZ = rawZ;

        // Slant in 3D perspective (tiltX)
        const tiltedY = rotY * cosX - rotZ * sinX;
        const tiltedZ = rotY * sinX + rotZ * cosX;
        const tiltedX = rotX;

        // 3D perspective projection
        const depth = fov / (fov + tiltedZ);
        const screenX = centerX + tiltedX * depth;
        const screenY = centerY + tiltedY * depth;

        // Brightness & size scaling based on depth
        const twinkle = 0.75 + 0.25 * Math.sin(star.twinklePhase);
        const finalAlpha = Math.max(0.12, Math.min(1.0, star.baseAlpha * depth * twinkle));
        const finalSize = Math.max(0.6, star.size * depth);

        // Draw star particle
        ctx.fillStyle = `${star.color}${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // Extra realistic diffraction spikes for bright stars
        if (star.isBright && depth > 0.9) {
          // Soft radial glow
          ctx.fillStyle = `${star.color}${(finalAlpha * 0.35).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, finalSize * 3.5, 0, Math.PI * 2);
          ctx.fill();

          // 4-point lens diffraction flare
          const spikeLen = finalSize * 5.5;
          ctx.strokeStyle = `${star.color}${(finalAlpha * 0.55).toFixed(3)})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(screenX - spikeLen, screenY);
          ctx.lineTo(screenX + spikeLen, screenY);
          ctx.moveTo(screenX, screenY - spikeLen);
          ctx.lineTo(screenX, screenY + spikeLen);
          ctx.stroke();
        }
      }

      // 5. Shooting Stars / Meteors
      if (time > nextShootingStarTime) {
        spawnShootingStar(screenW, screenH);
        nextShootingStarTime = time + 4000 + Math.random() * 6000;
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ms = shootingStars[i];
        if (!ms.active) {
          shootingStars.splice(i, 1);
          continue;
        }

        const vx = Math.cos(ms.angle) * ms.speed;
        const vy = Math.sin(ms.angle) * ms.speed;

        ms.x += vx;
        ms.y += vy;
        ms.alpha -= 0.016;

        if (ms.alpha <= 0 || ms.x > screenW + 100 || ms.y > screenH + 100) {
          ms.active = false;
          continue;
        }

        const tailX = ms.x - Math.cos(ms.angle) * ms.length;
        const tailY = ms.y - Math.sin(ms.angle) * ms.length;

        const grad = ctx.createLinearGradient(tailX, tailY, ms.x, ms.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.7, `rgba(167, 139, 250, ${(ms.alpha * 0.6).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${ms.alpha.toFixed(3)})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ms.x, ms.y);
        ctx.stroke();
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
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />

      {/* Atmospheric Cosmic Edge Vignette for Smooth Boundary Blending */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
};
