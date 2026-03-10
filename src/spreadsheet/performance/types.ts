/**
 * POLLN Spreadsheet - Performance Monitoring Types
 *
 * Comprehensive type definitions for performance monitoring system.
 * Includes metrics, web vitals, benchmarks, and profiling types.
 */

/**
 * Core metric data structure
 */
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: 'ms' | 'bytes' | 'fps' | 'count' | 'percent';
}

/**
 * Time range for metric queries
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Aggregated metric statistics
 */
export interface MetricStatistics {
  name: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
}

/**
 * Web Vitals metrics (Core Web Vitals + additional)
 */
export interface WebVitals {
  fcp: number; // First Contentful Paint (ms)
  lcp: number; // Largest Contentful Paint (ms)
  cls: number; // Cumulative Layout Shift (score)
  fid: number; // First Input Delay (ms)
  tti: number; // Time to Interactive (ms)
  tbt: number; // Total Blocking Time (ms)
  inp: number; // Interaction to Next Paint (ms)
  lcpTarget: number; // Target: 2.5s
  clsTarget: number; // Target: 0.1
  fidTarget: number; // Target: 100ms
  ttiTarget: number; // Target: 3.8s
}

/**
 * Web Vitals rating
 */
export type WebVitalsRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Rated Web Vitals metric
 */
export interface RatedWebVital {
  name: string;
  value: number;
  rating: WebVitalsRating;
  target: number;
  timestamp: number;
}

/**
 * CPU profiling data
 */
export interface CPUProfile {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  samples: CPUSample[];
  nodes: ProfileNode[];
}

/**
 * Single CPU sample
 */
export interface CPUSample {
  timestamp: number;
  stackId: number;
}

/**
 * Profile node (function call)
 */
export interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount: number;
  children?: number[];
}

/**
 * Memory profiling data
 */
export interface MemoryProfile {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  leakedObjects?: number;
  memoryLeaks?: MemoryLeak[];
}

/**
 * Memory leak detection
 */
export interface MemoryLeak {
  objectId: number;
  size: number;
  type: string;
  retained: number;
}

/**
 * Network timing information
 */
export interface NetworkTiming {
  url: string;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  timing: {
    dns: number;
    tcp: number;
    tls: number;
    ttfb: number;
    download: number;
    total: number;
  };
  status: number;
  cacheHit: boolean;
}

/**
 * Long task detection
 */
export interface LongTask {
  startTime: number;
  duration: number;
  attribution?: LongTaskAttribution[];
}

/**
 * Long task attribution
 */
export interface LongTaskAttribution {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType?: 'window' | 'iframe' | 'embed';
  containerName?: string;
  containerId?: string;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryDelta: number;
  samples: number[];
  statistics: MetricStatistics;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Memory benchmark result
 */
export interface MemoryResult {
  name: string;
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryLeaked: number;
  garbageCollections: number;
  timestamp: number;
}

/**
 * Collaboration benchmark result
 */
export interface CollaborationResult {
  name: string;
  userCount: number;
  operationsPerUser: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  conflictsResolved: number;
  conflictsResolvedPerUser: number;
  timestamp: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  id: string;
  timestamp: number;
  duration: number;
  summary: PerformanceSummary;
  webVitals: RatedWebVital[];
  metrics: MetricStatistics[];
  benchmarks: BenchmarkResult[];
  profiles: {
    cpu?: CPUProfile;
    memory?: MemoryProfile[];
  };
  network: NetworkTiming[];
  longTasks: LongTask[];
  recommendations: Recommendation[];
  regressionAnalysis?: RegressionAnalysis;
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  score: number; // 0-100
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  bottleneck: string;
}

/**
 * Performance recommendation
 */
export interface Recommendation {
  type: 'critical' | 'warning' | 'info' | 'optimization';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  actionable: boolean;
}

/**
 * Regression analysis
 */
export interface RegressionAnalysis {
  hasRegression: boolean;
  regressions: Regression[];
  improvements: Regression[];
  baseline: BaselineMetrics;
  current: CurrentMetrics;
}

/**
 * Single regression
 */
export interface Regression {
  metric: string;
  baseline: number;
  current: number;
  changePercent: number;
  severity: 'critical' | 'major' | 'minor';
  confidence: number; // 0-1
}

/**
 * Baseline metrics
 */
export interface BaselineMetrics {
  timestamp: number;
  metrics: Record<string, number>;
}

/**
 * Current metrics
 */
export interface CurrentMetrics {
  timestamp: number;
  metrics: Record<string, number>;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  resolved: boolean;
  resolvedAt?: number;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metricName: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  window?: number; // time window in ms
  samples?: number; // number of samples
  severity: 'critical' | 'warning' | 'info';
  cooldown?: number; // minimum time between alerts in ms
}

/**
 * Performance trend
 */
export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  confidence: number;
  dataPoints: TrendDataPoint[];
  prediction?: TrendPrediction;
}

/**
 * Single trend data point
 */
export interface TrendDataPoint {
  timestamp: number;
  value: number;
  baseline?: number;
}

/**
 * Trend prediction
 */
export interface TrendPrediction {
  predictedValue: number;
  confidence: number;
  horizon: number; // time in ms
  willExceedThreshold?: boolean;
  thresholdExceededAt?: number;
}

/**
 * Flame graph data
 */
export interface FlameGraph {
  name: string;
  value: number;
  children: FlameGraph[];
}

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  id: string;
  timestamp: number;
  size: number;
  nodes: HeapNode[];
  strings: string[];
}

/**
 * Heap node
 */
export interface HeapNode {
  id: number;
  name: string;
  type: string;
  selfSize: number;
  edgeCount: number;
  children?: number[];
}

/**
 * Lighthouse CI configuration
 */
export interface LighthouseConfig {
  extends: 'lighthouse:default' | 'lighthouse:desktop';
  settings: {
    onlyCategories?: ('performance' | 'accessibility' | 'best-practices' | 'seo')[];
    formFactor?: 'desktop' | 'mobile';
    screenEmulation?: {
      mobile: boolean;
      width: number;
      height: number;
      deviceScaleFactor: number;
      disabled: boolean;
    };
    throttling?: {
      rttMs: number;
      throughputKbps: number;
      cpuSlowdownMultiplier: number;
      requestLatencyMs: number;
      downloadThroughputKbps: number;
      uploadThroughputKbps: number;
    };
    emulatedUserAgent?: string;
    budgets?: Array<{
      timingLevels: number[];
      resourceSizes: number[];
      resourceCounts: number[];
    }>;
  };
  assertions?: Record<
    string,
    {
      minScore?: number;
      maxNumericValue?: number;
      maxLength?: number;
    }
  >;
}

/**
 * Lighthouse CI result
 */
export interface LighthouseResult {
  version: string;
  url: string;
  timestamp: number;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: WebVitals;
  audits: Record<string, LighthouseAudit>;
  budgets?: BudgetResult[];
}

/**
 * Single Lighthouse audit
 */
export interface LighthouseAudit {
  score: number | null;
  displayValue?: string;
  explanation?: string;
  warnings?: string[];
  details?: {
    type: string;
    items: unknown[];
    headings: unknown[];
  };
}

/**
 * Budget result
 */
export interface BudgetResult {
  name: string;
  status: 'pass' | 'fail';
  size?: number;
  sizeBudget?: number;
  count?: number;
  countBudget?: number;
  overBudget?: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableMetrics: boolean;
  enableWebVitals: boolean;
  enableProfiling: boolean;
  enableNetworkTracking: boolean;
  enableLongTaskDetection: boolean;
  enableRegressionDetection: boolean;
  enableAlerts: boolean;
  alertThresholds: AlertThreshold[];
  baselineMetrics?: BaselineMetrics;
  samplingRate: number; // 0-1
  maxMemoryProfiles: number;
  maxCPUProfiles: number;
  retentionPeriod: number; // ms
  reportInterval: number; // ms
  lighthouseCI?: LighthouseConfig;
}
