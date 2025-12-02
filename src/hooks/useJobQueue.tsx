import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QueueJobOptions {
  job_type: string;
  payload?: Record<string, any>;
  scheduled_at?: Date;
}

/**
 * Hook for queueing background jobs
 */
export function useJobQueue() {
  const [isQueueing, setIsQueueing] = useState(false);

  const queueJob = useCallback(async (options: QueueJobOptions) => {
    setIsQueueing(true);
    
    try {
      const { data, error } = await supabase
        .from('background_jobs' as any)
        .insert({
          job_type: options.job_type,
          payload: options.payload || {},
          scheduled_at: options.scheduled_at?.toISOString() || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to queue job:', error);
      toast({
        title: 'Error',
        description: 'Failed to queue background job',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsQueueing(false);
    }
  }, []);

  const queueEmailJob = useCallback(async (
    recipient: string,
    subject: string,
    bodyHtml: string
  ) => {
    return queueJob({
      job_type: 'send_email',
      payload: { recipient, subject, bodyHtml }
    });
  }, [queueJob]);

  const queueReportGeneration = useCallback(async (
    userId: string,
    reportType: string,
    parameters: Record<string, any>
  ) => {
    return queueJob({
      job_type: 'generate_report',
      payload: { userId, reportType, parameters }
    });
  }, [queueJob]);

  const queueCertificateGeneration = useCallback(async (
    userId: string,
    subjectName: string
  ) => {
    // Add to certificate queue
    const { data, error } = await supabase
      .from('certificate_queue' as any)
      .insert({
        user_id: userId,
        subject_name: subjectName,
        status: 'pending',
        queued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
  }, []);

  return {
    queueJob,
    queueEmailJob,
    queueReportGeneration,
    queueCertificateGeneration,
    isQueueing
  };
}
