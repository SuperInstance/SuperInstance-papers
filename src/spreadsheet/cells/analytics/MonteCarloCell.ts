/**
 * POLLN Spreadsheet Integration - MonteCarloCell
 *
 * Monte Carlo simulation and risk analysis.
 * Uses L2 logic (agent reasoning) with L3 support for complex distributions.
 *
 * Design Philosophy:
 * - QUANTIFY UNCERTAINTY THROUGH SIMULATION
 * - Model risk with probability distributions
 * - Explore outcomes through random sampling
 * - Support decision-making under uncertainty
 */

import { LogCell, LogCellConfig } from '../../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../../core/types.js';

/**
 * Distribution types for Monte Carlo simulation
 */
export enum DistributionType {
  NORMAL = 'normal',
  UNIFORM = 'uniform',
  TRIANGULAR = 'triangular',
  EXPONENTIAL = 'exponential',
  LOGNORMAL = 'lognormal',
  BETA = 'beta',
  GAMMA = 'gamma',
  WEIBULL = 'weibull',
  CUSTOM = 'custom',  // User-defined distribution
}

/**
 * Distribution definition
 */
export interface Distribution {
  type: DistributionType;
  params: {
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
    lambda?: number;     // For exponential
    shape?: number;      // For beta, gamma, weibull
    scale?: number;      // For beta, gamma, weibull
    alpha?: number;      // For beta
    beta?: number;       // For beta
  };
  name: string;
}

/**
 * Correlation definition
 */
export interface Correlation {
  variable1: string;
  variable2: string;
  coefficient: number;  // -1 to 1
}

/**
 * Simulation result
 */
export interface SimulationResult {
  iterations: number;
  converged: boolean;
  samples: number[];
  statistics: {
    mean: number;
    median: number;
    mode: number;
    stdDev: number;
    variance: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
    range: number;
    coefficientOfVariation: number;
  };
  percentiles: Record<number, number>;
  confidenceIntervals: Record<number, { lower: number; upper: number }>;
  distribution: Array<{ value: number; frequency: number }>;
  convergence: Array<{ iteration: number; mean: number; stdDev: number }>;
  riskMetrics: {
    var90: number;   // Value at Risk at 90% confidence
    var95: number;   // Value at Risk at 95% confidence
    var99: number;   // Value at Risk at 99% confidence
    cvar90: number;  // Conditional VaR at 90%
    cvar95: number;  // Conditional VaR at 95%
    cvar99: number;  // Conditional VaR at 99%
    expectedShortfall: number;
    probabilityOfLoss: number;
    tailRisk: number;
  };
}

/**
 * Sensitivity analysis result
 */
export interface SensitivityAnalysis {
  variable: string;
  baseValue: number;
  correlationWithOutput: number;
  standardizedCoefficient: number;
  rank: number;  // Which variable has most impact
}

/**
 * Configuration for MonteCarloCell
 */
export interface MonteCarloCellConfig extends LogCellConfig {
  // Formula or function to model
  model: (inputs: Record<string, number>) => number;
  // Input variables with their distributions
  variables: Record<string, Distribution>;
  // Correlations between variables
  correlations?: Correlation[];
  // Number of iterations
  iterations?: number;
  // Convergence tolerance
  convergenceTolerance?: number;
  // Confidence levels for intervals
  confidenceLevels?: number[];
}

/**
 * MonteCarloCell - Monte Carlo simulation and risk analysis
 *
 * The Risk Quantifier
 * ------------------
 * MonteCarloCell quantifies uncertainty through simulation.
 * It models variables as probability distributions and explores
 * the range of possible outcomes through random sampling.
 *
 * Key Capabilities:
 * - Multiple probability distributions (normal, uniform, triangular, etc.)
 * - Correlation handling between variables
 * - Convergence analysis for simulation stability
 * - Risk metrics (VaR, CVaR, expected shortfall)
 * - Sensitivity analysis for variable importance
 *
 * This aligns with:
 * - Top-down: Define distributions and model structure
 * - Bottom-up: Learn outcome distribution through sampling
 * - The balance between exploration and computational efficiency
 *
 * Logic Level: L2-L3 (agent reasoning with potential LLM support)
 */
export class MonteCarloCell extends LogCell {
  private model: (inputs: Record<string, number>) => number;
  private variables: Record<string, Distribution>;
  private correlations: Correlation[];
  private iterations: number;
  private convergenceTolerance: number;
  private confidenceLevels: number[];

  private simulationResult?: SimulationResult;
  private sensitivityAnalysis?: SensitivityAnalysis[];

  constructor(config: MonteCarloCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.logicLevel ?? LogicLevel.L2_AGENT,
    });

    this.model = config.model;
    this.variables = config.variables;
    this.correlations = config.correlations ?? [];
    this.iterations = config.iterations ?? 10000;
    this.convergenceTolerance = config.convergenceTolerance ?? 0.01;
    this.confidenceLevels = config.confidenceLevels ?? [0.90, 0.95, 0.99];
  }

  /**
   * Run Monte Carlo simulation
   */
  async simulate(iterations?: number): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const n = iterations ?? this.iterations;
      const samples: number[] = [];
      const convergence: Array<{ iteration: number; mean: number; stdDev: number }> = [];

      // Initialize Cholesky decomposition for correlations
      const cholMatrix = this.computeCholeskyDecomposition();

      // Generate samples using Iman-Conover method for correlations
      for (let i = 0; i < n; i++) {
        // Generate independent samples
        const independentSamples: Record<string, number> = {};
        for (const [varName, dist] of Object.entries(this.variables)) {
          independentSamples[varName] = this.sampleDistribution(dist);
        }

        // Apply correlation transformation
        const correlatedSamples = this.applyCorrelation(independentSamples, cholMatrix);

        // Evaluate model
        const result = this.model(correlatedSamples);
        samples.push(result);

        // Track convergence every 100 iterations
        if (i % 100 === 0) {
          const currentSamples = samples.slice(-100);
          const mean = this.mean(currentSamples);
          const stdDev = this.stdDev(currentSamples);
          convergence.push({ iteration: i, mean, stdDev });
        }
      }

      // Check convergence
      const converged = this.checkConvergence(convergence);

      // Calculate statistics
      const statistics = this.calculateStatistics(samples);

      // Calculate percentiles
      const sorted = [...samples].sort((a, b) => a - b);
      const percentiles: Record<number, number> = {};
      for (const p of [1, 5, 10, 25, 50, 75, 90, 95, 99]) {
        percentiles[p] = sorted[Math.floor(n * p / 100)];
      }

      // Calculate confidence intervals
      const confidenceIntervals: Record<number, { lower: number; upper: number }> = {};
      for (const level of this.confidenceLevels) {
        const alpha = 1 - level;
        confidenceIntervals[level] = {
          lower: sorted[Math.floor(n * alpha / 2)],
          upper: sorted[Math.floor(n * (1 - alpha / 2))],
        };
      }

      // Generate distribution histogram
      const binCount = 50;
      const binWidth = (sorted[sorted.length - 1] - sorted[0]) / binCount;
      const distribution: Array<{ value: number; frequency: number }> = [];
      for (let i = 0; i < binCount; i++) {
        const binStart = sorted[0] + i * binWidth;
        const binEnd = binStart + binWidth;
        const frequency = samples.filter(s => s >= binStart && s < binEnd).length;
        distribution.push({ value: binStart + binWidth / 2, frequency });
      }

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(sorted, percentiles);

      this.simulationResult = {
        iterations: n,
        converged,
        samples,
        statistics,
        percentiles,
        confidenceIntervals,
        distribution,
        convergence,
        riskMetrics,
      };

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: this.simulationResult,
        confidence: converged ? 0.95 : 0.7,
        explanation: `Monte Carlo simulation completed: ${n} iterations, mean=${statistics.mean.toFixed(2)}, stdDev=${statistics.stdDev.toFixed(2)}`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Simulation failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Compute Cholesky decomposition for correlation matrix
   */
  private computeCholeskyDecomposition(): number[][] {
    if (this.correlations.length === 0) {
      return [];
    }

    const varNames = Object.keys(this.variables);
    const n = varNames.length;

    // Build correlation matrix
    const corrMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      corrMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          corrMatrix[i][j] = 1;
        } else {
          const corr = this.correlations.find(
            c => (c.variable1 === varNames[i] && c.variable2 === varNames[j]) ||
                 (c.variable1 === varNames[j] && c.variable2 === varNames[i])
          );
          corrMatrix[i][j] = corr?.coefficient ?? 0;
        }
      }
    }

    // Cholesky decomposition
    const L: number[][] = [];
    for (let i = 0; i < n; i++) {
      L[i] = [];
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }

        if (i === j) {
          L[i][j] = Math.sqrt(corrMatrix[i][i] - sum);
        } else {
          L[i][j] = (corrMatrix[i][j] - sum) / L[j][j];
        }
      }
    }

    return L;
  }

  /**
   * Apply correlation transformation to samples
   */
  private applyCorrelation(
    samples: Record<string, number>,
    cholMatrix: number[][]
  ): Record<string, number> {
    if (cholMatrix.length === 0) {
      return samples;
    }

    const varNames = Object.keys(samples);
    const n = varNames.length;

    // Transform to standard normal
    const standardNormals: number[] = [];
    for (const varName of varNames) {
      standardNormals.push(this.normalCDFInverse(samples[varName]));
    }

    // Apply Cholesky transformation
    const correlated: number[] = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += cholMatrix[i][j] * standardNormals[j];
      }
      correlated.push(sum);
    }

    // Transform back to original distributions
    const result: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      result[varNames[i]] = this.normalCDF(correlated[i]);
    }

    return result;
  }

  /**
   * Sample from a distribution
   */
  private sampleDistribution(dist: Distribution): number {
    const u1 = Math.random();
    const u2 = Math.random();

    switch (dist.type) {
      case DistributionType.NORMAL:
        // Box-Muller transform
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return (dist.params.mean ?? 0) + (dist.params.std ?? 1) * z0;

      case DistributionType.UNIFORM:
        return (dist.params.min ?? 0) + u1 * ((dist.params.max ?? 1) - (dist.params.min ?? 0));

      case DistributionType.TRIANGULAR:
        const min = dist.params.min ?? 0;
        const max = dist.params.max ?? 1;
        const mode = dist.params.mode ?? (min + max) / 2;
        const fc = (mode - min) / (max - min);
        if (u1 < fc) {
          return min + Math.sqrt(u1 * (max - min) * (mode - min));
        } else {
          return max - Math.sqrt((1 - u1) * (max - min) * (max - mode));
        }

      case DistributionType.EXPONENTIAL:
        return -Math.log(1 - u1) / (dist.params.lambda ?? 1);

      case DistributionType.LOGNORMAL:
        const logMean = dist.params.mean ?? 0;
        const logStd = dist.params.std ?? 1;
        const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.exp(logMean + logStd * normalSample);

      case DistributionType.BETA:
        return this.betaSample(dist.params.alpha ?? 1, dist.params.beta ?? 1);

      case DistributionType.GAMMA:
        return this.gammaSample(dist.params.shape ?? 1, dist.params.scale ?? 1);

      case DistributionType.WEIBULL:
        const k = dist.params.shape ?? 1;
        const lambda = dist.params.scale ?? 1;
        return lambda * Math.pow(-Math.log(1 - u1), 1 / k);

      default:
        return u1;
    }
  }

  /**
   * Beta distribution sample
   */
  private betaSample(alpha: number, beta: number): number {
    // Marsaglia and Tsang's method for beta distribution
    const x = this.gammaSample(alpha, 1);
    const y = this.gammaSample(beta, 1);
    return x / (x + y);
  }

  /**
   * Gamma distribution sample
   */
  private gammaSample(shape: number, scale: number): number {
    // Marsaglia and Tsang's method
    if (shape >= 1) {
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);

      while (true) {
        let x, v;
        do {
          x = this.normalSample();
          v = Math.pow(1 + c * x, 3);
        } while (v <= 0);

        const u = Math.random();
        if (u < 1 - 0.0331 * Math.pow(x, 4)) {
          return d * v * scale;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
          return d * v * scale;
        }
      }
    } else {
      // For shape < 1, use gamma(1+shape) * u^(1/shape)
      return this.gammaSample(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
    }
  }

  /**
   * Standard normal sample
   */
  private normalSample(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Normal CDF
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Normal CDF inverse
   */
  private normalCDFInverse(p: number): number {
    // Approximation
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

  /**
   * Check if simulation has converged
   */
  private checkConvergence(convergence: Array<{ iteration: number; mean: number; stdDev: number }>): boolean {
    if (convergence.length < 2) return false;

    const lastMean = convergence[convergence.length - 1].mean;
    const firstMean = convergence[0].mean;
    const relativeChange = Math.abs((lastMean - firstMean) / firstMean);

    return relativeChange < this.convergenceTolerance;
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(samples: number[]): SimulationResult['statistics'] {
    const n = samples.length;
    const mean = this.mean(samples);
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(n / 2)];

    // Mode (most frequent value in bins)
    const binCount = 20;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binWidth = (max - min) / binCount;
    const bins = Array(binCount).fill(0);

    for (const sample of samples) {
      const binIndex = Math.min(Math.floor((sample - min) / binWidth), binCount - 1);
      bins[binIndex]++;
    }

    const modeBin = bins.indexOf(Math.max(...bins));
    const mode = min + (modeBin + 0.5) * binWidth;

    // Skewness and kurtosis
    const skewness = samples.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    const kurtosis = samples.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;

    return {
      mean,
      median,
      mode,
      stdDev,
      variance,
      skewness,
      kurtosis,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      range: max - min,
      coefficientOfVariation: stdDev / mean,
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(
    sorted: number[],
    percentiles: Record<number, number>
  ): SimulationResult['riskMetrics'] {
    const var90 = percentiles[10] ?? 0;
    const var95 = percentiles[5] ?? 0;
    const var99 = percentiles[1] ?? 0;

    // Conditional VaR (expected shortfall)
    const cvar90 = sorted.filter(s => s <= var90).reduce((a, b) => a + b, 0) /
                   sorted.filter(s => s <= var90).length;
    const cvar95 = sorted.filter(s => s <= var95).reduce((a, b) => a + b, 0) /
                   sorted.filter(s => s <= var95).length;
    const cvar99 = sorted.filter(s => s <= var99).reduce((a, b) => a + b, 0) /
                   sorted.filter(s => s <= var99).length;

    const probabilityOfLoss = sorted.filter(s => s < 0).length / sorted.length;
    const expectedShortfall = sorted.filter(s => s < 0).reduce((a, b) => a + b, 0) /
                            Math.max(1, sorted.filter(s => s < 0).length);
    const tailRisk = Math.abs(expectedShortfall);

    return {
      var90,
      var95,
      var99,
      cvar90,
      cvar95,
      cvar99,
      expectedShortfall,
      probabilityOfLoss,
      tailRisk,
    };
  }

  /**
   * Perform sensitivity analysis
   */
  async sensitivityAnalysis(): Promise<CellOutput> {
    if (!this.simulationResult) {
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: 'Run simulation first',
        trace: this.body.trace,
        effects: [],
      };
    }

    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const results: SensitivityAnalysis[] = [];
      const outputs = this.simulationResult.samples;

      // Sample each variable and calculate correlation with output
      for (const [varName, dist] of Object.entries(this.variables)) {
        const variableSamples: number[] = [];

        for (let i = 0; i < 1000; i++) {
          variableSamples.push(this.sampleDistribution(dist));
        }

        // Calculate correlation with output
        const correlation = this.pearsonCorrelation(variableSamples, outputs.slice(0, 1000));

        results.push({
          variable: varName,
          baseValue: dist.params.mean ?? 0,
          correlationWithOutput: correlation,
          standardizedCoefficient: Math.abs(correlation),
          rank: 0,
        });
      }

      // Rank by absolute correlation
      results.sort((a, b) => Math.abs(b.correlationWithOutput) - Math.abs(a.correlationWithOutput));
      results.forEach((r, i) => r.rank = i + 1);

      this.sensitivityAnalysis = results;

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: results,
        confidence: 0.9,
        explanation: `Sensitivity analysis: ${results[0]?.variable} has highest impact`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Sensitivity analysis failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = this.mean(x.slice(0, n));
    const meanY = this.mean(y.slice(0, n));

    let numerator = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumXX += dx * dx;
      sumYY += dy * dy;
    }

    const denominator = Math.sqrt(sumXX * sumYY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get histogram data for visualization
   */
  getHistogramData(binCount?: number): Array<{ value: number; frequency: number; probability: number }> {
    if (!this.simulationResult) return [];

    const bins = binCount ?? 50;
    const samples = this.simulationResult.samples;
    const n = samples.length;

    const sorted = [...samples].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binWidth = (max - min) / bins;

    const histogram: Array<{ value: number; frequency: number; probability: number }> = [];

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const frequency = samples.filter(s => s >= binStart && s < binEnd).length;

      histogram.push({
        value: binStart + binWidth / 2,
        frequency,
        probability: frequency / n,
      });
    }

    return histogram;
  }

  /**
   * Get box plot data
   */
  getBoxPlotData(): {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  } | null {
    if (!this.simulationResult) return null;

    const sorted = [...this.simulationResult.samples].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.50)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const whiskerMin = q1 - 1.5 * iqr;
    const whiskerMax = q3 + 1.5 * iqr;

    const outliers = sorted.filter(s => s < whiskerMin || s > whiskerMax);
    const nonOutliers = sorted.filter(s => s >= whiskerMin && s <= whiskerMax);

    return {
      min: nonOutliers[0],
      q1,
      median,
      q3,
      max: nonOutliers[nonOutliers.length - 1],
      outliers,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    const avg = this.mean(values);
    return Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
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
    // Could learn from feedback to adjust distributions
    this.transitionTo(CellState.DORMANT);
  }

  async deactivate(): Promise<void> {
    this.transitionTo(CellState.DORMANT);
  }

  protected createProcessingLogic(): any {
    return {
      type: 'monte_carlo',
      variables: Object.keys(this.variables).length,
      correlations: this.correlations.length,
    };
  }

  protected async executeProcessing(
    input: any,
    context: any
  ): Promise<any> {
    if (input.action === 'simulate') {
      return this.simulate(input.iterations);
    } else if (input.action === 'sensitivity') {
      return this.sensitivityAnalysis();
    } else {
      return this.simulate();
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getSimulationResult(): SimulationResult | undefined {
    return this.simulationResult;
  }

  getSensitivityAnalysis(): SensitivityAnalysis[] | undefined {
    return this.sensitivityAnalysis;
  }
}
