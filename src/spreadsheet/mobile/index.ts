/**
 * POLLN Spreadsheet - Mobile Components
 *
 * Comprehensive mobile-first responsive UI components for POLLN.
 * All components are optimized for touch interactions, offline capability,
 * and fast performance on mobile devices.
 *
 * @module mobile
 */

// ============================================================================
// Main Components
// ============================================================================

export { default as MobileGrid } from './MobileGrid.js';
export type {
  MobileCellData,
  MobileGridConfig,
  MobileGridProps,
} from './MobileGrid.js';

export { default as TouchCellInspector } from './TouchCellInspector.js';
export type {
  InspectorTab,
  InspectorState,
  TouchCellInspectorProps,
} from './TouchCellInspector.js';

export { default as MobileControls } from './MobileControls.js';
export type {
  QuickAction,
  NavItem,
  MobileControlsProps,
} from './MobileControls.js';

// ============================================================================
// Utilities
// ============================================================================

export { default as GestureHandler } from './GestureHandler.js';
export type {
  GestureType,
  GestureEvent,
  GestureHandlerConfig,
} from './GestureHandler.js';

export {
  ResponsiveBreakpoints,
  useBreakpoint,
  useMediaQuery,
  useResponsiveValue,
  useViewportSize,
} from './ResponsiveBreakpoints.js';
export type {
  Breakpoint,
  BreakpointConfig,
  MediaQueryResult,
} from './ResponsiveBreakpoints.js';

export {
  ServiceWorkerRegistrationManager,
  registerServiceWorker,
  useServiceWorker,
  useOffline,
  useUpdatePrompt,
} from './ServiceWorkerRegistration.js';
export type {
  ServiceWorkerStatus,
  ServiceWorkerState,
  RegistrationOptions,
  CacheEntry,
} from './ServiceWorkerRegistration.js';

// ============================================================================
// Service Worker
// ============================================================================

export { default as ServiceWorker } from './sw.js';

// ============================================================================
// PWA Manifest
// ============================================================================

// The manifest.json is exported as a static asset
// It should be referenced in your HTML as:
// <link rel="manifest" href="/src/spreadsheet/mobile/manifest.json">

// ============================================================================
// Re-exports for convenience
// ============================================================================

/**
 * @example
 * // Basic usage
 * import { MobileGrid, MobileControls, TouchCellInspector } from '@polln/spreadsheet/mobile';
 *
 * // With utilities
 * import {
 *   ResponsiveBreakpoints,
 *   GestureHandler,
 *   registerServiceWorker
 * } from '@polln/spreadsheet/mobile';
 *
 * // With hooks
 * import {
 *   useBreakpoint,
 *   useOffline,
 *   useServiceWorker
 * } from '@polln/spreadsheet/mobile';
 */

// ============================================================================
// Version info
// ============================================================================

export const MOBILE_VERSION = '1.0.0';
export const MOBILE_BUILD_DATE = new Date().toISOString();

// ============================================================================
// Feature flags
// ============================================================================

export const MOBILE_FEATURES = {
  touchGestures: true,
  hapticFeedback: true,
  offlineMode: true,
  pwaInstall: true,
  voiceInput: true,
  pullToRefresh: true,
  infiniteScroll: true,
  swipeActions: true,
} as const;

// ============================================================================
// Performance targets
// ============================================================================

export const PERFORMANCE_TARGETS = {
  firstContentfulPaint: 1500, // ms
  timeToInteractive: 3000, // ms
  largestContentfulPaint: 2500, // ms
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100, // ms
  timeToFirstByte: 600, // ms
} as const;

// ============================================================================
// Default exports
// ============================================================================

export default {
  MobileGrid,
  TouchCellInspector,
  MobileControls,
  GestureHandler,
  ResponsiveBreakpoints,
  ServiceWorkerRegistrationManager,
  registerServiceWorker,
  useBreakpoint,
  useOffline,
  useServiceWorker,
};
