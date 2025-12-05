import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Wifi, Zap, Clock, Check, ChevronRight, Apple, Smartphone as Android } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const { canInstall, installPrompt, isInstalled } = usePWA();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const navigate = useNavigate();

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }
  }, []);

  useEffect(() => {
    // Redirect if already installed
    if (isInstalled) {
      const timer = setTimeout(() => navigate('/dashboard'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, navigate]);

  const benefits = [
    { icon: Wifi, title: 'Study Offline', description: 'Access curriculum content without internet' },
    { icon: Zap, title: 'Instant Loading', description: 'Open the app in under a second' },
    { icon: Clock, title: 'Stay Updated', description: 'Get notified about new content' },
    { icon: Smartphone, title: 'Full Screen', description: 'No browser bars, just learning' },
  ];

  const handleInstall = async () => {
    await installPrompt();
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Already Installed!</h1>
          <p className="text-muted-foreground mb-6">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-24 h-24 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Download className="h-12 w-12 text-secondary-foreground" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Install EduFutura
            </h1>
            <p className="text-lg opacity-90 mb-8">
              Get the full app experience with offline access and instant loading
            </p>

            {canInstall ? (
              <Button
                size="lg"
                onClick={handleInstall}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-6 text-lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>
            ) : (
              <p className="text-sm opacity-75">
                {platform === 'ios' 
                  ? 'Tap the Share button below, then "Add to Home Screen"'
                  : 'Use the browser menu to install'}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Benefits */}
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground text-center mb-8">
            Why Install?
          </h2>
          
          <div className="grid gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="py-12 px-4 bg-muted/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground text-center mb-8">
            How to Install
          </h2>

          {platform === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">1</div>
                <div className="flex-1">
                  <p className="text-foreground">Tap the <strong>Share</strong> button in Safari</p>
                </div>
                <Apple className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">2</div>
                <div className="flex-1">
                  <p className="text-foreground">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">3</div>
                <div className="flex-1">
                  <p className="text-foreground">Tap <strong>"Add"</strong> to confirm</p>
                </div>
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </div>
          )}

          {platform === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">1</div>
                <div className="flex-1">
                  <p className="text-foreground">Tap the <strong>menu icon</strong> (three dots)</p>
                </div>
                <Android className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">2</div>
                <div className="flex-1">
                  <p className="text-foreground">Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">3</div>
                <div className="flex-1">
                  <p className="text-foreground">Tap <strong>"Install"</strong> to confirm</p>
                </div>
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </div>
          )}

          {platform === 'desktop' && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Look for the install icon in your browser's address bar, or use the browser menu.
              </p>
              {canInstall && (
                <Button onClick={handleInstall} className="bg-secondary hover:bg-secondary/90">
                  <Download className="h-4 w-4 mr-2" />
                  Install EduFutura
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skip option */}
      <div className="py-8 px-4 text-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="text-muted-foreground"
        >
          Continue without installing
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
