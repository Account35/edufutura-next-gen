import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAResult {
  // Install prompt
  canInstall: boolean;
  isInstalled: boolean;
  installPrompt: () => Promise<void>;
  dismissInstallPrompt: () => void;
  
  // Update handling
  needRefresh: boolean;
  updateServiceWorker: () => void;
  
  // Registration status
  offlineReady: boolean;
  registrationError: Error | undefined;
}

// Track dismissal count
const INSTALL_DISMISS_KEY = 'pwa-install-dismiss-count';
const MAX_DISMISSALS = 3;

export function usePWA(): UsePWAResult {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canShowInstall, setCanShowInstall] = useState(true);

  // Register service worker with vite-plugin-pwa
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);
      
      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      
      // Check dismissal count
      const dismissCount = parseInt(localStorage.getItem(INSTALL_DISMISS_KEY) || '0', 10);
      setCanShowInstall(dismissCount < MAX_DISMISSALS);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for successful installation
    const installHandler = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      console.log('[PWA] App installed successfully');
    };

    window.addEventListener('appinstalled', installHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installHandler);
    };
  }, []);

  // Trigger install prompt
  const installPrompt = useCallback(async () => {
    if (!installPromptEvent) {
      console.log('[PWA] No install prompt available');
      return;
    }

    try {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        setInstallPromptEvent(null);
      } else {
        console.log('[PWA] User dismissed install prompt');
      }
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
    }
  }, [installPromptEvent]);

  // Dismiss install prompt permanently
  const dismissInstallPrompt = useCallback(() => {
    const currentCount = parseInt(localStorage.getItem(INSTALL_DISMISS_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(INSTALL_DISMISS_KEY, newCount.toString());
    
    if (newCount >= MAX_DISMISSALS) {
      setCanShowInstall(false);
    }
  }, []);

  // Handle service worker update
  const handleUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    canInstall: !!installPromptEvent && canShowInstall && !isInstalled,
    isInstalled,
    installPrompt,
    dismissInstallPrompt,
    needRefresh,
    updateServiceWorker: handleUpdate,
    offlineReady,
    registrationError: undefined,
  };
}

export default usePWA;
