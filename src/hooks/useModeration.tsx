import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  ai_confidence: number | null;
  issues_detected: string[] | null;
  moderation_decision: string;
  reviewed: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  // Joined data
  content_preview?: string;
  author_name?: string;
  author_grade?: number;
  author_reputation?: number;
  author_violations?: number;
  report_count?: number;
}

export interface CommunityReport {
  id: string;
  reporter_id: string;
  reported_content_type: string;
  reported_content_id: string;
  report_reason: string;
  report_description: string | null;
  status: string | null;
  action_taken: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string | null;
  // Joined data
  reporter_name?: string;
  content_preview?: string;
}

export interface ModerationStats {
  pendingForumPosts: number;
  pendingChatMessages: number;
  pendingResources: number;
  pendingReports: number;
  reviewedToday: number;
  avgReviewTime: number;
}

export const useModeration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ModerationStats>({
    pendingForumPosts: 0,
    pendingChatMessages: 0,
    pendingResources: 0,
    pendingReports: 0,
    reviewedToday: 0,
    avgReviewTime: 0,
  });
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch pending counts
      const [forumPosts, chatMessages, resources, reportsData, reviewedToday] = await Promise.all([
        supabase.from('content_moderation_log').select('id', { count: 'exact', head: true })
          .eq('content_type', 'forum_post').eq('reviewed', false),
        supabase.from('content_moderation_log').select('id', { count: 'exact', head: true })
          .eq('content_type', 'chat_message').eq('reviewed', false),
        supabase.from('content_moderation_log').select('id', { count: 'exact', head: true })
          .eq('content_type', 'resource').eq('reviewed', false),
        supabase.from('community_reports').select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('content_moderation_log').select('id', { count: 'exact', head: true })
          .eq('reviewed', true)
          .gte('reviewed_at', new Date().toISOString().split('T')[0]),
      ]);

      setStats({
        pendingForumPosts: forumPosts.count || 0,
        pendingChatMessages: chatMessages.count || 0,
        pendingResources: resources.count || 0,
        pendingReports: reportsData.count || 0,
        reviewedToday: reviewedToday.count || 0,
        avgReviewTime: 0, // Would need time tracking
      });
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
    }
  }, []);

  const fetchQueue = useCallback(async (filters?: {
    contentType?: string;
    severity?: string;
    status?: string;
  }) => {
    try {
      setLoading(true);
      let query = supabase
        .from('content_moderation_log')
        .select('*')
        .order('ai_confidence', { ascending: true }) // Low confidence first
        .order('created_at', { ascending: true }); // Oldest first

      if (filters?.contentType && filters.contentType !== 'all') {
        query = query.eq('content_type', filters.contentType);
      }
      if (filters?.status === 'pending') {
        query = query.eq('reviewed', false);
      } else if (filters?.status === 'approved') {
        query = query.eq('moderation_decision', 'approved').eq('reviewed', true);
      } else if (filters?.status === 'removed') {
        query = query.eq('moderation_decision', 'removed').eq('reviewed', true);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Enrich with user data
      const enrichedItems = await Promise.all((data || []).map(async (item) => {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, grade_level')
          .eq('id', item.user_id)
          .single();

        const { data: repData } = await supabase
          .from('user_reputation')
          .select('reputation_score')
          .eq('user_id', item.user_id)
          .single();

        const { count: violationCount } = await supabase
          .from('user_warnings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', item.user_id);

        return {
          ...item,
          author_name: userData?.full_name || 'Unknown User',
          author_grade: userData?.grade_level,
          author_reputation: repData?.reputation_score || 0,
          author_violations: violationCount || 0,
        };
      }));

      setQueue(enrichedItems);
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load moderation queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with reporter names
      const enrichedReports = await Promise.all((data || []).map(async (report) => {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', report.reporter_id)
          .single();

        return {
          ...report,
          reporter_name: userData?.full_name || 'Unknown User',
        };
      }));

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, []);

  const approveContent = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('content_moderation_log')
        .update({
          reviewed: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          moderation_decision: 'approved',
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        user_id: user?.id,
        action_type: 'content_approved',
        action_description: 'Approved flagged content',
        target_type: 'moderation_log',
        target_id: itemId,
        severity: 'info',
      });

      toast({ title: 'Content Approved', description: 'The content has been approved' });
      await fetchQueue();
      await fetchStats();
    } catch (error) {
      console.error('Error approving content:', error);
      toast({ title: 'Error', description: 'Failed to approve content', variant: 'destructive' });
    }
  };

  const removeContent = async (item: ModerationItem, reason: string) => {
    try {
      // Update moderation log
      const { error: logError } = await supabase
        .from('content_moderation_log')
        .update({
          reviewed: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          moderation_decision: 'removed',
        })
        .eq('id', item.id);

      if (logError) throw logError;

      // Update the actual content based on type
      if (item.content_type === 'forum_post') {
        await supabase.from('forum_posts')
          .update({ moderation_status: 'removed' })
          .eq('id', item.content_id);
      } else if (item.content_type === 'chat_message') {
        await supabase.from('group_chat_messages')
          .update({ moderation_status: 'removed' })
          .eq('id', item.content_id);
      }

      // Issue warning to user
      await supabase.from('user_warnings').insert({
        user_id: item.user_id,
        warning_reason: reason,
        content_type: item.content_type,
        content_id: item.content_id,
        warned_by: user?.id,
      });

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        user_id: user?.id,
        action_type: 'content_removed',
        action_description: `Removed content: ${reason}`,
        target_type: item.content_type,
        target_id: item.content_id,
        severity: 'warning',
      });

      toast({ title: 'Content Removed', description: 'Content removed and user warned' });
      await fetchQueue();
      await fetchStats();
    } catch (error) {
      console.error('Error removing content:', error);
      toast({ title: 'Error', description: 'Failed to remove content', variant: 'destructive' });
    }
  };

  const warnUser = async (userId: string, reason: string, contentType: string, contentId: string) => {
    try {
      await supabase.from('user_warnings').insert({
        user_id: userId,
        warning_reason: reason,
        content_type: contentType,
        content_id: contentId,
        warned_by: user?.id,
      });

      await supabase.from('admin_audit_log').insert({
        user_id: user?.id,
        action_type: 'user_warned',
        action_description: `Warned user: ${reason}`,
        target_type: 'user',
        target_id: userId,
        severity: 'warning',
      });

      toast({ title: 'Warning Issued', description: 'User has been warned' });
    } catch (error) {
      console.error('Error warning user:', error);
      toast({ title: 'Error', description: 'Failed to warn user', variant: 'destructive' });
    }
  };

  const resolveReport = async (reportId: string, action: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: 'resolved',
          action_taken: action,
          review_notes: notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        user_id: user?.id,
        action_type: 'report_resolved',
        action_description: `Resolved report: ${action}`,
        target_type: 'community_report',
        target_id: reportId,
        severity: 'info',
      });

      toast({ title: 'Report Resolved', description: 'The report has been resolved' });
      await fetchReports();
      await fetchStats();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast({ title: 'Error', description: 'Failed to resolve report', variant: 'destructive' });
    }
  };

  const bulkApprove = async (itemIds: string[]) => {
    try {
      const { error } = await supabase
        .from('content_moderation_log')
        .update({
          reviewed: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          moderation_decision: 'approved',
        })
        .in('id', itemIds);

      if (error) throw error;

      toast({ title: 'Bulk Approval Complete', description: `${itemIds.length} items approved` });
      await fetchQueue();
      await fetchStats();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast({ title: 'Error', description: 'Failed to bulk approve', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchStats();
    fetchQueue({ status: 'pending' });
    fetchReports();
  }, [fetchStats, fetchQueue, fetchReports]);

  return {
    loading,
    stats,
    queue,
    reports,
    fetchQueue,
    fetchReports,
    fetchStats,
    approveContent,
    removeContent,
    warnUser,
    resolveReport,
    bulkApprove,
  };
};
