/**
 * Accessibility Utilities for POLLN Spreadsheets
 * WCAG 2.1 Level AA Compliant
 *
 * This module provides comprehensive accessibility features including:
 * - Focus management
 * - Keyboard navigation
 * - ARIA attributes and live regions
 * - Color contrast validation
 * - Screen reader support
 * - Skip navigation links
 */

// Types
export * from './types';

// Focus management
export { FocusManager, focusManager } from './FocusManager';

// Keyboard navigation
export { KeyboardNavManager, keyboardNavManager } from './KeyboardNavManager';

// ARIA management
export { AriaManager, ariaManager } from './AriaManager';

// Live regions
export {
  LiveRegion,
  LiveRegionManager,
  Announce,
  useLiveRegion,
  withLiveRegion,
  VisuallyHidden,
  FocusBoundary,
  liveRegionStyles,
} from './LiveRegion';

// Color contrast checking
export { ColorContrastChecker, colorContrastChecker } from './ColorContrastChecker';

// Skip links
export {
  SkipLinks,
  SkipLinkButton,
  DEFAULT_SKIP_LINKS,
  useSkipLinks,
  withSkipLinks,
  SkipLinkContainer,
  useSkipLinkShortcuts,
} from './SkipLinks';

// Screen reader helpers
export {
  ScreenReaderHelper,
  screenReaderHelper,
  FormulaParser,
  useScreenReaderAnnouncements,
} from './ScreenReaderHelper';

// Convenience exports
export { default as LiveRegionComponent } from './LiveRegion';
export { default as SkipLinksComponent } from './SkipLinks';
