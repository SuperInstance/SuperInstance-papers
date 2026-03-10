/**
 * Entity Extractor for Natural Language Spreadsheet Queries
 *
 * Extracts structured entities from natural language input,
 * such as cell references, ranges, values, and operations.
 */

import type { Entity, ResolvedEntity } from './types.js';

/**
 * Extracts entities from natural language text
 */
export class EntityExtractor {
  private valueWords: Map<string, number> = new Map();
  private columnNames: string[] = [];

  constructor() {
    this.initializeValueWords();
    this.initializeColumnNames();
  }

  /**
   * Initialize number word mappings
   */
  private initializeValueWords(): void {
    const numberWords: Record<string, number> = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      thirty: 30,
      forty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90,
      hundred: 100,
      thousand: 1000,
      million: 1000000,
      billion: 1000000000,
    };

    for (const [word, value] of Object.entries(numberWords)) {
      this.valueWords.set(word, value);
    }
  }

  /**
   * Initialize column name mappings
   */
  private initializeColumnNames(): void {
    // Excel column names A-Z
    for (let i = 0; i < 26; i++) {
      this.columnNames.push(String.fromCharCode(65 + i));
    }

    // Excel column names AA-ZZ
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        this.columnNames.push(String.fromCharCode(65 + i) + String.fromCharCode(65 + j));
      }
    }
  }

  /**
   * Extract all entities from text
   */
  extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract in order of specificity
    entities.push(...this.extractCellReferences(text));
    entities.push(...this.extractRanges(text));
    entities.push(...this.extractValues(text));
    entities.push(...this.extractOperations(text));
    entities.push(...this.extractConditions(text));

    // Sort by position
    entities.sort((a, b) => a.position.start - b.position.start);

    return entities;
  }

  /**
   * Extract cell references
   */
  private extractCellReferences(text: string): Entity[] {
    const entities: Entity[] = [];

    // Direct cell references: A1, B5, Z100
    const cellPattern = /\b([A-Z]{1,2})(\d+)\b/gi;
    let match;

    while ((match = cellPattern.exec(text)) !== null) {
      entities.push({
        type: 'cell',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          cellReference: match[1].toUpperCase() + match[2],
        },
        confidence: 0.95,
      });
    }

    // Natural language cell references: "cell A1", "column B row 5"
    const naturalPattern = /(?:cell|column)\s+([A-Z])\s*(?:row\s+)?(\d+)?/gi;
    while ((match = naturalPattern.exec(text)) !== null) {
      const col = match[1].toUpperCase();
      const row = match[2] || '1';
      entities.push({
        type: 'cell',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          cellReference: col + row,
        },
        confidence: 0.85,
      });
    }

    // Positional references: "first column", "second row"
    const positionalPattern = /(?:(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(column|row)|(?:column|row)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))/gi;
    while ((match = positionalPattern.exec(text)) !== null) {
      const positionWord = match[1] || match[3];
      const dimension = match[2] || (match[1] ? 'column' : 'row');
      const position = this.wordToNumber(positionWord);

      let cellRef: string;
      if (dimension.toLowerCase() === 'column') {
        cellRef = this.columnNames[position - 1] + '1';
      } else {
        cellRef = 'A' + position;
      }

      entities.push({
        type: 'cell',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          cellReference: cellRef,
        },
        confidence: 0.75,
      });
    }

    return entities;
  }

  /**
   * Extract ranges
   */
  private extractRanges(text: string): Entity[] {
    const entities: Entity[] = [];

    // Excel range notation: A1:Z100
    const rangePattern = /\b([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\b/gi;
    let match;

    while ((match = rangePattern.exec(text)) !== null) {
      entities.push({
        type: 'range',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          range: {
            start: match[1].toUpperCase(),
            end: match[2].toUpperCase(),
          },
        },
        confidence: 0.95,
      });
    }

    // Entire columns: A:A, B:D
    const columnRangePattern = /\b([A-Z]{1,2}):([A-Z]{1,2})\b/gi;
    while ((match = columnRangePattern.exec(text)) !== null) {
      entities.push({
        type: 'range',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          range: {
            start: match[1].toUpperCase() + '1',
            end: match[2].toUpperCase() + '1048576',
            entireColumn: true,
          },
        },
        confidence: 0.95,
      });
    }

    // Natural language ranges: "A1 to Z100", "from A1 to Z100"
    const naturalRangePattern = /(?:from\s+)?([A-Z]{1,2}\d+)\s+(?:to|through|until|-)\s+([A-Z]{1,2}\d+)/gi;
    while ((match = naturalRangePattern.exec(text)) !== null) {
      entities.push({
        type: 'range',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          range: {
            start: match[1].toUpperCase(),
            end: match[2].toUpperCase(),
          },
        },
        confidence: 0.9,
      });
    }

    // Top N rows: "top 10 rows", "first 5 rows"
    const topRowsPattern = /(?:top|first)\s+(\d+)\s+rows?/gi;
    while ((match = topRowsPattern.exec(text)) !== null) {
      const n = parseInt(match[1], 10);
      entities.push({
        type: 'range',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          range: {
            start: 'A1',
            end: 'XFD' + n,
          },
        },
        confidence: 0.85,
      });
    }

    return entities;
  }

  /**
   * Extract values
   */
  private extractValues(text: string): Entity[] {
    const entities: Entity[] = [];

    // Numbers
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    let match;

    while ((match = numberPattern.exec(text)) !== null) {
      const value = parseFloat(match[0]);
      entities.push({
        type: 'value',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          value: {
            type: 'number',
            raw: match[0],
            parsed: value,
          },
        },
        confidence: 0.95,
      });
    }

    // Percentages
    const percentPattern = /\b\d+(?:\.\d+)?%/g;
    while ((match = percentPattern.exec(text)) !== null) {
      const value = parseFloat(match[0].replace('%', '')) / 100;
      entities.push({
        type: 'value',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          value: {
            type: 'percentage',
            raw: match[0],
            parsed: value,
          },
        },
        confidence: 0.95,
      });
    }

    // Number words
    const wordPattern = new RegExp(`\\b(${Array.from(this.valueWords.keys()).join('|')})\\b`, 'gi');
    while ((match = wordPattern.exec(text)) !== null) {
      const word = match[0].toLowerCase();
      const value = this.valueWords.get(word);
      if (value !== undefined) {
        entities.push({
          type: 'value',
          text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          resolved: {
            value: {
              type: 'number',
              raw: match[0],
              parsed: value,
            },
          },
          confidence: 0.8,
        });
      }
    }

    // Dates
    const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
    while ((match = datePattern.exec(text)) !== null) {
      entities.push({
        type: 'value',
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        resolved: {
          value: {
            type: 'date',
            raw: match[0],
            parsed: new Date(match[0]),
          },
        },
        confidence: 0.85,
      });
    }

    return entities;
  }

  /**
   * Extract operations
   */
  private extractOperations(text: string): Entity[] {
    const entities: Entity[] = [];

    // Excel function names
    const functions = [
      'SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'MEDIAN', 'MODE', 'STDEV', 'VAR',
      'IF', 'AND', 'OR', 'NOT', 'XOR',
      'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'LOOKUP',
      'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'UPPER', 'LOWER', 'PROPER',
      'DATE', 'TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
      'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'INT', 'ABS',
      'SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF', 'AVERAGEIFS',
    ];

    for (const func of functions) {
      const pattern = new RegExp(`\\b${func}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'operation',
          text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          resolved: {
            operation: {
              name: func.toLowerCase(),
              excelName: func,
              parameters: [],
            },
          },
          confidence: 0.9,
        });
      }
    }

    // Natural language operations
    const operationMap: Record<string, string> = {
      'add up': 'SUM',
      'total': 'SUM',
      'sum': 'SUM',
      'average': 'AVERAGE',
      'mean': 'AVERAGE',
      'count': 'COUNT',
      'maximum': 'MAX',
      'largest': 'MAX',
      'minimum': 'MIN',
      'smallest': 'MIN',
      'lookup': 'VLOOKUP',
      'find': 'MATCH',
      'combine': 'CONCATENATE',
    };

    for (const [phrase, excelFunc] of Object.entries(operationMap)) {
      const pattern = new RegExp(`\\b${phrase}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'operation',
          text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          resolved: {
            operation: {
              name: phrase,
              excelName: excelFunc,
              parameters: [],
            },
          },
          confidence: 0.75,
        });
      }
    }

    return entities;
  }

  /**
   * Extract conditions
   */
  private extractConditions(text: string): Entity[] {
    const entities: Entity[] = [];

    // Comparison operators
    const conditions: Array<{ pattern: RegExp; operator: ResolvedEntity['condition']['operator'] }> = [
      { pattern: /greater than or equal to|>=|at least/gi, operator: '>=' },
      { pattern: /less than or equal to|<=|at most/gi, operator: '<=' },
      { pattern: /greater than|>|more than/gi, operator: '>' },
      { pattern: /less than|</gi, operator: '<' },
      { pattern: /equal to|=|is|equals/gi, operator: '=' },
      { pattern: /not equal to|<>|not equal/gi, operator: '<>' },
      { pattern: /contains|includes/gi, operator: 'contains' },
      { pattern: /starts with|begins with/gi, operator: 'starts_with' },
      { pattern: /ends with/gi, operator: 'ends_with' },
    ];

    for (const { pattern, operator } of conditions) {
      let match;

      while ((match = pattern.exec(text)) !== null) {
        // Extract the operand (what comes after)
        const afterMatch = text.slice(match.index + match[0].length).trim().split(/\s+/)[0];
        const operand = afterMatch || '';

        entities.push({
          type: 'condition',
          text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          resolved: {
            condition: {
              operator,
              operand,
            },
          },
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  /**
   * Convert word to number
   */
  private wordToNumber(word: string): number {
    const value = this.valueWords.get(word.toLowerCase());
    return value ?? 0;
  }

  /**
   * Resolve entity ambiguities
   */
  resolveAmbiguities(entities: Entity[]): Entity[] {
    // Remove overlapping entities, keep the most specific
    const resolved: Entity[] = [];
    const toRemove = new Set<number>();

    for (let i = 0; i < entities.length; i++) {
      if (toRemove.has(i)) continue;

      const current = entities[i];

      // Check for overlaps
      for (let j = i + 1; j < entities.length; j++) {
        if (toRemove.has(j)) continue;

        const next = entities[j];

        // Check if entities overlap
        if (
          current.position.start <= next.position.end &&
          current.position.end >= next.position.start
        ) {
          // Keep the one with higher confidence
          if (next.confidence > current.confidence) {
            toRemove.add(i);
          } else {
            toRemove.add(j);
          }
        }
      }

      if (!toRemove.has(i)) {
        resolved.push(current);
      }
    }

    return resolved;
  }

  /**
   * Get entity by type
   */
  getEntitiesByType(entities: Entity[], type: Entity['type']): Entity[] {
    return entities.filter(e => e.type === type);
  }

  /**
   * Get entity by position
   */
  getEntityAtPosition(entities: Entity[], position: number): Entity | undefined {
    return entities.find(
      e => position >= e.position.start && position <= e.position.end
    );
  }
}
