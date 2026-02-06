import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
  showLabel?: boolean;
}

/**
 * A reusable back button that navigates to the previous page in browser history.
 * Falls back to a specified path if there's no history (e.g., direct navigation).
 */
export const BackButton = ({ 
  className, 
  fallbackPath = '/',
  showLabel = false 
}: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    // Check if we have history to go back to
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // Fallback to a safe route based on current location
      if (location.pathname.startsWith('/admin')) {
        navigate('/admin');
      } else if (location.pathname.startsWith('/onboarding')) {
        navigate('/dashboard');
      } else {
        navigate(fallbackPath);
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'sm' : 'icon'}
      onClick={handleGoBack}
      className={cn('shrink-0', className)}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span className="ml-2">Back</span>}
    </Button>
  );
};
