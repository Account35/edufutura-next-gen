import { useEffect, useState } from 'react';

export const useScrollProgress = (onProgressChange?: (percentage: number) => void) => {
  const [scrollPercentage, setScrollPercentage] = useState(0);

  useEffect(() => {
    let lastUpdate = 0;
    
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastUpdate < 100) return; // Throttle to every 100ms
      
      lastUpdate = now;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const scrollableHeight = documentHeight - windowHeight;
      const percentage = scrollableHeight > 0 
        ? Math.min(Math.round((scrollTop / scrollableHeight) * 100), 100)
        : 0;
      
      setScrollPercentage(percentage);
      
      // Notify parent of progress changes at 10% increments
      if (onProgressChange && percentage % 10 === 0) {
        onProgressChange(percentage);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onProgressChange]);

  return scrollPercentage;
};
