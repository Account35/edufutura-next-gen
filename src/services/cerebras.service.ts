import { supabase } from '@/integrations/supabase/client';
import { ExternalServiceError } from '@/lib/errors';
import { getCachedResponse, cacheResponse } from './ai-cache.service';

export interface QuickResponseOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface StreamResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

export interface ResponseMetrics {
  response_time_ms: number;
  tokens_used: number;
  model_version: string;
  success: boolean;
  fallback_used: boolean;
}

export async function quickResponse(
  prompt: string,
  maxTokens = 100,
  templateName?: string
): Promise<{ response: string; metrics: ResponseMetrics }> {
  const startTime = Date.now();
  
  // Check cache first for non-moderation queries
  if (templateName && !templateName.includes('moderat')) {
    const cacheResult = await getCachedResponse(prompt, { templateName });
    if (cacheResult.hit && cacheResult.data) {
      console.log(`Cache hit for Cerebras query (${cacheResult.latencyMs}ms)`);
      return {
        response: cacheResult.data,
        metrics: {
          response_time_ms: cacheResult.latencyMs,
          tokens_used: 0,
          model_version: 'cached',
          success: true,
          fallback_used: false,
        },
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase.functions.invoke('ai-cerebras', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) throw error;

    const responseTime = Date.now() - startTime;
    const metrics: ResponseMetrics = {
      response_time_ms: responseTime,
      tokens_used: data.tokens_used || 0,
      model_version: 'llama3.1-70b',
      success: true,
      fallback_used: false,
    };

    // Cache the response
    if (templateName && !templateName.includes('moderat')) {
      await cacheResponse(prompt, data.response, 'llama3.1-70b', { templateName }, responseTime);
    }

    // Log metrics
    logApiUsage(metrics);

    return {
      response: data.response,
      metrics,
    };
  } catch (error) {
    console.warn('Cerebras timeout, falling back to GPT-4');
    
    // Fallback to GPT-4
    try {
      const { data, error: gptError } = await supabase.functions.invoke('ai-gpt4', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        },
      });

      if (gptError) throw gptError;

      const metrics: ResponseMetrics = {
        response_time_ms: Date.now() - startTime,
        tokens_used: data.tokens_used || 0,
        model_version: 'gpt-4',
        success: true,
        fallback_used: true,
      };

      logApiUsage(metrics);

      return {
        response: data.response,
        metrics,
      };
    } catch (fallbackError) {
      const metrics: ResponseMetrics = {
        response_time_ms: Date.now() - startTime,
        tokens_used: 0,
        model_version: 'none',
        success: false,
        fallback_used: true,
      };

      logApiUsage(metrics);

      throw new Error('Both Cerebras and GPT-4 unavailable');
    }
  }
}

export async function* streamResponse(
  prompt: string,
  onChunk?: (chunk: string) => void
): AsyncGenerator<StreamResponse> {
  const startTime = Date.now();
  let partialResponse = '';
  let tokens = 0;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cerebras-stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      throw new Error('Stream failed to start');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      partialResponse += chunk;
      tokens++;

      if (onChunk) onChunk(chunk);

      yield {
        content: partialResponse,
        isComplete: false,
      };
    }

    logApiUsage({
      response_time_ms: Date.now() - startTime,
      tokens_used: tokens,
      model_version: 'llama3.1-70b-stream',
      success: true,
      fallback_used: false,
    });

    yield {
      content: partialResponse,
      isComplete: true,
    };
  } catch (error) {
    console.error('Stream error:', error);
    
    logApiUsage({
      response_time_ms: Date.now() - startTime,
      tokens_used: tokens,
      model_version: 'llama3.1-70b-stream',
      success: false,
      fallback_used: false,
    });

    yield {
      content: partialResponse,
      isComplete: false,
      error: error instanceof Error ? error.message : 'Stream interrupted',
    };
  }
}

export async function logApiUsage(metrics: ResponseMetrics) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('api_usage_log').insert({
      user_id: user.id,
      service: metrics.fallback_used ? 'openai' : 'cerebras',
      model_version: metrics.model_version,
      response_time_ms: metrics.response_time_ms,
      tokens_used: metrics.tokens_used,
      success: metrics.success,
      fallback_used: metrics.fallback_used,
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

export async function getUsageStats(): Promise<{
  totalCost: string;
  cerebrasCount: number;
  openaiCount: number;
  avgResponseTime: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await (supabase as any)
    .from('api_usage_log')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  const stats = (data || []).reduce((acc: any, log: any) => {
    if (log.service === 'cerebras') acc.cerebrasCount++;
    if (log.service === 'openai') acc.openaiCount++;
    acc.totalResponseTime += log.response_time_ms || 0;
    acc.totalTokens += log.tokens_used || 0;
    return acc;
  }, {
    cerebrasCount: 0,
    openaiCount: 0,
    totalResponseTime: 0,
    totalTokens: 0,
  });

  return {
    totalCost: (stats.totalTokens * 0.0001).toFixed(2),
    cerebrasCount: stats.cerebrasCount,
    openaiCount: stats.openaiCount,
    avgResponseTime: Math.round(stats.totalResponseTime / (data.length || 1)),
  };
}
