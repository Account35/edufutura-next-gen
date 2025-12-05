import { toast } from '@/hooks/use-toast';
import { RateLimitError, ExternalServiceError, DatabaseError } from './errors';
import { logApiCall } from './logging';

const REQUEST_TIMEOUT = 30000; // 30 seconds

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
}

export const apiRequest = async <T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { timeout = REQUEST_TIMEOUT, ...fetchOptions } = options;
  const startTime = performance.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);

    // Log API call
    await logApiCall({
      endpoint: url,
      method: fetchOptions.method || 'GET',
      parameters: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
      status: response.status,
      duration_ms: duration,
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        'openai', // Default, adjust based on URL
        `HTTP error! status: ${response.status}`,
        response.status.toString(),
        undefined,
        response.status >= 500
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);

    await logApiCall({
      endpoint: url,
      method: fetchOptions.method || 'GET',
      status: 0,
      duration_ms: duration,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Request Timeout',
          description: 'The request took too long. Please try again.',
          variant: 'destructive',
        });
        throw new ExternalServiceError('openai', 'Request timeout', 'TIMEOUT', 5);
      }

      if (!navigator.onLine) {
        toast({
          title: 'No Internet Connection',
          description: 'Please check your connection and try again.',
          variant: 'destructive',
        });
        throw new Error('Network error');
      }

      if (error instanceof ExternalServiceError) {
        toast({
          title: 'Service Unavailable',
          description: error.getUserMessage(),
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Request Failed',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }

    throw error;
  }
};

export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
};
