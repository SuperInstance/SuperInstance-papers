/**
 * Tests for LoRA Adapter
 */

import { describe, it, expect } from '@jest/globals';
import {
  BaseLoRAAdapter,
  initializeLoRAMatrices,
  mergeLoRAsLinear,
  mergeLoRAsSVD,
  computeInterference,
  optimizeWeights,
} from '../lora-adapter.js';
import type { LoRAMatrices } from '../types.js';

describe('BaseLoRAAdapter', () => {
  it('should create a LoRA adapter with valid properties', () => {
    const dimension = 1024;
    const rank = 16;
    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'test-lora-1',
      name: 'Test LoRA',
      description: 'Test adapter',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['coding', 'debugging'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 1000,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    expect(adapter.id).toBe('test-lora-1');
    expect(adapter.name).toBe('Test LoRA');
    expect(adapter.rank).toBe(rank);
    expect(adapter.alpha).toBe(16);
    expect(adapter.expertise).toEqual(['coding', 'debugging']);
    expect(adapter.usageCount).toBe(0);
    expect(adapter.avgPerformance).toBe(0.5);
  });

  it('should calculate size correctly', () => {
    const dimension = 1024;
    const rank = 16;
    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'test-lora-2',
      name: 'Size Test',
      description: 'Test size calculation',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    // Size = (A.length + B.length) * 4 bytes per float32
    const expectedSize = (matrices.A.length + matrices.B.length) * 4;
    expect(adapter.size).toBe(expectedSize);
  });

  it('should record usage and update performance', () => {
    const dimension = 512;
    const rank = 8;
    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'test-lora-3',
      name: 'Usage Test',
      description: 'Test usage recording',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.7,
    });

    expect(adapter.usageCount).toBe(0);

    adapter.recordUsage(0.8);
    expect(adapter.usageCount).toBe(1);
    expect(adapter.lastUsed).toBeGreaterThan(0);
    expect(adapter.avgPerformance).toBeGreaterThan(0.7);
    expect(adapter.avgPerformance).toBeLessThan(0.9);
  });

  it('should check compatibility correctly', () => {
    const dimension = 512;
    const rank = 8;
    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'test-lora-4',
      name: 'Compatibility Test',
      description: 'Test compatibility checking',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['test'],
      compatibleWith: ['compatible-lora'],
      conflictsWith: ['conflicting-lora'],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    expect(adapter.isCompatibleWith('compatible-lora')).toBe(true);
    expect(adapter.isCompatibleWith('conflicting-lora')).toBe(false);
    expect(adapter.isCompatibleWith('unknown-lora')).toBe(true);
  });

  it('should clone adapter correctly', () => {
    const dimension = 512;
    const rank = 8;
    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'test-lora-5',
      name: 'Clone Test',
      description: 'Test cloning',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.8,
    });

    const clone = adapter.clone();

    expect(clone.id).not.toBe(adapter.id);
    expect(clone.name).toBe('Clone Test (clone)');
    expect(clone.rank).toBe(adapter.rank);
    expect(clone.expertise).toEqual(adapter.expertise);
    expect(clone.avgPerformance).toBe(adapter.avgPerformance);
  });
});

describe('LoRA Matrix Operations', () => {
  it('should initialize matrices with correct dimensions', () => {
    const dimension = 1024;
    const rank = 16;

    const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

    expect(matrices.rank).toBe(rank);
    expect(matrices.dimension).toBe(dimension);
    expect(matrices.A.length).toBe(rank * dimension);
    expect(matrices.B.length).toBe(dimension * rank);
  });

  it('should initialize A matrix with non-zero values', () => {
    const dimension = 256;
    const rank = 8;

    const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

    let hasNonZero = false;
    for (let i = 0; i < matrices.A.length; i++) {
      if (matrices.A[i] !== 0) {
        hasNonZero = true;
        break;
      }
    }

    expect(hasNonZero).toBe(true);
  });

  it('should initialize B matrix with zeros', () => {
    const dimension = 256;
    const rank = 8;

    const matrices = initializeLoRAMatrices(dimension, rank);

    for (let i = 0; i < matrices.B.length; i++) {
      expect(matrices.B[i]).toBe(0);
    }
  });

  it('should compute delta weights', () => {
    const dimension = 128;
    const rank = 4;

    const matrices = initializeLoRAMatrices(dimension, rank);

    const adapter = new BaseLoRAAdapter({
      id: 'delta-test',
      name: 'Delta Test',
      description: 'Test delta computation',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices,
      expertise: ['test'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const delta = adapter.getDeltaWeights();

    expect(delta.length).toBe(dimension * dimension);
  });
});

describe('LoRA Merging', () => {
  it('should merge LoRAs linearly', () => {
    const dimension = 128;
    const rank = 4;

    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'LoRA 1',
      description: 'First LoRA',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices: initializeLoRAMatrices(dimension, rank),
      expertise: ['test1'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'LoRA 2',
      description: 'Second LoRA',
      baseModel: 'base-1b',
      rank,
      alpha: 16,
      matrices: initializeLoRAMatrices(dimension, rank),
      expertise: ['test2'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'test',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const merged = mergeLoRAsLinear(
      [
        { adapter: lora1, weight: 0.6 },
        { adapter: lora2, weight: 0.4 },
      ],
      dimension
    );

    expect(merged.length).toBe(dimension * dimension);
  });

  it('should compute interference between LoRAs', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'LoRA 1',
      description: 'First LoRA',
      baseModel: 'base-1b',
      rank: 8,
      alpha: 16,
      matrices: initializeLoRAMatrices(256, 8),
      expertise: ['coding'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'LoRA 2',
      description: 'Second LoRA',
      baseModel: 'base-1b',
      rank: 8,
      alpha: 16,
      matrices: initializeLoRAMatrices(256, 8),
      expertise: ['coding', 'debugging'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
    });

    const interference = computeInterference(lora1, lora2);

    expect(interference).toBeGreaterThanOrEqual(0);
    expect(interference).toBeLessThanOrEqual(1);
  });

  it('should optimize weights for composition', () => {
    const lora1 = new BaseLoRAAdapter({
      id: 'lora-1',
      name: 'LoRA 1',
      description: 'First LoRA',
      baseModel: 'base-1b',
      rank: 8,
      alpha: 16,
      matrices: initializeLoRAMatrices(256, 8),
      expertise: ['coding'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.9,
    });

    const lora2 = new BaseLoRAAdapter({
      id: 'lora-2',
      name: 'LoRA 2',
      description: 'Second LoRA',
      baseModel: 'base-1b',
      rank: 8,
      alpha: 16,
      matrices: initializeLoRAMatrices(256, 8),
      expertise: ['debugging'],
      compatibleWith: [],
      conflictsWith: [],
      trainingDataSize: 100,
      trainingDomain: 'software',
      trainingDate: Date.now(),
      version: '1.0.0',
      avgPerformance: 0.7,
    });

    const loras = [lora1, lora2];
    const interferenceMatrix = [
      [0, 0.1],
      [0.1, 0],
    ];

    const weights = optimizeWeights(loras, 'coding task', interferenceMatrix);

    expect(weights.length).toBe(2);
    expect(weights[0] + weights[1]).toBeCloseTo(1, 5);
  });
});
