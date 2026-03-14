/**
 * TripartiteDeliberation - Pathos/Logos/Ethos 3-agent deliberation
 * 
 * Implements the classical rhetorical framework for argumentation
 * through three fundamental modes of persuasion.
 * 
 * @module TripartiteDeliberation
 */

import type { PerspectiveType, PerspectiveOpinion } from './ConsensusEngine';

/**
 * The three tripartite perspectives
 */
export type TripartitePerspective = 'pathos' | 'logos' | 'ethos';

/**
 * Context for deliberation
 */
export interface DeliberationContext {
  /** The proposition being deliberated */
  proposition: string;
  /** Background context */
  background: string;
  /** Previous opinions from earlier rounds */
  previousOpinions?: PerspectiveOpinion[];
  /** Additional context data */
  additionalContext?: Record<string, unknown>;
}

/**
 * Analysis result from a perspective
 */
export interface PerspectiveAnalysis {
  /** The perspective that produced this analysis */
  perspective: TripartitePerspective;
  /** The verdict/opinion on the proposition */
  verdict: string;
  /** Confidence in the verdict (0-1) */
  confidence: number;
  /** Supporting arguments */
  arguments: string[];
  /** Concerns or objections */
  concerns: string[];
  /** Emotional tone (for pathos) */
  emotionalTone?: string;
  /** Logical validity score (for logos) */
  logicalValidity?: number;
  /** Ethical alignment score (for ethos) */
  ethicalAlignment?: number;
  /** Suggested modifications to improve the proposition */
  suggestions?: string[];
}

/**
 * Cross-examination between perspectives
 */
export interface CrossExamination {
  /** The perspective initiating the examination */
  examiner: TripartitePerspective;
  /** The perspective being examined */
  respondent: TripartitePerspective;
  /** The question or challenge posed */
  question: string;
  /** The response provided */
  response: string;
  /** Evaluation of the response */
  evaluation: 'satisfactory' | 'unsatisfactory' | 'needs_clarification';
  /** Impact on respondent's credibility */
  credibilityImpact: number;
}

/**
 * Deliberation mode affects how perspectives interact
 */
export type DeliberationMode = 
  | 'collaborative'    // Perspectives work together
  | 'adversarial'      // Perspectives challenge each other
  | 'inquisitive'      // Perspectives probe for truth
  | 'synthesizing';    // Perspectives merge their views

/**
 * Pathos perspective characteristics
 */
interface PathosCharacteristics {
  /** Primary emotion being considered */
  primaryEmotion: string;
  /** Emotional intensity (0-1) */
  intensity: number;
  /** Stakeholders affected */
  stakeholders: string[];
  /** Emotional risks identified */
  emotionalRisks: string[];
}

/**
 * Logos perspective characteristics
 */
interface LogosCharacteristics {
  /** Logical structure used */
  logicalStructure: 'deductive' | 'inductive' | 'abductive' | 'analogical';
  /** Key premises */
  premises: string[];
  /** Assumptions made */
  assumptions: string[];
  /** Logical risks */
  logicalRisks: string[];
}

/**
 * Ethos perspective characteristics
 */
interface EthosCharacteristics {
  /** Ethical framework applied */
  ethicalFramework: string;
  /** Principles invoked */
  principles: string[];
  /** Values at stake */
  valuesAtStake: string[];
  /** Ethical risks */
  ethicalRisks: string[];
}

/**
 * TripartiteDeliberation - Manages deliberation across three rhetorical perspectives
 * 
 * The tripartite framework originates from Aristotle's Rhetoric and provides
 * a comprehensive approach to argumentation:
 * 
 * - **Pathos**: Appeals to emotion, intent, and human experience
 * - **Logos**: Appeals to logic, reason, and rational argument
 * - **Ethos**: Appeals to ethics, credibility, and moral character
 * 
 * @example
 * ```typescript
 * const deliberation = new TripartiteDeliberation();
 * 
 * const pathosAnalysis = await deliberation.analyze('pathos', 
 *   'Should we reduce work hours?',
 *   'A company is considering a 4-day work week',
 *   []
 * );
 * ```
 */
export class TripartiteDeliberation {
  private readonly perspectiveConfigs: Map<TripartitePerspective, {
    threshold: number;
    style: DeliberationMode;
  }>;

  /**
   * Creates a new TripartiteDeliberation instance
   */
  constructor() {
    this.perspectiveConfigs = new Map([
      ['pathos', { threshold: 0.6, style: 'collaborative' }],
      ['logos', { threshold: 0.7, style: 'inquisitive' }],
      ['ethos', { threshold: 0.75, style: 'adversarial' }],
    ]);
  }

  /**
   * Analyzes a proposition from a specific perspective
   * @param perspective - The perspective to analyze from
   * @param proposition - The proposition to analyze
   * @param context - The context for deliberation
   * @param previousOpinions - Opinions from previous rounds
   * @returns The perspective's analysis
   */
  async analyze(
    perspective: TripartitePerspective,
    proposition: string,
    context: string,
    previousOpinions: PerspectiveOpinion[] = []
  ): Promise<PerspectiveAnalysis> {
    switch (perspective) {
      case 'pathos':
        return this.analyzeFromPathos(proposition, context, previousOpinions);
      case 'logos':
        return this.analyzeFromLogos(proposition, context, previousOpinions);
      case 'ethos':
        return this.analyzeFromEthos(proposition, context, previousOpinions);
      default:
        throw new Error(`Unknown perspective: ${perspective}`);
    }
  }

  /**
   * Analyzes from the Pathos perspective (emotion/intent)
   */
  private async analyzeFromPathos(
    proposition: string,
    context: string,
    previousOpinions: PerspectiveOpinion[]
  ): Promise<PerspectiveAnalysis> {
    // Extract emotional dimensions
    const characteristics = this.extractPathosCharacteristics(proposition, context);
    
    // Consider previous emotional arguments
    const previousPathos = previousOpinions.find(op => op.perspective === 'pathos');
    
    // Generate emotional analysis
    const verdict = this.generatePathosVerdict(proposition, characteristics, previousPathos);
    const confidence = this.calculatePathosConfidence(characteristics, previousOpinions);
    const arguments_list = this.generatePathosArguments(characteristics);
    const concerns = this.identifyPathosConcerns(characteristics);

    return {
      perspective: 'pathos',
      verdict,
      confidence,
      arguments: arguments_list,
      concerns,
      emotionalTone: characteristics.primaryEmotion,
      suggestions: this.generatePathosSuggestions(characteristics),
    };
  }

  /**
   * Analyzes from the Logos perspective (logic/reason)
   */
  private async analyzeFromLogos(
    proposition: string,
    context: string,
    previousOpinions: PerspectiveOpinion[]
  ): Promise<PerspectiveAnalysis> {
    // Extract logical structure
    const characteristics = this.extractLogosCharacteristics(proposition, context);
    
    // Consider previous logical arguments
    const previousLogos = previousOpinions.find(op => op.perspective === 'logos');
    
    // Generate logical analysis
    const verdict = this.generateLogosVerdict(proposition, characteristics, previousLogos);
    const confidence = this.calculateLogosConfidence(characteristics, previousOpinions);
    const arguments_list = this.generateLogosArguments(characteristics);
    const concerns = this.identifyLogosConcerns(characteristics);
    const logicalValidity = this.assessLogicalValidity(characteristics);

    return {
      perspective: 'logos',
      verdict,
      confidence,
      arguments: arguments_list,
      concerns,
      logicalValidity,
      suggestions: this.generateLogosSuggestions(characteristics),
    };
  }

  /**
   * Analyzes from the Ethos perspective (ethics/truth)
   */
  private async analyzeFromEthos(
    proposition: string,
    context: string,
    previousOpinions: PerspectiveOpinion[]
  ): Promise<PerspectiveAnalysis> {
    // Extract ethical dimensions
    const characteristics = this.extractEthosCharacteristics(proposition, context);
    
    // Consider previous ethical arguments
    const previousEthos = previousOpinions.find(op => op.perspective === 'ethos');
    
    // Generate ethical analysis
    const verdict = this.generateEthosVerdict(proposition, characteristics, previousEthos);
    const confidence = this.calculateEthosConfidence(characteristics, previousOpinions);
    const arguments_list = this.generateEthosArguments(characteristics);
    const concerns = this.identifyEthosConcerns(characteristics);
    const ethicalAlignment = this.assessEthicalAlignment(characteristics);

    return {
      perspective: 'ethos',
      verdict,
      confidence,
      arguments: arguments_list,
      concerns,
      ethicalAlignment,
      suggestions: this.generateEthosSuggestions(characteristics),
    };
  }

  /**
   * Extracts pathos characteristics from proposition and context
   */
  private extractPathosCharacteristics(
    proposition: string,
    context: string
  ): PathosCharacteristics {
    const combined = `${proposition} ${context}`.toLowerCase();
    
    // Detect primary emotion
    const emotions = ['hope', 'fear', 'joy', 'anger', 'sadness', 'surprise', 'trust', 'anticipation'];
    const detectedEmotions = emotions.filter(e => combined.includes(e));
    const primaryEmotion = detectedEmotions[0] ?? 'neutral';
    
    // Calculate emotional intensity based on emotional words
    const emotionalWords = ['urgent', 'critical', 'important', 'essential', 'vital', 'crucial'];
    const intensity = emotionalWords.reduce((acc, word) => 
      acc + (combined.includes(word) ? 0.15 : 0), 0.3
    );
    
    // Identify stakeholders
    const stakeholders = this.identifyStakeholders(combined);
    
    // Identify emotional risks
    const emotionalRisks = this.identifyEmotionalRisks(combined);

    return {
      primaryEmotion,
      intensity: Math.min(1, intensity),
      stakeholders,
      emotionalRisks,
    };
  }

  /**
   * Extracts logos characteristics from proposition and context
   */
  private extractLogosCharacteristics(
    proposition: string,
    context: string
  ): LogosCharacteristics {
    const combined = `${proposition} ${context}`.toLowerCase();
    
    // Determine logical structure
    let logicalStructure: LogosCharacteristics['logicalStructure'] = 'inductive';
    if (combined.includes('therefore') || combined.includes('thus') || combined.includes('must')) {
      logicalStructure = 'deductive';
    } else if (combined.includes('likely') || combined.includes('probably') || combined.includes('suggests')) {
      logicalStructure = 'abductive';
    } else if (combined.includes('like') || combined.includes('similar') || combined.includes('comparable')) {
      logicalStructure = 'analogical';
    }
    
    // Extract premises
    const premises = this.extractPremises(combined);
    
    // Identify assumptions
    const assumptions = this.identifyAssumptions(combined);
    
    // Identify logical risks
    const logicalRisks = this.identifyLogicalRisks(combined);

    return {
      logicalStructure,
      premises,
      assumptions,
      logicalRisks,
    };
  }

  /**
   * Extracts ethos characteristics from proposition and context
   */
  private extractEthosCharacteristics(
    proposition: string,
    context: string
  ): EthosCharacteristics {
    const combined = `${proposition} ${context}`.toLowerCase();
    
    // Determine ethical framework
    let ethicalFramework = 'utilitarian';
    if (combined.includes('rights') || combined.includes('duty') || combined.includes('obligation')) {
      ethicalFramework = 'deontological';
    } else if (combined.includes('virtue') || combined.includes('character') || combined.includes('integrity')) {
      ethicalFramework = 'virtue_ethics';
    } else if (combined.includes('care') || combined.includes('relationship') || combined.includes('empathy')) {
      ethicalFramework = 'care_ethics';
    }
    
    // Identify principles
    const principles = this.identifyPrinciples(combined);
    
    // Identify values at stake
    const valuesAtStake = this.identifyValuesAtStake(combined);
    
    // Identify ethical risks
    const ethicalRisks = this.identifyEthicalRisks(combined);

    return {
      ethicalFramework,
      principles,
      valuesAtStake,
      ethicalRisks,
    };
  }

  // Helper methods for pathos analysis
  private identifyStakeholders(text: string): string[] {
    const stakeholders: string[] = [];
    if (text.includes('employee') || text.includes('worker') || text.includes('staff')) {
      stakeholders.push('employees');
    }
    if (text.includes('customer') || text.includes('client') || text.includes('user')) {
      stakeholders.push('customers');
    }
    if (text.includes('community') || text.includes('society') || text.includes('public')) {
      stakeholders.push('community');
    }
    if (text.includes('environment') || text.includes('nature') || text.includes('ecosystem')) {
      stakeholders.push('environment');
    }
    return stakeholders.length > 0 ? stakeholders : ['affected parties'];
  }

  private identifyEmotionalRisks(text: string): string[] {
    const risks: string[] = [];
    if (text.includes('change') || text.includes('transform')) {
      risks.push('Resistance to change');
    }
    if (text.includes('reduce') || text.includes('cut') || text.includes('decrease')) {
      risks.push('Anxiety about loss');
    }
    if (text.includes('increase') || text.includes('expand') || text.includes('grow')) {
      risks.push('Fear of overwhelm');
    }
    return risks.length > 0 ? risks : ['Unknown emotional impact'];
  }

  private generatePathosVerdict(
    proposition: string,
    characteristics: PathosCharacteristics,
    previousPathos?: PerspectiveOpinion
  ): string {
    const emotionalAppeal = characteristics.intensity > 0.6 ? 'strong' : 'moderate';
    const stakeholderCount = characteristics.stakeholders.length;
    
    if (previousPathos) {
      return `After reconsideration, the emotional impact on ${characteristics.stakeholders.join(', ')} remains a key factor. The proposition has ${emotionalAppeal} emotional appeal with ${characteristics.primaryEmotion} as the primary emotion. Proceeding with caution is advised.`;
    }
    
    return `From an emotional standpoint, this proposition affects ${stakeholderCount} stakeholder groups: ${characteristics.stakeholders.join(', ')}. The primary emotion of ${characteristics.primaryEmotion} with ${emotionalAppeal} intensity suggests ${characteristics.intensity > 0.5 ? 'proceeding with empathetic consideration' : 'the emotional impact may be manageable'}.`;
  }

  private calculatePathosConfidence(
    characteristics: PathosCharacteristics,
    previousOpinions: PerspectiveOpinion[]
  ): number {
    let confidence = 0.5;
    
    // Higher confidence with more identified stakeholders
    confidence += Math.min(0.2, characteristics.stakeholders.length * 0.05);
    
    // Higher confidence with clear emotional signal
    if (characteristics.primaryEmotion !== 'neutral') {
      confidence += 0.1;
    }
    
    // Consider previous logos agreement
    const previousLogos = previousOpinions.find(op => op.perspective === 'logos');
    if (previousLogos && previousLogos.confidence > 0.6) {
      confidence += 0.05;
    }
    
    return Math.min(1, confidence);
  }

  private generatePathosArguments(characteristics: PathosCharacteristics): string[] {
    const args: string[] = [];
    
    args.push(`Addresses emotional needs of ${characteristics.stakeholders.join(' and ')}`);
    
    if (characteristics.intensity > 0.6) {
      args.push(`Strong emotional engagement through ${characteristics.primaryEmotion}`);
    }
    
    if (characteristics.emotionalRisks.length > 0) {
      args.push(`Requires managing: ${characteristics.emotionalRisks.join(', ')}`);
    }
    
    return args;
  }

  private identifyPathosConcerns(characteristics: PathosCharacteristics): string[] {
    const concerns: string[] = [];
    
    if (characteristics.intensity > 0.7) {
      concerns.push('High emotional intensity may cloud rational judgment');
    }
    
    if (characteristics.stakeholders.length > 3) {
      concerns.push('Multiple stakeholder groups may have conflicting emotional needs');
    }
    
    if (characteristics.emotionalRisks.some(r => r.includes('Resistance') || r.includes('Anxiety'))) {
      concerns.push('Potential for emotional resistance that needs addressing');
    }
    
    return concerns.length > 0 ? concerns : ['Emotional impact appears manageable'];
  }

  private generatePathosSuggestions(characteristics: PathosCharacteristics): string[] {
    const suggestions: string[] = [];
    
    suggestions.push(`Consider communication strategy for ${characteristics.stakeholders.join(' and ')}`);
    
    if (characteristics.primaryEmotion !== 'neutral') {
      suggestions.push(`Address the ${characteristics.primaryEmotion} emotion directly in implementation`);
    }
    
    return suggestions;
  }

  // Helper methods for logos analysis
  private extractPremises(text: string): string[] {
    const premises: string[] = [];
    
    if (text.includes('because') || text.includes('since')) {
      premises.push('Causal reasoning detected in argument');
    }
    if (text.includes('data') || text.includes('evidence') || text.includes('research')) {
      premises.push('Empirical evidence cited');
    }
    if (text.includes('experience') || text.includes('history') || text.includes('track record')) {
      premises.push('Historical precedent referenced');
    }
    
    return premises.length > 0 ? premises : ['Implicit premises require examination'];
  }

  private identifyAssumptions(text: string): string[] {
    const assumptions: string[] = [];
    
    if (text.includes('will') || text.includes('going to')) {
      assumptions.push('Future prediction assumed certain');
    }
    if (text.includes('always') || text.includes('never')) {
      assumptions.push('Absolute statements may oversimplify');
    }
    if (text.includes('everyone') || text.includes('nobody')) {
      assumptions.push('Universal claims need verification');
    }
    
    return assumptions.length > 0 ? assumptions : ['Standard assumptions apply'];
  }

  private identifyLogicalRisks(text: string): string[] {
    const risks: string[] = [];
    
    if (text.includes('all') && text.includes('must')) {
      risks.push('Potential hasty generalization');
    }
    if (text.includes('either') && text.includes('or')) {
      risks.push('Possible false dichotomy');
    }
    if (text.includes('because') && text.includes('popular')) {
      risks.push('Potential appeal to popularity');
    }
    
    return risks.length > 0 ? risks : ['Logical structure appears sound'];
  }

  private generateLogosVerdict(
    proposition: string,
    characteristics: LogosCharacteristics,
    previousLogos?: PerspectiveOpinion
  ): string {
    const structureDesc = {
      deductive: 'following a deductive structure from general principles',
      inductive: 'building from specific observations to general conclusions',
      abductive: 'inferring the most likely explanation',
      analogical: 'drawing parallels from comparable situations',
    };
    
    if (previousLogos) {
      return `Upon re-examination, the ${characteristics.logicalStructure} reasoning remains valid with ${characteristics.premises.length} supporting premises. The logical risks (${characteristics.logicalRisks.join(', ')}) should be monitored.`;
    }
    
    return `The proposition presents ${structureDesc[characteristics.logicalStructure]}. ${characteristics.premises.length} premises have been identified. The argument's logical foundation is ${characteristics.assumptions.length > 1 ? 'subject to several assumptions that warrant scrutiny' : 'relatively straightforward'}.`;
  }

  private calculateLogosConfidence(
    characteristics: LogosCharacteristics,
    previousOpinions: PerspectiveOpinion[]
  ): number {
    let confidence = 0.5;
    
    // More premises increase confidence
    confidence += Math.min(0.2, characteristics.premises.length * 0.05);
    
    // Fewer assumptions is better
    confidence -= Math.min(0.15, characteristics.assumptions.length * 0.03);
    
    // Fewer logical risks is better
    confidence -= Math.min(0.1, characteristics.logicalRisks.length * 0.02);
    
    // Consider previous ethos agreement
    const previousEthos = previousOpinions.find(op => op.perspective === 'ethos');
    if (previousEthos && previousEthos.confidence > 0.6) {
      confidence += 0.05;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  private generateLogosArguments(characteristics: LogosCharacteristics): string[] {
    const args: string[] = [];
    
    args.push(`Reasoning follows ${characteristics.logicalStructure} structure`);
    
    for (const premise of characteristics.premises) {
      args.push(`Premise: ${premise}`);
    }
    
    if (characteristics.assumptions.length > 0) {
      args.push(`Assumptions to verify: ${characteristics.assumptions.join(', ')}`);
    }
    
    return args;
  }

  private identifyLogosConcerns(characteristics: LogosCharacteristics): string[] {
    const concerns: string[] = [];
    
    if (characteristics.assumptions.length > 2) {
      concerns.push('Multiple unverified assumptions in the argument');
    }
    
    for (const risk of characteristics.logicalRisks) {
      if (!risk.includes('appears sound')) {
        concerns.push(risk);
      }
    }
    
    if (characteristics.premises.some(p => p.includes('Implicit'))) {
      concerns.push('Implicit premises need explicit articulation');
    }
    
    return concerns.length > 0 ? concerns : ['Logical structure is sound'];
  }

  private assessLogicalValidity(characteristics: LogosCharacteristics): number {
    let validity = 0.7;
    
    validity -= Math.min(0.2, characteristics.logicalRisks.length * 0.05);
    validity -= Math.min(0.1, characteristics.assumptions.length * 0.02);
    
    return Math.max(0.3, validity);
  }

  private generateLogosSuggestions(characteristics: LogosCharacteristics): string[] {
    const suggestions: string[] = [];
    
    for (const assumption of characteristics.assumptions.slice(0, 2)) {
      suggestions.push(`Verify assumption: ${assumption}`);
    }
    
    if (characteristics.premises.some(p => p.includes('Implicit'))) {
      suggestions.push('Make implicit premises explicit for clarity');
    }
    
    return suggestions;
  }

  // Helper methods for ethos analysis
  private identifyPrinciples(text: string): string[] {
    const principles: string[] = [];
    
    if (text.includes('fair') || text.includes('equitable') || text.includes('just')) {
      principles.push('Fairness and justice');
    }
    if (text.includes('honest') || text.includes('transparent') || text.includes('truthful')) {
      principles.push('Honesty and transparency');
    }
    if (text.includes('respect') || text.includes('dignity') || text.includes('worth')) {
      principles.push('Respect for dignity');
    }
    if (text.includes('responsibility') || text.includes('accountable') || text.includes('liable')) {
      principles.push('Accountability and responsibility');
    }
    
    return principles.length > 0 ? principles : ['General ethical principles apply'];
  }

  private identifyValuesAtStake(text: string): string[] {
    const values: string[] = [];
    
    if (text.includes('privacy') || text.includes('confidential') || text.includes('secret')) {
      values.push('Privacy rights');
    }
    if (text.includes('safety') || text.includes('security') || text.includes('protection')) {
      values.push('Safety and security');
    }
    if (text.includes('freedom') || text.includes('autonomy') || text.includes('choice')) {
      values.push('Autonomy and freedom');
    }
    if (text.includes('equality') || text.includes('equal') || text.includes('discriminat')) {
      values.push('Equality and non-discrimination');
    }
    
    return values.length > 0 ? values : ['Standard ethical values'];
  }

  private identifyEthicalRisks(text: string): string[] {
    const risks: string[] = [];
    
    if (text.includes('profit') && !text.includes('people')) {
      risks.push('Potential prioritization of profit over people');
    }
    if (text.includes('secret') || text.includes('hidden') || text.includes('undisclosed')) {
      risks.push('Transparency concerns');
    }
    if (text.includes('minority') || text.includes('vulnerable') || text.includes('disadvantaged')) {
      risks.push('Impact on vulnerable populations needs assessment');
    }
    
    return risks.length > 0 ? risks : ['No significant ethical risks identified'];
  }

  private generateEthosVerdict(
    proposition: string,
    characteristics: EthosCharacteristics,
    previousEthos?: PerspectiveOpinion
  ): string {
    if (previousEthos) {
      return `Upon ethical re-evaluation using ${characteristics.ethicalFramework} framework, the proposition's alignment with ${characteristics.principles.join(', ')} ${characteristics.ethicalRisks.some(r => r.includes('No significant')) ? 'remains acceptable' : 'requires attention to identified risks'}.`;
    }
    
    return `From an ethical perspective informed by ${characteristics.ethicalFramework} principles, this proposition ${characteristics.valuesAtStake.length > 2 ? 'implicates multiple values' : 'has limited ethical implications'}. The key principles at stake are ${characteristics.principles.slice(0, 2).join(' and ')}.`;
  }

  private calculateEthosConfidence(
    characteristics: EthosCharacteristics,
    previousOpinions: PerspectiveOpinion[]
  ): number {
    let confidence = 0.6;
    
    // More principles = clearer ethical framework
    confidence += Math.min(0.1, characteristics.principles.length * 0.02);
    
    // Fewer risks = higher confidence
    if (characteristics.ethicalRisks.some(r => r.includes('No significant'))) {
      confidence += 0.1;
    } else {
      confidence -= Math.min(0.15, characteristics.ethicalRisks.length * 0.03);
    }
    
    // Consider previous pathos alignment
    const previousPathos = previousOpinions.find(op => op.perspective === 'pathos');
    if (previousPathos && previousPathos.confidence > 0.6) {
      confidence += 0.05;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  private generateEthosArguments(characteristics: EthosCharacteristics): string[] {
    const args: string[] = [];
    
    args.push(`Ethical framework: ${characteristics.ethicalFramework}`);
    
    for (const principle of characteristics.principles.slice(0, 2)) {
      args.push(`Principle invoked: ${principle}`);
    }
    
    if (characteristics.valuesAtStake.length > 0) {
      args.push(`Values at stake: ${characteristics.valuesAtStake.join(', ')}`);
    }
    
    return args;
  }

  private identifyEthosConcerns(characteristics: EthosCharacteristics): string[] {
    const concerns: string[] = [];
    
    for (const risk of characteristics.ethicalRisks) {
      if (!risk.includes('No significant')) {
        concerns.push(risk);
      }
    }
    
    if (characteristics.valuesAtStake.length > 3) {
      concerns.push('Multiple values may create ethical tensions');
    }
    
    return concerns.length > 0 ? concerns : ['Ethical considerations appear manageable'];
  }

  private assessEthicalAlignment(characteristics: EthosCharacteristics): number {
    let alignment = 0.7;
    
    // Reduce for identified risks
    alignment -= Math.min(0.2, 
      characteristics.ethicalRisks.filter(r => !r.includes('No significant')).length * 0.05
    );
    
    return Math.max(0.3, alignment);
  }

  private generateEthosSuggestions(characteristics: EthosCharacteristics): string[] {
    const suggestions: string[] = [];
    
    if (characteristics.ethicalRisks.some(r => !r.includes('No significant'))) {
      suggestions.push('Address identified ethical risks before implementation');
    }
    
    if (characteristics.valuesAtStake.length > 2) {
      suggestions.push('Consider ethical trade-offs between competing values');
    }
    
    suggestions.push(`Apply ${characteristics.ethicalFramework} framework consistently`);
    
    return suggestions;
  }

  /**
   * Sets the configuration for a perspective
   */
  setPerspectiveConfig(
    perspective: TripartitePerspective,
    config: { threshold?: number; style?: DeliberationMode }
  ): void {
    const current = this.perspectiveConfigs.get(perspective);
    if (current) {
      this.perspectiveConfigs.set(perspective, {
        threshold: config.threshold ?? current.threshold,
        style: config.style ?? current.style,
      });
    }
  }

  /**
   * Gets the configuration for a perspective
   */
  getPerspectiveConfig(perspective: TripartitePerspective): { threshold: number; style: DeliberationMode } {
    const config = this.perspectiveConfigs.get(perspective);
    if (!config) {
      throw new Error(`Unknown perspective: ${perspective}`);
    }
    return { ...config };
  }
}
