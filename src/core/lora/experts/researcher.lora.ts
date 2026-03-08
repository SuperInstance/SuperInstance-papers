/**
 * Researcher LoRA
 *
 * Expertise in research, synthesis, and academic writing
 */

import { v4 as uuidv4 } from 'uuid';
import type { LoRAAdapter } from '../types.js';
import { BaseLoRAAdapter, initializeLoRAMatrices } from '../lora-adapter.js';

/**
 * Create Researcher LoRA adapter
 */
export function createResearcherLoRA(): LoRAAdapter {
  const dimension = 1024;
  const rank = 16;
  const matrices = initializeLoRAMatrices(dimension, rank, 'kaiming');

  return new BaseLoRAAdapter({
    id: uuidv4(),
    name: 'Researcher',
    description: 'Expertise in research methodology, information synthesis, literature review, and academic analysis',
    baseModel: 'base-1b',
    rank,
    alpha: 16,
    matrices,
    expertise: [
      'research',
      'literature review',
      'information synthesis',
      'academic writing',
      'critical analysis',
      'source evaluation',
      'research methodology',
      'hypothesis formulation',
      'experimental design',
      'knowledge organization',
    ],
    compatibleWith: ['code-specialist', 'analyst', 'writer'],
    conflictsWith: [],
    trainingDataSize: 10000,
    trainingDomain: 'research',
    trainingDate: Date.now(),
    version: '1.0.0',
    avgPerformance: 0.83,
  });
}

/**
 * Get research test prompts
 */
export function getResearcherTestPrompts(): string[] {
  return [
    'Research and summarize the current state of quantum computing',
    'Find and evaluate sources on this topic',
    'Design a research methodology for this study',
    'Synthesize findings from these papers',
    'Formulate a hypothesis based on this data',
    'Critically analyze this research paper',
    'Identify gaps in the literature',
    'Design an experiment to test this hypothesis',
    'Organize this information into a coherent framework',
    'Write a literature review on this topic',
  ];
}
