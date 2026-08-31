import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  VIEW_MODE_EVENT,
  clearViewModeFlag,
  readViewModeFlag,
  readViewModeReturnPath,
  setViewModeFlag,
} from '@/lib/view-mode';

/**
 * Session-only "view as candidate" mode for admins/educators.
 *
 * IMPORTANT: this NEVER changes the user's real role in the database.
 * The flag lives in sessionStorage only and is cleared on sign out and
 * whenever the authenticated user changes, so a fresh login always starts
 * in the admin's true role.
 */

interface ViewModeContextType {
  /** True while an admin is simulating the candidate experience. */
  viewingAsCandidate: boolean;
  /** Path to return to when exiting candidate view. */
  returnPath: string;
  enterCandidateView: (fromPath?: string) => void;
  exitCandidateView: () => string;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [viewingAsCandidate, setViewingAsCandidate] = useState<boolean>(() => readViewModeFlag());
  const [returnPath, setReturnPath] = useState<string>(() => readViewModeReturnPath());

  // Keep in sync with flag changes triggered elsewhere in the app.
  useEffect(() => {
    const sync = () => {
      setViewingAsCandidate(readViewModeFlag());
      setReturnPath(readViewModeReturnPath());
    };
    window.addEventListener(VIEW_MODE_EVENT, sync as EventListener);
    return () => window.removeEventListener(VIEW_MODE_EVENT, sync as EventListener);
  }, []);

  // Role state validation: never inherit a stale flag across accounts/sessions.
  useEffect(() => {
    if (!user) {
      if (readViewModeFlag()) clearViewModeFlag();
      setViewingAsCandidate(false);
      setReturnPath('/admin');
    }
  }, [user?.id]);

  const enterCandidateView = useCallback((fromPath?: string) => {
    setViewModeFlag(fromPath || '/admin');
    setReturnPath(fromPath || '/admin');
    setViewingAsCandidate(true);
  }, []);

  const exitCandidateView = useCallback(() => {
    const to = readViewModeReturnPath();
    clearViewModeFlag();
    setViewingAsCandidate(false);
    setReturnPath('/admin');
    return to;
  }, []);

  const value = useMemo(
    () => ({ viewingAsCandidate, returnPath, enterCandidateView, exitCandidateView }),
    [viewingAsCandidate, returnPath, enterCandidateView, exitCandidateView]
  );

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
};

export const useViewMode = (): ViewModeContextType => {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    // Safe fallback so components used outside the provider never crash.
    return {
      viewingAsCandidate: readViewModeFlag(),
      returnPath: '/admin',
      enterCandidateView: () => {},
      exitCandidateView: () => '/admin',
    };
  }
  return ctx;
};
