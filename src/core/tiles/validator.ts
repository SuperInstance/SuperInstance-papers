/**
 * POLLN Validator Tile
 *
 * Validates inputs against learned patterns
 */

import { v4 } from 'uuid';
import {
  BaseTile,
  TileCategory,
  TileConfig,
  TileContext,
  TileResult,
  Observation,
  PollenGrain,
} from '../tile.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validation rule
 */
export interface ValidationRule {
  id: string;
  name: string;
  check: (value: unknown) => boolean;
  weight: number;
  learnable: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;
  passedRules: string[];
  failedRules: string[];
  confidence: number;
}

/**
 * Validator tile configuration
 */
export interface ValidatorTileConfig extends TileConfig {
  rules?: ValidationRule[];
  threshold?: number;
  strictMode?: boolean;
}

// ============================================================================
// VALIDATOR TILE
// ============================================================================

/**
 * ValidatorTile - Validates inputs against learned patterns
 *
 * Features:
 * - Rule-based validation
 * - Learnable validation patterns
 * - Weighted rule combination
 * - Confidence scoring
 */
export class ValidatorTile extends BaseTile<unknown, ValidationResult> {
  private rules: Map<string, ValidationRule> = new Map();
  private threshold: number;
  private strictMode: boolean;

  // Learned patterns
  private positivePatterns: Map<string, number> = new Map();
  private negativePatterns: Map<string, number> = new Map();

  constructor(config: ValidatorTileConfig) {
    super({
      ...config,
      name: config.name || 'validator',
      category: config.category ?? TileCategory.ROLE,
    });

    this.threshold = config.threshold ?? 0.7;
    this.strictMode = config.strictMode ?? false;

    // Initialize rules
    if (config.rules) {
      for (const rule of config.rules) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Execute validation
   */
  async execute(
    input: unknown,
    context: TileContext
  ): Promise<TileResult<ValidationResult>> {
    const startTime = Date.now();

    const passedRules: string[] = [];
    const failedRules: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Apply all rules
    for (const [id, rule] of this.rules) {
      const passes = rule.check(input);

      if (passes) {
        passedRules.push(id);
        totalScore += rule.weight;
      } else {
        failedRules.push(id);
      }
      totalWeight += rule.weight;
    }

    // Calculate rule-based score
    const ruleScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;

    // Apply learned patterns
    const patternScore = this.checkLearnedPatterns(input);

    // Combine scores
    const finalScore = ruleScore * 0.6 + patternScore * 0.4;
    const isValid = this.strictMode
      ? failedRules.length === 0 && finalScore >= this.threshold
      : finalScore >= this.threshold;

    // Calculate confidence based on rule agreement
    const confidence = this.calculateConfidence(passedRules.length, failedRules.length);

    // Create result
    const result: ValidationResult = {
      isValid,
      score: finalScore,
      passedRules,
      failedRules,
      confidence,
    };

    // Learn from validation (positive pattern if valid, negative if not)
    this.learnFromValidation(input, isValid, finalScore);

    return {
      output: result,
      success: isValid,
      confidence,
      executionTimeMs: Date.now() - startTime,
      energyUsed: this.rules.size * 0.1,
      observations: [],
    };
  }

  /**
   * Check against learned patterns
   */
  private checkLearnedPatterns(input: unknown): number {
    const inputStr = this.canonicalize(input);

    // Check positive patterns
    let positiveScore = 0;
    for (const [pattern, weight] of this.positivePatterns) {
      if (inputStr.includes(pattern)) {
        positiveScore += weight;
      }
    }

    // Check negative patterns
    let negativeScore = 0;
    for (const [pattern, weight] of this.negativePatterns) {
      if (inputStr.includes(pattern)) {
        negativeScore += weight;
      }
    }

    // Normalize
    const totalPatterns = this.positivePatterns.size + this.negativePatterns.size;
    if (totalPatterns === 0) return 0.5;

    return Math.max(0, Math.min(1,
      0.5 + (positiveScore - negativeScore) / totalPatterns
    ));
  }

  /**
   * Learn from validation result
   */
  private learnFromValidation(input: unknown, isValid: boolean, score: number): void {
    const inputStr = this.canonicalize(input);
    const patterns = this.extractPatterns(inputStr);

    for (const pattern of patterns) {
      if (isValid) {
        const current = this.positivePatterns.get(pattern) ?? 0;
        this.positivePatterns.set(pattern, current + score * 0.1);
      } else {
        const current = this.negativePatterns.get(pattern) ?? 0;
        this.negativePatterns.set(pattern, current + (1 - score) * 0.1);
      }
    }

    // Prune low-weight patterns
    this.prunePatterns();
  }

  /**
   * Canonicalize input for pattern matching
   */
  private canonicalize(input: unknown): string {
    if (typeof input === 'string') return input.toLowerCase();
    if (typeof input === 'number') return input.toString();
    if (typeof input === 'boolean') return input ? 'true' : 'false';
    return JSON.stringify(input).toLowerCase();
  }

  /**
   * Extract patterns from string
   */
  private extractPatterns(str: string): string[] {
    // Extract words and bigrams
    const words = str.match(/\w+/g) ?? [];
    const bigrams: string[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]}_${words[i + 1]}`);
    }

    return [...words.slice(0, 10), ...bigrams.slice(0, 10)];
  }

  /**
   * Prune low-weight patterns
   */
  private prunePatterns(): void {
    const threshold = 0.05;

    for (const [pattern, weight] of this.positivePatterns) {
      if (weight < threshold) {
        this.positivePatterns.delete(pattern);
      }
    }

    for (const [pattern, weight] of this.negativePatterns) {
      if (weight < threshold) {
        this.negativePatterns.delete(pattern);
      }
    }
  }

  /**
   * Calculate confidence from rule results
   */
  private calculateConfidence(passed: number, failed: number): number {
    const total = passed + failed;
    if (total === 0) return 0.5;

    // Higher confidence when rules agree
    const agreement = Math.max(passed, failed) / total;
    return agreement;
  }

  /**
   * Get learned patterns
   */
  getPatterns(): {
    positive: Array<{ pattern: string; weight: number }>;
    negative: Array<{ pattern: string; weight: number }>;
  } {
    return {
      positive: Array.from(this.positivePatterns.entries())
        .map(([pattern, weight]) => ({ pattern, weight }))
        .sort((a, b) => b.weight - a.weight),
      negative: Array.from(this.negativePatterns.entries())
        .map(([pattern, weight]) => ({ pattern, weight }))
        .sort((a, b) => b.weight - a.weight),
    };
  }

  /**
   * Deserialize from pollen grain
   */
  static deserialize(grain: PollenGrain): ValidatorTile {
    const configData = grain.config ?? {};
    const config: ValidatorTileConfig = {
      id: grain.tileId,
      name: grain.tileName,
      category: grain.category,
      threshold: (configData['threshold'] as number) ?? 0.7,
      strictMode: (configData['strictMode'] as boolean) ?? false,
      initialWeights: grain.weights,
    };

    const tile = new ValidatorTile(config);

    // Restore patterns
    const positive = (configData['positivePatterns'] as Record<string, number>) ?? {};
    const negative = (configData['negativePatterns'] as Record<string, number>) ?? {};

    for (const [pattern, weight] of Object.entries(positive)) {
      tile.positivePatterns.set(pattern, weight);
    }
    for (const [pattern, weight] of Object.entries(negative)) {
      tile.negativePatterns.set(pattern, weight);
    }

    return tile;
  }

  /**
   * Override serialization
   */
  override serialize(): PollenGrain {
    const grain = super.serialize();

    const positivePatterns: Record<string, number> = {};
    const negativePatterns: Record<string, number> = {};

    for (const [pattern, weight] of this.positivePatterns) {
      positivePatterns[pattern] = weight;
    }
    for (const [pattern, weight] of this.negativePatterns) {
      negativePatterns[pattern] = weight;
    }

    grain.config = {
      threshold: this.threshold,
      strictMode: this.strictMode,
      positivePatterns,
      negativePatterns,
    };

    return grain;
  }
}
