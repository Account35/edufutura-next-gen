import { useEffect, useState } from 'react';

export const useScrollProgress = (onProgressChange?: (percentage: number) => void) => {
  const [scrollPercentage, setScrollPercentage] = useState(0);

  useEffect(() => {
    let lastUpdate = 0;
    let lastNotified = -1;
    
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastUpdate < 50) return; // Throttle to every 50ms
      
      lastUpdate = now;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const scrollableHeight = documentHeight - windowHeight;
      const percentage = scrollableHeight > 0 
        ? Math.min(Math.round((scrollTop / scrollableHeight) * 100), 100)
        : 0;
      
      setScrollPercentage(percentage);
      
      if (onProgressChange && percentage !== lastNotified) {
        onProgressChange(percentage);
        lastNotified = percentage;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onProgressChange]);

  return scrollPercentage;
};
