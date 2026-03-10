/**
 * POLLN Spreadsheet - useBreakpoint Hook
 *
 * React hook for detecting and tracking responsive breakpoints.
 * Provides real-time breakpoint updates with debouncing for performance.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Breakpoint, BreakpointConfig, ViewportSize, DeviceOrientation } from './types';

/**
 * Default breakpoint configuration
 */
const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 768,
  tablet: 1024,
  desktop: 1024,
};

/**
 * Debounce delay for resize events (ms)
 */
const RESIZE_DEBOUNCE_DELAY = 150;

/**
 * useBreakpoint hook
 *
 * Detects the current breakpoint based on viewport width.
 * Updates automatically on window resize with debouncing.
 *
 * @param config - Optional breakpoint configuration
 * @returns Current breakpoint
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * console.log(breakpoint); // 'mobile' | 'tablet' | 'desktop'
 * ```
 */
export function useBreakpoint(config?: Partial<BreakpointConfig>): Breakpoint {
  const breakpoints = { ...DEFAULT_BREAKPOINTS, ...config };
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    getCurrentBreakpoint(breakpoints)
  );

  const debounceTimerRef = useRef<number>();

  useEffect(() => {
    const handleResize = () => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = window.setTimeout(() => {
        const newBreakpoint = getCurrentBreakpoint(breakpoints);
        setBreakpoint(newBreakpoint);
      }, RESIZE_DEBOUNCE_DELAY);
    };

    // Add event listener with passive option for better performance
    window.addEventListener('resize', handleResize, { passive: true });

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoints]);

  return breakpoint;
}

/**
 * Get current breakpoint based on viewport width
 */
function getCurrentBreakpoint(config: BreakpointConfig): Breakpoint {
  const width = window.innerWidth;

  if (width < config.mobile) {
    return 'mobile';
  } else if (width < config.tablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * useMediaQuery hook
 *
 * Custom hook for listening to CSS media queries.
 * Returns whether the media query currently matches.
 *
 * @param query - CSS media query string
 * @returns Whether the query matches
 *
 * @example
 * ```tsx
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isPrint = useMediaQuery('print');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const updateMatches = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener('change', updateMatches);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}

/**
 * useResponsiveValue hook
 *
 * Returns a value based on the current breakpoint.
 * Useful for responsive values that change based on screen size.
 *
 * @param values - Object mapping breakpoints to values
 * @returns Value for current breakpoint
 *
 * @example
 * ```tsx
 * const fontSize = useResponsiveValue({
 *   mobile: '14px',
 *   tablet: '16px',
 *   desktop: '18px'
 * });
 * ```
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  const breakpoint = useBreakpoint();

  // Find the best matching value
  if (values[breakpoint] !== undefined) {
    return values[breakpoint]!;
  }

  // Fall back to smaller breakpoint
  if (breakpoint === 'desktop' && values.tablet !== undefined) {
    return values.tablet;
  }
  if ((breakpoint === 'desktop' || breakpoint === 'tablet') && values.mobile !== undefined) {
    return values.mobile;
  }

  return defaultValue;
}

/**
 * useViewportSize hook
 *
 * Returns the current viewport size and orientation.
 * Updates on resize and orientation change.
 *
 * @returns Current viewport size
 *
 * @example
 * ```tsx
 * const viewport = useViewportSize();
 * console.log(viewport.width, viewport.height, viewport.orientation);
 * ```
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => getViewportSize());
  const resizeTimerRef = useRef<number>();

  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = window.setTimeout(() => {
        setSize(getViewportSize());
      }, RESIZE_DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return size;
}

/**
 * Get current viewport size
 */
function getViewportSize(): ViewportSize {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation: DeviceOrientation = width > height ? 'landscape' : 'portrait';

  return { width, height, orientation };
}

/**
 * Breakpoint utility class
 *
 * Provides static methods for breakpoint detection and comparison.
 * Useful for non-React code or conditional logic outside components.
 */
export class BreakpointUtils {
  private static config = DEFAULT_BREAKPOINTS;

  /**
   * Set breakpoint configuration
   */
  static setConfig(config: Partial<BreakpointConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current breakpoint
   */
  static getCurrentBreakpoint(): Breakpoint {
    return getCurrentBreakpoint(this.config);
  }

  /**
   * Check if current breakpoint matches
   */
  static isBreakpoint(breakpoint: Breakpoint): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  /**
   * Check if current breakpoint is at least the given breakpoint
   */
  static isAtLeast(breakpoint: Breakpoint): boolean {
    const current = this.getCurrentBreakpoint();
    const order: Breakpoint[] = ['mobile', 'tablet', 'desktop'];
    return order.indexOf(current) >= order.indexOf(breakpoint);
  }

  /**
   * Check if current breakpoint is at most the given breakpoint
   */
  static isAtMost(breakpoint: Breakpoint): boolean {
    const current = this.getCurrentBreakpoint();
    const order: Breakpoint[] = ['mobile', 'tablet', 'desktop'];
    return order.indexOf(current) <= order.indexOf(breakpoint);
  }

  /**
   * Get breakpoint for a given width
   */
  static getBreakpointForWidth(width: number): Breakpoint {
    if (width < this.config.mobile) return 'mobile';
    if (width < this.config.tablet) return 'tablet';
    return 'desktop';
  }

  /**
   * Get media query for a breakpoint
   */
  static getMediaQuery(breakpoint: Breakpoint): string {
    switch (breakpoint) {
      case 'mobile':
        return `(max-width: ${this.config.mobile - 1}px)`;
      case 'tablet':
        return `(min-width: ${this.config.mobile}px) and (max-width: ${this.config.tablet - 1}px)`;
      case 'desktop':
        return `(min-width: ${this.config.desktop}px)`;
    }
  }
}

/**
 * Export singleton instance
 */
export default {
  useBreakpoint,
  useMediaQuery,
  useResponsiveValue,
  useViewportSize,
  BreakpointUtils,
};
