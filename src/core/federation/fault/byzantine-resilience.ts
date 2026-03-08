/**
 * POLLN Byzantine Resilience for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Blanchard et al., "Machine Learning with Adversaries: Byzantine Tolerant Gradient Descent" (NIPS 2017)
 * - Yin et al., "Byzantine-Robust Distributed Learning: Towards Optimal Accuracy-Communication Trade-offs" (2021)
 *
 * Byzantine resilience protects federated learning from malicious or faulty participants
 * that may send arbitrary or incorrect updates. This is critical for real-world deployments
 * where participants may be compromised or behave adversarially.
 *
 * Threat Models:
 * 1. Arbitrary perturbations - Malicious clients send arbitrary gradients
 * 2. Label flipping - Malicious clients flip labels to poison the model
 * 3. Data poisoning - Malicious clients inject poisoned data
 * 4. Collusion - Multiple malicious clients coordinate attacks
 *
 * Defense Mechanisms:
 * 1. Krum / Multi-Krum - Detect outliers using Euclidean distance
 * 2. Trimmed Mean - Remove extreme values
 * 3. Median - Use median instead of mean
 * 4. Coordinate-wise Median - Robust to outliers in each dimension
 * 5. Bulyan - Combines Krum and coordinate-wise trimming
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ByzantineResilienceConfig {
  enabled: boolean;
  method: 'krum' | 'multi-krum' | 'trimmed-mean' | 'median' | 'bulyan';
  maxByzantineParticipants: number; // f: maximum number of malicious clients
  distanceMetric: 'euclidean' | 'cosine' | 'manhattan';
  trimmingFraction: number; // Fraction to trim (for trimmed-mean)
  bulyanIterations: number; // Iterations for Bulyan
}

export interface ByzantineDetectionResult {
  participantId: string;
  isByzantine: boolean;
  confidence: number;
  score: number;
  reasons: string[];
}

export interface RobustAggregationResult {
  aggregatedGradients: Float32Array;
  detectedByzantine: string[];
  removedParticipants: string[];
  robustnessScore: number;
}

// ============================================================================
// Byzantine Resilience Implementation
// ============================================================================

/**
 * ByzantineResilience
 *
 * Detects and mitigates Byzantine (malicious) participants in federated learning.
 */
export class ByzantineResilience {
  private config: ByzantineResilienceConfig;
  private detectionHistory: Map<string, ByzantineDetectionResult[]> = new Map();

  constructor(config: Partial<ByzantineResilienceConfig> = {}) {
    this.config = {
      enabled: true,
      method: 'krum',
      maxByzantineParticipants: 1,
      distanceMetric: 'euclidean',
      trimmingFraction: 0.2,
      bulyanIterations: 10,
      ...config,
    };
  }

  /**
   * Detect Byzantine participants
   */
  detectByzantine(
    updates: Map<string, Float32Array>
  ): ByzantineDetectionResult[] {
    if (!this.config.enabled) {
      return [];
    }

    const results: ByzantineDetectionResult[] = [];

    switch (this.config.method) {
      case 'krum':
      case 'multi-krum':
        return this.krumDetection(updates);

      case 'trimmed-mean':
        return this.trimmedMeanDetection(updates);

      case 'median':
        return this.medianDetection(updates);

      case 'bulyan':
        return this.bulyanDetection(updates);

      default:
        return [];
    }
  }

  /**
   * Perform robust aggregation that is resilient to Byzantine participants
   */
  robustAggregate(
    updates: Map<string, Float32Array>
  ): RobustAggregationResult {
    if (!this.config.enabled) {
      const gradients = Array.from(updates.values());
      const aggregated = this.simpleAverage(gradients);
      return {
        aggregatedGradients: aggregated,
        detectedByzantine: [],
        removedParticipants: [],
        robustnessScore: 1.0,
      };
    }

    // Detect Byzantine participants
    const detections = this.detectByzantine(updates);
    const byzantineIds = detections.filter(d => d.isByzantine).map(d => d.participantId);

    // Remove Byzantine participants
    const cleanUpdates = new Map<string, Float32Array>();
    for (const [id, gradients] of updates.entries()) {
      if (!byzantineIds.includes(id)) {
        cleanUpdates.set(id, gradients);
      }
    }

    // Perform robust aggregation on clean updates
    const aggregated = this.performRobustAggregation(cleanUpdates);

    return {
      aggregatedGradients: aggregated,
      detectedByzantine: byzantineIds,
      removedParticipants: byzantineIds,
      robustnessScore: this.calculateRobustnessScore(detections),
    };
  }

  /**
   * Krum detection algorithm
   * Selects the update closest to all other updates (most central)
   */
  private krumDetection(
    updates: Map<string, Float32Array>
  ): ByzantineDetectionResult[] {
    const f = this.config.maxByzantineParticipants;
    const participantIds = Array.from(updates.keys());
    const gradients = Array.from(updates.values());

    if (gradients.length <= 2 * f) {
      console.warn('Krum requires n > 2f participants');
      return [];
    }

    // Calculate pairwise distances
    const distances = this.calculatePairwiseDistances(gradients);

    // Calculate scores for each participant
    const scores = participantIds.map((id, i) => {
      // Get distances to all other participants
      const row = distances[i];
      // Sort and take (n-f-2) smallest distances
      const sorted = row
        .map((d, j) => ({ distance: d, index: j }))
        .filter(item => item.index !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, gradients.length - f - 2);

      const score = sorted.reduce((sum, item) => sum + item.distance, 0);
      return { id, score };
    });

    // Find the Krum update (minimum score)
    scores.sort((a, b) => a.score - b.score);
    const krumId = scores[0].id;

    // Participants far from Krum are suspicious
    const threshold = this.calculateKrumThreshold(scores);
    const results: ByzantineDetectionResult[] = [];

    for (const { id, score } of scores) {
      const isByzantine = id !== krumId && score > threshold;
      results.push({
        participantId: id,
        isByzantine,
        confidence: isByzantine ? Math.min(score / threshold, 1) : 0,
        score,
        reasons: isByzantine
          ? ['Far from central update (Krum)', 'High pairwise distance']
          : [],
      });
    }

    return results;
  }

  /**
   * Trimmed mean detection
   * Removes extreme values in each dimension
   */
  private trimmedMeanDetection(
    updates: Map<string, Float32Array>
  ): ByzantineDetectionResult[] {
    const participantIds = Array.from(updates.keys());
    const gradients = Array.from(updates.values());
    const dim = gradients[0].length;

    const results: ByzantineDetectionResult[] = [];

    // For each participant, check if they're outliers in any dimension
    for (let i = 0; i < gradients.length; i++) {
      const id = participantIds[i];
      const grad = gradients[i];
      const outlierCount: number[] = [];

      // Check each dimension
      for (let d = 0; d < dim; d++) {
        const values = gradients.map(g => g[d]);
        values.sort((a, b) => a - b);

        const trimCount = Math.floor(values.length * this.config.trimmingFraction);
        const trimmed = values.slice(trimCount, values.length - trimCount);

        const min = trimmed[0];
        const max = trimmed[trimmed.length - 1];

        if (grad[d] < min || grad[d] > max) {
          outlierCount.push(d);
        }
      }

      const isByzantine = outlierCount.length > dim * 0.1; // Outlier in >10% of dimensions
      results.push({
        participantId: id,
        isByzantine,
        confidence: outlierCount.length / dim,
        score: outlierCount.length,
        reasons: isByzantine
          ? [
              `Outlier in ${outlierCount.length}/${dim} dimensions`,
              'Beyond trimmed mean bounds',
            ]
          : [],
      });
    }

    return results;
  }

  /**
   * Median detection
   * Uses median instead of mean for robustness
   */
  private medianDetection(
    updates: Map<string, Float32Array>
  ): ByzantineDetectionResult[] {
    const participantIds = Array.from(updates.keys());
    const gradients = Array.from(updates.values());
    const dim = gradients[0].length;

    // Calculate median across participants for each dimension
    const median = new Float32Array(dim);
    for (let d = 0; d < dim; d++) {
      const values = gradients.map(g => g[d]).sort((a, b) => a - b);
      median[d] = values[Math.floor(values.length / 2)];
    }

    // Detect participants far from median
    const results: ByzantineDetectionResult[] = [];
    for (let i = 0; i < gradients.length; i++) {
      const id = participantIds[i];
      const grad = gradients[i];

      // Calculate distance from median
      const distance = this.calculateDistance(grad, median, this.config.distanceMetric);

      // Threshold based on median distance
      const distances = gradients.map(g => this.calculateDistance(g, median, this.config.distanceMetric));
      distances.sort((a, b) => a - b);
      const medianDistance = distances[Math.floor(distances.length / 2)];

      const isByzantine = distance > medianDistance * 2; // More than 2x median distance

      results.push({
        participantId: id,
        isByzantine,
        confidence: Math.min(distance / (medianDistance * 2), 1),
        score: distance,
        reasons: isByzantine
          ? ['Far from median update', 'High deviation from consensus']
          : [],
      });
    }

    return results;
  }

  /**
   * Bulyan detection (combines Krum and coordinate-wise trimming)
   */
  private bulyanDetection(
    updates: Map<string, Float32Array>
  ): ByzantineDetectionResult[] {
    const f = this.config.maxByzantineParticipants;
    const gradients = Array.from(updates.values());
    const participantIds = Array.from(updates.keys());

    if (gradients.length <= 4 * f) {
      console.warn('Bulyan requires n > 4f participants');
      return [];
    }

    // Step 1: Run Multi-Krum to select 2f candidates
    const krumResults = this.krumDetection(updates);
    const candidates = krumResults
      .filter(r => !r.isByzantine)
      .slice(0, 2 * f)
      .map(r => r.participantId);

    // Step 2: Apply coordinate-wise trimming on candidates
    const candidateGradients = candidates.map(id => updates.get(id)!);
    const results: ByzantineDetectionResult[] = [];

    for (let i = 0; i < gradients.length; i++) {
      const id = participantIds[i];
      const grad = gradients[i];

      // Calculate distance to nearest candidate
      let minDistance = Infinity;
      for (const candidateGrad of candidateGradients) {
        const dist = this.calculateDistance(grad, candidateGrad, this.config.distanceMetric);
        minDistance = Math.min(minDistance, dist);
      }

      // Calculate threshold
      const avgCandidateDistance = this.averagePairwiseDistance(candidateGradients);
      const isByzantine = minDistance > avgCandidateDistance * 1.5;

      results.push({
        participantId: id,
        isByzantine,
        confidence: Math.min(minDistance / (avgCandidateDistance * 1.5), 1),
        score: minDistance,
        reasons: isByzantine
          ? ['Far from Multi-Krum candidates', 'Failed Bulyan validation']
          : [],
      });
    }

    return results;
  }

  /**
   * Calculate pairwise distances between all updates
   */
  private calculatePairwiseDistances(gradients: Float32Array[]): number[][] {
    const n = gradients.length;
    const distances: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const dist = this.calculateDistance(gradients[i], gradients[j], this.config.distanceMetric);
        distances[i][j] = dist;
        distances[j][i] = dist;
      }
    }

    return distances;
  }

  /**
   * Calculate distance between two vectors
   */
  private calculateDistance(
    a: Float32Array,
    b: Float32Array,
    metric: 'euclidean' | 'cosine' | 'manhattan'
  ): number {
    switch (metric) {
      case 'euclidean':
        return this.euclideanDistance(a, b);
      case 'cosine':
        return this.cosineDistance(a, b);
      case 'manhattan':
        return this.manhattanDistance(a, b);
    }
  }

  /**
   * Euclidean distance
   */
  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Cosine distance (1 - cosine similarity)
   */
  private cosineDistance(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity;
  }

  /**
   * Manhattan distance
   */
  private manhattanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  /**
   * Calculate threshold for Krum detection
   */
  private calculateKrumThreshold(scores: Array<{ id: string; score: number }>): number {
    const sortedScores = scores.map(s => s.score).sort((a, b) => a - b);
    const median = sortedScores[Math.floor(sortedScores.length / 2)];
    const q75 = sortedScores[Math.floor(sortedScores.length * 0.75)];
    return median + (q75 - median) * 2;
  }

  /**
   * Calculate average pairwise distance
   */
  private averagePairwiseDistance(gradients: Float32Array[]): number {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < gradients.length; i++) {
      for (let j = i + 1; j < gradients.length; j++) {
        sum += this.calculateDistance(gradients[i], gradients[j], this.config.distanceMetric);
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Perform robust aggregation
   */
  private performRobustAggregation(updates: Map<string, Float32Array>): Float32Array {
    const gradients = Array.from(updates.values());

    switch (this.config.method) {
      case 'trimmed-mean':
        return this.trimmedMeanAggregate(gradients);
      case 'median':
        return this.medianAggregate(gradients);
      default:
        return this.simpleAverage(gradients);
    }
  }

  /**
   * Simple average (fallback)
   */
  private simpleAverage(gradients: Float32Array[]): Float32Array {
    const dim = gradients[0].length;
    const avg = new Float32Array(dim);

    for (const grad of gradients) {
      for (let i = 0; i < dim; i++) {
        avg[i] += grad[i] / gradients.length;
      }
    }

    return avg;
  }

  /**
   * Trimmed mean aggregation
   */
  private trimmedMeanAggregate(gradients: Float32Array[]): Float32Array {
    const dim = gradients[0].length;
    const result = new Float32Array(dim);
    const trimCount = Math.floor(gradients.length * this.config.trimmingFraction);

    for (let d = 0; d < dim; d++) {
      const values = gradients.map(g => g[d]).sort((a, b) => a - b);
      const trimmed = values.slice(trimCount, values.length - trimCount);
      result[d] = trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
    }

    return result;
  }

  /**
   * Median aggregation
   */
  private medianAggregate(gradients: Float32Array[]): Float32Array {
    const dim = gradients[0].length;
    const result = new Float32Array(dim);

    for (let d = 0; d < dim; d++) {
      const values = gradients.map(g => g[d]).sort((a, b) => a - b);
      result[d] = values[Math.floor(values.length / 2)];
    }

    return result;
  }

  /**
   * Calculate robustness score
   */
  private calculateRobustnessScore(detections: ByzantineDetectionResult[]): number {
    if (detections.length === 0) return 1.0;

    const byzantineCount = detections.filter(d => d.isByzantine).length;
    return 1 - byzantineCount / detections.length;
  }

  /**
   * Get configuration
   */
  getConfig(): ByzantineResilienceConfig {
    return { ...this.config };
  }

  /**
   * Get detection history for a participant
   */
  getDetectionHistory(participantId: string): ByzantineDetectionResult[] {
    return this.detectionHistory.get(participantId) || [];
  }

  /**
   * Reset
   */
  reset(): void {
    this.detectionHistory.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createDefaultByzantineConfig(): ByzantineResilienceConfig {
  return {
    enabled: true,
    method: 'krum',
    maxByzantineParticipants: 1,
    distanceMetric: 'euclidean',
    trimmingFraction: 0.2,
    bulyanIterations: 10,
  };
}

export function createKrumConfig(): ByzantineResilienceConfig {
  return {
    ...createDefaultByzantineConfig(),
    method: 'krum',
  };
}

export function createBulyanConfig(): ByzantineResilienceConfig {
  return {
    ...createDefaultByzantineConfig(),
    method: 'bulyan',
  };
}
