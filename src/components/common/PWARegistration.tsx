'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { Download, CheckCircle2, WifiOff, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextType {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  installApp: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  isInstalled: false,
  isOnline: true,
  canInstall: false,
  installApp: async () => {},
});

export const usePWA = () => useContext(PWAContext);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Check if already installed / standalone
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
      setIsOnline(navigator.onLine);

      // Listen for network connectivity changes
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Listen for install prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setCanInstall(true);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setCanInstall(false);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setCanInstall(false);
    } else {
      // Fallback modal or message for Safari / iOS / macOS
      alert(
        'To install FileForge on your Mac:\n\n' +
          '• In Chrome / Edge: Click the Install icon in the browser address bar (or Menu > Install FileForge).\n' +
          '• In Safari: Go to File > Add to Dock.'
      );
    }
  };

  return (
    <PWAContext.Provider value={{ isInstalled, isOnline, canInstall, installApp }}>
      {children}
    </PWAContext.Provider>
  );
};

// Ready-to-use Install & Offline Status Button for Navbar
export const PWAInstallButton: React.FC = () => {
  const { isInstalled, isOnline, canInstall, installApp } = usePWA();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // If offline, display prominent offline badge
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline Mode</span>
      </div>
    );
  }

  // If already running inside installed standalone app
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Offline Ready</span>
      </div>
    );
  }

  // Otherwise show Install App button
  return (
    <button
      onClick={installApp}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-105 cursor-pointer"
      title="Install FileForge as a standalone offline desktop app"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
};
