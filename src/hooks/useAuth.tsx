import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Tables<'users'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading user profile:', error);
      return null;
    }

    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await loadUserProfile(user.id);
      setUserProfile(profile);
    }
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

    // Set up auth state listener FIRST, and avoid blocking UI while profile loads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);

        // Do not block rendering while we fetch the profile - fetch in background
        setLoading(false);

        if (currentUser) {
          loadUserProfile(currentUser.id).then(profile => {
            if (mounted) setUserProfile(profile);
          }).catch(err => console.error('Error loading profile:', err));
        } else {
          setUserProfile(null);
        }
      }
    );

    // THEN check for existing session - don't wait for profile to finish before clearing loading
    const initializeAuth = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      setSession(existingSession);
      const currentUser = existingSession?.user ?? null;
      setUser(currentUser);

      // Allow app to render even if we haven't loaded profile yet
      setLoading(false);

      if (currentUser) {
        loadUserProfile(currentUser.id).then(profile => {
          if (mounted) setUserProfile(profile);
        }).catch(err => console.error('Error loading profile:', err));
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
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
