/**
 * Expert Registry
 *
 * Maintains a registry of available expert LoRA adapters
 * Provides discovery, categorization, and metadata management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ExpertRegistryEntry,
  LoRAAdapter,
  EmergentAbility,
  LoRAPerformanceMetrics,
} from './types.js';

/**
 * Expert Registry
 * Manages catalog of expert LoRAs and emergent abilities
 */
export class ExpertRegistry {
  private experts: Map<string, ExpertRegistryEntry> = new Map();
  private performanceMetrics: Map<string, LoRAPerformanceMetrics> = new Map();
  private emergentAbilities: Map<string, EmergentAbility> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a new expert LoRA
   */
  registerExpert(lora: LoRAAdapter, category: string): ExpertRegistryEntry {
    const entry: ExpertRegistryEntry = {
      id: lora.id,
      name: lora.name,
      category,
      loraIds: [lora.id],
      expertise: [...lora.expertise],
      avgPerformance: lora.avgPerformance,
      useCount: 0,
    };

    this.experts.set(lora.id, entry);

    // Add to category
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(lora.id);

    // Initialize performance metrics
    this.performanceMetrics.set(lora.id, {
      loraId: lora.id,
      avgPerformance: lora.avgPerformance,
      stdDev: 0,
      evaluationCount: 0,
      lastEvaluated: Date.now(),
      taskPerformance: new Map(),
    });

    return entry;
  }

  /**
   * Get expert by ID
   */
  getExpert(id: string): ExpertRegistryEntry | undefined {
    return this.experts.get(id);
  }

  /**
   * Find experts by category
   */
  findByCategory(category: string): ExpertRegistryEntry[] {
    const ids = this.categories.get(category);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.experts.get(id))
      .filter((e): e is ExpertRegistryEntry => e !== undefined);
  }

  /**
   * Find experts by expertise tag
   */
  findByExpertise(expertise: string): ExpertRegistryEntry[] {
    return Array.from(this.experts.values()).filter(e =>
      e.expertise.some(tag => tag.toLowerCase().includes(expertise.toLowerCase()))
    );
  }

  /**
   * Search experts by query
   */
  search(query: string): ExpertRegistryEntry[] {
    const queryLower = query.toLowerCase();

    return Array.from(this.experts.values()).filter(e =>
      e.name.toLowerCase().includes(queryLower) ||
      e.expertise.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  /**
   * List all categories
   */
  listCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get recommended experts for a task
   */
  getRecommendations(task: string, maxCount: number = 3): Array<{
    expert: ExpertRegistryEntry;
    score: number;
    reason: string;
  }> {
    const taskLower = task.toLowerCase();
    const taskWords = new Set(taskLower.split(/\s+/));

    const scored = Array.from(this.experts.values()).map(expert => {
      let score = 0;
      const reasons: string[] = [];

      // Exact expertise match
      for (const tag of expert.expertise) {
        if (taskLower.includes(tag.toLowerCase())) {
          score += 0.5;
          reasons.push(`Matches expertise: ${tag}`);
        }
      }

      // Partial word match
      for (const tag of expert.expertise) {
        const tagWords = Array.from(new Set(tag.toLowerCase().split(/\s+/)));
        for (const word of Array.from(taskWords)) {
          if (tagWords.includes(word)) {
            score += 0.2;
            reasons.push(`Related to: ${word}`);
          }
        }
      }

      // Performance boost
      score += expert.avgPerformance * 0.3;

      // Use count penalty (prefer less used for diversity)
      score -= Math.min(expert.useCount * 0.01, 0.2);

      return {
        expert,
        score,
        reason: reasons.join(', ') || 'General purpose',
      };
    });

    // Sort by score and return top results
    return scored
      .filter(s => s.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount);
  }

  /**
   * Update performance metrics for a LoRA
   */
  updatePerformance(
    loraId: string,
    performance: number,
    task?: string
  ): void {
    const metrics = this.performanceMetrics.get(loraId);
    if (!metrics) return;

    metrics.evaluationCount++;
    metrics.lastEvaluated = Date.now();

    // Update average with exponential moving average
    const alpha = 0.2;
    metrics.avgPerformance = alpha * performance + (1 - alpha) * metrics.avgPerformance;

    // Update task-specific performance
    if (task) {
      const currentTaskPerf = metrics.taskPerformance.get(task) ?? 0.5;
      metrics.taskPerformance.set(
        task,
        alpha * performance + (1 - alpha) * currentTaskPerf
      );
    }

    // Update expert entry
    const expert = this.experts.get(loraId);
    if (expert) {
      expert.avgPerformance = metrics.avgPerformance;
      expert.useCount++;
    }
  }

  /**
   * Get performance metrics for a LoRA
   */
  getPerformanceMetrics(loraId: string): LoRAPerformanceMetrics | undefined {
    return this.performanceMetrics.get(loraId);
  }

  /**
   * Register an emergent ability
   */
  registerEmergentAbility(
    sourceLoRAs: string[],
    taskPerformance: Map<string, number>,
    name?: string
  ): EmergentAbility {
    const id = uuidv4();

    // Generate name if not provided
    const abilityName = name ?? this.generateEmergentName(sourceLoRAs);

    // Calculate metrics
    const performances = Array.from(taskPerformance.values());
    const transferability = this.calculateTransferability(taskPerformance);
    const generalization = taskPerformance.size / 10; // Normalized by假设的max tasks
    const robustness = 1 - (Math.max(...performances) - Math.min(...performances));

    const ability: EmergentAbility = {
      id,
      name: abilityName,
      sourceLoRAs,
      taskPerformance,
      transferability,
      generalization,
      robustness,
      useCount: 0,
      successRate: performances.reduce((a, b) => a + b, 0) / performances.length,
      discoveredAt: Date.now(),
    };

    this.emergentAbilities.set(id, ability);

    return ability;
  }

  /**
   * Get emergent ability by ID
   */
  getEmergentAbility(id: string): EmergentAbility | undefined {
    return this.emergentAbilities.get(id);
  }

  /**
   * Find emergent abilities that involve specific LoRAs
   */
  findEmergentAbilities(loraIds: string[]): EmergentAbility[] {
    return Array.from(this.emergentAbilities.values()).filter(ability =>
      ability.sourceLoRAs.some(id => loraIds.includes(id))
    );
  }

  /**
   * Get all emergent abilities
   */
  listEmergentAbilities(): EmergentAbility[] {
    return Array.from(this.emergentAbilities.values());
  }

  /**
   * Generate name for emergent ability
   */
  private generateEmergentName(loraIds: string[]): string {
    const experts = loraIds
      .map(id => this.experts.get(id))
      .filter((e): e is ExpertRegistryEntry => e !== undefined);

    if (experts.length === 0) {
      return 'Unknown Emergent Ability';
    }

    const domains = experts.map(e => e.category);
    const uniqueDomains = Array.from(new Set(domains));

    if (uniqueDomains.length === 1) {
      return `Advanced ${uniqueDomains[0]}`;
    } else if (uniqueDomains.length === 2) {
      return `${uniqueDomains[0]} + ${uniqueDomains[1]}`;
    } else {
      return `Multi-Domain (${uniqueDomains[0]}, ${uniqueDomains[1]}, ...)`;
    }
  }

  /**
   * Calculate transferability score
   */
  private calculateTransferability(taskPerformance: Map<string, number>): number {
    const performances = Array.from(taskPerformance.values());
    if (performances.length === 0) return 0;

    const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
    const aboveThreshold = performances.filter(p => p > 0.7).length;

    return (aboveThreshold / performances.length) * avg;
  }

  /**
   * Get statistics about the registry
   */
  getStatistics(): {
    totalExperts: number;
    totalCategories: number;
    totalEmergentAbilities: number;
    avgExpertPerformance: number;
    mostUsedExperts: Array<{ id: string; name: string; useCount: number }>;
  } {
    const experts = Array.from(this.experts.values());
    const totalPerformance = experts.reduce((sum, e) => sum + e.avgPerformance, 0);

    const mostUsed = [...experts]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 5)
      .map(e => ({ id: e.id, name: e.name, useCount: e.useCount }));

    return {
      totalExperts: this.experts.size,
      totalCategories: this.categories.size,
      totalEmergentAbilities: this.emergentAbilities.size,
      avgExpertPerformance: totalPerformance / Math.max(experts.length, 1),
      mostUsedExperts: mostUsed,
    };
  }

  /**
   * Export registry state
   */
  exportState(): {
    experts: Array<[string, ExpertRegistryEntry]>;
    categories: Array<[string, string[]]>;
    emergentAbilities: Array<[string, EmergentAbility]>;
  } {
    return {
      experts: Array.from(this.experts.entries()),
      categories: Array.from(this.categories.entries()).map(([cat, ids]) => [
        cat,
        Array.from(ids),
      ]),
      emergentAbilities: Array.from(this.emergentAbilities.entries()),
    };
  }

  /**
   * Import registry state
   */
  importState(state: {
    experts: Array<[string, ExpertRegistryEntry]>;
    categories: Array<[string, string[]]>;
    emergentAbilities: Array<[string, EmergentAbility]>;
  }): void {
    this.experts = new Map(state.experts);
    this.categories = new Map(
      state.categories.map(([cat, ids]) => [cat, new Set(ids)])
    );
    this.emergentAbilities = new Map(state.emergentAbilities);
  }

  /**
   * Clear all registry data
   */
  clear(): void {
    this.experts.clear();
    this.categories.clear();
    this.emergentAbilities.clear();
    this.performanceMetrics.clear();
  }
}

/**
 * Create a default expert registry with common categories
 */
export function createDefaultRegistry(): ExpertRegistry {
  const registry = new ExpertRegistry();

  // Define default categories
  const defaultCategories = [
    'coding',
    'writing',
    'analysis',
    'math',
    'research',
    'debugging',
    'optimization',
  ];

  // Initialize categories
  for (const category of defaultCategories) {
    registry['categories'].set(category, new Set());
  }

  return registry;
}
