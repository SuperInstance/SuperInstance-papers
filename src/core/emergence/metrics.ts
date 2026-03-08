/**
 * POLLN Emergence Metrics
 *
 * Computes various metrics for detecting emergence:
 * - Complexity: Graph entropy, pathway diversity
 * - Novelty: Outcome, pathway, composition novelty
 * - Synergy: Redundancy, mutual information, integration
 */

import { EventEmitter } from 'events';
import {
  EmergenceMetrics,
  ComplexityMetrics,
  NoveltyMetrics,
  SynergyMetrics,
  EmergenceDetectorConfig,
  CausalChain,
} from './types';

export class EmergenceMetricsCalculator extends EventEmitter {
  private config: EmergenceDetectorConfig;
  private metricsHistory: EmergenceMetrics[] = [];
  private knownOutcomes: Set<string> = new Set();
  private knownCompositions: Set<string> = new Set();
  private knownPathways: Map<string, number> = new Map();

  constructor(config: Partial<EmergenceDetectorConfig> = {}) {
    super();
    this.config = {
      analysisInterval: 60000,
      timeWindow: 3600000, // 1 hour
      minEmergenceScore: 0.7,
      patternSimilarityThreshold: 0.8,
      minPatternFrequency: 3,
      computeComplexity: true,
      computeNovelty: true,
      computeSynergy: true,
      autoCatalog: true,
      catalogValidationThreshold: 0.8,
      ...config,
    };
  }

  /**
   * Calculate all emergence metrics for a set of causal chains
   */
  calculateMetrics(chains: CausalChain[]): EmergenceMetrics {
    const complexity = this.config.computeComplexity
      ? this.calculateComplexityMetrics(chains)
      : this.getDefaultComplexityMetrics();

    const novelty = this.config.computeNovelty
      ? this.calculateNoveltyMetrics(chains)
      : this.getDefaultNoveltyMetrics();

    const synergy = this.config.computeSynergy
      ? this.calculateSynergyMetrics(chains)
      : this.getDefaultSynergyMetrics();

    const overallScore = this.combineScores(complexity, novelty, synergy);

    const metrics: EmergenceMetrics = {
      complexity,
      novelty,
      synergy,
      overallScore,
      timestamp: Date.now(),
    };

    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.emit('metrics:update', metrics);

    return metrics;
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexityMetrics(chains: CausalChain[]): ComplexityMetrics {
    if (chains.length === 0) {
      return this.getDefaultComplexityMetrics();
    }

    // Build agent interaction graph
    const graph = this.buildInteractionGraph(chains);

    // Graph entropy
    const graphEntropy = this.calculateGraphEntropy(graph);

    // Pathway diversity
    const pathwayDiversity = this.calculatePathwayDiversity(chains);

    // Functional coupling
    const functionalCoupling = this.calculateFunctionalCoupling(chains);

    // Structural complexity
    const structuralComplexity = this.calculateStructuralComplexity(graph);

    return {
      graphEntropy,
      pathwayDiversity,
      functionalCoupling,
      structuralComplexity,
    };
  }

  /**
   * Calculate novelty metrics
   */
  private calculateNoveltyMetrics(chains: CausalChain[]): NoveltyMetrics {
    if (chains.length === 0) {
      return this.getDefaultNoveltyMetrics();
    }

    let totalOutcomeNovelty = 0;
    let totalPathwayNovelty = 0;
    let totalCompositionNovelty = 0;
    let totalTemporalNovelty = 0;

    for (const chain of chains) {
      // Outcome novelty
      const outcomeHash = this.hashOutcome(chain.outcome);
      const outcomeNovelty = this.knownOutcomes.has(outcomeHash) ? 0 : 1;
      totalOutcomeNovelty += outcomeNovelty;
      if (outcomeNovelty === 1) {
        this.knownOutcomes.add(outcomeHash);
      }

      // Pathway novelty
      const pathwayHash = this.hashPathway(chain.agents);
      const pathwayCount = this.knownPathways.get(pathwayHash) || 0;
      const pathwayNovelty = pathwayCount === 0 ? 1 : 1 / (pathwayCount + 1);
      totalPathwayNovelty += pathwayNovelty;
      this.knownPathways.set(pathwayHash, pathwayCount + 1);

      // Composition novelty
      const compositionHash = this.hashComposition(chain.agents);
      const compositionNovelty = this.knownCompositions.has(compositionHash) ? 0 : 1;
      totalCompositionNovelty += compositionNovelty;
      if (compositionNovelty === 1) {
        this.knownCompositions.add(compositionHash);
      }

      // Temporal novelty (based on timing)
      const temporalNovelty = this.calculateTemporalNovelty(chain);
      totalTemporalNovelty += temporalNovelty;
    }

    const count = chains.length;
    return {
      outcomeNovelty: totalOutcomeNovelty / count,
      pathwayNovelty: totalPathwayNovelty / count,
      compositionNovelty: totalCompositionNovelty / count,
      temporalNovelty: totalTemporalNovelty / count,
    };
  }

  /**
   * Calculate synergy metrics
   */
  private calculateSynergyMetrics(chains: CausalChain[]): SynergyMetrics {
    if (chains.length === 0) {
      return this.getDefaultSynergyMetrics();
    }

    // Calculate mutual information between agents
    const mutualInformation = this.calculateMutualInformation(chains);

    // Calculate redundancy
    const redundancy = this.calculateRedundancy(chains);

    // Calculate integration
    const integration = this.calculateIntegration(chains);

    // Emergence = whole > sum of parts
    const emergence = this.calculateWholeGreaterParts(chains);

    return {
      redundancy,
      mutualInformation,
      integration,
      emergence,
    };
  }

  /**
   * Build interaction graph from causal chains
   */
  private buildInteractionGraph(chains: CausalChain[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const chain of chains) {
      for (let i = 0; i < chain.agents.length - 1; i++) {
        const source = chain.agents[i];
        const target = chain.agents[i + 1];

        if (!graph.has(source)) {
          graph.set(source, new Set());
        }
        graph.get(source)!.add(target);
      }
    }

    return graph;
  }

  /**
   * Calculate graph entropy
   */
  private calculateGraphEntropy(graph: Map<string, Set<string>>): number {
    const nodes = Array.from(graph.keys());
    if (nodes.length === 0) return 0;

    let totalEdges = 0;
    for (const neighbors of graph.values()) {
      totalEdges += neighbors.size;
    }

    if (totalEdges === 0) return 0;

    let entropy = 0;
    for (const neighbors of graph.values()) {
      const probability = neighbors.size / totalEdges;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Calculate pathway diversity
   */
  private calculatePathwayDiversity(chains: CausalChain[]): number {
    if (chains.length === 0) return 0;

    const uniquePathways = new Set<string>();
    for (const chain of chains) {
      uniquePathways.add(this.hashPathway(chain.agents));
    }

    return uniquePathways.size / chains.length;
  }

  /**
   * Calculate functional coupling
   */
  private calculateFunctionalCoupling(chains: CausalChain[]): number {
    if (chains.length === 0) return 0;

    // How often do the same agents work together
    const agentPairs = new Map<string, number>();

    for (const chain of chains) {
      for (let i = 0; i < chain.agents.length - 1; i++) {
        const pair = `${chain.agents[i]}-${chain.agents[i + 1]}`;
        agentPairs.set(pair, (agentPairs.get(pair) || 0) + 1);
      }
    }

    if (agentPairs.size === 0) return 0;

    // Calculate normalized entropy
    const total = Array.from(agentPairs.values()).reduce((a, b) => a + b, 0);
    let entropy = 0;

    for (const count of agentPairs.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    const maxEntropy = Math.log2(agentPairs.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Calculate structural complexity
   */
  private calculateStructuralComplexity(graph: Map<string, Set<string>>): number {
    const nodes = Array.from(graph.keys());
    if (nodes.length === 0) return 0;

    // Count cycles (feedback loops)
    let cycles = 0;
    for (const node of nodes) {
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (graph.has(neighbor) && graph.get(neighbor)!.has(node)) {
          cycles++;
        }
      }
    }

    // Normalize by max possible cycles
    const maxCycles = nodes.length * (nodes.length - 1) / 2;
    return maxCycles > 0 ? cycles / maxCycles : 0;
  }

  /**
   * Calculate temporal novelty
   */
  private calculateTemporalNovelty(chain: CausalChain): number {
    // Check if timing/sequence is novel
    // For now, use simple heuristic based on chain length
    const length = chain.agents.length;
    return Math.min(1, length / 10); // Longer chains = more novel
  }

  /**
   * Calculate mutual information
   */
  private calculateMutualInformation(chains: CausalChain[]): number {
    // Simplified MI calculation
    const agentCounts = new Map<string, number>();
    let totalInteractions = 0;

    for (const chain of chains) {
      for (const agent of chain.agents) {
        agentCounts.set(agent, (agentCounts.get(agent) || 0) + 1);
      }
      totalInteractions += chain.agents.length;
    }

    if (totalInteractions === 0) return 0;

    // Calculate entropy of agent distribution
    let entropy = 0;
    for (const count of agentCounts.values()) {
      const p = count / totalInteractions;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Calculate redundancy
   */
  private calculateRedundancy(chains: CausalChain[]): number {
    if (chains.length === 0) return 0;

    // How many chains have similar agent sequences
    const pathwayHashes = chains.map(c => this.hashPathway(c.agents));
    const unique = new Set(pathwayHashes);

    return 1 - (unique.size / chains.length);
  }

  /**
   * Calculate integration
   */
  private calculateIntegration(chains: CausalChain[]): number {
    // How integrated are different capabilities
    const capabilities = new Set<string>();
    const coOccurrence = new Map<string, Set<string>>();

    for (const chain of chains) {
      for (const cap of chain.capabilities) {
        capabilities.add(cap);
      }

      // Track co-occurrences
      for (let i = 0; i < chain.capabilities.length; i++) {
        for (let j = i + 1; j < chain.capabilities.length; j++) {
          const pair = [chain.capabilities[i], chain.capabilities[j]].sort().join('-');
          if (!coOccurrence.has(pair)) {
            coOccurrence.set(pair, new Set());
          }
          coOccurrence.get(pair)!.add(chain.id);
        }
      }
    }

    if (capabilities.size < 2) return 0;

    // Integration = actual co-occurrences / possible co-occurrences
    const actual = coOccurrence.size;
    const possible = (capabilities.size * (capabilities.size - 1)) / 2;

    return possible > 0 ? actual / possible : 0;
  }

  /**
   * Calculate emergence (whole > parts)
   */
  private calculateWholeGreaterParts(chains: CausalChain[]): number {
    // Count how many chains produce outcomes no single agent could
    let emergentCount = 0;

    for (const chain of chains) {
      // Check if outcome requires multiple agents
      if (chain.agents.length > 1) {
        // Check if capabilities are distributed
        const agentCaps = new Map<string, Set<string>>();

        // This is simplified - in reality, you'd track which agent has which capability
        for (const cap of chain.capabilities) {
          // Assume each capability comes from different agent
          if (!agentCaps.has(cap)) {
            agentCaps.set(cap, new Set());
          }
        }

        if (agentCaps.size > 1) {
          emergentCount++;
        }
      }
    }

    return chains.length > 0 ? emergentCount / chains.length : 0;
  }

  /**
   * Combine scores into overall emergence score
   */
  private combineScores(
    complexity: ComplexityMetrics,
    novelty: NoveltyMetrics,
    synergy: SynergyMetrics
  ): number {
    // Weighted combination
    const complexityScore = (
      complexity.graphEntropy +
      complexity.pathwayDiversity +
      complexity.structuralComplexity
    ) / 3;

    const noveltyScore = (
      novelty.outcomeNovelty +
      novelty.pathwayNovelty +
      novelty.compositionNovelty
    ) / 3;

    const synergyScore = synergy.emergence;

    // Weigh novelty higher for emergence
    return (
      complexityScore * 0.3 +
      noveltyScore * 0.5 +
      synergyScore * 0.2
    );
  }

  /**
   * Hash functions for novelty tracking
   */
  private hashOutcome(outcome: unknown): string {
    return JSON.stringify(outcome);
  }

  private hashPathway(agents: string[]): string {
    return agents.join('->');
  }

  private hashComposition(agents: string[]): string {
    return agents.sort().join('+');
  }

  /**
   * Default metrics
   */
  private getDefaultComplexityMetrics(): ComplexityMetrics {
    return {
      graphEntropy: 0,
      pathwayDiversity: 0,
      functionalCoupling: 0,
      structuralComplexity: 0,
    };
  }

  private getDefaultNoveltyMetrics(): NoveltyMetrics {
    return {
      outcomeNovelty: 0,
      pathwayNovelty: 0,
      compositionNovelty: 0,
      temporalNovelty: 0,
    };
  }

  private getDefaultSynergyMetrics(): SynergyMetrics {
    return {
      redundancy: 0,
      mutualInformation: 0,
      integration: 0,
      emergence: 0,
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): EmergenceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): EmergenceMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.metricsHistory = [];
    this.knownOutcomes.clear();
    this.knownCompositions.clear();
    this.knownPathways.clear();
  }
}
