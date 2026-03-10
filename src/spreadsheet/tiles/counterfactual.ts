/**
 * Counterfactual Branching System
 *
 * Tiles explore "what if" scenarios in parallel, seeing all possible
 * futures before committing to one. Quantum decision visualization.
 *
 * BREAKTHROUGH: Not scenario planning—quantum decision visualization.
 * See all possible futures before choosing one.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single counterfactual branch representing one possible future
 */
export interface CounterfactualBranch<T = unknown> {
  id: string;
  scenario: string;          // What scenario this branch explores
  probability: number;       // Likelihood of this outcome (0-1)
  outcome: T;               // The predicted outcome
  confidence: number;        // How confident we are in this prediction
  dependencies: string[];    // Other branches this depends on
  metadata?: Record<string, unknown>;
}

/**
 * The counterfactual tree structure
 */
export interface CounterfactualTree<T = unknown> {
  id: string;
  root: CounterfactualBranch<T>;
  branches: Map<string, CounterfactualBranch<T>>;
  createdAt: Date;
  status: 'exploring' | 'converged' | 'abandoned';
}

/**
 * Configuration for counterfactual exploration
 */
export interface CounterfactualConfig {
  maxBranches: number;           // Maximum branches to explore
  minProbability: number;        // Minimum probability to consider
  convergenceThreshold: number;  // When to stop exploring (confidence level)
  explorationDepth: number;      // How many levels deep to explore
  parallelExecution: boolean;    // Run branches in parallel
}

/**
 * Result of counterfactual analysis
 */
export interface CounterfactualResult<T = unknown> {
  bestPath: CounterfactualBranch<T>;
  allPaths: CounterfactualBranch<T>[];
  statistics: {
    mean: number;
    median: number;
    p5: number;   // 5th percentile (worst case)
    p95: number;  // 95th percentile (best case)
    lossProbability: number;  // Probability of negative outcome
  };
  recommendation: string;
  confidence: number;
}

// ============================================================================
// COUNTERFACTUAL ENGINE
// ============================================================================

export class CounterfactualEngine {
  private config: CounterfactualConfig;
  private activeTrees: Map<string, CounterfactualTree> = new Map();

  constructor(config: Partial<CounterfactualConfig> = {}) {
    this.config = {
      maxBranches: config.maxBranches ?? 100,
      minProbability: config.minProbability ?? 0.01,
      convergenceThreshold: config.convergenceThreshold ?? 0.95,
      explorationDepth: config.explorationDepth ?? 3,
      parallelExecution: config.parallelExecution ?? true,
    };
  }

  /**
   * Explore "what if" scenarios for a given input
   *
   * @param input The starting state
   * @param scenarios Array of scenarios to explore
   * @param simulator Function that simulates an outcome
   */
  async explore<T>(
    input: T,
    scenarios: string[],
    simulator: (state: T, scenario: string) => Promise<{ outcome: T; confidence: number }>
  ): Promise<CounterfactualResult<T>> {
    const treeId = this.generateId();
    const branches: CounterfactualBranch<T>[] = [];

    // Create root branch
    const root: CounterfactualBranch<T> = {
      id: 'root',
      scenario: 'current_state',
      probability: 1.0,
      outcome: input,
      confidence: 1.0,
      dependencies: [],
    };

    // Explore each scenario
    const scenarioPromises = scenarios.map(async (scenario, index) => {
      if (index >= this.config.maxBranches) return null;

      try {
        const result = await simulator(input, scenario);

        const branch: CounterfactualBranch<T> = {
          id: `branch_${index}`,
          scenario,
          probability: 1 / scenarios.length, // Uniform prior
          outcome: result.outcome,
          confidence: result.confidence,
          dependencies: ['root'],
        };

        return branch;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(scenarioPromises);
    branches.push(...results.filter((b): b is CounterfactualBranch<T> => b !== null));

    // Calculate statistics
    const outcomes = branches.map(b => this.extractValue(b.outcome));
    const statistics = this.calculateStatistics(outcomes, branches);

    // Find best path
    const bestPath = this.selectBestPath(branches);

    // Generate recommendation
    const recommendation = this.generateRecommendation(bestPath, statistics);

    return {
      bestPath,
      allPaths: branches,
      statistics,
      recommendation,
      confidence: bestPath.confidence,
    };
  }

  /**
   * Explore with recursive branching (deeper exploration)
   */
  async exploreDeep<T>(
    input: T,
    scenarios: string[],
    simulator: (state: T, scenario: string) => Promise<{ outcome: T; confidence: number }>,
    depth: number = this.config.explorationDepth
  ): Promise<CounterfactualResult<T>> {
    if (depth <= 0) {
      return this.explore(input, scenarios, simulator);
    }

    // First level exploration
    const firstLevel = await this.explore(input, scenarios, simulator);

    // For each branch, explore further if below threshold
    const deeperBranches: CounterfactualBranch<T>[] = [];

    for (const branch of firstLevel.allPaths) {
      if (branch.confidence < this.config.convergenceThreshold && depth > 0) {
        const deeper = await this.exploreDeep(
          branch.outcome,
          this.generateSubScenarios(branch.scenario),
          simulator,
          depth - 1
        );

        // Merge deeper branches with adjusted probabilities
        for (const deepBranch of deeper.allPaths) {
          deeperBranches.push({
            ...deepBranch,
            id: `${branch.id}_${deepBranch.id}`,
            probability: branch.probability * deepBranch.probability,
            dependencies: [...deepBranch.dependencies, branch.id],
          });
        }
      }
    }

    // Combine results
    const allPaths = [...firstLevel.allPaths, ...deeperBranches];
    const outcomes = allPaths.map(b => this.extractValue(b.outcome));
    const statistics = this.calculateStatistics(outcomes, allPaths);
    const bestPath = this.selectBestPath(allPaths);
    const recommendation = this.generateRecommendation(bestPath, statistics);

    return {
      bestPath,
      allPaths,
      statistics,
      recommendation,
      confidence: bestPath.confidence,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(): string {
    return `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractValue<T>(outcome: T): number {
    if (typeof outcome === 'number') return outcome;
    if (typeof outcome === 'object' && outcome !== null) {
      const obj = outcome as Record<string, unknown>;
      if ('value' in obj && typeof obj.value === 'number') return obj.value;
      if ('score' in obj && typeof obj.score === 'number') return obj.score;
      if ('result' in obj && typeof obj.result === 'number') return obj.result;
    }
    return 0;
  }

  private calculateStatistics<T>(
    values: number[],
    branches: CounterfactualBranch<T>[]
  ): CounterfactualResult<T>['statistics'] {
    if (values.length === 0) {
      return { mean: 0, median: 0, p5: 0, p95: 0, lossProbability: 1 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const p5Index = Math.floor(n * 0.05);
    const p95Index = Math.floor(n * 0.95);
    const p5 = sorted[p5Index] ?? sorted[0];
    const p95 = sorted[p95Index] ?? sorted[n - 1];

    // Loss probability: weighted by branch confidence
    const lossProbability = branches.reduce((sum, b, i) => {
      const isLoss = values[i] < 0;
      return sum + (isLoss ? b.probability * b.confidence : 0);
    }, 0);

    return { mean, median, p5, p95, lossProbability };
  }

  private selectBestPath<T>(branches: CounterfactualBranch<T>[]): CounterfactualBranch<T> {
    if (branches.length === 0) {
      throw new Error('No branches to select from');
    }

    // Score = probability * confidence * value
    return branches.reduce((best, branch) => {
      const bestScore = best.probability * best.confidence;
      const branchScore = branch.probability * branch.confidence;
      return branchScore > bestScore ? branch : best;
    });
  }

  private generateSubScenarios(parentScenario: string): string[] {
    // Generate sub-scenarios based on parent
    const modifiers = [
      'optimistic',
      'pessimistic',
      'neutral',
      'accelerated',
      'delayed',
    ];

    return modifiers.map(m => `${parentScenario} + ${m}`);
  }

  private generateRecommendation<T>(
    bestPath: CounterfactualBranch<T>,
    stats: CounterfactualResult<T>['statistics']
  ): string {
    const riskLevel = stats.lossProbability > 0.3 ? 'HIGH' :
                      stats.lossProbability > 0.1 ? 'MEDIUM' : 'LOW';

    const confidenceLevel = bestPath.confidence > 0.9 ? 'very high' :
                           bestPath.confidence > 0.75 ? 'high' :
                           bestPath.confidence > 0.5 ? 'moderate' : 'low';

    return `Recommend: ${bestPath.scenario} ` +
           `(confidence: ${confidenceLevel}, risk: ${riskLevel}, ` +
           `expected: ${stats.mean.toFixed(2)}, ` +
           `worst case: ${stats.p5.toFixed(2)}, ` +
           `best case: ${stats.p95.toFixed(2)})`;
  }
}

// ============================================================================
// SPREADSHEET TILE INTEGRATION
// ============================================================================

/**
 * Counterfactual Tile for spreadsheet cells
 *
 * Usage in cell:
 * =COUNTERFACTUAL(A1:A100, "revenue_scenarios", "analyze_growth")
 */
export class CounterfactualTile {
  private engine: CounterfactualEngine;

  constructor(config?: Partial<CounterfactualConfig>) {
    this.engine = new CounterfactualEngine(config);
  }

  /**
   * Execute counterfactual analysis on cell data
   */
  async execute<T>(
    data: T[],
    scenarios: string[],
    analyzeFn: (data: T[], scenario: string) => Promise<{ outcome: T[]; confidence: number }>
  ): Promise<{
    result: CounterfactualResult<T[]>;
    visualization: string;
  }> {
    const result = await this.engine.explore(
      data,
      scenarios,
      async (state, scenario) => analyzeFn(state, scenario)
    );

    const visualization = this.generateVisualization(result);

    return { result, visualization };
  }

  private generateVisualization<T>(result: CounterfactualResult<T>): string {
    const stats = result.statistics;

    return `
┌─────────────────────────────────────────────────────────────┐
│              COUNTERFACTUAL ANALYSIS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BEST PATH: ${result.bestPath.scenario.padEnd(40)}│
│  Confidence: ${(result.confidence * 100).toFixed(1)}%${' '.repeat(42)}│
│                                                             │
│  DISTRIBUTION:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ P95 (best):  ${stats.p95.toFixed(2).padStart(10)}                        │   │
│  │ Mean:        ${stats.mean.toFixed(2).padStart(10)}                        │   │
│  │ Median:      ${stats.median.toFixed(2).padStart(10)}                        │   │
│  │ P5 (worst):  ${stats.p5.toFixed(2).padStart(10)}                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RISK ASSESSMENT:                                           │
│  Loss Probability: ${(stats.lossProbability * 100).toFixed(1)}%${' '.repeat(32)}│
│                                                             │
│  RECOMMENDATION:                                            │
│  ${result.recommendation.slice(0, 55).padEnd(55)}│
│                                                             │
│  BRANCHES EXPLORED: ${result.allPaths.length.toString().padEnd(36)}│
│                                                             │
└─────────────────────────────────────────────────────────────┘
    `.trim();
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Financial scenario planning
 */
export async function exampleFinancialPlanning() {
  const tile = new CounterfactualTile({
    maxBranches: 50,
    explorationDepth: 2,
  });

  const currentRevenue = { value: 1000000 }; // $1M

  const scenarios = [
    'revenue_increase_10pct',
    'revenue_decrease_10pct',
    'market_expansion',
    'new_product_launch',
    'economic_downturn',
    'competitor_entry',
  ];

  const simulator = async (
    state: { value: number },
    scenario: string
  ): Promise<{ outcome: { value: number }; confidence: number }> => {
    // Simulate different scenarios
    const multipliers: Record<string, { mult: number; conf: number }> = {
      'revenue_increase_10pct': { mult: 1.1, conf: 0.85 },
      'revenue_decrease_10pct': { mult: 0.9, conf: 0.85 },
      'market_expansion': { mult: 1.3, conf: 0.65 },
      'new_product_launch': { mult: 1.5, conf: 0.55 },
      'economic_downturn': { mult: 0.7, conf: 0.75 },
      'competitor_entry': { mult: 0.85, conf: 0.70 },
    };

    const { mult, conf } = multipliers[scenario] ?? { mult: 1, conf: 0.5 };

    return {
      outcome: { value: state.value * mult },
      confidence: conf,
    };
  };

  const { result, visualization } = await tile.execute(
    [currentRevenue],
    scenarios,
    async (data, scenario) => simulator(data[0], scenario)
  );

  console.log(visualization);
  console.log('\nBest scenario:', result.bestPath.scenario);
  console.log('Expected outcome:', result.statistics.mean);

  return { result, visualization };
}

// Export for use in spreadsheet
export default CounterfactualTile;
