/**
 * Writer LoRA
 *
 * Expertise in writing, editing, and content creation
 */

import { v4 as uuidv4 } from 'uuid';
import type { LoRAAdapter } from '../types.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';

/**
 * Create Writer LoRA adapter
 */
export function createWriterLoRA(): LoRAAdapter {
  const dimension = 1024;
  const rank = 16;
  const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

  return new BaseLoRAAdapter({
    id: uuidv4(),
    name: 'Writer',
    description: 'Expertise in writing, editing, content creation, and communication across various styles and formats',
    baseModel: 'base-1b',
    rank,
    alpha: 16,
    matrices,
    expertise: [
      'creative writing',
      'technical writing',
      'editing',
      'content creation',
      'copywriting',
      'storytelling',
      'summarization',
      'documentation',
      'blog writing',
      'communication',
    ],
    compatibleWith: ['researcher'],
    conflictsWith: [],
    trainingDataSize: 10000,
    trainingDomain: 'writing',
    trainingDate: Date.now(),
    version: '1.0.0',
    avgPerformance: 0.80,
  });
}

/**
 * Get writing test prompts
 */
export function getWriterTestPrompts(): string[] {
  return [
    'Write a blog post about machine learning',
    'Edit this paragraph for clarity',
    'Summarize this article in 3 sentences',
    'Write a creative story about AI',
    'Create marketing copy for this product',
    'Write documentation for this API',
    'Rewrite this in a more formal tone',
    'Generate a catchy headline for this article',
    'Write an email announcing a new feature',
    'Create a script for this video tutorial',
  ];
}
