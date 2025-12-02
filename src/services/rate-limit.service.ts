import { supabase } from '@/integrations/supabase/client';

export interface RateLimitConfig {
  quiz_generation: { free: number; premium: number };
  ai_question: { free: number; premium: number };
  resource_upload: { free: number; premium: number };
  forum_post: { free: number; premium: number };
}

const RATE_LIMITS: RateLimitConfig = {
  quiz_generation: { free: 3, premium: -1 }, // -1 = unlimited
  ai_question: { free: 3, premium: -1 },
  resource_upload: { free: 10, premium: 25 },
  forum_post: { free: 20, premium: 50 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime?: Date;
  message?: string;
}

export async function checkRateLimit(
  userId: string,
  actionType: keyof RateLimitConfig
): Promise<RateLimitResult> {
  try {
    // Get user account type
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('account_type')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const isPremium = userData.account_type === 'premium';
    const limit = RATE_LIMITS[actionType][isPremium ? 'premium' : 'free'];

    // Unlimited for premium users on certain actions
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        message: 'Unlimited (Premium)',
      };
    }

    // Get current usage
    const resetTime = getResetTime();
    const { data: usageData, error: usageError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('reset_time', new Date().toISOString())
      .maybeSingle();

    if (usageError && usageError.code !== 'PGRST116') throw usageError;

    let currentCount = 0;

    if (!usageData) {
      // Create new rate limit record
      await supabase.from('rate_limits').insert({
        user_id: userId,
        action_type: actionType,
        count: 0,
        reset_time: resetTime.toISOString(),
      });
    } else if (new Date(usageData.reset_time) < new Date()) {
      // Reset expired limit
      await supabase
        .from('rate_limits')
        .update({
          count: 0,
          reset_time: resetTime.toISOString(),
        })
        .eq('id', usageData.id);
    } else {
      currentCount = usageData.count;
    }

    const remaining = Math.max(0, limit - currentCount);

    if (currentCount >= limit) {
      // Log violation
      await logRateLimitViolation(userId, actionType, limit);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        message: `Daily limit reached (${limit}/${limit})`,
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow on error
    return {
      allowed: true,
      remaining: 0,
      message: 'Rate limit check failed',
    };
  }
}

export async function incrementRateLimit(
  userId: string,
  actionType: keyof RateLimitConfig
): Promise<void> {
  try {
    const { data: usageData } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('reset_time', new Date().toISOString())
      .single();

    if (usageData) {
      await supabase
        .from('rate_limits')
        .update({ count: usageData.count + 1 })
        .eq('id', usageData.id);
    }
  } catch (error) {
    console.error('Failed to increment rate limit:', error);
  }
}

export async function getRateLimitStatus(
  userId: string
): Promise<Record<keyof RateLimitConfig, RateLimitResult>> {
  const status = {} as Record<keyof RateLimitConfig, RateLimitResult>;

  for (const actionType of Object.keys(RATE_LIMITS) as Array<keyof RateLimitConfig>) {
    status[actionType] = await checkRateLimit(userId, actionType);
  }

  return status;
}

async function logRateLimitViolation(
  userId: string,
  actionType: string,
  limit: number
): Promise<void> {
  try {
    await supabase.from('rate_limit_log').insert({
      user_id: userId,
      action_type: actionType,
      limit_hit: limit,
    });
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

function getResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function formatResetTime(resetTime: Date): string {
  const now = new Date();
  const diff = resetTime.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
