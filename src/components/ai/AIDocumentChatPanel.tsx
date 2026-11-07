'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  FileText,
  Bot,
  User,
  Copy,
  Check,
  Key,
  BookOpen,
  HelpCircle,
  Clock,
  TrendingUp,
  Hash,
  Download,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  extractDocumentText,
  analyzeDocument,
  answerQuestionFromDocument,
  DocumentAnalysisResult,
  ChatMessage,
} from '@/lib/ai-document-engine';

export const AIDocumentChatPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractMsg, setExtractMsg] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'sections'>('chat');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Optional custom API Key
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('fileforge_gemini_api_key');
      if (savedKey) setCustomApiKey(savedKey);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fileforge_gemini_api_key', key.trim());
    }
    setShowApiKeyModal(false);
  };

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsExtracting(true);
    setExtractProgress(10);
    setExtractMsg('Reading document bytes...');

    try {
      const text = await extractDocumentText(selectedFile, (pct, msg) => {
        setExtractProgress(pct);
        setExtractMsg(msg);
      });

      if (!text || text.trim().length === 0) {
        throw new Error('No readable text found in document. Try an uncompressed PDF, text, or spreadsheet.');
      }

      setExtractMsg('Running AI semantic analysis...');
      setExtractProgress(90);
      const docAnalysis = analyzeDocument(selectedFile.name, text);
      setAnalysis(docAnalysis);

      // Welcome message
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Hello! I've loaded and analyzed **"${selectedFile.name}"** (${docAnalysis.totalWords.toLocaleString()} words). You can ask me any question about this file, or view the Executive Summary tab for key takeaways.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Document extraction error: ${e.message}`);
      setFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAsk = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || !analysis || isAnswering) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsAnswering(true);

    try {
      const res = await answerQuestionFromDocument(q, analysis, customApiKey);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I encountered an issue while querying the document text. Please try rephrasing your question.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAnswering(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // If no document loaded, display upload stage
  if (!analysis) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Document Assistant</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Chat With Any Document</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Upload PDFs, spreadsheets, or text to extract instant insights, summarize chapters, and chat directly with your files.
          </p>
        </div>

        {/* Upload Container */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-3xl p-8 sm:p-12 text-center bg-slate-900/60 hover:bg-slate-900/80 transition cursor-pointer space-y-4 shadow-xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.txt,.md"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Drop your document here or Browse</h3>
            <p className="text-xs text-slate-400 mt-1">Supports PDF, Word (.docx), Excel (.xlsx), CSV, and Plain Text</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% In-Browser Analysis • Zero Data Leaves Your Device</span>
          </div>

          {isExtracting && (
            <div className="max-w-md mx-auto space-y-2 pt-4">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>{extractMsg}</span>
                <span>{extractProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Document Overview Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase border border-blue-500/30">
            {analysis.fileType}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">{analysis.fileName}</h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-cyan-400" />
                {analysis.totalWords.toLocaleString()} words
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                ~{analysis.readingTimeMinutes} min read
              </span>
            </div>
          </div>
        </div>

        {/* Action Tabs & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'chat' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Q&amp;A Chat
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'summary' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Summary &amp; Insights
            </button>
          </div>

          <button
            onClick={() => {
              setAnalysis(null);
              setFile(null);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs"
            title="Upload Different Document"
          >
            Change
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE CHAT STREAM */}
      {activeTab === 'chat' && (
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl flex flex-col h-[520px] overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-xl p-3.5 rounded-2xl relative group ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-850/90 text-slate-200 border border-white/10 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Citations Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 opacity-80">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => copyToClipboard(msg.text, idx)}
                      className="hover:text-white transition ml-2"
                      title="Copy message"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isAnswering && (
              <div className="flex gap-3 text-xs items-center text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] ml-1">Analyzing document text...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Question Chips */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-slate-500 shrink-0 font-medium">Ask:</span>
            {[
              'Summarize key takeaways in 3 bullets',
              'What are the primary metrics or numbers?',
              'What is the conclusion or final recommendation?',
              'List all dates and timelines mentioned',
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(preset)}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 whitespace-nowrap transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Input Box Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="p-3 sm:p-4 bg-slate-950/90 border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask any question about this document..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="flex-1 bg-slate-900 px-4 py-2.5 rounded-xl border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isAnswering}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-500 hover:to-cyan-400 transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: EXECUTIVE SUMMARY & INSIGHTS */}
      {activeTab === 'summary' && (
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 space-y-6 shadow-2xl">
          {/* Executive Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Executive Overview
            </h4>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 leading-relaxed">
              {analysis.executiveSummary}
            </div>
          </div>

          {/* Key Bullet Insights */}
          {analysis.keyInsights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Key Actionable Insights
              </h4>
              <div className="space-y-2">
                {analysis.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Data Points & Metrics */}
          {analysis.keyDataPoints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-amber-400" />
                Key Data Points &amp; Numbers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.keyDataPoints.map((dp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">{dp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
