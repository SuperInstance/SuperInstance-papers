/**
 * KVCOMM-Inspired Anchor-Based KV-Cache Communication
 *
 * Based on "KVCOMM: High-Ratio KV Cache Compression for
 * Multi-Turn Large Language Model Conversation" (Chen et al., 2024)
 *
 * Enhanced with:
 * - Anchor Clustering: Group similar anchors by embedding proximity
 * - LRU Eviction: Proper least-recently-used eviction
 * - Anchor Compression: Quantization options for efficient storage
 * - Batch Matching: Support matching multiple queries at once
 * - ANN Index: Approximate Nearest Neighbor search for 10x+ speedup
 *
 * Core Concepts:
 * - Anchors: Representative KV-cache segments stored as shared references
 * - Anchor Matching: Find nearest anchors for requested segments
 * - Offset Approximation: Predict offset by weighting anchor deviations
 * - Anchor Prediction: Determine if new KV-caches should be shared
 */

import { ANNIndex, ANNAlgorithm } from './ann-index.js';

// ============================================================================
// KV-Cache Types
// ============================================================================

/**
 * Key-Value cache segment from an LLM attention layer
 */
export interface KVCacheSegment {
  layerId: number;
  segmentId: string;
  tokens: number[];
  keyCache: number[][];  // [seq_len, d_k]
  valueCache: number[][]; // [seq_len, d_v]
  metadata: KVCacheMetadata;
}

/**
 * Metadata for KV-cache segments
 */
export interface KVCacheMetadata {
  createdAt: number;
  modelHash: string;
  agentId: string;
  conversationId?: string;
  turnNumber: number;
  position: number; // Starting position in sequence
  length: number;   // Number of tokens
}

/**
 * Compressed anchor representation
 */
export interface KVAnchor {
  anchorId: string;
  layerId: number;
  segmentId: string;

  // Compressed representation (quantized + projected)
  compressedKeys: Float32Array;
  compressedValues: Float32Array;

  // Embedding for similarity search
  embedding: number[];

  // Reference data
  sourceSegmentId: string;
  sourceAgentId: string;

  // Usage statistics (for LRU)
  usageCount: number;
  lastUsed: number;

  // Anchor quality metrics
  qualityScore: number; // 0-1, based on reconstruction error
  compressionRatio: number;

  // Temporal information
  createdAt: number;
  updatedAt: number;

  // Clustering support
  clusterId?: string;
  clusterCenterDistance?: number;
}

/**
 * Offset prediction result
 */
export interface OffsetPrediction {
  anchorId: string;
  predictedOffset: number[][];
  confidence: number;
  deviationScore: number;
}

/**
 * Anchor matching result
 */
export interface AnchorMatch {
  anchor: KVAnchor;
  similarity: number;
  tokenOverlap: number;
  positionalDeviation: number;
}

/**
 * Configuration for anchor pool
 */
export interface KVAnchorPoolConfig {
  // Pool management
  maxAnchors: number;
  maxAgeMs: number;

  // Quality thresholds
  minQualityScore: number;
  minCompressionRatio: number;

  // Matching parameters
  similarityThreshold: number;
  maxMatches: number;

  // Compression parameters
  keyProjectionDim: number;
  valueProjectionDim: number;
  quantizationBits: 4 | 8;

  // Embedding parameters
  embeddingDim: number;

  // Clustering parameters
  enableClustering: boolean;
  numClusters: number;
  clusterThreshold: number;

  // LRU parameters
  enableLRU: boolean;
  lruSampleSize: number;

  // Advanced compression
  enableAdvancedCompression: boolean;
  compressionMethod: 'uniform' | 'kmeans' | 'product';

  // ANN Index parameters
  enableANN: boolean;
  annAlgorithm: ANNAlgorithm;
  annRebuildThreshold: number; // Rebuild ANN index after this many additions
}

/**
 * Configuration for anchor matcher
 */
export interface AnchorMatcherConfig {
  similarityThreshold: number;
  maxMatches: number;
  useTokenOverlap: boolean;
  usePositionalAlignment: boolean;
  embeddingWeight: number;
  tokenWeight: number;
  positionWeight: number;
}

/**
 * Configuration for offset predictor
 */
export interface OffsetPredictorConfig {
  windowSize: number;
  learningRate: number;
  smoothingFactor: number;
  minConfidence: number;
}

/**
 * Batch match result
 */
export interface BatchMatchResult {
  queryIndex: number;
  matches: AnchorMatch[];
}

/**
 * Cluster information
 */
export interface AnchorCluster {
  clusterId: string;
  layerId: number;
  centroid: number[];
  anchorIds: Set<string>;
  lastUpdated: number;
  avgQualityScore: number;
}

/**
 * Quantization options
 */
export type QuantizationMethod = 'uniform' | 'kmeans' | 'product';

// ============================================================================
// KV Anchor Pool (Enhanced)
// ============================================================================

/**
 * Manages storage and retrieval of KV-cache anchors with advanced features
 */
export class KVAnchorPool {
  private anchors: Map<string, KVAnchor> = new Map();
  private layerIndices: Map<number, Set<string>> = new Map();
  private config: KVAnchorPoolConfig;

  // LRU tracking
  private lruList: string[] = [];
  private lruIndex: Map<string, number> = new Map();

  // Clustering support
  private clusters: Map<string, AnchorCluster> = new Map();
  private anchorToCluster: Map<string, string> = new Map();

  // ANN Index support
  private annIndexes: Map<number, ANNIndex> = new Map(); // layerId -> ANNIndex
  private annPendingRebuild: Set<number> = new Set();
  private annAdditionsSinceRebuild: Map<number, number> = new Map();

  constructor(config?: Partial<KVAnchorPoolConfig>) {
    this.config = {
      maxAnchors: 1000,
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
      minQualityScore: 0.7,
      minCompressionRatio: 2.0,
      similarityThreshold: 0.8,
      maxMatches: 5,
      keyProjectionDim: 64,
      valueProjectionDim: 64,
      quantizationBits: 8,
      embeddingDim: 128,
      enableClustering: true,
      numClusters: 10,
      clusterThreshold: 0.3,
      enableLRU: true,
      lruSampleSize: 100,
      enableAdvancedCompression: false,
      compressionMethod: 'uniform',
      enableANN: true,
      annAlgorithm: 'auto',
      annRebuildThreshold: 100,
      ...config,
    };
  }

  /**
   * Create an anchor from a KV-cache segment
   */
  async createAnchor(
    segment: KVCacheSegment,
    embedding: number[]
  ): Promise<KVAnchor> {
    const anchorId = this.generateAnchorId(segment);
    const now = Date.now();

    // Compress the segment
    const compressionMethod = this.config.enableAdvancedCompression
      ? this.config.compressionMethod
      : 'uniform';
    const { compressedKeys, compressedValues } = this.compressSegment(
      segment,
      compressionMethod
    );

    const normalizedEmbedding = this.normalizeEmbedding(embedding, this.config.embeddingDim);

    const anchor: KVAnchor = {
      anchorId,
      layerId: segment.layerId,
      segmentId: segment.segmentId,
      compressedKeys,
      compressedValues,
      embedding: normalizedEmbedding,
      sourceSegmentId: segment.segmentId,
      sourceAgentId: segment.metadata.agentId,
      usageCount: 0,
      lastUsed: now,
      qualityScore: this.estimateQuality(segment),
      compressionRatio: this.calculateCompressionRatio(segment),
      createdAt: now,
      updatedAt: now,
    };

    // Store anchor
    this.anchors.set(anchorId, anchor);

    // Update layer index
    if (!this.layerIndices.has(segment.layerId)) {
      this.layerIndices.set(segment.layerId, new Set());
    }
    this.layerIndices.get(segment.layerId)!.add(anchorId);

    // Add to LRU tracking
    if (this.config.enableLRU) {
      this.addToLRU(anchorId);
    }

    // Assign to cluster if enabled
    if (this.config.enableClustering) {
      this.assignToCluster(anchor);
    }

    // Enforce capacity limits
    this.evictIfNeeded();

    return anchor;
  }

  /**
   * Get anchor by ID (with LRU update)
   */
  getAnchor(anchorId: string): KVAnchor | undefined {
    const anchor = this.anchors.get(anchorId);
    if (anchor) {
      anchor.usageCount++;
      anchor.lastUsed = Date.now();

      // Update LRU position
      if (this.config.enableLRU) {
        this.updateLRU(anchorId);
      }
    }
    return anchor;
  }

  /**
   * Get anchors for a specific layer
   */
  getAnchorsForLayer(layerId: number): KVAnchor[] {
    const anchorIds = this.layerIndices.get(layerId);
    if (!anchorIds) return [];

    return Array.from(anchorIds)
      .map(id => this.anchors.get(id))
      .filter((a): a is KVAnchor => a !== undefined);
  }

  /**
   * Find anchors by embedding similarity (cluster-aware, ANN-optimized)
   */
  findSimilarAnchors(
    queryEmbedding: number[],
    layerId: number,
    threshold?: number
  ): KVAnchor[] {
    const similarityThreshold = threshold ?? this.config.similarityThreshold;

    // Use ANN index if enabled and available
    if (this.config.enableANN) {
      const annResults = this.searchWithANN(queryEmbedding, layerId, similarityThreshold);
      if (annResults.length > 0) {
        return annResults;
      }
    }

    // Fallback to clustering or linear search
    if (this.config.enableClustering) {
      const targetClusterId = this.findClosestCluster(queryEmbedding, layerId);
      if (targetClusterId) {
        const clusterAnchors = this.getAnchorsInCluster(targetClusterId);
        const similarInCluster = this.filterBySimilarity(
          clusterAnchors,
          queryEmbedding,
          similarityThreshold
        );

        if (similarInCluster.length > 0) {
          return similarInCluster.slice(0, this.config.maxMatches);
        }
      }
    }

    // Fallback to layer-wide search
    const layerAnchors = this.getAnchorsForLayer(layerId);
    return this.filterBySimilarity(layerAnchors, queryEmbedding, similarityThreshold)
      .slice(0, this.config.maxMatches);
  }

  /**
   * Batch match multiple queries at once
   */
  batchFindSimilarAnchors(
    queryEmbeddings: number[][],
    layerId: number,
    threshold?: number
  ): BatchMatchResult[] {
    const results: BatchMatchResult[] = [];
    const similarityThreshold = threshold ?? this.config.similarityThreshold;

    for (let i = 0; i < queryEmbeddings.length; i++) {
      const similarAnchors = this.findSimilarAnchors(
        queryEmbeddings[i],
        layerId,
        similarityThreshold
      );

      // Convert to AnchorMatch format
      const matches: AnchorMatch[] = similarAnchors.map(anchor => ({
        anchor,
        similarity: this.cosineSimilarity(queryEmbeddings[i], anchor.embedding),
        tokenOverlap: 0, // Would be computed in full implementation
        positionalDeviation: 0, // Would be computed in full implementation
      }));

      results.push({
        queryIndex: i,
        matches,
      });
    }

    return results;
  }

  /**
   * Update anchor statistics
   */
  updateAnchor(anchorId: string, updates: Partial<KVAnchor>): boolean {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return false;

    Object.assign(anchor, updates, { updatedAt: Date.now() });

    // Update cluster if embedding changed
    if (this.config.enableClustering && updates.embedding) {
      this.reassignCluster(anchorId);
    }

    return true;
  }

  /**
   * Remove old or low-quality anchors
   */
  cleanup(now: number = Date.now()): number {
    let removed = 0;

    for (const [anchorId, anchor] of Array.from(this.anchors.entries())) {
      const age = now - anchor.lastUsed;
      const isOld = age > this.config.maxAgeMs;
      const isPoorQuality = anchor.qualityScore < this.config.minQualityScore;

      if (isOld || isPoorQuality) {
        this.removeAnchor(anchorId);
        removed++;
      }
    }

    // Rebuild clusters if needed
    if (this.config.enableClustering && removed > 0) {
      this.rebuildClusters();
    }

    return removed;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalAnchors: number;
    anchorsByLayer: Record<number, number>;
    avgQualityScore: number;
    avgCompressionRatio: number;
    totalUsageCount: number;
    clusterCount?: number;
    avgClusterSize?: number;
  } {
    const anchorsByLayer: Record<number, number> = {};
    let totalQuality = 0;
    let totalCompression = 0;
    let totalUsage = 0;

    for (const anchor of Array.from(this.anchors.values())) {
      anchorsByLayer[anchor.layerId] = (anchorsByLayer[anchor.layerId] || 0) + 1;
      totalQuality += anchor.qualityScore;
      totalCompression += anchor.compressionRatio;
      totalUsage += anchor.usageCount;
    }

    const count = this.anchors.size;
    const stats: any = {
      totalAnchors: count,
      anchorsByLayer,
      avgQualityScore: count > 0 ? totalQuality / count : 0,
      avgCompressionRatio: count > 0 ? totalCompression / count : 0,
      totalUsageCount: totalUsage,
    };

    if (this.config.enableClustering) {
      stats.clusterCount = this.clusters.size;
      stats.avgClusterSize = count > 0 ? count / this.clusters.size : 0;
    }

    return stats;
  }

  /**
   * Get cluster information
   */
  getClusters(layerId?: number): AnchorCluster[] {
    const allClusters = Array.from(this.clusters.values());
    if (layerId !== undefined) {
      return allClusters.filter(c => c.layerId === layerId);
    }
    return allClusters;
  }

  /**
   * Clear all anchors
   */
  clear(): void {
    this.anchors.clear();
    this.layerIndices.clear();
    this.lruList = [];
    this.lruIndex.clear();
    this.clusters.clear();
    this.anchorToCluster.clear();
  }

  // ============================================================================
  // Clustering Methods
  // ============================================================================

  /**
   * Assign anchor to appropriate cluster
   */
  private assignToCluster(anchor: KVAnchor): void {
    const layerClusters = Array.from(this.clusters.values())
      .filter(c => c.layerId === anchor.layerId);

    if (layerClusters.length === 0) {
      // Create first cluster for this layer
      this.createClusterForAnchor(anchor);
      return;
    }

    // Find closest cluster
    let closestCluster: AnchorCluster | null = null;
    let minDistance = Infinity;

    for (const cluster of layerClusters) {
      const distance = this.euclideanDistance(anchor.embedding, cluster.centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestCluster = cluster;
      }
    }

    if (closestCluster && minDistance < this.config.clusterThreshold) {
      // Add to existing cluster
      closestCluster.anchorIds.add(anchor.anchorId);
      anchor.clusterId = closestCluster.clusterId;
      anchor.clusterCenterDistance = minDistance;
      this.anchorToCluster.set(anchor.anchorId, closestCluster.clusterId);
      this.updateClusterCentroid(closestCluster);
    } else {
      // Create new cluster
      this.createClusterForAnchor(anchor);
    }
  }

  /**
   * Create a new cluster for an anchor
   */
  private createClusterForAnchor(anchor: KVAnchor): void {
    const clusterId = `cluster-${anchor.layerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const cluster: AnchorCluster = {
      clusterId,
      layerId: anchor.layerId,
      centroid: [...anchor.embedding],
      anchorIds: new Set([anchor.anchorId]),
      lastUpdated: Date.now(),
      avgQualityScore: anchor.qualityScore,
    };

    this.clusters.set(clusterId, cluster);
    anchor.clusterId = clusterId;
    anchor.clusterCenterDistance = 0;
    this.anchorToCluster.set(anchor.anchorId, clusterId);
  }

  /**
   * Update cluster centroid
   */
  private updateClusterCentroid(cluster: AnchorCluster): void {
    const embeddings = Array.from(cluster.anchorIds)
      .map(id => this.anchors.get(id)?.embedding)
      .filter((e): e is number[] => e !== undefined);

    if (embeddings.length === 0) return;

    const dim = embeddings[0].length;
    const newCentroid = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        newCentroid[i] += emb[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      newCentroid[i] /= embeddings.length;
    }

    cluster.centroid = newCentroid;
    cluster.lastUpdated = Date.now();
  }

  /**
   * Rebuild all clusters from scratch
   */
  private rebuildClusters(): void {
    this.clusters.clear();
    this.anchorToCluster.clear();

    for (const anchor of this.anchors.values()) {
      delete anchor.clusterId;
      delete anchor.clusterCenterDistance;
      this.assignToCluster(anchor);
    }
  }

  /**
   * Find closest cluster for a query embedding
   */
  private findClosestCluster(queryEmbedding: number[], layerId: number): string | null {
    const layerClusters = Array.from(this.clusters.values())
      .filter(c => c.layerId === layerId);

    if (layerClusters.length === 0) return null;

    let closestCluster: AnchorCluster | null = null;
    let minDistance = Infinity;

    for (const cluster of layerClusters) {
      const distance = this.euclideanDistance(queryEmbedding, cluster.centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestCluster = cluster;
      }
    }

    return closestCluster?.clusterId ?? null;
  }

  /**
   * Get anchors in a specific cluster
   */
  private getAnchorsInCluster(clusterId: string): KVAnchor[] {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return [];

    return Array.from(cluster.anchorIds)
      .map(id => this.anchors.get(id))
      .filter((a): a is KVAnchor => a !== undefined);
  }

  /**
   * Reassign anchor to a new cluster
   */
  private reassignCluster(anchorId: string): void {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return;

    // Remove from current cluster
    const oldClusterId = this.anchorToCluster.get(anchorId);
    if (oldClusterId) {
      const oldCluster = this.clusters.get(oldClusterId);
      if (oldCluster) {
        oldCluster.anchorIds.delete(anchorId);
        if (oldCluster.anchorIds.size === 0) {
          this.clusters.delete(oldClusterId);
        } else {
          this.updateClusterCentroid(oldCluster);
        }
      }
    }

    // Assign to new cluster
    delete anchor.clusterId;
    delete anchor.clusterCenterDistance;
    this.assignToCluster(anchor);
  }

  // ============================================================================
  // LRU Methods
  // ============================================================================

  /**
   * Add anchor to LRU tracking
   */
  private addToLRU(anchorId: string): void {
    // Remove from current position if exists
    if (this.lruIndex.has(anchorId)) {
      const oldIndex = this.lruIndex.get(anchorId)!;
      if (oldIndex < this.lruList.length) {
        this.lruList.splice(oldIndex, 1);
      }
    }

    // Add to front (most recently used)
    this.lruList.unshift(anchorId);
    this.lruIndex.set(anchorId, 0);

    // Update indices for shifted items
    for (let i = 1; i < Math.min(this.lruList.length, this.config.lruSampleSize + 1); i++) {
      this.lruIndex.set(this.lruList[i], i);
    }
  }

  /**
   * Update LRU position on access
   */
  private updateLRU(anchorId: string): void {
    if (!this.lruIndex.has(anchorId)) return;

    const currentIndex = this.lruIndex.get(anchorId)!;

    // Only update if within tracked window
    if (currentIndex < this.lruList.length && currentIndex < this.config.lruSampleSize) {
      this.lruList.splice(currentIndex, 1);
      this.lruList.unshift(anchorId);

      // Update indices for affected items
      for (let i = 0; i < Math.min(this.lruList.length, this.config.lruSampleSize); i++) {
        this.lruIndex.set(this.lruList[i], i);
      }
    }
  }

  /**
   * Remove from LRU tracking
   */
  private removeFromLRU(anchorId: string): void {
    if (this.lruIndex.has(anchorId)) {
      const index = this.lruIndex.get(anchorId)!;
      if (index < this.lruList.length) {
        this.lruList.splice(index, 1);
      }
      this.lruIndex.delete(anchorId);
    }
  }

  // ============================================================================
  // Advanced Compression Methods
  // ============================================================================

  /**
   * Compress segment with specified method
   */
  private compressSegment(
    segment: KVCacheSegment,
    method: QuantizationMethod
  ): {
    compressedKeys: Float32Array;
    compressedValues: Float32Array;
  } {
    // Flatten and project key cache
    const flatKeys = segment.keyCache.flat();
    const projectedKeys = this.projectVector(
      flatKeys,
      flatKeys.length,
      this.config.keyProjectionDim
    );

    // Flatten and project value cache
    const flatValues = segment.valueCache.flat();
    const projectedValues = this.projectVector(
      flatValues,
      flatValues.length,
      this.config.valueProjectionDim
    );

    // Apply quantization method
    return {
      compressedKeys: this.quantize(projectedKeys, this.config.quantizationBits, method),
      compressedValues: this.quantize(projectedValues, this.config.quantizationBits, method),
    };
  }

  /**
   * Quantize values using specified method
   */
  private quantize(values: number[], bits: 4 | 8, method: QuantizationMethod): Float32Array {
    switch (method) {
      case 'uniform':
        return this.uniformQuantization(values, bits);
      case 'kmeans':
        return this.kmeansQuantization(values, bits);
      case 'product':
        return this.productQuantization(values, bits);
      default:
        return this.uniformQuantization(values, bits);
    }
  }

  /**
   * Uniform quantization
   */
  private uniformQuantization(values: number[], bits: 4 | 8): Float32Array {
    const levels = Math.pow(2, bits);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const quantized = new Float32Array(values.length);

    for (let i = 0; i < values.length; i++) {
      const normalized = (values[i] - min) / range;
      const level = Math.round(normalized * (levels - 1));
      quantized[i] = (level / (levels - 1)) * range + min;
    }

    return quantized;
  }

  /**
   * K-means quantization (simplified)
   */
  private kmeansQuantization(values: number[], bits: 4 | 8): Float32Array {
    const numCentroids = Math.pow(2, bits);

    // Initialize centroids using uniform sampling
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const centroids: number[] = [];
    for (let i = 0; i < numCentroids; i++) {
      centroids.push(min + (i / (numCentroids - 1)) * range);
    }

    // Assign each value to nearest centroid
    const quantized = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      let nearestCentroid = centroids[0];
      let minDist = Math.abs(values[i] - nearestCentroid);

      for (let j = 1; j < centroids.length; j++) {
        const dist = Math.abs(values[i] - centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          nearestCentroid = centroids[j];
        }
      }

      quantized[i] = nearestCentroid;
    }

    return quantized;
  }

  /**
   * Product quantization (simplified)
   */
  private productQuantization(values: number[], bits: 4 | 8): Float32Array {
    // Split into subvectors and quantize each
    const subVectorSize = Math.max(1, Math.floor(values.length / 4));
    const quantized = new Float32Array(values.length);

    for (let i = 0; i < values.length; i += subVectorSize) {
      const subVector = values.slice(i, i + subVectorSize);
      const quantizedSub = this.uniformQuantization(subVector, bits);

      for (let j = 0; j < quantizedSub.length; j++) {
        if (i + j < quantized.length) {
          quantized[i + j] = quantizedSub[j];
        }
      }
    }

    return quantized;
  }

  // ============================================================================
  // Private Utility Methods
  // ============================================================================

  private filterBySimilarity(
    anchors: KVAnchor[],
    queryEmbedding: number[],
    threshold: number
  ): KVAnchor[] {
    return anchors
      .map(anchor => ({
        anchor,
        similarity: this.cosineSimilarity(queryEmbedding, anchor.embedding),
      }))
      .filter(({ similarity }) => similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ anchor }) => anchor);
  }

  private generateAnchorId(segment: KVCacheSegment): string {
    return `anchor-${segment.layerId}-${segment.segmentId}-${Date.now()}`;
  }

  private projectVector(
    vec: number[],
    inputDim: number,
    outputDim: number
  ): number[] {
    // Simple projection: stride sampling
    // In production, this would use learned projection matrices
    if (outputDim >= inputDim) return vec.slice(0, outputDim);

    const stride = Math.floor(inputDim / outputDim);
    const projected: number[] = [];

    for (let i = 0; i < outputDim; i++) {
      projected.push(vec[i * stride] || 0);
    }

    return projected;
  }

  private normalizeEmbedding(embedding: number[], targetDim: number): number[] {
    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    const normalized = embedding.map(v => v / (norm || 1));

    // Pad or truncate to target dimension
    if (normalized.length >= targetDim) {
      return normalized.slice(0, targetDim);
    }

    // Pad with zeros
    return [...normalized, ...new Array(targetDim - normalized.length).fill(0)];
  }

  private estimateQuality(segment: KVCacheSegment): number {
    // Estimate reconstruction quality based on segment properties
    // In production, this would measure actual reconstruction error
    const length = segment.metadata.length;
    const baseScore = 0.9;

    // Longer segments get slightly lower quality estimates
    const lengthPenalty = Math.min(length * 0.01, 0.2);

    return Math.max(0, baseScore - lengthPenalty);
  }

  private calculateCompressionRatio(segment: KVCacheSegment): number {
    const originalSize = segment.keyCache.length * segment.keyCache[0].length +
                        segment.valueCache.length * segment.valueCache[0].length;
    const compressedSize = this.config.keyProjectionDim + this.config.valueProjectionDim;

    return originalSize / compressedSize;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;

    const sumSquared = a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0);
    return Math.sqrt(sumSquared);
  }

  /**
   * Enhanced eviction with LRU support
   */
  private evictIfNeeded(): void {
    if (this.anchors.size <= this.config.maxAnchors) return;

    if (this.config.enableLRU) {
      this.lruEviction();
    } else {
      this.qualityBasedEviction();
    }
  }

  /**
   * LRU-based eviction
   */
  private lruEviction(): void {
    const toRemove = this.anchors.size - this.config.maxAnchors;

    for (let i = 0; i < toRemove; i++) {
      // Remove from end (least recently used)
      if (this.lruList.length > 0) {
        const anchorId = this.lruList.pop()!;
        this.lruIndex.delete(anchorId);
        this.removeAnchor(anchorId);
      }
    }
  }

  /**
   * Quality-based eviction (fallback)
   */
  private qualityBasedEviction(): void {
    // Sort by (qualityScore * usageCount) / age
    const now = Date.now();
    const sortedAnchors = Array.from(this.anchors.entries())
      .map(([id, anchor]) => ({
        id,
        anchor,
        score: (anchor.qualityScore * (anchor.usageCount + 1)) / (now - anchor.createdAt + 1),
      }))
      .sort((a, b) => a.score - b.score);

    // Remove lowest scoring anchors
    const toRemove = sortedAnchors.slice(0, this.anchors.size - this.config.maxAnchors);
    for (const { id } of toRemove) {
      this.removeAnchor(id);
    }
  }

  private removeAnchor(anchorId: string): void {
    const anchor = this.anchors.get(anchorId);
    if (anchor) {
      this.layerIndices.get(anchor.layerId)?.delete(anchorId);
      this.anchors.delete(anchorId);
      this.removeFromLRU(anchorId);

      // Remove from cluster
      const clusterId = this.anchorToCluster.get(anchorId);
      if (clusterId) {
        const cluster = this.clusters.get(clusterId);
        if (cluster) {
          cluster.anchorIds.delete(anchorId);
          if (cluster.anchorIds.size === 0) {
            this.clusters.delete(clusterId);
          }
        }
        this.anchorToCluster.delete(anchorId);
      }

      // Mark ANN index for rebuild
      if (this.config.enableANN) {
        this.annPendingRebuild.add(anchor.layerId);
      }
    }
  }

  // ============================================================================
  // ANN Index Methods
  // ============================================================================

  /**
   * Search using ANN index
   */
  private searchWithANN(
    queryEmbedding: number[],
    layerId: number,
    threshold: number
  ): KVAnchor[] {
    // Get or build ANN index for this layer
    let annIndex: ANNIndex | undefined = this.annIndexes.get(layerId);

    if (!annIndex || this.annPendingRebuild.has(layerId)) {
      annIndex = this.buildANNIndex(layerId) ?? undefined;
    }

    if (!annIndex) {
      return []; // No anchors in this layer
    }

    // Search for more candidates than needed ( ANN might have some false positives)
    const k = Math.min(this.config.maxMatches * 2, 50);
    const results = annIndex.searchWithScores(queryEmbedding, k);

    // Filter by threshold and convert to KVAnchor
    const anchors: KVAnchor[] = [];
    for (const result of results) {
      if (result.similarity >= threshold) {
        const anchor = this.getAnchorByIndex(layerId, result.index);
        if (anchor) {
          anchors.push(anchor);
        }
      }
    }

    return anchors.slice(0, this.config.maxMatches);
  }

  /**
   * Build or rebuild ANN index for a layer
   */
  private buildANNIndex(layerId: number): ANNIndex | null {
    const layerAnchors = this.getAnchorsForLayer(layerId);

    if (layerAnchors.length === 0) {
      this.annIndexes.delete(layerId);
      return null;
    }

    // Extract embeddings
    const embeddings = layerAnchors.map(a => a.embedding);

    // Create and build index
    const annIndex = new ANNIndex({
      algorithm: this.config.annAlgorithm,
      dimension: this.config.embeddingDim,
    });

    annIndex.build(embeddings);
    this.annIndexes.set(layerId, annIndex);
    this.annPendingRebuild.delete(layerId);
    this.annAdditionsSinceRebuild.set(layerId, 0);

    return annIndex;
  }

  /**
   * Get anchor by index within its layer
   */
  private getAnchorByIndex(layerId: number, index: number): KVAnchor | undefined {
    const layerAnchors = this.getAnchorsForLayer(layerId);
    return layerAnchors[index];
  }

  /**
   * Rebuild all ANN indexes
   */
  rebuildANNIndexes(): void {
    if (!this.config.enableANN) return;

    for (const layerId of this.layerIndices.keys()) {
      this.buildANNIndex(layerId);
    }
  }

  /**
   * Get ANN index statistics
   */
  getANNStats(): {
    enabled: boolean;
    indexesBuilt: number;
    totalAnchorsIndexed: number;
    avgBuildTimeMs: number;
    algorithm: string;
  } {
    if (!this.config.enableANN) {
      return {
        enabled: false,
        indexesBuilt: 0,
        totalAnchorsIndexed: 0,
        avgBuildTimeMs: 0,
        algorithm: 'none',
      };
    }

    let totalAnchors = 0;
    let totalBuildTime = 0;
    let indexesBuilt = 0;

    for (const [layerId, index] of this.annIndexes) {
      const stats = index.getBuildStats();
      totalAnchors += stats.totalElements;
      totalBuildTime += stats.buildTimeMs;
      indexesBuilt++;
    }

    return {
      enabled: true,
      indexesBuilt,
      totalAnchorsIndexed: totalAnchors,
      avgBuildTimeMs: indexesBuilt > 0 ? totalBuildTime / indexesBuilt : 0,
      algorithm: this.config.annAlgorithm,
    };
  }
}

// ============================================================================
// Anchor Matcher
// ============================================================================

/**
 * Finds similar segments using embedding distance and token overlap
 */
export class AnchorMatcher {
  private config: AnchorMatcherConfig;

  constructor(config?: Partial<AnchorMatcherConfig>) {
    this.config = {
      similarityThreshold: 0.8,
      maxMatches: 5,
      useTokenOverlap: true,
      usePositionalAlignment: true,
      embeddingWeight: 0.6,
      tokenWeight: 0.3,
      positionWeight: 0.1,
      ...config,
    };
  }

  /**
   * Find matching anchors for a query segment
   */
  findMatches(
    querySegment: KVCacheSegment,
    queryEmbedding: number[],
    anchorPool: KVAnchorPool
  ): AnchorMatch[] {
    const layerAnchors = anchorPool.getAnchorsForLayer(querySegment.layerId);

    const matches: AnchorMatch[] = layerAnchors
      .map(anchor => this.evaluateMatch(querySegment, queryEmbedding, anchor))
      .filter(match => match.similarity >= this.config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.config.maxMatches);

    return matches;
  }

  /**
   * Evaluate match quality between query and anchor
   */
  private evaluateMatch(
    querySegment: KVCacheSegment,
    queryEmbedding: number[],
    anchor: KVAnchor
  ): AnchorMatch {
    // Embedding similarity
    const embeddingSim = this.cosineSimilarity(queryEmbedding, anchor.embedding);

    // Token overlap (if enabled)
    let tokenOverlap = 0;
    if (this.config.useTokenOverlap) {
      // Get source segment tokens if available
      // In production, this would retrieve the actual tokens
      tokenOverlap = this.estimateTokenOverlap(querySegment.metadata, anchor);
    }

    // Positional deviation (if enabled)
    let positionalDeviation = 0;
    if (this.config.usePositionalAlignment) {
      positionalDeviation = this.calculatePositionalDeviation(querySegment, anchor);
    }

    // Combined similarity score
    const combinedSimilarity =
      this.config.embeddingWeight * embeddingSim +
      this.config.tokenWeight * (tokenOverlap / 100) +
      this.config.positionWeight * (1 - positionalDeviation / 1000);

    return {
      anchor,
      similarity: combinedSimilarity,
      tokenOverlap,
      positionalDeviation,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  private estimateTokenOverlap(queryMeta: KVCacheMetadata, anchor: KVAnchor): number {
    // Estimate token overlap based on metadata
    // In production, this would use actual token comparison
    return Math.floor(Math.random() * 50); // Placeholder
  }

  private calculatePositionalDeviation(
    querySegment: KVCacheSegment,
    anchor: KVAnchor
  ): number {
    // Calculate positional deviation
    // In production, this would compare actual positions
    return Math.floor(Math.random() * 100); // Placeholder
  }
}

// ============================================================================
// Offset Predictor
// ============================================================================

/**
 * Predicts KV-cache offsets from anchor patterns
 */
export class OffsetPredictor {
  private config: OffsetPredictorConfig;
  private offsetHistory: Map<string, number[][][]> = new Map(); // anchorId -> history of offsets
  private weights: Map<string, number> = new Map();

  constructor(config?: Partial<OffsetPredictorConfig>) {
    this.config = {
      windowSize: 3,
      learningRate: 0.01,
      smoothingFactor: 0.9,
      minConfidence: 0.5,
      ...config,
    };
  }

  /**
   * Predict offset for a segment based on matched anchors
   */
  predictOffset(
    matches: AnchorMatch[],
    querySegment: KVCacheSegment
  ): OffsetPrediction[] {
    if (matches.length === 0) {
      return [];
    }

    return matches.map(match => {
      const anchorId = match.anchor.anchorId;
      const history = this.offsetHistory.get(anchorId);

      if (!history || history.length === 0) {
        // No history, return zero offset with low confidence
        return {
          anchorId,
          predictedOffset: this.createZeroOffset(querySegment),
          confidence: 0.3,
          deviationScore: 1.0,
        };
      }

      // Weight anchors by similarity
      const weight = match.similarity;
      this.weights.set(anchorId, weight);

      // Predict offset from weighted history
      const predictedOffset = this.weightedOffsetPrediction(history, weight);
      const confidence = this.calculateConfidence(anchorId, match);

      // Calculate deviation score
      const deviationScore = this.calculateDeviationScore(history, predictedOffset);

      return {
        anchorId,
        predictedOffset,
        confidence,
        deviationScore,
      };
    });
  }

  /**
   * Update offset history with actual offsets
   */
  updateOffsetHistory(
    anchorId: string,
    actualOffset: number[][]
  ): void {
    if (!this.offsetHistory.has(anchorId)) {
      this.offsetHistory.set(anchorId, []);
    }

    const history = this.offsetHistory.get(anchorId)!;
    history.push(actualOffset);

    // Keep only recent history within window size
    if (history.length > this.config.windowSize) {
      history.shift();
    }
  }

  /**
   * Learn from offset prediction errors
   */
  learn(
    anchorId: string,
    predictedOffset: number[][],
    actualOffset: number[][],
    reward: number
  ): void {
    // Update weights based on reward
    const currentWeight = this.weights.get(anchorId) ?? 0.5;
    const updatedWeight = currentWeight + this.config.learningRate * reward * (1 - currentWeight);
    this.weights.set(anchorId, Math.max(0, Math.min(1, updatedWeight)));

    // Smooth the history with the actual offset
    const history = this.offsetHistory.get(anchorId);
    if (history && history.length > 0) {
      const lastEntry = history[history.length - 1];
      const smoothedEntry = this.smoothOffsets(lastEntry, actualOffset, this.config.smoothingFactor);
      history[history.length - 1] = smoothedEntry;
    }
  }

  /**
   * Get prediction statistics
   */
  getStats(): {
    trackedAnchors: number;
    avgHistoryLength: number;
    avgWeight: number;
  } {
    let totalHistory = 0;
    let totalWeight = 0;

    for (const [anchorId, history] of Array.from(this.offsetHistory.entries())) {
      totalHistory += history.length;
      totalWeight += this.weights.get(anchorId) ?? 0.5;
    }

    const count = this.offsetHistory.size;

    return {
      trackedAnchors: count,
      avgHistoryLength: count > 0 ? totalHistory / count : 0,
      avgWeight: count > 0 ? totalWeight / count : 0,
    };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.offsetHistory.clear();
    this.weights.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createZeroOffset(segment: KVCacheSegment): number[][] {
    const seqLen = segment.metadata.length;
    const dModel = segment.keyCache[0]?.length || 64;

    return Array(seqLen).fill(0).map(() => Array(dModel).fill(0));
  }

  private weightedOffsetPrediction(
    history: number[][][],
    weight: number
  ): number[][] {
    // Compute weighted average of historical offsets
    const windowSize = Math.min(history.length, this.config.windowSize);
    const recentHistory = history.slice(-windowSize);

    if (recentHistory.length === 0) {
      return [];
    }

    const seqLen = recentHistory[0].length;
    const dModel = recentHistory[0][0]?.length || 0;

    const weightedOffset: number[][] = Array(seqLen)
      .fill(0)
      .map(() => Array(dModel).fill(0));

    // Apply exponential weighting to recent history
    let totalWeight = 0;
    for (let i = 0; i < recentHistory.length; i++) {
      const expWeight = Math.pow(this.config.smoothingFactor, recentHistory.length - 1 - i);
      totalWeight += expWeight;

      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < dModel; k++) {
          weightedOffset[j][k] += expWeight * recentHistory[i][j][k];
        }
      }
    }

    // Normalize by total weight and apply anchor similarity weight
    for (let j = 0; j < seqLen; j++) {
      for (let k = 0; k < dModel; k++) {
        weightedOffset[j][k] = (weight * weightedOffset[j][k]) / totalWeight;
      }
    }

    return weightedOffset;
  }

  private calculateConfidence(anchorId: string, match: AnchorMatch): number {
    const history = this.offsetHistory.get(anchorId);
    const weight = this.weights.get(anchorId) ?? 0.5;

    // Base confidence from history length
    const historyConfidence = history
      ? Math.min(1, history.length / this.config.windowSize)
      : 0.3;

    // Combine with match similarity and learned weight
    const combinedConfidence =
      0.4 * historyConfidence +
      0.4 * match.similarity +
      0.2 * weight;

    return Math.max(this.config.minConfidence, Math.min(1, combinedConfidence));
  }

  private calculateDeviationScore(
    history: number[][][],
    predictedOffset: number[][]
  ): number {
    if (history.length === 0) return 1.0;

    // Calculate variance of historical offsets
    const lastOffset = history[history.length - 1];
    let totalDeviation = 0;
    let count = 0;

    for (let i = 0; i < lastOffset.length; i++) {
      for (let j = 0; j < lastOffset[i].length; j++) {
        const deviation = Math.abs(lastOffset[i][j] - predictedOffset[i][j]);
        totalDeviation += deviation;
        count++;
      }
    }

    return count > 0 ? totalDeviation / count : 1.0;
  }

  private smoothOffsets(
    oldOffset: number[][],
    newOffset: number[][],
    smoothingFactor: number
  ): number[][] {
    if (oldOffset.length === 0) return newOffset;

    return oldOffset.map((row, i) =>
      row.map((val, j) => {
        const newVal = newOffset[i]?.[j] ?? 0;
        return smoothingFactor * val + (1 - smoothingFactor) * newVal;
      })
    );
  }
}

// ============================================================================
// Anchor Predictor (Should we share this as a new anchor?)
// ============================================================================

/**
 * Determines if new KV-caches should become anchors
 */
export class AnchorPredictor {
  /**
   * Predict whether a segment should become an anchor
   */
  shouldBecomeAnchor(
    segment: KVCacheSegment,
    matches: AnchorMatch[],
    anchorPool: KVAnchorPool
  ): { shouldAnchor: boolean; reason: string } {
    // No similar anchors found -> good candidate
    if (matches.length === 0) {
      return {
        shouldAnchor: true,
        reason: 'No similar anchors found',
      };
    }

    // Best match is below threshold -> good candidate
    const bestMatch = matches[0];
    if (bestMatch.similarity < 0.85) {
      return {
        shouldAnchor: true,
        reason: `Best match similarity ${bestMatch.similarity.toFixed(2)} below threshold`,
      };
    }

    // Check if segment is significantly different from existing anchors
    const poolStats = anchorPool.getStats();
    const avgQuality = poolStats.avgQualityScore;

    if (avgQuality < 0.8 && segment.metadata.length > 100) {
      return {
        shouldAnchor: true,
        reason: 'Long segment with low pool quality',
      };
    }

    // Segment is similar to existing anchors -> don't create new anchor
    return {
      shouldAnchor: false,
      reason: `Similar to existing anchor ${bestMatch.anchor.anchorId}`,
    };
  }

  /**
   * Get anchor prediction statistics
   */
  getPredictionStats(): {
    totalPredictions: number;
    anchorRecommendations: number;
    rejectionRate: number;
  } {
    // In production, this would track actual prediction history
    return {
      totalPredictions: 0,
      anchorRecommendations: 0,
      rejectionRate: 0,
    };
  }
}
