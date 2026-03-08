/**
 * POLLN Advanced Federation Tests
 * Pattern-Organized Large Language Network
 *
 * Comprehensive tests for advanced federated learning protocols.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import strategies
import {
  FederatedAveraging,
  FederatedProximal,
  AsynchronousFederated,
  AdaptiveFederated,
  createDefaultFedAvgConfig,
  createDefaultFedProxConfig,
  createDefaultAsyncFedConfig,
  createDefaultAdaptiveFedConfig,
} from '../strategies/index.js';

// Import privacy
import {
  DifferentialPrivacy,
  SecureAggregation,
  createDefaultDPConfig,
  createDefaultSecureAggregationConfig,
} from '../privacy/index.js';

// Import fault tolerance
import {
  ByzantineResilience,
  CheckpointManager,
  createDefaultByzantineConfig,
  createDefaultCheckpointConfig,
} from '../fault/index.js';

// Import types
import type { ParticipantUpdate } from '../types.js';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockGradients(dim: number, seed: number = 0): Float32Array {
  const gradients = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    gradients[i] = Math.sin(seed + i) * 0.1;
  }
  return gradients;
}

function createMockUpdate(
  participantId: string,
  dim: number,
  sampleCount: number = 100,
  loss: number = 0.5
): ParticipantUpdate {
  return {
    participantId,
    gradients: createMockGradients(dim, participantId.length),
    sampleCount,
    loss,
    metadata: {
      latency: Math.random() * 1000,
    },
  };
}

// ============================================================================
// Aggregation Strategy Tests
// ============================================================================

describe('FederatedAveraging', () => {
  let strategy: FederatedAveraging;
  const dim = 100;

  beforeEach(() => {
    strategy = new FederatedAveraging(createDefaultFedAvgConfig());
    strategy.initializeModel(new Float32Array(dim));
  });

  it('should initialize model correctly', () => {
    const state = strategy.getState();
    expect(state.globalModel).toHaveLength(dim);
    expect(state.globalRound).toBe(0);
  });

  it('should select participants correctly', () => {
    const participants = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const selected = strategy.selectParticipants(participants);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(participants.length);
  });

  it('should aggregate updates correctly', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
      createMockUpdate('p3', dim, 120, 0.45),
    ];

    const result = await strategy.aggregateUpdates(updates);

    expect(result.aggregatedModel).toHaveLength(dim);
    expect(result.participantCount).toBe(3);
    expect(result.totalSamples).toBe(370);
    expect(result.hasConverged).toBe(false);
  });

  it('should handle weighted aggregation', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 200, 0.4), // Larger sample count
    ];

    const result = await strategy.aggregateUpdates(updates);
    expect(result.participantCount).toBe(2);
    expect(result.totalSamples).toBe(300);
  });

  it('should track convergence metrics', () => {
    const metrics = strategy.getConvergenceMetrics();
    expect(metrics.currentRound).toBe(0);
    expect(metrics.hasConverged).toBe(false);
  });
});

describe('FederatedProximal', () => {
  let strategy: FederatedProximal;
  const dim = 100;

  beforeEach(() => {
    strategy = new FederatedProximal(createDefaultFedProxConfig());
    strategy.initializeModel(new Float32Array(dim));
  });

  it('should initialize with proximal term', () => {
    const config = strategy.getConfig();
    expect(config.mu).toBeGreaterThan(0);
  });

  it('should aggregate with proximal term', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
    ];

    const result = await strategy.aggregateUpdates(updates);

    expect(result.aggregatedModel).toHaveLength(dim);
    expect(result.metadata?.mu).toBeDefined();
  });

  it('should handle stragglers', async () => {
    const now = Date.now();
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
      createMockUpdate('p3', dim, 120, 0.45), // Add third participant
    ];

    // Mark one as straggler (but keep enough participants)
    updates[1].metadata = {
      ...updates[1].metadata,
      timestamp: now - 400000, // 400 seconds ago (straggler)
    };

    const result = await strategy.aggregateUpdates(updates);

    // Should handle straggler based on configuration
    expect(result.participantCount).toBeGreaterThan(0);
  });
});

describe('AsynchronousFederated', () => {
  let strategy: AsynchronousFederated;
  const dim = 100;

  beforeEach(() => {
    strategy = new AsynchronousFederated(createDefaultAsyncFedConfig());
    strategy.initializeModel(new Float32Array(dim));
  });

  it('should buffer updates', () => {
    const update = createMockUpdate('p1', dim, 100, 0.5);
    strategy.addUpdateToBuffer(update);

    const bufferStatus = strategy.getBufferStatus();
    expect(bufferStatus.bufferSize).toBe(1);
  });

  it('should aggregate buffered updates', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
      createMockUpdate('p3', dim, 120, 0.45),
    ];

    // Add all to buffer
    for (const update of updates) {
      strategy.addUpdateToBuffer(update);
    }

    const result = await strategy.aggregateUpdates([]);

    expect(result.aggregatedModel).toHaveLength(dim);
    expect(result.participantCount).toBeGreaterThan(0);
  });

  it('should handle staleness', async () => {
    const update = createMockUpdate('p1', dim, 100, 0.5);
    update.metadata = {
      ...update.metadata,
      version: 0, // Old version (stale)
    };

    strategy.addUpdateToBuffer(update);

    const bufferStatus = strategy.getBufferStatus();
    expect(bufferStatus.bufferSize).toBe(1);
  });
});

describe('AdaptiveFederated', () => {
  let strategy: AdaptiveFederated;
  const dim = 100;

  beforeEach(() => {
    strategy = new AdaptiveFederated(createDefaultAdaptiveFedConfig());
    strategy.initializeModel(new Float32Array(dim));
  });

  it('should calculate quality scores', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.3), // Better loss
      createMockUpdate('p2', dim, 150, 0.7), // Worse loss
    ];

    const result = await strategy.aggregateUpdates(updates);

    expect(result.aggregatedModel).toHaveLength(dim);
    expect(result.metadata?.avgQuality).toBeGreaterThan(0);
  });

  it('should adapt learning rate', async () => {
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
    ];

    const result = await strategy.aggregateUpdates(updates);

    expect(result.metadata?.learningRate).toBeDefined();
    expect(result.metadata?.learningRate).toBeGreaterThan(0);
  });

  it('should select participants based on quality', () => {
    const participants = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const selected = strategy.selectParticipants(participants);

    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(participants.length);
  });
});

// ============================================================================
// Privacy Tests
// ============================================================================

describe('DifferentialPrivacy', () => {
  let dp: DifferentialPrivacy;
  const dim = 100;

  beforeEach(() => {
    dp = new DifferentialPrivacy(createDefaultDPConfig());
  });

  it('should clip gradients', () => {
    const gradients = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      gradients[i] = 10.0; // Large gradients
    }

    const clipped = dp.clipGradients(gradients);

    expect(clipped.wasClipped).toBe(true);
    expect(clipped.clippedNorm).toBeLessThanOrEqual(dp.getConfig().gradientClipNorm);
  });

  it('should add noise for differential privacy', () => {
    const gradients = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      gradients[i] = Math.random() * 0.1;
    }

    const result = dp.applyPrivacy('participant1', gradients, 100);

    expect(result.gradients).toHaveLength(dim);
    expect(result.epsilonUsed).toBeGreaterThan(0);
    expect(result.noiseMagnitude).toBeGreaterThan(0);
  });

  it('should track privacy accounting', () => {
    const gradients = new Float32Array(dim).fill(0.1);

    dp.applyPrivacy('p1', gradients, 100);
    dp.applyPrivacy('p1', gradients, 100);

    const accountant = dp.getPrivacyAccountant('p1');
    expect(accountant).toBeDefined();
    expect(accountant?.roundsParticipated).toBe(2);
    expect(accountant?.epsilonSpent).toBeGreaterThan(0);
  });

  it('should check privacy budget', () => {
    const hasBudget = dp.hasPrivacyBudget('p1', 10.0);
    expect(hasBudget).toBe(true);

    // Use some budget
    const gradients = new Float32Array(10).fill(0.1);
    for (let i = 0; i < 20; i++) {
      dp.applyPrivacy('p1', gradients, 100);
    }

    const remaining = dp.getRemainingBudget('p1', 10.0);
    expect(remaining).toBeLessThan(10.0);
  });
});

describe('SecureAggregation', () => {
  let secagg: SecureAggregation;
  const dim = 100;

  beforeEach(() => {
    secagg = new SecureAggregation(createDefaultSecureAggregationConfig());
  });

  it('should create masks for gradients', async () => {
    const gradients = createMockGradients(dim);
    const otherParticipants = ['p2', 'p3', 'p4'];

    const masked = await secagg.createMasks('p1', gradients, otherParticipants);

    expect(masked.maskedGradients).toHaveLength(dim);
    expect(masked.masks.size).toBeGreaterThan(0);
  });

  it('should aggregate masked gradients', async () => {
    const updates: Array<{
      participantId: string;
      maskedGradients: Float32Array;
      masks: Map<string, Float32Array>;
      verificationHash?: string;
    }> = [];

    for (let i = 1; i <= 3; i++) {
      const gradients = createMockGradients(dim, i);
      const masked = await secagg.createMasks(`p${i}`, gradients, ['p1', 'p2', 'p3']);
      updates.push(masked);
    }

    const result = await secagg.aggregateMaskedGradients(updates);

    expect(result.aggregated).toHaveLength(dim);
    expect(result.droppedParticipants).toBeDefined();
  });
});

// ============================================================================
// Fault Tolerance Tests
// ============================================================================

describe('ByzantineResilience', () => {
  let resilience: ByzantineResilience;
  const dim = 100;

  beforeEach(() => {
    resilience = new ByzantineResilience(createDefaultByzantineConfig());
  });

  it('should detect Byzantine participants', () => {
    const updates = new Map<string, Float32Array>();
    updates.set('p1', createMockGradients(dim, 1));
    updates.set('p2', createMockGradients(dim, 2));
    updates.set('p3', createMockGradients(dim, 3));

    // Add a Byzantine participant (very different gradients)
    const byzantineGradients = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      byzantineGradients[i] = 1000.0; // Extremely large values to trigger detection
    }
    updates.set('byzantine', byzantineGradients);

    const detections = resilience.detectByzantine(updates);

    expect(detections.length).toBeGreaterThan(0);
    const byzantineDetection = detections.find(d => d.participantId === 'byzantine');
    // Check that the byzantine participant has a high score (outlier)
    expect(byzantineDetection?.score).toBeGreaterThan(0);
  });

  it('should perform robust aggregation', () => {
    const updates = new Map<string, Float32Array>();
    updates.set('p1', createMockGradients(dim, 1));
    updates.set('p2', createMockGradients(dim, 2));
    updates.set('p3', createMockGradients(dim, 3));

    const result = resilience.robustAggregate(updates);

    expect(result.aggregatedGradients).toHaveLength(dim);
    expect(result.removedParticipants).toBeDefined();
  });
});

describe('CheckpointManager', () => {
  let manager: CheckpointManager;
  const dim = 100;

  beforeEach(() => {
    manager = new CheckpointManager(createDefaultCheckpointConfig());
  });

  it('should create checkpoints', async () => {
    const model = createMockGradients(dim);

    // Create checkpoints at rounds that meet the interval requirement
    let checkpoint = await manager.createCheckpoint(
      5, // Round 5 (meets interval of 5)
      model,
      undefined,
      undefined,
      { loss: 0.5, qualityScore: 0.8, participantCount: 5 }
    );

    expect(checkpoint).toBeDefined();
    expect(checkpoint?.roundNumber).toBe(5);
    expect(checkpoint?.globalModel).toHaveLength(dim);
  });

  it('should rollback to checkpoint', async () => {
    const model = createMockGradients(dim);

    // Create checkpoint at round 5
    await manager.createCheckpoint(
      5,
      model,
      undefined,
      undefined,
      { loss: 0.5, qualityScore: 0.8, participantCount: 5 }
    );

    const restored = await manager.rollbackToLatest();

    expect(restored).toBeDefined();
    expect(restored?.roundNumber).toBe(5);
  });

  it('should evaluate rollback decisions', async () => {
    const model = createMockGradients(dim);

    // Create checkpoint at round 5
    await manager.createCheckpoint(
      5,
      model,
      undefined,
      undefined,
      { loss: 0.5, qualityScore: 0.8, participantCount: 5 }
    );

    // Current metrics are worse
    const decision = await manager.evaluateRollback({
      loss: 1.0, // Much higher loss (100% increase > 50% threshold)
      qualityScore: 0.5,
      byzantineRatio: 0.0,
    });

    expect(decision.shouldRollback).toBe(true);
    expect(decision.targetCheckpoint).toBeDefined();
  });

  it('should get checkpoint statistics', async () => {
    const model = createMockGradients(dim);

    // Create checkpoints at rounds 5, 10, 15
    await manager.createCheckpoint(5, model);
    await manager.createCheckpoint(10, model);
    await manager.createCheckpoint(15, model);

    const stats = manager.getStats();

    expect(stats.totalCheckpoints).toBe(3);
    expect(stats.oldestRound).toBe(5);
    expect(stats.newestRound).toBe(15);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Federation Integration', () => {
  it('should combine strategies with privacy and fault tolerance', async () => {
    const dim = 100;

    // Initialize components
    const strategy = new FederatedAveraging(createDefaultFedAvgConfig());
    const dp = new DifferentialPrivacy(createDefaultDPConfig());
    const resilience = new ByzantineResilience(createDefaultByzantineConfig());

    strategy.initializeModel(new Float32Array(dim));

    // Create updates
    const updates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 0.5),
      createMockUpdate('p2', dim, 150, 0.4),
      createMockUpdate('p3', dim, 120, 0.45),
    ];

    // Apply differential privacy
    const privateUpdates = updates.map(update => {
      const result = dp.applyPrivacy(update.participantId, update.gradients, update.sampleCount);
      return {
        ...update,
        gradients: result.gradients,
      };
    });

    // Check for Byzantine participants
    const updatesMap = new Map(privateUpdates.map(u => [u.participantId, u.gradients]));
    const detections = resilience.detectByzantine(updatesMap);

    // Filter out Byzantine participants
    const cleanUpdates = privateUpdates.filter(
      u => !detections.find(d => d.isByzantine && d.participantId === u.participantId)
    );

    // Aggregate
    const result = await strategy.aggregateUpdates(cleanUpdates);

    expect(result.aggregatedModel).toHaveLength(dim);
    expect(result.participantCount).toBeGreaterThan(0);
  });

  it('should handle checkpoint rollback during training', async () => {
    const dim = 100;

    const strategy = new FederatedAveraging(createDefaultFedAvgConfig());
    const checkpointManager = new CheckpointManager(createDefaultCheckpointConfig());

    strategy.initializeModel(new Float32Array(dim));

    // Train for a few rounds with checkpoints
    for (let round = 1; round <= 5; round++) {
      const updates: ParticipantUpdate[] = [
        createMockUpdate('p1', dim, 100, 0.5 - round * 0.05),
        createMockUpdate('p2', dim, 150, 0.4 - round * 0.05),
      ];

      const result = await strategy.aggregateUpdates(updates);

      // Create checkpoint
      await checkpointManager.createCheckpoint(
        round,
        result.aggregatedModel,
        undefined,
        undefined,
        {
          loss: result.weightedLoss,
          qualityScore: 1 - result.weightedLoss,
          participantCount: result.participantCount,
        }
      );
    }

    // Simulate bad round
    const badUpdates: ParticipantUpdate[] = [
      createMockUpdate('p1', dim, 100, 2.0), // High loss
      createMockUpdate('p2', dim, 150, 1.8),
    ];

    const badResult = await strategy.aggregateUpdates(badUpdates);

    // Check if rollback is needed
    const decision = await checkpointManager.evaluateRollback({
      loss: badResult.weightedLoss,
      qualityScore: 1 - badResult.weightedLoss,
      byzantineRatio: 0.0,
    });

    expect(decision.shouldRollback).toBe(true);
    expect(decision.reason).toContain('Loss increased');
  });
});
