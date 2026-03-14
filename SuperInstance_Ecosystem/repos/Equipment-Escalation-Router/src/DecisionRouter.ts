/**
 * DecisionRouter - Route decisions based on complexity/stakes/urgency/novelty
 * 
 * Analyzes queries and determines the appropriate routing tier
 */

/**
 * Complexity level of a query
 */
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'extreme';

/**
 * Urgency level of a query
 */
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

/**
 * Stakes level of a query
 */
export type StakesLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Decision factors for routing
 */
export interface DecisionFactors {
  complexity: ComplexityLevel;
  urgency: UrgencyLevel;
  stakes: StakesLevel;
  novelty: number; // 0-1, higher = more novel/unknown
  hasCode: boolean;
  hasMath: boolean;
  requiresCreativity: boolean;
  requiresJudgment: boolean;
  requiresApproval: boolean;
  emotionalContent: boolean;
  legalCompliance: boolean;
  safetySensitive: boolean;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  recommendedTier: 'bot' | 'brain' | 'human';
  confidence: number; // 0-1
  factors: DecisionFactors;
  reasoning: string;
  alternatives: Array<{
    tier: 'bot' | 'brain' | 'human';
    reason: string;
  }>;
  escalationTriggers: string[];
}

/**
 * Configuration for DecisionRouter
 */
export interface DecisionRouterConfig {
  enablePatternLearning: boolean;
  customRules?: RoutingRule[];
  complexityThresholds?: Partial<Record<ComplexityLevel, number>>;
}

/**
 * Custom routing rule
 */
export interface RoutingRule {
  name: string;
  condition: (query: string, factors: DecisionFactors) => boolean;
  tier: 'bot' | 'brain' | 'human';
  priority: number;
}

/**
 * DecisionRouter class
 * Routes requests to appropriate tiers based on multiple factors
 */
export class DecisionRouter {
  private config: DecisionRouterConfig;
  private patterns: Map<string, { tier: 'bot' | 'brain' | 'human'; count: number; success: number }>;
  private rules: RoutingRule[];

  constructor(config: Partial<DecisionRouterConfig> = {}) {
    this.config = {
      enablePatternLearning: true,
      ...config
    };
    this.patterns = new Map();
    this.rules = config.customRules || [];
    this.initializeDefaultRules();
  }

  /**
   * Make a routing decision
   */
  async decide(request: {
    query: string;
    context?: Record<string, unknown>;
    overrideFactors?: Partial<DecisionFactors>;
  }): Promise<RoutingDecision> {
    // Analyze the query to extract factors
    const factors = this.analyzeQuery(request.query, request.overrideFactors);

    // Check for learned patterns first
    if (this.config.enablePatternLearning) {
      const patternMatch = this.matchPattern(request.query);
      if (patternMatch) {
        return this.buildDecision(patternMatch.tier, factors, 'Learned pattern match');
      }
    }

    // Apply custom rules
    for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
      if (rule.condition(request.query, factors)) {
        return this.buildDecision(rule.tier, factors, `Custom rule: ${rule.name}`);
      }
    }

    // Apply core routing logic
    const recommendedTier = this.determineTier(factors);
    const reasoning = this.generateReasoning(factors, recommendedTier);

    return {
      recommendedTier,
      confidence: this.calculateConfidence(factors),
      factors,
      reasoning,
      alternatives: this.generateAlternatives(factors, recommendedTier),
      escalationTriggers: this.identifyEscalationTriggers(factors)
    };
  }

  /**
   * Learn from a routing pattern
   */
  learnPattern(query: string, result: {
    tier: 'bot' | 'brain' | 'human';
    success: boolean;
    factors: DecisionFactors;
  }): void {
    if (!this.config.enablePatternLearning) return;

    const pattern = this.extractPattern(query);
    const existing = this.patterns.get(pattern);

    if (existing) {
      existing.count++;
      if (result.success) {
        existing.success++;
      }
    } else {
      this.patterns.set(pattern, {
        tier: result.tier,
        count: 1,
        success: result.success ? 1 : 0
      });
    }
  }

  /**
   * Analyze query to extract decision factors
   */
  private analyzeQuery(query: string, overrides?: Partial<DecisionFactors>): DecisionFactors {
    const base: DecisionFactors = {
      complexity: this.assessComplexity(query),
      urgency: this.assessUrgency(query),
      stakes: this.assessStakes(query),
      novelty: this.assessNovelty(query),
      hasCode: this.detectCode(query),
      hasMath: this.detectMath(query),
      requiresCreativity: this.detectCreativity(query),
      requiresJudgment: this.detectJudgment(query),
      requiresApproval: this.detectApprovalNeed(query),
      emotionalContent: this.detectEmotionalContent(query),
      legalCompliance: this.detectLegalCompliance(query),
      safetySensitive: this.detectSafetySensitivity(query)
    };

    return { ...base, ...overrides };
  }

  /**
   * Assess complexity level of query
   */
  private assessComplexity(query: string): ComplexityLevel {
    const indicators = {
      trivial: ['what is', 'define', 'convert', 'format', 'list'],
      simple: ['how to', 'explain', 'compare', 'difference between'],
      moderate: ['analyze', 'evaluate', 'design', 'implement'],
      complex: ['architect', 'optimize', 'refactor', 'integrate'],
      extreme: ['research', 'invent', 'discover', 'novel']
    };

    const lowerQuery = query.toLowerCase();
    const wordCount = query.split(/\s+/).length;

    // Check for complexity indicators
    for (const [level, keywords] of Object.entries(indicators)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        // Adjust based on length
        if (wordCount > 50 && (level === 'simple' || level === 'moderate')) {
          return level === 'simple' ? 'moderate' : 'complex';
        }
        return level as ComplexityLevel;
      }
    }

    // Default based on length
    if (wordCount < 10) return 'trivial';
    if (wordCount < 25) return 'simple';
    if (wordCount < 50) return 'moderate';
    if (wordCount < 100) return 'complex';
    return 'extreme';
  }

  /**
   * Assess urgency level
   */
  private assessUrgency(query: string): UrgencyLevel {
    const lowerQuery = query.toLowerCase();
    
    const criticalIndicators = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'production down', 'outage'];
    const highIndicators = ['quickly', 'soon', 'priority', 'important', 'deadline', 'today'];
    const lowIndicators = ['when possible', 'no rush', 'eventually', 'someday'];

    if (criticalIndicators.some(i => lowerQuery.includes(i))) return 'critical';
    if (highIndicators.some(i => lowerQuery.includes(i))) return 'high';
    if (lowIndicators.some(i => lowerQuery.includes(i))) return 'low';
    return 'normal';
  }

  /**
   * Assess stakes level
   */
  private assessStakes(query: string): StakesLevel {
    const lowerQuery = query.toLowerCase();
    
    const criticalIndicators = ['legal', 'lawsuit', 'contract', 'financial', 'million', 'billion', 'life', 'death', 'safety'];
    const highIndicators = ['budget', 'revenue', 'customer', 'client', 'deploy', 'production', 'release'];
    const mediumIndicators = ['team', 'project', 'deadline', 'meeting', 'presentation'];
    const lowIndicators = ['personal', 'practice', 'learning', 'test', 'experiment'];

    if (criticalIndicators.some(i => lowerQuery.includes(i))) return 'critical';
    if (highIndicators.some(i => lowerQuery.includes(i))) return 'high';
    if (mediumIndicators.some(i => lowerQuery.includes(i))) return 'medium';
    if (lowIndicators.some(i => lowerQuery.includes(i))) return 'low';
    return 'minimal';
  }

  /**
   * Assess novelty (0-1)
   */
  private assessNovelty(query: string): number {
    // Check against known patterns
    const pattern = this.extractPattern(query);
    const existing = this.patterns.get(pattern);
    
    if (existing && existing.count > 10) {
      return 0.1; // Very common pattern
    }
    if (existing && existing.count > 5) {
      return 0.3; // Somewhat common
    }
    if (existing) {
      return 0.5; // Seen before
    }

    // Assess novelty based on unique words/phrases
    const lowerQuery = query.toLowerCase();
    const novelIndicators = ['new', 'novel', 'unique', 'first', 'never', 'innovative', 'creative', 'invent'];
    const novelCount = novelIndicators.filter(i => lowerQuery.includes(i)).length;
    
    return Math.min(1, 0.6 + (novelCount * 0.1));
  }

  /**
   * Detect code in query
   */
  private detectCode(query: string): boolean {
    const codeIndicators = ['function', 'class', 'method', 'variable', 'code', 'programming', 'debug', 'error', 'exception', 'api', 'database', 'sql', 'json', 'xml'];
    return codeIndicators.some(i => query.toLowerCase().includes(i)) || 
           /```|`[^`]+`|\([^)]*\)\s*{|=>|===|!==/.test(query);
  }

  /**
   * Detect math in query
   */
  private detectMath(query: string): boolean {
    return /[0-9]+\s*[\+\-\*\/\=]|\d+\.\d+|calculate|compute|equation|formula|percentage|ratio/.test(query);
  }

  /**
   * Detect creativity requirement
   */
  private detectCreativity(query: string): boolean {
    const creativeIndicators = ['create', 'design', 'write', 'compose', 'generate', 'brainstorm', 'idea', 'creative', 'story', 'poem', 'art'];
    return creativeIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Detect judgment requirement
   */
  private detectJudgment(query: string): boolean {
    const judgmentIndicators = ['decide', 'judge', 'evaluate', 'assess', 'determine', 'choose', 'recommend', 'should i', 'better', 'best', 'opinion'];
    return judgmentIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Detect approval need
   */
  private detectApprovalNeed(query: string): boolean {
    const approvalIndicators = ['approve', 'authorize', 'permission', 'confirm', 'validate', 'sign off', 'accept', 'reject'];
    return approvalIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Detect emotional content
   */
  private detectEmotionalContent(query: string): boolean {
    const emotionalIndicators = ['feel', 'emotion', 'sad', 'happy', 'angry', 'frustrated', 'worried', 'anxious', 'excited', 'stress', 'mental'];
    return emotionalIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Detect legal compliance need
   */
  private detectLegalCompliance(query: string): boolean {
    const legalIndicators = ['legal', 'law', 'regulation', 'compliance', 'gdpr', 'hipaa', 'contract', 'liability', 'policy', 'terms', 'conditions'];
    return legalIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Detect safety sensitivity
   */
  private detectSafetySensitivity(query: string): boolean {
    const safetyIndicators = ['safety', 'danger', 'hazard', 'risk', 'security', 'vulnerability', 'attack', 'breach', 'threat', 'medical', 'health'];
    return safetyIndicators.some(i => query.toLowerCase().includes(i));
  }

  /**
   * Determine appropriate tier based on factors
   */
  private determineTier(factors: DecisionFactors): 'bot' | 'brain' | 'human' {
    // Human escalation triggers
    if (factors.stakes === 'critical' && factors.requiresApproval) return 'human';
    if (factors.legalCompliance && factors.stakes === 'critical') return 'human';
    if (factors.safetySensitive && factors.stakes === 'critical') return 'human';
    if (factors.requiresApproval && factors.stakes === 'high') return 'human';
    if (factors.emotionalContent && factors.stakes === 'high') return 'human';

    // Brain tier triggers
    if (factors.complexity === 'complex' || factors.complexity === 'extreme') return 'brain';
    if (factors.hasCode && factors.complexity !== 'trivial') return 'brain';
    if (factors.requiresCreativity && factors.novelty > 0.5) return 'brain';
    if (factors.requiresJudgment && factors.stakes === 'medium') return 'brain';
    if (factors.novelty > 0.7) return 'brain';

    // Bot tier for simple queries
    if (factors.complexity === 'trivial' || factors.complexity === 'simple') {
      if (factors.stakes === 'minimal' || factors.stakes === 'low') return 'bot';
    }
    if (!factors.requiresCreativity && !factors.requiresJudgment && factors.novelty < 0.3) return 'bot';

    // Default to brain for moderate complexity
    return 'brain';
  }

  /**
   * Calculate confidence in routing decision
   */
  private calculateConfidence(factors: DecisionFactors): number {
    let confidence = 0.7;

    // Increase confidence for clear-cut cases
    if (factors.stakes === 'critical') confidence += 0.15;
    if (factors.complexity === 'trivial') confidence += 0.1;
    if (factors.novelty < 0.3) confidence += 0.1;

    // Decrease confidence for ambiguous cases
    if (factors.complexity === 'moderate') confidence -= 0.1;
    if (factors.novelty > 0.7) confidence -= 0.15;
    if (factors.requiresJudgment && factors.stakes === 'medium') confidence -= 0.1;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(factors: DecisionFactors, tier: 'bot' | 'brain' | 'human'): string {
    const reasons: string[] = [];

    reasons.push(`Complexity: ${factors.complexity}`);
    reasons.push(`Stakes: ${factors.stakes}`);

    if (factors.stakes === 'critical') reasons.push('Critical stakes detected');
    if (factors.requiresApproval) reasons.push('Requires approval');
    if (factors.legalCompliance) reasons.push('Legal compliance needed');
    if (factors.safetySensitive) reasons.push('Safety sensitive');
    if (factors.hasCode) reasons.push('Contains code');
    if (factors.requiresCreativity) reasons.push('Requires creativity');
    if (factors.novelty > 0.5) reasons.push('Novel request');

    return `Routed to ${tier}: ${reasons.join(', ')}`;
  }

  /**
   * Generate alternative routing options
   */
  private generateAlternatives(factors: DecisionFactors, recommended: 'bot' | 'brain' | 'human'): Array<{ tier: 'bot' | 'brain' | 'human'; reason: string }> {
    const alternatives: Array<{ tier: 'bot' | 'brain' | 'human'; reason: string }> = [];

    if (recommended === 'human' && factors.stakes !== 'critical') {
      alternatives.push({ tier: 'brain', reason: 'Can handle with human oversight' });
    }

    if (recommended === 'brain') {
      if (factors.complexity === 'moderate') {
        alternatives.push({ tier: 'bot', reason: 'May handle with simple response' });
      }
      alternatives.push({ tier: 'human', reason: 'For higher confidence on important decision' });
    }

    if (recommended === 'bot' && factors.novelty > 0.3) {
      alternatives.push({ tier: 'brain', reason: 'Novelty may require more sophisticated handling' });
    }

    return alternatives;
  }

  /**
   * Identify conditions that would trigger escalation
   */
  private identifyEscalationTriggers(factors: DecisionFactors): string[] {
    const triggers: string[] = [];

    if (factors.stakes === 'high' || factors.stakes === 'critical') {
      triggers.push('High stakes situation');
    }
    if (factors.requiresApproval) {
      triggers.push('Requires approval/authorization');
    }
    if (factors.legalCompliance) {
      triggers.push('Legal compliance required');
    }
    if (factors.safetySensitive) {
      triggers.push('Safety sensitive operation');
    }
    if (factors.emotionalContent && factors.stakes === 'high') {
      triggers.push('Emotional content with high stakes');
    }

    return triggers;
  }

  /**
   * Extract pattern from query for learning
   */
  private extractPattern(query: string): string {
    // Normalize and extract key structure
    const normalized = query.toLowerCase()
      .replace(/[0-9]+/g, '#NUM#')
      .replace(/[a-zA-Z]+\@[a-zA-Z]+\.[a-zA-Z]+/g, '#EMAIL#')
      .replace(/https?:\/\/[^\s]+/g, '#URL#')
      .trim();

    // Extract first few words as pattern key
    const words = normalized.split(/\s+/).slice(0, 5).join(' ');
    return words;
  }

  /**
   * Match against learned patterns
   */
  private matchPattern(query: string): { tier: 'bot' | 'brain' | 'human' } | null {
    const pattern = this.extractPattern(query);
    const existing = this.patterns.get(pattern);

    if (existing && existing.count >= 3 && existing.success / existing.count > 0.8) {
      return { tier: existing.tier };
    }

    return null;
  }

  /**
   * Build a routing decision result
   */
  private buildDecision(tier: 'bot' | 'brain' | 'human', factors: DecisionFactors, reason: string): RoutingDecision {
    return {
      recommendedTier: tier,
      confidence: 0.9,
      factors,
      reasoning: reason,
      alternatives: [],
      escalationTriggers: this.identifyEscalationTriggers(factors)
    };
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRules(): void {
    // Add default rules that can be overridden
    this.rules.push(
      {
        name: 'trivial-lookup',
        condition: (q) => /^(what is|define|convert|list)/i.test(q.trim()) && q.length < 100,
        tier: 'bot',
        priority: 100
      },
      {
        name: 'code-generation',
        condition: (q, f) => f.hasCode && f.complexity !== 'trivial',
        tier: 'brain',
        priority: 90
      },
      {
        name: 'legal-critical',
        condition: (q, f) => f.legalCompliance && f.stakes === 'critical',
        tier: 'human',
        priority: 150
      },
      {
        name: 'approval-required',
        condition: (q, f) => f.requiresApproval && (f.stakes === 'high' || f.stakes === 'critical'),
        tier: 'human',
        priority: 140
      }
    );
  }
}

export default DecisionRouter;
