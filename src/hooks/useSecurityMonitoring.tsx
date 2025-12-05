/**
 * Security Monitoring Hook
 * Provides security-related functionality for components
 */

import { useState, useEffect, useCallback } from 'react';
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

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [dataRequestsStatus, setDataRequestsStatus] = useState<DataRequestsStatus>({
    exportRequests: [],
    deletionRequests: [],
  });
  const [isLoading, setIsLoading] = useState(false);

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
    details?: Record<string, any>,
    severity?: 'info' | 'warning' | 'critical'
  ) => {
    await logSecurityEvent({
      user_id: user?.id,
      event_type: eventType,
      event_details: details,
      severity,
    });
  }, [user?.id]);

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
    
    // Auth security helpers
    checkAccountLockout,
    trackFailedLogin,
    clearFailedAttempts,
  };
};
