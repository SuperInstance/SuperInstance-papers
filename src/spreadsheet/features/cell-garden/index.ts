/**
 * Cell Garden Feature - Ecosystem Visualization
 *
 * Exports all components for visualizing cell networks
 * with interactive layouts and real-time rendering.
 */

// Main component
export { CellGarden, createCellGarden } from './CellGarden.js';
export type {
  CellData,
  CellConnection,
  CellGardenConfig,
} from './CellGarden.js';

// Layout algorithms
export {
  ForceDirectedLayout,
  CircularLayout,
  HierarchicalLayout,
  GridLayout,
  SpatialLayout,
  LayoutFactory,
  LayoutType,
} from './NetworkLayout.js';
export type {
  LayoutNode,
  LayoutLink,
  LayoutOptions,
} from './NetworkLayout.js';

// Rendering
export {
  GardenRenderer,
  WebGLGardenRenderer,
} from './GardenRenderer.js';
export type {
  RenderOptions,
} from './GardenRenderer.js';

// Controls
export {
  GardenControls,
  GardenTooltip,
  DEFAULT_FILTERS,
} from './GardenControls.js';
export type {
  GardenControlsConfig,
  CellFilters,
  TooltipContent,
} from './GardenControls.js';

// Re-export core types
export type {
  CellId,
  CellType,
  CellState,
  CellPosition,
} from '../../core/types.js';
