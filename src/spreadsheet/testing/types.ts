/**
 * Type definitions for POLLN spreadsheet testing framework
 *
 * This file contains all the fundamental interfaces and types used across
 * the testing infrastructure.
 */

import {
  CellType,
  CellState,
  SensationType,
  LogicLevel,
  CellReference,
  CellPosition,
  CellId,
} from '../core/types.js';

/**
 * Test scenario configuration
 */
export interface TestScenario {
  name: string;
  description?: string;
  cells: CellConfig[];
  relationships: RelationshipConfig[];
  expectedBehaviors: ExpectedBehavior[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * Cell configuration for testing
 */
export interface CellConfig {
  id: CellId;
  type: CellType;
  position: CellPosition;
  value?: unknown;
  formula?: string;
  logicLevel?: LogicLevel;
  dependencies?: CellId[];
  config?: Record<string, unknown>;
}

/**
 * Cell data for spreadsheet creation
 */
export interface CellData {
  value: unknown;
  formula?: string;
  type?: CellType;
}

/**
 * Relationship between cells
 */
export interface RelationshipConfig {
  from: CellId;
  to: CellId;
  type: 'data' | 'sensation' | 'control';
  sensationTypes?: SensationType[];
}

/**
 * Expected behavior in tests
 */
export interface ExpectedBehavior {
  description: string;
  cellId: CellId;
  condition: (cell: unknown) => boolean | Promise<boolean>;
  timeout?: number;
}

/**
 * Colony pattern for cell colony creation
 */
export enum ColonyPattern {
  GRID = 'grid',
  CHAIN = 'chain',
  TREE = 'tree',
  STAR = 'star',
  MESH = 'mesh',
  RANDOM = 'random',
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  memory?: MemoryResult;
  percentiles?: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

/**
 * Memory usage result
 */
export interface MemoryResult {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  delta: number;
}

/**
 * Load test result
 */
export interface LoadTestResult {
  name: string;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  opsPerSecond: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errors: Array<{
    error: string;
    count: number;
    timestamp: number;
  }>;
}

/**
 * Stress test result
 */
export interface StressTestResult {
  name: string;
  maxLoad: number;
  breakingPoint: number;
  results: Array<{
    load: number;
    passed: boolean;
    averageTime: number;
    errorRate: number;
  }>;
}

/**
 * Mock request for backend testing
 */
export interface Request {
  id: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  response?: {
    status: number;
    body?: unknown;
    delay: number;
  };
}

/**
 * WebSocket message for testing
 */
export interface MockWebSocketMessage {
  type: string;
  data: unknown;
  clientId: string;
  timestamp: number;
}

/**
 * Mock API response
 */
export interface MockApiResponse {
  status: number;
  body: unknown;
  delay: number;
}

/**
 * Mock cache entry
 */
export interface MockCacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  ttl?: number;
  hits: number;
}

/**
 * Mock backend configuration
 */
export interface MockBackendConfig {
  latencyRange?: [number, number];
  errorRate?: number;
  logging?: boolean;
  wsPort?: number;
  apiPort?: number;
  cacheEnabled?: boolean;
}

/**
 * Test data configuration
 */
export interface TestDataConfig {
  rows: number;
  columns: number;
  dataType?: 'number' | 'string' | 'boolean' | 'mixed' | 'json';
  numberRange?: [number, number];
  stringLength?: [number, number];
  nullProbability?: number;
  seed?: number;
}

/**
 * Spreadsheet template
 */
export interface SpreadsheetTemplate {
  name: string;
  description?: string;
  data: CellData[][];
  metadata?: {
    created?: number;
    author?: string;
    version?: string;
  };
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  complexity?: 'simple' | 'moderate' | 'complex';
  includeDependencies?: boolean;
  includeFormulas?: boolean;
  duration?: number;
}

/**
 * Time manipulation options
 */
export interface TimeOptions {
  advance?: number;
  freeze?: boolean;
  tick?: number;
}

/**
 * Assertion result
 */
export interface AssertionResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  maxExecutionTime?: number;
  minOpsPerSecond?: number;
  maxMemoryUsage?: number;
  maxLatency?: number;
}

/**
 * Sensation assertions
 */
export interface SensationAssertions {
  hasType: SensationType;
  confidence?: number;
  source?: CellReference;
  value?: number;
}

/**
 * Test user for collaboration testing
 */
export interface TestUser {
  id: string;
  name: string;
  permissions: string[];
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  users: TestUser[];
  sheetId: string;
  startedAt: number;
}

/**
 * Integration test configuration
 */
export interface IntegrationTestConfig {
  timeout?: number;
  verbose?: boolean;
  cleanup?: boolean;
  mockBackend?: boolean;
}

/**
 * Integration test result
 */
export interface IntegrationTestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: Record<string, unknown>;
  errors?: string[];
}

/**
 * Formula generator options
 */
export interface FormulaGeneratorOptions {
  complexity?: 'simple' | 'moderate' | 'complex';
  type?: 'arithmetic' | 'logical' | 'statistical' | 'text';
  depth?: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Anomaly injection configuration
 */
export interface AnomalyConfig {
  type: 'spike' | 'drop' | 'outlier' | 'missing' | 'duplicate';
  frequency?: number;
  magnitude?: number;
}
