/**
 * BIZRA Genesis Node - Performance Optimization Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Professional-grade performance utilities:
 * - Debounce/throttle with TypeScript generics
 * - Request deduplication
 * - Lazy loading orchestrator
 * - Memory management
 * - Render optimization helpers
 * 
 * @module performance
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DEBOUNCE & THROTTLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Debounce function with TypeScript generics and cancel/flush support
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
  const { leading = false, trailing = true, maxWait } = options || {};
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let result: ReturnType<T>;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis!;
    
    lastArgs = lastThis = null;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args);
    return result;
  }

  function startTimer(pendingFunc: () => void, wait: number): ReturnType<typeof setTimeout> {
    return setTimeout(pendingFunc, wait);
  }

  function cancelTimer(id: ReturnType<typeof setTimeout> | null): void {
    if (id !== null) clearTimeout(id);
  }

  function leadingEdge(time: number): ReturnType<T> {
    lastInvokeTime = time;
    timeoutId = startTimer(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    timeoutId = startTimer(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): ReturnType<T> {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  }

  function cancel(): void {
    cancelTimer(timeoutId);
    cancelTimer(maxTimeoutId);
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeoutId = maxTimeoutId = null;
  }

  function flush(): ReturnType<T> {
    if (timeoutId === null) return result;
    return trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        timeoutId = startTimer(timerExpired, delay);
        return invokeFunc(time);
      }
    }
    if (timeoutId === null) {
      timeoutId = startTimer(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as unknown as T & { cancel: () => void; flush: () => void; pending: () => boolean };
}

/**
 * Throttle function with leading and trailing edge control
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number,
  options?: { leading?: boolean; trailing?: boolean }
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options || {};
  return debounce(fn, limit, { leading, trailing, maxWait: limit });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

type InFlightRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const inFlightRequests = new Map<string, InFlightRequest<unknown>>();
const REQUEST_CACHE_TTL = 5000; // 5 seconds

/**
 * Deduplicate identical requests made within TTL window
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = REQUEST_CACHE_TTL
): Promise<T> {
  const now = Date.now();
  const existing = inFlightRequests.get(key);

  // Return existing promise if still valid
  if (existing && (now - existing.timestamp) < ttl) {
    return existing.promise as Promise<T>;
  }

  // Create new request
  const promise = fetcher().finally(() => {
    // Clean up after TTL
    setTimeout(() => {
      const current = inFlightRequests.get(key);
      if (current?.promise === promise) {
        inFlightRequests.delete(key);
      }
    }, ttl);
  });

  inFlightRequests.set(key, { promise, timestamp: now });
  return promise;
}

/**
 * Clear all in-flight request cache
 */
export function clearRequestCache(): void {
  inFlightRequests.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY LOADING ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

type LazyModule<T> = () => Promise<{ default: T } | T>;

interface LazyLoadOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  onError?: (error: Error) => void;
}

const moduleCache = new Map<string, unknown>();

/**
 * Lazy load a module with retry logic and caching
 */
export async function lazyLoad<T>(
  moduleId: string,
  loader: LazyModule<T>,
  options: LazyLoadOptions = {}
): Promise<T> {
  const { retries = 3, retryDelay = 1000, timeout = 10000, onError } = options;

  // Check cache
  if (moduleCache.has(moduleId)) {
    return moduleCache.get(moduleId) as T;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        loader(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout loading ${moduleId}`)), timeout)
        ),
      ]);

      const loadedModule = (result as { default?: T })?.default ?? result;
      moduleCache.set(moduleId, loadedModule);
      return loadedModule as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  if (onError && lastError) {
    onError(lastError);
  }

  throw lastError || new Error(`Failed to load ${moduleId}`);
}

/**
 * Preload modules in the background
 */
export function preloadModules(modules: Array<{ id: string; loader: LazyModule<unknown> }>): void {
  if (typeof window === 'undefined') return;

  // Use requestIdleCallback for non-blocking preload
  const preload = () => {
    modules.forEach(({ id, loader }) => {
      if (!moduleCache.has(id)) {
        lazyLoad(id, loader).catch(() => {
          // Silently ignore preload failures
        });
      }
    });
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preload);
  } else {
    setTimeout(preload, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface MemoryStatus {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  usagePercentage?: number;
}

/**
 * Get current memory status (Chrome only)
 */
export function getMemoryStatus(): MemoryStatus {
  if (typeof window === 'undefined') return {};

  const memory = (performance as Performance & { 
    memory?: { 
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }
  }).memory;

  if (!memory) return {};

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
  };
}

/**
 * Check if memory usage is high
 */
export function isMemoryPressure(threshold: number = 80): boolean {
  const status = getMemoryStatus();
  return (status.usagePercentage ?? 0) > threshold;
}

/**
 * Release cached resources when memory is high
 */
export function releaseResources(): void {
  if (!isMemoryPressure()) return;

  // Clear module cache (except essentials)
  moduleCache.clear();

  // Clear request cache
  inFlightRequests.clear();

  // Suggest garbage collection (if available in dev tools)
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as Window & { gc?: () => void }).gc?.();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schedule work during idle time
 */
export function scheduleIdleWork(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  if ('requestIdleCallback' in window) {
    return (window as unknown as { 
      requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number 
    }).requestIdleCallback(callback, options);
  }

  return setTimeout(callback, 1) as unknown as number;
}

/**
 * Cancel scheduled idle work
 */
export function cancelIdleWork(id: number): void {
  if (typeof window === 'undefined') return;

  if ('cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Batch DOM reads and writes to prevent layout thrashing
 */
export function batchDOMOperations(
  reads: Array<() => unknown>,
  writes: Array<() => void>
): Promise<unknown[]> {
  return new Promise(resolve => {
    // Batch reads first
    requestAnimationFrame(() => {
      const readResults = reads.map(read => read());
      
      // Then batch writes
      requestAnimationFrame(() => {
        writes.forEach(write => write());
        resolve(readResults);
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Hook for debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounced = useCallback(
    debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay, ...deps]
  );

  useEffect(() => {
    return () => debounced.cancel();
  }, [debounced]);

  return debounced;
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  limit: number,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    throttle((...args: Parameters<T>) => callbackRef.current(...args), limit),
    [limit, ...deps]
  );
}

/**
 * Hook to run effect only after mount (skip first render)
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList
): void {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node) {
      observerRef.current = new IntersectionObserver(([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      }, options);

      observerRef.current.observe(node);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [ref, isIntersecting];
}
