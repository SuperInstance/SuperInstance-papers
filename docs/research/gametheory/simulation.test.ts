/**
 * POLLN Game Theory Simulation Tests
 *
 * Demonstrates usage of the game-theoretic mechanisms
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PeerPredictionScoring,
  ContributionCreditSystem,
  ReciprocalReputationSystem,
  BanditSelection,
  EigenTrustAlgorithm,
  ByzantineResilientAggregation
} from './mechanisms.js';

// ============================================================================
// PEER PREDICTION TESTS
// ============================================================================

describe('PeerPredictionScoring', () => {
  let peerPrediction: PeerPredictionScoring;

  beforeEach(() => {
    peerPrediction = new PeerPredictionScoring({
      scoringRule: 'BRIER',
      incentiveBudget: 100,
      minPeers: 3,
      correlationWeight: 0.5
    });
  });

  it('should assign higher scores for accurate reports', () => {
    const accurateReport = peerPrediction.reportQuality(
      'colony-1',
      'gradient-1',
      0.9,  // reported quality
      0.85  // actual quality
    );

    const inaccurateReport = peerPrediction.reportQuality(
      'colony-2',
      'gradient-1',
      0.1,  // reported quality
      0.85  // actual quality
    );

    expect(accurateReport).toBeGreaterThan(inaccurateReport);
  });

  it('should compute peer bonus based on correlation', () => {
    // Multiple colonies report similar qualities
    peerPrediction.reportQuality('colony-1', 'gradient-1', 0.8, 0.85);
    peerPrediction.reportQuality('colony-2', 'gradient-1', 0.9, 0.85);
    peerPrediction.reportQuality('colony-3', 'gradient-1', 0.85, 0.85);

    // Colony that deviates gets lower bonus
    peerPrediction.reportQuality('colony-4', 'gradient-1', 0.3, 0.85);

    const bonus1 = peerPrediction.computePeerBonus('colony-1', 'gradient-1');
    const bonus4 = peerPrediction.computePeerBonus('colony-4', 'gradient-1');

    expect(bonus1).toBeGreaterThan(bonus4);
  });

  it('should incentivize truthful reporting as dominant strategy', () => {
    const actualQualities = [0.3, 0.5, 0.7, 0.9];

    for (const actual of actualQualities) {
      // Truthful report
      const truthfulScore = peerPrediction.reportQuality(
        `colony-${actual}`,
        `gradient-${actual}`,
        actual,
        actual
      );

      // Exaggerated report
      const exaggeratedScore = peerPrediction.reportQuality(
        `colony-${actual}-exag`,
        `gradient-${actual}`,
        Math.min(1, actual + 0.3),
        actual
      );

      // Understated report
      const understatedScore = peerPrediction.reportQuality(
        `colony-${actual}-under`,
        `gradient-${actual}`,
        Math.max(0, actual - 0.3),
        actual
      );

      // Truthful reporting should maximize expected score
      expect(truthfulScore).toBeGreaterThanOrEqual(exaggeratedScore);
      expect(truthfulScore).toBeGreaterThanOrEqual(understatedScore);
    }
  });
});

// ============================================================================
// CONTRIBUTION CREDIT TOKEN TESTS
// ============================================================================

describe('ContributionCreditSystem', () => {
  let tokenSystem: ContributionCreditSystem;

  beforeEach(() => {
    tokenSystem = new ContributionCreditSystem({
      tokensPerSample: 1,
      qualityMultiplier: 10,
      baseRequirement: 100,
      decayRate: 0.01
    });
  });

  it('should allocate tokens based on quality-weighted samples', () => {
    const round: FederatedRoundInfo = {
      roundNumber: 1,
      modelVersion: 1,
      participants: ['colony-1', 'colony-2']
    };

    const update1: GradientUpdateInfo = {
      gradients: [0.1, 0.2, 0.3],
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    };

    const update2: GradientUpdateInfo = {
      gradients: [0.5, 0.6, 0.7],
      sampleCount: 100,
      trainingLoss: 1.0,  // Higher loss = lower quality
      timestamp: Date.now()
    };

    const tokens1 = tokenSystem.allocateTokens('colony-1', round, update1);
    const tokens2 = tokenSystem.allocateTokens('colony-2', round, update2);

    // Higher quality should get more tokens
    expect(tokens1).toBeGreaterThan(tokens2);
  });

  it('should prevent free-riding by requiring tokens for model access', () => {
    const balance = tokenSystem.getBalance('colony-1');
    expect(balance).toBeUndefined();

    // Try to access model without tokens
    const canAccess = tokenSystem.canAccessModel('colony-1', 1);
    expect(canAccess).toBe(false);

    // Earn tokens through contribution
    const round: FederatedRoundInfo = {
      roundNumber: 1,
      modelVersion: 1,
      participants: ['colony-1']
    };

    const update: GradientUpdateInfo = {
      gradients: [0.1, 0.2, 0.3],
      sampleCount: 150,  // Enough to meet base requirement
      trainingLoss: 0.5,
      timestamp: Date.now()
    };

    tokenSystem.allocateTokens('colony-1', round, update);

    // Now should be able to access model
    const canAccessNow = tokenSystem.canAccessModel('colony-1', 1);
    expect(canAccessNow).toBe(true);
  });

  it('should apply decay to prevent token hoarding', () => {
    const round: FederatedRoundInfo = {
      roundNumber: 1,
      modelVersion: 1,
      participants: ['colony-1']
    };

    const update: GradientUpdateInfo = {
      gradients: [0.1, 0.2, 0.3],
      sampleCount: 1000,
      trainingLoss: 0.5,
      timestamp: Date.now()
    };

    tokenSystem.allocateTokens('colony-1', round, update);

    const balanceBefore = tokenSystem.getBalance('colony-1');
    expect(balanceBefore?.balance).toBeGreaterThan(0);

    // Apply decay
    tokenSystem.applyDecay();

    const balanceAfter = tokenSystem.getBalance('colony-1');
    expect(balanceAfter?.balance).toBeLessThan(balanceBefore!.balance);
  });

  it('should track token transactions', () => {
    const round: FederatedRoundInfo = {
      roundNumber: 1,
      modelVersion: 1,
      participants: ['colony-1']
    };

    const update: GradientUpdateInfo = {
      gradients: [0.1, 0.2, 0.3],
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    };

    tokenSystem.allocateTokens('colony-1', round, update);
    tokenSystem.redeemTokens('colony-1', 1, 50);

    const history = tokenSystem.getHistory('colony-1');

    expect(history).toHaveLength(2);
    expect(history[0].type).toBe('EARNED');
    expect(history[1].type).toBe('SPENT');
  });
});

// ============================================================================
// RECIPROCAL REPUTATION TESTS
// ============================================================================

describe('ReciprocalReputationSystem', () => {
  let reputationSystem: ReciprocalReputationSystem;

  beforeEach(() => {
    reputationSystem = new ReciprocalReputationSystem({
      minAccessRatio: 0.5,
      decayFactor: 0.95,
      updateWindow: 86400000,
      gracePeriod: 3
    });
  });

  it('should track sharing and consuming', () => {
    reputationSystem.recordShare('colony-1', 'grain-1');
    reputationSystem.recordShare('colony-1', 'grain-2');
    reputationSystem.recordConsume('colony-1', 'grain-3');

    const ratio = reputationSystem.getRatio('colony-1');

    expect(ratio?.grainsShared).toBe(2);
    expect(ratio?.grainsConsumed).toBe(1);
  });

  it('should compute reciprocity score', () => {
    // Colony that shares more than it consumes
    reputationSystem.recordShare('colony-1', 'grain-1');
    reputationSystem.recordShare('colony-1', 'grain-2');
    reputationSystem.recordConsume('colony-1', 'grain-3');

    const ratio1 = reputationSystem.getRatio('colony-1');
    expect(ratio1?.reciprocityScore).toBeGreaterThan(0.5);

    // Colony that consumes more than it shares
    reputationSystem.recordShare('colony-2', 'grain-4');
    reputationSystem.recordConsume('colony-2', 'grain-5');
    reputationSystem.recordConsume('colony-2', 'grain-6');
    reputationSystem.recordConsume('colony-2', 'grain-7');

    const ratio2 = reputationSystem.getRatio('colony-2');
    expect(ratio2?.reciprocityScore).toBeLessThan(0.5);
  });

  it('should restrict access based on reciprocity', () => {
    // Free rider: only consumes, never shares
    reputationSystem.recordConsume('colony-1', 'grain-1');
    reputationSystem.recordConsume('colony-1', 'grain-2');
    reputationSystem.recordConsume('colony-1', 'grain-3');
    reputationSystem.recordConsume('colony-1', 'grain-4');

    const restrictedGrain: SharedPollenGrainInfo = {
      id: 'grain-5',
      restrictionLevel: 'RESTRICTED',
      communityId: 'community-1',
      sharedBy: 'colony-2'
    };

    const result = reputationSystem.canAccessGrain('colony-1', restrictedGrain);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('below required');
  });

  it('should allow grace period for new colonies', () => {
    // New colony hasn't shared anything yet
    const grain: SharedPollenGrainInfo = {
      id: 'grain-1',
      restrictionLevel: 'RESTRICTED',
      communityId: 'community-1',
      sharedBy: 'colony-2'
    };

    // First few consumes should be allowed
    for (let i = 0; i < 3; i++) {
      const result = reputationSystem.canAccessGrain('colony-1', grain);
      expect(result.allowed).toBe(true);
      reputationSystem.recordConsume('colony-1', `grain-${i}`);
    }

    // After grace period, should be restricted
    const result = reputationSystem.canAccessGrain('colony-1', grain);
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// BANDIT SELECTION TESTS
// ============================================================================

describe('BanditSelection', () => {
  let bandit: BanditSelection;

  beforeEach(() => {
    bandit = new BanditSelection({
      alpha: 1,
      beta: 1,
      minPulls: 5
    });
  });

  it('should explore all agents initially', () => {
    const proposals: AgentProposalBandit[] = [
      { agentId: 'agent-1', confidence: 0.5 },
      { agentId: 'agent-2', confidence: 0.6 },
      { agentId: 'agent-3', confidence: 0.7 }
    ];

    const selections = new Set<string>();

    // Make 100 selections
    for (let i = 0; i < 100; i++) {
      const selected = bandit.selectAgent(proposals);
      selections.add(selected);
    }

    // Should have selected all agents at least once
    expect(selections.size).toBe(3);
  });

  it('should exploit best agents over time', () => {
    const proposals: AgentProposalBandit[] = [
      { agentId: 'agent-1', confidence: 0.5 },
      { agentId: 'agent-2', confidence: 0.6 },
      { agentId: 'agent-3', confidence: 0.7 }
    ];

    // Train agent-1 to be good
    for (let i = 0; i < 50; i++) {
      const selected = bandit.selectAgent(proposals);
      if (selected === 'agent-1') {
        bandit.updateReward('agent-1', 1);
      } else {
        bandit.updateReward(selected, -0.5);
      }
    }

    // Now agent-1 should be selected more often
    const selections: Record<string, number> = {
      'agent-1': 0,
      'agent-2': 0,
      'agent-3': 0
    };

    for (let i = 0; i < 100; i++) {
      const selected = bandit.selectAgent(proposals);
      selections[selected]++;
    }

    expect(selections['agent-1']).toBeGreaterThan(selections['agent-2']);
    expect(selections['agent-1']).toBeGreaterThan(selections['agent-3']);
  });

  it('should compute success probabilities', () => {
    const proposals: AgentProposalBandit[] = [
      { agentId: 'agent-1', confidence: 0.5 },
      { agentId: 'agent-2', confidence: 0.6 }
    ];

    // Give agent-1 more successes
    for (let i = 0; i < 20; i++) {
      bandit.selectAgent(proposals);
      bandit.updateReward('agent-1', 1);
      bandit.updateReward('agent-2', 0);
    }

    const probs = bandit.getSuccessProbabilities();

    expect(probs.get('agent-1')! ).toBeGreaterThan(probs.get('agent-2')!);
  });
});

// ============================================================================
// EIGENTRUST TESTS
// ============================================================================

describe('EigenTrustAlgorithm', () => {
  let eigenTrust: EigenTrustAlgorithm;

  beforeEach(() => {
    eigenTrust = new EigenTrustAlgorithm({
      iterations: 100,
      convergenceThreshold: 1e-6,
      alpha: 0.5,
      decay: 0.99
    });
  });

  it('should compute global reputation from local trust', () => {
    // Set up local trust scores
    eigenTrust.setLocalTrust('colony-1', 'colony-2', 0.8);
    eigenTrust.setLocalTrust('colony-1', 'colony-3', 0.6);
    eigenTrust.setLocalTrust('colony-2', 'colony-3', 0.9);
    eigenTrust.setLocalTrust('colony-2', 'colony-1', 0.7);
    eigenTrust.setLocalTrust('colony-3', 'colony-1', 0.5);
    eigenTrust.setLocalTrust('colony-3', 'colony-2', 0.8);

    const reputation = eigenTrust.computeGlobalReputation();

    // Colony-2 and colony-3 should have higher reputation (more trusted)
    expect(reputation.size).toBe(3);

    // Reputations should sum to 1 (probability distribution)
    const sum = Array.from(reputation.values()).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it('should give higher reputation to well-trusted nodes', () => {
    // Colony-1 is trusted by everyone
    eigenTrust.setLocalTrust('colony-2', 'colony-1', 0.9);
    eigenTrust.setLocalTrust('colony-3', 'colony-1', 0.9);
    eigenTrust.setLocalTrust('colony-4', 'colony-1', 0.9);

    // Colony-2 is barely trusted
    eigenTrust.setLocalTrust('colony-1', 'colony-2', 0.1);
    eigenTrust.setLocalTrust('colony-3', 'colony-2', 0.1);
    eigenTrust.setLocalTrust('colony-4', 'colony-2', 0.1);

    const reputation = eigenTrust.computeGlobalReputation();

    expect(reputation.get('colony-1')! ).toBeGreaterThan(reputation.get('colony-2')!);
  });

  it('should converge to stable reputation scores', () => {
    eigenTrust.setLocalTrust('colony-1', 'colony-2', 0.8);
    eigenTrust.setLocalTrust('colony-2', 'colony-3', 0.8);
    eigenTrust.setLocalTrust('colony-3', 'colony-1', 0.8);

    const rep1 = eigenTrust.computeGlobalReputation();
    const rep2 = eigenTrust.computeGlobalReputation();

    // Should converge to same values
    for (const [id, score] of rep1) {
      expect(score).toBeCloseTo(rep2.get(id)!, 6);
    }
  });
});

// ============================================================================
// BYZANTINE RESILIENT AGGREGATION TESTS
// ============================================================================

describe('ByzantineResilientAggregation', () => {
  let aggregation: ByzantineResilientAggregation;

  beforeEach(() => {
    aggregation = new ByzantineResilientAggregation({
      k: 1,
      f: 1,
      method: 'KRUM'
    });
  });

  it('should detect and reject malicious updates', () => {
    const updates: GradientUpdateInfo[] = [
      {
        gradients: [1, 2, 3],
        sampleCount: 100,
        trainingLoss: 0.5,
        timestamp: Date.now()
      },
      {
        gradients: [1.1, 2.1, 3.1],  // Similar to first
        sampleCount: 100,
        trainingLoss: 0.5,
        timestamp: Date.now()
      },
      {
        gradients: [100, 200, 300],  // Malicious (very different)
        sampleCount: 100,
        trainingLoss: 0.5,
        timestamp: Date.now()
      }
    ];

    const result = aggregation.aggregate(updates);

    // Should select one of the similar updates, not the malicious one
    const distanceToFirst = Math.sqrt(
      Math.pow(result[0] - 1, 2) +
      Math.pow(result[1] - 2, 2) +
      Math.pow(result[2] - 3, 2)
    );

    const distanceToMalicious = Math.sqrt(
      Math.pow(result[0] - 100, 2) +
      Math.pow(result[1] - 200, 2) +
      Math.pow(result[2] - 300, 2)
    );

    expect(distanceToFirst).toBeLessThan(distanceToMalicious);
  });

  it('should tolerate multiple Byzantine agents', () => {
    aggregation.setByzantineCount(2);
    aggregation.setMethod('MULTI_KRUM');

    const updates: GradientUpdateInfo[] = [
      { gradients: [1, 2, 3], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [1.1, 2.1, 3.1], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [0.9, 1.9, 2.9], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [100, 200, 300], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [-100, -200, -300], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() }
    ];

    const result = aggregation.aggregate(updates);

    // Result should be close to the honest updates (around [1, 2, 3])
    expect(result[0]).toBeGreaterThan(0);
    expect(result[0]).toBeLessThan(10);
    expect(result[1]).toBeGreaterThan(0);
    expect(result[1]).toBeLessThan(10);
    expect(result[2]).toBeGreaterThan(0);
    expect(result[2]).toBeLessThan(10);
  });

  it('should use trimmed mean to remove outliers', () => {
    aggregation.setMethod('TRIMMED_MEAN');
    aggregation.setByzantineCount(1);

    const updates: GradientUpdateInfo[] = [
      { gradients: [1, 2, 3], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [1.1, 2.1, 3.1], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [0.9, 1.9, 2.9], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() },
      { gradients: [100, 200, 300], sampleCount: 100, trainingLoss: 0.5, timestamp: Date.now() }
    ];

    const result = aggregation.aggregate(updates);

    // Trimmed mean should exclude the outlier
    expect(result[0]).toBeCloseTo(1, 0);
    expect(result[1]).toBeCloseTo(2, 0);
    expect(result[2]).toBeCloseTo(3, 0);
  });
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FederatedRoundInfo {
  roundNumber: number;
  modelVersion: number;
  participants: string[];
}

interface GradientUpdateInfo {
  gradients: number[];
  sampleCount: number;
  trainingLoss: number;
  timestamp: number;
}

interface SharedPollenGrainInfo {
  id: string;
  restrictionLevel: string;
  communityId: string;
  sharedBy: string;
}

interface AgentProposalBandit {
  agentId: string;
  confidence: number;
  bid?: number;
}
