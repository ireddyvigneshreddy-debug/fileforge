'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Trash2,
  Lock,
  Scan,
  Minimize2,
  Split,
  Scissors,
} from 'lucide-react';

interface RecommendedTool {
  name: string;
  slug: string;
  desc: string;
  icon: string;
  badge?: string;
  color: string;
}

export const HeroLiveDropzoneCard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Compute smart recommended tools based on file extension & MIME
  const recommendations: RecommendedTool[] = React.useMemo(() => {
    if (!file) return [];
    const name = file.name.toLowerCase();

    // PDF Files
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      return [
        {
          name: 'Compress PDF',
          slug: 'compress-pdf',
          desc: 'High-clarity calibration to hit exact target size',
          icon: 'Minimize2',
          badge: 'Calibrated',
          color: 'from-blue-500 to-cyan-400',
        },
        {
          name: 'Reorder / Organize PDF',
          slug: 'reorder-pdf',
          desc: 'Visual drag & drop pages or replace with device images',
          icon: 'LayoutGrid',
          badge: 'Interactive',
          color: 'from-cyan-400 to-blue-600',
        },
        {
          name: 'Split PDF',
          slug: 'split-pdf',
          desc: 'Extract specific page ranges or extract all',
          icon: 'Scissors',
          color: 'from-purple-500 to-indigo-500',
        },
        {
          name: 'Lock with Password',
          slug: 'lock-pdf',
          desc: 'Encrypt PDF with client-side password protection',
          icon: 'Lock',
          color: 'from-emerald-500 to-teal-500',
        },
      ];
    }

    // Image Files
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) {
      return [
        {
          name: 'Compress Image',
          slug: 'compress-image',
          desc: 'Smart perceptual quantization for WebP/JPEG',
          icon: 'Minimize2',
          badge: 'Popular',
          color: 'from-emerald-500 to-teal-500',
        },
        {
          name: 'OCR Text Extractor',
          slug: 'ocr-extract-text',
          desc: 'Extract selectable text from photos via Tesseract',
          icon: 'Scan',
          badge: 'WASM OCR',
          color: 'from-cyan-400 to-blue-600',
        },
        {
          name: 'Images to PDF',
          slug: 'images-to-pdf',
          desc: 'Compile photo collection into multi-page PDF',
          icon: 'FileText',
          color: 'from-blue-500 to-indigo-500',
        },
        {
          name: 'Resize & Crop',
          slug: 'resize-image',
          desc: 'Scale dimensions or crop to exact aspect ratio',
          icon: 'Minimize2',
          color: 'from-amber-500 to-rose-500',
        },
      ];
    }

    // Office & Spreadsheets
    if (/\.(xlsx?|csv)$/i.test(name)) {
      return [
        {
          name: 'Excel to PDF',
          slug: 'excel-to-pdf',
          desc: 'Render spreadsheet tables into formatted PDF',
          icon: 'FileText',
          badge: 'Formatted',
          color: 'from-cyan-400 to-blue-600',
        },
        {
          name: 'Excel to CSV',
          slug: 'excel-to-csv',
          desc: 'Convert workbook sheets to clean comma-separated CSV',
          icon: 'FileSpreadsheet',
          color: 'from-amber-500 to-emerald-500',
        },
        {
          name: 'Excel to PDF',
          slug: 'excel-to-pdf',
          desc: 'Render spreadsheet tables into formatted PDF',
          icon: 'FileText',
          color: 'from-emerald-500 to-teal-500',
        },
        {
          name: 'Batch Pipeline',
          slug: 'batch-pipeline',
          desc: 'Process multiple sheets in a sequential batch',
          icon: 'Sparkles',
          color: 'from-indigo-500 to-purple-500',
        },
      ];
    }

    // Word / Docs
    if (/\.(docx?|txt|md|json)$/i.test(name)) {
      return [
        {
          name: 'OCR Text Extractor',
          slug: 'ocr-extract-text',
          desc: 'Extract clean selectable text and searchable layers',
          icon: 'Scan',
          badge: 'Extract',
          color: 'from-cyan-400 to-blue-600',
        },
        {
          name: 'Word to PDF',
          slug: 'word-to-pdf',
          desc: 'Compile document formatting into crisp PDF',
          icon: 'FileText',
          color: 'from-blue-500 to-indigo-500',
        },
        {
          name: 'Markdown to PDF',
          slug: 'markdown-to-pdf',
          desc: 'Render Markdown syntax into typography document',
          icon: 'FileText',
          color: 'from-purple-500 to-pink-500',
        },
      ];
    }

    // Default Fallback
    return [
      {
        name: 'Compress Files',
        slug: 'compress-files',
        desc: 'Pack and compress into high-efficiency ZIP',
        icon: 'Minimize2',
        color: 'from-blue-500 to-cyan-500',
      },
      {
        name: 'File Inspector',
        slug: 'file-inspector',
        desc: 'Deep inspection of binary headers & MIME bytes',
        icon: 'FileText',
        color: 'from-indigo-500 to-purple-500',
      },
      {
        name: 'File Hash (SHA-256)',
        slug: 'file-hash',
        desc: 'Compute cryptographic checksums in browser',
        icon: 'Lock',
        color: 'from-emerald-500 to-teal-500',
      },
    ];
  }, [file]);

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* 1. INITIAL EMPTY DROPZONE STATE */}
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center overflow-hidden shadow-2xl ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01] shadow-[0_0_35px_rgba(0,240,255,0.25)]'
              : 'border-white/15 bg-slate-900/60 hover:bg-slate-900/80 hover:border-blue-500/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-3">
            {/* Animated Halo Icon */}
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Drop any file for Instant Live Preview &amp; Smart Tools
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Drag a PDF, image, document, or spreadsheet here — FileForge instantly detects the file and matches the best tools.
              </p>
            </div>

            {/* Quick Floating Format Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
                .PDF
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                .PNG / .JPG
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                .DOCX
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                .XLSX / .CSV
              </span>
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Client-Side WASM • Zero bytes leave your browser</span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. LIVE INTERACTIVE FILE PREVIEW CARD */
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_40px_-10px_rgba(0,240,255,0.2)] space-y-5 animate-in fade-in zoom-in-95 duration-200">
          {/* File Meta Header Bar */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase shrink-0">
                    {file.name.split('.').pop() || 'FILE'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-300">{formatSize(file.size)}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Loaded in RAM
                  </span>
                </div>
              </div>
            </div>

            {/* Change / Clear File */}
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Smart Tool Recommender Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Recommended Tools For This File:
              </span>
              <span className="text-[11px] text-slate-400">Click to launch immediately</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recommendations.map((rec) => (
                <Link
                  key={rec.slug}
                  href={`/tools/${rec.slug}`}
                  className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-blue-600/15 border border-white/10 hover:border-cyan-400/40 transition group flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 truncate text-left">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition truncate">
                          {rec.name}
                        </span>
                        {rec.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase shrink-0">
                            {rec.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{rec.desc}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
