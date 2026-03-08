/**
 * POLLN Emergence Detector
 *
 * Detects emergent behaviors in agent systems
 * Based on EMERGENT_GRANULAR_INTELLIGENCE research
 *
 * Emergence condition:
 * ∃E : ¬∃aᵢ ∈ A, capability(aᵢ) ⊢ E
 *   ∧ ∃path = (a₁, a₂, ..., aₖ) : compose(path) ⊢ E
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  EmergentBehavior,
  CausalChain,
  TimeWindow,
  EmergenceAnalysis,
  EmergentPattern,
  NoveltyFactors,
  ValidationStatus,
  EmergenceDetectorConfig,
  EmergenceEvent,
  EmergenceEventType,
} from './types';
import { EmergenceMetricsCalculator } from './metrics';

export class EmergenceDetector extends EventEmitter {
  private config: EmergenceDetectorConfig;
  private metricsCalculator: EmergenceMetricsCalculator;
  private behaviors: Map<string, EmergentBehavior> = new Map();
  private patterns: Map<string, EmergentPattern> = new Map();
  private agentCapabilities: Map<string, Set<string>> = new Map();

  constructor(config: Partial<EmergenceDetectorConfig> = {}) {
    super();
    this.config = {
      analysisInterval: 60000,
      timeWindow: 3600000,
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

    this.metricsCalculator = new EmergenceMetricsCalculator(this.config);
    this.setupMetricsListener();
  }

  /**
   * Register agent capabilities
   */
  registerAgentCapabilities(agentId: string, capabilities: string[]): void {
    this.agentCapabilities.set(agentId, new Set(capabilities));
  }

  /**
   * Unregister agent
   */
  unregisterAgent(agentId: string): void {
    this.agentCapabilities.delete(agentId);
  }

  /**
   * Analyze causal chains for emergence
   */
  async analyzeEmergence(chains: CausalChain[]): Promise<EmergenceAnalysis> {
    // Calculate metrics
    const metrics = this.metricsCalculator.calculateMetrics(chains);

    // Detect emergent behaviors
    const behaviors = await this.detectEmergentBehaviors(chains);

    // Identify patterns
    const patterns = this.identifyPatterns(chains);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, behaviors, patterns);

    const analysis: EmergenceAnalysis = {
      behaviors,
      metrics,
      patterns,
      recommendations,
    };

    return analysis;
  }

  /**
   * Detect emergent behaviors in causal chains
   */
  private async detectEmergentBehaviors(chains: CausalChain[]): Promise<EmergentBehavior[]> {
    const candidates: EmergentBehavior[] = [];

    for (const chain of chains) {
      const analysis = await this.analyzeChain(chain);

      if (analysis.emergenceScore >= this.config.minEmergenceScore) {
        const behavior: EmergentBehavior = {
          id: uuidv4(),
          name: this.generateBehaviorName(chain),
          description: this.generateBehaviorDescription(chain),
          discoveredAt: Date.now(),
          causalChainId: chain.id,
          participatingAgents: chain.agents,
          capabilities: chain.capabilities,
          outcome: chain.outcome,
          emergenceScore: analysis.emergenceScore,
          noveltyFactors: analysis.noveltyFactors,
          validationStatus: 'candidate',
          lastSeen: Date.now(),
          occurrenceCount: 1,
        };

        candidates.push(behavior);

        // Emit discovery event
        const event: EmergenceEvent = {
          type: EmergenceEventType.BEHAVIOR_DISCOVERED,
          timestamp: Date.now(),
          severity: 'info',
          description: `Emergent behavior discovered: ${behavior.name}`,
          data: {
            behaviorId: behavior.id,
            emergenceScore: behavior.emergenceScore,
          },
        };
        this.emit('event', event);
      }
    }

    // Merge similar behaviors
    const merged = this.mergeSimilarBehaviors(candidates);

    // Store behaviors
    for (const behavior of merged) {
      const existing = this.findSimilarBehavior(behavior);
      if (existing) {
        // Update existing
        existing.occurrenceCount++;
        existing.lastSeen = Date.now();
        if (behavior.emergenceScore > existing.emergenceScore) {
          existing.emergenceScore = behavior.emergenceScore;
        }
      } else {
        // Add new
        this.behaviors.set(behavior.id, behavior);
      }
    }

    return merged;
  }

  /**
   * Analyze a single causal chain
   */
  private async analyzeChain(chain: CausalChain): Promise<{
    emergenceScore: number;
    noveltyFactors: NoveltyFactors;
  }> {
    // Check novelty factors
    const noveltyFactors = await this.checkNoveltyFactors(chain);

    // Calculate emergence score
    const emergenceScore =
      (noveltyFactors.novelOutcome ? 0.4 : 0) +
      (noveltyFactors.novelComposition ? 0.3 : 0) +
      (noveltyFactors.novelAssembly ? 0.3 : 0);

    return { emergenceScore, noveltyFactors };
  }

  /**
   * Check novelty factors for a chain
   */
  private async checkNoveltyFactors(chain: CausalChain): Promise<NoveltyFactors> {
    // Check if outcome is novel
    const novelOutcome = !this.isOutcomeKnown(chain.outcome);

    // Check if composition is novel
    const novelComposition = !this.isCompositionKnown(chain.agents);

    // Check if capabilities were co-located before
    const novelAssembly = !await this.wereCapabilitiesColocated(chain.capabilities);

    // Surprise factor - was this explicitly designed?
    // For now, assume anything multi-agent is potentially surprising
    const surprise = chain.agents.length > 1;

    return {
      novelOutcome,
      novelComposition,
      novelAssembly,
      surprise,
    };
  }

  /**
   * Check if outcome is known
   */
  private isOutcomeKnown(outcome: unknown): boolean {
    const hash = JSON.stringify(outcome);
    return this.behaviors.some(b => JSON.stringify(b.outcome) === hash);
  }

  /**
   * Check if composition is known
   */
  private isCompositionKnown(agents: string[]): boolean {
    const sorted = [...agents].sort();
    return this.behaviors.some(b => {
      const bSorted = [...b.participatingAgents].sort();
      return (
        bSorted.length === sorted.length &&
        bSorted.every((a, i) => a === sorted[i])
      );
    });
  }

  /**
   * Check if capabilities were co-located before
   */
  private async wereCapabilitiesColocated(capabilities: string[]): Promise<boolean> {
    // Check if any agent has all these capabilities
    for (const [, agentCaps] of this.agentCapabilities) {
      const hasAll = capabilities.every(cap => agentCaps.has(cap));
      if (hasAll) return true;
    }

    // Check if behaviors have this combination
    return this.behaviors.some(b => {
      const bCaps = new Set(b.capabilities);
      return capabilities.every(cap => bCaps.has(cap));
    });
  }

  /**
   * Identify patterns in causal chains
   */
  private identifyPatterns(chains: CausalChain[]): EmergentPattern[] {
    const patternCounts = new Map<string, {
      agents: string[];
      capabilities: string[];
      outcomes: unknown[];
    }>();

    // Group chains by agent composition
    for (const chain of chains) {
      const key = chain.agents.sort().join('+');

      if (!patternCounts.has(key)) {
        patternCounts.set(key, {
          agents: chain.agents,
          capabilities: chain.capabilities,
          outcomes: [],
        });
      }

      patternCounts.get(key)!.outcomes.push(chain.outcome);
    }

    // Convert to patterns
    const patterns: EmergentPattern[] = [];

    for (const [key, data] of patternCounts) {
      const frequency = data.outcomes.length;

      if (frequency >= this.config.minPatternFrequency) {
        // Calculate strength based on consistency
        const strength = this.calculatePatternStrength(data.outcomes);

        patterns.push({
          id: uuidv4(),
          name: this.generatePatternName(data.agents),
          frequency,
          agents: data.agents,
          capabilities: data.capabilities,
          averageOutcome: this.averageOutcome(data.outcomes),
          strength,
        });

        // Emit pattern detection event
        const event: EmergenceEvent = {
          type: EmergenceEventType.PATTERN_DETECTED,
          timestamp: Date.now(),
          severity: 'info',
          description: `Pattern detected: ${patterns[patterns.length - 1].name}`,
          data: {
            patternId: patterns[patterns.length - 1].id,
            frequency,
            strength,
          },
        };
        this.emit('event', event);
      }
    }

    return patterns;
  }

  /**
   * Calculate pattern strength (consistency of outcomes)
   */
  private calculatePatternStrength(outcomes: unknown[]): number {
    if (outcomes.length === 0) return 0;

    // Simple heuristic: if outcomes are similar, strength is high
    // In reality, you'd use more sophisticated similarity metrics
    const unique = new Set(outcomes.map(o => JSON.stringify(o)));
    return 1 - (unique.size / outcomes.length);
  }

  /**
   * Average outcomes (simplified)
   */
  private averageOutcome(outcomes: unknown[]): unknown {
    if (outcomes.length === 0) return null;
    // For now, just return the most common outcome
    const counts = new Map<string, number>();
    for (const o of outcomes) {
      const key = JSON.stringify(o);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    let maxCount = 0;
    let maxKey = '';
    for (const [key, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }

    return JSON.parse(maxKey);
  }

  /**
   * Merge similar behaviors
   */
  private mergeSimilarBehaviors(behaviors: EmergentBehavior[]): EmergentBehavior[] {
    // Group by agent composition
    const groups = new Map<string, EmergentBehavior[]>();

    for (const behavior of behaviors) {
      const key = behavior.participatingAgents.sort().join('+');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(behavior);
    }

    // Merge each group
    const merged: EmergentBehavior[] = [];

    for (const [key, group] of groups) {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        // Merge by taking the one with highest emergence score
        const best = group.sort((a, b) => b.emergenceScore - a.emergenceScore)[0];
        best.occurrenceCount = group.reduce((sum, b) => sum + b.occurrenceCount, 0);
        merged.push(best);
      }
    }

    return merged;
  }

  /**
   * Find similar existing behavior
   */
  private findSimilarBehavior(behavior: EmergentBehavior): EmergentBehavior | null {
    for (const existing of this.behaviors.values()) {
      const agentsMatch =
        existing.participatingAgents.length === behavior.participatingAgents.length &&
        existing.participatingAgents.every((a, i) => a === behavior.participatingAgents[i]);

      if (agentsMatch) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Generate behavior name
   */
  private generateBehaviorName(chain: CausalChain): string {
    const capabilities = chain.capabilities.slice(0, 3).join('+');
    return `Emergent_${capabilities}`;
  }

  /**
   * Generate behavior description
   */
  private generateBehaviorDescription(chain: CausalChain): string {
    return `Emergent behavior from agents ${chain.agents.join(', ')}`;
  }

  /**
   * Generate pattern name
   */
  private generatePatternName(agents: string[]): string {
    return `Pattern_${agents.slice(0, 2).join('_')}`;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: any,
    behaviors: EmergentBehavior[],
    patterns: EmergentPattern[]
  ): string[] {
    const recommendations: string[] = [];

    if (behaviors.length > 0) {
      recommendations.push(`Discovered ${behaviors.length} emergent behaviors`);
      recommendations.push('Consider cataloging and reinforcing successful patterns');
    }

    if (patterns.length > 0) {
      const strongPatterns = patterns.filter(p => p.strength > 0.7);
      if (strongPatterns.length > 0) {
        recommendations.push(`Found ${strongPatterns.length} strong patterns to reinforce`);
      }
    }

    if (metrics.overallScore > 0.8) {
      recommendations.push('High emergence detected - system is functioning well');
    } else if (metrics.overallScore < 0.3) {
      recommendations.push('Low emergence - consider increasing agent diversity');
    }

    return recommendations;
  }

  /**
   * Get all behaviors
   */
  getAllBehaviors(): EmergentBehavior[] {
    return Array.from(this.behaviors.values());
  }

  /**
   * Get behaviors by validation status
   */
  getBehaviorsByStatus(status: ValidationStatus): EmergentBehavior[] {
    return Array.from(this.behaviors.values()).filter(b => b.validationStatus === status);
  }

  /**
   * Validate a behavior
   */
  validateBehavior(behaviorId: string, status: ValidationStatus): void {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) return;

    behavior.validationStatus = status;

    const event: EmergenceEvent = {
      type: EmergenceEventType.BEHAVIOR_VALIDATED,
      timestamp: Date.now(),
      severity: status === 'validated' ? 'info' : 'warning',
      description: `Behavior ${status}: ${behavior.name}`,
      data: {
        behaviorId,
        status,
      },
    };
    this.emit('event', event);
  }

  /**
   * Setup metrics listener
   */
  private setupMetricsListener(): void {
    this.metricsCalculator.on('metrics:update', (metrics) => {
      this.emit('metrics:update', metrics);
    });
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): any | null {
    return this.metricsCalculator.getCurrentMetrics();
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): EmergentPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.behaviors.clear();
    this.patterns.clear();
    this.metricsCalculator.reset();
  }
}
