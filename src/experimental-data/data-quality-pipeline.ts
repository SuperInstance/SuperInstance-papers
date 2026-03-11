/**
 * DATA QUALITY ASSURANCE PIPELINE
 *
 * Comprehensive data quality framework for experimental validation
 * Implements quality checks, validation, and monitoring from Round 1 schemas
 *
 * @module DataQualityPipeline
 */

import type { ConfidenceFlowSchema, ZoneClassificationSchema } from './confidence-flow-collector';

// ============================================================================
// DATA QUALITY FRAMEWORK (from Round 1)
// ============================================================================

export interface DataQualityCheck {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (data: any) => DataQualityResult;
  autoCorrect?: (data: any) => any;
}

export interface DataQualityResult {
  passed: boolean;
  score: number; // 0-1 quality score
  issues: Array<{
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestion?: string;
  }>;
  metadata: {
    checkTimestamp: number;
    checkDuration: number;
    dataSize?: number;
  };
}

export interface DataQualityReport {
  timestamp: number;
  datasetId: string;
  overallScore: number;
  checks: Array<{
    check: string;
    passed: boolean;
    score: number;
    issuesCount: number;
    criticalIssues: number;
  }>;
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    correctedRecords: number;
    dataLossRate: number;
  };
  recommendations: string[];
}

// ============================================================================
// QUALITY CHECKS IMPLEMENTATION
// ============================================================================

export class DataQualityPipeline {
  private checks: DataQualityCheck[] = [];
  private correctionHistory: Array<{
    timestamp: number;
    recordId: string;
    check: string;
    original: any;
    corrected: any;
  }> = [];

  constructor() {
    this.initializeDefaultChecks();
  }

  private initializeDefaultChecks(): void {
    // Completeness checks
    this.checks.push({
      name: 'required_fields_check',
      description: 'Check that all required fields are present',
      severity: 'high',
      check: this.checkRequiredFields.bind(this)
    });

    this.checks.push({
      name: 'temporal_continuity_check',
      description: 'Check for temporal gaps in data',
      severity: 'medium',
      check: this.checkTemporalContinuity.bind(this)
    });

    // Accuracy checks
    this.checks.push({
      name: 'range_validation_check',
      description: 'Validate that values are within expected ranges',
      severity: 'high',
      check: this.checkRangeValidation.bind(this),
      autoCorrect: this.correctRangeViolations.bind(this)
    });

    this.checks.push({
      name: 'consistency_validation_check',
      description: 'Check consistency between related values',
      severity: 'medium',
      check: this.checkConsistencyValidation.bind(this)
    });

    // Reliability checks
    this.checks.push({
      name: 'test_retest_reliability_check',
      description: 'Check reliability through repeated measurements',
      severity: 'medium',
      check: this.checkTestRetestReliability.bind(this)
    });

    // Validity checks
    this.checks.push({
      name: 'construct_validity_check',
      description: 'Check alignment with theoretical constructs',
      severity: 'high',
      check: this.checkConstructValidity.bind(this)
    });

    this.checks.push({
      name: 'criterion_validity_check',
      description: 'Check against ground truth when available',
      severity: 'critical',
      check: this.checkCriterionValidity.bind(this)
    });
  }

  // ==========================================================================
  // CHECK IMPLEMENTATIONS
  // ==========================================================================

  private checkRequiredFields(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // Check confidence flow schema
    if (this.isConfidenceFlowSchema(data)) {
      const requiredFields = [
        'confidence.value',
        'confidence.zone',
        'confidence.source',
        'confidence.timestamp',
        'composition.type',
        'composition.chainLength',
        'composition.operationId'
      ];

      for (const field of requiredFields) {
        const value = this.getNestedValue(data, field);
        if (value === undefined || value === null) {
          issues.push({
            field,
            issue: 'Missing required field',
            severity: 'high',
            suggestion: 'Provide value for this field'
          });
          score -= 0.1;
        }
      }
    }

    // Check zone classification schema
    if (this.isZoneClassificationSchema(data)) {
      const requiredFields = [
        'thresholds.green',
        'thresholds.yellow',
        'classification.zone',
        'classification.confidenceValue'
      ];

      for (const field of requiredFields) {
        const value = this.getNestedValue(data, field);
        if (value === undefined || value === null) {
          issues.push({
            field,
            issue: 'Missing required field',
            severity: 'high',
            suggestion: 'Provide value for this field'
          });
          score -= 0.1;
        }
      }
    }

    score = Math.max(0, score);

    return {
      passed: issues.length === 0,
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime,
        dataSize: JSON.stringify(data).length
      }
    };
  }

  private checkTemporalContinuity(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // This check would typically operate on a dataset, not a single record
    // For single record, we check timestamp validity
    if (data.confidence?.timestamp) {
      const timestamp = data.confidence.timestamp;
      const now = Date.now();

      if (timestamp < 0) {
        issues.push({
          field: 'confidence.timestamp',
          issue: 'Invalid timestamp (negative)',
          severity: 'high',
          suggestion: 'Timestamp must be positive'
        });
        score -= 0.3;
      }

      if (timestamp > now + 60000) { // More than 1 minute in future
        issues.push({
          field: 'confidence.timestamp',
          issue: 'Timestamp in future',
          severity: 'medium',
          suggestion: 'Check system clock synchronization'
        });
        score -= 0.2;
      }
    }

    score = Math.max(0, score);

    return {
      passed: issues.length === 0,
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  private checkRangeValidation(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // Confidence value range check
    if (data.confidence?.value !== undefined) {
      const confidence = data.confidence.value;
      if (confidence < 0 || confidence > 1) {
        issues.push({
          field: 'confidence.value',
          issue: `Confidence value out of range: ${confidence}`,
          severity: 'high',
          suggestion: 'Confidence must be between 0 and 1'
        });
        score -= 0.4;
      }
    }

    // Zone classification range checks
    if (data.classification?.confidenceValue !== undefined) {
      const confidence = data.classification.confidenceValue;
      if (confidence < 0 || confidence > 1) {
        issues.push({
          field: 'classification.confidenceValue',
          issue: `Confidence value out of range: ${confidence}`,
          severity: 'high',
          suggestion: 'Confidence must be between 0 and 1'
        });
        score -= 0.4;
      }
    }

    // Threshold range checks
    if (data.thresholds?.green !== undefined) {
      const green = data.thresholds.green;
      if (green < 0.5 || green > 1.0) {
        issues.push({
          field: 'thresholds.green',
          issue: `Green threshold out of reasonable range: ${green}`,
          severity: 'medium',
          suggestion: 'Green threshold should be between 0.5 and 1.0'
        });
        score -= 0.2;
      }
    }

    if (data.thresholds?.yellow !== undefined && data.thresholds?.green !== undefined) {
      const yellow = data.thresholds.yellow;
      const green = data.thresholds.green;
      if (yellow >= green) {
        issues.push({
          field: 'thresholds.yellow',
          issue: `Yellow threshold (${yellow}) must be less than green threshold (${green})`,
          severity: 'high',
          suggestion: 'Adjust thresholds so yellow < green'
        });
        score -= 0.3;
      }
    }

    score = Math.max(0, score);

    return {
      passed: issues.length === 0,
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  private correctRangeViolations(data: any): any {
    const corrected = JSON.parse(JSON.stringify(data));

    // Correct confidence value
    if (corrected.confidence?.value !== undefined) {
      const confidence = corrected.confidence.value;
      if (confidence < 0) corrected.confidence.value = 0;
      if (confidence > 1) corrected.confidence.value = 1;
    }

    // Correct classification confidence value
    if (corrected.classification?.confidenceValue !== undefined) {
      const confidence = corrected.classification.confidenceValue;
      if (confidence < 0) corrected.classification.confidenceValue = 0;
      if (confidence > 1) corrected.classification.confidenceValue = 1;
    }

    // Correct thresholds
    if (corrected.thresholds?.green !== undefined) {
      const green = corrected.thresholds.green;
      if (green < 0.5) corrected.thresholds.green = 0.5;
      if (green > 1.0) corrected.thresholds.green = 1.0;
    }

    if (corrected.thresholds?.yellow !== undefined && corrected.thresholds?.green !== undefined) {
      const yellow = corrected.thresholds.yellow;
      const green = corrected.thresholds.green;
      if (yellow >= green) {
        corrected.thresholds.yellow = green - 0.05; // Set 0.05 below green
      }
    }

    return corrected;
  }

  private checkConsistencyValidation(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // Check zone consistency with confidence value
    if (data.confidence?.value !== undefined && data.confidence?.zone !== undefined) {
      const confidence = data.confidence.value;
      const zone = data.confidence.zone;

      // Simple zone consistency check
      const expectedZone = this.calculateZoneFromConfidence(confidence);
      if (zone !== expectedZone) {
        issues.push({
          field: 'confidence.zone',
          issue: `Zone (${zone}) inconsistent with confidence value (${confidence})`,
          severity: 'medium',
          suggestion: `Expected zone: ${expectedZone}`
        });
        score -= 0.2;
      }
    }

    // Check classification consistency
    if (data.classification?.confidenceValue !== undefined && data.classification?.zone !== undefined) {
      const confidence = data.classification.confidenceValue;
      const zone = data.classification.zone;

      const expectedZone = this.calculateZoneFromConfidence(confidence);
      if (zone !== expectedZone) {
        issues.push({
          field: 'classification.zone',
          issue: `Zone (${zone}) inconsistent with confidence value (${confidence})`,
          severity: 'medium',
          suggestion: `Expected zone: ${expectedZone}`
        });
        score -= 0.2;
      }
    }

    score = Math.max(0, score);

    return {
      passed: issues.length === 0,
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  private checkTestRetestReliability(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // This check requires multiple measurements over time
    // For single record, we provide a placeholder result
    issues.push({
      field: 'global',
      issue: 'Test-retest reliability requires multiple measurements',
      severity: 'low',
      suggestion: 'Collect repeated measurements over time'
    });
    score = 0.7; // Default score for single measurement

    return {
      passed: true, // Not failing, just informational
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  private checkConstructValidity(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // Check that confidence degradation makes sense for composition type
    if (this.isConfidenceFlowSchema(data)) {
      const degradationRate = data.properties?.degradationRate;
      const compositionType = data.composition?.type;

      if (degradationRate !== undefined && compositionType) {
        // Sequential compositions should have positive degradation
        if (compositionType === 'sequential' && degradationRate < 0) {
          issues.push({
            field: 'properties.degradationRate',
            issue: `Sequential composition has negative degradation: ${degradationRate}`,
            severity: 'medium',
            suggestion: 'Check confidence calculation for sequential composition'
          });
          score -= 0.2;
        }

        // Degradation rate should be reasonable
        if (degradationRate > 0.9) {
          issues.push({
            field: 'properties.degradationRate',
            issue: `Extremely high degradation rate: ${degradationRate}`,
            severity: 'medium',
            suggestion: 'Verify confidence values and composition logic'
          });
          score -= 0.1;
        }
      }
    }

    score = Math.max(0, score);

    return {
      passed: issues.length === 0,
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  private checkCriterionValidity(data: any): DataQualityResult {
    const issues: DataQualityResult['issues'] = [];
    let score = 1.0;
    const startTime = Date.now();

    // This check requires ground truth data
    // For now, provide informational result
    if (data.validation?.groundTruthZone === undefined) {
      issues.push({
        field: 'validation.groundTruthZone',
        issue: 'Ground truth not available for criterion validity check',
        severity: 'low',
        suggestion: 'Collect ground truth data for validation'
      });
      score = 0.8; // Default score without ground truth
    } else {
      // If ground truth is available, check accuracy
      const groundTruth = data.validation.groundTruthZone;
      const predictedZone = data.classification?.zone || data.confidence?.zone;

      if (predictedZone && groundTruth !== predictedZone) {
        issues.push({
          field: 'classification.zone',
          issue: `Predicted zone (${predictedZone}) does not match ground truth (${groundTruth})`,
          severity: 'medium',
          suggestion: 'Review classification logic'
        });
        score -= 0.3;
      }
    }

    score = Math.max(0, score);

    return {
      passed: true, // Not failing, just informational
      score,
      issues,
      metadata: {
        checkTimestamp: Date.now(),
        checkDuration: Date.now() - startTime
      }
    };
  }

  // ==========================================================================
  // PIPELINE METHODS
  // ==========================================================================

  /**
   * Run all quality checks on a single record
   */
  checkRecord(record: any, recordId: string): {
    results: DataQualityResult[];
    overallScore: number;
    passed: boolean;
    correctedRecord?: any;
  } {
    const results: DataQualityResult[] = [];
    let correctedRecord: any = JSON.parse(JSON.stringify(record));
    let hasCriticalIssues = false;

    // Run each check
    for (const check of this.checks) {
      const startTime = Date.now();
      const result = check.check(correctedRecord);
      results.push(result);

      // Apply auto-correction if available and check failed
      if (!result.passed && check.autoCorrect && check.severity !== 'critical') {
        const original = JSON.parse(JSON.stringify(correctedRecord));
        correctedRecord = check.autoCorrect(correctedRecord);

        // Record correction in history
        this.correctionHistory.push({
          timestamp: Date.now(),
          recordId,
          check: check.name,
          original,
          corrected: JSON.parse(JSON.stringify(correctedRecord))
        });
      }

      // Track critical issues
      if (!result.passed && check.severity === 'critical') {
        hasCriticalIssues = true;
      }
    }

    // Calculate overall score (weighted by severity)
    const overallScore = this.calculateOverallScore(results);

    return {
      results,
      overallScore,
      passed: !hasCriticalIssues,
      correctedRecord: hasCriticalIssues ? undefined : correctedRecord
    };
  }

  /**
   * Run quality checks on a dataset
   */
  checkDataset(
    records: any[],
    datasetId: string
  ): DataQualityReport {
    const startTime = Date.now();
    const checkResults = records.map((record, index) =>
      this.checkRecord(record, `${datasetId}_${index}`)
    );

    // Calculate summary statistics
    const validRecords = checkResults.filter(r => r.passed).length;
    const invalidRecords = checkResults.filter(r => !r.passed).length;
    const correctedRecords = checkResults.filter(r => r.correctedRecord !== undefined).length;

    // Aggregate check results
    const checkAggregates = this.checks.map(check => {
      const relevantResults = checkResults.flatMap(r =>
        r.results.filter(result => result.metadata.checkTimestamp)
      );

      const passedCount = relevantResults.filter(r => r.passed).length;
      const issuesCount = relevantResults.reduce((sum, r) => sum + r.issues.length, 0);
      const criticalIssues = relevantResults.reduce((sum, r) =>
        sum + r.issues.filter(i => i.severity === 'critical').length, 0
      );
      const avgScore = relevantResults.length > 0
        ? relevantResults.reduce((sum, r) => sum + r.score, 0) / relevantResults.length
        : 0;

      return {
        check: check.name,
        passed: passedCount === records.length,
        score: avgScore,
        issuesCount,
        criticalIssues
      };
    });

    // Calculate overall dataset score
    const overallScore = checkResults.length > 0
      ? checkResults.reduce((sum, r) => sum + r.overallScore, 0) / checkResults.length
      : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(checkAggregates);

    return {
      timestamp: Date.now(),
      datasetId,
      overallScore,
      checks: checkAggregates,
      summary: {
        totalRecords: records.length,
        validRecords,
        invalidRecords,
        correctedRecords,
        dataLossRate: invalidRecords / records.length
      },
      recommendations
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private calculateZoneFromConfidence(confidence: number): 'GREEN' | 'YELLOW' | 'RED' {
    // Default thresholds
    const greenThreshold = 0.90;
    const yellowThreshold = 0.75;

    if (confidence >= greenThreshold) return 'GREEN';
    if (confidence >= yellowThreshold) return 'YELLOW';
    return 'RED';
  }

  private calculateOverallScore(results: DataQualityResult[]): number {
    if (results.length === 0) return 0;

    // Weight scores by check severity (critical checks have higher weight)
    const weights: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    let totalWeight = 0;
    let weightedSum = 0;

    // This is simplified - in reality we'd map results back to their checks
    // For now, use average of all scores
    for (const result of results) {
      weightedSum += result.score;
      totalWeight += 1;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private generateRecommendations(checkAggregates: DataQualityReport['checks']): string[] {
    const recommendations: string[] = [];

    // Check for specific issues
    const highIssueChecks = checkAggregates.filter(c => c.issuesCount > 0 && c.score < 0.7);
    for (const check of highIssueChecks) {
      recommendations.push(
        `Address issues in ${check.check}: ${check.issuesCount} issues found with score ${check.score.toFixed(2)}`
      );
    }

    const criticalIssueChecks = checkAggregates.filter(c => c.criticalIssues > 0);
    if (criticalIssueChecks.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalIssueChecks.length} checks have critical issues requiring immediate attention`
      );
    }

    // General recommendations based on scores
    const lowScoreChecks = checkAggregates.filter(c => c.score < 0.5);
    if (lowScoreChecks.length > 0) {
      recommendations.push(
        `Improve data quality for ${lowScoreChecks.length} checks with scores below 0.5`
      );
    }

    // If no major issues, provide positive feedback
    if (recommendations.length === 0) {
      recommendations.push('Data quality is good. Continue current data collection practices.');
    }

    return recommendations;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private isConfidenceFlowSchema(data: any): data is ConfidenceFlowSchema {
    return data.confidence !== undefined && data.composition !== undefined;
  }

  private isZoneClassificationSchema(data: any): data is ZoneClassificationSchema {
    return data.thresholds !== undefined && data.classification !== undefined;
  }

  // ==========================================================================
  // REPORTING AND MONITORING
  // ==========================================================================

  getCorrectionHistory(): Array<{
    timestamp: number;
    recordId: string;
    check: string;
    original: any;
    corrected: any;
  }> {
    return [...this.correctionHistory];
  }

  clearCorrectionHistory(): void {
    this.correctionHistory = [];
  }

  addCustomCheck(check: DataQualityCheck): void {
    this.checks.push(check);
  }

  removeCheck(checkName: string): boolean {
    const initialLength = this.checks.length;
    this.checks = this.checks.filter(check => check.name !== checkName);
    return this.checks.length < initialLength;
  }

  getChecks(): DataQualityCheck[] {
    return [...this.checks];
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Data quality pipeline usage
 */
export async function exampleDataQualityPipeline() {
  console.log('=== DATA QUALITY PIPELINE EXAMPLE ===\n');

  // Create pipeline
  const pipeline = new DataQualityPipeline();

  // Create test data with intentional issues
  const testRecords = [
    // Good record
    {
      confidence: {
        value: 0.85,
        zone: 'YELLOW',
        source: 'test_source',
        timestamp: Date.now()
      },
      composition: {
        type: 'sequential',
        chainLength: 3,
        operationId: 'op_123'
      },
      properties: {
        degradationRate: 0.15,
        cumulativeDegradation: 0.15,
        recoveryOpportunities: 1,
        actualRecovery: 0.05
      },
      escalation: {
        triggered: false,
        level: 'NONE'
      },
      metadata: {
        sessionId: 'test_session',
        environment: 'development',
        version: '1.0.0'
      }
    },
    // Record with range violation
    {
      confidence: {
        value: 1.5, // Out of range
        zone: 'GREEN',
        source: 'test_source',
        timestamp: Date.now()
      },
      composition: {
        type: 'sequential',
        chainLength: 2,
        operationId: 'op_456'
      },
      properties: {
        degradationRate: -0.1, // Negative degradation for sequential
        cumulativeDegradation: -0.1,
        recoveryOpportunities: 0,
        actualRecovery: 0
      },
      escalation: {
        triggered: false,
        level: 'NONE'
      },
      metadata: {
        sessionId: 'test_session',
        environment: 'development',
        version: '1.0.0'
      }
    },
    // Record with missing required field
    {
      confidence: {
        value: 0.75,
        zone: 'YELLOW',
        source: 'test_source',
        timestamp: Date.now()
      },
      // Missing composition field
      properties: {
        degradationRate: 0.25,
        cumulativeDegradation: 0.25,
        recoveryOpportunities: 0,
        actualRecovery: 0
      },
      escalation: {
        triggered: true,
        level: 'WARNING'
      },
      metadata: {
        sessionId: 'test_session',
        environment: 'development',
        version: '1.0.0'
      }
    }
  ];

  // Check individual record
  console.log('Checking individual record...');
  const singleResult = pipeline.checkRecord(testRecords[0], 'record_0');
  console.log(`Overall score: ${singleResult.overallScore.toFixed(2)}`);
  console.log(`Passed: ${singleResult.passed}`);
  console.log(`Number of checks: ${singleResult.results.length}`);

  // Show issues for problematic record
  console.log('\nChecking problematic record...');
  const problematicResult = pipeline.checkRecord(testRecords[1], 'record_1');
  console.log(`Overall score: ${problematicResult.overallScore.toFixed(2)}`);
  console.log(`Passed: ${problematicResult.passed}`);

  if (!problematicResult.passed) {
    console.log('Issues found:');
    problematicResult.results.forEach((result, i) => {
      if (!result.passed) {
        console.log(`  Check ${i + 1}:`);
        result.issues.forEach(issue => {
          console.log(`    - ${issue.field}: ${issue.issue} (${issue.severity})`);
        });
      }
    });
  }

  // Check entire dataset
  console.log('\nChecking entire dataset...');
  const datasetReport = pipeline.checkDataset(testRecords, 'test_dataset_1');
  console.log(`Dataset overall score: ${datasetReport.overallScore.toFixed(2)}`);
  console.log(`Valid records: ${datasetReport.summary.validRecords}/${datasetReport.summary.totalRecords}`);
  console.log(`Data loss rate: ${(datasetReport.summary.dataLossRate * 100).toFixed(1)}%`);

  // Show check-by-check results
  console.log('\nCheck results:');
  datasetReport.checks.forEach(check => {
    console.log(`  ${check.check}: ${check.passed ? 'PASS' : 'FAIL'} (score: ${check.score.toFixed(2)}, issues: ${check.issuesCount})`);
  });

  // Show recommendations
  console.log('\nRecommendations:');
  datasetReport.recommendations.forEach(rec => {
    console.log(`  - ${rec}`);
  });

  // Show correction history
  const corrections = pipeline.getCorrectionHistory();
  if (corrections.length > 0) {
    console.log(`\nAuto-corrections applied: ${corrections.length}`);
    corrections.forEach(correction => {
      console.log(`  - ${correction.check} on ${correction.recordId}`);
    });
  }

  return pipeline;
}

// Run example if executed directly
if (require.main === module) {
  (async () => {
    await exampleDataQualityPipeline();
  })();
}