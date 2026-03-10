/**
 * POLLN Spreadsheet - WebSocket Auth Demo
 *
 * This example demonstrates how to use the WebSocket authentication
 * system with a complete server setup.
 *
 * Usage:
 * ```bash
 * npx tsx examples/websocket-auth-demo.ts
 * ```
 */

import { AuthService } from '../src/spreadsheet/backend/auth/AuthService.js';
import {
  WebSocketServer,
  createWebSocketServer,
} from '../src/spreadsheet/backend/websocket/index.js';

async function main() {
  console.log('=== POLLN WebSocket Auth Demo ===\n');

  // 1. Create Auth Service
  console.log('1. Creating Auth Service...');
  const authService = new AuthService({
    jwtSecret: process.env.JWT_SECRET || 'demo-secret-change-in-production',
    accessTokenExpiresIn: 900, // 15 minutes
    refreshTokenExpiresIn: 604800, // 7 days
  });

  // 2. Create a test user
  console.log('2. Creating test user...');
  const registerResult = await authService.register(
    'demo_user',
    'demo@example.com',
    'demo_password_123',
    'user'
  );

  if (!registerResult.success || !registerResult.user || !registerResult.tokens) {
    console.error('Failed to create user');
    return;
  }

  console.log(`   User created: ${registerResult.user.username}`);
  console.log(`   Access Token: ${registerResult.tokens.accessToken.substring(0, 20)}...`);
  console.log(`   Refresh Token: ${registerResult.tokens.refreshToken.substring(0, 20)}...`);

  // 3. Create WebSocket Server
  console.log('\n3. Creating WebSocket Server...');
  const wsServer = createWebSocketServer({
    port: 8080,
    authService,
    enableAuth: true,
    enableValidation: true,
    enableRateLimiting: true,
    enableMetrics: true,
    enableAuditLog: true,
  });

  // 4. Register message handlers
  console.log('4. Registering message handlers...');

  // Cell read handler
  wsServer.registerHandler('cell.read', async (context, type, payload, messageId) => {
    console.log(`   [Cell Read] User: ${context.username}, Cell: ${(payload as any).cellId}`);
    return {
      cellId: (payload as any).cellId,
      value: 42,
      formula: '=A1+A2',
      timestamp: Date.now(),
    };
  });

  // Cell update handler
  wsServer.registerHandler('cell.update', async (context, type, payload, messageId) => {
    console.log(`   [Cell Update] User: ${context.username}, Cell: ${(payload as any).cellId}`);
    return {
      cellId: (payload as any).cellId,
      success: true,
      timestamp: Date.now(),
    };
  });

  // Spreadsheet query handler
  wsServer.registerHandler('spreadsheet.query', async (context, type, payload, messageId) => {
    console.log(`   [Spreadsheet Query] User: ${context.username}`);
    return {
      results: [
        { cellId: 'A1', value: 10 },
        { cellId: 'A2', value: 20 },
        { cellId: 'A3', value: 30 },
      ],
      timestamp: Date.now(),
    };
  });

  // 5. Setup event listeners
  console.log('5. Setting up event listeners...');

  wsServer.on('connectionAuthenticated', (context) => {
    console.log(`   ✓ Connection authenticated: ${context.username} (${context.userId})`);
  });

  wsServer.on('connectionDisconnected', (context, code, reason) => {
    console.log(`   ✗ Connection disconnected: ${context.username} (code: ${code})`);
  });

  wsServer.on('message', (context, message) => {
    console.log(`   → Message: ${message.type} from ${context?.username || 'anonymous'}`);
  });

  wsServer.on('error', (error) => {
    console.error(`   ✗ Server error:`, error.message);
  });

  // 6. Start server
  console.log('\n6. Starting WebSocket Server...');
  await wsServer.start();
  console.log(`   ✓ Server listening on ws://localhost:8080`);

  // 7. Display connection info
  console.log('\n=== Connection Information ===');
  console.log(`Server URL: ws://localhost:8080?token=${registerResult.tokens.accessToken}`);
  console.log('\nYou can connect using WebSocket client with the URL above.');
  console.log('Example clients:');
  console.log('  - JavaScript: new WebSocket("ws://localhost:8080?token=YOUR_TOKEN")');
  console.log('  - Python:     websocket.create_connection("ws://localhost:8080?token=YOUR_TOKEN")');
  console.log('  - wscat:      wscat -c "ws://localhost:8080?token=YOUR_TOKEN"');

  // 8. Display example messages
  console.log('\n=== Example Messages ===');
  console.log('Read cell:');
  console.log(JSON.stringify({
    type: 'cell.read',
    payload: { cellId: 'A1' },
    messageId: 'msg-1',
    timestamp: Date.now(),
  }, null, 2));
  console.log('\nUpdate cell:');
  console.log(JSON.stringify({
    type: 'cell.update',
    payload: { cellId: 'A1', value: 100 },
    messageId: 'msg-2',
    timestamp: Date.now(),
  }, null, 2));

  // 9. Monitor statistics
  console.log('\n=== Server Statistics ===');
  setInterval(() => {
    const stats = wsServer.getStats();
    console.log('\n--- Live Stats ---');
    console.log(`Connections: ${stats.connections}`);
    console.log(`Authenticated: ${stats.authenticatedConnections}`);
    console.log(`Messages (total): ${stats.metrics.messages.total}`);
    console.log(`Messages (authorized): ${stats.metrics.messages.authorized}`);
    console.log(`Errors: ${stats.metrics.errors.total}`);
  }, 10000);

  // 10. Graceful shutdown
  console.log('\n=== Server Running ===');
  console.log('Press Ctrl+C to stop the server');

  process.on('SIGINT', async () => {
    console.log('\n\nShutting down server...');
    await wsServer.stop();
    console.log('Server stopped.');
    process.exit(0);
  });
}

// Run the demo
main().catch(console.error);
