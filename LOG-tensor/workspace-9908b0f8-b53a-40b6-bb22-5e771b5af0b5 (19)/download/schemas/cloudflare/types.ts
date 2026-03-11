/**
 * SuperInstance.AI - Complete TypeScript Interfaces
 * 
 * This file contains all TypeScript interfaces for the SuperInstance.AI system
 * including BYOC (Bring Your Own Cloudflare) architecture, SMP agents,
 * Vector RAG, and local LLM support.
 */

// ============================================================================
// Core Types
// ============================================================================

export type DeploymentMode = 'portal' | 'user_cloudflare' | 'local';
export type Environment = 'development' | 'staging' | 'production';
export type LockStatus = 'unlocked' | 'partial' | 'locked' | 'frozen';
export type SMPBotState = 'idle' | 'active' | 'checking' | 'paused' | 'error' | 'terminated';
export type CheckType = 'performance' | 'correctness' | 'resource' | 'compliance' | 'drift' | 'anomaly';

// ============================================================================
// Cloudflare Bindings
// ============================================================================

export interface CloudflareEnv {
  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  CONFIGS: KVNamespace;
  
  // R2 Buckets
  DOCUMENTS: R2Bucket;
  EXPORTS: R2Bucket;
  
  // D1 Database
  DB: D1Database;
  
  // Vectorize
  VECTORIZE: VectorizeIndex;
  
  // Durable Objects
  SMP_CELL: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;
  
  // Queues
  COLD_LOGIC_QUEUE: Queue<ColdLogicMessage>;
  
  // Analytics
  ANALYTICS: AnalyticsEngineDataset;
  
  // Environment Variables
  ENVIRONMENT: Environment;
  DEPLOYMENT_MODE: DeploymentMode;
  
  // Secrets (injected at runtime)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPINFRA_API_KEY?: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  deploymentMode: DeploymentMode;
  
  // BYOC Configuration
  cloudflare?: CloudflareConnection;
  
  // API Keys (encrypted)
  apiKeys?: APIKeySet;
  
  // Preferences
  preferences: UserPreferences;
  
  // Usage
  quotas: UserQuotas;
  usage: UserUsage;
}

export interface CloudflareConnection {
  connected: boolean;
  accountId: string;
  accountName?: string;
  oauth?: {
    connectedAt: string;
    scope: string[];
    refreshToken: string; // encrypted
  };
  apiToken?: {
    encrypted: string;
    permissions: string[];
    expiresAt?: string;
  };
  resources?: CloudflareResources;
  limits?: CloudflareLimits;
}

export interface CloudflareResources {
  workers: CloudflareWorker[];
  kvNamespaces: CloudflareKVNamespace[];
  r2Buckets: CloudflareR2Bucket[];
  d1Databases: CloudflareD1Database[];
  vectorizeIndexes: CloudflareVectorizeIndex[];
}

export interface CloudflareLimits {
  workersRequests: { used: number; limit: number };
  kvStorage: { usedBytes: number; limitBytes: number };
  d1Storage: { usedBytes: number; limitBytes: number };
  vectorStorage: { usedVectors: number; limitVectors: number };
}

// ============================================================================
// API Key Management
// ============================================================================

export interface APIKeySet {
  openai?: APIKeyConfig;
  anthropic?: APIKeyConfig;
  deepseek?: APIKeyConfig;
  deepinfra?: APIKeyConfig;
  moonshot?: APIKeyConfig;
  custom?: CustomAPIKeyConfig[];
  local?: LocalLLMConfig;
}

export interface APIKeyConfig {
  configured: boolean;
  encryptedKey?: string;
  addedAt?: string;
  lastUsed?: string;
  validated: boolean;
  defaultModel?: string;
}

export interface CustomAPIKeyConfig {
  id: string;
  name: string;
  baseUrl: string;
  encryptedKey?: string;
  models: string[];
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  headers?: Record<string, string>;
}

export interface LocalLLMConfig {
  enabled: boolean;
  baseUrl: string;
  models: string[];
}

// ============================================================================
// SMP (Seed + Model + Prompt) Architecture
// ============================================================================

export interface SMPCell {
  id: string;
  seed: Seed;
  model: ModelConfig;
  prompt: PromptTemplate;
  lockStatus: LockStatus;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface Seed {
  value: string;
  entropy: number; // 0=deterministic, 1=max entropy
  type?: 'numeric' | 'tensor' | 'state_vector' | 'configuration' | 'embedding';
}

export interface ModelConfig {
  provider: string;
  modelName: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  baseUrl?: string; // For custom/local providers
  headers?: Record<string, string>;
}

export interface PromptTemplate {
  template: string;
  variables: string[];
  systemPrompt?: string;
  examples?: PromptExample[];
}

export interface PromptExample {
  input: Record<string, string>;
  output: string;
}

// ============================================================================
// SMP Bot
// ============================================================================

export interface SMPBot {
  id: string;
  userId: string;
  cell: SMPCell;
  state: SMPBotState;
  executionCount: number;
  errorCount: number;
  lastCheckResult?: ColdLogicCheckResult;
  stats?: SMPBotStats;
  rag?: RAGConfig;
  workerId?: string;
  workerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SMPBotStats {
  executionCount: number;
  errorCount: number;
  totalTokensUsed: number;
  averageLatencyMs: number;
  lastExecution?: string;
}

// ============================================================================
// Cold Logic Checking
// ============================================================================

export interface ColdLogicChecker {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  checkInterval: number; // seconds
  checksPerformed: number;
  issuesFound: number;
  lastCheck?: string;
  checkTypes: CheckType[];
  thresholds: CheckThresholds;
  notifications?: NotificationConfig;
}

export interface CheckThresholds {
  performance: {
    maxErrorRate: number;
    maxLatencyMs: number;
    minExecutionCount: number;
  };
  correctness: {
    fingerprintMatch: boolean;
    lockStatusRequired: boolean;
  };
  drift: {
    maxEntropy: number;
    minExecutionCount: number;
  };
  resource: {
    maxMemoryMb: number;
    maxCpuMs: number;
  };
}

export interface ColdLogicCheckResult {
  checkerId: string;
  botId: string;
  overallPassed: boolean;
  results: Record<CheckType, CheckTypeResult>;
  timestamp: string;
  recommendations: string[];
}

export interface CheckTypeResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  details?: Record<string, unknown>;
}

export interface ColdLogicMessage {
  botId: string;
  checkType: CheckType;
  scheduledAt: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Vector RAG (Memory)
// ============================================================================

export interface RAGConfig {
  enabled: boolean;
  vectorIndexName: string;
  documentBucketName: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
}

export interface RAGDocument {
  id: string;
  userId: string;
  botId?: string;
  filename: string;
  mimeType: string;
  size: number;
  chunks: number;
  vectors: number;
  uploadedAt: string;
  processedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: {
    pageNumber?: number;
    position: number;
    tokens: number;
  };
}

export interface RAGQuery {
  query: string;
  embedding: number[];
  topK: number;
  filters?: {
    botId?: string;
    documentIds?: string[];
    dateRange?: { start: string; end: string };
  };
}

export interface RAGResult {
  chunks: Array<{
    chunk: RAGChunk;
    similarity: number;
    document: RAGDocument;
  }>;
  totalTokens: number;
  latencyMs: number;
}

// ============================================================================
// Conditional Geometry (Core POLLN Framework)
// ============================================================================

export interface ConditionalGeometryInput {
  points: number[][];
  probabilities: number[];
  conditions: ConditionSet;
}

export interface ConditionSet {
  foldAxis?: number;
  foldPosition?: number;
  openedDoor?: number;
  constraints?: Record<string, unknown>;
  transformed?: boolean;
  timestamp?: string;
}

export interface ConditionalGeometryOutput {
  X_prime: number[][];
  P_prime: number[];
  C_prime: ConditionSet;
  formula: string;
  insight: string;
}

// ============================================================================
// Foldable Tensors
// ============================================================================

export interface FoldableTensorInput {
  data: number[];
  shape: number[];
  operations?: TensorOperation[];
}

export interface TensorOperation {
  type: 'crease' | 'permute';
  axis?: number;
  position?: number;
  foldType?: 'mountain' | 'valley';
  permutation?: number[];
}

export interface FoldableTensorOutput {
  flat: number[];
  shape2d: [number, number];
  assemblyKey: string;
  instructions: {
    originalShape: number[];
    creases: CreasePattern[];
    permutations: PermutationOp[];
  };
}

export interface CreasePattern {
  axis: number;
  position: number;
  type: 'mountain' | 'valley';
}

export interface PermutationOp {
  permutation: number[];
  axis: number;
}

// ============================================================================
// Channel Depth (Learning Curves)
// ============================================================================

export interface ChannelDepthInput {
  visits: Array<{ timestamp: number; intensity: number }>;
  params: {
    lambda: number;
    alpha: number;
    baseCost: number;
  };
  currentTime: number;
}

export interface ChannelDepthOutput {
  depth: number;
  cost: number;
  costReduction: number;
  masteryLevel: number;
  visitCount: number;
}

export interface LearningCurveOutput {
  times: number[];
  depths: number[];
  costs: number[];
  finalDepth: number;
  finalCost: number;
  costReduction: string;
}

// ============================================================================
// Installation & Download
// ============================================================================

export interface InstallationPackage {
  version: string;
  platform: 'macos-arm64' | 'macos-x64' | 'windows-x64' | 'linux-x64' | 'linux-arm64';
  downloadUrl: string;
  sizeBytes: number;
  checksumSha256: string;
  releaseNotes: string;
  minRequirements: {
    cpu: string;
    memory: string;
    storage: string;
  };
  bundledDependencies: string[];
}

export interface LocalInstallation {
  id: string;
  userId: string;
  platform: string;
  installedAt: string;
  version: string;
  port: number;
  apiUrl: string;
  status: 'running' | 'stopped' | 'error';
  lastHeartbeat?: string;
}

// ============================================================================
// User Preferences & Settings
// ============================================================================

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  defaultView: 'conditional_geometry' | 'foldable_tensors' | 'channel_depth' | 'smp';
  defaultProvider: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  notifications: {
    email: boolean;
    inApp: boolean;
  };
  autoSave: boolean;
  saveHistory: boolean;
}

export interface UserQuotas {
  botsLimit: number;
  executionsPerDay: number;
  storageMb: number;
  vectorStorageMb: number;
  ragDocuments: number;
}

export interface UserUsage {
  botsCreated: number;
  executionsToday: number;
  storageUsedMb: number;
  vectorsStored: number;
  ragDocuments: number;
  lastExecution?: string;
}

// ============================================================================
// API Routes
// ============================================================================

export interface APIRoute {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  handler: string;
  auth: boolean;
  rateLimit?: string;
  description?: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    address?: string;
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    secret?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
}

// ============================================================================
// Analytics & Metrics
// ============================================================================

export interface AnalyticsEvent {
  eventType: string;
  userId: string;
  botId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface SystemMetrics {
  activeUsers: number;
  activeBots: number;
  requestsPerMinute: number;
  averageLatencyMs: number;
  errorRate: number;
  storageUsedBytes: number;
  vectorsStored: number;
}

// ============================================================================
// Database Schema (D1)
// ============================================================================

export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    name: string | null;
    deployment_mode: DeploymentMode;
    preferences: string; // JSON
    created_at: string;
    updated_at: string;
  };
  cloudflare_connections: {
    id: string;
    user_id: string;
    account_id: string;
    account_name: string | null;
    oauth_connected: boolean;
    oauth_connected_at: string | null;
    api_token_encrypted: string | null;
    resources: string; // JSON
    limits: string; // JSON
    created_at: string;
    updated_at: string;
  };
  api_keys: {
    id: string;
    user_id: string;
    provider: string;
    encrypted_key: string;
    default_model: string | null;
    validated: boolean;
    added_at: string;
    last_used: string | null;
  };
  custom_api_configs: {
    id: string;
    user_id: string;
    name: string;
    base_url: string;
    encrypted_key: string | null;
    models: string; // JSON
    supports_streaming: boolean;
    supports_function_calling: boolean;
    supports_vision: boolean;
    headers: string; // JSON
    created_at: string;
  };
  smp_cells: {
    id: string;
    user_id: string;
    seed_value: string;
    seed_entropy: number;
    model_provider: string;
    model_name: string;
    model_temperature: number;
    model_top_p: number;
    model_max_tokens: number;
    model_base_url: string | null;
    prompt_template: string;
    prompt_variables: string; // JSON
    prompt_system: string | null;
    lock_status: LockStatus;
    fingerprint: string;
    created_at: string;
    updated_at: string;
  };
  smp_bots: {
    id: string;
    user_id: string;
    cell_id: string;
    name: string;
    description: string | null;
    state: SMPBotState;
    worker_id: string | null;
    worker_url: string | null;
    execution_count: number;
    error_count: number;
    total_tokens: number;
    average_latency_ms: number;
    last_execution: string | null;
    rag_enabled: boolean;
    rag_config: string; // JSON
    created_at: string;
    updated_at: string;
  };
  cold_logic_checkers: {
    id: string;
    user_id: string;
    bot_id: string;
    name: string;
    enabled: boolean;
    check_interval: number;
    checks_performed: number;
    issues_found: number;
    last_check: string | null;
    check_types: string; // JSON
    thresholds: string; // JSON
    created_at: string;
  };
  rag_documents: {
    id: string;
    user_id: string;
    bot_id: string | null;
    filename: string;
    mime_type: string;
    size_bytes: number;
    chunks: number;
    vectors: number;
    metadata: string; // JSON
    uploaded_at: string;
    processed_at: string | null;
  };
  executions: {
    id: string;
    bot_id: string;
    input: string; // JSON
    output: string; // JSON
    tokens_used: number;
    latency_ms: number;
    success: boolean;
    error_message: string | null;
    executed_at: string;
  };
  usage_daily: {
    id: string;
    user_id: string;
    date: string;
    executions: number;
    tokens: number;
    storage_bytes: number;
    vectors: number;
    created_at: string;
  };
}

export default CloudflareEnv;
