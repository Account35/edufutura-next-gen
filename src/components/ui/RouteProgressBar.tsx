 import { useEffect, useState, useCallback } from 'react';
 import { useLocation } from 'react-router-dom';
 import { cn } from '@/lib/utils';
 
 /**
  * Top-of-page progress bar for route transitions
  * Similar to nprogress but React-native implementation
  */
 export const RouteProgressBar = () => {
   const location = useLocation();
   const [isLoading, setIsLoading] = useState(false);
   const [progress, setProgress] = useState(0);
   const [isComplete, setIsComplete] = useState(false);
 
   const startProgress = useCallback(() => {
     setIsLoading(true);
     setIsComplete(false);
     setProgress(0);
 
     // Simulate progress with exponential slowdown
     const startTime = Date.now();
     const tick = () => {
       const elapsed = Date.now() - startTime;
       // Progress quickly at first, then slow down
       // Never reach 100% until complete() is called
       const newProgress = Math.min(90, (1 - Math.exp(-elapsed / 500)) * 100);
       setProgress(newProgress);
 
       if (newProgress < 90) {
         requestAnimationFrame(tick);
       }
     };
     requestAnimationFrame(tick);
   }, []);
 
   const completeProgress = useCallback(() => {
     setProgress(100);
     setIsComplete(true);
     
     // Hide after animation completes
     setTimeout(() => {
       setIsLoading(false);
       setProgress(0);
     }, 300);
   }, []);
 
   useEffect(() => {
     // Start progress on route change
     startProgress();
 
     // Complete after a short delay (simulating page load)
     const timer = setTimeout(completeProgress, 200);
 
     return () => clearTimeout(timer);
   }, [location.pathname, startProgress, completeProgress]);
 
   if (!isLoading && progress === 0) return null;
 
   return (
     <div
       className={cn(
         'fixed top-0 left-0 right-0 z-[9999] h-1 transition-opacity duration-300',
         isComplete ? 'opacity-0' : 'opacity-100'
       )}
     >
       <div
         className="h-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-200 ease-out"
         style={{
           width: `${progress}%`,
           boxShadow: '0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))',
         }}
       />
     </div>
   );
 };
 
 export default RouteProgressBar;