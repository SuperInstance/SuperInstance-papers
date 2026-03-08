/**
 * Real-Time Streaming Example
 */

import { POLLNClient } from 'polln/api/client';

async function realTimeStreaming() {
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
    debug: true,
  });

  await client.connect();

  try {
    // Subscribe to multiple event types
    await client.subscribeToColony('colony-1', [
      'agent_registered',
      'stats_updated',
      'dream_completed',
    ]);

    await client.subscribeToStats('colony-1');

    // Track statistics over time
    const statsHistory: Array<{ timestamp: number; stats: unknown }> = [];

    client.on('stats:event', (event) => {
      statsHistory.push({
        timestamp: event.timestamp,
        stats: event.stats,
      });

      console.log('Stats update:', {
        totalAgents: event.stats.totalAgents,
        activeAgents: event.stats.activeAgents,
      });

      // Keep last 100 stats
      if (statsHistory.length > 100) {
        statsHistory.shift();
      }
    });

    // Handle errors
    client.on('error', (error) => {
      console.error('Client error:', error);
    });

    // Handle reconnection
    client.on('reconnect:attempt', (attempt) => {
      console.log(`Reconnecting... attempt ${attempt}`);
    });

    client.on('reconnected', () => {
      console.log('Reconnected!');
    });

    // Keep running
    console.log('Streaming events...');
    await new Promise(() => {});  // Run forever

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

realTimeStreaming().catch(console.error);
