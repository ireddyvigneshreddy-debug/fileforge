export type ToolCategory = 'pdf' | 'image' | 'document' | 'utility' | 'ai';

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  longDescription: string;
  icon: string; // Lucide icon name
  badge?: string; // e.g. "Popular", "New", "100% Private", "AI Powered"
  accept: string[]; // MIME types or extensions (e.g. ['.pdf', 'application/pdf'])
  maxFiles: number; // 1 for single file, >1 for multiple files
  actionLabel: string;
  keywords: string[];
  features: string[];
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface ProcessedResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  originalSize: number;
  newSize: number;
  downloadUrl: string;
  previewUrl?: string;
  additionalFiles?: { name: string; blob: Blob; url: string }[];
}
