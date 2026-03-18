/**
 * Performance Utilities
 *
 * Helper functions for performance measurement and optimization
 */

import { PerformanceMetrics } from './types';

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  performance.mark(startMark);

  try {
    const result = await fn();
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);

    const measure = performance.getEntriesByName(name)[0];
    if (measure) {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    throw error;
  }
}

/**
 * Create a performance marker
 */
export function createPerformanceMarker(name: string): {
  start: () => void;
  end: () => number;
} {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  return {
    start: () => {
      performance.mark(startMark);
    },
    end: () => {
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const measure = performance.getEntriesByName(name)[0];
      return measure ? measure.duration : 0;
    }
  };
}

/**
 * Wrap a function with performance monitoring
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const marker = createPerformanceMarker(name);
    marker.start();

    try {
      const result = fn(...args);
      marker.end();

      if (result instanceof Promise) {
        return result.finally(() => {
          marker.end();
        });
      }

      return result;
    } catch (error) {
      marker.end();
      throw error;
    }
  }) as T;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Calculate performance score (0-100)
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100;

  // Deduct for high latency
  if (metrics.cellUpdateLatency > 100) {
    score -= 20;
  } else if (metrics.cellUpdateLatency > 50) {
    score -= 10;
  }

  // Deduct for low frame rate
  if (metrics.frameRate < 30) {
    score -= 20;
  } else if (metrics.frameRate < 60) {
    score -= 10;
  }

  // Deduct for high memory usage
  if (metrics.memoryUsage > 500) {
    score -= 20;
  } else if (metrics.memoryUsage > 200) {
    score -= 10;
  }

  // Deduct for large bundle size
  if (metrics.bundleSize > 2000) {
    score -= 20;
  } else if (metrics.bundleSize > 1000) {
    score -= 10;
  }

  return Math.max(0, score);
}

/**
 * Get performance grade
 */
export function getPerformanceGrade(score: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (score >= 90) {
    return { grade: 'A', color: '#48bb78', label: 'Excellent' };
  }
  if (score >= 80) {
    return { grade: 'B', color: '#4299e1', label: 'Good' };
  }
  if (score >= 70) {
    return { grade: 'C', color: '#ed8936', label: 'Fair' };
  }
  if (score >= 60) {
    return { grade: 'D', color: '#ecc94b', label: 'Poor' };
  }
  return { grade: 'F', color: '#e53e3e', label: 'Critical' };
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Create a memoized function
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a request animation frame throttle
 */
export function rafThrottle<T extends (...args: any[]) => any>(fn: T): T {
  let rafId: number | null = null;

  return ((...args: Parameters<T>) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      fn(...args);
      rafId = null;
    });
  }) as T;
}

/**
 * Create an idle callback
 */
export function whenIdle(callback: () => void, timeout = 2000): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => callback(), { timeout });
  } else {
    // Fallback to setTimeout
    setTimeout(callback, 0);
  }
}

/**
 * Create a microtask
 */
export function createMicrotask(callback: () => void): void {
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
}
