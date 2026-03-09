/**
 * ClusteringModel.ts - K-means clustering for spreadsheet cell communities
 *
 * Groups similar cells into communities based on their behavior patterns.
 * Features dynamic cluster count detection and visualization data generation.
 */

import * as tf from '@tensorflow/tfjs';

export interface ClusterAssignment {
  clusterId: number;
  confidence: number;
  distance: number;
}

export interface ClusterInfo {
  clusterId: number;
  size: number;
  centroid: number[];
  representativeCells: string[];
  characteristics: string[];
}

export interface ClusteringResult {
  assignments: Map<string, ClusterAssignment>;
  clusters: ClusterInfo[];
  silhouetteScore: number;
  optimalK: number;
}

export interface ClusteringModelConfig {
  maxK: number;
  minK: number;
  maxIterations: number;
  convergenceTolerance: number;
  distanceMetric: 'euclidean' | 'manhattan' | 'cosine';
}

export class ClusteringModel {
  private config: ClusteringModelConfig;
  private centroids: tf.Tensor | null = null;
  private k: number = 0;
  private cellFeatures: Map<string, number[]> = new Map();
  private featureDim: number = 0;

  constructor(config?: Partial<ClusteringModelConfig>) {
    this.config = {
      maxK: 10,
      minK: 2,
      maxIterations: 100,
      convergenceTolerance: 1e-4,
      distanceMetric: 'euclidean',
      ...config
    };
  }

  /**
   * Extract features from cell history for clustering
   */
  private extractCellFeatures(cellId: string, history: number[]): number[] {
    const features: number[] = [];

    // Basic statistics
    const valid = history.filter(v => !isNaN(v) && isFinite(v));
    if (valid.length > 0) {
      const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
      const variance = valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valid.length;
      const std = Math.sqrt(variance);

      features.push(mean, std, variance);
      features.push(Math.min(...valid), Math.max(...valid));
    } else {
      features.push(0, 0, 0, 0, 0);
    }

    // Temporal patterns
    if (history.length >= 5) {
      const diffs = [];
      for (let i = 1; i < history.length; i++) {
        diffs.push(history[i] - history[i - 1]);
      }

      const volatility = diffs.reduce((sum, d) => sum + Math.abs(d), 0) / diffs.length;
      const trend = diffs.reduce((a, b) => a + b, 0);

      features.push(volatility, trend);

      // Autocorrelation
      const autocorr = this.computeAutocorrelation(history, 1);
      features.push(autocorr);
    } else {
      features.push(0, 0, 0);
    }

    // Pattern features
    if (history.length >= 10) {
      const entropy = this.computeEntropy(history);
      const periodicity = this.detectPeriodicity(history);
      features.push(entropy, periodicity);
    } else {
      features.push(0, 0);
    }

    // Recent behavior
    const recentWindow = Math.min(5, history.length);
    const recent = history.slice(-recentWindow);
    if (recent.length > 0) {
      const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
      const recentTrend = recent.length > 1
        ? recent[recent.length - 1] - recent[0]
        : 0;
      features.push(recentMean, recentTrend);
    } else {
      features.push(0, 0);
    }

    return features;
  }

  /**
   * Compute autocorrelation at lag
   */
  private computeAutocorrelation(data: number[], lag: number): number {
    const n = data.length;
    if (lag >= n) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Compute entropy
   */
  private computeEntropy(data: number[]): number {
    const bins = 10;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const counts = new Array(bins).fill(0);
    data.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / range * bins), bins - 1);
      counts[binIndex]++;
    });

    let entropy = 0;
    const total = data.length;
    counts.forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });

    return entropy;
  }

  /**
   * Detect periodicity in data
   */
  private detectPeriodicity(data: number[]): number {
    // Use FFT-based periodicity detection
    const n = data.length;
    if (n < 4) return 0;

    // Compute autocorrelation at various lags
    const maxLag = Math.floor(n / 2);
    const autocorrs: number[] = [];

    for (let lag = 1; lag <= maxLag; lag++) {
      autocorrs.push(this.computeAutocorrelation(data, lag));
    }

    // Find peaks
    const maxAutocorr = Math.max(...autocorrs);
    return maxAutocorr;
  }

  /**
   * Prepare features for all cells
   */
  private prepareFeatures(cellHistories: Map<string, number[]>): tf.Tensor {
    const features: number[][] = [];

    cellHistories.forEach((history, cellId) => {
      const featureVector = this.extractCellFeatures(cellId, history);
      this.cellFeatures.set(cellId, featureVector);
      features.push(featureVector);
    });

    if (features.length === 0) {
      throw new Error('No valid cell data provided');
    }

    this.featureDim = features[0].length;

    // Normalize features
    const tensor = tf.tensor2d(features);
    const mean = tensor.mean(0);
    const std = tensor.sub(tensor.mean(0, true)).square().mean(0).sqrt();

    const normalized = tensor.sub(mean).div(std);

    mean.dispose();
    std.dispose();

    return normalized;
  }

  /**
   * Calculate distance between points
   */
  private calculateDistance(a: tf.Tensor, b: tf.Tensor): tf.Tensor {
    switch (this.config.distanceMetric) {
      case 'euclidean':
        return a.sub(b).square().sum(1).sqrt();
      case 'manhattan':
        return a.sub(b).abs().sum(1);
      case 'cosine':
        const normA = a.norm();
        const normB = b.norm();
        return tf.tensor1d([1]).sub(a.div(normA).mul(b.div(normB)).sum());
      default:
        return a.sub(b).square().sum(1).sqrt();
    }
  }

  /**
   * Initialize centroids using k-means++
   */
  private initializeCentroidsPlusPlus(data: tf.Tensor, k: number): tf.Tensor {
    const n = data.shape[0];
    const centroids: number[][] = [];

    // Choose first centroid randomly
    const firstIndex = Math.floor(Math.random() * n);
    centroids.push(Array.from((data.gather(firstIndex) as tf.Tensor).dataSync()));

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances = this.calculateDistanceToCentroids(data, centroids);
      const probabilities = distances.div(distances.sum());
      const cumulativeProb = probabilities.cumsum();

      const rand = Math.random();
      let nextIndex = 0;
      const cumulData = Array.from(cumulativeProb.dataSync());
      for (let j = 0; j < cumulData.length; j++) {
        if (rand < cumulData[j]) {
          nextIndex = j;
          break;
        }
      }

      centroids.push(Array.from((data.gather(nextIndex) as tf.Tensor).dataSync()));
      distances.dispose();
      probabilities.dispose();
      cumulativeProb.dispose();
    }

    return tf.tensor2d(centroids);
  }

  /**
   * Calculate distances to centroids
   */
  private calculateDistanceToCentroids(
    data: tf.Tensor,
    centroids: number[][]
  ): tf.Tensor {
    const centroidTensor = tf.tensor2d(centroids);
    const distances = this.calculateDistance(data, centroidTensor);
    const minDistances = distances.min(1);
    centroidTensor.dispose();
    distances.dispose();
    return minDistances;
  }

  /**
   * Run k-means algorithm
   */
  private kMeans(data: tf.Tensor, k: number): {
    centroids: tf.Tensor;
    assignments: number[];
    converged: boolean;
  } {
    // Initialize centroids
    let centroids = this.initializeCentroidsPlusPlus(data, k);
    let assignments: number[] = [];
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.config.maxIterations) {
      // Assign points to nearest centroid
      const oldCentroids = centroids.clone();
      const distances = this.calculateDistance(data, centroids);
      assignments = Array.from(distances.argMin(1).dataSync() as Float32Array).map(v => v);

      // Update centroids
      const newCentroids: number[][] = [];
      for (let i = 0; i < k; i++) {
        const clusterPoints: number[] = [];
        for (let j = 0; j < assignments.length; j++) {
          if (assignments[j] === i) {
            clusterPoints.push(j);
          }
        }

        if (clusterPoints.length > 0) {
          const clusterData = data.gather(tf.tensor1d(clusterPoints, 'int32'));
          const newCentroid = clusterData.mean(0);
          newCentroids.push(Array.from(newCentroid.dataSync()));
          clusterData.dispose();
          newCentroid.dispose();
        } else {
          // Keep old centroid if cluster is empty
          newCentroids.push(Array.from((centroids.gather(i) as tf.Tensor).dataSync()));
        }
      }

      centroids.dispose();
      centroids = tf.tensor2d(newCentroids);

      // Check convergence
      const centroidShift = this.calculateDistance(oldCentroids, centroids).max().dataSync()[0];
      converged = centroidShift < this.config.convergenceTolerance;

      oldCentroids.dispose();
      distances.dispose();
      iteration++;
    }

    return { centroids, assignments, converged };
  }

  /**
   * Calculate silhouette score
   */
  private calculateSilhouetteScore(
    data: tf.Tensor,
    assignments: number[]
  ): number {
    let score = 0;
    const n = assignments.length;

    for (let i = 0; i < n; i++) {
      const point = data.gather(i) as tf.Tensor;
      const clusterId = assignments[i];

      // Calculate a: mean distance to points in same cluster
      let sameClusterDistances: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i !== j && assignments[j] === clusterId) {
          const otherPoint = data.gather(j) as tf.Tensor;
          const dist = this.calculateDistance(
            point.expandDims(0),
            otherPoint.expandDims(0)
          ).dataSync()[0];
          sameClusterDistances.push(dist);
          otherPoint.dispose();
        }
      }

      const a = sameClusterDistances.length > 0
        ? sameClusterDistances.reduce((a, b) => a + b, 0) / sameClusterDistances.length
        : 0;

      // Calculate b: minimum mean distance to points in other clusters
      let minClusterDist = Infinity;
      for (let k = 0; k < this.k; k++) {
        if (k !== clusterId) {
          let otherClusterDistances: number[] = [];
          for (let j = 0; j < n; j++) {
            if (assignments[j] === k) {
              const otherPoint = data.gather(j) as tf.Tensor;
              const dist = this.calculateDistance(
                point.expandDims(0),
                otherPoint.expandDims(0)
              ).dataSync()[0];
              otherClusterDistances.push(dist);
              otherPoint.dispose();
            }
          }

          if (otherClusterDistances.length > 0) {
            const clusterDist = otherClusterDistances.reduce((a, b) => a + b, 0)
              / otherClusterDistances.length;
            minClusterDist = Math.min(minClusterDist, clusterDist);
          }
        }
      }

      const b = minClusterDist;

      // Silhouette for this point
      const s = (b - a) / Math.max(a, b);
      score += isNaN(s) ? 0 : s;

      point.dispose();
    }

    return score / n;
  }

  /**
   * Find optimal k using elbow method
   */
  private findOptimalK(data: tf.Tensor): number {
    const scores: Array<{ k: number; score: number }> = [];

    for (let k = this.config.minK; k <= this.config.maxK; k++) {
      const { centroids, assignments } = this.kMeans(data, k);

      // Calculate within-cluster sum of squares
      let wcss = 0;
      for (let i = 0; i < assignments.length; i++) {
        const point = data.gather(i) as tf.Tensor;
        const centroid = centroids.gather(assignments[i]) as tf.Tensor;
        const dist = this.calculateDistance(
          point.expandDims(0),
          centroid.expandDims(0)
        ).dataSync()[0];
        wcss += dist * dist;
        point.dispose();
        centroid.dispose();
      }

      scores.push({ k, score: wcss });

      centroids.dispose();
    }

    // Find elbow point
    const deltas = scores.map((s, i) => {
      if (i === 0) return 0;
      const prev = scores[i - 1];
      const prevDelta = prev.score - s.score;
      return prevDelta;
    });

    let maxDeltaIndex = 1;
    let maxDelta = deltas[1];
    for (let i = 2; i < deltas.length; i++) {
      if (deltas[i] > maxDelta) {
        maxDelta = deltas[i];
        maxDeltaIndex = i;
      }
    }

    return scores[maxDeltaIndex].k;
  }

  /**
   * Fit clustering model
   */
  async fit(cellHistories: Map<string, number[]>): Promise<ClusteringResult> {
    // Prepare features
    const data = this.prepareFeatures(cellHistories);

    // Find optimal k
    const optimalK = this.findOptimalK(data);
    this.k = optimalK;

    // Run k-means with optimal k
    const { centroids, assignments } = this.kMeans(data, optimalK);
    this.centroids = centroids;

    // Calculate silhouette score
    const silhouetteScore = this.calculateSilhouetteScore(data, assignments);

    // Build cluster info
    const clusterMap = new Map<number, string[]>();
    assignments.forEach((clusterId, i) => {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      const cellId = Array.from(cellHistories.keys())[i];
      clusterMap.get(clusterId)!.push(cellId);
    });

    const clusters: ClusterInfo[] = [];
    clusterMap.forEach((cells, clusterId) => {
      const centroid = Array.from((centroids.gather(clusterId) as tf.Tensor).dataSync());
      clusters.push({
        clusterId,
        size: cells.length,
        centroid,
        representativeCells: cells.slice(0, 5),
        characteristics: this.describeCluster(clusterId, cells, cellHistories)
      });
    });

    // Build assignments map
    const assignmentMap = new Map<string, ClusterAssignment>();
    assignments.forEach((clusterId, i) => {
      const cellId = Array.from(cellHistories.keys())[i];
      const cellData = data.gather(i) as tf.Tensor;
      const centroid = centroids.gather(clusterId) as tf.Tensor;
      const distance = this.calculateDistance(
        cellData.expandDims(0),
        centroid.expandDims(0)
      ).dataSync()[0];
      const confidence = 1 / (1 + distance);

      assignmentMap.set(cellId, {
        clusterId,
        confidence,
        distance
      });

      cellData.dispose();
      centroid.dispose();
    });

    data.dispose();

    return {
      assignments: assignmentMap,
      clusters,
      silhouetteScore,
      optimalK
    };
  }

  /**
   * Describe cluster characteristics
   */
  private describeCluster(
    clusterId: number,
    cellIds: string[],
    cellHistories: Map<string, number[]>
  ): string[] {
    const characteristics: string[] = [];

    // Analyze patterns in cluster
    const clusterData = cellIds.map(id => cellHistories.get(id)!);

    // Common patterns
    const hasTrend = clusterData.some(h => this.hasTrend(h));
    if (hasTrend) characteristics.push('trending');

    const isVolatile = clusterData.some(h => this.isVolatile(h));
    if (isVolatile) characteristics.push('volatile');

    const isStable = clusterData.some(h => this.isStable(h));
    if (isStable) characteristics.push('stable');

    const hasSeasonality = clusterData.some(h => this.hasSeasonality(h));
    if (hasSeasonality) characteristics.push('seasonal');

    return characteristics;
  }

  /**
   * Check if data has trend
   */
  private hasTrend(history: number[]): boolean {
    if (history.length < 5) return false;
    const diffs = [];
    for (let i = 1; i < history.length; i++) {
      diffs.push(history[i] - history[i - 1]);
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return Math.abs(avgDiff) > 0.1;
  }

  /**
   * Check if data is volatile
   */
  private isVolatile(history: number[]): boolean {
    if (history.length < 2) return false;
    const diffs = [];
    for (let i = 1; i < history.length; i++) {
      diffs.push(Math.abs(history[i] - history[i - 1]));
    }
    const avgChange = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    return avgChange / Math.abs(mean) > 0.1;
  }

  /**
   * Check if data is stable
   */
  private isStable(history: number[]): boolean {
    if (history.length < 5) return false;
    const variance = history.reduce((sum, v) => {
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      return sum + Math.pow(v - mean, 2);
    }, 0) / history.length;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    return Math.sqrt(variance) / Math.abs(mean) < 0.05;
  }

  /**
   * Check if data has seasonality
   */
  private hasSeasonality(history: number[]): boolean {
    const autocorr = this.computeAutocorrelation(history, 7);
    return autocorr > 0.5;
  }

  /**
   * Get visualization data
   */
  getVisualizationData(): {
    centroids: number[][];
    assignments: Map<string, number>;
  } | null {
    if (!this.centroids) return null;

    return {
      centroids: Array.from(this.centroids.dataSync())
        .reduce((acc, val, i) => {
          const idx = Math.floor(i / this.featureDim);
          if (!acc[idx]) acc[idx] = [];
          acc[idx].push(val);
          return acc;
        }, [] as number[][]),
      assignments: new Map()
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.centroids) {
      this.centroids.dispose();
      this.centroids = null;
    }
    this.cellFeatures.clear();
  }
}
