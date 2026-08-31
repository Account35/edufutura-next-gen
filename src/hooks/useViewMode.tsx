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

/**
 * Session-only "view as candidate" mode for admins/educators.
 *
 * IMPORTANT: this NEVER changes the user's real role in the database.
 * The flag lives in sessionStorage only and is cleared on sign out and
 * whenever the authenticated user changes, so a fresh login always starts
 * in the admin's true role.
 */

export const VIEW_MODE_STORAGE_KEY = 'admin_preview';
export const VIEW_MODE_RETURN_KEY = 'admin_preview_from';
export const VIEW_MODE_EVENT = 'adminPreviewChanged';

export const readViewModeFlag = (): boolean => {
  try {
    return sessionStorage.getItem(VIEW_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/** Clears the candidate-view flags. Safe to call from anywhere (e.g. signOut). */
export const clearViewModeFlag = () => {
  try {
    sessionStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    sessionStorage.removeItem(VIEW_MODE_RETURN_KEY);
    window.dispatchEvent(
      new CustomEvent(VIEW_MODE_EVENT, { detail: { admin_preview: '0' } })
    );
  } catch {
    // ignore storage errors
  }
};

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
  const [returnPath, setReturnPath] = useState<string>(() => {
    try {
      return sessionStorage.getItem(VIEW_MODE_RETURN_KEY) || '/admin';
    } catch {
      return '/admin';
    }
  });

  // Keep in sync with flag changes triggered elsewhere in the app.
  useEffect(() => {
    const sync = () => {
      setViewingAsCandidate(readViewModeFlag());
      try {
        setReturnPath(sessionStorage.getItem(VIEW_MODE_RETURN_KEY) || '/admin');
      } catch {
        setReturnPath('/admin');
      }
    };
    window.addEventListener(VIEW_MODE_EVENT, sync as EventListener);
    return () => window.removeEventListener(VIEW_MODE_EVENT, sync as EventListener);
  }, []);

  // Role state validation: never inherit a stale flag across accounts/sessions.
  useEffect(() => {
    if (!user) {
      if (readViewModeFlag()) clearViewModeFlag();
      setViewingAsCandidate(false);
    }
  }, [user?.id]);

  const enterCandidateView = useCallback((fromPath?: string) => {
    try {
      sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, '1');
      sessionStorage.setItem(VIEW_MODE_RETURN_KEY, fromPath || '/admin');
      window.dispatchEvent(
        new CustomEvent(VIEW_MODE_EVENT, {
          detail: { admin_preview: '1', from: fromPath || '/admin' },
        })
      );
    } catch {
      // ignore storage errors
    }
    setReturnPath(fromPath || '/admin');
    setViewingAsCandidate(true);
  }, []);

  const exitCandidateView = useCallback(() => {
    let to = '/admin';
    try {
      to = sessionStorage.getItem(VIEW_MODE_RETURN_KEY) || '/admin';
    } catch {
      to = '/admin';
    }
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
