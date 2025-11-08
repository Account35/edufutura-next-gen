import { toast } from '@/hooks/use-toast';

const REQUEST_TIMEOUT = 30000; // 30 seconds

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
}

export const apiRequest = async <T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { timeout = REQUEST_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Request Timeout',
          description: 'The request took too long. Please try again.',
          variant: 'destructive',
        });
        throw new Error('Request timeout');
      }

      if (!navigator.onLine) {
        toast({
          title: 'No Internet Connection',
          description: 'Please check your connection and try again.',
          variant: 'destructive',
        });
        throw new Error('Network error');
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
