/**
 * POLLN META Tile Tests
 * Pluripotent agents that can differentiate into specialized types
 */

import {
  MetaTile,
  MetaTileManager,
  MetaTileState,
  DifferentiationPotential,
  type MetaTileConfig,
  type DifferentiationSignal,
} from '../meta.js';

describe('POLLN META Tiles', () => {
  describe('MetaTile', () => {
    let metaTile: MetaTile;
    const defaultConfig: MetaTileConfig = {
      id: 'meta-test-1',
      potential: DifferentiationPotential.UNIVERSAL,
      environmentalSensitivity: 0.8,
      differentiationThreshold: 0.5,
      reDifferentiationCooldown: 100, // Short for testing
      maxDifferentiations: 5,
    };

    beforeEach(() => {
      metaTile = new MetaTile(defaultConfig);
    });

    it('should initialize as UNDIFFERENTIATED', () => {
      expect(metaTile.state).toBe(MetaTileState.UNDIFFERENTIATED);
      expect(metaTile.currentAgent).toBeNull();
    });

    it('should track ID correctly', () => {
      expect(metaTile.id).toBe('meta-test-1');
    });

    describe('Signal Sensing', () => {
      it('should accumulate signals', () => {
        const signal: Omit<DifferentiationSignal, 'timestamp'> = {
          type: 'demand',
          agentType: 'task',
          urgency: 0.3,
          context: new Map(),
        };

        metaTile.sense({ ...signal, timestamp: Date.now() });
        expect(metaTile.getSignalStrength('task')).toBeGreaterThan(0);
      });

      it('should not differentiate below threshold', () => {
        const signal: DifferentiationSignal = {
          type: 'demand',
          agentType: 'task',
          urgency: 0.3, // Below threshold when adjusted
          context: new Map(),
          timestamp: Date.now(),
        };

        metaTile.sense(signal);
        expect(metaTile.state).toBe(MetaTileState.UNDIFFERENTIATED);
      });

      it('should differentiate above threshold', async () => {
        const signal: DifferentiationSignal = {
          type: 'demand',
          agentType: 'task',
          urgency: 0.9, // Above threshold
          context: new Map(),
          timestamp: Date.now(),
        };

        await new Promise<void>((resolve) => {
          metaTile.on('differentiation_complete', () => resolve());
          metaTile.sense(signal);
        });

        expect(metaTile.state).toBe(MetaTileState.DIFFERENTIATED);
        expect(metaTile.currentAgent).not.toBeNull();
      });
    });

    describe('Differentiation Potential', () => {
      it('UNIVERSAL can become any type', () => {
        const universal = new MetaTile({
          ...defaultConfig,
          potential: DifferentiationPotential.UNIVERSAL,
        });

        expect(universal.canBecome('task')).toBe(true);
        expect(universal.canBecome('role')).toBe(true);
        expect(universal.canBecome('core')).toBe(true);
      });

      it('TASK can only become task', () => {
        const taskOnly = new MetaTile({
          ...defaultConfig,
          potential: DifferentiationPotential.TASK,
        });

        expect(taskOnly.canBecome('task')).toBe(true);
        expect(taskOnly.canBecome('role')).toBe(false);
        expect(taskOnly.canBecome('core')).toBe(false);
      });

      it('ROLE can only become role', () => {
        const roleOnly = new MetaTile({
          ...defaultConfig,
          potential: DifferentiationPotential.ROLE,
        });

        expect(roleOnly.canBecome('task')).toBe(false);
        expect(roleOnly.canBecome('role')).toBe(true);
        expect(roleOnly.canBecome('core')).toBe(false);
      });
    });

    describe('Re-differentiation', () => {
      it('should respect cooldown period', async () => {
        const shortCooldown = new MetaTile({
          ...defaultConfig,
          reDifferentiationCooldown: 50, // 50ms
        });

        // First differentiation
        const signal1: DifferentiationSignal = {
          type: 'demand',
          agentType: 'task',
          urgency: 0.9,
          context: new Map(),
          timestamp: Date.now(),
        };

        await new Promise<void>((resolve) => {
          shortCooldown.on('differentiation_complete', () => resolve());
          shortCooldown.sense(signal1);
        });

        // Try immediate re-differentiation (should fail due to cooldown)
        const signal2: DifferentiationSignal = {
          type: 'demand',
          agentType: 'role',
          urgency: 0.9,
          context: new Map(),
          timestamp: Date.now(),
        };

        shortCooldown.sense(signal2);
        expect(shortCooldown.currentAgent?.config.typeId).toBe('task');

        // Wait for cooldown
        await new Promise(resolve => setTimeout(resolve, 60));

        // Now re-differentiation should work
        await new Promise<void>((resolve) => {
          shortCooldown.on('differentiation_complete', () => resolve());
          shortCooldown.sense(signal2);
        });

        expect(shortCooldown.currentAgent?.config.typeId).toBe('role');
      });

      it('should respect max differentiation limit', async () => {
        const limitedMeta = new MetaTile({
          ...defaultConfig,
          maxDifferentiations: 1,
          reDifferentiationCooldown: 10,
        });

        // First differentiation
        const signal1: DifferentiationSignal = {
          type: 'demand',
          agentType: 'task',
          urgency: 0.9,
          context: new Map(),
          timestamp: Date.now(),
        };

        await new Promise<void>((resolve) => {
          limitedMeta.on('differentiation_complete', () => resolve());
          limitedMeta.sense(signal1);
        });

        await new Promise(resolve => setTimeout(resolve, 20));

        // Second differentiation should fail (max reached)
        const signal2: DifferentiationSignal = {
          type: 'demand',
          agentType: 'role',
          urgency: 0.9,
          context: new Map(),
          timestamp: Date.now(),
        };

        limitedMeta.sense(signal2);
        expect(limitedMeta.differentiationCount).toBe(1);
      });
    });

    describe('Status and History', () => {
      it('should return correct status', () => {
        const status = metaTile.getStatus();

        expect(status.id).toBe('meta-test-1');
        expect(status.state).toBe(MetaTileState.UNDIFFERENTIATED);
        expect(status.potential).toBe(DifferentiationPotential.UNIVERSAL);
        expect(status.currentType).toBeNull();
        expect(status.differentiationCount).toBe(0);
      });

      it('should track differentiation history', async () => {
        const signal: DifferentiationSignal = {
          type: 'demand',
          agentType: 'role',
          urgency: 0.9,
          context: new Map(),
          timestamp: Date.now(),
        };

        await new Promise<void>((resolve) => {
          metaTile.on('differentiation_complete', () => resolve());
          metaTile.sense(signal);
        });

        const history = metaTile.getHistory();
        expect(history.length).toBe(1);
        expect(history[0].toType).toBe('role');
        expect(history[0].success).toBe(true);
      });
    });
  });

  describe('MetaTileManager', () => {
    let manager: MetaTileManager;

    beforeEach(() => {
      manager = new MetaTileManager();
    });

    it('should spawn META tiles', () => {
      const meta = manager.spawnMetaTile();
      expect(meta).toBeDefined();
      expect(meta.state).toBe(MetaTileState.UNDIFFERENTIATED);
    });

    it('should track spawned tiles', () => {
      manager.spawnMetaTile();
      manager.spawnMetaTile();
      manager.spawnMetaTile();

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.undifferentiated).toBe(3);
    });

    it('should broadcast signals to all tiles', async () => {
      const meta1 = manager.spawnMetaTile();
      const meta2 = manager.spawnMetaTile();

      const signal: Omit<DifferentiationSignal, 'timestamp'> = {
        type: 'demand',
        agentType: 'task',
        urgency: 0.9,
        context: new Map(),
      };

      let completed = 0;
      await new Promise<void>((resolve) => {
        meta1.on('differentiation_complete', () => {
          completed++;
          if (completed === 2) resolve();
        });
        meta2.on('differentiation_complete', () => {
          completed++;
          if (completed === 2) resolve();
        });
        manager.broadcastSignal(signal);
      });

      const stats = manager.getStats();
      expect(stats.differentiated.task).toBe(2);
    });

    it('should get undifferentiated tiles', () => {
      manager.spawnMetaTile();
      manager.spawnMetaTile();

      const undiff = manager.getUndifferentiated();
      expect(undiff.length).toBe(2);
    });

    it('should get differentiated tiles by type', async () => {
      const meta = manager.spawnMetaTile();

      await new Promise<void>((resolve) => {
        meta.on('differentiation_complete', () => resolve());
        manager.broadcastSignal({
          type: 'demand',
          agentType: 'core',
          urgency: 0.9,
          context: new Map(),
        });
      });

      const coreTiles = manager.getDifferentiatedByType('core');
      expect(coreTiles.length).toBe(1);

      const taskTiles = manager.getDifferentiatedByType('task');
      expect(taskTiles.length).toBe(0);
    });

    it('should emit events', (done) => {
      manager.on('meta_spawned', (data) => {
        expect(data.potential).toBe(DifferentiationPotential.UNIVERSAL);
        done();
      });

      manager.spawnMetaTile();
    });
  });
});
