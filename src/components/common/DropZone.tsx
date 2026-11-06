'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, ArrowUp, ArrowDown, AlertCircle, Camera, Target, ShieldCheck } from 'lucide-react';
import { CameraCaptureModal } from '@/components/common/CameraCaptureModal';

interface DropZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept: string[];
  maxFiles: number;
  label?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  files,
  onFilesChange,
  accept,
  maxFiles,
  label = 'Drag & drop your files here, or click to browse',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndAddFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setErrorMsg(null);

    const newFiles = Array.from(incoming);
    if (maxFiles === 1) {
      onFilesChange([newFiles[0]]);
      return;
    }

    const combined = [...files, ...newFiles].slice(0, maxFiles);
    onFilesChange(combined);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const reordered = [...files];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    onFilesChange(reordered);
  };

  const acceptString = accept.length > 0 ? accept.join(',') : '*/*';

  return (
    <div className="space-y-4">
      {/* Drop Zone Box with Command Station Docking Bay styling */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden backdrop-blur-xl ${
          isDragging
            ? 'border-2 border-cyan-400 bg-cyan-950/40 shadow-[0_0_50px_rgba(0,240,255,0.35)] scale-[1.01]'
            : 'border border-cyan-500/20 bg-slate-950/70 hover:border-cyan-400/50 hover:bg-slate-900/60 shadow-[0_0_30px_-10px_rgba(0,240,255,0.12)]'
        }`}
      >
        {/* Corner HUD Reticles */}
        <div className={`absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 transition-colors ${isDragging ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
        <div className={`absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 transition-colors ${isDragging ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
        <div className={`absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 transition-colors ${isDragging ? 'border-cyan-300' : 'border-cyan-500/50'}`} />
        <div className={`absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 transition-colors ${isDragging ? 'border-cyan-300' : 'border-cyan-500/50'}`} />

        {/* Faint Tactical Radar Grid Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,240,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Laser Sweep when Dragging Over */}
        {isDragging && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm animate-laser pointer-events-none" />
        )}

        {/* Top Telemetry Header */}
        <div className="absolute top-3 inset-x-0 px-5 flex items-center justify-between text-[9px] font-mono tracking-widest text-cyan-400/60 uppercase select-none pointer-events-none">
          <span className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-cyan-400 animate-pulse" />
            [ORBITAL_DOCKING_BAY // INGEST_PROTOCOL]
          </span>
          <span className="text-purple-400/70 font-semibold">[SECURE_CLIENT_WASM]</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptString}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center pt-2">
          {/* Central Docking Target Icon */}
          <div
            className={`relative w-18 h-18 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
              isDragging
                ? 'bg-cyan-500/25 text-cyan-200 scale-110 shadow-[0_0_30px_rgba(0,240,255,0.5)] border border-cyan-400'
                : 'bg-slate-900/90 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
            }`}
          >
            <UploadCloud className="w-8 h-8 transition-transform duration-300" />
            <div className="absolute -inset-1 rounded-2xl border border-dashed border-cyan-500/30 animate-spin pointer-events-none" style={{ animationDuration: '15s' }} />
          </div>

          <h3 className="text-base sm:text-lg font-mono font-bold text-white mb-1.5 tracking-wide text-glow-cyan">
            {label}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 max-w-md font-mono">
            Supports {accept.length > 0 ? accept.join(', ') : 'all file formats'} • Up to{' '}
            {maxFiles > 1 ? `${maxFiles} files at once (Batch)` : '1 file'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              className="btn-3d px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs sm:text-sm font-mono font-black tracking-wider uppercase cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              Choose {maxFiles > 1 ? 'Files (Batch)' : 'File'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCameraModal(true);
              }}
              className="btn-3d-slate px-4 py-2.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-purple-300 hover:text-white text-xs sm:text-sm font-mono font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              title="Take a photo directly with your camera"
            >
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Camera Scan</span>
            </button>
          </div>
        </div>

        {/* Bottom Station Telemetry Tag */}
        <div className="absolute bottom-2.5 inset-x-0 px-5 flex items-center justify-between text-[9px] font-mono tracking-widest text-slate-500 uppercase select-none pointer-events-none">
          <span>MAX_BUFFER: 30_PAYLOADS</span>
          <span className="flex items-center gap-1 text-emerald-400/80">
            <ShieldCheck className="w-3 h-3" />
            100% PRIVATE HARDWARE SANDBOX
          </span>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhotosCaptured={(newPhotos) => {
          if (maxFiles === 1) {
            onFilesChange([newPhotos[0]]);
          } else {
            const combined = [...files, ...newPhotos].slice(0, maxFiles);
            onFilesChange(combined);
          }
        }}
        maxPhotos={maxFiles}
      />

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Files List with Telemetry HUD Cards */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/80 px-1">
            <span>
              INGESTED PAYLOADS: [{files.length} {files.length === 1 ? 'ITEM' : 'ITEMS'}]
              {files.length > 1 && (
                <span className="ml-2 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                  BATCH_PIPELINE
                </span>
              )}
            </span>
            {files.length > 1 && (
              <button
                type="button"
                onClick={() => onFilesChange([])}
                className="text-rose-400 hover:text-rose-300 transition text-[11px] font-mono tracking-wider"
              >
                [PURGE_ALL]
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="relative flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/50 transition backdrop-blur-md group"
              >
                <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-400/40 pointer-events-none" />
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-400/40 pointer-events-none" />

                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-mono font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{formatSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {maxFiles > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveFile(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === files.length - 1}
                        onClick={() => moveFile(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition ml-1"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
