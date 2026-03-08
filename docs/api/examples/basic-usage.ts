/**
 * Basic POLLN API Usage Example
 */

import { POLLNClient } from 'polln/api/client';

async function basicUsage() {
  // Create client
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
  });

  try {
    // Connect to server
    await client.connect();
    console.log('Connected to POLLN API');

    // Subscribe to colony events
    await client.subscribeToColony('colony-1', [
      'agent_registered',
      'agent_activated',
      'stats_updated',
    ]);

    // Handle colony events
    client.on('colony:event', (event) => {
      console.log('Colony event:', event.eventType, event.data);
    });

    // Query colony statistics
    const stats = await client.queryStats('colony-1');
    console.log('Colony stats:', stats);

    // Wait a bit to receive events
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Disconnect
    await client.disconnect();
    console.log('Disconnected');

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

basicUsage().catch(console.error);
