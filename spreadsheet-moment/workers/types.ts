/**
 * ============================================================================
 * TypeScript Type Definitions for Cloudflare Workers
 * ============================================================================
 * SpreadsheetMoment - Agentic Spreadsheet Platform
 * Version: 1.0.0
 * Date: 2026-03-16
 * ============================================================================
 */

// ============================================================================
// CLOUDFLARE WORKER TYPES
// ============================================================================

export interface Env {
  // KV Namespaces
  CELLS: KVNamespace;
  CACHE: KVNamespace;

  // D1 Database
  DB: D1Database;

  // Workers AI
  AI: any;

  // Durable Objects
  WEBSOCKET: any;

  // R2 Storage
  ASSETS: R2Bucket;

  // Hyperdrive
  HYPERDRIVE: any;

  // Queues
  QUEUE: Queue<any>;

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Environment Variables
  ENVIRONMENT: string;
  API_VERSION: string;
  LOG_LEVEL: string;
  CLAW_API_BASE_URL: string;
  CLAW_API_VERSION: string;
  CLAW_API_KEY: string;
  CLAW_WS_URL: string;

  // Feature Flags
  FEATURE_WEBSOCKET: string;
  FEATURE_REAL_TIME_UPDATES: string;
  FEATURE_COLLABORATIVE_EDITING: string;
  FEATURE_AI_INTEGRATION: string;
  FEATURE_ADVANCED_ANALYTICS: string;

  // Security
  SECURITY_ENABLED: string;
  RATE_LIMIT_ENABLED: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE: string;
  RATE_LIMIT_BURST: string;

  // CORS
  CORS_ENABLED: string;
  CORS_ALLOWED_ORIGINS: string;
  CORS_ALLOWED_METHODS: string;
  CORS_ALLOWED_HEADERS: string;

  // Cache
  CACHE_ENABLED: string;
  CACHE_TTL_SECONDS: string;
  CACHE_STALE_WHILE_REVALIDATE: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// ============================================================================
// KV NAMESPACE TYPES
// ============================================================================

export interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(key: string, value: any, options?: KVCacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVCacheOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: any;
}

export interface KVListOptions {
  cursor?: string;
  limit?: number;
  prefix?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; metadata?: any }>;
  list_complete: boolean;
  cursor?: string;
}

// ============================================================================
// D1 DATABASE TYPES
// ============================================================================

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  first(col?: string): Promise<any>;
  all(): Promise<D1Result>;
  run(): Promise<D1Result>;
}

export interface D1Result {
  results: any[];
  success: boolean;
  meta?: D1ResultSetMetadata;
  duration?: number;
}

export interface D1ResultSetMetadata {
  served_by: string;
  duration: number;
  rows_read: number;
  rows_written: number;
}

// ============================================================================
// R2 BUCKET TYPES
// ============================================================================

export interface R2Bucket {
  put(key: string, value: any, options?: R2PutOptions): Promise<R2Object>;
  get(key: string): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<{ deleted: string[] }>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2Object {
  key: string;
  size: number;
  uploaded: Date;
  httpMetadata: R2HTTPMetadata;
  customMetadata: Record<string, string>;
  writeHttpMetadata(metadata: R2HTTPMetadata): void;
  writeCustomMetadata(metadata: Record<string, string>): void;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: string;
}

export interface R2Objects {
  objects: Array<{
    key: string;
    size: number;
    uploaded: Date;
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
  }>;
  truncated: boolean;
  cursor?: string;
}

export interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

export interface Queue<T> {
  send(message: T | T[]): Promise<void>;
  sendBatch(messages: T[]): Promise<void>;
}

// ============================================================================
// ANALYTICS ENGINE TYPES
// ============================================================================

export interface AnalyticsEngineDataset {
  writeDataPoint(data: AnalyticsDataPoint): Promise<void>;
}

export interface AnalyticsDataPoint {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

// ============================================================================
// DURABLE OBJECTS TYPES
// ============================================================================

export interface DurableObject {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
}

export interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(options?: DurableObjectStorageListOptions): Promise<{ keys: string[]; list_complete: boolean }>;
  deleteAll(): Promise<void>;
  transaction<T>(closure: (store: DurableObjectStorage) => Promise<T>): Promise<T>;
}

export interface DurableObjectStorageListOptions {
  start?: string;
  end?: string;
  limit?: number;
  reverse?: boolean;
}

export interface DurableObjectId {
  toString(): string;
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================

export interface CellData {
  id: string;
  value: any;
  formula?: string;
  agent?: AgentConfig;
  metadata?: Record<string, any>;
  updatedAt: number;
  updatedBy?: string;
}

export interface AgentConfig {
  id: string;
  type: 'sensor' | 'analysis' | 'automation' | 'custom';
  model?: string;
  trigger?: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ClawRequest {
  cellId: string;
  operation: 'create' | 'query' | 'update' | 'cancel' | 'execute';
  data?: any;
}

export interface ClawResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    latency: number;
    timestamp: number;
    version: string;
  };
}

export interface WebSocketMessage {
  type: 'update' | 'error' | 'connected' | 'disconnected';
  data?: any;
  error?: string;
  timestamp: number;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  environment: string;
  version: string;
  features: {
    websocket: boolean;
    realTimeUpdates: boolean;
    collaborativeEditing: boolean;
    aiIntegration: boolean;
    advancedAnalytics: boolean;
  };
}

export interface MetricsData {
  requests: {
    total: number;
    byMethod: Record<string, number>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  timestamp: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface SecurityContext {
  ip: string;
  userAgent: string;
  origin?: string;
  authenticated: boolean;
  permissions: string[];
}

export interface CacheOptions {
  enabled: boolean;
  ttl: number;
  staleWhileRevalidate: number;
}

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burst: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  inputValidation: boolean;
  outputSanitization: boolean;
}

export interface FeatureFlags {
  websocket: boolean;
  realTimeUpdates: boolean;
  collaborativeEditing: boolean;
  aiIntegration: boolean;
  advancedAnalytics: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type Optional<T> = T | null | undefined;

export type Nullable<T> = T | null;

// ============================================================================
// EXPORTS
// ============================================================================
