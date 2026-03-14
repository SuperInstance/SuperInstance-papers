/**
 * WeightCalculator - Domain-specific weight calculation for perspectives
 * 
 * Calculates appropriate weights for Pathos, Logos, and Ethos perspectives
 * based on the domain of the deliberation.
 * 
 * @module WeightCalculator
 */

/**
 * Types of domains that affect perspective weighting
 */
export type DomainType =
  | 'factual'       // Scientific, technical, data-driven decisions
  | 'emotional'     // Human-centered, relationship-based decisions
  | 'sensitive'     // Ethically charged, morally complex decisions
  | 'creative'      // Artistic, innovative, exploratory decisions
  | 'balanced'      // Default balanced weighting
  | 'technical'     // Engineering, implementation decisions
  | 'social'        // Community, societal impact decisions
  | 'business'      // Commercial, strategic decisions
  | 'personal';     // Individual-focused decisions

/**
 * Weight profile for a domain
 */
export interface WeightProfile {
  /** Weight for Pathos perspective (0-1) */
  pathosWeight: number;
  /** Weight for Logos perspective (0-1) */
  logosWeight: number;
  /** Weight for Ethos perspective (0-1) */
  ethosWeight: number;
  /** Domain this profile applies to */
  domain: DomainType;
  /** Human-readable description of the profile */
  description: string;
  /** Adjustment rules applied to this profile */
  adjustmentRules: WeightAdjustmentRule[];
}

/**
 * Rule for dynamically adjusting weights based on content
 */
export interface WeightAdjustmentRule {
  /** Name of the rule */
  name: string;
  /** Condition that triggers the rule */
  condition: string;
  /** Perspective to adjust */
  perspective: 'pathos' | 'logos' | 'ethos';
  /** Adjustment amount (-1 to 1, added to current weight) */
  adjustment: number;
  /** Priority of this rule (higher = applied first) */
  priority: number;
}

/**
 * Characteristics of a domain
 */
export interface DomainCharacteristics {
  /** How important is emotional appeal in this domain */
  emotionalImportance: number;
  /** How important is logical reasoning in this domain */
  logicalImportance: number;
  /** How important is ethical consideration in this domain */
  ethicalImportance: number;
  /** How much uncertainty typically exists */
  uncertaintyLevel: number;
  /** How many stakeholders are typically involved */
  stakeholderComplexity: number;
}

/**
 * Predefined weight profiles for different domains
 */
const DEFAULT_PROFILES: Record<DomainType, WeightProfile> = {
  factual: {
    pathosWeight: 0.15,
    logosWeight: 0.60,
    ethosWeight: 0.25,
    domain: 'factual',
    description: 'Scientific and data-driven decisions prioritize logic over emotion',
    adjustmentRules: [
      {
        name: 'data_present',
        condition: 'Content contains statistical data or research findings',
        perspective: 'logos',
        adjustment: 0.1,
        priority: 10,
      },
      {
        name: 'human_subjects',
        condition: 'Research involves human subjects',
        perspective: 'ethos',
        adjustment: 0.1,
        priority: 8,
      },
    ],
  },
  emotional: {
    pathosWeight: 0.50,
    logosWeight: 0.20,
    ethosWeight: 0.30,
    domain: 'emotional',
    description: 'Human-centered decisions value emotional resonance highly',
    adjustmentRules: [
      {
        name: 'personal_story',
        condition: 'Content includes personal narratives or testimonials',
        perspective: 'pathos',
        adjustment: 0.15,
        priority: 10,
      },
      {
        name: 'group_dynamics',
        condition: 'Decision affects group relationships',
        perspective: 'pathos',
        adjustment: 0.1,
        priority: 8,
      },
    ],
  },
  sensitive: {
    pathosWeight: 0.30,
    logosWeight: 0.25,
    ethosWeight: 0.45,
    domain: 'sensitive',
    description: 'Ethically complex decisions prioritize moral considerations',
    adjustmentRules: [
      {
        name: 'vulnerable_populations',
        condition: 'Decision affects vulnerable populations',
        perspective: 'ethos',
        adjustment: 0.15,
        priority: 10,
      },
      {
        name: 'rights_implications',
        condition: 'Decision has rights implications',
        perspective: 'ethos',
        adjustment: 0.1,
        priority: 9,
      },
    ],
  },
  creative: {
    pathosWeight: 0.40,
    logosWeight: 0.30,
    ethosWeight: 0.30,
    domain: 'creative',
    description: 'Creative decisions balance all perspectives with slight emotional edge',
    adjustmentRules: [
      {
        name: 'innovation_focus',
        condition: 'Decision involves innovation or new approaches',
        perspective: 'logos',
        adjustment: 0.05,
        priority: 7,
      },
      {
        name: 'artistic_expression',
        condition: 'Decision involves artistic or creative expression',
        perspective: 'pathos',
        adjustment: 0.1,
        priority: 8,
      },
    ],
  },
  balanced: {
    pathosWeight: 0.333,
    logosWeight: 0.334,
    ethosWeight: 0.333,
    domain: 'balanced',
    description: 'Equal weighting for general-purpose deliberations',
    adjustmentRules: [],
  },
  technical: {
    pathosWeight: 0.10,
    logosWeight: 0.70,
    ethosWeight: 0.20,
    domain: 'technical',
    description: 'Engineering decisions strongly prioritize logical reasoning',
    adjustmentRules: [
      {
        name: 'safety_critical',
        condition: 'Decision involves safety-critical systems',
        perspective: 'logos',
        adjustment: 0.05,
        priority: 10,
      },
      {
        name: 'user_impact',
        condition: 'Technical change affects end users',
        perspective: 'pathos',
        adjustment: 0.1,
        priority: 7,
      },
    ],
  },
  social: {
    pathosWeight: 0.40,
    logosWeight: 0.25,
    ethosWeight: 0.35,
    domain: 'social',
    description: 'Community decisions value emotional and ethical dimensions',
    adjustmentRules: [
      {
        name: 'community_impact',
        condition: 'Decision affects community cohesion',
        perspective: 'ethos',
        adjustment: 0.1,
        priority: 9,
      },
      {
        name: 'public_opinion',
        condition: 'Decision will be subject to public scrutiny',
        perspective: 'pathos',
        adjustment: 0.05,
        priority: 8,
      },
    ],
  },
  business: {
    pathosWeight: 0.25,
    logosWeight: 0.45,
    ethosWeight: 0.30,
    domain: 'business',
    description: 'Business decisions balance logic with stakeholder impact',
    adjustmentRules: [
      {
        name: 'profit_pressure',
        condition: 'Financial metrics are primary consideration',
        perspective: 'logos',
        adjustment: 0.1,
        priority: 8,
      },
      {
        name: 'reputation_risk',
        condition: 'Decision affects company reputation',
        perspective: 'ethos',
        adjustment: 0.1,
        priority: 9,
      },
    ],
  },
  personal: {
    pathosWeight: 0.45,
    logosWeight: 0.30,
    ethosWeight: 0.25,
    domain: 'personal',
    description: 'Personal decisions emphasize individual emotional needs',
    adjustmentRules: [
      {
        name: 'life_changing',
        condition: 'Decision has significant life impact',
        perspective: 'pathos',
        adjustment: 0.1,
        priority: 10,
      },
      {
        name: 'relationships',
        condition: 'Decision affects personal relationships',
        perspective: 'ethos',
        adjustment: 0.1,
        priority: 9,
      },
    ],
  },
};

/**
 * Domain characteristics for analysis
 */
const DOMAIN_CHARACTERISTICS: Record<DomainType, DomainCharacteristics> = {
  factual: {
    emotionalImportance: 0.2,
    logicalImportance: 0.8,
    ethicalImportance: 0.4,
    uncertaintyLevel: 0.3,
    stakeholderComplexity: 0.3,
  },
  emotional: {
    emotionalImportance: 0.8,
    logicalImportance: 0.3,
    ethicalImportance: 0.5,
    uncertaintyLevel: 0.5,
    stakeholderComplexity: 0.7,
  },
  sensitive: {
    emotionalImportance: 0.6,
    logicalImportance: 0.4,
    ethicalImportance: 0.9,
    uncertaintyLevel: 0.4,
    stakeholderComplexity: 0.8,
  },
  creative: {
    emotionalImportance: 0.7,
    logicalImportance: 0.5,
    ethicalImportance: 0.4,
    uncertaintyLevel: 0.6,
    stakeholderComplexity: 0.4,
  },
  balanced: {
    emotionalImportance: 0.5,
    logicalImportance: 0.5,
    ethicalImportance: 0.5,
    uncertaintyLevel: 0.5,
    stakeholderComplexity: 0.5,
  },
  technical: {
    emotionalImportance: 0.1,
    logicalImportance: 0.9,
    ethicalImportance: 0.3,
    uncertaintyLevel: 0.2,
    stakeholderComplexity: 0.2,
  },
  social: {
    emotionalImportance: 0.7,
    logicalImportance: 0.4,
    ethicalImportance: 0.6,
    uncertaintyLevel: 0.5,
    stakeholderComplexity: 0.9,
  },
  business: {
    emotionalImportance: 0.4,
    logicalImportance: 0.7,
    ethicalImportance: 0.5,
    uncertaintyLevel: 0.4,
    stakeholderComplexity: 0.6,
  },
  personal: {
    emotionalImportance: 0.8,
    logicalImportance: 0.4,
    ethicalImportance: 0.4,
    uncertaintyLevel: 0.6,
    stakeholderComplexity: 0.3,
  },
};

/**
 * WeightCalculator - Calculates domain-specific weights for perspectives
 * 
 * Manages weight profiles for different deliberation domains and provides
 * methods to calculate and adjust perspective weights based on content.
 * 
 * @example
 * ```typescript
 * const calculator = new WeightCalculator();
 * 
 * // Get weights for a factual domain
 * const factualProfile = calculator.getProfile('factual');
 * console.log(factualProfile.logosWeight); // 0.60
 * 
 * // Calculate adjusted weights based on content
 * const adjusted = calculator.calculateAdjustedWeights(
 *   'sensitive',
 *   'This decision affects vulnerable populations...',
 *   { pathosWeight: 0.3, logosWeight: 0.25, ethosWeight: 0.45 }
 * );
 * ```
 */
export class WeightCalculator {
  private readonly profiles: Map<DomainType, WeightProfile>;
  private readonly customOverrides: Partial<WeightProfile>;

  /**
   * Creates a new WeightCalculator instance
   * @param customWeights - Optional custom weight overrides to apply to all profiles
   */
  constructor(customWeights?: Partial<WeightProfile>) {
    this.profiles = new Map(Object.entries(DEFAULT_PROFILES) as [DomainType, WeightProfile][]);
    this.customOverrides = customWeights ?? {};
  }

  /**
   * Gets the weight profile for a specific domain
   * @param domain - The domain to get weights for
   * @returns The weight profile for the domain
   */
  getProfile(domain: DomainType): WeightProfile {
    const baseProfile = this.profiles.get(domain);
    if (!baseProfile) {
      throw new Error(`Unknown domain: ${domain}`);
    }

    // Apply custom overrides
    return {
      ...baseProfile,
      ...this.customOverrides,
      domain,
      adjustmentRules: baseProfile.adjustmentRules,
    };
  }

  /**
   * Sets a custom weight profile for a domain
   * @param domain - The domain to set
   * @param weights - The weights to apply
   */
  setProfile(domain: DomainType, weights: Partial<WeightProfile>): void {
    const current = this.profiles.get(domain);
    if (!current) {
      throw new Error(`Unknown domain: ${domain}`);
    }

    // Normalize weights to sum to 1
    const rawPathos = weights.pathosWeight ?? current.pathosWeight;
    const rawLogos = weights.logosWeight ?? current.logosWeight;
    const rawEthos = weights.ethosWeight ?? current.ethosWeight;
    const total = rawPathos + rawLogos + rawEthos;

    this.profiles.set(domain, {
      ...current,
      pathosWeight: rawPathos / total,
      logosWeight: rawLogos / total,
      ethosWeight: rawEthos / total,
      description: weights.description ?? current.description,
      adjustmentRules: weights.adjustmentRules ?? current.adjustmentRules,
    });
  }

  /**
   * Calculates adjusted weights based on content analysis
   * @param domain - The base domain
   * @param content - The content to analyze
   * @param baseWeights - Optional base weights to start from
   * @returns Adjusted weight profile
   */
  calculateAdjustedWeights(
    domain: DomainType,
    content: string,
    baseWeights?: WeightProfile
  ): WeightProfile {
    const baseProfile = baseWeights ?? this.getProfile(domain);
    const rules = baseProfile.adjustmentRules;

    // Sort rules by priority
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    let pathosWeight = baseProfile.pathosWeight;
    let logosWeight = baseProfile.logosWeight;
    let ethosWeight = baseProfile.ethosWeight;

    // Apply matching rules
    for (const rule of sortedRules) {
      if (this.matchesCondition(content, rule.condition)) {
        switch (rule.perspective) {
          case 'pathos':
            pathosWeight += rule.adjustment;
            break;
          case 'logos':
            logosWeight += rule.adjustment;
            break;
          case 'ethos':
            ethosWeight += rule.adjustment;
            break;
        }
      }
    }

    // Normalize to sum to 1
    const total = pathosWeight + logosWeight + ethosWeight;
    
    return {
      pathosWeight: pathosWeight / total,
      logosWeight: logosWeight / total,
      ethosWeight: ethosWeight / total,
      domain,
      description: `Adjusted profile for ${domain} domain based on content analysis`,
      adjustmentRules: rules,
    };
  }

  /**
   * Detects the most appropriate domain from content
   * @param content - The content to analyze
   * @returns The detected domain
   */
  detectDomain(content: string): DomainType {
    const lowerContent = content.toLowerCase();
    const scores: { domain: DomainType; score: number }[] = [];

    // Check for factual/scientific indicators
    const factualScore = this.scoreDomain(lowerContent, {
      'data': 2, 'research': 2, 'study': 1, 'analysis': 1, 'evidence': 2,
      'scientific': 2, 'measurement': 1, 'statistic': 2, 'empirical': 2,
      'hypothesis': 1, 'experiment': 1, 'result': 1, 'fact': 1,
    });
    scores.push({ domain: 'factual', score: factualScore });

    // Check for emotional indicators
    const emotionalScore = this.scoreDomain(lowerContent, {
      'feel': 2, 'emotion': 2, 'relationship': 1, 'care': 1, 'love': 2,
      'passion': 2, 'heart': 2, 'empathy': 2, 'connection': 1, 'support': 1,
      'understand': 1, 'personal': 1, 'family': 1, 'friend': 1,
    });
    scores.push({ domain: 'emotional', score: emotionalScore });

    // Check for sensitive/ethical indicators
    const sensitiveScore = this.scoreDomain(lowerContent, {
      'ethics': 2, 'moral': 2, 'right': 1, 'wrong': 1, 'justice': 2,
      'fair': 1, 'equality': 2, 'rights': 2, 'dignity': 2, 'vulnerable': 2,
      'discrimination': 2, 'privacy': 1, 'consent': 2, 'harm': 2,
    });
    scores.push({ domain: 'sensitive', score: sensitiveScore });

    // Check for creative indicators
    const creativeScore = this.scoreDomain(lowerContent, {
      'creative': 2, 'innovative': 2, 'design': 1, 'art': 2, 'imagine': 1,
      'explore': 1, 'novel': 1, 'original': 2, 'express': 1, 'aesthetic': 2,
      'beauty': 1, 'inspire': 1, 'vision': 1, 'transform': 1,
    });
    scores.push({ domain: 'creative', score: creativeScore });

    // Check for technical indicators
    const technicalScore = this.scoreDomain(lowerContent, {
      'technical': 2, 'engineering': 2, 'system': 1, 'implement': 1, 'architecture': 2,
      'code': 1, 'algorithm': 2, 'optimize': 1, 'performance': 1, 'infrastructure': 2,
      'specification': 1, 'integration': 1, 'deploy': 1, 'scalability': 1,
    });
    scores.push({ domain: 'technical', score: technicalScore });

    // Check for social indicators
    const socialScore = this.scoreDomain(lowerContent, {
      'community': 2, 'society': 2, 'public': 1, 'social': 2, 'people': 1,
      'collective': 2, 'together': 1, 'group': 1, 'shared': 1, 'common': 1,
      'collaborative': 1, 'participate': 1, 'democratic': 2, 'citizens': 2,
    });
    scores.push({ domain: 'social', score: socialScore });

    // Check for business indicators
    const businessScore = this.scoreDomain(lowerContent, {
      'business': 2, 'profit': 2, 'market': 1, 'revenue': 2, 'customer': 1,
      'strategy': 1, 'competitive': 1, 'investment': 1, 'roi': 2, 'stakeholder': 1,
      'growth': 1, 'enterprise': 1, 'commercial': 2, 'industry': 1,
    });
    scores.push({ domain: 'business', score: businessScore });

    // Check for personal indicators
    const personalScore = this.scoreDomain(lowerContent, {
      'personal': 2, 'individual': 1, 'self': 2, 'my': 1, 'myself': 2,
      'life': 1, 'choice': 1, 'decision': 1, 'goal': 1, 'future': 1,
      'happiness': 2, 'fulfillment': 2, 'wellbeing': 1, 'career': 1,
    });
    scores.push({ domain: 'personal', score: personalScore });

    // Find highest score
    scores.sort((a, b) => b.score - a.score);
    
    // If no strong signal, return balanced
    if (scores[0]!.score < 3) {
      return 'balanced';
    }

    return scores[0]!.domain;
  }

  /**
   * Scores content against keyword weights
   */
  private scoreDomain(content: string, keywords: Record<string, number>): number {
    let score = 0;
    for (const [keyword, weight] of Object.entries(keywords)) {
      if (content.includes(keyword)) {
        score += weight;
      }
    }
    return score;
  }

  /**
   * Checks if content matches a condition
   */
  private matchesCondition(content: string, condition: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerCondition = condition.toLowerCase();
    
    // Simple keyword matching - could be enhanced with NLP
    const keywords = lowerCondition.match(/\b[a-z]+\b/g) ?? [];
    const matchingKeywords = keywords.filter(kw => lowerContent.includes(kw));
    
    return matchingKeywords.length >= Math.ceil(keywords.length * 0.3);
  }

  /**
   * Gets domain characteristics
   * @param domain - The domain to get characteristics for
   * @returns The domain characteristics
   */
  getDomainCharacteristics(domain: DomainType): DomainCharacteristics {
    return { ...DOMAIN_CHARACTERISTICS[domain] };
  }

  /**
   * Lists all available domains
   * @returns Array of available domains
   */
  listDomains(): DomainType[] {
    return [
      'factual',
      'emotional',
      'sensitive',
      'creative',
      'balanced',
      'technical',
      'social',
      'business',
      'personal',
    ];
  }

  /**
   * Creates a custom weight profile by blending multiple domains
   * @param domains - Domains to blend with weights
   * @returns Blended weight profile
   */
  blendDomains(domains: Array<{ domain: DomainType; weight: number }>): WeightProfile {
    if (domains.length === 0) {
      return this.getProfile('balanced');
    }

    // Normalize input weights
    const totalInputWeight = domains.reduce((sum, d) => sum + d.weight, 0);
    const normalizedDomains = domains.map(d => ({
      domain: d.domain,
      weight: d.weight / totalInputWeight,
    }));

    // Blend the weights
    let pathosWeight = 0;
    let logosWeight = 0;
    let ethosWeight = 0;
    const allRules: WeightAdjustmentRule[] = [];

    for (const { domain, weight } of normalizedDomains) {
      const profile = this.getProfile(domain);
      pathosWeight += profile.pathosWeight * weight;
      logosWeight += profile.logosWeight * weight;
      ethosWeight += profile.ethosWeight * weight;
      allRules.push(...profile.adjustmentRules);
    }

    // Normalize to sum to 1
    const total = pathosWeight + logosWeight + ethosWeight;

    return {
      pathosWeight: pathosWeight / total,
      logosWeight: logosWeight / total,
      ethosWeight: ethosWeight / total,
      domain: 'balanced',
      description: `Blended profile from: ${domains.map(d => d.domain).join(', ')}`,
      adjustmentRules: allRules,
    };
  }

  /**
   * Validates a weight profile
   * @param profile - Profile to validate
   * @returns Whether the profile is valid
   */
  validateProfile(profile: Partial<WeightProfile>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (profile.pathosWeight !== undefined) {
      if (profile.pathosWeight < 0 || profile.pathosWeight > 1) {
        errors.push('pathosWeight must be between 0 and 1');
      }
    }

    if (profile.logosWeight !== undefined) {
      if (profile.logosWeight < 0 || profile.logosWeight > 1) {
        errors.push('logosWeight must be between 0 and 1');
      }
    }

    if (profile.ethosWeight !== undefined) {
      if (profile.ethosWeight < 0 || profile.ethosWeight > 1) {
        errors.push('ethosWeight must be between 0 and 1');
      }
    }

    if (
      profile.pathosWeight !== undefined &&
      profile.logosWeight !== undefined &&
      profile.ethosWeight !== undefined
    ) {
      const sum = profile.pathosWeight + profile.logosWeight + profile.ethosWeight;
      if (Math.abs(sum - 1) > 0.001) {
        errors.push(`Weights must sum to 1, got ${sum.toFixed(3)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
