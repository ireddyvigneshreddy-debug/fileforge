import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { TOOLS, getToolBySlug } from '@/lib/tools-registry';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToolRunner } from '@/components/tools/ToolRunner';
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
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-10 relative z-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono text-cyan-400/60">
          <Link href="/" className="hover:text-cyan-300 transition">
            [STATION_ROOT]
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-500/40" />
          <Link href={`/#${tool.category}`} className="hover:text-cyan-300 uppercase transition">
            [{tool.category}]
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-500/40" />
          <span className="text-white font-bold">{tool.name}</span>
        </nav>

        {/* Master Tool Interactive Workspace */}
        <ToolRunner tool={tool} />

        {/* Minimal Related Tools */}
        {relatedTools.length > 0 && (
          <section className="space-y-3 pt-6 border-t border-cyan-500/20 font-mono">
            <h4 className="text-xs font-semibold text-cyan-400/80 uppercase tracking-widest">
              [SECTOR_MODULES // RELATED_{tool.category.toUpperCase()}]
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedTools.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/tools/${rel.slug}`}
                  className="glass-card p-3.5 rounded-2xl border border-cyan-500/20 hover:border-cyan-400/60 shadow-[0_0_15px_-5px_rgba(0,240,255,0.15)] flex items-center justify-between group text-xs backdrop-blur-md"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                    {rel.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
