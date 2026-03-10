/**
 * Advanced Data Visualization Components for POLLN
 *
 * This module exports all advanced visualization components for use in
 * the POLLN spreadsheet system. Each component is designed to work with
 * LogCell data and provides comprehensive interactive features.
 *
 * @module visualizations
 */

// ============================================================================
// Registry and Core Types
// ============================================================================

export {
  VisualizationRegistry,
  visualizationRegistry,
  type VisualizationData,
  type DataAdapter,
  type VisualizationConfig,
  type VisualizationType,
  type VisualizationMetadata,
  type AnimationConfig,
  type InteractionConfig,
  type ScaleConfig,
  type PluginConfig,
  // Built-in Adapters
  NumericArrayAdapter,
  TimeSeriesAdapter,
  CategoricalAdapter,
  MatrixAdapter,
  NetworkAdapter,
  HierarchicalAdapter,
} from './VisualizationRegistry';

// ============================================================================
// Network Visualization
// ============================================================================

export { default as NetworkGraph } from './NetworkGraph';
export type { NetworkNode, NetworkLink } from './NetworkGraph';

// ============================================================================
// Heatmap Visualization
// ============================================================================

export { default as Heatmap } from './Heatmap';
export type { HeatmapDataPoint, ColorScale, InterpolationMethod } from './Heatmap';

// ============================================================================
// Sankey Diagram
// ============================================================================

export { default as SankeyDiagram } from './SankeyDiagram';
export type { SankeyNode, SankeyLink, SankeyData } from './SankeyDiagram';

// ============================================================================
// Parallel Coordinates
// ============================================================================

export { default as ParallelCoordinates } from './ParallelCoordinates';
export type { DataPoint as ParallelDataPoint, AxisConfig } from './ParallelCoordinates';

// ============================================================================
// Treemap
// ============================================================================

export { default as Treemap } from './Treemap';
export type { TreemapNode } from './Treemap';

// ============================================================================
// Radar Chart
// ============================================================================

export { default as RadarChart } from './RadarChart';
export type { RadarAxis, RadarSeries } from './RadarChart';

// ============================================================================
// 3D Scatter Plot
// ============================================================================

export { default as ScatterPlot3D } from './ScatterPlot3D';
export type { Point3D, Scatter3DSeries, RegressionPlane, ColorDimension } from './ScatterPlot3D';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Common visualization props interface
 * All visualizations should support these basic properties
 */
export interface CommonVisualizationProps {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Accessibility label */
  'aria-label'?: string;
}

/**
 * Interactive visualization props
 * Visualizations that support user interaction
 */
export interface InteractiveVisualizationProps extends CommonVisualizationProps {
  /** Enable zoom functionality */
  enableZoom?: boolean;
  /** Enable drag/pan functionality */
  enableDrag?: boolean;
  /** Click handler */
  onClick?: (data: any) => void;
  /** Hover handler */
  onHover?: (data: any | null) => void;
}

/**
 * Animated visualization props
 * Visualizations that support animation
 */
export interface AnimatedVisualizationProps extends CommonVisualizationProps {
  /** Enable animations */
  enableAnimation?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Animation easing function */
  animationEasing?: string;
}

// ============================================================================
// Visualization Factory
// ============================================================================

/**
 * Visualization factory function
 * Creates the appropriate visualization component based on data type
 */
export function createVisualization(type: string, props: any): React.FC<any> {
  switch (type) {
    case 'network':
    case 'graph':
      return require('./NetworkGraph').default;
    case 'heatmap':
      return require('./Heatmap').default;
    case 'sankey':
      return require('./SankeyDiagram').default;
    case 'parallel':
    case 'parallel-coordinates':
      return require('./ParallelCoordinates').default;
    case 'treemap':
      return require('./Treemap').default;
    case 'radar':
    case 'radar-chart':
      return require('./RadarChart').default;
    case 'scatter3d':
    case '3d-scatter':
      return require('./ScatterPlot3D').default;
    default:
      throw new Error(`Unknown visualization type: ${type}`);
  }
}

/**
 * Get available visualization types
 */
export function getAvailableVisualizations(): string[] {
  return ['network', 'heatmap', 'sankey', 'parallel', 'treemap', 'radar', 'scatter3d'];
}

/**
 * Get visualization metadata
 */
export function getVisualizationMetadata(type: string): any {
  const metadata: Record<string, any> = {
    network: {
      name: 'Network Graph',
      description: 'Force-directed graph for network data',
      category: 'network',
      dataStructure: 'nodes and links',
    },
    heatmap: {
      name: 'Heatmap',
      description: '2D density visualization',
      category: 'statistical',
      dataStructure: '2D array or matrix',
    },
    sankey: {
      name: 'Sankey Diagram',
      description: 'Flow visualization',
      category: 'flow',
      dataStructure: 'nodes and links with values',
    },
    parallel: {
      name: 'Parallel Coordinates',
      description: 'Multi-dimensional data visualization',
      category: 'scientific',
      dataStructure: 'array of multi-dimensional points',
    },
    treemap: {
      name: 'Treemap',
      description: 'Hierarchical data visualization',
      category: 'hierarchical',
      dataStructure: 'nested tree structure',
    },
    radar: {
      name: 'Radar Chart',
      description: 'Multi-variable comparison',
      category: 'comparison',
      dataStructure: 'series with multiple axes',
    },
    scatter3d: {
      name: '3D Scatter Plot',
      description: 'Three-dimensional point cloud',
      category: 'scientific',
      dataStructure: 'array of 3D points',
    },
  };

  return metadata[type];
}

// ============================================================================
// Default Exports
// ============================================================================

export default {
  // Registry
  VisualizationRegistry,
  visualizationRegistry,

  // Components
  NetworkGraph,
  Heatmap,
  SankeyDiagram,
  ParallelCoordinates,
  Treemap,
  RadarChart,
  ScatterPlot3D,

  // Utilities
  createVisualization,
  getAvailableVisualizations,
  getVisualizationMetadata,
};
