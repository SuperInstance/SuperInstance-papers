/**
 * POLLN Emergent Ability Catalog
 *
 * Maintains a catalog of discovered and validated emergent abilities
 * Provides naming, documentation, and tracking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EmergentAbility,
  EmergentBehavior,
  EmergenceCategory,
  ValidationRecord,
  EmergentExample,
  EmergenceDetectorConfig,
} from './types';

export class EmergenceCatalog {
  private abilities: Map<string, EmergentAbility> = new Map();
  private config: EmergenceDetectorConfig;

  constructor(config: Partial<EmergenceDetectorConfig> = {}) {
    this.config = {
      catalogValidationThreshold: 0.8,
      ...config,
    };
  }

  /**
   * Add a behavior to the catalog
   */
  catalogBehavior(behavior: EmergentBehavior): EmergentAbility | null {
    // Check if meets validation threshold
    if (behavior.emergenceScore < this.config.catalogValidationThreshold) {
      return null;
    }

    // Check if already exists
    const existing = this.findAbility(behavior);
    if (existing) {
      // Update existing
      existing.usageFrequency++;
      existing.lastUsed = Date.now();
      return existing;
    }

    // Create new ability
    const ability = this.createAbility(behavior);
    this.abilities.set(ability.id, ability);

    return ability;
  }

  /**
   * Create ability from behavior
   */
  private createAbility(behavior: EmergentBehavior): EmergentAbility {
    const category = this.categorizeBehavior(behavior);

    const ability: EmergentAbility = {
      id: uuidv4(),
      name: this.generateAbilityName(behavior, category),
      description: this.generateAbilityDescription(behavior),
      category,
      subcategory: behavior.capabilities[0] || 'general',
      discoveredAt: behavior.discoveredAt,
      discoveredBy: behavior.participatingAgents.join(', '),
      capabilities: behavior.capabilities,
      agentComposition: behavior.participatingAgents,
      typicalPathway: behavior.participatingAgents,
      validationScore: behavior.emergenceScore,
      validationHistory: [],
      impactScore: this.calculateImpactScore(behavior),
      usageFrequency: behavior.occurrenceCount,
      lastUsed: behavior.lastSeen,
      examples: [],
      references: [],
    };

    return ability;
  }

  /**
   * Categorize behavior
   */
  private categorizeBehavior(behavior: EmergentBehavior): EmergenceCategory {
    const caps = behavior.capabilities.join(' ').toLowerCase();

    if (caps.includes('learn') || caps.includes('train')) {
      return EmergenceCategory.LEARNING;
    }
    if (caps.includes('create') || caps.includes('generate')) {
      return EmergenceCategory.CREATIVITY;
    }
    if (caps.includes('optimize') || caps.includes('improve')) {
      return EmergenceCategory.OPTIMIZATION;
    }
    if (caps.includes('adapt') || caps.includes('adjust')) {
      return EmergenceCategory.ADAPTATION;
    }
    if (caps.includes('communicate') || caps.includes('signal')) {
      return EmergenceCategory.COMMUNICATION;
    }
    if (caps.includes('solve') || caps.includes('problem')) {
      return EmergenceCategory.PROBLEM_SOLVING;
    }
    if (caps.includes('collaborate') || caps.includes('coordinate')) {
      return EmergenceCategory.COLLABORATION;
    }

    return EmergenceCategory.COMPOSITION;
  }

  /**
   * Generate ability name
   */
  private generateAbilityName(behavior: EmergentBehavior, category: EmergenceCategory): string {
    const caps = behavior.capabilities.slice(0, 2).join('_');
    const timestamp = Math.floor(behavior.discoveredAt / 1000);
    return `${category}_${caps}_${timestamp}`;
  }

  /**
   * Generate ability description
   */
  private generateAbilityDescription(behavior: EmergentBehavior): string {
    const caps = behavior.capabilities.slice(0, 3).join(', ');
    const agents = behavior.participatingAgents.slice(0, 3).join(', ');
    return `Emergent ${behavior.capabilities[0] || 'behavior'} combining ${caps} from agents ${agents}`;
  }

  /**
   * Calculate impact score
   */
  private calculateImpactScore(behavior: EmergentBehavior): number {
    // Impact based on emergence score and occurrence count
    return Math.min(1, (behavior.emergenceScore * Math.log(behavior.occurrenceCount + 1)) / 5);
  }

  /**
   * Find existing ability similar to behavior
   */
  private findAbility(behavior: EmergentBehavior): EmergentAbility | null {
    for (const ability of this.abilities.values()) {
      const agentsMatch =
        ability.agentComposition.length === behavior.participatingAgents.length &&
        ability.agentComposition.every((a, i) => a === behavior.participatingAgents[i]);

      const capsMatch =
        ability.capabilities.length === behavior.capabilities.length &&
        ability.capabilities.every((c, i) => c === behavior.capabilities[i]);

      if (agentsMatch && capsMatch) {
        return ability;
      }
    }

    return null;
  }

  /**
   * Get ability by ID
   */
  getAbility(id: string): EmergentAbility | undefined {
    return this.abilities.get(id);
  }

  /**
   * Get all abilities
   */
  getAllAbilities(): EmergentAbility[] {
    return Array.from(this.abilities.values());
  }

  /**
   * Get abilities by category
   */
  getAbilitiesByCategory(category: EmergenceCategory): EmergentAbility[] {
    return Array.from(this.abilities.values()).filter(a => a.category === category);
  }

  /**
   * Get abilities by validation score
   */
  getTopAbilities(limit: number = 10): EmergentAbility[] {
    return Array.from(this.abilities.values())
      .sort((a, b) => b.validationScore - a.validationScore)
      .slice(0, limit);
  }

  /**
   * Get most used abilities
   */
  getMostUsedAbilities(limit: number = 10): EmergentAbility[] {
    return Array.from(this.abilities.values())
      .sort((a, b) => b.usageFrequency - a.usageFrequency)
      .slice(0, limit);
  }

  /**
   * Get highest impact abilities
   */
  getHighestImpactAbilities(limit: number = 10): EmergentAbility[] {
    return Array.from(this.abilities.values())
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  /**
   * Add validation record
   */
  addValidationRecord(
    abilityId: string,
    validator: string,
    result: 'passed' | 'failed' | 'inconclusive',
    notes: string
  ): void {
    const ability = this.abilities.get(abilityId);
    if (!ability) return;

    const record: ValidationRecord = {
      timestamp: Date.now(),
      validator,
      result,
      notes,
    };

    ability.validationHistory.push(record);

    // Update validation score based on recent validations
    this.updateValidationScore(ability);
  }

  /**
   * Update validation score based on history
   */
  private updateValidationScore(ability: EmergentAbility): void {
    const recent = ability.validationHistory.slice(-10);
    if (recent.length === 0) return;

    const passed = recent.filter(r => r.result === 'passed').length;
    const failed = recent.filter(r => r.result === 'failed').length;

    const newScore = passed / (passed + failed);
    ability.validationScore = Math.max(0, Math.min(1, newScore));
  }

  /**
   * Add example
   */
  addExample(
    abilityId: string,
    context: string,
    input: unknown,
    output: unknown,
    agents: string[],
    outcome: string
  ): void {
    const ability = this.abilities.get(abilityId);
    if (!ability) return;

    const example: EmergentExample = {
      id: uuidv4(),
      timestamp: Date.now(),
      context,
      input,
      output,
      agents,
      outcome,
    };

    ability.examples.push(example);

    // Limit examples
    if (ability.examples.length > 100) {
      ability.examples = ability.examples.slice(-100);
    }
  }

  /**
   * Get examples for ability
   */
  getExamples(abilityId: string): EmergentExample[] {
    const ability = this.abilities.get(abilityId);
    return ability ? ability.examples : [];
  }

  /**
   * Search abilities by capability
   */
  searchByCapability(capability: string): EmergentAbility[] {
    return Array.from(this.abilities.values()).filter(a =>
      a.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))
    );
  }

  /**
   * Search abilities by agent
   */
  searchByAgent(agentId: string): EmergentAbility[] {
    return Array.from(this.abilities.values()).filter(a =>
      a.agentComposition.includes(agentId)
    );
  }

  /**
   * Get catalog statistics
   */
  getStats(): {
    totalAbilities: number;
    byCategory: Record<EmergenceCategory, number>;
    avgValidationScore: number;
    avgImpactScore: number;
    totalUsage: number;
  } {
    const abilities = Array.from(this.abilities.values());

    const byCategory: Record<EmergenceCategory, number> = {
      [EmergenceCategory.COMPOSITION]: 0,
      [EmergenceCategory.ADAPTATION]: 0,
      [EmergenceCategory.OPTIMIZATION]: 0,
      [EmergenceCategory.COLLABORATION]: 0,
      [EmergenceCategory.LEARNING]: 0,
      [EmergenceCategory.COMMUNICATION]: 0,
      [EmergenceCategory.PROBLEM_SOLVING]: 0,
      [EmergenceCategory.CREATIVITY]: 0,
      [EmergenceCategory.SELF_AWARENESS]: 0,
      [EmergenceCategory.SOCIAL]: 0,
    };

    for (const ability of abilities) {
      byCategory[ability.category]++;
    }

    const avgValidationScore = abilities.length > 0
      ? abilities.reduce((sum, a) => sum + a.validationScore, 0) / abilities.length
      : 0;

    const avgImpactScore = abilities.length > 0
      ? abilities.reduce((sum, a) => sum + a.impactScore, 0) / abilities.length
      : 0;

    const totalUsage = abilities.reduce((sum, a) => sum + a.usageFrequency, 0);

    return {
      totalAbilities: abilities.length,
      byCategory,
      avgValidationScore,
      avgImpactScore,
      totalUsage,
    };
  }

  /**
   * Delete ability
   */
  deleteAbility(id: string): void {
    this.abilities.delete(id);
  }

  /**
   * Clear catalog
   */
  clear(): void {
    this.abilities.clear();
  }

  /**
   * Export catalog as JSON
   */
  export(): string {
    const data = Array.from(this.abilities.values());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import catalog from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json) as EmergentAbility[];
      for (const ability of data) {
        this.abilities.set(ability.id, ability);
      }
    } catch (error) {
      throw new Error(`Failed to import catalog: ${error}`);
    }
  }
}
