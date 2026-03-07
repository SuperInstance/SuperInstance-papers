# LMCache Integration Design for POLLN

**Design Document Version:** 1.0
**Date:** March 7, 2026
**Status:** Design Phase
**Authors:** POLLN Architecture Team

---

## Executive Summary

This document outlines the design for integrating LMCache (https://github.com/LMCache/LMCache) with POLLN's existing KV-cache system. The integration enables POLLN to leverage LMCache's production-grade KV cache management for improved performance in distributed agent coordination, while maintaining POLLN's unique anchor-based caching and federated learning capabilities.

**Key Objectives:**
- Bridge POLLN's KVAnchor/KVSegment types with LMCache's storage backend
- Enable cross-instance KV cache sharing for multi-agent scenarios
- Maintain POLLN's differential privacy and federated learning features
- Provide seamless adapter interface for optional LMCache integration

---

## Table of Contents

1. [LMCache API Analysis](#lmcache-api-analysis)
2. [Adapter Interface Specification](#adapter-interface-specification)
3. [Serialization Format](#serialization-format)
4. [Integration Code Examples](#integration-code-examples)
5. [Distributed Cache Coordination](#distributed-cache-coordination)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Roadmap](#implementation-roadmap)

---

## 1. LMCache API Analysis

### 1.1 LMCache Architecture Overview

Based on analysis of the LMCache repository, the system consists of:

```
┌─────────────────────────────────────────────────────────────┐
│                    LMCache Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Application Layer (vLLM, SGLang, etc.)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LMCache Engine Interface                │    │
│  │  - lookup(key, tokens)                              │    │
│  │  - update(key, kv_cache)                            │    │
│  │  - evict(key)                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │           Storage Backend Interface                 │    │
│  │  - AbstractBackend                                  │    │
│  │    - contains(key, worker_id, tuple_hash)           │    │
│  │    - save(key, value, metadata)                     │    │
│  │    - lookup(key, worker_id, tuple_hash)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              Storage Implementations                │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │    │
│  │  │   GPU   │ │   CPU   │ │   Disk  │ │   S3    │  │    │
│  │  │ Backend │ │ Backend │ │ Backend │ │ Backend │  │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Core LMCache API (Python)

From LMCache's source code analysis, the key API components are:

#### 1.2.1 LMCacheEngine

```python
# lmcache/lmcache_engine.py (simplified)
class LMCacheEngine:
    def __init__(
        self,
        config: LMCacheEngineConfig,
        backend: "Backend",
    ):
        self.config = config
        self.backend = backend
        self.metadata = {}

    def lookup(
        self,
        key: str,
        tokens: Optional[List[int]] = None,
    ) -> Optional[KVCache]:
        """Lookup KV cache by key"""
        pass

    def update(
        self,
        key: str,
        kv_cache: KVCache,
        metadata: Optional[Dict] = None,
    ) -> None:
        """Store/update KV cache"""
        pass

    def evict(self, key: str) -> None:
        """Evict cache entry"""
        pass
```

#### 1.2.2 Backend Interface

```python
# lmcache/backends/backend.py (simplified)
class Backend(ABC):
    @abstractmethod
    def contains(
        self,
        key: str,
        worker_id: Optional[str] = None,
        tuple_hash: Optional[str] = None,
    ) -> bool:
        """Check if key exists in backend"""
        pass

    @abstractmethod
    def save(
        self,
        key: str,
        value: KVCache,
        metadata: Optional[Dict] = None,
    ) -> None:
        """Save KV cache to backend"""
        pass

    @abstractmethod
    def lookup(
        self,
        key: str,
        worker_id: Optional[str] = None,
        tuple_hash: Optional[str] = None,
    ) -> Optional[KVCache]:
        """Lookup KV cache from backend"""
        pass
```

#### 1.2.3 Configuration

```python
# LMCache configuration structure
@dataclass
class LMCacheEngineConfig:
    # Storage configuration
    backend: str  # "cpu", "disk", "s3", "redis"

    # Chunk configuration
    chunk_size: int = 256
    max_chunks: int = 10000

    # Compression
    compression: bool = True
    compression_type: str = "gzip"  # "gzip", "zstd"
    compression_level: int = 6

    # Eviction policy
    eviction_policy: str = "lru"  # "lru", "lfu"
    max_size_gb: float = 10.0

    # Distributed settings
    enable_remote: bool = False
    remote_url: Optional[str] = None
    worker_id: Optional[str] = None
```

### 1.3 LMCache Data Structures

#### 1.3.1 KVCache Format

```python
@dataclass
class KVCache:
    """KV cache storage format"""
    # Keys and values per layer
    # Shape: [num_layers, num_tokens, num_heads, head_dim]
    keys: List[torch.Tensor]
    values: List[torch.Tensor]

    # Metadata
    num_tokens: int
    model_config: ModelConfig

    # Optional: Compressed representation
    compressed_keys: Optional[bytes] = None
    compressed_values: Optional[bytes] = None
```

#### 1.3.2 Cache Key Generation

```python
def generate_cache_key(
    prompt_tokens: List[int],
    model_config: ModelConfig,
    worker_id: Optional[str] = None,
) -> str:
    """Generate unique cache key"""
    components = [
        model_config.model_name,
        model_config.precision,
        str(prompt_tokens),  # Token sequence
        worker_id or "default",
    ]
    return hashlib.sha256("|".join(components).encode()).hexdigest()
```

### 1.4 Integration Points with POLLN

| LMCache Component | POLLN Equivalent | Integration Strategy |
|-------------------|------------------|---------------------|
| KVCache | KVSegment/KVAnchor | Adapter converts between formats |
| Cache Key (hash) | Anchor ID + embedding hash | Bidirectional mapping |
| Backend Storage | KVAnchorPool | LMCache as optional backend |
| Metadata | KVAnchor metadata | Enrich POLLN metadata with LMCache fields |

---

## 2. Adapter Interface Specification

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  POLLN-LMCache Adapter                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POLLN Layer                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              KVAnchorPool (kvanchor.ts)             │    │
│  │  - anchors: Map<string, KVAnchor>                   │    │
│  │  - match(embedding) -> AnchorMatch[]                │    │
│  │  - store(anchor) -> void                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │          LMCacheAdapter (New Component)             │    │
│  │  - toLMCache(anchor) -> LMCacheKVCache              │    │
│  │  - fromLMCache(lmCache) -> KVAnchor                 │    │
│  │  - lookup(embedding) -> Optional<KVAnchor>          │    │
│  │  - store(anchor) -> void                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              LMCache Backend (Python)               │    │
│  │  - LMCacheEngine                                    │    │
│  │  - Backend (CPU/Disk/S3)                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 TypeScript Adapter Interface

```typescript
/**
 * LMCache Adapter Interface
 * Bridges POLLN's KVAnchor system with LMCache backend
 */
export interface ILMCacheAdapter {
  /**
   * Check if LMCache backend is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Lookup KV cache by embedding
   * @param embedding - Query embedding vector
   * @param options - Lookup options
   * @returns Matching anchor or null
   */
  lookup(
    embedding: number[],
    options?: LMCacheLookupOptions
  ): Promise<KVAnchor | null>;

  /**
   * Store anchor in LMCache
   * @param anchor - Anchor to store
   * @param options - Storage options
   */
  store(
    anchor: KVAnchor,
    options?: LMCacheStoreOptions
  ): Promise<void>;

  /**
   * Batch lookup for multiple embeddings
   * @param embeddings - Array of query embeddings
   * @returns Array of matching anchors
   */
  batchLookup(
    embeddings: number[][]
  ): Promise<(KVAnchor | null)[]>;

  /**
   * Batch store multiple anchors
   * @param anchors - Anchors to store
   */
  batchStore(
    anchors: KVAnchor[]
  ): Promise<void>;

  /**
   * Evict anchor from cache
   * @param anchorId - ID of anchor to evict
   */
  evict(anchorId: string): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<LMCacheStats>;
}

/**
 * Lookup options
 */
export interface LMCacheLookupOptions {
  /**
   * Maximum distance threshold for similarity
   */
  maxDistance?: number;

  /**
   * Number of results to return
   */
  topK?: number;

  /**
   * Check local cache first
   */
  checkLocalFirst?: boolean;

  /**
   * Update metadata on hit
   */
  updateMetadata?: boolean;
}

/**
 * Store options
 */
export interface LMCacheStoreOptions {
  /**
   * Sync to remote backend
   */
  syncRemote?: boolean;

  /**
   * Apply compression
   */
  compress?: boolean;

   /**
   * Time-to-live in seconds
   */
  ttl?: number;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics
 */
export interface LMCacheStats {
  totalAnchors: number;
  hitRate: number;
  missCount: number;
  evictionCount: number;
  sizeBytes: number;
  compressionRatio: number;
  backendType: string;
  isDistributed: boolean;
}
```

### 2.3 Adapter Implementation

```typescript
/**
 * LMCache Adapter Implementation
 * Bridges POLLN KVAnchor system with LMCache Python backend
 */
export class LMCacheAdapter implements ILMCacheAdapter {
  private pythonBridge: PythonBridge;
  private config: LMCacheAdapterConfig;
  private localCache: Map<string, KVAnchor>;
  private stats: LMCacheStats;

  constructor(config: LMCacheAdapterConfig) {
    this.config = config;
    this.pythonBridge = new PythonBridge(config.pythonPath);
    this.localCache = new Map();
    this.stats = this.initializeStats();

    // Initialize LMCache backend
    this.initializeBackend();
  }

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

  async lookup(
    embedding: number[],
    options: LMCacheLookupOptions = {}
  ): Promise<KVAnchor | null> {
    const {
      maxDistance = 0.3,
      topK = 1,
      checkLocalFirst = true,
      updateMetadata = true,
    } = options;

    // Check local cache first
    if (checkLocalFirst) {
      const localResult = this.lookupLocal(embedding, maxDistance);
      if (localResult) {
        if (updateMetadata) {
          localResult.matchCount++;
          localResult.lastMatched = Date.now();
        }
        this.stats.hitRate = this.updateHitRate(true);
        return localResult;
      }
    }

    // Query LMCache backend
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

      if (result.data && result.data.length > 0) {
        const anchor = this.fromLMCacheFormat(result.data[0]);

        // Cache locally
        this.localCache.set(anchor.anchorId, anchor);

        if (updateMetadata) {
          anchor.matchCount++;
          anchor.lastMatched = Date.now();
        }

        this.stats.hitRate = this.updateHitRate(true);
        return anchor;
      }
    } catch (error) {
      console.error('LMCache lookup error:', error);
    }

    this.stats.hitRate = this.updateHitRate(false);
    this.stats.missCount++;
    return null;
  }

  async store(
    anchor: KVAnchor,
    options: LMCacheStoreOptions = {}
  ): Promise<void> {
    const {
      syncRemote = true,
      compress = true,
      ttl,
      metadata = {},
    } = options;

    // Store locally
    this.localCache.set(anchor.anchorId, anchor);

    // Store in LMCache backend
    if (syncRemote) {
      try {
        const lmCacheFormat = this.toLMCacheFormat(anchor);

        await this.pythonBridge.execute({
          module: 'lmcache',
          function: 'update',
          params: {
            key: this.generateCacheKey(anchor),
            kv_cache: lmCacheFormat,
            metadata: {
              ...metadata,
              ttl,
              compressed: compress,
            },
          },
        });

        this.stats.totalAnchors++;
      } catch (error) {
        console.error('LMCache store error:', error);
      }
    }
  }

  async batchLookup(
    embeddings: number[][]
  ): Promise<(KVAnchor | null)[]> {
    const results: (KVAnchor | null)[] = [];

    for (const embedding of embeddings) {
      const result = await this.lookup(embedding);
      results.push(result);
    }

    return results;
  }

  async batchStore(anchors: KVAnchor[]): Promise<void> {
    for (const anchor of anchors) {
      await this.store(anchor);
    }
  }

  async evict(anchorId: string): Promise<void> {
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
      console.error('LMCache evict error:', error);
    }
  }

  async getStats(): Promise<LMCacheStats> {
    // Refresh stats from backend
    try {
      const backendStats = await this.pythonBridge.execute({
        module: 'lmcache',
        function: 'get_stats',
      });

      return {
        ...this.stats,
        ...backendStats.data,
      };
    } catch {
      return { ...this.stats };
    }
  }

  // Private methods

  private lookupLocal(
    embedding: number[],
    maxDistance: number
  ): KVAnchor | null {
    let bestMatch: KVAnchor | null = null;
    let bestDistance = maxDistance;

    for (const anchor of this.localCache.values()) {
      const distance = this.cosineDistance(
        embedding,
        anchor.embedding
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = anchor;
      }
    }

    return bestMatch;
  }

  private toLMCacheFormat(anchor: KVAnchor): LMKVCache {
    return {
      keys: this.decodeCompressedData(anchor.compressedKeys),
      values: this.decodeCompressedData(anchor.compressedValues),
      layer_id: anchor.layerId,
      segment_id: anchor.segmentId,
      tokens: [],  // Token IDs not stored in anchor
      metadata: {
        source_agent_id: anchor.sourceAgentId,
        quality_score: anchor.qualityScore,
        compression_ratio: anchor.compressionRatio,
        created_at: anchor.createdAt,
      },
    };
  }

  private fromLMCacheFormat(lmCache: LMKVCache): KVAnchor {
    const compressed = this.compressData(lmCache.keys, lmCache.values);

    return {
      anchorId: this.generateAnchorId(lmCache),
      layerId: lmCache.layer_id,
      segmentId: lmCache.segment_id,
      compressedKeys: compressed.keys,
      compressedValues: compressed.values,
      embedding: lmCache.metadata.embedding || [],
      sourceSegmentId: lmCache.segment_id,
      sourceAgentId: lmCache.metadata.source_agent_id || '',
      usageCount: lmCache.metadata.usage_count || 0,
      lastUsed: Date.now(),
      qualityScore: lmCache.metadata.quality_score || 1.0,
      compressionRatio: compressed.ratio,
      createdAt: lmCache.metadata.created_at || Date.now(),
      updatedAt: Date.now(),
    };
  }

  private generateCacheKey(anchor: KVAnchor): string {
    const components = [
      anchor.layerId,
      anchor.segmentId,
      anchor.sourceAgentId,
      // Hash embedding for uniqueness
      this.hashArray(anchor.embedding),
    ];
    return components.join(':');
  }

  private generateAnchorId(lmCache: LMKVCache): string {
    return `${lmCache.layerId}:${lmCache.segmentId}`;
  }

  private hashArray(arr: number[]): string {
    // Simple hash for demo - use proper hash in production
    return arr.map(v => v.toFixed(4)).join(',');
  }

  private cosineDistance(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return 1 - dotProduct / (magnitudeA * magnitudeB);
  }

  private updateHitRate(isHit: boolean): number {
    const total = this.stats.hitCount + this.stats.missCount + (isHit ? 0 : 1);
    const hits = this.stats.hitCount + (isHit ? 1 : 0);
    return total > 0 ? hits / total : 0;
  }

  private initializeStats(): LMCacheStats {
    return {
      totalAnchors: 0,
      hitRate: 0,
      missCount: 0,
      evictionCount: 0,
      sizeBytes: 0,
      compressionRatio: 1.0,
      backendType: this.config.backend,
      isDistributed: this.config.enableRemote,
    };
  }

  private async initializeBackend(): Promise<void> {
    await this.pythonBridge.execute({
      module: 'lmcache',
      function: 'initialize',
      params: {
        backend: this.config.backend,
        chunk_size: this.config.chunkSize,
        max_chunks: this.config.maxChunks,
        compression: this.config.compression,
        eviction_policy: this.config.evictionPolicy,
        max_size_gb: this.config.maxSizeGb,
        enable_remote: this.config.enableRemote,
        remote_url: this.config.remoteUrl,
      },
    });
  }
}

/**
 * Python Bridge for communicating with LMCache backend
 */
class PythonBridge {
  constructor(private pythonPath: string) {}

  async execute(request: BridgeRequest): Promise<BridgeResponse> {
    // Implementation using child_process or HTTP bridge
    // This is a placeholder - actual implementation would:
    // 1. Spawn Python process or connect to running server
    // 2. Send request via IPC or HTTP
    // 3. Parse response and return

    throw new Error('Not implemented');
  }
}

/**
 * Type definitions
 */
interface LMCacheAdapterConfig {
  pythonPath: string;
  backend: 'cpu' | 'disk' | 's3' | 'redis';
  chunkSize: number;
  maxChunks: number;
  compression: boolean;
  evictionPolicy: 'lru' | 'lfu';
  maxSizeGb: number;
  enableRemote: boolean;
  remoteUrl?: string;
}

interface LMKVCache {
  keys: number[][];
  values: number[][];
  layer_id: number;
  segment_id: string;
  tokens: number[];
  metadata: {
    source_agent_id?: string;
    quality_score?: number;
    compression_ratio?: number;
    created_at?: number;
    embedding?: number[];
    usage_count?: number;
  };
}

interface BridgeRequest {
  module: string;
  function: string;
  params?: Record<string, unknown>;
}

interface BridgeResponse {
  status: 'ok' | 'error';
  data?: unknown;
  error?: string;
}
```

---

## 3. Serialization Format

### 3.1 KVAnchor to LMCache Format Mapping

```typescript
/**
 * Serializer for converting between POLLN KVAnchor and LMCache formats
 */
export class KVCacheSerializer {
  /**
   * Serialize KVAnchor to LMCache format
   */
  serialize(anchor: KVAnchor): SerializedLMCache {
    return {
      // Header
      version: 1,
      format: 'polln-kvanchor',
      timestamp: Date.now(),

      // Identification
      anchor_id: anchor.anchorId,
      layer_id: anchor.layerId,
      segment_id: anchor.segmentId,
      source_agent_id: anchor.sourceAgentId,

      // KV Cache Data
      kv_data: {
        keys: this.serializeTensor(anchor.compressedKeys),
        values: this.serializeTensor(anchor.compressedValues),
      },

      // Embedding
      embedding: {
        vector: anchor.embedding,
        dimension: anchor.embedding.length,
      },

      // Metadata
      metadata: {
        quality_score: anchor.qualityScore,
        compression_ratio: anchor.compressionRatio,
        usage_count: anchor.usageCount,
        last_used: anchor.lastUsed,
        created_at: anchor.createdAt,
        updated_at: anchor.updatedAt,
        cluster_id: anchor.clusterId,
        cluster_center_distance: anchor.clusterCenterDistance,
      },

      // Differential Privacy (for federated sharing)
      privacy: {
        epsilon: 0.0,  // Set by PrivacyAwareAnchors
        delta: 0.0,
        noise_scale: 0.0,
      },
    };
  }

  /**
   * Deserialize LMCache format to KVAnchor
   */
  deserialize(data: SerializedLMCache): KVAnchor {
    return {
      anchorId: data.anchor_id,
      layerId: data.layer_id,
      segmentId: data.segment_id,
      compressedKeys: this.deserializeTensor(data.kv_data.keys),
      compressedValues: this.deserializeTensor(data.kv_data.values),
      embedding: data.embedding.vector,
      sourceSegmentId: data.segment_id,
      sourceAgentId: data.source_agent_id,
      usageCount: data.metadata.usage_count,
      lastUsed: data.metadata.last_used,
      qualityScore: data.metadata.quality_score,
      compressionRatio: data.metadata.compression_ratio,
      createdAt: data.metadata.created_at,
      updatedAt: data.metadata.updated_at,
      clusterId: data.metadata.cluster_id,
      clusterCenterDistance: data.metadata.cluster_center_distance,
    };
  }

  /**
   * Serialize tensor to efficient binary format
   */
  private serializeTensor(data: Float32Array): SerializedTensor {
    // Use binary representation for efficiency
    const buffer = data.buffer;
    const base64 = this.bufferToBase64(buffer);

    return {
      dtype: 'float32',
      shape: [data.length],
      data: base64,
      compressed: true,
    };
  }

  /**
   * Deserialize tensor from binary format
   */
  private deserializeTensor(tensor: SerializedTensor): Float32Array {
    const buffer = this.base64ToBuffer(tensor.data);
    return new Float32Array(buffer);
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Serialized LMCache format
 */
interface SerializedLMCache {
  version: number;
  format: string;
  timestamp: number;

  anchor_id: string;
  layer_id: number;
  segment_id: string;
  source_agent_id: string;

  kv_data: {
    keys: SerializedTensor;
    values: SerializedTensor;
  };

  embedding: {
    vector: number[];
    dimension: number;
  };

  metadata: {
    quality_score: number;
    compression_ratio: number;
    usage_count: number;
    last_used: number;
    created_at: number;
    updated_at: number;
    cluster_id?: string;
    cluster_center_distance?: number;
  };

  privacy: {
    epsilon: number;
    delta: number;
    noise_scale: number;
  };
}

interface SerializedTensor {
  dtype: string;
  shape: number[];
  data: string;  // Base64 encoded binary
  compressed: boolean;
}
```

### 3.2 Binary Format Specification

For high-performance serialization, we define a binary format:

```
┌─────────────────────────────────────────────────────────────┐
│              KVCache Binary Format (Version 1)               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Header (32 bytes)                                           │
│  ├─ Magic Number (4 bytes): "PKVC"                          │
│  ├─ Version (2 bytes): 0x0001                               │
│  ├─ Flags (2 bytes): [compressed:1, encrypted:1, ...]      │
│  ├─ Timestamp (8 bytes): Unix timestamp                     │
│  ├─ Layer ID (4 bytes): uint32                              │
│  ├─ Data size (8 bytes): uint64                             │
│  └─ Reserved (4 bytes)                                      │
│                                                               │
│  Metadata Section (variable length)                         │
│  ├─ Anchor ID length (2 bytes)                              │
│  ├─ Anchor ID (variable)                                    │
│  ├─ Segment ID length (2 bytes)                             │
│  ├─ Segment ID (variable)                                   │
│  ├─ Source Agent ID length (2 bytes)                        │
│  ├─ Source Agent ID (variable)                              │
│  ├─ Quality score (4 bytes): float32                        │
│  ├─ Compression ratio (4 bytes): float32                    │
│  ├─ Usage count (4 bytes): uint32                           │
│  ├─ Embedding dimension (4 bytes): uint32                   │
│  └─ Embedding data (dim * 4 bytes): float32 array           │
│                                                               │
│  KV Data Section (variable length)                          │
│  ├─ Keys length (4 bytes): uint32                           │
│  ├─ Keys data (variable): Float32Array                      │
│  ├─ Values length (4 bytes): uint32                         │
│  └─ Values data (variable): Float32Array                    │
│                                                               │
│  Privacy Section (24 bytes, optional)                       │
│  ├─ Epsilon (8 bytes): float64                              │
│  ├─ Delta (8 bytes): float64                                │
│  └─ Noise scale (8 bytes): float64                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Integration Code Examples

### 4.1 Basic Usage

```typescript
/**
 * Example: Basic LMCache integration with KVAnchorPool
 */
import { KVAnchorPool, LMCacheAdapter } from '@polln/core';

async function basicIntegrationExample() {
  // Initialize LMCache adapter
  const lmCacheAdapter = new LMCacheAdapter({
    pythonPath: '/usr/bin/python3',
    backend: 'disk',
    chunkSize: 256,
    maxChunks: 10000,
    compression: true,
    evictionPolicy: 'lru',
    maxSizeGb: 10,
    enableRemote: false,
  });

  // Check availability
  const available = await lmCacheAdapter.isAvailable();
  if (!available) {
    console.error('LMCache backend not available');
    return;
  }

  // Create KVAnchorPool with LMCache backend
  const anchorPool = new KVAnchorPool({
    maxAnchors: 1000,
    enableClustering: true,
    lmCacheBackend: lmCacheAdapter,
  });

  // Query for similar anchors
  const queryEmbedding = Array(64).fill(0).map(() => Math.random());
  const matches = await anchorPool.match(queryEmbedding, {
    maxDistance: 0.3,
    topK: 5,
    useLMCache: true,
  });

  console.log(`Found ${matches.length} matching anchors`);

  // Store new anchor
  const newAnchor: KVAnchor = {
    anchorId: 'anchor_123',
    layerId: 0,
    segmentId: 'segment_456',
    compressedKeys: new Float32Array(128),
    compressedValues: new Float32Array(128),
    embedding: queryEmbedding,
    sourceSegmentId: 'segment_456',
    sourceAgentId: 'agent_789',
    usageCount: 0,
    lastUsed: Date.now(),
    qualityScore: 1.0,
    compressionRatio: 0.5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await anchorPool.store(newAnchor, {
    syncToLMCache: true,
    compress: true,
  });
}
```

### 4.2 Federated Learning Integration

```typescript
/**
 * Example: LMCache integration with FederatedKVSync
 */
import { FederatedKVSync, LMCacheAdapter, PrivacyAwareAnchors } from '@polln/core';

async function federatedIntegrationExample() {
  // Initialize LMCache adapter with remote backend
  const lmCacheAdapter = new LMCacheAdapter({
    pythonPath: '/usr/bin/python3',
    backend: 's3',
    chunkSize: 256,
    maxChunks: 10000,
    compression: true,
    evictionPolicy: 'lru',
    maxSizeGb: 100,
    enableRemote: true,
    remoteUrl: 's3://polln-kvcache/production',
  });

  // Create privacy-aware anchor manager
  const privacyManager = new PrivacyAwareAnchors({
    epsilon: 1.0,
    delta: 1e-5,
    noiseScale: 0.1,
  });

  // Create federated sync with LMCache
  const federatedSync = new FederatedKVSync({
    colonyId: 'colony_1',
    lmCacheBackend: lmCacheAdapter,
    privacyManager,
  });

  // Share anchors with differential privacy
  const localAnchors = await getLocalAnchors();
  const privateAnchors = privacyManager.addNoise(localAnchors);

  await federatedSync.shareToMeadow(privateAnchors, {
    syncToLMCache: true,
    applyPrivacy: true,
  });

  // Fetch anchors from other colonies
  const remoteAnchors = await federatedSync.fetchFromMeadow({
    colonyIds: ['colony_2', 'colony_3'],
    useLMCache: true,
    maxAnchors: 100,
  });

  // Aggregate with privacy preservation
  const aggregated = await federatedSync.aggregateAnchors(
    localAnchors,
    remoteAnchors,
    {
      method: 'weighted-average',
      preservePrivacy: true,
    }
  );

  // Store aggregated anchors
  await federatedSync.storeAggregated(aggregated, {
    syncToLMCache: true,
  });
}
```

### 4.3 Multi-Tier Caching

```typescript
/**
 * Example: Multi-tier caching with LMCache
 */
import { KVAnchorPool, LMCacheAdapter } from '@polln/core';

async function multiTierCachingExample() {
  // Initialize multiple LMCache backends
  const gpuCache = new LMCacheAdapter({
    backend: 'cpu',  // Using CPU as proxy for GPU
    maxSizeGb: 1,
    evictionPolicy: 'lru',
  });

  const diskCache = new LMCacheAdapter({
    backend: 'disk',
    maxSizeGb: 50,
    evictionPolicy: 'lfu',
  });

  const cloudCache = new LMCacheAdapter({
    backend: 's3',
    maxSizeGb: 1000,
    enableRemote: true,
    remoteUrl: 's3://polln-kvcache/cloud',
  });

  // Create multi-tier cache manager
  const multiTierCache = new MultiTierKVCache({
    tiers: [
      { name: 'hot', backend: gpuCache, priority: 1 },
      { name: 'warm', backend: diskCache, priority: 2 },
      { name: 'cold', backend: cloudCache, priority: 3 },
    ],
    promotionPolicy: 'frequency-based',
    demotionPolicy: 'time-based',
  });

  // Lookup with tier fallback
  const queryEmbedding = Array(64).fill(0).map(() => Math.random());
  const result = await multiTierCache.lookup(queryEmbedding, {
    checkAllTiers: true,
    promoteOnHit: true,
  });

  if (result.found) {
    console.log(`Found in tier: ${result.tier}`);
    console.log(`Promoted: ${result.promoted}`);
  }

  // Store with automatic tier selection
  const newAnchor = await createNewAnchor();
  await multiTierCache.store(newAnchor, {
    tierSelection: 'automatic',  // Or specify tier: 'hot' | 'warm' | 'cold'
  });
}
```

---

## 5. Distributed Cache Coordination

### 5.1 Architecture for Distributed Caching

```
┌─────────────────────────────────────────────────────────────┐
│              Distributed KVCache Coordination                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POLLN Colony 1              POLLN Colony 2                  │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │  KVAnchorPool   │        │  KVAnchorPool   │             │
│  │  + Local Cache  │        │  + Local Cache  │             │
│  └────────┬────────┘        └────────┬────────┘             │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      │                                       │
│           ┌──────────▼──────────┐                            │
│           │   LMCache Cluster   │                            │
│           │   (Coordination)    │                            │
│           └──────────┬──────────┘                            │
│                      │                                       │
│    ┌─────────────────┼─────────────────┐                    │
│    │                 │                 │                    │
│ ┌──▼────┐      ┌────▼────┐      ┌────▼──┐                  │
│ │ Redis │      │   Disk  │      │  S3   │                  │
│ │ (Hot) │      │  (Warm) │      │ (Cold)│                  │
│ └───────┘      └─────────┘      └───────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Cache Invalidation Strategy

```typescript
/**
 * Cache invalidation for distributed KVCache
 */
export class DistributedCacheInvalidator {
  private invalidationChannel: InvalidatorChannel;
  localVersion: Map<string, number> = new Map();

  constructor(channel: InvalidatorChannel) {
    this.invalidationChannel = channel;

    // Subscribe to invalidation events
    this.invalidationChannel.subscribe(this.handleInvalidation.bind(this));
  }

  /**
   * Invalidate anchor across all caches
   */
  async invalidate(anchorId: string, reason: string): Promise<void> {
    const version = this.localVersion.get(anchorId) || 0;

    // Publish invalidation event
    await this.invalidationChannel.publish({
      type: 'invalidate',
      anchorId,
      version,
      reason,
      timestamp: Date.now(),
    });

    // Update local version
    this.localVersion.set(anchorId, version + 1);
  }

  /**
   * Handle invalidation from remote
   */
  private async handleInvalidation(event: InvalidationEvent): Promise<void> {
    if (event.type === 'invalidate') {
      const localVersion = this.localVersion.get(event.anchorId) || 0;

      // Only invalidate if remote version is newer
      if (event.version > localVersion) {
        await this.removeFromLocalCache(event.anchorId);
        this.localVersion.set(event.anchorId, event.version);
      }
    }
  }

  /**
   * Batch invalidate multiple anchors
   */
  async batchInvalidate(
    anchorIds: string[],
    reason: string
  ): Promise<void> {
    await Promise.all(
      anchorIds.map(id => this.invalidate(id, reason))
    );
  }

  private async removeFromLocalCache(anchorId: string): Promise<void> {
    // Remove from local KVAnchorPool
    // Implementation depends on KVAnchorPool structure
  }
}

interface InvalidationEvent {
  type: 'invalidate';
  anchorId: string;
  version: number;
  reason: string;
  timestamp: number;
}
```

### 5.3 Cache Synchronization

```typescript
/**
 * Cache synchronization for distributed deployment
 */
export class CacheSynchronizer {
  private lmCacheAdapter: LMCacheAdapter;
  private syncInterval: number;
  private syncTimer?: NodeJS.Timeout;

  constructor(
    lmCacheAdapter: LMCacheAdapter,
    syncIntervalMs: number = 60000  // 1 minute default
  ) {
    this.lmCacheAdapter = lmCacheAdapter;
    this.syncInterval = syncIntervalMs;
  }

  /**
   * Start periodic synchronization
   */
  start(): void {
    this.syncTimer = setInterval(
      this.sync.bind(this),
      this.syncInterval
    );
  }

  /**
   * Stop periodic synchronization
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Perform synchronization
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    let synced = 0;
    let failed = 0;

    try {
      // Get local anchors that need syncing
      const localAnchors = await this.getLocalAnchorsToSync();

      // Batch sync to LMCache
      for (const anchor of localAnchors) {
        try {
          await this.lmCacheAdapter.store(anchor, {
            syncRemote: true,
            compress: true,
          });
          synced++;
        } catch (error) {
          console.error(`Failed to sync anchor ${anchor.anchorId}:`, error);
          failed++;
        }
      }

      // Fetch remote updates
      const remoteUpdates = await this.fetchRemoteUpdates();

      return {
        synced,
        failed,
        received: remoteUpdates.length,
        duration: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        synced,
        failed,
        received: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<SyncResult> {
    return this.sync();
  }

  private async getLocalAnchorsToSync(): Promise<KVAnchor[]> {
    // Get anchors that have been modified since last sync
    // Implementation depends on KVAnchorPool structure
    return [];
  }

  private async fetchRemoteUpdates(): Promise<KVAnchor[]> {
    // Fetch updates from LMCache backend
    // Implementation depends on LMCache API
    return [];
  }
}

interface SyncResult {
  synced: number;
  failed: number;
  received: number;
  duration: number;
  success: boolean;
  error?: string;
}
```

---

## 6. Performance Considerations

### 6.1 Latency Analysis

| Operation | Local Cache | LMCache (CPU) | LMCache (Disk) | LMCache (S3) |
|-----------|-------------|---------------|----------------|--------------|
| Lookup | < 1ms | 1-5ms | 5-20ms | 50-200ms |
| Store | < 1ms | 2-10ms | 10-50ms | 100-500ms |
| Evict | < 1ms | 1-5ms | 5-20ms | 50-200ms |

### 6.2 Optimization Strategies

#### 6.2.1 Batching

```typescript
/**
 * Batch operations for better throughput
 */
export class BatchedLMCacheAdapter implements ILMCacheAdapter {
  private adapter: LMCacheAdapter;
  private batchConfig: BatchConfig;
  private pendingOps: Map<string, Promise<unknown>> = new Map();

  constructor(adapter: LMCacheAdapter, batchConfig: BatchConfig) {
    this.adapter = adapter;
    this.batchConfig = batchConfig;
  }

  async lookup(embedding: number[]): Promise<KVAnchor | null> {
    const key = this.hashEmbedding(embedding);

    // Check if there's a pending operation
    const pending = this.pendingOps.get(key);
    if (pending) {
      return pending as Promise<KVAnchor | null>;
    }

    // Create new lookup operation
    const promise = this.adapter.lookup(embedding);
    this.pendingOps.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingOps.delete(key);
    }
  }

  async batchStore(anchors: KVAnchor[]): Promise<void> {
    // Process in batches
    for (let i = 0; i < anchors.length; i += this.batchConfig.batchSize) {
      const batch = anchors.slice(i, i + this.batchConfig.batchSize);
      await Promise.all(
        batch.map(anchor => this.adapter.store(anchor))
      );
    }
  }
}
```

#### 6.2.2 Prefetching

```typescript
/**
 * Prefetch likely anchors
 */
export class PrefetchingLMCacheAdapter implements ILMCacheAdapter {
  private adapter: LMCacheAdapter;
  private prefetchStrategy: PrefetchStrategy;
  private prefetchCache: Map<string, KVAnchor> = new Map();

  async lookup(embedding: number[]): Promise<KVAnchor | null> {
    // Check prefetch cache first
    const key = this.hashEmbedding(embedding);
    const prefetched = this.prefetchCache.get(key);
    if (prefetched) {
      return prefetched;
    }

    // Lookup from adapter
    const result = await this.adapter.lookup(embedding);

    if (result) {
      // Trigger prefetch for similar embeddings
      this.triggerPrefetch(embedding);
    }

    return result;
  }

  private async triggerPrefetch(embedding: number[]): Promise<void> {
    const similar = await this.findSimilarEmbeddings(embedding);

    for (const emb of similar) {
      const key = this.hashEmbedding(emb);

      if (!this.prefetchCache.has(key)) {
        const anchor = await this.adapter.lookup(emb);
        if (anchor) {
          this.prefetchCache.set(key, anchor);
        }
      }
    }
  }
}
```

### 6.3 Memory Management

```typescript
/**
 * Memory-aware cache management
 */
export class MemoryAwareLMCacheAdapter implements ILMCacheAdapter {
  private adapter: LMCacheAdapter;
  private memoryLimit: number;
  private currentUsage: number = 0;
  private evictionPolicy: EvictionPolicy;

  constructor(
    adapter: LMCacheAdapter,
    memoryLimit: number,
    evictionPolicy: EvictionPolicy
  ) {
    this.adapter = adapter;
    this.memoryLimit = memoryLimit;
    this.evictionPolicy = evictionPolicy;
  }

  async store(anchor: KVAnchor): Promise<void> {
    const size = this.calculateSize(anchor);

    // Check if we need to evict
    if (this.currentUsage + size > this.memoryLimit) {
      await this.evictToMakeRoom(size);
    }

    // Store the anchor
    await this.adapter.store(anchor);
    this.currentUsage += size;
  }

  private async evictToMakeRoom(requiredSize: number): Promise<void> {
    const toEvict = await this.evictionPolicy.selectAnchorsToEvict(
      requiredSize,
      this.currentUsage
    );

    for (const anchorId of toEvict) {
      await this.adapter.evict(anchorId);
      this.currentUsage -= await this.getAnchorSize(anchorId);
    }
  }

  private calculateSize(anchor: KVAnchor): number {
    // Estimate memory usage
    const keySize = anchor.compressedKeys.byteLength;
    const valueSize = anchor.compressedValues.byteLength;
    const embeddingSize = anchor.embedding.length * 8;  // float64
    return keySize + valueSize + embeddingSize;
  }
}
```

### 6.4 Monitoring and Metrics

```typescript
/**
 * Performance monitoring for LMCache integration
 */
export class LMCacheMonitor {
  private metrics: CacheMetrics = {
    lookups: 0,
    hits: 0,
    misses: 0,
    stores: 0,
    evictions: 0,
    errors: 0,
    totalLatency: 0,
  };

  recordLookup(duration: number, hit: boolean): void {
    this.metrics.lookups++;
    this.metrics.totalLatency += duration;

    if (hit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
  }

  recordStore(duration: number): void {
    this.metrics.stores++;
    this.metrics.totalLatency += duration;
  }

  recordEviction(duration: number): void {
    this.metrics.evictions++;
    this.metrics.totalLatency += duration;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  getReport(): MetricsReport {
    return {
      hitRate: this.calculateHitRate(),
      avgLatency: this.metrics.totalLatency / this.metrics.lookups,
      operationCounts: {
        lookups: this.metrics.lookups,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        stores: this.metrics.stores,
        evictions: this.metrics.evictions,
        errors: this.metrics.errors,
      },
    };
  }

  private calculateHitRate(): number {
    if (this.metrics.lookups === 0) return 0;
    return this.metrics.hits / this.metrics.lookups;
  }
}

interface CacheMetrics {
  lookups: number;
  hits: number;
  misses: number;
  stores: number;
  evictions: number;
  errors: number;
  totalLatency: number;
}

interface MetricsReport {
  hitRate: number;
  avgLatency: number;
  operationCounts: {
    lookups: number;
    hits: number;
    misses: number;
    stores: number;
    evictions: number;
    errors: number;
  };
}
```

---

## 7. Implementation Roadmap

### Phase 1: Core Adapter (2-3 weeks)

**Deliverables:**
- LMCacheAdapter implementation
- Basic serialization/deserialization
- Python bridge for LMCache communication
- Unit tests for adapter functionality

**Tasks:**
1. Implement ILMCacheAdapter interface
2. Create KVCacheSerializer
3. Build PythonBridge for IPC
4. Write comprehensive tests

### Phase 2: Integration with KVAnchorPool (1-2 weeks)

**Deliverables:**
- Modified KVAnchorPool with LMCache backend support
- Fallback mechanism when LMCache unavailable
- Integration tests

**Tasks:**
1. Add optional LMCache backend to KVAnchorPool
2. Implement lookup/store with LMCache
3. Add fallback logic
4. Integration testing

### Phase 3: Federated Learning Integration (2-3 weeks)

**Deliverables:**
- LMCache integration with FederatedKVSync
- Privacy-aware cache sharing
- Cross-colony cache synchronization

**Tasks:**
1. Modify FederatedKVSync for LMCache
2. Implement privacy-preserving sharing
3. Add cache synchronization
4. Test federated scenarios

### Phase 4: Distributed Caching (3-4 weeks)

**Deliverables:**
- DistributedCacheInvalidator
- CacheSynchronizer
- Multi-tier caching support

**Tasks:**
1. Implement invalidation system
2. Build synchronization mechanism
3. Add multi-tier support
4. Test distributed scenarios

### Phase 5: Performance Optimization (2-3 weeks)

**Deliverables:**
- Batching support
- Prefetching strategy
- Memory-aware management
- Performance monitoring

**Tasks:**
1. Implement batched operations
2. Add prefetching
3. Build memory-aware cache
4. Create monitoring system

### Phase 6: Production Readiness (1-2 weeks)

**Deliverables:**
- Configuration management
- Error handling and recovery
- Documentation
- Deployment guides

**Tasks:**
1. Finalize configuration system
2. Add comprehensive error handling
3. Write documentation
4. Create deployment guides

---

## Appendix A: Configuration Examples

### A.1 Development Configuration

```typescript
const devConfig: LMCacheAdapterConfig = {
  pythonPath: '/usr/bin/python3',
  backend: 'cpu',
  chunkSize: 256,
  maxChunks: 1000,
  compression: true,
  evictionPolicy: 'lru',
  maxSizeGb: 1,
  enableRemote: false,
};
```

### A.2 Production Configuration

```typescript
const prodConfig: LMCacheAdapterConfig = {
  pythonPath: '/usr/bin/python3',
  backend: 's3',
  chunkSize: 512,
  maxChunks: 100000,
  compression: true,
  evictionPolicy: 'lfu',
  maxSizeGb: 1000,
  enableRemote: true,
  remoteUrl: 's3://polln-kvcache/production',
};
```

---

## Appendix B: Error Handling

```typescript
/**
 * Error handling for LMCache integration
 */
export class LMCacheErrorHandler {
  private retryConfig: RetryConfig;
  private fallbackEnabled: boolean;

  async handleOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (this.isRecoverable(error)) {
          await this.delay(this.retryConfig.backoffMs * (attempt + 1));
          continue;
        }

        break;
      }
    }

    // All attempts failed
    if (this.fallbackEnabled) {
      return this.fallback(context);
    }

    throw new LMCacheError(
      `Operation failed after ${this.retryConfig.maxAttempts} attempts: ${context}`,
      lastError
    );
  }

  private isRecoverable(error: Error): boolean {
    // Determine if error is recoverable
    return (
      error.message.includes('timeout') ||
      error.message.includes('connection') ||
      error.message.includes('temporary')
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private fallback<T>(context: string): T {
    // Fallback to local cache
    throw new Error('Fallback not implemented');
  }
}

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
}

class LMCacheError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'LMCacheError';
  }
}
```

---

## Conclusion

This design document provides a comprehensive specification for integrating LMCache with POLLN's KV-cache system. The integration enables POLLN to leverage LMCache's production-grade caching infrastructure while maintaining POLLN's unique features such as anchor-based caching, differential privacy, and federated learning.

**Key Benefits:**
- Improved cache hit rates through distributed sharing
- Reduced memory pressure through tiered storage
- Better scalability across multiple instances
- Maintained privacy and security through differential privacy

**Next Steps:**
1. Review and approve this design
2. Begin Phase 1 implementation
3. Set up development environment with LMCache
4. Create initial test suite

---

**Document Version:** 1.0
**Last Updated:** March 7, 2026
**Authors:** POLLN Architecture Team
**Status:** Ready for Review
