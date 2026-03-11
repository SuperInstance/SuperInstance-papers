/**
 * POLLN API Module
 * Real-time WebSocket API for POLLN monitoring and control
 */

export { POLLNServer, createPOLLNServer } from './server.js';
export type { POLLNServerConfig } from './server.js';

// Export types
export * from './types.js';

// Export middleware (RateLimitMiddleware comes from here, RateLimitConfig is from ./types.js)
export {
  AuthenticationMiddleware,
  ColonyAwareRateLimitMiddleware,
  RateLimitMiddleware,
  ValidationMiddleware,
  APIErrorFactory
} from './middleware.js';

// Export other modules
export * from './handlers.js';
export * from './revocation.js';
export * from './key-rotation.js';

// Export rate-limit module (excluding RateLimitMiddleware and RateLimitConfig which are already exported from middleware)
export {
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter,
  MemoryRateLimitStorage,
  type RateLimitAlgorithm,
  type RateLimitResult,
  type RateLimitStats,
  type RateLimitState,
  type RateLimitStorage
} from './rate-limit.js';
export * from './memory-protection.js';

// Client SDK
export { POLLNClient, createPOLLNClient } from './client/index.js';
export type { POLLNClientConfig } from './client/index.js';
