/**
 * POLLN Game Theory Research - Usage Examples
 *
 * This file demonstrates how to use the game-theoretic mechanisms
 * and visualization tools.
 */

import {
  PeerPredictionScoring,
  ContributionCreditSystem,
  ReciprocalReputationSystem,
  BanditSelection,
  EigenTrustAlgorithm,
  ByzantineResilientAggregation
} from './mechanisms.js';

import {
  visualizeStrategyEvolution,
  visualizePayoffMatrix,
  visualizeReputationNetwork,
  visualizeSocialWelfare,
  visualizeShapleyValues
} from './visualize.js';

// ============================================================================
// EXAMPLE 1: Federated Learning with Anti-Free-Riding
// ============================================================================

async function exampleFederatedLearning() {
  console.log('=== Example 1: Federated Learning ===');

  const tokenSystem = new ContributionCreditSystem({
    tokensPerSample: 1,
    qualityMultiplier: 10,
    baseRequirement: 100,
    decayRate: 0.01
  });

  // Simulate multiple colonies participating
  const colonies = ['colony-1', 'colony-2', 'colony-3', 'colony-4', 'colony-5'];
  const round: FederatedRoundInfo = {
    roundNumber: 1,
    modelVersion: 1,
    participants: colonies
  };

  // Colonies contribute gradients
  for (const colonyId of colonies) {
    const quality = Math.random(); // Random quality
    const sampleCount = Math.floor(50 + Math.random() * 150);

    const update: GradientUpdateInfo = {
      gradients: Array(10).fill(0).map(() => Math.random()),
      sampleCount,
      trainingLoss: 1 - quality,
      timestamp: Date.now()
    };

    const tokensEarned = tokenSystem.allocateTokens(colonyId, round, update);
    console.log(`${colonyId} earned ${tokensEarned.toFixed(0)} tokens`);
  }

  // Try to access model
  for (const colonyId of colonies) {
    const canAccess = tokenSystem.canAccessModel(colonyId, 1);
    console.log(`${colonyId} can access model: ${canAccess}`);

    if (canAccess) {
      tokenSystem.redeemTokens(colonyId, 1, 100);
    }
  }

  // Show final balances
  console.log('\nFinal Token Balances:');
  for (const colonyId of colonies) {
    const balance = tokenSystem.getBalance(colonyId);
    console.log(`  ${colonyId}: ${balance?.balance.toFixed(0) || 0} tokens`);
  }
}

// ============================================================================
// EXAMPLE 2: Reciprocal Reputation in Meadow
// ============================================================================

async function exampleMeadowReputation() {
  console.log('\n=== Example 2: Meadow Reputation ===');

  const reputation = new ReciprocalReputationSystem({
    minAccessRatio: 0.5,
    decayFactor: 0.95,
    gracePeriod: 3
  });

  // Simulate sharing and consuming
  const colonies = ['colony-1', 'colony-2', 'colony-3'];

  // Colony-1 shares a lot
  for (let i = 0; i < 10; i++) {
    reputation.recordShare('colony-1', `grain-${i}`);
  }
  reputation.recordConsume('colony-1', 'grain-10');

  // Colony-2 free-rides (only consumes)
  for (let i = 0; i < 8; i++) {
    reputation.recordConsume('colony-2', `grain-${i + 20}`);
  }

  // Colony-3 balances sharing and consuming
  for (let i = 0; i < 5; i++) {
    reputation.recordShare('colony-3', `grain-${i + 30}`);
    reputation.recordConsume('colony-3', `grain-${i + 40}`);
  }

  // Show reciprocity scores
  console.log('\nReciprocity Scores:');
  for (const colonyId of colonies) {
    const ratio = reputation.getRatio(colonyId);
    console.log(`  ${colonyId}: ${ratio?.reciprocityScore.toFixed(3)} (${ratio?.grainsShared} shared, ${ratio?.grainsConsumed} consumed)`);
  }

  // Try to access restricted grain
  const grain: SharedPollenGrainInfo = {
    id: 'grain-100',
    restrictionLevel: 'RESTRICTED',
    communityId: 'community-1',
    sharedBy: 'colony-0'
  };

  console.log('\nAccess Control:');
  for (const colonyId of colonies) {
    const result = reputation.canAccessGrain(colonyId, grain);
    console.log(`  ${colonyId}: ${result.allowed} ${result.reason ? `(${result.reason})` : ''}`);
  }
}

// ============================================================================
// EXAMPLE 3: Thompson Sampling for Agent Selection
// ============================================================================

async function exampleBanditSelection() {
  console.log('\n=== Example 3: Bandit Selection ===');

  const bandit = new BanditSelection({
    alpha: 1,
    beta: 1,
    minPulls: 5
  });

  const proposals: AgentProposalBandit[] = [
    { agentId: 'agent-1', confidence: 0.5 },
    { agentId: 'agent-2', confidence: 0.6 },
    { agentId: 'agent-3', confidence: 0.7 }
  ];

  // Simulate 100 selections with different reward patterns
  const agentRewards = {
    'agent-1': 0.7,  // Good 70% of the time
    'agent-2': 0.5,  // Good 50% of the time
    'agent-3': 0.3   // Good 30% of the time
  };

  const selections: Record<string, number> = {
    'agent-1': 0,
    'agent-2': 0,
    'agent-3': 0
  };

  for (let i = 0; i < 100; i++) {
    const selected = bandit.selectAgent(proposals);
    selections[selected]++;

    // Give reward based on agent's true quality
    const reward = Math.random() < agentRewards[selected] ? 1 : -0.5;
    bandit.updateReward(selected, reward);
  }

  console.log('\nSelection Distribution:');
  for (const [agentId, count] of Object.entries(selections)) {
    console.log(`  ${agentId}: ${count} selections (${(count / 100 * 100).toFixed(0)}%)`);
  }

  // Show success probabilities
  const probs = bandit.getSuccessProbabilities();
  console.log('\nEstimated Success Probabilities:');
  for (const [agentId, prob] of probs) {
    console.log(`  ${agentId}: ${prob.toFixed(3)} (true: ${agentRewards[agentId].toFixed(3)})`);
  }
}

// ============================================================================
// EXAMPLE 4: EigenTrust Reputation Network
// ============================================================================

async function exampleEigenTrust() {
  console.log('\n=== Example 4: EigenTrust ===');

  const eigenTrust = new EigenTrustAlgorithm({
    iterations: 100,
    convergenceThreshold: 1e-6,
    alpha: 0.5,
    decay: 0.99
  });

  const colonies = ['colony-1', 'colony-2', 'colony-3', 'colony-4', 'colony-5'];

  // Set up local trust scores
  // Colony-1 is trusted by everyone
  for (const colony of colonies) {
    if (colony !== 'colony-1') {
      eigenTrust.setLocalTrust(colony, 'colony-1', 0.9);
    }
  }

  // Colony-2 is barely trusted
  for (const colony of colonies) {
    if (colony !== 'colony-2') {
      eigenTrust.setLocalTrust(colony, 'colony-2', 0.1);
    }
  }

  // Colony-3 and colony-4 trust each other moderately
  eigenTrust.setLocalTrust('colony-3', 'colony-4', 0.7);
  eigenTrust.setLocalTrust('colony-4', 'colony-3', 0.7);

  // Compute global reputation
  const reputation = eigenTrust.computeGlobalReputation();

  console.log('\nGlobal Reputation Scores:');
  const sorted = Array.from(reputation.entries()).sort((a, b) => b[1] - a[1]);
  for (const [colonyId, score] of sorted) {
    console.log(`  ${colonyId}: ${score.toFixed(4)}`);
  }

  // Create visualization data
  const nodes = colonies;
  const edges: Array<{ source: string; target: string; weight: number }> = [];

  for (const [truster, trustees] of eigenTrust.getLocalTrust()) {
    for (const [trustee, weight] of trustees) {
      if (weight > 0.5) { // Only show strong trust relationships
        edges.push({ source: truster, target: trustee, weight });
      }
    }
  }

  // Uncomment to generate visualization
  // visualizeReputationNetwork(nodes, edges, reputation, './reputation-network.html');
}

// ============================================================================
// EXAMPLE 5: Byzantine-Resilient Aggregation
// ============================================================================

async function exampleByzantineAggregation() {
  console.log('\n=== Example 5: Byzantine Aggregation ===');

  const aggregation = new ByzantineResilientAggregation({
    k: 1,
    f: 1,
    method: 'KRUM'
  });

  // Create gradient updates with 1 Byzantine agent
  const updates: GradientUpdateInfo[] = [
    {
      gradients: [1, 2, 3, 4, 5],
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    },
    {
      gradients: [1.1, 2.1, 3.1, 4.1, 5.1],  // Similar to first
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    },
    {
      gradients: [0.9, 1.9, 2.9, 3.9, 4.9],  // Similar to first
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    },
    {
      gradients: [100, 200, 300, 400, 500],  // Byzantine (malicious)
      sampleCount: 100,
      trainingLoss: 0.5,
      timestamp: Date.now()
    }
  ];

  // Aggregate using Krum
  const result = aggregation.aggregate(updates);

  console.log('\nAggregated Gradients:');
  console.log(`  [${result.map(v => v.toFixed(2)).join(', ')}]`);

  // Compare with simple average (vulnerable to Byzantine)
  const simpleAverage = updates[0].gradients.map((_, i) =>
    updates.reduce((sum, u) => sum + u.gradients[i], 0) / updates.length
  );

  console.log('\nSimple Average (vulnerable):');
  console.log(`  [${simpleAverage.map(v => v.toFixed(2)).join(', ')}]`);

  console.log('\nKrum successfully rejected Byzantine update!');
}

// ============================================================================
// EXAMPLE 6: Complete Simulation with Visualization
// ============================================================================

async function exampleCompleteSimulation() {
  console.log('\n=== Example 6: Complete Simulation ===');

  // Run a simulation tracking strategies over time
  const rounds: number[] = [];
  const strategyDistribution = new Map<number, Map<string, number>>();

  for (let round = 0; round < 100; round++) {
    rounds.push(round);

    // Simulate strategy evolution
    const dist = new Map<string, number>();
    const cooperateCount = Math.max(0, 50 - round * 0.3); // Cooperation declines
    const defectCount = 100 - cooperateCount;

    dist.set('COOPERATE', cooperateCount);
    dist.set('DEFECT', defectCount);

    strategyDistribution.set(round, dist);
  }

  // Generate visualization
  // Uncomment to create visualization
  // visualizeStrategyEvolution(rounds, strategyDistribution, './strategy-evolution.html');

  console.log('\nSimulation Results:');
  console.log(`  Total rounds: ${rounds.length}`);
  console.log(`  Initial cooperators: ${strategyDistribution.get(0)?.get('COOPERATE')}`);
  console.log(`  Final cooperators: ${strategyDistribution.get(99)?.get('COOPERATE')}`);
  console.log('  Visualization saved to ./strategy-evolution.html');
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
  try {
    await exampleFederatedLearning();
    await exampleMeadowReputation();
    await exampleBanditSelection();
    await exampleEigenTrust();
    await exampleByzantineAggregation();
    await exampleCompleteSimulation();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FederatedRoundInfo {
  roundNumber: number;
  modelVersion: number;
  participants: string[];
}

interface GradientUpdateInfo {
  gradients: number[];
  sampleCount: number;
  trainingLoss: number;
  timestamp: number;
}

interface SharedPollenGrainInfo {
  id: string;
  restrictionLevel: string;
  communityId: string;
  sharedBy: string;
}

interface AgentProposalBandit {
  agentId: string;
  confidence: number;
  bid?: number;
}
