'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import {
  Download,
  CheckCircle2,
  WifiOff,
  Share,
  PlusSquare,
  MoreVertical,
  Monitor,
  Apple,
  X,
  Sparkles,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextType {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  installApp: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  isInstalled: false,
  isOnline: true,
  canInstall: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  installApp: async () => {},
});

export const usePWA = () => useContext(PWAContext);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android' | 'windows' | 'mac'>('windows');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect OS
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActivePlatform('ios');
    } else if (/android/.test(ua)) {
      setActivePlatform('android');
    } else if (/macintosh|mac os x/.test(ua)) {
      setActivePlatform('mac');
    } else {
      setActivePlatform('windows');
    }

    // 2. Register Service Worker with instant auto-update support
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope);
            // Force immediate update check
            reg.update();

            // If a worker is waiting, activate it immediately
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // 3. Check standalone status
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);
    setIsOnline(navigator.onLine);

    // Show floating banner if not standalone and not dismissed this session
    const dismissed = sessionStorage.getItem('ff_install_dismissed');
    if (!isStandalone && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }

    // Listen for network connectivity changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Capture native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setShowBanner(false);
      setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallModal = () => setIsModalOpen(true);
  const closeInstallModal = () => setIsModalOpen(false);

  const installApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsModalOpen(false);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
      setCanInstall(false);
    } else {
      // Open device-tailored guidance modal
      setIsModalOpen(true);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('ff_install_dismissed', 'true');
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isOnline,
        canInstall,
        openInstallModal,
        closeInstallModal,
        installApp,
      }}
    >
      {children}

      {/* Floating Bottom Install Banner */}
      {showBanner && !isInstalled && (
        <aside
          aria-label="Install FileForge app"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-cyan-950/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Install FileForge App
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Offline
                  </span>
                </h3>
                <button
                  onClick={dismissBanner}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Install as a standalone app to use all 40+ tools 100% offline without internet.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={installApp}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Install Now
                </button>
                <button
                  onClick={openInstallModal}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  How to install?
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Universal Device-Adaptive Install Guide Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeInstallModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <BrandLogo size={46} />
              <div>
                <h2 id="modal-title" className="text-lg font-bold text-white">Install FileForge Pro</h2>
                <p className="text-xs text-slate-400">Works 100% offline on any phone, tablet, or computer</p>
              </div>
            </div>

            {/* Direct Install Button if browser supports native prompt */}
            {canInstall && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-cyan-300">Ready to install!</div>
                  <div className="text-[11px] text-slate-400">Click below to add directly to your device</div>
                </div>
                <button
                  onClick={installApp}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
                >
                  ⚡ Install Now
                </button>
              </div>
            )}

            {/* Platform Selection Tabs */}
            <div className="flex rounded-lg bg-slate-950/80 p-1 border border-white/5">
              <button
                onClick={() => setActivePlatform('ios')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatform === 'ios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                iPhone / iPad
              </button>
              <button
                onClick={() => setActivePlatform('android')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatform === 'android'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Android
              </button>
              <button
                onClick={() => setActivePlatform('windows')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatform === 'windows'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Windows
              </button>
              <button
                onClick={() => setActivePlatform('mac')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatform === 'mac'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                Mac
              </button>
            </div>

            {/* Platform Specific Step-by-Step Instructions */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
              {activePlatform === 'ios' && (
                <div className="space-y-2.5">
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Apple className="w-4 h-4 text-blue-400" />
                    How to install on iPhone & iPad (Safari):
                  </div>
                  <ol className="space-y-2 text-slate-300 pl-4 list-decimal">
                    <li>
                      In Safari, tap the <strong className="text-white">Share button</strong> (the square with an arrow pointing up <Share className="inline w-3.5 h-3.5 text-blue-400" />) at the bottom of the screen.
                    </li>
                    <li>
                      Scroll down the share sheet and tap <strong className="text-white">"Add to Home Screen"</strong> (<PlusSquare className="inline w-3.5 h-3.5 text-blue-400" />).
                    </li>
                    <li>
                      Tap <strong className="text-white">"Add"</strong> in the top-right corner.
                    </li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ FileForge will now appear on your Home Screen as an offline app icon!
                  </p>
                </div>
              )}

              {activePlatform === 'android' && (
                <div className="space-y-2.5">
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    How to install on Android (Chrome):
                  </div>
                  <ol className="space-y-2 text-slate-300 pl-4 list-decimal">
                    <li>
                      Tap the <strong className="text-white">Menu icon</strong> (<MoreVertical className="inline w-3.5 h-3.5 text-emerald-400" /> three dots in the top-right corner).
                    </li>
                    <li>
                      Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                    </li>
                    <li>
                      Confirm by tapping <strong className="text-white">"Install"</strong>.
                    </li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ FileForge will be added to your App Drawer and Home Screen for 100% offline use!
                  </p>
                </div>
              )}

              {activePlatform === 'windows' && (
                <div className="space-y-2.5">
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    How to install on Windows (Chrome & Edge):
                  </div>
                  <ol className="space-y-2 text-slate-300 pl-4 list-decimal">
                    <li>
                      Look at the <strong className="text-white">right side of the address bar</strong> for the <strong className="text-white">Install icon</strong> (a computer monitor with a down arrow).
                    </li>
                    <li>
                      Or click the browser menu (<strong className="text-white">⋯</strong> or <strong className="text-white">⋮</strong>) → <strong className="text-white">Apps</strong> → <strong className="text-white">"Install FileForge Pro"</strong>.
                    </li>
                    <li>
                      Click <strong className="text-white">"Install"</strong> to pin it to your Start Menu and Taskbar!
                    </li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ Launches in its own window with desktop shortcuts and offline capabilities.
                  </p>
                </div>
              )}

              {activePlatform === 'mac' && (
                <div className="space-y-2.5">
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-400" />
                    How to install on Mac:
                  </div>
                  <ul className="space-y-2 text-slate-300 list-disc pl-4">
                    <li>
                      <strong className="text-white">In Safari:</strong> Click <strong className="text-white">File</strong> in the top menu bar → select <strong className="text-white">"Add to Dock..."</strong>.
                    </li>
                    <li>
                      <strong className="text-white">In Chrome / Edge / Brave:</strong> Click the <strong className="text-white">Install icon</strong> in the address bar (or Menu → Save and Share → Install FileForge).
                    </li>
                  </ul>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ Adds an app icon directly to your macOS Dock and Launchpad!
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Zero uploads • 100% client-side privacy
              </span>
              <button
                onClick={closeInstallModal}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
};

// Ready-to-use Install & Offline Status Button for Navbar
export const PWAInstallButton: React.FC = () => {
  const { isInstalled, isOnline, installApp } = usePWA();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If offline, display prominent offline badge
  if (mounted && !isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline Mode</span>
      </div>
    );
  }

  // If already running inside installed standalone app
  if (mounted && isInstalled) {
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
      className="btn-3d flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-xs font-bold cursor-pointer"
      title="Install FileForge on your Phone, Windows, or Mac"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
};
