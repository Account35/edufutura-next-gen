import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

const AUTH_TIMEOUT_MS = 10000; // 10 second timeout for auth operations

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: Tables<'users'> | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT = 28 * 60 * 1000; // 28 minutes

type ProfileLoadInFlight = {
  userId: string;
  promise: Promise<Tables<'users'> | null>;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Tables<'users'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);
  const initCompleteRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);

  // Deduplicate profile loading to avoid double-fetch (initializeAuth + onAuthStateChange)
  const profileLoadRef = useRef<ProfileLoadInFlight | null>(null);

  const loadUserProfile = async (currentUser: User) => {
    if (profileLoadRef.current?.userId === currentUser.id) {
      console.log('[Auth] Profile load deduplicated for', currentUser.id);
      return profileLoadRef.current.promise;
    }

    const promise = (async (): Promise<Tables<'users'> | null> => {
      console.time('[Auth] loadUserProfile');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      console.timeEnd('[Auth] loadUserProfile');

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      // If profile exists, return it
      if (data) {
        console.log('[Auth] Profile fetched successfully');
        return data;
      }

      // If profile doesn't exist yet (common cause of onboarding spinner), create a minimal record.
      const fullNameFromMeta =
        (currentUser.user_metadata?.full_name as string | undefined) ||
        (currentUser.user_metadata?.name as string | undefined);

      const fallbackFullName =
        fullNameFromMeta ||
        currentUser.email?.split('@')[0] ||
        'Student';

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: fallbackFullName,
          onboarding_completed: false,
        })
        .select('*')
        .single();

      if (createError) {
        // If something else created it in the meantime, re-fetch once.
        const isDuplicate = (createError as any)?.code === '23505';
        if (isDuplicate) {
          const { data: refetched, error: refetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (refetchError) {
            console.error('Error reloading user profile after duplicate:', refetchError);
            return null;
          }

          return refetched;
        }

        console.error('Error creating user profile:', createError);
        return null;
      }

      return created;
    })();

    profileLoadRef.current = { userId: currentUser.id, promise };
    return promise;
  };

  const resetInactivityTimer = () => {
    if (warningTimer) clearTimeout(warningTimer);
    if (inactivityTimer) clearTimeout(inactivityTimer);
    setShowWarning(false);

    if (session) {
      const warning = setTimeout(() => {
        setShowWarning(true);
        toast({
          title: "Inactivity Warning",
          description: "You'll be logged out in 2 minutes due to inactivity.",
          duration: 120000,
        });
      }, WARNING_TIMEOUT);

      const timeout = setTimeout(async () => {
        await signOut();
        toast({
          title: "Logged Out",
          description: "You've been logged out due to inactivity.",
        });
      }, INACTIVITY_TIMEOUT);

      setWarningTimer(warning);
      setInactivityTimer(timeout);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authTimeoutId: NodeJS.Timeout | null = null;
    console.time('[Auth] useEffect init');

    // Safety timeout to prevent infinite loading
    authTimeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Auth timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // FIRST check for existing session (synchronous-first approach)
    const initializeAuth = async () => {
      if (initCompleteRef.current) return;
      
      try {
        console.time('[Auth] getSession');
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.timeEnd('[Auth] getSession');

        if (!mounted) return;

        const existingUser = existingSession?.user ?? null;
        console.log('[Auth] existingUser:', existingUser?.id ?? 'none');
        
        // Clear stale profile promise if user changed
        if (profileLoadRef.current && profileLoadRef.current.userId !== (existingUser?.id ?? null)) {
          profileLoadRef.current = null;
        }

        setSession(existingSession);
        setUser(existingUser);

        if (existingUser) {
          try {
            const profile = await loadUserProfile(existingUser);
            if (mounted) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('[Auth] Error loading profile:', error);
          }
        }
        
        // Always set loading false after init completes
        if (mounted) {
          setLoading(false);
          initCompleteRef.current = true;
        }
      } catch (error) {
        console.error('[Auth] Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
          initCompleteRef.current = true;
        }
      }
    };

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange event:', event);

        // Skip initial session event if we already initialized
        if (event === 'INITIAL_SESSION' && initCompleteRef.current) {
          console.log('[Auth] Skipping duplicate INITIAL_SESSION');
          return;
        }

        const newUser = newSession?.user ?? null;
        
        // Clear in-flight profile promise when user changes
        if (profileLoadRef.current && profileLoadRef.current.userId !== (newUser?.id ?? null)) {
          profileLoadRef.current = null;
        }

        setSession(newSession);
        setUser(newUser);

        if (newUser) {
          try {
            const profile = await loadUserProfile(newUser);
            if (mounted) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('[Auth] Error loading profile in auth change:', error);
          }
        } else {
          setUserProfile(null);
        }
        
        // Ensure loading is false after any auth state change
        if (mounted) {
          setLoading(false);
        }
      }
    );

    initializeAuth();
    
    return () => {
      mounted = false;
      if (authTimeoutId) clearTimeout(authTimeoutId);
      subscription.unsubscribe();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
    };
  }, []);

  // Set up inactivity detection
  useEffect(() => {
    if (!session) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [session]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      setUserProfile(null);

      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);

      toast({
        title: "Logged Out",
        description: "You've been logged out successfully.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await loadUserProfile(user);
      setUserProfile(profile);
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    session,
    userProfile,
    loading,
    isAuthenticated: !!session,
    signOut,
    refreshProfile,
  }), [user, session, userProfile, loading, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; 
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
