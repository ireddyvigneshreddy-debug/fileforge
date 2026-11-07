'use client';

import React, { useState, useRef } from 'react';
import {
  Layers,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Lock,
  Stamp,
  Minimize2,
  FileText,
  Download,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FolderArchive,
} from 'lucide-react';
import * as PDFEngine from '@/lib/pdf-engine';
import * as ImageEngine from '@/lib/image-engine';
import * as ArchiveEngine from '@/lib/archive-engine';

interface PipelineStep {
  id: string;
  name: string;
  desc: string;
  icon: string;
  enabled: boolean;
}

export const BatchPipelineStudio: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [encryptPassword, setEncryptPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [outputZip, setOutputZip] = useState<{ blob: Blob; url: string; size: number; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline configuration steps
  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: 'compress',
      name: '1. Compress & Optimize',
      desc: 'Smart lossless stream compaction and image optimization',
      icon: 'Minimize2',
      enabled: true,
    },
    {
      id: 'watermark',
      name: '2. Stamp Watermark',
      desc: 'Add custom security or confidential watermark banner',
      icon: 'Stamp',
      enabled: true,
    },
    {
      id: 'encrypt',
      name: '3. Encrypt & Protect',
      desc: 'Add password protection to generated PDFs',
      icon: 'Lock',
      enabled: false,
    },
  ]);

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    setOutputZip(null);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const runPipeline = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusMsg('Initializing sequential pipeline execution...');

    try {
      const processedFiles: { name: string; blob: Blob; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        let currentFile = files[i];
        let currentBlob: Blob = currentFile;
        let currentName = currentFile.name;

        const basePct = Math.round((i / files.length) * 80);
        setStatusMsg(`Processing ${i + 1}/${files.length}: ${currentName}...`);
        setProgress(basePct + 5);

        // Step 1: Compress
        const compressStep = steps.find((s) => s.id === 'compress');
        if (compressStep?.enabled) {
          if (currentName.toLowerCase().endsWith('.pdf') || currentFile.type === 'application/pdf') {
            const comp = await PDFEngine.compressPDF(currentFile, { mode: 'smart' });
            currentBlob = comp.blob;
            currentFile = new File([currentBlob], currentName, { type: 'application/pdf' });
          } else if (currentFile.type.startsWith('image/')) {
            const comp = await ImageEngine.compressImage(currentFile, { quality: 0.8 });
            currentBlob = comp.blob;
            currentFile = new File([currentBlob], currentName, { type: currentFile.type });
          }
        }

        // Step 2: Watermark (PDFs)
        const watermarkStep = steps.find((s) => s.id === 'watermark');
        if (watermarkStep?.enabled && (currentName.toLowerCase().endsWith('.pdf') || currentFile.type === 'application/pdf')) {
          const wmBlob = await PDFEngine.watermarkPDF(currentFile, watermarkText || 'CONFIDENTIAL');
          currentBlob = wmBlob;
          currentFile = new File([currentBlob], currentName, { type: 'application/pdf' });
        }

        // Step 3: Encrypt (PDFs)
        const encryptStep = steps.find((s) => s.id === 'encrypt');
        if (encryptStep?.enabled && encryptPassword && (currentName.toLowerCase().endsWith('.pdf') || currentFile.type === 'application/pdf')) {
          const encBlob = await PDFEngine.lockFileWithPassword(currentFile, encryptPassword);
          currentBlob = encBlob;
        }

        const outName = `pipeline-processed-${currentName}`;
        processedFiles.push({
          name: outName,
          blob: currentBlob,
          url: URL.createObjectURL(currentBlob),
          size: currentBlob.size,
        });
      }

      setStatusMsg('Compiling outputs into structured ZIP archive...');
      setProgress(90);

      const zipBlob = await ArchiveEngine.createZipFromBlobs(processedFiles);
      const zipUrl = URL.createObjectURL(zipBlob);

      setOutputZip({
        blob: zipBlob,
        url: zipUrl,
        size: zipBlob.size,
        count: processedFiles.length,
      });

      setProgress(100);
      setStatusMsg('Pipeline complete! Your batch ZIP archive is ready.');
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Pipeline error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Multi-Stage Batch Pipelines</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Batch Processing &amp; Custom Pipelines</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Drop multiple files or folders, configure sequential processing stages, and download the entire batch as a single ZIP.
        </p>
      </div>

      {/* Pipeline Visual Flow Sequence */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Configured Sequential Stages:
          </span>
          <span className="text-[11px] text-slate-400">Toggle or customize stages below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden select-none ${
                step.enabled
                  ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-400 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">{step.name}</span>
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step.enabled ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {step.enabled ? '✓' : '—'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300/80 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Step Customization Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Watermark Text:</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              placeholder="e.g. CONFIDENTIAL / DRAFT"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Encryption Password (Optional):</label>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => {
                setEncryptPassword(e.target.value);
                if (e.target.value) {
                  setSteps((prev) => prev.map((s) => (s.id === 'encrypt' ? { ...s, enabled: true } : s)));
                }
              }}
              className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              placeholder="Protect resulting PDFs with password..."
            />
          </div>
        </div>
      </div>

      {/* Drag & Drop Multi-file Ingestion */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-3xl p-6 sm:p-8 text-center bg-slate-900/60 hover:bg-slate-900/80 transition cursor-pointer space-y-3 shadow-xl"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-md">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Drop batch files or folders here</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Supports mixed batch of PDFs, Images, and Documents (up to 50 files)</p>
        </div>
      </div>

      {/* Selected Batch Files List */}
      {files.length > 0 && (
        <div className="rounded-3xl bg-slate-900/80 border border-white/10 p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              Queued for Pipeline ({files.length} file{files.length > 1 ? 's' : ''})
            </span>
            <button
              onClick={() => setFiles([])}
              className="text-rose-400 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer"
            >
              Clear Batch
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
            {files.map((f, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs text-slate-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                  title="Remove from batch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Execution Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={runPipeline}
              disabled={isProcessing}
              className="btn-3d w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-white fill-white" />
              <span>Execute Pipeline across {files.length} Files</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 text-center space-y-3 shadow-xl">
          <div className="text-xs font-semibold text-cyan-300 animate-pulse">{statusMsg}</div>
          <div className="max-w-md mx-auto space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Batch Pipeline Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Output ZIP Ready */}
      {outputZip && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
            <FolderArchive className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Pipeline Execution Complete!</h3>
            <p className="text-xs text-slate-300 mt-1">
              Processed {outputZip.count} files into structured batch archive ({(outputZip.size / 1024).toFixed(1)} KB)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={outputZip.url}
              download="fileforge-pipeline-batch.zip"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition hover:scale-105 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Batch ZIP Archive</span>
            </a>

            <button
              onClick={() => {
                setOutputZip(null);
                setFiles([]);
              }}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Batch</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
