/**
 * Predictive Scaling Strategy
 *
 * ML-based predictive scaling using time series forecasting
 */

import type {
  ScalingPolicy,
  ResourceMetrics,
  ScalingDecision,
  TimeSeriesPoint,
  ScalingPrediction,
} from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { ScalingDirection, ScalingActionType } from '../types.js';

/**
 * Simple moving average
 */
function simpleMovingAverage(data: number[], window: number): number {
  if (data.length === 0) return 0;
  const recent = data.slice(-window);
  return recent.reduce((sum, val) => sum + val, 0) / recent.length;
}

/**
 * Linear regression
 */
function linearRegression(data: TimeSeriesPoint[]): { slope: number; intercept: number } {
  if (data.length < 2) {
    return { slope: 0, intercept: data[0]?.value || 0 };
  }

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  const startTime = data[0].timestamp;

  for (const point of data) {
    const x = (point.timestamp - startTime) / 1000; // Convert to seconds
    const y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Exponential smoothing
 */
function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): number[] {
  if (data.length === 0) return [];

  const smoothed: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const value = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
    smoothed.push(value);
  }

  return smoothed;
}

/**
 * Detect trend
 */
function detectTrend(data: TimeSeriesPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 3) return 'stable';

  const regression = linearRegression(data);

  // Calculate percent change per hour
  const timeWindowHours = (data[data.length - 1].timestamp - data[0].timestamp) / (1000 * 60 * 60);
  const percentChangePerHour = (regression.slope * 3600) / (data[0].value || 1) * 100;

  if (percentChangePerHour > 10) return 'increasing';
  if (percentChangePerHour < -10) return 'decreasing';
  return 'stable';
}

/**
 * Detect seasonality
 */
function detectSeasonality(data: TimeSeriesPoint[]): boolean {
  if (data.length < 24) return false;

  // Simple check: compare current value with same time yesterday
  const now = data[data.length - 1];
  const dayAgoTimestamp = now.timestamp - 24 * 60 * 60 * 1000;

  const dayAgoPoint = data.find(
    p => Math.abs(p.timestamp - dayAgoTimestamp) < 60 * 60 * 1000
  );

  if (!dayAgoPoint) return false;

  // If values are similar (within 20%), seasonality exists
  const diff = Math.abs(now.value - dayAgoPoint.value);
  const avg = (now.value + dayAgoPoint.value) / 2;

  return (diff / avg) < 0.2;
}

/**
 * Predictive Scaling Strategy
 */
export class PredictiveScalingStrategy {
  private models: Map<string, any> = new Map();
  private horizonMs: number = 15 * 60 * 1000; // 15 minutes default

  /**
   * Predict future metrics
   */
  async predict(
    metrics: ResourceMetrics,
    history: TimeSeriesPoint[][],
    horizon: number
  ): Promise<ScalingPrediction | null> {
    this.horizonMs = horizon;

    // Extract CPU history
    const cpuHistory = history[0] || [];

    if (cpuHistory.length < 10) {
      return null;
    }

    // Detect trend
    const trend = detectTrend(cpuHistory);

    // Detect seasonality
    const hasSeasonality = detectSeasonality(cpuHistory);

    // Make prediction
    const prediction = this.makePrediction(cpuHistory, trend, hasSeasonality);

    // Determine if action needed
    const recommendedAction = this.generateAction(
      metrics,
      prediction.predictedMetrics,
      prediction.confidence
    );

    return {
      timestamp: Date.now(),
      predictionHorizon: horizon,
      predictedMetrics: prediction.predictedMetrics,
      recommendedAction,
      confidence: prediction.confidence,
      model: 'trend+seasonality',
      features: {
        trend: trend === 'increasing' ? 1 : trend === 'decreasing' ? -1 : 0,
        seasonality: hasSeasonality ? 1 : 0,
        volatility: this.calculateVolatility(cpuHistory),
      },
    };
  }

  /**
   * Make prediction using trend and seasonality
   */
  private makePrediction(
    history: TimeSeriesPoint[],
    trend: 'increasing' | 'decreasing' | 'stable',
    hasSeasonality: boolean
  ): { predictedMetrics: ResourceMetrics; confidence: number } {
    const current = history[history.length - 1].value;

    // Calculate predicted value
    let predictedValue = current;
    let confidence = 0.5;

    // Apply trend
    const regression = linearRegression(history);
    const timeDelta = this.horizonMs / 1000; // Convert to seconds
    const trendEffect = regression.slope * timeDelta;

    predictedValue += trendEffect;

    // Boost confidence if trend is clear
    if (trend !== 'stable') {
      confidence += 0.15;
    }

    // Apply seasonality adjustment
    if (hasSeasonality) {
      const seasonalAdjustment = this.getSeasonalAdjustment(history);
      predictedValue *= seasonalAdjustment;
      confidence += 0.1;
    }

    // Calculate volatility and adjust confidence
    const volatility = this.calculateVolatility(history);
    confidence -= volatility * 0.5;
    confidence = Math.max(0, Math.min(1, confidence));

    // Create predicted metrics
    const predictedMetrics: ResourceMetrics = {
      cpu: {
        usage: Math.max(0, Math.min(100, predictedValue)),
        available: 100 - predictedValue,
        total: 100,
      },
      memory: {
        usage: current * 0.9, // Simple assumption
        used: 0,
        total: 100,
        heapUsed: 0,
        heapTotal: 0,
      },
      network: {
        requestRate: current * 10,
        bandwidth: current * 1000,
        connections: Math.round(current * 2),
      },
      agents: {
        total: 0,
        active: 0,
        dormant: 0,
        spawning: 0,
        terminating: 0,
      },
      tasks: {
        queueDepth: Math.round(predictedValue * 2),
        pending: Math.round(predictedValue * 3),
        running: Math.round(predictedValue),
        completed: 0,
        failed: 0,
        averageLatency: predictedValue * 10,
      },
    };

    return { predictedMetrics, confidence };
  }

  /**
   * Get seasonal adjustment factor
   */
  private getSeasonalAdjustment(history: TimeSeriesPoint[]): number {
    // Look back 24 hours
    const dayAgoTimestamp = history[history.length - 1].timestamp - 24 * 60 * 60 * 1000;

    const dayAgoPoint = history.find(
      p => Math.abs(p.timestamp - dayAgoTimestamp) < 60 * 60 * 1000
    );

    if (!dayAgoPoint) return 1.0;

    const current = history[history.length - 1].value;
    const dayAgo = dayAgoPoint.value;

    // If yesterday was higher, expect higher today
    return dayAgo > current ? 1.1 : dayAgo < current ? 0.9 : 1.0;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(history: TimeSeriesPoint[]): number {
    if (history.length < 2) return 0;

    const values = history.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Normalize by mean
    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Generate scaling action
   */
  private generateAction(
    current: ResourceMetrics,
    predicted: ResourceMetrics,
    confidence: number
  ): any {
    const cpuIncrease = predicted.cpu.usage - current.cpu.usage;
    const queueIncrease = predicted.tasks.queueDepth - current.tasks.queueDepth;

    // Only recommend action if significant change predicted
    if (cpuIncrease > 20 || queueIncrease > 50) {
      const agentsNeeded = Math.ceil(cpuIncrease / 10);

      return {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: Math.max(5, agentsNeeded),
        params: { reason: 'predictive', agentType: 'task' },
        priority: 6,
        estimatedDuration: 30000,
        estimatedCost: agentsNeeded * 0.01,
      };
    }

    return null;
  }

  /**
   * Evaluate policy (not used for predictive strategy)
   */
  async evaluate(
    policy: ScalingPolicy,
    metrics: ResourceMetrics,
    history: TimeSeriesPoint[][]
  ): Promise<ScalingDecision | null> {
    // Predictive strategy doesn't use traditional policy evaluation
    // Instead, it uses the predict() method
    return null;
  }
}
