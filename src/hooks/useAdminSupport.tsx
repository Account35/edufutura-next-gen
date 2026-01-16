import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  ticket_number: number;
  user_id: string;
  assigned_to: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
  category: 'technical' | 'account' | 'payment' | 'content' | 'general';
  subject: string;
  description: string;
  tags: string[];
  first_response_at: string | null;
  resolved_at: string | null;
  satisfaction_rating: number | null;
  satisfaction_feedback: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
    grade_level: number;
    account_type: string;
  };
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_content: string;
  is_internal: boolean;
  attachments: Array<{ name: string; url: string }>;
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
  };
}

export interface CannedResponse {
  id: string;
  created_by: string;
  title: string;
  category: string;
  content: string;
  variables: string[];
  is_shared: boolean;
  use_count: number;
  created_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  created_by: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
}

export function useAdminSupport() {
  const queryClient = useQueryClient();

  // Fetch all tickets with user data
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details separately
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, grade_level, account_type')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      return ticketsData?.map(ticket => ({
        ...ticket,
        user: userMap.get(ticket.user_id),
      })) as SupportTicket[];
    },
  });

  // Fetch ticket stats
  const { data: stats } = useQuery({
    queryKey: ['admin-support-stats'],
    queryFn: async () => {
      const { data: allTickets, error } = await supabase
        .from('support_tickets')
        .select('status, first_response_at, resolved_at, created_at');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const openTickets = allTickets?.filter(t => t.status === 'new' || t.status === 'open') || [];
      const inProgressTickets = allTickets?.filter(t => t.status === 'in_progress') || [];
      const waitingOnUser = allTickets?.filter(t => t.status === 'waiting_on_user') || [];
      const resolvedToday = allTickets?.filter(t => 
        t.status === 'resolved' && t.resolved_at && new Date(t.resolved_at) >= today
      ) || [];

      // Calculate average response time
      const ticketsWithResponse = allTickets?.filter(t => t.first_response_at) || [];
      const avgResponseTime = ticketsWithResponse.length > 0
        ? ticketsWithResponse.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created);
          }, 0) / ticketsWithResponse.length / (1000 * 60)
        : 0;

      // Calculate average resolution time
      const resolvedTickets = allTickets?.filter(t => t.resolved_at) || [];
      const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const resolved = new Date(t.resolved_at!).getTime();
            return acc + (resolved - created);
          }, 0) / resolvedTickets.length / (1000 * 60 * 60)
        : 0;

      return {
        openCount: openTickets.length,
        inProgressCount: inProgressTickets.length,
        waitingOnUserCount: waitingOnUser.length,
        resolvedTodayCount: resolvedToday.length,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      };
    },
  });

  // Fetch single ticket with messages
  const useTicketDetail = (ticketId: string | null) => {
    return useQuery({
      queryKey: ['admin-ticket-detail', ticketId],
      queryFn: async () => {
        if (!ticketId) return null;

        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (ticketError) throw ticketError;

        // Get user data
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email, grade_level, account_type, phone_number')
          .eq('id', ticket.user_id)
          .single();

        const { data: messages, error: messagesError } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        // Get sender info for messages
        const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
        const { data: senders } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', senderIds);

        const senderMap = new Map(senders?.map(s => [s.id, s]) || []);

        const messagesWithSenders = messages?.map(msg => ({
          ...msg,
          attachments: (msg.attachments || []) as Array<{ name: string; url: string }>,
          sender: senderMap.get(msg.sender_id),
        }));

        return { 
          ticket: { ...ticket, user: userData },
          messages: messagesWithSenders,
        };
      },
      enabled: !!ticketId,
    });
  };

  // Fetch canned responses
  const { data: cannedResponses } = useQuery({
    queryKey: ['admin-canned-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data as CannedResponse[];
    },
  });

  // Fetch knowledge base articles
  const { data: kbArticles } = useQuery({
    queryKey: ['admin-kb-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeBaseArticle[];
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: string; updates: Partial<SupportTicket> }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail'] });
      toast.success('Ticket updated');
    },
    onError: (error) => {
      toast.error('Failed to update ticket: ' + error.message);
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, assignTo, reason }: { ticketId: string; assignTo: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current assignee
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .single();

      // Update ticket
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: assignTo, 
          status: 'in_progress',
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // Log assignment
      const { error: historyError } = await supabase
        .from('ticket_assignment_history')
        .insert({
          ticket_id: ticketId,
          assigned_from: ticket?.assigned_to,
          assigned_to: assignTo,
          reason,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail'] });
      toast.success('Ticket assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign ticket: ' + error.message);
    },
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ 
      ticketId, 
      content, 
      isInternal,
      attachments 
    }: { 
      ticketId: string; 
      content: string; 
      isInternal: boolean;
      attachments?: Array<{ name: string; url: string }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if this is first response
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('first_response_at')
        .eq('id', ticketId)
        .single();

      // Insert message
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message_content: content,
          is_internal: isInternal,
          attachments: attachments || [],
        });

      if (msgError) throw msgError;

      // Update ticket
      const updates: Record<string, unknown> = {
        status: isInternal ? undefined : 'waiting_on_user',
        updated_at: new Date().toISOString(),
      };

      if (!ticket?.first_response_at && !isInternal) {
        updates.first_response_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Reply sent');
    },
    onError: (error) => {
      toast.error('Failed to send reply: ' + error.message);
    },
  });

  // Resolve ticket mutation
  const resolveTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-stats'] });
      toast.success('Ticket resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve ticket: ' + error.message);
    },
  });

  // Create canned response mutation
  const createCannedResponseMutation = useMutation({
    mutationFn: async (response: Omit<CannedResponse, 'id' | 'created_at' | 'use_count'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('canned_responses')
        .insert({ ...response, created_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-canned-responses'] });
      toast.success('Template saved');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });

  // Create KB article mutation
  const createKBArticleMutation = useMutation({
    mutationFn: async (article: Omit<KnowledgeBaseArticle, 'id' | 'created_at' | 'view_count' | 'helpful_count'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('knowledge_base_articles')
        .insert({ ...article, created_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kb-articles'] });
      toast.success('Article created');
    },
    onError: (error) => {
      toast.error('Failed to create article: ' + error.message);
    },
  });

  return {
    tickets,
    ticketsLoading,
    stats,
    useTicketDetail,
    cannedResponses,
    kbArticles,
    updateTicket: updateTicketMutation.mutate,
    assignTicket: assignTicketMutation.mutate,
    sendReply: sendReplyMutation.mutate,
    resolveTicket: resolveTicketMutation.mutate,
    createCannedResponse: createCannedResponseMutation.mutate,
    createKBArticle: createKBArticleMutation.mutate,
    isUpdating: updateTicketMutation.isPending,
    isSendingReply: sendReplyMutation.isPending,
  };
}