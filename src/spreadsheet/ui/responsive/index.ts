/**
 * POLLN Spreadsheet - Responsive UI Components
 *
 * Comprehensive responsive UI system for POLLN spreadsheets.
 * Mobile-first design with touch-optimized interactions.
 *
 * @module responsive
 */

// ============================================================================
// Main Components
// ============================================================================

export { ResponsiveGrid } from './ResponsiveGrid';
export type { ResponsiveGridProps, ResponsiveGridConfig } from './types';

export { MobileToolbar } from './MobileToolbar';
export type { MobileToolbarProps, MobileToolbarConfig, QuickAction, NavItem } from './types';

export { AdaptiveRenderer } from './AdaptiveRenderer';
export type { AdaptiveRendererProps, AdaptiveRendererConfig } from './types';

export { TouchEditor } from './TouchEditor';
export type { TouchEditorProps, TouchEditorConfig } from './types';

export { ResponsiveContainer } from './ResponsiveContainer';
export type { ResponsiveContainerProps, ResponsiveContainerConfig } from './types';

// ============================================================================
// Hooks
// ============================================================================

export {
  useBreakpoint,
  useMediaQuery,
  useResponsiveValue,
  useViewportSize,
  BreakpointUtils,
} from './useBreakpoint';
export type { Breakpoint, BreakpointConfig, MediaQueryResult, ViewportSize, DeviceOrientation } from './types';

export { useTouchGestures } from './useTouchGestures';
export type { TouchGestures, TouchGestureConfig, SwipeDirection } from './types';

// ============================================================================
// Types
// ============================================================================

export type {
  ResponsiveCellData,
  DisplayMode,
  ViewMode,
  GridViewport,
  ZoomState,
  PanState,
  PerformanceMetrics,
  AccessibilityProps,
  ResponsiveState,
} from './types';

// ============================================================================
// Utilities
// ============================================================================

/**
 * @example
 * // Basic usage
 * import { ResponsiveGrid, MobileToolbar } from '@polln/spreadsheet/ui/responsive';
 *
 * // With hooks
 * import {
 *   useBreakpoint,
 *   useTouchGestures,
 *   useViewportSize
 * } from '@polln/spreadsheet/ui/responsive';
 *
 * // Full example
 * function MySpreadsheet() {
 *   const mode = useBreakpoint();
 *   const viewport = useViewportSize();
 *
 *   return (
 *     <ResponsiveContainer mode={mode}>
 *       <ResponsiveGrid mode={mode} {...props} />
 *       <MobileToolbar mode={mode} {...toolbarProps} />
 *     </ResponsiveContainer>
 *   );
 * }
 */

// ============================================================================
// Version info
// ============================================================================

export const RESPONSIVE_VERSION = '1.0.0';
export const RESPONSIVE_BUILD_DATE = new Date().toISOString();

// ============================================================================
// Feature flags
// ============================================================================

export const RESPONSIVE_FEATURES = {
  touchGestures: true,
  pinchZoom: true,
  swipeNavigation: true,
  pullToRefresh: true,
  infiniteScroll: true,
  virtualScrolling: true,
  progressiveLoading: true,
  hapticFeedback: true,
  orientationChanges: true,
  safeAreaSupport: true,
} as const;

// ============================================================================
// Performance targets
// ============================================================================

export const RESPONSIVE_PERFORMANCE_TARGETS = {
  firstContentfulPaint: 1500, // ms
  timeToInteractive: 3000, // ms
  largestContentfulPaint: 2500, // ms
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100, // ms
  timeToFirstByte: 600, // ms
  framesPerSecond: 60,
} as const;

// ============================================================================
// Breakpoint constants
// ============================================================================

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1024,
} as const;

// ============================================================================
// Default exports
// ============================================================================

export default {
  ResponsiveGrid,
  MobileToolbar,
  AdaptiveRenderer,
  TouchEditor,
  ResponsiveContainer,
  useBreakpoint,
  useTouchGestures,
  useViewportSize,
  BREAKPOINTS,
  RESPONSIVE_FEATURES,
  RESPONSIVE_PERFORMANCE_TARGETS,
};
