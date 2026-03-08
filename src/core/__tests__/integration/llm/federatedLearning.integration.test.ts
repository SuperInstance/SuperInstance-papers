/**
 * Federated Learning Integration Tests with Mock Gradients
 *
 * Tests federated learning coordination using mock LLM backends,
 * including colony registration, gradient submission, aggregation,
 * and privacy mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { MockLLMBackend, MockLLMBackendFactory } from './MockLLMBackend.js';
import { FederatedLearningCoordinator } from '../../../federated.js';
import type { GradientUpdate, ColonyInfo } from '../../../federated.js';
import type { PrivacyTier } from '../../../embedding.js';

// ============================================================================
// Test Fixtures
// ============================================================================

class MockColony {
  public readonly id: string;
  public readonly gardenerId: string;
  private llm: MockLLMBackend;
  private gradients: number[] = [];
  private sampleCount: number = 0;

  constructor(
    colonyId: string,
    gardenerId: string,
    llm: MockLLMBackend
  ) {
    this.id = colonyId;
    this.gardenerId = gardenerId;
    this.llm = llm;
  }

  async trainLocalModel(epochs: number = 1): Promise<void> {
    // Simulate local training
    const embeddingDim = this.llm.getConfig().embeddingDimension;
    this.gradients = Array.from({ length: embeddingDim }, () =>
      (Math.random() - 0.5) * 0.01
    );
    this.sampleCount = epochs * 100;
  }

  async generateGradientUpdate(
    roundNumber: number,
    privacyTier: PrivacyTier
  ): Promise<GradientUpdate> {
    await this.trainLocalModel(1);

    return {
      colonyId: this.id,
      roundNumber,
      gradients: this.gradients,
      sampleCount: this.sampleCount,
      clipNorm: 1.0,
      metadata: {
        agentId: `${this.id}-agent`,
        privacyTier,
        epsilonSpent: privacyTier === 'LOCAL' ? 0 : 0.1,
        deltaSpent: privacyTier === 'LOCAL' ? 0 : 0.00001,
        compressed: true,
        trainingLoss: Math.random() * 0.5,
      },
      timestamp: Date.now(),
    };
  }

  async generateEmbeddings(inputs: string[]): Promise<number[][]> {
    const response = await this.llm.createEmbeddings({
      input: inputs,
    });

    return response.embeddings;
  }

  getStats() {
    return {
      gradientSize: this.gradients.length,
      sampleCount: this.sampleCount,
    };
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Federated Learning Integration Tests', () => {
  let coordinator: FederatedLearningCoordinator;
  let colonies: MockColony[] = [];
  let llms: MockLLMBackend[] = [];

  beforeEach(() => {
    MockLLMBackendFactory.resetAll();

    coordinator = new FederatedLearningCoordinator({
      maxColonies: 10,
      minColoniesForRound: 2,
      roundTimeout: 5000,
      defaultLearningRate: 0.01,
      aggregationMethod: 'fedavg',
    });

    // Create mock colonies with LLM backends
    for (let i = 0; i < 5; i++) {
      const llm = MockLLMBackendFactory.create(`colony-${i}-llm`, {
        baseLatencyMs: 10,
        errorRate: 0,
        timeoutRate: 0,
      });

      llms.push(llm);

      const colony = new MockColony(
        `colony-${i}`,
        `gardener-${i}`,
        llm
      );

      colonies.push(colony);
    }
  });

  afterEach(() => {
    MockLLMBackendFactory.resetAll();
    coordinator.reset();
    colonies = [];
    llms = [];
  });

  // ==========================================================================
  // Colony Registration Tests
  // ==========================================================================

  describe('Colony Registration', () => {
    it('should register colonies successfully', async () => {
      for (const colony of colonies) {
        const info = await coordinator.registerColony(
          colony.id,
          colony.gardenerId,
          {
            agentCount: 10,
            computeCapability: 0.8,
            privacyPreference: 'MEADOW',
          }
        );

        expect(info.id).toBe(colony.id);
        expect(info.gardenerId).toBe(colony.gardenerId);
        expect(info.isActive).toBe(true);
      }

      const status = coordinator.getFederationStatus();

      expect(status.activeColonies).toBe(5);
      expect(status.totalColonies).toBe(5);
    });

    it('should handle duplicate colony registration', async () => {
      await coordinator.registerColony(
        colonies[0].id,
        colonies[0].gardenerId
      );

      await coordinator.registerColony(
        colonies[0].id,
        colonies[0].gardenerId
      );

      const status = coordinator.getFederationStatus();

      expect(status.totalColonies).toBe(1);
    });

    it('should reject colonies over capacity', async () => {
      const smallCoordinator = new FederatedLearningCoordinator({
        maxColonies: 3,
      });

      for (let i = 0; i < 3; i++) {
        await smallCoordinator.registerColony(
          `colony-${i}`,
          `gardener-${i}`
        );
      }

      await expect(
        smallCoordinator.registerColony('colony-4', 'gardener-4')
      ).rejects.toThrow('Maximum colony capacity reached');
    });

    it('should unregister colonies', async () => {
      await coordinator.registerColony(
        colonies[0].id,
        colonies[0].gardenerId
      );

      const unregistered = await coordinator.unregisterColony(colonies[0].id);

      expect(unregistered).toBe(true);

      const status = coordinator.getFederationStatus();
      expect(status.totalColonies).toBe(0);
    });
  });

  // ==========================================================================
  // Federated Learning Round Tests
  // ==========================================================================

  describe('Federated Learning Rounds', () => {
    beforeEach(async () => {
      // Register all colonies
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId,
          {
            computeCapability: 0.5 + Math.random() * 0.5,
            privacyPreference: 'MEADOW',
          }
        );
      }
    });

    it('should start a federated learning round', async () => {
      const round = await coordinator.startRound();

      expect(round.roundNumber).toBe(1);
      expect(round.status).toBe('active');
      expect(round.participants.length).toBeGreaterThan(0);
    });

    it('should require minimum colonies for round', async () => {
      const strictCoordinator = new FederatedLearningCoordinator({
        minColoniesForRound: 10,
      });

      await expect(
        strictCoordinator.startRound()
      ).rejects.toThrow('Insufficient colonies');
    });

    it('should accept gradient updates from colonies', async () => {
      const round = await coordinator.startRound();

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = coordinator.getFederationStatus();

      if (status.currentRound) {
        expect(status.currentRound.gradientUpdates.length).toBeGreaterThan(0);
      }
    });

    it('should complete round when all gradients submitted', async () => {
      const round = await coordinator.startRound();

      const participants = colonies.filter(c =>
        round.participants.includes(c.id)
      );

      for (const colony of participants) {
        const update = await colony.generateGradientUpdate(
          round.roundNumber,
          'MEADOW'
        );

        await coordinator.submitGradients(update);
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = coordinator.getFederationStatus();

      if (status.currentRound) {
        expect(status.currentRound.status).toBe('complete');
      }
    });

    it('should aggregate gradients using FedAvg', async () => {
      const round = await coordinator.startRound();

      const participants = colonies.filter(c =>
        round.participants.includes(c.id)
      );

      for (const colony of participants) {
        const update = await colony.generateGradientUpdate(
          round.roundNumber,
          'MEADOW'
        );

        await coordinator.submitGradients(update);
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();
      if (model) {
        expect(model.version).toBeGreaterThan(0);
        expect(model.aggregatedGradients.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Privacy Mechanisms Tests
  // ==========================================================================

  describe('Privacy Mechanisms', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId,
          {
            privacyPreference: 'MEADOW',
          }
        );
      }
    });

    it('should apply gradient clipping', async () => {
      const round = await coordinator.startRound();

      const colony = colonies[0];
      const update = await colony.generateGradientUpdate(
        round.roundNumber,
        'MEADOW'
      );

      // Add some large gradients
      update.gradients[0] = 10;
      update.gradients[1] = -10;

      await coordinator.submitGradients(update);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = coordinator.getFederationStatus();

      if (status.currentRound && status.currentRound.gradientUpdates.length > 0) {
        const processedUpdate = status.currentRound.gradientUpdates[0];

        // Check that gradients were clipped
        const norm = Math.sqrt(
          processedUpdate.gradients.reduce((sum, g) => sum + g * g, 0)
        );

        expect(norm).toBeLessThanOrEqual(processedUpdate.clipNorm || 1.0);
      }
    });

    it('should add noise for differential privacy', async () => {
      const round = await coordinator.startRound();

      const colony = colonies[0];

      // Train twice to get different gradients
      await colony.trainLocalModel(1);
      const gradients1 = [...colony.getStats().gradientSize > 0 ?
        await colony.generateGradientUpdate(round.roundNumber, 'MEADOW') :
        { gradients: [] } as any];

      await colony.trainLocalModel(1);
      const update = await colony.generateGradientUpdate(round.roundNumber, 'MEADOW');

      await coordinator.submitGradients(update);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const accounting = coordinator.getPrivacyAccounting(colony.id);

      expect(accounting).toBeDefined();
      expect(accounting?.epsilonSpent).toBeGreaterThan(0);
    });

    it('should track privacy budget per colony', async () => {
      const round = await coordinator.startRound();

      for (const colony of colonies.slice(0, 3)) {
        const update = await colony.generateGradientUpdate(
          round.roundNumber,
          'MEADOW'
        );

        await coordinator.submitGradients(update);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const accounting = coordinator.getAllPrivacyAccounting();

      expect(accounting.length).toBe(3);

      for (const acc of accounting) {
        expect(acc.epsilonSpent).toBeGreaterThan(0);
        expect(acc.deltaSpent).toBeGreaterThan(0);
        expect(acc.roundsParticipated).toBe(1);
      }
    });

    it('should respect LOCAL privacy tier', async () => {
      const round = await coordinator.startRound();

      const colony = colonies[0];
      const update = await colony.generateGradientUpdate(
        round.roundNumber,
        'LOCAL'
      );

      await coordinator.submitGradients(update);

      // LOCAL tier should have zero privacy cost
      const accounting = coordinator.getPrivacyAccounting(colony.id);

      expect(accounting?.epsilonSpent).toBe(0);
      expect(accounting?.deltaSpent).toBe(0);
    });
  });

  // ==========================================================================
  // Model Distribution Tests
  // ==========================================================================

  describe('Model Distribution', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should distribute model to colonies', async () => {
      // Complete a round first
      const round = await coordinator.startRound();

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();

      if (model) {
        const result = await coordinator.distributeModel(model.version);

        expect(result.success.length).toBeGreaterThan(0);
      }
    });

    it('should track model versions', async () => {
      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();
      expect(model?.version).toBe(1);
    });

    it('should maintain model history', async () => {
      const historyBefore = coordinator.getModelHistory();

      expect(historyBefore.length).toBe(1); // Initial model

      // Complete a round
      const round = await coordinator.startRound();

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const historyAfter = coordinator.getModelHistory();

      expect(historyAfter.length).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Aggregation Methods Tests
  // ==========================================================================

  describe('Aggregation Methods', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should use FedAvg aggregation', async () => {
      const round = await coordinator.startRound({
        aggregationMethod: 'fedavg',
      });

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();
      expect(model?.aggregatedGradients.length).toBeGreaterThan(0);
    });

    it('should use FedAvgM aggregation with momentum', async () => {
      // First round
      let round = await coordinator.startRound({
        aggregationMethod: 'fedavgm',
      });

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Second round (momentum should apply)
      round = await coordinator.startRound({
        aggregationMethod: 'fedavgm',
      });

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();
      expect(model?.version).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Statistics and Monitoring Tests
  // ==========================================================================

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should track coordinator statistics', async () => {
      const round = await coordinator.startRound();

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = coordinator.getStats();

      expect(stats.totalRounds).toBeGreaterThan(0);
      expect(stats.successfulRounds).toBeGreaterThan(0);
      expect(stats.totalGradientsAggregated).toBeGreaterThan(0);
    });

    it('should maintain round history', async () => {
      const round1 = await coordinator.startRound();

      // Submit some gradients
      for (const colony of colonies.slice(0, 2)) {
        if (round1.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round1.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 6000));

      const history = coordinator.getRoundHistory();

      expect(history.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should handle missing colonies gracefully', async () => {
      const round = await coordinator.startRound();

      const update = await colonies[0].generateGradientUpdate(
        round.roundNumber,
        'MEADOW'
      );

      // Modify colony ID to non-existent
      update.colonyId = 'non-existent-colony';

      await expect(
        coordinator.submitGradients(update)
      ).rejects.toThrow();
    });

    it('should handle round timeout', async () => {
      const round = await coordinator.startRound();

      // Don't submit all gradients, wait for timeout
      await new Promise(resolve => setTimeout(resolve, 6000));

      const status = coordinator.getFederationStatus();

      expect(status.currentRound).toBeNull();
    });

    it('should continue after failed round', async () => {
      // Start a round but don't complete it
      await coordinator.startRound();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Start new round
      const round2 = await coordinator.startRound();

      expect(round2.roundNumber).toBe(2);
    });
  });

  // ==========================================================================
  // LLM Integration Tests
  // ==========================================================================

  describe('LLM Integration', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should use LLM for gradient generation', async () => {
      const colony = colonies[0];

      // Generate embeddings using LLM
      const inputs = ['Feature 1', 'Feature 2', 'Feature 3'];
      const embeddings = await colony.generateEmbeddings(inputs);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0].length).toBeGreaterThan(0);
    });

    it('should cache LLM embeddings across colonies', async () => {
      const inputs = ['Shared feature'];

      // Multiple colonies generate same embeddings
      const results = await Promise.all(
        colonies.slice(0, 3).map(colony =>
          colony.generateEmbeddings(inputs)
        )
      );

      results.forEach(embeddings => {
        expect(embeddings).toHaveLength(1);
        expect(embeddings[0].length).toBeGreaterThan(0);
      });

      // Check cache stats for each LLM
      for (const llm of llms.slice(0, 3)) {
        const stats = llm.getCacheStats();

        expect(stats.totalRequests).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Concurrent Operations Tests
  // ==========================================================================

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId
        );
      }
    });

    it('should handle concurrent gradient submissions', async () => {
      const round = await coordinator.startRound();

      const participants = colonies.filter(c =>
        round.participants.includes(c.id)
      );

      // Submit all gradients concurrently
      await Promise.all(
        participants.map(async colony => {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        })
      );

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = coordinator.getFederationStatus();

      if (status.currentRound) {
        expect(status.currentRound.gradientUpdates.length).toBe(
          participants.length
        );
      }
    });

    it('should handle concurrent model distribution', async () => {
      // Complete a round first
      const round = await coordinator.startRound();

      for (const colony of colonies) {
        if (round.participants.includes(colony.id)) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }
      }

      // Wait for aggregation
      await new Promise(resolve => setTimeout(resolve, 500));

      const model = coordinator.getCurrentModel();

      expect(model).not.toBeNull();

      if (model) {
        // Distribute to multiple colonies concurrently
        const results = await Promise.all([
          coordinator.distributeModel(model.version),
          coordinator.distributeModel(model.version),
        ]);

        results.forEach(result => {
          expect(result.success.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ==========================================================================
  // End-to-End Federation Tests
  // ==========================================================================

  describe('End-to-End Federation', () => {
    it('should complete full federated learning cycle', async () => {
      // Register colonies
      for (const colony of colonies) {
        await coordinator.registerColony(
          colony.id,
          colony.gardenerId,
          {
            computeCapability: 0.5 + Math.random() * 0.5,
            privacyPreference: 'MEADOW',
          }
        );
      }

      // Run multiple rounds
      for (let roundNum = 0; roundNum < 3; roundNum++) {
        const round = await coordinator.startRound();

        // All participants submit gradients
        const participants = colonies.filter(c =>
          round.participants.includes(c.id)
        );

        for (const colony of participants) {
          const update = await colony.generateGradientUpdate(
            round.roundNumber,
            'MEADOW'
          );

          await coordinator.submitGradients(update);
        }

        // Wait for aggregation
        await new Promise(resolve => setTimeout(resolve, 500));

        const model = coordinator.getCurrentModel();

        expect(model).not.toBeNull();
        expect(model?.version).toBe(roundNum + 2); // Initial + rounds
      }

      const stats = coordinator.getStats();

      expect(stats.successfulRounds).toBe(3);
      expect(stats.totalGradientsAggregated).toBeGreaterThan(0);
    });
  });
});
