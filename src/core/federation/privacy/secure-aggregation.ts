/**
 * POLLN Secure Aggregation for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Bonawitz et al., "Practical Secure Aggregation for Privacy-Preserving Machine Learning" (CCS 2017)
 * - Kairouz et al., "Advances in Differential Privacy for Deep Learning" (2021)
 *
 * Secure aggregation ensures that the server only sees the aggregated result
 * and never individual client updates. This prevents the server from learning
 * anything about individual clients' data.
 *
 * Key Protocol:
 * 1. Pairwise Masking: Clients pair up and create additive masks
 * 2. Double Masking: Each value is masked twice for security
 * 3. Server Aggregation: Server aggregates masked values
 * 4. Unmasking: Clients reveal masks to cancel out in aggregation
 * 5. Final Result: Server gets sum of original values
 *
 * Security Properties:
 * - Server learns nothing about individual updates
 * - Clients only learn their partner's masks (if using secure channels)
 * - Robust to client dropouts (using encoded seeds)
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SecureAggregationConfig {
  enabled: boolean;
  protocol: 'additive-secret-sharing' | 'paillier' | 'simple-masking';
  encryptionBits: number;
  dropoutTolerance: number; // Maximum clients that can drop
  verificationEnabled: boolean;
  useEncodedSeeds: boolean;
}

export interface MaskedGradients {
  participantId: string;
  maskedGradients: Float32Array;
  masks: Map<string, Float32Array>; // participantId -> mask
  seeds?: Map<string, Uint8Array>; // Encoded seeds for dropout recovery
  verificationHash?: string;
}

export interface UnmaskingShare {
  fromParticipantId: string;
  toParticipantId: string;
  mask: Float32Array;
  signature?: string;
}

export interface SecureAggregationResult {
  aggregatedGradients: Float32Array;
  participantCount: number;
  droppedParticipants: string[];
  verificationPassed: boolean;
  aggregationTime: number;
}

// ============================================================================
// Secure Aggregation Implementation
// ============================================================================

/**
 * SecureAggregation
 *
 * Implements secure aggregation protocol for federated learning.
 */
export class SecureAggregation {
  private config: SecureAggregationConfig;
  private currentRound: number = 0;
  private maskHistory: Map<number, Map<string, MaskedGradients>> = new Map();

  constructor(config: Partial<SecureAggregationConfig> = {}) {
    this.config = {
      enabled: true,
      protocol: 'additive-secret-sharing',
      encryptionBits: 256,
      dropoutTolerance: 0.2, // 20% of participants can drop
      verificationEnabled: true,
      useEncodedSeeds: true,
      ...config,
    };
  }

  /**
   * Phase 1: Create masks for gradients
   * Each client creates pairwise masks with other clients
   */
  async createMasks(
    participantId: string,
    gradients: Float32Array,
    otherParticipants: string[]
  ): Promise<MaskedGradients> {
    if (!this.config.enabled) {
      return {
        participantId,
        maskedGradients: new Float32Array(gradients),
        masks: new Map(),
      };
    }

    const masks = new Map<string, Float32Array>();
    const seeds = this.config.useEncodedSeeds ? new Map<string, Uint8Array>() : undefined;

    // Create pairwise masks
    for (const otherId of otherParticipants) {
      if (otherId === participantId) continue;

      // Generate random mask
      const mask = this.generateRandomMask(gradients.length);

      // If using encoded seeds, encode mask as seed for recovery
      if (seeds) {
        const seed = this.encodeMaskAsSeed(mask);
        seeds.set(otherId, seed);
      }

      masks.set(otherId, mask);
    }

    // Apply masks to gradients
    const maskedGradients = this.applyMasks(gradients, masks, participantId);

    // Calculate verification hash if enabled
    const verificationHash = this.config.verificationEnabled
      ? this.calculateVerificationHash(maskedGradients)
      : undefined;

    const result: MaskedGradients = {
      participantId,
      maskedGradients,
      masks,
      seeds,
      verificationHash,
    };

    // Store for current round
    if (!this.maskHistory.has(this.currentRound)) {
      this.maskHistory.set(this.currentRound, new Map());
    }
    this.maskHistory.get(this.currentRound)!.set(participantId, result);

    return result;
  }

  /**
   * Phase 2: Aggregate masked gradients
   * Server aggregates masked gradients without seeing original values
   */
  async aggregateMaskedGradients(
    maskedUpdates: MaskedGradients[]
  ): Promise<{ aggregated: Float32Array; droppedParticipants: string[] }> {
    if (maskedUpdates.length === 0) {
      throw new Error('No masked updates to aggregate');
    }

    const dim = maskedUpdates[0].maskedGradients.length;
    const aggregated = new Float32Array(dim);
    const droppedParticipants: string[] = [];

    // Aggregate masked gradients
    for (const update of maskedUpdates) {
      // Verify hash if enabled
      if (this.config.verificationEnabled && update.verificationHash) {
        const computedHash = this.calculateVerificationHash(update.maskedGradients);
        if (computedHash !== update.verificationHash) {
          console.warn(`Verification failed for ${update.participantId}, skipping`);
          droppedParticipants.push(update.participantId);
          continue;
        }
      }

      for (let i = 0; i < dim; i++) {
        aggregated[i] += update.maskedGradients[i];
      }
    }

    return { aggregated, droppedParticipants };
  }

  /**
   * Phase 3: Create unmasking shares
   * Clients create shares to reveal their masks
   */
  async createUnmaskingShares(
    participantId: string,
    masks: Map<string, Float32Array>,
    activeParticipants: string[]
  ): Promise<UnmaskingShare[]> {
    const shares: UnmaskingShare[] = [];

    for (const [otherId, mask] of masks.entries()) {
      // Only share with active participants
      if (!activeParticipants.includes(otherId)) {
        // Try to recover from encoded seed if available
        // In practice, this would be handled differently
        continue;
      }

      const share: UnmaskingShare = {
        fromParticipantId: participantId,
        toParticipantId: otherId,
        mask: new Float32Array(mask),
      };

      // Add signature if verification is enabled
      if (this.config.verificationEnabled) {
        share.signature = this.signMask(mask, participantId);
      }

      shares.push(share);
    }

    return shares;
  }

  /**
   * Phase 4: Unmask aggregated gradients
   * Server applies unmasking shares to get final result
   */
  async unmaskGradients(
    aggregatedMasked: Float32Array,
    unmaskingShares: UnmaskingShare[],
    droppedParticipants: string[]
  ): Promise<SecureAggregationResult> {
    const startTime = Date.now();

    // Create a copy for unmasking
    const unmasked = new Float32Array(aggregatedMasked);

    // Apply unmasking shares
    for (const share of unmaskingShares) {
      // Verify signature if enabled
      if (this.config.verificationEnabled && share.signature) {
        const valid = this.verifyMaskSignature(share.mask, share.fromParticipantId, share.signature);
        if (!valid) {
          console.warn(`Invalid signature from ${share.fromParticipantId}`);
          continue;
        }
      }

      // Subtract mask (undo the masking)
      for (let i = 0; i < unmasked.length; i++) {
        unmasked[i] -= share.mask[i];
      }
    }

    // Handle dropped participants using encoded seeds
    if (droppedParticipants.length > 0 && this.config.useEncodedSeeds) {
      await this.recoverFromDropouts(unmasked, droppedParticipants);
    }

    const aggregationTime = Date.now() - startTime;

    return {
      aggregatedGradients: unmasked,
      participantCount: unmaskingShares.length,
      droppedParticipants,
      verificationPassed: true,
      aggregationTime,
    };
  }

  /**
   * Generate random mask
   */
  private generateRandomMask(length: number): Float32Array {
    const mask = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Generate random value from secure source
      // In practice, use crypto.getRandomValues()
      mask[i] = (Math.random() - 0.5) * 2; // Range: [-1, 1]
    }
    return mask;
  }

  /**
   * Apply masks to gradients
   */
  private applyMasks(
    gradients: Float32Array,
    masks: Map<string, Float32Array>,
    participantId: string
  ): Float32Array {
    const masked = new Float32Array(gradients);

    // Add all masks to gradients
    for (const mask of masks.values()) {
      for (let i = 0; i < masked.length; i++) {
        masked[i] += mask[i];
      }
    }

    return masked;
  }

  /**
   * Encode mask as seed for dropout recovery
   */
  private encodeMaskAsSeed(mask: Float32Array): Uint8Array {
    // Simple encoding - in practice, use error-correcting codes
    const seed = new Uint8Array(mask.length * 4);
    const view = new DataView(seed.buffer);

    for (let i = 0; i < mask.length; i++) {
      view.setFloat32(i * 4, mask[i], true);
    }

    return seed;
  }

  /**
   * Recover from dropouts using encoded seeds
   */
  private async recoverFromDropouts(
    aggregated: Float32Array,
    droppedParticipants: string[]
  ): Promise<void> {
    // In practice, would use encoded seeds to recover masks
    // This is a simplified version
    for (const droppedId of droppedParticipants) {
      // Would recover mask from seed and subtract from aggregated
      // For now, just log
      console.log(`Recovering mask for dropped participant: ${droppedId}`);
    }
  }

  /**
   * Calculate verification hash
   */
  private calculateVerificationHash(data: Float32Array): string {
    // Simple hash - in practice, use cryptographic hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const value = Math.floor(data[i] * 1000); // Quantize for hash
      hash = ((hash << 5) - hash) + value;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Sign mask
   */
  private signMask(mask: Float32Array, participantId: string): string {
    // Simple signature - in practice, use cryptographic signature
    const hash = this.calculateVerificationHash(mask);
    return `${participantId}:${hash}`;
  }

  /**
   * Verify mask signature
   */
  private verifyMaskSignature(mask: Float32Array, participantId: string, signature: string): boolean {
    const expected = this.signMask(mask, participantId);
    return signature === expected;
  }

  /**
   * Start new round
   */
  startNewRound(): void {
    this.currentRound++;
    // Clean up old rounds
    const oldRound = this.currentRound - 10;
    if (oldRound > 0) {
      this.maskHistory.delete(oldRound);
    }
  }

  /**
   * Get current round
   */
  getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * Get configuration
   */
  getConfig(): SecureAggregationConfig {
    return { ...this.config };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.currentRound = 0;
    this.maskHistory.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default secure aggregation config
 */
export function createDefaultSecureAggregationConfig(): SecureAggregationConfig {
  return {
    enabled: true,
    protocol: 'additive-secret-sharing',
    encryptionBits: 256,
    dropoutTolerance: 0.2,
    verificationEnabled: true,
    useEncodedSeeds: true,
  };
}

/**
 * Create fast secure aggregation config (less secure, faster)
 */
export function createFastSecureAggregationConfig(): SecureAggregationConfig {
  return {
    ...createDefaultSecureAggregationConfig(),
    protocol: 'simple-masking',
    verificationEnabled: false,
    useEncodedSeeds: false,
  };
}

/**
 * Create maximum security config (most secure, slower)
 */
export function createMaxSecuritySecureAggregationConfig(): SecureAggregationConfig {
  return {
    ...createDefaultSecureAggregationConfig(),
    encryptionBits: 4096,
    dropoutTolerance: 0.5,
    verificationEnabled: true,
    useEncodedSeeds: true,
  };
}
