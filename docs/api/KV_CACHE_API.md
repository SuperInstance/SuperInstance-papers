# POLLN KV-Cache System API Documentation

**Version:** 1.0.0
**Last Updated:** 2026-03-07
**Inspired By:** KVCOMM (NeurIPS'25) - Online Cross-context KV-cache Communication

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Module Index](#module-index)
4. [API Reference](#api-reference)
   - [KV Anchor System](#kv-anchor-system)
   - [Cache Utilities](#cache-utilities)
   - [Context Sharing](#context-sharing)
   - [Federated KV Sync](#federated-kv-sync)
   - [Meadow Marketplace](#meadow-marketplace)
   - [Dream Integration](#dream-integration)
   - [Tile Integration](#tile-integration)
5. [Configuration Options](#configuration-options)
6. [Usage Examples](#usage-examples)
7. [Integration Examples](#integration-examples)

---

## Overview

The POLLN KV-Cache System provides efficient cross-context cache communication and reuse for distributed agent intelligence. It enables agents to share, discover, and reuse cached computational state (KV pairs, attention patterns, embeddings) across multiple contexts while maintaining privacy, provenance tracking, and quality controls.

### Key Features

- **Anchor-Based Reuse**: Store KV-cache segments as reusable anchors with similarity matching
- **Privacy Controls**: Multi-tier privacy (LOCAL, COLONY, MEADOW, PUBLIC) with differential privacy
- **Federated Learning**: Share anchors across colonies with quality-weighted aggregation
- **Marketplace Trading**: Trade high-value anchors in the Meadow ecosystem
- **Dream Integration**: Reuse caches during world model dreaming for faster imagination
- **Tile Integration**: Share KV-caches between tile executions
- **Context Sharing**: Efficient cross-agent context reuse with diff tracking

---

## Core Concepts

### KV-Cache Segment

A reusable piece of computational state from transformer attention layers:

```typescript
interface KVCacheSegment {
  layerId: number;
  segmentId: string;
  tokens: number[];
  keyCache: number[][];   // [seq_len, d_k]
  valueCache: number[][];  // [seq_len, d_v]
  metadata: KVCacheMetadata;
}
```

### Anchor

A compressed, reusable KV-cache pattern:

```typescript
interface KVAnchor {
  anchorId: string;
  layerId: number;
  compressedKeys: Float32Array;
  compressedValues: Float32Array;
  embedding: number[];
  qualityScore: number;        // 0-1
  compressionRatio: number;
  usageCount: number;
  lastUsed: number;
}
```

### Anchor Matching

Finding similar anchors using embedding similarity:

```typescript
interface AnchorMatch {
  anchor: KVAnchor;
  similarity: number;
  tokenOverlap: number;
  positionalDeviation: number;
}
```

### Privacy Tiers

Four-tier privacy model for anchor sharing:

- **LOCAL**: No sharing (epsilon: Infinity)
- **COLONY**: Within colony only (epsilon: 1.0)
- **MEADOW**: Community sharing (epsilon: 0.5)
- **PUBLIC**: Open sharing (epsilon: 0.3)

---

## Module Index

| Module | File | Description |
|--------|------|-------------|
| **KV Types** | `kvtypes.ts` | Core type definitions |
| **KV Anchor** | `kvanchor.ts` | Anchor pool, matching, offset prediction |
| **Cache Utils** | `cacheutils.ts` | Slicing, concatenation, replacement |
| **Context Share** | `contextshare.ts` | Cross-agent context sharing |
| **Federated KV** | `kvfederated.ts` | Cross-colony anchor sync |
| **Meadow** | `kvmeadow.ts` | Anchor marketplace and trading |
| **Dream KV** | `kvdream.ts` | Dream episode cache reuse |
| **Tile KV** | `kvtile.ts` | Tile execution cache sharing |

---

## API Reference

## KV Anchor System

**Module:** `src/core/kvanchor.ts`

### KVAnchorPool

Manages storage and retrieval of KV-cache anchors with clustering and LRU eviction.

#### Constructor

```typescript
constructor(config?: Partial<KVAnchorPoolConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxAnchors` | `number` | `1000` | Maximum anchors to store |
| `maxAgeMs` | `number` | `24h` | Maximum anchor age |
| `minQualityScore` | `number` | `0.7` | Minimum quality threshold |
| `similarityThreshold` | `number` | `0.8` | Minimum similarity for matches |
| `quantizationBits` | `4 \| 8` | `8` | Quantization bit depth |
| `enableClustering` | `boolean` | `true` | Enable anchor clustering |
| `enableLRU` | `boolean` | `true` | Enable LRU eviction |

#### Methods

##### createAnchor

Creates a compressed anchor from a KV-cache segment.

```typescript
async createAnchor(
  segment: KVCacheSegment,
  embedding: number[]
): Promise<KVAnchor>
```

**Example:**

```typescript
const segment: KVCacheSegment = {
  layerId: 0,
  segmentId: 'seg-001',
  tokens: [123, 456, 789],
  keyCache: [[0.1, 0.2], [0.3, 0.4]],
  valueCache: [[0.5, 0.6], [0.7, 0.8]],
  metadata: {
    createdAt: Date.now(),
    modelHash: 'model-v1',
    agentId: 'agent-001',
    turnNumber: 1,
    position: 0,
    length: 2
  }
};

const embedding = new Array(128).fill(0).map(() => Math.random());
const anchor = await pool.createAnchor(segment, embedding);
```

##### getAnchor

Retrieves an anchor by ID (updates LRU).

```typescript
getAnchor(anchorId: string): KVAnchor | undefined
```

##### findSimilarAnchors

Finds anchors similar to a query embedding (cluster-aware).

```typescript
findSimilarAnchors(
  queryEmbedding: number[],
  layerId: number,
  threshold?: number
): KVAnchor[]
```

**Example:**

```typescript
const queryEmbedding = new Array(128).fill(0).map(() => Math.random());
const similar = pool.findSimilarAnchors(queryEmbedding, 0, 0.85);
console.log(`Found ${similar.length} similar anchors`);
```

##### batchFindSimilarAnchors

Batch match multiple queries.

```typescript
batchFindSimilarAnchors(
  queryEmbeddings: number[][],
  layerId: number,
  threshold?: number
): BatchMatchResult[]
```

##### updateAnchor

Updates anchor statistics.

```typescript
updateAnchor(
  anchorId: string,
  updates: Partial<KVAnchor>
): boolean
```

##### cleanup

Removes old or low-quality anchors.

```typescript
cleanup(now?: number): number
```

##### getStats

Gets pool statistics.

```typescript
getStats(): {
  totalAnchors: number;
  anchorsByLayer: Record<number, number>;
  avgQualityScore: number;
  avgCompressionRatio: number;
  totalUsageCount: number;
  clusterCount?: number;
  avgClusterSize?: number;
}
```

##### getClusters

Gets cluster information.

```typescript
getClusters(layerId?: number): AnchorCluster[]
```

---

### AnchorMatcher

Finds similar segments using embedding distance and token overlap.

#### Constructor

```typescript
constructor(config?: Partial<AnchorMatcherConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `similarityThreshold` | `number` | `0.8` | Minimum similarity |
| `maxMatches` | `number` | `5` | Maximum matches to return |
| `embeddingWeight` | `number` | `0.6` | Weight for embedding similarity |
| `tokenWeight` | `number` | `0.3` | Weight for token overlap |
| `positionWeight` | `number` | `0.1` | Weight for positional alignment |

#### Methods

##### findMatches

Find matching anchors for a query segment.

```typescript
findMatches(
  querySegment: KVCacheSegment,
  queryEmbedding: number[],
  anchorPool: KVAnchorPool
): AnchorMatch[]
```

**Example:**

```typescript
const matcher = new AnchorMatcher({ similarityThreshold: 0.85 });
const matches = matcher.findMatches(segment, embedding, pool);

for (const match of matches) {
  console.log(`Anchor: ${match.anchor.anchorId}, Similarity: ${match.similarity}`);
}
```

---

### OffsetPredictor

Predicts KV-cache offsets from anchor patterns.

#### Constructor

```typescript
constructor(config?: Partial<OffsetPredictorConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `windowSize` | `number` | `3` | History window size |
| `learningRate` | `number` | `0.01` | Learning rate |
| `smoothingFactor` | `number` | `0.9` | Exponential smoothing |
| `minConfidence` | `number` | `0.5` | Minimum confidence |

#### Methods

##### predictOffset

Predict offset for a segment based on matched anchors.

```typescript
predictOffset(
  matches: AnchorMatch[],
  querySegment: KVCacheSegment
): OffsetPrediction[]
```

**Returns:**

```typescript
interface OffsetPrediction {
  anchorId: string;
  predictedOffset: number[][];
  confidence: number;
  deviationScore: number;
}
```

##### updateOffsetHistory

Update offset history with actual offsets.

```typescript
updateOffsetHistory(
  anchorId: string,
  actualOffset: number[][]
): void
```

##### learn

Learn from offset prediction errors.

```typescript
learn(
  anchorId: string,
  predictedOffset: number[][],
  actualOffset: number[][],
  reward: number
): void
```

---

### AnchorPredictor

Determines if new KV-caches should become anchors.

#### Methods

##### shouldBecomeAnchor

Predict whether a segment should become an anchor.

```typescript
shouldBecomeAnchor(
  segment: KVCacheSegment,
  matches: AnchorMatch[],
  anchorPool: KVAnchorPool
): { shouldAnchor: boolean; reason: string }
```

**Example:**

```typescript
const predictor = new AnchorPredictor();
const decision = predictor.shouldBecomeAnchor(segment, matches, pool);

if (decision.shouldAnchor) {
  console.log(`Creating anchor: ${decision.reason}`);
  await pool.createAnchor(segment, embedding);
}
```

---

## Cache Utilities

**Module:** `src/core/cacheutils.ts`

### CacheSlicer

Slice caches along sequence dimension.

#### Constructor

```typescript
constructor(options?: Partial<CacheOptions>)
```

#### Methods

##### slice

Slice a cache along sequence dimension.

```typescript
slice<T extends TensorLike>(
  cache: Cache<T>,
  spec: SliceSpec,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

**Slice Spec:**

```typescript
interface SliceSpec {
  start: number;
  end?: number;
  step?: number;
}
```

**Example:**

```typescript
const slicer = new CacheSlicer();

// Get first 10 elements
const head = slicer.slice(cache, { start: 0, end: 10 });

// Get last 5 elements
const tail = slicer.sliceRelative(cache, -5);

// Get every 2nd element
const strided = slicer.slice(cache, { start: 0, step: 2 });
```

##### sliceBatch

Slice multiple caches with same specification.

```typescript
sliceBatch<T extends TensorLike>(
  caches: Cache<T>[],
  spec: SliceSpec,
  options?: Partial<CacheOptions>
): (Cache<T> | null)[]
```

##### head

Get first N elements.

```typescript
head<T extends TensorLike>(
  cache: Cache<T>,
  n: number,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### tail

Get last N elements.

```typescript
tail<T extends TensorLike>(
  cache: Cache<T>,
  n: number,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

---

### CacheConcatenator

Concatenate multiple caches.

#### Methods

##### concat

Concatenate multiple caches.

```typescript
concat<T extends TensorLike>(
  caches: Cache<T>[],
  options?: Partial<CacheOptions>
): Cache<T> | null
```

**Example:**

```typescript
const concatenator = new CacheConcatenator();

// Simple concatenation
const combined = concatenator.concat([cache1, cache2, cache3]);

// With separator
const withSep = concatenator.concatWithSeparator(
  [cache1, cache2],
  separatorData
);

// With overlap
const withOverlap = concatenator.concatWithOverlap(
  [cache1, cache2],
  10  // 10 element overlap
);
```

##### concatWithSeparator

Concatenate with separators.

```typescript
concatWithSeparator<T extends TensorLike>(
  caches: Cache<T>[],
  separator: T,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### concatWithOverlap

Concatenate with overlapping regions.

```typescript
concatWithOverlap<T extends TensorLike>(
  caches: Cache<T>[],
  overlapSize: number,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

---

### CacheReplacer

Replace segments within caches.

#### Methods

##### replace

Replace a segment of cache with new data.

```typescript
replace<T extends TensorLike>(
  cache: Cache<T>,
  position: number,
  replacement: T,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

**Example:**

```typescript
const replacer = new CacheReplacer();

// Replace single position
const updated = replacer.replace(cache, 5, newData);

// Replace range
const rangeUpdated = replacer.replaceRange(
  cache,
  5,   // start
  10,  // end
  newData
);

// Replace by condition
const conditional = replacer.replaceWhere(
  cache,
  (value, index) => value > 0.5,  // predicate
  1.0  // replacement value
);

// Replace multiple positions
const multi = replacer.replaceMultiple(
  cache,
  [
    { position: 5, data: data1 },
    { position: 10, data: data2 },
    { position: 15, data: data3 }
  ]
);
```

##### replaceRange

Replace a range of positions.

```typescript
replaceRange<T extends TensorLike>(
  cache: Cache<T>,
  start: number,
  end: number,
  replacement: T,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### replaceMultiple

Replace multiple positions at once.

```typescript
replaceMultiple<T extends TensorLike>(
  cache: Cache<T>,
  replacements: Array<{ position: number; data: T }>,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### replaceWhere

Replace by condition (predicate function).

```typescript
replaceWhere<T extends TensorLike>(
  cache: Cache<T>,
  predicate: (value: number, index: number) => boolean,
  replacement: number | ((value: number, index: number) => number),
  options?: Partial<CacheOptions>
): Cache<T> | null
```

---

### CacheIndexSelector

Select positions by index.

#### Methods

##### select

Select by single index.

```typescript
select<T extends TensorLike>(
  cache: Cache<T>,
  index: number,
  options?: Partial<CacheOptions>
): T | null
```

**Example:**

```typescript
const selector = new CacheIndexSelector();

// Single index
const value = selector.select(cache, 5);

// Multiple indices
const subset = selector.selectMany(cache, [1, 5, 10, 15]);

// Boolean mask
const masked = selector.selectMask(cache, [true, false, true, true]);

// Range
const range = selector.selectRange(cache, 5, 10);

// Every nth element
const strided = selector.selectStrided(cache, 3);  // every 3rd

// Random sample
const sample = selector.selectSample(cache, 10, 42);  // seed=42

// Top-k by score
const topK = selector.selectTopK(cache, 5, (value, i) => value);
```

##### selectMany

Select by multiple indices.

```typescript
selectMany<T extends TensorLike>(
  cache: Cache<T>,
  indices: number[],
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### selectMask

Select by boolean mask.

```typescript
selectMask<T extends TensorLike>(
  cache: Cache<T>,
  mask: boolean[],
  options?: Partial<CacheOptions>
): Cache<T> | null
```

##### selectTopK

Select top-k by scoring function.

```typescript
selectTopK<T extends TensorLike>(
  cache: Cache<T>,
  k: number,
  scoreFn: (value: number, index: number) => number,
  options?: Partial<CacheOptions>
): Cache<T> | null
```

---

### CacheSplitter

Split caches by placeholder spans.

#### Methods

##### splitByPlaceholder

Split cache by placeholder spans.

```typescript
splitByPlaceholder<T extends TensorLike>(
  cache: Cache<T>,
  placeholder: number,
  options?: Partial<CacheOptions>
): SplitResult<T> | null
```

**Example:**

```typescript
const splitter = new CacheSplitter();

// Split by placeholder (e.g., zeros)
const segments = splitter.splitByPlaceholder(cache, 0);

// Split by max size
const chunks = splitter.splitBySize(cache, 100);

// Split by delimiter
const parts = splitter.splitByDelimiter(cache, -1);

// Split by predicate
const filtered = splitter.splitWhere(cache,
  (value) => value > 0.5,
  'high-values'
);

// Split into N parts
const divided = splitter.splitN(cache, 5);

// Split at specific indices
const atIndices = splitter.splitAt(cache, [10, 20, 30]);
```

##### splitBySize

Split by maximum segment size.

```typescript
splitBySize<T extends TensorLike>(
  cache: Cache<T>,
  maxSize: number,
  options?: Partial<CacheOptions>
): SplitResult<T> | null
```

##### splitByDelimiter

Split by delimiter values.

```typescript
splitByDelimiter<T extends TensorLike>(
  cache: Cache<T>,
  delimiter: number,
  options?: Partial<CacheOptions>
): SplitResult<T> | null
```

##### splitWhere

Split by custom predicate.

```typescript
splitWhere<T extends TensorLike>(
  cache: Cache<T>,
  predicate: (value: number, index: number) => boolean,
  label?: string,
  options?: Partial<CacheOptions>
): SplitResult<T> | null
```

---

## Context Sharing

**Module:** `src/core/contextshare.ts`

### SharedContextManager

Manages shared context segments between agents.

#### Constructor

```typescript
constructor(config?: Partial<SharedContextManagerConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxSegmentsPerContext` | `number` | `100` | Max segments per context |
| `maxContextAge` | `number` | `1h` | Maximum context age |
| `reusePolicy` | `ContextReusePolicy` | - | Reuse policy settings |
| `embeddingDimension` | `number` | `128` | Embedding dimension |
| `enableDiffTracking` | `boolean` | `true` | Enable diff tracking |

#### Methods

##### createSharedContext

Create a new shared context.

```typescript
async createSharedContext(
  ownerAgentId: string,
  segments: ContextSegment[],
  privacyLevel?: ContextPrivacy,
  expiresAt?: number
): Promise<SharedContext>
```

**Example:**

```typescript
const manager = new SharedContextManager();

const segments: ContextSegment[] = [
  new ContextSegmentImpl(
    'Hello world',
    [123, 456, 789],
    embedding,
    'agent-001'
  )
];

const context = await manager.createSharedContext(
  'agent-001',
  segments,
  ContextPrivacy.COLONY
);
```

##### shareWithContext

Share context with another agent.

```typescript
async shareWithContext(
  contextId: string,
  targetAgentId: string,
  options?: {
    expiresAt?: number;
    overridePrivacy?: ContextPrivacy;
  }
): Promise<boolean>
```

##### findReusableContext

Find reusable context for an agent.

```typescript
findReusableContext(
  agentId: string,
  querySegments: ContextSegment[],
  queryEmbedding?: number[]
): ContextReuseDecision[]
```

**Returns:**

```typescript
interface ContextReuseDecision {
  canReuse: boolean;
  confidence: number;
  sourceContextId?: string;
  requiredOffsets?: ContextOffset[];
  reason: string;
  estimatedSpeedup?: number;
}
```

##### computeContextDiff

Compute diff between two contexts.

```typescript
computeContextDiff(
  context1Id: string,
  context2Id: string
): ContextDiff | undefined
```

**Returns:**

```typescript
interface ContextDiff {
  prefixMatch: boolean;
  similarity: number;
  addedSegments: ContextSegment[];
  removedSegments: ContextSegment[];
  modifiedSegments: Array<{
    segmentId: string;
    oldHash: string;
    newHash: string;
  }>;
  offset: ContextOffset[];
}
```

##### getStats

Get context sharing statistics.

```typescript
getStats(): ContextSharingStats
```

---

### ContextReusePolicyImpl

Determines when context can be reused.

#### Constructor

```typescript
constructor(policy?: Partial<ContextReusePolicy>)
```

**Policy Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableReuse` | `boolean` | `true` | Enable context reuse |
| `minSimilarityThreshold` | `number` | `0.8` | Minimum similarity |
| `maxPrefixChange` | `number` | `0.2` | Maximum prefix change |
| `allowedPrivacyLevels` | `ContextPrivacy[]` | - | Allowed privacy levels |
| `enablePlaceholderTemplating` | `boolean` | `true` | Enable placeholders |
| `maxContextAge` | `number` | `1h` | Maximum context age |

#### Methods

##### canReuseContext

Determine if context can be reused.

```typescript
canReuseContext(
  sharedContext: SharedContext,
  requesterAgentId: string,
  similarity: number,
  currentContextHash: string
): ContextReuseDecision
```

---

### PlaceholderContextManager

Manages placeholder-based context templating.

#### Methods

##### createTemplate

Create a context template with placeholders.

```typescript
createTemplate(
  templateId: string,
  segments: Array<ContextSegment | Placeholder>,
  metadata?: Record<string, unknown>
): ContextTemplate
```

**Example:**

```typescript
const placeholderMgr = new PlaceholderContextManager();

const template = placeholderMgr.createTemplate(
  'greeting-template',
  [
    {
      placeholderId: 'name',
      description: 'User name',
      required: true
    },
    actualSegment
  ]
);
```

##### instantiateTemplate

Instantiate a template with actual segments.

```typescript
instantiateTemplate(
  templateId: string,
  replacements: Map<string, ContextSegment>
): ContextSegment[]
```

---

## Federated KV Sync

**Module:** `src/core/kvfederated.ts`

### FederatedKVSync

Manages synchronization of KV-anchors across colonies with privacy preservation.

#### Constructor

```typescript
constructor(
  anchorPool: KVAnchorPool,
  config?: Partial<FederatedKVSyncConfig>
)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `defaultPrivacyTier` | `PrivacyTier` | `MEADOW` | Default privacy tier |
| `enableDifferentialPrivacy` | `boolean` | `true` | Enable DP |
| `noiseDistribution` | `'gaussian' \| 'laplacian'` | `'gaussian'` | Noise type |
| `privacyBudgets` | `object` | - | Privacy budgets per tier |
| `minQualityForSharing` | `number` | `0.7` | Min quality for sharing |
| `maxAnchorsPerSync` | `number` | `50` | Max anchors per sync |
| `aggregationMethod` | `'fedavg' \| 'weighted' \| 'quality-weighted'` | `'quality-weighted'` | Aggregation method |

**Privacy Budgets:**

```typescript
{
  LOCAL: { epsilon: Infinity, delta: 1.0 },
  MEADOW: { epsilon: 1.0, delta: 1e-5 },
  RESEARCH: { epsilon: 0.5, delta: 1e-6 },
  PUBLIC: { epsilon: 0.3, delta: 1e-7 }
}
```

#### Methods

##### registerColony

Register a colony for federated anchor sync.

```typescript
async registerColony(
  colonyId: string,
  privacyTier?: PrivacyTier
): Promise<AnchorPrivacyBudget>
```

**Returns:**

```typescript
interface AnchorPrivacyBudget {
  colonyId: string;
  privacyTier: PrivacyTier;
  epsilonSpent: number;
  deltaSpent: number;
  epsilonLimit: number;
  deltaLimit: number;
  anchorsShared: number;
  anchorsReceived: number;
  lastUpdated: number;
}
```

##### prepareAnchorsForSharing

Prepare anchors for federated sharing from a colony.

```typescript
async prepareAnchorsForSharing(
  colonyId: string,
  privacyTier?: PrivacyTier
): Promise<AnchorSyncPackage>
```

**Returns:**

```typescript
interface AnchorSyncPackage {
  packageId: string;
  roundNumber: number;
  sourceColonyId: string;
  anchors: PrivateKVAnchor[];
  metadata: {
    totalAnchors: number;
    avgQualityScore: number;
    privacyTier: PrivacyTier;
    epsilonSpent: number;
    deltaSpent: number;
    compressionRatio: number;
  };
  timestamp: number;
}
```

##### receiveAnchorsFromColony

Receive and integrate anchors from other colonies.

```typescript
async receiveAnchorsFromColony(
  syncPackage: AnchorSyncPackage
): Promise<number>
```

##### trackCrossColonyReuse

Track cross-colony anchor reuse.

```typescript
trackCrossColonyReuse(
  anchorId: string,
  colonyId: string
): void
```

##### getStats

Get sync statistics.

```typescript
getStats(): FederatedKVStats
```

**Returns:**

```typescript
interface FederatedKVStats {
  totalSyncRounds: number;
  totalAnchorsShared: number;
  totalAnchorsReceived: number;
  totalAnchorsAggregated: number;
  avgAnchorQuality: number;
  crossColonyReuseRate: number;
  privacyBudgetUsed: number;
  compressionSavings: number;
}
```

---

### PrivacyAwareAnchors

Applies differential privacy mechanisms to KV-anchors.

#### Constructor

```typescript
constructor(config?: Partial<PrivacyAwareAnchorConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableDifferentialPrivacy` | `boolean` | `true` | Enable DP |
| `clipThreshold` | `number` | `1.0` | Clipping threshold |
| `noiseScale` | `number` | `1.0` | Noise scale |
| `preserveUtility` | `boolean` | `true` | Preserve utility |
| `adaptiveNoise` | `boolean` | `true` | Adaptive noise |

#### Methods

##### applyPrivacyToAnchor

Apply privacy mechanisms to a single anchor.

```typescript
async applyPrivacyToAnchor(
  anchor: KVAnchor,
  privacyTier: PrivacyTier,
  sourceColonyId: string
): Promise<PrivateKVAnchor>
```

**Returns:**

```typescript
interface PrivateKVAnchor extends KVAnchor {
  privacyTier: PrivacyTier;
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
  sourceColonyId: string;
  crossColonyReuseCount: number;
}
```

##### applyPrivacyToAnchors

Apply privacy mechanisms to multiple anchors.

```typescript
async applyPrivacyToAnchors(
  anchors: KVAnchor[],
  privacyTier: PrivacyTier,
  sourceColonyId: string
): Promise<PrivateKVAnchor[]>
```

##### checkPrivacyBudget

Check if privacy budget allows sharing.

```typescript
checkPrivacyBudget(
  budget: AnchorPrivacyBudget,
  anchorsToShare: number
): boolean
```

---

### AnchorAggregation

Aggregates anchors from multiple colonies using FedAvg-style algorithms.

#### Constructor

```typescript
constructor(config?: Partial<AnchorAggregationConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | `'fedavg' \| 'weighted' \| 'quality-weighted'` | `'quality-weighted'` | Aggregation method |
| `minQualityThreshold` | `number` | `0.6` | Min quality threshold |
| `maxAnchorsPerBatch` | `number` | `100` | Max anchors per batch |
| `pruningThreshold` | `number` | `0.3` | Pruning threshold |

#### Methods

##### aggregateAnchors

Aggregate anchors from multiple colonies.

```typescript
async aggregateAnchors(
  anchorPackages: AnchorSyncPackage[]
): Promise<AggregatedAnchor[]>
```

**Returns:**

```typescript
interface AggregatedAnchor {
  anchorId: string;
  layerId: number;
  aggregatedEmbedding: number[];
  aggregatedKeys: Float32Array;
  aggregatedValues: Float32Array;
  sourceColonies: string[];
  qualityScores: number[];
  weights: number[];
  aggregationMetadata: {
    colonyCount: number;
    avgQuality: number;
    minQuality: number;
    maxQuality: number;
    privacyPreserved: boolean;
  };
  createdAt: number;
}
```

##### fedAvgAggregation

FedAvg-style aggregation for anchor embeddings.

```typescript
fedAvgAggregation(
  anchors: PrivateKVAnchor[]
): {
  embedding: number[];
  keys: Float32Array;
  values: Float32Array;
}
```

##### qualityWeightedAggregation

Quality-weighted aggregation.

```typescript
qualityWeightedAggregation(
  anchors: PrivateKVAnchor[]
): {
  embedding: number[];
  keys: Float32Array;
  values: Float32Array;
}
```

---

## Meadow Marketplace

**Module:** `src/core/kvmeadow.ts`

### AnchorMarket

Marketplace for trading KV-anchors.

#### Methods

##### listAnchor

List an anchor for trade.

```typescript
listAnchor(
  anchor: KVAnchor,
  sellerId: string,
  options: {
    contextType: string;
    tags?: string[];
    price?: number;
    expiresAt?: number;
  }
): AnchorListing
```

**Example:**

```typescript
const market = new AnchorMarket();

const listing = market.listAnchor(
  anchor,
  'seller-001',
  {
    contextType: 'code-generation',
    tags: ['python', 'algorithms'],
    price: 100,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  }
);
```

##### getListings

Get all active listings.

```typescript
getListings(filters?: {
  contextType?: string;
  sellerId?: string;
  minQuality?: number;
  maxPrice?: number;
  tags?: string[];
  activeOnly?: boolean;
}): AnchorListing[]
```

##### createRequest

Create a request for anchors.

```typescript
createRequest(
  requesterId: string,
  contextType: string,
  requirements: AnchorRequest['requirements'],
  budget: number,
  durationMs?: number
): AnchorRequest
```

##### fillRequest

Fill a request with a listing.

```typescript
fillRequest(
  requestId: string,
  listingId: string,
  buyerId: string
): {
  success: boolean;
  tradeId?: string;
  reason?: string;
}
```

##### getStats

Get marketplace statistics.

```typescript
getStats(): MarketplaceStats
```

**Returns:**

```typescript
interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalRequests: number;
  openRequests: number;
  totalTrades: number;
  totalVolume: number;
  averagePrice: number;
  topContextTypes: Array<{ type: string; count: number }>;
}
```

---

### AnchorPollenManager

Anchor exchange as pollen grains for cross-pollination.

#### Methods

##### anchorToPollen

Convert an anchor to a pollen grain for sharing.

```typescript
anchorToPollen(
  anchor: KVAnchor,
  source: string,
  options: {
    contextType: string;
    tags?: string[];
    provenance: Omit<ProvenanceData, 'modificationHistory'>;
  }
): AnchorPollen
```

**Returns:**

```typescript
interface AnchorPollen extends PollenGrain {
  anchorId: string;
  anchor: KVAnchor;
  contextType: string;
  lineage: string[];
  provenance: ProvenanceData;
  crossPollinatedCount: number;
  marketValue: number;
  createdFrom: string;
  createdAt: number;
}
```

##### crossPollinate

Cross-pollinate an anchor to another keeper.

```typescript
crossPollinate(
  pollenId: string,
  targetKeeperId: string,
  modifications?: Omit<ProvenanceModification, 'modifiedBy' | 'modifiedAt'>
): AnchorPollen
```

##### getLineage

Track pollen lineage.

```typescript
getLineage(pollenId: string): Array<{
  pollenId: string;
  keeperId: string;
  timestamp: number;
}>
```

---

### CommunityAnchorPool

Shared anchor pool for the meadow with voting and curation.

#### Methods

##### submitAnchor

Submit an anchor to the community pool.

```typescript
submitAnchor(
  anchor: KVAnchor,
  submittedBy: string,
  contextType: string
): CommunityAnchor
```

##### vote

Vote on an anchor.

```typescript
vote(
  anchorId: string,
  voterId: string,
  vote: 'up' | 'down' | 'abstain',
  reason?: string
): AnchorVote
```

**Example:**

```typescript
const pool = new CommunityAnchorPool();

// Submit anchor
const communityAnchor = pool.submitAnchor(anchor, 'user-001', 'code');

// Vote on anchor
const vote = pool.vote(
  communityAnchor.anchorId,
  'user-002',
  'up',
  'High quality anchor'
);

// Get vote summary
const summary = pool.getVoteSummary(communityAnchor.anchorId);
console.log(`Net score: ${summary.netScore}, Approval: ${summary.approvalRating}`);
```

##### approveAnchor

Approve a pending anchor.

```typescript
approveAnchor(
  anchorId: string,
  curatedBy: string
): CommunityAnchor
```

##### retireAnchor

Retire an anchor.

```typescript
retireAnchor(
  anchorId: string,
  reason: string,
  retiredBy: string
): CommunityAnchor
```

##### distributeRewards

Distribute rewards to contributors.

```typescript
distributeRewards(anchorId: string): Map<string, number>
```

##### getTopAnchors

Get top anchors by various metrics.

```typescript
getTopAnchors(
  by: 'quality' | 'usage' | 'value' | 'votes',
  limit?: number
): CommunityAnchor[]
```

---

## Dream Integration

**Module:** `src/core/kvdream.ts`

### KVDreamIntegration

Main integration class combining DreamKVManager, DreamAnchors, and ImaginationCache.

#### Constructor

```typescript
constructor(worldModel: WorldModel, config?: Partial<KVDreamConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxKVCacheSize` | `number` | `1000` | Max KV-caches per dream |
| `kvCacheTTL` | `number` | `1h` | KV-cache TTL |
| `anchorPoolSize` | `number` | `100` | Dream anchors to maintain |
| `anchorValueThreshold` | `number` | `0.5` | Min value to create anchor |
| `imaginationCacheSize` | `number` | `500` | Imagined trajectories to cache |
| `dreamBatchSize` | `number` | `10` | Episodes per dream cycle |
| `dreamHorizon` | `number` | `50` | Dream episode length |

#### Methods

##### generateKVDream

Generate KV-enhanced dream episode.

```typescript
generateKVDream(
  startState: number[],
  actionSampler?: (state: number[], timestep: number) => number
): KVDreamResult
```

**Returns:**

```typescript
interface KVDreamResult {
  episode: DreamEpisode;
  kvReuse: {
    cachesUsed: string[];
    totalSegments: number;
    reusedSegments: number;
    reuseRate: number;
  };
  anchorUsage: {
    usedAnchor: boolean;
    anchorId?: string;
    anchorSimilarity?: number;
  };
  imaginationCache: {
    hit: boolean;
    cacheId?: string;
    similarity?: number;
  };
  efficiency: number;
  generationTime: number;
  timestamp: number;
}
```

**Example:**

```typescript
const integration = new KVDreamIntegration(worldModel, {
  anchorPoolSize: 100,
  imaginationCacheSize: 500
});

// Generate dream with KV reuse
const result = integration.generateKVDream(
  initialState,
  (state, timestep) => sampleAction(state)
);

console.log(`Efficiency: ${result.efficiency}x`);
console.log(`KV reuse rate: ${result.kvReuse.reuseRate}`);
console.log(`Anchor used: ${result.anchorUsage.usedAnchor}`);
```

##### generateKVDreamBatch

Generate batch of KV-enhanced dreams.

```typescript
generateKVDreamBatch(
  startStates: number[][],
  actionSampler?: (state: number[], timestep: number) => number
): KVDreamResult[]
```

##### getStats

Get comprehensive statistics.

```typescript
getStats(): KVDreamStats
```

**Returns:**

```typescript
interface KVDreamStats {
  totalKVCaches: number;
  kvCacheHitRate: number;
  avgKVCacheEfficiency: number;
  totalKVSegmentsReused: number;
  totalAnchors: number;
  anchorHitRate: number;
  avgAnchorValue: number;
  imaginationCacheSize: number;
  imaginationCacheHitRate: number;
  avgGenerationSpeedup: number;
  totalDreamEpisodes: number;
  totalEfficiencyGain: number;
}
```

---

### DreamKVManager

Manages KV-caches during world model dreaming.

#### Methods

##### storeKVCache

Store KV-cache from dream episode.

```typescript
storeKVCache(
  episode: DreamEpisode,
  cacheSegments: KVCacheSegment[],
  metadata: KVCacheMetadata
): string
```

##### findKVCaches

Find reusable KV-caches for a state.

```typescript
findKVCaches(state: number[]): DreamKVCache[]
```

**Returns:**

```typescript
interface DreamKVCache {
  id: string;
  dreamEpisodeId: string;
  cacheSegments: KVCacheSegment[];
  metadata: KVCacheMetadata;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  hitCount: number;
  efficiency: number;
}
```

---

### DreamAnchors

Anchor points for dream starting states.

#### Methods

##### createAnchor

Create anchor from high-value dream state.

```typescript
createAnchor(
  episode: DreamEpisode,
  value: number
): DreamAnchor | null
```

**Returns:**

```typescript
interface DreamAnchor {
  id: string;
  state: number[];
  latentState: number[];
  value: number;
  uncertainty: number;
  dreamEpisodeId: string;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
  successRate: number;
  metadata: {
    totalReward: number;
    episodeLength: number;
    avgValue: number;
    explorationBonus: number;
  };
}
```

##### findAnchor

Find matching anchor for a state.

```typescript
findAnchor(state: number[]): {
  anchor: DreamAnchor;
  similarity: number;
} | null
```

---

### ImaginationCache

Cache for imagined trajectories.

#### Methods

##### storeImagination

Store imagination trajectory.

```typescript
storeImagination(
  queryState: number[],
  trajectory: DreamEpisode,
  value: number,
  generationTime: number
): string
```

##### findImagination

Find cached imagination for a query.

```typescript
findImagination(queryState: number[]): {
  imagination: ImaginationCache;
  similarity: number;
} | null
```

---

## Tile Integration

**Module:** `src/core/kvtile.ts`

### TileKVCache

Manages KV-cache for individual tiles.

#### Constructor

```typescript
constructor(config?: Partial<TileKVCacheConfig>)
```

**Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxCacheEntries` | `number` | `1000` | Max cache entries |
| `maxCacheAge` | `number` | `24h` | Max cache age |
| `maxCacheSize` | `number` | `100MB` | Max cache size |
| `enableCompression` | `boolean` | `true` | Enable compression |
| `similarityThreshold` | `number` | `0.8` | Similarity threshold |

#### Methods

##### storeCache

Store a cache entry for a tile.

```typescript
async storeCache(
  tileId: string,
  context: TileContext,
  cache: Cache,
  variantId?: string
): Promise<string>
```

##### retrieveCache

Retrieve cache for a tile context.

```typescript
async retrieveCache(
  tileId: string,
  context: TileContext,
  variantId?: string
): Promise<CacheLookupResult>
```

**Returns:**

```typescript
interface CacheLookupResult {
  found: boolean;
  cache?: Cache;
  similarity?: number;
  anchor?: KVAnchor;
  reason: string;
}
```

##### invalidateCache

Invalidate cache for a tile.

```typescript
invalidateCache(tileId: string, variantId?: string): number
```

##### getStats

Get cache statistics.

```typescript
getStats(): TileCacheStats
```

**Returns:**

```typescript
interface TileCacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgAccessTime: number;
  totalCacheSize: number;
  activeCaches: number;
}
```

---

### TileAnchorBridge

Bridges tiles to the anchor system.

#### Methods

##### pollenGrainToEmbedding

Convert tile PollenGrain to anchor embedding.

```typescript
pollenGrainToEmbedding(grain: TilePollenGrain): number[]
```

##### matchTileContext

Match tile context to existing anchors.

```typescript
async matchTileContext(
  tileId: string,
  context: TileContext,
  grain: TilePollenGrain
): Promise<AnchorMatch[]>
```

##### shareTileCache

Share tile KV-cache with similar tiles.

```typescript
async shareTileCache(
  tileId: string,
  context: TileContext,
  cache: Cache,
  grain: TilePollenGrain,
  variantId?: string
): Promise<string>
```

---

### TileContextReuse

Context reuse between tile variants.

#### Methods

##### canReuseContext

Detect if variants can share context.

```typescript
async canReuseContext(
  tileId: string,
  fromVariant: string,
  toVariant: string,
  fromCache: Cache,
  toCache: Cache
): Promise<ContextDiff>
```

**Returns:**

```typescript
interface ContextDiff {
  similarity: number;
  addedTokens: number;
  removedTokens: number;
  modifiedTokens: number;
  canReuse: boolean;
  estimatedSpeedup: number;
}
```

##### reuseContext

Reuse context from one variant for another.

```typescript
async reuseContext(
  fromCache: Cache,
  diff: ContextDiff
): Promise<Cache | null>
```

##### trackReuse

Track reuse statistics for a tile.

```typescript
trackReuse(
  tileId: string,
  variantId: string | undefined,
  success: boolean,
  similarity: number,
  speedup: number
): void
```

---

## Configuration Options

### KVAnchorPoolConfig

```typescript
interface KVAnchorPoolConfig {
  // Pool management
  maxAnchors: number;           // Default: 1000
  maxAgeMs: number;             // Default: 24h

  // Quality thresholds
  minQualityScore: number;      // Default: 0.7
  minCompressionRatio: number;  // Default: 2.0

  // Matching parameters
  similarityThreshold: number;  // Default: 0.8
  maxMatches: number;           // Default: 5

  // Compression parameters
  keyProjectionDim: number;     // Default: 64
  valueProjectionDim: number;   // Default: 64
  quantizationBits: 4 | 8;      // Default: 8

  // Clustering parameters
  enableClustering: boolean;    // Default: true
  numClusters: number;          // Default: 10
  clusterThreshold: number;     // Default: 0.3

  // LRU parameters
  enableLRU: boolean;           // Default: true
  lruSampleSize: number;        // Default: 100
}
```

### CacheOptions

```typescript
interface CacheOptions {
  validateLength?: boolean;      // Default: true
  cloneData?: boolean;           // Default: true
  preserveMetadata?: boolean;    // Default: true
  onError?: 'throw' | 'return-null' | 'return-empty';  // Default: 'throw'
}
```

### ContextReusePolicy

```typescript
interface ContextReusePolicy {
  enableReuse: boolean;          // Default: true
  minSimilarityThreshold: number; // Default: 0.8
  maxPrefixChange: number;       // Default: 0.2
  allowedPrivacyLevels: ('public' | 'colony' | 'private')[];
  enablePlaceholderTemplating: boolean; // Default: true
  maxContextAge: number;         // Default: 1h
}
```

### KVDreamConfig

```typescript
interface KVDreamConfig {
  // KV-cache management
  maxKVCacheSize: number;        // Default: 1000
  kvCacheTTL: number;            // Default: 1h

  // Dream anchors
  anchorPoolSize: number;        // Default: 100
  anchorValueThreshold: number;  // Default: 0.5
  anchorSimilarityThreshold: number; // Default: 0.85

  // Imagination cache
  imaginationCacheSize: number;  // Default: 500
  imaginationCacheTTL: number;   // Default: 30min
  imaginationMatchThreshold: number; // Default: 0.8

  // Dream generation
  dreamBatchSize: number;        // Default: 10
  dreamHorizon: number;          // Default: 50

  // Efficiency tracking
  trackEfficiency: boolean;      // Default: true
  efficiencyWindowSize: number;  // Default: 100
}
```

---

## Usage Examples

### Example 1: Basic Anchor Creation and Matching

```typescript
import { KVAnchorPool, AnchorMatcher } from './kvanchor.js';

// Initialize pool and matcher
const pool = new KVAnchorPool({
  maxAnchors: 500,
  similarityThreshold: 0.85,
  enableClustering: true
});

const matcher = new AnchorMatcher({ similarityThreshold: 0.85 });

// Create segment and embedding
const segment: KVCacheSegment = {
  layerId: 0,
  segmentId: 'seg-001',
  tokens: [123, 456, 789],
  keyCache: [[0.1, 0.2], [0.3, 0.4]],
  valueCache: [[0.5, 0.6], [0.7, 0.8]],
  metadata: {
    createdAt: Date.now(),
    modelHash: 'model-v1',
    agentId: 'agent-001',
    turnNumber: 1,
    position: 0,
    length: 2
  }
};

const embedding = new Array(128).fill(0).map(() => Math.random());

// Create anchor
const anchor = await pool.createAnchor(segment, embedding);
console.log(`Created anchor: ${anchor.anchorId}`);
console.log(`Quality: ${anchor.qualityScore}, Compression: ${anchor.compressionRatio}x`);

// Find similar anchors
const queryEmbedding = new Array(128).fill(0).map(() => Math.random());
const similarAnchors = pool.findSimilarAnchors(queryEmbedding, 0, 0.85);
console.log(`Found ${similarAnchors.length} similar anchors`);

// Get pool stats
const stats = pool.getStats();
console.log(`Pool stats:`, stats);
```

### Example 2: Cache Manipulation

```typescript
import {
  CacheSlicer,
  CacheConcatenator,
  CacheReplacer,
  CacheIndexSelector,
  CacheSplitter
} from './cacheutils.js';

// Create slicer
const slicer = new CacheSlicer();

// Slice cache
const head = slicer.head(cache, 10);  // First 10
const tail = slicer.tail(cache, 5);   // Last 5
const middle = slicer.slice(cache, { start: 10, end: 20 });

// Concatenate caches
const concatenator = new CacheConcatenator();
const combined = concatenator.concat([cache1, cache2, cache3]);
const withOverlap = concatenator.concatWithOverlap([cache1, cache2], 5);

// Replace segments
const replacer = new CacheReplacer();
const updated = replacer.replaceRange(cache, 5, 10, newData);
const conditional = replacer.replaceWhere(
  cache,
  (value) => value < 0.5,
  0.5
);

// Select indices
const selector = new CacheIndexSelector();
const topK = selector.selectTopK(cache, 5, (v) => v);
const sample = selector.selectSample(cache, 10);

// Split cache
const splitter = new CacheSplitter();
const segments = splitter.splitBySize(cache, 100);
const nonZero = splitter.splitByPlaceholder(cache, 0);
```

### Example 3: Context Sharing

```typescript
import {
  SharedContextManager,
  ContextSegmentImpl,
  ContextPrivacy
} from './contextshare.js';

// Create manager
const manager = new SharedContextManager({
  maxSegmentsPerContext: 100,
  reusePolicy: {
    enableReuse: true,
    minSimilarityThreshold: 0.8,
    allowedPrivacyLevels: [ContextPrivacy.COLONY]
  }
});

// Create segments
const segments: ContextSegment[] = [
  new ContextSegmentImpl(
    'Hello world',
    [123, 456, 789],
    embedding,
    'agent-001'
  )
];

// Create shared context
const context = await manager.createSharedContext(
  'agent-001',
  segments,
  ContextPrivacy.COLONY
);

// Share with another agent
await manager.shareWithContext(context.id, 'agent-002');

// Find reusable context
const decisions = manager.findReusableContext(
  'agent-002',
  querySegments,
  queryEmbedding
);

for (const decision of decisions) {
  if (decision.canReuse) {
    console.log(`Can reuse context ${decision.sourceContextId}`);
    console.log(`Confidence: ${decision.confidence}`);
    console.log(`Estimated speedup: ${decision.estimatedSpeedup}x`);
  }
}

// Get statistics
const stats = manager.getStats();
console.log(`Reuse rate: ${stats.reuseRate}`);
```

### Example 4: Federated KV Sync

```typescript
import { FederatedKVSync } from './kvfederated.js';

// Initialize sync
const sync = new FederatedKVSync(anchorPool, {
  defaultPrivacyTier: 'MEADOW',
  enableDifferentialPrivacy: true,
  privacyBudgets: {
    LOCAL: { epsilon: Infinity, delta: 1.0 },
    MEADOW: { epsilon: 1.0, delta: 1e-5 },
    RESEARCH: { epsilon: 0.5, delta: 1e-6 },
    PUBLIC: { epsilon: 0.3, delta: 1e-7 }
  }
});

// Register colonies
const colony1 = await sync.registerColony('colony-001', 'MEADOW');
const colony2 = await sync.registerColony('colony-002', 'MEADOW');

// Prepare anchors for sharing
const syncPackage = await sync.prepareAnchorsForSharing('colony-001');
console.log(`Sharing ${syncPackage.metadata.totalAnchors} anchors`);
console.log(`Privacy spent: ε=${syncPackage.metadata.epsilonSpent}`);

// Receive anchors from another colony
const received = await sync.receiveAnchorsFromColony(syncPackage);
console.log(`Received and integrated ${received} anchors`);

// Track cross-colony reuse
sync.trackCrossColonyReuse('anchor-001', 'colony-002');

// Get statistics
const stats = sync.getStats();
console.log(`Cross-colony reuse rate: ${stats.crossColonyReuseRate}`);
```

### Example 5: Meadow Marketplace

```typescript
import {
  AnchorMarket,
  AnchorPollenManager,
  CommunityAnchorPool
} from './kvmeadow.js';

// Create marketplace
const market = new AnchorMarket();

// List anchor for trade
const listing = market.listAnchor(
  anchor,
  'seller-001',
  {
    contextType: 'code-generation',
    tags: ['python', 'algorithms'],
    price: 100
  }
);

// Create request
const request = market.createRequest(
  'buyer-001',
  'code-generation',
  { minQualityScore: 0.8, layerIds: [0, 1, 2] },
  200
);

// Fill request
const trade = market.fillRequest(request.id, listing.id, 'buyer-001');
if (trade.success) {
  console.log(`Trade executed: ${trade.tradeId}`);
}

// Convert to pollen
const pollenMgr = new AnchorPollenManager();
const pollen = pollenMgr.anchorToPollen(
  anchor,
  listing.id,
  {
    contextType: 'code-generation',
    tags: ['python'],
    provenance: {
      originalCreator: 'seller-001',
      sourceColony: 'colony-001',
      indigenousSources: ['source-001'],
      fpicStatus: 'granted'
    }
  }
);

// Cross-pollinate
const newPollen = pollenMgr.crossPollinate(
  pollen.id,
  'keeper-002',
  {
    modificationType: 'customization',
    description: 'Adapted for specific use case'
  }
);

// Community pool voting
const pool = new CommunityAnchorPool();
const communityAnchor = pool.submitAnchor(anchor, 'user-001', 'code');
const vote = pool.vote(communityAnchor.anchorId, 'user-002', 'up', 'High quality');

// Get vote summary
const summary = pool.getVoteSummary(communityAnchor.anchorId);
console.log(`Net score: ${summary.netScore}, Approval: ${summary.approvalRating}`);
```

---

## Integration Examples

### Integration 1: Full Agent Pipeline

```typescript
import {
  KVAnchorPool,
  AnchorMatcher,
  SharedContextManager,
  FederatedKVSync
} from './index.js';

class AgentKVSystem {
  private anchorPool: KVAnchorPool;
  private matcher: AnchorMatcher;
  private contextManager: SharedContextManager;
  private federatedSync: FederatedKVSync;

  constructor() {
    // Initialize components
    this.anchorPool = new KVAnchorPool({
      maxAnchors: 1000,
      enableClustering: true,
      enableLRU: true
    });

    this.matcher = new AnchorMatcher({
      similarityThreshold: 0.85
    });

    this.contextManager = new SharedContextManager({
      reusePolicy: {
        enableReuse: true,
        minSimilarityThreshold: 0.8
      }
    });

    this.federatedSync = new FederatedKVSync(this.anchorPool, {
      defaultPrivacyTier: 'MEADOW'
    });
  }

  async processAgentContext(
    agentId: string,
    segment: KVCacheSegment,
    embedding: number[]
  ): Promise<{
    anchor?: KVAnchor;
    reused?: boolean;
    speedup?: number;
  }> {
    // Try to find similar anchors
    const matches = this.matcher.findMatches(segment, embedding, this.anchorPool);

    if (matches.length > 0 && matches[0].similarity > 0.9) {
      // High similarity - reuse existing anchor
      return {
        anchor: matches[0].anchor,
        reused: true,
        speedup: 2.0
      };
    }

    // Check for shared context
    const decisions = this.contextManager.findReusableContext(
      agentId,
      [{ id: 'query', content: '', tokens: [], embedding, hash: '', length: 1,
         createdAt: 0, updatedAt: 0, sourceAgentId: '', usageCount: 0, lastUsed: 0 }],
      embedding
    );

    const reusableDecision = decisions.find(d => d.canReuse);
    if (reusableDecision) {
      return {
        reused: true,
        speedup: reusableDecision.estimatedSpeedup
      };
    }

    // Create new anchor
    const anchor = await this.anchorPool.createAnchor(segment, embedding);
    return { anchor, reused: false };
  }

  async shareWithColony(colonyId: string): Promise<void> {
    const syncPackage = await this.federatedSync.prepareAnchorsForSharing(colonyId);
    console.log(`Shared ${syncPackage.metadata.totalAnchors} anchors`);
  }

  getStats() {
    return {
      anchors: this.anchorPool.getStats(),
      context: this.contextManager.getStats(),
      federated: this.federatedSync.getStats()
    };
  }
}
```

### Integration 2: Dream-Enhanced Agent

```typescript
import {
  KVAnchorPool,
  KVDreamIntegration,
  WorldModel
} from './index.js';

class DreamingAgent {
  private anchorPool: KVAnchorPool;
  private dreamIntegration: KVDreamIntegration;
  private worldModel: WorldModel;

  constructor() {
    this.worldModel = new WorldModel();
    this.anchorPool = new KVAnchorPool();

    this.dreamIntegration = new KVDreamIntegration(this.worldModel, {
      anchorPoolSize: 100,
      imaginationCacheSize: 500,
      trackEfficiency: true
    });
  }

  async dreamWithKV(startState: number[]): Promise<DreamEpisode> {
    // Generate dream with KV reuse
    const result = this.dreamIntegration.generateKVDream(
      startState,
      (state, timestep) => this.sampleAction(state)
    );

    console.log(`Dream efficiency: ${result.efficiency}x speedup`);
    console.log(`KV reuse rate: ${result.kvReuse.reuseRate}`);
    console.log(`Imagination cache hit: ${result.imaginationCache.hit}`);

    return result.episode;
  }

  async learnFromEpisode(episode: DreamEpisode): Promise<void> {
    // Create anchor from high-value episode
    if (episode.totalReward > 0.5) {
      const segment: KVCacheSegment = {
        layerId: 0,
        segmentId: episode.id,
        tokens: [],
        keyCache: [[]],
        valueCache: [[]],
        metadata: {
          createdAt: Date.now(),
          modelHash: 'dream-model',
          agentId: 'dreaming-agent',
          turnNumber: 0,
          position: 0,
          length: episode.length
        }
      };

      const embedding = this.worldModel.encode(episode.startState).sample;
      await this.anchorPool.createAnchor(segment, embedding);
    }
  }

  getDreamStats() {
    return this.dreamIntegration.getStats();
  }
}
```

### Integration 3: Tile-Based Cache Sharing

```typescript
import {
  TileKVCache,
  TileAnchorBridge,
  TileContextReuse
} from './index.js';

class TileCacheSystem {
  private tileCache: TileKVCache;
  private anchorBridge: TileAnchorBridge;
  private contextReuse: TileContextReuse;

  constructor() {
    this.tileCache = new TileKVCache({
      maxCacheEntries: 1000,
      similarityThreshold: 0.8
    });

    this.anchorBridge = new TileAnchorBridge();
    this.contextReuse = new TileContextReuse();
  }

  async executeTile(
    tileId: string,
    context: TileContext,
    grain: TilePollenGrain
  ): Promise<{ result: unknown; cached: boolean }> {
    // Try to retrieve cached result
    const lookup = await this.tileCache.retrieveCache(tileId, context);

    if (lookup.found) {
      return {
        result: lookup.cache.data,
        cached: true
      };
    }

    // Check for context reuse between variants
    const reuseDiff = await this.contextReuse.canReuseContext(
      tileId,
      'variant-001',
      'variant-002',
      fromCache,
      toCache
    );

    if (reuseDiff.canReuse) {
      const reusedCache = await this.contextReuse.reuseContext(fromCache, reuseDiff);
      if (reusedCache) {
        return {
          result: reusedCache.data,
          cached: true
        };
      }
    }

    // Execute tile (placeholder)
    const result = await this.executeTileInternal(tileId, context);

    // Create cache from result
    const cache: Cache = {
      data: result,
      sequenceLength: context.sequenceLength
    };

    await this.tileCache.storeCache(tileId, context, cache);

    // Share with similar tiles
    await this.anchorBridge.shareTileCache(tileId, context, cache, grain);

    return { result, cached: false };
  }

  getTileStats(tileId: string) {
    return this.tileCache.getStats();
  }

  private async executeTileInternal(tileId: string, context: TileContext): Promise<unknown> {
    // Actual tile execution logic
    return {};
  }
}
```

### Integration 4: Privacy-Preserving Multi-Colony System

```typescript
import {
  KVAnchorPool,
  FederatedKVSync,
  PrivacyAwareAnchors,
  AnchorAggregation
} from './index.js';

class MultiColonySystem {
  private colonies: Map<string, FederatedKVSync> = new Map();
  private privacyAware: PrivacyAwareAnchors;
  private aggregator: AnchorAggregation;

  constructor() {
    this.privacyAware = new PrivacyAwareAnchors({
      enableDifferentialPrivacy: true,
      clipThreshold: 1.0,
      preserveUtility: true
    });

    this.aggregator = new AnchorAggregation({
      method: 'quality-weighted',
      minQualityThreshold: 0.6
    });
  }

  addColony(colonyId: string, privacyTier: string): void {
    const anchorPool = new KVAnchorPool();
    const sync = new FederatedKVSync(anchorPool, {
      defaultPrivacyTier: privacyTier as any
    });

    sync.registerColony(colonyId, privacyTier as any);
    this.colonies.set(colonyId, sync);
  }

  async syncColonies(): Promise<void> {
    const packages: AnchorSyncPackage[] = [];

    // Collect anchors from all colonies
    for (const [colonyId, sync] of this.colonies) {
      const pkg = await sync.prepareAnchorsForSharing(colonyId);
      packages.push(pkg);
    }

    // Aggregate anchors
    const aggregated = await this.aggregator.aggregateAnchors(packages);

    // Distribute aggregated anchors back to colonies
    for (const [colonyId, sync] of this.colonies) {
      for (const anchor of aggregated) {
        // Convert aggregated anchor back to KVAnchor
        const kvAnchor: KVAnchor = {
          anchorId: anchor.anchorId,
          layerId: anchor.layerId,
          compressedKeys: anchor.aggregatedKeys,
          compressedValues: anchor.aggregatedValues,
          embedding: anchor.aggregatedEmbedding,
          sourceSegmentId: '',
          sourceAgentId: colonyId,
          usageCount: 0,
          lastUsed: Date.now(),
          qualityScore: anchor.aggregationMetadata.avgQuality,
          compressionRatio: 5.0,
          createdAt: anchor.createdAt,
          updatedAt: anchor.createdAt
        };

        await sync.receiveAnchorsFromColony({
          packageId: uuidv4(),
          roundNumber: 0,
          sourceColonyId: colonyId,
          anchors: [kvAnchor as any],
          metadata: {
            totalAnchors: 1,
            avgQualityScore: anchor.aggregationMetadata.avgQuality,
            privacyTier: 'MEADOW',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressionRatio: 5.0
          },
          timestamp: Date.now()
        });
      }
    }
  }

  getSystemStats() {
    const stats = {
      colonies: {} as Record<string, any>,
      aggregated: this.aggregator.getAggregationStats()
    };

    for (const [colonyId, sync] of this.colonies) {
      stats.colonies[colonyId] = sync.getStats();
    }

    return stats;
  }
}
```

---

## Type Reference

### Core Types

```typescript
// KV-Cache segment
interface KVCacheSegment {
  layerId: number;
  segmentId: string;
  tokens: number[];
  keyCache: number[][];
  valueCache: number[][];
  metadata: KVCacheMetadata;
}

// KV-Cache metadata
interface KVCacheMetadata {
  createdAt: number;
  modelHash: string;
  agentId: string;
  conversationId?: string;
  turnNumber: number;
  position: number;
  length: number;
}

// Anchor
interface KVAnchor {
  anchorId: string;
  layerId: number;
  compressedKeys: Float32Array;
  compressedValues: Float32Array;
  embedding: number[];
  qualityScore: number;
  compressionRatio: number;
  usageCount: number;
  lastUsed: number;
}

// Anchor match
interface AnchorMatch {
  anchor: KVAnchor;
  similarity: number;
  tokenOverlap: number;
  positionalDeviation: number;
}

// Cache
interface Cache<T extends TensorLike = TensorLike> {
  data: T;
  sequenceLength: number;
  metadata?: CacheMetadata;
}

// Privacy tiers
type PrivacyTier = 'LOCAL' | 'MEADOW' | 'RESEARCH' | 'PUBLIC';
```

---

## Events

### KVAnchorPool Events

```typescript
// No direct events, but stats available via getStats()
```

### SharedContextManager Events

```typescript
// Context created
manager.on('context_created', (context: SharedContext) => {});

// Context shared
manager.on('context_shared', (data: {
  contextId: string;
  targetAgentId: string;
  sharedBy: string;
}) => {});

// Context updated
manager.on('context_updated', (context: SharedContext) => {});

// Context removed
manager.on('context_removed', (data: { contextId: string }) => {});

// Context diff computed
manager.on('context_diff', (data: {
  contextId: string;
  diff: ContextDiff;
}) => {});
```

### FederatedKVSync Events

```typescript
// Colony registered
sync.on('colony_registered', (data: {
  colonyId: string;
  privacyTier: PrivacyTier;
}) => {});

// Anchors prepared
sync.on('anchors_prepared', (pkg: AnchorSyncPackage) => {});

// Anchors received
sync.on('anchors_received', (data: {
  packageId: string;
  integratedCount: number;
  sourceColonyId: string;
}) => {});

// Cross-colony reuse
sync.on('cross_colony_reuse', (data: {
  anchorId: string;
  colonyId: string;
  reuseCount: number;
}) => {});
```

### KVDreamIntegration Events

```typescript
// KV cache stored
integration.on('kv_cache_stored', (data: {
  cacheId: string;
  episodeId: string;
  segmentCount: number;
}) => {});

// Anchor created
integration.on('anchor_created', (data: {
  anchorId: string;
  value: number;
  episodeId: string;
}) => {});

// Imagination cached
integration.on('imagination_cached', (data: {
  cacheId: string;
  value: number;
  generationTime: number;
}) => {});
```

### AnchorMarket Events

```typescript
// Anchor listed
market.on('anchor:listed', (listing: AnchorListing) => {});

// Listing cancelled
market.on('listing:cancelled', (listing: AnchorListing) => {});

// Request created
market.on('request:created', (request: AnchorRequest) => {});

// Request cancelled
market.on('request:cancelled', (request: AnchorRequest) => {});

// Trade executed
market.on('trade:executed', (trade: {
  id: string;
  listingId: string;
  requestId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  timestamp: number;
}) => {});
```

---

## Error Handling

### Common Errors

```typescript
// Anchor pool errors
try {
  await pool.createAnchor(segment, embedding);
} catch (error) {
  if (error.message.includes('maximum anchors reached')) {
    // Handle capacity limit
    pool.cleanup();
  }
}

// Context sharing errors
try {
  await manager.shareWithContext(contextId, targetAgentId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Context doesn't exist
  }
  if (error.message.includes('not authorized')) {
    // Privacy restriction
  }
}

// Federated sync errors
try {
  await sync.prepareAnchorsForSharing(colonyId);
} catch (error) {
  if (error.message.includes('not registered')) {
    await sync.registerColony(colonyId);
  }
  if (error.message.includes('privacy budget')) {
    // Privacy budget exhausted
  }
}

// Cache operation errors
try {
  slicer.slice(cache, { start: 0, end: 100 });
} catch (error) {
  if (error.message.includes('exceeds cache length')) {
    // Invalid slice specification
  }
}
```

---

## Performance Considerations

### Memory Management

```typescript
// Configure pool sizes appropriately
const pool = new KVAnchorPool({
  maxAnchors: 1000,  // Adjust based on memory constraints
  maxAgeMs: 24 * 60 * 60 * 1000  // Clean up old anchors
});

// Regular cleanup
setInterval(() => {
  pool.cleanup();
}, 60 * 60 * 1000);  // Hourly cleanup
```

### Compression Trade-offs

```typescript
// Higher compression = lower quality, faster sharing
const highCompression = new KVAnchorPool({
  quantizationBits: 4,  // More compression
  keyProjectionDim: 32,
  valueProjectionDim: 32
});

// Lower compression = higher quality, slower sharing
const lowCompression = new KVAnchorPool({
  quantizationBits: 8,  // Less compression
  keyProjectionDim: 128,
  valueProjectionDim: 128
});
```

### Similarity Thresholds

```typescript
// Higher threshold = fewer matches, higher precision
const highPrecision = new AnchorMatcher({
  similarityThreshold: 0.9
});

// Lower threshold = more matches, higher recall
const highRecall = new AnchorMatcher({
  similarityThreshold: 0.7
});
```

---

## Best Practices

1. **Anchor Creation**
   - Create anchors for high-quality, frequently accessed segments
   - Use appropriate quantization based on use case
   - Monitor compression ratios and quality scores

2. **Context Sharing**
   - Use appropriate privacy levels for each context
   - Set reasonable expiration times
   - Track reuse statistics to optimize sharing

3. **Federated Sync**
   - Monitor privacy budgets
   - Use quality-weighted aggregation for better results
   - Track cross-colony reuse rates

4. **Cache Operations**
   - Validate cache structures before operations
   - Use error handling appropriately
   - Consider memory implications of cache operations

5. **Performance**
   - Regular cleanup of old data
   - Appropriate similarity thresholds
   - Balance compression vs. quality

---

## License

MIT License - See LICENSE file for details

---

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

---

## Support

For issues, questions, or contributions, please visit:
- GitHub: https://github.com/SuperInstance/polln
- Documentation: docs/
- Examples: examples/
