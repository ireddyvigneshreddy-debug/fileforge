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

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotosCaptured,
  maxPhotos = 50,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Stop current video tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Start camera stream
  const startStream = useCallback(async (mode: 'environment' | 'user') => {
    stopStream();
    setErrorMsg(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.warn('[Camera] Failed to initialize video feed:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera detected on this device.');
      } else {
        setErrorMsg('Unable to access camera. You can also use the file picker to capture or select images.');
      }
    }
  }, [stopStream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotos([]);
      startStream(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startStream, stopStream]);

  // Switch rear/front camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture current frame from video feed
  const snapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front camera
    if (facingMode === 'user') {
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
      0.95
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

  // Finalize & send files to parent
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 id="camera-modal-title" className="text-sm sm:text-base font-semibold text-white">
                Take Photo
              </h2>
              <p className="text-[11px] text-slate-400">
                Snap single or multiple pages directly into FileForge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[420px] overflow-hidden">
          {/* Shutter Flash Animation */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white z-20 pointer-events-none opacity-80 animate-out fade-out duration-150" />
          )}

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transition-transform ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Camera Error Message */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-semibold text-white">Camera Access Error</h3>
                <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
              </div>

              {/* Native Camera / File picker fallback */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Use Native Device Camera
                </button>
                <button
                  type="button"
                  onClick={() => startStream(facingMode)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Top Controls Overlay on Video */}
          {isStreaming && (
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-200 hover:text-white border border-white/20 shadow-lg backdrop-blur-md transition cursor-pointer"
                title="Switch Camera (Front/Rear)"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
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

        {/* Shutter & Controls Section */}
        <div className="p-4 bg-slate-950/90 border-t border-white/10 space-y-4">
          {/* Main Shutter Bar */}
          <div className="flex items-center justify-between">
            {/* Native Device Camera Quick Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Use Native System Camera"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Gallery / Native</span>
            </button>

            {/* Big Shutter Button */}
            <button
              type="button"
              onClick={snapPhoto}
              disabled={!isStreaming}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition-transform cursor-pointer ${
                isStreaming
                  ? 'hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/20'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              title="Snap Photo"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500" />
            </button>

            {/* Done / Add Photos Button */}
            <button
              type="button"
              onClick={handleDone}
              disabled={capturedPhotos.length === 0}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                capturedPhotos.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/20 hover:scale-105'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                Done {capturedPhotos.length > 0 ? `(${capturedPhotos.length})` : ''}
              </span>
            </button>
          </div>

          {/* Captured Photos Gallery Bar */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Captured ({capturedPhotos.length}/{maxPhotos})
                </span>
                <button
                  type="button"
                  onClick={() => setCapturedPhotos([])}
                  className="text-rose-400 hover:text-rose-300 transition"
                >
                  Clear All
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/20 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={`Captured ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 hover:scale-110 transition"
                      title="Remove"
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
