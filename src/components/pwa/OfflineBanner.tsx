import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Only show banner when transitioning to offline
    if (!isOnline) {
      setShowBanner(true);
    } else {
      // Delay hiding to show "Back online" message
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Attempt to fetch a simple resource
    try {
      await fetch('/favicon.ico', { cache: 'no-store' });
      // If successful, the online event should fire
    } catch {
      // Still offline
    }
    
    setIsRetrying(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 ${
            isOnline 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-amber-500 text-amber-950'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <p className="text-sm font-medium">Back online!</p>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    You're offline - some features unavailable
                  </p>
                </>
              )}
            </div>
            
            {!isOnline && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                disabled={isRetrying}
                className="bg-amber-100 text-amber-900 hover:bg-amber-200"
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Retry'
                )}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineBanner;
