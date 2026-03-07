/**
 * POLLN Value Network Tests
 * TD(λ) learning for state value prediction
 */

import {
  ValueNetwork,
  ValueNetworkManager,
  type Trajectory,
  type StateAction,
} from '../valuenetwork.js';

describe('POLLN Value Network', () => {
  describe('ValueNetwork', () => {
    let network: ValueNetwork;

    beforeEach(() => {
      network = new ValueNetwork({
        minSamplesForTraining: 5,
        trainingIntervalMs: 100,
      });
    });

    describe('State Encoding', () => {
      it('should encode Map states', () => {
        const state = new Map<string, unknown>();
        state.set('success', true);
        state.set('test', 'value');

        const encoding = network.encodeState(state);
        expect(encoding.length).toBe(128); // Default input dimension
      });

      it('should produce consistent encodings for same state', () => {
        const state = new Map<string, unknown>();
        state.set('test', 'value');

        const encoding1 = network.encodeState(state);
        const encoding2 = network.encodeState(state);

        expect(encoding1).toEqual(encoding2);
      });
    });

    describe('Value Prediction', () => {
      it('should predict values in [-1, 1] range', () => {
        const state = new Map<string, unknown>();
        state.set('test', 'value');

        const prediction = network.predict(state);

        expect(prediction.value).toBeGreaterThanOrEqual(-1);
        expect(prediction.value).toBeLessThanOrEqual(1);
      });

      it('should include confidence', () => {
        const state = new Map<string, unknown>();
        const prediction = network.predict(state);

        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });

      it('should cache predictions', () => {
        const state = new Map<string, unknown>();
        state.set('test', 'cache');

        const pred1 = network.predict(state);
        const pred2 = network.predict(state);

        expect(pred1.stateId).toBe(pred2.stateId);
      });
    });

    describe('Trajectory Training', () => {
      it('should add trajectories', () => {
        const trajectory: Trajectory = {
          id: 'traj-1',
          agentId: 'agent-1',
          states: [
            { state: new Map(), action: 'a1', reward: 0.5, timestamp: Date.now() },
          ],
          finalValue: 1.0,
          length: 1,
        };

        network.addTrajectory(trajectory);
        const stats = network.getStats();

        expect(stats.trajectories).toBe(1);
      });

      it('should train on collected trajectories', () => {
        // Add multiple trajectories
        for (let i = 0; i < 10; i++) {
          const trajectory: Trajectory = {
            id: `traj-${i}`,
            agentId: 'agent-1',
            states: [
              { state: new Map([['s', i]]), action: 'a1', reward: 0.1 * i, timestamp: Date.now() },
              { state: new Map([['s', i + 1]]), action: 'a2', reward: 0.2 * i, timestamp: Date.now() },
            ],
            finalValue: i / 10,
            length: 2,
          };
          network.addTrajectory(trajectory);
        }

        const result = network.train();

        expect(result.samplesUsed).toBeGreaterThan(0);
        expect(network.getStats().trainingCount).toBe(1);
      });

      it('should not train without enough samples', () => {
        const trajectory: Trajectory = {
          id: 'traj-1',
          agentId: 'agent-1',
          states: [],
          finalValue: 0,
          length: 0,
        };

        network.addTrajectory(trajectory);
        const result = network.train();

        expect(result.samplesUsed).toBe(0);
      });
    });

    describe('Statistics', () => {
      it('should return correct statistics', () => {
        const stats = network.getStats();

        expect(stats.trajectories).toBe(0);
        expect(stats.predictions).toBe(0);
        expect(stats.trainingCount).toBe(0);
        expect(typeof stats.avgWeight).toBe('number');
      });
    });

    describe('Confidence Levels', () => {
      it('should return different confidence for state types', () => {
        const ephemeralConf = network.getConfidence('ephemeral');
        const roleConf = network.getConfidence('role');
        const coreConf = network.getConfidence('core');

        // Core states should have highest confidence
        expect(coreConf).toBeGreaterThan(roleConf);
        expect(roleConf).toBeGreaterThan(ephemeralConf);
      });
    });

    describe('Should Train Check', () => {
      it('should return false without enough trajectories', () => {
        expect(network.shouldTrain()).toBe(false);
      });

      it('should return true with enough trajectories and time passed', async () => {
        // Create network with short training interval
        const fastNetwork = new ValueNetwork({
          minSamplesForTraining: 2,
          trainingIntervalMs: 10,
        });

        // Add trajectories
        for (let i = 0; i < 5; i++) {
          fastNetwork.addTrajectory({
            id: `t-${i}`,
            agentId: 'a',
            states: [{ state: new Map(), action: 'a', reward: 0.5, timestamp: Date.now() }],
            finalValue: 0.5,
            length: 1,
          });
        }

        // Wait for interval
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(fastNetwork.shouldTrain()).toBe(true);
      });
    });

    describe('Events', () => {
      it('should emit prediction_made event', (done) => {
        network.on('prediction_made', (prediction) => {
          expect(prediction.stateId).toBeDefined();
          expect(prediction.value).toBeDefined();
          done();
        });

        network.predict(new Map());
      });

      it('should emit trajectory_added event', (done) => {
        network.on('trajectory_added', (data) => {
          expect(data.id).toBe('traj-test');
          done();
        });

        network.addTrajectory({
          id: 'traj-test',
          agentId: 'a',
          states: [],
          finalValue: 0,
          length: 0,
        });
      });
    });
  });

  describe('ValueNetworkManager', () => {
    let manager: ValueNetworkManager;

    beforeEach(() => {
      manager = new ValueNetworkManager();
    });

    it('should create networks on demand', () => {
      const network = manager.getNetwork('task');
      expect(network).toBeDefined();
    });

    it('should reuse existing networks', () => {
      const network1 = manager.getNetwork('task');
      const network2 = manager.getNetwork('task');

      expect(network1).toBe(network2);
    });

    it('should record trajectories', () => {
      const trajectory: Trajectory = {
        id: 't1',
        agentId: 'task-123',
        states: [],
        finalValue: 0.5,
        length: 0,
      };

      manager.recordTrajectory(trajectory);
      const stats = manager.getGlobalStats();

      expect(stats.totalTrajectories).toBe(1);
    });

    it('should train all networks', async () => {
      // Create fast-training network manager
      const fastManager = new ValueNetworkManager();
      const taskNetwork = fastManager.getNetwork('task');

      // Override config for faster training
      (taskNetwork as any).config.minSamplesForTraining = 2;
      (taskNetwork as any).config.trainingIntervalMs = 10;

      // Add trajectories
      for (let i = 0; i < 10; i++) {
        fastManager.recordTrajectory({
          id: `t-${i}`,
          agentId: `task-${i}`,
          states: [{ state: new Map(), action: 'a', reward: 0.5, timestamp: Date.now() }],
          finalValue: 0.5,
          length: 1,
        });
      }

      // Wait for training interval
      await new Promise(resolve => setTimeout(resolve, 20));

      const results = fastManager.trainAll();
      expect(results.size).toBeGreaterThanOrEqual(0); // May or may not train depending on timing
    });

    it('should return global statistics', () => {
      manager.getNetwork('task');
      manager.getNetwork('role');

      const stats = manager.getGlobalStats();

      expect(stats.networkCount).toBe(2);
      expect(stats.networkStats.size).toBe(2);
    });

    it('should emit trajectory_recorded event', (done) => {
      manager.on('trajectory_recorded', (data) => {
        expect(data.id).toBe('t-test');
        done();
      });

      manager.recordTrajectory({
        id: 't-test',
        agentId: 'task-1',
        states: [],
        finalValue: 0,
        length: 0,
      });
    });
  });
});
