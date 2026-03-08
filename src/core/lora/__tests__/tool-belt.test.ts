/**
 * Tests for LoRA Tool Belt
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LoRALibrary, LoRAToolBelt } from '../tool-belt.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';
import type { LoRALibraryConfig } from '../types.js';

describe('LoRALibrary', () => {
  let library: LoRALibrary;
  let config: LoRALibraryConfig;

  beforeEach(() => {
    config = {
      baseModelPath: 'base-1b',
      loraDirectory: './test-loras',
      cacheSize: 5,
      defaultStrategy: 'linear',
      defaultNormalization: 'sum_to_1',
      maxLoRAsPerAgent: 3,
    };
    library = new LoRALibrary(config);
  });

  afterEach(() => {
    // Cleanup
  });

  it('should create library with config', () => {
    expect(library).toBeDefined();
  });

  it('should create composition from LoRA IDs', () => {
    const composition = library.createComposition('agent-1', [
      { loraId: 'lora-1', weight: 0.5 },
      { loraId: 'lora-2', weight: 0.5 },
    ]);

    expect(composition.agentId).toBe('agent-1');
    expect(composition.loras).toHaveLength(2);
    expect(composition.strategy).toBe('linear');
  });

  it('should find LoRAs for task', () => {
    // Add test LoRAs
    const codingLoRA = new BaseLoRAAdapter({
      id: 'coding-lora',
      name: 'Coding',
      description: 'Code expertise',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['coding', 'programming', 'debugging'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.9,
    });

    // Manually add to library's internal map
    (library as any).loras.set('coding-lora', codingLoRA);

    const results = library.findLoRAs('Write some code', 3);

    expect(results.length).toBeGreaterThan(0);
  });

  it('should check for conflicts in composition', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'LoRA 1',
      description: 'First',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test1'],
      compatibleWith: [],
      conflictsWith: ['lora-2'],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'LoRA 2',
      description: 'Second',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test2'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    (library as any).loras.set('lora-1', lora1);
    (library as any).loras.set('lora-2', lora2);

    const composition = library.createComposition('agent-1', [
      { loraId: 'lora-1', weight: 0.5 },
      { loraId: 'lora-2', weight: 0.5 },
    ]);

    const conflicts = library.checkConflicts(composition);

    expect(conflicts).toContain('lora-1 conflicts with lora-2');
  });

  it('should predict composition performance', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'LoRA 1',
      description: 'First',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.9,
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'LoRA 2',
      description: 'Second',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.7,
    });

    (library as any).loras.set('lora-1', lora1);
    (library as any).loras.set('lora-2', lora2);

    const composition = library.createComposition('agent-1', [
      { loraId: 'lora-1', weight: 0.6 },
      { loraId: 'lora-2', weight: 0.4 },
    ]);

    const performance = library.predictPerformance(composition);

    expect(performance).toBeGreaterThan(0);
    expect(performance).toBeLessThanOrEqual(1);
  });
});

describe('LoRAToolBelt', () => {
  let library: LoRALibrary;
  let toolBelt: LoRAToolBelt;
  let config: LoRALibraryConfig;

  beforeEach(() => {
    config = {
      baseModelPath: 'base-1b',
      loraDirectory: './test-loras',
      cacheSize: 5,
      defaultStrategy: 'linear',
      defaultNormalization: 'sum_to_1',
      maxLoRAsPerAgent: 3,
    };
    library = new LoRALibrary(config);
    toolBelt = new LoRAToolBelt(library, 'agent-1');
  });

  it('should initialize with LoRAs', async () => {
    await toolBelt.initialize(['lora-1', 'lora-2']);

    const composition = toolBelt.getCurrentComposition();

    expect(composition).toBeDefined();
    expect(composition?.loras).toHaveLength(2);
  });

  it('should process swap request', async () => {
    await toolBelt.initialize(['lora-1']);

    const currentComp = toolBelt.getCurrentComposition();
    expect(currentComp).toBeDefined();

    const response = await toolBelt.processSwapRequest({
      currentComposition: currentComp!,
      requestedChanges: [
        { loraId: 'lora-2', action: 'add', weight: 0.5 },
      ],
      reason: 'Need additional expertise',
    });

    expect(response.success).toBe(true);
    expect(response.newComposition).toBeDefined();
  });

  it('should reject swap with too many LoRAs', async () => {
    const maxLoRAs = 3;
    const configWithLimit = {
      ...config,
      maxLoRAsPerAgent: maxLoRAs,
    };
    const libraryWithLimit = new LoRALibrary(configWithLimit);
    const toolBeltWithLimit = new LoRAToolBelt(libraryWithLimit, 'agent-1');

    await toolBeltWithLimit.initialize(['lora-1', 'lora-2', 'lora-3']);

    const currentComp = toolBeltWithLimit.getCurrentComposition();
    const response = await toolBeltWithLimit.processSwapRequest({
      currentComposition: currentComp!,
      requestedChanges: [
        { loraId: 'lora-4', action: 'add', weight: 0.25 },
      ],
      reason: 'Too many',
    });

    expect(response.success).toBe(false);
    expect(response.reason).toContain('Too many LoRAs');
  });

  it('should auto-select LoRAs for task', async () => {
    const codingLoRA = new BaseLoRAAdapter({
      id: 'coding-lora',
      name: 'Coding',
      description: 'Code expertise',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['coding', 'programming'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.9,
    });

    (library as any).loras.set('coding-lora', codingLoRA);

    const composition = await toolBelt.autoSelectLoRAs('Write some Python code', 3);

    expect(composition).toBeDefined();
    expect(composition.loras.length).toBeGreaterThan(0);
  });

  it('should maintain swap history', async () => {
    await toolBelt.initialize(['lora-1']);

    const currentComp = toolBelt.getCurrentComposition();

    await toolBelt.processSwapRequest({
      currentComposition: currentComp!,
      requestedChanges: [
        { loraId: 'lora-2', action: 'add', weight: 0.5 },
      ],
      reason: 'Test',
    });

    const history = toolBelt.getSwapHistory();

    expect(history).toHaveLength(1);
  });
});
