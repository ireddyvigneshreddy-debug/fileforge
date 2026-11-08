'use client';

import React, { useState, useEffect } from 'react';
import { ToolDefinition, ProcessedResult } from '@/types/tools';
import { DropZone } from '@/components/common/DropZone';
import { ProcessingState } from '@/components/common/ProcessingState';
import { ResultDownload } from '@/components/common/ResultDownload';

// Engines
import * as PDFEngine from '@/lib/pdf-engine';
import * as ImageEngine from '@/lib/image-engine';
import * as DocEngine from '@/lib/document-engine';
import * as ArchiveEngine from '@/lib/archive-engine';
import * as CryptoEngine from '@/lib/crypto-engine';
import { AIDocumentChatPanel } from '@/components/ai/AIDocumentChatPanel';
import { ClientSideOCRScanner } from '@/components/ocr/ClientSideOCRScanner';
import { BatchPipelineStudio } from '@/components/pipeline/BatchPipelineStudio';
import { FeedbackReportBlock } from '@/components/common/FeedbackReportBlock';
import { PDFPageReorderGrid } from '@/components/tools/PDFPageReorderGrid';

import {
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Sliders,
  Settings2,
  Maximize2,
  FileText,
  KeyRound,
  Download,
} from 'lucide-react';

interface ToolRunnerProps {
  tool: ToolDefinition;
}

export const ToolRunner: React.FC<ToolRunnerProps> = ({ tool }) => {
  if (tool.id === 'ai-document-chat') {
    return <AIDocumentChatPanel />;
  }
  if (tool.id === 'ocr-extract-text') {
    return <ClientSideOCRScanner />;
  }
  if (tool.id === 'batch-pipeline') {
    return <BatchPipelineStudio />;
  }

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tool Specific States
  // PDF
  const [splitMode, setSplitMode] = useState<'range' | 'each_page'>('range');
  const [splitRange, setSplitRange] = useState('1-3');
  const [rotateDeg, setRotateDeg] = useState(90);
  const [rotatePageSel, setRotatePageSel] = useState<'all' | 'odd' | 'even'>('all');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkColor, setWatermarkColor] = useState('#888888');
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [pageNumberPos, setPageNumberPos] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState<'Page X of Y' | 'X / Y' | 'X'>('Page X of Y');
  const [pagesToRemoveStr, setPagesToRemoveStr] = useState('2, 4');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [imgPdfSize, setImgPdfSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [imgPdfOrientation, setImgPdfOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [pdfPassword, setPdfPassword] = useState('');
  const [pdfPasswordConfirm, setPdfPasswordConfirm] = useState('');
  const [reorderOrderStr, setReorderOrderStr] = useState('1, 2, 3');
  const [reorderRotations, setReorderRotations] = useState<number[]>([]);
  const [pdfToImgFormat, setPdfToImgFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [pdfToImgDpi, setPdfToImgDpi] = useState<number>(2);
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '16:9' | '4:3' | '9:16'>('free');
  const [fileCompressionFormat, setFileCompressionFormat] = useState<'zip' | 'gzip' | 'smart'>('zip');
  const [fileCompressionLevel, setFileCompressionLevel] = useState<number>(9);

  // Target Compression Controls (Guaranteed specific KB with zero-blur clarity calibration)
  const [compressMode, setCompressMode] = useState<'target' | 'quality'>('target');
  const [targetKb, setTargetKb] = useState<number>(900); // Exact KB target (Default 900 KB)
  const [targetPreset, setTargetPreset] = useState<'950kb' | '900kb' | '800kb' | '600kb' | '500kb' | '300kb' | '150kb' | 'custom'>('900kb');

  const getTargetSizeBytes = (): number | undefined => {
    if (compressMode === 'quality') return undefined;
    return Math.max(30, targetKb) * 1024;
  };

  // Image
  const [imgQuality, setImgQuality] = useState(80);
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const [resizeMode, setResizeMode] = useState<'percent' | 'exact'>('percent');
  const [scalePercent, setScalePercent] = useState(50);
  const [resizeWidth, setResizeWidth] = useState(1200);
  const [resizeHeight, setResizeHeight] = useState(800);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [filterType, setFilterType] = useState<'grayscale' | 'sepia' | 'invert' | 'noir'>('grayscale');
  const [blurMode, setBlurMode] = useState<'blur' | 'pixelate'>('blur');
  const [blurIntensity, setBlurIntensity] = useState(12);
  const [svgScale, setSvgScale] = useState(2);
  const [paletteColors, setPaletteColors] = useState<ImageEngine.PaletteColor[]>([]);
  const [base64Output, setBase64Output] = useState('');

  // Documents
  const [plainTextInput, setPlainTextInput] = useState('Type or paste text here...');
  const [markdownInput, setMarkdownInput] = useState(
    '# Project Notes\n\nThis is a **clean** markdown document generated with FileForge.\n\n- Zero uploads\n- 100% private\n- Export to PDF'
  );
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(
      [
        { id: 1, name: 'Alice Smith', role: 'Engineer', department: 'R&D' },
        { id: 2, name: 'Bob Jones', role: 'Designer', department: 'Product' },
        { id: 3, name: 'Charlie Kim', role: 'Lead Architect', department: 'Cloud' },
      ],
      null,
      2
    )
  );

  // Security / Utilities
  const [qrText, setQrText] = useState('https://fileforge.pro');
  const [qrDark, setQrDark] = useState('#000000');
  const [qrLight, setQrLight] = useState('#ffffff');
  const [qrPreview, setQrPreview] = useState<{ png: string; svg: string } | null>(null);
  const [hashes, setHashes] = useState<{ sha256: string; sha512: string; sha1: string; size: number } | null>(null);
  const [inspection, setInspection] = useState<CryptoEngine.FileInspectionResult | null>(null);
  const [passLength, setPassLength] = useState(20);
  const [passUpper, setPassUpper] = useState(true);
  const [passLower, setPassLower] = useState(true);
  const [passNumbers, setPassNumbers] = useState(true);
  const [passSymbols, setPassSymbols] = useState(true);
  const [generatedPass, setGeneratedPass] = useState('');
  const [diffTextA, setDiffTextA] = useState('Hello world\nThis is version 1\nFileForge is fast.');
  const [diffTextB, setDiffTextB] = useState('Hello world!\nThis is version 2 with enhancements\nFileForge is fast and local.');

  // Auto-generate QR preview on settings change
  useEffect(() => {
    if (tool.id === 'qr-code-studio') {
      CryptoEngine.generateQrCode(qrText || 'https://fileforge.pro', {
        darkColor: qrDark,
        lightColor: qrLight,
      }).then((res) => {
        setQrPreview({ png: res.pngDataUrl, svg: res.svgString });
      });
    }
  }, [tool.id, qrText, qrDark, qrLight]);

  // Auto-generate Password on settings change
  useEffect(() => {
    if (tool.id === 'password-generator') {
      const pass = CryptoEngine.generatePassword(passLength, {
        upper: passUpper,
        lower: passLower,
        numbers: passNumbers,
        symbols: passSymbols,
      });
      setGeneratedPass(pass);
    }
  }, [tool.id, passLength, passUpper, passLower, passNumbers, passSymbols]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProcess = async () => {
    try {
      setError(null);
      setStatus('processing');
      setProgress(25);
      setMessage('Initializing local processing engine...');

      let outBlob: Blob | null = null;
      let outFileName = 'result.bin';
      let originalSize = files[0]?.size || 0;
      let additionalFiles: { name: string; blob: Blob; url: string }[] | undefined = undefined;

      // ----------------- PDF TOOLS -----------------
      if (tool.id === 'merge-pdf') {
        if (files.length < 2) throw new Error('Please select at least 2 PDF files to merge.');
        setMessage(`Merging ${files.length} documents...`);
        setProgress(50);
        const mergeRes = await PDFEngine.mergePDFs(files);
        outBlob = mergeRes.blob;
        outFileName = 'merged-document.pdf';
        originalSize = files.reduce((acc, f) => acc + f.size, 0);
      } else if (tool.id === 'split-pdf') {
        if (!files[0]) throw new Error('Please select a PDF file to split.');
        setMessage('Splitting pages...');
        setProgress(60);
        const splitRes = await PDFEngine.splitPDF(files[0], splitMode, splitRange);
        outBlob = splitRes.blob;
        outFileName = splitRes.fileName;
      } else if (tool.id === 'compress-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file.');
        const targetBytes = getTargetSizeBytes();
        if (files.length === 1) {
          setMessage(
            compressMode === 'target' && targetBytes
              ? `Calibrating resolution to compress to ~${Math.round(targetBytes / 1024)} KB with maximum text clarity...`
              : 'Optimizing font tables and stripping unreferenced objects...'
          );
          setProgress(30);
          const compRes = await PDFEngine.compressPDF(files[0], {
            mode: compressMode === 'quality' ? 'balanced' : 'target',
            targetSizeBytes: targetBytes,
            onProgress: (pct, msg) => {
              setProgress(pct);
              setMessage(msg);
            },
          });
          outBlob = compRes.blob;
          outFileName = `compressed-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Compressing PDF ${i + 1} of ${files.length} to target ~${Math.round((targetBytes || 1000 * 1024) / 1024)} KB...`);
            setProgress(Math.round(((i + 0.1) / files.length) * 100));
            const compRes = await PDFEngine.compressPDF(f, {
              mode: compressMode === 'quality' ? 'balanced' : 'target',
              targetSizeBytes: targetBytes,
            });
            const outName = `compressed-${f.name}`;
            processed.push({ name: outName, blob: compRes.blob, url: URL.createObjectURL(compRes.blob), size: compRes.blob.size });
          }
          setMessage('Packaging compressed PDFs into ZIP archive...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `compressed-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'rotate-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file.');
        if (files.length === 1) {
          setMessage('Applying lossless page rotations...');
          setProgress(60);
          outBlob = await PDFEngine.rotatePDF(files[0], rotateDeg, rotatePageSel);
          outFileName = `rotated-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Rotating PDF ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await PDFEngine.rotatePDF(f, rotateDeg, rotatePageSel);
            const outName = `rotated-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging rotated PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `rotated-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'watermark-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file.');
        if (files.length === 1) {
          setMessage('Stamping vector watermark overlay...');
          setProgress(60);
          outBlob = await PDFEngine.watermarkPDF(files[0], watermarkText, {
            opacity: watermarkOpacity,
            color: watermarkColor,
            rotation: watermarkRotation,
          });
          outFileName = `watermarked-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Watermarking PDF ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await PDFEngine.watermarkPDF(f, watermarkText, {
              opacity: watermarkOpacity,
              color: watermarkColor,
              rotation: watermarkRotation,
            });
            const outName = `watermarked-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging watermarked PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `watermarked-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'page-numbers-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file.');
        if (files.length === 1) {
          setMessage('Calculating coordinates and stamping page numbers...');
          setProgress(60);
          outBlob = await PDFEngine.addPageNumbersPDF(files[0], {
            position: pageNumberPos,
            format: pageNumberFormat,
          });
          outFileName = `numbered-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Stamping page numbers ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await PDFEngine.addPageNumbersPDF(f, {
              position: pageNumberPos,
              format: pageNumberFormat,
            });
            const outName = `numbered-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging numbered PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `numbered-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'remove-pages-pdf') {
        if (!files[0]) throw new Error('Please select a PDF file.');
        const pages = pagesToRemoveStr
          .split(',')
          .map((p) => parseInt(p.trim(), 10))
          .filter((n) => !isNaN(n));
        if (pages.length === 0) throw new Error('Enter valid page numbers to delete.');
        setMessage('Excising pages...');
        setProgress(60);
        outBlob = await PDFEngine.removePagesPDF(files[0], pages);
        outFileName = `cleaned-${files[0].name}`;
      } else if (tool.id === 'pdf-metadata') {
        if (!files[0]) throw new Error('Please select a PDF file.');
        setMessage('Updating document catalog metadata...');
        setProgress(60);
        outBlob = await PDFEngine.editPDFMetadata(files[0], {
          title: metaTitle,
          author: metaAuthor,
        });
        outFileName = `metadata-${files[0].name}`;
      } else if (tool.id === 'images-to-pdf' || tool.id === 'scan-to-pdf') {
        if (files.length === 0) throw new Error('Please snap or select one or more photos.');
        setMessage(`Compiling ${files.length} scanned photos into PDF document...`);
        setProgress(60);
        outBlob = await PDFEngine.imagesToPDF(files, {
          pageSize: imgPdfSize,
          orientation: imgPdfOrientation,
        });
        outFileName = tool.id === 'scan-to-pdf' ? `scanned-document-${Date.now()}.pdf` : 'images-collection.pdf';
        originalSize = files.reduce((acc, f) => acc + f.size, 0);
      } else if (tool.id === 'text-to-pdf') {
        setMessage('Paginating and rendering typography...');
        setProgress(60);
        outBlob = await PDFEngine.textToPDF(plainTextInput, { title: 'FileForge Document' });
        outFileName = 'document.pdf';
        originalSize = new Blob([plainTextInput]).size;
      } else if (tool.id === 'lock-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file to protect.');
        if (!pdfPassword) throw new Error('Please enter a password.');
        if (pdfPassword !== pdfPasswordConfirm) throw new Error('Passwords do not match.');
        if (files.length === 1) {
          setMessage('Encrypting file with AES-256-GCM and PBKDF2 key derivation...');
          setProgress(60);
          outBlob = await PDFEngine.lockFileWithPassword(files[0], pdfPassword);
          outFileName = `protected-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Protecting PDF ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await PDFEngine.lockFileWithPassword(f, pdfPassword);
            const outName = `protected-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging protected PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `protected-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'unlock-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file to unlock.');
        if (files.length === 1) {
          setMessage('Decrypting security permissions and stripping password restrictions...');
          setProgress(60);
          if (pdfPassword) {
            outBlob = await PDFEngine.unlockFileWithPassword(files[0], pdfPassword);
          } else {
            outBlob = await PDFEngine.unlockPDF(files[0]);
          }
          outFileName = `unlocked-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Unlocking PDF ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = pdfPassword
              ? await PDFEngine.unlockFileWithPassword(f, pdfPassword)
              : await PDFEngine.unlockPDF(f);
            const outName = `unlocked-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging unlocked PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `unlocked-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'reorder-pdf') {
        if (!files[0]) throw new Error('Please select a PDF file.');
        const order = reorderOrderStr
          .split(',')
          .map((s) => parseInt(s.trim(), 10) - 1)
          .filter((n) => !isNaN(n));
        if (order.length === 0) throw new Error('Please specify valid page order (e.g. 2, 1, 3).');
        setMessage('Reorganizing page indexes and compiling PDF...');
        setProgress(60);
        outBlob = await PDFEngine.reorderPDF(files[0], order, reorderRotations);
        outFileName = `organized-${files[0].name}`;
      } else if (tool.id === 'pdf-to-images') {
        if (!files[0]) throw new Error('Please select a PDF file to convert.');
        setMessage('Rendering PDF pages onto high-density canvas...');
        setProgress(50);
        const imgRes = await PDFEngine.pdfToImages(files[0], pdfToImgFormat, pdfToImgDpi);
        outBlob = imgRes.zipBlob;
        outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}-pages.zip`;
        additionalFiles = imgRes.images;
      } else if (tool.id === 'grayscale-pdf') {
        if (files.length === 0) throw new Error('Please select at least one PDF file.');
        if (files.length === 1) {
          setMessage('Converting color channels to grayscale monochrome...');
          setProgress(60);
          outBlob = await PDFEngine.grayscalePDF(files[0]);
          outFileName = `grayscale-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting to grayscale ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await PDFEngine.grayscalePDF(f);
            const outName = `grayscale-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging grayscale PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `grayscale-pdfs-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      }

      // ----------------- IMAGE TOOLS -----------------
      else if (tool.id === 'compress-image') {
        if (files.length === 0) throw new Error('Please select image(s) to compress.');
        const targetBytes = getTargetSizeBytes();
        if (files.length === 1) {
          setMessage(
            compressMode === 'target' && targetBytes
              ? `Compressing to target size (< ${(targetBytes / (1024 * 1024)).toFixed(1)} MB)...`
              : 'Analyzing image frequencies and optimizing quantization tables...'
          );
          setProgress(50);
          const res = await ImageEngine.compressImage(files[0], {
            mode: compressMode === 'quality' ? 'quality' : 'target',
            targetSizeBytes: targetBytes,
            quality: imgQuality / 100,
          });
          outBlob = res.blob;
          outFileName = `compressed-${files[0].name.replace(/\.[^/.]+$/, '')}.webp`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Compressing image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const res = await ImageEngine.compressImage(f, {
              mode: compressMode === 'quality' ? 'quality' : 'target',
              targetSizeBytes: targetBytes,
              quality: imgQuality / 100,
            });
            const outName = `compressed-${f.name.replace(/\.[^/.]+$/, '')}.webp`;
            processed.push({ name: outName, blob: res.blob, url: URL.createObjectURL(res.blob), size: res.blob.size });
          }
          setMessage('Packaging compressed images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `compressed-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'convert-image') {
        if (files.length === 0) throw new Error('Please select image(s) to convert.');
        const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/png' ? 'png' : 'webp';
        if (files.length === 1) {
          setMessage(`Converting pixels to ${ext.toUpperCase()}...`);
          setProgress(60);
          outBlob = await ImageEngine.convertImageFormat(files[0], targetFormat, imgQuality / 100);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.${ext}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await ImageEngine.convertImageFormat(f, targetFormat, imgQuality / 100);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.${ext}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging converted images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `converted-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'resize-image') {
        if (files.length === 0) throw new Error('Please select image(s) to resize.');
        if (files.length === 1) {
          setMessage('Bicubic scaling image buffer...');
          setProgress(60);
          const res = await ImageEngine.resizeImage(files[0], {
            scalePercent: resizeMode === 'percent' ? scalePercent : undefined,
            width: resizeMode === 'exact' ? resizeWidth : undefined,
            height: resizeMode === 'exact' ? resizeHeight : undefined,
          });
          outBlob = res.blob;
          outFileName = `resized-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Resizing image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const res = await ImageEngine.resizeImage(f, {
              scalePercent: resizeMode === 'percent' ? scalePercent : undefined,
              width: resizeMode === 'exact' ? resizeWidth : undefined,
              height: resizeMode === 'exact' ? resizeHeight : undefined,
            });
            const outName = `resized-${f.name}`;
            processed.push({ name: outName, blob: res.blob, url: URL.createObjectURL(res.blob), size: res.blob.size });
          }
          setMessage('Packaging resized images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `resized-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'crop-image') {
        if (!files[0]) throw new Error('Please select an image to crop.');
        setMessage('Cropping image with precision aspect ratio...');
        setProgress(60);
        const imgEl = await ImageEngine.loadImageFromFile(files[0]);
        let w = imgEl.naturalWidth;
        let h = imgEl.naturalHeight;
        let x = 0;
        let y = 0;
        if (cropAspect === '1:1') {
          const size = Math.min(w, h);
          x = Math.round((w - size) / 2);
          y = Math.round((h - size) / 2);
          w = size;
          h = size;
        } else if (cropAspect === '16:9') {
          if (w / h > 16 / 9) {
            const targetW = Math.round(h * (16 / 9));
            x = Math.round((w - targetW) / 2);
            w = targetW;
          } else {
            const targetH = Math.round(w * (9 / 16));
            y = Math.round((h - targetH) / 2);
            h = targetH;
          }
        } else if (cropAspect === '4:3') {
          if (w / h > 4 / 3) {
            const targetW = Math.round(h * (4 / 3));
            x = Math.round((w - targetW) / 2);
            w = targetW;
          } else {
            const targetH = Math.round(w * (3 / 4));
            y = Math.round((h - targetH) / 2);
            h = targetH;
          }
        } else if (cropAspect === '9:16') {
          if (h / w > 16 / 9) {
            const targetH = Math.round(w * (16 / 9));
            y = Math.round((h - targetH) / 2);
            h = targetH;
          } else {
            const targetW = Math.round(h * (9 / 16));
            x = Math.round((w - targetW) / 2);
            w = targetW;
          }
        }
        outBlob = await ImageEngine.cropImage(files[0], { x, y, width: w, height: h });
        outFileName = `cropped-${files[0].name}`;
      } else if (tool.id === 'rotate-image') {
        if (files.length === 0) throw new Error('Please select image(s).');
        if (files.length === 1) {
          setMessage('Transforming image orientation...');
          setProgress(60);
          outBlob = await ImageEngine.rotateFlipImage(files[0], {
            rotateDegrees: rotateDeg,
            flipH,
            flipV,
          });
          outFileName = `rotated-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Rotating image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await ImageEngine.rotateFlipImage(f, {
              rotateDegrees: rotateDeg,
              flipH,
              flipV,
            });
            const outName = `rotated-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging rotated images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `rotated-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'image-filters') {
        if (files.length === 0) throw new Error('Please select image(s).');
        if (files.length === 1) {
          setMessage('Rendering shader filters...');
          setProgress(60);
          outBlob = await ImageEngine.applyImageFilter(files[0], filterType);
          outFileName = `filtered-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Applying filter to image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await ImageEngine.applyImageFilter(f, filterType);
            const outName = `filtered-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging filtered images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `filtered-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'blur-image') {
        if (files.length === 0) throw new Error('Please select image(s).');
        if (files.length === 1) {
          setMessage('Applying blur kernel...');
          setProgress(60);
          outBlob = await ImageEngine.blurPixelateImage(files[0], blurMode, blurIntensity);
          outFileName = `blurred-${files[0].name}`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Blurring image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await ImageEngine.blurPixelateImage(f, blurMode, blurIntensity);
            const outName = `blurred-${f.name}`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging blurred images into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `blurred-images-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'color-palette') {
        if (!files[0]) throw new Error('Please select an image.');
        setMessage('Quantizing color histogram...');
        setProgress(60);
        const colors = await ImageEngine.extractColorPalette(files[0], 8);
        setPaletteColors(colors);
        // Also provide a JSON summary
        outBlob = new Blob([JSON.stringify(colors, null, 2)], { type: 'application/json' });
        outFileName = 'palette.json';
      } else if (tool.id === 'image-to-base64') {
        if (files.length === 0) throw new Error('Please select image(s).');
        if (files.length === 1) {
          setMessage('Encoding raw bytes to base64 Data URI...');
          setProgress(60);
          const b64 = await ImageEngine.fileToBase64(files[0]);
          setBase64Output(b64);
          outBlob = new Blob([b64], { type: 'text/plain' });
          outFileName = `${files[0].name}.base64.txt`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Encoding image ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b64 = await ImageEngine.fileToBase64(f);
            const b = new Blob([b64], { type: 'text/plain' });
            const outName = `${f.name}.base64.txt`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging base64 files into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `image-base64-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'svg-to-png') {
        if (files.length === 0) throw new Error('Please select SVG file(s).');
        if (files.length === 1) {
          setMessage(`Rasterizing vector paths at ${svgScale}x Retina scale...`);
          setProgress(60);
          outBlob = await ImageEngine.svgToPng(files[0], svgScale);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}@${svgScale}x.png`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Rasterizing SVG ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await ImageEngine.svgToPng(f, svgScale);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}@${svgScale}x.png`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging rasterized PNGs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `svg-to-png-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      }

      // ----------------- DOCUMENT TOOLS -----------------
      else if (tool.id === 'ppt-to-pdf') {
        if (files.length === 0) throw new Error('Please select PowerPoint file(s) (.pptx).');
        if (files.length === 1) {
          setMessage('Parsing slide XML and extracting decks...');
          setProgress(60);
          outBlob = await DocEngine.pptxToPdf(files[0]);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting PowerPoint ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await DocEngine.pptxToPdf(f);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.pdf`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging converted PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `ppt-to-pdf-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'word-to-pdf') {
        if (files.length === 0) throw new Error('Please select Word file(s) (.docx, .doc).');
        if (files.length === 1) {
          setMessage('Parsing paragraphs, headings, and document XML...');
          setProgress(60);
          outBlob = await DocEngine.docxToPdf(files[0]);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting Word doc ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await DocEngine.docxToPdf(f);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.pdf`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging converted PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `word-to-pdf-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'excel-to-pdf') {
        if (files.length === 0) throw new Error('Please select Excel or CSV file(s).');
        if (files.length === 1) {
          setMessage('Formatting worksheets and rendering tabular cells...');
          setProgress(60);
          outBlob = await DocEngine.excelToPdf(files[0]);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting spreadsheet ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await DocEngine.excelToPdf(f);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.pdf`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging converted PDFs into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `excel-to-pdf-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'csv-to-excel') {
        if (files.length === 0) throw new Error('Please select CSV file(s).');
        if (files.length === 1) {
          setMessage('Parsing delimiters and building XLSX workbook...');
          setProgress(60);
          outBlob = await DocEngine.csvToExcel(files[0]);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.xlsx`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting CSV ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await DocEngine.csvToExcel(f);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.xlsx`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging Excel workbooks into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `csv-to-excel-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'excel-to-csv') {
        if (files.length === 0) throw new Error('Please select Excel file(s) (.xlsx, .xls).');
        if (files.length === 1) {
          setMessage('Extracting active worksheet into CSV...');
          setProgress(60);
          outBlob = await DocEngine.excelToCsv(files[0]);
          outFileName = `${files[0].name.replace(/\.[^/.]+$/, '')}.csv`;
        } else {
          const processed: { name: string; blob: Blob; url: string; size: number }[] = [];
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setMessage(`Converting Excel ${i + 1} of ${files.length}: ${f.name}...`);
            setProgress(Math.round(((i + 0.5) / files.length) * 100));
            const b = await DocEngine.excelToCsv(f);
            const outName = `${f.name.replace(/\.[^/.]+$/, '')}.csv`;
            processed.push({ name: outName, blob: b, url: URL.createObjectURL(b), size: b.size });
          }
          setMessage('Packaging CSV files into ZIP...');
          setProgress(95);
          outBlob = await ArchiveEngine.createZipFromBlobs(processed);
          outFileName = `excel-to-csv-batch-${files.length}-files.zip`;
          additionalFiles = processed;
          originalSize = files.reduce((acc, f) => acc + f.size, 0);
        }
      } else if (tool.id === 'json-to-csv') {
        setMessage('Flattening JSON keys and parsing rows...');
        setProgress(60);
        const csvStr = DocEngine.jsonToCsv(jsonInput);
        outBlob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        outFileName = 'converted.csv';
        originalSize = new Blob([jsonInput]).size;
      } else if (tool.id === 'markdown-to-pdf') {
        setMessage('Compiling Markdown syntax into PDF typography...');
        setProgress(60);
        outBlob = await PDFEngine.textToPDF(markdownInput, { title: 'Markdown Export' });
        outFileName = 'markdown-document.pdf';
        originalSize = new Blob([markdownInput]).size;
      }

      // ----------------- SECURITY & UTILITIES -----------------
      else if (tool.id === 'compress-files') {
        if (files.length === 0) throw new Error('Please select one or more files to compress.');
        setMessage(`Analyzing and compressing ${files.length} file${files.length > 1 ? 's' : ''}...`);
        setProgress(50);

        const targetBytes = getTargetSizeBytes();

        if (fileCompressionFormat === 'smart' && files.length === 1) {
          const f = files[0];
          if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
            setMessage('Applying targeted PDF stream compaction...');
            const comp = await PDFEngine.compressPDF(f, {
              mode: compressMode === 'quality' ? 'balanced' : 'target',
              targetSizeBytes: targetBytes,
              onProgress: (p, msg) => {
                setProgress(p);
                setMessage(msg);
              },
            });
            outBlob = comp.blob;
            outFileName = `compressed-${f.name}`;
          } else if (f.type.startsWith('image/')) {
            setMessage('Applying targeted image quantization...');
            const comp = await ImageEngine.compressImage(f, {
              mode: compressMode === 'quality' ? 'quality' : 'target',
              targetSizeBytes: targetBytes,
              quality: imgQuality / 100,
            });
            outBlob = comp.blob;
            outFileName = `compressed-${f.name.replace(/\.[^/.]+$/, '')}.webp`;
          } else {
            const comp = await ArchiveEngine.compressGenericFiles([f], 'gzip', 9);
            outBlob = comp.blob;
            outFileName = comp.fileName;
          }
        } else {
          const comp = await ArchiveEngine.compressGenericFiles(
            files,
            fileCompressionFormat === 'gzip' ? 'gzip' : 'zip',
            fileCompressionLevel
          );
          outBlob = comp.blob;
          outFileName = comp.fileName;
        }

        originalSize = files.reduce((acc, f) => acc + f.size, 0);
      } else if (tool.id === 'zip-files') {
        if (files.length === 0) throw new Error('Please select files to zip.');
        setMessage(`Compressing ${files.length} files into ZIP archive...`);
        setProgress(60);
        const zipRes = await ArchiveEngine.createZipArchive(files);
        outBlob = zipRes.blob;
        outFileName = 'archive.zip';
        originalSize = files.reduce((acc, f) => acc + f.size, 0);
      } else if (tool.id === 'unzip-files') {
        if (!files[0]) throw new Error('Please select a ZIP file to extract.');
        setMessage('Unpacking archive entries in memory...');
        setProgress(60);
        const extracted = await ArchiveEngine.extractAllFromZip(files[0]);
        if (extracted.length === 0) throw new Error('ZIP archive is empty or could not be read.');
        additionalFiles = extracted;
        // The first extracted file is the main result
        outBlob = extracted[0].blob;
        outFileName = extracted[0].name;
      } else if (tool.id === 'qr-code-studio') {
        setMessage('Rendering high-resolution vector QR code...');
        setProgress(60);
        const qrRes = await CryptoEngine.generateQrCode(qrText, {
          darkColor: qrDark,
          lightColor: qrLight,
          width: 800,
        });
        const resFetch = await fetch(qrRes.pngDataUrl);
        outBlob = await resFetch.blob();
        outFileName = 'qrcode.png';
        originalSize = 0;
      } else if (tool.id === 'file-hash') {
        if (!files[0]) throw new Error('Please select a file to compute hashes.');
        setMessage('Streaming bytes through hardware-accelerated WebCrypto SHA engines...');
        setProgress(60);
        const h = await CryptoEngine.calculateFileHashes(files[0]);
        setHashes(h);
        outBlob = new Blob([JSON.stringify(h, null, 2)], { type: 'application/json' });
        outFileName = `${files[0].name}.checksums.json`;
      } else if (tool.id === 'file-inspector') {
        if (!files[0]) throw new Error('Please select a file to inspect.');
        setMessage('Analyzing file signature and hex bytes...');
        setProgress(60);
        const ins = await CryptoEngine.inspectFileBytes(files[0], 256);
        setInspection(ins);
        outBlob = new Blob([JSON.stringify(ins, null, 2)], { type: 'application/json' });
        outFileName = `${files[0].name}.analysis.json`;
      } else if (tool.id === 'password-generator') {
        setMessage('Harvesting entropy from crypto.getRandomValues...');
        setProgress(60);
        outBlob = new Blob([generatedPass], { type: 'text/plain' });
        outFileName = 'generated-password.txt';
        originalSize = 0;
      }

      if (!outBlob) {
        throw new Error('Operation produced empty output.');
      }

      setProgress(100);
      setMessage('Done!');

      const downloadUrl = URL.createObjectURL(outBlob);
      const isImage = outBlob.type.startsWith('image/');
      const isPdf = outBlob.type === 'application/pdf';

      setResult({
        blob: outBlob,
        fileName: outFileName,
        mimeType: outBlob.type,
        originalSize,
        newSize: outBlob.size,
        downloadUrl,
        previewUrl: isImage || isPdf ? downloadUrl : undefined,
        additionalFiles,
      });

      setStatus('done');
    } catch (err: unknown) {
      console.error(err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred during processing.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
    setFiles([]);
    setPaletteColors([]);
    setHashes(null);
    setInspection(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold uppercase tracking-wider">
          <Zap className="w-3 h-3" />
          <span>{tool.category}</span>
          {tool.badge && (
            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[9px] ml-1">
              {tool.badge}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{tool.name}</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">{tool.description}</p>
      </div>

      {/* Main Interactive Workstation */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative">
        {/* State 1: In Progress */}
        {status === 'processing' && <ProcessingState progress={progress} message={message} />}

        {/* State 2: Result Ready */}
        {status === 'done' && result && (
          <div className="space-y-6">
            <ResultDownload result={result} onReset={handleReset} />

            {/* If Color Palette was extracted */}
            {paletteColors.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
                <h4 className="text-sm font-semibold text-white">Extracted Color Palette (Click to copy):</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {paletteColors.map((col, idx) => (
                    <button
                      key={idx}
                      onClick={() => copyToClipboard(col.hex, `hex-${idx}`)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-blue-500/50 transition flex flex-col items-center gap-2 group text-left w-full"
                    >
                      <div
                        className="w-full h-12 rounded-lg shadow-inner border border-white/10"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="w-full flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">{col.hex}</span>
                        {copiedKey === `hex-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 self-start">{col.rgb}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* If Hashes were computed */}
            {hashes && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 text-left">
                <h4 className="text-sm font-semibold text-white">Cryptographic Checksums:</h4>
                <div className="space-y-3">
                  {[
                    { label: 'SHA-256', val: hashes.sha256 },
                    { label: 'SHA-512', val: hashes.sha512 },
                    { label: 'SHA-1', val: hashes.sha1 },
                  ].map((h, i) => (
                    <div key={i} className="space-y-1">
                      <span className="text-xs font-semibold text-slate-400">{h.label}</span>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs text-blue-300 break-all">
                        <span className="flex-1 select-all">{h.val}</span>
                        <button
                          onClick={() => copyToClipboard(h.val, `hash-${i}`)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition shrink-0"
                          title="Copy hash"
                        >
                          {copiedKey === `hash-${i}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If File was Inspected with Hex Viewer */}
            {inspection && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div>
                    <h4 className="text-sm font-semibold text-white">File Inspection Summary:</h4>
                    <p className="text-xs text-slate-400">Signature: {inspection.signatureMatch}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                    {inspection.detectedMime}
                  </span>
                </div>

                <div className="font-mono text-[11px] bg-slate-950 p-4 rounded-xl border border-white/10 overflow-x-auto space-y-1 text-slate-300">
                  <div className="text-slate-500 pb-1 border-b border-white/10">
                    OFFSET    00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ASCII
                  </div>
                  {inspection.hexLines.map((line, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="text-purple-400">{line.offset}</span>
                      <span className="text-cyan-300">{line.hex}</span>
                      <span className="text-amber-300 font-bold">{line.ascii}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If Base64 was generated */}
            {base64Output && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Base64 Data URI:</h4>
                  <button
                    onClick={() => copyToClipboard(base64Output, 'b64')}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    {copiedKey === 'b64' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'b64' ? 'Copied!' : 'Copy Data URI'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={base64Output}
                  rows={4}
                  className="w-full bg-slate-950 p-3 rounded-xl border border-white/10 font-mono text-xs text-slate-300"
                />
              </div>
            )}
          </div>
        )}

        {/* State 3: Interactive Configuration & Upload */}
        {status !== 'processing' && status !== 'done' && (
          <div className="space-y-8">
            {/* Error banner with Direct Feedback & Fix Request */}
            {error && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-300">Processing Error Occurred</p>
                    <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
                  </div>
                </div>

                <FeedbackReportBlock
                  toolName={tool.name}
                  toolSlug={tool.slug}
                  initialError={error}
                  compact
                />
              </div>
            )}

            {/* A: For Tools that need file upload */}
            {tool.maxFiles > 0 && (
              <DropZone
                files={files}
                onFilesChange={setFiles}
                accept={tool.accept}
                maxFiles={tool.maxFiles}
                label={`Upload ${tool.name} file${tool.maxFiles > 1 ? 's' : ''}`}
              />
            )}

            {/* B: Customized Options Per Tool */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-5 text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Tool Options & Settings</h3>
              </div>

              {/* 1. Split PDF Options */}
              {tool.id === 'split-pdf' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={splitMode === 'range'}
                        onChange={() => setSplitMode('range')}
                        className="text-blue-600"
                      />
                      <span>Extract Page Range</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={splitMode === 'each_page'}
                        onChange={() => setSplitMode('each_page')}
                        className="text-blue-600"
                      />
                      <span>Extract Every Page to ZIP</span>
                    </label>
                  </div>
                  {splitMode === 'range' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Page Range (e.g. 1-3, 5, 8-12):
                      </label>
                      <input
                        type="text"
                        value={splitRange}
                        onChange={(e) => setSplitRange(e.target.value)}
                        className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                        placeholder="1-3, 5"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 2. Rotate PDF / Image */}
              {(tool.id === 'rotate-pdf' || tool.id === 'rotate-image') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Rotation Angle:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setRotateDeg(deg)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition ${
                            rotateDeg === deg
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {deg}° Clockwise
                        </button>
                      ))}
                    </div>
                  </div>

                  {tool.id === 'rotate-pdf' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Apply to:</label>
                      <div className="flex gap-4 text-xs text-slate-300">
                        {['all', 'odd', 'even'].map((p) => (
                          <label key={p} className="flex items-center gap-1.5 cursor-pointer capitalize">
                            <input
                              type="radio"
                              name="rotSel"
                              checked={rotatePageSel === p}
                              onChange={() => setRotatePageSel(p as 'all' | 'odd' | 'even')}
                            />
                            <span>{p} pages</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {tool.id === 'rotate-image' && (
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flipH}
                          onChange={(e) => setFlipH(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Flip Horizontal (Mirror)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flipV}
                          onChange={(e) => setFlipV(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Flip Vertical</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Watermark PDF */}
              {tool.id === 'watermark-pdf' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Watermark Text:</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="CONFIDENTIAL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Watermark Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="w-10 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-300">{watermarkColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Opacity: {Math.round(watermarkOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.9"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Angle: {watermarkRotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="15"
                      value={watermarkRotation}
                      onChange={(e) => setWatermarkRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 4. Page Numbers PDF */}
              {tool.id === 'page-numbers-pdf' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Position:</label>
                    <select
                      value={pageNumberPos}
                      onChange={(e) =>
                        setPageNumberPos(e.target.value as 'bottom-center' | 'bottom-right' | 'top-right')
                      }
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Format:</label>
                    <select
                      value={pageNumberFormat}
                      onChange={(e) =>
                        setPageNumberFormat(e.target.value as 'Page X of Y' | 'X / Y' | 'X')
                      }
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="Page X of Y">Page X of Y</option>
                      <option value="X / Y">X / Y</option>
                      <option value="X">Simple Number (X)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. Remove Pages */}
              {tool.id === 'remove-pages-pdf' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Page numbers to delete (comma separated, e.g. 2, 4, 7):
                  </label>
                  <input
                    type="text"
                    value={pagesToRemoveStr}
                    onChange={(e) => setPagesToRemoveStr(e.target.value)}
                    className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    placeholder="2, 4"
                  />
                </div>
              )}

              {/* 6. Metadata Editor */}
              {tool.id === 'pdf-metadata' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Document Title:</label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="My Document"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Author Name:</label>
                    <input
                      type="text"
                      value={metaAuthor}
                      onChange={(e) => setMetaAuthor(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
              )}

              {/* 7. Images to PDF */}
              {(tool.id === 'images-to-pdf' || tool.id === 'scan-to-pdf') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Paper Size:</label>
                    <select
                      value={imgPdfSize}
                      onChange={(e) => setImgPdfSize(e.target.value as 'a4' | 'letter' | 'fit')}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="a4">A4 Standard</option>
                      <option value="letter">US Letter</option>
                      <option value="fit">Fit to Image Size</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Orientation:</label>
                    <select
                      value={imgPdfOrientation}
                      onChange={(e) =>
                        setImgPdfOrientation(e.target.value as 'portrait' | 'landscape' | 'auto')
                      }
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="auto">Auto-detect per image</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Lock PDF */}
              {tool.id === 'lock-pdf' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Set Password:</label>
                    <input
                      type="password"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="Enter strong password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password:</label>
                    <input
                      type="password"
                      value={pdfPasswordConfirm}
                      onChange={(e) => setPdfPasswordConfirm(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="Repeat password"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 sm:col-span-2">
                    Files are encrypted using standard AES-256-GCM. Without this password, the file cannot be opened.
                  </p>
                </div>
              )}

              {/* Unlock PDF */}
              {tool.id === 'unlock-pdf' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Password (leave blank if stripping printing/copying permission restrictions):
                  </label>
                  <input
                    type="password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    placeholder="Enter document password (optional)"
                  />
                  <p className="text-[11px] text-slate-400">
                    Removes password prompts and eliminates print/copy permissions lock permanently.
                  </p>
                </div>
              )}

              {/* Reorder / Organize PDF */}
              {tool.id === 'reorder-pdf' && (
                <div className="space-y-3">
                  <PDFPageReorderGrid
                    file={files[0] || null}
                    initialOrderStr={reorderOrderStr}
                    onOrderChange={(evt) => {
                      setReorderOrderStr(evt.orderString);
                      setReorderRotations(evt.rotations);
                    }}
                  />
                </div>
              )}

              {/* PDF to Images */}
              {tool.id === 'pdf-to-images' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Image Format:</label>
                    <select
                      value={pdfToImgFormat}
                      onChange={(e) => setPdfToImgFormat(e.target.value as 'image/png' | 'image/jpeg')}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="image/png">PNG (Lossless, High Detail)</option>
                      <option value="image/jpeg">JPG (Compact File Size)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Resolution Scale:</label>
                    <select
                      value={pdfToImgDpi}
                      onChange={(e) => setPdfToImgDpi(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="1">1x Standard (Web 72 DPI)</option>
                      <option value="2">2x Crisp Retina (144 DPI)</option>
                      <option value="3">3x Ultra High Definition (216 DPI)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Crop Image */}
              {tool.id === 'crop-image' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">Aspect Ratio Preset:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'free', label: 'Freeform / Auto' },
                      { id: '1:1', label: '1:1 Square' },
                      { id: '16:9', label: '16:9 Wide' },
                      { id: '4:3', label: '4:3 Standard' },
                      { id: '9:16', label: '9:16 Story/Reel' },
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => setCropAspect(asp.id as 'free' | '1:1' | '16:9' | '4:3' | '9:16')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${
                          cropAspect === asp.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Auto-centers the crop frame according to your selected aspect ratio.
                  </p>
                </div>
              )}

              {/* Grayscale PDF */}
              {tool.id === 'grayscale-pdf' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-1">
                  <h4 className="text-xs font-semibold text-white">Monochrome Black & White Optimization</h4>
                  <p className="text-[11px] text-slate-400">
                    Converts colored artwork, headers, diagrams, and text into clean grayscale for ink-saving printing and smaller file footprints.
                  </p>
                </div>
              )}

              {/* Compress PDF & Compress Image Options */}
              {(tool.id === 'compress-pdf' || tool.id === 'compress-image') && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-950/70 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Target File Size
                    </span>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCompressMode('target')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          compressMode === 'target'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Target Size
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompressMode('quality')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          compressMode === 'quality'
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Quality %
                      </button>
                    </div>
                  </div>

                  {compressMode === 'target' ? (
                    <div className="space-y-4">
                      {/* Exact Target KB Header & Manual Input */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-white/10">
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span>Exact Target Compression:</span>
                            <span className="text-emerald-400 font-mono text-sm font-bold">{targetKb} KB</span>
                            <span className="text-[10px] text-slate-400">({(targetKb / 1024).toFixed(2)} MB)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Precision calibration dynamically hits your exact target KB with sharp text and zero-blur rendering.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-400">Set KB:</label>
                          <input
                            type="number"
                            min="30"
                            max="50000"
                            step="10"
                            value={targetKb}
                            onChange={(e) => {
                              const val = Math.max(30, parseInt(e.target.value, 10) || 30);
                              setTargetKb(val);
                              setTargetPreset('custom');
                            }}
                            className="w-24 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-white/20 text-xs text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-400">KB</span>
                        </div>
                      </div>

                      {/* Interactive Slider */}
                      <div className="space-y-1.5 px-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>50 KB (High Shrink)</span>
                          <span className="text-emerald-400 font-mono font-medium">{targetKb} KB</span>
                          <span>2,000 KB (2 MB)</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="2000"
                          step="5"
                          value={Math.min(targetKb, 2000)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setTargetKb(val);
                            setTargetPreset('custom');
                          }}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1.5">
                          Quick Presets
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                          {[
                            { id: '950kb', kb: 950, label: '950 KB', desc: '< 1 MB' },
                            { id: '900kb', kb: 900, label: '900 KB', desc: 'Exact' },
                            { id: '800kb', kb: 800, label: '800 KB', desc: 'Crisp' },
                            { id: '600kb', kb: 600, label: '600 KB', desc: 'Standard' },
                            { id: '500kb', kb: 500, label: '500 KB', desc: 'Forms' },
                            { id: '300kb', kb: 300, label: '300 KB', desc: 'Compact' },
                            { id: '150kb', kb: 150, label: '150 KB', desc: 'Govt Portal' },
                          ].map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setTargetPreset(preset.id as any);
                                setTargetKb(preset.kb);
                              }}
                              className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                                targetKb === preset.kb
                                  ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                              }`}
                            >
                              <span className="text-xs font-bold text-white">{preset.label}</span>
                              <span className="text-[10px] text-slate-400">{preset.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5">
                        <span className="text-slate-400">
                          {files[0] ? `Original: ${(files[0].size / 1024).toFixed(0)} KB (${(files[0].size / (1024 * 1024)).toFixed(2)} MB)` : 'Resolution Guarantee:'}
                        </span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Calibrated for exact {targetKb} KB (Sharp Text, Zero-Blur)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                        <span>Quality: {imgQuality}%</span>
                        <span className="text-emerald-400">
                          {imgQuality < 50 ? 'Maximum Shrink' : imgQuality < 80 ? 'Balanced' : 'High Quality'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="95"
                        step="5"
                        value={imgQuality}
                        onChange={(e) => setImgQuality(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 9. Convert Image */}
              {tool.id === 'convert-image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Target Format:</label>
                    <select
                      value={targetFormat}
                      onChange={(e) =>
                        setTargetFormat(e.target.value as 'image/jpeg' | 'image/png' | 'image/webp')
                      }
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                    >
                      <option value="image/webp">WebP (Modern, Lightest)</option>
                      <option value="image/png">PNG (Lossless, Transparent)</option>
                      <option value="image/jpeg">JPG / JPEG (Standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Quality: {imgQuality}%</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={imgQuality}
                      onChange={(e) => setImgQuality(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 10. Resize Image */}
              {tool.id === 'resize-image' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={resizeMode === 'percent'}
                        onChange={() => setResizeMode('percent')}
                        className="text-blue-600"
                      />
                      <span>Percentage Scale</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={resizeMode === 'exact'}
                        onChange={() => setResizeMode('exact')}
                        className="text-blue-600"
                      />
                      <span>Exact Pixels (W x H)</span>
                    </label>
                  </div>

                  {resizeMode === 'percent' ? (
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Scale: {scalePercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={scalePercent}
                        onChange={(e) => setScalePercent(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Width (px):</label>
                        <input
                          type="number"
                          value={resizeWidth}
                          onChange={(e) => setResizeWidth(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Height (px):</label>
                        <input
                          type="number"
                          value={resizeHeight}
                          onChange={(e) => setResizeHeight(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 11. Image Filters */}
              {tool.id === 'image-filters' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Artistic Preset:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'grayscale', label: 'Grayscale' },
                      { id: 'sepia', label: 'Warm Sepia' },
                      { id: 'invert', label: 'Dark Invert' },
                      { id: 'noir', label: 'Film Noir' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterType(f.id as 'grayscale' | 'sepia' | 'invert' | 'noir')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${
                          filterType === f.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. Blur / Pixelate */}
              {tool.id === 'blur-image' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={blurMode === 'blur'}
                        onChange={() => setBlurMode('blur')}
                        className="text-blue-600"
                      />
                      <span>Gaussian Blur</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={blurMode === 'pixelate'}
                        onChange={() => setBlurMode('pixelate')}
                        className="text-blue-600"
                      />
                      <span>Retro Pixelate</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Intensity: {blurIntensity}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="40"
                      step="1"
                      value={blurIntensity}
                      onChange={(e) => setBlurIntensity(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 13. Text to PDF */}
              {tool.id === 'text-to-pdf' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Text Content:</label>
                  <textarea
                    rows={6}
                    value={plainTextInput}
                    onChange={(e) => setPlainTextInput(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* 14. Markdown to PDF */}
              {tool.id === 'markdown-to-pdf' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Markdown Editor:</label>
                  <textarea
                    rows={6}
                    value={markdownInput}
                    onChange={(e) => setMarkdownInput(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* 15. JSON to CSV */}
              {tool.id === 'json-to-csv' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">JSON Array of Objects:</label>
                  <textarea
                    rows={6}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* Compress Any File */}
              {tool.id === 'compress-files' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Compression Engine & Format:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'zip', label: 'Ultra ZIP Archive (.zip)', desc: 'Standard DEFLATE level 9' },
                        { id: 'gzip', label: 'GZIP Stream (.gz)', desc: 'Web standard stream compression' },
                        { id: 'smart', label: 'Smart Auto-Optimizer', desc: 'Detects PDF/Image/Data type' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setFileCompressionFormat(fmt.id as 'zip' | 'gzip' | 'smart')}
                          className={`p-3 rounded-xl text-left border transition ${
                            fileCompressionFormat === fmt.id
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-semibold text-white">{fmt.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {fileCompressionFormat === 'smart' && (
                    <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            Target File Size: <span className="text-emerald-400 font-mono font-bold">{targetKb} KB</span>
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PDFs & images adaptively calibrate to reach this exact size with maximum clarity.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="30"
                            max="50000"
                            step="10"
                            value={targetKb}
                            onChange={(e) => {
                              const val = Math.max(30, parseInt(e.target.value, 10) || 30);
                              setTargetKb(val);
                              setTargetPreset('custom');
                            }}
                            className="w-20 bg-slate-950 px-2 py-1 rounded-lg border border-white/20 text-xs text-white font-mono font-bold"
                          />
                          <span className="text-xs text-slate-400 font-semibold">KB</span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                        {[
                          { id: '950kb', kb: 950, label: '950 KB' },
                          { id: '900kb', kb: 900, label: '900 KB' },
                          { id: '800kb', kb: 800, label: '800 KB' },
                          { id: '600kb', kb: 600, label: '600 KB' },
                          { id: '500kb', kb: 500, label: '500 KB' },
                          { id: '300kb', kb: 300, label: '300 KB' },
                          { id: '150kb', kb: 150, label: '150 KB' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setTargetPreset(preset.id as any);
                              setTargetKb(preset.kb);
                            }}
                            className={`py-1.5 rounded-lg border text-center transition text-xs font-semibold ${
                              targetKb === preset.kb
                                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                                : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {fileCompressionFormat !== 'smart' && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>
                          Compression Strength:{' '}
                          {fileCompressionLevel === 9
                            ? 'Maximum Shrinkage (Level 9)'
                            : fileCompressionLevel >= 6
                            ? 'Balanced (Level 6)'
                            : 'Fast (Level 1)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="9"
                        step="1"
                        value={fileCompressionLevel}
                        onChange={(e) => setFileCompressionLevel(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Processes documents, binaries, text, logs, code, media, and datasets completely in memory with zero uploads.
                  </p>
                </div>
              )}

              {/* 16. QR Code Studio */}
              {tool.id === 'qr-code-studio' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">QR Code Content (URL or Text):</label>
                    <input
                      type="text"
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs text-white"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Foreground Color:</label>
                      <input
                        type="color"
                        value={qrDark}
                        onChange={(e) => setQrDark(e.target.value)}
                        className="w-full h-9 rounded-lg bg-transparent cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Background Color:</label>
                      <input
                        type="color"
                        value={qrLight}
                        onChange={(e) => setQrLight(e.target.value)}
                        className="w-full h-9 rounded-lg bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  {qrPreview && (
                    <div className="p-4 rounded-xl bg-slate-950 flex flex-col items-center justify-center gap-3">
                      <img
                        src={qrPreview.png}
                        alt="QR Code Preview"
                        className="w-48 h-48 rounded-lg shadow-lg border border-white/10"
                      />
                      <span className="text-[11px] text-slate-400">Live Interactive Preview</span>
                    </div>
                  )}
                </div>
              )}

              {/* 17. Password Generator */}
              {tool.id === 'password-generator' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
                    <span className="font-mono text-base sm:text-lg font-bold text-cyan-400 select-all break-all">
                      {generatedPass}
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedPass, 'pass')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'pass' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Length: {passLength} characters
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={passLength}
                      onChange={(e) => setPassLength(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passUpper}
                        onChange={(e) => setPassUpper(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passLower}
                        onChange={(e) => setPassLower(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Lowercase (a-z)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passNumbers}
                        onChange={(e) => setPassNumbers(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passSymbols}
                        onChange={(e) => setPassSymbols(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Special Symbols (!@#$)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 18. Text Diff Compare */}
              {tool.id === 'text-diff' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Original Text:</label>
                    <textarea
                      rows={5}
                      value={diffTextA}
                      onChange={(e) => setDiffTextA(e.target.value)}
                      className="w-full bg-slate-950 p-2.5 rounded-xl border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Modified Text:</label>
                    <textarea
                      rows={5}
                      value={diffTextB}
                      onChange={(e) => setDiffTextB(e.target.value)}
                      className="w-full bg-slate-950 p-2.5 rounded-xl border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Universal Action Execute Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={tool.maxFiles > 0 && files.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>
                    {tool.actionLabel}
                    {files.length > 1 ? ` (${files.length} Files • Batch)` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
