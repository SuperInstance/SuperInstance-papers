/**
 * POLLN KV-Cache Types
 *
 * Types for KV-cache communication and anchor-based sharing.
 * Inspired by KVCOMM (NeurIPS'25) - Online Cross-context KV-cache Communication
 *
 * Key concepts:
 * - KV Proximity: Tokens closer in embedding space have closer KV vectors
 * - Offset Proximity: Under prefix changes, offsets for similar tokens stay close
 * - Anchor-based: Reuse KV-caches by referencing stored anchor patterns
 */

// ============================================================================
// CORE KV TYPES
// ============================================================================

/**
 * Represents a cached key-value pair in transformer attention
 */
export interface KVPair {
  keys: number[][];
  values: number[][];
  layerIndex: number;
  sequencePosition: number;
}

/**
 * A segment of KV-cache with metadata
 */
export interface KVSegment {
  id: string;
  cache: KVPair[];
  embedding: number[];
  startPosition: number;
  endPosition: number;
  hash: string;
  timestamp: number;
}

/**
 * Anchor - a stored KV-cache pattern for reuse
 */
export interface KVAnchor {
  id: string;
  segment: KVSegment;

  // Offset data - how this anchor's KV changes under prefix modifications
  offsets: KVOffset[];

  // Metadata for matching
  embedding: number[];
  entropy: number;
  sharabilityScore: number;

  // Usage tracking
  matchCount: number;
  lastMatched: number;
  createdAt: number;
}

/**
 * KV-cache offset under prefix change
 */
export interface KVOffset {
  prefixDelta: number[];  // How the prefix changed
  kvDelta: KVPair[];      // How the KV-cache changed
  confidence: number;      // Confidence in this offset pattern
}

/**
 * Result of anchor matching
 */
export interface AnchorMatch {
  anchor: KVAnchor;
  distance: number;
  weight: number;
}

// ============================================================================
// ANCHOR POOL TYPES
// ============================================================================

/**
 * Configuration for the anchor pool
 */
export interface KVAnchorPoolConfig {
  maxAnchors: number;           // Maximum anchors per placeholder
  entropyThreshold: number;     // Entropy threshold for sharability (γ)
  maxWindow: number;            // Candidates for pruning
  minMatchConfidence: number;   // Minimum confidence for matching
  embeddingDimension: number;   // Dimension of embeddings
}

/**
 * Statistics for the anchor pool
 */
export interface KVAnchorPoolStats {
  totalAnchors: number;
  totalMatches: number;
  avgMatchDistance: number;
  cacheHitRate: number;
  avgEntropy: number;
}

// ============================================================================
// CONTEXT SHARING TYPES
// ============================================================================

/**
 * Shared context between agents
 */
export interface SharedContext {
  id: string;
  segments: KVSegment[];
  ownerAgentId: string;
  consumerAgentIds: string[];
  privacyLevel: 'public' | 'colony' | 'private';
  expiresAt?: number;
}

/**
 * Context reuse decision
 */
export interface ContextReuseDecision {
  canReuse: boolean;
  confidence: number;
  sourceContext?: SharedContext;
  requiredOffsets?: KVOffset[];
  reason: string;
}

/**
 * Policy for context reuse
 */
export interface ContextReusePolicy {
  enableReuse: boolean;
  minSimilarityThreshold: number;
  maxPrefixChange: number;
  allowedPrivacyLevels: ('public' | 'colony' | 'private')[];
}

// ============================================================================
// CACHE UTILITY TYPES
// ============================================================================

/**
 * Slice operation specification
 */
export interface CacheSliceSpec {
  start: number;
  end: number;
}

/**
 * Concatenation result
 */
export interface CacheConcatResult {
  cache: KVPair[];
  sourceSegments: string[];
  totalLength: number;
}

/**
 * Replacement specification
 */
export interface CacheReplaceSpec {
  start: number;
  end: number;
  replacement: KVPair[];
}

/**
 * Index selection for cache
 */
export interface CacheIndexSelection {
  indices: number[];
  validateBounds: boolean;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * KV-cache communication between agents
 */
export interface KVCommunicationPackage {
  id: string;
  senderAgentId: string;
  receiverAgentId: string;
  sharedAnchors: KVAnchor[];
  contextSegments: KVSegment[];
  reuseStats: {
    anchorsMatched: number;
    cacheSaved: number;
    estimatedSpeedup: number;
  };
}

/**
 * Request for KV-cache sharing
 */
export interface KVShareRequest {
  requesterId: string;
  contextEmbedding: number[];
  prefixHash: string;
  requestedAnchors: string[];
  privacyRequirement: 'public' | 'colony' | 'private';
}

/**
 * Response to KV-cache sharing request
 */
export interface KVShareResponse {
  granted: boolean;
  anchors: KVAnchor[];
  offsets: KVOffset[];
  estimatedAccuracy: number;
  denialReason?: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_KV_ANCHOR_POOL_CONFIG: KVAnchorPoolConfig = {
  maxAnchors: 20,
  entropyThreshold: 0.3,
  maxWindow: 5,
  minMatchConfidence: 0.7,
  embeddingDimension: 64,
};

export const DEFAULT_CONTEXT_REUSE_POLICY: ContextReusePolicy = {
  enableReuse: true,
  minSimilarityThreshold: 0.8,
  maxPrefixChange: 0.2,
  allowedPrivacyLevels: ['public', 'colony'],
};
