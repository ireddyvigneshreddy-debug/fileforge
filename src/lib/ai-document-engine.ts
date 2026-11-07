'use client';

export interface DocumentAnalysisResult {
  fileName: string;
  fileType: string;
  totalWords: number;
  readingTimeMinutes: number;
  executiveSummary: string;
  keyInsights: string[];
  keyDataPoints: string[];
  fullText: string;
  sections: { title: string; content: string; pageNumber?: number }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  citations?: string[];
}

// 1. EXTRACT PLAIN TEXT FROM VARIOUS FILE FORMATS IN-BROWSER
export async function extractDocumentText(
  file: File,
  onProgress?: (percent: number, msg: string) => void
): Promise<string> {
  const fileName = file.name.toLowerCase();

  // A. PDF text extraction via pdfjs-dist
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    onProgress?.(20, 'Loading in-browser PDF parser...');
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
      } else {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    let extractedText = '';
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(30 + Math.round((i / numPages) * 50), `Extracting text from page ${i} of ${numPages}...`);
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ');
      extractedText += `\n--- [Page ${i}] ---\n${pageText}\n`;
    }

    return extractedText.trim();
  }

  // B. Spreadsheets & CSV via XLSX
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    onProgress?.(30, 'Parsing spreadsheet workbook...');
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let fullSheetText = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(sheet);
      fullSheetText += `\n--- [Sheet: ${sheetName}] ---\n${csvData}\n`;
    });

    return fullSheetText.trim();
  }

  // C. Plain text, Markdown, JSON, Code files
  onProgress?.(40, 'Reading document text stream...');
  return await file.text();
}

// 2. ANALYZE DOCUMENT & PRODUCE EXECUTIVE SUMMARY
export function analyzeDocument(fileName: string, fullText: string): DocumentAnalysisResult {
  const words = fullText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

  // Extract paragraphs
  const paragraphs = fullText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  // Extract key sentences containing high-impact insights
  const sentences = fullText
    .replace(/\n/g, ' ')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 240);

  // Find sentences containing numbers, dates, findings, or metrics
  const dataPointSentences: string[] = [];
  const keyInsightSentences: string[] = [];

  const insightKeywords = [
    'conclude',
    'result',
    'found',
    'important',
    'significant',
    'objective',
    'goal',
    'recommend',
    'summary',
    'increase',
    'decrease',
    'impact',
    'key',
    'crucial',
    'primary',
  ];

  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();
    const hasData = /\d+(\.\d+)?%|\$\d+|\b(19|20)\d{2}\b|\b\d+ (users|dollars|percent|items|units|kg|kb|mb)\b/i.test(sentence);
    const hasInsightKeyword = insightKeywords.some((kw) => lower.includes(kw));

    if (hasData && dataPointSentences.length < 5) {
      dataPointSentences.push(sentence);
    } else if (hasInsightKeyword && keyInsightSentences.length < 6) {
      keyInsightSentences.push(sentence);
    }
  });

  // If not enough keyword sentences, take top representative paragraphs
  if (keyInsightSentences.length < 3) {
    paragraphs.slice(0, 4).forEach((p) => {
      const firstSentence = p.split(/[.!?]/)[0];
      if (firstSentence && firstSentence.length > 30) {
        keyInsightSentences.push(firstSentence.trim());
      }
    });
  }

  // Generate clean Executive Summary
  const topOverview = paragraphs.slice(0, 2).join(' ').substring(0, 380);
  const executiveSummary =
    topOverview.length > 0
      ? `${topOverview}${topOverview.length >= 380 ? '...' : ''}`
      : `Document contains ${totalWords.toLocaleString()} words across multiple structured sections.`;

  // Parse page or section markers
  const sections: { title: string; content: string; pageNumber?: number }[] = [];
  const pageMatches = fullText.split(/--- \[Page (\d+)\] ---/);

  if (pageMatches.length > 1) {
    for (let i = 1; i < pageMatches.length; i += 2) {
      const pageNum = parseInt(pageMatches[i], 10);
      const content = (pageMatches[i + 1] || '').trim();
      sections.push({
        title: `Page ${pageNum}`,
        content: content.substring(0, 500),
        pageNumber: pageNum,
      });
    }
  } else {
    sections.push({
      title: 'Document Overview',
      content: fullText.substring(0, 1000),
    });
  }

  return {
    fileName,
    fileType: fileName.split('.').pop()?.toUpperCase() || 'DOCUMENT',
    totalWords,
    readingTimeMinutes,
    executiveSummary,
    keyInsights: Array.from(new Set(keyInsightSentences)).slice(0, 5),
    keyDataPoints: Array.from(new Set(dataPointSentences)).slice(0, 4),
    fullText,
    sections,
  };
}

// 3. SEMANTIC RELEVANCE Q&A ANSWER ENGINE
export async function answerQuestionFromDocument(
  question: string,
  analysis: DocumentAnalysisResult,
  userApiKey?: string
): Promise<{ text: string; citations: string[] }> {
  // If user provides a personal Gemini API key, use it for direct generative response
  if (userApiKey && userApiKey.trim().length > 15) {
    try {
      const prompt = `You are an elite document assistant. Answer the user's question accurately using ONLY the document text below. Be concise, direct, and highlight key data.\n\nDOCUMENT CONTENT:\n${analysis.fullText.substring(0, 28000)}\n\nQUESTION: ${question}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          return { text: geminiText, citations: ['Gemini 2.5 Flash In-Memory Inference'] };
        }
      }
    } catch (e) {
      console.warn('[AI Document Chat] Gemini API error, falling back to local semantic engine:', e);
    }
  }

  // In-Browser High-Precision Semantic Matching Engine
  const qTokens = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'who', 'how', 'does', 'from', 'with', 'that', 'this'].includes(w));

  const paragraphs = analysis.fullText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const scoredParagraphs: { text: string; score: number; page?: number }[] = [];

  let currentPage = 1;
  paragraphs.forEach((p) => {
    const pageMatch = p.match(/--- \[Page (\d+)\] ---/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      return;
    }

    const pLower = p.toLowerCase();
    let score = 0;
    qTokens.forEach((token) => {
      if (pLower.includes(token)) {
        score += 3;
        // Exact word boundary bonus
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(p)) score += 2;
      }
    });

    if (score > 0) {
      scoredParagraphs.push({ text: p, score, page: currentPage });
    }
  });

  scoredParagraphs.sort((a, b) => b.score - a.score);

  if (scoredParagraphs.length === 0) {
    return {
      text: `I couldn't find a direct reference to "${question}" in this document. The document covers: "${analysis.executiveSummary.substring(0, 150)}..." You can try asking about broader topics or specific terms mentioned in the text.`,
      citations: [],
    };
  }

  const topMatches = scoredParagraphs.slice(0, 3);
  const citations = Array.from(new Set(topMatches.map((m) => `Page ${m.page || 1}`)));

  const answerBody = topMatches
    .map((m) => `> "${m.text.length > 300 ? m.text.substring(0, 300) + '...' : m.text}" (Source: Page ${m.page || 1})`)
    .join('\n\n');

  return {
    text: `Based on your document:\n\n${answerBody}`,
    citations,
  };
}
