# KV System Interfaces for POLLN

**Knowledge-Value Caching and Retrieval System**

This document defines the TypeScript interfaces for the KV (Key-Value) system that integrates with POLLN's existing architecture. The KV system provides efficient caching, context management, and knowledge sharing across tiles, colonies, and the meadow.

---

## Table of Contents

1. [Core KV Interfaces](#core-kv-interfaces)
2. [Integration Interfaces](#integration-interfaces)
3. [Event Interfaces](#event-interfaces)
4. [Configuration Interfaces](#configuration-interfaces)
5. [Usage Examples](#usage-examples)

---

## Core KV Interfaces

### IKVStore

The foundational key-value storage interface with type safety and traceability.

```typescript
/**
 * Core KV Store Interface
 *
 * Provides type-safe key-value storage with:
 * - Traceability via causal chains
 * - Privacy tier support
 * - Subsumption layer integration
 * - A2A package compatibility
 */
export interface IKVStore<TKey = string, TValue = unknown> {
  /**
   * Retrieve a value by key
   * @param key - The key to retrieve
   * @param options - Retrieval options
   * @returns The value or undefined if not found
   */
  get<K extends TKey>(
    key: K,
    options?: KVGetOptions
  ): Promise<TValue | undefined>;

  /**
   * Set a value with optional metadata
   * @param key - The key to set
   * @param value - The value to store
   * @param options - Storage options
   * @returns The stored entry with metadata
   */
  set<K extends TKey, V extends TValue>(
    key: K,
    value: V,
    options?: KVSetOptions<TValue>
  ): Promise<KVEntry<TValue>>;

  /**
   * Delete a key
   * @param key - The key to delete
   * @returns True if deleted, false if not found
   */
  delete<K extends TKey>(key: K): Promise<boolean>;

  /**
   * Check if a key exists
   * @param key - The key to check
   * @returns True if the key exists
   */
  has<K extends TKey>(key: K): Promise<boolean>;

  /**
   * Clear all entries
   * @param options - Clear options (e.g., by privacy tier)
   * @returns Count of entries cleared
   */
  clear(options?: KVClearOptions): Promise<number>;

  /**
   * Get multiple keys in batch
   * @param keys - Array of keys to retrieve
   * @returns Map of keys to values
   */
  getBatch<K extends TKey>(
    keys: K[]
  ): Promise<Map<K, TValue>>;

  /**
   * Set multiple keys in batch
   * @param entries - Array of key-value pairs with options
   * @returns Array of stored entries
   */
  setBatch<K extends TKey, V extends TValue>(
    entries: Array<{ key: K; value: V; options?: KVSetOptions<TValue> }>
  ): Promise<KVEntry<TValue>[]>;

  /**
   * Get store statistics
   */
  getStats(): Promise<KVStoreStats>;
}

/**
 * KV Entry with metadata
 */
export interface KVEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessed: number;
  sizeBytes: number;
  ttl?: number;
  metadata: {
    privacyLevel: PrivacyLevel;
    subsumptionLayer: SubsumptionLayer;
    causalChainId: string;
    parentIds: string[];
    sourceTileId?: string;
    sourceColonyId?: string;
    tags?: string[];
  };
}

/**
 * Options for KV get operations
 */
export interface KVGetOptions {
  /**
   * Update access statistics
   */
  updateStats?: boolean;

  /**
   * Return entry with metadata
   */
  withMetadata?: boolean;

  /**
   * Check privacy level before returning
   */
  checkPrivacy?: boolean;

  /**
   * Required privacy level
   */
  requiredPrivacy?: PrivacyLevel;
}

/**
 * Options for KV set operations
 */
export interface KVSetOptions<T> {
  /**
   * Time-to-live in milliseconds
   */
  ttl?: number;

  /**
   * Privacy level for this entry
   */
  privacyLevel?: PrivacyLevel;

  /**
   * Subsumption layer for this entry
   */
  subsumptionLayer?: SubsumptionLayer;

  /**
   * Causal chain ID for traceability
   */
  causalChainId?: string;

  /**
   * Parent package IDs for traceability
   */
  parentIds?: string[];

  /**
   * Source tile ID
   */
  sourceTileId?: string;

  /**
   * Source colony ID
   */
  sourceColonyId?: string;

  /**
   * Tags for discovery
   */
  tags?: string[];

  /**
   * Custom serializer
   */
  serializer?: (value: T) => Buffer;

  /**
   * Custom deserializer
   */
  deserializer?: (buffer: Buffer) => T;

  /**
   * Compression level (0-9)
   */
  compressionLevel?: number;
}

/**
 * Options for KV clear operations
 */
export interface KVClearOptions {
  /**
   * Clear only entries with specific privacy level
   */
  privacyLevel?: PrivacyLevel;

  /**
   * Clear only entries older than timestamp
   */
  olderThan?: number;

  /**
   * Clear only entries with specific tags
   */
  tags?: string[];

  /**
   * Clear only expired entries
   */
  expiredOnly?: boolean;
}

/**
 * KV Store statistics
 */
export interface KVStoreStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitRate: number;
  missRate: number;
  avgAccessTimeMs: number;
  entriesByPrivacyLevel: Record<PrivacyLevel, number>;
  entriesBySubsumptionLayer: Record<SubsumptionLayer, number>;
  oldestEntry?: number;
  newestEntry?: number;
}
```

---

### IKVAnchor

Pattern matching and context anchoring for intelligent retrieval.

```typescript
/**
 * KV Anchor Interface
 *
 * Provides pattern-based retrieval and context anchoring:
 * - Semantic similarity matching
 * - Context-aware retrieval
 * - Pattern evolution and pruning
 */
export interface IKVAnchor {
  /**
   * Create an anchor point for a pattern
   * @param pattern - The pattern to anchor
   * @param context - Context information
   * @returns The created anchor
   */
  create(
    pattern: KVPattern,
    context: KVAnchorContext
  ): Promise<KVAnchor>;

  /**
   * Match entries to a pattern
   * @param pattern - The pattern to match
   * @param options - Matching options
   * @returns Array of matched entries with scores
   */
  match(
    pattern: KVPattern,
    options?: KVMatchOptions
  ): Promise<KVAnchorMatch[]>;

  /**
   * Update an existing anchor
   * @param anchorId - The anchor ID to update
   * @param updates - Partial updates to the anchor
   * @returns The updated anchor
   */
  update(
    anchorId: string,
    updates: Partial<KVAnchor>
  ): Promise<KVAnchor>;

  /**
   * Prune weak or stale anchors
   * @param options - Pruning options
   * @returns Count of pruned anchors
   */
  prune(options?: KVPruneOptions): Promise<number>;

  /**
   * Get anchor statistics
   */
  getStats(): Promise<KVAnchorStats>;
}

/**
 * KV Pattern for matching
 */
export interface KVPattern {
  id: string;
  embedding: number[];
  type: 'semantic' | 'syntactic' | 'structural';
  threshold: number;
  metadata: {
    sourceTileId?: string;
    createdAt: number;
    lastMatched: number;
    matchCount: number;
  };
}

/**
 * KV Anchor context
 */
export interface KVAnchorContext {
  colonyId: string;
  keeperId: string;
  timestamp: number;
  domain?: string;
  sequenceId?: string;
  priority?: number;
}

/**
 * KV Anchor entry
 */
export interface KVAnchor {
  id: string;
  pattern: KVPattern;
  context: KVAnchorContext;
  strength: number; // 0-1 scale
  lastAccessed: number;
  accessCount: number;
  relatedAnchors: string[];
  evolutionHistory: KVAnchorEvolution[];
}

/**
 * KV Anchor evolution record
 */
export interface KVAnchorEvolution {
  timestamp: number;
  type: 'created' | 'strengthened' | 'weakened' | 'merged' | 'split';
  deltaStrength: number;
  reason?: string;
}

/**
 * KV Anchor match result
 */
export interface KVAnchorMatch {
  anchorId: string;
  entryKey: string;
  score: number;
  confidence: number;
  matchType: 'exact' | 'semantic' | 'fuzzy';
  metadata: {
    matchedAt: number;
    patternDistance: number;
    semanticSimilarity: number;
  };
}

/**
 * Options for anchor matching
 */
export interface KVMatchOptions {
  /**
   * Minimum similarity threshold
   */
  minThreshold?: number;

  /**
   * Maximum number of results
   */
  maxResults?: number;

  /**
   * Include metadata in results
   */
  includeMetadata?: boolean;

  /**
   * Filter by privacy level
   */
  privacyLevel?: PrivacyLevel;

  /**
   * Filter by subsumption layer
   */
  subsumptionLayer?: SubsumptionLayer;

  /**
   * Match strategy
   */
  strategy?: 'exact' | 'semantic' | 'hybrid';
}

/**
 * Options for anchor pruning
 */
export interface KVPruneOptions {
  /**
   * Minimum strength threshold
   */
  minStrength?: number;

  /**
   * Maximum age in milliseconds
   */
  maxAge?: number;

  /**
   * Minimum access count
   */
  minAccessCount?: number;

  /**
   * Prune only if better alternative exists
   */
  pruneIfRedundant?: boolean;
}

/**
 * KV Anchor statistics
 */
export interface KVAnchorStats {
  totalAnchors: number;
  activeAnchors: number;
  avgStrength: number;
  avgMatchesPerAnchor: number;
  evolutionCount: number;
  patternsByType: Record<string, number>;
}
```

---

### IKVCache

Intelligent caching with slicing, concatenation, and compression.

```typescript
/**
 * KV Cache Interface
 *
 * Provides advanced caching capabilities:
 * - Context slicing and windowing
 * - Cache concatenation for merging
 * - Compression for efficient storage
 * - LRU and priority-based eviction
 */
export interface IKVCache {
  /**
   * Slice a cache entry by context window
   * @param key - The cache key
   * @param slice - Slice configuration
   * @returns The sliced cache entry
   */
  slice(
    key: string,
    slice: KVCacheSlice
  ): Promise<KVCacheEntry>;

  /**
   * Concatenate multiple cache entries
   * @param keys - Array of cache keys to concatenate
   * @param options - Concatenation options
   * @returns The concatenated cache entry
   */
  concat(
    keys: string[],
    options?: KVConcatOptions
  ): Promise<KVCacheEntry>;

  /**
   * Replace a portion of cache entry
   * @param key - The cache key
   * @param replacement - Replacement configuration
   * @returns The updated cache entry
   */
  replace(
    key: string,
    replacement: KVCacheReplacement
  ): Promise<KVCacheEntry>;

  /**
   * Compress a cache entry
   * @param key - The cache key
   * @param options - Compression options
   * @returns The compressed cache entry
   */
  compress(
    key: string,
    options?: KVCompressOptions
  ): Promise<KVCacheEntry>;

  /**
   * Decompress a cache entry
   * @param key - The cache key
   * @returns The decompressed cache entry
   */
  decompress(key: string): Promise<KVCacheEntry>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<KVCacheStats>;
}

/**
 * KV Cache entry
 */
export interface KVCacheEntry {
  key: string;
  value: unknown;
  metadata: KVCacheEntryMetadata;
  slices?: KVCacheSlice[];
  compressionInfo?: KVCompressionInfo;
}

/**
 * KV Cache entry metadata
 */
export interface KVCacheEntryMetadata {
  createdAt: number;
  updatedAt: number;
  accessedAt: number;
  accessCount: number;
  sizeBytes: number;
  compressedSizeBytes?: number;
  hitRate: number;
  priority: number;
  ttl?: number;
}

/**
 * KV Cache slice configuration
 */
export interface KVCacheSlice {
  start: number;
  end: number;
  stride?: number;
  includeMetadata?: boolean;
  filter?: (value: unknown) => boolean;
}

/**
 * KV Cache concatenation options
 */
export interface KVConcatOptions {
  /**
   * Separator between entries
   */
  separator?: string;

  /**
   * Deduplicate entries
   */
  deduplicate?: boolean;

  /**
   * Preserve order
   */
  preserveOrder?: boolean;

  /**
   * Merge metadata
   */
  mergeMetadata?: boolean;

  /**
   * Compress result
   */
  compress?: boolean;

  /**
   * New key for concatenated entry
   */
  newKey?: string;
}

/**
 * KV Cache replacement configuration
 */
export interface KVCacheReplacement {
  slice: KVCacheSlice;
  newValue: unknown;
  mergeStrategy?: 'replace' | 'merge' | 'append';
  updateMetadata?: boolean;
}

/**
 * KV Cache compression options
 */
export interface KVCompressOptions {
  algorithm?: 'gzip' | 'brotli' | 'lz4' | 'zstd';
  level?: number;
  threshold?: number; // Minimum size to compress
}

/**
 * KV Compression information
 */
export interface KVCompressionInfo {
  algorithm: string;
  level: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressedAt: number;
}

/**
 * KV Cache statistics
 */
export interface KVCacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  compressedSizeBytes: number;
  avgCompressionRatio: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  entriesByPriority: Record<number, number>;
}
```

---

### IKVSync

Synchronization and conflict resolution for distributed KV stores.

```typescript
/**
 * KV Sync Interface
 *
 * Provides distributed synchronization:
 * - Push/pull with remote stores
 * - Merge with conflict resolution
 * - Version vectors and causality
 * - Differential sync
 */
export interface IKVSync {
  /**
   * Push local changes to remote
   * @param remote - Remote store identifier
   * @param options - Push options
   * @returns Sync result with statistics
   */
  push(
    remote: string,
    options?: KVSyncPushOptions
  ): Promise<KVSyncResult>;

  /**
   * Pull changes from remote
   * @param remote - Remote store identifier
   * @param options - Pull options
   * @returns Sync result with statistics
   */
  pull(
    remote: string,
    options?: KVSyncPullOptions
  ): Promise<KVSyncResult>;

  /**
   * Merge changes with conflict resolution
   * @param remote - Remote store identifier
   * @param options - Merge options
   * @returns Merge result with conflicts
   */
  merge(
    remote: string,
    options?: KVSyncMergeOptions
  ): Promise<KVSyncMergeResult>;

  /**
   * Resolve a conflict
   * @param conflict - The conflict to resolve
   * @param resolution - Resolution strategy
   * @returns The resolved entry
   */
  resolveConflict(
    conflict: KVSyncConflict,
    resolution: KVConflictResolution
  ): Promise<KVEntry<unknown>>;

  /**
   * Get sync status
   */
  getStatus(): Promise<KVSyncStatus>;
}

/**
 * KV Sync push options
 */
export interface KVSyncPushOptions {
  /**
   * Push only specific keys
   */
  keys?: string[];

  /**
   * Filter by privacy level
   */
  privacyLevel?: PrivacyLevel;

  /**
   * Push only changes since timestamp
   */
  since?: number;

  /**
   * Batch size for pushing
   */
  batchSize?: number;

  /**
   * Compression for transfer
   */
  compress?: boolean;

  /**
   * Wait for acknowledgment
   */
  waitForAck?: boolean;
}

/**
 * KV Sync pull options
 */
export interface KVSyncPullOptions {
  /**
   * Pull only specific keys
   */
  keys?: string[];

  /**
   * Filter by privacy level
   */
  privacyLevel?: PrivacyLevel;

  /**
   * Pull only changes since timestamp
   */
  since?: number;

  /**
   * Apply changes immediately
   */
  apply?: boolean;

  /**
   * Merge strategy
   */
  mergeStrategy?: KVMergeStrategy;
}

/**
 * KV Sync merge options
 */
export interface KVSyncMergeOptions {
  /**
   * Merge strategy
   */
  strategy?: KVMergeStrategy;

  /**
   * Conflict resolution strategy
   */
  conflictResolution?: KVConflictResolution;

  /**
   * Apply changes immediately
   */
  apply?: boolean;

  /**
   * Resolve conflicts interactively
   */
  interactive?: boolean;

  /**
   * Callback for conflict resolution
   */
  onConflict?: (conflict: KVSyncConflict) => Promise<KVConflictResolution>;
}

/**
 * KV Merge strategy
 */
export type KVMergeStrategy =
  | 'last-write-wins'
  | 'first-write-wins'
  | 'vector-clock'
  | 'merge-remote'
  | 'merge-local'
  | 'manual';

/**
 * KV Conflict resolution
 */
export type KVConflictResolution =
  | 'use-local'
  | 'use-remote'
  | 'merge'
  | 'manual';

/**
 * KV Sync result
 */
export interface KVSyncResult {
  success: boolean;
  entriesTransferred: number;
  bytesTransferred: number;
  durationMs: number;
  timestamp: number;
  errors: Array<{ key: string; error: string }>;
  version: KVSyncVersion;
}

/**
 * KV Sync merge result
 */
export interface KVSyncMergeResult extends KVSyncResult {
  conflicts: KVSyncConflict[];
  resolvedConflicts: number;
  pendingConflicts: number;
}

/**
 * KV Sync conflict
 */
export interface KVSyncConflict {
  key: string;
  localEntry: KVEntry<unknown>;
  remoteEntry: KVEntry<unknown>;
  conflictType: 'version' | 'value' | 'deleted' | 'metadata';
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * KV Sync version
 */
export interface KVSyncVersion {
  vectorClock: Record<string, number>;
  timestamp: number;
  generation: number;
}

/**
 * KV Sync status
 */
export interface KVSyncStatus {
  lastSync: number;
  syncInProgress: boolean;
  pendingChanges: number;
  remoteVersion?: KVSyncVersion;
  conflicts: number;
  syncHistory: KVSyncHistoryEntry[];
}

/**
 * KV Sync history entry
 */
export interface KVSyncHistoryEntry {
  timestamp: number;
  operation: 'push' | 'pull' | 'merge';
  remote: string;
  success: boolean;
  entriesTransferred: number;
  durationMs: number;
}
```

---

## Integration Interfaces

### ITileKV

Integration between KV system and Tile agents.

```typescript
/**
 * Tile KV Interface
 *
 * Integrates KV store with tile system:
 * - Tile-specific caching
 * - Observation storage
 * - Variant management
 * - Serialization support
 */
export interface ITileKV extends IKVStore<string, unknown> {
  /**
   * Get tile-specific cache
   * @param tileId - The tile ID
   * @returns Tile-specific KV store
   */
  getTileCache(tileId: string): Promise<IKVStore>;

  /**
   * Store tile observation
   * @param tileId - The tile ID
   * @param observation - The observation to store
   * @returns The stored entry
   */
  storeObservation(
    tileId: string,
    observation: Observation
  ): Promise<KVEntry<Observation>>;

  /**
   * Get tile observations
   * @param tileId - The tile ID
   * @param options - Query options
   * @returns Array of observations
   */
  getObservations(
    tileId: string,
    options?: TileObservationOptions
  ): Promise<Observation[]>;

  /**
   * Store tile variant
   * @param tileId - The tile ID
   * @param variant - The variant to store
   * @returns The stored entry
   */
  storeVariant(
    tileId: string,
    variant: TileVariant
  ): Promise<KVEntry<TileVariant>>;

  /**
   * Get tile variants
   * @param tileId - The tile ID
   * @returns Array of variants
   */
  getVariants(tileId: string): Promise<TileVariant[]>;

  /**
   * Serialize tile to pollen grain
   * @param tileId - The tile ID
   * @returns The pollen grain
   */
  serializeTile(tileId: string): Promise<PollenGrain>;

  /**
   * Deserialize pollen grain to tile
   * @param grain - The pollen grain
   * @returns The deserialized tile
   */
  deserializeTile(grain: PollenGrain): Promise<BaseTile>;

  /**
   * Get tile-specific statistics
   */
  getTileStats(tileId: string): Promise<TileKVStats>;
}

/**
 * Tile observation options
 */
export interface TileObservationOptions {
  /**
   * Limit number of observations
   */
  limit?: number;

  /**
   * Filter by time range
   */
  timeRange?: { start: number; end: number };

  /**
   * Filter by reward range
   */
  rewardRange?: { min: number; max: number };

  /**
   * Sort by field
   */
  sortBy?: 'timestamp' | 'reward' | 'tdError';

  /**
   * Sort order
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Tile KV statistics
 */
export interface TileKVStats {
  tileId: string;
  observationCount: number;
  variantCount: number;
  totalSizeBytes: number;
  avgReward: number;
  successRate: number;
  lastActivity: number;
  serializationCount: number;
  deserializationCount: number;
}
```

---

### IDreamKV

Integration between KV system and World Model dreaming.

```typescript
/**
 * Dream KV Interface
 *
 * Integrates KV store with world model and dreaming:
 * - Dream episode storage
 * - Latent state caching
 * - Value network integration
 * - TD(λ) learning support
 */
export interface IDreamKV extends IKVStore<string, unknown> {
  /**
   * Store dream episode
   * @param episode - The dream episode
   * @param options - Storage options
   * @returns The stored entry
   */
  storeEpisode(
    episode: DreamEpisode,
    options?: DreamEpisodeOptions
  ): Promise<KVEntry<DreamEpisode>>;

  /**
   * Get dream episodes
   * @param options - Query options
   * @returns Array of dream episodes
   */
  getEpisodes(options?: DreamEpisodeQueryOptions): Promise<DreamEpisode[]>;

  /**
   * Cache latent state
   * @param stateId - The state ID
   * @param latentState - The latent state
   * @returns The cached entry
   */
  cacheLatentState(
    stateId: string,
    latentState: LatentState
  ): Promise<KVEntry<LatentState>>;

  /**
   * Get cached latent state
   * @param stateId - The state ID
   * @returns The cached latent state or undefined
   */
  getLatentState(stateId: string): Promise<LatentState | undefined>;

  /**
   * Store value prediction
   * @param state - The state
   * @param prediction - The value prediction
   * @returns The stored entry
   */
  storeValuePrediction(
    state: number[],
    prediction: { value: number; uncertainty: number }
  ): Promise<KVEntry<{ value: number; uncertainty: number }>>;

  /**
   * Get value prediction
   * @param state - The state
   * @returns The value prediction or undefined
   */
  getValuePrediction(
    state: number[]
  ): Promise<{ value: number; uncertainty: number } | undefined>;

  /**
   * Get dream-specific statistics
   */
  getDreamStats(): Promise<DreamKVStats>;
}

/**
 * Dream episode options
 */
export interface DreamEpisodeOptions {
  /**
   * Compress episode data
   */
  compress?: boolean;

  /**
   * Include full state history
   */
  includeFullHistory?: boolean;

  /**
   * Privacy level for episode
   */
  privacyLevel?: PrivacyLevel;

  /**
   * TTL for episode cache
   */
  ttl?: number;
}

/**
 * Dream episode query options
 */
export interface DreamEpisodeQueryOptions {
  /**
   * Limit number of episodes
   */
  limit?: number;

  /**
   * Filter by time range
   */
  timeRange?: { start: number; end: number };

  /**
   * Filter by minimum total reward
   */
  minTotalReward?: number;

  /**
   * Filter by start state similarity
   */
  startState?: number[];

  /**
   * Sort by field
   */
  sortBy?: 'totalReward' | 'totalValue' | 'length' | 'timestamp';

  /**
   * Sort order
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Dream KV statistics
 */
export interface DreamKVStats {
  totalEpisodes: number;
  cachedLatentStates: number;
  valuePredictions: number;
  avgEpisodeReward: number;
  avgEpisodeValue: number;
  cacheHitRate: number;
  compressionRatio: number;
  lastDreamTime: number;
}
```

---

### IFederationKV

Integration between KV system and Federated Learning.

```typescript
/**
 * Federation KV Interface
 *
 * Integrates KV store with federated learning:
 * - Model version caching
 * - Gradient update storage
 * - Privacy accounting
 * - Colony-specific storage
 */
export interface IFederationKV extends IKVStore<string, unknown> {
  /**
   * Store model version
   * @param version - The model version
   * @param options - Storage options
   * @returns The stored entry
   */
  storeModelVersion(
    version: ModelVersion,
    options?: FederationKVOptions
  ): Promise<KVEntry<ModelVersion>>;

  /**
   * Get model version
   * @param versionNumber - The version number
   * @returns The model version or undefined
   */
  getModelVersion(versionNumber: number): Promise<ModelVersion | undefined>;

  /**
   * Store gradient update
   * @param update - The gradient update
   * @returns The stored entry
   */
  storeGradientUpdate(
    update: GradientUpdate
  ): Promise<KVEntry<GradientUpdate>>;

  /**
   * Get gradient updates for round
   * @param roundNumber - The round number
   * @returns Array of gradient updates
   */
  getGradientUpdates(roundNumber: number): Promise<GradientUpdate[]>;

  /**
   * Store privacy accounting
   * @param colonyId - The colony ID
   * @param accounting - The privacy accounting
   * @returns The stored entry
   */
  storePrivacyAccounting(
    colonyId: string,
    accounting: PrivacyAccounting
  ): Promise<KVEntry<PrivacyAccounting>>;

  /**
   * Get privacy accounting
   * @param colonyId - The colony ID
   * @returns The privacy accounting or undefined
   */
  getPrivacyAccounting(
    colonyId: string
  ): Promise<PrivacyAccounting | undefined>;

  /**
   * Get colony-specific cache
   * @param colonyId - The colony ID
   * @returns Colony-specific KV store
   */
  getColonyCache(colonyId: string): Promise<IKVStore>;

  /**
   * Get federation-specific statistics
   */
  getFederationStats(): Promise<FederationKVStats>;
}

/**
 * Federation KV options
 */
export interface FederationKVOptions {
  /**
   * Compress model weights
   */
  compress?: boolean;

  /**
   * Replicate across colonies
   */
  replicate?: boolean;

  /**
   * TTL for model cache
   */
  ttl?: number;

  /**
   * Privacy tier for model
   */
  privacyTier?: PrivacyTier;
}

/**
 * Federation KV statistics
 */
export interface FederationKVStats {
  totalModelVersions: number;
  totalGradientUpdates: number;
  privacyAccountingEntries: number;
  totalColonyCaches: number;
  avgModelSize: number;
  compressionRatio: number;
  replicationFactor: number;
  lastSyncTime: number;
}
```

---

### IMeadowKV

Integration between KV system and Meadow community sharing.

```typescript
/**
 * Meadow KV Interface
 *
 * Integrates KV store with meadow system:
 * - Shared pollen grain storage
 * - FPIC consent tracking
 * - Community-specific caching
 * - Discovery indexing
 */
export interface IMeadowKV extends IKVStore<string, unknown> {
  /**
   * Store shared pollen grain
   * @param grain - The shared pollen grain
   * @param options - Storage options
   * @returns The stored entry
   */
  storeSharedGrain(
    grain: SharedPollenGrain,
    options?: MeadowKVOptions
  ): Promise<KVEntry<SharedPollenGrain>>;

  /**
   * Get shared pollen grain
   * @param grainId - The grain ID
   * @returns The shared pollen grain or undefined
   */
  getSharedGrain(grainId: string): Promise<SharedPollenGrain | undefined>;

  /**
   * Search shared grains
   * @param filters - Search filters
   * @returns Array of shared pollen grains
   */
  searchSharedGrains(
    filters: DiscoveryFilters
  ): Promise<SharedPollenGrain[]>;

  /**
   * Store FPIC consent
   * @param consent - The FPIC consent
   * @returns The stored entry
   */
  storeFPICConsent(
    consent: FPICConsent
  ): Promise<KVEntry<FPICConsent>>;

  /**
   * Get FPIC consent
   * @param consentId - The consent ID
   * @returns The FPIC consent or undefined
   */
  getFPICConsent(consentId: string): Promise<FPICConsent | undefined>;

  /**
   * Get community-specific cache
   * @param communityId - The community ID
   * @returns Community-specific KV store
   */
  getCommunityCache(communityId: string): Promise<IKVStore>;

  /**
   * Update discovery index
   * @param grain - The grain to index
   * @returns Index update result
   */
  updateDiscoveryIndex(
    grain: SharedPollenGrain
  ): Promise<DiscoveryIndexUpdate>;

  /**
   * Get meadow-specific statistics
   */
  getMeadowStats(): Promise<MeadowKVStats>;
}

/**
 * Meadow KV options
 */
export interface MeadowKVOptions {
  /**
   * Index for discovery
   */
  index?: boolean;

  /**
   * Validate FPIC status
   */
  validateFPIC?: boolean;

  /**
   * Cache for community
   */
  cache?: boolean;

  /**
   * Replicate across communities
   */
  replicate?: boolean;
}

/**
 * Discovery index update result
 */
export interface DiscoveryIndexUpdate {
  success: boolean;
  indexedFields: string[];
  indexSize: number;
  updateDurationMs: number;
}

/**
 * Meadow KV statistics
 */
export interface MeadowKVStats {
  totalSharedGrains: number;
  totalFPICConsents: number;
  totalCommunityCaches: number;
  discoveryIndexSize: number;
  avgGrainSize: number;
  fpicComplianceRate: number;
  indexHitRate: number;
  lastDiscoveryUpdate: number;
}
```

---

## Event Interfaces

### IKVEvent

Events emitted by the KV system for monitoring and observability.

```typescript
/**
 * KV Event types
 */
export enum KVEventType {
  // Access events
  HIT = 'HIT',
  MISS = 'MISS',
  EVICT = 'EVICT',
  UPDATE = 'UPDATE',

  // Lifecycle events
  CREATED = 'CREATED',
  DELETED = 'DELETED',
  EXPIRED = 'EXPIRED',

  // Sync events
  SYNC_START = 'SYNC_START',
  SYNC_COMPLETE = 'SYNC_COMPLETE',
  SYNC_ERROR = 'SYNC_ERROR',
  CONFLICT = 'CONFLICT',

  // Compression events
  COMPRESS_START = 'COMPRESS_START',
  COMPRESS_COMPLETE = 'COMPRESS_COMPLETE',
  DECOMPRESS_COMPLETE = 'DECOMPRESS_COMPLETE',

  // Integration events
  TILE_OBSERVATION = 'TILE_OBSERVATION',
  TILE_VARIANT = 'TILE_VARIANT',
  DREAM_EPISODE = 'DREAM_EPISODE',
  FEDERATION_UPDATE = 'FEDERATION_UPDATE',
  MEADOW_SHARE = 'MEADOW_SHARE',
}

/**
 * KV Event interface
 */
export interface IKVEvent {
  type: KVEventType;
  timestamp: number;
  source: string;
  data: KVEventData;
  metadata?: {
    causalChainId?: string;
    correlationId?: string;
    sourceTileId?: string;
    sourceColonyId?: string;
  };
}

/**
 * KV Event data
 */
export type KVEventData =
  | KVHitEvent
  | KVMissEvent
  | KVEvictEvent
  | KVUpdateEvent
  | KVCreatedEvent
  | KVDeletedEvent
  | KVExpiredEvent
  | KVSyncEvent
  | KVConflictEvent
  | KVCompressEvent
  | KVIntegrationEvent;

/**
 * KV Hit event
 */
export interface KVHitEvent {
  key: string;
  accessTime: number;
  valueSize: number;
  accessCount: number;
  cacheHit: boolean;
}

/**
 * KV Miss event
 */
export interface KVMissEvent {
  key: string;
  accessTime: number;
  reason: 'not_found' | 'expired' | 'evicted' | 'privacy_denied';
  suggestedKey?: string;
}

/**
 * KV Evict event
 */
export interface KVEvictEvent {
  key: string;
  evictTime: number;
  reason: 'lru' | 'expired' | 'size_limit' | 'priority' | 'manual';
  valueSize: number;
  accessCount: number;
  ttl?: number;
}

/**
 * KV Update event
 */
export interface KVUpdateEvent {
  key: string;
  updateTime: number;
  oldValue?: unknown;
  newValue: unknown;
  updateReason: string;
  deltaSize?: number;
}

/**
 * KV Created event
 */
export interface KVCreatedEvent {
  key: string;
  createTime: number;
  value: unknown;
  valueSize: number;
  ttl?: number;
  createdBy?: string;
}

/**
 * KV Deleted event
 */
export interface KVDeletedEvent {
  key: string;
  deleteTime: number;
  deletedBy?: string;
  reason: string;
  wasCompressed: boolean;
}

/**
 * KV Expired event
 */
export interface KVExpiredEvent {
  key: string;
  expireTime: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * KV Sync event
 */
export interface KVSyncEvent {
  operation: 'push' | 'pull' | 'merge';
  remote: string;
  startTime: number;
  endTime: number;
  entriesTransferred: number;
  bytesTransferred: number;
  success: boolean;
  error?: string;
}

/**
 * KV Conflict event
 */
export interface KVConflictEvent {
  key: string;
  conflictTime: number;
  localVersion: number;
  remoteVersion: number;
  conflictType: 'version' | 'value' | 'deleted' | 'metadata';
  resolution?: KVConflictResolution;
  resolvedBy?: string;
}

/**
 * KV Compress event
 */
export interface KVCompressEvent {
  key: string;
  operation: 'compress' | 'decompress';
  startTime: number;
  endTime: number;
  originalSize: number;
  compressedSize: number;
  algorithm: string;
  level: number;
  compressionRatio: number;
}

/**
 * KV Integration event
 */
export interface KVIntegrationEvent {
  integration: 'tile' | 'dream' | 'federation' | 'meadow';
  operation: string;
  operationTime: number;
  entityId: string;
  data: unknown;
  success: boolean;
  error?: string;
}
```

---

### IKVStats

Statistics and metrics for the KV system.

```typescript
/**
 * KV Statistics interface
 */
export interface IKVStats {
  /**
   * Get overall statistics
   */
  getOverallStats(): Promise<KVOverallStats>;

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Promise<KVPerformanceMetrics>;

  /**
   * Get memory usage
   */
  getMemoryUsage(): Promise<KVMemoryUsage>;

  /**
   * Get throughput statistics
   */
  getThroughputStats(): Promise<KVThroughputStats>;

  /**
   * Get error statistics
   */
  getErrorStats(): Promise<KVErrorStats>;

  /**
   * Reset statistics
   */
  resetStats(): Promise<void>;
}

/**
 * KV Overall statistics
 */
export interface KVOverallStats {
  uptime: number;
  totalRequests: number;
  totalEntries: number;
  totalSizeBytes: number;
  cacheHitRate: number;
  cacheMissRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

/**
 * KV Performance metrics
 */
export interface KVPerformanceMetrics {
  readLatencyMs: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  writeLatencyMs: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  compressionRatio: number;
  decompressionSpeed: number; // bytes/ms
  evictionRate: number; // evictions/second
  expirationRate: number; // expirations/second
}

/**
 * KV Memory usage
 */
export interface KVMemoryUsage {
  totalMemoryBytes: number;
  usedMemoryBytes: number;
  freeMemoryBytes: number;
  entryOverheadBytes: number;
  indexMemoryBytes: number;
  compressionMemoryBytes: number;
  fragmentationRatio: number;
}

/**
 * KV Throughput statistics
 */
export interface KVThroughputStats {
  readsPerSecond: number;
  writesPerSecond: number;
  deletesPerSecond: number;
  bytesReadPerSecond: number;
  bytesWrittenPerSecond: number;
  compressOperationsPerSecond: number;
  decompressOperationsPerSecond: number;
}

/**
 * KV Error statistics
 */
export interface KVErrorStats {
  totalErrors: number;
  errorRate: number; // errors/second
  errorsByType: Record<string, number>;
  lastError?: {
    type: string;
    message: string;
    timestamp: number;
  };
}
```

---

### IKVDiagnostics

Diagnostics and health monitoring for the KV system.

```typescript
/**
 * KV Diagnostics interface
 */
export interface IKVDiagnostics {
  /**
   * Get system health
   */
  getHealth(): Promise<KVHealthStatus>;

  /**
   * Run diagnostics
   */
  runDiagnostics(options?: KVDiagnosticOptions): Promise<KVDiagnosticResult>;

  /**
   * Get active issues
   */
  getActiveIssues(): Promise<KVIssue[]>;

  /**
   * Get performance recommendations
   */
  getRecommendations(): Promise<KVRecommendation[]>;

  /**
   * Generate diagnostic report
   */
  generateReport(options?: KVReportOptions): Promise<KVDiagnosticReport>;
}

/**
 * KV Health status
 */
export interface KVHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: KVHealthCheck[];
  overallScore: number; // 0-100
}

/**
 * KV Health check
 */
export interface KVHealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  timestamp: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * KV Diagnostic options
 */
export interface KVDiagnosticOptions {
  /**
   * Run specific checks
   */
  checks?: KVDiagnosticCheck[];

  /**
   * Verbosity level
   */
  verbosity?: 'minimal' | 'normal' | 'verbose';

  /**
   * Include recommendations
   */
  includeRecommendations?: boolean;

  /**
   * Timeout for diagnostics
   */
  timeoutMs?: number;
}

/**
 * KV Diagnostic check types
 */
export type KVDiagnosticCheck =
  | 'memory'
  | 'performance'
  | 'connectivity'
  | 'integrity'
  | 'consistency'
  | 'compression'
  | 'eviction'
  | 'sync';

/**
 * KV Diagnostic result
 */
export interface KVDiagnosticResult {
  timestamp: number;
  durationMs: number;
  checks: KVHealthCheck[];
  issues: KVIssue[];
  recommendations: KVRecommendation[];
  summary: string;
}

/**
 * KV Issue
 */
export interface KVIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  description: string;
  detectedAt: number;
  affectedComponents: string[];
  resolution?: KVIssueResolution;
}

/**
 * KV Issue resolution
 */
export interface KVIssueResolution {
  steps: string[];
  estimatedTimeMs?: number;
  automatedFix?: boolean;
  fixScript?: string;
}

/**
 * KV Recommendation
 */
export interface KVRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  category: 'performance' | 'memory' | 'reliability' | 'security';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actions: string[];
}

/**
 * KV Report options
 */
export interface KVReportOptions {
  /**
   * Report format
   */
  format?: 'json' | 'text' | 'html';

  /**
   * Include sections
   */
  sections?: KVReportSection[];

  /**
   * Output file path
   */
  outputPath?: string;
}

/**
 * KV Report sections
 */
export type KVReportSection =
  | 'overview'
  | 'health'
  | 'performance'
  | 'memory'
  | 'throughput'
  | 'errors'
  | 'issues'
  | 'recommendations';

/**
 * KV Diagnostic report
 */
export interface KVDiagnosticReport {
  generatedAt: number;
  durationMs: number;
  format: string;
  sections: Record<string, unknown>;
  summary: string;
}
```

---

## Configuration Interfaces

### IKVConfig

Configuration for the KV system.

```typescript
/**
 * KV Configuration interface
 */
export interface IKVConfig {
  /**
   * Store configuration
   */
  store: KVStoreConfig;

  /**
   * Cache configuration
   */
  cache: KVCacheConfig;

  /**
   * Sync configuration
   */
  sync: KVSyncConfig;

  /**
   * Compression configuration
   */
  compression: KVCompressionConfig;

  /**
   * Privacy configuration
   */
  privacy: IPrivacyConfig;

  /**
   * Eviction configuration
   */
  eviction: IEvictionConfig;

  /**
   * Monitoring configuration
   */
  monitoring: KVMonitoringConfig;

  /**
   * Integration configurations
   */
  integrations: {
    tile?: ITileKVConfig;
    dream?: IDreamKVConfig;
    federation?: IFederationKVConfig;
    meadow?: IMeadowKVConfig;
  };
}

/**
 * KV Store configuration
 */
export interface KVStoreConfig {
  /**
   * Maximum entry size in bytes
   */
  maxEntrySize: number;

  /**
   * Maximum total size in bytes
   */
  maxTotalSize: number;

  /**
   * Maximum number of entries
   */
  maxEntries: number;

  /**
   * Default TTL in milliseconds
   */
  defaultTtl: number;

  /**
   * Enable statistics collection
   */
  enableStats: boolean;

  /**
   * Enable event emission
   */
  enableEvents: boolean;

  /**
   * Storage backend
   */
  backend: 'memory' | 'redis' | 'sqlite' | 'postgres';
}

/**
 * KV Cache configuration
 */
export interface KVCacheConfig {
  /**
   * Maximum cache size in bytes
   */
  maxSize: number;

  /**
   * Maximum number of entries
   */
  maxEntries: number;

  /**
   * Default compression level
   */
  defaultCompressionLevel: number;

  /**
   * Enable automatic compression
   */
  enableAutoCompression: boolean;

  /**
   * Compression threshold in bytes
   */
  compressionThreshold: number;

  /**
   * Enable slicing
   */
  enableSlicing: boolean;

  /**
   * Default slice size
   */
  defaultSliceSize: number;
}

/**
 * KV Sync configuration
 */
export interface KVSyncConfig {
  /**
   * Enable synchronization
   */
  enabled: boolean;

  /**
   * Sync interval in milliseconds
   */
  syncInterval: number;

  /**
   * Default merge strategy
   */
  defaultMergeStrategy: KVMergeStrategy;

  /**
   * Default conflict resolution
   */
  defaultConflictResolution: KVConflictResolution;

  /**
   * Enable version vectors
   */
  enableVersionVectors: boolean;

  /**
   * Replication factor
   */
  replicationFactor: number;

  /**
   * Sync timeout in milliseconds
   */
  syncTimeout: number;
}

/**
 * KV Compression configuration
 */
export interface KVCompressionConfig {
  /**
   * Default algorithm
   */
  defaultAlgorithm: 'gzip' | 'brotli' | 'lz4' | 'zstd';

  /**
   * Default compression level
   */
  defaultLevel: number;

  /**
   * Enable compression
   */
  enabled: boolean;

  /**
   * Compression threshold in bytes
   */
  threshold: number;

  /**
   * Compression level by size
   */
  levelBySize: Array<{ maxSize: number; level: number }>;
}

/**
 * KV Monitoring configuration
 */
export interface KVMonitoringConfig {
  /**
   * Enable metrics collection
   */
  enableMetrics: boolean;

  /**
   * Enable health checks
   */
  enableHealthChecks: boolean;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval: number;

  /**
   * Enable diagnostic logging
   */
  enableDiagnostics: boolean;

  /**
   * Metrics retention in milliseconds
   */
  metricsRetention: number;

  /**
   * Alert thresholds
   */
  alertThresholds: {
    memoryUsage: number; // 0-1
    errorRate: number; // 0-1
    latencyMs: number;
    cacheHitRate: number; // 0-1
  };
}
```

---

### IPrivacyConfig

Privacy configuration for the KV system.

```typescript
/**
 * Privacy Configuration interface
 */
export interface IPrivacyConfig {
  /**
   * Default privacy level
   */
  defaultLevel: PrivacyLevel;

  /**
   * Privacy tiers
   */
  tiers: KVPrivacyTierConfig[];

  /**
   * Privacy budgets
   */
  budgets: KVPrivacyBudgetConfig;

  /**
   * Privacy mechanisms
   */
  mechanisms: KVPrivacyMechanismConfig;

  /**
   * Privacy enforcement
   */
  enforcement: KVPrivacyEnforcementConfig;
}

/**
 * KV Privacy tier configuration
 */
export interface KVPrivacyTierConfig {
  tier: PrivacyTier;
  epsilon: number;
  delta: number;
  maxSize: number;
  maxTtl: number;
  allowSharing: boolean;
  allowCompression: boolean;
  allowSync: boolean;
}

/**
 * KV Privacy budget configuration
 */
export interface KVPrivacyBudgetConfig {
  /**
   * Per-colony budgets
   */
  perColony: Record<string, KVPrivacyBudget>;

  /**
   * Global budget
   */
  global: KVPrivacyBudget;

  /**
   * Budget reset interval in milliseconds
   */
  resetInterval: number;

  /**
   * Enable budget tracking
   */
  enableTracking: boolean;

  /**
   * Alert threshold (0-1)
   */
  alertThreshold: number;
}

/**
 * KV Privacy budget
 */
export interface KVPrivacyBudget {
  epsilon: number;
  delta: number;
  usedEpsilon: number;
  usedDelta: number;
  resetAt: number;
}

/**
 * KV Privacy mechanism configuration
 */
export interface KVPrivacyMechanismConfig {
  /**
   * Enable differential privacy
   */
  enableDifferentialPrivacy: boolean;

  /**
   * Noise distribution
   */
  noiseDistribution: 'gaussian' | 'laplacian';

  /**
   * Gradient clipping threshold
   */
  clipThreshold: number;

  /**
   * Enable secure aggregation
   */
  enableSecureAggregation: boolean;

  /**
   * Privacy accounting method
   */
  accountingMethod: 'basic' | 'advanced' | 'zeroing' | 'gdp';
}

/**
 * KV Privacy enforcement configuration
 */
export interface KVPrivacyEnforcementConfig {
  /**
   * Enable enforcement
   */
  enabled: boolean;

  /**
   * Strict mode (deny on uncertainty)
   */
  strictMode: boolean;

  /**
   * Audit log
   */
  auditLog: boolean;

  /**
   * Privacy filters
   */
  filters: KVPrivacyFilter[];

  /**
   * Action on violation
   */
  onViolation: 'block' | 'warn' | 'sanitize';
}

/**
 * KV Privacy filter
 */
export interface KVPrivacyFilter {
  id: string;
  name: string;
  pattern: RegExp | string;
  privacyLevel: PrivacyLevel;
  action: 'block' | 'sanitize' | 'redact';
  enabled: boolean;
}
```

---

### IEvictionConfig

Eviction configuration for the KV system.

```typescript
/**
 * Eviction Configuration interface
 */
export interface IEvictionConfig {
  /**
   * Enable automatic eviction
   */
  enabled: boolean;

  /**
   * Eviction policies
   */
  policies: KVEvictionPolicy[];

  /**
   * Eviction strategy
   */
  strategy: KVEvictionStrategy;

  /**
   * Eviction thresholds
   */
  thresholds: KVEvictionThresholds;

  /**
   * Eviction priorities
   */
  priorities: KVEvictionPriorityConfig;
}

/**
 * KV Eviction policy
 */
export interface KVEvictionPolicy {
  id: string;
  name: string;
  type: 'lru' | 'lfu' | 'ttl' | 'size' | 'priority' | 'custom';
  enabled: boolean;
  weight: number; // For combined strategies
  config?: Record<string, unknown>;
}

/**
 * KV Eviction strategy
 */
export type KVEvictionStrategy =
  | 'lru' // Least recently used
  | 'lfu' // Least frequently used
  | 'ttl' // Time to live
  | 'size' // Largest first
  | 'priority' // Lowest priority first
  | 'combined'; // Weighted combination

/**
 * KV Eviction thresholds
 */
export interface KVEvictionThresholds {
  /**
   * Memory usage threshold (0-1)
   */
  memoryUsage: number;

  /**
   * Entry count threshold
   */
  entryCount: number;

  /**
   * Size threshold in bytes
   */
  totalSize: number;

  /**
   * Eviction batch size
   */
  batchSize: number;

  /**
   * Minimum entries after eviction
   */
  minEntries: number;
}

/**
 * KV Eviction priority configuration
 */
export interface KVEvictionPriorityConfig {
  /**
   * Default priority
   */
  default: number;

  /**
   * Priority by privacy level
   */
  byPrivacyLevel: Partial<Record<PrivacyLevel, number>>;

  /**
   * Priority by subsumption layer
   */
  bySubsumptionLayer: Partial<Record<SubsumptionLayer, number>>;

  /**
   * Priority by entry age
   */
  byAge: Array<{ maxAge: number; priority: number }>;

  /**
   * Priority by access count
   */
  byAccessCount: Array<{ minAccess: number; priority: number }>;
}
```

---

## Usage Examples

### Basic KV Store Usage

```typescript
import { IKVStore, KVStore, PrivacyLevel, SubsumptionLayer } from '@polln/kv';

// Create a KV store
const store: IKVStore = new KVStore({
  maxSize: 1024 * 1024 * 100, // 100MB
  maxEntries: 10000,
  defaultTtl: 3600000, // 1 hour
});

// Store a value with metadata
await store.set('user:123', { name: 'Alice', age: 30 }, {
  privacyLevel: PrivacyLevel.COLONY,
  subsumptionLayer: SubsumptionLayer.HABITUAL,
  ttl: 7200000, // 2 hours
  tags: ['user', 'profile'],
  sourceTileId: 'tile-abc',
});

// Retrieve a value
const user = await store.get('user:123', {
  updateStats: true,
  withMetadata: true,
});

// Batch operations
const results = await store.setBatch([
  { key: 'user:123', value: { name: 'Alice' }, options: { ttl: 3600000 } },
  { key: 'user:456', value: { name: 'Bob' }, options: { ttl: 3600000 } },
]);

// Get statistics
const stats = await store.getStats();
console.log(`Hit rate: ${stats.hitRate}`);
console.log(`Total entries: ${stats.totalEntries}`);
```

### Tile KV Integration

```typescript
import { ITileKV, TileKVStore } from '@polln/kv';

// Create a tile KV store
const tileStore: ITileKV = new TileKVStore({
  maxSize: 1024 * 1024 * 50, // 50MB
});

// Store tile observation
await tileStore.storeObservation('tile-abc', {
  timestamp: Date.now(),
  input: { text: 'Hello' },
  output: { response: 'Hi there!' },
  reward: 0.9,
  context: { success: true },
});

// Get observations for a tile
const observations = await tileStore.getObservations('tile-abc', {
  limit: 100,
  rewardRange: { min: 0.5, max: 1.0 },
  sortBy: 'reward',
  sortOrder: 'desc',
});

// Store tile variant
await tileStore.storeVariant('tile-abc', {
  id: 'variant-xyz',
  parentTileId: 'tile-abc',
  mutationType: 'parameter_noise',
  executions: 0,
  successes: 0,
  avgReward: 0.5,
  selectionWeight: 0.1,
  lastSelected: Date.now(),
});

// Serialize tile to pollen grain
const grain = await tileStore.serializeTile('tile-abc');
```

### Dream KV Integration

```typescript
import { IDreamKV, DreamKVStore } from '@polln/kv';

// Create a dream KV store
const dreamStore: IDreamKV = new DreamKVStore({
  maxSize: 1024 * 1024 * 200, // 200MB
});

// Store dream episode
await dreamStore.storeEpisode({
  id: 'episode-123',
  startState: [1, 2, 3, 4],
  actions: [0, 1, 0],
  states: [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]],
  rewards: [0.1, 0.2, 0.3],
  values: [0.5, 0.6, 0.7],
  uncertainties: [0.1, 0.2, 0.3],
  totalReward: 0.6,
  totalValue: 1.8,
  length: 3,
}, {
  compress: true,
  privacyLevel: PrivacyLevel.COLONY,
});

// Get episodes by reward
const topEpisodes = await dreamStore.getEpisodes({
  minTotalReward: 0.5,
  limit: 10,
  sortBy: 'totalReward',
  sortOrder: 'desc',
});

// Cache latent state
await dreamStore.cacheLatentState('state-abc', {
  mean: [1, 2, 3, 4],
  logVar: [0.1, 0.1, 0.1, 0.1],
  sample: [1.1, 2.1, 3.1, 4.1],
});
```

### Federation KV Integration

```typescript
import { IFederationKV, FederationKVStore } from '@polln/kv';

// Create a federation KV store
const federationStore: IFederationKV = new FederationKVStore({
  maxSize: 1024 * 1024 * 500, // 500MB
});

// Store model version
await federationStore.storeModelVersion({
  version: 1,
  globalRound: 10,
  createdAt: Date.now(),
  modelHash: 'abc123',
  parameterCount: 1000000,
  checksum: 'def456',
  participatingColonies: ['colony-1', 'colony-2'],
  aggregatedGradients: [0.1, 0.2, 0.3],
  metadata: {
    epsilonUsed: 1.0,
    deltaUsed: 0.00001,
    avgClipNorm: 1.0,
    totalSamples: 1000,
  },
}, {
  compress: true,
  replicate: true,
  privacyTier: 'MEADOW',
});

// Store gradient update
await federationStore.storeGradientUpdate({
  colonyId: 'colony-1',
  roundNumber: 10,
  gradients: [0.1, 0.2, 0.3],
  sampleCount: 100,
  clipNorm: 1.0,
  metadata: {
    agentId: 'agent-123',
    privacyTier: 'COLONY',
    epsilonSpent: 0.1,
    deltaSpent: 0.000001,
    compressed: true,
    trainingLoss: 0.5,
  },
  timestamp: Date.now(),
});
```

### Meadow KV Integration

```typescript
import { IMeadowKV, MeadowKVStore } from '@polln/kv';

// Create a meadow KV store
const meadowStore: IMeadowKV = new MeadowKVStore({
  maxSize: 1024 * 1024 * 1000, // 1GB
});

// Store shared pollen grain
await meadowStore.storeSharedGrain({
  id: 'grain-123',
  gardenerId: 'keeper-abc',
  embedding: [0.1, 0.2, 0.3],
  metadata: {
    dimension: 512,
    sourceLogCount: 100,
    sourceLogIds: ['log-1', 'log-2'],
    agentTypes: ['TaskAgent'],
    usageCount: 0,
    successRate: 0.9,
    isPrivate: false,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  communityId: 'community-xyz',
  sharedBy: 'keeper-abc',
  tags: ['nlp', 'translation'],
  fpicStatus: 'NOT_REQUIRED',
  restrictionLevel: 'PUBLIC',
  usageCount: 0,
  sharedAt: Date.now(),
}, {
  index: true,
  validateFPIC: true,
  cache: true,
});

// Search shared grains
const results = await meadowStore.searchSharedGrains({
  query: 'translation',
  tags: ['nlp'],
  restrictionLevel: 'PUBLIC',
  minRating: 4,
});

// Store FPIC consent
await meadowStore.storeFPICConsent({
  id: 'consent-456',
  knowledgeId: 'grain-123',
  indigenousCommunity: 'Community Name',
  isFree: true,
  isPrior: true,
  isInformed: true,
  hasConsent: true,
  consentDate: Date.now(),
  contactPerson: 'John Doe',
  contactMethod: 'email',
  isValid: true,
  lastReviewed: Date.now(),
  reviewFrequency: 365, // days
});
```

### Event Handling

```typescript
import { KVEventType, IKVEvent } from '@polln/kv';

// Listen to KV events
store.on('event', (event: IKVEvent) => {
  switch (event.type) {
    case KVEventType.HIT:
      console.log(`Cache hit for key: ${event.data.key}`);
      break;
    case KVEventType.MISS:
      console.log(`Cache miss for key: ${event.data.key}`);
      break;
    case KVEventType.EVICT:
      console.log(`Evicted key: ${event.data.key}, reason: ${event.data.reason}`);
      break;
    case KVEventType.TILE_OBSERVATION:
      console.log(`Tile observation stored: ${event.data.entityId}`);
      break;
    case KVEventType.DREAM_EPISODE:
      console.log(`Dream episode stored: ${event.data.entityId}`);
      break;
  }
});

// Listen to specific event types
store.on(KVEventType.SYNC_COMPLETE, (event: IKVEvent) => {
  const syncData = event.data as KVSyncEvent;
  console.log(`Sync complete: ${syncData.entriesTransferred} entries transferred`);
});
```

### Diagnostics

```typescript
import { IKVDiagnostics, KVDiagnostics } from '@polln/kv';

// Create diagnostics
const diagnostics: IKVDiagnostics = new KVDiagnostics(store);

// Get health status
const health = await diagnostics.getHealth();
console.log(`System health: ${health.status}`);
console.log(`Overall score: ${health.overallScore}`);

// Run diagnostics
const result = await diagnostics.runDiagnostics({
  checks: ['memory', 'performance', 'integrity'],
  verbosity: 'verbose',
  includeRecommendations: true,
});

// Get active issues
const issues = await diagnostics.getActiveIssues();
for (const issue of issues) {
  console.log(`[${issue.severity}] ${issue.message}`);
}

// Get recommendations
const recommendations = await diagnostics.getRecommendations();
for (const rec of recommendations) {
  console.log(`[${rec.priority}] ${rec.title}: ${rec.description}`);
}

// Generate diagnostic report
const report = await diagnostics.generateReport({
  format: 'html',
  sections: ['overview', 'health', 'performance', 'recommendations'],
  outputPath: './diagnostics.html',
});
```

---

## Integration with Existing POLLN Architecture

The KV system is designed to integrate seamlessly with existing POLLN components:

### Tile Integration
- Tiles can cache observations and variants in the KV store
- Serialization to PollenGrains is supported
- Variant management with KV-backed persistence

### World Model Integration
- Dream episodes can be cached and retrieved
- Latent state caching for efficient VAE operations
- Value prediction caching for TD(λ) learning

### Federation Integration
- Model version caching and distribution
- Gradient update storage with privacy accounting
- Colony-specific KV namespaces

### Meadow Integration
- Shared pollen grain storage with FPIC tracking
- Discovery index for efficient search
- Community-specific caching

### Privacy Integration
- Privacy tier support (LOCAL, COLONY, MEADOW, PUBLIC)
- Differential privacy mechanisms
- Privacy budget tracking

### Subsumption Integration
- Entries tagged with subsumption layers
- Layer-based eviction priorities
- Safety layer overrides

---

## Type Exports

```typescript
export {
  // Core interfaces
  IKVStore,
  IKVAnchor,
  IKVCache,
  IKVSync,

  // Integration interfaces
  ITileKV,
  IDreamKV,
  IFederationKV,
  IMeadowKV,

  // Event interfaces
  IKVEvent,
  IKVStats,
  IKVDiagnostics,

  // Configuration interfaces
  IKVConfig,
  IPrivacyConfig,
  IEvictionConfig,

  // Supporting types
  KVEntry,
  KVGetOptions,
  KVSetOptions,
  KVClearOptions,
  KVStoreStats,

  KVPattern,
  KVAnchor,
  KVAnchorContext,
  KVAnchorMatch,
  KVMatchOptions,
  KVPruneOptions,
  KVAnchorStats,

  KVCacheEntry,
  KVCacheSlice,
  KVConcatOptions,
  KVCompressOptions,
  KVCompressionInfo,
  KVCacheStats,

  KVSyncResult,
  KVSyncMergeResult,
  KVSyncConflict,
  KVSyncVersion,
  KVSyncStatus,

  TileKVStats,
  DreamKVStats,
  FederationKVStats,
  MeadowKVStats,

  KVEventType,
  KVEventData,
  KVOverallStats,
  KVPerformanceMetrics,
  KVMemoryUsage,
  KVThroughputStats,
  KVErrorStats,

  KVHealthStatus,
  KVDiagnosticResult,
  KVIssue,
  KVRecommendation,
  KVDiagnosticReport,

  KVStoreConfig,
  KVCacheConfig,
  KVSyncConfig,
  KVCompressionConfig,
  KVMonitoringConfig,
};
```

---

## Future Enhancements

### Planned Features
1. **Persistent Backends**
   - Redis integration
   - SQLite integration
   - PostgreSQL integration

2. **Advanced Compression**
   - Dictionary-based compression
   - Delta encoding for time series
   - Embedding quantization

3. **Distributed Caching**
   - Consistent hashing
   - Rendezvous hashing
   - Quorum-based reads

4. **Machine Learning Integration**
   - Learned eviction policies
   - Prefetching based on patterns
   - Adaptive compression

5. **Observability**
   - OpenTelemetry integration
   - Prometheus metrics
   - Grafana dashboards

---

## Conclusion

The KV system interfaces provide a comprehensive, type-safe foundation for efficient caching and knowledge management in POLLN. The design emphasizes:

- **Type Safety**: Full TypeScript support with generics
- **Traceability**: Causal chain tracking throughout
- **Privacy**: Multi-tier privacy with differential privacy
- **Performance**: Efficient caching with compression and eviction
- **Integration**: Seamless integration with existing POLLN components
- **Observability**: Comprehensive events, statistics, and diagnostics

These interfaces serve as the foundation for implementing the KV system that will enhance POLLN's capabilities in distributed intelligence, knowledge sharing, and federated learning.
