/**
 * CONFIDENCE FLOW DATA COLLECTOR
 *
 * Prototype implementation of data collection for confidence flow schema
 * Integrates with existing confidence-cascade.ts and zone-monitor.ts
 *
 * @module ConfidenceFlowCollector
 */

import type { Confidence, CascadeResult, CascadeStep } from '../../spreadsheet/tiles/confidence-cascade';
import type { ZoneState, ZoneTransition } from '../../spreadsheet/tiles/monitoring/zone-monitor';

// ============================================================================
// DATA SCHEMA IMPLEMENTATIONS (from Round 1)
// ============================================================================

/**
 * Confidence Flow Data Schema
 * Captures the complete flow of confidence through compositions
 */
export interface ConfidenceFlowSchema {
  // Core confidence data
  confidence: {
    value: number;                    // 0.0 to 1.0
    zone: 'GREEN' | 'YELLOW' | 'RED'; // Auto-classified zone
    source: string;                   // What generated this confidence
    timestamp: number;                // Unix timestamp in milliseconds
  };

  // Composition context
  composition: {
    type: 'sequential' | 'parallel' | 'conditional' | 'hybrid';
    chainLength: number;              // Number of tiles in composition
    operationId: string;              // Unique identifier for this operation
    parentOperationId?: string;       // For nested compositions
  };

  // Input confidence sources
  inputs: Array<{
    confidence: number;
    source: string;
    weight?: number;                  // For parallel compositions (0-1, normalized)
    predicate?: boolean;              // For conditional compositions
  }>;

  // Mathematical properties
  properties: {
    degradationRate: number;          // Rate of confidence loss per step
    cumulativeDegradation: number;    // Total degradation from start
    recoveryOpportunities: number;    // Number of checkpoints with recovery
    actualRecovery: number;           // Actual recovery achieved
  };

  // Escalation data
  escalation: {
    triggered: boolean;
    level: 'NONE' | 'NOTICE' | 'WARNING' | 'ALERT' | 'CRITICAL';
    reason?: string;
    actionTaken?: string;
  };

  // Metadata
  metadata: {
    sessionId: string;
    userId?: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
}

/**
 * Zone Classification Data Schema
 * Formalizes the three-zone model with statistical properties
 */
export interface ZoneClassificationSchema {
  // Zone definitions (configurable thresholds)
  thresholds: {
    green: number;    // Default: 0.90
    yellow: number;   // Default: 0.75
    red: number;      // Default: 0.00 (implicit)
  };

  // Classification results
  classification: {
    zone: 'GREEN' | 'YELLOW' | 'RED';
    confidenceValue: number;
    distanceToBoundary: number;      // How far from next zone boundary
    boundaryDirection: 'above' | 'below'; // Direction to next boundary

    // Statistical classification confidence
    classificationConfidence: {
      probability: number;           // Probability this classification is correct
      uncertainty: number;           // Measurement uncertainty
      sampleSize: number;            // Number of observations supporting classification
    };
  };

  // Historical context
  history: {
    previousZone?: 'GREEN' | 'YELLOW' | 'RED';
    zoneTransitions: number;         // Number of zone changes
    timeInCurrentZone: number;       // Milliseconds in current zone
    stabilityScore: number;          // 0-1 stability measure
  };

  // Action recommendations
  actions: {
    recommended: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      rationale: string;
    }>;

    taken: Array<{
      action: string;
      timestamp: number;
      outcome?: 'success' | 'partial' | 'failure';
    }>;
  };

  // Validation metrics
  validation: {
    groundTruthZone?: 'GREEN' | 'YELLOW' | 'RED';  // If available
    classificationAccuracy: number;   // 0-1 accuracy score
    falsePositiveRate: number;       // Type I errors
    falseNegativeRate: number;       // Type II errors
  };
}

// ============================================================================
// DATA COLLECTOR CLASS
// ============================================================================

export interface CollectorConfig {
  // Storage configuration
  storage: {
    type: 'memory' | 'database' | 'file';
    maxEntries?: number;
    compression?: boolean;
  };

  // Collection triggers
  triggers: Array<
    'on_tile_execution' |
    'on_confidence_calculation' |
    'on_zone_transition' |
    'on_escalation_trigger' |
    'on_composition_complete'
  >;

  // Sampling strategy
  sampling: {
    rate: 'full' | 'percentage' | 'adaptive';
    percentage?: number;            // For percentage sampling
    adaptiveThreshold?: number;     // For adaptive sampling
  };

  // Quality assurance
  qualityAssurance: {
    validationEnabled: boolean;
    rangeChecks: boolean;
    consistencyChecks: boolean;
    dataLossDetection: boolean;
    maxDataLossPercentage: number;  // Default: 1%
  };

  // Metadata
  metadata: {
    sessionId: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
}

export class ConfidenceFlowCollector {
  private config: CollectorConfig;
  private confidenceFlowData: ConfidenceFlowSchema[] = [];
  private zoneClassificationData: ZoneClassificationSchema[] = [];
  private dataLossCounter = 0;
  private totalDataPoints = 0;
  private sessionStartTime: number;

  constructor(config?: Partial<CollectorConfig>) {
    this.config = {
      storage: {
        type: 'memory',
        maxEntries: 10000,
        compression: false,
        ...config?.storage
      },
      triggers: config?.triggers || [
        'on_tile_execution',
        'on_confidence_calculation',
        'on_zone_transition',
        'on_escalation_trigger',
        'on_composition_complete'
      ],
      sampling: {
        rate: 'full',
        percentage: 100,
        adaptiveThreshold: 0.1,
        ...config?.sampling
      },
      qualityAssurance: {
        validationEnabled: true,
        rangeChecks: true,
        consistencyChecks: true,
        dataLossDetection: true,
        maxDataLossPercentage: 1.0,
        ...config?.qualityAssurance
      },
      metadata: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        environment: 'development',
        version: '1.0.0',
        ...config?.metadata
      }
    };

    this.sessionStartTime = Date.now();
  }

  // ==========================================================================
  // CONFIDENCE FLOW DATA COLLECTION
  // ==========================================================================

  /**
   * Record confidence flow from cascade result
   */
  recordConfidenceFlow(
    cascadeResult: CascadeResult,
    compositionType: ConfidenceFlowSchema['composition']['type'],
    operationId: string,
    parentOperationId?: string
  ): ConfidenceFlowSchema | null {
    // Check if we should collect based on sampling strategy
    if (!this.shouldCollectData()) {
      this.dataLossCounter++;
      return null;
    }

    this.totalDataPoints++;

    // Calculate mathematical properties
    const steps = cascadeResult.steps;
    const degradationRate = this.calculateDegradationRate(steps);
    const cumulativeDegradation = this.calculateCumulativeDegradation(steps);
    const recoveryMetrics = this.calculateRecoveryMetrics(steps);

    // Build confidence flow schema
    const confidenceFlow: ConfidenceFlowSchema = {
      confidence: {
        value: cascadeResult.confidence.value,
        zone: cascadeResult.confidence.zone,
        source: cascadeResult.confidence.source,
        timestamp: cascadeResult.confidence.timestamp
      },
      composition: {
        type: compositionType,
        chainLength: steps.length,
        operationId,
        parentOperationId
      },
      inputs: steps.flatMap(step =>
        step.inputs.map(input => ({
          confidence: input.value,
          source: input.source,
          weight: step.operation === 'parallel' ?
            (step.metadata as any)?.weights?.find((w: any) => w.source === input.source)?.weight : undefined,
          predicate: step.operation === 'conditional' ?
            (step.metadata as any)?.allPaths?.find((p: any) => p.description === input.source)?.active : undefined
        }))
      ),
      properties: {
        degradationRate,
        cumulativeDegradation,
        recoveryOpportunities: recoveryMetrics.opportunities,
        actualRecovery: recoveryMetrics.actualRecovery
      },
      escalation: {
        triggered: cascadeResult.escalationTriggered,
        level: cascadeResult.escalationLevel,
        reason: cascadeResult.escalationTriggered ?
          `Confidence dropped to ${cascadeResult.confidence.zone} zone` : undefined
      },
      metadata: {
        sessionId: this.config.metadata.sessionId,
        environment: this.config.metadata.environment,
        version: this.config.metadata.version
      }
    };

    // Validate data quality
    if (this.config.qualityAssurance.validationEnabled) {
      const validationResult = this.validateConfidenceFlow(confidenceFlow);
      if (!validationResult.valid) {
        console.warn('Confidence flow validation failed:', validationResult.errors);
        if (this.config.qualityAssurance.consistencyChecks) {
          return null;
        }
      }
    }

    // Store data
    this.confidenceFlowData.push(confidenceFlow);

    // Maintain storage limits
    if (this.config.storage.maxEntries &&
        this.confidenceFlowData.length > this.config.storage.maxEntries) {
      this.confidenceFlowData.shift();
    }

    return confidenceFlow;
  }

  /**
   * Record zone classification from zone state and transition
   */
  recordZoneClassification(
    zoneState: ZoneState,
    zoneTransition?: ZoneTransition,
    thresholds?: { green: number; yellow: number }
  ): ZoneClassificationSchema | null {
    // Check if we should collect based on sampling strategy
    if (!this.shouldCollectData()) {
      this.dataLossCounter++;
      return null;
    }

    this.totalDataPoints++;

    // Calculate classification metrics
    const classificationConfidence = this.calculateClassificationConfidence(zoneState.confidence);
    const distanceToBoundary = this.calculateDistanceToBoundary(
      zoneState.confidence,
      zoneState.zone,
      thresholds
    );

    // Build zone classification schema
    const zoneClassification: ZoneClassificationSchema = {
      thresholds: {
        green: thresholds?.green ?? 0.90,
        yellow: thresholds?.yellow ?? 0.75,
        red: 0.00
      },
      classification: {
        zone: zoneState.zone,
        confidenceValue: zoneState.confidence,
        distanceToBoundary,
        boundaryDirection: this.getBoundaryDirection(
          zoneState.confidence,
          zoneState.zone,
          thresholds
        ),
        classificationConfidence
      },
      history: {
        previousZone: zoneTransition?.fromZone,
        zoneTransitions: zoneTransition ? 1 : 0,
        timeInCurrentZone: Date.now() - zoneState.timestamp,
        stabilityScore: this.calculateStabilityScore(zoneState, zoneTransition)
      },
      actions: {
        recommended: this.generateActionRecommendations(zoneState),
        taken: []
      },
      validation: {
        classificationAccuracy: 1.0, // Default, would be calculated with ground truth
        falsePositiveRate: 0.0,
        falseNegativeRate: 0.0
      }
    };

    // Store data
    this.zoneClassificationData.push(zoneClassification);

    // Maintain storage limits
    if (this.config.storage.maxEntries &&
        this.zoneClassificationData.length > this.config.storage.maxEntries) {
      this.zoneClassificationData.shift();
    }

    return zoneClassification;
  }

  // ==========================================================================
  // CALCULATION METHODS
  // ==========================================================================

  private calculateDegradationRate(steps: CascadeStep[]): number {
    if (steps.length < 2) return 0;

    const firstValue = steps[0].inputs[0]?.value ?? 1.0;
    const lastValue = steps[steps.length - 1].output.value;

    if (firstValue === 0) return 0;
    return (firstValue - lastValue) / firstValue;
  }

  private calculateCumulativeDegradation(steps: CascadeStep[]): number {
    if (steps.length < 2) return 0;

    const firstValue = steps[0].inputs[0]?.value ?? 1.0;
    const lastValue = steps[steps.length - 1].output.value;

    return firstValue - lastValue;
  }

  private calculateRecoveryMetrics(steps: CascadeStep[]): {
    opportunities: number;
    actualRecovery: number;
  } {
    let opportunities = 0;
    let totalRecovery = 0;

    for (let i = 1; i < steps.length; i++) {
      const prevOutput = steps[i - 1].output.value;
      const currentInput = steps[i].inputs[0]?.value ?? 1.0;

      // Recovery opportunity if current input > previous output
      if (currentInput > prevOutput) {
        opportunities++;
        totalRecovery += (currentInput - prevOutput);
      }
    }

    return {
      opportunities,
      actualRecovery: opportunities > 0 ? totalRecovery / opportunities : 0
    };
  }

  private calculateClassificationConfidence(confidence: number): {
    probability: number;
    uncertainty: number;
    sampleSize: number;
  } {
    // Simple implementation - would be more sophisticated in production
    const uncertainty = 0.05; // 5% uncertainty
    const probability = Math.max(0, Math.min(1, 1 - uncertainty));

    return {
      probability,
      uncertainty,
      sampleSize: 1 // Single observation
    };
  }

  private calculateDistanceToBoundary(
    confidence: number,
    zone: 'GREEN' | 'YELLOW' | 'RED',
    thresholds?: { green: number; yellow: number }
  ): number {
    const greenThreshold = thresholds?.green ?? 0.90;
    const yellowThreshold = thresholds?.yellow ?? 0.75;

    switch (zone) {
      case 'GREEN':
        return confidence - greenThreshold;
      case 'YELLOW':
        if (confidence >= greenThreshold) {
          return confidence - greenThreshold;
        } else {
          return confidence - yellowThreshold;
        }
      case 'RED':
        return confidence - yellowThreshold;
      default:
        return 0;
    }
  }

  private getBoundaryDirection(
    confidence: number,
    zone: 'GREEN' | 'YELLOW' | 'RED',
    thresholds?: { green: number; yellow: number }
  ): 'above' | 'below' {
    const greenThreshold = thresholds?.green ?? 0.90;
    const yellowThreshold = thresholds?.yellow ?? 0.75;

    switch (zone) {
      case 'GREEN':
        return 'above';
      case 'YELLOW':
        return confidence >= greenThreshold ? 'above' : 'below';
      case 'RED':
        return 'below';
      default:
        return 'below';
    }
  }

  private calculateStabilityScore(
    zoneState: ZoneState,
    zoneTransition?: ZoneTransition
  ): number {
    // Simple stability score based on recent transitions
    // Would be more sophisticated with historical data
    if (!zoneTransition) {
      return 1.0; // No transition, stable
    }

    if (zoneTransition.transitionType === 'upgrade') {
      return 0.8; // Upgrading is good but indicates previous instability
    } else if (zoneTransition.transitionType === 'downgrade') {
      return 0.3; // Downgrading indicates instability
    }

    return 0.5; // Neutral
  }

  private generateActionRecommendations(
    zoneState: ZoneState
  ): Array<{ action: string; priority: 'low' | 'medium' | 'high' | 'critical'; rationale: string }> {
    const recommendations: Array<{ action: string; priority: 'low' | 'medium' | 'high' | 'critical'; rationale: string }> = [];

    switch (zoneState.zone) {
      case 'GREEN':
        recommendations.push({
          action: 'Continue normal operation',
          priority: 'low',
          rationale: 'Confidence is in green zone, no action needed'
        });
        break;

      case 'YELLOW':
        recommendations.push({
          action: 'Review tile configuration',
          priority: 'medium',
          rationale: 'Confidence is in yellow zone, review may be needed'
        });
        recommendations.push({
          action: 'Monitor for further degradation',
          priority: 'medium',
          rationale: 'Watch for transition to red zone'
        });
        break;

      case 'RED':
        recommendations.push({
          action: 'Stop execution and investigate',
          priority: 'critical',
          rationale: 'Confidence is in red zone, immediate action required'
        });
        recommendations.push({
          action: 'Check input data quality',
          priority: 'high',
          rationale: 'Low confidence may indicate poor input data'
        });
        recommendations.push({
          action: 'Review tile composition',
          priority: 'high',
          rationale: 'Chain may be too long or individual tiles too weak'
        });
        break;
    }

    return recommendations;
  }

  // ==========================================================================
  // DATA QUALITY VALIDATION
  // ==========================================================================

  private validateConfidenceFlow(data: ConfidenceFlowSchema): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Range checks
    if (this.config.qualityAssurance.rangeChecks) {
      if (data.confidence.value < 0 || data.confidence.value > 1) {
        errors.push(`Confidence value out of range: ${data.confidence.value}`);
      }

      if (data.properties.degradationRate < 0 || data.properties.degradationRate > 1) {
        errors.push(`Degradation rate out of range: ${data.properties.degradationRate}`);
      }
    }

    // Consistency checks
    if (this.config.qualityAssurance.consistencyChecks) {
      if (data.composition.type === 'sequential' && data.inputs.some(input => input.weight !== undefined)) {
        errors.push('Sequential composition should not have weights');
      }

      if (data.composition.type === 'parallel' && data.inputs.some(input => input.weight === undefined)) {
        errors.push('Parallel composition inputs missing weights');
      }

      if (data.composition.type === 'conditional' && data.inputs.some(input => input.predicate === undefined)) {
        errors.push('Conditional composition inputs missing predicates');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==========================================================================
  // SAMPLING STRATEGY
  // ==========================================================================

  private shouldCollectData(): boolean {
    switch (this.config.sampling.rate) {
      case 'full':
        return true;

      case 'percentage':
        return Math.random() * 100 < (this.config.sampling.percentage ?? 100);

      case 'adaptive':
        // Adaptive sampling based on data loss rate
        const dataLossRate = this.getDataLossRate();
        return dataLossRate < (this.config.sampling.adaptiveThreshold ?? 0.1);

      default:
        return true;
    }
  }

  // ==========================================================================
  // DATA MANAGEMENT
  // ==========================================================================

  getDataLossRate(): number {
    if (this.totalDataPoints === 0) return 0;
    return (this.dataLossCounter / this.totalDataPoints) * 100;
  }

  getConfidenceFlowData(): ConfidenceFlowSchema[] {
    return [...this.confidenceFlowData];
  }

  getZoneClassificationData(): ZoneClassificationSchema[] {
    return [...this.zoneClassificationData];
  }

  clearData(): void {
    this.confidenceFlowData = [];
    this.zoneClassificationData = [];
    this.dataLossCounter = 0;
    this.totalDataPoints = 0;
  }

  getStats(): {
    confidenceFlowCount: number;
    zoneClassificationCount: number;
    dataLossRate: number;
    sessionDuration: number;
  } {
    return {
      confidenceFlowCount: this.confidenceFlowData.length,
      zoneClassificationCount: this.zoneClassificationData.length,
      dataLossRate: this.getDataLossRate(),
      sessionDuration: Date.now() - this.sessionStartTime
    };
  }

  // ==========================================================================
  // EXPORT METHODS
  // ==========================================================================

  exportToJson(): string {
    const exportData = {
      metadata: {
        exportTimestamp: Date.now(),
        sessionId: this.config.metadata.sessionId,
        environment: this.config.metadata.environment,
        version: this.config.metadata.version
      },
      confidenceFlowData: this.confidenceFlowData,
      zoneClassificationData: this.zoneClassificationData,
      stats: this.getStats()
    };

    return JSON.stringify(exportData, null, 2);
  }

  exportToCsv(): string {
    // Simple CSV export for confidence flow data
    const headers = [
      'timestamp',
      'confidence_value',
      'confidence_zone',
      'confidence_source',
      'composition_type',
      'chain_length',
      'operation_id',
      'degradation_rate',
      'cumulative_degradation',
      'escalation_triggered',
      'escalation_level'
    ];

    const rows = this.confidenceFlowData.map(data => [
      data.confidence.timestamp,
      data.confidence.value,
      data.confidence.zone,
      data.confidence.source,
      data.composition.type,
      data.composition.chainLength,
      data.composition.operationId,
      data.properties.degradationRate,
      data.properties.cumulativeDegradation,
      data.escalation.triggered,
      data.escalation.level
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Integrating with confidence cascade
 */
export async function exampleConfidenceFlowCollection() {
  console.log('=== CONFIDENCE FLOW DATA COLLECTION EXAMPLE ===\n');

  // Create collector
  const collector = new ConfidenceFlowCollector({
    storage: {
      type: 'memory',
      maxEntries: 1000
    },
    sampling: {
      rate: 'full'
    },
    metadata: {
      environment: 'development',
      version: '1.0.0'
    }
  });

  // Simulate cascade results (would come from actual confidence-cascade.ts)
  const mockCascadeResult: CascadeResult = {
    confidence: {
      value: 0.72,
      zone: 'YELLOW',
      source: 'sequential_complete',
      timestamp: Date.now()
    },
    steps: [
      {
        operation: 'sequential',
        inputs: [
          { value: 0.95, zone: 'GREEN', source: 'step1', timestamp: Date.now() - 1000 },
          { value: 0.90, zone: 'GREEN', source: 'step2', timestamp: Date.now() - 500 }
        ],
        output: { value: 0.855, zone: 'YELLOW', source: 'sequential', timestamp: Date.now() },
        metadata: {
          previous: 0.95,
          multiplier: 0.90,
          degradation: 0.095
        }
      }
    ],
    escalationTriggered: true,
    escalationLevel: 'NOTICE'
  };

  // Record confidence flow
  const recordedFlow = collector.recordConfidenceFlow(
    mockCascadeResult,
    'sequential',
    'operation_123'
  );

  if (recordedFlow) {
    console.log('Recorded confidence flow:');
    console.log(`- Confidence: ${recordedFlow.confidence.value} (${recordedFlow.confidence.zone})`);
    console.log(`- Composition: ${recordedFlow.composition.type} with ${recordedFlow.composition.chainLength} steps`);
    console.log(`- Degradation rate: ${recordedFlow.properties.degradationRate.toFixed(3)}`);
    console.log(`- Escalation: ${recordedFlow.escalation.triggered ? recordedFlow.escalation.level : 'none'}`);
  }

  // Simulate zone classification
  const mockZoneState: ZoneState = {
    zone: 'YELLOW',
    confidence: 0.72,
    timestamp: Date.now(),
    tileId: 'tile-123'
  };

  const mockZoneTransition: ZoneTransition = {
    fromZone: 'GREEN',
    toZone: 'YELLOW',
    confidence: 0.72,
    timestamp: Date.now(),
    tileId: 'tile-123',
    transitionType: 'downgrade'
  };

  const recordedClassification = collector.recordZoneClassification(
    mockZoneState,
    mockZoneTransition,
    { green: 0.90, yellow: 0.75 }
  );

  if (recordedClassification) {
    console.log('\nRecorded zone classification:');
    console.log(`- Zone: ${recordedClassification.classification.zone}`);
    console.log(`- Distance to boundary: ${recordedClassification.classification.distanceToBoundary.toFixed(3)}`);
    console.log(`- Stability score: ${recordedClassification.history.stabilityScore.toFixed(2)}`);
    console.log(`- Recommended actions: ${recordedClassification.actions.recommended.length}`);
  }

  // Get statistics
  const stats = collector.getStats();
  console.log('\nCollector statistics:');
  console.log(`- Confidence flow records: ${stats.confidenceFlowCount}`);
  console.log(`- Zone classification records: ${stats.zoneClassificationCount}`);
  console.log(`- Data loss rate: ${stats.dataLossRate.toFixed(2)}%`);
  console.log(`- Session duration: ${(stats.sessionDuration / 1000).toFixed(1)}s`);

  // Export data
  console.log('\nExporting data...');
  const jsonExport = collector.exportToJson();
  console.log(`JSON export size: ${jsonExport.length} bytes`);

  const csvExport = collector.exportToCsv();
  console.log(`CSV export size: ${csvExport.length} bytes`);
  console.log(`CSV rows: ${csvExport.split('\n').length - 1}`);

  return collector;
}

// Run example if executed directly
if (require.main === module) {
  (async () => {
    await exampleConfidenceFlowCollection();
  })();
}