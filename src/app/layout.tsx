import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from '@/components/common/PWARegistration';

export const viewport: Viewport = {
  themeColor: '#080c14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'FileForge Pro — Faster, Better & 100% Private File & PDF Tools',
  description:
    'Free, in-browser file utility suite. Convert PPT to PDF, merge, split, compress, watermark, lock/unlock PDFs, resize images, extract ZIPs with zero server uploads.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FileForge',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100">
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
