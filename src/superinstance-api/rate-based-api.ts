/**
 * Rate-Based Change Mechanics API Module
 *
 * Provides specialized API endpoints for rate-based change operations
 * including rate tracking, prediction, deadband triggers, and confidence management.
 */

import { Request, Response, NextFunction } from 'express';
import { SuperInstanceSystem } from '../superinstance/index.js';
import { RateBasedState, RateVector, DeadbandConfig } from '../superinstance/types/base.js';

interface RateUpdateRequest {
  value: any;
  timestamp?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface RatePredictRequest {
  atTime: number;
  includeConfidence?: boolean;
  includeUncertainty?: boolean;
}

interface RateHistoryQuery {
  startTime?: number;
  endTime?: number;
  limit?: number;
  resolution?: 'raw' | 'minute' | 'hour' | 'day';
  includeRates?: boolean;
}

interface DeadbandConfigRequest {
  threshold: number;
  deadband: number;
  enabled: boolean;
  minUpdateInterval?: number;
}

interface ConfidenceAdjustmentRequest {
  adjustment: number;
  reason: string;
  notes?: string;
  factors?: Record<string, number>;
}

class RateBasedChangeApi {
  private system: SuperInstanceSystem;

  constructor(system: SuperInstanceSystem) {
    this.system = system;
  }

  /**
   * Update rate-based state for an instance
   */
  async updateRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: RateUpdateRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      if (request.value === undefined) {
        const error = this.createError('Missing required field: value', 400, 'MISSING_REQUIRED_FIELD');
        throw error;
      }

      const timestamp = request.timestamp || Date.now();
      const previousValue = instance.rateState?.currentValue;

      // Update rate state
      instance.updateRateState(request.value, timestamp);

      // Update confidence if provided
      if (request.confidence !== undefined) {
        instance.updateConfidence(request.confidence);
      }

      // Check if deadband was triggered
      const deadbandTriggered = instance.checkDeadbandTrigger(previousValue, request.value);

      // Calculate rate metrics
      const rateMetrics = this.calculateRateMetrics(instance.rateState);

      res.json({
        success: true,
        rateState: instance.rateState,
        confidence: {
          score: instance.confidenceScore,
          zone: instance.confidenceZone,
          factors: this.calculateConfidenceFactors(instance)
        },
        deadband: {
          triggered: deadbandTriggered,
          config: instance.deadbandConfig
        },
        metrics: rateMetrics,
        metadata: request.metadata || {}
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Predict future state based on current rate
   */
  async predictRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: RatePredictRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      if (!request.atTime) {
        const error = this.createError('Missing required field: atTime', 400, 'MISSING_REQUIRED_FIELD');
        throw error;
      }

      const currentTime = Date.now();
      if (request.atTime <= currentTime) {
        const error = this.createError('Prediction time must be in the future', 400, 'INVALID_PREDICTION_TIME');
        throw error;
      }

      // Predict state
      const predictedValue = instance.predictState(request.atTime);

      // Calculate prediction confidence
      const predictionConfidence = this.calculatePredictionConfidence(
        instance.rateState,
        request.atTime - currentTime
      );

      // Calculate uncertainty bounds
      const uncertainty = request.includeUncertainty
        ? this.calculateUncertaintyBounds(instance.rateState, request.atTime)
        : undefined;

      res.json({
        predictedValue,
        predictionTime: new Date(request.atTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        timeDelta: request.atTime - currentTime,
        confidence: request.includeConfidence ? predictionConfidence : undefined,
        uncertainty,
        basedOn: {
          rate: instance.rateState?.rateOfChange,
          lastUpdate: instance.rateState?.lastUpdate
            ? new Date(instance.rateState.lastUpdate).toISOString()
            : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate history for an instance
   */
  async getRateHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const query: RateHistoryQuery = req.query as any;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      // In a real implementation, this would query a time-series database
      // For now, generate sample history based on current rate state
      const history = this.generateSampleHistory(instance.rateState, query);

      // Calculate statistics
      const statistics = this.calculateHistoryStatistics(history);

      res.json({
        history,
        query,
        statistics,
        total: history.length,
        instanceId,
        retrievedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Configure deadband triggers for an instance
   */
  async configureDeadband(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: DeadbandConfigRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      // Validate deadband configuration
      if (request.threshold <= 0) {
        const error = this.createError('Threshold must be positive', 400, 'INVALID_THRESHOLD');
        throw error;
      }

      if (request.deadband < 0 || request.deadband >= request.threshold) {
        const error = this.createError('Deadband must be between 0 and threshold', 400, 'INVALID_DEADBAND');
        throw error;
      }

      // Update deadband configuration
      instance.deadbandConfig = {
        threshold: request.threshold,
        deadband: request.deadband,
        enabled: request.enabled,
        minUpdateInterval: request.minUpdateInterval
      };

      res.json({
        success: true,
        deadbandConfig: instance.deadbandConfig,
        configuredAt: new Date().toISOString(),
        instanceId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deadband configuration and statistics
   */
  async getDeadbandInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      // In a real implementation, this would track deadband trigger statistics
      const statistics = {
        triggers: 0,
        lastTrigger: null as string | null,
        averageTriggerInterval: 0,
        suppressedUpdates: 0
      };

      res.json({
        deadbandConfig: instance.deadbandConfig,
        statistics,
        instanceId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust confidence with detailed factors
   */
  async adjustConfidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: ConfidenceAdjustmentRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      if (request.adjustment === undefined || !request.reason) {
        const error = this.createError('Missing required fields: adjustment, reason', 400, 'MISSING_REQUIRED_FIELDS');
        throw error;
      }

      // Validate adjustment range
      const newConfidence = instance.confidenceScore + request.adjustment;
      if (newConfidence < 0 || newConfidence > 1) {
        const error = this.createError('Confidence must be between 0 and 1', 400, 'INVALID_CONFIDENCE_RANGE');
        throw error;
      }

      const previousScore = instance.confidenceScore;
      const previousZone = instance.confidenceZone;

      // Update confidence
      instance.updateConfidence(newConfidence);

      // Log confidence adjustment
      const adjustmentLog = {
        timestamp: new Date().toISOString(),
        previousScore,
        newScore: instance.confidenceScore,
        adjustment: request.adjustment,
        reason: request.reason,
        notes: request.notes,
        factors: request.factors
      };

      res.json({
        success: true,
        confidence: {
          previousScore,
          newScore: instance.confidenceScore,
          previousZone,
          newZone: instance.confidenceZone,
          change: request.adjustment
        },
        adjustment: adjustmentLog,
        instanceId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed confidence analysis
   */
  async getConfidenceAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error = this.createError('Instance not found', 404, 'INSTANCE_NOT_FOUND');
        throw error;
      }

      // Calculate confidence factors
      const factors = this.calculateConfidenceFactors(instance);

      // Calculate trend
      const trend = this.calculateConfidenceTrend(instance);

      // Generate recommendations
      const recommendations = this.generateConfidenceRecommendations(instance, factors);

      res.json({
        confidence: {
          score: instance.confidenceScore,
          zone: instance.confidenceZone,
          factors,
          trend
        },
        analysis: {
          stability: this.calculateStabilityScore(instance),
          reliability: this.calculateReliabilityScore(instance),
          consistency: this.calculateConsistencyScore(instance)
        },
        recommendations,
        instanceId,
        analyzedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch update rates for multiple instances
   */
  async batchUpdateRates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updates: Array<{
        instanceId: string;
        value: any;
        timestamp?: number;
        confidence?: number;
      }> = req.body.updates;

      if (!Array.isArray(updates) || updates.length === 0) {
        const error = this.createError('Updates must be a non-empty array', 400, 'INVALID_UPDATES');
        throw error;
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const instance = this.system.getInstance(update.instanceId);
          if (!instance) {
            errors.push({
              instanceId: update.instanceId,
              error: 'Instance not found',
              code: 'INSTANCE_NOT_FOUND'
            });
            continue;
          }

          const timestamp = update.timestamp || Date.now();
          const previousValue = instance.rateState?.currentValue;

          instance.updateRateState(update.value, timestamp);

          if (update.confidence !== undefined) {
            instance.updateConfidence(update.confidence);
          }

          results.push({
            instanceId: update.instanceId,
            success: true,
            rateState: instance.rateState,
            confidence: instance.confidenceScore,
            deadbandTriggered: instance.checkDeadbandTrigger(previousValue, update.value)
          });
        } catch (error) {
          errors.push({
            instanceId: update.instanceId,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'UPDATE_FAILED'
          });
        }
      }

      res.json({
        batchId: `batch-${Date.now()}`,
        total: updates.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper methods

  private createError(message: string, statusCode: number, code: string): Error {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  private calculateRateMetrics(rateState?: RateBasedState): Record<string, any> {
    if (!rateState) {
      return {
        hasRateData: false,
        message: 'No rate data available'
      };
    }

    const rate = rateState.rateOfChange;
    const timeSinceUpdate = Date.now() - rateState.lastUpdate;

    return {
      hasRateData: true,
      currentRate: rate.value,
      acceleration: rate.acceleration,
      rateConfidence: rate.confidence,
      timeSinceUpdate,
      updateFreshness: timeSinceUpdate < 60000 ? 'fresh' : timeSinceUpdate < 300000 ? 'stale' : 'outdated',
      rateMagnitude: Math.abs(rate.value),
      rateDirection: rate.value >= 0 ? 'increasing' : 'decreasing',
      accelerationDirection: rate.acceleration >= 0 ? 'accelerating' : 'decelerating'
    };
  }

  private calculateConfidenceFactors(instance: any): Record<string, number> {
    // Simplified confidence factor calculation
    // In a real implementation, this would analyze instance metrics and history
    return {
      dataQuality: 0.95,
      updateFrequency: 0.90,
      errorRate: 0.98,
      neighborConsensus: 0.85,
      stability: 0.88,
      consistency: 0.92
    };
  }

  private calculatePredictionConfidence(rateState?: RateBasedState, timeDelta: number = 0): number {
    if (!rateState) {
      return 0.5; // Default confidence without rate data
    }

    const baseConfidence = rateState.rateOfChange.confidence;
    const timePenalty = Math.min(timeDelta / (1000 * 60 * 60), 0.5); // Penalty for prediction distance
    const accelerationPenalty = Math.abs(rateState.rateOfChange.acceleration) * 10;

    return Math.max(0, Math.min(1, baseConfidence - timePenalty - accelerationPenalty));
  }

  private calculateUncertaintyBounds(rateState?: RateBasedState, predictionTime: number = 0): {
    lower: any;
    upper: any;
    confidenceInterval: number;
  } {
    if (!rateState) {
      return {
        lower: null,
        upper: null,
        confidenceInterval: 0
      };
    }

    const rate = rateState.rateOfChange;
    const timeDelta = (predictionTime - rateState.lastUpdate) / 1000; // Convert to seconds
    const predictedValue = rateState.currentValue + rate.value * timeDelta;

    // Calculate uncertainty based on rate confidence and acceleration
    const uncertainty = (1 - rate.confidence) * Math.abs(rate.value) * timeDelta;
    const accelerationUncertainty = Math.abs(rate.acceleration) * timeDelta * timeDelta * 0.5;

    const totalUncertainty = uncertainty + accelerationUncertainty;

    return {
      lower: predictedValue - totalUncertainty,
      upper: predictedValue + totalUncertainty,
      confidenceInterval: 0.95 // 95% confidence interval
    };
  }

  private generateSampleHistory(rateState?: RateBasedState, query: RateHistoryQuery): Array<{
    timestamp: string;
    value: any;
    rate?: number;
    acceleration?: number;
    confidence?: number;
  }> {
    const history: Array<{
      timestamp: string;
      value: any;
      rate?: number;
      acceleration?: number;
      confidence?: number;
    }> = [];

    const limit = query.limit || 100;
    const endTime = query.endTime || Date.now();
    const startTime = query.startTime || endTime - (24 * 60 * 60 * 1000); // Default 24 hours
    const resolution = query.resolution || 'raw';

    // Generate sample data points
    let currentTime = startTime;
    let currentValue = rateState?.currentValue || 0;
    let currentRate = rateState?.rateOfChange.value || 0;
    let currentAcceleration = rateState?.rateOfChange.acceleration || 0;

    const timeStep = resolution === 'raw' ? (endTime - startTime) / limit : this.getResolutionStep(resolution);

    for (let i = 0; i < limit && currentTime <= endTime; i++) {
      // Simulate value change based on rate
      const timeDelta = (currentTime - startTime) / 1000;
      const simulatedValue = currentValue + currentRate * timeDelta + 0.5 * currentAcceleration * timeDelta * timeDelta;

      history.push({
        timestamp: new Date(currentTime).toISOString(),
        value: simulatedValue,
        rate: query.includeRates ? currentRate + currentAcceleration * timeDelta : undefined,
        acceleration: query.includeRates ? currentAcceleration : undefined,
        confidence: 0.9 - (Math.random() * 0.1) // Random confidence between 0.8 and 0.9
      });

      currentTime += timeStep;
    }

    return history;
  }

  private getResolutionStep(resolution: string): number {
    switch (resolution) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000; // Default to minute
    }
  }

  private calculateHistoryStatistics(history: Array<any>): Record<string, any> {
    if (history.length === 0) {
      return {
        count: 0,
        message: 'No history data available'
      };
    }

    const values = history.map(h => typeof h.value === 'number' ? h.value : 0).filter(v => !isNaN(v));
    const rates = history.map(h => h.rate || 0).filter(r => !isNaN(r));

    return {
      count: history.length,
      valueStats: this.calculateStats(values),
      rateStats: rates.length > 0 ? this.calculateStats(rates) : undefined,
      timeRange: {
        start: history[0].timestamp,
        end: history[history.length - 1].timestamp,
        duration: new Date(history[history.length - 1].timestamp).getTime() - new Date(history[0].timestamp).getTime()
      }
    };
  }

  private calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
  } {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        variance: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, mean, median, stdDev, variance };
  }

  private calculateConfidenceTrend(instance: any): {
    direction: 'increasing' | 'decreasing' | 'stable';
    magnitude: number;
    trendStrength: 'weak' | 'moderate' | 'strong';
  } {
    // Simplified trend calculation
    // In a real implementation, this would analyze confidence history
    const currentConfidence = instance.confidenceScore;

    // Simulate trend based on recent changes
    const trendDirection = currentConfidence > 0.7 ? 'increasing' : currentConfidence < 0.3 ? 'decreasing' : 'stable';
    const trendMagnitude = Math.abs(currentConfidence - 0.5);
    const trendStrength = trendMagnitude > 0.3 ? 'strong' : trendMagnitude > 0.1 ? 'moderate' : 'weak';

    return {
      direction: trendDirection,
      magnitude: trendMagnitude,
      trendStrength
    };
  }

  private generateConfidenceRecommendations(instance: any, factors: Record<string, number>): Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    expectedImpact: number;
  }> {
    const recommendations = [];

    // Check data quality
    if (factors.dataQuality < 0.8) {
      recommendations.push({
        action: 'Improve data quality',
        priority: factors.dataQuality < 0.6 ? 'high' : 'medium',
        description: 'Low data quality is reducing confidence. Consider data validation and cleaning.',
        expectedImpact: 0.15
      });
    }

    // Check update frequency
    if (factors.updateFrequency < 0.7) {
      recommendations.push({
        action: 'Increase update frequency',
        priority: 'medium',
        description: 'Infrequent updates reduce confidence in current state.',
        expectedImpact: 0.1
      });
    }

    // Check stability
    if (factors.stability < 0.8) {
      recommendations.push({
        action: 'Improve stability',
        priority: 'medium',
        description: 'High variability in rates reduces confidence.',
        expectedImpact: 0.12
      });
    }

    return recommendations;
  }

  private calculateStabilityScore(instance: any): number {
    // Simplified stability calculation
    // In a real implementation, this would analyze rate variability
    return 0.85 + (Math.random() * 0.1); // Random between 0.85 and 0.95
  }

  private calculateReliabilityScore(instance: any): number {
    // Simplified reliability calculation
    return 0.9 + (Math.random() * 0.05); // Random between 0.9 and 0.95
  }

  private calculateConsistencyScore(instance: any): number {
    // Simplified consistency calculation
    return 0.88 + (Math.random() * 0.07); // Random between 0.88 and 0.95
  }
}

export { RateBasedChangeApi };