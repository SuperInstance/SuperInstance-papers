/**
 * Thermodynamic Simulator for POLLN Agent Colonies
 *
 * Research tool for studying energy flows, entropy, and efficiency
 * in agent colonies through the lens of statistical physics.
 *
 * Based on: docs/research/thermo/THERMODYNAMICS.md
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ThermodynamicState {
  energy: {
    compute: number;
    memory: number;
    network: number;
    total: number;
  };
  entropy: {
    input: number;
    output: number;
    production: number;
  };
  freeEnergy: number;
  temperature: number;
  timestamp: number;
}

export interface DecisionMetrics {
  energyJoules: number;
  outputEntropy: number;
  freeEnergy: number;
  efficiency: number;
  decisionTimeMs: number;
}

export interface EfficiencyMetrics {
  decisionEnergyDensity: number;      // J per decision
  carnotEfficiency: number;           // 0-1
  informationEfficiency: number;      // 0-1
  learningEfficiency: number;         // J^-1
  dissipationRate: number;            // J/s
  powerEfficiency: number;            // 0-1
}

export interface ScalingResult {
  colonySize: number;
  avgEfficiency: number;
  avgEnergyPerDecision: number;
  avgDecisionTimeMs: number;
  scalingExponent: number;
}

export interface PhaseTransitionResult {
  temperature: number;
  entropy: number;
  decisionTime: number;
  freeEnergy: number;
  phase: 'ordered' | 'critical' | 'disordered';
}

export interface SimulatorConfig {
  // Energy model parameters (Joules per operation)
  computeEnergyPerAgent: number;
  memoryEnergyPerAgent: number;
  networkEnergyPerAgent: number;

  // Entropy model parameters
  gumbelConstant: number;  // ≈ 0.577
  entropyDecayRate: number;

  // Temperature range
  minTemperature: number;
  maxTemperature: number;
  criticalTemperature: number;

  // Simulation parameters
  defaultAgentCount: number;
  defaultInputEntropy: number;
}

// ============================================================================
// THERMODYNAMIC SIMULATOR
// ============================================================================

export class ThermodynamicSimulator {
  private state: ThermodynamicState;
  private history: ThermodynamicState[] = [];
  private config: SimulatorConfig;

  constructor(config?: Partial<SimulatorConfig>) {
    this.config = {
      computeEnergyPerAgent: 0.01,   // J per agent per decision
      memoryEnergyPerAgent: 0.001,   // J per agent
      networkEnergyPerAgent: 0.005,  // J per agent
      gumbelConstant: 0.577,         // Euler-Mascheroni constant
      entropyDecayRate: 0.1,
      minTemperature: 0.01,
      maxTemperature: 10.0,
      criticalTemperature: 1.0,
      defaultAgentCount: 50,
      defaultInputEntropy: 10.0,
      ...config,
    };

    this.state = this.createInitialState();
  }

  /**
   * Create initial thermodynamic state
   */
  private createInitialState(): ThermodynamicState {
    return {
      energy: { compute: 0, memory: 0, network: 0, total: 0 },
      entropy: { input: 0, output: 0, production: 0 },
      freeEnergy: 0,
      temperature: this.config.criticalTemperature,
      timestamp: Date.now(),
    };
  }

  /**
   * Simulate a single decision cycle with energy measurement
   */
  async simulateDecision(
    inputEntropy: number = this.config.defaultInputEntropy,
    agentCount: number = this.config.defaultAgentCount,
    temperature: number = this.config.criticalTemperature
  ): Promise<DecisionMetrics> {
    // Energy model (based on real hardware characteristics)
    const computeEnergy = agentCount * this.config.computeEnergyPerAgent;
    const memoryEnergy = agentCount * this.config.memoryEnergyPerAgent;
    const networkEnergy = agentCount * this.config.networkEnergyPerAgent;

    const totalEnergy = computeEnergy + memoryEnergy + networkEnergy;

    // Calculate output entropy based on input and temperature
    const outputEntropy = this.calculateOutputEntropy(inputEntropy, temperature);

    // Entropy production (Second Law of Thermodynamics)
    const entropyProduction = Math.max(0, outputEntropy - inputEntropy);

    // Calculate variational free energy (Friston's Free Energy Principle)
    const freeEnergy = this.calculateFreeEnergy(inputEntropy, outputEntropy);

    // Decision time (critical slowing down near T_c)
    const decisionTimeMs = this.calculateDecisionTime(temperature);

    // Calculate efficiency (work output / energy input)
    const workOutput = Math.max(0, inputEntropy - outputEntropy);
    const efficiency = this.calculateEfficiency(workOutput, totalEnergy, temperature);

    // Update state
    this.state = {
      energy: {
        compute: computeEnergy,
        memory: memoryEnergy,
        network: networkEnergy,
        total: totalEnergy,
      },
      entropy: {
        input: inputEntropy,
        output: outputEntropy,
        production: entropyProduction,
      },
      freeEnergy,
      temperature,
      timestamp: Date.now(),
    };

    this.history.push({ ...this.state });

    return {
      energyJoules: totalEnergy,
      outputEntropy,
      freeEnergy,
      efficiency,
      decisionTimeMs,
    };
  }

  /**
   * Calculate output entropy based on input entropy and temperature
   *
   * Higher temperature → more stochastic → higher output entropy
   * Lower temperature → more deterministic → lower output entropy
   */
  private calculateOutputEntropy(inputEntropy: number, temperature: number): number {
    // Noise contribution from Gumbel-Softmax (used in Plinko layer)
    const noiseEntropy = this.config.gumbelConstant * Math.log(temperature);

    // Information processing (reduces entropy)
    const processingPower = 1 / (1 + temperature);
    const processedEntropy = inputEntropy * (1 - processingPower);

    // Output entropy is remaining entropy plus noise
    return Math.max(0, processedEntropy + noiseEntropy);
  }

  /**
   * Calculate variational free energy (Karl Friston's Free Energy Principle)
   *
   * F = -ln p(o|a) - KL[q(s)||p(s|a)]
   *
   * Where:
   * - F: Free energy
   * - p(o|a): Likelihood of observation given action
   * - KL: Kullback-Leibler divergence
   * - q(s): Approximate posterior (agent's belief)
   * - p(s|a): True posterior
   *
   * In information theory terms:
   * F = surprise + complexity
   */
  private calculateFreeEnergy(inputEntropy: number, outputEntropy: number): number {
    // Surprise: -ln p(o|a)
    // Approximate as negative log likelihood of observation
    const surprise = Math.max(0, -Math.log(Math.exp(-inputEntropy) + 1e-10));

    // Complexity: KL[q||p]
    // Approximate as divergence between input and output distributions
    const complexity = Math.abs(inputEntropy - outputEntropy);

    return surprise + complexity;
  }

  /**
   * Calculate decision time with critical slowing down
   *
   * Near critical temperature T_c, systems slow down dramatically
   * τ ∝ |T - T_c|^(-γ) where γ ≈ 2-3 for mean-field
   */
  private calculateDecisionTime(temperature: number): number {
    const distanceFromCritical = Math.abs(temperature - this.config.criticalTemperature);

    // Base decision time (fast)
    const baseTime = 10;  // ms

    // Critical exponent (typical value: 2.0)
    const gamma = 2.0;

    // Critical slowing down factor
    const slowingFactor = 1 + Math.pow(distanceFromCritical + 0.1, -gamma);

    return baseTime * Math.min(slowingFactor, 100);  // Cap at 1000ms
  }

  /**
   * Calculate thermodynamic efficiency
   *
   * η = W / Q = (useful work) / (energy input)
   *
   * Work = decrease in free energy = F_before - F_after
   */
  private calculateEfficiency(
    workOutput: number,
    energyInput: number,
    temperature: number
  ): number {
    if (energyInput === 0) return 0;

    const rawEfficiency = workOutput / energyInput;

    // Apply Carnot limit
    const carnotLimit = 1 - Math.exp(-workOutput) / Math.exp(-energyInput);

    return Math.min(rawEfficiency, carnotLimit);
  }

  /**
   * Run scaling law simulation
   *
   * Tests hypothesis: η(N) = η_0 * N^(-α)
   * Where α is the scaling exponent
   */
  async runScalingSimulation(
    maxColonySize: number,
    trials: number = 100
  ): Promise<ScalingResult[]> {
    const results: ScalingResult[] = [];

    // Test colony sizes from 1 to maxColonySize (powers of 2)
    for (let n = 1; n <= maxColonySize; n *= 2) {
      let totalEfficiency = 0;
      let totalEnergy = 0;
      let totalDecisionTime = 0;

      // Run multiple trials for statistics
      for (let t = 0; t < trials; t++) {
        const result = await this.simulateDecision(
          this.config.defaultInputEntropy,
          n,
          this.config.criticalTemperature
        );

        totalEfficiency += result.efficiency;
        totalEnergy += result.energyJoules;
        totalDecisionTime += result.decisionTimeMs;
      }

      results.push({
        colonySize: n,
        avgEfficiency: totalEfficiency / trials,
        avgEnergyPerDecision: totalEnergy / trials,
        avgDecisionTimeMs: totalDecisionTime / trials,
        scalingExponent: 0,  // Will be computed after fitting
      });
    }

    // Fit power law: E(N) = E_0 * N^α
    const logN = results.map(r => Math.log(r.colonySize));
    const logE = results.map(r => Math.log(r.avgEnergyPerDecision));

    const { exponent: scalingExponent } = this.fitPowerLaw(logN, logE);

    // Update all results with fitted exponent
    results.forEach(r => {
      r.scalingExponent = scalingExponent;
    });

    return results;
  }

  /**
   * Simulate phase transition
   *
   * Varies temperature from min to max, observes phase behavior
   */
  async simulatePhaseTransition(
    agentCount: number,
    minTemp: number = this.config.minTemperature,
    maxTemp: number = this.config.maxTemperature,
    tempSteps: number = 100
  ): Promise<PhaseTransitionResult[]> {
    const results: PhaseTransitionResult[] = [];

    for (let i = 0; i < tempSteps; i++) {
      const temp = minTemp + (maxTemp - minTemp) * (i / (tempSteps - 1));

      const result = await this.simulateDecision(
        this.config.defaultInputEntropy,
        agentCount,
        temp
      );

      // Determine phase based on temperature
      let phase: 'ordered' | 'critical' | 'disordered';
      const criticalWidth = 0.5;

      if (temp < this.config.criticalTemperature - criticalWidth) {
        phase = 'ordered';  // Low temperature, ordered
      } else if (temp > this.config.criticalTemperature + criticalWidth) {
        phase = 'disordered';  // High temperature, disordered
      } else {
        phase = 'critical';  // Near critical point
      }

      results.push({
        temperature: temp,
        entropy: result.outputEntropy,
        decisionTime: result.decisionTimeMs,
        freeEnergy: result.freeEnergy,
        phase,
      });
    }

    return results;
  }

  /**
   * Get comprehensive efficiency metrics
   */
  getEfficiencyMetrics(): EfficiencyMetrics {
    if (this.history.length === 0) {
      return {
        decisionEnergyDensity: 0,
        carnotEfficiency: 0,
        informationEfficiency: 0,
        learningEfficiency: 0,
        dissipationRate: 0,
        powerEfficiency: 0,
      };
    }

    const latest = this.history[this.history.length - 1];

    // Decision energy density (J per decision)
    const decisionCount = this.history.length;
    const decisionEnergyDensity = latest.energy.total / decisionCount;

    // Carnot efficiency: η = 1 - T_cold / T_hot
    // Using information temperature: T = exp(H)
    const THot = Math.exp(latest.entropy.input);
    const TCold = Math.exp(latest.entropy.output);
    const carnotEfficiency = Math.max(0, 1 - TCold / THot);

    // Information efficiency: I(X;Y) / H(X)
    const mutualInfo = latest.entropy.input - latest.entropy.production;
    const informationEfficiency = mutualInfo / latest.entropy.input;

    // Learning efficiency: ΔV / E (free energy reduction per joule)
    const learningEfficiency = -latest.freeEnergy / latest.energy.total;

    // Dissipation rate: P = T * dS/dt
    const environmentTemp = 300;  // K (room temperature)
    const avgTimePerDecision = 100;  // ms (assumed)
    const dissipationRate =
      (environmentTemp * latest.entropy.production) / (avgTimePerDecision / 1000);

    // Power efficiency: useful work / total energy
    const workOutput = Math.max(0, latest.entropy.input - latest.entropy.output);
    const powerEfficiency = workOutput / latest.energy.total;

    return {
      decisionEnergyDensity,
      carnotEfficiency,
      informationEfficiency,
      learningEfficiency,
      dissipationRate,
      powerEfficiency,
    };
  }

  /**
   * Fit power law: y = A * x^α
   *
   * Returns exponent α and coefficient A
   */
  private fitPowerLaw(
    logX: number[],
    logY: number[]
  ): { exponent: number; coefficient: number; r2: number } {
    const n = logX.length;

    if (n < 2) {
      return { exponent: 0, coefficient: 1, r2: 0 };
    }

    // Linear regression on log-log scale
    const sumX = logX.reduce((a, b) => a + b, 0);
    const sumY = logY.reduce((a, b) => a + b, 0);
    const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0);
    const sumXX = logX.reduce((sum, x) => sum + x * x, 0);
    const sumYY = logY.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const ssTot = sumYY - (sumY * sumY) / n;
    const ssRes = logY.reduce((sum, yi, i) => {
      const yPred = slope * logX[i] + intercept;
      return sum + (yi - yPred) ** 2;
    }, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      exponent: slope,
      coefficient: Math.exp(intercept),
      r2,
    };
  }

  /**
   * Get simulation history
   */
  getHistory(): ThermodynamicState[] {
    return [...this.history];
  }

  /**
   * Get current state
   */
  getCurrentState(): ThermodynamicState {
    return { ...this.state };
  }

  /**
   * Reset simulator
   */
  reset(): void {
    this.state = this.createInitialState();
    this.history = [];
  }

  /**
   * Export simulation data as JSON
   */
  exportData(): string {
    return JSON.stringify(
      {
        config: this.config,
        history: this.history,
        metrics: this.getEfficiencyMetrics(),
      },
      null,
      2
    );
  }

  /**
   * Import simulation data from JSON
   */
  importData(json: string): void {
    try {
      const data = JSON.parse(json);
      this.config = { ...this.config, ...data.config };
      this.history = data.history || [];
      this.state = data.history?.[data.history.length - 1] || this.createInitialState();
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Shannon entropy
 * H(X) = -Σ p(x) * log(p(x))
 */
export function shannonEntropy(probabilities: number[]): number {
  return -probabilities.reduce((sum, p) => {
    return p > 0 ? sum + p * Math.log(p) : sum;
  }, 0);
}

/**
 * Calculate Kullback-Leibler divergence
 * D_KL(P || Q) = Σ P(x) * log(P(x) / Q(x))
 */
export function kullbackLeiblerDivergence(
  p: number[],
  q: number[]
): number {
  if (p.length !== q.length) {
    throw new Error('Distributions must have same length');
  }

  return p.reduce((sum, pi, i) => {
    return pi > 0 && q[i] > 0 ? sum + pi * Math.log(pi / q[i]) : sum;
  }, 0);
}

/**
 * Calculate mutual information
 * I(X;Y) = H(X) - H(X|Y)
 */
export function mutualInformation(
  joint: number[][],
  pX: number[],
  pY: number[]
): number {
  const hX = shannonEntropy(pX);
  let conditionalEntropy = 0;

  for (let i = 0; i < joint.length; i++) {
    for (let j = 0; j < joint[i].length; j++) {
      if (joint[i][j] > 0 && pY[j] > 0) {
        conditionalEntropy -= joint[i][j] * Math.log(joint[i][j] / pY[j]);
      }
    }
  }

  return hX - conditionalEntropy;
}

/**
 * Calculate free energy (variational)
 * F = -ln p(o|a) - KL[q(s)||p(s|a)]
 */
export function variationalFreeEnergy(
  likelihood: number,
  posterior: number[],
  prior: number[]
): number {
  const surprise = -Math.log(likelihood);
  const complexity = kullbackLeiblerDivergence(posterior, prior);

  return surprise + complexity;
}

/**
 * Generate a random probability distribution
 */
export function randomDistribution(size: number): number[] {
  const raw = Array.from({ length: size }, () => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(x => x / sum);
}

/**
 * Normalize a distribution
 */
export function normalize(distribution: number[]): number[] {
  const sum = distribution.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    throw new Error('Cannot normalize zero-sum distribution');
  }
  return distribution.map(x => x / sum);
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Run scaling simulation
 */
export async function exampleScalingSimulation() {
  const simulator = new ThermodynamicSimulator();

  console.log('Running scaling simulation...');
  const results = await simulator.runScalingSimulation(256, 50);

  console.log('\nScaling Law Results:');
  console.log('N\tEfficiency\tEnergy/Decision\tExponent');
  results.forEach(r => {
    console.log(
      `${r.colonySize}\t${r.avgEfficiency.toFixed(4)}\t\t${r.avgEnergyPerDecision.toFixed(4)}J\t\t${r.scalingExponent.toFixed(3)}`
    );
  });

  const metrics = simulator.getEfficiencyMetrics();
  console.log('\nEfficiency Metrics:');
  console.log(`Decision Energy Density: ${metrics.decisionEnergyDensity.toFixed(6)} J/decision`);
  console.log(`Carnot Efficiency: ${(metrics.carnotEfficiency * 100).toFixed(2)}%`);
  console.log(`Information Efficiency: ${(metrics.informationEfficiency * 100).toFixed(2)}%`);
  console.log(`Learning Efficiency: ${metrics.learningEfficiency.toExponential(2)}`);
  console.log(`Dissipation Rate: ${metrics.dissipationRate.toFixed(2)} J/s`);

  return results;
}

/**
 * Example: Run phase transition simulation
 */
export async function examplePhaseTransition() {
  const simulator = new ThermodynamicSimulator();

  console.log('Running phase transition simulation...');
  const results = await simulator.simulatePhaseTransition(50, 0.1, 10.0, 100);

  console.log('\nPhase Transition Results:');
  console.log('T\tEntropy\tDecisionTime\tPhase');
  results.slice(0, 10).forEach(r => {
    console.log(
      `${r.temperature.toFixed(2)}\t${r.entropy.toFixed(2)}\t\t${r.decisionTime.toFixed(1)}ms\t\t${r.phase}`
    );
  });

  const criticalPoints = results.filter(r => r.phase === 'critical');
  console.log(`\nCritical region: T ∈ [${criticalPoints[0]?.temperature.toFixed(2)}, ${criticalPoints[criticalPoints.length - 1]?.temperature.toFixed(2)}]`);

  return results;
}

// Export everything
export {
  ThermodynamicSimulator,
  SimulatorConfig,
  ThermodynamicState,
  DecisionMetrics,
  EfficiencyMetrics,
  ScalingResult,
  PhaseTransitionResult,
};
