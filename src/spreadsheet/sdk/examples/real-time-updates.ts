/**
 * POLLN Spreadsheet SDK - Real-Time Updates Examples
 *
 * This file demonstrates real-time updates using WebSocket connections.
 *
 * @module examples/real-time-updates
 */

import { createClient, createWebSocketClient } from '../index.js';

// ============================================================================
// Example 1: Basic WebSocket Connection
// ============================================================================

/**
 * Example 1: Establish WebSocket connection and monitor state
 */
export async function example1_websocketConnection() {
  console.log('=== Example 1: WebSocket Connection ===\n');

  // Create WebSocket client
  const wsClient = await createWebSocketClient(
    'ws://localhost:3000',
    { token: 'your-auth-token' }, // Replace with actual token
    { reconnectAttempts: 5, reconnectDelay: 1000 }
  );

  console.log('✓ WebSocket connected');

  // Monitor connection state changes
  const unregisterState = wsClient.onStateChange((state) => {
    console.log('Connection state changed:', state);
  });

  // Monitor errors
  const unregisterError = wsClient.onError((error) => {
    console.error('WebSocket error:', error.message);
  });

  // Get connection health
  const health = wsClient.getHealth();
  console.log('\n✓ Connection health:');
  console.log('  - Connected:', health.connected);
  console.log('  - State:', health.state);
  console.log('  - Queued messages:', health.queuedMessages);

  // Keep connection open for a bit
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Clean up
  unregisterState();
  unregisterError();
  await wsClient.disconnect();

  console.log('\n✓ Disconnected');
}

// ============================================================================
// Example 2: Subscribe to Cell Events
// ============================================================================

/**
 * Example 2: Subscribe to cell value changes
 */
export async function example2_cellEvents() {
  console.log('=== Example 2: Cell Events ===\n');

  const client = await createClient();
  const cells = await client.cells();
  const wsClient = await client.websocket();

  // Connect WebSocket
  await wsClient.connect();
  console.log('✓ WebSocket connected');

  // Subscribe to cell value changes
  const unsubscribe = await cells.subscribe(
    'cell:valueChanged',
    (event) => {
      console.log('\n✓ Cell value changed:');
      console.log('  - Cell:', event.data.reference);
      console.log('  - Old value:', event.data.value);
      console.log('  - New value:', event.data.value);
      console.log('  - Timestamp:', new Date(event.timestamp).toISOString());
    },
    { source: 'sheet-123' } // Filter by sheet ID
  );

  console.log('✓ Subscribed to cell:valueChanged events');

  // Simulate some cell changes
  console.log('\nSimulating cell changes...');
  await cells.update('A1', { value: 100 });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await cells.update('A2', { value: 200 });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await cells.update('A3', { value: 300 });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Unsubscribe
  await unsubscribe();
  console.log('\n✓ Unsubscribed');

  await wsClient.disconnect();
  await client.disconnect();
}

// ============================================================================
// Example 3: Watch Specific Cell
// ============================================================================

/**
 * Example 3: Watch a specific cell for changes
 */
export async function example3_watchCell() {
  console.log('=== Example 3: Watch Cell ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Watch cell A1 for changes
  const unwatch = await cells.watch(
    'A1',
    async (cell) => {
      console.log('\n✓ Cell A1 changed:');
      console.log('  - Value:', cell.value);
      console.log('  - Status:', cell.status);
      console.log('  - Updated at:', new Date(cell.updatedAt).toISOString());

      // React to the change
      if (cell.status === 'error') {
        console.log('  ⚠ Cell has error, checking...');
        // Could trigger error handling logic here
      }
    },
    'sheet-123'
  );

  console.log('✓ Watching cell A1');

  // Simulate changes
  console.log('\nSimulating changes to A1...');
  for (let i = 1; i <= 3; i++) {
    await cells.update('A1', { value: i * 10 });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Stop watching
  await unwatch();
  console.log('\n✓ Stopped watching cell A1');

  await client.disconnect();
}

// ============================================================================
// Example 4: Subscribe to Sheet Events
// ============================================================================

/**
 * Example 4: Subscribe to all sheet events
 */
export async function example4_sheetEvents() {
  console.log('=== Example 4: Sheet Events ===\n');

  const client = await createClient();
  const sheets = await client.sheets();
  const wsClient = await client.websocket();

  await wsClient.connect();
  console.log('✓ WebSocket connected');

  // Subscribe to multiple sheet events
  const events = [
    'sheet:created',
    'sheet:updated',
    'sheet:deleted',
  ] as const;

  const unsubscribers: Promise<() => Promise<void>>[] = [];

  for (const eventType of events) {
    unsubscribers.push(
      sheets.subscribe(eventType, (event) => {
        console.log(`\n✓ Sheet event [${eventType}]:`);
        console.log('  - Sheet ID:', event.data?.id);
        console.log('  - Timestamp:', new Date(event.timestamp).toISOString());
      })
    );
  }

  console.log('✓ Subscribed to sheet events');

  // Keep connection open to receive events
  console.log('\nWaiting for events (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Unsubscribe from all
  for (const unsubscribe of unsubscribers) {
    const fn = await unsubscribe;
    await fn();
  }

  console.log('\n✓ Unsubscribed from all events');

  await wsClient.disconnect();
  await client.disconnect();
}

// ============================================================================
// Example 5: Subscribe to Colony Events
// ============================================================================

/**
 * Example 5: Monitor colony activity
 */
export async function example5_colonyEvents() {
  console.log('=== Example 5: Colony Events ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create a colony
  const colony = await colonies.create({
    name: 'test-colony',
    maxAgents: 10,
  });

  console.log('✓ Colony created:', colony.id);

  // Subscribe to agent events
  const unsubscribeAgent = await colonies.subscribe(
    colony.id,
    'agent:spawned',
    (event) => {
      console.log('\n✓ Agent spawned:');
      console.log('  - Agent ID:', event.data);
      console.log('  - Timestamp:', new Date(event.timestamp).toISOString());
    }
  );

  console.log('✓ Subscribed to agent:spawned events');

  // Subscribe to task events
  const unsubscribeTask = await colonies.subscribe(
    colony.id,
    'agent:task:completed',
    (event) => {
      console.log('\n✓ Task completed:');
      console.log('  - Agent:', event.data);
      console.log('  - Timestamp:', new Date(event.timestamp).toISOString());
    }
  );

  console.log('✓ Subscribed to agent:task:completed events');

  // Deploy an agent
  const agent = await colonies.deployAgent(colony.id, {
    category: 'ephemeral',
    goal: 'test-agent',
  });

  console.log('\n✓ Agent deployed:', agent.agentId);

  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  await unsubscribeAgent();
  await unsubscribeTask();
  await colonies.delete(colony.id);

  console.log('\n✓ Colony deleted');

  await client.disconnect();
}

// ============================================================================
// Example 6: Stream Colony Metrics
// ============================================================================

/**
 * Example 6: Stream real-time colony metrics
 */
export async function example6_streamMetrics() {
  console.log('=== Example 6: Stream Colony Metrics ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create a colony
  const colony = await colonies.create({
    name: 'metrics-test',
    maxAgents: 20,
  });

  console.log('✓ Colony created:', colony.id);

  // Stream metrics every second
  const unsubscribe = await colonies.streamMetrics(
    colony.id,
    (metrics) => {
      console.log('\n📊 Colony Metrics:');
      console.log('  - Active agents:', metrics.activeAgents);
      console.log('  - Task rate:', metrics.taskRate, 'tasks/sec');
      console.log('  - Avg latency:', metrics.avgLatencyMs, 'ms');
    },
    1000 // Update interval
  );

  console.log('✓ Streaming metrics (10 seconds)...');

  // Deploy some agents to generate activity
  for (let i = 0; i < 5; i++) {
    await colonies.deployAgent(colony.id, {
      category: 'ephemeral',
      goal: `worker-${i}`,
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Keep streaming for a bit
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Stop streaming
  await unsubscribe();
  console.log('\n✓ Stopped streaming');

  // Cleanup
  await colonies.delete(colony.id);
  await client.disconnect();
}

// ============================================================================
// Example 7: Connection Health Monitoring
// ============================================================================

/**
 * Example 7: Monitor connection health
 */
export async function example7_connectionHealth() {
  console.log('=== Example 7: Connection Health Monitoring ===\n');

  const wsClient = await createWebSocketClient(
    'ws://localhost:3000',
    {},
    { reconnectAttempts: 3, reconnectDelay: 2000 }
  );

  console.log('✓ WebSocket connected');

  // Set up health check interval
  const healthCheckInterval = setInterval(() => {
    const health = wsClient.getHealth();

    console.log('\n📊 Connection Health:');
    console.log('  - Connected:', health.connected);
    console.log('  - State:', health.state);
    console.log('  - Subscriptions:', health.subscriptionCount);
    console.log('  - Queued messages:', health.queuedMessages);
    console.log('  - Reconnect attempts:', health.reconnectAttempts);

    // Alert if connection is unhealthy
    if (!health.connected && health.reconnectAttempts > 0) {
      console.log('  ⚠ Warning: Connection lost, attempting to reconnect...');
    }
  }, 5000);

  // Keep monitoring for 30 seconds
  console.log('\nMonitoring connection health for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop monitoring
  clearInterval(healthCheckInterval);

  console.log('\n✓ Health monitoring stopped');

  await wsClient.disconnect();
}

// ============================================================================
// Example 8: Event Filtering
// ============================================================================

/**
 * Example 8: Filter events by criteria
 */
export async function example8_eventFiltering() {
  console.log('=== Example 8: Event Filtering ===\n');

  const client = await createClient();
  const cells = await client.cells();
  const wsClient = await client.websocket();

  await wsClient.connect();
  console.log('✓ WebSocket connected');

  // Subscribe with filter - only cells in specific sheet
  const unsubscribe1 = await cells.subscribe(
    'cell:valueChanged',
    (event) => {
      console.log('\n✓ Sheet A - Cell changed:', event.data.reference);
    },
    { source: 'sheet-A' }
  );

  // Subscribe with filter - only cells matching ID pattern
  const unsubscribe2 = await cells.subscribe(
    'cell:valueChanged',
    (event) => {
      console.log('\n✓ Pattern matched - Cell changed:', event.data.reference);
    },
    { idPattern: '^A[0-9]$' } // Only A1-A9
  );

  console.log('✓ Subscribed with filters');

  // Simulate changes (some will match filters, some won't)
  console.log('\nSimulating changes...');

  // This should trigger first subscription
  await cells.update('B1', { value: 1 }, 'sheet-A');
  await new Promise(resolve => setTimeout(resolve, 500));

  // This should trigger second subscription
  await cells.update('A5', { value: 2 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // This should trigger both subscriptions
  await cells.update('A3', { value: 3 }, 'sheet-A');
  await new Promise(resolve => setTimeout(resolve, 500));

  // This shouldn't trigger any subscription
  await cells.update('Z99', { value: 4 }, 'sheet-B');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Cleanup
  await unsubscribe1();
  await unsubscribe2();

  console.log('\n✓ Unsubscribed');

  await wsClient.disconnect();
  await client.disconnect();
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Run all real-time examples
 */
export async function runAllExamples() {
  console.log('POLLN Spreadsheet SDK - Real-Time Updates Examples\n');
  console.log('='.repeat(50));

  try {
    await example1_websocketConnection();
    console.log('\n' + '='.repeat(50) + '\n');

    await example2_cellEvents();
    console.log('\n' + '='.repeat(50) + '\n');

    await example3_watchCell();
    console.log('\n' + '='.repeat(50) + '\n');

    await example4_sheetEvents();
    console.log('\n' + '='.repeat(50) + '\n');

    await example5_colonyEvents();
    console.log('\n' + '='.repeat(50) + '\n');

    await example6_streamMetrics();
    console.log('\n' + '='.repeat(50) + '\n');

    await example7_connectionHealth();
    console.log('\n' + '='.repeat(50) + '\n');

    await example8_eventFiltering();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✓ All real-time examples completed successfully');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
