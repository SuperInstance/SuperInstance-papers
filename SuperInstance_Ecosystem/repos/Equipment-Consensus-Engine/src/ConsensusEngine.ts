/**
 * ConsensusEngine - Main equipment class for multi-agent deliberation
 * 
 * Implements the core consensus-building machinery that coordinates
 * tripartite deliberation across Pathos, Logos, and Ethos perspectives.
 * 
 * @module ConsensusEngine
 */

import { TripartiteDeliberation, type TripartitePerspective, type PerspectiveAnalysis } from './TripartiteDeliberation';
import { WeightCalculator, type DomainType, type WeightProfile } from './WeightCalculator';
import { ConflictResolution, type ConflictRecord, type ResolutionResult } from './ConflictResolution';

/**
 * Types of tripartite perspectives
 */
export type PerspectiveType = 'pathos' | 'logos' | 'ethos';

/**
 * Configuration for the ConsensusEngine
 */
export interface ConsensusEngineConfig {
  /** Maximum number of deliberation rounds before forcing consensus */
  maxRounds: number;
  /** Minimum confidence threshold to accept a perspective's opinion */
  confidenceThreshold: number;
  /** Whether to include dissenting opinions in final result */
  includeDissent: boolean;
  /** Domain type for weight calculation */
  domain: DomainType;
  /** Custom weight profile overrides */
  customWeights?: Partial<WeightProfile>;
  /** Enable audit trail recording */
  enableAudit: boolean;
  /** Timeout for deliberation in milliseconds */
  timeout: number;
}

/**
 * Input for a deliberation request
 */
export interface DeliberationInput {
  /** The query or proposition to deliberate on */
  proposition: string;
  /** Contextual information relevant to the deliberation */
  context: string;
  /** Optional domain override for this specific deliberation */
  domainOverride?: DomainType;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A single perspective's opinion on a proposition
 */
export interface PerspectiveOpinion {
  /** The perspective type (pathos/logos/ethos) */
  perspective: PerspectiveType;
  /** The opinion/verdict from this perspective */
  verdict: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Key arguments supporting this opinion */
  arguments: string[];
  /** Potential concerns or objections */
  concerns: string[];
  /** Weight applied to this perspective */
  weight: number;
  /** Timestamp of when this opinion was formed */
  timestamp: Date;
}

/**
 * A record of a single deliberation round
 */
export interface DeliberationRound {
  /** Round number (1-indexed) */
  roundNumber: number;
  /** Opinions gathered in this round */
  opinions: PerspectiveOpinion[];
  /** Cross-examination results between perspectives */
  crossExaminations: CrossExamination[];
  /** Whether consensus was reached in this round */
  consensusReached: boolean;
  /** Interim consensus score if any */
  interimScore?: number;
  /** Timestamp of round completion */
  timestamp: Date;
}

/**
 * Cross-examination between two perspectives
 */
export interface CrossExamination {
  /** The challenging perspective */
  challenger: PerspectiveType;
  /** The responding perspective */
  responder: PerspectiveType;
  /** The challenge posed */
  challenge: string;
  /** The response given */
  response: string;
  /** Whether the response was satisfactory */
  satisfactory: boolean;
  /** Impact on responder's confidence (-1 to 1) */
  impact: number;
}

/**
 * An entry in the audit trail
 */
export interface AuditEntry {
  /** Unique identifier for this entry */
  id: string;
  /** Timestamp of the entry */
  timestamp: Date;
  /** Type of action recorded */
  action: 'deliberation_start' | 'round_complete' | 'conflict_detected' | 'conflict_resolved' | 'consensus_reached' | 'timeout' | 'error';
  /** Detailed description */
  description: string;
  /** Associated data */
  data?: Record<string, unknown>;
}

/**
 * Metadata about the consensus result
 */
export interface ConsensusMetadata {
  /** Total time taken for deliberation */
  durationMs: number;
  /** Number of rounds completed */
  roundsCompleted: number;
  /** Whether consensus was forced due to max rounds */
  forcedConsensus: boolean;
  /** Domain used for deliberation */
  domain: DomainType;
  /** Weight profile applied */
  weightProfile: WeightProfile;
  /** Number of conflicts resolved */
  conflictsResolved: number;
}

/**
 * The final result of a consensus deliberation
 */
export interface ConsensusResult {
  /** Whether consensus was successfully reached */
  consensus: boolean;
  /** The final consensus verdict */
  verdict: string;
  /** Overall confidence in the consensus (0-1) */
  confidence: number;
  /** Individual perspective opinions */
  perspectives: PerspectiveOpinion[];
  /** All deliberation rounds */
  rounds: DeliberationRound[];
  /** Any conflicts that were resolved */
  resolvedConflicts: ResolutionResult[];
  /** Dissenting opinions if any */
  dissentingOpinions?: PerspectiveOpinion[];
  /** Audit trail of the deliberation process */
  auditTrail: AuditEntry[];
  /** Metadata about the consensus process */
  metadata: ConsensusMetadata;
}

/**
 * ConsensusEngine - Main equipment class for multi-agent deliberation
 * 
 * Coordinates the tripartite deliberation process across Pathos (intent/emotion),
 * Logos (logic/reason), and Ethos (truth/ethics) perspectives to build consensus.
 * 
 * @example
 * ```typescript
 * const engine = new ConsensusEngine({
 *   maxRounds: 5,
 *   confidenceThreshold: 0.7,
 *   domain: 'balanced',
 *   enableAudit: true,
 * });
 * 
 * const result = await engine.deliberate({
 *   proposition: 'Should we implement feature X?',
 *   context: 'Given our current resources and timeline...',
 * });
 * ```
 */
export class ConsensusEngine {
  private readonly config: ConsensusEngineConfig;
  private readonly deliberation: TripartiteDeliberation;
  private readonly weightCalculator: WeightCalculator;
  private readonly conflictResolution: ConflictResolution;
  private readonly auditTrail: AuditEntry[] = [];
  private auditIdCounter = 0;

  /**
   * Creates a new ConsensusEngine instance
   * @param config - Configuration options for the engine
   */
  constructor(config: Partial<ConsensusEngineConfig> = {}) {
    this.config = {
      maxRounds: config.maxRounds ?? 5,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      includeDissent: config.includeDissent ?? true,
      domain: config.domain ?? 'balanced',
      customWeights: config.customWeights,
      enableAudit: config.enableAudit ?? true,
      timeout: config.timeout ?? 30000,
    };

    this.deliberation = new TripartiteDeliberation();
    this.weightCalculator = new WeightCalculator(this.config.customWeights);
    this.conflictResolution = new ConflictResolution();
    
    this.addAuditEntry('deliberation_start', 'ConsensusEngine initialized', { config: this.config });
  }

  /**
   * Conducts a deliberation on a proposition to reach consensus
   * @param input - The deliberation input containing proposition and context
   * @returns The consensus result
   */
  async deliberate(input: DeliberationInput): Promise<ConsensusResult> {
    const startTime = Date.now();
    const domain = input.domainOverride ?? this.config.domain;
    
    this.addAuditEntry('deliberation_start', `Starting deliberation on: ${input.proposition}`, {
      domain,
      context: input.context,
    });

    const rounds: DeliberationRound[] = [];
    const resolvedConflicts: ResolutionResult[] = [];
    let consensusReached = false;
    let finalOpinions: PerspectiveOpinion[] = [];

    try {
      // Conduct deliberation rounds
      for (let roundNum = 1; roundNum <= this.config.maxRounds && !consensusReached; roundNum++) {
        const round = await this.conductRound(roundNum, input, domain, finalOpinions);
        rounds.push(round);

        // Check for conflicts
        const conflicts = this.detectConflicts(round.opinions);
        if (conflicts.length > 0) {
          this.addAuditEntry('conflict_detected', `Detected ${conflicts.length} conflicts in round ${roundNum}`, {
            conflicts: conflicts.map(c => ({ type: c.type, perspectives: c.perspectives })),
          });

          for (const conflict of conflicts) {
            const resolution = await this.conflictResolution.resolve(conflict, round.opinions);
            resolvedConflicts.push(resolution);
            
            this.addAuditEntry('conflict_resolved', `Resolved conflict: ${conflict.type}`, {
              strategy: resolution.strategy,
              outcome: resolution.outcome,
            });
          }
        }

        // Check for consensus
        consensusReached = this.evaluateConsensus(round.opinions);
        
        if (consensusReached) {
          this.addAuditEntry('consensus_reached', `Consensus reached in round ${roundNum}`, {
            consensusScore: round.interimScore,
          });
        }

        finalOpinions = round.opinions;
      }

      // Calculate final confidence and verdict
      const verdict = this.synthesizeVerdict(finalOpinions, consensusReached);
      const confidence = this.calculateOverallConfidence(finalOpinions, consensusReached);
      const dissentingOpinions = this.config.includeDissent 
        ? finalOpinions.filter(op => op.confidence < this.config.confidenceThreshold)
        : undefined;

      const durationMs = Date.now() - startTime;
      
      this.addAuditEntry('deliberation_complete', 'Deliberation completed', {
        consensusReached,
        verdict,
        confidence,
        durationMs,
      });

      return {
        consensus: consensusReached,
        verdict,
        confidence,
        perspectives: finalOpinions,
        rounds,
        resolvedConflicts,
        dissentingOpinions,
        auditTrail: [...this.auditTrail],
        metadata: {
          durationMs,
          roundsCompleted: rounds.length,
          forcedConsensus: !consensusReached && rounds.length >= this.config.maxRounds,
          domain,
          weightProfile: this.weightCalculator.getProfile(domain),
          conflictsResolved: resolvedConflicts.length,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addAuditEntry('error', `Deliberation failed: ${errorMessage}`, { error: errorMessage });
      
      throw error;
    }
  }

  /**
   * Conducts a single round of deliberation
   */
  private async conductRound(
    roundNumber: number,
    input: DeliberationInput,
    domain: DomainType,
    previousOpinions: PerspectiveOpinion[]
  ): Promise<DeliberationRound> {
    const weightProfile = this.weightCalculator.getProfile(domain);
    const opinions: PerspectiveOpinion[] = [];
    const crossExaminations: CrossExamination[] = [];

    // Gather opinions from each perspective
    const perspectives: PerspectiveType[] = ['pathos', 'logos', 'ethos'];
    
    for (const perspectiveType of perspectives) {
      const weight = this.getPerspectiveWeight(perspectiveType, weightProfile);
      const analysis = await this.deliberation.analyze(
        perspectiveType,
        input.proposition,
        input.context,
        previousOpinions
      );

      opinions.push({
        perspective: perspectiveType,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        arguments: analysis.arguments,
        concerns: analysis.concerns,
        weight,
        timestamp: new Date(),
      });
    }

    // Conduct cross-examinations between perspectives
    for (let i = 0; i < perspectives.length; i++) {
      for (let j = i + 1; j < perspectives.length; j++) {
        const crossExam = await this.conductCrossExamination(
          perspectives[i]!,
          perspectives[j]!,
          opinions
        );
        crossExaminations.push(crossExam);
      }
    }

    // Apply cross-examination impacts to opinions
    this.applyCrossExaminationImpacts(opinions, crossExaminations);

    const interimScore = this.calculateInterimScore(opinions);
    const consensusReached = this.evaluateConsensus(opinions);

    return {
      roundNumber,
      opinions,
      crossExaminations,
      consensusReached,
      interimScore,
      timestamp: new Date(),
    };
  }

  /**
   * Conducts cross-examination between two perspectives
   */
  private async conductCrossExamination(
    challenger: PerspectiveType,
    responder: PerspectiveType,
    opinions: PerspectiveOpinion[]
  ): Promise<CrossExamination> {
    const challengerOpinion = opinions.find(op => op.perspective === challenger);
    const responderOpinion = opinions.find(op => op.perspective === responder);

    if (!challengerOpinion || !responderOpinion) {
      throw new Error(`Missing opinion for cross-examination: ${challenger} vs ${responder}`);
    }

    const challenge = this.generateChallenge(challenger, responderOpinion);
    const response = this.generateResponse(responder, challenge);
    const satisfactory = this.evaluateResponse(challenge, response, challenger);
    const impact = satisfactory ? 0 : -0.1;

    return {
      challenger,
      responder,
      challenge,
      response,
      satisfactory,
      impact,
    };
  }

  /**
   * Generates a challenge from one perspective to another
   */
  private generateChallenge(challenger: PerspectiveType, targetOpinion: PerspectiveOpinion): string {
    const challengeTemplates: Record<PerspectiveType, string[]> = {
      pathos: [
        `Does this decision truly serve the emotional needs of those affected?`,
        `Have we considered how this will make people feel?`,
        `Is there sufficient passion and commitment behind this choice?`,
      ],
      logos: [
        `What is the logical basis for this conclusion?`,
        `Are there any logical fallacies in the reasoning?`,
        `How does this conclusion follow from the premises?`,
      ],
      ethos: [
        `Is this decision ethically justifiable?`,
        `Does this align with our moral principles?`,
        `What are the broader ethical implications?`,
      ],
    };

    const templates = challengeTemplates[challenger];
    return templates[Math.floor(Math.random() * templates.length)] ?? '';
  }

  /**
   * Generates a response to a challenge
   */
  private generateResponse(responder: PerspectiveType, challenge: string): string {
    const responseTemplates: Record<PerspectiveType, string[]> = {
      pathos: [
        `The emotional impact has been carefully considered through empathy analysis.`,
        `We've accounted for how stakeholders will emotionally respond to this.`,
        `The passion driving this decision is grounded in genuine care for outcomes.`,
      ],
      logos: [
        `The logical chain of reasoning has been validated through systematic analysis.`,
        `Each premise has been examined for consistency and soundness.`,
        `The conclusion follows deductively from well-established facts.`,
      ],
      ethos: [
        `This decision was evaluated against our core ethical framework.`,
        `Moral principles have been applied consistently throughout the analysis.`,
        `The ethical implications align with widely accepted standards of conduct.`,
      ],
    };

    const templates = responseTemplates[responder];
    return templates[Math.floor(Math.random() * templates.length)] ?? '';
  }

  /**
   * Evaluates whether a response is satisfactory
   */
  private evaluateResponse(challenge: string, response: string, challenger: PerspectiveType): boolean {
    // Simplified evaluation - in practice this would be more sophisticated
    return response.length > 20 && response.includes('considered');
  }

  /**
   * Applies cross-examination impacts to opinions
   */
  private applyCrossExaminationImpacts(
    opinions: PerspectiveOpinion[],
    crossExaminations: CrossExamination[]
  ): void {
    for (const crossExam of crossExaminations) {
      const responderOpinion = opinions.find(op => op.perspective === crossExam.responder);
      if (responderOpinion) {
        responderOpinion.confidence = Math.max(0, Math.min(1, responderOpinion.confidence + crossExam.impact));
      }
    }
  }

  /**
   * Gets the weight for a specific perspective from a weight profile
   */
  private getPerspectiveWeight(perspective: PerspectiveType, profile: WeightProfile): number {
    switch (perspective) {
      case 'pathos':
        return profile.pathosWeight;
      case 'logos':
        return profile.logosWeight;
      case 'ethos':
        return profile.ethosWeight;
      default:
        return 1 / 3;
    }
  }

  /**
   * Detects conflicts between perspective opinions
   */
  private detectConflicts(opinions: PerspectiveOpinion[]): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    
    // Check for high-confidence disagreements
    const highConfidenceOpinions = opinions.filter(op => op.confidence >= this.config.confidenceThreshold);
    
    if (highConfidenceOpinions.length >= 2) {
      // Check if verdicts are contradictory
      const verdicts = highConfidenceOpinions.map(op => op.verdict.toLowerCase());
      const positiveIndicators = ['yes', 'agree', 'support', 'affirm', 'positive', 'true'];
      const negativeIndicators = ['no', 'disagree', 'oppose', 'reject', 'negative', 'false'];
      
      const hasPositive = verdicts.some(v => positiveIndicators.some(p => v.includes(p)));
      const hasNegative = verdicts.some(v => negativeIndicators.some(n => v.includes(n)));
      
      if (hasPositive && hasNegative) {
        conflicts.push({
          type: 'fundamental_disagreement',
          perspectives: highConfidenceOpinions.map(op => op.perspective),
          severity: 'high',
          description: 'Perspectives have fundamentally opposing views on the proposition',
          context: {
            conflictingVerdicts: highConfidenceOpinions.map(op => ({
              perspective: op.perspective,
              verdict: op.verdict,
            })),
          },
        });
      }
    }

    // Check for low confidence across all perspectives
    if (opinions.every(op => op.confidence < this.config.confidenceThreshold)) {
      conflicts.push({
        type: 'uncertainty',
        perspectives: opinions.map(op => op.perspective),
        severity: 'medium',
        description: 'All perspectives have low confidence in their assessments',
        context: {
          confidenceLevels: opinions.map(op => ({
            perspective: op.perspective,
            confidence: op.confidence,
          })),
        },
      });
    }

    return conflicts;
  }

  /**
   * Evaluates whether consensus has been reached
   */
  private evaluateConsensus(opinions: PerspectiveOpinion[]): boolean {
    // All opinions must meet confidence threshold
    const allConfident = opinions.every(op => op.confidence >= this.config.confidenceThreshold);
    
    // Opinions should be aligned (simplified check)
    const verdicts = opinions.map(op => op.verdict.toLowerCase());
    const isAligned = this.areVerdictsAligned(verdicts);

    return allConfident && isAligned;
  }

  /**
   * Checks if verdicts are aligned (not contradictory)
   */
  private areVerdictsAligned(verdicts: string[]): boolean {
    const positiveIndicators = ['yes', 'agree', 'support', 'affirm', 'positive', 'true', 'proceed'];
    const negativeIndicators = ['no', 'disagree', 'oppose', 'reject', 'negative', 'false', 'decline'];
    
    const hasPositive = verdicts.some(v => positiveIndicators.some(p => v.includes(p)));
    const hasNegative = verdicts.some(v => negativeIndicators.some(n => v.includes(n)));
    
    return !(hasPositive && hasNegative);
  }

  /**
   * Calculates interim consensus score
   */
  private calculateInterimScore(opinions: PerspectiveOpinion[]): number {
    const totalWeight = opinions.reduce((sum, op) => sum + op.weight, 0);
    const weightedConfidence = opinions.reduce(
      (sum, op) => sum + op.confidence * op.weight,
      0
    );
    return totalWeight > 0 ? weightedConfidence / totalWeight : 0;
  }

  /**
   * Synthesizes a final verdict from all perspectives
   */
  private synthesizeVerdict(opinions: PerspectiveOpinion[], consensusReached: boolean): string {
    if (consensusReached) {
      // All perspectives agree - use the most confident opinion as template
      const sortedOpinions = [...opinions].sort((a, b) => b.confidence - a.confidence);
      return sortedOpinions[0]?.verdict ?? 'Consensus reached';
    }

    // No consensus - synthesize a balanced view
    const parts: string[] = [];
    
    for (const opinion of opinions) {
      parts.push(`[${opinion.perspective}]: ${opinion.verdict} (${(opinion.confidence * 100).toFixed(0)}% confidence)`);
    }

    return `No single consensus reached. Perspectives differ:\n${parts.join('\n')}`;
  }

  /**
   * Calculates overall confidence in the result
   */
  private calculateOverallConfidence(opinions: PerspectiveOpinion[], consensusReached: boolean): number {
    const totalWeight = opinions.reduce((sum, op) => sum + op.weight, 0);
    const weightedConfidence = opinions.reduce(
      (sum, op) => sum + op.confidence * op.weight,
      0
    );
    const baseConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    // Boost confidence if consensus was reached
    return consensusReached ? Math.min(1, baseConfidence * 1.1) : baseConfidence * 0.9;
  }

  /**
   * Adds an entry to the audit trail
   */
  private addAuditEntry(
    action: AuditEntry['action'],
    description: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.enableAudit) return;

    this.auditTrail.push({
      id: `audit-${++this.auditIdCounter}`,
      timestamp: new Date(),
      action,
      description,
      data,
    });
  }

  /**
   * Clears the audit trail
   */
  clearAuditTrail(): void {
    this.auditTrail.length = 0;
    this.auditIdCounter = 0;
  }

  /**
   * Gets the current audit trail
   */
  getAuditTrail(): AuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Updates the weight profile for a specific domain
   */
  updateDomainWeights(domain: DomainType, weights: Partial<WeightProfile>): void {
    this.weightCalculator.setProfile(domain, weights);
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Readonly<ConsensusEngineConfig> {
    return { ...this.config };
  }
}
