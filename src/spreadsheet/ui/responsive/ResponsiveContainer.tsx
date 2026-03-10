/**
 * POLLN Spreadsheet - ResponsiveContainer Component
 *
 * Fluid-sized container with breakpoint-aware layout and orientation handling.
 * Automatically adjusts padding and max-width based on device and screen size.
 *
 * Features:
 * - Breakpoint-aware sizing
 * - Orientation change handling
 * - Fluid width/height calculations
 * - Safe area insets for mobile devices
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useBreakpoint, useViewportSize } from './useBreakpoint';
import type {
  Breakpoint,
  ResponsiveContainerProps,
  ResponsiveContainerConfig,
  DeviceOrientation,
  ViewportSize,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ResponsiveContainerConfig = {
  maxWidth: 1200,
  fluid: true,
  centerContent: true,
  padding: true,
  breakpointPadding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
};

/**
 * ResponsiveContainer - Adaptive layout container
 *
 * Automatically adjusts:
 * - Max width based on breakpoint
 * - Padding based on breakpoint
 * - Layout on orientation changes
 * - Safe area for mobile devices (notch, home indicator)
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  mode: propMode,
  config = {},
  onOrientationChange,
  onResize,
  className = '',
  style = {},
}) => {
  // Breakpoint and viewport detection
  const detectedMode = useBreakpoint();
  const mode = propMode || detectedMode;
  const viewport = useViewportSize();

  // State
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastViewportRef = useRef<ViewportSize>(viewport);

  // Effective configuration
  const effectiveConfig = useMemo<ResponsiveContainerConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    breakpointPadding: {
      ...DEFAULT_CONFIG.breakpointPadding,
      ...config.breakpointPadding,
    },
  }), [config]);

  // Calculate container styles
  const containerStyles = useMemo(() => {
    const padding = effectiveConfig.breakpointPadding?.[mode] || effectiveConfig.breakpointPadding?.mobile;

    const styles: React.CSSProperties = {
      width: '100%',
      position: 'relative' as const,
      boxSizing: 'border-box',
    };

    if (effectiveConfig.fluid) {
      styles.maxWidth = '100%';
    } else if (effectiveConfig.maxWidth) {
      styles.maxWidth = `${effectiveConfig.maxWidth}px`;
    }

    if (effectiveConfig.centerContent) {
      styles.marginLeft = 'auto';
      styles.marginRight = 'auto';
    }

    if (effectiveConfig.padding && padding) {
      styles.paddingTop = safeAreaInsets.top > 0 ? `calc(${padding} + ${safeAreaInsets.top}px)` : padding;
      styles.paddingRight = safeAreaInsets.right > 0 ? `calc(${padding} + ${safeAreaInsets.right}px)` : padding;
      styles.paddingBottom = safeAreaInsets.bottom > 0 ? `calc(${padding} + ${safeAreaInsets.bottom}px)` : padding;
      styles.paddingLeft = safeAreaInsets.left > 0 ? `calc(${padding} + ${safeAreaInsets.left}px)` : padding;
    }

    return styles;
  }, [effectiveConfig, mode, safeAreaInsets]);

  // Detect safe area insets (notch, home indicator, etc.)
  useEffect(() => {
    const updateSafeArea = () => {
      if (typeof window === 'undefined' || !window.document) return;

      const rootStyles = window.getComputedStyle(document.documentElement);
      const top = parseInt(rootStyles.getPropertyValue('safe-area-inset-top') || '0', 10);
      const right = parseInt(rootStyles.getPropertyValue('safe-area-inset-right') || '0', 10);
      const bottom = parseInt(rootStyles.getPropertyValue('safe-area-inset-bottom') || '0', 10);
      const left = parseInt(rootStyles.getPropertyValue('safe-area-inset-left') || '0', 10);

      setSafeAreaInsets({ top, right, bottom, left });
    };

    updateSafeArea();

    // Listen for orientation changes
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  // Handle viewport changes
  useEffect(() => {
    const previousViewport = lastViewportRef.current;
    lastViewportRef.current = viewport;

    // Check for orientation change
    if (previousViewport.orientation !== viewport.orientation) {
      onOrientationChange?.(viewport.orientation);
    }

    // Check for resize
    if (previousViewport.width !== viewport.width || previousViewport.height !== viewport.height) {
      onResize?.(viewport);
    }
  }, [viewport, onOrientationChange, onResize]);

  // Setup ResizeObserver for container
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        onResize?.({
          width,
          height,
          orientation: width > height ? 'landscape' : 'portrait',
        });
      }
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [onResize]);

  // Handle keyboard visibility changes (mobile)
  useEffect(() => {
    if (mode !== 'mobile') return;

    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    let keyboardVisible = false;

    const handleVisualViewportResize = () => {
      if (!window.visualViewport) return;

      const currentHeight = window.visualViewport.height;
      const newKeyboardVisible = currentHeight < initialViewportHeight * 0.8;

      if (newKeyboardVisible !== keyboardVisible) {
        keyboardVisible = newKeyboardVisible;

        // Adjust container for keyboard
        if (containerRef.current) {
          if (keyboardVisible) {
            containerRef.current.style.paddingBottom = `${window.visualViewport.height - currentHeight}px`;
          } else {
            containerRef.current.style.paddingBottom = '';
          }
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleVisualViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
    };
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className={`responsive-container responsive-container-${mode} ${className}`}
      style={{
        ...containerStyles,
        ...style,
      }}
      data-mode={mode}
      data-orientation={viewport.orientation}
    >
      {children}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.debugInfo}>
          <div>Mode: {mode}</div>
          <div>Orientation: {viewport.orientation}</div>
          <div>Viewport: {Math.round(viewport.width)}x{Math.round(viewport.height)}</div>
          <div>Safe Area: T{safeAreaInsets.top} R{safeAreaInsets.right} B{safeAreaInsets.bottom} L{safeAreaInsets.left}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  debugInfo: {
    position: 'fixed' as const,
    bottom: '80px',
    left: '8px',
    padding: '8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '10px',
    borderRadius: '4px',
    zIndex: 1000,
    fontFamily: 'monospace',
  },
};

export default ResponsiveContainer;
