import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  message_content: string;
  message_type: string;
  created_at: string;
  is_edited: boolean;
  user_name?: string;
}

interface TypingUser {
  user_id: string;
  user_name: string;
}

/**
 * Hook for real-time group chat with Supabase Realtime
 * Supports typing indicators, read receipts, and message updates
 */
export function useRealtimeChat(groupId: string | null) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_chat_messages')
        .select(`
          *,
          users:user_id (full_name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formattedMessages: ChatMessage[] = (data || []).map(msg => ({
        ...msg,
        user_name: (msg.users as any)?.full_name || 'Unknown',
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!groupId || !user?.id) return;

    fetchMessages();

    // Create channel for this group
    const channel = supabase
      .channel(`group-${groupId}`)
      // Listen for new messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Fetch user name for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: ChatMessage = {
            ...payload.new as any,
            user_name: userData?.full_name || 'Unknown',
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      // Listen for message updates (edits)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_chat_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, ...payload.new, is_edited: true }
                : msg
            )
          );
        }
      )
      // Presence for typing indicators
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach(presence => {
            if (presence.typing && presence.user_id !== user.id) {
              typing.push({
                user_id: presence.user_id,
                user_name: presence.user_name,
              });
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user.id,
            user_name: userProfile?.full_name || 'User',
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, user?.id, fetchMessages, userProfile?.full_name]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!groupId || !user?.id || !content.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('group_chat_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message_content: content.trim(),
          message_type: 'text',
        });

      if (error) throw error;

      // Update group activity
      await supabase
        .from('group_members')
        .update({ last_active: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [groupId, user?.id]);

  // Set typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence
    await channelRef.current.track({
      user_id: user.id,
      user_name: userProfile?.full_name || 'User',
      typing: isTyping,
      online_at: new Date().toISOString(),
    });

    // Auto-clear typing after 2 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    }
  }, [user?.id, userProfile?.full_name]);

  // Edit a message (within 5 minutes)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user?.id) return;

    const message = messages.find(m => m.id === messageId);
    if (!message || message.user_id !== user.id) return;

    // Check if within 5 minutes
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    if (now - messageTime > 5 * 60 * 1000) {
      throw new Error('Can only edit messages within 5 minutes');
    }

    const { error } = await supabase
      .from('group_chat_messages')
      .update({
        message_content: newContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) throw error;
  }, [user?.id, messages]);

  return {
    messages,
    typingUsers,
    loading,
    sending,
    sendMessage,
    setTyping,
    editMessage,
    refresh: fetchMessages,
  };
}