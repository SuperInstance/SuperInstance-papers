/**
 * Tests for LoRA Agent
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { LoRAEnhancedAgent, LoRAColonyAgent } from '../lora-agent.js';
import { LoRALibrary } from '../tool-belt.js';
import { ExpertRegistry } from '../expert-registry.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';
import type { LoRAAgentConfig, AgentConfig, LoRALibraryConfig } from '../types.js';

describe('LoRAEnhancedAgent', () => {
  let library: LoRALibrary;
  let registry: ExpertRegistry;
  let config: LoRAAgentConfig;

  beforeEach(() => {
    const libraryConfig: LoRALibraryConfig = {
      baseModelPath: 'base-1b',
      loraDirectory: './test-loras',
      cacheSize: 5,
      defaultStrategy: 'linear',
      defaultNormalization: 'sum_to_1',
      maxLoRAsPerAgent: 3,
    };

    library = new LoRALibrary(libraryConfig);
    registry = new ExpertRegistry();

    // Add test LoRAs
    const codingLoRA = new BaseLoRAAdapter({
      id: 'coding-lora',
      name: 'Coding Expert',
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
    registry.registerExpert(codingLoRA, 'coding');

    config = {
      id: 'test-agent',
      typeId: 'lora-agent',
      categoryId: 'core',
      modelFamily: 'base-1b',
      defaultParams: {},
      inputTopics: [],
      outputTopic: '',
      minExamples: 100,
      requiresWorldModel: false,
      initialLoRAs: ['coding-lora'],
      minPerformanceThreshold: 0.7,
      enableAutoSelect: true,
      maxLoRAs: 3,
    };
  });

  it('should initialize with initial LoRAs', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();

    const composition = agent.getCurrentComposition();

    expect(composition).toBeDefined();
    expect(composition?.loras).toHaveLength(1);
    expect(composition?.loras[0].loraId).toBe('coding-lora');
  });

  it('should process input', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();

    const result = await agent.process('Write some code');

    expect(result).toBeDefined();
    expect(result.type).toBe('lora-agent-response');
  });

  it('should get active LoRA IDs', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();

    const activeIds = agent.getActiveLoRAIds();

    expect(activeIds).toContain('coding-lora');
  });

  it('should auto-select LoRAs when enabled', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();

    // Add more test LoRAs
    const writingLoRA = new BaseLoRAAdapter({
      id: 'writing-lora',
      name: 'Writing Expert',
      description: 'Writing expertise',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['writing', 'editing'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'writing',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.85,
    });

    (library as any).loras.set('writing-lora', writingLoRA);
    registry.registerExpert(writingLoRA, 'writing');

    const newComposition = await agent.autoSelectLoRAs('Write a blog post');

    expect(newComposition).toBeDefined();
    // Should find writing-related LoRA for writing task
  });

  it('should discover LoRAs for task', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();

    const discovered = await agent.discoverLoRAs('Write Python code');

    expect(discovered.length).toBeGreaterThan(0);
  });

  it('should shutdown cleanly', async () => {
    const agent = new LoRAEnhancedAgent(config, library, registry);

    await agent.initialize();
    await agent.shutdown();

    const composition = agent.getCurrentComposition();
    expect(composition).toBeNull();
  });
});

describe('LoRAColonyAgent', () => {
  let library: LoRALibrary;
  let registry: ExpertRegistry;
  let config: AgentConfig;

  beforeEach(() => {
    const libraryConfig: LoRALibraryConfig = {
      baseModelPath: 'base-1b',
      loraDirectory: './test-loras',
      cacheSize: 5,
      defaultStrategy: 'linear',
      defaultNormalization: 'sum_to_1',
      maxLoRAsPerAgent: 3,
    };

    library = new LoRALibrary(libraryConfig);
    registry = new ExpertRegistry();

    config = {
      id: 'colony-agent',
      typeId: 'lora-colony-agent',
      categoryId: 'core',
      modelFamily: 'base-1b',
      defaultParams: {},
      inputTopics: [],
      outputTopic: '',
      minExamples: 0,
      requiresWorldModel: false,
    };
  });

  it('should initialize', async () => {
    const agent = new LoRAColonyAgent(config, library, registry);

    await agent.initialize();

    expect(agent).toBeDefined();
  });

  it('should process requests', async () => {
    const agent = new LoRAColonyAgent(config, library, registry);

    await agent.initialize();

    const result = await agent.process('test request');

    expect(result).toBeDefined();
    expect(result.type).toBe('lora-colony-response');
  });

  it('should get library statistics', async () => {
    const agent = new LoRAColonyAgent(config, library, registry);

    await agent.initialize();

    const stats = agent.getLibraryStatistics();

    expect(stats).toBeDefined();
    expect(stats.loraCount).toBe(0); // No LoRAs in empty library
  });

  it('should shutdown cleanly', async () => {
    const agent = new LoRAColonyAgent(config, library, registry);

    await agent.initialize();
    await agent.shutdown();

    expect(agent).toBeDefined();
  });
});
