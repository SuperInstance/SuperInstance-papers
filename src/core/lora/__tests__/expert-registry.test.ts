/**
 * Tests for Expert Registry
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExpertRegistry, createDefaultRegistry } from '../expert-registry.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';

describe('ExpertRegistry', () => {
  let registry: ExpertRegistry;

  beforeEach(() => {
    registry = new ExpertRegistry();
  });

  it('should register a new expert', () => {
    const lora = new BaseLoRAAdapter({
      id: 'test-lora',
      name: 'Test Expert',
      description: 'Test description',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['coding', 'testing'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const entry = registry.registerExpert(lora, 'coding');

    expect(entry.id).toBe('test-lora');
    expect(entry.name).toBe('Test Expert');
    expect(entry.category).toBe('coding');
  });

  it('should find experts by category', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'Coding Expert',
      description: 'Coding',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['coding'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'Writing Expert',
      description: 'Writing',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['writing'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'writing',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    registry.registerExpert(lora1, 'coding');
    registry.registerExpert(lora2, 'writing');

    const codingExperts = registry.findByCategory('coding');
    const writingExperts = registry.findByCategory('writing');

    expect(codingExperts).toHaveLength(1);
    expect(writingExperts).toHaveLength(1);
    expect(codingExperts[0].id).toBe('lora-1');
    expect(writingExperts[0].id).toBe('lora-2');
  });

  it('should find experts by expertise tag', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'Python Expert',
      description: 'Python coding',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['coding', 'python', 'debugging'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'Writing Expert',
      description: 'Writing',
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
    });

    registry.registerExpert(lora1, 'coding');
    registry.registerExpert(lora2, 'writing');

    const pythonExperts = registry.findByExpertise('python');
    const writingExperts = registry.findByExpertise('editing');

    expect(pythonExperts).toHaveLength(1);
    expect(writingExperts).toHaveLength(1);
  });

  it('should get recommendations for task', () => {
    const codingLoRA = new BaseLoRAAdapter({
      id: 'coding-lora',
      name: 'Coding Expert',
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

    registry.registerExpert(codingLoRA, 'coding');

    const recommendations = registry.getRecommendations('Write some Python code', 3);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].score).toBeGreaterThan(0);
    expect(recommendations[0].reason).toBeDefined();
  });

  it('should update performance metrics', () => {
    const lora = new BaseLoRAAdapter({
      id: 'test-lora',
      name: 'Test Expert',
      description: 'Test',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.7,
    });

    registry.registerExpert(lora, 'test');

    registry.updatePerformance('test-lora', 0.9, 'test-task');

    const metrics = registry.getPerformanceMetrics('test-lora');

    expect(metrics).toBeDefined();
    expect(metrics?.evaluationCount).toBe(1);
    expect(metrics?.avgPerformance).toBeGreaterThan(0.7);
  });

  it('should register emergent ability', () => {
    const ability = registry.registerEmergentAbility(
      ['lora-1', 'lora-2'],
      new Map([
        ['task1', 0.8],
        ['task2', 0.9],
      ]),
      'Test Emergent'
    );

    expect(ability.id).toBeDefined();
    expect(ability.name).toBe('Test Emergent');
    expect(ability.sourceLoRAs).toEqual(['lora-1', 'lora-2']);
    expect(ability.transferability).toBeGreaterThan(0);
  });

  it('should find emergent abilities by source LoRAs', () => {
    registry.registerEmergentAbility(
      ['lora-1', 'lora-2'],
      new Map([
        ['task1', 0.8],
      ]),
      'Emergent 1'
    );

    registry.registerEmergentAbility(
      ['lora-1', 'lora-3'],
      new Map([
        ['task2', 0.7],
      ]),
      'Emergent 2'
    );

    const abilities = registry.findEmergentAbilities(['lora-1']);

    expect(abilities).toHaveLength(2);
  });

  it('should get statistics', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'Expert 1',
      description: 'Test',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.8,
    });

    registry.registerExpert(lora1, 'test');

    const stats = registry.getStatistics();

    expect(stats.totalExperts).toBe(1);
    expect(stats.avgExpertPerformance).toBe(0.8);
  });

  it('should export and import state', () => {
    const lora = new BaseLoRAAdapter({
      id: 'test-lora',
      name: 'Test',
      description: 'Test',
      baseModel: 'base-1b',
      rank: 16,
      alpha: 16,
      matrices: initializeLoRAMatrices(1024, 16),
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    registry.registerExpert(lora, 'test');

    const state = registry.exportState();

    expect(state.experts.length).toBe(1);

    const newRegistry = new ExpertRegistry();
    newRegistry.importState(state);

    const retrieved = newRegistry.getExpert('test-lora');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test');
  });
});

describe('createDefaultRegistry', () => {
  it('should create registry with default categories', () => {
    const registry = createDefaultRegistry();

    const categories = registry.listCategories();

    expect(categories).toContain('coding');
    expect(categories).toContain('writing');
    expect(categories).toContain('analysis');
    expect(categories).toContain('research');
  });
});
