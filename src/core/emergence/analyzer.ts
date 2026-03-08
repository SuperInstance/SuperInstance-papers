/**
 * POLLN Emergence Analyzer
 *
 * Analyzes emergent behaviors to understand their properties
 * and provide insights for system improvement
 */

import {
  EmergentBehavior,
  EmergentCluster,
  EmergenceMetrics,
  CausalChain,
  EmergenceCategory,
} from './types';

export interface AnalysisResult {
  behaviors: AnalyzedBehavior[];
  clusters: EmergentCluster[];
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface AnalyzedBehavior extends EmergentBehavior {
  stability: number;           // How stable is the behavior
  impact: number;              // Impact on system performance
  complexity: number;          // Complexity of agent interactions
  reproducibility: number;     // How reproducible is the behavior
  dependencies: string[];      // Other behaviors this depends on
}

export interface Insight {
  type: InsightType;
  description: string;
  evidence: string[];
  confidence: number;
}

export enum InsightType {
  NOVEL_CAPABILITY = 'NOVEL_CAPABILITY',
  EFFICIENCY_GAIN = 'EFFICIENCY_GAIN',
  COLLABORATION_PATTERN = 'COLLABORATION_PATTERN',
  BOTTLENECK = 'BOTTLENECK',
  REDUNDANCY = 'REDUNDANCY',
  QUALITY_IMPROVEMENT = 'QUALITY_IMPROVEMENT',
  SCALABILITY_ISSUE = 'SCALABILITY_ISSUE',
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  expectedImpact: string;
}

export class EmergenceAnalyzer {
  /**
   * Analyze emergent behaviors in depth
   */
  analyzeBehaviors(behaviors: EmergentBehavior[]): AnalyzedBehavior[] {
    const analyzed: AnalyzedBehavior[] = [];

    for (const behavior of behaviors) {
      const analyzedBehavior: AnalyzedBehavior = {
        ...behavior,
        stability: this.calculateStability(behavior),
        impact: this.calculateImpact(behavior),
        complexity: this.calculateComplexity(behavior),
        reproducibility: this.calculateReproducibility(behavior),
        dependencies: this.findDependencies(behavior, behaviors),
      };

      analyzed.push(analyzedBehavior);
    }

    return analyzed;
  }

  /**
   * Identify emergent clusters (groups of agents with emergent properties)
   */
  identifyClusters(
    behaviors: EmergentBehavior[],
    metrics: EmergenceMetrics
  ): EmergentCluster[] {
    const clusters: EmergentCluster[] = [];

    // Group behaviors by agent overlap
    const agentGroups = this.groupByAgentOverlap(behaviors);

    for (const [agents, group] of agentGroups) {
      const cluster = this.createCluster(agents, group, metrics);
      if (cluster) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Generate insights from analysis
   */
  generateInsights(
    behaviors: EmergentBehavior[],
    clusters: EmergentCluster[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Novel capability insights
    for (const behavior of behaviors) {
      if (behavior.noveltyFactors.novelOutcome && behavior.emergenceScore > 0.8) {
        insights.push({
          type: InsightType.NOVEL_CAPABILITY,
          description: `Novel capability discovered: ${behavior.name}`,
          evidence: [
            `Outcome never seen before`,
            `Emergence score: ${behavior.emergenceScore.toFixed(2)}`,
            `Agents: ${behavior.participatingAgents.join(', ')}`,
          ],
          confidence: behavior.emergenceScore,
        });
      }
    }

    // Collaboration pattern insights
    for (const cluster of clusters) {
      if (cluster.modularity > 0.7) {
        insights.push({
          type: InsightType.COLLABORATION_PATTERN,
          description: `Strong collaboration pattern: ${cluster.interpretation}`,
          evidence: [
            `Modularity: ${cluster.modularity.toFixed(2)}`,
            `Cohesion: ${cluster.cohesion.toFixed(2)}`,
            `Agents: ${cluster.agents.length}`,
          ],
          confidence: cluster.modularity,
        });
      }
    }

    // Efficiency insights
    const highImpact = behaviors.filter(b => b.occurrenceCount > 10);
    if (highImpact.length > 0) {
      insights.push({
        type: InsightType.EFFICIENCY_GAIN,
        description: `${highImpact.length} high-impact emergent behaviors identified`,
        evidence: highImpact.map(b => `${b.name}: ${b.occurrenceCount} occurrences`),
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(
    behaviors: EmergentBehavior[],
    clusters: EmergentCluster[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommend reinforcing successful patterns
    const successful = behaviors.filter(
      b => b.validationStatus === 'validated' && b.occurrenceCount > 5
    );

    for (const behavior of successful) {
      recommendations.push({
        priority: 'high',
        action: `Reinforce pathway: ${behavior.name}`,
        reason: `Validated emergent behavior with ${behavior.occurrenceCount} occurrences`,
        expectedImpact: 'Increased efficiency and reliability',
      });
    }

    // Recommend cataloging novel behaviors
    const novel = behaviors.filter(
      b => b.validationStatus === 'candidate' && b.emergenceScore > 0.8
    );

    if (novel.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Validate and catalog ${novel.length} novel behaviors`,
        reason: 'High-scoring candidate behaviors detected',
        expectedImpact: 'Improved system capabilities',
      });
    }

    // Recommend optimizing clusters
    for (const cluster of clusters) {
      if (cluster.cohesion < 0.5) {
        recommendations.push({
          priority: 'low',
          action: `Optimize cluster: ${cluster.interpretation}`,
          reason: 'Low cohesion indicates potential inefficiency',
          expectedImpact: 'Better resource utilization',
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate stability of a behavior
   */
  private calculateStability(behavior: EmergentBehavior): number {
    // Stability based on occurrence frequency and consistency
    const age = Date.now() - behavior.discoveredAt;
    const frequency = behavior.occurrenceCount / (age / 1000 / 3600); // per hour

    // Normalize to 0-1
    return Math.min(1, frequency / 10);
  }

  /**
   * Calculate impact of a behavior
   */
  private calculateImpact(behavior: EmergentBehavior): number {
    // Impact based on occurrence count and emergence score
    return Math.min(1, (behavior.occurrenceCount * behavior.emergenceScore) / 20);
  }

  /**
   * Calculate complexity of a behavior
   */
  private calculateComplexity(behavior: EmergentBehavior): number {
    // Complexity based on number of agents and capabilities
    const agentComplexity = Math.min(1, behavior.participatingAgents.length / 10);
    const capabilityComplexity = Math.min(1, behavior.capabilities.length / 20);

    return (agentComplexity + capabilityComplexity) / 2;
  }

  /**
   * Calculate reproducibility of a behavior
   */
  private calculateReproducibility(behavior: EmergentBehavior): number {
    // Reproducibility based on occurrence count
    return Math.min(1, behavior.occurrenceCount / 10);
  }

  /**
   * Find dependencies between behaviors
   */
  private findDependencies(
    behavior: EmergentBehavior,
    allBehaviors: EmergentBehavior[]
  ): string[] {
    const dependencies: string[] = [];

    for (const other of allBehaviors) {
      if (other.id === behavior.id) continue;

      // Check if behaviors share agents
      const sharedAgents = behavior.participatingAgents.filter(a =>
        other.participatingAgents.includes(a)
      );

      if (sharedAgents.length > 0) {
        dependencies.push(other.id);
      }
    }

    return dependencies;
  }

  /**
   * Group behaviors by agent overlap
   */
  private groupByAgentOverlap(
    behaviors: EmergentBehavior[]
  ): Map<string, EmergentBehavior[]> {
    const groups = new Map<string, EmergentBehavior[]>();

    for (const behavior of behaviors) {
      const key = behavior.participatingAgents.sort().join('+');

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(behavior);
    }

    return groups;
  }

  /**
   * Create cluster from agent group
   */
  private createCluster(
    agents: string,
    behaviors: EmergentBehavior[],
    metrics: EmergenceMetrics
  ): EmergentCluster | null {
    if (behaviors.length === 0) return null;

    const agentList = agents.split('+');

    // Calculate cohesion (how tightly connected the agents are)
    const cohesion = this.calculateCohesion(agentList, behaviors);

    // Calculate modularity (how distinct this cluster is)
    const modularity = this.calculateModularity(agentList, behaviors);

    // Collect capabilities
    const capabilities = new Set<string>();
    for (const behavior of behaviors) {
      for (const cap of behavior.capabilities) {
        capabilities.add(cap);
      }
    }

    // Identify emergent abilities
    const emergentAbilities = behaviors
      .filter(b => b.emergenceScore > 0.7)
      .map(b => b.name);

    return {
      id: `cluster_${agents.replace(/\+/g, '_')}`,
      agents: agentList,
      capabilities: Array.from(capabilities),
      emergentAbilities,
      cohesion,
      modularity,
      interpretation: this.interpretCluster(agentList, behaviors),
    };
  }

  /**
   * Calculate cluster cohesion
   */
  private calculateCohesion(agents: string[], behaviors: EmergentBehavior[]): number {
    if (behaviors.length === 0) return 0;

    // Cohesion = average overlap in agent composition
    let totalOverlap = 0;

    for (let i = 0; i < behaviors.length; i++) {
      for (let j = i + 1; j < behaviors.length; j++) {
        const overlap = behaviors[i].participatingAgents.filter(a =>
          behaviors[j].participatingAgents.includes(a)
        ).length;

        const union = new Set([
          ...behaviors[i].participatingAgents,
          ...behaviors[j].participatingAgents,
        ]).size;

        totalOverlap += union > 0 ? overlap / union : 0;
      }
    }

    const pairs = (behaviors.length * (behaviors.length - 1)) / 2;
    return pairs > 0 ? totalOverlap / pairs : 0;
  }

  /**
   * Calculate cluster modularity
   */
  private calculateModularity(agents: string[], behaviors: EmergentBehavior[]): number {
    // Modularity = how distinct this cluster's agent composition is
    // For simplicity, use the average emergence score
    const avgEmergence = behaviors.reduce((sum, b) => sum + b.emergenceScore, 0) / behaviors.length;
    return avgEmergence;
  }

  /**
   * Interpret cluster function
   */
  private interpretCluster(agents: string[], behaviors: EmergentBehavior[]): string {
    // Analyze capabilities to generate interpretation
    const capabilities = new Set<string>();
    for (const behavior of behaviors) {
      for (const cap of behavior.capabilities) {
        capabilities.add(cap);
      }
    }

    const caps = Array.from(capabilities);
    if (caps.length < 3) {
      return `${caps.join('-')} collaboration`;
    }

    return `${caps[0]}-${caps[1]} collaboration group`;
  }

  /**
   * Categorize behavior
   */
  categorizeBehavior(behavior: EmergentBehavior): EmergenceCategory {
    // Simple categorization based on capabilities
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
}
