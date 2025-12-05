import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Wifi, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallPromptProps {
  minPageViews?: number;
}

export function PWAInstallPrompt({ minPageViews = 3 }: PWAInstallPromptProps) {
  const { canInstall, installPrompt, dismissInstallPrompt, isInstalled } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageViews, setPageViews] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Track page views
  useEffect(() => {
    const storedViews = parseInt(sessionStorage.getItem('pwa-page-views') || '0', 10);
    const newViews = storedViews + 1;
    sessionStorage.setItem('pwa-page-views', newViews.toString());
    setPageViews(newViews);
  }, []);

  // Show prompt after minimum page views
  useEffect(() => {
    if (canInstall && pageViews >= minPageViews) {
      // Delay showing prompt for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, pageViews, minPageViews]);

  // Show success when installed
  useEffect(() => {
    if (isInstalled) {
      setShowPrompt(false);
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleInstall = async () => {
    await installPrompt();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    dismissInstallPrompt();
  };

  const benefits = [
    { icon: Wifi, text: 'Study offline' },
    { icon: Zap, text: 'Faster loading' },
    { icon: Smartphone, text: 'Home screen access' },
  ];

  return (
    <>
      {/* Install Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Download className="h-7 w-7 text-primary-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">
                    Install EduFutura
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get faster access and study offline
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="flex items-center gap-4 mt-4">
                {benefits.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-secondary" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-5">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  Install App
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50"
          >
            <div className="bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Check className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Welcome to EduFutura!</p>
                <p className="text-sm opacity-90">App installed successfully</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PWAInstallPrompt;
