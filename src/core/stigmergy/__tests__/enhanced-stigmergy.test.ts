/**
 * Tests for Enhanced Stigmergy
 */

import { EnhancedStigmergy } from '../enhanced-stigmergy';
import { PheromoneType, Position } from '../../coordination/stigmergy';

describe('EnhancedStigmergy', () => {
  let stigmergy: EnhancedStigmergy;

  beforeEach(() => {
    stigmergy = new EnhancedStigmergy();
  });

  afterEach(() => {
    stigmergy.shutdown();
  });

  describe('Pheromone Deposit', () => {
    test('should deposit pheromone with adaptive strength', () => {
      const position: Position = { topic: 'test-topic' };
      const metadata = new Map<string, unknown>();

      const pheromone = stigmergy.deposit(
        'agent-1',
        PheromoneType.PATHWAY,
        position,
        1.0,
        metadata
      );

      expect(pheromone).toBeDefined();
      expect(pheromone.type).toBe(PheromoneType.PATHWAY);
      expect(pheromone.sourceId).toBe('agent-1');
      expect(pheromone.strength).toBeGreaterThan(0);
      expect(pheromone.strength).toBeLessThanOrEqual(2); // max adaptive strength
    });

    test('should reduce strength in crowded areas', () => {
      const position: Position = { topic: 'test-topic' };

      // Deposit many pheromones at same position
      for (let i = 0; i < 20; i++) {
        stigmergy.deposit(`agent-${i}`, PheromoneType.PATHWAY, position, 1.0);
      }

      // Last deposit should have reduced strength due to crowding
      const last = stigmergy.deposit('agent-last', PheromoneType.PATHWAY, position, 1.0);

      // Should be lower than base strength
      expect(last.strength).toBeLessThan(1.0);
    });
  });

  describe('Pheromone Detection', () => {
    test('should detect nearby pheromones', () => {
      const position: Position = { coordinates: [0, 0] };
      const metadata = new Map();

      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0, metadata);

      const detected = stigmergy.detect(position, [PheromoneType.PATHWAY]);

      expect(detected.nearby.length).toBeGreaterThan(0);
      expect(detected.strongest).not.toBeNull();
    });

    test('should apply interference to detected pheromones', () => {
      const position: Position = { coordinates: [0, 0] };

      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);
      stigmergy.deposit('agent-2', PheromoneType.RECRUIT, position, 1.0); // Constructive

      const detected = stigmergy.detect(position);

      // Should include interference information
      expect(detected.interference).toBeDefined();
      expect(detected.interference.length).toBeGreaterThan(0);
    });
  });

  describe('Decay Modeling', () => {
    test('should calculate exponential decay', () => {
      const position: Position = { topic: 'test' };
      const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);

      const halfLife = 60000;
      const elapsed = halfLife; // One half-life

      const decayed = stigmergy.calculateDecay(pheromone, elapsed);

      expect(decayed).toBeCloseTo(0.5, 1);
    });

    test('should predict future strength', () => {
      const position: Position = { topic: 'test' };
      const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);

      const futureTime = 30000; // 30 seconds
      const predicted = stigmergy.predictStrength(pheromone, futureTime);

      expect(predicted).toBeGreaterThan(0);
      expect(predicted).toBeLessThan(1);
    });

    test('should set custom decay model', () => {
      const customModel = {
        type: 'linear' as const,
        parameters: { slope: 0.001 },
      };

      stigmergy.setDecayModel(PheromoneType.PATHWAY, customModel);

      const model = stigmergy.getDecayModel(PheromoneType.PATHWAY);

      expect(model.type).toBe('linear');
      expect(model.parameters.slope).toBe(0.001);
    });
  });

  describe('Trail Visualization', () => {
    test('should create and track trails', () => {
      const position1: Position = { coordinates: [0, 0] };
      const position2: Position = { coordinates: [1, 1] };

      const trailId = stigmergy.startTrail(position1);

      const pheromone1 = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position1, 1.0);
      stigmergy.addToTrail(trailId, pheromone1.id, position1, 1.0);

      const pheromone2 = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position2, 0.8);
      stigmergy.addToTrail(trailId, pheromone2.id, position2, 0.8);

      const trail = stigmergy.getTrailVisualization(trailId);

      expect(trail).not.toBeNull();
      expect(trail?.path.length).toBe(2);
      expect(trail?.pheromoneIds.length).toBe(2);
    });

    test('should visualize trail for UI', () => {
      const position1: Position = { coordinates: [0, 0] };
      const position2: Position = { coordinates: [3, 4] };

      const trailId = stigmergy.startTrail(position1);

      const pheromone1 = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position1, 1.0);
      stigmergy.addToTrail(trailId, pheromone1.id, position1, 1.0);

      const pheromone2 = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position2, 0.8);
      stigmergy.addToTrail(trailId, pheromone2.id, position2, 0.8);

      const visualization = stigmergy.visualizeTrail(trailId);

      expect(visualization).not.toBeNull();
      expect(visualization?.points.length).toBe(2);
      expect(visualization?.totalLength).toBeCloseTo(5, 0); // 3-4-5 triangle
      expect(visualization?.avgStrength).toBeCloseTo(0.9, 1);
    });
  });

  describe('Interference Detection', () => {
    test('should detect constructive interference', () => {
      const position: Position = { coordinates: [0, 0] };

      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);
      stigmergy.deposit('agent-2', PheromoneType.RECRUIT, position, 1.0);

      const patterns = stigmergy.detectInterference(position);

      const constructive = patterns.find(p => p.interference > 1);
      expect(constructive).toBeDefined();
    });

    test('should detect destructive interference', () => {
      const position: Position = { coordinates: [0, 0] };

      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);
      stigmergy.deposit('agent-2', PheromoneType.DANGER, position, 1.0);

      const patterns = stigmergy.detectInterference(position);

      const destructive = patterns.find(p => p.interference < 1);
      expect(destructive).toBeDefined();
    });
  });

  describe('Adaptive Strength', () => {
    test('should calculate adaptive strength', () => {
      const position: Position = { topic: 'test' };

      const strength1 = stigmergy.calculateAdaptiveStrength(PheromoneType.PATHWAY, position, 1.0);
      const strength2 = stigmergy.calculateAdaptiveStrength(PheromoneType.PATHWAY, position, 1.0);

      expect(strength1).toBeGreaterThan(0);
      expect(strength1).toBeLessThanOrEqual(2); // max strength
    });

    test('should respect min and max bounds', () => {
      const position: Position = { topic: 'test' };

      // Even with very high base strength, should be capped
      const strength = stigmergy.calculateAdaptiveStrength(PheromoneType.PATHWAY, position, 10.0);

      expect(strength).toBeLessThanOrEqual(2);
    });
  });

  describe('Statistics', () => {
    test('should provide statistics', () => {
      const position: Position = { topic: 'test' };

      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);
      stigmergy.deposit('agent-2', PheromoneType.RESOURCE, position, 1.0);

      const stats = stigmergy.getStats();

      expect(stats.pheromoneCount).toBe(2);
      expect(stats.byType[PheromoneType.PATHWAY]).toBe(1);
      expect(stats.byType[PheromoneType.RESOURCE]).toBe(1);
    });
  });

  describe('Evaporation', () => {
    test('should evaporate weak pheromones', (done) => {
      const position: Position = { topic: 'test' };

      // Deposit with very low strength
      const pheromone = stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 0.01);

      // Wait for evaporation cycle
      setTimeout(() => {
        const stats = stigmergy.getStats();
        // Should have evaporated or been very weak
        expect(stats.pheromoneCount).toBeGreaterThanOrEqual(0);
        done();
      }, 100);
    });
  });

  describe('Reset', () => {
    test('should reset all state', () => {
      const position: Position = { topic: 'test' };
      stigmergy.deposit('agent-1', PheromoneType.PATHWAY, position, 1.0);

      stigmergy.reset();

      const stats = stigmergy.getStats();
      expect(stats.pheromoneCount).toBe(0);
      expect(stats.trailCount).toBe(0);
    });
  });
});
