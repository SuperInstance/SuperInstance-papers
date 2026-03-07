/**
 * POLLN Federated Learning Coordinator Tests
 */

import { FederatedLearningCoordinator, GradientUpdate, PrivacyAccounting } from '../federated.js';
import { BES, PrivacyTier } from '../embedding.js';

describe('FederatedLearningCoordinator', () => {
  let coordinator: FederatedLearningCoordinator;
  let bes: BES;

  beforeEach(() => {
    bes = new BES({
      defaultDimensionality: 512,
      defaultPrivacyTier: 'MEADOW',
    });

    coordinator = new FederatedLearningCoordinator(
      {
        maxColonies: 10,
        colonyTimeout: 3600000,
        minColoniesForRound: 2,
        defaultLearningRate: 0.01,
        defaultClipThreshold: 1.0,
        roundTimeout: 5000,
        maxRoundsPerDay: 100,
        defaultPrivacyTier: 'MEADOW',
        enableSecureAggregation: true,
        noiseDistribution: 'gaussian',
        maxModelVersions: 5,
        compressionEnabled: true,
        aggregationMethod: 'fedavg',
        participantSelection: 'all',
      },
      bes
    );
  });

  describe('Federation Management', () => {
    describe('Colony Registration', () => {
      it('should register a new colony', async () => {
        const colony = await coordinator.registerColony(
          'colony-1',
          'gardener-1'
        );

        expect(colony.id).toBe('colony-1');
        expect(colony.gardenerId).toBe('gardener-1');
        expect(colony.isActive).toBe(true);
        expect(colony.agentCount).toBe(1);
      });

      it('should register colonies with options', async () => {
        const colony = await coordinator.registerColony(
          'colony-1',
          'gardener-1',
          {
            agentCount: 5,
            computeCapability: 0.8,
            privacyPreference: 'RESEARCH',
          }
        );

        expect(colony.agentCount).toBe(5);
        expect(colony.computeCapability).toBe(0.8);
        expect(colony.privacyPreference).toBe('RESEARCH');
      });

      it('should not duplicate colonies', async () => {
        await coordinator.registerColony('colony-1', 'gardener-1');
        await coordinator.registerColony('colony-1', 'gardener-1');

        const colonies = coordinator.getColonies();
        expect(colonies.length).toBe(1);
      });

      it('should update last active on re-registration', async () => {
        const colony1 = await coordinator.registerColony('colony-1', 'gardener-1');
        const originalActive = colony1.lastActive;

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));

        const colony2 = await coordinator.registerColony('colony-1', 'gardener-1');
        expect(colony2.lastActive).toBeGreaterThan(originalActive);
      });

      it('should enforce max colony capacity', async () => {
        // Register max colonies
        for (let i = 0; i < 10; i++) {
          await coordinator.registerColony(`colony-${i}`, `gardener-${i}`);
        }

        // Try to register one more
        await expect(
          coordinator.registerColony('colony-10', 'gardener-10')
        ).rejects.toThrow('Maximum colony capacity reached');
      });

      it('should unregister colonies', async () => {
        await coordinator.registerColony('colony-1', 'gardener-1');
        const result = await coordinator.unregisterColony('colony-1');

        expect(result).toBe(true);
        expect(coordinator.getColonies().length).toBe(0);
      });

      it('should return false when unregistering non-existent colony', async () => {
        const result = await coordinator.unregisterColony('non-existent');
        expect(result).toBe(false);
      });

      it('should emit colony_registered event', (done) => {
        coordinator.on('colony_registered', (colony) => {
          expect(colony.id).toBe('colony-1');
          done();
        });

        coordinator.registerColony('colony-1', 'gardener-1');
      });

      it('should emit colony_unregistered event', (done) => {
        coordinator.registerColony('colony-1', 'gardener-1').then(() => {
          coordinator.on('colony_unregistered', (data) => {
            expect(data.colonyId).toBe('colony-1');
            done();
          });

          coordinator.unregisterColony('colony-1');
        });
      });
    });

    describe('Federation Status', () => {
      it('should return correct status', async () => {
        await coordinator.registerColony('colony-1', 'gardener-1');
        await coordinator.registerColony('colony-2', 'gardener-2');

        const status = coordinator.getFederationStatus();

        expect(status.activeColonies).toBe(2);
        expect(status.totalColonies).toBe(2);
        expect(status.globalRound).toBe(0);
        expect(status.currentModel).toBeDefined();
      });

      it('should count only active colonies', async () => {
        await coordinator.registerColony('colony-1', 'gardener-1');
        await coordinator.registerColony('colony-2', 'gardener-2');
        await coordinator.unregisterColony('colony-1');

        const status = coordinator.getFederationStatus();
        expect(status.activeColonies).toBe(1);
        expect(status.totalColonies).toBe(1);
      });

      it('should return all colonies', async () => {
        await coordinator.registerColony('colony-1', 'gardener-1');
        await coordinator.registerColony('colony-2', 'gardener-2');

        const colonies = coordinator.getColonies();
        expect(colonies.length).toBe(2);
      });
    });
  });

  describe('Round Management', () => {
    beforeEach(async () => {
      // Register minimum colonies for rounds
      await coordinator.registerColony('colony-1', 'gardener-1', { computeCapability: 0.9 });
      await coordinator.registerColony('colony-2', 'gardener-2', { computeCapability: 0.7 });
      await coordinator.registerColony('colony-3', 'gardener-3', { computeCapability: 0.5 });
    });

    describe('Starting Rounds', () => {
      it('should start a new round', async () => {
        const round = await coordinator.startRound();

        expect(round.roundNumber).toBe(1);
        expect(round.status).toBe('active');
        expect(round.participants.length).toBe(3);
        expect(round.gradientUpdates).toHaveLength(0);
      });

      it('should not start round with insufficient colonies', async () => {
        const newCoordinator = new FederatedLearningCoordinator({
          minColoniesForRound: 5,
        }, bes);

        await newCoordinator.registerColony('colony-1', 'gardener-1');
        await newCoordinator.registerColony('colony-2', 'gardener-2');

        await expect(newCoordinator.startRound()).rejects.toThrow(
          'Insufficient colonies'
        );
      });

      it('should not start round when one is active', async () => {
        await coordinator.startRound();

        await expect(coordinator.startRound()).rejects.toThrow(
          'Round already in progress'
        );
      });

      it('should use custom round config', async () => {
        const round = await coordinator.startRound({
          learningRate: 0.05,
          clipThreshold: 2.0,
        });

        expect(round.roundNumber).toBe(1);
        // Config is stored internally for the round
      });

      it('should emit round_started event', (done) => {
        coordinator.on('round_started', (data) => {
          expect(data.roundNumber).toBe(1);
          expect(data.participants).toContain('colony-1');
          done();
        });

        coordinator.startRound();
      });
    });

    describe('Submitting Gradients', () => {
      it('should accept gradient updates', async () => {
        await coordinator.startRound();

        const update: GradientUpdate = {
          colonyId: 'colony-1',
          roundNumber: 1,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          clipNorm: 1.0,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'MEADOW',
            epsilonSpent: 0.1,
            deltaSpent: 1e-5,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        };

        await coordinator.submitGradients(update);

        const status = coordinator.getFederationStatus();
        expect(status.currentRound?.gradientUpdates).toHaveLength(1);
      });

      it('should reject updates from non-participants', async () => {
        await coordinator.startRound();

        const update: GradientUpdate = {
          colonyId: 'non-existent',
          roundNumber: 1,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'MEADOW',
            epsilonSpent: 0.1,
            deltaSpent: 1e-5,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        };

        await expect(coordinator.submitGradients(update)).rejects.toThrow(
          'Colony not participating'
        );
      });

      it('should reject updates for wrong round', async () => {
        await coordinator.startRound();

        const update: GradientUpdate = {
          colonyId: 'colony-1',
          roundNumber: 999,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'MEADOW',
            epsilonSpent: 0.1,
            deltaSpent: 1e-5,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        };

        await expect(coordinator.submitGradients(update)).rejects.toThrow(
          'Round number mismatch'
        );
      });

      it('should complete round when all participants submit', async () => {
        await coordinator.startRound();

        // Submit from all participants
        for (const colonyId of ['colony-1', 'colony-2', 'colony-3']) {
          const update: GradientUpdate = {
            colonyId,
            roundNumber: 1,
            gradients: [0.1, 0.2, 0.3],
            sampleCount: 100,
            metadata: {
              agentId: `agent-${colonyId}`,
              privacyTier: 'LOCAL', // Use LOCAL to avoid noise
              epsilonSpent: 0,
              deltaSpent: 0,
              compressed: false,
              trainingLoss: 0.5,
            },
            timestamp: Date.now(),
          };

          await coordinator.submitGradients(update);
        }

        // Wait for aggregation to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        const status = coordinator.getFederationStatus();
        expect(status.currentRound).toBeNull(); // Round completed
        expect(status.globalRound).toBe(1);
      });

      it('should emit gradients_received event', (done) => {
        coordinator.startRound().then(() => {
          const update: GradientUpdate = {
            colonyId: 'colony-1',
            roundNumber: 1,
            gradients: [0.1, 0.2, 0.3],
            sampleCount: 100,
            metadata: {
              agentId: 'agent-1',
              privacyTier: 'MEADOW',
              epsilonSpent: 0.1,
              deltaSpent: 1e-5,
              compressed: false,
              trainingLoss: 0.5,
            },
            timestamp: Date.now(),
          };

          coordinator.on('gradients_received', (data) => {
            expect(data.colonyId).toBe('colony-1');
            done();
          });

          coordinator.submitGradients(update);
        });
      });
    });

    describe('Round Completion', () => {
      it('should timeout rounds', (done) => {
        coordinator.startRound().then(() => {
          coordinator.on('round_ended', (data) => {
            expect(data.outcome).toBe('timeout');
            done();
          });
        }, 6000); // Round timeout is 5000ms
      });

      it('should emit round_complete event on success', (done) => {
        coordinator.startRound().then(async () => {
          coordinator.on('round_complete', (data) => {
            expect(data.roundNumber).toBe(1);
            expect(data.modelVersion).toBe(2);
            done();
          });

          // Submit all gradients
          for (const colonyId of ['colony-1', 'colony-2', 'colony-3']) {
            await coordinator.submitGradients({
              colonyId,
              roundNumber: 1,
              gradients: [0.1, 0.2, 0.3],
              sampleCount: 100,
              metadata: {
                agentId: `agent-${colonyId}`,
                privacyTier: 'LOCAL',
                epsilonSpent: 0,
                deltaSpent: 0,
                compressed: false,
                trainingLoss: 0.5,
              },
              timestamp: Date.now(),
            });
          }
        });
      });
    });
  });

  describe('Gradient Aggregation', () => {
    beforeEach(async () => {
      await coordinator.registerColony('colony-1', 'gardener-1', { privacyPreference: 'LOCAL' });
      await coordinator.registerColony('colony-2', 'gardener-2', { privacyPreference: 'LOCAL' });
    });

    it('should aggregate using FedAvg', async () => {
      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [1.0, 2.0, 3.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [3.0, 4.0, 5.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const model = coordinator.getCurrentModel();
      expect(model?.aggregatedGradients).toEqual([2.0, 3.0, 4.0]);
    });

    it('should weight by sample count', async () => {
      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [1.0, 1.0, 1.0],
        sampleCount: 200, // 2x weight
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.0, 0.0, 0.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const model = coordinator.getCurrentModel();
      // (1*200 + 0*100) / 300 = 0.667
      expect(model?.aggregatedGradients[0]).toBeCloseTo(0.667, 2);
    });

    it('should use FedAvgM with momentum', async () => {
      const momentumCoordinator = new FederatedLearningCoordinator({
        aggregationMethod: 'fedavgm',
        minColoniesForRound: 2,
      }, bes);

      await momentumCoordinator.registerColony('colony-1', 'gardener-1');
      await momentumCoordinator.registerColony('colony-2', 'gardener-2');

      // First round
      await momentumCoordinator.startRound();
      await momentumCoordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [1.0, 1.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });
      await momentumCoordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [1.0, 1.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for aggregation

      // Second round
      await momentumCoordinator.startRound();
      await momentumCoordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 2,
        gradients: [0.0, 0.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });
      await momentumCoordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 2,
        gradients: [0.0, 0.0],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for aggregation

      const model = momentumCoordinator.getCurrentModel();
      // With momentum, should not be exactly 0
      expect(model?.aggregatedGradients[0]).not.toBe(0);
    });
  });

  describe('Privacy Controls', () => {
    beforeEach(async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');
    });

    it('should clip gradients', async () => {
      await coordinator.startRound();

      const largeGradients = [10.0, 10.0, 10.0]; // Large gradients

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: largeGradients,
        sampleCount: 100,
        clipNorm: 1.0,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      const accounting = coordinator.getPrivacyAccounting('colony-1');
      expect(accounting).toBeDefined();
    });

    it('should add noise for MEADOW tier', async () => {
      await coordinator.startRound();

      const originalGradients = [0.5, 0.5, 0.5];

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: originalGradients,
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      // Noise should be added (gradients won't be exactly the same)
      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: originalGradients,
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const model = coordinator.getCurrentModel();
      // With noise, shouldn't be exactly 0.5
      expect(model?.aggregatedGradients[0]).not.toBe(0.5);
    });

    it('should not add noise for LOCAL tier', async () => {
      const localCoordinator = new FederatedLearningCoordinator({
        defaultPrivacyTier: 'LOCAL',
        minColoniesForRound: 2,
      }, bes);

      await localCoordinator.registerColony('colony-1', 'gardener-1');
      await localCoordinator.registerColony('colony-2', 'gardener-2');

      await localCoordinator.startRound();

      const originalGradients = [0.5, 0.5, 0.5];

      await localCoordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: originalGradients,
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await localCoordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: originalGradients,
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const model = localCoordinator.getCurrentModel();
      // No noise for LOCAL
      expect(model?.aggregatedGradients).toEqual([0.5, 0.5, 0.5]);
    });

    it('should track privacy accounting', async () => {
      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      const accounting = coordinator.getPrivacyAccounting('colony-1');
      expect(accounting?.epsilonSpent).toBe(0.1);
      expect(accounting?.deltaSpent).toBe(1e-5);
      expect(accounting?.roundsParticipated).toBe(1);
      expect(accounting?.gradientsContributed).toBe(1);
    });

    it('should return all privacy accounting', async () => {
      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      const allAccounting = coordinator.getAllPrivacyAccounting();
      expect(allAccounting.length).toBe(2); // Both colonies registered
    });
  });

  describe('Model Management', () => {
    it('should initialize with default model', () => {
      const model = coordinator.getCurrentModel();

      expect(model).toBeDefined();
      expect(model?.version).toBe(1);
      expect(model?.globalRound).toBe(0);
    });

    it('should create new model versions', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.3, 0.2, 0.1],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const model = coordinator.getCurrentModel();
      expect(model?.version).toBe(2);
      expect(model?.globalRound).toBe(1);
      expect(model?.participatingColonies).toContain('colony-1');
      expect(model?.participatingColonies).toContain('colony-2');
    });

    it('should maintain model history', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      // Complete two rounds
      for (let round = 1; round <= 2; round++) {
        await coordinator.startRound();

        await coordinator.submitGradients({
          colonyId: 'colony-1',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await coordinator.submitGradients({
          colonyId: 'colony-2',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-2',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const history = coordinator.getModelHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should prune old models', async () => {
      const pruneCoordinator = new FederatedLearningCoordinator({
        maxModelVersions: 3,
        minColoniesForRound: 2,
      }, bes);

      await pruneCoordinator.registerColony('colony-1', 'gardener-1');
      await pruneCoordinator.registerColony('colony-2', 'gardener-2');

      // Complete 5 rounds
      for (let round = 1; round <= 5; round++) {
        await pruneCoordinator.startRound();

        await pruneCoordinator.submitGradients({
          colonyId: 'colony-1',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await pruneCoordinator.submitGradients({
          colonyId: 'colony-2',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-2',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const history = pruneCoordinator.getModelHistory();
      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should get model by version', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const model = coordinator.getModel(2);
      expect(model).toBeDefined();
      expect(model?.version).toBe(2);
    });

    it('should verify model consistency', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const isValid = await coordinator.verifyModelConsistency(2);
      expect(isValid).toBe(true);
    });

    it('should distribute model to colonies', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await coordinator.distributeModel(2);
      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('should emit model_distributed event', (done) => {
      coordinator.registerColony('colony-1', 'gardener-1').then(async () => {
        coordinator.on('model_distributed', (data) => {
          expect(data.version).toBe(1);
          expect(data.successCount).toBe(1);
          done();
        });

        // Model 1 is the initial model
        await coordinator.distributeModel(1);
      });
    }, 10000);
  });

  describe('Statistics and Monitoring', () => {
    it('should track statistics', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'MEADOW',
          epsilonSpent: 0.1,
          deltaSpent: 1e-5,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = coordinator.getStats();
      expect(stats.totalRounds).toBe(1);
      expect(stats.successfulRounds).toBe(1);
      expect(stats.failedRounds).toBe(0);
      expect(stats.totalGradientsAggregated).toBe(2);
      expect(stats.activeColonies).toBe(2);
    });

    it('should return round history', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      await coordinator.startRound();

      await coordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await coordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'LOCAL',
          epsilonSpent: 0,
          deltaSpent: 0,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const history = coordinator.getRoundHistory();
      expect(history.length).toBe(1);
      expect(history[0].roundNumber).toBe(1);
    });

    it('should limit round history', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');

      // Complete two rounds
      for (let round = 1; round <= 2; round++) {
        await coordinator.startRound();

        await coordinator.submitGradients({
          colonyId: 'colony-1',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-1',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await coordinator.submitGradients({
          colonyId: 'colony-2',
          roundNumber: round,
          gradients: [0.1, 0.2, 0.3],
          sampleCount: 100,
          metadata: {
            agentId: 'agent-2',
            privacyTier: 'LOCAL',
            epsilonSpent: 0,
            deltaSpent: 0,
            compressed: false,
            trainingLoss: 0.5,
          },
          timestamp: Date.now(),
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const limitedHistory = coordinator.getRoundHistory(1);
      expect(limitedHistory.length).toBe(1);
    });

    it('should reset coordinator', async () => {
      await coordinator.registerColony('colony-1', 'gardener-1');
      await coordinator.registerColony('colony-2', 'gardener-2');
      await coordinator.startRound();

      coordinator.reset();

      const colonies = coordinator.getColonies();
      const stats = coordinator.getStats();

      expect(colonies.length).toBe(0);
      expect(stats.activeColonies).toBe(0);
      expect(stats.totalRounds).toBe(0);
    });
  });

  describe('Integration with BES', () => {
    it('should use BES for privacy management', async () => {
      const testBes = new BES({
        defaultDimensionality: 256,
        defaultPrivacyTier: 'RESEARCH',
      });

      const besCoordinator = new FederatedLearningCoordinator(
        {
          defaultPrivacyTier: 'RESEARCH',
          minColoniesForRound: 2,
        },
        testBes
      );

      await besCoordinator.registerColony('colony-1', 'gardener-1', {
        privacyPreference: 'RESEARCH',
      });

      await besCoordinator.registerColony('colony-2', 'gardener-2', {
        privacyPreference: 'RESEARCH',
      });

      await besCoordinator.startRound();

      await besCoordinator.submitGradients({
        colonyId: 'colony-1',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-1',
          privacyTier: 'RESEARCH',
          epsilonSpent: 0.5,
          deltaSpent: 1e-6,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await besCoordinator.submitGradients({
        colonyId: 'colony-2',
        roundNumber: 1,
        gradients: [0.1, 0.2, 0.3],
        sampleCount: 100,
        metadata: {
          agentId: 'agent-2',
          privacyTier: 'RESEARCH',
          epsilonSpent: 0.5,
          deltaSpent: 1e-6,
          compressed: false,
          trainingLoss: 0.5,
        },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const model = besCoordinator.getCurrentModel();
      expect(model).toBeDefined();
      expect(model?.metadata.epsilonUsed).toBe(1.0); // 0.5 + 0.5
    });
  });
});
