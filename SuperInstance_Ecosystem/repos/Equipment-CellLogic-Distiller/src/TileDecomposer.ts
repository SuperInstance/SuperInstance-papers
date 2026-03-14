/**
 * TileDecomposer - Decomposes LLM logic into named tiles
 * 
 * This module analyzes LLM prompts and responses, extracting logical components
 * and breaking them down into discrete, named tiles with full metadata.
 */

import type {
  LogicTile,
  DataOrigin,
  DecisionLogic,
  TransformationInfo,
  NamedInterface,
  LogicCondition,
  LogicOperator,
  DecompositionResult,
  DecompositionStatistics,
  DistillationInput,
  DistillationOptions,
} from './types';

/**
 * Pattern matchers for logic extraction
 */
interface LogicPattern {
  type: DecisionLogic['type'];
  patterns: RegExp[];
  extractFn: (match: RegExpMatchArray, text: string) => Partial<LogicTile>;
}

/**
 * TileDecomposer class
 * Extracts and decomposes logic from LLM inputs into structured tiles
 */
export class TileDecomposer {
  private readonly minConfidence: number;
  private readonly maxTiles: number;
  private readonly generateFormalRules: boolean;
  private readonly tileCounter: number = 0;
  
  // Patterns for extracting logic from text
  private readonly logicPatterns: LogicPattern[] = [
    {
      type: 'conditional',
      patterns: [
        /if\s+(.+?)\s*,?\s*then\s+(.+?)(?:\.|;|$)/gi,
        /when\s+(.+?)\s*,?\s*(.+?)(?:\.|;|$)/gi,
        /provided\s+(.+?)\s*,?\s*(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'conditional' as const,
          conditions: this.parseConditions(match[1]),
          rule: `IF ${match[1]} THEN ${match[2]}`,
          extractionConfidence: 0.85,
        },
      }),
    },
    {
      type: 'selection',
      patterns: [
        /choose\s+(.+?)\s+from\s+(.+?)(?:\.|;|$)/gi,
        /select\s+(.+?)\s+where\s+(.+?)(?:\.|;|$)/gi,
        /pick\s+(.+?)\s+based\s+on\s+(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'selection' as const,
          conditions: this.parseConditions(match[2]),
          rule: `SELECT ${match[1]} WHERE ${match[2]}`,
          extractionConfidence: 0.80,
        },
      }),
    },
    {
      type: 'filtering',
      patterns: [
        /filter\s+(.+?)\s+by\s+(.+?)(?:\.|;|$)/gi,
        /exclude\s+(.+?)\s+where\s+(.+?)(?:\.|;|$)/gi,
        /only\s+include\s+(.+?)\s+if\s+(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'filtering' as const,
          conditions: this.parseConditions(match[2]),
          rule: `FILTER ${match[1]} BY ${match[2]}`,
          extractionConfidence: 0.82,
        },
      }),
    },
    {
      type: 'ranking',
      patterns: [
        /rank\s+(.+?)\s+by\s+(.+?)(?:\.|;|$)/gi,
        /sort\s+(.+?)\s+(?:in\s+)?(?:ascending|descending)?\s*order\s+by\s+(.+?)(?:\.|;|$)/gi,
        /prioritize\s+(.+?)\s+based\s+on\s+(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'ranking' as const,
          conditions: this.parseConditions(match[2]),
          rule: `RANK ${match[1]} BY ${match[2]}`,
          extractionConfidence: 0.78,
        },
      }),
    },
    {
      type: 'aggregation',
      patterns: [
        /(?:calculate|compute)\s+(?:the\s+)?(.+?)\s+of\s+(.+?)(?:\.|;|$)/gi,
        /sum(?:marize)?\s+(.+?)(?:\.|;|$)/gi,
        /aggregate\s+(.+?)\s+by\s+(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'aggregation' as const,
          conditions: [],
          rule: `AGGREGATE ${match[1]}`,
          extractionConfidence: 0.85,
        },
      }),
    },
    {
      type: 'verification',
      patterns: [
        /verify\s+(?:that\s+)?(.+?)(?:\.|;|$)/gi,
        /check\s+(?:if\s+)?(.+?)(?:\.|;|$)/gi,
        /validate\s+(?:that\s+)?(.+?)(?:\.|;|$)/gi,
        /ensure\s+(?:that\s+)?(.+?)(?:\.|;|$)/gi,
      ],
      extractFn: (match) => ({
        decisionLogic: {
          type: 'verification' as const,
          conditions: this.parseConditions(match[1]),
          rule: `VERIFY ${match[1]}`,
          extractionConfidence: 0.88,
        },
      }),
    },
  ];

  constructor(options: DistillationOptions = {}) {
    this.minConfidence = options.minConfidence ?? 0.5;
    this.maxTiles = options.maxTiles ?? 100;
    this.generateFormalRules = options.generateFormalRules ?? true;
  }

  /**
   * Decompose LLM input into logic tiles
   */
  decompose(input: DistillationInput): DecompositionResult {
    const startTime = Date.now();
    const tiles: LogicTile[] = [];
    const warnings: string[] = [];
    
    // Combine prompt and response for analysis
    const fullText = `${input.prompt}\n\n${input.response}`;
    
    // Extract tiles from the combined text
    const extractedTiles = this.extractTiles(fullText, input);
    
    // Post-process tiles
    for (const tile of extractedTiles) {
      if (tile.confidence >= this.minConfidence && tiles.length < this.maxTiles) {
        tiles.push(tile);
      } else if (tiles.length >= this.maxTiles) {
        warnings.push(`Maximum tile limit (${this.maxTiles}) reached, some tiles were omitted`);
        break;
      }
    }
    
    // Resolve dependencies between tiles
    this.resolveDependencies(tiles);
    
    // Generate NLP descriptions
    for (const tile of tiles) {
      tile.nlpDescription = this.generateNlpDescription(tile);
    }
    
    const endTime = Date.now();
    const statistics = this.calculateStatistics(tiles, fullText.length, endTime - startTime);
    
    return {
      tiles,
      spreadsheet: this.createSpreadsheetStructure(tiles),
      statistics,
      warnings,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract tiles from text
   */
  private extractTiles(text: string, input: DistillationInput): LogicTile[] {
    const tiles: LogicTile[] = [];
    let tileId = 0;
    
    // Process each pattern type
    for (const pattern of this.logicPatterns) {
      for (const regex of pattern.patterns) {
        let match: RegExpMatchArray | null;
        const re = new RegExp(regex.source, regex.flags);
        
        while ((match = re.exec(text)) !== null && tiles.length < this.maxTiles) {
          const extracted = pattern.extractFn(match, text);
          
          if (extracted.decisionLogic) {
            const tile = this.createTile(
              tileId++,
              match[0],
              match.index ?? 0,
              (match.index ?? 0) + match[0].length,
              extracted.decisionLogic,
              input
            );
            tiles.push(tile);
          }
        }
      }
    }
    
    // Extract additional logical segments using heuristics
    const additionalTiles = this.extractAdditionalLogic(text, input, tileId);
    tiles.push(...additionalTiles);
    
    return tiles;
  }

  /**
   * Extract additional logical patterns
   */
  private extractAdditionalLogic(
    text: string,
    input: DistillationInput,
    startId: number
  ): LogicTile[] {
    const tiles: LogicTile[] = [];
    let tileId = startId;
    
    // Extract numbered steps
    const stepPattern = /(?:^|\n)\s*(\d+)\.\s+(.+?)(?=(?:\n\s*\d+\.)|$)/g;
    let match: RegExpMatchArray | null;
    
    while ((match = stepPattern.exec(text)) !== null && tiles.length < this.maxTiles - startId) {
      const stepText = match[2].trim();
      const tile = this.createTile(
        tileId++,
        stepText,
        match.index ?? 0,
        (match.index ?? 0) + match[0].length,
        {
          type: 'generation',
          conditions: [],
          rule: `STEP ${match[1]}: ${stepText}`,
          extractionConfidence: 0.75,
        },
        input
      );
      tiles.push(tile);
    }
    
    // Extract bullet points with logic
    const bulletPattern = /(?:^|\n)\s*[-•]\s+(.+?)(?=(?:\n\s*[-•])|$)/g;
    
    while ((match = bulletPattern.exec(text)) !== null && tiles.length < this.maxTiles - startId) {
      const bulletText = match[1].trim();
      
      // Only add if it contains logical keywords
      if (/\b(if|then|when|where|must|should|can|will)\b/i.test(bulletText)) {
        const tile = this.createTile(
          tileId++,
          bulletText,
          match.index ?? 0,
          (match.index ?? 0) + match[0].length,
          {
            type: 'conditional',
            conditions: this.parseConditions(bulletText),
            rule: bulletText,
            extractionConfidence: 0.70,
          },
          input
        );
        tiles.push(tile);
      }
    }
    
    return tiles;
  }

  /**
   * Create a logic tile from extracted data
   */
  private createTile(
    id: number,
    sourceSegment: string,
    startPos: number,
    endPos: number,
    decisionLogic: DecisionLogic,
    input: DistillationInput
  ): LogicTile {
    const tileName = this.generateTileName(id, decisionLogic);
    const tileId = `tile_${id}_${this.sanitizeName(tileName)}`;
    
    return {
      id: tileId,
      name: tileName,
      dataOrigin: {
        type: this.determineOriginType(sourceSegment, input),
        sourceId: input.sourceId ?? 'unknown',
        timestamp: Date.now(),
        originalValue: sourceSegment,
        description: `Extracted from ${input.sourceId ?? 'LLM output'}`,
      },
      decisionLogic,
      transformation: this.inferTransformation(sourceSegment, decisionLogic),
      confidence: decisionLogic.extractionConfidence,
      namedInterface: this.createNamedInterface(tileName, decisionLogic),
      nlpDescription: '', // Will be filled in later
      sourceSegment,
      sourcePosition: { start: startPos, end: endPos },
      dependencies: [],
      outputType: { type: 'primitive', name: 'unknown' },
      inputType: { type: 'primitive', name: 'unknown' },
    };
  }

  /**
   * Parse conditions from a text segment
   */
  private parseConditions(text: string): LogicCondition[] {
    const conditions: LogicCondition[] = [];
    
    // Pattern for comparison conditions
    const comparisonPattern = /(\w+)\s*(==|!=|<=|>=|<|>|contains|starts\s+with|ends\s+with|matches|in)\s*(\w+|"[^"]*"|'[^']*')/gi;
    let match: RegExpMatchArray | null;
    
    while ((match = comparisonPattern.exec(text)) !== null) {
      const operator = this.normalizeOperator(match[2]);
      
      conditions.push({
        id: `cond_${conditions.length}`,
        left: match[1],
        operator,
        right: match[3].replace(/^["']|["']$/g, ''),
        negated: false,
        description: `${match[1]} ${operator} ${match[3]}`,
      });
    }
    
    // Pattern for existence conditions
    const existsPattern = /(\w+)\s+(exists|is\s+present|is\s+defined)/gi;
    
    while ((match = existsPattern.exec(text)) !== null) {
      conditions.push({
        id: `cond_${conditions.length}`,
        left: match[1],
        operator: 'exists',
        right: '',
        negated: false,
        description: `${match[1]} exists`,
      });
    }
    
    return conditions;
  }

  /**
   * Normalize operator string
   */
  private normalizeOperator(op: string): LogicOperator {
    const operatorMap: Record<string, LogicOperator> = {
      '==': '==',
      '!=': '!=',
      '<=': '<=',
      '>=': '>=',
      '<': '<',
      '>': '>',
      'contains': 'contains',
      'starts with': 'startsWith',
      'ends with': 'endsWith',
      'matches': 'matches',
      'in': 'in',
    };
    
    return operatorMap[op.toLowerCase()] ?? '==';
  }

  /**
   * Generate a name for a tile
   */
  private generateTileName(id: number, logic: DecisionLogic): string {
    const typeNames: Record<DecisionLogic['type'], string> = {
      conditional: 'Condition',
      selection: 'Selection',
      ranking: 'Ranking',
      filtering: 'Filter',
      aggregation: 'Aggregate',
      generation: 'Generator',
      verification: 'Verify',
    };
    
    const baseName = typeNames[logic.type] ?? 'Logic';
    const firstCondition = logic.conditions[0];
    
    if (firstCondition) {
      return `${baseName}_${firstCondition.left}`;
    }
    
    return `${baseName}_${id}`;
  }

  /**
   * Sanitize name for use in identifiers
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Determine origin type for a segment
   */
  private determineOriginType(
    segment: string,
    input: DistillationInput
  ): DataOrigin['type'] {
    if (input.prompt.includes(segment)) {
      return 'prompt';
    }
    if (input.response.includes(segment)) {
      return 'response';
    }
    return 'derived';
  }

  /**
   * Infer transformation from segment and logic
   */
  private inferTransformation(
    segment: string,
    logic: DecisionLogic
  ): TransformationInfo {
    const typeMap: Record<DecisionLogic['type'], TransformationInfo['type']> = {
      conditional: 'transform',
      selection: 'filter',
      ranking: 'transform',
      filtering: 'filter',
      aggregation: 'reduce',
      generation: 'map',
      verification: 'transform',
    };
    
    return {
      type: typeMap[logic.type] ?? 'transform',
      description: `Applies ${logic.type} logic`,
      signature: `(input: any) => any`,
    };
  }

  /**
   * Create a named interface for a tile
   */
  private createNamedInterface(
    name: string,
    logic: DecisionLogic
  ): NamedInterface {
    const parameters = logic.conditions.map((cond, i) => ({
      name: cond.left,
      type: 'any',
      optional: false,
      description: cond.description,
    }));
    
    return {
      name: this.sanitizeName(name),
      parameters,
      returnType: 'any',
      example: `${this.sanitizeName(name)}(${parameters.map(p => p.name).join(', ')})`,
      documentation: logic.rule,
    };
  }

  /**
   * Resolve dependencies between tiles
   */
  private resolveDependencies(tiles: LogicTile[]): void {
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles.length; j++) {
        if (i !== j) {
          // Check if tile i references content from tile j
          const tileI = tiles[i];
          const tileJ = tiles[j];
          
          if (tileI.sourceSegment.includes(tileJ.name) ||
              tileI.decisionLogic.conditions.some(c => 
                tileJ.sourceSegment.includes(c.left)
              )) {
            tileI.dependencies.push(tileJ.id);
          }
        }
      }
    }
  }

  /**
   * Generate NLP description for a tile
   */
  private generateNlpDescription(tile: LogicTile): string {
    const parts: string[] = [];
    
    parts.push(`This tile represents a ${tile.decisionLogic.type} operation.`);
    parts.push(`The rule is: "${tile.decisionLogic.rule}".`);
    
    if (tile.decisionLogic.conditions.length > 0) {
      parts.push(`It evaluates ${tile.decisionLogic.conditions.length} condition(s):`);
      for (const cond of tile.decisionLogic.conditions) {
        parts.push(`  - ${cond.description}`);
      }
    }
    
    parts.push(`The transformation type is ${tile.transformation.type}.`);
    
    if (tile.dependencies.length > 0) {
      parts.push(`This tile depends on ${tile.dependencies.length} other tile(s).`);
    }
    
    parts.push(`Confidence: ${(tile.confidence * 100).toFixed(1)}%.`);
    
    return parts.join(' ');
  }

  /**
   * Create a basic spreadsheet structure from tiles
   */
  private createSpreadsheetStructure(tiles: LogicTile[]): any {
    return {
      id: `spreadsheet_${Date.now()}`,
      name: 'Logic Distillation',
      cells: new Map(),
      dimensions: [tiles.length + 1, 6] as [number, number],
      originTileId: tiles[0]?.id ?? '',
      columnHeaders: ['Name', 'Type', 'Rule', 'Conditions', 'Confidence', 'Dependencies'],
      rowHeaders: tiles.map(t => t.name),
      namedRanges: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata: {
        tileCount: tiles.length,
        averageConfidence: tiles.reduce((sum, t) => sum + t.confidence, 0) / Math.max(tiles.length, 1),
        processingTimeMs: 0,
        distillerVersion: '1.0.0',
      },
    };
  }

  /**
   * Calculate decomposition statistics
   */
  private calculateStatistics(
    tiles: LogicTile[],
    totalChars: number,
    processingTimeMs: number
  ): DecompositionStatistics {
    return {
      totalCharacters: totalChars,
      segmentCount: tiles.length,
      conditionCount: tiles.reduce((sum, t) => sum + t.decisionLogic.conditions.length, 0),
      transformationCount: tiles.length,
      averageConfidence: tiles.reduce((sum, t) => sum + t.confidence, 0) / Math.max(tiles.length, 1),
      processingTimeMs,
      memoryUsedBytes: 0, // Would need actual memory measurement
    };
  }

  /**
   * Reverse-engineer a tile to explain its logic
   */
  reverseEngineer(tile: LogicTile): string {
    const lines: string[] = [];
    
    lines.push(`## Tile Analysis: ${tile.name}`);
    lines.push('');
    lines.push(`**Type:** ${tile.decisionLogic.type}`);
    lines.push(`**Confidence:** ${(tile.confidence * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('### Rule');
    lines.push(tile.decisionLogic.rule);
    lines.push('');
    
    if (tile.decisionLogic.formalRule) {
      lines.push('### Formal Representation');
      lines.push('```');
      lines.push(tile.decisionLogic.formalRule);
      lines.push('```');
      lines.push('');
    }
    
    if (tile.decisionLogic.conditions.length > 0) {
      lines.push('### Conditions');
      for (const cond of tile.decisionLogic.conditions) {
        lines.push(`- **${cond.left}** ${cond.operator} **${cond.right}**`);
      }
      lines.push('');
    }
    
    lines.push('### Transformation');
    lines.push(`- **Type:** ${tile.transformation.type}`);
    lines.push(`- **Description:** ${tile.transformation.description}`);
    lines.push('');
    
    lines.push('### Interface');
    lines.push(`\`\`\`typescript`);
    lines.push(`${tile.namedInterface.name}(${tile.namedInterface.parameters.map(p => p.name).join(', ')}): ${tile.namedInterface.returnType}`);
    lines.push(`\`\`\``);
    lines.push('');
    
    if (tile.dependencies.length > 0) {
      lines.push('### Dependencies');
      lines.push(tile.dependencies.join(', '));
      lines.push('');
    }
    
    lines.push('### NLP Description');
    lines.push(tile.nlpDescription);
    
    return lines.join('\n');
  }
}

export default TileDecomposer;
