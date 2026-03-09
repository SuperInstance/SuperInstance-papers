/**
 * POLLN Spreadsheet Backend - Authentication Module
 *
 * Exports all authentication, authorization, and rate limiting components.
 *
 * Usage:
 * ```typescript
 * import {
 *   getAuthService,
 *   authenticate,
 *   requireAuth,
 *   requireAdmin,
 *   createRateLimiter,
 *   createAuthRouter,
 *   PermissionsManager,
 *   Permission,
 *   Role,
 * } from './auth/index.js';
 *
 * // Apply auth middleware
 * app.use('/api', authenticate());
 *
 * // Apply auth router
 * app.use('/auth', createAuthRouter());
 * ```
 */

export { getAuthService, AuthService } from './AuthService.js';
export type {
  User,
  UserRole,
  Permission,
  TokenPayload,
  TokenPair,
  Session,
  AuthResult,
  AuthServiceConfig,
} from './AuthService.js';

export {
  authenticate,
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermissions,
  requireAdmin,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getCurrentUser,
  authErrorHandler,
} from './AuthMiddleware.js';
export type { AuthenticatedRequest, AuthOptions } from './AuthMiddleware.js';

export {
  RateLimiter,
  createRateLimiter,
  strictRateLimiter,
  standardRateLimiter,
  lenientRateLimiter,
  authRateLimiter,
  WebSocketConnectionLimiter,
  getWebSocketClientIP,
} from './RateLimiter.js';
export type { RateLimitConfig, WebSocketLimitConfig } from './RateLimiter.js';

export {
  PermissionsManager,
  RequirePermission,
  RequireRole,
  requirePermission,
  requireRole,
  requireAdmin as requireAdminPerm,
  requireReadWrite,
  requireCellOperations,
} from './Permissions.js';
export { Permission, Role, ResourceType } from './Permissions.js';
export type { PermissionCheckResult } from './Permissions.js';

export { createAuthRouter } from './AuthRouter.js';

export default {
  getAuthService,
  authenticate,
  requireAuth,
  requireAdmin,
  createRateLimiter,
  createAuthRouter,
  PermissionsManager,
  Permission,
  Role,
};
