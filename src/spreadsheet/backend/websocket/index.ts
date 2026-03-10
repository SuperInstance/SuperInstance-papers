/**
 * POLLN Spreadsheet Backend - WebSocket Module
 *
 * Complete WebSocket server implementation with authentication,
 * authorization, validation, session management, and metrics.
 *
 * Usage:
 * ```ts
 * import { createWebSocketServer } from '@polln/spreadsheet/backend/websocket';
 *
 * const server = createWebSocketServer({
 *   port: 8080,
 *   authService: myAuthService,
 * });
 *
 * await server.start();
 * ```
 */

// Main WebSocket Server
export {
  WebSocketServer,
  createWebSocketServer,
} from './WebSocketServer.js';
export type {
  WebSocketServerConfig,
  WSMessage,
  WSClient,
  AuditLogEntry,
  MessageHandler,
} from './WebSocketServer.js';

// Auth Module exports
export * from './auth/index.js';

/**
 * Create and start a WebSocket server with default configuration
 *
 * Convenience function that creates a server with sensible defaults
 * and starts it immediately.
 *
 * @param config - Server configuration
 * @returns Started WebSocket server instance
 */
export async function startWebSocketServer(
  config: import('./WebSocketServer.js').WebSocketServerConfig
): Promise<WebSocketServer> {
  const server = createWebSocketServer(config);
  await server.start();
  return server;
}

/**
 * Default export - WebSocket Server class
 */
export { WebSocketServer as default } from './WebSocketServer.js';
