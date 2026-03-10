/**
 * POLLN Spreadsheet Integration - Analytics Cells Index
 *
 * Exports all advanced analytics cell types for use in the spreadsheet system.
 *
 * Analytics Cells provide sophisticated analytical capabilities including:
 * - What-if scenario modeling and Monte Carlo simulation
 * - Linear and integer programming optimization
 * - Regression analysis and predictive modeling
 * - Time series analysis and forecasting
 * - Monte Carlo simulation and risk analysis
 */

// WhatIfCell - Scenario modeling and sensitivity analysis
export {
  WhatIfCell,
  WhatIfCellConfig,
  ScenarioType,
  Scenario,
  VariableChange,
  SensitivityResult,
  GoalSeekResult,
  MonteCarloResult,
} from './WhatIfCell.js';

// OptimizationCell - Linear and integer programming
export {
  OptimizationCell,
  OptimizationCellConfig,
  OptimizationType,
  Constraint,
  ObjectiveFunction,
  Variable,
  OptimizationSolution,
  MultiObjectiveSolution,
} from './OptimizationCell.js';

// RegressionCell - Regression analysis and predictive modeling
export {
  RegressionCell,
  RegressionCellConfig,
  RegressionType,
  DataPoint,
  RegressionModel,
  RegressionStatistics,
  CoefficientStats,
  RegressionDiagnostics,
  PredictionResult,
} from './RegressionCell.js';

// TimeSeriesCell - Time series analysis and forecasting
export {
  TimeSeriesCell,
  TimeSeriesCellConfig,
  TimeSeriesModel,
  TimeSeriesPoint,
  SeasonalDecomposition,
  ARIMAParams,
  ForecastResult,
  AnomalyResult,
  TrendAnalysis,
} from './TimeSeriesCell.js';

// MonteCarloCell - Monte Carlo simulation and risk analysis
export {
  MonteCarloCell,
  MonteCarloCellConfig,
  DistributionType,
  Distribution,
  Correlation,
  SimulationResult,
  SensitivityAnalysis,
} from './MonteCarloCell.js';

// Re-export core types
export type {
  CellId,
  CellType,
  CellPosition,
  CellState,
  LogicLevel,
  CellOutput,
  LogCellConfig,
} from '../../core/types.js';

export { LogCell } from '../../core/LogCell.js';
