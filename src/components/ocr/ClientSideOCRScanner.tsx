'use client';

import React, { useState, useRef } from 'react';
import {
  Scan,
  Copy,
  Check,
  Download,
  UploadCloud,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';
import { runClientSideOCR, OCRResult } from '@/lib/ocr-engine';

export const ClientSideOCRScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult] = useState<OCRResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }

    setIsProcessing(true);
    setProgress(10);
    setStatusMsg('Initializing Tesseract OCR Neural Worker...');

    try {
      const ocrRes = await runClientSideOCR(selectedFile, {
        onProgress: (pct, msg) => {
          setProgress(pct);
          setStatusMsg(msg);
        },
      });
      setResult(ocrRes);
    } catch (err: unknown) {
      const e = err as Error;
      alert(`OCR Extraction Failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-extracted-${result.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Scan className="w-3.5 h-3.5" />
          <span>WASM Neural OCR</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Client-Side Optical Character Recognition</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Extract selectable text, words, and tables from receipts, scanned documents, and photos directly in your browser.
        </p>
      </div>

      {/* Upload Dropzone */}
      {!result && !isProcessing && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-3xl p-8 sm:p-12 text-center bg-slate-900/60 hover:bg-slate-900/80 transition cursor-pointer space-y-4 shadow-xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Scan className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Drop scanned document, receipt, or photo here</h3>
            <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WebP, Scanned PDFs, and Camera Photos</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tesseract WebAssembly Engine • 100% In-Browser Privacy</span>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto animate-pulse border border-cyan-500/30">
            <Scan className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{statusMsg}</h3>
            <p className="text-xs text-slate-400 mt-1">Processing optical character recognition entirely in your browser RAM...</p>
          </div>

          <div className="max-w-md mx-auto space-y-2 pt-2">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>OCR Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* OCR Result View */}
      {result && (
        <div className="space-y-4">
          {/* Telemetry Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">{result.fileName}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span className="text-emerald-400 font-semibold">{result.confidence}% Confidence</span>
                  <span>• {result.wordCount.toLocaleString()} words</span>
                  <span>• {result.lineCount} lines</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyText}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={downloadTxt}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .TXT</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setImagePreview(null);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                title="Scan another document"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text Editor Container */}
          <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Extracted Plain Text:</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter text..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-slate-950 pl-8 pr-3 py-1 rounded-lg border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <textarea
              readOnly
              value={
                searchFilter
                  ? result.text
                      .split('\n')
                      .filter((l) => l.toLowerCase().includes(searchFilter.toLowerCase()))
                      .join('\n')
                  : result.text
              }
              rows={14}
              className="w-full bg-slate-950 p-4 rounded-2xl border border-white/10 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none scrollbar-thin select-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};
