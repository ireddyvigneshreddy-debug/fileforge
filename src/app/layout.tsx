import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FileForge Pro — Faster, Better & 100% Private File & PDF Tools',
  description:
    'Free, in-browser file utility suite. Convert PPT to PDF, merge, split, compress, watermark, lock/unlock PDFs, resize images, extract ZIPs with zero server uploads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100">{children}</body>
    </html>
  );
}
