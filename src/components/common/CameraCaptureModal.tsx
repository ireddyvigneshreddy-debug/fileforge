'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  Trash2,
  AlertCircle,
  FlipHorizontal,
  Image as ImageIcon,
  Zap,
  ZapOff,
  Grid3x3,
  Scan,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosCaptured: (files: File[]) => void;
  maxPhotos?: number;
}

interface CapturedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
}

interface FocusPoint {
  x: number;
  y: number;
  id: number;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotosCaptured,
  maxPhotos = 50,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  // Camera stream state
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolutionLabel, setResolutionLabel] = useState<string>('HD');

  // Flash / Torch state
  const [hasHardwareTorch, setHasHardwareTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // HUD & Framing controls
  const [showGrid, setShowGrid] = useState(false);
  const [framingGuide, setFramingGuide] = useState<'none' | 'document' | 'card'>('none');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tap-to-focus state
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Capture & Shutter states
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Web Audio synthetic sounds for tactile native feedback
  const playSound = useCallback((type: 'shutter' | 'focus') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'shutter') {
        // Mechanical shutter click sound
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.09);

        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(600, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
            gain2.gain.setValueAtTime(0.2, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.06);
          } catch {
            // Ignore audio interruption
          }
        }, 40);
      } else if (type === 'focus') {
        // Subtle optical focus lock chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2100, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Mobile haptic vibration helper
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // Ignore haptic failure
      }
    }
  }, []);

  // Stop camera tracks and reset state
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      // Turn off torch before stopping if on
      const track = streamRef.current.getVideoTracks()[0];
      if (track && isTorchOn) {
        try {
          (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
            advanced: [{ torch: false }],
          });
        } catch {
          // Ignore track stop errors
        }
      }
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsTorchOn(false);
    setHasHardwareTorch(false);
  }, [isTorchOn]);

  // Enumerate available video devices
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  // Start / restart live camera stream
  const startStream = useCallback(async (mode: 'environment' | 'user', specificDeviceId?: string | null) => {
    stopStream();
    setErrorMsg(null);
    setIsSwitchingCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: specificDeviceId
          ? {
              deviceId: { exact: specificDeviceId },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
            }
          : {
              facingMode: { ideal: mode },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Inspect hardware capabilities (torch, zoom, focus)
        try {
          const getCaps = (videoTrack as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities;
          if (typeof getCaps === 'function') {
            const caps = getCaps.call(videoTrack);
            setHasHardwareTorch(Boolean(caps && caps.torch));
          }
        } catch {
          setHasHardwareTorch(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);

        // Compute resolution label once metadata is available
        const v = videoRef.current;
        const w = v.videoWidth || 1920;
        const h = v.videoHeight || 1080;
        if (w >= 3840 || h >= 2160) {
          setResolutionLabel('4K UHD');
        } else if (w >= 1920 || h >= 1080) {
          setResolutionLabel('1080P FHD');
        } else if (w >= 1280 || h >= 720) {
          setResolutionLabel('720P HD');
        } else {
          setResolutionLabel(`${w}×${h}`);
        }
      }

      await updateDeviceList();
    } catch (err: unknown) {
      const e = err as Error;
      console.warn('[Camera] Failed to initialize video feed:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera detected on this device.');
      } else {
        setErrorMsg('Unable to access camera. You can also use the native device camera or file picker.');
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [stopStream, updateDeviceList]);

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotos([]);
      startStream(facingMode, selectedDeviceId);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, [isOpen, facingMode, selectedDeviceId, startStream, stopStream]);

  // 1. TAP-TO-FOCUS INTERACTION
  const handleViewfinderTap = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewfinderRef.current || !isStreaming) return;
    const rect = viewfinderRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Rel coordinate for pointsOfInterest (0 to 1)
    const relX = Math.max(0, Math.min(1, clickX / rect.width));
    const relY = Math.max(0, Math.min(1, clickY / rect.height));

    // Show visual reticle
    const newFocus = { x: clickX, y: clickY, id: Date.now() };
    setFocusPoint(newFocus);
    playSound('focus');
    triggerHaptic();

    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => {
      setFocusPoint(null);
    }, 1600);

    // Apply hardware optical focus if supported by driver
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        try {
          const trackAny = track as unknown as {
            getCapabilities?: () => { focusMode?: string[] };
            applyConstraints: (c: unknown) => Promise<void>;
          };
          const caps = trackAny.getCapabilities ? trackAny.getCapabilities() : {};
          if (caps && caps.focusMode && (caps.focusMode.includes('continuous') || caps.focusMode.includes('manual'))) {
            await trackAny.applyConstraints({
              advanced: [{ focusMode: 'continuous', pointsOfInterest: [{ x: relX, y: relY }] }],
            });
          }
        } catch {
          // Gracefully fallback to visual reticle
        }
      }
    }
  };

  // 2. FLASH / TORCH TOGGLE CONTROL
  const toggleTorch = async () => {
    const nextTorch = !isTorchOn;
    setIsTorchOn(nextTorch);
    triggerHaptic();

    if (streamRef.current && hasHardwareTorch) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
        } catch (err) {
          console.warn('[Camera] Hardware torch constraint failed:', err);
        }
      }
    }
  };

  // 3. FRONT / REAR CAMERA SWITCHING
  const toggleFacingMode = () => {
    setIsSwitchingCamera(true);
    triggerHaptic();

    // If multiple distinct video devices exist, cycle through them
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];
      setSelectedDeviceId(nextDevice.deviceId);
      startStream(facingMode, nextDevice.deviceId);
      return;
    }

    // Otherwise toggle facingMode
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedDeviceId(null);
    startStream(nextMode, null);
  };

  // 4. SHUTTER PHOTO CAPTURE
  const snapPhoto = () => {
    if (!videoRef.current || !isStreaming) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger visual shutter flash, tactile audio, and haptics
    setIsShutterFlashing(true);
    playSound('shutter');
    triggerHaptic();
    setTimeout(() => setIsShutterFlashing(false), 120);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front-facing user camera
    if (facingMode === 'user' && !selectedDeviceId) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        const newPhoto: CapturedPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          blob,
          previewUrl,
        };

        setCapturedPhotos((prev) => [...prev, newPhoto]);
      },
      'image/jpeg',
      0.96
    );
  };

  // Remove photo from captured list
  const deletePhoto = (id: string) => {
    setCapturedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Fallback native mobile camera input
  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: CapturedPhoto[] = Array.from(files).map((f) => ({
      id: `native-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      blob: f,
      previewUrl: URL.createObjectURL(f),
    }));

    setCapturedPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Finalize & pass captured files to parent
  const handleDone = () => {
    if (capturedPhotos.length === 0) {
      onClose();
      return;
    }

    const files = capturedPhotos.map((p, idx) => {
      return new File([p.blob], `photo-capture-${Date.now()}-${idx + 1}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    });

    onPhotosCaptured(files);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP NATIVE HUD BAR */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between z-30 backdrop-blur-xl">
          {/* Status & Telemetry Indicators */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-white/10 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-bold text-white tracking-wider">{isStreaming ? 'LIVE' : 'IDLE'}</span>
              <span className="text-slate-400 font-normal ml-1 hidden sm:inline">• {resolutionLabel}</span>
            </div>

            {/* Multiple Camera Count Badge */}
            {videoDevices.length > 1 && (
              <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full hidden sm:inline">
                {videoDevices.length} Cams
              </span>
            )}
          </div>

          {/* Quick HUD Controls: Torch, Grid, Framing, Sound, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Flash / Torch Toggle */}
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                isTorchOn
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={
                hasHardwareTorch
                  ? `Hardware Torch: ${isTorchOn ? 'ON' : 'OFF'}`
                  : `Screen Illuminator: ${isTorchOn ? 'ACTIVE' : 'OFF'}`
              }
            >
              {isTorchOn ? <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> : <ZapOff className="w-4 h-4 text-slate-400" />}
              <span className="text-[10px] font-bold hidden sm:inline uppercase">
                {isTorchOn ? (hasHardwareTorch ? 'Torch' : 'Light') : 'Flash'}
              </span>
            </button>

            {/* Rule of Thirds Grid Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowGrid((prev) => !prev);
                triggerHaptic();
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                showGrid
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Rule-of-Thirds Grid Overlay"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>

            {/* Document Framing Guide Selector */}
            <button
              type="button"
              onClick={() => {
                setFramingGuide((prev) => (prev === 'none' ? 'document' : prev === 'document' ? 'card' : 'none'));
                triggerHaptic();
              }}
              className={`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                framingGuide !== 'none'
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={`Framing Guide: ${framingGuide.toUpperCase()}`}
            >
              <Scan className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden md:inline uppercase">
                {framingGuide === 'none' ? 'Guides' : framingGuide}
              </span>
            </button>

            {/* Sound FX Toggle */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((prev) => !prev);
                triggerHaptic();
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={soundEnabled ? 'Mute Camera Sound' : 'Enable Camera Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition ml-1 cursor-pointer"
              aria-label="Close camera modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INTERACTIVE VIEWFINDER ZONE (TAP-TO-FOCUS VIEWPORT) */}
        <div
          ref={viewfinderRef}
          onPointerDown={handleViewfinderTap}
          className={`relative flex-1 bg-black flex items-center justify-center min-h-[340px] sm:min-h-[460px] overflow-hidden select-none cursor-crosshair ${
            isTorchOn && !hasHardwareTorch ? 'animate-illuminator ring-4 ring-amber-200/80' : ''
          }`}
          title="Tap anywhere to Focus"
        >
          {/* Shutter Exposure Flash Animation */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white z-40 pointer-events-none opacity-90 animate-out fade-out duration-120" />
          )}

          {/* Screen Illuminator Light Beam (when torch is active without hardware LED) */}
          {isTorchOn && !hasHardwareTorch && (
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(255,255,255,0.7)] border-4 border-amber-200/70" />
          )}

          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transition-transform duration-300 ${
              facingMode === 'user' && !selectedDeviceId ? 'scale-x-[-1]' : ''
            } ${isSwitchingCamera ? 'opacity-40 scale-95 blur-sm' : 'opacity-100 scale-100'}`}
          />

          {/* 1. TAP-TO-FOCUS HOLOGRAPHIC RETICLE */}
          {focusPoint && (
            <div
              key={focusPoint.id}
              style={{ left: focusPoint.x, top: focusPoint.y }}
              className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 w-20 h-20 animate-focus-reticle"
            >
              {/* Outer Focus Target Ring */}
              <div className="w-full h-full border-2 border-emerald-400 rounded-lg relative">
                {/* 4 Precision Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

                {/* Central Optical Focus Crosshair Dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                </div>
              </div>
            </div>
          )}

          {/* 2. RULE-OF-THIRDS ALIGNMENT GRID OVERLAY */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20 relative">
                {/* Center Target Indicator */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <div className="w-4 h-4 border border-cyan-400 rounded-full" />
                </div>
              </div>
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          )}

          {/* 3. DOCUMENT / ID CARD FRAMING GUIDES */}
          {framingGuide === 'document' && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-md aspect-[1/1.414] border-2 border-emerald-400/70 rounded-2xl relative shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                {/* High-visibility Corner Brackets */}
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />
                <div className="absolute top-2 left-3 text-[10px] font-mono font-bold text-emerald-400 tracking-wider bg-black/60 px-2 py-0.5 rounded">
                  A4 DOCUMENT SCANNER
                </div>
              </div>
            </div>
          )}

          {framingGuide === 'card' && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-sm aspect-[1.58/1] border-2 border-cyan-400/70 rounded-2xl relative shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-cyan-400" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-cyan-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-cyan-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-cyan-400" />
                <div className="absolute top-2 left-3 text-[10px] font-mono font-bold text-cyan-400 tracking-wider bg-black/60 px-2 py-0.5 rounded">
                  ID / BADGE CARD FRAME
                </div>
              </div>
            </div>
          )}

          {/* Hint Overlay when starting */}
          {isStreaming && capturedPhotos.length === 0 && !focusPoint && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 font-medium opacity-80 animate-pulse">
              Tap anywhere to focus lens
            </div>
          )}

          {/* Camera Access Error Fallback Screen */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-40">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-lg">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm sm:text-base font-semibold text-white">Camera Access Required</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{errorMsg}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Use Native System Camera
                </button>
                <button
                  type="button"
                  onClick={() => startStream(facingMode, selectedDeviceId)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Hidden Native Mobile Camera Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleNativeFileInput}
            className="hidden"
          />
        </div>

        {/* BOTTOM NATIVE CAMERA CONTROL DECK */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-white/10 space-y-3.5 backdrop-blur-xl">
          {/* Main Shutter Deck */}
          <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
            {/* Left Slot: Camera Switcher (Flip Front/Rear or Cycle Multi-Cam) */}
            <div className="flex items-center gap-2 w-28 sm:w-32 justify-start">
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={!isStreaming || isSwitchingCamera}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer disabled:opacity-40"
                title="Switch Camera (Front / Rear)"
              >
                <FlipHorizontal className={`w-5 h-5 text-cyan-400 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition hidden sm:flex items-center justify-center cursor-pointer"
                title="Open Native System Camera / Gallery"
              >
                <ImageIcon className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            {/* Center Slot: TACTILE NATIVE SHUTTER BUTTON */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={snapPhoto}
                disabled={!isStreaming}
                className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/90 p-1 flex items-center justify-center transition-all cursor-pointer ${
                  isStreaming
                    ? 'hover:scale-105 active:scale-90 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title="Snap Photo"
              >
                {/* Tactile Outer Bezel & Inner Core */}
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-inner flex items-center justify-center active:bg-white transition-colors">
                  <div className="w-7 h-7 rounded-full bg-white/20" />
                </div>
              </button>
            </div>

            {/* Right Slot: Done & Photo Counter Pill */}
            <div className="flex items-center justify-end w-28 sm:w-32">
              <button
                type="button"
                onClick={handleDone}
                disabled={capturedPhotos.length === 0}
                className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                  capturedPhotos.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/25 hover:scale-105 active:scale-95'
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
                title="Add photos to FileForge"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Done {capturedPhotos.length > 0 ? `(${capturedPhotos.length})` : ''}</span>
              </button>
            </div>
          </div>

          {/* CAPTURED PHOTOS GALLERY STRIP */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="font-mono text-slate-300">
                  Pages Captured ({capturedPhotos.length}/{maxPhotos})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedPhotos([]);
                    triggerHaptic();
                  }}
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-thin">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white/20 group shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={`Captured page ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 text-[9px] font-mono font-bold text-white bg-black/70 px-1.5 py-0.2 rounded">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 hover:scale-110 transition shadow cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
