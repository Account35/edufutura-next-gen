/**
 * Security Service - Handles security monitoring, logging, and POPIA compliance
 */

import { supabase } from '@/integrations/supabase/client';

export type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'password_reset_request'
  | 'password_change'
  | 'email_change'
  | 'phone_change'
  | 'account_lockout'
  | 'suspicious_activity'
  | 'admin_action'
  | 'data_export_request'
  | 'data_deletion_request'
  | 'permission_denied'
  | 'rate_limit_exceeded';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

interface SecurityLogEntry {
  event_type: SecurityEventType;
  event_details?: Record<string, any>;
  severity?: SecuritySeverity;
  user_id?: string;
}

/**
 * Log a security event
 */
export const logSecurityEvent = async (entry: SecurityLogEntry): Promise<void> => {
  try {
    const { error } = await supabase
      .from('security_log')
      .insert({
        user_id: entry.user_id,
        event_type: entry.event_type,
        event_details: entry.event_details || {},
        severity: entry.severity || 'info',
        ip_address: null, // Would need server-side to get real IP
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
};

/**
 * Track failed login attempt
 */
export const trackFailedLogin = async (
  email: string,
  failureReason: string
): Promise<{ isLocked: boolean; remainingAttempts: number }> => {
  try {
    // Insert failed attempt
    await supabase.from('failed_login_attempts').insert({
      email,
      failure_reason: failureReason,
      user_agent: navigator.userAgent,
    });

    // Check recent failures (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('failed_login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('attempted_at', oneHourAgo);

    const failureCount = count || 0;
    const maxAttempts = 5;

    // Lock account if exceeded
    if (failureCount >= maxAttempts) {
      const unlockAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lockout
      
      await supabase.from('account_lockouts').upsert({
        email,
        locked_at: new Date().toISOString(),
        unlock_at: unlockAt.toISOString(),
        failure_count: failureCount,
      }, { onConflict: 'email' });

      await logSecurityEvent({
        event_type: 'account_lockout',
        event_details: { email, failure_count: failureCount },
        severity: 'warning',
      });

      return { isLocked: true, remainingAttempts: 0 };
    }

    return { isLocked: false, remainingAttempts: maxAttempts - failureCount };
  } catch (err) {
    console.error('Failed login tracking error:', err);
    return { isLocked: false, remainingAttempts: 5 };
  }
};

/**
 * Check if account is locked
 */
export const checkAccountLockout = async (email: string): Promise<{
  isLocked: boolean;
  unlockAt?: Date;
}> => {
  try {
    const { data } = await supabase
      .from('account_lockouts')
      .select('unlock_at')
      .eq('email', email)
      .single();

    if (data) {
      const unlockTime = new Date(data.unlock_at);
      if (unlockTime > new Date()) {
        return { isLocked: true, unlockAt: unlockTime };
      }
      // Lockout expired, remove it
      await supabase.from('account_lockouts').delete().eq('email', email);
    }

    return { isLocked: false };
  } catch {
    return { isLocked: false };
  }
};

/**
 * Clear failed login attempts after successful login
 */
export const clearFailedAttempts = async (email: string): Promise<void> => {
  try {
    await supabase.from('failed_login_attempts').delete().eq('email', email);
    await supabase.from('account_lockouts').delete().eq('email', email);
  } catch (err) {
    console.error('Failed to clear login attempts:', err);
  }
};

/**
 * Request data export (POPIA compliance)
 */
export const requestDataExport = async (userId: string): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> => {
  try {
    // Check for pending requests
    const { data: existing } = await supabase
      .from('data_export_requests')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .single();

    if (existing) {
      return { 
        success: false, 
        error: 'You already have a pending export request. Please wait for it to complete.' 
      };
    }

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    await logSecurityEvent({
      user_id: userId,
      event_type: 'data_export_request',
      event_details: { request_id: data.id },
      severity: 'info',
    });

    return { success: true, requestId: data.id };
  } catch (err) {
    console.error('Data export request error:', err);
    return { success: false, error: 'Failed to create export request' };
  }
};

/**
 * Request data deletion (POPIA right to be forgotten)
 */
export const requestDataDeletion = async (
  userId: string,
  reason?: string
): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> => {
  try {
    // Check for pending requests
    const { data: existing } = await supabase
      .from('data_deletion_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return { 
        success: false, 
        error: 'You already have a pending deletion request.' 
      };
    }

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        status: 'pending',
        reason: reason || 'User requested account deletion',
      })
      .select('id')
      .single();

    if (error) throw error;

    await logSecurityEvent({
      user_id: userId,
      event_type: 'data_deletion_request',
      event_details: { request_id: data.id, reason },
      severity: 'info',
    });

    return { success: true, requestId: data.id };
  } catch (err) {
    console.error('Data deletion request error:', err);
    return { success: false, error: 'Failed to create deletion request' };
  }
};

/**
 * Get user's data requests status
 */
export const getDataRequestsStatus = async (userId: string): Promise<{
  exportRequests: Array<{ id: string; status: string; requested_at: string }>;
  deletionRequests: Array<{ id: string; status: string; requested_at: string }>;
}> => {
  try {
    const [exportRes, deletionRes] = await Promise.all([
      supabase
        .from('data_export_requests')
        .select('id, status, requested_at')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(5),
      supabase
        .from('data_deletion_requests')
        .select('id, status, requested_at')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(5),
    ]);

    return {
      exportRequests: exportRes.data || [],
      deletionRequests: deletionRes.data || [],
    };
  } catch {
    return { exportRequests: [], deletionRequests: [] };
  }
};

/**
 * Detect suspicious activity patterns
 */
export const detectSuspiciousActivity = async (
  userId: string,
  activityType: string,
  threshold: number,
  windowMinutes: number
): Promise<boolean> => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from('api_call_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('endpoint', `%${activityType}%`)
      .gte('timestamp', windowStart);

    if ((count || 0) >= threshold) {
      await logSecurityEvent({
        user_id: userId,
        event_type: 'suspicious_activity',
        event_details: { 
          activity_type: activityType, 
          count, 
          threshold, 
          window_minutes: windowMinutes 
        },
        severity: 'warning',
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Log admin action for audit trail
 */
export const logAdminAction = async (
  adminId: string,
  action: string,
  targetResource: string,
  details?: Record<string, any>
): Promise<void> => {
  await logSecurityEvent({
    user_id: adminId,
    event_type: 'admin_action',
    event_details: {
      action,
      target_resource: targetResource,
      ...details,
    },
    severity: 'info',
  });
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize email
 */
export const validateEmail = (email: string): { valid: boolean; sanitized: string } => {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: emailRegex.test(sanitized) && sanitized.length <= 255,
    sanitized,
  };
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
