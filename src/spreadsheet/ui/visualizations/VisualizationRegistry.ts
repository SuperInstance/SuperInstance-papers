/**
 * VisualizationRegistry - Central registry for all visualization types
 *
 * Manages available visualizations, data adapters, and rendering pipeline.
 * Provides factory methods for creating visualizations from cell data.
 */

import { LogCell } from '../../types/LogCell';

// ============================================================================
// Type Definitions
// ============================================================================

export interface VisualizationData {
  labels: string[];
  datasets: {
    label: string;
    data: number[] | any[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    [key: string]: any;
  }[];
  metadata?: {
    [key: string]: any;
  };
}

export interface DataAdapter<T = any> {
  type: string;
  canHandle(cell: LogCell): boolean;
  adapt(cell: LogCell): T;
  validate(data: T): boolean;
}

export interface VisualizationConfig {
  type: VisualizationType;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    animation?: boolean | AnimationConfig;
    interaction?: InteractionConfig;
    scales?: ScaleConfig;
    plugins?: PluginConfig;
    [key: string]: any;
  };
  dataAdapter?: string;
}

export interface AnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  delay?: number;
}

export interface InteractionConfig {
  mode?: 'index' | 'dataset' | 'point' | 'nearest' | 'x' | 'y';
  intersect?: boolean;
  axis?: 'x' | 'y' | 'r' | 'xy';
}

export interface ScaleConfig {
  x?: any;
  y?: any;
  r?: any;
  [key: string]: any;
}

export interface PluginConfig {
  legend?: any;
  tooltip?: any;
  title?: any;
  [key: string]: any;
}

export type VisualizationType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'polarArea'
  | 'bubble'
  | 'scatter'
  | 'network'
  | 'heatmap'
  | 'sankey'
  | 'parallel'
  | 'treemap'
  | 'scatter3d';

export interface VisualizationMetadata {
  id: string;
  type: VisualizationType;
  name: string;
  description: string;
  category: 'basic' | 'statistical' | 'hierarchical' | 'network' | 'scientific';
  requirements: {
    minDataPoints?: number;
    maxDataPoints?: number;
    dimensions?: number;
    dataTypes?: string[];
  };
  capabilities: {
    animated: boolean;
    interactive: boolean;
    multiSeries: boolean;
    streaming: boolean;
    exportFormats: string[];
  };
  tags: string[];
}

// ============================================================================
// Built-in Data Adapters
// ============================================================================

/**
 * Default adapter for numeric array data
 */
export class NumericArrayAdapter implements DataAdapter<VisualizationData> {
  type = 'numeric-array';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    return Array.isArray(value) && value.every((v) => typeof v === 'number');
  }

  adapt(cell: LogCell): VisualizationData {
    const value = cell.getValue() as number[];
    return {
      labels: value.map((_, i) => `Point ${i + 1}`),
      datasets: [
        {
          label: cell.getName() || 'Data',
          data: value,
          borderColor: this.getRandomColor(),
          backgroundColor: this.getRandomColor(0.2),
        },
      ],
    };
  }

  validate(data: VisualizationData): boolean {
    return (
      data.labels.length > 0 &&
      data.datasets.length > 0 &&
      data.datasets.every((ds) => Array.isArray(ds.data) && ds.data.length > 0)
    );
  }

  private getRandomColor(alpha = 1): string {
    const hue = Math.random() * 360;
    return `hsla(${hue}, 70%, 50%, ${alpha})`;
  }
}

/**
 * Adapter for time series data
 */
export class TimeSeriesAdapter implements DataAdapter<VisualizationData> {
  type = 'time-series';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    if (!Array.isArray(value) || value.length === 0) return false;

    const firstItem = value[0];
    return (
      typeof firstItem === 'object' &&
      firstItem !== null &&
      'timestamp' in firstItem &&
      'value' in firstItem
    );
  }

  adapt(cell: LogCell): VisualizationData {
    const value = cell.getValue() as Array<{ timestamp: number | string; value: number }>;
    return {
      labels: value.map((v) => new Date(v.timestamp).toLocaleString()),
      datasets: [
        {
          label: cell.getName() || 'Time Series',
          data: value.map((v) => v.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
        },
      ],
      metadata: {
        timestamps: value.map((v) => v.timestamp),
      },
    };
  }

  validate(data: VisualizationData): boolean {
    return (
      data.labels.length > 0 &&
      data.datasets.length > 0 &&
      data.datasets.every((ds) => ds.data.length === data.labels.length)
    );
  }
}

/**
 * Adapter for categorical data
 */
export class CategoricalAdapter implements DataAdapter<VisualizationData> {
  type = 'categorical';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    if (!Array.isArray(value) || value.length === 0) return false;

    const firstItem = value[0];
    return (
      typeof firstItem === 'object' &&
      firstItem !== null &&
      'category' in firstItem &&
      'value' in firstItem
    );
  }

  adapt(cell: LogCell): VisualizationData {
    const value = cell.getValue() as Array<{ category: string; value: number }>;
    const colors = this.generateColors(value.length);

    return {
      labels: value.map((v) => v.category),
      datasets: [
        {
          label: cell.getName() || 'Categories',
          data: value.map((v) => v.value),
          backgroundColor: colors.backgrounds,
          borderColor: colors.borders,
        },
      ],
    };
  }

  validate(data: VisualizationData): boolean {
    return (
      data.labels.length > 0 &&
      data.datasets.length > 0 &&
      data.datasets.every((ds) => ds.data.length === data.labels.length)
    );
  }

  private generateColors(count: number): { backgrounds: string[]; borders: string[] } {
    const backgrounds: string[] = [];
    const borders: string[] = [];

    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count;
      backgrounds.push(`hsla(${hue}, 70%, 60%, 0.6)`);
      borders.push(`hsla(${hue}, 70%, 50%, 1)`);
    }

    return { backgrounds, borders };
  }
}

/**
 * Adapter for matrix data (for heatmaps)
 */
export class MatrixAdapter implements DataAdapter<VisualizationData> {
  type = 'matrix';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      Array.isArray(value[0]) &&
      value[0].every((v: any) => typeof v === 'number')
    );
  }

  adapt(cell: LogCell): VisualizationData {
    const value = cell.getValue() as number[][];
    const rows = value.length;
    const cols = value[0].length;

    // Flatten for compatibility
    const flatData = value.flat();

    return {
      labels: Array.from({ length: cols }, (_, i) => `Col ${i + 1}`),
      datasets: [
        {
          label: cell.getName() || 'Matrix',
          data: flatData,
          metadata: {
            dimensions: { rows, cols },
            originalMatrix: value,
          },
        },
      ],
      metadata: {
        rows,
        cols,
        rowLabels: Array.from({ length: rows }, (_, i) => `Row ${i + 1}`),
      },
    };
  }

  validate(data: VisualizationData): boolean {
    return data.datasets.length > 0 && data.datasets[0].data.length > 0;
  }
}

/**
 * Adapter for network/graph data
 */
export class NetworkAdapter implements DataAdapter<any> {
  type = 'network';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    return (
      typeof value === 'object' &&
      value !== null &&
      ('nodes' in value || 'edges' in value || 'links' in value)
    );
  }

  adapt(cell: LogCell): any {
    const value = cell.getValue() as any;

    // Normalize different network formats
    const nodes = value.nodes || value.vertices || [];
    const edges = value.edges || value.links || value.connections || [];

    return {
      nodes: nodes.map((node: any, id: number) => ({
        id: node.id || `node-${id}`,
        label: node.label || node.name || `Node ${id}`,
        value: node.value || node.size || 1,
        group: node.group || node.category || 'default',
        metadata: node,
      })),
      links: edges.map((edge: any, id: number) => ({
        id: `edge-${id}`,
        source: edge.source || edge.from,
        target: edge.target || edge.to,
        value: edge.value || edge.weight || 1,
        label: edge.label,
        metadata: edge,
      })),
      metadata: {
        directed: value.directed || false,
        weighted: value.weighted || false,
      },
    };
  }

  validate(data: any): boolean {
    return (
      data.nodes &&
      Array.isArray(data.nodes) &&
      data.links &&
      Array.isArray(data.links) &&
      data.nodes.length > 0
    );
  }
}

/**
 * Adapter for hierarchical data (for treemaps)
 */
export class HierarchicalAdapter implements DataAdapter<any> {
  type = 'hierarchical';

  canHandle(cell: LogCell): boolean {
    const value = cell.getValue();
    const checkHierarchy = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      if ('children' in obj) return true;
      if ('value' in obj && 'name' in obj) return true;
      return false;
    };

    return checkHierarchy(value);
  }

  adapt(cell: LogCell): any {
    const value = cell.getValue();
    return this.normalizeHierarchy(value);
  }

  validate(data: any): boolean {
    return data && typeof data === 'object' && ('name' in data || 'children' in data);
  }

  private normalizeHierarchy(node: any, depth = 0): any {
    if (!node || typeof node !== 'object') {
      return { name: 'Unknown', value: 0 };
    }

    // If node has children, recursively normalize
    if (node.children && Array.isArray(node.children)) {
      return {
        name: node.name || node.label || `Level ${depth}`,
        children: node.children.map((child: any) => this.normalizeHierarchy(child, depth + 1)),
        value: node.value,
        metadata: node,
      };
    }

    // Leaf node
    return {
      name: node.name || node.label || 'Item',
      value: node.value || node.size || 1,
      metadata: node,
    };
  }
}

// ============================================================================
// Visualization Registry
// ============================================================================

export class VisualizationRegistry {
  private static instance: VisualizationRegistry;
  private adapters: Map<string, DataAdapter> = new Map();
  private visualizations: Map<VisualizationType, VisualizationMetadata> = new Map();

  private constructor() {
    this.registerDefaultAdapters();
    this.registerDefaultVisualizations();
  }

  static getInstance(): VisualizationRegistry {
    if (!VisualizationRegistry.instance) {
      VisualizationRegistry.instance = new VisualizationRegistry();
    }
    return VisualizationRegistry.instance;
  }

  // ------------------------------------------------------------------------
  // Adapter Management
  // ------------------------------------------------------------------------

  private registerDefaultAdapters(): void {
    this.registerAdapter(new NumericArrayAdapter());
    this.registerAdapter(new TimeSeriesAdapter());
    this.registerAdapter(new CategoricalAdapter());
    this.registerAdapter(new MatrixAdapter());
    this.registerAdapter(new NetworkAdapter());
    this.registerAdapter(new HierarchicalAdapter());
  }

  registerAdapter(adapter: DataAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(type: string): DataAdapter | undefined {
    return this.adapters.get(type);
  }

  findAdapter(cell: LogCell): DataAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(cell)) {
        return adapter;
      }
    }
    return undefined;
  }

  // ------------------------------------------------------------------------
  // Visualization Metadata
  // ------------------------------------------------------------------------

  private registerDefaultVisualizations(): void {
    this.registerVisualization({
      id: 'line',
      type: 'line',
      name: 'Line Chart',
      description: 'Display trends over time or ordered categories',
      category: 'basic',
      requirements: {
        minDataPoints: 2,
        dataTypes: ['numeric', 'time-series'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: true,
        streaming: true,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['trend', 'time', 'series'],
    });

    this.registerVisualization({
      id: 'bar',
      type: 'bar',
      name: 'Bar Chart',
      description: 'Compare values across categories',
      category: 'basic',
      requirements: {
        minDataPoints: 1,
        dataTypes: ['numeric', 'categorical'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: true,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['compare', 'category', 'distribution'],
    });

    this.registerVisualization({
      id: 'pie',
      type: 'pie',
      name: 'Pie Chart',
      description: 'Show proportions of a whole',
      category: 'basic',
      requirements: {
        minDataPoints: 1,
        maxDataPoints: 20,
        dataTypes: ['categorical'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['proportion', 'percentage', 'part-to-whole'],
    });

    this.registerVisualization({
      id: 'network',
      type: 'network',
      name: 'Network Graph',
      description: 'Visualize relationships and connections',
      category: 'network',
      requirements: {
        minDataPoints: 2,
        dataTypes: ['network', 'graph'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['graph', 'relationships', 'connections'],
    });

    this.registerVisualization({
      id: 'heatmap',
      type: 'heatmap',
      name: 'Heatmap',
      description: 'Display data density or intensity',
      category: 'statistical',
      requirements: {
        minDataPoints: 4,
        dataTypes: ['matrix', 'numeric'],
      },
      capabilities: {
        animated: false,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['density', 'intensity', 'matrix'],
    });

    this.registerVisualization({
      id: 'sankey',
      type: 'sankey',
      name: 'Sankey Diagram',
      description: 'Visualize flow and transformations',
      category: 'statistical',
      requirements: {
        minDataPoints: 3,
        dataTypes: ['network', 'flow'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['flow', 'transformation', 'sankey'],
    });

    this.registerVisualization({
      id: 'parallel',
      type: 'parallel',
      name: 'Parallel Coordinates',
      description: 'Multi-dimensional data visualization',
      category: 'scientific',
      requirements: {
        minDataPoints: 2,
        dimensions: 3,
        dataTypes: ['numeric', 'multi-dimensional'],
      },
      capabilities: {
        animated: false,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['multi-dimensional', 'parallel', 'coordinates'],
    });

    this.registerVisualization({
      id: 'treemap',
      type: 'treemap',
      name: 'Treemap',
      description: 'Hierarchical data display',
      category: 'hierarchical',
      requirements: {
        minDataPoints: 1,
        dataTypes: ['hierarchical', 'nested'],
      },
      capabilities: {
        animated: true,
        interactive: true,
        multiSeries: false,
        streaming: false,
        exportFormats: ['png', 'svg', 'json'],
      },
      tags: ['hierarchy', 'nested', 'tree'],
    });

    this.registerVisualization({
      id: 'scatter3d',
      type: 'scatter3d',
      name: '3D Scatter Plot',
      description: 'Three-dimensional data visualization',
      category: 'scientific',
      requirements: {
        minDataPoints: 2,
        dimensions: 3,
        dataTypes: ['numeric', '3d'],
      },
      capabilities: {
        animated: false,
        interactive: true,
        multiSeries: true,
        streaming: false,
        exportFormats: ['png', 'json'],
      },
      tags: ['3d', 'scatter', 'three-dimensional'],
    });
  }

  registerVisualization(metadata: VisualizationMetadata): void {
    this.visualizations.set(metadata.type, metadata);
  }

  getVisualization(type: VisualizationType): VisualizationMetadata | undefined {
    return this.visualizations.get(type);
  }

  getAllVisualizations(): VisualizationMetadata[] {
    return Array.from(this.visualizations.values());
  }

  getVisualizationsByCategory(category: VisualizationMetadata['category']): VisualizationMetadata[] {
    return Array.from(this.visualizations.values()).filter((v) => v.category === category);
  }

  // ------------------------------------------------------------------------
  // Visualization Factory
  // ------------------------------------------------------------------------

  createVisualization(cell: LogCell, config: VisualizationConfig): any {
    // Find appropriate adapter
    const adapter = config.dataAdapter
      ? this.getAdapter(config.dataAdapter)
      : this.findAdapter(cell);

    if (!adapter) {
      throw new Error(`No adapter found for cell ${cell.getName()}`);
    }

    // Adapt data
    const adaptedData = adapter.adapt(cell);

    // Validate adapted data
    if (!adapter.validate(adaptedData)) {
      throw new Error(`Data validation failed for cell ${cell.getName()}`);
    }

    // Get visualization metadata
    const vizMetadata = this.getVisualization(config.type);
    if (!vizMetadata) {
      throw new Error(`Unknown visualization type: ${config.type}`);
    }

    // Return complete visualization config
    return {
      type: config.type,
      data: adaptedData,
      options: this.mergeDefaultOptions(config.type, config.options),
      metadata: vizMetadata,
    };
  }

  suggestVisualizations(cell: LogCell): VisualizationMetadata[] {
    const adapter = this.findAdapter(cell);
    if (!adapter) {
      return [];
    }

    const adaptedData = adapter.adapt(cell);
    const suggestions: VisualizationMetadata[] = [];

    for (const viz of this.visualizations.values()) {
      // Check if visualization meets requirements
      if (this.meetsRequirements(viz, adaptedData)) {
        suggestions.push(viz);
      }
    }

    // Sort by relevance
    return suggestions.sort((a, b) => this.calculateRelevance(b, adaptedData) - this.calculateRelevance(a, adaptedData));
  }

  // ------------------------------------------------------------------------
  // Rendering Pipeline
  // ------------------------------------------------------------------------

  async renderVisualization(container: HTMLElement, config: any): Promise<void> {
    const { type, data, options } = config;

    // Clear container
    container.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Apply accessibility attributes
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', options?.title?.text || `${type} chart`);

    // Render based on type
    // This would integrate with actual rendering libraries (Chart.js, D3, etc.)
    // Implementation depends on chosen library
  }

  exportVisualization(config: any, format: string): Blob | string {
    const { type, data, options } = config;

    switch (format) {
      case 'json':
        return JSON.stringify({ type, data, options }, null, 2);

      case 'csv':
        return this.exportToCSV(data);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // ------------------------------------------------------------------------
  // Private Helpers
  // ------------------------------------------------------------------------

  private mergeDefaultOptions(type: VisualizationType, userOptions?: any): any {
    const defaults: Record<VisualizationType, any> = {
      line: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          tooltip: {
            enabled: true,
          },
        },
      },
      bar: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
      pie: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right' as const,
          },
        },
      },
      network: {
        responsive: true,
        maintainAspectRatio: false,
      },
      heatmap: {
        responsive: true,
        maintainAspectRatio: false,
      },
      sankey: {
        responsive: true,
        maintainAspectRatio: false,
      },
      parallel: {
        responsive: true,
        maintainAspectRatio: false,
      },
      treemap: {
        responsive: true,
        maintainAspectRatio: false,
      },
      scatter3d: {
        responsive: true,
        maintainAspectRatio: false,
      },
      radar: {
        responsive: true,
        maintainAspectRatio: false,
      },
      doughnut: {
        responsive: true,
        maintainAspectRatio: false,
      },
      polarArea: {
        responsive: true,
        maintainAspectRatio: false,
      },
      bubble: {
        responsive: true,
        maintainAspectRatio: false,
      },
      scatter: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };

    return {
      ...defaults[type],
      ...userOptions,
    };
  }

  private meetsRequirements(viz: VisualizationMetadata, data: any): boolean {
    const { requirements } = viz;

    if (requirements.minDataPoints && data.labels && data.labels.length < requirements.minDataPoints) {
      return false;
    }

    if (requirements.maxDataPoints && data.labels && data.labels.length > requirements.maxDataPoints) {
      return false;
    }

    return true;
  }

  private calculateRelevance(viz: VisualizationMetadata, data: any): number {
    let score = 0;

    // Prefer visualizations that match data structure
    if (viz.tags.includes('time-series') && data.metadata?.timestamps) {
      score += 10;
    }

    if (viz.tags.includes('hierarchy') && data.metadata?.hierarchical) {
      score += 10;
    }

    if (viz.tags.includes('network') && (data.nodes || data.links)) {
      score += 10;
    }

    // Prefer interactive visualizations
    if (viz.capabilities.interactive) {
      score += 5;
    }

    return score;
  }

  private exportToCSV(data: VisualizationData): string {
    const rows: string[] = [];

    // Header
    rows.push(['Label', ...data.datasets.map((ds) => ds.label)].join(','));

    // Data rows
    for (let i = 0; i < data.labels.length; i++) {
      const row = [data.labels[i]];
      for (const ds of data.datasets) {
        row.push(String(ds.data[i] ?? ''));
      }
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const visualizationRegistry = VisualizationRegistry.getInstance();
