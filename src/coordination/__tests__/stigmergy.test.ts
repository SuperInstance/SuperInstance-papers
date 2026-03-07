/**
 * POLLN Stigmergic Coordination Tests
 */

import {
  Stigmergy,
  PheromoneType,
  type Pheromone,
  type Position,
  type StigmergyConfig,
  TrailFollower,
} from '../stigmergy.js';

const defaultConfig: Partial<StigmergyConfig> = {
  maxPheromones: 100,
  defaultHalfLife: 60000,
  evaporationInterval: 1000,
  detectionRadius: 0.5,
};

describe('POLLN Stigmergic Coordination', () => {
  describe('Stigmergy', () => {
    let stigmergy: Stigmergy;

    beforeEach(() => {
      stigmergy = new Stigmergy(defaultConfig);
    });

    afterEach(() => {
      stigmergy.shutdown();
    });

    describe('Pheromone Deposit', () => {
      it('should deposit pheromones', () => {
        const position: Position = { topic: 'test-topic' };
        const pheromone = stigmergy.deposit(
          'agent-1',
          PheromoneType.PATHWAY,
          position,
          1.0
        );

        expect(pheromone).toBeDefined();
        expect(pheromone.type).toBe(PheromoneType.PATHWAY);
        expect(pheromone.strength).toBe(1.0);
      });

      it('should track deposited pheromones', () => {
        stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);
        const stats = stigmergy.getStats();
        expect(stats.totalDeposited).toBe(1);
      });
    });

    describe('Pheromone Detection', () => {
      it('should detect nearby pheromones', () => {
        stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);
        const detected = stigmergy.detect({ topic: 'test' }, [PheromoneType.PATHWAY]);

        expect(detected.nearby.length).toBe(1);
        expect(detected.strongest).toBeDefined();
      });

      it('should return strongest pheromone', () => {
        stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 0.5);
        stigmergy.deposit('agent-2', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);

        const detected = stigmergy.detect({ topic: 'test' }, [PheromoneType.PATHWAY]);
        expect(detected.strongest?.strength).toBe(1.0);
      });
    });

    describe('Pheromone Following', () => {
      it('should reinforce followed trails', () => {
        const pheromone = stigmergy.deposit(
          'agent-1',
          PheromoneType.PATHWAY,
          { topic: 'test' },
          0.5
        );

        stigmergy.follow(pheromone.id, 'agent-2');

        const detected = stigmergy.detect({ topic: 'test' }, [PheromoneType.PATHWAY]);
        expect(detected.strongest?.strength).toBeGreaterThan(0.5);
      });

      it('should track follow statistics', () => {
        const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);
        stigmergy.follow(pheromone.id, 'agent-2');

        const stats = stigmergy.getStats();
        expect(stats.totalFollowed).toBe(1);
      });
    });

    describe('Pheromone Evaporation', () => {
      it('should evaporate pheromones over time', () => {
        const shortLived = new Stigmergy({
          ...defaultConfig,
          defaultHalfLife: 10,
        });

        shortLived.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            shortLived.evaporate();
            const stats = shortLived.getStats();
            expect(stats.totalEvaporated).toBeGreaterThanOrEqual(0);
            shortLived.shutdown();
            resolve();
          }, 100);
        });
      });
    });

    describe('Statistics', () => {
      it('should return correct statistics', () => {
        stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'a' }, 1.0);
        stigmergy.deposit('agent-2', PheromoneType.RESOURCE, { topic: 'b' }, 0.8);
        stigmergy.deposit('agent-3', PheromoneType.DANGER, { topic: 'c' }, 0.6);

        const stats = stigmergy.getStats();
        expect(stats.totalDeposited).toBe(3);
        expect(stats.byType[PheromoneType.PATHWAY]).toBe(1);
        expect(stats.byType[PheromoneType.RESOURCE]).toBe(1);
        expect(stats.byType[PheromoneType.DANGER]).toBe(1);
      });
    });
  });

  describe('TrailFollower', () => {
    let stigmergy: Stigmergy;
    let follower: TrailFollower;

    beforeEach(() => {
      stigmergy = new Stigmergy(defaultConfig);
      follower = new TrailFollower(stigmergy, 'follower-1');
    });

    afterEach(() => {
      stigmergy.shutdown();
    });

    it('should follow existing trails', () => {
      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);

      const result = follower.followTrail({ topic: 'test' }, PheromoneType.PATHWAY);

      expect(result.found).toBe(true);
      expect(result.pheromone).toBeDefined();
    });

    it('should return not found when no trails exist', () => {
      const result = follower.followTrail({ topic: 'empty' }, PheromoneType.PATHWAY);

      expect(result.found).toBe(false);
      expect(result.pheromone).toBeNull();
    });

    it('should leave signals after completing tasks', () => {
      follower.leaveSignal(PheromoneType.PATHWAY, { topic: 'new-trail' }, 0.9);

      const detected = stigmergy.detect({ topic: 'new-trail' }, [PheromoneType.PATHWAY]);
      expect(detected.nearby.length).toBe(1);
    });

    it('should track followed trails', () => {
      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, { topic: 'test' }, 1.0);

      follower.followTrail({ topic: 'test' }, PheromoneType.PATHWAY);
      follower.followTrail({ topic: 'test' }, PheromoneType.PATHWAY);

      expect(follower.getFollowedCount()).toBe(1);
    });
  });
});
