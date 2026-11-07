'use client';

import React from 'react';
import { X } from 'lucide-react';
import { FeedbackReportBlock } from '@/components/common/FeedbackReportBlock';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName?: string;
  toolSlug?: string;
  initialError?: string | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  toolName,
  toolSlug,
  initialError,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close modal background"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
        <FeedbackReportBlock
          toolName={toolName}
          toolSlug={toolSlug}
          initialError={initialError}
        />
      </div>
    </div>
  );
};
