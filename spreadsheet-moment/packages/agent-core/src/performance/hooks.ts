/**
 * Performance Hooks
 *
 * React hooks for performance optimization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PerformanceMonitor, getPerformanceMonitor } from './PerformanceMonitor';
import { CellUpdateOptimizer, getCellUpdateOptimizer } from './CellUpdateOptimizer';

/**
 * Use Performance Monitor Hook
 *
 * Monitors component performance
 */
export function usePerformanceMonitor(interval = 1000) {
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState(getPerformanceMonitor().getCurrentMetrics());

  useEffect(() => {
    const monitor = getPerformanceMonitor();
    monitorRef.current = monitor;

    // Start monitoring if not already started
    if (!monitor['startMonitoring'] || !monitor['stopMonitoring']) {
      // Monitor is already started or methods don't exist
      return;
    }

    const intervalId = setInterval(() => {
      const currentMetrics = monitor.getCurrentMetrics();
      if (currentMetrics) {
        setMetrics(currentMetrics);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return metrics;
}

/**
 * Use Cell Update Optimization Hook
 *
 * Optimizes cell update performance
 */
export function useCellUpdateOptimization() {
  const optimizerRef = useRef<CellUpdateOptimizer | null>(null);

  useEffect(() => {
    const optimizer = getCellUpdateOptimizer();
    optimizerRef.current = optimizer;

    return () => {
      // Cleanup if needed
    };
  }, []);

  const scheduleUpdate = useCallback((location: string, value: any) => {
    const optimizer = getCellUpdateOptimizer();
    optimizer.scheduleUpdate(location, value);
  }, []);

  const getMetrics = useCallback(() => {
    const optimizer = getCellUpdateOptimizer();
    return optimizer.getMetrics();
  }, []);

  const getAverageDuration = useCallback(() => {
    const optimizer = getCellUpdateOptimizer();
    return optimizer.getAverageDuration();
  }, []);

  return {
    scheduleUpdate,
    getMetrics,
    getAverageDuration
  };
}

/**
 * Use Lazy Load Hook
 *
 * Lazy loads components on demand
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: any[] = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await loader();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Use Debounce Hook
 *
 * Debounces a function call
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    },
    [func, delay]
  ) as T;
}

/**
 * Use Throttle Hook
 *
 * Throttles a function call
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        func(...args);
      }
    },
    [func, delay]
  ) as T;
}

/**
 * Use Memoized Callback Hook
 *
 * Memoizes a callback with dependencies
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  func: T,
  dependencies: any[]
): T {
  return useCallback(func, dependencies);
}

/**
 * Use Memoized Value Hook
 *
 * Memoizes a value with dependencies
 */
export function useMemoizedValue<T>(factory: () => T, dependencies: any[]): T {
  return useMemo(factory, dependencies);
}

/**
 * Use Previous Value Hook
 *
 * Gets the previous value of a state or prop
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Use Intersection Observer Hook
 *
 * Observes when an element enters the viewport
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Use Async State Hook
 *
 * Manages async state with loading and error states
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): { data: T | null; loading: boolean; error: Error | null; execute: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, loading, error, execute };
}

/**
 * Use Local Storage Hook
 *
 * Syncs state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
