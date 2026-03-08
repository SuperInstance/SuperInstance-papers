/**
 * Code Specialist LoRA
 *
 * Expertise in code generation, debugging, and optimization
 */

import { v4 as uuidv4 } from 'uuid';
import type { LoRAAdapter } from '../types.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';

/**
 * Create Code Specialist LoRA adapter
 */
export function createCodeSpecialistLoRA(): LoRAAdapter {
  const dimension = 1024;
  const rank = 16;
  const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

  return new BaseLoRAAdapter({
    id: uuidv4(),
    name: 'Code Specialist',
    description: 'Expertise in code generation, debugging, and optimization across multiple programming languages',
    baseModel: 'base-1b',
    rank,
    alpha: 16,
    matrices,
    expertise: [
      'code generation',
      'debugging',
      'code optimization',
      'code review',
      'algorithm design',
      'data structures',
      'programming languages',
      'software architecture',
      'testing',
      'refactoring',
    ],
    compatibleWith: ['data-analyst', 'researcher'],
    conflictsWith: [],
    trainingDataSize: 10000,
    trainingDomain: 'software engineering',
    trainingDate: Date.now(),
    version: '1.0.0',
    avgPerformance: 0.85,
  });
}

/**
 * Get code specialization prompts for testing
 */
export function getCodeSpecialistTestPrompts(): string[] {
  return [
    'Write a Python function to implement binary search',
    'Debug this JavaScript code that has a memory leak',
    'Optimize this SQL query for better performance',
    'Review this code for security vulnerabilities',
    'Explain the time complexity of this algorithm',
    'Refactor this function to be more readable',
    'Convert this Python code to JavaScript',
    'Design a data structure for a LRU cache',
    'Write unit tests for this function',
    'Identify the bug in this concurrent code',
  ];
}
