'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, ArrowUp, ArrowDown, AlertCircle, Camera } from 'lucide-react';
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
      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-cyan-400 bg-blue-500/15 scale-[1.01]'
            : 'border-white/15 bg-gradient-to-b from-slate-900/60 to-slate-950/70 hover:border-cyan-500/50 hover:bg-slate-900/80'
        }`}
        style={{
          boxShadow: isDragging
            ? '0 25px 50px -10px rgba(6, 182, 212, 0.35), inset 0 0 40px rgba(6, 182, 212, 0.2)'
            : 'inset 0 2px 12px rgba(0, 0, 0, 0.6), 0 12px 30px -10px rgba(0, 0, 0, 0.5)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptString}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
              isDragging
                ? 'bg-cyan-500/25 text-cyan-300 scale-110 rotate-6 shadow-lg shadow-cyan-500/30'
                : 'bg-white/5 text-slate-400 hover:scale-105 shadow-inner'
            }`}
          >
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1">{label}</h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-5">
            Supports {accept.length > 0 ? accept.join(', ') : 'all file formats'} • Up to{' '}
            {maxFiles > 1 ? `${maxFiles} files at once (Batch)` : '1 file'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              className="btn-3d px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold cursor-pointer"
            >
              Choose {maxFiles > 1 ? 'Files (Batch)' : 'File'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCameraModal(true);
              }}
              className="btn-3d-slate px-4 py-2.5 rounded-xl bg-slate-800 border border-cyan-500/30 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer"
              title="Take a photo directly with your camera"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Take Photo</span>
            </button>
          </div>
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
        maxPhotos={maxFiles === 1 ? 1 : Math.max(1, maxFiles - files.length)}
      />

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Selected ({files.length} {files.length === 1 ? 'file' : 'files'})
              {files.length > 1 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-[10px]">
                  Batch Processing
                </span>
              )}
            </span>
            {files.length > 1 && (
              <button
                type="button"
                onClick={() => onFilesChange([])}
                className="text-rose-400 hover:text-rose-300 transition"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-white/10 hover:border-white/20 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{formatSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {maxFiles > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveFile(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === files.length - 1}
                        onClick={() => moveFile(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
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
