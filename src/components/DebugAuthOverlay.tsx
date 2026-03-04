import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';

export function DebugAuthOverlay() {
  const { user, session, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading, hasChecked } = useAdminRole();

  if (import.meta.env.VITE_DEBUG_AUTH !== 'true') return null;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, background: 'rgba(0,0,0,0.75)', color: '#fff', padding: 12, borderRadius: 8, fontSize: 12, maxWidth: 420, maxHeight: 360, overflow: 'auto' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>DebugAuthOverlay</div>
      <div><strong>loading:</strong> {String(loading)}</div>
      <div><strong>user:</strong> {user ? user.id : 'null'}</div>
      <div style={{ wordBreak: 'break-word' }}><strong>session:</strong> {session ? JSON.stringify({ access_token: session.access_token?.slice(0,8)+'…', expires_at: session.expires_at }) : 'null'}</div>
      <div style={{ wordBreak: 'break-word' }}><strong>userProfile:</strong> {userProfile ? JSON.stringify(userProfile) : 'null'}</div>
      <div><strong>roleLoading:</strong> {String(roleLoading)}</div>
      <div><strong>isAdmin:</strong> {String(isAdmin)}</div>
      <div><strong>isEducator:</strong> {String(isEducator)}</div>
      <div><strong>hasChecked:</strong> {String(hasChecked)}</div>
    </div>
  );
}

export default DebugAuthOverlay;
