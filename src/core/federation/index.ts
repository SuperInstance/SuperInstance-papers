/**
 * POLLN Advanced Federated Learning Module
 * Pattern-Organized Large Language Network
 *
 * This module provides production-ready federated learning capabilities
 * with advanced privacy, fault tolerance, and networking protocols.
 *
 * @module federation
 *
 * Features:
 * - Multiple aggregation strategies (FedAvg, FedProx, AsyncFed, AdaptiveFed)
 * - Differential privacy and secure aggregation
 * - Byzantine resilience and checkpointing
 * - P2P coordination and gossip protocols
 * - Real-time monitoring and visualization
 *
 * Usage:
 * ```typescript
 * import { FederatedAveraging, DifferentialPrivacy, ByzantineResilience } from 'polln/federation';
 *
 * const strategy = new FederatedAveraging();
 * const dp = new DifferentialPrivacy({ epsilon: 1.0, delta: 1e-5 });
 * const resilience = new ByzantineResilience({ method: 'krum' });
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

export * from './types.js';

// ============================================================================
// Aggregation Strategies
// ============================================================================

export {
  FederatedAveraging,
  createDefaultFedAvgConfig,
  createFastFedAvgConfig,
  createStableFedAvgConfig,
} from './strategies/fed-avg.js';

export {
  FederatedProximal,
  createDefaultFedProxConfig,
  createHeterogeneousFedProxConfig,
  createHomogeneousFedProxConfig,
} from './strategies/fed-prox.js';

export {
  AsynchronousFederated,
  createDefaultAsyncFedConfig,
  createFastAsyncFedConfig,
  createStableAsyncFedConfig,
} from './strategies/fed-async.js';

export {
  AdaptiveFederated,
  createDefaultAdaptiveFedConfig,
  createQualityFocusedAdaptiveFedConfig,
  createDiversityFocusedAdaptiveFedConfig,
} from './strategies/fed-adaptive.js';

// ============================================================================
// Privacy Enhancements
// ============================================================================

export {
  DifferentialPrivacy,
  createDefaultDPConfig,
  createStrictDPConfig,
  createRelaxedDPConfig,
  calculateOptimalEpsilon,
  calculateDeltaFromEpsilon,
  advancedComposition,
} from './privacy/differential-privacy.js';

export {
  SecureAggregation,
  createDefaultSecureAggregationConfig,
  createFastSecureAggregationConfig,
  createMaxSecuritySecureAggregationConfig,
} from './privacy/secure-aggregation.js';

export * from './privacy/index.js';

// ============================================================================
// Fault Tolerance
// ============================================================================

export {
  ByzantineResilience,
  createDefaultByzantineConfig,
  createKrumConfig,
  createBulyanConfig,
} from './fault/byzantine-resilience.js';

export {
  CheckpointManager,
  createDefaultCheckpointConfig,
  createAggressiveCheckpointConfig,
  createMinimalCheckpointConfig,
} from './fault/checkpoint.js';

export * from './fault/index.js';

// ============================================================================
// Network Protocols
// ============================================================================

export {
  P2PCoordinator,
  createDefaultP2PConfig,
} from './network/p2p-coordinator.js';

export {
  GossipProtocol,
  createDefaultGossipConfig,
  createFastGossipConfig,
  createEfficientGossipConfig,
} from './network/gossip-protocol.js';

export * from './network/index.js';
