/**
 * Security Monitoring Hook
 * Provides security-related functionality for components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  checkAccountLockout,
  trackFailedLogin,
  clearFailedAttempts,
  requestDataExport,
  requestDataDeletion,
  getDataRequestsStatus,
  logSecurityEvent,
  detectSuspiciousActivity,
} from '@/services/security.service';

interface DataRequestsStatus {
  exportRequests: Array<{ id: string; status: string; requested_at: string }>;
  deletionRequests: Array<{ id: string; status: string; requested_at: string }>;
}

const SESSION_FINGERPRINT_KEY = 'edufutura_session_fingerprint';
const SUSPICIOUS_ACTIVITY_THRESHOLD = 50;

// Client-side rate limiting store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Generate browser fingerprint for session validation
function generateBrowserFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return btoa(components.join('|'));
}

// Client-side rate limit checker
function checkClientRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now };
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [dataRequestsStatus, setDataRequestsStatus] = useState<DataRequestsStatus>({
    exportRequests: [],
    deletionRequests: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCountRef = useRef<number>(0);

  // Monitor for session anomalies on mount
  useEffect(() => {
    if (!user) return;
    
    const currentFingerprint = generateBrowserFingerprint();
    const storedFingerprint = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);
    
    if (!storedFingerprint) {
      sessionStorage.setItem(SESSION_FINGERPRINT_KEY, currentFingerprint);
    } else if (storedFingerprint !== currentFingerprint) {
      logSecurityEvent({
        user_id: user.id,
        event_type: 'suspicious_activity',
        event_details: {
          reason: 'browser_fingerprint_changed',
        },
        severity: 'warning',
      });
      sessionStorage.setItem(SESSION_FINGERPRINT_KEY, currentFingerprint);
    }
  }, [user]);

  // Fetch data requests status
  const refreshDataRequestsStatus = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const status = await getDataRequestsStatus(user.id);
      setDataRequestsStatus(status);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load status on mount
  useEffect(() => {
    refreshDataRequestsStatus();
  }, [refreshDataRequestsStatus]);

  // Request data export (POPIA)
  const handleDataExportRequest = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    
    setIsLoading(true);
    try {
      const result = await requestDataExport(user.id);
      if (result.success) {
        await refreshDataRequestsStatus();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, refreshDataRequestsStatus]);

  // Request data deletion (POPIA)
  const handleDataDeletionRequest = useCallback(async (reason?: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    
    setIsLoading(true);
    try {
      const result = await requestDataDeletion(user.id, reason);
      if (result.success) {
        await refreshDataRequestsStatus();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, refreshDataRequestsStatus]);

  // Check for suspicious activity
  const checkSuspiciousActivity = useCallback(async (
    activityType: string,
    threshold: number,
    windowMinutes: number
  ) => {
    if (!user?.id) return false;
    return detectSuspiciousActivity(user.id, activityType, threshold, windowMinutes);
  }, [user?.id]);

  // Log security event
  const logEvent = useCallback(async (
    eventType: Parameters<typeof logSecurityEvent>[0]['event_type'],
    details?: Record<string, unknown>,
    severity?: 'info' | 'warning' | 'critical'
  ) => {
    await logSecurityEvent({
      user_id: user?.id,
      event_type: eventType,
      event_details: details,
      severity,
    });
  }, [user?.id]);

  // Track API calls for abuse detection
  const trackApiCall = useCallback((endpoint: string) => {
    if (!user) return;
    
    const now = Date.now();
    const timeDiff = now - lastActivityRef.current;
    
    if (timeDiff < 100) {
      activityCountRef.current++;
      
      if (activityCountRef.current >= SUSPICIOUS_ACTIVITY_THRESHOLD) {
        logSecurityEvent({
          user_id: user.id,
          event_type: 'suspicious_activity',
          event_details: {
            reason: 'rapid_api_calls',
            endpoint,
            calls_in_period: activityCountRef.current,
          },
          severity: 'warning',
        });
        activityCountRef.current = 0;
      }
    } else {
      activityCountRef.current = 0;
    }
    
    lastActivityRef.current = now;
  }, [user]);

  // Rate limit checker
  const checkRateLimit = useCallback((action: string, limit: number = 10, windowMs: number = 60000) => {
    const result = checkClientRateLimit(`${user?.id || 'anon'}_${action}`, limit, windowMs);
    
    if (!result.allowed && user) {
      logSecurityEvent({
        user_id: user.id,
        event_type: 'rate_limit_exceeded',
        event_details: { action, limit, windowMs },
        severity: 'warning',
      });
    }
    
    return result;
  }, [user]);

  // Detect XSS attempts in input
  const detectXSSAttempt = useCallback((input: string, fieldName: string) => {
    const xssPatterns = [
      /<script\b/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<embed/i,
      /<object/i,
      /data:text\/html/i,
    ];
    
    const isXSSAttempt = xssPatterns.some(pattern => pattern.test(input));
    
    if (isXSSAttempt && user) {
      logSecurityEvent({
        user_id: user.id,
        event_type: 'suspicious_activity',
        event_details: {
          reason: 'potential_xss_attempt',
          field: fieldName,
          input_preview: input.substring(0, 100),
        },
        severity: 'warning',
      });
    }
    
    return isXSSAttempt;
  }, [user]);

  // Detect SQL injection attempts
  const detectSQLInjection = useCallback((input: string, fieldName: string) => {
    const sqlPatterns = [
      /'\s*(or|and)\s*'?\s*\d*\s*=\s*\d*/i,
      /;\s*(drop|delete|update|insert|alter)\s/i,
      /union\s+(all\s+)?select/i,
      /--\s*$/,
    ];
    
    const isSQLInjection = sqlPatterns.some(pattern => pattern.test(input));
    
    if (isSQLInjection && user) {
      logSecurityEvent({
        user_id: user.id,
        event_type: 'suspicious_activity',
        event_details: {
          reason: 'potential_sql_injection',
          field: fieldName,
          input_preview: input.substring(0, 100),
        },
        severity: 'critical',
      });
    }
    
    return isSQLInjection;
  }, [user]);

  return {
    // Data requests
    dataRequestsStatus,
    isLoading,
    refreshDataRequestsStatus,
    handleDataExportRequest,
    handleDataDeletionRequest,
    
    // Security utilities
    checkSuspiciousActivity,
    logEvent,
    trackApiCall,
    checkRateLimit,
    detectXSSAttempt,
    detectSQLInjection,
    
    // Auth security helpers
    checkAccountLockout,
    trackFailedLogin,
    clearFailedAttempts,
  };
};
