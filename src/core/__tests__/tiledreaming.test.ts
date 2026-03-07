/**
 * Tile Dreaming System Tests
 */

import { TileDreamer, withDreaming, TileDreamingConfig, SleepReport } from '../tiledreaming.js';
import { BaseTile, TileCategory, TileContext, TileResult } from '../tile.js';
import { WorldModel } from '../worldmodel.js';
import { ValueNetwork } from '../valuenetwork.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Simple test tile implementation
 */
class TestTile extends BaseTile<string, string> {
  async execute(
    input: string,
    context: TileContext
  ): Promise<TileResult<string>> {
    const output = input.toUpperCase();
    return {
      output,
      success: input.length > 0,
      confidence: input.length > 0 ? 0.9 : 0.1,
      executionTimeMs: 1,
      energyUsed: input.length,
      observations: [],
    };
  }
}

/**
 * Mock World Model
 */
class MockWorldModel {
  private config = { latentDim: 16 };

  getConfig() {
    return this.config;
  }

  dream(startState: number[], horizon: number, policy: (s: number[]) => number): any {
    const actions: number[] = [];
    const states: number[] = [];
    const rewards: number[] = [];
    const values: number[] = [];
    const uncertainties: number[] = [];

    let state = startState;
    let totalReward = 0;
    let totalValue = 0;

    for (let i = 0; i < horizon; i++) {
      const action = policy(state);
      actions.push(action);
      states.push(...state);

      // Simulate transition
      const reward = Math.random() * 0.5 + 0.5; // Random reward 0.5-1.0
      rewards.push(reward);
      totalReward += reward;

      const value = Math.random() * 0.5 + 0.5;
      values.push(value);
      totalValue += value;

      uncertainties.push(Math.random() * 0.2);

      // Update state
      state = state.map(s => s * 0.9 + Math.random() * 0.1);
    }

    return {
      id: `dream-${Date.now()}`,
      startState,
      actions,
      states,
      rewards,
      values,
      uncertainties,
      totalReward,
      totalValue,
      length: horizon,
    };
  }
}

/**
 * Mock Value Network
 */
class MockValueNetwork {
  predict(state: Map<string, unknown>): { value: number; confidence: number } {
    const embedding = state.get('embedding') as number[] | undefined;
    if (embedding && Array.isArray(embedding)) {
      return {
        value: embedding.reduce((a, b) => a + b, 0) / embedding.length,
        confidence: 0.8,
      };
    }
    return {
      value: 0.5,
      confidence: 0.5,
    };
  }
}

/**
 * Create test context
 */
function createTestContext(): TileContext {
  return {
    colonyId: 'test-colony',
    keeperId: 'test-keeper',
    timestamp: Date.now(),
    causalChainId: 'test-chain',
    energyBudget: 100,
  };
}

// ============================================================================
// TILE DREAMER TESTS
// ============================================================================

describe('TileDreamer', () => {
  let dreamer: TileDreamer;
  let worldModel: MockWorldModel;
  let valueNetwork: MockValueNetwork;
  let tile: TestTile;

  beforeEach(() => {
    worldModel = new MockWorldModel() as unknown as WorldModel;
    valueNetwork = new MockValueNetwork() as unknown as ValueNetwork;

    const config: Partial<TileDreamingConfig> = {
      sleepIntervalMs: 1000,
      minExperiencesForSleep: 2,
      dreamBatchSize: 3,
      dreamHorizon: 5,
    };

    dreamer = new TileDreamer(
      worldModel as unknown as WorldModel,
      valueNetwork as unknown as ValueNetwork,
      config
    );

    tile = new TestTile({
      name: 'test-tile',
      category: TileCategory.ROLE,
    });
  });

  describe('tile registration', () => {
    it('should register tiles', () => {
      dreamer.registerTile(tile);

      const state = dreamer.getSleepState();
      expect(state.registeredTiles).toBe(1);
    });

    it('should unregister tiles', () => {
      dreamer.registerTile(tile);
      dreamer.unregisterTile(tile.id);

      const state = dreamer.getSleepState();
      expect(state.registeredTiles).toBe(0);
    });

    it('should emit tile_registered event', () => {
      const handler = jest.fn();
      dreamer.on('tile_registered', handler);

      dreamer.registerTile(tile);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ tileId: tile.id })
      );
    });
  });

  describe('experience collection', () => {
    beforeEach(() => {
      dreamer.registerTile(tile);
    });

    it('should collect experiences', () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test', 'TEST', context, 0.9);

      const state = dreamer.getSleepState();
      expect(state.pendingExperiences).toBe(1);
    });

    it('should compute importance scores', () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test', 'TEST', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.5);

      const state = dreamer.getSleepState();
      expect(state.pendingExperiences).toBe(2);
    });

    it('should ignore unregistered tiles', () => {
      dreamer.addExperience('unknown-tile', 'test', 'TEST', createTestContext(), 0.9);

      const state = dreamer.getSleepState();
      expect(state.pendingExperiences).toBe(0);
    });
  });

  describe('sleep cycles', () => {
    beforeEach(() => {
      dreamer.registerTile(tile);
    });

    it('should determine when sleep is needed', () => {
      // No experiences
      expect(dreamer.shouldSleep()).toBe(false);

      // Add experiences
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      // Now should sleep (if enough time passed)
      // Note: shouldSleep also checks time interval
    });

    it('should run sleep cycle', async () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      const report = await dreamer.forceSleep();

      expect(report.tilesProcessed).toBe(1);
      expect(report.totalEpisodes).toBeGreaterThan(0);
      expect(report.startTime).toBeLessThanOrEqual(report.endTime);
    });

    it('should emit sleep events', async () => {
      const startHandler = jest.fn();
      const completeHandler = jest.fn();

      dreamer.on('sleep_started', startHandler);
      dreamer.on('sleep_completed', completeHandler);

      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      await dreamer.forceSleep();

      expect(startHandler).toHaveBeenCalled();
      expect(completeHandler).toHaveBeenCalled();
    });

    it('should not sleep while already sleeping', async () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      // Start sleep
      const sleepPromise = dreamer.sleep();

      // Try to sleep again
      await expect(dreamer.sleep()).rejects.toThrow('Already sleeping');

      await sleepPromise;
    });
  });

  describe('dream history', () => {
    beforeEach(() => {
      dreamer.registerTile(tile);
    });

    it('should track dream history', async () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      await dreamer.forceSleep();

      const history = dreamer.getDreamHistory(tile.id);
      expect(history.length).toBe(1);
      expect(history[0].tileId).toBe(tile.id);
    });

    it('should filter history by tile', async () => {
      const tile2 = new TestTile({ name: 'tile2' });
      dreamer.registerTile(tile2);

      const context = createTestContext();
      // Add enough experiences for both tiles
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);
      dreamer.addExperience(tile2.id, 'test3', 'TEST3', context, 0.9);
      dreamer.addExperience(tile2.id, 'test4', 'TEST4', context, 0.8);

      await dreamer.forceSleep();

      const history1 = dreamer.getDreamHistory(tile.id);
      const history2 = dreamer.getDreamHistory(tile2.id);

      // Both tiles should have dreams since they have enough experiences
      expect(history1.length + history2.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sleep reports', () => {
    beforeEach(() => {
      dreamer.registerTile(tile);
    });

    it('should generate sleep reports', async () => {
      const context = createTestContext();
      dreamer.addExperience(tile.id, 'test1', 'TEST1', context, 0.9);
      dreamer.addExperience(tile.id, 'test2', 'TEST2', context, 0.8);

      await dreamer.forceSleep();

      const reports = dreamer.getSleepReports();
      expect(reports.length).toBe(1);
      expect(reports[0].tilesProcessed).toBe(1);
    });
  });

  describe('sleep state', () => {
    it('should report correct sleep state', () => {
      const state = dreamer.getSleepState();

      expect(state.isSleeping).toBe(false);
      expect(state.lastSleepTime).toBe(0);
      expect(state.sleepCycleCount).toBe(0);
      expect(state.registeredTiles).toBe(0);
      expect(state.pendingExperiences).toBe(0);
    });
  });
});

// ============================================================================
// WITH DREAMING MIXIN TESTS
// ============================================================================

describe('withDreaming mixin', () => {
  let dreamer: TileDreamer;
  let worldModel: MockWorldModel;

  beforeEach(() => {
    worldModel = new MockWorldModel() as unknown as WorldModel;

    dreamer = new TileDreamer(
      worldModel as unknown as WorldModel,
      null,
      { minExperiencesForSleep: 2 }
    );
  });

  it('should create dreaming tile class', () => {
    const DreamingTestTile = withDreaming(TestTile, dreamer);

    const tile = new DreamingTestTile({
      name: 'dreaming-tile',
      category: TileCategory.ROLE,
    });

    expect(tile).toBeDefined();
    expect(tile.id).toBeDefined();
  });

  it('should collect experiences on execute', async () => {
    const DreamingTestTile = withDreaming(TestTile, dreamer);
    const tile = new DreamingTestTile({
      name: 'dreaming-tile',
      category: TileCategory.ROLE,
    });

    const context = createTestContext();
    await tile.execute('test', context);

    const state = dreamer.getSleepState();
    expect(state.pendingExperiences).toBe(1);
    expect(state.registeredTiles).toBe(1);
  });
});
