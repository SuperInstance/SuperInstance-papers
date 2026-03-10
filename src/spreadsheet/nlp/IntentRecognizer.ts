/**
 * Intent Recognizer for Natural Language Spreadsheet Queries
 *
 * Analyzes natural language input to determine the user's intent,
 * such as creating formulas, analyzing data, or formatting cells.
 */

import type { SpreadsheetIntent, Entity } from './types.js';

/**
 * Pattern-based intent recognition
 */
export class IntentRecognizer {
  private patterns: Map<SpreadsheetIntent['type'], RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize intent recognition patterns
   */
  private initializePatterns(): void {
    // Formula creation patterns
    this.patterns.set('create_formula', [
      /calculate|compute|determine|find|get|show me/i,
      /formula|equation|function/i,
      /what is|how much|how many/i,
      /add|subtract|multiply|divide/i,
      /sum|total|average|mean|count/i,
    ]);

    // Analysis patterns
    this.patterns.set('analyze', [
      /analyze|analysis|understand|explain|tell me about/i,
      /trend|pattern|insight|correlation/i,
      /compare|comparison|difference/i,
      /relationship|between|versus/i,
      /distribution|spread|range/i,
    ]);

    // Navigation patterns
    this.patterns.set('navigate', [
      /go to|navigate|find|search|look at/i,
      /show|display|reveal|highlight/i,
      /where is|which|what row|what column/i,
      /scroll|move|jump/i,
    ]);

    // Formatting patterns
    this.patterns.set('format', [
      /format|style|make it|change the (look|appearance)/i,
      /bold|italic|underline|font|color/i,
      /currency|percentage|decimal|date format/i,
      /align|alignment|merge|wrap/i,
    ]);

    // Chart creation patterns
    this.patterns.set('chart', [
      /chart|graph|plot|visualize|display/i,
      /bar|line|pie|scatter|area/i,
      /graph|histogram|box plot|bubble/i,
      /visual representation|show.*visually/i,
    ]);

    // Filter patterns
    this.patterns.set('filter', [
      /filter|show only|only show|exclude|hide/i,
      /where|that (is|are)|matches|contains/i,
      /greater than|less than|equal to/i,
      /top|bottom|first|last/i,
    ]);

    // Sort patterns
    this.patterns.set('sort', [
      /sort|order|arrange|organize/i,
      /ascending|descending|high to low|low to high/i,
      /alphabetical|chronological/i,
      /largest first|smallest first/i,
    ]);

    // Validation patterns
    this.patterns.set('validate', [
      /validate|check|verify|ensure/i,
      /error|mistake|incorrect|invalid/i,
      /should be|must be|required/i,
      /data quality|clean/i,
    ]);

    // Transform patterns
    this.patterns.set('transform', [
      /convert|transform|change|modify/i,
      /replace|substitute|map/i,
      /extract|parse|split|combine/i,
      /lowercase|uppercase|proper case|title case/i,
    ]);

    // Aggregate patterns
    this.patterns.set('aggregate', [
      /aggregate|summarize|group by/i,
      /subtotal|grand total|overall/i,
      /breakdown|categorize|bucket/i,
      /pivot|cross.*tab/i,
    ]);
  }

  /**
   * Detect intent from natural language input
   */
  detectIntent(text: string, entities?: Entity[]): SpreadsheetIntent {
    const scores = new Map<SpreadsheetIntent['type'], number>();

    // Initialize scores
    for (const type of this.patterns.keys()) {
      scores.set(type, 0);
    }

    // Score based on pattern matches
    for (const [type, patterns] of this.patterns.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * 0.3;
        }
      }
      scores.set(type, score);
    }

    // Adjust scores based on entities
    if (entities) {
      const hasOperations = entities.some(e => e.type === 'operation');
      const hasValues = entities.some(e => e.type === 'value');
      const hasRanges = entities.some(e => e.type === 'range');

      // Formula creation is more likely with operations and values
      if (hasOperations && hasValues) {
        scores.set('create_formula', (scores.get('create_formula') || 0) + 0.5);
      }

      // Analysis is more likely with ranges
      if (hasRanges) {
        scores.set('analyze', (scores.get('analyze') || 0) + 0.3);
      }
    }

    // Find highest scoring intent
    let maxScore = 0;
    let maxType: SpreadsheetIntent['type'] = 'create_formula';

    for (const [type, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type;
      }
    }

    // Normalize confidence to 0-1 range
    const confidence = Math.min(maxScore / 2, 1);

    return {
      type: maxType,
      confidence,
      action: this.extractAction(text, maxType),
    };
  }

  /**
   * Extract specific action from text
   */
  private extractAction(text: string, intentType: SpreadsheetIntent['type']): string {
    const actionPatterns: Record<SpreadsheetIntent['type'], RegExp[]> = {
      create_formula: [
        /calculate (.+)/i,
        /compute (.+)/i,
        /find (.+)/i,
        /show me (.+)/i,
      ],
      analyze: [
        /analyze (.+)/i,
        /explain (.+)/i,
        /tell me about (.+)/i,
      ],
      navigate: [
        /go to (.+)/i,
        /find (.+)/i,
        /show (.+)/i,
      ],
      format: [
        /format (.+) as/i,
        /make (.+) (.+)/i,
        /change (.+) to/i,
      ],
      chart: [
        /create a (.+) chart/i,
        /chart (.+)/i,
        /plot (.+)/i,
      ],
      filter: [
        /filter (.+) by/i,
        /show only (.+)/i,
        /exclude (.+)/i,
      ],
      sort: [
        /sort (.+) by/i,
        /order (.+) by/i,
      ],
      validate: [
        /validate (.+)/i,
        /check (.+) for/i,
      ],
      transform: [
        /convert (.+) to/i,
        /transform (.+) into/i,
        /change (.+) to/i,
      ],
      aggregate: [
        /aggregate (.+) by/i,
        /summarize (.+) by/i,
        /group (.+) by/i,
      ],
    };

    const patterns = actionPatterns[intentType] || [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return text;
  }

  /**
   * Get alternative intent interpretations
   */
  getAlternativeIntents(text: string, entities?: Entity[]): SpreadsheetIntent[] {
    const primaryIntent = this.detectIntent(text, entities);
    const alternatives: SpreadsheetIntent[] = [];

    const scores = new Map<SpreadsheetIntent['type'], number>();

    // Calculate scores for all intents
    for (const [type, patterns] of this.patterns.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * 0.3;
        }
      }
      scores.set(type, score);
    }

    // Get top 3 alternative intents
    const sortedIntents = Array.from(scores.entries())
      .filter(([type]) => type !== primaryIntent.type)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [type, score] of sortedIntents) {
      if (score > 0) {
        alternatives.push({
          type,
          confidence: Math.min(score / 2, 1),
          action: this.extractAction(text, type),
        });
      }
    }

    return alternatives;
  }

  /**
   * Add custom pattern for intent recognition
   */
  addCustomPattern(intentType: SpreadsheetIntent['type'], pattern: RegExp): void {
    const existing = this.patterns.get(intentType) || [];
    existing.push(pattern);
    this.patterns.set(intentType, existing);
  }

  /**
   * Remove a pattern for intent recognition
   */
  removePattern(intentType: SpreadsheetIntent['type'], pattern: RegExp): void {
    const existing = this.patterns.get(intentType);
    if (existing) {
      const filtered = existing.filter(p => p.toString() !== pattern.toString());
      this.patterns.set(intentType, filtered);
    }
  }

  /**
   * Get all patterns for an intent type
   */
  getPatterns(intentType: SpreadsheetIntent['type']): RegExp[] {
    return this.patterns.get(intentType) || [];
  }
}
