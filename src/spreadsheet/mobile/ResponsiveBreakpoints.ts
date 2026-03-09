/**
 * POLLN Spreadsheet - ResponsiveBreakpoints
 *
 * Breakpoint utilities for responsive design across devices.
 * Provides functions to detect current breakpoint and make
 * adaptive rendering decisions.
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768-1023px
 * - Desktop: >= 1024px
 * - Large Desktop: >= 1440px
 */

/**
 * Breakpoint types
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

/**
 * Breakpoint configuration
 */
export interface BreakpointConfig {
  name: Breakpoint;
  minWidth: number;
  maxWidth: number | null;
  description: string;
  typicalDevice: string;
}

/**
 * Media query result
 */
export interface MediaQueryResult {
  matches: boolean;
  media: string;
}

/**
 * Breakpoint configurations
 */
export const BREAKPOINTS: Record<Breakpoint, BreakpointConfig> = {
  mobile: {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 767,
    description: 'Mobile devices',
    typicalDevice: 'Phone',
  },
  tablet: {
    name: 'tablet',
    minWidth: 768,
    maxWidth: 1023,
    description: 'Tablet devices',
    typicalDevice: 'Tablet',
  },
  desktop: {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1439,
    description: 'Desktop computers',
    typicalDevice: 'Laptop/Desktop',
  },
  largeDesktop: {
    name: 'largeDesktop',
    minWidth: 1440,
    maxWidth: null,
    description: 'Large desktop displays',
    typicalDevice: 'Large Monitor',
  },
};

/**
 * ResponsiveBreakpoints - Breakpoint utility class
 *
 * Provides utilities for responsive design decisions.
 */
export class ResponsiveBreakpoints {
  private static mediaQueries: Partial<Record<Breakpoint, MediaQueryList>> = {};
  private static listeners: Partial<Record<Breakpoint, Set<() => void>>> = {};

  /**
   * Get the current breakpoint based on window width
   */
  static getCurrentBreakpoint(): Breakpoint {
    if (typeof window === 'undefined') {
      return 'desktop'; // Default for SSR
    }

    const width = window.innerWidth;

    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    return 'largeDesktop';
  }

  /**
   * Check if current breakpoint matches
   */
  static isBreakpoint(breakpoint: Breakpoint): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  /**
   * Check if current breakpoint is mobile
   */
  static isMobile(): boolean {
    return this.isBreakpoint('mobile');
  }

  /**
   * Check if current breakpoint is tablet or larger
   */
  static isTabletUp(): boolean {
    const current = this.getCurrentBreakpoint();
    return current === 'tablet' || current === 'desktop' || current === 'largeDesktop';
  }

  /**
   * Check if current breakpoint is desktop or larger
   */
  static isDesktopUp(): boolean {
    const current = this.getCurrentBreakpoint();
    return current === 'desktop' || current === 'largeDesktop';
  }

  /**
   * Check if current breakpoint is mobile or tablet
   */
  static isPortable(): boolean {
    const current = this.getCurrentBreakpoint();
    return current === 'mobile' || current === 'tablet';
  }

  /**
   * Get breakpoint configuration
   */
  static getBreakpointConfig(breakpoint: Breakpoint): BreakpointConfig {
    return BREAKPOINTS[breakpoint];
  }

  /**
   * Create a media query for a breakpoint
   */
  static createMediaQuery(breakpoint: Breakpoint): string {
    const config = BREAKPOINTS[breakpoint];

    if (config.maxWidth === null) {
      return `(min-width: ${config.minWidth}px)`;
    }

    return `(min-width: ${config.minWidth}px) and (max-width: ${config.maxWidth}px)`;
  }

  /**
   * Create a min-width media query
   */
  static createMinWidthQuery(width: number): string {
    return `(min-width: ${width}px)`;
  }

  /**
   * Create a max-width media query
   */
  static createMaxWidthQuery(width: number): string {
    return `(max-width: ${width}px)`;
  }

  /**
   * Match a media query
   */
  static matchMedia(query: string): MediaQueryResult | null {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return null;
    }

    const mediaQuery = window.matchMedia(query);
    return {
      matches: mediaQuery.matches,
      media: mediaQuery.media,
    };
  }

  /**
   * Listen for breakpoint changes
   */
  static onBreakpointChange(
    callback: (breakpoint: Breakpoint) => void,
    immediate?: boolean
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // Call immediately if requested
    if (immediate) {
      callback(this.getCurrentBreakpoint());
    }

    // Listen to window resize
    const handleResize = () => {
      const newBreakpoint = this.getCurrentBreakpoint();
      callback(newBreakpoint);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }

  /**
   * Listen for a specific breakpoint
   */
  static onBreakpoint(
    breakpoint: Breakpoint,
    callback: (matches: boolean) => void,
    immediate?: boolean
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const query = this.createMediaQuery(breakpoint);
    const mediaQuery = window.matchMedia(query);

    // Call immediately if requested
    if (immediate) {
      callback(mediaQuery.matches);
    }

    // Store listener
    if (!this.listeners[breakpoint]) {
      this.listeners[breakpoint] = new Set();
    }

    const listener = (e: MediaQueryListEvent | MediaQueryList) => {
      callback('matches' in e ? e.matches : (e as MediaQueryList).matches);
    };

    this.listeners[breakpoint]!.add(listener);
    mediaQuery.addEventListener('change', listener);

    // Store media query for cleanup
    this.mediaQueries[breakpoint] = mediaQuery;

    // Return cleanup function
    return () => {
      this.listeners[breakpoint]?.delete(listener);
      mediaQuery.removeEventListener('change', listener);
    };
  }

  /**
   * Cleanup all listeners
   */
  static cleanup(): void {
    // Remove all listeners
    for (const [breakpoint, mediaQuery] of Object.entries(this.mediaQueries)) {
      const listeners = this.listeners[breakpoint as Breakpoint];
      if (listeners) {
        listeners.forEach(listener => {
          mediaQuery?.removeEventListener('change', listener);
        });
        listeners.clear();
      }
    }

    // Clear references
    this.mediaQueries = {};
    this.listeners = {};
  }

  /**
   * Get responsive value based on current breakpoint
   */
  static getResponsiveValue<T>(
    values: Partial<Record<Breakpoint, T>>,
    defaultValue: T
  ): T {
    const current = this.getCurrentBreakpoint();

    // Try exact match
    if (values[current] !== undefined) {
      return values[current]!;
    }

    // Try fallback to smaller breakpoint
    const breakpointOrder: Breakpoint[] = ['mobile', 'tablet', 'desktop', 'largeDesktop'];
    const currentIndex = breakpointOrder.indexOf(current);

    for (let i = currentIndex - 1; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp]!;
      }
    }

    // Try fallback to larger breakpoint
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp]!;
      }
    }

    return defaultValue;
  }

  /**
   * Get optimal grid columns for current breakpoint
   */
  static getGridColumns(
    mobile: number = 1,
    tablet: number = 2,
    desktop: number = 3,
    largeDesktop: number = 4
  ): number {
    return this.getResponsiveValue(
      { mobile, tablet, desktop, largeDesktop },
      desktop
    );
  }

  /**
   * Get optimal cell size for current breakpoint
   */
  static getCellSize(): {
    width: number;
    height: number;
    padding: number;
  } {
    const current = this.getCurrentBreakpoint();

    switch (current) {
      case 'mobile':
        return { width: 80, height: 40, padding: 4 };
      case 'tablet':
        return { width: 100, height: 50, padding: 6 };
      case 'desktop':
        return { width: 120, height: 60, padding: 8 };
      case 'largeDesktop':
        return { width: 140, height: 70, padding: 10 };
    }
  }

  /**
   * Check if device supports touch
   */
  static isTouchDevice(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - vendor prefix
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Get device pixel ratio
   */
  static getPixelRatio(): number {
    if (typeof window === 'undefined') {
      return 1;
    }

    return window.devicePixelRatio || 1;
  }

  /**
   * Check if device is high DPI
   */
  static isHighDPI(): boolean {
    return this.getPixelRatio() >= 2;
  }

  /**
   * Get safe area insets (for notched devices)
   */
  static getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const root = document.documentElement;

    return {
      top: parseInt(getComputedStyle(root).getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      right: parseInt(getComputedStyle(root).getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      bottom: parseInt(getComputedStyle(root).getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(getComputedStyle(root).getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    };
  }

  /**
   * Get viewport height (accounting for mobile browsers)
   */
  static getViewportHeight(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    return window.innerHeight;
  }

  /**
   * Get viewport width
   */
  static getViewportWidth(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    return window.innerWidth;
  }

  /**
   * Check if device is in landscape orientation
   */
  static isLandscape(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth > window.innerHeight;
  }

  /**
   * Check if device is in portrait orientation
   */
  static isPortrait(): boolean {
    return !this.isLandscape();
  }

  /**
   * Listen for orientation changes
   */
  static onOrientationChange(
    callback: (isLandscape: boolean) => void,
    immediate?: boolean
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // Call immediately if requested
    if (immediate) {
      callback(this.isLandscape());
    }

    const handleResize = () => {
      callback(this.isLandscape());
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }

  /**
   * Get all breakpoint information
   */
  static getAllBreakpoints(): Record<Breakpoint, BreakpointConfig> {
    return { ...BREAKPOINTS };
  }

  /**
   * Sort breakpoints by width
   */
  static sortBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
    return breakpoints.sort((a, b) => {
      const configA = BREAKPOINTS[a];
      const configB = BREAKPOINTS[b];
      return configA.minWidth - configB.minWidth;
    });
  }
}

/**
 * React hook for responsive breakpoint detection
 *
 * @example
 * const breakpoint = useBreakpoint();
 * const isMobile = useBreakpoint() === 'mobile';
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(
    ResponsiveBreakpoints.getCurrentBreakpoint()
  );

  useEffect(() => {
    const cleanup = ResponsiveBreakpoints.onBreakpointChange(setBreakpoint, true);
    return cleanup;
  }, []);

  return breakpoint;
}

/**
 * React hook for media query matching
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * React hook for responsive values
 *
 * @example
 * const columns = useResponsiveValue({ mobile: 1, tablet: 2, desktop: 3 }, 2);
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  const breakpoint = useBreakpoint();
  return ResponsiveBreakpoints.getResponsiveValue(values, defaultValue);
}

/**
 * React hook for viewport dimensions
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: ResponsiveBreakpoints.getViewportWidth(),
    height: ResponsiveBreakpoints.getViewportHeight(),
  }));

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: ResponsiveBreakpoints.getViewportWidth(),
        height: ResponsiveBreakpoints.getViewportHeight(),
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// Import useState and useEffect for React hooks
import { useState, useEffect } from 'react';

export default ResponsiveBreakpoints;
