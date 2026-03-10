/**
 * POLLN Spreadsheet Integration - WhatIfCell
 *
 * What-if scenario modeling and analysis.
 * Uses L2-L3 logic (agent reasoning with LLM support for complex scenarios).
 *
 * Design Philosophy:
 * - EXPLORE POSSIBILITIES BEFORE COMMITTING
 * - Understand the impact of changes before making them
 * - Model uncertainty systematically
 * - Support decision-making under uncertainty
 */

import { LogCell, LogCellConfig } from '../../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput, ReasoningStepType } from '../../core/types.js';

/**
 * Scenario types for what-if analysis
 */
export enum ScenarioType {
  BASE = 'base',                   // Base case scenario
  BEST = 'best',                   // Best case scenario
  WORST = 'worst',                 // Worst case scenario
  CUSTOM = 'custom',               // Custom scenario
  SENSITIVITY = 'sensitivity',     // Sensitivity analysis
  GOAL_SEEK = 'goal_seek',         // Goal seeking
  MONTE_CARLO = 'monte_carlo',     // Monte Carlo simulation
}

/**
 * Variable change for scenario modeling
 */
export interface VariableChange {
  name: string;
  baseValue: number;
  newValue: number;
  changeType: 'absolute' | 'percentage';
  impact?: number;  // Calculated impact on output
}

/**
 * Scenario definition
 */
export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  changes: VariableChange[];
  result?: number;
  timestamp: number;
}

/**
 * Sensitivity analysis result
 */
export interface SensitivityResult {
  variable: string;
  baseValue: number;
  impacts: Array<{
    change: number;
    newValue: number;
    output: number;
    sensitivity: number;  // Change in output per unit change
  }>;
  elasticity: number;  // Percentage change in output / percentage change in input
  tornadoData: {
    low: number;
    high: number;
    base: number;
  };
}

/**
 * Goal seek result
 */
export interface GoalSeekResult {
  targetValue: number;
  achievedValue: number;
  variableAdjusted: string;
  requiredValue: number;
  iterations: number;
  converged: boolean;
  path: Array<{ iteration: number; value: number; output: number }>;
}

/**
 * Monte Carlo simulation result
 */
export interface MonteCarloResult {
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<number, number>;  // 5, 25, 50, 75, 95
  confidenceIntervals: Record<number, { lower: number; upper: number }>;  // 90%, 95%, 99%
  distribution: Array<{ value: number; frequency: number }>;
  convergence: Array<{ iteration: number; mean: number }>;
  riskMetrics: {
    var95: number;  // Value at Risk at 95% confidence
    cvar95: number; // Conditional VaR at 95% confidence
    probabilityOfLoss: number;
  };
}

/**
 * Configuration for WhatIfCell
 */
export interface WhatIfCellConfig extends LogCellConfig {
  // Formula or function to model
  formula: (variables: Record<string, number>) => number;
  // Variables in the model
  variables: string[];
  // Base case values
  baseValues: Record<string, number>;
  // Variable constraints (optional)
  constraints?: Record<string, { min?: number; max?: number }>;
}

/**
 * WhatIfCell - What-if scenario analysis and modeling
 *
 * The Explorer
 * -----------
 * WhatIfCell explores alternative futures by systematically varying inputs
 * and observing their effects on outputs. It's about understanding the
 * sensitivity of outcomes to changes in assumptions.
 *
 * Key Capabilities:
 * - Scenario modeling: best, worst, base cases
 * - Sensitivity analysis: tornado charts, variable impact
 * - Goal seeking: find input for desired output
 * - Monte Carlo: probabilistic simulation with 10K+ iterations
 *
 * This aligns with:
 * - Top-down: Setting explicit scenarios to test
 * - Bottom-up: Building understanding from systematic exploration
 * - The balance between analysis and action
 *
 * Logic Level: L2-L3 (agent reasoning with potential LLM support)
 */
export class WhatIfCell extends LogCell {
  private formula: (variables: Record<string, number>) => number;
  private variables: string[];
  private baseValues: Record<string, number>;
  private constraints?: Record<string, { min?: number; max?: number }>;

  private scenarios: Scenario[] = [];
  private sensitivityResults: Map<string, SensitivityResult> = new Map();
  private monteCarloResult?: MonteCarloResult;
  private goalSeekResult?: GoalSeekResult;

  constructor(config: WhatIfCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.logicLevel ?? LogicLevel.L2_AGENT,
    });

    this.formula = config.formula;
    this.variables = config.variables;
    this.baseValues = config.baseValues;
    this.constraints = config.constraints;

    // Create base scenario
    this.scenarios.push({
      id: 'base',
      name: 'Base Case',
      type: ScenarioType.BASE,
      changes: Object.entries(this.baseValues).map(([name, value]) => ({
        name,
        baseValue: value,
        newValue: value,
        changeType: 'absolute',
      })),
      result: this.formula(this.baseValues),
      timestamp: Date.now(),
    });
  }

  /**
   * Create a custom scenario
   */
  async createScenario(
    name: string,
    changes: Record<string, { value: number; type?: 'absolute' | 'percentage' }>
  ): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const variableChanges: VariableChange[] = [];
      const newValues = { ...this.baseValues };

      // Apply changes
      for (const [varName, change] of Object.entries(changes)) {
        if (!this.variables.includes(varName)) {
          throw new Error(`Unknown variable: ${varName}`);
        }

        const baseValue = this.baseValues[varName];
        const changeType = change.type ?? 'absolute';
        let newValue: number;
        let impact: number;

        if (changeType === 'percentage') {
          newValue = baseValue * (1 + change.value / 100);
        } else {
          newValue = change.value;
        }

        // Check constraints
        if (this.constraints?.[varName]) {
          const constraint = this.constraints[varName];
          if (constraint.min !== undefined && newValue < constraint.min) {
            throw new Error(`Value ${newValue} for ${varName} below minimum ${constraint.min}`);
          }
          if (constraint.max !== undefined && newValue > constraint.max) {
            throw new Error(`Value ${newValue} for ${varName} above maximum ${constraint.max}`);
          }
        }

        newValues[varName] = newValue;
        variableChanges.push({
          name: varName,
          baseValue,
          newValue,
          changeType,
        });
      }

      // Calculate result
      const result = this.formula(newValues);

      // Calculate impacts
      const baseResult = this.scenarios.find(s => s.type === ScenarioType.BASE)?.result ?? 0;
      variableChanges.forEach(change => {
        change.impact = result - baseResult;
      });

      // Create scenario
      const scenario: Scenario = {
        id: `scenario_${Date.now()}`,
        name,
        type: ScenarioType.CUSTOM,
        changes: variableChanges,
        result,
        timestamp: Date.now(),
      };

      this.scenarios.push(scenario);

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: scenario,
        confidence: 1.0,
        explanation: `Scenario "${name}" created with result: ${result.toFixed(2)}`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Scenario creation failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Generate best and worst case scenarios
   */
  async generateBestWorstCases(): Promise<CellOutput> {
    try {
      this.state = CellState.PROCESSING;

      // Best case: maximize each variable within constraints
      const bestValues: Record<string, number> = {};
      for (const varName of this.variables) {
        const constraint = this.constraints?.[varName];
        bestValues[varName] = constraint?.max ?? this.baseValues[varName] * 1.2;
      }

      // Worst case: minimize each variable within constraints
      const worstValues: Record<string, number> = {};
      for (const varName of this.variables) {
        const constraint = this.constraints?.[varName];
        worstValues[varName] = constraint?.min ?? this.baseValues[varName] * 0.8;
      }

      // Create best case
      const bestResult = await this.createScenario('Best Case',
        Object.fromEntries(
          Object.entries(bestValues).map(([k, v]) => [k, { value: v, type: 'absolute' as const }])
        )
      );

      // Create worst case
      const worstResult = await this.createScenario('Worst Case',
        Object.fromEntries(
          Object.entries(worstValues).map(([k, v]) => [k, { value: v, type: 'absolute' as const }])
        )
      );

      return {
        success: true,
        value: {
          bestCase: bestResult.value,
          worstCase: worstResult.value,
        },
        confidence: 0.9,
        explanation: 'Generated best and worst case scenarios',
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Failed to generate scenarios',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Perform sensitivity analysis
   */
  async sensitivityAnalysis(
    variablePercentages: number[] = [-20, -10, -5, 0, 5, 10, 20]
  ): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      const results: Map<string, SensitivityResult> = new Map();
      const baseResult = this.formula(this.baseValues);

      for (const varName of this.variables) {
        const baseValue = this.baseValues[varName];
        const impacts: Array<{
          change: number;
          newValue: number;
          output: number;
          sensitivity: number;
        }> = [];

        const outputs: number[] = [];

        for (const percent of variablePercentages) {
          const newValues = { ...this.baseValues };
          newValues[varName] = baseValue * (1 + percent / 100);
          const output = this.formula(newValues);

          outputs.push(output);

          const sensitivity = percent !== 0
            ? (output - baseResult) / (baseValue * percent / 100)
            : 0;

          impacts.push({
            change: percent,
            newValue: newValues[varName],
            output,
            sensitivity,
          });
        }

        // Calculate elasticity (percentage change in output / percentage change in input)
        const percentChange = variablePercentages[variablePercentages.length - 1] ?? 10;
        const outputChange = outputs[outputs.length - 1] ?? baseResult;
        const elasticity = percentChange !== 0
          ? ((outputChange - baseResult) / baseResult) / (percentChange / 100)
          : 0;

        // Tornado chart data
        const lowOutput = Math.min(...outputs);
        const highOutput = Math.max(...outputs);

        results.set(varName, {
          variable: varName,
          baseValue,
          impacts,
          elasticity,
          tornadoData: {
            low: lowOutput,
            high: highOutput,
            base: baseResult,
          },
        });
      }

      this.sensitivityResults = results;

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: Object.fromEntries(results),
        confidence: 0.95,
        explanation: 'Sensitivity analysis completed',
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
   * Goal seeking: find input value for desired output
   */
  async goalSeek(
    targetVariable: string,
    targetOutput: number,
    tolerance: number = 0.01,
    maxIterations: number = 100
  ): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      if (!this.variables.includes(targetVariable)) {
        throw new Error(`Unknown variable: ${targetVariable}`);
      }

      let lower = this.constraints?.[targetVariable]?.min ?? this.baseValues[targetVariable] * 0.5;
      let upper = this.constraints?.[targetVariable]?.max ?? this.baseValues[targetVariable] * 1.5;

      const path: Array<{ iteration: number; value: number; output: number }> = [];
      let converged = false;
      let finalValue = lower;

      for (let i = 0; i < maxIterations; i++) {
        const guess = (lower + upper) / 2;
        const testValues = { ...this.baseValues };
        testValues[targetVariable] = guess;
        const output = this.formula(testValues);

        path.push({ iteration: i, value: guess, output });

        if (Math.abs(output - targetOutput) < tolerance) {
          converged = true;
          finalValue = guess;
          break;
        }

        if (output < targetOutput) {
          lower = guess;
        } else {
          upper = guess;
        }
      }

      const finalValues = { ...this.baseValues };
      finalValues[targetVariable] = finalValue;
      const achievedOutput = this.formula(finalValues);

      const result: GoalSeekResult = {
        targetValue: targetOutput,
        achievedValue: achievedOutput,
        variableAdjusted: targetVariable,
        requiredValue: finalValue,
        iterations: path.length,
        converged,
        path,
      };

      this.goalSeekResult = result;

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: result,
        confidence: converged ? 0.95 : 0.5,
        explanation: converged
          ? `Goal seek converged: ${targetVariable} = ${finalValue.toFixed(2)} achieves ${achievedOutput.toFixed(2)}`
          : `Goal seek did not converge within ${maxIterations} iterations`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Goal seek failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Monte Carlo simulation
   */
  async monteCarloSimulation(
    iterations: number = 10000,
    distributions?: Record<string, {
      type: 'normal' | 'uniform' | 'triangular';
      mean?: number;
      std?: number;
      min?: number;
      max?: number;
      mode?: number;
    }>
  ): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      // Default distributions (normal with 10% std dev)
      const defaultDistributions: Record<string, any> = {};
      for (const varName of this.variables) {
        defaultDistributions[varName] = {
          type: 'normal',
          mean: this.baseValues[varName],
          std: this.baseValues[varName] * 0.1,
        };
      }

      const simDistributions = distributions ?? defaultDistributions;

      // Run simulation
      const results: number[] = [];
      const convergence: Array<{ iteration: number; mean: number }> = [];

      for (let i = 0; i < iterations; i++) {
        const sampleValues: Record<string, number> = {};

        for (const varName of this.variables) {
          const dist = simDistributions[varName];
          sampleValues[varName] = this.sampleDistribution(dist);
        }

        const result = this.formula(sampleValues);
        results.push(result);

        // Track convergence every 100 iterations
        if (i % 100 === 0) {
          const currentMean = results.reduce((a, b) => a + b, 0) / results.length;
          convergence.push({ iteration: i, mean: currentMean });
        }
      }

      // Calculate statistics
      const sorted = [...results].sort((a, b) => a - b);
      const sum = results.reduce((a, b) => a + b, 0);
      const mean = sum / iterations;
      const variance = results.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / iterations;
      const stdDev = Math.sqrt(variance);

      // Percentiles
      const percentiles: Record<number, number> = {
        5: sorted[Math.floor(iterations * 0.05)],
        25: sorted[Math.floor(iterations * 0.25)],
        50: sorted[Math.floor(iterations * 0.50)],
        75: sorted[Math.floor(iterations * 0.75)],
        95: sorted[Math.floor(iterations * 0.95)],
      };

      // Confidence intervals
      const confidenceIntervals: Record<number, { lower: number; upper: number }> = {
        90: {
          lower: sorted[Math.floor(iterations * 0.05)],
          upper: sorted[Math.floor(iterations * 0.95)],
        },
        95: {
          lower: sorted[Math.floor(iterations * 0.025)],
          upper: sorted[Math.floor(iterations * 0.975)],
        },
        99: {
          lower: sorted[Math.floor(iterations * 0.005)],
          upper: sorted[Math.floor(iterations * 0.995)],
        },
      };

      // Distribution histogram
      const binCount = 50;
      const binWidth = (sorted[sorted.length - 1] - sorted[0]) / binCount;
      const distribution: Array<{ value: number; frequency: number }> = [];
      for (let i = 0; i < binCount; i++) {
        const binStart = sorted[0] + i * binWidth;
        const binEnd = binStart + binWidth;
        const frequency = results.filter(r => r >= binStart && r < binEnd).length;
        distribution.push({ value: binStart + binWidth / 2, frequency });
      }

      // Risk metrics
      const var95 = percentiles[5];
      const cvar95 = results.filter(r => r <= var95).reduce((a, b) => a + b, 0) /
                     results.filter(r => r <= var95).length;
      const probabilityOfLoss = results.filter(r => r < 0).length / iterations;

      const monteCarloResult: MonteCarloResult = {
        iterations,
        mean,
        median: percentiles[50],
        stdDev,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        percentiles,
        confidenceIntervals,
        distribution,
        convergence,
        riskMetrics: {
          var95,
          cvar95,
          probabilityOfLoss,
        },
      };

      this.monteCarloResult = monteCarloResult;

      this.state = CellState.EMITTING;

      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(true, duration);

      return {
        success: true,
        value: monteCarloResult,
        confidence: 0.99,
        explanation: `Monte Carlo simulation completed: ${iterations} iterations, mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}`,
        trace: this.body.trace,
        effects: [],
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Monte Carlo simulation failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Sample from a probability distribution
   */
  private sampleDistribution(dist: {
    type: 'normal' | 'uniform' | 'triangular';
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
  }): number {
    const u1 = Math.random();
    const u2 = Math.random();

    switch (dist.type) {
      case 'normal':
        // Box-Muller transform
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return (dist.mean ?? 0) + (dist.std ?? 1) * z0;

      case 'uniform':
        return (dist.min ?? 0) + u1 * ((dist.max ?? 1) - (dist.min ?? 0));

      case 'triangular':
        const min = dist.min ?? 0;
        const max = dist.max ?? 1;
        const mode = dist.mode ?? (min + max) / 2;
        const fc = (mode - min) / (max - min);
        const u = u1;
        if (u < fc) {
          return min + Math.sqrt(u * (max - min) * (mode - min));
        } else {
          return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }

      default:
        return dist.mean ?? 0;
    }
  }

  /**
   * Compare scenarios
   */
  compareScenarios(scenarioIds: string[]): Record<string, any> {
    const scenarios = this.scenarios.filter(s => scenarioIds.includes(s.id));

    return {
      scenarios: scenarios.map(s => ({
        name: s.name,
        result: s.result,
        changes: s.changes,
      })),
      range: {
        min: Math.min(...scenarios.map(s => s.result ?? 0)),
        max: Math.max(...scenarios.map(s => s.result ?? 0)),
        spread: Math.max(...scenarios.map(s => s.result ?? 0)) -
                Math.min(...scenarios.map(s => s.result ?? 0)),
      },
    };
  }

  /**
   * Get tornado chart data for visualization
   */
  getTornadoData(): Array<{
    variable: string;
    low: number;
    high: number;
    base: number;
    range: number;
  }> {
    const data: Array<{
      variable: string;
      low: number;
      high: number;
      base: number;
      range: number;
    }> = [];

    for (const [varName, result] of this.sensitivityResults) {
      data.push({
        variable: varName,
        low: result.tornadoData.low,
        high: result.tornadoData.high,
        base: result.tornadoData.base,
        range: result.tornadoData.high - result.tornadoData.low,
      });
    }

    // Sort by range (largest impact first)
    return data.sort((a, b) => b.range - a.range);
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
    // Could learn from feedback to adjust base values or constraints
    this.transitionTo(CellState.DORMANT);
  }

  async deactivate(): Promise<void> {
    this.transitionTo(CellState.DORMANT);
  }

  protected createProcessingLogic(): any {
    return {
      type: 'what_if',
      formula: this.formula,
      variables: this.variables,
    };
  }

  protected async executeProcessing(
    input: any,
    context: any
  ): Promise<any> {
    // Dispatch based on input type
    if (input.type === 'scenario') {
      return this.createScenario(input.name, input.changes);
    } else if (input.type === 'sensitivity') {
      return this.sensitivityAnalysis(input.percentages);
    } else if (input.type === 'goal_seek') {
      return this.goalSeek(input.variable, input.target, input.tolerance);
    } else if (input.type === 'monte_carlo') {
      return this.monteCarloSimulation(input.iterations, input.distributions);
    } else {
      // Default: evaluate formula with current base values
      return {
        value: this.formula(this.baseValues),
        confidence: 1.0,
        trace: this.body.trace,
        explanation: 'Evaluated base formula',
      };
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getScenarios(): Scenario[] {
    return [...this.scenarios];
  }

  getSensitivityResults(): Map<string, SensitivityResult> {
    return new Map(this.sensitivityResults);
  }

  getMonteCarloResult(): MonteCarloResult | undefined {
    return this.monteCarloResult;
  }

  getGoalSeekResult(): GoalSeekResult | undefined {
    return this.goalSeekResult;
  }
}
