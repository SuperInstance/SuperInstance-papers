/**
 * Approximate Nearest Neighbor (ANN) Index for KV-Anchor Matching
 *
 * Implements multiple ANN algorithms for efficient similarity search:
 * - HNSW (Hierarchical Navigable Small World): Graph-based approach for high-dimensional data
 * - LSH (Locality Sensitive Hashing): Hash-based approach for very large datasets
 * - Ball Tree: Tree-based approach for low-dimensional data
 *
 * Performance targets:
 * - 10x+ speedup over linear search for large pools (>1000 anchors)
 * - >90% recall rate for top-k results
 * - Sub-millisecond query times for typical workloads
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ANNAlgorithm = 'hnsw' | 'lsh' | 'balltree' | 'auto';

export interface ANNIndexConfig {
  algorithm: ANNAlgorithm;
  dimension: number;

  // HNSW parameters
  hnsw?: {
    M: number;              // Max connections per node (default: 16)
    efConstruction: number; // Size of candidate list during construction (default: 200)
    efSearch: number;       // Size of candidate list during search (default: 50)
  };

  // LSH parameters
  lsh?: {
    numTables: number;      // Number of hash tables (default: 10)
    hashSize: number;       // Number of hash functions per table (default: 10)
    width: number;          // Bucket width (default: 4.0)
  };

  // Ball Tree parameters
  balltree?: {
    leafSize: number;       // Max points per leaf (default: 40)
    metric: 'euclidean' | 'manhattan' | 'cosine';
  };

  // General parameters
  maxElements?: number;
  enablePrefetch?: boolean;
}

export interface SearchResult {
  index: number;
  distance: number;
  similarity: number;
}

export interface BuildStats {
  algorithm: string;
  buildTimeMs: number;
  totalElements: number;
  indexSizeBytes: number;
  avgConnectivity?: number;
  hashTables?: number;
  treeDepth?: number;
}

export interface SearchStats {
  queryTimeMs: number;
  nodesVisited: number;
  distanceComputations: number;
  earlyTerminations: number;
}

// ============================================================================
// Distance Metrics
// ============================================================================

class DistanceMetrics {
  /**
   * Euclidean distance (L2)
   */
  static euclidean(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Manhattan distance (L1)
   */
  static manhattan(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  /**
   * Cosine similarity (1 - cosine distance)
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Cosine distance (1 - cosine similarity)
   */
  static cosineDistance(a: number[], b: number[]): number {
    return 1 - this.cosineSimilarity(a, b);
  }
}

// ============================================================================
// HNSW (Hierarchical Navigable Small World) Implementation
// ============================================================================

interface HNSWNode {
  index: number;
  vector: number[];
  connections: number[][]; // connections[level] = [neighbor_indices]
  level: number;
}

interface HNSWLayer {
  nodes: Map<number, HNSWNode>;
}

class HNSWIndex {
  private config: ANNIndexConfig;
  private vectors: number[][] = [];
  private layers: HNSWLayer[] = [];
  private entryPoint: number | null = null;
  private maxLevel: number = 0;
  private ml: number; // Normalization factor for level generation
  private distanceComputations: number = 0;
  private nodesVisited: number = 0;
  private earlyTerminations: number = 0;

  // HNSW parameters
  private M: number;
  private MMax0: number;
  private efConstruction: number;
  private efSearch: number;

  constructor(config: ANNIndexConfig) {
    this.config = config;
    this.M = config.hnsw?.M ?? 16;
    this.MMax0 = this.M * 2; // More connections at level 0
    this.efConstruction = config.hnsw?.efConstruction ?? 200;
    this.efSearch = config.hnsw?.efSearch ?? 50;
    this.ml = 1 / Math.log(this.M);

    // Initialize layer 0
    this.layers.push({ nodes: new Map() });
  }

  /**
   * Build HNSW index from vectors
   */
  build(vectors: number[][]): void {
    this.vectors = vectors;
    this.layers = [{ nodes: new Map() }];
    this.entryPoint = null;
    this.maxLevel = 0;
    this.distanceComputations = 0;
    this.nodesVisited = 0;

    for (let i = 0; i < vectors.length; i++) {
      this.insert(i, vectors[i]);
    }
  }

  /**
   * Insert a vector into the index
   */
  insert(index: number, vector: number[]): void {
    // Determine level for this node
    const level = this.getRandomLevel();
    const node: HNSWNode = {
      index,
      vector,
      connections: [],
      level,
    };

    // Add node to appropriate layers
    for (let l = 0; l <= level; l++) {
      if (l >= this.layers.length) {
        this.layers.push({ nodes: new Map() });
      }
      this.layers[l].nodes.set(index, node);
    }

    if (this.entryPoint === null || level > this.maxLevel) {
      this.entryPoint = index;
      this.maxLevel = level;
    }

    // Find entry point and search
    let currObj = this.entryPoint!;

    // Search from top level down to level 1
    for (let l = this.maxLevel; l > Math.min(level, this.maxLevel); l--) {
      currObj = this.searchLayer(currObj, vector, l, 1)[0];
    }

    // Search and connect at each level
    for (let l = Math.min(level, this.maxLevel); l >= 0; l--) {
      const M_l = l === 0 ? this.MMax0 : this.M;
      const candidates = this.searchLayer(currObj, vector, l, this.efConstruction);
      const neighbors = this.selectNeighbors(candidates, vector, M_l);

      // Add mutual connections
      for (const neighbor of neighbors) {
        const neighborNode = this.layers[l].nodes.get(neighbor);
        if (neighborNode) {
          if (!neighborNode.connections[l]) {
            neighborNode.connections[l] = [];
          }

          if (neighborNode.connections[l].length < M_l) {
            neighborNode.connections[l].push(index);
          } else {
            // Replace weaker connection
            this.replaceWeakerConnection(neighborNode, l, index, vector);
          }
        }
      }

      // Update node connections
      node.connections[l] = neighbors;
      currObj = candidates[0];
    }
  }

  /**
   * Search for k nearest neighbors
   */
  search(query: number[], k: number): SearchResult[] {
    if (this.entryPoint === null) return [];

    this.distanceComputations = 0;
    this.nodesVisited = 0;
    this.earlyTerminations = 0;

    let minDist = Infinity;
    let nearest = this.entryPoint;

    // Search from top level down
    for (let l = this.maxLevel; l > 0; l--) {
      const candidates = this.searchLayer(nearest, query, l, 1);
      if (candidates.length > 0) {
        nearest = candidates[0];
      }
    }

    // Search at level 0 with efSearch candidates
    const candidates = this.searchLayer(nearest, query, 0, this.efSearch);

    // Return top k results
    return candidates.slice(0, k).map(idx => {
      const distance = DistanceMetrics.euclidean(query, this.vectors[idx]);
      return {
        index: idx,
        distance,
        similarity: 1 / (1 + distance),
      };
    });
  }

  /**
   * Add a new vector to the index
   */
  add(vector: number[]): void {
    const index = this.vectors.length;
    this.vectors.push(vector);
    this.insert(index, vector);
  }

  /**
   * Remove a vector from the index
   */
  remove(index: number): void {
    // Mark as deleted (lazy deletion)
    for (const layer of this.layers) {
      const node = layer.nodes.get(index);
      if (node) {
        // Remove from neighbors' connection lists
        for (let l = 0; l < node.connections.length; l++) {
          for (const neighbor of node.connections[l] || []) {
            const neighborNode = layer.nodes.get(neighbor);
            if (neighborNode && neighborNode.connections[l]) {
              neighborNode.connections[l] = neighborNode.connections[l].filter(
                i => i !== index
              );
            }
          }
        }
        layer.nodes.delete(index);
      }
    }

    if (this.entryPoint === index) {
      // Find new entry point
      this.entryPoint = this.layers[this.maxLevel].nodes.keys().next().value || null;
    }
  }

  /**
   * Search at a specific layer
   */
  private searchLayer(
    entry: number,
    query: number[],
    layerLevel: number,
    ef: number
  ): number[] {
    const visited = new Set<number>([entry]);
    const candidates: { index: number; distance: number }[] = [];
    const w: { index: number; distance: number }[] = [];

    const entryDist = DistanceMetrics.euclidean(query, this.vectors[entry]);
    this.distanceComputations++;
    candidates.push({ index: entry, distance: entryDist });
    w.push({ index: entry, distance: entryDist });

    while (candidates.length > 0) {
      // Get closest candidate
      candidates.sort((a, b) => a.distance - b.distance);
      const current = candidates.shift()!;

      // Check if we can improve
      const bestDistance = w.length > 0 ? w[w.length - 1]?.distance : Infinity;
      if (current.distance > bestDistance) {
        this.earlyTerminations++;
        break;
      }

      const node = this.layers[layerLevel].nodes.get(current.index);
      if (!node) continue;

      this.nodesVisited++;

      // Check neighbors
      for (const neighbor of node.connections[layerLevel] || []) {
        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        const neighborDist = DistanceMetrics.euclidean(query, this.vectors[neighbor]);
        this.distanceComputations++;

        if (w.length < ef || neighborDist < w[w.length - 1].distance) {
          candidates.push({ index: neighbor, distance: neighborDist });
          w.push({ index: neighbor, distance: neighborDist });

          if (w.length > ef) {
            w.sort((a, b) => a.distance - b.distance);
            w.pop();
          }
        }
      }
    }

    return w.map(w => w.index).sort((a, b) => {
      const distA = DistanceMetrics.euclidean(query, this.vectors[a]);
      const distB = DistanceMetrics.euclidean(query, this.vectors[b]);
      return distA - distB;
    });
  }

  /**
   * Select best neighbors for a node
   */
  private selectNeighbors(
    candidates: number[],
    query: number[],
    M: number
  ): number[] {
    if (candidates.length <= M) return candidates;

    const scored = candidates.map(c => ({
      index: c,
      distance: DistanceMetrics.euclidean(query, this.vectors[c]),
    }));

    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, M).map(s => s.index);
  }

  /**
   * Replace weaker connection with stronger one
   */
  private replaceWeakerConnection(
    node: HNSWNode,
    level: number,
    newNeighbor: number,
    query: number[]
  ): void {
    if (!node.connections[level]) return;

    const connections = node.connections[level];
    let maxDist = -1;
    let maxIdx = -1;

    for (let i = 0; i < connections.length; i++) {
      const dist = DistanceMetrics.euclidean(query, this.vectors[connections[i]]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    const newDist = DistanceMetrics.euclidean(query, this.vectors[newNeighbor]);
    if (newDist < maxDist) {
      connections[maxIdx] = newNeighbor;
    }
  }

  /**
   * Get random level for new node
   */
  private getRandomLevel(): number {
    const level = -Math.floor(Math.log(Math.random()) * this.ml);
    return Math.max(0, Math.min(level, this.maxLevel + 1));
  }

  /**
   * Get search statistics
   */
  getSearchStats(): SearchStats {
    return {
      queryTimeMs: 0, // Set by caller
      nodesVisited: this.nodesVisited,
      distanceComputations: this.distanceComputations,
      earlyTerminations: this.earlyTerminations,
    };
  }

  /**
   * Get build statistics
   */
  getBuildStats(): BuildStats {
    let totalConnections = 0;
    let nodeCount = 0;

    for (const layer of this.layers) {
      for (const node of layer.nodes.values()) {
        nodeCount++;
        for (const conns of node.connections) {
          totalConnections += conns?.length || 0;
        }
      }
    }

    return {
      algorithm: 'HNSW',
      buildTimeMs: 0, // Set by caller
      totalElements: this.vectors.length,
      indexSizeBytes: this.estimateIndexSize(),
      avgConnectivity: nodeCount > 0 ? totalConnections / nodeCount : 0,
    };
  }

  private estimateIndexSize(): number {
    let size = 0;
    for (const layer of this.layers) {
      size += layer.nodes.size * 64; // Rough estimate per node
    }
    return size;
  }
}

// ============================================================================
// LSH (Locality Sensitive Hashing) Implementation
// ============================================================================

interface LSHHashTable {
  buckets: Map<string, number[]>;
  hashFunctions: Array<{
    a: number[];
    b: number;
  }>;
}

class LSHIndex {
  private config: ANNIndexConfig;
  private vectors: number[][] = [];
  private hashTables: LSHHashTable[] = [];
  private dimension: number;

  // LSH parameters
  private numTables: number;
  private hashSize: number;
  private width: number;

  constructor(config: ANNIndexConfig) {
    this.config = config;
    this.dimension = config.dimension;
    this.numTables = config.lsh?.numTables ?? 10;
    this.hashSize = config.lsh?.hashSize ?? 10;
    this.width = config.lsh?.width ?? 4.0;
  }

  /**
   * Build LSH index from vectors
   */
  build(vectors: number[][]): void {
    this.vectors = vectors;
    this.hashTables = [];

    // Create hash tables
    for (let t = 0; t < this.numTables; t++) {
      const table: LSHHashTable = {
        buckets: new Map(),
        hashFunctions: [],
      };

      // Generate random hash functions for this table
      for (let h = 0; h < this.hashSize; h++) {
        const a: number[] = [];
        for (let d = 0; d < this.dimension; d++) {
          a.push(this.randomNormal());
        }
        const b = Math.random() * this.width;
        table.hashFunctions.push({ a, b });
      }

      this.hashTables.push(table);

      // Hash all vectors and add to buckets
      for (let i = 0; i < vectors.length; i++) {
        const hashKey = this.computeHash(vectors[i], table.hashFunctions);
        if (!table.buckets.has(hashKey)) {
          table.buckets.set(hashKey, []);
        }
        table.buckets.get(hashKey)!.push(i);
      }
    }
  }

  /**
   * Search for k nearest neighbors
   */
  search(query: number[], k: number): SearchResult[] {
    const candidates = new Set<number>();

    // Query all hash tables
    for (const table of this.hashTables) {
      const hashKey = this.computeHash(query, table.hashFunctions);
      const bucket = table.buckets.get(hashKey);

      if (bucket) {
        for (const idx of bucket) {
          candidates.add(idx);
        }
      }
    }

    // Compute exact distances for candidates
    const results: SearchResult[] = [];
    for (const idx of candidates) {
      const distance = DistanceMetrics.euclidean(query, this.vectors[idx]);
      results.push({
        index: idx,
        distance,
        similarity: 1 / (1 + distance),
      });
    }

    // Sort by distance and return top k
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  /**
   * Add a new vector to the index
   */
  add(vector: number[]): void {
    const index = this.vectors.length;
    this.vectors.push(vector);

    // Add to all hash tables
    for (const table of this.hashTables) {
      const hashKey = this.computeHash(vector, table.hashFunctions);
      if (!table.buckets.has(hashKey)) {
        table.buckets.set(hashKey, []);
      }
      table.buckets.get(hashKey)!.push(index);
    }
  }

  /**
   * Remove a vector from the index
   */
  remove(index: number): void {
    // Remove from all hash table buckets
    for (const table of this.hashTables) {
      for (const bucket of table.buckets.values()) {
        const idx = bucket.indexOf(index);
        if (idx !== -1) {
          bucket.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Compute LSH hash for a vector
   */
  private computeHash(
    vector: number[],
    hashFunctions: Array<{ a: number[]; b: number }>
  ): string {
    const hashValues: string[] = [];

    for (const { a, b } of hashFunctions) {
      let dotProduct = 0;
      for (let d = 0; d < Math.min(vector.length, a.length); d++) {
        dotProduct += vector[d] * a[d];
      }
      const hashValue = Math.floor((dotProduct + b) / this.width);
      hashValues.push(hashValue.toString());
    }

    return hashValues.join(',');
  }

  /**
   * Generate random normal distribution value (Box-Muller transform)
   */
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get build statistics
   */
  getBuildStats(): BuildStats {
    let totalBuckets = 0;
    for (const table of this.hashTables) {
      totalBuckets += table.buckets.size;
    }

    return {
      algorithm: 'LSH',
      buildTimeMs: 0, // Set by caller
      totalElements: this.vectors.length,
      indexSizeBytes: this.estimateIndexSize(),
      hashTables: this.numTables,
    };
  }

  private estimateIndexSize(): number {
    let size = 0;
    for (const table of this.hashTables) {
      size += table.hashFunctions.length * (this.dimension * 8 + 8);
      size += table.buckets.size * 64; // Rough estimate per bucket
    }
    return size;
  }
}

// ============================================================================
// Ball Tree Implementation
// ============================================================================

interface BallTreeNode {
  index: number | null; // null for internal nodes
  centroid: number[];
  radius: number;
  left: BallTreeNode | null;
  right: BallTreeNode | null;
  indices: number[]; // For leaf nodes
}

class BallTreeIndex {
  private config: ANNIndexConfig;
  private vectors: number[][] = [];
  private root: BallTreeNode | null = null;
  private leafSize: number;
  private metric: 'euclidean' | 'manhattan' | 'cosine';

  constructor(config: ANNIndexConfig) {
    this.config = config;
    this.leafSize = config.balltree?.leafSize ?? 40;
    this.metric = config.balltree?.metric ?? 'euclidean';
  }

  /**
   * Build Ball Tree from vectors
   */
  build(vectors: number[][]): void {
    this.vectors = vectors;
    this.root = this.buildNode(Array.from({ length: vectors.length }, (_, i) => i));
  }

  /**
   * Build tree node recursively
   */
  private buildNode(indices: number[]): BallTreeNode {
    if (indices.length <= this.leafSize) {
      // Leaf node
      const centroids = this.computeCentroid(indices);
      const radius = this.computeRadius(indices, centroids);

      return {
        index: null,
        centroid: centroids,
        radius,
        left: null,
        right: null,
        indices,
      };
    }

    // Internal node - split the data
    const { leftIndices, rightIndices, leftCentroid, rightCentroid } =
      this.splitIndices(indices);

    const centroid = this.computeCentroid(indices);
    const radius = this.computeRadius(indices, centroid);

    return {
      index: null,
      centroid,
      radius,
      left: this.buildNode(leftIndices),
      right: this.buildNode(rightIndices),
      indices: [],
    };
  }

  /**
   * Search for k nearest neighbors
   */
  search(query: number[], k: number): SearchResult[] {
    if (!this.root) return [];

    const results: SearchResult[] = [];
    this.searchNode(this.root, query, k, results);

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  /**
   * Search tree node recursively
   */
  private searchNode(
    node: BallTreeNode,
    query: number[],
    k: number,
    results: SearchResult[]
  ): void {
    const distance = this.computeDistance(query, node.centroid);

    // Check if this node could contain closer points
    if (results.length >= k && distance > node.radius + results[k - 1].distance) {
      return; // Prune this branch
    }

    // Leaf node - check all points
    if (node.left === null && node.right === null) {
      for (const idx of node.indices) {
        const dist = this.computeDistance(query, this.vectors[idx]);
        results.push({
          index: idx,
          distance: dist,
          similarity: this.metric === 'cosine'
            ? DistanceMetrics.cosineSimilarity(query, this.vectors[idx])
            : 1 / (1 + dist),
        });
      }
      return;
    }

    // Internal node - recurse to children
    const leftDist = node.left
      ? this.computeDistance(query, node.left.centroid)
      : Infinity;
    const rightDist = node.right
      ? this.computeDistance(query, node.right.centroid)
      : Infinity;

    // Search closer child first
    if (leftDist < rightDist) {
      if (node.left) this.searchNode(node.left, query, k, results);
      if (node.right) this.searchNode(node.right, query, k, results);
    } else {
      if (node.right) this.searchNode(node.right, query, k, results);
      if (node.left) this.searchNode(node.left, query, k, results);
    }
  }

  /**
   * Add a new vector to the index
   */
  add(vector: number[]): void {
    const index = this.vectors.length;
    this.vectors.push(vector);

    if (!this.root) {
      this.root = {
        index: null,
        centroid: [...vector],
        radius: 0,
        left: null,
        right: null,
        indices: [index],
      };
      return;
    }

    // Rebuild tree (simplified approach)
    // In production, you'd want to incrementally update
    this.rebuild();
  }

  /**
   * Remove a vector from the index
   */
  remove(index: number): void {
    // Rebuild tree without the removed index
    this.vectors[index] = []; // Mark as removed
    this.rebuild();
  }

  /**
   * Rebuild the entire tree
   */
  private rebuild(): void {
    const validIndices = this.vectors
      .map((v, i) => (v.length > 0 ? i : -1))
      .filter(i => i !== -1);

    if (validIndices.length > 0) {
      this.root = this.buildNode(validIndices);
    } else {
      this.root = null;
    }
  }

  /**
   * Compute centroid for a set of indices
   */
  private computeCentroid(indices: number[]): number[] {
    if (indices.length === 0) return [];
    if (indices.length === 1) return [...this.vectors[indices[0]]];

    const dimension = this.vectors[indices[0]].length;
    const centroid = new Array(dimension).fill(0);

    for (const idx of indices) {
      for (let d = 0; d < dimension; d++) {
        centroid[d] += this.vectors[idx][d];
      }
    }

    for (let d = 0; d < dimension; d++) {
      centroid[d] /= indices.length;
    }

    return centroid;
  }

  /**
   * Compute radius for a set of indices
   */
  private computeRadius(indices: number[], centroid: number[]): number {
    let maxDist = 0;

    for (const idx of indices) {
      const dist = this.computeDistance(this.vectors[idx], centroid);
      maxDist = Math.max(maxDist, dist);
    }

    return maxDist;
  }

  /**
   * Split indices into two groups
   */
  private splitIndices(indices: number[]): {
    leftIndices: number[];
    rightIndices: number[];
    leftCentroid: number[];
    rightCentroid: number[];
  } {
    // Find dimension with maximum variance
    const dimension = this.vectors[indices[0]].length;
    let maxVarDim = 0;
    let maxVar = -1;

    for (let d = 0; d < dimension; d++) {
      let mean = 0;
      for (const idx of indices) {
        mean += this.vectors[idx][d];
      }
      mean /= indices.length;

      let variance = 0;
      for (const idx of indices) {
        const diff = this.vectors[idx][d] - mean;
        variance += diff * diff;
      }
      variance /= indices.length;

      if (variance > maxVar) {
        maxVar = variance;
        maxVarDim = d;
      }
    }

    // Sort by dimension and split
    const sorted = [...indices].sort(
      (a, b) => this.vectors[a][maxVarDim] - this.vectors[b][maxVarDim]
    );

    const mid = Math.floor(sorted.length / 2);

    return {
      leftIndices: sorted.slice(0, mid),
      rightIndices: sorted.slice(mid),
      leftCentroid: this.computeCentroid(sorted.slice(0, mid)),
      rightCentroid: this.computeCentroid(sorted.slice(mid)),
    };
  }

  /**
   * Compute distance based on metric
   */
  private computeDistance(a: number[], b: number[]): number {
    switch (this.metric) {
      case 'euclidean':
        return DistanceMetrics.euclidean(a, b);
      case 'manhattan':
        return DistanceMetrics.manhattan(a, b);
      case 'cosine':
        return DistanceMetrics.cosineDistance(a, b);
      default:
        return DistanceMetrics.euclidean(a, b);
    }
  }

  /**
   * Get build statistics
   */
  getBuildStats(): BuildStats {
    const depth = this.computeTreeDepth(this.root);

    return {
      algorithm: 'Ball Tree',
      buildTimeMs: 0, // Set by caller
      totalElements: this.vectors.length,
      indexSizeBytes: this.estimateIndexSize(),
      treeDepth: depth,
    };
  }

  private computeTreeDepth(node: BallTreeNode | null): number {
    if (!node) return 0;
    const leftDepth = node.left ? this.computeTreeDepth(node.left) : 0;
    const rightDepth = node.right ? this.computeTreeDepth(node.right) : 0;
    return 1 + Math.max(leftDepth, rightDepth);
  }

  private estimateIndexSize(): number {
    const nodeCount = this.countNodes(this.root);
    return nodeCount * (this.config.dimension * 8 + 32);
  }

  private countNodes(node: BallTreeNode | null): number {
    if (!node) return 0;
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }
}

// ============================================================================
// Main ANN Index Class
// ============================================================================

export class ANNIndex {
  private config: ANNIndexConfig;
  private algorithm: ANNAlgorithm;
  private index: HNSWIndex | LSHIndex | BallTreeIndex | null = null;
  private buildTimeMs: number = 0;

  constructor(config?: Partial<ANNIndexConfig>) {
    const dimension = config?.dimension ?? 128;

    this.config = {
      algorithm: 'auto',
      dimension,
      hnsw: {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
      },
      lsh: {
        numTables: 10,
        hashSize: 10,
        width: 4.0,
      },
      balltree: {
        leafSize: 40,
        metric: 'euclidean',
      },
      maxElements: 100000,
      enablePrefetch: true,
      ...config,
    };

    this.algorithm = this.selectAlgorithm();
  }

  /**
   * Build ANN index from embeddings
   */
  build(embeddings: number[][]): void {
    if (embeddings.length === 0) {
      throw new Error('Cannot build index from empty embeddings array');
    }

    // Update dimension from embeddings
    this.config.dimension = embeddings[0].length;

    // Select and create appropriate index
    this.algorithm = this.selectAlgorithm();

    const startTime = performance.now();

    switch (this.algorithm) {
      case 'hnsw':
        this.index = new HNSWIndex(this.config);
        break;
      case 'lsh':
        this.index = new LSHIndex(this.config);
        break;
      case 'balltree':
        this.index = new BallTreeIndex(this.config);
        break;
      default:
        // Auto-select based on data characteristics
        this.index = this.createOptimalIndex(embeddings);
    }

    this.index.build(embeddings);

    const endTime = performance.now();
    this.buildTimeMs = endTime - startTime;
  }

  /**
   * Search for k nearest neighbors
   */
  search(query: number[], k: number): number[] {
    if (!this.index) {
      throw new Error('Index not built. Call build() first.');
    }

    const results = this.index.search(query, k);
    return results.map(r => r.index);
  }

  /**
   * Search with distances
   */
  searchWithScores(query: number[], k: number): SearchResult[] {
    if (!this.index) {
      throw new Error('Index not built. Call build() first.');
    }

    return this.index.search(query, k);
  }

  /**
   * Add a new embedding to the index
   */
  add(embedding: number[]): void {
    if (!this.index) {
      throw new Error('Index not built. Call build() first.');
    }

    this.index.add(embedding);
  }

  /**
   * Remove an embedding from the index
   */
  remove(index: number): void {
    if (!this.index) {
      throw new Error('Index not built. Call build() first.');
    }

    this.index.remove(index);
  }

  /**
   * Batch search multiple queries
   */
  batchSearch(queries: number[][], k: number): number[][] {
    return queries.map(query => this.search(query, k));
  }

  /**
   * Get build statistics
   */
  getBuildStats(): BuildStats {
    if (!this.index) {
      return {
        algorithm: 'None',
        buildTimeMs: 0,
        totalElements: 0,
        indexSizeBytes: 0,
      };
    }

    const stats = this.index.getBuildStats();
    return {
      ...stats,
      buildTimeMs: this.buildTimeMs,
    };
  }

  /**
   * Get search statistics (if available)
   */
  getSearchStats(): SearchStats | null {
    if (!this.index || !(this.index instanceof HNSWIndex)) {
      return null;
    }
    return this.index.getSearchStats();
  }

  /**
   * Select optimal algorithm based on configuration
   */
  private selectAlgorithm(): ANNAlgorithm {
    if (this.config.algorithm !== 'auto') {
      return this.config.algorithm;
    }

    // Auto-selection logic
    // High dimensions (>100) -> HNSW
    // Medium dimensions (20-100) -> Ball Tree
    // Low dimensions (<20) -> Ball Tree or LSH
    // Very large datasets (>10000) -> LSH

    const dim = this.config.dimension;

    if (dim > 100) {
      return 'hnsw';
    } else if (dim > 20) {
      return 'balltree';
    } else {
      return 'balltree';
    }
  }

  /**
   * Create optimal index based on data characteristics
   */
  private createOptimalIndex(embeddings: number[][]): HNSWIndex | LSHIndex | BallTreeIndex {
    const dim = embeddings[0].length;
    const count = embeddings.length;

    // Very high-dimensional or large dataset -> HNSW
    if (dim > 100 || count > 10000) {
      return new HNSWIndex(this.config);
    }

    // Low-dimensional -> Ball Tree
    if (dim < 50) {
      return new BallTreeIndex(this.config);
    }

    // Default to HNSW
    return new HNSWIndex(this.config);
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.index = null;
    this.buildTimeMs = 0;
  }

  /**
   * Get current algorithm
   */
  getAlgorithm(): ANNAlgorithm {
    return this.algorithm;
  }

  /**
   * Get configuration
   */
  getConfig(): ANNIndexConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Benchmark ANN index against linear search
 */
export function benchmarkANNIndex(
  embeddings: number[][],
  queries: number[][],
  k: number,
  config?: Partial<ANNIndexConfig>
): {
  annTimeMs: number;
  linearTimeMs: number;
  speedup: number;
  recall: number;
  buildStats: BuildStats;
} {
  // Build ANN index
  const annIndex = new ANNIndex(config);
  const buildStart = performance.now();
  annIndex.build(embeddings);
  const buildEnd = performance.now();
  const buildStats = annIndex.getBuildStats();
  buildStats.buildTimeMs = buildEnd - buildStart;

  // Benchmark ANN search
  const annStart = performance.now();
  const annResults = queries.map(q => annIndex.search(q, k));
  const annEnd = performance.now();
  const annTimeMs = annEnd - annStart;

  // Benchmark linear search
  const linearStart = performance.now();
  const linearResults = queries.map(q => linearSearch(embeddings, q, k));
  const linearEnd = performance.now();
  const linearTimeMs = linearEnd - linearStart;

  // Calculate recall
  let totalRecall = 0;
  for (let i = 0; i < queries.length; i++) {
    const annSet = new Set(annResults[i]);
    const recall = linearResults[i].filter(idx => annSet.has(idx)).length / k;
    totalRecall += recall;
  }
  const avgRecall = totalRecall / queries.length;

  return {
    annTimeMs,
    linearTimeMs,
    speedup: linearTimeMs / annTimeMs,
    recall: avgRecall,
    buildStats,
  };
}

/**
 * Linear search for k nearest neighbors (baseline)
 */
function linearSearch(
  embeddings: number[][],
  query: number[],
  k: number
): number[] {
  const results: { index: number; distance: number }[] = [];

  for (let i = 0; i < embeddings.length; i++) {
    const distance = DistanceMetrics.euclidean(query, embeddings[i]);
    results.push({ index: i, distance });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, k).map(r => r.index);
}

/**
 * Generate random embeddings for testing
 */
export function generateRandomEmbeddings(
  count: number,
  dimension: number,
  seed?: number
): number[][] {
  const embeddings: number[][] = [];

  // Simple seeded random
  let s = seed ?? 12345;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const embedding: number[] = [];
    for (let d = 0; d < dimension; d++) {
      embedding.push(random() * 2 - 1); // [-1, 1]
    }
    embeddings.push(embedding);
  }

  return embeddings;
}
