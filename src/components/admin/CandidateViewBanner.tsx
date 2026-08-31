import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeftCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';

/**
 * Persistent indicator shown while an admin browses the platform as a candidate.
 * The admin's real role is unchanged — this is a simulated view only.
 */
export const CandidateViewBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { viewingAsCandidate, exitCandidateView } = useViewMode();

  if (!user || !viewingAsCandidate) return null;

  const handleExit = () => {
    const to = exitCandidateView();
    navigate(to || '/admin', { replace: true });
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-secondary text-secondary-foreground">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Viewing as Candidate — you are still signed in as an admin (permissions unchanged).
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={handleExit} className="gap-2">
          <ArrowLeftCircle className="h-4 w-4" />
          Exit Candidate View
        </Button>
      </div>
    </div>
  );
};

export default CandidateViewBanner;
