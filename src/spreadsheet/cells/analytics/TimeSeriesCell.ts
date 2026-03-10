/**
 * POLLN Spreadsheet Integration - TimeSeriesCell
 *
 * Time series analysis and forecasting.
 * Uses L2-L3 logic (agent reasoning with LLM support for complex models).
 *
 * Design Philosophy:
 * - UNDERSTAND TEMPORAL PATTERNS
 * - Separate trend, seasonality, and noise
 * - Forecast with uncertainty bounds
 * - Detect anomalies in time series
 */

import { LogCell, LogCellConfig } from '../../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../../core/types.js';

/**
 * Time series model types
 */
export enum TimeSeriesModel {
  ARIMA = 'arima',                   // AutoRegressive Integrated Moving Average
  EXPONENTIAL_SMOOTHING = 'ets',     // Exponential Smoothing (Error-Trend-Seasonal)
  SIMPLE_EXPONENTIAL = 'simple',     // Simple exponential smoothing
  DOUBLE_EXPONENTIAL = 'double',     // Double exponential smoothing (Holt's method)
  TRIPLE_EXPONENTIAL = 'triple',     // Triple exponential smoothing (Holt-Winters)
  MOVING_AVERAGE = 'ma',             // Moving average
  NAIVE = 'naive',                   // Naive forecast
  SEASONAL_NAIVE = 'seasonal_naive', // Seasonal naive forecast
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

/**
 * Seasonal decomposition result
 */
export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  period: number;
  strength: {
    trend: number;
    seasonal: number;
  };
}

/**
 * ARIMA model parameters
 */
export interface ARIMAParams {
  p: number;  // AutoRegressive order
  d: number;  // Differencing order
  q: number;  // Moving Average order
  P?: number; // Seasonal AR order
  D?: number; // Seasonal differencing
  Q?: number; // Seasonal MA
  s?: number; // Seasonal period
}

/**
 * Forecast result
 */
export interface ForecastResult {
  forecast: number[];
  confidenceIntervals: Array<{
    lower: number[];
    upper: number[];
    level: number;
  }>;
  timestamps: number[];
  model: TimeSeriesModel;
  parameters: any;
  accuracy: {
    mae: number;   // Mean Absolute Error
    mse: number;   // Mean Squared Error
    rmse: number;  // Root Mean Squared Error
    mape: number;  // Mean Absolute Percentage Error
  };
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  anomalies: Array<{
    index: number;
    timestamp: number;
    value: number;
    expected: number;
    deviation: number;
    score: number;
  }>;
  threshold: number;
  method: 'zscore' | 'iqr' | 'isolation';
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;  // 0-1, where 1 is strong trend
  slope: number;
  changePoint?: number;
  significance: number;  // p-value for trend significance
}

/**
 * Configuration for TimeSeriesCell
 */
export interface TimeSeriesCellConfig extends LogCellConfig {
  model?: TimeSeriesModel;
  arimaParams?: ARIMAParams;
  forecastHorizon?: number;
  seasonalPeriod?: number;
  confidenceLevel?: number;
}

/**
 * TimeSeriesCell - Time series analysis and forecasting
 *
 * The Temporal Analyst
 * -------------------
 * TimeSeriesCell specializes in analyzing data over time.
 * It decomposes time series into trend, seasonality, and noise components,
 * then forecasts future values with uncertainty bounds.
 *
 * Key Capabilities:
 * - ARIMA modeling for complex time series
 * - Exponential smoothing for simple trends
 * - Seasonal decomposition
 * - Anomaly detection
 * - Trend analysis with statistical significance
 *
 * This aligns with:
 * - Top-down: Specify model parameters and assumptions
 * - Bottom-up: Learn patterns from historical data
 * - The balance between model complexity and forecast accuracy
 *
 * Logic Level: L2-L3 (agent reasoning with potential LLM support)
 */
export class TimeSeriesCell extends LogCell {
  private model: TimeSeriesModel;
  private arimaParams?: ARIMAParams;
  private forecastHorizon: number;
  private seasonalPeriod: number;
  private confidenceLevel: number;

  private data: TimeSeriesPoint[] = [];
  private decomposition?: SeasonalDecomposition;
  private forecast?: ForecastResult;
  private anomalies?: AnomalyResult;
  private trend?: TrendAnalysis;

  constructor(config: TimeSeriesCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.logicLevel ?? LogicLevel.L2_AGENT,
    });

    this.model = config.model ?? TimeSeriesModel.ARIMA;
    this.arimaParams = config.arimaParams;
    this.forecastHorizon = config.forecastHorizon ?? 12;
    this.seasonalPeriod = config.seasonalPeriod ?? 12;
    this.confidenceLevel = config.confidenceLevel ?? 0.95;
  }

  /**
   * Load time series data
   */
  loadData(data: TimeSeriesPoint[]): void {
    this.data = data.sort((a, b) => a.timestamp - b.timestamp);
    this.invalidateCache();
  }

  /**
   * Invalidate cached results
   */
  private invalidateCache(): void {
    this.decomposition = undefined;
    this.forecast = undefined;
    this.anomalies = undefined;
    this.trend = undefined;
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  async decompose(): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      if (this.data.length < this.seasonalPeriod * 2) {
        throw new Error('Need at least 2 seasonal periods for decomposition');
      }

      // Extract values
      const values = this.data.map(d => d.value);

      // Calculate trend using moving average
      const trend = this.calculateTrend(values);

      // Calculate seasonal component
      const seasonal = this.calculateSeasonal(values, trend);

      // Calculate residual (what's left after removing trend and seasonal)
      const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

      // Calculate strength of trend and seasonality
      const trendStrength = this.calculateTrendStrength(values, trend);
      const seasonalStrength = this.calculateSeasonalStrength(values, seasonal);

      this.decomposition = {
        trend,
        seasonal,
        residual,
        period: this.seasonalPeriod,
        strength: {
          trend: trendStrength,
          seasonal: seasonalStrength,
        },
      };

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.decomposition,
        confidence: 0.9,
        explanation: `Decomposition complete. Trend strength: ${(trendStrength * 100).toFixed(1)}%, Seasonal strength: ${(seasonalStrength * 100).toFixed(1)}%`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Decomposition failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Calculate trend using moving average
   */
  private calculateTrend(values: number[]): number[] {
    const window = Math.floor(this.seasonalPeriod);
    const trend: number[] = [];

    // Centered moving average
    for (let i = 0; i < values.length; i++) {
      const halfWindow = Math.floor(window / 2);
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(values.length, i + halfWindow + 1);

      const sum = values.slice(start, end).reduce((a, b) => a + b, 0);
      trend.push(sum / (end - start));
    }

    return trend;
  }

  /**
   * Calculate seasonal component
   */
  private calculateSeasonal(values: number[], trend: number[]): number[] {
    const seasonal: number[] = [];
    const seasonalIndices: number[] = Array(this.seasonalPeriod).fill(0);
    const counts: number[] = Array(this.seasonalPeriod).fill(0);

    // Calculate detrended values
    const detrended = values.map((v, i) => v - trend[i]);

    // Aggregate by seasonal period
    for (let i = 0; i < detrended.length; i++) {
      const season = i % this.seasonalPeriod;
      seasonalIndices[season] += detrended[i];
      counts[season]++;
    }

    // Average seasonal indices
    for (let s = 0; s < this.seasonalPeriod; s++) {
      if (counts[s] > 0) {
        seasonalIndices[s] /= counts[s];
      }
    }

    // Normalize to sum to 0
    const mean = seasonalIndices.reduce((a, b) => a + b, 0) / this.seasonalPeriod;
    for (let s = 0; s < this.seasonalPeriod; s++) {
      seasonalIndices[s] -= mean;
    }

    // Create full seasonal component
    for (let i = 0; i < values.length; i++) {
      seasonal.push(seasonalIndices[i % this.seasonalPeriod]);
    }

    return seasonal;
  }

  /**
   * Calculate trend strength (0-1)
   */
  private calculateTrendStrength(values: number[], trend: number[]): number {
    const detrended = values.map((v, i) => v - trend[i]);
    const trendVariance = this.variance(trend);
    const residualVariance = this.variance(detrended);

    if (trendVariance + residualVariance === 0) return 0;
    return trendVariance / (trendVariance + residualVariance);
  }

  /**
   * Calculate seasonal strength (0-1)
   */
  private calculateSeasonalStrength(values: number[], seasonal: number[]): number {
    const deseasonalized = values.map((v, i) => v - seasonal[i]);
    const seasonalVariance = this.variance(seasonal);
    const residualVariance = this.variance(deseasonalized.map((v, i) => v - this.mean(deseasonalized)));

    if (seasonalVariance + residualVariance === 0) return 0;
    return seasonalVariance / (seasonalVariance + residualVariance);
  }

  /**
   * Forecast future values
   */
  async forecast(horizon?: number): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const steps = horizon ?? this.forecastHorizon;
      const values = this.data.map(d => d.value);

      let forecast: number[];
      let parameters: any;

      switch (this.model) {
        case TimeSeriesModel.ARIMA:
          [forecast, parameters] = this.arimaForecast(values, steps);
          break;

        case TimeSeriesModel.EXPONENTIAL_SMOOTHING:
        case TimeSeriesModel.TRIPLE_EXPONENTIAL:
          [forecast, parameters] = this.tripleExponentialSmoothing(values, steps);
          break;

        case TimeSeriesModel.DOUBLE_EXPONENTIAL:
          [forecast, parameters] = this.doubleExponentialSmoothing(values, steps);
          break;

        case TimeSeriesModel.SIMPLE_EXPONENTIAL:
          [forecast, parameters] = this.simpleExponentialSmoothing(values, steps);
          break;

        case TimeSeriesModel.MOVING_AVERAGE:
          [forecast, parameters] = this.movingAverageForecast(values, steps);
          break;

        case TimeSeriesModel.NAIVE:
          [forecast, parameters] = this.naiveForecast(values, steps);
          break;

        case TimeSeriesModel.SEASONAL_NAIVE:
          [forecast, parameters] = this.seasonalNaiveForecast(values, steps);
          break;

        default:
          throw new Error(`Unknown model: ${this.model}`);
      }

      // Calculate confidence intervals
      const residuals = this.calculateResiduals(values, forecast.slice(0, values.length));
      const residualStd = Math.sqrt(this.variance(residuals));
      const zScore = this.normalInverse(1 - (1 - this.confidenceLevel) / 2);

      const confidenceIntervals = [
        {
          lower: forecast.map((f, i) => f - zScore * residualStd * Math.sqrt(i + 1)),
          upper: forecast.map((f, i) => f + zScore * residualStd * Math.sqrt(i + 1)),
          level: this.confidenceLevel,
        },
      ];

      // Generate timestamps for forecast
      const lastTimestamp = this.data[this.data.length - 1].timestamp;
      const avgInterval = this.data.length > 1
        ? (this.data[this.data.length - 1].timestamp - this.data[0].timestamp) / (this.data.length - 1)
        : 1;
      const timestamps = forecast.map((_, i) => lastTimestamp + (i + 1) * avgInterval);

      // Calculate accuracy metrics
      const accuracy = this.calculateAccuracy(values, forecast.slice(0, values.length));

      this.forecast = {
        forecast,
        confidenceIntervals,
        timestamps,
        model: this.model,
        parameters,
        accuracy,
      };

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.forecast,
        confidence: 0.85,
        explanation: `${steps}-step forecast using ${this.model}. RMSE: ${accuracy.rmse.toFixed(2)}`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Forecast failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * ARIMA forecast (simplified)
   */
  private arimaForecast(values: number[], steps: number): [number[], ARIMAParams] {
    const params = this.arimaParams ?? { p: 1, d: 1, q: 1, s: this.seasonalPeriod };

    // Differencing
    let diffValues = [...values];
    for (let i = 0; i < params.d; i++) {
      diffValues = this.difference(diffValues);
    }

    // Simple AR(1) model for demonstration
    // In practice, would use full ARIMA with AR, MA, and seasonal components
    const forecast: number[] = [];
    const lastValue = diffValues[diffValues.length - 1];

    for (let i = 0; i < steps; i++) {
      forecast.push(lastValue);
    }

    // Integrate back
    let integrated = [...forecast];
    for (let i = 0; i < params.d; i++) {
      integrated = this.integrate(integrated, values.length - 1);
    }

    return [integrated, params];
  }

  /**
   * Triple exponential smoothing (Holt-Winters)
   */
  private tripleExponentialSmoothing(values: number[], steps: number): [number[], any] {
    const alpha = 0.3;  // Level smoothing
    const beta = 0.1;   // Trend smoothing
    const gamma = 0.1;  // Seasonal smoothing

    const l: number[] = [];  // Level
    const b: number[] = [];  // Trend
    const s: number[] = [];  // Seasonal

    // Initialize
    l[0] = values[0];
    b[0] = (values[1] - values[0]);
    for (let i = 0; i < this.seasonalPeriod; i++) {
      s[i] = values[i] - l[0];
    }

    // Fit model
    for (let i = 1; i < values.length; i++) {
      l[i] = alpha * (values[i] - s[i - this.seasonalPeriod]) +
             (1 - alpha) * (l[i - 1] + b[i - 1]);
      b[i] = beta * (l[i] - l[i - 1]) + (1 - beta) * b[i - 1];
      s[i] = gamma * (values[i] - l[i]) + (1 - gamma) * s[i - this.seasonalPeriod];
    }

    // Forecast
    const forecast: number[] = [];
    const lastIndex = values.length - 1;

    for (let i = 1; i <= steps; i++) {
      const seasonalIndex = (lastIndex + i) % this.seasonalPeriod;
      const value = l[lastIndex] + i * b[lastIndex] +
                    s[(lastIndex - this.seasonalPeriod + seasonalIndex) % this.seasonalPeriod];
      forecast.push(value);
    }

    return [forecast, { alpha, beta, gamma, period: this.seasonalPeriod }];
  }

  /**
   * Double exponential smoothing (Holt's method)
   */
  private doubleExponentialSmoothing(values: number[], steps: number): [number[], any] {
    const alpha = 0.3;
    const beta = 0.1;

    const l: number[] = [];
    const b: number[] = [];

    l[0] = values[0];
    b[0] = values[1] - values[0];

    for (let i = 1; i < values.length; i++) {
      l[i] = alpha * values[i] + (1 - alpha) * (l[i - 1] + b[i - 1]);
      b[i] = beta * (l[i] - l[i - 1]) + (1 - beta) * b[i - 1];
    }

    const forecast: number[] = [];
    const lastIndex = values.length - 1;

    for (let i = 1; i <= steps; i++) {
      forecast.push(l[lastIndex] + i * b[lastIndex]);
    }

    return [forecast, { alpha, beta }];
  }

  /**
   * Simple exponential smoothing
   */
  private simpleExponentialSmoothing(values: number[], steps: number): [number[], any] {
    const alpha = 0.3;

    const smoothed: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    const forecast = Array(steps).fill(smoothed[values.length - 1]);
    return [forecast, { alpha }];
  }

  /**
   * Moving average forecast
   */
  private movingAverageForecast(values: number[], steps: number): [number[], any] {
    const window = Math.min(this.seasonalPeriod, values.length);
    const ma = values.slice(-window).reduce((a, b) => a + b, 0) / window;
    const forecast = Array(steps).fill(ma);
    return [forecast, { window }];
  }

  /**
   * Naive forecast (last value carries forward)
   */
  private naiveForecast(values: number[], steps: number): [number[], any] {
    const forecast = Array(steps).fill(values[values.length - 1]);
    return [forecast, {}];
  }

  /**
   * Seasonal naive forecast
   */
  private seasonalNaiveForecast(values: number[], steps: number): [number[], any] {
    const forecast: number[] = [];
    for (let i = 0; i < steps; i++) {
      const index = values.length - this.seasonalPeriod + (i % this.seasonalPeriod);
      forecast.push(values[index]);
    }
    return [forecast, { period: this.seasonalPeriod }];
  }

  /**
   * Detect anomalies in time series
   */
  async detectAnomalies(method: 'zscore' | 'iqr' | 'isolation' = 'zscore'): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const values = this.data.map(d => d.value);
      const anomalies: AnomalyResult['anomalies'] = [];
      let threshold = 3;

      if (method === 'zscore') {
        // Z-score method
        const mean = this.mean(values);
        const std = Math.sqrt(this.variance(values));
        threshold = 3;

        for (let i = 0; i < values.length; i++) {
          const zscore = Math.abs((values[i] - mean) / std);
          if (zscore > threshold) {
            anomalies.push({
              index: i,
              timestamp: this.data[i].timestamp,
              value: values[i],
              expected: mean,
              deviation: values[i] - mean,
              score: zscore,
            });
          }
        }
      } else if (method === 'iqr') {
        // Interquartile range method
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        for (let i = 0; i < values.length; i++) {
          if (values[i] < lower || values[i] > upper) {
            anomalies.push({
              index: i,
              timestamp: this.data[i].timestamp,
              value: values[i],
              expected: (q1 + q3) / 2,
              deviation: values[i] - (q1 + q3) / 2,
              score: Math.abs(values[i] - (q1 + q3) / 2) / iqr,
            });
          }
        }
      } else if (method === 'isolation') {
        // Simplified isolation forest (would use proper implementation)
        // Using deviation from moving average as proxy
        const trend = this.calculateTrend(values);
        const residuals = values.map((v, i) => v - trend[i]);
        const residualStd = Math.sqrt(this.variance(residuals));
        threshold = 2.5;

        for (let i = 0; i < values.length; i++) {
          const score = Math.abs(residuals[i] / residualStd);
          if (score > threshold) {
            anomalies.push({
              index: i,
              timestamp: this.data[i].timestamp,
              value: values[i],
              expected: trend[i],
              deviation: residuals[i],
              score,
            });
          }
        }
      }

      this.anomalies = {
        anomalies,
        threshold,
        method,
      };

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.anomalies,
        confidence: 0.85,
        explanation: `Detected ${anomalies.length} anomalies using ${method} method`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Anomaly detection failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Analyze trend
   */
  async analyzeTrend(): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const values = this.data.map(d => d.value);

      // Mann-Kendall trend test (simplified)
      let nPositive = 0;
      let nNegative = 0;

      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          if (values[j] > values[i]) nPositive++;
          if (values[j] < values[i]) nNegative++;
        }
      }

      const S = nPositive - nNegative;
      const n = values.length;
      const varS = n * (n - 1) * (2 * n + 5) / 18;

      // Z-statistic
      const z = S > 0 ? (S - 1) / Math.sqrt(varS) :
                    S < 0 ? (S + 1) / Math.sqrt(varS) : 0;

      // P-value (two-tailed)
      const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

      // Trend direction and strength
      const direction = z > 1.96 ? 'increasing' :
                       z < -1.96 ? 'decreasing' : 'stable';

      // Sen's slope estimator
      const slopes: number[] = [];
      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          slopes.push((values[j] - values[i]) / (j - i));
        }
      }
      slopes.sort((a, b) => a - b);
      const slope = slopes[Math.floor(slopes.length / 2)];

      // Trend strength (based on significance)
      const strength = Math.min(1, Math.abs(z) / 3);

      // Change point detection (simplified - using maximum difference in means)
      let maxDiff = 0;
      let changePoint: number | undefined;

      for (let i = 10; i < values.length - 10; i++) {
        const mean1 = this.mean(values.slice(0, i));
        const mean2 = this.mean(values.slice(i));
        const diff = Math.abs(mean2 - mean1);
        if (diff > maxDiff) {
          maxDiff = diff;
          changePoint = i;
        }
      }

      this.trend = {
        direction,
        strength,
        slope,
        changePoint: maxDiff > Math.sqrt(this.variance(values)) ? changePoint : undefined,
        significance: pValue,
      };

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.trend,
        confidence: 1 - pValue,
        explanation: `Trend: ${direction} (strength: ${(strength * 100).toFixed(1)}%, p-value: ${pValue.toFixed(3)})`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Trend analysis failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private difference(values: number[]): number[] {
    return values.slice(1).map((v, i) => v - values[i]);
  }

  private integrate(values: number[], initialValue: number): number[] {
    const integrated: number[] = [initialValue];
    for (let i = 0; i < values.length; i++) {
      integrated.push(integrated[i] + values[i]);
    }
    return integrated.slice(1);
  }

  private calculateResiduals(actual: number[], predicted: number[]): number[] {
    return actual.map((a, i) => a - (predicted[i] ?? 0));
  }

  private calculateAccuracy(actual: number[], predicted: number[]): {
    mae: number;
    mse: number;
    rmse: number;
    mape: number;
  } {
    const errors = actual.map((a, i) => a - (predicted[i] ?? 0));
    const mae = this.mean(errors.map(e => Math.abs(e)));
    const mse = this.mean(errors.map(e => e * e));
    const rmse = Math.sqrt(mse);
    const mape = this.mean(errors.map((e, i) =>
      actual[i] !== 0 ? Math.abs(e / actual[i]) * 100 : 0
    ));

    return { mae, mse, rmse, mape };
  }

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private variance(values: number[]): number {
    const avg = this.mean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }

  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  private normalInverse(p: number): number {
    // Beasley-Springer-Moro approximation (simplified)
    if (p <= 0 || p >= 1) return 0;

    const a = [-3.969683028665376e+01, 2.209460984245205e+02,
               -2.759285104469687e+02, 1.383577518672690e+02,
               -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02,
               -1.556989798598866e+02, 6.680131188771972e+01,
               -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01,
               -2.400758277161838e+00, -2.549732539343734e+00,
                4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e+01,
               2.445134137142996e+00, 3.754408661907416e+00];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
              ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  // ========================================================================
  // Lifecycle Methods
  // ========================================================================

  async activate(): Promise<void> {
    this.transitionTo(CellState.SENSING);
  }

  async process(input: any): Promise<CellOutput> {
    return this.executeProcessingPipeline(input);
  }

  async learn(feedback: any): Promise<void> {
    this.transitionTo(CellState.LEARNING);
    // Could learn from feedback to adjust model parameters
    this.transitionTo(CellState.DORMANT);
  }

  async deactivate(): Promise<void> {
    this.transitionTo(CellState.DORMANT);
  }

  protected createProcessingLogic(): any {
    return {
      type: 'time_series',
      model: this.model,
      seasonalPeriod: this.seasonalPeriod,
    };
  }

  protected async executeProcessing(
    input: any,
    context: any
  ): Promise<any> {
    if (input.action === 'load') {
      this.loadData(input.data);
      return {
        value: { message: 'Data loaded' },
        confidence: 1.0,
        trace: this.body.trace,
        explanation: `Loaded ${this.data.length} time series points`,
      };
    } else if (input.action === 'decompose') {
      return this.decompose();
    } else if (input.action === 'forecast') {
      return this.forecast(input.horizon);
    } else if (input.action === 'detect_anomalies') {
      return this.detectAnomalies(input.method);
    } else if (input.action === 'analyze_trend') {
      return this.analyzeTrend();
    } else {
      return this.forecast();
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getDecomposition(): SeasonalDecomposition | undefined {
    return this.decomposition;
  }

  getForecast(): ForecastResult | undefined {
    return this.forecast;
  }

  getAnomalies(): AnomalyResult | undefined {
    return this.anomalies;
  }

  getTrend(): TrendAnalysis | undefined {
    return this.trend;
  }

  getData(): TimeSeriesPoint[] {
    return [...this.data];
  }
}
