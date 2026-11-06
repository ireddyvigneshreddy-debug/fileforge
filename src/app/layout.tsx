import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from '@/components/common/PWARegistration';
import { DeepSpaceBackground } from '@/components/common/DeepSpaceBackground';

export const viewport: Viewport = {
  themeColor: '#03050a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'FileForge Pro — Deep-Space Command Station for File & PDF Tools',
  description:
    'Free, in-browser file utility suite. Convert PPT to PDF, merge, split, compress, watermark, lock/unlock PDFs, resize images, extract ZIPs with zero server uploads.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FileForge Pro',
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
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FileForge" />
        <meta name="application-name" content="FileForge" />
      </head>
      <body className="min-h-full flex flex-col bg-[#03050a] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans relative overflow-x-hidden">
        {/* Dynamic Multi-layered Deep-Space Canvas Starfield & Ambient Nebulae */}
        <DeepSpaceBackground />

        {/* Global PWA & Station Content */}
        <PWAProvider>
          <div className="relative z-10 flex-1 flex flex-col min-h-screen">
            {children}
          </div>
        </PWAProvider>
      </body>
    </html>
  );
}
