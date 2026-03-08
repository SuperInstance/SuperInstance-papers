/**
 * POLLN Federation Types
 * Pattern-Organized Large Language Network
 *
 * Core type definitions for advanced federated learning protocols.
 */

// ============================================================================
// Strategy Interface
// ============================================================================

/**
 * Base configuration for all federated strategies
 */
export interface StrategyConfig {
  name: string;
  description?: string;
}

/**
 * Participant update from a colony
 */
export interface ParticipantUpdate {
  participantId: string;
  gradients: Float32Array;
  sampleCount: number;
  loss?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of aggregation
 */
export interface AggregationResult {
  aggregatedModel: Float32Array;
  roundNumber: number;
  globalRound: number;
  participantCount: number;
  totalSamples: number;
  avgLoss: number;
  weightedLoss: number;
  aggregationTime: number;
  hasConverged: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Base interface for all federated strategies
 */
export interface FederatedStrategy {
  /**
   * Get strategy configuration
   */
  getConfig(): StrategyConfig;

  /**
   * Get current state
   */
  getState(): unknown;

  /**
   * Initialize global model
   */
  initializeModel(parameters: Float32Array): void;

  /**
   * Select participants for current round
   */
  selectParticipants(
    availableParticipants: string[],
    participantStats?: Map<string, { sampleCount: number; updateLatency: number }>
  ): string[];

  /**
   * Aggregate participant updates
   */
  aggregateUpdates(updates: ParticipantUpdate[]): Promise<AggregationResult>;

  /**
   * Check if convergence has been reached
   */
  hasConverged?(): boolean;

  /**
   * Reset state
   */
  reset(): void;
}

// ============================================================================
// Privacy Types
// ============================================================================

/**
 * Privacy tier for federated learning
 */
export type PrivacyTier = 'LOCAL' | 'COLONY' | 'MEADOW' | 'PUBLIC' | 'RESEARCH';

/**
 * Privacy budget accounting
 */
export interface PrivacyBudget {
  colonyId: string;
  privacyTier: PrivacyTier;
  epsilonSpent: number;
  deltaSpent: number;
  epsilonLimit: number;
  deltaLimit: number;
  roundsParticipated: number;
  lastUpdated: number;
}

/**
 * Differential privacy parameters
 */
export interface DifferentialPrivacyParams {
  epsilon: number;
  delta: number;
  sensitivity: number;
  noiseDistribution: 'gaussian' | 'laplacian';
  mechanism: 'gradient' | 'objective' | 'output';
}

/**
 * Secure aggregation parameters
 */
export interface SecureAggregationParams {
  enabled: boolean;
  protocol: 'additive-secret-sharing' | 'paillier' | 'custom';
  encryptionBits: number;
  verificationEnabled: boolean;
}

// ============================================================================
// Fault Tolerance Types
// ============================================================================

/**
 * Checkpoint for rollback
 */
export interface FederationCheckpoint {
  checkpointId: string;
  roundNumber: number;
  globalModel: Float32Array;
  participantStates: Map<string, unknown>;
  privacyBudgets: Map<string, PrivacyBudget>;
  timestamp: number;
}

/**
 * Byzantine fault detection result
 */
export interface ByzantineDetectionResult {
  participantId: string;
  isMalicious: boolean;
  confidence: number;
  reasons: string[];
  score: number;
}

/**
 * Straggler detection result
 */
export interface StragglerDetectionResult {
  participantId: string;
  isStraggler: boolean;
  latency: number;
  expectedLatency: number;
  deviation: number;
}

// ============================================================================
// Network Types
// ============================================================================

/**
 * Peer information
 */
export interface PeerInfo {
  peerId: string;
  address: string;
  port: number;
  capabilities: string[];
  lastSeen: number;
  metadata: Record<string, unknown>;
}

/**
 * Gossip message
 */
export interface GossipMessage {
  messageId: string;
  type: string;
  payload: unknown;
  senderId: string;
  timestamp: number;
  ttl: number;
  seen: string[];
}

/**
 * Consensus proposal
 */
export interface ConsensusProposal {
  proposalId: string;
  proposerId: string;
  roundNumber: number;
  payload: {
    modelUpdate?: Float32Array;
    aggregationResult?: AggregationResult;
    checkpoint?: FederationCheckpoint;
  };
  signatures: Map<string, string>; // peerId -> signature
  timestamp: number;
}

/**
 * Consensus vote
 */
export interface ConsensusVote {
  voteId: string;
  proposalId: string;
  voterId: string;
  decision: 'approve' | 'reject' | 'abstain';
  reason?: string;
  timestamp: number;
  signature?: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Federation status for dashboard
 */
export interface FederationStatus {
  isActive: boolean;
  currentRound: number;
  totalRounds: number;
  participantCount: number;
  avgLoss: number;
  bestLoss: number;
  convergenceRate: number;
  privacyBudgetUsed: number;
  lastUpdate: number;
}

/**
 * Participant health status
 */
export interface ParticipantHealth {
  participantId: string;
  isActive: boolean;
  reliability: number;
  avgLatency: number;
  lastUpdate: number;
  successfulRounds: number;
  failedRounds: number;
  contributionScore: number;
}

/**
 * Privacy budget tracking
 */
export interface PrivacyBudgetTracking {
  colonyId: string;
  privacyTier: PrivacyTier;
  epsilonUsed: number;
  epsilonLimit: number;
  deltaUsed: number;
  deltaLimit: number;
  percentageUsed: number;
  roundsRemaining: number;
  projectedDepletion: number;
}

/**
 * Update visualization data
 */
export interface UpdateVisualization {
  roundNumber: number;
  timestamp: number;
  participantContributions: Array<{
    participantId: string;
    sampleCount: number;
    loss: number;
    qualityScore: number;
  }>;
  aggregationTime: number;
  modelImprovement: number;
  privacyCost: number;
}

// ============================================================================
// Federation Configuration
// ============================================================================

/**
 * Complete federation configuration
 */
export interface FederationConfiguration {
  // Strategy selection
  strategy: 'fed-avg' | 'fed-prox' | 'fed-async' | 'fed-adaptive';

  // Privacy settings
  privacy: {
    enabled: boolean;
    tier: PrivacyTier;
    differentialPrivacy: DifferentialPrivacyParams;
    secureAggregation: SecureAggregationParams;
  };

  // Fault tolerance
  faultTolerance: {
    enabled: boolean;
    byzantineResilience: boolean;
    stragglerMitigation: boolean;
    checkpointInterval: number;
    maxCheckpoints: number;
  };

  // Network
  network: {
    protocol: 'p2p' | 'centralized' | 'hybrid';
    discoveryEnabled: boolean;
    gossipEnabled: boolean;
    consensusRequired: boolean;
    maxPeers: number;
  };

  // Monitoring
  monitoring: {
    dashboardEnabled: boolean;
    metricsCollection: boolean;
    alertThresholds: {
      lossIncrease: number;
      participantDrop: number;
      privacyBudget: number;
    };
  };
}
