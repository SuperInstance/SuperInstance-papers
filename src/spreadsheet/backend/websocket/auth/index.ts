/**
 * POLLN Spreadsheet Backend - WebSocket Auth Module
 *
 * Exports all WebSocket authentication, authorization,
 * validation, session management, and metrics modules.
 *
 * Usage:
 * ```ts
 * import {
 *   WSAuthMiddleware,
 *   WSMessageValidator,
 *   WSSessionManager,
 *   WSAuthorizer,
 *   WSMetrics,
 *   createWSAuthMiddleware,
 *   createWSMessageValidator,
 *   createWSSessionManager,
 *   createWSAuthorizer,
 *   createWSMetrics,
 * } from '@polln/spreadsheet/backend/websocket/auth';
 * ```
 */

// Auth Middleware
export {
  WSAuthMiddleware,
  createWSAuthMiddleware,
} from './WSAuthMiddleware.js';
export type {
  WSConnectionContext,
  AuthResult,
  MessageAuthResult,
  WSAuthMiddlewareConfig,
} from './WSAuthMiddleware.js';

// Message Validator
export {
  WSMessageValidator,
  createWSMessageValidator,
} from './WSMessageValidator.js';
export type {
  ValidationResult,
  MessageTypeDefinition,
  FieldSchema,
  WSMessageValidatorConfig,
} from './WSMessageValidator.js';

// Session Manager
export {
  WSSessionManager,
  createWSSessionManager,
} from './WSSessionManager.js';
export type {
  WSSession,
  UserPresence,
  WSSessionManagerConfig,
} from './WSSessionManager.js';

// Authorizer
export {
  WSAuthorizer,
  createWSAuthorizer,
} from './WSAuthorizer.js';
export type {
  AuthorizationResult,
  ResourceAccessPolicy,
  CellAccessControl,
  WSAuthorizerConfig,
} from './WSAuthorizer.js';

// Metrics
export {
  WSMetrics,
  createWSMetrics,
} from './WSMetrics.js';
export type {
  ConnectionStats,
  MessageStats,
  ErrorStats,
  LatencyPercentiles,
  WSMetricsConfig,
} from './WSMetrics.js';

// WebSocket Server
export {
  WebSocketServer,
  createWebSocketServer,
} from '../WebSocketServer.js';
export type {
  WebSocketServerConfig,
  WSMessage,
  WSClient,
  AuditLogEntry,
  MessageHandler,
} from '../WebSocketServer.js';

// Re-export types from parent auth module
export { Permission, Role, ResourceType } from '../../auth/Permissions.js';
export type { User, UserRole, TokenPayload, TokenPair, Session, AuthResult as AuthServiceAuthResult } from '../../auth/AuthService.js';

/**
 * Create a complete WebSocket authentication stack
 *
 * This factory function creates all components with consistent
 * configuration and wires them together.
 *
 * @param authService - Auth service instance
 * @param config - Optional configuration overrides
 * @returns Object containing all auth components
 */
export function createWebSocketAuthStack(
  authService: any,
  config: {
    auth?: Partial<import('./WSAuthMiddleware.js').WSAuthMiddlewareConfig>;
    validator?: Partial<import('./WSMessageValidator.js').WSMessageValidatorConfig>;
    session?: Partial<import('./WSSessionManager.js').WSSessionManagerConfig>;
    authorizer?: Partial<import('./WSAuthorizer.js').WSAuthorizerConfig>;
    metrics?: Partial<import('./WSMetrics.js').WSMetricsConfig>;
  } = {}
) {
  const sessionManager = createWSSessionManager(authService, config.session);
  const authorizer = createWSAuthorizer(config.authorizer);
  const metrics = createWSMetrics(config.metrics);
  const authMiddleware = new WSAuthMiddleware(
    authService,
    sessionManager,
    authorizer,
    metrics,
    config.auth
  );
  const messageValidator = createWSMessageValidator(config.validator);

  return {
    authMiddleware,
    messageValidator,
    sessionManager,
    authorizer,
    metrics,
  };
}

/**
 * Default export - Auth middleware
 */
export { WSAuthMiddleware as default } from './WSAuthMiddleware.js';
