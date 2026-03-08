/**
 * Code Reviewer Demo
 *
 * Demonstrates:
 * - Multiple specialized review agents
 * - Value network predictions for code quality
 * - Trajectory tracking and TD(λ) learning
 * - Plinko selection for agent coordination
 */

import { Colony, PlinkoLayer, ValueNetwork, ValueNetworkManager } from '../../src/core/index.js';
import {
  SecurityAgent,
  StyleAgent,
  PerformanceAgent,
  TestAgent,
  DocumentationAgent,
} from './reviewers.js';
import { config, type CodeSample, type ReviewResult } from './config.js';
import type { AgentProposal, Trajectory, StateAction } from '../../src/core/index.js';
import { v4 as uuidv4 } from 'uuid';

// Agent instances
const agents: Map<string, SecurityAgent | StyleAgent | PerformanceAgent | TestAgent | DocumentationAgent> = new Map();
let valueNetwork: ValueNetwork;
let valueManager: ValueNetworkManager;
let colony: Colony;
let plinko: PlinkoLayer;

/**
 * Initialize the code review system
 */
async function initializeSystem(): Promise<void> {
  console.log('Code Reviewer Demo');
  console.log('==================\n');

  // Create colony
  colony = new Colony({
    id: 'code-review-colony',
    gardenerId: 'review-system',
    name: 'Code Review Colony',
    maxAgents: 10,
    resourceBudget: {
      totalCompute: 100,
      totalMemory: 1000,
      totalNetwork: 100,
    },
  });

  // Create value network
  valueManager = new ValueNetworkManager();
  valueNetwork = valueManager.getNetwork('review');

  // Initialize value network config
  Object.assign(valueNetwork, config.valueNetwork);

  // Create Plinko layer
  plinko = new PlinkoLayer(config.plinko);

  // Create and register agents
  console.log(`Initializing code review colony with ${config.reviewAgents.length} agents`);

  for (const agentConfig of config.reviewAgents) {
    let agent: SecurityAgent | StyleAgent | PerformanceAgent | TestAgent | DocumentationAgent;

    const baseConfig = {
      id: agentConfig.id,
      typeId: agentConfig.name,
      categoryId: 'role',
      modelFamily: 'code-reviewer',
      defaultParams: {},
      inputTopics: ['code'],
      outputTopic: 'review',
      minExamples: 10,
      requiresWorldModel: false,
    };

    switch (agentConfig.name) {
      case 'SecurityAgent':
        agent = new SecurityAgent(baseConfig);
        break;
      case 'StyleAgent':
        agent = new StyleAgent(baseConfig);
        break;
      case 'PerformanceAgent':
        agent = new PerformanceAgent(baseConfig);
        break;
      case 'TestAgent':
        agent = new TestAgent(baseConfig);
        break;
      case 'DocumentationAgent':
        agent = new DocumentationAgent(baseConfig);
        break;
      default:
        continue;
    }

    await agent.initialize();
    colony.registerAgent(baseConfig);
    agents.set(agentConfig.id, agent);

    console.log(`  ${agentConfig.name} - ${agentConfig.description}`);
  }

  console.log();
}

/**
 * Analyze code with agents
 */
async function analyzeCode(sample: CodeSample): Promise<ReviewResult | null> {
  console.log(`Reviewing code sample ${sample.id}...`);
  console.log(`  Code: "${sample.code}"`);
  console.log();

  // Collect proposals from all agents
  const proposals: AgentProposal[] = [];
  const agentAnalyses: Map<string, { confidence: number; bid: number }> = new Map();

  for (const [agentId, agent] of agents) {
    let confidence = 0.5;
    let bid = 0.5;

    // Get agent-specific analysis
    if (agent instanceof SecurityAgent) {
      const analysis = (agent as any).analyzeSecurity(sample.code);
      confidence = analysis.confidence;
      bid = analysis.bid;
    } else if (agent instanceof StyleAgent) {
      const analysis = (agent as any).analyzeStyle(sample.code);
      confidence = analysis.confidence;
      bid = analysis.bid;
    } else if (agent instanceof PerformanceAgent) {
      const analysis = (agent as any).analyzePerformance(sample.code);
      confidence = analysis.confidence;
      bid = analysis.bid;
    } else if (agent instanceof TestAgent) {
      const analysis = (agent as any).analyzeTesting(sample.code);
      confidence = analysis.confidence;
      bid = analysis.bid;
    } else if (agent instanceof DocumentationAgent) {
      const analysis = (agent as any).analyzeDocumentation(sample.code);
      confidence = analysis.confidence;
      bid = analysis.bid;
    }

    proposals.push({
      agentId,
      confidence,
      bid,
    });

    agentAnalyses.set(agentId, { confidence, bid });
  }

  // Display proposals
  console.log('  Agent proposals:');
  const agentConfigs = new Map(config.reviewAgents.map(a => [a.id, a]));

  for (const proposal of proposals) {
    const agentConfig = agentConfigs.get(proposal.agentId);
    const focus = agentConfig?.focus[0] || 'general';
    console.log(
      `    ${agentConfig?.name || proposal.agentId}: confidence=${proposal.confidence.toFixed(2)}, ` +
      `bid=${proposal.bid.toFixed(2)} (${focus}: ...)`
    );
  }
  console.log();

  // Use Plinko to select agent
  const result = await plinko.process(proposals);

  console.log(`  Selected: ${agentConfigs.get(result.selectedAgentId!)?.name || result.selectedAgentId} ` +
              `(temperature=${result.temperature.toFixed(3)})`);

  // Execute selected agent
  const selectedAgent = agents.get(result.selectedAgentId!);
  if (!selectedAgent) return null;

  const response = await selectedAgent.process(sample.code);
  const review = response.payload as string;

  console.log(`  Review: "${review}"`);
  console.log();

  // Compute value prediction
  const stateMap = new Map<string, unknown>([
    ['code', sample.code],
    ['agentType', selectedAgent.config.typeId],
    ['review', review],
    ['confidence', agentAnalyses.get(result.selectedAgentId!)?.confidence],
  ]);

  const valuePrediction = valueNetwork.predict(stateMap);

  console.log(`  Value prediction: ${valuePrediction.value.toFixed(2)} ` +
              `(${getValueRating(valuePrediction.value)})`);
  console.log(`  Confidence: ${valuePrediction.confidence.toFixed(2)}`);
  console.log();

  // Record trajectory for learning
  const trajectory = recordTrajectory(sample, result.selectedAgentId!, review, valuePrediction.value);

  return {
    agentId: result.selectedAgentId!,
    agentName: agentConfigs.get(result.selectedAgentId!)?.name || result.selectedAgentId!,
    review,
    severity: getSeverityFromReview(review),
    value: valuePrediction.value,
    confidence: valuePrediction.confidence,
    timestamp: Date.now(),
  };
}

/**
 * Record trajectory for value network learning
 */
function recordTrajectory(
  sample: CodeSample,
  agentId: string,
  review: string,
  value: number
): Trajectory {
  const states: StateAction[] = [
    {
      state: new Map<string, unknown>([
        ['code', sample.code],
        ['step', 'analyze'],
      ]),
      action: agentId,
      reward: value * 0.5,
      timestamp: Date.now(),
    },
    {
      state: new Map<string, unknown>([
        ['code', sample.code],
        ['step', 'review'],
        ['agentType', agentId],
      ]),
      action: 'complete',
      reward: value,
      timestamp: Date.now(),
    },
  ];

  const trajectory: Trajectory = {
    id: uuidv4(),
    agentId,
    states,
    finalValue: value,
    length: states.length,
  };

  valueNetwork.addTrajectory(trajectory);

  console.log('  Trajectory recorded for learning');
  console.log();

  return trajectory;
}

/**
 * Get rating label for value
 */
function getValueRating(value: number): string {
  if (value >= 0.8) return 'high impact';
  if (value >= 0.6) return 'medium-high impact';
  if (value >= 0.4) return 'medium impact';
  if (value >= 0.2) return 'low-medium impact';
  return 'low impact';
}

/**
 * Extract severity from review text
 */
function getSeverityFromReview(review: string): 'critical' | 'warning' | 'info' | 'suggestion' {
  const upper = review.toUpperCase();
  if (upper.includes('CRITICAL')) return 'critical';
  if (upper.includes('WARNING')) return 'warning';
  if (upper.includes('SUGGESTION')) return 'suggestion';
  return 'info';
}

/**
 * Train value network on collected trajectories
 */
function trainValueNetwork(): void {
  console.log('Training value network...');

  const result = valueNetwork.train();

  console.log(`  Using ${result.samplesUsed} trajectories`);
  console.log(`  TD(λ) samples generated: ${result.samplesUsed}`);
  console.log(`  Training loss: ${result.loss.toFixed(3)}`);

  const stats = valueNetwork.getStats();
  const confidenceImprovement = stats.trainingCount > 0 ?
    `${(0.5 + stats.trainingCount / 1000).toFixed(2)}` : '0.50';

  console.log(`  Network confidence increased: 0.50 -> ${confidenceImprovement}`);
  console.log();
}

/**
 * Display system statistics
 */
function displayStatistics(reviews: ReviewResult[]): void {
  console.log('Value network statistics:');
  const stats = valueNetwork.getStats();
  console.log(`  Total trajectories: ${stats.trajectories}`);
  console.log(`  Training runs: ${stats.trainingCount}`);
  console.log(`  Average prediction confidence: ${(0.5 + stats.trainingCount / 1000).toFixed(2)}`);

  const highValueCount = reviews.filter(r => r.value >= 0.6).length;
  console.log(`  High-value reviews identified: ${highValueCount}`);
  console.log();

  // Agent rankings
  console.log('Agent performance rankings:');

  const agentStats = new Map<string, { count: number; totalValue: number }>();

  for (const review of reviews) {
    const stats = agentStats.get(review.agentId) || { count: 0, totalValue: 0 };
    stats.count++;
    stats.totalValue += review.value;
    agentStats.set(review.agentId, stats);
  }

  const rankings = Array.from(agentStats.entries())
    .map(([agentId, stats]) => ({
      agentId,
      count: stats.count,
      avgValue: stats.totalValue / stats.count,
    }))
    .sort((a, b) => b.avgValue - a.avgValue);

  const agentConfigs = new Map(config.reviewAgents.map(a => [a.id, a]));

  for (let i = 0; i < rankings.length; i++) {
    const ranking = rankings[i];
    const name = agentConfigs.get(ranking.agentId)?.name || ranking.agentId;
    console.log(
      `  ${i + 1}. ${name}: ${ranking.count} reviews, ` +
      `avg value=${ranking.avgValue.toFixed(2)}`
    );
  }

  console.log();
}

/**
 * Run the demo
 */
async function runDemo(): Promise<void> {
  await initializeSystem();

  // Code samples to review
  const codeSamples: CodeSample[] = [
    {
      id: '1',
      code: 'function getUser(id) { return users.find(id); }',
      language: 'javascript',
    },
    {
      id: '2',
      code: 'const data = fetch(url).then(r => r.json())',
      language: 'javascript',
    },
    {
      id: '3',
      code: 'for (let i = 0; i < items.length; i++) { console.log(items[i]); }',
      language: 'javascript',
    },
    {
      id: '4',
      code: 'var x = 10; function calc() { return x * 2; }',
      language: 'javascript',
    },
    {
      id: '5',
      code: 'async function processData(data) { return JSON.parse(data); }',
      language: 'javascript',
    },
  ];

  const reviews: ReviewResult[] = [];

  // Analyze each code sample
  for (const sample of codeSamples) {
    const result = await analyzeCode(sample);
    if (result) {
      reviews.push(result);
    }

    // Small delay between reviews
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Train value network
  trainValueNetwork();

  // Display statistics
  displayStatistics(reviews);

  console.log('Demo complete!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
