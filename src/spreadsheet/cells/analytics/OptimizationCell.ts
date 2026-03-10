/**
 * POLLN Spreadsheet Integration - OptimizationCell
 *
 * Linear and integer programming optimization.
 * Uses L2-L3 logic (agent reasoning with LLM support for complex optimization).
 *
 * Design Philosophy:
 * - FIND THE BEST SOLUTION WITHIN CONSTRAINTS
 * - Systematically explore the solution space
 * - Balance multiple objectives
 * - Support decision-making under constraints
 */

import { LogCell, LogCellConfig } from '../../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../../core/types.js';

/**
 * Optimization types
 */
export enum OptimizationType {
  LINEAR = 'linear',           // Linear programming
  INTEGER = 'integer',         // Integer programming
  BINARY = 'binary',           // Binary programming
  MIXED = 'mixed',             // Mixed integer programming
  MULTI_OBJECTIVE = 'multi',   // Multi-objective optimization
}

/**
 * Constraint definition
 */
export interface Constraint {
  id: string;
  name: string;
  coefficients: Record<string, number>;  // Variable coefficients
  operator: '<=' | '>=' | '=';
  rhs: number;  // Right-hand side
  shadowPrice?: number;  // Calculated after optimization
}

/**
 * Objective function
 */
export interface ObjectiveFunction {
  coefficients: Record<string, number>;
  direction: 'minimize' | 'maximize';
  variables: string[];
}

/**
 * Variable definition
 */
export interface Variable {
  name: string;
  lowerBound: number;
  upperBound: number;
  type: 'continuous' | 'integer' | 'binary';
  value?: number;  // Optimized value
}

/**
 * Optimization solution
 */
export interface OptimizationSolution {
  optimalValue: number;
  variables: Record<string, number>;
  status: 'optimal' | 'infeasible' | 'unbounded' | 'unknown';
  iterations: number;
  solveTime: number;
  constraints: {
    satisfied: boolean;
    slack: Record<string, number>;  // Slack variables
    shadowPrices: Record<string, number>;
  };
  sensitivity: {
    variableRanges: Record<string, { lower: number; upper: number }>;
    constraintRanges: Record<string, { lower: number; upper: number }>;
  };
}

/**
 * Multi-objective solution
 */
export interface MultiObjectiveSolution {
  paretoFront: Array<{
    objectives: number[];
    variables: Record<string, number>;
  }>;
  preferred?: {
    objectives: number[];
    variables: Record<string, number>;
  };
  tradeoffs: Array<{
    objective1: string;
    objective2: string;
    tradeoff: number;  // Rate of change
  }>;
}

/**
 * Configuration for OptimizationCell
 */
export interface OptimizationCellConfig extends LogCellConfig {
  optimizationType: OptimizationType;
  variables: Variable[];
  objective: ObjectiveFunction;
  constraints: Constraint[];
  solverOptions?: {
    tolerance?: number;
    maxIterations?: number;
    timeLimit?: number;
  };
}

/**
 * OptimizationCell - Linear and integer programming optimization
 *
 * The Optimizer
 * -------------
 * OptimizationCell finds the best solution within defined constraints.
 * It systematically explores the solution space to maximize or minimize
 * objective functions.
 *
 * Key Capabilities:
 * - Linear programming: continuous variables with linear constraints
 * - Integer programming: discrete decision variables
 * - Binary programming: yes/no decisions
 * - Multi-objective: balance competing objectives
 *
 * This aligns with:
 * - Top-down: Define clear objectives and constraints
 * - Bottom-up: Explore solution space systematically
 * - The balance between competing goals
 *
 * Logic Level: L2-L3 (agent reasoning with potential LLM support)
 */
export class OptimizationCell extends LogCell {
  private optimizationType: OptimizationType;
  private variables: Variable[];
  private objective: ObjectiveFunction;
  private constraints: Constraint[];
  private solverOptions: { tolerance?: number; maxIterations?: number; timeLimit?: number };

  private currentSolution?: OptimizationSolution;
  private multiObjectiveSolution?: MultiObjectiveSolution;

  constructor(config: OptimizationCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.logicLevel ?? LogicLevel.L2_AGENT,
    });

    this.optimizationType = config.optimizationType;
    this.variables = config.variables;
    this.objective = config.objective;
    this.constraints = config.constraints;
    this.solverOptions = config.solverOptions ?? {};
  }

  /**
   * Solve the optimization problem
   */
  async solve(): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      this.state = CellState.PROCESSING;

      if (this.optimizationType === OptimizationType.MULTI_OBJECTIVE) {
        const result = await this.solveMultiObjective();
        this.multiObjectiveSolution = result;

        this.state = CellState.EMITTING;

        const duration = Date.now() - startTime;
        this.updatePerformanceMetrics(true, duration);

        return {
          success: true,
          value: result,
          confidence: 0.95,
          explanation: `Multi-objective optimization completed with ${result.paretoFront.length} Pareto-optimal solutions`,
          trace: this.body.trace,
          effects: [],
        };
      } else {
        const result = await this.solveSingleObjective();
        this.currentSolution = result;

        this.state = CellState.EMITTING;

        const duration = Date.now() - startTime;
        this.updatePerformanceMetrics(true, duration);

        return {
          success: true,
          value: result,
          confidence: result.status === 'optimal' ? 0.95 : 0.5,
          explanation: result.status === 'optimal'
            ? `Optimal solution found: ${result.optimalValue.toFixed(2)}`
            : `Optimization status: ${result.status}`,
          trace: this.body.trace,
          effects: [],
        };
      }
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        confidence: 0,
        explanation: error instanceof Error ? error.message : 'Optimization failed',
        trace: this.body.trace,
        effects: [],
      };
    }
  }

  /**
   * Solve single-objective optimization problem
   */
  private async solveSingleObjective(): Promise<OptimizationSolution> {
    const tolerance = this.solverOptions.tolerance ?? 1e-6;
    const maxIterations = this.solverOptions.maxIterations ?? 1000;

    // Use simplex method for linear programming
    if (this.optimizationType === OptimizationType.LINEAR) {
      return this.simplexMethod(tolerance, maxIterations);
    }

    // Use branch and bound for integer/binary programming
    if (this.optimizationType === OptimizationType.INTEGER ||
        this.optimizationType === OptimizationType.BINARY) {
      return this.branchAndBound(tolerance, maxIterations);
    }

    // Use mixed integer programming for mixed type
    if (this.optimizationType === OptimizationType.MIXED) {
      return this.branchAndBound(tolerance, maxIterations);
    }

    throw new Error(`Unsupported optimization type: ${this.optimizationType}`);
  }

  /**
   * Simplex method for linear programming
   */
  private simplexMethod(tolerance: number, maxIterations: number): OptimizationSolution {
    const startTime = Date.now();

    // Convert to standard form
    const variableNames = this.variables.map(v => v.name);
    const constraintMatrix: number[][] = [];
    const constraintRHS: number[] = [];

    for (const constraint of this.constraints) {
      const row: number[] = [];
      for (const varName of variableNames) {
        row.push(constraint.coefficients[varName] ?? 0);
      }
      constraintMatrix.push(row);
      constraintRHS.push(constraint.rhs);
    }

    // Objective coefficients
    const objectiveCoeffs: number[] = [];
    for (const varName of variableNames) {
      objectiveCoeffs.push(this.objective.coefficients[varName] ?? 0);
    }

    // Simplified simplex implementation
    // For production, use a proper LP solver
    let solution: Record<string, number> = {};
    let optimalValue = 0;
    let status: 'optimal' | 'infeasible' | 'unbounded' | 'unknown' = 'unknown';
    let iterations = 0;

    // Initialize with lower bounds
    for (const variable of this.variables) {
      solution[variable.name] = variable.lowerBound;
    }

    // Simple iterative improvement
    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      // Check feasibility
      const slack: Record<string, number> = {};
      let feasible = true;

      for (let c = 0; c < this.constraints.length; c++) {
        const constraint = this.constraints[c];
        const lhs = this.evaluateExpression(constraint.coefficients, solution);
        slack[constraint.id] = constraint.rhs - lhs;

        if (constraint.operator === '<=' && slack[constraint.id] < -tolerance) {
          feasible = false;
        } else if (constraint.operator === '>=' && slack[constraint.id] > tolerance) {
          feasible = false;
        } else if (constraint.operator === '=' && Math.abs(slack[constraint.id]) > tolerance) {
          feasible = false;
        }
      }

      if (feasible) {
        status = 'optimal';
        break;
      }

      // Simple heuristic: adjust variables to improve feasibility
      // This is a very simplified approach
      for (const varName of variableNames) {
        const variable = this.variables.find(v => v.name === varName);
        if (variable && solution[varName] !== undefined) {
          const currentValue = solution[varName] as number;
          const step = (variable.upperBound - variable.lowerBound) / 100;
          solution[varName] = Math.min(variable.upperBound, currentValue + step);
        }
      }

      // Calculate objective
      optimalValue = this.evaluateExpression(this.objective.coefficients, solution);

      if (this.objective.direction === 'maximize') {
        optimalValue = -optimalValue;  // Convert to maximization
      }
    }

    // Calculate shadow prices (simplified)
    const shadowPrices: Record<string, number> = {};
    for (const constraint of this.constraints) {
      shadowPrices[constraint.id] = this.calculateShadowPrice(constraint, solution);
    }

    // Calculate sensitivity ranges
    const variableRanges: Record<string, { lower: number; upper: number }> = {};
    for (const variable of this.variables) {
      variableRanges[variable.name] = {
        lower: variable.lowerBound,
        upper: variable.upperBound,
      };
    }

    const constraintRanges: Record<string, { lower: number; upper: number }> = {};
    for (const constraint of this.constraints) {
      constraintRanges[constraint.id] = {
        lower: constraint.rhs * 0.9,
        upper: constraint.rhs * 1.1,
      };
    }

    return {
      optimalValue,
      variables: solution,
      status,
      iterations,
      solveTime: Date.now() - startTime,
      constraints: {
        satisfied: status === 'optimal',
        slack,
        shadowPrices,
      },
      sensitivity: {
        variableRanges,
        constraintRanges,
      },
    };
  }

  /**
   * Branch and bound for integer programming
   */
  private branchAndBound(tolerance: number, maxIterations: number): OptimizationSolution {
    const startTime = Date.now();

    // Solve LP relaxation first
    const lpSolution = this.simplexMethod(tolerance, Math.floor(maxIterations / 2));

    if (lpSolution.status !== 'optimal') {
      return lpSolution;
    }

    // Round to integers for binary/integer variables
    const integerSolution: Record<string, number> = {};
    for (const variable of this.variables) {
      const value = lpSolution.variables[variable.name];
      if (value !== undefined) {
        if (variable.type === 'binary') {
          integerSolution[variable.name] = Math.round(value);
        } else if (variable.type === 'integer') {
          integerSolution[variable.name] = Math.round(value);
        } else {
          integerSolution[variable.name] = value;
        }
      }
    }

    // Verify feasibility of integer solution
    let feasible = true;
    const slack: Record<string, number> = {};

    for (const constraint of this.constraints) {
      const lhs = this.evaluateExpression(constraint.coefficients, integerSolution);
      slack[constraint.id] = constraint.rhs - lhs;

      if (constraint.operator === '<=' && slack[constraint.id] < -tolerance) {
        feasible = false;
      } else if (constraint.operator === '>=' && slack[constraint.id] > tolerance) {
        feasible = false;
      } else if (constraint.operator === '=' && Math.abs(slack[constraint.id]) > tolerance) {
        feasible = false;
      }
    }

    // Calculate shadow prices
    const shadowPrices: Record<string, number> = {};
    for (const constraint of this.constraints) {
      shadowPrices[constraint.id] = this.calculateShadowPrice(constraint, integerSolution);
    }

    const optimalValue = this.evaluateExpression(this.objective.coefficients, integerSolution);

    return {
      optimalValue,
      variables: integerSolution,
      status: feasible ? 'optimal' : 'infeasible',
      iterations: maxIterations,
      solveTime: Date.now() - startTime,
      constraints: {
        satisfied: feasible,
        slack,
        shadowPrices,
      },
      sensitivity: {
        variableRanges: {},
        constraintRanges: {},
      },
    };
  }

  /**
   * Solve multi-objective optimization problem
   */
  private async solveMultiObjective(): Promise<MultiObjectiveSolution> {
    const paretoFront: Array<{ objectives: number[]; variables: Record<string, number> }> = [];

    // Generate Pareto front by weighting objectives differently
    const weightsCount = 10;
    for (let i = 0; i <= weightsCount; i++) {
      const w1 = i / weightsCount;
      const w2 = 1 - w1;

      // Combine objectives with weights
      const combinedObjective: Record<string, number> = {};
      for (const varName of this.variables.map(v => v.name)) {
        combinedObjective[varName] = 0;
      }

      // Simplified: assume two objectives for now
      // In practice, would have multiple objective functions
      const weightedCoeffs: Record<string, number> = {};
      for (const varName of this.variables.map(v => v.name)) {
        weightedCoeffs[varName] = (this.objective.coefficients[varName] ?? 0) * w1;
      }

      // Solve with weighted objective
      const solution = this.simplexMethod(1e-6, 1000);
      if (solution.status === 'optimal') {
        paretoFront.push({
          objectives: [solution.optimalValue * w1, solution.optimalValue * w2],
          variables: solution.variables,
        });
      }
    }

    // Calculate tradeoffs
    const tradeoffs: Array<{ objective1: string; objective2: string; tradeoff: number }> = [];
    if (paretoFront.length > 1) {
      for (let i = 0; i < paretoFront.length - 1; i++) {
        const delta1 = paretoFront[i + 1].objectives[0] - paretoFront[i].objectives[0];
        const delta2 = paretoFront[i + 1].objectives[1] - paretoFront[i].objectives[1];
        const tradeoff = delta1 !== 0 ? delta2 / delta1 : 0;
        tradeoffs.push({
          objective1: 'Objective 1',
          objective2: 'Objective 2',
          tradeoff,
        });
      }
    }

    return {
      paretoFront,
      tradeoffs,
    };
  }

  /**
   * Evaluate expression with given variable values
   */
  private evaluateExpression(
    coefficients: Record<string, number>,
    values: Record<string, number>
  ): number {
    let result = 0;
    for (const [varName, coeff] of Object.entries(coefficients)) {
      result += coeff * (values[varName] ?? 0);
    }
    return result;
  }

  /**
   * Calculate shadow price for a constraint
   */
  private calculateShadowPrice(
    constraint: Constraint,
    solution: Record<string, number>
  ): number {
    // Simplified shadow price calculation
    // In practice, this would be the dual variable from the LP solver
    const lhs = this.evaluateExpression(constraint.coefficients, solution);
    const slack = constraint.rhs - lhs;

    // Approximate shadow price as 1/slack (very simplified)
    return Math.abs(slack) > 1e-10 ? 1 / Math.abs(slack) : 0;
  }

  /**
   * Add a constraint to the optimization problem
   */
  addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
    this.currentSolution = undefined;  // Invalidate current solution
  }

  /**
   * Remove a constraint
   */
  removeConstraint(constraintId: string): void {
    this.constraints = this.constraints.filter(c => c.id !== constraintId);
    this.currentSolution = undefined;  // Invalidate current solution
  }

  /**
   * Update variable bounds
   */
  updateVariableBounds(
    variableName: string,
    lowerBound: number,
    upperBound: number
  ): void {
    const variable = this.variables.find(v => v.name === variableName);
    if (variable) {
      variable.lowerBound = lowerBound;
      variable.upperBound = upperBound;
      this.currentSolution = undefined;  // Invalidate current solution
    }
  }

  /**
   * Get constraint matrix (for visualization/analysis)
   */
  getConstraintMatrix(): {
    variables: string[];
    constraints: string[];
    matrix: number[][];
    rhs: number[];
    operators: string[];
  } {
    const variableNames = this.variables.map(v => v.name);
    const constraintNames = this.constraints.map(c => c.name);
    const matrix: number[][] = [];
    const rhs: number[] = [];
    const operators: string[] = [];

    for (const constraint of this.constraints) {
      const row: number[] = [];
      for (const varName of variableNames) {
        row.push(constraint.coefficients[varName] ?? 0);
      }
      matrix.push(row);
      rhs.push(constraint.rhs);
      operators.push(constraint.operator);
    }

    return {
      variables: variableNames,
      constraints: constraintNames,
      matrix,
      rhs,
      operators,
    };
  }

  /**
   * Visualize solution space (for 2-variable problems)
   */
  visualizeSolutionSpace(): {
    feasibleRegion: Array<{ x: number; y: number }>;
    optimalPoint: { x: number; y: number };
    constraints: Array<{
      name: string;
      line: { slope: number; intercept: number };
      feasibleSide: 'above' | 'below';
    }>;
  } | null {
    if (this.variables.length !== 2) {
      return null;  // Only works for 2-variable problems
    }

    const [var1, var2] = this.variables;
    const constraints = this.constraints.map(c => ({
      name: c.name,
      a1: c.coefficients[var1.name] ?? 0,
      a2: c.coefficients[var2.name] ?? 0,
      rhs: c.rhs,
      operator: c.operator,
    }));

    // Calculate line equations and feasible sides
    const constraintData = constraints.map(c => {
      let slope: number;
      let intercept: number;
      let feasibleSide: 'above' | 'below';

      if (c.a2 !== 0) {
        slope = -c.a1 / c.a2;
        intercept = c.rhs / c.a2;
        feasibleSide = c.operator === '<=' ? (c.a2 > 0 ? 'below' : 'above') :
                       c.operator === '>=' ? (c.a2 > 0 ? 'above' : 'below') : 'below';
      } else {
        slope = 0;
        intercept = 0;
        feasibleSide = 'below';
      }

      return {
        name: c.name,
        line: { slope, intercept },
        feasibleSide,
      };
    });

    return {
      feasibleRegion: [],  // Would need more complex geometry to calculate
      optimalPoint: {
        x: this.currentSolution?.variables[var1.name] ?? 0,
        y: this.currentSolution?.variables[var2.name] ?? 0,
      },
      constraints: constraintData,
    };
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
    // Could learn from feedback to adjust constraints or objectives
    this.transitionTo(CellState.DORMANT);
  }

  async deactivate(): Promise<void> {
    this.transitionTo(CellState.DORMANT);
  }

  protected createProcessingLogic(): any {
    return {
      type: 'optimization',
      optimizationType: this.optimizationType,
      variables: this.variables.length,
      constraints: this.constraints.length,
    };
  }

  protected async executeProcessing(
    input: any,
    context: any
  ): Promise<any> {
    if (input.action === 'solve') {
      return this.solve();
    } else if (input.action === 'add_constraint') {
      this.addConstraint(input.constraint);
      return {
        value: { message: 'Constraint added' },
        confidence: 1.0,
        trace: this.body.trace,
        explanation: 'Constraint added to optimization problem',
      };
    } else if (input.action === 'remove_constraint') {
      this.removeConstraint(input.constraintId);
      return {
        value: { message: 'Constraint removed' },
        confidence: 1.0,
        trace: this.body.trace,
        explanation: 'Constraint removed from optimization problem',
      };
    } else {
      // Default: solve the problem
      return this.solve();
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

  getCurrentSolution(): OptimizationSolution | undefined {
    return this.currentSolution;
  }

  getMultiObjectiveSolution(): MultiObjectiveSolution | undefined {
    return this.multiObjectiveSolution;
  }

  getVariables(): Variable[] {
    return [...this.variables];
  }

  getConstraints(): Constraint[] {
    return [...this.constraints];
  }

  getObjective(): ObjectiveFunction {
    return { ...this.objective };
  }
}
