import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { TOOLS, getToolBySlug } from '@/lib/tools-registry';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToolRunner } from '@/components/tools/ToolRunner';
import { DualPaneWorkspace } from '@/components/workspace/DualPaneWorkspace';
import { FeedbackReportBlock } from '@/components/common/FeedbackReportBlock';
import { ChevronRight, ArrowRight } from 'lucide-react';

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: 'Tool Not Found - FileForge' };

  return {
    title: `${tool.name} — FileForge Pro`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const relatedTools = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <Navbar />

      <div className="flex-1 w-full flex flex-col">
        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 w-full">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <Link href={`/#${tool.category}`} className="hover:text-slate-300 capitalize transition">
              {tool.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-300 font-medium">{tool.name}</span>
          </nav>
        </div>

        {/* Dual-Pane Dashboard Workspace */}
        <DualPaneWorkspace activeTool={tool}>
          <div className="space-y-10">
            <ToolRunner tool={tool} />

            {/* Direct Feedback & Bug Reporting Block */}
            <FeedbackReportBlock toolName={tool.name} toolSlug={tool.slug} />

            {/* Related Tools */}
            {relatedTools.length > 0 && (
              <section className="space-y-3 pt-6 border-t border-white/5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  More {tool.category} tools
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {relatedTools.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/tools/${rel.slug}`}
                      className="glass-card p-3.5 rounded-xl flex items-center justify-between group text-xs"
                    >
                      <span className="font-medium text-slate-300 group-hover:text-blue-400 transition truncate">
                        {rel.name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </DualPaneWorkspace>
      </div>

      <Footer />
    </div>
  );
}
