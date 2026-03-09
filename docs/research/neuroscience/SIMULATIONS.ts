/**
 * Neuroscience Validation Simulations for POLLN
 *
 * This file contains simulation code to compare POLLN's architecture
 * against known neuroscience principles and brain circuit dynamics.
 *
 * Usage:
 *   npx tsx docs/research/neuroscience/SIMULATIONS.ts
 */

import { HebbianLearning } from '../../src/core/learning.js';
import { WorldModel } from '../../src/core/worldmodel.js';
import { PlinkoLayer } from '../../src/core/decision.js';

// ============================================================================
// SIMULATION 1: STDP vs. Hebbian Learning
// ============================================================================

/**
 * Compare POLLN's Hebbian learning to biological STDP
 *
 * STDP (Spike-Timing Dependent Plasticity):
 * - If presynaptic fires 10-20ms BEFORE postsynaptic: strengthen (LTP)
 * - If presynaptic fires 10-20ms AFTER postsynaptic: weaken (LTD)
 * - Window: ~20-40ms total
 */
export class STDPSimulation {
  private hebbian: HebbianLearning;

  constructor() {
    this.hebbian = new HebbianLearning({
      learningRate: 0.01,
      decayRate: 0.001,
      minWeight: 0.01,
      maxWeight: 1.0,
      traceLength: 100,
      traceDecay: 0.95,
      ojaNormalization: true,
    });
  }

  /**
   * Simulate STDP learning curve
   */
  simulateSTDP(): {
    timingDifferences: number[];
    weightChanges: number[];
    biologicalSTDP: number[];
  } {
    const timingDifferences: number[] = [];
    const weightChanges: number[] = [];
    const biologicalSTDP: number[] = [];

    // Test different timing differences (-50ms to +50ms)
    for (const deltaT of Array.from({ length: 101 }, (_, i) => i - 50)) {
      timingDifferences.push(deltaT);

      // POLLN's Hebbian (timing-independent)
      const hebbianChange = this.hebbianUpdate(deltaT);
      weightChanges.push(hebbianChange);

      // Biological STDP (timing-dependent)
      const stdpChange = this.stdpUpdate(deltaT);
      biologicalSTDP.push(stdpChange);
    }

    return { timingDifferences, weightChanges, biologicalSTDP };
  }

  private hebbianUpdate(deltaT: number): number {
    // POLLN's implementation: timing-independent
    const preActivity = 1.0;
    const postActivity = 1.0;
    const reward = 0.5;

    return this.hebbian['config'].learningRate * preActivity * postActivity * reward;
  }

  private stdpUpdate(deltaT: number): number {
    // Biological STDP: timing-dependent
    const A_plus = 0.1; // LTP amplitude
    const A_minus = 0.12; // LTD amplitude (slightly stronger)
    const tau_plus = 20; // LTP time constant (ms)
    const tau_minus = 20; // LTD time constant (ms)

    if (deltaT > 0) {
      // Pre before post: LTP
      return A_plus * Math.exp(-deltaT / tau_plus);
    } else {
      // Post before pre: LTD
      return -A_minus * Math.exp(deltaT / tau_minus);
    }
  }

  /**
   * Calculate correlation between POLLN and STDP
   */
  calculateCorrelation(): number {
    const results = this.simulateSTDP();
    const n = results.weightChanges.length;

    const meanPolln = results.weightChanges.reduce((a, b) => a + b, 0) / n;
    const meanSTDP = results.biologicalSTDP.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomPolln = 0;
    let denomSTDP = 0;

    for (let i = 0; i < n; i++) {
      const diffPolln = results.weightChanges[i] - meanPolln;
      const diffSTDP = results.biologicalSTDP[i] - meanSTDP;
      numerator += diffPolln * diffSTDP;
      denomPolln += diffPolln * diffPolln;
      denomSTDP += diffSTDP * diffSTDP;
    }

    return numerator / Math.sqrt(denomPolln * denomSTDP);
  }
}

// ============================================================================
// SIMULATION 2: Synaptic Weight Distribution
// ============================================================================

/**
 * Test if POLLN's synaptic weights follow log-normal distribution
 *
 * Biological finding: Cortical synapses follow log-normal distribution
 * Reference: Buzsáki et al. (2002)
 */
export class SynapseDistributionSimulation {
  private hebbian: HebbianLearning;

  constructor() {
    this.hebbian = new HebbianLearning({
      learningRate: 0.01,
      decayRate: 0.001,
      minWeight: 0.01,
      maxWeight: 1.0,
      traceLength: 100,
      traceDecay: 0.95,
      ojaNormalization: true,
    });
  }

  /**
   * Train synapses and collect final weights
   */
  async trainAndCollectWeights(numPairs: number = 100, numUpdates: number = 1000): Promise<number[]> {
    const weights: number[] = [];

    // Create synaptic pairs
    const pairs: { source: string; target: string }[] = [];
    for (let i = 0; i < numPairs; i++) {
      pairs.push({ source: `agent_${i}`, target: `agent_${(i + 1) % numPairs}` });
    }

    // Train
    for (let t = 0; t < numUpdates; t++) {
      for (const pair of pairs) {
        const preActivity = Math.random();
        const postActivity = Math.random();
        const reward = Math.random() > 0.5 ? 1 : -1;

        await this.hebbian.updateSynapse(
          pair.source,
          pair.target,
          preActivity,
          postActivity,
          reward
        );
      }
    }

    // Collect weights
    for (const pair of pairs) {
      const weight = this.hebbian.getWeight(pair.source, pair.target);
      weights.push(weight);
    }

    return weights;
  }

  /**
   * Test if weights are log-normally distributed
   */
  async testLogNormal(): Promise<{
    isLogNormal: boolean;
    mean: number;
    std: number;
    weights: number[];
  }> {
    const weights = await this.trainAndCollectWeights(100, 1000);

    // Test if log(weights) is normally distributed
    const logWeights = weights.map(w => Math.log(w + 0.001));

    const mean = logWeights.reduce((a, b) => a + b, 0) / logWeights.length;
    const variance = logWeights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / logWeights.length;
    const std = Math.sqrt(variance);

    // Simple normality test: check if 68% within 1 std, 95% within 2 std
    const within1Std = logWeights.filter(w => Math.abs(w - mean) <= std).length / logWeights.length;
    const within2Std = logWeights.filter(w => Math.abs(w - mean) <= 2 * std).length / logWeights.length;

    const isLogNormal = within1Std > 0.6 && within1Std < 0.75 && within2Std > 0.9;

    return { isLogNormal, mean, std, weights };
  }
}

// ============================================================================
// SIMULATION 3: Neural Criticality
// ============================================================================

/**
 * Test if POLLN colony operates near critical point
 *
 * Biological finding: Neural systems operate near phase transition (criticality)
 * Reference: Beggs & Plenz (2003)
 */
export class CriticalitySimulation {
  /**
   * Simulate activation avalanches in agent colony
   */
  simulateAvalanches(numAgents: number = 100, numTrials: number = 1000): number[] {
    const avalancheSizes: number[] = [];

    // Create random connectivity
    const connectivity: Map<number, number[]> = new Map();
    for (let i = 0; i < numAgents; i++) {
      const connections: number[] = [];
      for (let j = 0; j < numAgents; j++) {
        if (i !== j && Math.random() < 0.1) { // 10% connection probability
          connections.push(j);
        }
      }
      connectivity.set(i, connections);
    }

    // Trigger avalanches
    for (let t = 0; t < numTrials; t++) {
      const startAgent = Math.floor(Math.random() * numAgents);
      const avalancheSize = this.propagateAvalanche(startAgent, connectivity);
      avalancheSizes.push(avalancheSize);
    }

    return avalancheSizes;
  }

  private propagateAvalanche(startAgent: number, connectivity: Map<number, number[]>): number {
    const activated = new Set<number>();
    const queue = [startAgent];
    activated.add(startAgent);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const connections = connectivity.get(current) || [];

      for (const neighbor of connections) {
        // Activation probability (critical regime: p ≈ 0.2-0.3)
        if (!activated.has(neighbor) && Math.random() < 0.25) {
          activated.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return activated.size;
  }

  /**
   * Test power law distribution
   */
  testPowerLaw(avalancheSizes: number[]): {
    isPowerLaw: boolean;
    exponent: number;
  } {
    // Count avalanche sizes
    const sizeCounts: Map<number, number> = new Map();
    for (const size of avalancheSizes) {
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
    }

    // Fit power law: P(size) ∝ size^(-α)
    const sizes = Array.from(sizeCounts.keys()).filter(s => s >= 3); // Minimum size
    const counts = sizes.map(s => sizeCounts.get(s)!);

    // Log-log regression
    const logSizes = sizes.map(s => Math.log(s));
    const logCounts = counts.map(c => Math.log(c));

    const n = sizes.length;
    const sumX = logSizes.reduce((a, b) => a + b, 0);
    const sumY = logCounts.reduce((a, b) => a + b, 0);
    const sumXY = logSizes.reduce((sum, x, i) => sum + x * logCounts[i], 0);
    const sumXX = logSizes.reduce((sum, x) => sum + x * x, 0);

    // Exponent (negative of slope)
    const exponent = -(n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Critical systems have exponent ≈ 1.5
    const isPowerLaw = Math.abs(exponent - 1.5) < 0.3;

    return { isPowerLaw, exponent };
  }
}

// ============================================================================
// SIMULATION 4: Shannon Diversity Comparison
// ============================================================================

/**
 * Compare POLLN colony diversity to neural population diversity
 */
export class DiversitySimulation {
  /**
   * Calculate Shannon diversity for agent colony
   */
  calculateColonyDiversity(agentTypes: string[]): number {
    const typeCounts: Map<string, number> = new Map();
    for (const type of agentTypes) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    const total = agentTypes.length;
    let diversity = 0;

    for (const count of typeCounts.values()) {
      const p = count / total;
      diversity -= p * Math.log2(p);
    }

    return diversity;
  }

  /**
   * Calculate neural population diversity (from literature)
   */
  calculateNeuralDiversity(): {
    diversity: number;
    cellTypes: string[];
    proportions: number[];
  } {
    // From literature: ~50-100 distinct cell types in cortex
    const cellTypes = [
      'Excitatory Pyramidal L2/3',
      'Excitatory Pyramidal L4',
      'Excitatory Pyramidal L5',
      'Excitatory Pyramidal L6',
      'PV+ Basket Cell',
      'PV+ Chandelier Cell',
      'SST+ Martinotti Cell',
      'VIP+ Bipolar Cell',
      'Lamprey Neurogliaform Cell',
      'Other Interneuron',
    ];

    const proportions = [0.25, 0.15, 0.10, 0.08, 0.12, 0.08, 0.08, 0.06, 0.04, 0.04];

    let diversity = 0;
    for (const p of proportions) {
      diversity -= p * Math.log2(p);
    }

    return { diversity, cellTypes, proportions };
  }

  /**
   * Generate optimal diversity for given number of types
   */
  calculateOptimalDiversity(numTypes: number): number {
    // Maximum diversity when all types are equally represented
    // H' = log2(n)
    return Math.log2(numTypes);
  }

  /**
   * Compare colony diversity to neural diversity
   */
  compareDiversity(agentTypes: string[]): {
    colonyDiversity: number;
    neuralDiversity: number;
    optimalDiversity: number;
    colonyOptimalRatio: number;
    isHealthy: boolean;
  } {
    const colonyDiversity = this.calculateColonyDiversity(agentTypes);
    const { diversity: neuralDiversity } = this.calculateNeuralDiversity();
    const optimalDiversity = this.calculateOptimalDiversity(agentTypes.length);

    const colonyOptimalRatio = colonyDiversity / optimalDiversity;
    const isHealthy = colonyOptimalRatio > 0.7 && colonyOptimalRatio < 1.0;

    return {
      colonyDiversity,
      neuralDiversity,
      optimalDiversity,
      colonyOptimalRatio,
      isHealthy,
    };
  }
}

// ============================================================================
// SIMULATION 5: Gumbel-Softmax Decision Making
// ============================================================================

/**
 * Validate POLLN's Gumbel-Softmax against neural decision making
 */
export class DecisionMakingSimulation {
  private plinko: PlinkoLayer;

  constructor() {
    this.plinko = new PlinkoLayer({
      temperature: 1.0,
      minTemperature: 0.1,
      decayRate: 0.001,
    });
  }

  /**
   * Simulate decision making with different temperatures
   */
  simulateTemperatureSensitivity(): {
    temperatures: number[];
    entropies: number[];
    selectionVariability: number[];
  } {
    const temperatures: number[] = [];
    const entropies: number[] = [];
    const selectionVariability: number[] = [];

    const proposals = [
      { agentId: 'agent1', confidence: 0.8, bid: 1.0 },
      { agentId: 'agent2', confidence: 0.6, bid: 0.8 },
      { agentId: 'agent3', confidence: 0.4, bid: 0.6 },
      { agentId: 'agent4', confidence: 0.2, bid: 0.4 },
    ];

    // Test different temperatures
    for (const temp of [0.1, 0.5, 1.0, 2.0, 5.0]) {
      temperatures.push(temp);

      // Make decisions at this temperature
      const selections: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = this.plinko.gumbelSoftmax(proposals, temp);
        selections.push(result);
      }

      // Calculate entropy (diversity of selections)
      const selectionCounts: Map<string, number> = new Map();
      for (const s of selections) {
        selectionCounts.set(s, (selectionCounts.get(s) || 0) + 1);
      }

      let entropy = 0;
      for (const count of selectionCounts.values()) {
        const p = count / selections.length;
        entropy -= p * Math.log2(p);
      }

      entropies.push(entropy);

      // Calculate variability (unique selections / total selections)
      const variability = selectionCounts.size / proposals.length;
      selectionVariability.push(variability);
    }

    return { temperatures, entropies, selectionVariability };
  }

  /**
   * Compare to biological decision variability
   */
  compareToBiology(): {
    pollnEntropy: number;
    biologicalEntropy: number;
    isMatch: boolean;
  } {
    const results = this.simulateTemperatureSensitivity();
    const pollnEntropy = results.entropies[2]; // Temperature = 1.0

    // Biological finding: neural decision entropy ≈ 1.5-2.0 bits
    // Reference: Ma et al. (2006)
    const biologicalEntropy = 1.75;

    const isMatch = Math.abs(pollnEntropy - biologicalEntropy) < 0.5;

    return { pollnEntropy, biologicalEntropy, isMatch };
  }
}

// ============================================================================
// MAIN: Run all simulations
// ============================================================================

/**
 * Run all neuroscience validation simulations
 */
export async function runAllSimulations(): Promise<{
  stdp: { correlation: number };
  synapseDistribution: { isLogNormal: boolean };
  criticality: { isPowerLaw: boolean; exponent: number };
  diversity: { colonyDiversity: number; neuralDiversity: number };
  decisionMaking: { isMatch: boolean };
}> {
  console.log('Running neuroscience validation simulations...\n');

  // Simulation 1: STDP vs. Hebbian
  console.log('1. Testing STDP vs. Hebbian learning...');
  const stdpSim = new STDPSimulation();
  const stdpCorrelation = stdpSim.calculateCorrelation();
  console.log(`   Correlation: ${stdpCorrelation.toFixed(3)}`);

  // Simulation 2: Synapse distribution
  console.log('\n2. Testing synapse weight distribution...');
  const synapseSim = new SynapseDistributionSimulation();
  const synapseDist = await synapseSim.testLogNormal();
  console.log(`   Log-normal: ${synapseDist.isLogNormal ? 'YES' : 'NO'}`);

  // Simulation 3: Criticality
  console.log('\n3. Testing neural criticality...');
  const criticalitySim = new CriticalitySimulation();
  const avalanches = criticalitySim.simulateAvalanches(100, 1000);
  const criticality = criticalitySim.testPowerLaw(avalanches);
  console.log(`   Power-law exponent: ${criticality.exponent.toFixed(2)}`);
  console.log(`   Critical: ${criticality.isPowerLaw ? 'YES' : 'NO'}`);

  // Simulation 4: Diversity
  console.log('\n4. Testing colony diversity...');
  const diversitySim = new DiversitySimulation();
  const agentTypes = Array.from({ length: 100 }, (_, i) => `type_${i % 5}`);
  const diversity = diversitySim.compareDiversity(agentTypes);
  console.log(`   Colony diversity: ${diversity.colonyDiversity.toFixed(2)} bits`);
  console.log(`   Neural diversity: ${diversity.neuralDiversity.toFixed(2)} bits`);
  console.log(`   Healthy: ${diversity.isHealthy ? 'YES' : 'NO'}`);

  // Simulation 5: Decision making
  console.log('\n5. Testing decision making variability...');
  const decisionSim = new DecisionMakingSimulation();
  const decisionMaking = decisionSim.compareToBiology();
  console.log(`   POLLN entropy: ${decisionMaking.pollnEntropy.toFixed(2)} bits`);
  console.log(`   Biological entropy: ${decisionMaking.biologicalEntropy.toFixed(2)} bits`);
  console.log(`   Match: ${decisionMaking.isMatch ? 'YES' : 'NO'}`);

  console.log('\n=== SIMULATIONS COMPLETE ===\n');

  return {
    stdp: { correlation: stdpCorrelation },
    synapseDistribution: { isLogNormal: synapseDist.isLogNormal },
    criticality: { isPowerLaw: criticality.isPowerLaw, exponent: criticality.exponent },
    diversity: { colonyDiversity: diversity.colonyDiversity, neuralDiversity: diversity.neuralDiversity },
    decisionMaking: { isMatch: decisionMaking.isMatch },
  };
}

// Run simulations if executed directly
if (require.main === module) {
  runAllSimulations().then(results => {
    console.log('\n=== SUMMARY ===');
    console.log(`STDP correlation: ${results.stdp.correlation.toFixed(3)}`);
    console.log(`Log-normal synapses: ${results.synapseDistribution.isLogNormal ? 'YES' : 'NO'}`);
    console.log(`Criticality exponent: ${results.criticality.exponent.toFixed(2)} (critical: ${results.criticality.isPowerLaw ? 'YES' : 'NO'})`);
    console.log(`Colony diversity: ${results.diversity.colonyDiversity.toFixed(2)} bits`);
    console.log(`Decision making match: ${results.decisionMaking.isMatch ? 'YES' : 'NO'}`);
  });
}
