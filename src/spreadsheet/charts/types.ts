/**
 * POLLN Spreadsheet - Chart Types and Interfaces
 *
 * Comprehensive type definitions for the chart rendering engine.
 * Supports 10+ chart types with full TypeScript type safety.
 */

/**
 * Available chart types in the POLLN chart engine
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  CANDLESTICK = 'candlestick',
  AREA = 'area',
  RADAR = 'radar',
  HISTOGRAM = 'histogram',
  BOX_PLOT = 'box_plot',
  BUBBLE = 'bubble',
  FUNNEL = 'funnel',
  GAUGE = 'gauge',
  TREEMAP = 'treemap',
  WATERFALL = 'waterfall',
}

/**
 * Axis types for scaling
 */
export enum AxisType {
  LINEAR = 'linear',
  LOGARITHMIC = 'logarithmic',
  TIME = 'time',
  CATEGORY = 'category',
  ORDINAL = 'ordinal',
}

/**
 * Chart position types
 */
export enum ChartPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  CENTER = 'center',
}

/**
 * Interaction modes
 */
export enum InteractionMode {
  NONE = 'none',
  HOVER = 'hover',
  CLICK = 'click',
  BRUSH = 'brush',
  ZOOM = 'zoom',
  PAN = 'pan',
  SELECT = 'select',
}

/**
 * Export formats
 */
export enum ExportFormat {
  PNG = 'png',
  SVG = 'svg',
  PDF = 'pdf',
  JPEG = 'jpeg',
  WEBP = 'webp',
}

/**
 * Data point interface
 */
export interface DataPoint {
  x: number | string | Date;
  y: number;
  z?: number; // For bubble charts, 3D plots
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chart dataset
 */
export interface ChartDataset {
  label: string;
  data: DataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderDash?: number[];
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
  fill?: boolean | string;
  tension?: number; // For line charts (0-1)
  yAxisID?: string; // For multiple y-axes
  xAxisID?: string; // For multiple x-axes
  hidden?: boolean; // For legend toggle
  order?: number; // Drawing order
  metadata?: Record<string, unknown>;
}

/**
 * Chart data structure
 */
export interface ChartData {
  datasets: ChartDataset[];
  labels?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  secondaryYAxisLabel?: string;
}

/**
 * Cell binding for reactive updates
 */
export interface CellBinding {
  cellId: string;
  property: 'data' | 'labels' | 'title' | 'options';
  transform?: (value: unknown) => unknown;
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  id: string;
  type: AxisType;
  position: ChartPosition;
  display?: boolean;
  title?: string;
  min?: number | Date;
  max?: number | Date;
  ticks?: {
    display?: boolean;
    color?: string;
    font?: {
      family?: string;
      size?: number;
      weight?: string;
    };
    padding?: number;
    callback?: (value: number | Date, index: number, values: number[] | Date[]) => string;
    maxTicksLimit?: number;
    stepSize?: number;
    autoSkip?: boolean;
    maxRotation?: number;
    minRotation?: number;
  };
  grid?: {
    display?: boolean;
    color?: string | string[];
    borderWidth?: number;
    borderDash?: number[];
    drawBorder?: boolean;
  };
  scaleLabel?: {
    display?: boolean;
    labelString?: string;
  };
  reversed?: boolean;
  stacked?: boolean;
}

/**
 * Legend configuration
 */
export interface LegendConfig {
  display?: boolean;
  position?: ChartPosition;
  align?: 'start' | 'center' | 'end';
  fullWidth?: boolean;
  reverse?: boolean;
  labels?: {
    boxWidth?: number;
    boxHeight?: number;
    padding?: number;
    font?: {
      family?: string;
      size?: number;
      weight?: string;
    };
    color?: string;
    generateLabels?: (chart: Chart) => LegendItem[];
    filter?: (item: LegendItem, data: ChartData) => boolean;
  };
  onClick?: (event: MouseEvent, item: LegendItem, legend: Legend) => void;
  onHover?: (event: MouseEvent, item: LegendItem, legend: Legend) => void;
  onLeave?: (event: MouseEvent, item: LegendItem, legend: Legend) => void;
}

/**
 * Legend item
 */
export interface LegendItem {
  text: string;
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  hidden?: boolean;
  index: number;
  datasetIndex: number;
}

/**
 * Tooltip configuration
 */
export interface TooltipConfig {
  enabled?: boolean;
  mode?: 'single' | 'multi' | 'nearest' | 'index' | 'dataset' | 'point' | 'x' | 'y';
  intersect?: boolean;
  position?: 'average' | 'nearest';
  backgroundColor?: string | string[];
  titleColor?: string;
  titleFont?: {
    family?: string;
    size?: number;
    weight?: string;
  };
  bodyColor?: string;
  bodyFont?: {
    family?: string;
    size?: number;
    weight?: string;
  };
  padding?: number;
  cornerRadius?: number;
  displayColors?: boolean;
  boxWidth?: number;
  boxHeight?: number;
  borderColor?: string;
  borderWidth?: number;
  callbacks?: {
    title?: (tooltipItems: TooltipItem[]) => string | string[];
    beforeLabel?: (tooltipItem: TooltipItem) => string;
    label?: (tooltipItem: TooltipItem) => string;
    afterLabel?: (tooltipItem: TooltipItem) => string;
    beforeBody?: (tooltipItems: TooltipItem[]) => string;
    afterBody?: (tooltipItems: TooltipItem[]) => string;
    footer?: (tooltipItems: TooltipItem[]) => string | string[];
  };
  filter?: (tooltipItem: TooltipItem) => boolean;
  external?: (context: TooltipContext) => void;
}

/**
 * Tooltip item
 */
export interface TooltipItem {
  label: string;
  value: string | number;
  datasetIndex: number;
  index: number;
  dataPoint: DataPoint;
  formattedValue?: string;
}

/**
 * Tooltip context
 */
export interface TooltipContext {
  tooltip: {
    x: number;
    y: number;
    width: number;
    height: number;
    caretX: number;
    caretY: number;
  };
  dataPoints: TooltipItem[];
  title: string[];
  body: string[];
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic' |
           'easeOutCubic' | 'easeInOutCubic' | 'easeInQuart' | 'easeOutQuart' |
           'easeInOutQuart' | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint';
  delay?: number;
  onProgress?: (animation: AnimationEvent) => void;
  onComplete?: (animation: AnimationEvent) => void;
}

/**
 * Animation event
 */
export interface AnimationEvent {
  chart: Chart;
  currentStep: number;
  numSteps: number;
  initial: boolean;
  duration: number;
}

/**
 * Interaction configuration
 */
export interface InteractionConfig {
  mode?: InteractionMode;
  intersect?: boolean;
  axis?: 'x' | 'y' | 'xy' | 'r';
  includeInvisible?: boolean;
}

/**
 * Plugin interface for extending chart functionality
 */
export interface ChartPlugin {
  id: string;
  beforeInit?: (chart: Chart) => void;
  afterInit?: (chart: Chart) => void;
  beforeUpdate?: (chart: Chart) => void;
  afterUpdate?: (chart: Chart) => void;
  beforeRender?: (chart: Chart) => void;
  afterRender?: (chart: Chart) => void;
  beforeDraw?: (chart: Chart) => void;
  afterDraw?: (chart: Chart) => void;
  beforeEvent?: (chart: Chart, event: Event) => void;
  afterEvent?: (chart: Chart, event: Event) => void;
  resize?: (chart: Chart, size: { width: number; height: number }) => void;
  destroy?: (chart: Chart) => void;
}

/**
 * Chart export options
 */
export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  quality?: number; // For JPEG, WEBP (0-1)
  backgroundColor?: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

/**
 * Chart render context
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
  chartArea: ChartArea;
  xAxisArea: AxisArea;
  yAxisArea: AxisArea;
  secondaryYAxisArea?: AxisArea;
  data: ChartData;
}

/**
 * Chart area dimensions
 */
export interface ChartArea {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Axis area dimensions
 */
export interface AxisArea {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Chart options
 */
export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
  width?: number;
  height?: number;
  padding?: number | { top?: number; left?: number; right?: number; bottom?: number };
  title?: {
    display?: boolean;
    text?: string | string[];
    color?: string;
    font?: {
      family?: string;
      size?: number;
      weight?: string;
      style?: string;
    };
    padding?: number;
    position?: ChartPosition;
  };
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  animation?: AnimationConfig;
  interaction?: InteractionConfig;
  plugins?: ChartPlugin[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  secondaryYAxis?: AxisConfig;
  xAxes?: AxisConfig[];
  yAxes?: AxisConfig[];
  scales?: {
    [key: string]: AxisConfig;
  };
  elements?: {
    point?: {
      radius?: number;
      hoverRadius?: number;
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
    };
    line?: {
      tension?: number;
      borderWidth?: number;
      borderColor?: string;
      backgroundColor?: string;
    };
    rectangle?: {
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
    };
    arc?: {
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
    };
  };
  layout?: {
    padding?: number | { top?: number; left?: number; right?: number; bottom?: number };
  };
}

/**
 * Main chart configuration
 */
export interface ChartConfig {
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  bindings?: CellBinding[];
  id?: string;
  className?: string;
}

/**
 * Chart instance interface
 */
export interface Chart {
  id: string;
  config: ChartConfig;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  data: ChartData;
  options: ChartOptions;
  render(): void;
  update(): void;
  resize(width?: number, height?: number): void;
  destroy(): void;
  getDatasetMeta(index: number): DatasetMeta;
  getElementsAtEventForMode(e: Event, mode: InteractionMode, options: InteractionConfig): ChartElement[];
  setDatasetVisibility(datasetIndex: number, visible: boolean): void;
  toggleDataVisibility(index: number): void;
  getDataVisibility(index: number): boolean;
}

/**
 * Dataset metadata
 */
export interface DatasetMeta {
  type: ChartType;
  index: number;
  order: number;
  label: string;
  visible: boolean;
  data: DataPoint[];
  x: number[];
  y: number[];
  _dataset: ChartDataset;
}

/**
 * Chart element for interaction
 */
export interface ChartElement {
  datasetIndex: number;
  index: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  inRange(mouseX: number, mouseY: number): boolean;
  inXRange(mouseX: number): boolean;
  inYRange(mouseY: number): boolean;
  getCenterPoint(): { x: number; y: number };
  tooltipPosition(): { x: number; y: number };
}

/**
 * Legend interface
 */
export interface Legend {
  chart: Chart;
  config: LegendConfig;
  items: LegendItem[];
  build(): void;
  draw(): void;
  handleEvent(event: Event): void;
}

/**
 * Color scale for charts
 */
export interface ColorScale {
  type: 'sequential' | 'diverging' | 'categorical' | 'heatmap';
  colors: string[];
  domain?: [number, number];
  interpolate?: (t: number) => string;
  getColor(value: number): string;
}

/**
 * Theme configuration
 */
export interface ChartTheme {
  colors: {
    primary: string[];
    secondary: string[];
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
    gray: string[];
  };
  fonts: {
    family: string;
    size: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
  grid: {
    color: string;
    borderWidth: number;
  };
  background: {
    color: string;
  };
}

/**
 * Chart event types
 */
export type ChartEvent =
  | 'click'
  | 'hover'
  | 'mouseenter'
  | 'mouseleave'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'resize'
  | 'update'
  | 'complete'
  | 'beforeRender'
  | 'afterRender'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDraw'
  | 'afterDraw';

/**
 * Event handler type
 */
export type ChartEventHandler = (event: Event, chart: Chart, element?: ChartElement) => void;

/**
 * Chart event map
 */
export interface ChartEventMap {
  [event: string]: ChartEventHandler[];
} & {
  click?: ChartEventHandler[];
  hover?: ChartEventHandler[];
  mouseleave?: ChartEventHandler[];
  touchstart?: ChartEventHandler[];
  touchmove?: ChartEventHandler[];
  touchend?: ChartEventHandler[];
  resize?: ChartEventHandler[];
  update?: ChartEventHandler[];
  complete?: ChartEventHandler[];
  beforeRender?: ChartEventHandler[];
  afterRender?: ChartEventHandler[];
  beforeUpdate?: ChartEventHandler[];
  afterUpdate?: ChartEventHandler[];
  beforeDraw?: ChartEventHandler[];
  afterDraw?: ChartEventHandler[];
}
