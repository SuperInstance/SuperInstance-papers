/**
 * PatternCell - Living cell that detects patterns in its inputs
 *
 * Monitors other cells and detects patterns in their data over time.
 * Provides alerts when patterns are found or anomalies occur.
 */

import { LogCell } from '../../core/LogCell';
import { CellHead } from '../../core/CellHead';
import { CellBody } from '../../core/CellBody';
import { CellTail } from '../../core/CellTail';
import { CellOrigin } from '../../core/CellOrigin';
import { SensationType, Sensation } from '../../core/Sensation';
import { PatternDetector, PatternType, DetectedPattern, PatternDetectionOptions } from './PatternDetector';

/**
 * Pattern cell configuration
 */
export interface PatternCellConfig {
  targetCellId: string;
  sensationType?: SensationType;
  detectionOptions?: PatternDetectionOptions;
  alertThreshold?: number; // Minimum confidence for alerts
  historyLength?: number; // How many data points to keep
}

/**
 * Pattern cell state
 */
export interface PatternCellState {
  detectedPatterns: DetectedPattern[];
  alerts: PatternAlert[];
  history: number[];
  lastDetectionTime: Date | null;
}

/**
 * Pattern alert
 */
export interface PatternAlert {
  id: string;
  pattern: DetectedPattern;
  timestamp: Date;
  acknowledged: boolean;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * PatternCell - A cell that specializes in pattern detection
 */
export class PatternCell extends LogCell {
  private detector: PatternDetector;
  private config: PatternCellConfig;
  private patternState: PatternCellState;
  private patternBody: PatternCellBody;

  constructor(
    id: string,
    config: PatternCellConfig
  ) {
    // Call LogCell constructor with proper config
    super({
      id,
      type: 'pattern' as any,
      position: { row: 0, col: 0 },
      logicLevel: 0,
      memoryLimit: 100
    });

    this.config = config;
    this.detector = new PatternDetector(config.detectionOptions);
    this.patternState = {
      detectedPatterns: [],
      alerts: [],
      history: [],
      lastDetectionTime: null
    };

    // Create pattern body with detector and state
    this.patternBody = new PatternCellBody(id, config);
    this.patternBody.setDetector(this.detector);
    this.patternBody.setState(this.patternState);

    // Replace the body with our custom pattern body
    this.body = this.patternBody;
  }

  /**
   * Override activate to handle pattern detection activation
   */
  async activate(): Promise<void> {
    this.state = 'sensing';
  }

  /**
   * Override process to handle pattern detection
   */
  async process(input: any): Promise<any> {
    if (!input) {
      return {
        patterns: [],
        alerts: [],
        statistics: this.getStatistics()
      };
    }

    // Process the sensation through pattern body
    const result = await this.patternBody.process(input);

    return result;
  }

  /**
   * Create processing logic (required by LogCell)
   */
  protected createProcessingLogic(): any {
    return {
      level: 'L0_PATTERN',
      process: async (input: any, context: any) => {
        return this.patternBody.process(input, context);
      },
      estimateCost: (input: any) => 5
    };
  }

  /**
   * Create memory (required by LogCell)
   */
  protected createMemory(memoryLimit: number): any {
    return {
      getRecent: (count: number) => [],
      store: (record: any) => {},
      clear: () => {}
    };
  }

  /**
   * Create trace (required by LogCell)
   */
  protected createTrace(): any {
    return {
      steps: [],
      dependencies: [],
      confidence: 1.0,
      totalTime: 0,
      startTime: Date.now(),
      endTime: Date.now()
    };
  }

  /**
   * Create self-model (required by LogCell)
   */
  protected createSelfModel(): any {
    return {
      identity: `pattern-cell-${this.id}`,
      capabilities: ['detect_patterns', 'analyze_trends', 'alert_anomalies'],
      performance: {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageConfidence: 0,
        averageDuration: 0
      },
      patterns: [],
      lastUpdated: Date.now()
    };
  }

  /**
   * Get detected patterns
   */
  getDetectedPatterns(): DetectedPattern[] {
    return this.state.detectedPatterns;
  }

  /**
   * Get alerts
   */
  getAlerts(): PatternAlert[] {
    return this.state.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get all alerts (including acknowledged)
   */
  getAllAlerts(): PatternAlert[] {
    return this.state.alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.state.alerts = [];
  }

  /**
   * Get history
   */
  getHistory(): number[] {
    return this.state.history;
  }

  /**
   * Update detection options
   */
  updateOptions(options: Partial<PatternDetectionOptions>): void {
    this.detector.setOptions(options);
    if (this.config.detectionOptions) {
      this.config.detectionOptions = { ...this.config.detectionOptions, ...options };
    }
  }

  /**
   * Get pattern statistics
   */
  getStatistics(): {
    totalDetections: number;
    activeAlerts: number;
    patternTypes: Map<PatternType, number>;
    lastDetection: Date | null;
  } {
    const patternTypes = new Map<PatternType, number>();

    for (const pattern of this.state.detectedPatterns) {
      const count = patternTypes.get(pattern.type) || 0;
      patternTypes.set(pattern.type, count + 1);
    }

    return {
      totalDetections: this.state.detectedPatterns.length,
      activeAlerts: this.getAlerts().length,
      patternTypes,
      lastDetection: this.state.lastDetectionTime
    };
  }
}

/**
 * PatternCellBody - Custom body that performs pattern detection
 */
export class PatternCellBody extends CellBody {
  private detector: PatternDetector | null = null;
  private state: PatternCellState | null = null;
  private config: PatternCellConfig;

  constructor(cellId: string, config: PatternCellConfig) {
    super(cellId);
    this.config = config;
  }

  /**
   * Set the pattern detector
   */
  setDetector(detector: PatternDetector): void {
    this.detector = detector;
  }

  /**
   * Set the pattern cell state
   */
  setState(state: PatternCellState): void {
    this.state = state;
  }

  /**
   * Process input and detect patterns
   */
  override async process(input: any, context?: any): Promise<any> {
    // First check if input is a Sensation
    if (input && typeof input === 'object' && 'type' in input) {
      await this.processSensation(input as Sensation);
    }

    // Return the current state as output
    return {
      patterns: this.state?.detectedPatterns || [],
      alerts: this.state?.alerts.filter(a => !a.acknowledged) || [],
      statistics: this.getStatistics()
    };
  }

  /**
   * Process incoming sensations and detect patterns
   */
  private async processSensation(sensation: Sensation): Promise<void> {
    if (!this.detector || !this.state) {
      return;
    }

    // Extract value from sensation
    const value = this.extractValue(sensation);
    if (value === null) {
      return;
    }

    // Add to history
    this.state.history.push(value);

    // Limit history length
    const maxLength = this.config.historyLength || 100;
    if (this.state.history.length > maxLength) {
      this.state.history.shift();
    }

    // Perform pattern detection
    const patterns = this.detector.detectPatterns(this.state.history);

    // Update detected patterns
    this.state.detectedPatterns = patterns;
    this.state.lastDetectionTime = new Date();

    // Generate alerts for significant patterns
    this.generateAlerts(patterns);
  }

  /**
   * Extract numeric value from sensation
   */
  private extractValue(sensation: Sensation): number | null {
    // Try to get value from sensation data
    if (typeof sensation.value === 'number') {
      return sensation.value;
    }

    if (typeof sensation.value === 'object' && sensation.value !== null) {
      // Look for common value fields
      const data = sensation.value as Record<string, unknown>;
      if (typeof data.value === 'number') {
        return data.value;
      }
      if (typeof data.amount === 'number') {
        return data.amount;
      }
      if (typeof data.count === 'number') {
        return data.count;
      }
      if (typeof data.price === 'number') {
        return data.price;
      }
    }

    return null;
  }

  /**
   * Generate alerts for significant patterns
   */
  private generateAlerts(patterns: DetectedPattern[]): void {
    if (!this.state) return;

    const threshold = this.config.alertThreshold || 0.8;

    for (const pattern of patterns) {
      // Only alert on high-confidence patterns
      if (pattern.confidence >= threshold) {
        // Check if we already have a recent alert for this pattern type
        const recentAlert = this.state.alerts.find(
          a =>
            !a.acknowledged &&
            a.pattern.type === pattern.type &&
            Date.now() - a.timestamp.getTime() < 60000 // 1 minute
        );

        if (!recentAlert) {
          const severity = this.calculateSeverity(pattern);
          const alert: PatternAlert = {
            id: `alert-${Date.now()}-${pattern.type}`,
            pattern,
            timestamp: new Date(),
            acknowledged: false,
            severity
          };

          this.state.alerts.push(alert);

          // Limit alerts
          if (this.state.alerts.length > 100) {
            this.state.alerts.shift();
          }
        }
      }
    }
  }

  /**
   * Calculate alert severity based on pattern type and confidence
   */
  private calculateSeverity(pattern: DetectedPattern): 'info' | 'warning' | 'critical' {
    // Critical patterns
    if (
      pattern.type === PatternType.ANOMALY ||
      pattern.type === PatternType.OUTLIER ||
      pattern.type === PatternType.DROP
    ) {
      return pattern.confidence > 0.9 ? 'critical' : 'warning';
    }

    // Warning patterns
    if (
      pattern.type === PatternType.SPIKE ||
      pattern.type === PatternType.TREND_DOWN
    ) {
      return pattern.confidence > 0.85 ? 'warning' : 'info';
    }

    // Default to info
    return 'info';
  }

  /**
   * Get statistics
   */
  private getStatistics() {
    if (!this.state) {
      return {
        totalDetections: 0,
        activeAlerts: 0,
        patternTypes: new Map(),
        lastDetection: null
      };
    }

    const patternTypes = new Map<PatternType, number>();
    for (const pattern of this.state.detectedPatterns) {
      const count = patternTypes.get(pattern.type) || 0;
      patternTypes.set(pattern.type, count + 1);
    }

    return {
      totalDetections: this.state.detectedPatterns.length,
      activeAlerts: this.state.alerts.filter(a => !a.acknowledged).length,
      patternTypes,
      lastDetection: this.state.lastDetectionTime
    };
  }

  /**
   * Get reasoning trace for the last detection
   */
  getReasoning(): string {
    if (!this.state || this.state.detectedPatterns.length === 0) {
      return 'No patterns detected yet.';
    }

    const traces: string[] = [];
    traces.push(`Pattern detection results:`);
    traces.push(`Data points analyzed: ${this.state.history.length}`);
    traces.push(`Patterns found: ${this.state.detectedPatterns.length}`);
    traces.push('');

    for (const pattern of this.state.detectedPatterns) {
      traces.push(`Pattern: ${pattern.type}`);
      traces.push(`  Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
      traces.push(`  Description: ${pattern.description}`);
      traces.push('');
    }

    return traces.join('\n');
  }
}

/**
 * Factory function to create pattern cells
 */
export function createPatternCell(
  id: string,
  targetCellId: string,
  options?: Partial<PatternCellConfig>
): PatternCell {
  const config: PatternCellConfig = {
    targetCellId,
    sensationType: SensationType.ABSOLUTE_CHANGE,
    detectionOptions: {
      minDataPoints: 3,
      confidenceThreshold: 0.7,
      detectAnomalies: true,
      detectTrends: true
    },
    alertThreshold: 0.8,
    historyLength: 100,
    ...options
  };

  return new PatternCell(id, config);
}
