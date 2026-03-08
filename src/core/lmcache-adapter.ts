/**
 * POLLN LMCache Adapter
 *
 * Bridges POLLN's KVAnchor system with LMCache backend for distributed KV-cache sharing.
 * Based on design document: docs/research/LMCACHE_INTEGRATION_DESIGN.md
 *
 * Key Features:
 * - Serialization/deserialization between KVAnchor and LMCache formats
 * - Connection pooling for efficient LMCache backend communication
 * - Error handling with graceful fallback
 * - Batch operations for improved throughput
 * - Local caching with remote backend sync
 */

import { EventEmitter } from 'events';
import { KVAnchor, KVCacheSegment } from './kvanchor.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * LMCache backend type
 */
export type LMCacheBackendType = 'cpu' | 'disk' | 's3' | 'redis';

/**
 * Adapter configuration
 */
export interface LMCacheAdapterConfig {
  // Python bridge configuration
  pythonPath?: string;
  endpointUrl?: string;

  // LMCache backend configuration
  backend: LMCacheBackendType;
  chunkSize: number;
  maxChunks: number;
  compression: boolean;
  compressionType?: 'gzip' | 'zstd';
  compressionLevel?: number;
  evictionPolicy: 'lru' | 'lfu';
  maxSizeGb: number;

  // Distributed settings
  enableRemote: boolean;
  remoteUrl?: string;
  workerId?: string;

  // Connection pooling
  maxConnections?: number;
  connectionTimeout?: number;
  requestTimeout?: number;

  // Retry configuration
  maxRetries?: number;
  retryDelay?: number;
  retryBackoff?: number;

  // Local cache
  enableLocalCache: boolean;
  localCacheSize?: number;
  localCacheTtl?: number;

  // Batch operations
  enableBatching: boolean;
  batchSize?: number;
  batchTimeout?: number;

  // Monitoring
  enableMetrics: boolean;
}

/**
 * Lookup options for LMCache adapter
 */
export interface LMCacheLookupOptions {
  localCache?: boolean;
  skipLocalCache?: boolean;
  maxRetries?: number;
  remoteTimeout?: number;
  remoteBatchSize?: number;
  remoteSyncPriority?: 'high' | 'normal' | 'low';
  maxConcurrentLookups?: number;
  maxBatchSize?: number;
  connectionTimeout?: number;
  connectionRetries?: number;
  batchSize?: number;
  maxDistance?: number;
  topK?: number;
  checkLocalFirst?: boolean;
  updateMetadata?: boolean;
  includeRemote?: boolean;
}

/**
 * Store options for LMCache adapter
 */
export interface LMCacheStoreOptions {
  syncRemote?: boolean;
  compress?: boolean;
  ttl?: number;
  metadata?: Record<string, unknown>;
  skipLocalCache?: boolean;
}

/**
 * Cache statistics
 */
export interface LMCacheStats {
  totalAnchors: number;
  hitRate: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  sizeBytes: number;
  compressionRatio: number;
  backendType: LMCacheBackendType;
  isDistributed: boolean;

  // Connection stats
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  avgLatency: number;

  // Local cache stats
  localCacheHits: number;
  localCacheSize: number;

  // Batch stats
  batchOperations: number;
  avgBatchSize: number;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  duration: number;
  errors: Array<{ index: number; error: string }>;
}

// ============================================================================
// SERIALIZED FORMATS
// ============================================================================

/**
 * Serialized LMCache format for storage/transfer
 */
export interface SerializedLMCache {
  // Header
  version: number;
  format: string;
  timestamp: number;

  // Identification
  anchorId: string;
  layerId: number;
  segmentId: string;
  sourceAgentId: string;

  // KV Cache Data
  kvData: {
    keys: SerializedTensor;
    values: SerializedTensor;
  };

  // Embedding
  embedding: {
    vector: number[];
    dimension: number;
  };

  // Metadata
  metadata: {
    qualityScore: number;
    compressionRatio: number;
    usageCount: number;
    lastUsed: number;
    createdAt: number;
    updatedAt: number;
    clusterId?: string;
    clusterCenterDistance?: number;
  };

  // Privacy (for federated sharing)
  privacy?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
}

/**
 * Serialized tensor representation
 */
export interface SerializedTensor {
  dtype: 'float32' | 'float64' | 'int8' | 'int16';
  shape: number[];
  data: string; // Base64 encoded binary
  compressed: boolean;
}

/**
 * LMCache KVCache format (from LMCache backend)
 */
export interface LMKVCache {
  keys: number[][];
  values: number[][];
  layerId: number;
  segmentId: string;
  tokens: number[];
  metadata: {
    sourceAgentId?: string;
    qualityScore?: number;
    compressionRatio?: number;
    createdAt?: number;
    embedding?: number[];
    usageCount?: number;
  };
}

// ============================================================================
// SERIALIZER
// ============================================================================

/**
 * Serializer for converting between POLLN KVAnchor and LMCache formats
 */
export class KVCacheSerializer {
  /**
   * Serialize KVAnchor to LMCache format
   */
  serialize(anchor: KVAnchor): SerializedLMCache {
    return {
      version: 1,
      format: 'polln-kvanchor',
      timestamp: Date.now(),

      anchorId: anchor.anchorId,
      layerId: anchor.layerId,
      segmentId: anchor.segmentId,
      sourceAgentId: anchor.sourceAgentId,

      kvData: {
        keys: this.serializeTensor(anchor.compressedKeys),
        values: this.serializeTensor(anchor.compressedValues),
      },

      embedding: {
        vector: anchor.embedding,
        dimension: anchor.embedding.length,
      },

      metadata: {
        qualityScore: anchor.qualityScore,
        compressionRatio: anchor.compressionRatio,
        usageCount: anchor.usageCount,
        lastUsed: anchor.lastUsed,
        createdAt: anchor.createdAt,
        updatedAt: anchor.updatedAt,
        clusterId: anchor.clusterId,
        clusterCenterDistance: anchor.clusterCenterDistance,
      },
    };
  }

  /**
   * Deserialize LMCache format to KVAnchor
   */
  deserialize(data: SerializedLMCache): KVAnchor {
    return {
      anchorId: data.anchorId,
      layerId: data.layerId,
      segmentId: data.segmentId,
      compressedKeys: this.deserializeTensor(data.kvData.keys),
      compressedValues: this.deserializeTensor(data.kvData.values),
      embedding: data.embedding.vector,
      sourceSegmentId: data.segmentId,
      sourceAgentId: data.sourceAgentId,
      usageCount: data.metadata.usageCount,
      lastUsed: data.metadata.lastUsed,
      qualityScore: data.metadata.qualityScore,
      compressionRatio: data.metadata.compressionRatio,
      createdAt: data.metadata.createdAt,
      updatedAt: data.metadata.updatedAt,
      clusterId: data.metadata.clusterId,
      clusterCenterDistance: data.metadata.clusterCenterDistance,
    };
  }

  /**
   * Serialize tensor to Base64 format
   */
  serializeTensor(data: Float32Array): SerializedTensor {
    const buffer = data.buffer as ArrayBuffer;
    const base64 = this.bufferToBase64(buffer);

    return {
      dtype: 'float32',
      shape: [data.length],
      data: base64,
      compressed: true,
    };
  }

  /**
   * Deserialize tensor from Base64 format
   */
  deserializeTensor(tensor: SerializedTensor): Float32Array {
    const buffer = this.base64ToBuffer(tensor.data);

    if (tensor.dtype === 'float32') {
      // Create Float32Array from ArrayBuffer
      const float32Array = new Float32Array(buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
      const view = new DataView(buffer);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = view.getFloat32(i * Float32Array.BYTES_PER_ELEMENT, true);
      }
      return float32Array;
    }

    // Convert other dtypes to Float32Array
    throw new Error(`Unsupported dtype: ${tensor.dtype}`);
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Serialize multiple anchors at once
   */
  serializeBatch(anchors: KVAnchor[]): SerializedLMCache[] {
    return anchors.map(anchor => this.serialize(anchor));
  }

  /**
   * Deserialize multiple anchors at once
   */
  deserializeBatch(dataArray: SerializedLMCache[]): KVAnchor[] {
    return dataArray.map(data => this.deserialize(data));
  }
}

// ============================================================================
// PYTHON BRIDGE
// ============================================================================

/**
 * Bridge request format
 */
interface BridgeRequest {
  module: string;
  function: string;
  params?: Record<string, unknown>;
}

/**
 * Bridge response format
 */
interface BridgeResponse {
  status: 'ok' | 'error';
  data?: unknown;
  error?: string;
}

/**
 * Connection state
 */
interface ConnectionState {
  id: string;
  active: boolean;
  lastUsed: number;
  requestCount: number;
}

/**
 * Python bridge for communicating with LMCache backend
 * Simulates connection to LMCache Python server
 */
export class PythonBridge extends EventEmitter {
  private connections: Map<string, ConnectionState> = new Map();
  private activeConnections = 0;
  private config: Required<Pick<LMCacheAdapterConfig,
    'maxConnections' | 'connectionTimeout' | 'requestTimeout' | 'maxRetries' | 'retryDelay'>>;

  constructor(config: Pick<LMCacheAdapterConfig,
    'maxConnections' | 'connectionTimeout' | 'requestTimeout' | 'maxRetries' | 'retryDelay'>) {
    super();
    this.config = {
      maxConnections: config.maxConnections ?? 10,
      connectionTimeout: config.connectionTimeout ?? 30000,
      requestTimeout: config.requestTimeout ?? 10000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };
  }

  /**
   * Execute command through bridge
   */
  async execute(request: BridgeRequest): Promise<BridgeResponse> {
    const connectionId = await this.acquireConnection();

    try {
      const result = await this.executeWithRetry(request, connectionId);
      return result;
    } finally {
      this.releaseConnection(connectionId);
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    request: BridgeRequest,
    connectionId: string,
    attempt = 0
  ): Promise<BridgeResponse> {
    try {
      // Simulate execution (in production, this would make actual HTTP/IPC call)
      const response = await this.simulateExecution(request);
      return response;
    } catch (error) {
      if (attempt < this.config.maxRetries && this.isRecoverable(error)) {
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
        return this.executeWithRetry(request, connectionId, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Simulate LMCache execution (placeholder for actual implementation)
   */
  private async simulateExecution(request: BridgeRequest): Promise<BridgeResponse> {
    // In production, this would make actual HTTP/IPC call to LMCache Python backend
    // For now, simulate successful responses

    switch (request.function) {
      case 'ping':
        return { status: 'ok', data: { message: 'pong' } };

      case 'lookup':
        // Simulate cache miss
        return { status: 'ok', data: null };

      case 'update':
        return { status: 'ok' };

      case 'evict':
        return { status: 'ok' };

      case 'get_stats':
        return {
          status: 'ok',
          data: {
            totalAnchors: 0,
            hitRate: 0,
            sizeBytes: 0,
            compressionRatio: 1.0,
          },
        };

      case 'batch_lookup':
        return { status: 'ok', data: [] };

      case 'batch_update':
        return { status: 'ok' };

      default:
        return { status: 'error', error: `Unknown function: ${request.function}` };
    }
  }

  /**
   * Acquire a connection from pool
   */
  private async acquireConnection(): Promise<string> {
    // Find inactive connection
    for (const [id, state] of this.connections) {
      if (!state.active) {
        state.active = true;
        state.lastUsed = Date.now();
        this.activeConnections++;
        return id;
      }
    }

    // Create new connection if under limit
    if (this.activeConnections < this.config.maxConnections) {
      const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.connections.set(id, {
        id,
        active: true,
        lastUsed: Date.now(),
        requestCount: 0,
      });
      this.activeConnections++;
      return id;
    }

    // Wait for available connection
    return await this.waitForConnection();
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.active = false;
      connection.lastUsed = Date.now();
      this.activeConnections--;
    }
  }

  /**
   * Wait for available connection
   */
  private async waitForConnection(): Promise<string> {
    const maxWait = this.config.connectionTimeout;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      for (const [id, state] of this.connections) {
        if (!state.active) {
          state.active = true;
          state.lastUsed = Date.now();
          this.activeConnections++;
          return id;
        }
      }
      await this.sleep(50);
    }

    throw new Error('Connection timeout: No available connections');
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('temporary')
      );
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.activeConnections,
      idleConnections: this.connections.size - this.activeConnections,
    };
  }

  /**
   * Close all connections
   */
  close(): void {
    this.connections.clear();
    this.activeConnections = 0;
  }
}

// ============================================================================
// LMCACHE ADAPTER
// ============================================================================

/**
 * LMCache Adapter Implementation
 * Bridges POLLN KVAnchor system with LMCache Python backend
 */
export class LMCacheAdapter extends EventEmitter {
  private pythonBridge: PythonBridge;
  private serializer: KVCacheSerializer;
  private config: LMCacheAdapterConfig;

  // Local cache
  private localCache: Map<string, { anchor: KVAnchor; expiresAt: number }> = new Map();

  // Statistics
  private stats: LMCacheStats;
  private operationLatencies: number[] = [];

  // Batch queue
  private batchQueue: KVAnchor[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(config: LMCacheAdapterConfig) {
    super();

    this.config = config;
    this.serializer = new KVCacheSerializer();
    this.pythonBridge = new PythonBridge({
      maxConnections: config.maxConnections,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    });

    this.stats = this.initializeStats();

    // Start batch processing if enabled
    if (this.config.enableBatching) {
      this.startBatchProcessor();
    }

    // Start local cache cleanup
    if (this.config.enableLocalCache) {
      this.startCacheCleanup();
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Check if LMCache backend is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.pythonBridge.execute({
        module: 'lmcache',
        function: 'ping',
      });
      return result.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Lookup KV cache by embedding
   */
  async lookup(
    embedding: number[],
    options: LMCacheLookupOptions = {}
  ): Promise<KVAnchor | null> {
    const startTime = Date.now();

    try {
      const {
        maxDistance = 0.3,
        topK = 1,
        checkLocalFirst = true,
        updateMetadata = true,
        includeRemote = true,
      } = options;

      // Check local cache first
      if (checkLocalFirst && this.config.enableLocalCache) {
        const localResult = this.lookupLocal(embedding, maxDistance);
        if (localResult) {
          if (updateMetadata) {
            localResult.usageCount++;
            localResult.lastUsed = Date.now();
          }
          this.stats.localCacheHits++;
          this.recordHit(startTime);
          return localResult;
        }
      }

      // Query LMCache backend
      if (includeRemote) {
        try {
          const result = await this.pythonBridge.execute({
            module: 'lmcache',
            function: 'lookup',
            params: {
              embedding,
              max_distance: maxDistance,
              top_k: topK,
            },
          });

          if (result.status === 'ok' && result.data) {
            const lmCacheData = result.data as LMKVCache;
            const anchor = this.fromLMCacheFormat(lmCacheData);

            // Cache locally
            if (this.config.enableLocalCache && !options.skipLocalCache) {
              this.cacheLocal(anchor);
            }

            if (updateMetadata) {
              anchor.usageCount++;
              anchor.lastUsed = Date.now();
            }

            this.recordHit(startTime);
            return anchor;
          }
        } catch (error) {
          this.emit('error', { operation: 'lookup', error });
          if (this.config.enableMetrics) {
            this.stats.failedRequests++;
          }
        }
      }

      // Record miss whether we checked remote or not
      this.recordMiss(startTime);
      return null;
    } catch (error) {
      this.emit('error', { operation: 'lookup', error });
      if (this.config.enableMetrics) {
        this.stats.failedRequests++;
      }
      throw error;
    }
  }

  /**
   * Store anchor in LMCache
   */
  async store(
    anchor: KVAnchor,
    options: LMCacheStoreOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const {
        syncRemote = true,
        compress = true,
        ttl,
        metadata = {},
        skipLocalCache = false,
      } = options;

      // Store locally
      if (this.config.enableLocalCache && !skipLocalCache) {
        this.cacheLocal(anchor, ttl);
      }

      // Add to batch queue if batching enabled
      if (this.config.enableBatching) {
        this.batchQueue.push(anchor);
        if (this.batchQueue.length >= (this.config.batchSize || 10)) {
          await this.flushBatch();
        }
        return;
      }

      // Store in LMCache backend
      if (syncRemote) {
        try {
          const serialized = this.serializer.serialize(anchor);

          await this.pythonBridge.execute({
            module: 'lmcache',
            function: 'update',
            params: {
              key: this.generateCacheKey(anchor),
              kv_cache: serialized,
              metadata: {
                ...metadata,
                ttl,
                compressed: compress,
              },
            },
          });

          this.stats.totalAnchors++;
        } catch (error) {
          this.emit('error', { operation: 'store', error });
          if (this.config.enableMetrics) {
            this.stats.failedRequests++;
          }
          throw error;
        }
      }

      this.recordOperation(startTime);
    } catch (error) {
      this.emit('error', { operation: 'store', error });
      throw error;
    }
  }

  /**
   * Batch lookup for multiple embeddings
   */
  async batchLookup(embeddings: number[][]): Promise<(KVAnchor | null)[]> {
    const startTime = Date.now();

    try {
      // Initialize results array with nulls
      const results: (KVAnchor | null)[] = new Array(embeddings.length).fill(null);
      const missed: number[] = [];

      if (this.config.enableLocalCache) {
        for (let i = 0; i < embeddings.length; i++) {
          const localResult = this.lookupLocal(embeddings[i], 0.3);
          if (localResult) {
            results[i] = localResult;
            this.stats.localCacheHits++;
          } else {
            missed.push(i);
          }
        }
      } else {
        missed.push(...embeddings.map((_, i) => i));
      }

      // Query backend for misses
      if (missed.length > 0) {
        try {
          const result = await this.pythonBridge.execute({
            module: 'lmcache',
            function: 'batch_lookup',
            params: {
              embeddings: missed.map(i => embeddings[i]),
            },
          });

          if (result.status === 'ok' && result.data) {
            const anchors = result.data as LMKVCache[];
            for (let i = 0; i < anchors.length && i < missed.length; i++) {
              const anchor = this.fromLMCacheFormat(anchors[i]);
              results[missed[i]] = anchor;
              if (this.config.enableLocalCache) {
                this.cacheLocal(anchor);
              }
            }
          }
        } catch (error) {
          this.emit('error', { operation: 'batchLookup', error });
          if (this.config.enableMetrics) {
            this.stats.failedRequests++;
          }
        }
      }

      this.recordBatchOperation(embeddings.length, Date.now() - startTime);
      return results;
    } catch (error) {
      this.emit('error', { operation: 'batchLookup', error });
      throw error;
    }
  }

  /**
   * Batch store multiple anchors
   */
  async batchStore(anchors: KVAnchor[]): Promise<BatchResult> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let succeeded = 0;
    let failed = 0;

    try {
      // Cache locally
      if (this.config.enableLocalCache) {
        for (const anchor of anchors) {
          this.cacheLocal(anchor);
        }
      }

      // Store in backend
      try {
        const serialized = this.serializer.serializeBatch(anchors);

        await this.pythonBridge.execute({
          module: 'lmcache',
          function: 'batch_update',
          params: {
            anchors: serialized,
          },
        });

        succeeded = anchors.length;
        this.stats.totalAnchors += anchors.length;
      } catch (error) {
        failed = anchors.length;
        for (let i = 0; i < anchors.length; i++) {
          errors.push({ index: i, error: String(error) });
        }
        this.emit('error', { operation: 'batchStore', error });
        if (this.config.enableMetrics) {
          this.stats.failedRequests++;
        }
      }

      const duration = Date.now() - startTime;
      this.recordBatchOperation(anchors.length, duration);

      return {
        total: anchors.length,
        succeeded,
        failed,
        duration,
        errors,
      };
    } catch (error) {
      this.emit('error', { operation: 'batchStore', error });
      throw error;
    }
  }

  /**
   * Evict anchor from cache
   */
  async evict(anchorId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Remove from local cache
      this.localCache.delete(anchorId);

      // Evict from LMCache backend
      try {
        await this.pythonBridge.execute({
          module: 'lmcache',
          function: 'evict',
          params: { key: anchorId },
        });

        this.stats.evictionCount++;
        this.stats.totalAnchors--;
      } catch (error) {
        this.emit('error', { operation: 'evict', error });
        if (this.config.enableMetrics) {
          this.stats.failedRequests++;
        }
        throw error;
      }

      this.recordOperation(startTime);
    } catch (error) {
      this.emit('error', { operation: 'evict', error });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<LMCacheStats> {
    // Refresh backend stats
    try {
      const backendStats = await this.pythonBridge.execute({
        module: 'lmcache',
        function: 'get_stats',
      });

      if (backendStats.status === 'ok' && backendStats.data) {
        const data = backendStats.data as Record<string, unknown>;
        return {
          ...this.stats,
          totalAnchors: (data.totalAnchors as number) ?? this.stats.totalAnchors,
          sizeBytes: (data.sizeBytes as number) ?? this.stats.sizeBytes,
          compressionRatio: (data.compressionRatio as number) ?? this.stats.compressionRatio,
        };
      }
    } catch (error) {
      this.emit('error', { operation: 'getStats', error });
    }

    return { ...this.stats };
  }

  /**
   * Clear local cache
   */
  clearLocalCache(): void {
    this.localCache.clear();
    this.stats.localCacheSize = 0;
  }

  /**
   * Flush pending batch operations
   */
  async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const anchors = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    try {
      const serialized = this.serializer.serializeBatch(anchors);

      await this.pythonBridge.execute({
        module: 'lmcache',
        function: 'batch_update',
        params: {
          anchors: serialized,
        },
      });

      this.stats.totalAnchors += anchors.length;
    } catch (error) {
      this.emit('error', { operation: 'flushBatch', error });
      if (this.config.enableMetrics) {
        this.stats.failedRequests++;
      }
      // Re-queue failed anchors
      this.batchQueue.unshift(...anchors);
      throw error;
    }
  }

  /**
   * Close adapter and cleanup resources
   */
  async close(): Promise<void> {
    // Flush any pending batch operations
    if (this.batchQueue.length > 0) {
      try {
        await this.flushBatch();
      } catch {
        // Ignore errors during shutdown
      }
    }

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Close Python bridge
    this.pythonBridge.close();

    // Clear local cache
    this.localCache.clear();
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Lookup in local cache
   */
  private lookupLocal(embedding: number[], maxDistance: number): KVAnchor | null {
    let bestMatch: KVAnchor | null = null;
    let bestDistance = maxDistance;
    let cleanedUp = false;

    const now = Date.now();

    for (const [anchorId, cached] of this.localCache) {
      // Skip expired entries
      if (cached.expiresAt < now) {
        this.localCache.delete(anchorId);
        cleanedUp = true;
        continue;
      }

      const distance = this.cosineDistance(embedding, cached.anchor.embedding);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = cached.anchor;
      }
    }

    // Update stats if we cleaned up entries
    if (cleanedUp) {
      this.stats.localCacheSize = this.localCache.size;
    }

    return bestMatch;
  }

  /**
   * Cache anchor locally
   */
  private cacheLocal(anchor: KVAnchor, ttl?: number): void {
    const cacheTtl = ttl ?? this.config.localCacheTtl ?? 3600000; // 1 hour default
    const expiresAt = Date.now() + cacheTtl;

    // Enforce cache size limit
    const maxSize = this.config.localCacheSize ?? 1000;
    if (this.localCache.size >= maxSize) {
      this.evictOldestLocal();
    }

    this.localCache.set(anchor.anchorId, { anchor, expiresAt });
    this.stats.localCacheSize = this.localCache.size;
  }

  /**
   * Evict oldest entry from local cache
   */
  private evictOldestLocal(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, cached] of this.localCache) {
      if (cached.expiresAt < oldestTime) {
        oldestTime = cached.expiresAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.localCache.delete(oldestId);
    }
  }

  /**
   * Convert KVAnchor to LMCache format
   */
  private toLMCacheFormat(anchor: KVAnchor): LMKVCache {
    return {
      keys: Array.from(anchor.compressedKeys).map(v => [v]),
      values: Array.from(anchor.compressedValues).map(v => [v]),
      layerId: anchor.layerId,
      segmentId: anchor.segmentId,
      tokens: [], // Token IDs not stored in anchor
      metadata: {
        sourceAgentId: anchor.sourceAgentId,
        qualityScore: anchor.qualityScore,
        compressionRatio: anchor.compressionRatio,
        createdAt: anchor.createdAt,
        embedding: anchor.embedding,
        usageCount: anchor.usageCount,
      },
    };
  }

  /**
   * Convert LMCache format to KVAnchor
   */
  private fromLMCacheFormat(lmCache: LMKVCache): KVAnchor {
    const keys = new Float32Array(lmCache.keys.map(k => k[0] || 0));
    const values = new Float32Array(lmCache.values.map(v => v[0] || 0));

    return {
      anchorId: this.generateAnchorId(lmCache),
      layerId: lmCache.layerId,
      segmentId: lmCache.segmentId,
      compressedKeys: keys,
      compressedValues: values,
      embedding: lmCache.metadata.embedding || [],
      sourceSegmentId: lmCache.segmentId,
      sourceAgentId: lmCache.metadata.sourceAgentId || '',
      usageCount: lmCache.metadata.usageCount || 0,
      lastUsed: Date.now(),
      qualityScore: lmCache.metadata.qualityScore || 1.0,
      compressionRatio: lmCache.metadata.compressionRatio || 1.0,
      createdAt: lmCache.metadata.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Generate cache key for anchor
   */
  private generateCacheKey(anchor: KVAnchor): string {
    const components = [
      anchor.layerId,
      anchor.segmentId,
      anchor.sourceAgentId,
      this.hashArray(anchor.embedding),
    ];
    return components.join(':');
  }

  /**
   * Generate anchor ID from LMCache data
   */
  private generateAnchorId(lmCache: LMKVCache): string {
    return `lmcache-${lmCache.layerId}-${lmCache.segmentId}`;
  }

  /**
   * Hash array for unique identification
   */
  private hashArray(arr: number[]): string {
    // Simple hash - in production use proper hash function
    return arr.slice(0, 8).map(v => v.toFixed(4)).join(',');
  }

  /**
   * Calculate cosine distance
   */
  private cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return 1;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 1;

    return 1 - dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Record cache hit
   */
  private recordHit(startTime: number): void {
    const latency = Date.now() - startTime;
    this.stats.hitCount++;
    this.stats.totalRequests++;
    this.updateHitRate(true);
    this.updateAvgLatency(latency);
  }

  /**
   * Record cache miss
   */
  private recordMiss(startTime: number): void {
    const latency = Date.now() - startTime;
    this.stats.missCount++;
    this.stats.totalRequests++;
    this.updateHitRate(false);
    this.updateAvgLatency(latency);
  }

  /**
   * Record operation
   */
  private recordOperation(startTime: number): void {
    const latency = Date.now() - startTime;
    this.stats.totalRequests++;
    this.updateAvgLatency(latency);
  }

  /**
   * Record batch operation
   */
  private recordBatchOperation(count: number, duration: number): void {
    this.stats.batchOperations++;
    this.stats.avgBatchSize =
      (this.stats.avgBatchSize * (this.stats.batchOperations - 1) + count) /
      this.stats.batchOperations;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(isHit: boolean): void {
    const total = this.stats.hitCount + this.stats.missCount;
    const hits = this.stats.hitCount;
    this.stats.hitRate = total > 0 ? hits / total : 0;
  }

  /**
   * Update average latency
   */
  private updateAvgLatency(latency: number): void {
    if (!this.config.enableMetrics) return;

    this.operationLatencies.push(latency);

    // Keep only last 1000 latencies
    if (this.operationLatencies.length > 1000) {
      this.operationLatencies.shift();
    }

    const sum = this.operationLatencies.reduce((a, b) => a + b, 0);
    this.stats.avgLatency = sum / this.operationLatencies.length;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): LMCacheStats {
    return {
      totalAnchors: 0,
      hitRate: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      sizeBytes: 0,
      compressionRatio: 1.0,
      backendType: this.config.backend,
      isDistributed: this.config.enableRemote,
      activeConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      localCacheHits: 0,
      localCacheSize: 0,
      batchOperations: 0,
      avgBatchSize: 0,
    };
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    const timeout = this.config.batchTimeout || 1000;

    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.flushBatch().catch(err => {
          this.emit('error', { operation: 'batchProcessor', error: err });
        });
      }
    }, timeout);
  }

  /**
   * Start local cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, cached] of this.localCache) {
        if (cached.expiresAt < now) {
          this.localCache.delete(id);
        }
      }
      this.stats.localCacheSize = this.localCache.size;
    }, 60000); // Cleanup every minute
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create LMCache adapter with default configuration
 */
export function createLMCacheAdapter(
  config: Partial<LMCacheAdapterConfig> = {}
): LMCacheAdapter {
  const defaultConfig: LMCacheAdapterConfig = {
    backend: 'cpu',
    chunkSize: 256,
    maxChunks: 10000,
    compression: true,
    compressionType: 'gzip',
    compressionLevel: 6,
    evictionPolicy: 'lru',
    maxSizeGb: 10,
    enableRemote: false,
    maxConnections: 10,
    connectionTimeout: 30000,
    requestTimeout: 10000,
    maxRetries: 3,
    retryDelay: 1000,
    enableLocalCache: true,
    localCacheSize: 1000,
    localCacheTtl: 3600000,
    enableBatching: false,
    batchSize: 10,
    batchTimeout: 1000,
    enableMetrics: true,
    ...config,
  };

  return new LMCacheAdapter(defaultConfig);
}
