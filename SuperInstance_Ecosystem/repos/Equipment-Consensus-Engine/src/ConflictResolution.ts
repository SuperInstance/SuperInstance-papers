/**
 * ConflictResolution - Resolve disagreements between perspectives
 * 
 * Implements strategies for detecting and resolving conflicts when
 * Pathos, Logos, and Ethos perspectives disagree on a proposition.
 * 
 * @module ConflictResolution
 */

import type { PerspectiveType, PerspectiveOpinion } from './ConsensusEngine';

/**
 * Types of conflicts that can occur between perspectives
 */
export type ConflictType =
  | 'fundamental_disagreement'  // Perspectives have opposing verdicts
  | 'uncertainty'              // All perspectives have low confidence
  | 'partial_disagreement'     // Some perspectives disagree
  | 'weight_imbalance'         // Weight distribution is problematic
  | 'cross_perspective_tension' // Perspectives challenge each other
  | 'context_inconsistency';   // Context interpretation differs

/**
 * Severity levels for conflicts
 */
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Strategies for resolving conflicts
 */
export type ResolutionStrategy =
  | 'weighted_voting'          // Use perspective weights to decide
  | 'deliberation_extension'   // Add more deliberation rounds
  | 'reframing'               // Reframe the proposition
  | 'escalation'              // Escalate to higher authority
  | 'compromise'              // Find middle ground
  | 'conditional_approval'    // Approve with conditions
  | 'suspension'              // Suspend decision pending more info
  | 'perspective_dominance';  // Let dominant perspective decide

/**
 * Record of a detected conflict
 */
export interface ConflictRecord {
  /** Type of conflict */
  type: ConflictType;
  /** Perspectives involved in the conflict */
  perspectives: PerspectiveType[];
  /** Severity of the conflict */
  severity: ConflictSeverity;
  /** Description of the conflict */
  description: string;
  /** Additional context about the conflict */
  context: Record<string, unknown>;
}

/**
 * Result of conflict resolution
 */
export interface ResolutionResult {
  /** Whether the conflict was resolved */
  resolved: boolean;
  /** Strategy used for resolution */
  strategy: ResolutionStrategy;
  /** The outcome of resolution */
  outcome: string;
  /** Resolved verdict if applicable */
  verdict?: string;
  /** Confidence in the resolution */
  confidence: number;
  /** Any conditions attached to the resolution */
  conditions?: string[];
  /** Remaining concerns after resolution */
  remainingConcerns: string[];
  /** Perspectives that accepted the resolution */
  acceptedBy: PerspectiveType[];
  /** Perspectives that rejected the resolution */
  rejectedBy: PerspectiveType[];
}

/**
 * Outcome of mediation between perspectives
 */
export interface MediationOutcome {
  /** Whether mediation was successful */
  success: boolean;
  /** Mediated position */
  position: string;
  /** Confidence in mediated position */
  confidence: number;
  /** Compromises made by each perspective */
  compromises: Array<{
    perspective: PerspectiveType;
    concession: string;
  }>;
  /** Whether further deliberation is needed */
  needsFurtherDeliberation: boolean;
}

/**
 * Conflict resolution configuration
 */
interface ResolutionConfig {
  /** Maximum number of resolution attempts */
  maxAttempts: number;
  /** Preferred resolution strategies in order */
  preferredStrategies: ResolutionStrategy[];
  /** Minimum confidence to consider a resolution successful */
  minConfidence: number;
  /** Whether to allow escalation */
  allowEscalation: boolean;
}

/**
 * Default resolution configuration
 */
const DEFAULT_CONFIG: ResolutionConfig = {
  maxAttempts: 3,
  preferredStrategies: [
    'weighted_voting',
    'compromise',
    'conditional_approval',
    'deliberation_extension',
    'reframing',
    'escalation',
  ],
  minConfidence: 0.6,
  allowEscalation: true,
};

/**
 * ConflictResolution - Handles disagreements between perspectives
 * 
 * Provides mechanisms to detect, analyze, and resolve conflicts that arise
 * when different perspectives (Pathos, Logos, Ethos) disagree on a proposition.
 * 
 * @example
 * ```typescript
 * const resolver = new ConflictResolution();
 * 
 * const conflict: ConflictRecord = {
 *   type: 'fundamental_disagreement',
 *   perspectives: ['pathos', 'logos'],
 *   severity: 'high',
 *   description: 'Emotional appeal conflicts with logical analysis',
 *   context: { ... }
 * };
 * 
 * const result = await resolver.resolve(conflict, opinions);
 * console.log(result.verdict); // Resolved verdict
 * ```
 */
export class ConflictResolution {
  private readonly config: ResolutionConfig;
  private readonly resolutionHistory: Array<{
    conflict: ConflictRecord;
    result: ResolutionResult;
    timestamp: Date;
  }>;

  /**
   * Creates a new ConflictResolution instance
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<ResolutionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resolutionHistory = [];
  }

  /**
   * Resolves a conflict between perspectives
   * @param conflict - The conflict to resolve
   * @param opinions - Current perspective opinions
   * @returns The resolution result
   */
  async resolve(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): Promise<ResolutionResult> {
    // Select appropriate resolution strategy based on conflict type
    const strategy = this.selectStrategy(conflict, opinions);
    
    // Apply the selected strategy
    let result = await this.applyStrategy(strategy, conflict, opinions);
    
    // If resolution failed, try alternative strategies
    let attempts = 1;
    while (!result.resolved && attempts < this.config.maxAttempts) {
      const alternativeStrategy = this.selectAlternativeStrategy(
        strategy,
        conflict,
        result
      );
      result = await this.applyStrategy(alternativeStrategy, conflict, opinions);
      attempts++;
    }

    // Record the resolution attempt
    this.resolutionHistory.push({
      conflict,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Selects the best resolution strategy for a conflict
   */
  private selectStrategy(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionStrategy {
    // Strategy selection based on conflict type
    const strategyMap: Record<ConflictType, ResolutionStrategy[]> = {
      fundamental_disagreement: ['compromise', 'reframing', 'escalation'],
      uncertainty: ['deliberation_extension', 'suspension'],
      partial_disagreement: ['weighted_voting', 'conditional_approval'],
      weight_imbalance: ['perspective_dominance', 'reframing'],
      cross_perspective_tension: ['compromise', 'deliberation_extension'],
      context_inconsistency: ['reframing', 'deliberation_extension'],
    };

    const strategies = strategyMap[conflict.type] ?? ['weighted_voting'];
    
    // Consider severity
    if (conflict.severity === 'critical' && this.config.allowEscalation) {
      return 'escalation';
    }

    if (conflict.severity === 'high') {
      // Use more deliberative strategies for high severity
      const deliberativeStrategy = strategies.find(s => 
        s === 'compromise' || s === 'deliberation_extension'
      );
      if (deliberativeStrategy) return deliberativeStrategy;
    }

    // Use first available strategy
    return strategies[0] ?? 'weighted_voting';
  }

  /**
   * Selects an alternative strategy when primary fails
   */
  private selectAlternativeStrategy(
    failedStrategy: ResolutionStrategy,
    conflict: ConflictRecord,
    previousResult: ResolutionResult
  ): ResolutionStrategy {
    // Find next strategy in preferred order
    const currentIndex = this.config.preferredStrategies.indexOf(failedStrategy);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < this.config.preferredStrategies.length) {
      return this.config.preferredStrategies[nextIndex]!;
    }

    // If we've tried all preferred strategies, use escalation as last resort
    if (this.config.allowEscalation) {
      return 'escalation';
    }

    return 'suspension';
  }

  /**
   * Applies a specific resolution strategy
   */
  private async applyStrategy(
    strategy: ResolutionStrategy,
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): Promise<ResolutionResult> {
    switch (strategy) {
      case 'weighted_voting':
        return this.applyWeightedVoting(conflict, opinions);
      case 'deliberation_extension':
        return this.applyDeliberationExtension(conflict, opinions);
      case 'reframing':
        return this.applyReframing(conflict, opinions);
      case 'escalation':
        return this.applyEscalation(conflict, opinions);
      case 'compromise':
        return this.applyCompromise(conflict, opinions);
      case 'conditional_approval':
        return this.applyConditionalApproval(conflict, opinions);
      case 'suspension':
        return this.applySuspension(conflict, opinions);
      case 'perspective_dominance':
        return this.applyPerspectiveDominance(conflict, opinions);
      default:
        return this.createUnresolvedResult(strategy, conflict);
    }
  }

  /**
   * Applies weighted voting strategy
   */
  private applyWeightedVoting(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    // Calculate weighted scores
    let positiveScore = 0;
    let negativeScore = 0;
    const positiveIndicators = ['yes', 'agree', 'support', 'affirm', 'positive', 'true'];
    const negativeIndicators = ['no', 'disagree', 'oppose', 'reject', 'negative', 'false'];

    for (const opinion of opinions) {
      const verdict = opinion.verdict.toLowerCase();
      const isPositive = positiveIndicators.some(p => verdict.includes(p));
      const isNegative = negativeIndicators.some(n => verdict.includes(n));

      if (isPositive) {
        positiveScore += opinion.weight * opinion.confidence;
      } else if (isNegative) {
        negativeScore += opinion.weight * opinion.confidence;
      }
    }

    const totalScore = positiveScore + negativeScore;
    const verdict = positiveScore > negativeScore ? 'Proceed with the proposition' : 'Decline the proposition';
    const confidence = totalScore > 0 ? Math.abs(positiveScore - negativeScore) / totalScore : 0.5;

    return {
      resolved: confidence >= this.config.minConfidence,
      strategy: 'weighted_voting',
      outcome: `Weighted voting resulted in ${positiveScore > negativeScore ? 'approval' : 'rejection'} with ${(confidence * 100).toFixed(1)}% confidence`,
      verdict,
      confidence,
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: opinions.filter(op => {
        const verdict = op.verdict.toLowerCase();
        const isPositive = positiveIndicators.some(p => verdict.includes(p));
        return (positiveScore > negativeScore) === isPositive;
      }).map(op => op.perspective),
      rejectedBy: opinions.filter(op => {
        const verdict = op.verdict.toLowerCase();
        const isPositive = positiveIndicators.some(p => verdict.includes(p));
        return (positiveScore > negativeScore) !== isPositive;
      }).map(op => op.perspective),
    };
  }

  /**
   * Applies deliberation extension strategy
   */
  private applyDeliberationExtension(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    const focusAreas = this.identifyFocusAreas(conflict, opinions);

    return {
      resolved: false,
      strategy: 'deliberation_extension',
      outcome: 'Additional deliberation rounds required',
      confidence: 0,
      conditions: [
        `Conduct additional deliberation focusing on: ${focusAreas.join(', ')}`,
        'Re-evaluate after gathering more information',
      ],
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: [],
      rejectedBy: [],
    };
  }

  /**
   * Applies reframing strategy
   */
  private applyReframing(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    // Generate reframed propositions
    const reframedOptions = this.generateReframedOptions(opinions);

    return {
      resolved: false,
      strategy: 'reframing',
      outcome: 'Proposition should be reframed to address conflicting perspectives',
      confidence: 0,
      conditions: reframedOptions.map((option, i) => 
        `Alternative ${i + 1}: ${option}`
      ),
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: [],
      rejectedBy: [],
    };
  }

  /**
   * Applies escalation strategy
   */
  private applyEscalation(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    const summary = this.summarizeConflict(conflict, opinions);

    return {
      resolved: false,
      strategy: 'escalation',
      outcome: 'Decision requires escalation to higher authority',
      confidence: 0,
      conditions: [
        'Present all perspectives to decision-making authority',
        `Conflict summary: ${summary}`,
        'Await authoritative decision',
      ],
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: [],
      rejectedBy: opinions.map(op => op.perspective),
    };
  }

  /**
   * Applies compromise strategy
   */
  private applyCompromise(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    const mediation = this.mediateBetweenPerspectives(opinions);
    
    return {
      resolved: mediation.success,
      strategy: 'compromise',
      outcome: mediation.success 
        ? 'Compromise reached between perspectives' 
        : 'Unable to reach compromise',
      verdict: mediation.position,
      confidence: mediation.confidence,
      conditions: mediation.compromises.map(c => 
        `${c.perspective}: ${c.concession}`
      ),
      remainingConcerns: mediation.needsFurtherDeliberation 
        ? ['Further deliberation may refine the compromise']
        : [],
      acceptedBy: mediation.compromises.map(c => c.perspective),
      rejectedBy: [],
    };
  }

  /**
   * Applies conditional approval strategy
   */
  private applyConditionalApproval(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    const conditions = this.generateConditions(opinions);
    const acceptingPerspectives = opinions.filter(op => op.confidence >= 0.5);

    return {
      resolved: conditions.length > 0,
      strategy: 'conditional_approval',
      outcome: 'Conditional approval granted subject to requirements',
      verdict: 'Conditionally approved',
      confidence: 0.65,
      conditions,
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: acceptingPerspectives.map(op => op.perspective),
      rejectedBy: opinions.filter(op => op.confidence < 0.5).map(op => op.perspective),
    };
  }

  /**
   * Applies suspension strategy
   */
  private applySuspension(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    const requirements = this.identifyInformationRequirements(conflict, opinions);

    return {
      resolved: false,
      strategy: 'suspension',
      outcome: 'Decision suspended pending additional information',
      confidence: 0,
      conditions: requirements,
      remainingConcerns: this.extractRemainingConcerns(opinions),
      acceptedBy: [],
      rejectedBy: [],
    };
  }

  /**
   * Applies perspective dominance strategy
   */
  private applyPerspectiveDominance(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): ResolutionResult {
    // Find the perspective with highest weighted confidence
    const weightedOpinions = opinions.map(op => ({
      ...op,
      weightedConfidence: op.confidence * op.weight,
    }));
    
    weightedOpinions.sort((a, b) => b.weightedConfidence - a.weightedConfidence);
    const dominantOpinion = weightedOpinions[0]!;

    return {
      resolved: true,
      strategy: 'perspective_dominance',
      outcome: `Decision based on dominant ${dominantOpinion.perspective} perspective`,
      verdict: dominantOpinion.verdict,
      confidence: dominantOpinion.confidence,
      conditions: [
        `Note: Decision primarily driven by ${dominantOpinion.perspective} considerations`,
        `Other perspectives had lower weighted confidence`,
      ],
      remainingConcerns: opinions
        .filter(op => op.perspective !== dominantOpinion.perspective)
        .flatMap(op => op.concerns),
      acceptedBy: [dominantOpinion.perspective],
      rejectedBy: opinions
        .filter(op => op.perspective !== dominantOpinion.perspective)
        .map(op => op.perspective),
    };
  }

  /**
   * Creates an unresolved result
   */
  private createUnresolvedResult(
    strategy: ResolutionStrategy,
    conflict: ConflictRecord
  ): ResolutionResult {
    return {
      resolved: false,
      strategy,
      outcome: 'Unable to resolve conflict with available strategies',
      confidence: 0,
      remainingConcerns: [conflict.description],
      acceptedBy: [],
      rejectedBy: conflict.perspectives,
    };
  }

  /**
   * Identifies focus areas for extended deliberation
   */
  private identifyFocusAreas(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): string[] {
    const areas: string[] = [];
    
    // Extract key disagreement points
    for (const opinion of opinions) {
      if (opinion.concerns.length > 0) {
        areas.push(...opinion.concerns.slice(0, 2));
      }
    }
    
    return [...new Set(areas)].slice(0, 5);
  }

  /**
   * Generates reframed proposition options
   */
  private generateReframedOptions(opinions: PerspectiveOpinion[]): string[] {
    const options: string[] = [];
    
    // Combine key arguments from different perspectives
    const logosOp = opinions.find(op => op.perspective === 'logos');
    const pathosOp = opinions.find(op => op.perspective === 'pathos');
    const ethosOp = opinions.find(op => op.perspective === 'ethos');

    if (logosOp && pathosOp) {
      options.push(`Consider a modified approach that addresses ${logosOp.arguments[0] ?? 'logical concerns'} while being mindful of ${pathosOp.arguments[0] ?? 'emotional impact'}`);
    }

    if (ethosOp) {
      options.push(`Ensure the proposition aligns with ${ethosOp.arguments[0] ?? 'ethical principles'} before proceeding`);
    }

    return options;
  }

  /**
   * Summarizes a conflict for escalation
   */
  private summarizeConflict(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): string {
    const perspectiveViews = opinions.map(op => 
      `${op.perspective}: ${op.verdict.slice(0, 50)}...`
    ).join('; ');
    
    return `${conflict.type} (${conflict.severity}): ${conflict.description}. Perspectives: ${perspectiveViews}`;
  }

  /**
   * Mediates between perspectives to find compromise
   */
  private mediateBetweenPerspectives(
    opinions: PerspectiveOpinion[]
  ): MediationOutcome {
    const compromises: MediationOutcome['compromises'] = [];
    
    // Find common ground
    const commonArguments = this.findCommonArguments(opinions);
    
    // Generate compromise positions for each perspective
    for (const opinion of opinions) {
      const concession = this.generateConcession(opinion, commonArguments);
      compromises.push({
        perspective: opinion.perspective,
        concession,
      });
    }

    // Calculate confidence based on compromise alignment
    const avgConfidence = opinions.reduce((sum, op) => sum + op.confidence, 0) / opinions.length;
    
    return {
      success: compromises.length === opinions.length,
      position: `Compromise position: ${commonArguments.join(' and ')}`,
      confidence: avgConfidence * 0.8, // Slightly lower confidence for compromise
      compromises,
      needsFurtherDeliberation: avgConfidence < this.config.minConfidence,
    };
  }

  /**
   * Finds common arguments across perspectives
   */
  private findCommonArguments(opinions: PerspectiveOpinion[]): string[] {
    const allArguments = opinions.flatMap(op => op.arguments);
    
    // Find semantically similar arguments (simplified)
    const uniqueArguments: string[] = [];
    for (const arg of allArguments) {
      const isSimilar = uniqueArguments.some(existing => 
        this.areArgumentsSimilar(existing, arg)
      );
      if (!isSimilar) {
        uniqueArguments.push(arg);
      }
    }
    
    return uniqueArguments.slice(0, 3);
  }

  /**
   * Checks if two arguments are semantically similar
   */
  private areArgumentsSimilar(arg1: string, arg2: string): boolean {
    // Simplified similarity check
    const words1 = arg1.toLowerCase().split(/\s+/);
    const words2 = arg2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= 3;
  }

  /**
   * Generates a concession for a perspective
   */
  private generateConcession(
    opinion: PerspectiveOpinion,
    commonArguments: string[]
  ): string {
    if (opinion.concerns.length > 0) {
      return `Willing to proceed if ${opinion.concerns[0]!.toLowerCase()} is addressed`;
    }
    return `Accepting common ground on ${commonArguments[0] ?? 'shared interests'}`;
  }

  /**
   * Generates conditions for conditional approval
   */
  private generateConditions(opinions: PerspectiveOpinion[]): string[] {
    const conditions: string[] = [];
    
    for (const opinion of opinions) {
      if (opinion.concerns.length > 0) {
        conditions.push(`${opinion.perspective}: Address ${opinion.concerns[0]!.toLowerCase()}`);
      }
    }
    
    return conditions.slice(0, 5);
  }

  /**
   * Identifies information requirements for suspension
   */
  private identifyInformationRequirements(
    conflict: ConflictRecord,
    opinions: PerspectiveOpinion[]
  ): string[] {
    const requirements: string[] = [];
    
    // Add requirements based on conflict type
    switch (conflict.type) {
      case 'fundamental_disagreement':
        requirements.push('Gather additional evidence to resolve fundamental disagreements');
        break;
      case 'uncertainty':
        requirements.push('Obtain more information to reduce uncertainty');
        break;
      case 'context_inconsistency':
        requirements.push('Clarify contextual factors causing interpretation differences');
        break;
      default:
        requirements.push('Conduct further analysis before proceeding');
    }
    
    // Add perspective-specific requirements
    for (const opinion of opinions) {
      if (opinion.confidence < 0.5) {
        requirements.push(`Address ${opinion.perspective} perspective's low confidence`);
      }
    }
    
    return requirements;
  }

  /**
   * Extracts remaining concerns from opinions
   */
  private extractRemainingConcerns(opinions: PerspectiveOpinion[]): string[] {
    return opinions.flatMap(op => op.concerns).slice(0, 5);
  }

  /**
   * Gets the resolution history
   */
  getHistory(): Array<{ conflict: ConflictRecord; result: ResolutionResult; timestamp: Date }> {
    return [...this.resolutionHistory];
  }

  /**
   * Clears the resolution history
   */
  clearHistory(): void {
    this.resolutionHistory.length = 0;
  }

  /**
   * Gets statistics about resolutions
   */
  getStats(): {
    totalResolutions: number;
    successfulResolutions: number;
    strategyUsage: Record<ResolutionStrategy, number>;
    averageConfidence: number;
  } {
    const total = this.resolutionHistory.length;
    const successful = this.resolutionHistory.filter(r => r.result.resolved).length;
    
    const strategyUsage: Record<ResolutionStrategy, number> = {
      weighted_voting: 0,
      deliberation_extension: 0,
      reframing: 0,
      escalation: 0,
      compromise: 0,
      conditional_approval: 0,
      suspension: 0,
      perspective_dominance: 0,
    };
    
    let totalConfidence = 0;
    for (const { result } of this.resolutionHistory) {
      strategyUsage[result.strategy]++;
      totalConfidence += result.confidence;
    }
    
    return {
      totalResolutions: total,
      successfulResolutions: successful,
      strategyUsage,
      averageConfidence: total > 0 ? totalConfidence / total : 0,
    };
  }
}
