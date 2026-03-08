/**
 * Agent Coordination Example
 */

import { POLLNClient } from 'polln/api/client';

async function agentCoordination() {
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
  });

  await client.connect();

  try {
    // Spawn a new agent
    console.log('Spawning agent...');
    const spawnResult = await client.spawnAgent('task-agent', {
      task: 'data-processing',
    });
    console.log('Spawn result:', spawnResult);

    // Wait for agent to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Subscribe to agent events
    await client.subscribeToAgent('agent-1', [
      'succeeded',
      'failed',
    ]);

    // Handle agent events
    client.on('agent:event', (event) => {
      console.log(`Agent event: ${event.eventType}`, event.data);
    });

    // Activate agent
    console.log('Activating agent...');
    const activateResult = await client.activateAgent('agent-1');
    console.log('Activate result:', activateResult);

    // Wait for agent to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Query agent state
    const agentState = await client.queryAgent('agent-1');
    console.log('Agent state:', agentState.agent);

    // Deactivate agent
    console.log('Deactivating agent...');
    await client.deactivateAgent('agent-1');

    await client.disconnect();

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

agentCoordination().catch(console.error);
