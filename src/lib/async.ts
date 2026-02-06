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
