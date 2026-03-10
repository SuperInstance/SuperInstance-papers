/**
 * POLLN Spreadsheet Integration - RegressionCell
 *
 * Regression analysis and predictive modeling.
 * Uses L2-L3 logic (agent reasoning with LLM support for complex models).
 *
 * Design Philosophy:
 * - DISCOVER RELATIONSHIPS IN DATA
 * - Quantify the strength of associations
 * - Make predictions with uncertainty bounds
 * - Support both simple and complex modeling
 */

import { LogCell, LogCellConfig } from '../../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../../core/types.js';

/**
 * Regression types
 */
export enum RegressionType {
  SIMPLE_LINEAR = 'simple_linear',      // y = mx + b
  MULTIPLE_LINEAR = 'multiple_linear',  // y = b0 + b1*x1 + b2*x2 + ...
  POLYNOMIAL = 'polynomial',            // y = b0 + b1*x + b2*x^2 + ...
  LOGISTIC = 'logistic',                // Binary classification
  RIDGE = 'ridge',                      // L2 regularization
  LASSO = 'lasso',                      // L1 regularization
}

/**
 * Data point for regression
 */
export interface DataPoint {
  x: number | number[];  // Independent variable(s)
  y: number;             // Dependent variable
  weight?: number;       // Optional weight for weighted regression
}

/**
 * Regression model
 */
export interface RegressionModel {
  type: RegressionType;
  coefficients: number[];
  intercept: number;
  featureNames: string[];
  fitted: boolean;
}

/**
 * Regression statistics
 */
export interface RegressionStatistics {
  rSquared: number;           // R-squared
  adjustedRSquared: number;   // Adjusted R-squared
  stdError: number;           // Standard error of the estimate
  fStatistic: number;         // F-statistic
  pValue: number;             // Overall p-value
  observations: number;
  degreesOfFreedom: number;
}

/**
 * Coefficient statistics
 */
export interface CoefficientStats {
  value: number;
  stdError: number;
  tStatistic: number;
  pValue: number;
  confidenceInterval: { lower: number; upper: number };
  vif?: number;  // Variance Inflation Factor (for multicollinearity)
}

/**
 * Diagnostic information
 */
export interface RegressionDiagnostics {
  residuals: number[];
  standardizedResiduals: number[];
  studentizedResiduals: number[];
  leverage: number[];
  cooksDistance: number[];
  influentialPoints: number[];
  normalityTest: {
    statistic: number;
    pValue: number;
    normal: boolean;
  };
  heteroscedasticity: {
    statistic: number;
    pValue: number;
    heteroscedastic: boolean;
  };
}

/**
 * Prediction result
 */
export interface PredictionResult {
  predicted: number;
  standardError: number;
  confidenceInterval: { lower: number; upper: number; level: number };
  predictionInterval: { lower: number; upper: number; level: number };
  residual: number;
}

/**
 * Configuration for RegressionCell
 */
export interface RegressionCellConfig extends LogCellConfig {
  regressionType: RegressionType;
  polynomialDegree?: number;  // For polynomial regression
  regularization?: {          // For ridge/lasso
    lambda: number;
  };
  featureNames?: string[];    // Names of independent variables
}

/**
 * RegressionCell - Regression analysis and predictive modeling
 *
 * The Pattern Finder
 * -----------------
 * RegressionCell discovers and quantifies relationships between variables.
 * It fits mathematical models to data and assesses the strength of
 * associations.
 *
 * Key Capabilities:
 * - Simple/multiple linear regression
 * - Polynomial regression for non-linear relationships
 * - Logistic regression for classification
 * - Regularization (ridge/lasso) for feature selection
 * - Comprehensive diagnostics and model validation
 *
 * This aligns with:
 * - Top-down: Specify model type and assumptions
 * - Bottom-up: Learn patterns from data
 * - The balance between model complexity and interpretability
 *
 * Logic Level: L2-L3 (agent reasoning with potential LLM support)
 */
export class RegressionCell extends LogCell {
  private regressionType: RegressionType;
  private polynomialDegree: number;
  private regularization?: { lambda: number };
  private featureNames: string[];

  private model?: RegressionModel;
  private data: DataPoint[] = [];
  private statistics?: RegressionStatistics;
  private coefficientStats?: Map<string, CoefficientStats>;
  private diagnostics?: RegressionDiagnostics;
  private predictions: PredictionResult[] = [];

  constructor(config: RegressionCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.logicLevel ?? LogicLevel.L2_AGENT,
    });

    this.regressionType = config.regressionType;
    this.polynomialDegree = config.polynomialDegree ?? 2;
    this.regularization = config.regularization;
    this.featureNames = config.featureNames ?? [];
  }

  /**
   * Fit regression model to data
   */
  async fit(data: DataPoint[]): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      if (data.length < 2) {
        throw new Error('Need at least 2 data points for regression');
      }

      this.data = data;

      // Prepare design matrix and response vector
      const { X, y } = this.prepareMatrices(data);

      // Fit the model based on type
      let coefficients: number[];
      let intercept: number;

      switch (this.regressionType) {
        case RegressionType.SIMPLE_LINEAR:
          [coefficients, intercept] = this.fitSimpleLinear(X, y);
          break;

        case RegressionType.MULTIPLE_LINEAR:
          [coefficients, intercept] = this.fitMultipleLinear(X, y);
          break;

        case RegressionType.POLYNOMIAL:
          [coefficients, intercept] = this.fitPolynomial(X, y);
          break;

        case RegressionType.LOGISTIC:
          [coefficients, intercept] = this.fitLogistic(X, y);
          break;

        case RegressionType.RIDGE:
          [coefficients, intercept] = this.fitRidge(X, y);
          break;

        case RegressionType.LASSO:
          [coefficients, intercept] = this.fitLasso(X, y);
          break;

        default:
          throw new Error(`Unknown regression type: ${this.regressionType}`);
      }

      // Create model
      this.model = {
        type: this.regressionType,
        coefficients,
        intercept,
        featureNames: this.featureNames.length > 0 ? this.featureNames :
                    this.regressionType === RegressionType.SIMPLE_LINEAR ? ['x'] :
                    Array.from({ length: coefficients.length }, (_, i) => `x${i + 1}`),
        fitted: true,
      };

      // Calculate statistics
      this.calculateStatistics(X, y);

      // Calculate coefficient statistics
      this.calculateCoefficientStats(X, y);

      // Calculate diagnostics
      this.calculateDiagnostics(X, y);

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: {
          model: this.model,
          statistics: this.statistics,
          coefficientStats: Object.fromEntries(this.coefficientStats ?? []),
          diagnostics: this.diagnostics,
        },
        confidence: this.statistics?.rSquared ?? 0,
        explanation: `Regression fitted: R² = ${(this.statistics?.rSquared ?? 0).toFixed(3)}`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Regression fitting failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Prepare design matrix and response vector
   */
  private prepareMatrices(data: DataPoint[]): { X: number[][]; y: number[] } {
    const X: number[][] = [];
    const y: number[] = [];

    for (const point of data) {
      y.push(point.y);

      if (typeof point.x === 'number') {
        // Simple regression
        X.push([point.x]);
      } else {
        // Multiple regression
        X.push(point.x);
      }
    }

    return { X, y };
  }

  /**
   * Fit simple linear regression (y = mx + b)
   */
  private fitSimpleLinear(X: number[][], y: number[]): [number[], number] {
    const n = X.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += X[i][0];
      sumY += y[i];
      sumXY += X[i][0] * y[i];
      sumX2 += X[i][0] * X[i][0];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return [[slope], intercept];
  }

  /**
   * Fit multiple linear regression using normal equations
   */
  private fitMultipleLinear(X: number[][], y: number[]): [number[], number] {
    const n = X.length;
    const p = X[0].length;

    // Add intercept column
    const XWithIntercept = X.map(row => [1, ...row]);

    // X'X
    const XtX: number[][] = [];
    for (let i = 0; i <= p; i++) {
      XtX[i] = [];
      for (let j = 0; j <= p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += XWithIntercept[k][i] * XWithIntercept[k][j];
        }
        XtX[i][j] = sum;
      }
    }

    // X'y
    const Xty: number[] = [];
    for (let i = 0; i <= p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += XWithIntercept[k][i] * y[k];
      }
      Xty.push(sum);
    }

    // Solve (X'X)^{-1} X'y using Gaussian elimination
    const coefficients = this.gaussianElimination(XtX, Xty);

    const intercept = coefficients[0];
    const slopes = coefficients.slice(1);

    return [slopes, intercept];
  }

  /**
   * Fit polynomial regression
   */
  private fitPolynomial(X: number[][], y: number[]): [number[], number] {
    // Transform X to polynomial features
    const XPoly: number[][] = [];
    for (const row of X) {
      const polyRow: number[] = [];
      const x = row[0];  // Use first feature
      for (let d = 1; d <= this.polynomialDegree; d++) {
        polyRow.push(Math.pow(x, d));
      }
      XPoly.push(polyRow);
    }

    return this.fitMultipleLinear(XPoly, y);
  }

  /**
   * Fit logistic regression using gradient descent
   */
  private fitLogistic(X: number[][], y: number[]): [number[], number] {
    const n = X.length;
    const p = X[0].length;
    const learningRate = 0.01;
    const maxIterations = 1000;

    // Initialize coefficients
    let coefficients = [0, ...Array(p).fill(0)];

    // Gradient descent
    for (let iter = 0; iter < maxIterations; iter++) {
      const gradients = [0, ...Array(p).fill(0)];

      for (let i = 0; i < n; i++) {
        const xi = [1, ...X[i]];
        const z = coefficients.reduce((sum, coeff, j) => sum + coeff * xi[j], 0);
        const pred = this.sigmoid(z);
        const error = pred - y[i];

        for (let j = 0; j <= p; j++) {
          gradients[j] += error * xi[j];
        }
      }

      // Update coefficients
      for (let j = 0; j <= p; j++) {
        coefficients[j] -= learningRate * gradients[j] / n;
      }
    }

    const intercept = coefficients[0];
    const slopes = coefficients.slice(1);

    return [slopes, intercept];
  }

  /**
   * Fit ridge regression (L2 regularization)
   */
  private fitRidge(X: number[][], y: number[]): [number[], number] {
    const lambda = this.regularization?.lambda ?? 1.0;
    const n = X.length;
    const p = X[0].length;

    // Add intercept column
    const XWithIntercept = X.map(row => [1, ...row]);

    // X'X + lambda*I (except for intercept)
    const XtX: number[][] = [];
    for (let i = 0; i <= p; i++) {
      XtX[i] = [];
      for (let j = 0; j <= p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += XWithIntercept[k][i] * XWithIntercept[k][j];
        }
        // Add regularization (skip intercept)
        if (i > 0 && i === j) {
          sum += lambda;
        }
        XtX[i][j] = sum;
      }
    }

    // X'y
    const Xty: number[] = [];
    for (let i = 0; i <= p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += XWithIntercept[k][i] * y[k];
      }
      Xty.push(sum);
    }

    const coefficients = this.gaussianElimination(XtX, Xty);

    const intercept = coefficients[0];
    const slopes = coefficients.slice(1);

    return [slopes, intercept];
  }

  /**
   * Fit lasso regression (L1 regularization) using coordinate descent
   */
  private fitLasso(X: number[][], y: number[]): [number[], number] {
    const lambda = this.regularization?.lambda ?? 1.0;
    const n = X.length;
    const p = X[0].length;
    const maxIterations = 1000;
    const tolerance = 1e-6;

    // Standardize features
    const XMean = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / n);
    const XStd = X[0].map((_, j) =>
      Math.sqrt(X.reduce((sum, row) => sum + Math.pow(row[j] - XMean[j], 2), 0) / n)
    );

    const XStdized = X.map(row =>
      row.map((val, j) => XStd[j] > 0 ? (val - XMean[j]) / XStd[j] : 0)
    );

    // Initialize coefficients
    let coefficients = Array(p).fill(0);

    // Coordinate descent
    for (let iter = 0; iter < maxIterations; iter++) {
      const oldCoeffs = [...coefficients];

      for (let j = 0; j < p; j++) {
        // Calculate residual without j-th feature
        let residual = y.map((yi, i) =>
          yi - coefficients.reduce((sum, coeff, k) =>
            k !== j ? sum + coeff * XStdized[i][k] : sum, 0
          )
        );

        // Soft threshold
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += XStdized[i][j] * residual[i];
        }

        const rho = sum / n;

        if (rho > lambda) {
          coefficients[j] = (rho - lambda) / XStd[j];
        } else if (rho < -lambda) {
          coefficients[j] = (rho + lambda) / XStd[j];
        } else {
          coefficients[j] = 0;
        }
      }

      // Check convergence
      const maxChange = Math.max(...coefficients.map((coeff, i) =>
        Math.abs(coeff - oldCoeffs[i])
      ));

      if (maxChange < tolerance) {
        break;
      }
    }

    // Calculate intercept
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    let intercept = yMean;
    for (let j = 0; j < p; j++) {
      intercept -= coefficients[j] * XMean[j];
    }

    return [coefficients, intercept];
  }

  /**
   * Sigmoid function for logistic regression
   */
  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Gaussian elimination for solving linear systems
   */
  private gaussianElimination(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  }

  /**
   * Calculate regression statistics
   */
  private calculateStatistics(X: number[][], y: number[]): void {
    const n = y.length;
    const p = X[0].length;

    // Calculate predictions
    const predictions = this.predictArray(X);

    // Calculate residuals
    const residuals = y.map((yi, i) => yi - predictions[i]);

    // Sum of squares
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
    const ssReg = ssTot - ssRes;

    // R-squared
    const rSquared = 1 - ssRes / ssTot;

    // Adjusted R-squared
    const adjustedRSquared = 1 - (1 - rSquared) * (n - 1) / (n - p - 1);

    // Standard error
    const stdError = Math.sqrt(ssRes / (n - p - 1));

    // F-statistic
    const fStatistic = (ssReg / p) / (ssRes / (n - p - 1));

    // Degrees of freedom
    const dfReg = p;
    const dfRes = n - p - 1;

    // Simplified p-value (would use F-distribution in practice)
    const pValue = 1 - this.fDistributionCDF(fStatistic, dfReg, dfRes);

    this.statistics = {
      rSquared,
      adjustedRSquared,
      stdError,
      fStatistic,
      pValue,
      observations: n,
      degreesOfFreedom: dfRes,
    };
  }

  /**
   * F-distribution CDF (simplified approximation)
   */
  private fDistributionCDF(f: number, df1: number, df2: number): number {
    // Simplified - would use proper F-distribution in practice
    return Math.min(1, f / (f + df2 / df1));
  }

  /**
   * Calculate coefficient statistics
   */
  private calculateCoefficientStats(X: number[][], y: number[]): void {
    if (!this.model) return;

    const n = y.length;
    const p = X[0].length;
    const predictions = this.predictArray(X);
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (n - p - 1);

    this.coefficientStats = new Map();

    for (let i = 0; i < this.model.coefficients.length; i++) {
      const coeff = this.model.coefficients[i];

      // Standard error (simplified)
      const stdError = Math.sqrt(mse / n);

      // t-statistic
      const tStatistic = coeff / stdError;

      // p-value (simplified)
      const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));

      // Confidence interval
      const confidenceLevel = 0.95;
      const z = this.normalInverse(1 - (1 - confidenceLevel) / 2);
      const margin = z * stdError;

      const stats: CoefficientStats = {
        value: coeff,
        stdError,
        tStatistic,
        pValue,
        confidenceInterval: {
          lower: coeff - margin,
          upper: coeff + margin,
        },
      };

      this.coefficientStats.set(this.model.featureNames[i] || `x${i + 1}`, stats);
    }
  }

  /**
   * Normal CDF (approximation)
   */
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

  /**
   * Normal inverse (approximation)
   */
  private normalInverse(p: number): number {
    // Beasley-Springer-Moro approximation
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
    const d = [7.784695709041462e-03, 3.224671290700398e-01,
               2.445134137142996e+00, 3.754408661907416e+00];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r: number;

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
   * Calculate diagnostic information
   */
  private calculateDiagnostics(X: number[][], y: number[]): void {
    const predictions = this.predictArray(X);
    const residuals = y.map((yi, i) => yi - predictions[i]);

    // Standardized residuals
    const residualStd = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
    );
    const standardizedResiduals = residuals.map(r => r / residualStd);

    // Leverage (simplified)
    const n = X.length;
    const p = X[0].length;
    const leverage = X.map(() => (p + 1) / n);

    // Cook's distance (simplified)
    const cooksDistance = residuals.map((r, i) =>
      (r * r) / (residualStd * residualStd) * leverage[i] / (1 - leverage[i])
    );

    // Influential points (Cook's distance > 4/n)
    const influentialPoints = cooksDistance
      .map((d, i) => d > 4 / n ? i : -1)
      .filter(i => i >= 0);

    // Normality test (Shapiro-Wilk approximation)
    const sortedResiduals = [...residuals].sort((a, b) => a - b);
    const normalityTest = this.shapiroWilkTest(sortedResiduals);

    // Heteroscedasticity test (Breusch-Pagan approximation)
    const heteroscedasticity = this.breuschPaganTest(residuals, predictions);

    this.diagnostics = {
      residuals,
      standardizedResiduals,
      studentizedResiduals: standardizedResiduals,  // Simplified
      leverage,
      cooksDistance,
      influentialPoints,
      normalityTest,
      heteroscedasticity,
    };
  }

  /**
   * Shapiro-Wilk normality test (simplified)
   */
  private shapiroWilkTest(sortedData: number[]): {
    statistic: number;
    pValue: number;
    normal: boolean;
  } {
    const n = sortedData.length;

    // Simplified - would use proper Shapiro-Wilk coefficients in practice
    const mean = sortedData.reduce((sum, val) => sum + val, 0) / n;
    const variance = sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Correlation with normal distribution
    let correlation = 0;
    for (let i = 0; i < n; i++) {
      const expected = this.normalInverse((i + 0.5) / n) * stdDev + mean;
      correlation += (sortedData[i] - mean) * (expected - mean);
    }

    const ss = sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const ssExpected = sortedData.reduce((sum, val) => {
      const expected = this.normalInverse((sortedData.indexOf(val) + 0.5) / n) * stdDev + mean;
      return sum + Math.pow(expected - mean, 2);
    }, 0);

    const statistic = ss > 0 && ssExpected > 0 ? correlation / Math.sqrt(ss * ssExpected) : 0;
    const pValue = 1 - this.normalCDF(statistic);
    const normal = statistic > 0.95;  // Common threshold

    return { statistic, pValue, normal };
  }

  /**
   * Breusch-Pagan heteroscedasticity test (simplified)
   */
  private breuschPaganTest(residuals: number[], fitted: number[]): {
    statistic: number;
    pValue: number;
    heteroscedastic: boolean;
  } {
    const n = residuals.length;

    // Regress squared residuals on fitted values
    const squaredResiduals = residuals.map(r => r * r);
    const meanSquared = squaredResiduals.reduce((sum, val) => sum + val, 0) / n;

    let ss = 0;
    for (let i = 0; i < n; i++) {
      ss += Math.pow(squaredResiduals[i] - meanSquared, 2);
    }

    // Simplified test statistic
    const statistic = n * (residuals.reduce((sum, r) => sum + r * r, 0) /
                           squaredResiduals.reduce((sum, r) => sum + r, 0));

    const pValue = 1 - this.chiSquareCDF(statistic, 1);
    const heteroscedastic = pValue < 0.05;

    return { statistic, pValue, heteroscedastic };
  }

  /**
   * Chi-square CDF (simplified)
   */
  private chiSquareCDF(x: number, df: number): number {
    // Simplified - would use proper chi-square distribution in practice
    return Math.min(1, x / (x + df));
  }

  /**
   * Make predictions for multiple data points
   */
  private predictArray(X: number[][]): number[] {
    if (!this.model) return [];

    return X.map(xi => this.predictSingle(xi));
  }

  /**
   * Make a single prediction
   */
  private predictSingle(xi: number[]): number {
    if (!this.model) return 0;

    let prediction = this.model.intercept;

    for (let i = 0; i < this.model.coefficients.length; i++) {
      prediction += this.model.coefficients[i] * xi[i];
    }

    // For logistic regression, apply sigmoid
    if (this.regressionType === RegressionType.LOGISTIC) {
      prediction = this.sigmoid(prediction);
    }

    return prediction;
  }

  /**
   * Predict with confidence intervals
   */
  async predict(x: number | number[]): Promise<CellOutput> {
    if (!this.model) {
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: 'Model not fitted',
        trace: this.body.trace,
        effects: [],
      };
    }

    try {
      this.state = CellState.PROCESSING;

      const xi = typeof x === 'number' ? [x] : x;
      const predicted = this.predictSingle(xi);

      // Calculate prediction interval (simplified)
      const stdError = this.statistics?.stdError ?? 1;
      const tValue = 1.96;  // Approximate for 95% CI
      const margin = tValue * stdError;

      const result: PredictionResult = {
        predicted,
        standardError: stdError,
        confidenceInterval: {
          lower: predicted - margin,
          upper: predicted + margin,
          level: 0.95,
        },
        predictionInterval: {
          lower: predicted - 2 * margin,
          upper: predicted + 2 * margin,
          level: 0.95,
        },
        residual: 0,  // Unknown without actual y value
      };

      this.predictions.push(result);

      this.state = CellState.EMITTING;

      return {
        success: true,
        value: result,
        confidence: this.statistics?.rSquared ?? 0,
        explanation: `Prediction: ${predicted.toFixed(2)} (95% CI: [${result.confidenceInterval.lower.toFixed(2)}, ${result.confidenceInterval.upper.toFixed(2)}])`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Prediction failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Get regression equation as string
   */
  getEquation(): string {
    if (!this.model) return 'Not fitted';

    const coeffs = this.model.coefficients;
    const intercept = this.model.intercept;
    const names = this.model.featureNames;

    let equation = `y = ${intercept.toFixed(4)}`;

    for (let i = 0; i < coeffs.length; i++) {
      const sign = coeffs[i] >= 0 ? '+' : '-';
      const absCoeff = Math.abs(coeffs[i]);
      equation += ` ${sign} ${absCoeff.toFixed(4)}*${names[i]}`;
    }

    return equation;
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
      type: 'regression',
      regressionType: this.regressionType,
      polynomialDegree: this.polynomialDegree,
    };
  }

  protected async executeProcessing(
    input: any,
    context: any
  ): Promise<any> {
    if (input.action === 'fit') {
      return this.fit(input.data);
    } else if (input.action === 'predict') {
      return this.predict(input.x);
    } else {
      return this.fit(input.data ?? []);
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getModel(): RegressionModel | undefined {
    return this.model;
  }

  getStatistics(): RegressionStatistics | undefined {
    return this.statistics;
  }

  getCoefficientStats(): Map<string, CoefficientStats> | undefined {
    return this.coefficientStats;
  }

  getDiagnostics(): RegressionDiagnostics | undefined {
    return this.diagnostics;
  }

  getPredictions(): PredictionResult[] {
    return [...this.predictions];
  }
}
