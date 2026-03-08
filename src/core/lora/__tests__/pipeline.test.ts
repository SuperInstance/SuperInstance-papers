/**
 * Tests for LoRA Pipeline
 */

import { describe, it, expect } from '@jest/globals';
import {
  TrainingDataGenerator,
  LoRATrainer,
  LoRAPipeline,
} from '../pipeline.js';
import type { LoRATrainingConfig, TrainingExample, LoRADistillationConfig } from '../types.js';

describe('TrainingDataGenerator', () => {
  let generator: TrainingDataGenerator;

  beforeEach(() => {
    generator = new TrainingDataGenerator();
  });

  it('should generate training examples from teacher', async () => {
    const examples = await generator.generateFromTeacher('coding', 10, 'gpt-4');

    expect(examples).toHaveLength(10);
    expect(examples[0].input).toBeDefined();
    expect(examples[0].target).toBeDefined();
  });

  it('should validate examples', () => {
    const validExamples: TrainingExample[] = [
      { input: 'Write code', target: 'def foo(): pass' },
      { input: 'Debug this', target: 'Fixed the bug' },
    ];

    const invalidExamples: TrainingExample[] = [
      { input: '', target: 'Missing input' },
      { input: 'Valid input', target: '' },
    ];

    const validResult = generator.validateExamples(validExamples);
    const invalidResult = generator.validateExamples(invalidExamples);

    expect(validResult.valid).toBe(2);
    expect(validResult.invalid).toBe(0);

    expect(invalidResult.valid).toBe(0);
    expect(invalidResult.invalid).toBe(2);
  });
});

describe('LoRATrainer', () => {
  it('should train LoRA with config', async () => {
    const trainingData: TrainingExample[] = [
      { input: 'Example 1', target: 'Output 1' },
      { input: 'Example 2', target: 'Output 2' },
      { input: 'Example 3', target: 'Output 3' },
    ];

    const config: LoRATrainingConfig = {
      name: 'Test LoRA',
      expertise: ['test'],
      trainingData,
      rank: 8,
      alpha: 16,
      epochs: 2,
      batchSize: 2,
    };

    let progressCalls = 0;
    const trainer = new LoRATrainer((progress) => {
      progressCalls++;
    });

    const result = await trainer.trainLoRA(config);

    expect(result.lora).toBeDefined();
    expect(result.lora.name).toBe('Test LoRA');
    expect(result.lora.rank).toBe(8);
    expect(result.finalLoss).toBeLessThanOrEqual(1);
    expect(progressCalls).toBeGreaterThan(0);
  });

  it('should distill from large model', async () => {
    const distillConfig: LoRADistillationConfig = {
      teacherModel: 'gpt-4',
      expertise: 'coding',
      exampleCount: 5,
      targetRank: 8,
      temperature: 1.0,
    };

    const trainer = new LoRATrainer();

    const result = await trainer.distillFromLargeModel(distillConfig);

    expect(result.lora).toBeDefined();
    expect(result.lora.expertise).toContain('coding');
    expect(result.lora.rank).toBe(8);
  });
});

describe('LoRAPipeline', () => {
  const outputPath = './test-output-loras';

  it('should run full pipeline', async () => {
    const pipeline = new LoRAPipeline(outputPath);

    const config: LoRADistillationConfig = {
      teacherModel: 'gpt-4',
      expertise: 'test',
      exampleCount: 3,
      targetRank: 4,
    };

    const result = await pipeline.runPipeline(config);

    expect(result.lora).toBeDefined();
    expect(result.finalLoss).toBeGreaterThanOrEqual(0);
    expect(result.trainingTimeMs).toBeGreaterThan(0);
  }, 10000);

  it('should save and load LoRA', async () => {
    const pipeline = new LoRAPipeline(outputPath);

    const config: LoRADistillationConfig = {
      teacherModel: 'gpt-4',
      expertise: 'test-load',
      exampleCount: 2,
      targetRank: 4,
    };

    const result = await pipeline.runPipeline(config);
    const loraId = result.lora.id;

    const loaded = await pipeline.loadLoRA(loraId);

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe(loraId);
    expect(loaded?.name).toBe(result.lora.name);
  }, 10000);

  it('should list saved LoRAs', async () => {
    const pipeline = new LoRAPipeline(outputPath);

    const config: LoRADistillationConfig = {
      teacherModel: 'gpt-4',
      expertise: 'test-list',
      exampleCount: 2,
      targetRank: 4,
    };

    await pipeline.runPipeline(config);

    const loras = await pipeline.listLoRAs();

    expect(loras.length).toBeGreaterThan(0);
  }, 10000);
});
