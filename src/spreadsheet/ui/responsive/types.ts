/**
 * POLLN Spreadsheet - Responsive UI Types
 *
 * Type definitions for responsive grid components and mobile interactions.
 * Comprehensive TypeScript types for all responsive UI features.
 */

import { CellType, CellState, LogicLevel } from '../../core/types';

/**
 * Breakpoint categories for responsive design
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Touch gesture directions
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Grid display modes based on device
 */
export type DisplayMode = 'full' | 'simplified' | 'card' | 'list';

/**
 * Orientation of the device
 */
export type DeviceOrientation = 'portrait' | 'landscape';

/**
 * View mode for mobile grid
 */
export type ViewMode = 'card' | 'list' | 'grid';

/**
 * Cell data for responsive display
 */
export interface ResponsiveCellData {
  id: string;
  position: { row: number; col: number };
  value: any;
  state: CellState;
  type: CellType;
  logicLevel: LogicLevel;
  confidence: number;
  timestamp: number;
  watching?: string[];
  sensations?: number;
}

/**
 * Responsive grid configuration
 */
export interface ResponsiveGridConfig {
  initialRowCount?: number;
  initialColCount?: number;
  enableTouchGestures?: boolean;
  enablePinchZoom?: boolean;
  enableSwipeNavigation?: boolean;
  enablePullToRefresh?: boolean;
  enableHapticFeedback?: boolean;
  enableInfiniteScroll?: boolean;
  infiniteScrollThreshold?: number;
  customCardRenderer?: (cell: ResponsiveCellData, mode: Breakpoint) => React.ReactNode;
  customToolbarRenderer?: (mode: Breakpoint) => React.ReactNode;
  performanceMode?: 'balanced' | 'performance' | 'quality';
}

/**
 * Props for ResponsiveGrid component
 */
export interface ResponsiveGridProps {
  cells: Map<string, ResponsiveCellData>;
  rows: number;
  cols: number;
  config?: ResponsiveGridConfig;
  mode?: Breakpoint;
  onModeChange?: (mode: Breakpoint) => void;
  onCellSelect?: (cellId: string, position: { row: number; col: number }) => void;
  onCellLongPress?: (cellId: string, position: { row: number; col: number }) => void;
  onCellDoubleClick?: (cellId: string) => void;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onSwipe?: (direction: SwipeDirection, cellId?: string) => void;
  onPinch?: (scale: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  selectedCellId?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Touch gesture configuration
 */
export interface TouchGestureConfig {
  element: HTMLElement | RefObject<HTMLElement>;
  onSwipe?: (direction: SwipeDirection) => void;
  onPinch?: (scale: number) => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onTap?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  preventDefault?: boolean;
}

/**
 * Touch gestures hook return value
 */
export interface TouchGestures {
  onSwipe: (direction: SwipeDirection) => void;
  onPinch: (scale: number) => void;
  onLongPress: () => void;
  onDoubleTap: () => void;
  isActive: boolean;
  reset: () => void;
}

/**
 * Breakpoint configuration
 */
export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

/**
 * Media query result
 */
export interface MediaQueryResult {
  matches: boolean;
  media: string;
}

/**
 * Viewport size
 */
export interface ViewportSize {
  width: number;
  height: number;
  orientation: DeviceOrientation;
}

/**
 * Mobile toolbar configuration
 */
export interface MobileToolbarConfig {
  position?: 'bottom' | 'top' | 'floating';
  collapsed?: boolean;
  contextAware?: boolean;
  floatingActionButton?: boolean;
  quickActions?: QuickAction[];
  navigationItems?: NavItem[];
}

/**
 * Quick action for toolbar
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  visible?: boolean | ((mode: Breakpoint) => boolean);
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Navigation item for toolbar
 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
  badge?: number | string;
  active?: boolean;
}

/**
 * Mobile toolbar props
 */
export interface MobileToolbarProps {
  config?: MobileToolbarConfig;
  mode?: Breakpoint;
  onAction?: (actionId: string) => void;
  onNavigate?: (itemId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Adaptive renderer configuration
 */
export interface AdaptiveRendererConfig {
  progressiveLoading?: boolean;
  lazyLoadImages?: boolean;
  virtualScrolling?: boolean;
  virtualScrollThreshold?: number;
  columnVisibility?: ColumnVisibilityConfig;
  rowVisibility?: RowVisibilityConfig;
}

/**
 * Column visibility configuration
 */
export interface ColumnVisibilityConfig {
  defaultVisible: boolean;
  breakpoints: Partial<Record<Breakpoint, boolean | string[]>>;
  priority?: number;
}

/**
 * Row visibility configuration
 */
export interface RowVisibilityConfig {
  defaultVisible: boolean;
  breakpoints: Partial<Record<Breakpoint, boolean | number[]>>;
  priority?: number;
}

/**
 * Adaptive renderer props
 */
export interface AdaptiveRendererProps {
  cells: Map<string, ResponsiveCellData>;
  rows: number;
  cols: number;
  mode: Breakpoint;
  config?: AdaptiveRendererConfig;
  onCellRender?: (cellId: string) => void;
  onViewportChange?: (viewport: { start: number; end: number }) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Touch editor configuration
 */
export interface TouchEditorConfig {
  keyboardMode?: 'auto' | 'numeric' | 'text' | 'formula';
  showFormulaBuilder?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Touch editor props
 */
export interface TouchEditorProps {
  cellId: string;
  initialValue?: any;
  mode: Breakpoint;
  config?: TouchEditorConfig;
  onSave?: (value: any) => void;
  onCancel?: () => void;
  onValidate?: (value: any) => boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Formula builder configuration
 */
export interface FormulaBuilderConfig {
  functions: FunctionDefinition[];
  categories: string[];
  showHelp?: boolean;
  showExamples?: boolean;
}

/**
 * Function definition for formula builder
 */
export interface FunctionDefinition {
  name: string;
  category: string;
  syntax: string;
  description: string;
  examples: string[];
  parameters: ParameterDefinition[];
}

/**
 * Parameter definition
 */
export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

/**
 * Responsive container configuration
 */
export interface ResponsiveContainerConfig {
  maxWidth?: number;
  fluid?: boolean;
  centerContent?: boolean;
  padding?: boolean;
  breakpointPadding?: Partial<Record<Breakpoint, string>>;
}

/**
 * Responsive container props
 */
export interface ResponsiveContainerProps {
  children: React.ReactNode;
  mode?: Breakpoint;
  config?: ResponsiveContainerConfig;
  onOrientationChange?: (orientation: DeviceOrientation) => void;
  onResize?: (size: ViewportSize) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Grid viewport state
 */
export interface GridViewport {
  firstRow: number;
  firstCol: number;
  lastRow: number;
  lastCol: number;
  visibleRows: number;
  visibleCols: number;
}

/**
 * Zoom state
 */
export interface ZoomState {
  level: number;
  min: number;
  max: number;
  step: number;
}

/**
 * Pan state
 */
export interface PanState {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  renderTime: number;
  fps: number;
  memoryUsage: number;
  cellCount: number;
  visibleCells: number;
}

/**
 * Accessibility props
 */
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  role?: string;
}

/**
 * Responsive state
 */
export interface ResponsiveState {
  mode: Breakpoint;
  orientation: DeviceOrientation;
  viewport: ViewportSize;
  zoom: ZoomState;
  pan: PanState;
  selectedCell?: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: Error | string;
}
