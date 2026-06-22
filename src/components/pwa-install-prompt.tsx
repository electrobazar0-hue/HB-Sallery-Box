'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInstalled) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        // Successfully installed
      }
    } catch {
      // Install prompt failed or was dismissed
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // No fullscreen button - PWA in standalone mode already works fullscreen
  // The fullscreen API causes errors on mobile, so we removed it
  if (isInstalled) return null;

  // Show install prompt for non-installed
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[200] p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="bg-background border rounded-2xl shadow-2xl p-3 sm:p-4 flex items-center gap-3 max-w-md mx-auto">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base">App Install karo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Home screen pe add karo for better experience</p>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrompt(false)}
              className="min-h-11 min-w-11 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-11 px-4"
            >
              <Smartphone className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Install</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}