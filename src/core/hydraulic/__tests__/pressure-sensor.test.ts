/**
 * Tests for Pressure Sensor
 */

import { PressureSensor } from '../pressure-sensor';
import { HydraulicEventType } from '../types';

describe('PressureSensor', () => {
  let sensor: PressureSensor;

  beforeEach(() => {
    sensor = new PressureSensor();
  });

  afterEach(() => {
    sensor.stop();
  });

  describe('Agent Registration', () => {
    test('should register an agent', () => {
      sensor.registerAgent('agent-1', 0.5);

      const pressure = sensor.getPressure('agent-1');
      expect(pressure).toBeDefined();
      expect(pressure?.agentId).toBe('agent-1');
      expect(pressure?.value).toBe(0.5);
    });

    test('should unregister an agent', () => {
      sensor.registerAgent('agent-1', 0.5);
      sensor.unregisterAgent('agent-1');

      const pressure = sensor.getPressure('agent-1');
      expect(pressure).toBeUndefined();
    });
  });

  describe('Pressure Updates', () => {
    test('should update pressure for an agent', () => {
      sensor.registerAgent('agent-1', 0);

      const updated = sensor.updatePressure('agent-1', 0.3, 0.2, 0.1);

      expect(updated.value).toBeCloseTo(0.6, 1);
      expect(updated.components.incoming).toBe(0.3);
      expect(updated.components.external).toBe(0.2);
      expect(updated.components.internal).toBe(0.1);
    });

    test('should clamp pressure to max', () => {
      sensor.registerAgent('agent-1', 0);

      const updated = sensor.updatePressure('agent-1', 1, 1, 1);

      expect(updated.value).toBeLessThanOrEqual(1.0);
    });

    test('should handle non-existent agent', () => {
      expect(() => {
        sensor.updatePressure('nonexistent', 0.5, 0, 0);
      }).toThrow();
    });
  });

  describe('Pressure History', () => {
    test('should track pressure history', () => {
      sensor.registerAgent('agent-1', 0);

      sensor.updatePressure('agent-1', 0.5, 0, 0);
      sensor.updatePressure('agent-1', 0, 0, 0);

      const history = sensor.getPressureHistory('agent-1');
      expect(history.length).toBeGreaterThan(0);
    });

    test('should limit history size', () => {
      sensor.registerAgent('agent-1', 0);

      for (let i = 0; i < 150; i++) {
        sensor.updatePressure('agent-1', 0.1, 0, 0);
      }

      const history = sensor.getPressureHistory('agent-1');
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Pressure Analysis', () => {
    test('should analyze pressure trends', () => {
      sensor.registerAgent('agent-1', 0);

      // Create rising trend
      for (let i = 0; i < 10; i++) {
        sensor.updatePressure('agent-1', 0.1 * i, 0, 0);
      }

      const analysis = sensor.analyzePressure('agent-1');

      expect(analysis).not.toBeNull();
      expect(analysis?.trend).toBe('rising');
      expect(analysis?.forecast).toHaveLength(5);
    });

    test('should detect falling trend', () => {
      sensor.registerAgent('agent-1', 1.0);

      // Create falling trend
      for (let i = 0; i < 10; i++) {
        sensor.updatePressure('agent-1', -0.05, 0, 0);
      }

      const analysis = sensor.analyzePressure('agent-1');

      expect(analysis?.trend).toBe('falling');
    });
  });

  describe('Statistics', () => {
    test('should calculate pressure statistics', () => {
      sensor.registerAgent('agent-1', 0.5);
      sensor.registerAgent('agent-2', 0.7);
      sensor.registerAgent('agent-3', 0.3);

      const stats = sensor.getStats();

      expect(stats.avgPressure).toBeCloseTo(0.5, 1);
      expect(stats.maxPressure).toBe(0.7);
      expect(stats.minPressure).toBe(0.3);
      expect(stats.variance).toBeGreaterThan(0);
    });

    test('should return zero stats when no agents', () => {
      const stats = sensor.getStats();

      expect(stats.avgPressure).toBe(0);
      expect(stats.maxPressure).toBe(0);
      expect(stats.minPressure).toBe(0);
      expect(stats.variance).toBe(0);
    });
  });

  describe('Ranking', () => {
    test('should rank agents by pressure', () => {
      sensor.registerAgent('agent-1', 0.3);
      sensor.registerAgent('agent-2', 0.9);
      sensor.registerAgent('agent-3', 0.6);

      const highest = sensor.getHighestPressureAgents(2);
      expect(highest[0].agentId).toBe('agent-2');
      expect(highest[0].pressure).toBe(0.9);

      const lowest = sensor.getLowestPressureAgents(2);
      expect(lowest[0].agentId).toBe('agent-1');
      expect(lowest[0].pressure).toBe(0.3);
    });
  });

  describe('Events', () => {
    test('should emit pressure spike event', (done) => {
      sensor.registerAgent('agent-1', 0.5);

      sensor.on('event', (event) => {
        if (event.type === HydraulicEventType.PRESSURE_SPIKE) {
          expect(event.severity).toBe('warning');
          done();
        }
      });

      sensor.updatePressure('agent-1', 0.4, 0, 0); // Should trigger spike
    });

    test('should emit pressure drop event', (done) => {
      sensor.registerAgent('agent-1', 0.5);

      let eventCount = 0;
      sensor.on('event', (event) => {
        eventCount++;
        if (event.type === HydraulicEventType.PRESSURE_DROP) {
          expect(event.severity).toBe('info');
          done();
        }
      });

      // First update to establish baseline, then drop
      sensor.updatePressure('agent-1', 0, 0, 0);
    });
  });
});
