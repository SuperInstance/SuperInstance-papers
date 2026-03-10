/**
 * POLLN Spreadsheet UI - Components Export
 *
 * Wave 4 UI Components implementation.
 */

export { CellRenderer, CellRendererWithTooltip } from './CellRenderer.js';
export { default as CellInspector } from './CellInspector.js';
export { GridDisplay, GridDisplayWithSensations } from './GridDisplay.js';

// Natural Language UI Components
export { QueryBar } from './QueryBar.js';
export { ExplanationPanel, CellExplanationCard } from './ExplanationPanel.js';

// Responsive Components (Wave 4)
export {
  ResponsiveGrid,
  MobileToolbar,
  AdaptiveRenderer,
  TouchEditor,
  ResponsiveContainer,
  useBreakpoint,
  useTouchGestures,
  useViewportSize,
  useMediaQuery,
  useResponsiveValue,
  BreakpointUtils,
} from '../responsive/index.js';

// Cell Garden Visualization
export {
  CellGarden,
  createCellGarden,
} from '../features/cell-garden/CellGarden.js';
export {
  ForceDirectedLayout,
  CircularLayout,
  HierarchicalLayout,
  GridLayout,
  SpatialLayout,
  LayoutFactory,
  LayoutType,
} from '../features/cell-garden/NetworkLayout.js';
export {
  GardenRenderer,
  WebGLGardenRenderer,
} from '../features/cell-garden/GardenRenderer.js';
export {
  GardenControls,
  GardenTooltip,
  DEFAULT_FILTERS,
} from '../features/cell-garden/GardenControls.js';

export type { GridCell } from './GridDisplay.js';
export type { QueryBarProps } from './QueryBar.js';
export type { ExplanationPanelProps, CellExplanationCardProps } from './ExplanationPanel.js';

export type {
  ResponsiveCellData,
  ResponsiveGridProps,
  ResponsiveGridConfig,
  MobileToolbarProps,
  MobileToolbarConfig,
  QuickAction,
  NavItem,
  AdaptiveRendererProps,
  AdaptiveRendererConfig,
  TouchEditorProps,
  TouchEditorConfig,
  ResponsiveContainerProps,
  ResponsiveContainerConfig,
  Breakpoint,
  BreakpointConfig,
  ViewportSize,
  DeviceOrientation,
  SwipeDirection,
  TouchGestures,
  TouchGestureConfig,
  DisplayMode,
  GridViewport,
  ZoomState,
  PanState,
} from '../responsive/types.js';

export type {
  CellData,
  CellConnection,
  CellGardenConfig,
} from '../features/cell-garden/CellGarden.js';
export type {
  LayoutNode,
  LayoutLink,
  LayoutOptions,
} from '../features/cell-garden/NetworkLayout.js';
export type {
  RenderOptions,
} from '../features/cell-garden/GardenRenderer.js';
export type {
  GardenControlsConfig,
  CellFilters,
  TooltipContent,
} from '../features/cell-garden/GardenControls.js';
