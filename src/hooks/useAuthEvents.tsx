import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to handle auth events and trigger Phase 9 backend integrations
 * - Triggers welcome-new-user on signup
 * - Triggers track-login on signin
 */
export function useAuthEvents() {
  const hasTriggeredWelcome = useRef<Set<string>>(new Set());
  const hasTriggeredLogin = useRef<Set<string>>(new Set());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) return;

        const userId = session.user.id;
        const email = session.user.email;
        const fullName = session.user.user_metadata?.full_name || '';

        // Handle new user signup (USER_UPDATED with new user metadata indicates signup completion)
        const isNewUser = event === 'SIGNED_IN' && session.user.created_at && 
          (Date.now() - new Date(session.user.created_at).getTime() < 60000); // Created within last minute
        
        if (isNewUser && !hasTriggeredWelcome.current.has(userId)) {
          hasTriggeredWelcome.current.add(userId);
          
          // Fire welcome flow asynchronously to not block onboarding
          supabase.functions.invoke('welcome-new-user', {
            body: { user_id: userId, email, full_name: fullName }
          }).catch(error => {
            console.error('Error triggering welcome flow:', error);
          });
        }

        // Handle user login
        if (event === 'SIGNED_IN' && !hasTriggeredLogin.current.has(userId)) {
          hasTriggeredLogin.current.add(userId);
          
          // Clear after 5 minutes to allow re-trigger on actual new login
          setTimeout(() => {
            hasTriggeredLogin.current.delete(userId);
          }, 5 * 60 * 1000);
          
          try {
            console.log('[useAuthEvents] Tracking login event');
            const { data } = await supabase.functions.invoke('track-login', {
              body: { user_id: userId }
            });
            
            if (data?.unread_notifications > 0) {
              console.log(`[useAuthEvents] User has ${data.unread_notifications} unread notifications`);
            }
          } catch (error) {
            console.error('Error tracking login:', error);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}