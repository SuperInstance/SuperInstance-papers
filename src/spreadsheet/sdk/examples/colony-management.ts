/**
 * POLLN Spreadsheet SDK - Colony Management Examples
 *
 * This file demonstrates comprehensive colony and agent management operations.
 *
 * @module examples/colony-management
 */

import { createClient } from '../index.js';

// ============================================================================
// Example 1: Create and Configure Colony
// ============================================================================

/**
 * Example 1: Basic colony creation and configuration
 */
export async function example1_createColony() {
  console.log('=== Example 1: Create and Configure Colony ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create a new colony
  const colony = await colonies.create({
    name: 'data-processing-colony',
    maxAgents: 100,
    resourceBudget: {
      totalCompute: 2000,
      totalMemory: 4096,
      totalNetwork: 500,
    },
    metadata: {
      description: 'Colony for processing large datasets',
      tags: ['data-processing', 'batch', 'analytics'],
    },
  });

  console.log('✓ Colony created:');
  console.log('  - ID:', colony.id);
  console.log('  - Name:', colony.name);
  console.log('  - Max agents:', colony.totalAgents);
  console.log('  - Active agents:', colony.activeAgents);
  console.log('  - Shannon diversity:', colony.shannonDiversity);

  // Get colony configuration
  const config = await colonies.getConfig(colony.id);
  console.log('\n✓ Colony configuration:');
  console.log('  - Max agents:', config.maxAgents);
  console.log('  - Distributed:', config.distributed);
  console.log('  - Resource budget:', config.resourceBudget);

  await client.disconnect();
}

// ============================================================================
// Example 2: Deploy and Manage Agents
// ============================================================================

/**
 * Example 2: Deploy different types of agents
 */
export async function example2_deployAgents() {
  console.log('=== Example 2: Deploy and Manage Agents ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'multi-agent-colony',
    maxAgents: 50,
  });

  console.log('✓ Colony created:', colony.id);

  // Deploy ephemeral agent
  const ephemeralAgent = await colonies.deployAgent(colony.id, {
    category: 'ephemeral',
    typeId: 'csv-processor',
    goal: 'Process CSV files',
    modelFamily: 'default',
    inputTopics: ['csv-upload'],
    outputTopic: 'processed-data',
    defaultParams: {
      batchSize: 1000,
      skipHeader: true,
    },
  });

  console.log('\n✓ Ephemeral agent deployed:');
  console.log('  - ID:', ephemeralAgent.agentId);
  console.log('  - Category:', ephemeralAgent.config.category);
  console.log('  - Goal:', ephemeralAgent.config.goal);

  // Deploy role agent
  const roleAgent = await colonies.deployAgent(colony.id, {
    category: 'role',
    typeId: 'data-validator',
    goal: 'Validate data quality',
    modelFamily: 'default',
    inputTopics: ['processed-data'],
    outputTopic: 'validated-data',
  });

  console.log('\n✓ Role agent deployed:');
  console.log('  - ID:', roleAgent.agentId);
  console.log('  - Category:', roleAgent.config.category);
  console.log('  - Goal:', roleAgent.config.goal);

  // List all agents
  const agents = await colonies.listAgents(colony.id);
  console.log('\n✓ Agents in colony:', agents.data.length);
  for (const agent of agents.data) {
    console.log('  -', agent.agentId, '(', agent.category, ')');
  }

  await client.disconnect();
}

// ============================================================================
// Example 3: Agent Lifecycle Management
// ============================================================================

/**
 * Example 3: Manage agent lifecycle
 */
export async function example3_agentLifecycle() {
  console.log('=== Example 3: Agent Lifecycle Management ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'lifecycle-test',
    maxAgents: 10,
  });

  console.log('✓ Colony created:', colony.id);

  // Deploy agent
  const agent = await colonies.deployAgent(colony.id, {
    category: 'ephemeral',
    goal: 'Test agent',
  });

  console.log('\n✓ Agent deployed:', agent.agentId);

  // Get agent details
  const details = await colonies.getAgent(colony.id, agent.agentId);
  console.log('\n✓ Agent details:');
  console.log('  - Status:', details.status);
  console.log('  - Statistics:', details.statistics);

  // Activate agent
  const activated = await colonies.activateAgent(colony.id, agent.agentId);
  console.log('\n✓ Agent activated:', activated.status);

  // Deactivate agent
  const deactivated = await colonies.deactivateAgent(colony.id, agent.agentId);
  console.log('✓ Agent deactivated:', deactivated.status);

  // Remove agent
  await colonies.removeAgent(colony.id, agent.agentId);
  console.log('✓ Agent removed');

  await client.disconnect();
}

// ============================================================================
// Example 4: Resource Management
// ============================================================================

/**
 * Example 4: Manage colony resources
 */
export async function example4_resourceManagement() {
  console.log('=== Example 4: Resource Management ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'resource-test',
    maxAgents: 20,
    resourceBudget: {
      totalCompute: 1000,
      totalMemory: 2048,
      totalNetwork: 100,
    },
  });

  console.log('✓ Colony created:', colony.id);

  // Get current resource budget
  const budget = await colonies.getResourceBudget(colony.id);
  console.log('\n✓ Current resource budget:');
  console.log('  - Compute:', budget.totalCompute);
  console.log('  - Memory:', budget.totalMemory);
  console.log('  - Network:', budget.totalNetwork);

  // Get resource utilization
  const util = await colonies.getResourceUtilization(colony.id);
  console.log('\n✓ Resource utilization:');
  console.log('  - CPU:', util.cpuPercent, '%');
  console.log('  - Memory:', util.memoryPercent, '%');
  console.log('  - Network:', util.networkPercent, '%');
  console.log('  - Agents:', util.agentCount);
  console.log('  - Active tasks:', util.activeTaskCount);

  // Update resource budget
  const updatedBudget = await colonies.updateResourceBudget(colony.id, {
    totalCompute: 2000,
    totalMemory: 4096,
    totalNetwork: 200,
  });

  console.log('\n✓ Resource budget updated:');
  console.log('  - Compute:', updatedBudget.totalCompute);
  console.log('  - Memory:', updatedBudget.totalMemory);
  console.log('  - Network:', updatedBudget.totalNetwork);

  await client.disconnect();
}

// ============================================================================
// Example 5: Colony Statistics and Monitoring
// ============================================================================

/**
 * Example 5: Monitor colony statistics
 */
export async function example5_monitoring() {
  console.log('=== Example 5: Colony Monitoring ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'monitoring-test',
    maxAgents: 30,
  });

  console.log('✓ Colony created:', colony.id);

  // Deploy some agents
  for (let i = 0; i < 5; i++) {
    await colonies.deployAgent(colony.id, {
      category: 'ephemeral',
      goal: `worker-${i}`,
    });
  }

  console.log('✓ Deployed 5 agents');

  // Get colony statistics
  const stats = await colonies.getStats(colony.id);
  console.log('\n✓ Colony statistics:');
  console.log('  - Total agents:', stats.totalAgents);
  console.log('  - Active agents:', stats.activeAgents);
  console.log('  - Dormant agents:', stats.dormantAgents);
  console.log('  - Shannon diversity:', stats.shannonDiversity);
  console.log('  - Total tasks:', stats.totalTasks);
  console.log('  - Successful tasks:', stats.successfulTasks);
  console.log('  - Failed tasks:', stats.failedTasks);
  console.log('  - Avg task latency:', stats.avgTaskLatencyMs, 'ms');

  // Get metrics over time
  const metrics = await colonies.getMetrics(colony.id, '1h');
  console.log('\n✓ Time series metrics (last hour):');
  console.log('  - Data points:', metrics.dataPoints.length);

  if (metrics.dataPoints.length > 0) {
    const latest = metrics.dataPoints[metrics.dataPoints.length - 1];
    console.log('  - Latest active agents:', latest.activeAgents);
    console.log('  - Latest task rate:', latest.taskRate);
    console.log('  - Latest avg latency:', latest.avgLatencyMs);
  }

  await client.disconnect();
}

// ============================================================================
// Example 6: Task Execution
// ============================================================================

/**
 * Example 6: Execute tasks in colony
 */
export async function example6_taskExecution() {
  console.log('=== Example 6: Task Execution ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'task-execution-test',
    maxAgents: 10,
  });

  console.log('✓ Colony created:', colony.id);

  // Deploy agent
  const agent = await colonies.deployAgent(colony.id, {
    category: 'ephemeral',
    goal: 'data-processor',
    inputTopics: ['raw-data'],
    outputTopic: 'processed-data',
  });

  console.log('✓ Agent deployed:', agent.agentId);

  // Execute task
  const result = await colonies.executeTask(
    colony.id,
    {
      type: 'process-csv',
      input: {
        data: [1, 2, 3, 4, 5],
        format: 'array',
      },
      agentId: agent.agentId,
      timeout: 5000,
    }
  );

  console.log('\n✓ Task executed:');
  console.log('  - Task ID:', result.taskId);
  console.log('  - Agent ID:', result.agentId);
  console.log('  - Success:', result.success);
  console.log('  - Output:', result.output);
  console.log('  - Execution time:', result.executionTimeMs, 'ms');

  // Get agent metrics
  const agentMetrics = await colonies.getAgentMetrics(colony.id, agent.agentId, '1h');
  console.log('\n✓ Agent metrics:');
  console.log('  - Data points:', agentMetrics.dataPoints.length);

  if (agentMetrics.dataPoints.length > 0) {
    const latest = agentMetrics.dataPoints[agentMetrics.dataPoints.length - 1];
    console.log('  - Success rate:', latest.successRate);
    console.log('  - Avg latency:', latest.avgLatencyMs);
    console.log('  - Task count:', latest.taskCount);
  }

  await client.disconnect();
}

// ============================================================================
// Example 7: Colony Metadata and Tags
// ============================================================================

/**
 * Example 7: Manage colony metadata
 */
export async function example7_metadataManagement() {
  console.log('=== Example 7: Colony Metadata Management ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create colony
  const colony = await colonies.create({
    name: 'metadata-test',
    maxAgents: 10,
    metadata: {
      description: 'Test colony for metadata',
      tags: ['test', 'experimental'],
    },
  });

  console.log('✓ Colony created:', colony.id);

  // Get metadata
  const metadata = await colonies.getMetadata(colony.id);
  console.log('\n✓ Colony metadata:');
  console.log('  - Description:', metadata.description);
  console.log('  - Tags:', metadata.tags);

  // Update metadata
  const updated = await colonies.updateMetadata(colony.id, {
    description: 'Updated description',
    customProperties: {
      owner: 'data-team',
      environment: 'production',
      version: '1.0.0',
    },
  });

  console.log('\n✓ Metadata updated:');
  console.log('  - Description:', updated.description);
  console.log('  - Custom properties:', updated.customProperties);

  // List all colonies
  const allColonies = await colonies.list({ page: 1, pageSize: 10 });
  console.log('\n✓ All colonies:', allColonies.total);

  await client.disconnect();
}

// ============================================================================
// Example 8: Colony Scaling
// ============================================================================

/**
 * Example 8: Scale colony resources
 */
export async function example8_colonyScaling() {
  console.log('=== Example 8: Colony Scaling ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create small colony
  const colony = await colonies.create({
    name: 'scalable-colony',
    maxAgents: 10,
    resourceBudget: {
      totalCompute: 500,
      totalMemory: 1024,
    },
  });

  console.log('✓ Colony created (small):', colony.id);
  console.log('  - Max agents:', colony.totalAgents);

  // Scale up
  const scaled = await colonies.update(colony.id, {
    maxAgents: 100,
    resourceBudget: {
      totalCompute: 5000,
      totalMemory: 10240,
    },
  });

  console.log('\n✓ Colony scaled up:');
  console.log('  - Max agents:', scaled.totalAgents);
  console.log('  - Active agents:', scaled.activeAgents);

  // Deploy agents to test capacity
  const agents = [];
  for (let i = 0; i < 20; i++) {
    const agent = await colonies.deployAgent(colony.id, {
      category: 'ephemeral',
      goal: `worker-${i}`,
    });
    agents.push(agent);
  }

  console.log('\n✓ Deployed 20 agents');

  // Check updated stats
  const stats = await colonies.getStats(colony.id);
  console.log('\n✓ Updated statistics:');
  console.log('  - Total agents:', stats.totalAgents);
  console.log('  - Active agents:', stats.activeAgents);

  await client.disconnect();
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Run all colony management examples
 */
export async function runAllExamples() {
  console.log('POLLN Spreadsheet SDK - Colony Management Examples\n');
  console.log('='.repeat(50));

  try {
    await example1_createColony();
    console.log('\n' + '='.repeat(50) + '\n');

    await example2_deployAgents();
    console.log('\n' + '='.repeat(50) + '\n');

    await example3_agentLifecycle();
    console.log('\n' + '='.repeat(50) + '\n');

    await example4_resourceManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await example5_monitoring();
    console.log('\n' + '='.repeat(50) + '\n');

    await example6_taskExecution();
    console.log('\n' + '='.repeat(50) + '\n');

    await example7_metadataManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await example8_colonyScaling();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✓ All colony management examples completed successfully');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
