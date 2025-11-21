import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  className?: string;
}

export function SwipeableCard({ children, onSwipeRight, onSwipeLeft, className }: SwipeableCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swipe right - save
      setExitX(200);
      onSwipeRight?.();
    } else if (info.offset.x < -threshold) {
      // Swipe left - dismiss
      setExitX(-200);
      onSwipeLeft?.();
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative ${className}`}
    >
      {/* Swipe indicators */}
      <motion.div
        className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-start pl-8 pointer-events-none"
        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
      >
        <Check className="h-12 w-12 text-green-600" />
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-end pr-8 pointer-events-none"
        style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
      >
        <X className="h-12 w-12 text-red-600" />
      </motion.div>
      
      {children}
    </motion.div>
  );
}
