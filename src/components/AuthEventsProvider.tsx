import { ReactNode } from 'react';
import { useAuthEvents } from '@/hooks/useAuthEvents';

/**
 * Provider component that initializes auth event tracking
 * Place inside AuthProvider to enable Phase 9 auth integrations
 */
export function AuthEventsProvider({ children }: { children: ReactNode }) {
  useAuthEvents();
  return <>{children}</>;
}