import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const NetworkStatusBanner = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-yellow-950 py-2 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm md:text-base">
        <WifiOff className="w-4 h-4 md:w-5 md:h-5" />
        <span className="font-medium">
          You're offline - some features may not work
        </span>
      </div>
    </div>
  );
};
