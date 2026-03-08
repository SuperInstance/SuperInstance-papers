/**
 * Expert LoRA Library
 *
 * Collection of pre-configured expert LoRA adapters
 */

export {
  createCodeSpecialistLoRA,
  getCodeSpecialistTestPrompts,
} from './code-specialist.lora.js';

export {
  createDataAnalystLoRA,
  getDataAnalystTestPrompts,
} from './analyst.lora.js';

export {
  createWriterLoRA,
  getWriterTestPrompts,
} from './writer.lora.js';

export {
  createResearcherLoRA,
  getResearcherTestPrompts,
} from './researcher.lora.js';

import type { LoRAAdapter } from '../types.js';
import { createCodeSpecialistLoRA } from './code-specialist.lora.js';
import { createDataAnalystLoRA } from './analyst.lora.js';
import { createWriterLoRA } from './writer.lora.js';
import { createResearcherLoRA } from './researcher.lora.js';

/**
 * Get all available expert LoRAs
 */
export function getAllExpertLoRAs(): LoRAAdapter[] {
  return [
    createCodeSpecialistLoRA(),
    createDataAnalystLoRA(),
    createWriterLoRA(),
    createResearcherLoRA(),
  ];
}

/**
 * Get expert LoRA by name
 */
export function getExpertLoRAByName(name: string): LoRAAdapter | undefined {
  const loras = getAllExpertLoRAs();
  return loras.find(l => l.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get expert LoRAs by category
 */
export function getExpertLoRAsByCategory(category: string): LoRAAdapter[] {
  const loras = getAllExpertLoRAs();
  return loras.filter(l => l.trainingDomain.toLowerCase().includes(category.toLowerCase()));
}
