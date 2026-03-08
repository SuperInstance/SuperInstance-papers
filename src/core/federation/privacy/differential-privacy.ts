/**
 * POLLN Differential Privacy for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Abadi et al., "Deep Learning with Differential Privacy" (CCS 2016)
 * - Dwork et al., "The Algorithmic Foundations of Differential Privacy" (2014)
 *
 * This module implements (ε, δ)-differential privacy for federated learning.
 * Differential privacy provides strong privacy guarantees by adding calibrated
 * noise to gradient updates before they leave the client.
 *
 * Privacy Definition:
 * A randomized algorithm M satisfies (ε, δ)-differential privacy if for any
 * two adjacent datasets D and D' (differing by one record), and any set S:
 *   Pr[M(D) ∈ S] ≤ e^ε * Pr[M(D') ∈ S] + δ
 *
 * Key Components:
 * 1. Gradient Clipping - Bound sensitivity per update
 * 2. Noise Injection - Add calibrated noise (Gaussian or Laplacian)
 * 3. Privacy Accounting - Track privacy budget over time
 * 4. Advanced Mechanisms - Moment accounting, Rényi DP
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface DifferentialPrivacyConfig {
  enabled: boolean;
  epsilon: number;
  delta: number;
  sensitivity: number;
  noiseDistribution: 'gaussian' | 'laplacian';
  gradientClipNorm: number;
  mechanism: 'basic' | 'moment-accountant' | 'renyi';
  maxGradients: number; // For subsampling
}

export interface PrivacyAccountant {
  epsilonSpent: number;
  deltaSpent: number;
  roundsParticipated: number;
  lastUpdated: number;
}

export interface ClippedGradients {
  gradients: Float32Array;
  originalNorm: number;
  clippedNorm: number;
  wasClipped: boolean;
  clipRatio: number;
}

export interface NoisedGradients {
  gradients: Float32Array;
  epsilonUsed: number;
  deltaUsed: number;
  noiseMagnitude: number;
  noiseSeed?: number;
}

// ============================================================================
// Differential Privacy Mechanism
// ============================================================================

/**
 * DifferentialPrivacy
 *
 * Implements (ε, δ)-differential privacy for federated gradient updates.
 */
export class DifferentialPrivacy {
  private config: DifferentialPrivacyConfig;
  private privacyAccountants: Map<string, PrivacyAccountant> = new Map();
  private rng: () => number; // Random number generator

  constructor(config: Partial<DifferentialPrivacyConfig> = {}) {
    this.config = {
      enabled: true,
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0,
      noiseDistribution: 'gaussian',
      gradientClipNorm: 1.0,
      mechanism: 'basic',
      maxGradients: 1000,
      ...config,
    };

    // Initialize RNG with seed if provided (for reproducibility)
    this.rng = Math.random;
  }

  /**
   * Apply differential privacy to gradients
   */
  applyPrivacy(
    participantId: string,
    gradients: Float32Array,
    sampleCount: number
  ): NoisedGradients {
    if (!this.config.enabled) {
      return {
        gradients: new Float32Array(gradients),
        epsilonUsed: 0,
        deltaUsed: 0,
        noiseMagnitude: 0,
      };
    }

    // 1. Clip gradients to bound sensitivity
    const clipped = this.clipGradients(gradients);

    // 2. Calculate privacy cost for this round
    const { epsilonUsed, deltaUsed } = this.calculatePrivacyCost(sampleCount);

    // 3. Add noise for differential privacy
    const noised = this.addNoise(clipped.gradients);

    // 4. Update privacy accounting
    this.updatePrivacyAccountant(participantId, epsilonUsed, deltaUsed);

    return {
      gradients: noised.gradients,
      epsilonUsed,
      deltaUsed,
      noiseMagnitude: noised.noiseMagnitude,
    };
  }

  /**
   * Clip gradients to bound L2 sensitivity
   */
  clipGradients(gradients: Float32Array): ClippedGradients {
    // Calculate L2 norm
    let norm = 0;
    for (let i = 0; i < gradients.length; i++) {
      norm += gradients[i] * gradients[i];
    }
    norm = Math.sqrt(norm);

    // Clip if necessary
    if (norm > this.config.gradientClipNorm) {
      const clipRatio = this.config.gradientClipNorm / norm;
      const clipped = new Float32Array(gradients.length);
      for (let i = 0; i < gradients.length; i++) {
        clipped[i] = gradients[i] * clipRatio;
      }

      return {
        gradients: clipped,
        originalNorm: norm,
        clippedNorm: this.config.gradientClipNorm,
        wasClipped: true,
        clipRatio,
      };
    }

    return {
      gradients: new Float32Array(gradients),
      originalNorm: norm,
      clippedNorm: norm,
      wasClipped: false,
      clipRatio: 1.0,
    };
  }

  /**
   * Add calibrated noise to gradients
   */
  private addNoise(gradients: Float32Array): NoisedGradients {
    const noised = new Float32Array(gradients);
    let noiseMagnitude = 0;

    if (this.config.noiseDistribution === 'gaussian') {
      // Gaussian noise: σ = sensitivity * sqrt(2*ln(1.25/δ)) / ε
      const sigma =
        (this.config.sensitivity * Math.sqrt(2 * Math.log(1.25 / this.config.delta))) /
        this.config.epsilon;

      for (let i = 0; i < noised.length; i++) {
        const noise = this.gaussianNoise(0, sigma);
        noised[i] += noise;
        noiseMagnitude += Math.abs(noise);
      }
    } else {
      // Laplacian noise: b = sensitivity / ε
      const b = this.config.sensitivity / this.config.epsilon;

      for (let i = 0; i < noised.length; i++) {
        const noise = this.laplacianNoise(0, b);
        noised[i] += noise;
        noiseMagnitude += Math.abs(noise);
      }
    }

    noiseMagnitude /= noised.length;

    return {
      gradients: noised,
      epsilonUsed: this.config.epsilon,
      deltaUsed: this.config.delta,
      noiseMagnitude,
    };
  }

  /**
   * Calculate privacy cost for a round
   */
  private calculatePrivacyCost(sampleCount: number): {
    epsilonUsed: number;
    deltaUsed: number;
  } {
    switch (this.config.mechanism) {
      case 'moment-accountant':
        return this.momentAccountantCost(sampleCount);

      case 'renyi':
        return this.renyiDPCost(sampleCount);

      case 'basic':
      default:
        // Basic composition: ε_total = ε * num_rounds
        // Subsampling reduces privacy cost
        const subsamplingRatio = Math.min(sampleCount / this.config.maxGradients, 1.0);
        return {
          epsilonUsed: this.config.epsilon * subsamplingRatio,
          deltaUsed: this.config.delta,
        };
    }
  }

  /**
   * Moment accountant for tighter privacy bounds
   */
  private momentAccountantCost(sampleCount: number): {
    epsilonUsed: number;
    deltaUsed: number;
  } {
    // Simplified moment accountant
    // In practice, would use more sophisticated tracking

    const subsamplingRatio = Math.min(sampleCount / this.config.maxGradients, 1.0);
    const noiseSigma =
      (this.config.sensitivity * Math.sqrt(2 * Math.log(1.25 / this.config.delta))) /
      this.config.epsilon;

    // Approximate privacy cost using subsampling
    const epsilonPerRound = this.config.epsilon * subsamplingRatio;
    const deltaPerRound = this.config.delta;

    return {
      epsilonUsed: epsilonPerRound,
      deltaUsed: deltaPerRound,
    };
  }

  /**
   * Rényi differential privacy cost
   */
  private renyiDPCost(sampleCount: number): {
    epsilonUsed: number;
    deltaUsed: number;
  } {
    // Rényi DP provides tighter bounds for Gaussian mechanism
    const subsamplingRatio = Math.min(sampleCount / this.config.maxGradients, 1.0);
    const alpha = 20; // Rényi order (higher = better accuracy)

    // Simplified RDP to (ε, δ) conversion
    const rdpEpsilon = this.config.epsilon * subsamplingRatio;
    const epsilonUsed = rdpEpsilon + Math.log(1 / this.config.delta) / (alpha - 1);

    return {
      epsilonUsed,
      deltaUsed: this.config.delta,
    };
  }

  /**
   * Update privacy accounting for a participant
   */
  private updatePrivacyAccountant(
    participantId: string,
    epsilonUsed: number,
    deltaUsed: number
  ): void {
    let accountant = this.privacyAccountants.get(participantId);

    if (!accountant) {
      accountant = {
        epsilonSpent: 0,
        deltaSpent: 0,
        roundsParticipated: 0,
        lastUpdated: Date.now(),
      };
      this.privacyAccountants.set(participantId, accountant);
    }

    accountant.epsilonSpent += epsilonUsed;
    accountant.deltaSpent += deltaUsed;
    accountant.roundsParticipated++;
    accountant.lastUpdated = Date.now();
  }

  /**
   * Get privacy accountant for a participant
   */
  getPrivacyAccountant(participantId: string): PrivacyAccountant | undefined {
    return this.privacyAccountants.get(participantId);
  }

  /**
   * Check if participant has privacy budget remaining
   */
  hasPrivacyBudget(participantId: string, epsilonLimit: number): boolean {
    const accountant = this.privacyAccountants.get(participantId);
    if (!accountant) return true;

    return accountant.epsilonSpent < epsilonLimit;
  }

  /**
   * Get remaining privacy budget for a participant
   */
  getRemainingBudget(participantId: string, epsilonLimit: number): number {
    const accountant = this.privacyAccountants.get(participantId);
    if (!accountant) return epsilonLimit;

    return Math.max(0, epsilonLimit - accountant.epsilonSpent);
  }

  /**
   * Get privacy budget percentage used
   */
  getBudgetUsagePercentage(participantId: string, epsilonLimit: number): number {
    const remaining = this.getRemainingBudget(participantId, epsilonLimit);
    return ((epsilonLimit - remaining) / epsilonLimit) * 100;
  }

  /**
   * Reset privacy accountant for a participant
   */
  resetPrivacyAccountant(participantId: string): void {
    this.privacyAccountants.delete(participantId);
  }

  /**
   * Reset all privacy accountants
   */
  resetAllAccountants(): void {
    this.privacyAccountants.clear();
  }

  /**
   * Generate Gaussian noise using Box-Muller transform
   */
  private gaussianNoise(mean: number, stdDev: number): number {
    const u1 = this.rng();
    const u2 = this.rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Generate Laplacian noise
   */
  private laplacianNoise(mean: number, scale: number): number {
    const u = this.rng() - 0.5;
    return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Get configuration
   */
  getConfig(): DifferentialPrivacyConfig {
    return { ...this.config };
  }

  /**
   * Set random seed for reproducibility
   */
  setSeed(seed: number): void {
    // Simple linear congruential generator
    let current = seed;
    this.rng = () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate optimal ε for given privacy budget
 */
export function calculateOptimalEpsilon(
  rounds: number,
  epsilonBudget: number,
  delta: number = 1e-5
): number {
  return epsilonBudget / rounds;
}

/**
 * Calculate δ from ε for Gaussian mechanism
 */
export function calculateDeltaFromEpsilon(
  epsilon: number,
  sensitivity: number = 1.0
): number {
  // δ ≈ exp(-ε² * sensitivity² / 2) for large ε
  return Math.exp(-(epsilon * epsilon * sensitivity * sensitivity) / 2);
}

/**
 * Advanced composition theorem for privacy accounting
 */
export function advancedComposition(
  epsilonPerRound: number,
  deltaPerRound: number,
  rounds: number,
  delta: number
): number {
  // ε_total = sqrt(2 * k * ln(1/δ)) * ε + k * ε * (exp(ε) - 1)
  const k = rounds;
  const epsilonTotal = Math.sqrt(2 * k * Math.log(1 / delta)) * epsilonPerRound +
                      k * epsilonPerRound * (Math.exp(epsilonPerRound) - 1);
  return epsilonTotal;
}

/**
 * Create default DP configuration
 */
export function createDefaultDPConfig(): DifferentialPrivacyConfig {
  return {
    enabled: true,
    epsilon: 1.0,
    delta: 1e-5,
    sensitivity: 1.0,
    noiseDistribution: 'gaussian',
    gradientClipNorm: 1.0,
    mechanism: 'basic',
    maxGradients: 1000,
  };
}

/**
 * Create strict DP configuration (higher privacy, lower utility)
 */
export function createStrictDPConfig(): DifferentialPrivacyConfig {
  return {
    ...createDefaultDPConfig(),
    epsilon: 0.1,
    delta: 1e-6,
    gradientClipNorm: 0.5,
    mechanism: 'moment-accountant',
  };
}

/**
 * Create relaxed DP configuration (lower privacy, higher utility)
 */
export function createRelaxedDPConfig(): DifferentialPrivacyConfig {
  return {
    ...createDefaultDPConfig(),
    epsilon: 5.0,
    delta: 1e-4,
    gradientClipNorm: 2.0,
    mechanism: 'basic',
  };
}
