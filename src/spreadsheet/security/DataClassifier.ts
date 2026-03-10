/**
 * DataClassifier - PII Detection and Data Classification
 * Defense in depth: Automatic classification, PII detection, compliance support
 */

import {
  DataClassification,
  PIIType,
  DataClassificationResult,
  PatternMatch
} from './types';

/**
 * PII pattern definitions
 */
interface PIIPattern {
  type: PIIType;
  patterns: RegExp[];
  confidence: number;
  description: string;
}

/**
 * Data classifier for automatic sensitivity detection
 */
export class DataClassifier {
  private patterns: PIIPattern[] = [];
  private classificationCache: Map<string, DataClassificationResult> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 50000;

  constructor() {
    this.initializePatterns();
  }

  /**
   * Classify data value
   */
  classify(value: string | number | boolean | null | undefined): DataClassificationResult {
    const strValue = String(value || '');

    // Check cache
    const cacheKey = this.hashString(strValue);
    const cached = this.classificationCache.get(cacheKey);
    if (cached && Date.now() - cached.confidence < this.CACHE_TTL) {
      return cached;
    }

    // Detect PII
    const piiTypes: PIIType[] = [];
    const detectedPatterns: PatternMatch[] = [];
    let maxConfidence = 0;

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const matches = strValue.matchAll(regex);

        for (const match of matches) {
          if (match.index !== undefined) {
            piiTypes.push(pattern.type);
            detectedPatterns.push({
              type: pattern.type,
              matched: match[0],
              position: {
                start: match.index,
                end: match.index + match[0].length
              },
              confidence: pattern.confidence
            });
            maxConfidence = Math.max(maxConfidence, pattern.confidence);
          }
        }
      }
    }

    // Determine classification based on PII detected
    const classification = this.determineClassification(piiTypes, strValue);

    const result: DataClassificationResult = {
      classification,
      piiTypes: [...new Set(piiTypes)], // Remove duplicates
      confidence: maxConfidence,
      detectedPatterns
    };

    // Cache result
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Classify cell value with context
   */
  classifyCellValue(
    value: string | number | boolean | null | undefined,
    columnName?: string,
    rowHeaders?: string[]
  ): DataClassificationResult {
    const baseClassification = this.classify(value);

    // Enhance classification based on column name
    if (columnName) {
      const columnHints = this.getColumnHints(columnName);
      if (columnHints.length > 0) {
        baseClassification.piiTypes.push(...columnHints);
        baseClassification.classification = this.getHigherClassification(
          baseClassification.classification,
          this.classificationFromHints(columnHints)
        );
      }
    }

    // Enhance based on row headers
    if (rowHeaders) {
      for (const header of rowHeaders) {
        const headerHints = this.getColumnHints(header);
        if (headerHints.length > 0) {
          baseClassification.piiTypes.push(...headerHints);
        }
      }
    }

    return baseClassification;
  }

  /**
   * Classify entire row
   */
  classifyRow(
    row: Record<string, string | number | boolean | null | undefined>
  ): Map<string, DataClassificationResult> {
    const results = new Map<string, DataClassificationResult>();

    for (const [columnName, value] of Object.entries(row)) {
      results.set(columnName, this.classifyCellValue(value, columnName));
    }

    return results;
  }

  /**
   * Get classification for a batch of values
   */
  classifyBatch(values: Array<string | number | boolean | null | undefined>): DataClassificationResult[] {
    return values.map(value => this.classify(value));
  }

  /**
   * Check if value contains specific PII type
   */
  containsPII(
    value: string | number | boolean | null | undefined,
    piiType: PIIType
  ): boolean {
    const result = this.classify(value);
    return result.piiTypes.includes(piiType);
  }

  /**
   * Mask PII in value
   */
  maskPII(
    value: string | number | boolean | null | undefined,
    maskChar: string = '*'
  ): string {
    const strValue = String(value || '');
    const result = this.classify(value);

    if (result.detectedPatterns.length === 0) {
      return strValue;
    }

    let masked = strValue;

    // Sort patterns by position (reverse order to avoid index shifting)
    const sortedPatterns = [...result.detectedPatterns].sort(
      (a, b) => b.position.start - a.position.start
    );

    for (const pattern of sortedPatterns) {
      const before = masked.substring(0, pattern.position.start);
      const after = masked.substring(pattern.position.end);
      const maskedPart = maskChar.repeat(pattern.position.end - pattern.position.start);
      masked = before + maskedPart + after;
    }

    return masked;
  }

  /**
   * Get PII statistics for a dataset
   */
  getPIIStatistics(
    data: Array<Record<string, string | number | boolean | null | undefined>>
  ): {
    totalRows: number;
    rowsWithPII: number;
    piiTypeCounts: Record<PIIType, number>;
    classificationDistribution: Record<DataClassification, number>;
  } {
    let rowsWithPII = 0;
    const piiTypeCounts: Record<PIIType, number> = {} as any;
    const classificationDistribution: Record<DataClassification, number> = {} as any;

    for (const row of data) {
      const rowClassifications = this.classifyRow(row);
      let hasPII = false;

      for (const [column, result] of rowClassifications.entries()) {
        if (result.piiTypes.length > 0) {
          hasPII = true;
          for (const piiType of result.piiTypes) {
            piiTypeCounts[piiType] = (piiTypeCounts[piiType] || 0) + 1;
          }
        }

        classificationDistribution[result.classification] =
          (classificationDistribution[result.classification] || 0) + 1;
      }

      if (hasPII) {
        rowsWithPII++;
      }
    }

    return {
      totalRows: data.length,
      rowsWithPII,
      piiTypeCounts,
      classificationDistribution
    };
  }

  /**
   * Generate data classification report
   */
  generateClassificationReport(
    data: Array<Record<string, string | number | boolean | null | undefined>>
  ): {
    summary: {
      totalCells: number;
      classifiedCells: number;
      piiCells: number;
    };
    byClassification: Record<DataClassification, number>;
    byPIIType: Record<PIIType, number>;
    recommendations: string[];
  } {
    let totalCells = 0;
    let classifiedCells = 0;
    let piiCells = 0;
    const byClassification: Record<DataClassification, number> = {} as any;
    const byPIIType: Record<PIIType, number> = {} as any;

    for (const row of data) {
      for (const [column, value] of Object.entries(row)) {
        totalCells++;
        const result = this.classifyCellValue(value, column);

        if (result.classification !== DataClassification.PUBLIC) {
          classifiedCells++;
        }

        if (result.piiTypes.length > 0) {
          piiCells++;
          for (const piiType of result.piiTypes) {
            byPIIType[piiType] = (byPIIType[piiType] || 0) + 1;
          }
        }

        byClassification[result.classification] =
          (byClassification[result.classification] || 0) + 1;
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (piiCells > 0) {
      recommendations.push('Implement encryption for cells containing PII');
      recommendations.push('Restrict access to rows/columns with sensitive data');
      recommendations.push('Enable audit logging for all PII access');
    }

    if (byClassification[DataClassification.CRITICAL] > 0) {
      recommendations.push('Implement additional security controls for critical data');
    }

    return {
      summary: {
        totalCells,
        classifiedCells,
        piiCells
      },
      byClassification,
      byPIIType,
      recommendations
    };
  }

  /**
   * Clear classification cache
   */
  clearCache(): void {
    this.classificationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: this.classificationCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Initialize PII detection patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      // Email
      {
        type: PIIType.EMAIL,
        patterns: [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
        ],
        confidence: 0.95,
        description: 'Email address'
      },

      // SSN
      {
        type: PIIType.SSN,
        patterns: [
          /\b\d{3}-\d{2}-\d{4}\b/g,
          /\b\d{3}\s\d{2}\s\d{4}\b/g,
          /\b\d{9}\b/g
        ],
        confidence: 0.9,
        description: 'Social Security Number'
      },

      // Credit Card
      {
        type: PIIType.CREDIT_CARD,
        patterns: [
          /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
          /\b\d{13,19}\b/g
        ],
        confidence: 0.85,
        description: 'Credit Card Number'
      },

      // Phone
      {
        type: PIIType.PHONE,
        patterns: [
          /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
          /\b\+?1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
        ],
        confidence: 0.8,
        description: 'Phone Number'
      },

      // IP Address
      {
        type: PIIType.IP_ADDRESS,
        patterns: [
          /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
          /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g
        ],
        confidence: 0.9,
        description: 'IP Address'
      },

      // MAC Address
      {
        type: PIIType.MAC_ADDRESS,
        patterns: [
          /\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\b/g
        ],
        confidence: 0.95,
        description: 'MAC Address'
      },

      // Passport (US format)
      {
        type: PIIType.PASSPORT,
        patterns: [
          /\b[A-Za-z]\d{8}\b/g
        ],
        confidence: 0.7,
        description: 'Passport Number'
      },

      // Driver's License (generic format)
      {
        type: PIIType.DRIVERS_LICENSE,
        patterns: [
          /\b[A-Za-z]{1,2}\d{6,8}\b/g
        ],
        confidence: 0.6,
        description: 'Driver\'s License Number'
      },

      // Bank Account
      {
        type: PIIType.BANK_ACCOUNT,
        patterns: [
          /\b\d{8,17}\b/g
        ],
        confidence: 0.5,
        description: 'Bank Account Number'
      }
    ];
  }

  /**
   * Determine classification from detected PII
   */
  private determineClassification(piiTypes: PIIType[], value: string): DataClassification {
    if (piiTypes.length === 0) {
      return DataClassification.PUBLIC;
    }

    // High-risk PII types
    const criticalTypes = [PIIType.SSN, PIIType.CREDIT_CARD, PIIType.BANK_ACCOUNT];
    if (piiTypes.some(t => criticalTypes.includes(t))) {
      return DataClassification.CRITICAL;
    }

    // Medium-risk PII types
    const restrictedTypes = [PIIType.EMAIL, PIIType.PHONE, PIIType.PASSPORT, PIIType.DRIVERS_LICENSE];
    if (piiTypes.some(t => restrictedTypes.includes(t))) {
      return DataClassification.RESTRICTED;
    }

    // Lower-risk PII types
    if (piiTypes.length > 0) {
      return DataClassification.CONFIDENTIAL;
    }

    return DataClassification.INTERNAL;
  }

  /**
   * Get hints from column name
   */
  private getColumnHints(columnName: string): PIIType[] {
    const name = columnName.toLowerCase();
    const hints: PIIType[] = [];

    const columnHints: Record<string, PIIType> = {
      'email': PIIType.EMAIL,
      'mail': PIIType.EMAIL,
      'ssn': PIIType.SSN,
      'social': PIIType.SSN,
      'security': PIIType.SSN,
      'credit': PIIType.CREDIT_CARD,
      'card': PIIType.CREDIT_CARD,
      'phone': PIIType.PHONE,
      'telephone': PIIType.PHONE,
      'mobile': PIIType.PHONE,
      'address': PIIType.ADDRESS,
      'passport': PIIType.PASSPORT,
      'driver': PIIType.DRIVERS_LICENSE,
      'license': PIIType.DRIVERS_LICENSE,
      'account': PIIType.BANK_ACCOUNT,
      'bank': PIIType.BANK_ACCOUNT,
      'ip': PIIType.IP_ADDRESS,
      'mac': PIIType.MAC_ADDRESS
    };

    for (const [hint, piiType] of Object.entries(columnHints)) {
      if (name.includes(hint)) {
        hints.push(piiType);
      }
    }

    return hints;
  }

  /**
   * Get classification from PII hints
   */
  private classificationFromHints(hints: PIIType[]): DataClassification {
    const criticalTypes = [PIIType.SSN, PIIType.CREDIT_CARD, PIIType.BANK_ACCOUNT];
    if (hints.some(t => criticalTypes.includes(t))) {
      return DataClassification.CRITICAL;
    }

    const restrictedTypes = [PIIType.EMAIL, PIIType.PHONE, PIIType.PASSPORT];
    if (hints.some(t => restrictedTypes.includes(t))) {
      return DataClassification.RESTRICTED;
    }

    return DataClassification.CONFIDENTIAL;
  }

  /**
   * Get higher of two classifications
   */
  private getHigherClassification(
    a: DataClassification,
    b: DataClassification
  ): DataClassification {
    const levels = [
      DataClassification.PUBLIC,
      DataClassification.INTERNAL,
      DataClassification.CONFIDENTIAL,
      DataClassification.RESTRICTED,
      DataClassification.CRITICAL
    ];

    return levels[Math.max(levels.indexOf(a), levels.indexOf(b))];
  }

  /**
   * Hash string for cache key
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Add result to cache
   */
  private addToCache(key: string, result: DataClassificationResult): void {
    // Evict oldest if cache is full
    if (this.classificationCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }

    this.classificationCache.set(key, result);
  }
}

/**
 * Singleton instance
 */
export const dataClassifier = new DataClassifier();
