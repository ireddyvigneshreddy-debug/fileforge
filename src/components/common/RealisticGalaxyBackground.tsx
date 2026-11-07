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

    // Track mouse for gentle 3D perspective parallax
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetTiltX = nx * 0.16; // Subtle yaw
      targetTiltY = ny * 0.12; // Subtle pitch
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
    // GALAXY SPECIFICATIONS (Refined, Subtle & Deep Space)
    // -------------------------------------------------------------
    const GALAXY_STAR_COUNT = 1800;
    const ARMS_COUNT = 3;
    const GALAXY_MAX_RADIUS = Math.max(window.innerWidth, window.innerHeight) * 0.58;

    // Subdued, elegant stellar palettes (gentle opacity, natural cosmic hues)
    const coreColors = [
      'rgba(255, 248, 235, ',
      'rgba(254, 235, 200, ',
      'rgba(253, 224, 138, ',
    ];
    const armColors = [
      'rgba(56, 189, 248, ', // Soft cyan
      'rgba(96, 165, 250, ', // Soft sky blue
      'rgba(129, 140, 248, ', // Soft indigo
      'rgba(192, 132, 252, ', // Soft purple
      'rgba(244, 114, 182, ', // Soft magenta
    ];

    const galaxyStars: Star[] = [];

    for (let i = 0; i < GALAXY_STAR_COUNT; i++) {
      const rRatio = Math.pow(Math.random(), 1.65);
      const radius = 10 + rRatio * GALAXY_MAX_RADIUS;

      const armIndex = i % ARMS_COUNT;
      const armAngleOffset = (armIndex * 2 * Math.PI) / ARMS_COUNT;
      const spiralTwist = Math.log(radius / 12 + 1) * 3.0;
      const dispersion = (Math.random() - 0.5) * (0.34 + (radius / GALAXY_MAX_RADIUS) * 0.45);
      const angle = armAngleOffset + spiralTwist + dispersion;

      const diskThickness = (1 - radius / GALAXY_MAX_RADIUS) * 60 + 15;
      const z = (Math.random() - 0.5) * diskThickness;

      const speed = (0.0016 / Math.pow(radius / 20, 0.46)) * (0.85 + Math.random() * 0.3);

      const isCore = radius < GALAXY_MAX_RADIUS * 0.22;
      const palette = isCore ? coreColors : armColors;
      const color = palette[Math.floor(Math.random() * palette.length)];

      const isBright = Math.random() < 0.025;
      const size = isBright
        ? 1.5 + Math.random() * 0.8
        : Math.random() < 0.2
        ? 0.9 + Math.random() * 0.5
        : 0.5 + Math.random() * 0.4;

      // Lower base alpha for a calmer, less blinding presence
      const baseAlpha = isCore
        ? 0.30 + Math.random() * 0.25
        : 0.18 + Math.random() * 0.22;

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
        isBright,
      });
    }

    // -------------------------------------------------------------
    // DISTANT BACKGROUND STARS (FAINT VOID FIELD)
    // -------------------------------------------------------------
    const DISTANT_STAR_COUNT = 200;
    const distantStars: DistantStar[] = [];
    const bgStarColors = ['rgba(255,255,255,', 'rgba(186,230,253,', 'rgba(233,213,255,'];
    for (let i = 0; i < DISTANT_STAR_COUNT; i++) {
      distantStars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: 0.2 + Math.random() * 0.8,
        size: 0.4 + Math.random() * 0.8,
        alpha: 0.12 + Math.random() * 0.25,
        twinkleSpeed: 0.012 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        color: bgStarColors[Math.floor(Math.random() * bgStarColors.length)],
      });
    }

    // -------------------------------------------------------------
    // SUBTLE OCCASIONAL SHOOTING STARS
    // -------------------------------------------------------------
    const shootingStars: ShootingStar[] = [];
    let nextShootingStarTime = performance.now() + 4000;

    const spawnShootingStar = (w: number, h: number) => {
      shootingStars.push({
        x: Math.random() * w * 0.7 + w * 0.15,
        y: Math.random() * h * 0.35,
        length: 50 + Math.random() * 70,
        speed: 9 + Math.random() * 7,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.25,
        alpha: 0.45,
        active: true,
      });
    };

    const BASE_TILT_X = 1.08;
    const BASE_TILT_Z = 0.38;

    let lastTime = performance.now();

    // -------------------------------------------------------------
    // RENDER LOOP
    // -------------------------------------------------------------
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      currentTiltX += (targetTiltX - currentTiltX) * 0.04;
      currentTiltY += (targetTiltY - currentTiltY) * 0.04;

      const tiltX = BASE_TILT_X + currentTiltY;
      const tiltZ = BASE_TILT_Z + currentTiltX;

      const centerX = screenW * 0.5;
      const centerY = screenH * 0.44;

      ctx.clearRect(0, 0, screenW, screenH);

      // Deep space base tint
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, screenW, screenH);

      // 1. Distant Background Stars
      for (let i = 0; i < distantStars.length; i++) {
        const star = distantStars[i];
        star.phase += star.twinkleSpeed;
        const currentAlpha = star.alpha * (0.7 + 0.3 * Math.sin(star.phase));

        const px = star.x + currentTiltX * 20 * star.z;
        const py = star.y + currentTiltY * 20 * star.z;

        ctx.fillStyle = `${star.color}${currentAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Gentle Cosmic Ambient Nebulae (soft ethereal glow, no harsh brightness)
      const nebula1 = ctx.createRadialGradient(
        centerX - 60,
        centerY - 30,
        30,
        centerX - 60,
        centerY - 30,
        GALAXY_MAX_RADIUS * 0.85
      );
      nebula1.addColorStop(0, 'rgba(6, 182, 212, 0.06)'); // gentle cyan
      nebula1.addColorStop(0.4, 'rgba(59, 130, 246, 0.035)'); // subtle blue
      nebula1.addColorStop(0.7, 'rgba(99, 102, 241, 0.015)'); // deep indigo
      nebula1.addColorStop(1, 'rgba(6, 10, 20, 0)');

      ctx.fillStyle = nebula1;
      ctx.beginPath();
      ctx.arc(centerX - 60, centerY - 30, GALAXY_MAX_RADIUS * 0.85, 0, Math.PI * 2);
      ctx.fill();

      const nebula2 = ctx.createRadialGradient(
        centerX + 90,
        centerY + 50,
        20,
        centerX + 90,
        centerY + 50,
        GALAXY_MAX_RADIUS * 0.7
      );
      nebula2.addColorStop(0, 'rgba(217, 70, 239, 0.04)'); // soft magenta
      nebula2.addColorStop(0.5, 'rgba(147, 51, 234, 0.02)'); // soft purple
      nebula2.addColorStop(1, 'rgba(6, 10, 20, 0)');

      ctx.fillStyle = nebula2;
      ctx.beginPath();
      ctx.arc(centerX + 90, centerY + 50, GALAXY_MAX_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 3. Central Galactic Core (calm, warm celestial glow)
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        GALAXY_MAX_RADIUS * 0.4
      );
      coreGrad.addColorStop(0, 'rgba(255, 248, 235, 0.32)'); // Soft warm white center
      coreGrad.addColorStop(0.12, 'rgba(254, 235, 200, 0.20)');
      coreGrad.addColorStop(0.28, 'rgba(251, 191, 36, 0.10)');
      coreGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
      coreGrad.addColorStop(1, 'rgba(6, 10, 20, 0)');

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1.0, Math.cos(tiltX));
      ctx.rotate(tiltZ);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, GALAXY_MAX_RADIUS * 0.4, 0, Math.PI * 2);
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

        star.angle += star.speed * (dt * 60);
        star.twinklePhase += star.twinkleSpeed;

        const rawX = Math.cos(star.angle) * star.radius;
        const rawY = Math.sin(star.angle) * star.radius;
        const rawZ = star.z;

        const rotX = rawX * cosZ - rawY * sinZ;
        const rotY = rawX * sinZ + rawY * cosZ;
        const rotZ = rawZ;

        const tiltedY = rotY * cosX - rotZ * sinX;
        const tiltedZ = rotY * sinX + rotZ * cosX;
        const tiltedX = rotX;

        const depth = fov / (fov + tiltedZ);
        const screenX = centerX + tiltedX * depth;
        const screenY = centerY + tiltedY * depth;

        // Controlled subtle alpha (capped at 0.48 so it never overpowers)
        const twinkle = 0.8 + 0.2 * Math.sin(star.twinklePhase);
        const finalAlpha = Math.max(0.06, Math.min(0.48, star.baseAlpha * depth * twinkle));
        const finalSize = Math.max(0.5, star.size * depth);

        ctx.fillStyle = `${star.color}${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // Subtle soft halo for slightly larger stars (no harsh lens flares)
        if (star.isBright && depth > 0.85) {
          ctx.fillStyle = `${star.color}${(finalAlpha * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, finalSize * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Subtle Shooting Stars
      if (time > nextShootingStarTime) {
        spawnShootingStar(screenW, screenH);
        nextShootingStarTime = time + 6000 + Math.random() * 8000;
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
        ms.alpha -= 0.012;

        if (ms.alpha <= 0 || ms.x > screenW + 100 || ms.y > screenH + 100) {
          ms.active = false;
          continue;
        }

        const tailX = ms.x - Math.cos(ms.angle) * ms.length;
        const tailY = ms.y - Math.sin(ms.angle) * ms.length;

        const grad = ctx.createLinearGradient(tailX, tailY, ms.x, ms.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.7, `rgba(167, 139, 250, ${(ms.alpha * 0.3).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${(ms.alpha * 0.45).toFixed(3)})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
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
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700"
      style={{ opacity: 0.72 }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />

      {/* Atmospheric Soft Vignette for Seamless Blending */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
};
