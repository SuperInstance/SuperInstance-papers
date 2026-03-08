/**
 * POLLN Guardian Learning System
 * Adaptive learning from false positives/negatives and threshold tuning
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type {
  GuardianFeedback,
  GuardianConstraint,
  WeightAdjustment,
  AdaptationResult,
  ConstraintStats,
  GuardianDecision,
} from './types.js';

// ============================================================================
// Learning Configuration
// ============================================================================

export interface LearningConfig {
  enabled: boolean;
  learningRate: number;
  decayRate: number;
  momentum: number;

  // Adaptation thresholds
  minSamplesForAdaptation: number;
  adaptationInterval: number;
  accuracyThreshold: number;

  // Weight constraints
  minWeight: number;
  maxWeight: number;

  // Threshold tuning
  autoTuneThresholds: boolean;
  targetTruePositiveRate: number;
  targetTrueNegativeRate: number;

  // Feature extraction
  extractFeatures: boolean;
  featureDimensions: number;
}

const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  enabled: true,
  learningRate: 0.1,
  decayRate: 0.01,
  momentum: 0.9,

  minSamplesForAdaptation: 20,
  adaptationInterval: 300000, // 5 minutes
  accuracyThreshold: 0.8,

  minWeight: 0.1,
  maxWeight: 2.0,

  autoTuneThresholds: true,
  targetTruePositiveRate: 0.95,
  targetTrueNegativeRate: 0.9,

  extractFeatures: false,
  featureDimensions: 32,
};

// ============================================================================
// Feedback Buffer Entry
// ============================================================================

interface FeedbackEntry {
  feedback: GuardianFeedback;
  timestamp: number;
  processed: boolean;
  features?: number[];
}

// ============================================================================
// Learning Metrics
// ============================================================================

export interface LearningMetrics {
  totalFeedback: number;
  processedFeedback: number;
  pendingFeedback: number;

  // Accuracy metrics
  overallAccuracy: number;
  truePositiveRate: number;
  trueNegativeRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;

  // Adaptation metrics
  totalAdaptations: number;
  lastAdaptation: number;
  weightAdjustments: number;

  // Per-constraint metrics
  constraintMetrics: Map<string, ConstraintLearningMetrics>;
}

export interface ConstraintLearningMetrics {
  constraintId: string;

  // Feedback counts
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;

  // Accuracy
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;

  // Weight history
  currentWeight: number;
  initialWeight: number;
  weightChanges: number;

  // Trend
  improving: boolean;
  trendDirection: 'up' | 'down' | 'stable';
}

// ============================================================================
// Guardian Learning System
// ============================================================================

export class GuardianLearningSystem extends EventEmitter {
  private config: LearningConfig;
  private feedbackBuffer: FeedbackEntry[] = [];
  private metrics: LearningMetrics;
  private constraintHistory: Map<string, number[]> = new Map(); // Weight history
  private isAdapting = false;

  constructor(config?: Partial<LearningConfig>) {
    super();

    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };

    this.metrics = {
      totalFeedback: 0,
      processedFeedback: 0,
      pendingFeedback: 0,

      overallAccuracy: 0,
      truePositiveRate: 0,
      trueNegativeRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,

      totalAdaptations: 0,
      lastAdaptation: 0,
      weightAdjustments: 0,

      constraintMetrics: new Map(),
    };
  }

  // ========================================================================
  // Feedback Processing
  // ========================================================================

  /**
   * Add feedback to the learning buffer
   */
  addFeedback(feedback: GuardianFeedback): void {
    if (!this.config.enabled) return;

    const entry: FeedbackEntry = {
      feedback,
      timestamp: Date.now(),
      processed: false,
    };

    // Extract features if enabled
    if (this.config.extractFeatures) {
      entry.features = this.extractFeatures(feedback);
    }

    this.feedbackBuffer.push(entry);
    this.metrics.totalFeedback++;
    this.metrics.pendingFeedback++;

    this.emit('feedback_added', feedback);

    // Trigger adaptation if we have enough samples
    if (this.feedbackBuffer.length >= this.config.minSamplesForAdaptation) {
      this.triggerAdaptation();
    }
  }

  /**
   * Process feedback buffer and learn from it
   */
  async processFeedback(): Promise<AdaptationResult | null> {
    if (!this.config.enabled) return null;
    if (this.isAdapting) return null;

    const unprocessed = this.feedbackBuffer.filter(e => !e.processed);
    if (unprocessed.length < this.config.minSamplesForAdaptation) {
      return null;
    }

    this.isAdapting = true;

    try {
      const startTime = Date.now();

      // Group feedback by constraint
      const constraintFeedback = this.groupByConstraint(unprocessed);

      // Calculate metrics
      this.updateMetrics(unprocessed);

      // Adjust weights
      const adjustments = this.adjustWeights(constraintFeedback);

      // Mark as processed
      for (const entry of unprocessed) {
        entry.processed = true;
      }

      // Clean old feedback
      this.cleanupFeedback();

      const adaptationTime = Date.now() - startTime;

      const result: AdaptationResult = {
        timestamp: Date.now(),
        adjustments,
        improvements: this.calculateImprovements(),
        newAccuracy: this.metrics.overallAccuracy,
      };

      this.metrics.totalAdaptations++;
      this.metrics.lastAdaptation = Date.now();
      this.metrics.processedFeedback += unprocessed.length;
      this.metrics.pendingFeedback = this.feedbackBuffer.filter(
        e => !e.processed
      ).length;

      this.emit('adaptation_completed', result);

      return result;
    } finally {
      this.isAdapting = false;
    }
  }

  // ========================================================================
  // Weight Adjustment
  // ========================================================================

  /**
   * Adjust constraint weights based on feedback
   */
  private adjustWeights(
    constraintFeedback: Map<string, FeedbackEntry[]>
  ): WeightAdjustment[] {
    const adjustments: WeightAdjustment[] = [];

    for (const [constraintId, entries] of Array.from(constraintFeedback.entries())) {
      // Calculate feedback signals
      let adjustUp = 0;
      let adjustDown = 0;

      for (const entry of entries) {
        const { feedback } = entry;

        if (!feedback.wasCorrect) {
          if (feedback.decision === 'VETO') {
            // False positive - weight should decrease
            adjustDown++;
          } else if (feedback.decision === 'ALLOW') {
            // False negative - weight should increase
            adjustUp++;
          }
        }
      }

      // Calculate net adjustment
      const netAdjustment = adjustUp - adjustDown;
      if (netAdjustment === 0) continue;

      // Find the constraint (would be passed in real implementation)
      // For now, we'll emit an event with the adjustment
      const weightChange =
        (netAdjustment * this.config.learningRate) / entries.length;

      adjustments.push({
        constraintId,
        oldWeight: 0, // Would get from constraint
        newWeight: 0, // Would calculate
        reason: `Feedback-based adjustment: +${adjustUp} false negatives, -${adjustDown} false positives`,
        timestamp: Date.now(),
        feedbackId: entries[0].feedback.id,
      });

      this.metrics.weightAdjustments++;
    }

    return adjustments;
  }

  /**
   * Apply weight adjustment to a constraint
   */
  applyWeightAdjustment(
    constraint: GuardianConstraint,
    adjustment: WeightAdjustment
  ): GuardianConstraint {
    if (!this.config.enabled || !constraint.adaptiveWeight) {
      return constraint;
    }

    const oldWeight = constraint.weight;
    const feedback = this.feedbackBuffer.find(
      e => e.feedback.id === adjustment.feedbackId
    );

    if (!feedback) return constraint;

    // Calculate new weight based on feedback
    let weightChange = 0;
    if (!feedback.feedback.wasCorrect) {
      if (feedback.feedback.decision === 'VETO') {
        // False positive - decrease weight
        weightChange = -this.config.learningRate;
      } else if (feedback.feedback.decision === 'ALLOW') {
        // False negative - increase weight
        weightChange = this.config.learningRate;
      }
    }

    // Apply momentum
    const history = this.constraintHistory.get(constraint.id) || [];
    const momentum =
      history.length > 1
        ? (history[history.length - 1] - history[history.length - 2]) *
          this.config.momentum
        : 0;

    // Calculate new weight with momentum
    let newWeight = oldWeight + weightChange + momentum;

    // Apply weight constraints
    newWeight = Math.max(
      this.config.minWeight,
      Math.min(this.config.maxWeight, newWeight)
    );

    // Update constraint
    constraint.weight = newWeight;
    constraint.lastAdjusted = Date.now();

    // Update history
    history.push(newWeight);
    if (history.length > 100) {
      history.shift();
    }
    this.constraintHistory.set(constraint.id, history);

    // Update metrics
    const metrics = this.metrics.constraintMetrics.get(constraint.id);
    if (metrics) {
      metrics.currentWeight = newWeight;
      metrics.weightChanges++;
    }

    this.emit('weight_adjusted', {
      constraintId: constraint.id,
      oldWeight,
      newWeight,
      reason: adjustment.reason,
    });

    return constraint;
  }

  // ========================================================================
  // Threshold Tuning
  // ========================================================================

  /**
   * Auto-tune decision thresholds based on performance
   */
  tuneThresholds(constraints: GuardianConstraint[]): {
    allowThreshold: number;
    modifyThreshold: number;
    vetoThreshold: number;
  } {
    if (!this.config.autoTuneThresholds) {
      return {
        allowThreshold: 0.8,
        modifyThreshold: 0.5,
        vetoThreshold: 0.3,
      };
    }

    // Calculate current rates
    const tpr = this.metrics.truePositiveRate;
    const tnr = this.metrics.trueNegativeRate;

    // Adjust thresholds to meet targets
    let allowThreshold = 0.8;
    let modifyThreshold = 0.5;
    let vetoThreshold = 0.3;

    // If TPR is too low, we're missing threats - tighten thresholds
    if (tpr < this.config.targetTruePositiveRate) {
      allowThreshold += 0.05;
      modifyThreshold += 0.05;
      vetoThreshold += 0.05;
    }

    // If TNR is too low, we're too strict - loosen thresholds
    if (tnr < this.config.targetTrueNegativeRate) {
      allowThreshold -= 0.05;
      modifyThreshold -= 0.05;
      vetoThreshold -= 0.05;
    }

    // Clamp to valid ranges
    allowThreshold = Math.max(0.5, Math.min(1.0, allowThreshold));
    modifyThreshold = Math.max(0.3, Math.min(0.8, modifyThreshold));
    vetoThreshold = Math.max(0.1, Math.min(0.6, vetoThreshold));

    this.emit('thresholds_tuned', {
      allowThreshold,
      modifyThreshold,
      vetoThreshold,
    });

    return { allowThreshold, modifyThreshold, vetoThreshold };
  }

  // ========================================================================
  // Metrics and Analysis
  // ========================================================================

  /**
   * Update learning metrics from feedback
   */
  private updateMetrics(feedbackEntries: FeedbackEntry[]): void {
    let tp = 0;
    let tn = 0;
    let fp = 0;
    let fn = 0;

    for (const entry of feedbackEntries) {
      const { feedback } = entry;
      if (!feedback.wasCorrect) {
        if (feedback.decision === 'VETO') {
          fp++;
        } else if (feedback.decision === 'ALLOW') {
          fn++;
        }
      } else {
        if (feedback.decision === 'VETO') {
          tp++;
        } else {
          tn++;
        }
      }

      // Update per-constraint metrics
      if (feedback.affectedConstraintIds) {
        for (const constraintId of feedback.affectedConstraintIds) {
          this.updateConstraintMetrics(constraintId, feedback);
        }
      }
    }

    // Calculate rates
    const total = tp + tn + fp + fn;
    if (total > 0) {
      this.metrics.truePositiveRate = tp / (tp + fn) || 0;
      this.metrics.trueNegativeRate = tn / (tn + fp) || 0;
      this.metrics.falsePositiveRate = fp / (fp + tn) || 0;
      this.metrics.falseNegativeRate = fn / (fn + tp) || 0;
      this.metrics.overallAccuracy = (tp + tn) / total;
    }
  }

  /**
   * Update metrics for a specific constraint
   */
  private updateConstraintMetrics(
    constraintId: string,
    feedback: GuardianFeedback
  ): void {
    let metrics = this.metrics.constraintMetrics.get(constraintId);

    if (!metrics) {
      metrics = {
        constraintId,
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        currentWeight: 1.0,
        initialWeight: 1.0,
        weightChanges: 0,
        improving: false,
        trendDirection: 'stable',
      };
      this.metrics.constraintMetrics.set(constraintId, metrics);
    }

    // Update counts
    if (!feedback.wasCorrect) {
      if (feedback.decision === 'VETO') {
        metrics.falsePositives++;
      } else if (feedback.decision === 'ALLOW') {
        metrics.falseNegatives++;
      }
    } else {
      if (feedback.decision === 'VETO') {
        metrics.truePositives++;
      } else {
        metrics.trueNegatives++;
      }
    }

    // Calculate metrics
    const total =
      metrics.truePositives +
      metrics.trueNegatives +
      metrics.falsePositives +
      metrics.falseNegatives;

    if (total > 0) {
      metrics.accuracy =
        (metrics.truePositives + metrics.trueNegatives) / total;
      metrics.precision =
        metrics.truePositives / (metrics.truePositives + metrics.falsePositives) ||
        0;
      metrics.recall =
        metrics.truePositives / (metrics.truePositives + metrics.falseNegatives) ||
        0;
      metrics.f1Score =
        (2 * metrics.precision * metrics.recall) /
          (metrics.precision + metrics.recall) || 0;
    }

    // Update trend
    const history = this.constraintHistory.get(constraintId);
    if (history && history.length >= 2) {
      const recent = history.slice(-5);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const avgEarlier =
        history.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

      if (avgRecent > avgEarlier * 1.05) {
        metrics.trendDirection = 'up';
      } else if (avgRecent < avgEarlier * 0.95) {
        metrics.trendDirection = 'down';
      } else {
        metrics.trendDirection = 'stable';
      }

      metrics.improving = metrics.trendDirection === 'up';
    }
  }

  /**
   * Calculate improvements from adaptations
   */
  private calculateImprovements(): {
    reducedFalsePositives: number;
    reducedFalseNegatives: number;
    accuracyImprovement: number;
  } {
    // Compare recent metrics with historical baseline
    const recentAccuracy = this.metrics.overallAccuracy;

    return {
      reducedFalsePositives: 0, // Would calculate from history
      reducedFalseNegatives: 0,
      accuracyImprovement: recentAccuracy - 0.8, // Baseline
    };
  }

  // ========================================================================
  // Feature Extraction (Advanced)
  // ========================================================================

  /**
   * Extract features from feedback for advanced learning
   */
  private extractFeatures(feedback: GuardianFeedback): number[] {
    const features: number[] = [];

    // Basic features
    features.push(feedback.decision === 'ALLOW' ? 1 : 0);
    features.push(feedback.decision === 'MODIFY' ? 1 : 0);
    features.push(feedback.decision === 'VETO' ? 1 : 0);
    features.push(feedback.wasCorrect ? 1 : 0);
    features.push(feedback.humanOverride ? 1 : 0);

    // Normalize to feature dimensions
    while (features.length < this.config.featureDimensions) {
      features.push(0);
    }

    return features.slice(0, this.config.featureDimensions);
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Group feedback by constraint
   */
  private groupByConstraint(
    feedbackEntries: FeedbackEntry[]
  ): Map<string, FeedbackEntry[]> {
    const grouped = new Map<string, FeedbackEntry[]>();

    for (const entry of feedbackEntries) {
      if (entry.feedback.affectedConstraintIds) {
        for (const constraintId of entry.feedback.affectedConstraintIds) {
          if (!grouped.has(constraintId)) {
            grouped.set(constraintId, []);
          }
          grouped.get(constraintId)!.push(entry);
        }
      }
    }

    return grouped;
  }

  /**
   * Clean up old processed feedback
   */
  private cleanupFeedback(): void {
    const maxAge = 7 * 24 * 3600000; // 7 days
    const now = Date.now();

    this.feedbackBuffer = this.feedbackBuffer.filter(
      entry => now - entry.timestamp < maxAge
    );
  }

  /**
   * Trigger adaptation
   */
  private triggerAdaptation(): void {
    // Schedule adaptation
    setTimeout(() => {
      this.processFeedback();
    }, 100);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get learning metrics
   */
  getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  /**
   * Get constraint learning metrics
   */
  getConstraintMetrics(constraintId: string): ConstraintLearningMetrics | undefined {
    return this.metrics.constraintMetrics.get(constraintId);
  }

  /**
   * Get weight history for a constraint
   */
  getWeightHistory(constraintId: string): number[] {
    return this.constraintHistory.get(constraintId) || [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_updated', this.config);
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalFeedback: 0,
      processedFeedback: 0,
      pendingFeedback: 0,
      overallAccuracy: 0,
      truePositiveRate: 0,
      trueNegativeRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      totalAdaptations: 0,
      lastAdaptation: 0,
      weightAdjustments: 0,
      constraintMetrics: new Map(),
    };
    this.feedbackBuffer = [];
    this.constraintHistory.clear();
    this.emit('metrics_reset');
  }

  /**
   * Enable learning
   */
  enable(): void {
    this.config.enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable learning
   */
  disable(): void {
    this.config.enabled = false;
    this.emit('disabled');
  }

  /**
   * Check if learning is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get feedback buffer size
   */
  getBufferSize(): number {
    return this.feedbackBuffer.length;
  }

  /**
   * Get unprocessed feedback count
   */
  getPendingCount(): number {
    return this.feedbackBuffer.filter(e => !e.processed).length;
  }
}
