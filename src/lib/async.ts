// Small async utilities shared across the app

export class TimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wrap a promise with a timeout. Note: this does NOT abort the underlying request;
 * it only rejects so the UI can recover.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string = 'Operation'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const wrapped = Promise.resolve(promise);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(label, timeoutMs)), timeoutMs);
  });

  return Promise.race([wrapped, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

/**
 * Retry a promise-returning function with simple exponential backoff.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelay = 300
): Promise<T> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < attempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * attempt;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}
