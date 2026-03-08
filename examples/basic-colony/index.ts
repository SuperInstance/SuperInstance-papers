/**
 * Basic Colony Demo
 *
 * Demonstrates:
 * - Colony setup with multiple agents
 * - Agent-to-agent (A2A) communication
 * - Plinko stochastic selection
 * - Hebbian learning
 */

import { Colony, PlinkoLayer } from '../../src/core/index.js';
import { GreeterAgent, TaskAgent, FarewellAgent } from './agents.js';
import { colonyConfig, plinkoConfig, agentConfigs } from './config.js';
import type { AgentProposal } from '../../src/core/index.js';

// Agent instances
const agents: Map<string, GreeterAgent | TaskAgent | FarewellAgent> = new Map();

/**
 * Initialize the colony
 */
async function initializeColony(): Promise<Colony> {
  console.log('Basic Colony Demo');
  console.log('=================\n');

  // Create colony
  const colony = new Colony(colonyConfig);

  // Create and register agents
  console.log('Creating agents...');

  const greeter = new GreeterAgent(agentConfigs[0]);
  const taskAgent = new TaskAgent(agentConfigs[1]);
  const farewell = new FarewellAgent(agentConfigs[2]);

  await greeter.initialize();
  await taskAgent.initialize();
  await farewell.initialize();

  colony.registerAgent(agentConfigs[0]);
  colony.registerAgent(agentConfigs[1]);
  colony.registerAgent(agentConfigs[2]);

  agents.set('greeter-agent', greeter);
  agents.set('task-agent', taskAgent);
  agents.set('farewell-agent', farewell);

  console.log(`Created colony with ${agents.size} agents`);
  console.log('- greeter-agent (GreeterAgent)');
  console.log('- task-agent (TaskAgent)');
  console.log('- farewell-agent (FarewellAgent)');
  console.log();

  return colony;
}

/**
 * Process a message through the colony
 */
async function processMessage(
  colony: Colony,
  plinko: PlinkoLayer,
  message: string
): Promise<void> {
  console.log(`Sending message: "${message}"`);

  // Collect proposals from all agents
  const proposals: AgentProposal[] = [];

  for (const [agentId, agent] of agents) {
    const bid = agent.calculateBid(message);
    const confidence = agent.calculateConfidence(message);

    proposals.push({
      agentId,
      confidence,
      bid,
    });

    console.log(`  ${agentId} bids: ${bid.toFixed(2)} (confidence: ${confidence.toFixed(2)})`);
  }

  // Use Plinko to select agent
  const result = await plinko.process(proposals);

  console.log(`Selected: ${result.selectedAgentId}`);
  console.log(`Reason: ${result.explanation}`);
  console.log(`Entropy: ${result.entropy.toFixed(4)}`);

  // Execute selected agent
  const selectedAgent = agents.get(result.selectedAgentId);
  if (selectedAgent) {
    const response = await selectedAgent.process(message);
    console.log(`Response: "${response.payload}"`);

    // Update colony stats
    colony.recordResult(result.selectedAgentId, true, 100);
  }

  console.log();
}

/**
 * Run the demo
 */
async function runDemo(): Promise<void> {
  // Initialize
  const colony = await initializeColony();
  const plinko = new PlinkoLayer(plinkoConfig);

  // Add a simple safety discriminator
  plinko.registerDiscriminator('safety', (proposal: AgentProposal) => {
    // All proposals are safe in this demo
    return true;
  });

  // Test messages
  const testMessages = [
    'Hello, I need help with a task',
    'Can you do something for me?',
    'Goodbye!',
    'Hi there!',
    'I need assistance please',
  ];

  // Process each message
  for (const message of testMessages) {
    await processMessage(colony, plinko, message);

    // Small delay for readability
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Show final stats
  console.log('Colony Stats:');
  const stats = colony.getStats();
  console.log(`- Total Agents: ${stats.totalAgents}`);
  console.log(`- Active Agents: ${stats.activeAgents}`);
  console.log(`- Shannon Diversity: ${stats.shannonDiversity.toFixed(2)}`);
  console.log();

  // Show Plinko history
  console.log('Decision History (last 5):');
  const history = plinko.getHistory(5);
  for (const decision of history) {
    console.log(`- ${decision.selectedAgentId} (temp: ${decision.temperature.toFixed(3)})`);
  }

  // Shutdown
  console.log('\nShutting down...');
  for (const [_, agent] of agents) {
    await agent.shutdown();
  }

  console.log('\nDemo complete!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
