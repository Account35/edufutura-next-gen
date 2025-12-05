import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type User = Tables<'users'>;
type ForumPost = Tables<'forum_posts'>;
type QuizAttempt = Tables<'quiz_attempts'>;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

export async function getUserProfile(userId: string): Promise<User | null> {
  const cacheKey = `user_${userId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    cache.set(`user_${userId}`, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function createForumPost(
  forumId: string,
  userId: string,
  title: string,
  content: string,
  tags: string[] = []
): Promise<ForumPost> {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        forum_id: forumId,
        user_id: userId,
        post_title: title,
        post_content: content,
        tags,
        moderation_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate forum cache
    cache.delete(`forum_${forumId}_posts`);

    return data;
  } catch (error) {
    console.error('Error creating forum post:', error);
    throw error;
  }
}

export async function submitQuizAttempt(
  quizId: string,
  userId: string,
  answers: Record<string, any>,
  attemptNumber: number
): Promise<QuizAttempt> {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        answers,
        attempt_number: attemptNumber,
        started_at: new Date().toISOString(),
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw error;
  }
}

export function subscribeToGroupChat(
  groupId: string,
  onMessage: (message: any) => void
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`group_${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_chat_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  // Auto-reconnect logic
  let reconnectAttempts = 0;
  const maxReconnectDelay = 60000;

  const handleStateChange = (state: string) => {
    if (state === 'CHANNEL_ERROR') {
      const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
      reconnectAttempts++;
      
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      
      setTimeout(() => {
        channel.subscribe();
      }, delay);
    } else if (state === 'SUBSCRIBED') {
      reconnectAttempts = 0;
    }
  };

  channel.on('system', { event: '*' }, (payload) => {
    handleStateChange(payload.status);
  });

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

export function clearCache() {
  cache.clear();
}
