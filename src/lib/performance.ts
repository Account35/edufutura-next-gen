// Performance monitoring and optimization utilities

// Debounce function for rate-limiting
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

// Throttle function for limiting call frequency
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Measure function execution time
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
}

// Measure async function execution time
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
}

// Request idle callback polyfill
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);

// Cancel idle callback polyfill
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

// Run low-priority task when browser is idle
export function runWhenIdle(callback: () => void, timeout = 5000): ReturnType<typeof requestIdleCallback> {
  return requestIdleCallback(callback, { timeout });
}

// Intersection observer helper for lazy loading
export function observeIntersection(
  element: Element,
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver(
    ([entry]) => callback(entry.isIntersecting),
    {
      rootMargin: '200px',
      threshold: 0,
      ...options,
    }
  );

  observer.observe(element);
  return () => observer.disconnect();
}

// Memory-efficient memoization with LRU cache
export function memoizeWithLRU<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxSize = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  const keyOrder: string[] = [];

  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      // Move to end (most recently used)
      const index = keyOrder.indexOf(key);
      if (index > -1) {
        keyOrder.splice(index, 1);
        keyOrder.push(key);
      }
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    keyOrder.push(key);

    // Evict oldest if over capacity
    if (keyOrder.length > maxSize) {
      const oldestKey = keyOrder.shift()!;
      cache.delete(oldestKey);
    }

    return result;
  } as T;
}

// Batch DOM reads/writes to avoid layout thrashing
export const batchDOMOperations = {
  reads: [] as Array<() => void>,
  writes: [] as Array<() => void>,
  scheduled: false,

  read(fn: () => void) {
    this.reads.push(fn);
    this.schedule();
  },

  write(fn: () => void) {
    this.writes.push(fn);
    this.schedule();
  },

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      // Execute all reads first
      const reads = this.reads.splice(0);
      reads.forEach(fn => fn());

      // Then all writes
      const writes = this.writes.splice(0);
      writes.forEach(fn => fn());

      this.scheduled = false;
    });
  },
};

// Check if code splitting is working
export function logChunkInfo() {
  if (process.env.NODE_ENV === 'development') {
    const scripts = document.querySelectorAll('script[src]');
    console.log('[Performance] Loaded chunks:', scripts.length);
    scripts.forEach(script => {
      console.log('  -', script.getAttribute('src'));
    });
  }
}

// Performance marks for user timing API
export function markStart(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-start`);
  }
}

export function markEnd(name: string) {
  if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
    performance.mark(`${name}-end`);
    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
      const entries = performance.getEntriesByName(name);
      if (entries.length > 0 && process.env.NODE_ENV === 'development') {
        console.log(`[Timing] ${name}: ${entries[entries.length - 1].duration.toFixed(2)}ms`);
      }
    } catch {
      // Marks may not exist
    }
  }
}
