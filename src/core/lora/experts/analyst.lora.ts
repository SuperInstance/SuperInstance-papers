/**
 * Data Analyst LoRA
 *
 * Expertise in data analysis, visualization, and statistics
 */

import { v4 as uuidv4 } from 'uuid';
import type { LoRAAdapter } from '../types.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';

/**
 * Create Data Analyst LoRA adapter
 */
export function createDataAnalystLoRA(): LoRAAdapter {
  const dimension = 1024;
  const rank = 16;
  const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

  return new BaseLoRAAdapter({
    id: uuidv4(),
    name: 'Data Analyst',
    description: 'Expertise in data analysis, statistics, visualization, and deriving insights from data',
    baseModel: 'base-1b',
    rank,
    alpha: 16,
    matrices,
    expertise: [
      'data analysis',
      'statistics',
      'data visualization',
      'hypothesis testing',
      'regression analysis',
      'data cleaning',
      'pattern recognition',
      'trend analysis',
      'data interpretation',
      'experimental design',
    ],
    compatibleWith: ['code-specialist', 'researcher'],
    conflictsWith: [],
    trainingDataSize: 10000,
    trainingDomain: 'data science',
    trainingDate: Date.now(),
    version: '1.0.0',
    avgPerformance: 0.82,
  });
}

/**
 * Get data analysis test prompts
 */
export function getDataAnalystTestPrompts(): string[] {
  return [
    'Analyze this dataset for trends',
    'Calculate the correlation between these variables',
    'What statistical test should I use for this data?',
    'Identify outliers in this dataset',
    'Explain the significance of these p-values',
    'Create a visualization for this data',
    'Perform a regression analysis',
    'Clean this messy dataset',
    'What insights can you derive from this data?',
    'Design an A/B test for this scenario',
  ];
}
