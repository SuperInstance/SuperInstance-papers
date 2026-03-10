/**
 * POLLN Spreadsheet - Chart Rendering Engine
 *
 * A comprehensive chart rendering system for POLLN spreadsheets.
 * Supports 15+ chart types with canvas-based rendering, reactive updates,
 * animations, export functionality, and rich interactions.
 *
 * @module spreadsheet/charts
 */

// Main exports
export { ChartRenderer, renderChart, updateChart, exportChart, destroyChart } from './ChartRenderer.js';

// Chart types
export {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  CandlestickChart,
  AreaChart,
  RadarChart,
  HistogramChart,
  BoxPlotChart,
  BubbleChart,
  FunnelChart,
  GaugeChart,
  TreemapChart,
  WaterfallChart,
  type ChartTypeRenderer,
} from './ChartTypes.js';

// Managers
export { AxisManager } from './AxisManager.js';
export { LegendManager, generateDatasetColors, generateColorScale, generateDivergingColorScale } from './LegendManager.js';
export { TooltipManager, TooltipFormatters } from './TooltipManager.js';
export { InteractionManager, InteractionHelpers } from './InteractionManager.js';
export { ExportManager, ExportHelpers } from './ExportManager.js';

// Types
export {
  // Enums
  ChartType,
  AxisType,
  ChartPosition,
  InteractionMode,
  ExportFormat,

  // Core interfaces
  DataPoint,
  ChartDataset,
  ChartData,
  CellBinding,
  AxisConfig,
  LegendConfig,
  LegendItem,
  TooltipConfig,
  TooltipItem,
  TooltipContext,
  AnimationConfig,
  AnimationEvent,
  InteractionConfig,
  ChartPlugin,

  // Export interfaces
  ExportOptions,

  // Render interfaces
  Chart,
  ChartConfig,
  ChartOptions,
  RenderContext,
  ChartArea,
  AxisArea,

  // Metadata interfaces
  DatasetMeta,
  ChartElement,
  Legend,

  // Theme interfaces
  ColorScale,
  ChartTheme,

  // Event interfaces
  ChartEvent,
  ChartEventHandler,
  ChartEventMap,
} from './types.js';

// Re-export types for convenience
export type {
  ChartType as ChartTypeEnum,
  AxisType as AxisTypeEnum,
  ChartPosition as ChartPositionEnum,
  InteractionMode as InteractionModeEnum,
  ExportFormat as ExportFormatEnum,
};

/**
 * Quick start example:
 *
 * ```typescript
 * import { renderChart, ChartType, ChartData, ChartOptions } from '@polln/spreadsheet/charts';
 *
 * const container = document.getElementById('chart-container');
 *
 * const data: ChartData = {
 *   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
 *   datasets: [{
 *     label: 'Sales',
 *     data: [
 *       { x: 'Jan', y: 100 },
 *       { x: 'Feb', y: 120 },
 *       { x: 'Mar', y: 90 },
 *       { x: 'Apr', y: 140 },
 *       { x: 'May', y: 160 },
 *     ],
 *     backgroundColor: '#2196F3',
 *     borderColor: '#1976D2',
 *   }],
 * };
 *
 * const options: ChartOptions = {
 *   responsive: true,
 *   maintainAspectRatio: true,
 *   title: {
 *     display: true,
 *     text: 'Monthly Sales',
 *   },
 *   legend: {
 *     display: true,
 *     position: ChartPosition.TOP,
 *   },
 *   tooltip: {
 *     enabled: true,
 *   },
 * };
 *
 * const renderer = renderChart(container, {
 *   type: ChartType.LINE,
 *   data,
 *   options,
 * });
 *
 * // Update with new data
 * renderer.update(newData);
 *
 * // Export to PNG
 * await renderer.exportChart({ format: ExportFormat.PNG });
 *
 * // Destroy when done
 * renderer.destroy();
 * ```
 */
