import { useEffect, useRef } from 'react';

export const useTimeTracking = (
  isActive: boolean,
  onMinuteElapsed: () => void
) => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isActive) return;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        
        if (elapsed >= 60000) { // 1 minute
          onMinuteElapsed();
          lastTickRef.current = now;
        }
      }
    };

    intervalRef.current = setInterval(tick, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onMinuteElapsed]);
};
