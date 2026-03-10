/**
 * Accessibility Types for POLLN Spreadsheets
 * WCAG 2.1 AA Compliant
 */

/**
 * ARIA attributes for accessible elements
 */
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-controls'?: string;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-keyshortcuts'?: string;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-pressed'?: boolean | 'mixed';
  'aria-readonly'?: boolean;
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-sort'?: 'ascending' | 'descending' | 'none' | 'other';
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  role?: string;
}

/**
 * Cell state for accessibility announcements
 */
export interface CellState {
  id: string;
  value: any;
  formula?: string;
  position: CellPosition;
  type: CellType;
  editable: boolean;
  selected: boolean;
  error?: string;
  changed?: boolean;
}

/**
 * Cell position in the grid
 */
export interface CellPosition {
  row: number;
  column: number;
  columnLabel: string; // A, B, C, etc.
}

/**
 * Cell types
 */
export type CellType =
  | 'input'
  | 'output'
  | 'transform'
  | 'filter'
  | 'aggregate'
  | 'validate'
  | 'analysis'
  | 'prediction'
  | 'decision'
  | 'explain';

/**
 * Focus trap configuration
 */
export interface FocusTrapConfig {
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  returnFocusOnDeactivate?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  initialFocus?: string | HTMLElement;
}

/**
 * Focus trap instance
 */
export interface FocusTrap {
  activate: () => void;
  deactivate: () => void;
  update: () => void;
  isActive: () => boolean;
}

/**
 * Keyboard navigation configuration
 */
export interface KeyboardNavConfig {
  arrowKeys?: boolean;
  homeEnd?: boolean;
  pageUpDown?: boolean;
  tabNavigation?: boolean;
  escape?: boolean;
  customBindings?: Record<string, () => void>;
}

/**
 * Navigation direction
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'first' | 'last' | 'pageUp' | 'pageDown';

/**
 * Color contrast result
 */
export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
  foreground: string;
  background: string;
}

/**
 * Color blindness type
 */
export type ColorBlindnessType =
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia'
  | 'protanomaly'
  | 'deuteranomaly'
  | 'tritanomaly'
  | 'achromatomaly';

/**
 * Screen reader announcement priority
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Live region message
 */
export interface LiveMessage {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

/**
 * Skip link configuration
 */
export interface SkipLink {
  id: string;
  label: string;
  target: string;
  hotkey?: string;
}

/**
 * Accessibility event
 */
export interface AccessibilityEvent {
  type: 'focus' | 'selection' | 'change' | 'error' | 'announcement';
  cellId?: string;
  data?: any;
  timestamp: number;
}
