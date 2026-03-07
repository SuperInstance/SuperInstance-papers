/**
 * POLLN Cross-Agent Context Sharing
 *
 * Inspired by KVCOMM (NeurIPS'25) - Online Cross-context KV-cache Communication
 *
 * This module enables efficient context sharing between agents by:
 * 1. Tracking which agents have seen which context segments
 * 2. Reusing context when prefixes match
 * 3. Supporting placeholder-based context templating
 * 4. Computing context diffs to avoid redundant processing
 *
 * Core Concepts:
 * - ContextSegment: A reusable piece of context with embedding
 * - SharedContextManager: Manages shared context between agents
 * - ContextReusePolicy: Determines when context can be reused
 * - ContextDiff: Tracks differences in prefix contexts
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Privacy level for shared context
 */
export enum ContextPrivacy {
  PUBLIC = 'PUBLIC',     // Can be shared with any agent
  COLONY = 'COLONY',     // Can be shared within colony
  PRIVATE = 'PRIVATE',   // Cannot be shared
}

/**
 * A reusable segment of context with embedding
 */
export interface ContextSegment {
  id: string;

  // Content
  content: string;
  tokens: number[];

  // Embedding for similarity matching
  embedding: number[];

  // Metadata
  hash: string;
  length: number;
  createdAt: number;
  updatedAt: number;

  // Origin
  sourceAgentId: string;

  // Usage tracking
  usageCount: number;
  lastUsed: number;
}

/**
 * Shared context between multiple agents
 */
export interface SharedContext {
  id: string;

  // Context segments
  segments: ContextSegment[];

  // Ownership
  ownerAgentId: string;
  consumerAgentIds: Set<string>;

  // Privacy
  privacyLevel: ContextPrivacy;

  // Expiration
  expiresAt?: number;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Context reuse decision with confidence
 */
export interface ContextReuseDecision {
  canReuse: boolean;
  confidence: number;
  sourceContextId?: string;
  requiredOffsets?: ContextOffset[];
  reason: string;
  estimatedSpeedup?: number;
}

/**
 * Offset for context adjustment
 */
export interface ContextOffset {
  segmentId: string;
  offset: number[];
  confidence: number;
}

/**
 * Policy for context reuse decisions
 */
export interface ContextReusePolicy {
  enableReuse: boolean;
  minSimilarityThreshold: number;
  maxPrefixChange: number;
  allowedPrivacyLevels: ContextPrivacy[];
  enablePlaceholderTemplating: boolean;
  maxContextAge: number;
}

/**
 * Difference between two context prefixes
 */
export interface ContextDiff {
  prefixMatch: boolean;
  similarity: number;
  addedSegments: ContextSegment[];
  removedSegments: ContextSegment[];
  modifiedSegments: Array<{
    segmentId: string;
    oldHash: string;
    newHash: string;
  }>;
  offset: ContextOffset[];
}

/**
 * Configuration for SharedContextManager
 */
export interface SharedContextManagerConfig {
  maxSegmentsPerContext: number;
  maxContextAge: number;
  reusePolicy: ContextReusePolicy;
  embeddingDimension: number;
  enableDiffTracking: boolean;
}

/**
 * Statistics for context sharing
 */
export interface ContextSharingStats {
  totalSharedContexts: number;
  totalSegments: number;
  reuseCount: number;
  reuseRate: number;
  avgSimilarity: number;
  avgSpeedup: number;
  activeContexts: number;
}

// ============================================================================
// CONTEXT SEGMENT
// ============================================================================

/**
 * Represents a reusable piece of context with embedding
 */
export class ContextSegmentImpl implements ContextSegment {
  public readonly id: string;
  public content: string;
  public tokens: number[];
  public embedding: number[];
  public hash: string;
  public length: number;
  public createdAt: number;
  public updatedAt: number;
  public sourceAgentId: string;
  public usageCount: number;
  public lastUsed: number;

  constructor(
    content: string,
    tokens: number[],
    embedding: number[],
    sourceAgentId: string,
    id?: string
  ) {
    this.id = id || uuidv4();
    this.content = content;
    this.tokens = tokens;
    this.embedding = embedding;
    this.sourceAgentId = sourceAgentId;
    this.length = tokens.length;
    this.hash = this.computeHash();
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
    this.usageCount = 0;
    this.lastUsed = this.createdAt;
  }

  /**
   * Record usage of this segment
   */
  recordUsage(): void {
    this.usageCount++;
    this.lastUsed = Date.now();
  }

  /**
   * Update segment content
   */
  update(content: string, tokens: number[], embedding: number[]): void {
    this.content = content;
    this.tokens = tokens;
    this.embedding = embedding;
    this.length = tokens.length;
    this.hash = this.computeHash();
    this.updatedAt = Date.now();
  }

  /**
   * Compute hash of segment content
   */
  private computeHash(): string {
    // Simple hash implementation
    const str = this.tokens.join(',') + this.content;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// ============================================================================
// CONTEXT DIFF
// ============================================================================

/**
 * Tracks differences between context prefixes
 */
export class ContextDiffTracker {
  /**
   * Compute difference between two context arrays
   */
  static computeDiff(
    oldSegments: ContextSegment[],
    newSegments: ContextSegment[]
  ): ContextDiff {
    const oldSet = new Set(oldSegments.map(s => s.id));
    const newSet = new Set(newSegments.map(s => s.id));

    // Find added and removed segments
    const addedSegments = newSegments.filter(s => !oldSet.has(s.id));
    const removedSegments = oldSegments.filter(s => !newSet.has(s.id));

    // Find modified segments (same ID, different hash)
    const modifiedSegments: Array<{
      segmentId: string;
      oldHash: string;
      newHash: string;
    }> = [];

    for (const oldSeg of oldSegments) {
      const newSeg = newSegments.find(s => s.id === oldSeg.id);
      if (newSeg && newSeg.hash !== oldSeg.hash) {
        modifiedSegments.push({
          segmentId: oldSeg.id,
          oldHash: oldSeg.hash,
          newHash: newSeg.hash,
        });
      }
    }

    // Check if prefixes match
    const minLen = Math.min(oldSegments.length, newSegments.length);
    let prefixMatch = true;
    let matchLength = 0;

    for (let i = 0; i < minLen; i++) {
      if (oldSegments[i].id === newSegments[i].id) {
        matchLength++;
      } else {
        prefixMatch = false;
        break;
      }
    }

    // Compute similarity based on prefix match and segment overlap
    const overlap = oldSegments.filter(s => newSet.has(s.id)).length;
    const union = oldSegments.length + newSegments.length - overlap;
    const similarity = union === 0 ? 1.0 : overlap / union;

    // Compute offset for prefix changes
    const offset: ContextOffset[] = [];
    if (!prefixMatch && newSegments.length > 0) {
      offset.push({
        segmentId: newSegments[0].id,
        offset: new Array(newSegments[0].embedding.length).fill(0),
        confidence: prefixMatch ? 1.0 : 0.5,
      });
    }

    return {
      prefixMatch,
      similarity,
      addedSegments,
      removedSegments,
      modifiedSegments,
      offset,
    };
  }

  /**
   * Compute embedding similarity between two segment arrays
   */
  static computeEmbeddingSimilarity(
    segments1: ContextSegment[],
    segments2: ContextSegment[]
  ): number {
    if (segments1.length === 0 && segments2.length === 0) return 1.0;
    if (segments1.length === 0 || segments2.length === 0) return 0.0;

    // Compute cosine similarity for each position
    const minLen = Math.min(segments1.length, segments2.length);
    let totalSimilarity = 0;

    for (let i = 0; i < minLen; i++) {
      totalSimilarity += this.cosineSimilarity(
        segments1[i].embedding,
        segments2[i].embedding
      );
    }

    // Penalize length differences
    const lengthPenalty = Math.abs(segments1.length - segments2.length) * 0.1;
    const avgSimilarity = totalSimilarity / minLen;

    return Math.max(0, avgSimilarity - lengthPenalty);
  }

  /**
   * Cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }
}

// ============================================================================
// CONTEXT REUSE POLICY
// ============================================================================

/**
 * Determines when context can be reused vs must be recomputed
 */
export class ContextReusePolicyImpl implements ContextReusePolicy {
  enableReuse: boolean;
  minSimilarityThreshold: number;
  maxPrefixChange: number;
  allowedPrivacyLevels: ContextPrivacy[];
  enablePlaceholderTemplating: boolean;
  maxContextAge: number;

  constructor(policy?: Partial<ContextReusePolicy>) {
    this.enableReuse = policy?.enableReuse ?? true;
    this.minSimilarityThreshold = policy?.minSimilarityThreshold ?? 0.8;
    this.maxPrefixChange = policy?.maxPrefixChange ?? 0.2;
    this.allowedPrivacyLevels = policy?.allowedPrivacyLevels ?? [
      ContextPrivacy.PUBLIC,
      ContextPrivacy.COLONY,
    ];
    this.enablePlaceholderTemplating = policy?.enablePlaceholderTemplating ?? true;
    this.maxContextAge = policy?.maxContextAge ?? 60 * 60 * 1000; // 1 hour
  }

  /**
   * Determine if context can be reused based on policy
   */
  canReuseContext(
    sharedContext: SharedContext,
    requesterAgentId: string,
    similarity: number,
    currentContextHash: string
  ): ContextReuseDecision {
    // Check if reuse is enabled
    if (!this.enableReuse) {
      return {
        canReuse: false,
        confidence: 0,
        reason: 'Context reuse is disabled',
      };
    }

    // Check privacy level
    if (!this.allowedPrivacyLevels.includes(sharedContext.privacyLevel)) {
      return {
        canReuse: false,
        confidence: 0,
        reason: `Privacy level ${sharedContext.privacyLevel} not allowed`,
      };
    }

    // Check if requester is the owner
    if (sharedContext.ownerAgentId === requesterAgentId) {
      return {
        canReuse: true,
        confidence: 1.0,
        sourceContextId: sharedContext.id,
        reason: 'Requester is context owner',
        estimatedSpeedup: 2.0,
      };
    }

    // Check if requester is a consumer
    if (!sharedContext.consumerAgentIds.has(requesterAgentId)) {
      return {
        canReuse: false,
        confidence: 0,
        reason: 'Requester not authorized to access this context',
      };
    }

    // Check context age
    const now = Date.now();
    const age = now - sharedContext.updatedAt;
    if (age > this.maxContextAge) {
      return {
        canReuse: false,
        confidence: 0,
        reason: 'Context is too old',
      };
    }

    // Check similarity threshold
    if (similarity < this.minSimilarityThreshold) {
      return {
        canReuse: false,
        confidence: similarity,
        reason: `Similarity ${similarity.toFixed(2)} below threshold ${this.minSimilarityThreshold}`,
      };
    }

    // Context can be reused
    const speedup = this.estimateSpeedup(similarity, sharedContext.segments.length);

    return {
      canReuse: true,
      confidence: similarity,
      sourceContextId: sharedContext.id,
      reason: 'Context similarity meets threshold',
      estimatedSpeedup: speedup,
    };
  }

  /**
   * Estimate speedup from context reuse
   */
  private estimateSpeedup(similarity: number, segmentCount: number): number {
    // Speedup is proportional to similarity and segment count
    // More segments reused = higher speedup
    const baseSpeedup = 1.0 + (segmentCount * 0.1);
    return Math.min(5.0, baseSpeedup * similarity);
  }
}

// ============================================================================
// SHARED CONTEXT MANAGER
// ============================================================================

/**
 * Manages shared context segments between agents
 */
export class SharedContextManager extends EventEmitter {
  private config: SharedContextManagerConfig;
  private sharedContexts: Map<string, SharedContext>;
  private agentContexts: Map<string, Set<string>>; // agentId -> contextIds
  private reusePolicy: ContextReusePolicyImpl;

  constructor(config?: Partial<SharedContextManagerConfig>) {
    super();

    this.config = {
      maxSegmentsPerContext: 100,
      maxContextAge: 60 * 60 * 1000, // 1 hour
      reusePolicy: {
        enableReuse: true,
        minSimilarityThreshold: 0.8,
        maxPrefixChange: 0.2,
        allowedPrivacyLevels: [ContextPrivacy.PUBLIC, ContextPrivacy.COLONY],
        enablePlaceholderTemplating: true,
        maxContextAge: 60 * 60 * 1000,
      },
      embeddingDimension: 128,
      enableDiffTracking: true,
      ...config,
    };

    this.sharedContexts = new Map();
    this.agentContexts = new Map();
    this.reusePolicy = new ContextReusePolicyImpl(this.config.reusePolicy);
  }

  /**
   * Create a new shared context
   */
  async createSharedContext(
    ownerAgentId: string,
    segments: ContextSegment[],
    privacyLevel: ContextPrivacy = ContextPrivacy.COLONY,
    expiresAt?: number
  ): Promise<SharedContext> {
    const id = uuidv4();
    const now = Date.now();

    const sharedContext: SharedContext = {
      id,
      segments: segments.slice(0, this.config.maxSegmentsPerContext),
      ownerAgentId,
      consumerAgentIds: new Set([ownerAgentId]),
      privacyLevel,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    // Store shared context
    this.sharedContexts.set(id, sharedContext);

    // Track agent ownership
    this.trackAgentContext(ownerAgentId, id);

    this.emit('context_created', sharedContext);

    return sharedContext;
  }

  /**
   * Share context with another agent
   */
  async shareWithContext(
    contextId: string,
    targetAgentId: string,
    options?: {
      expiresAt?: number;
      overridePrivacy?: ContextPrivacy;
    }
  ): Promise<boolean> {
    const context = this.sharedContexts.get(contextId);
    if (!context) {
      return false;
    }

    // Check if target is already a consumer
    if (context.consumerAgentIds.has(targetAgentId)) {
      return true;
    }

    // Add target as consumer
    context.consumerAgentIds.add(targetAgentId);

    // Update expiration if provided
    if (options?.expiresAt) {
      context.expiresAt = options.expiresAt;
    }

    // Update privacy if override provided
    if (options?.overridePrivacy) {
      context.privacyLevel = options.overridePrivacy;
    }

    context.updatedAt = Date.now();

    // Track agent context
    this.trackAgentContext(targetAgentId, contextId);

    this.emit('context_shared', {
      contextId,
      targetAgentId,
      sharedBy: context.ownerAgentId,
    });

    return true;
  }

  /**
   * Find reusable context for an agent
   */
  findReusableContext(
    agentId: string,
    querySegments: ContextSegment[],
    queryEmbedding?: number[]
  ): ContextReuseDecision[] {
    const decisions: ContextReuseDecision[] = [];
    const agentContextIds = this.agentContexts.get(agentId);

    if (!agentContextIds || agentContextIds.size === 0) {
      return [{
        canReuse: false,
        confidence: 0,
        reason: 'No existing contexts found for agent',
      }];
    }

    // Check each shared context for reusability
    for (const contextId of agentContextIds) {
      const context = this.sharedContexts.get(contextId);
      if (!context) continue;

      // Compute similarity
      const similarity = queryEmbedding
        ? this.computeContextSimilarity(context, queryEmbedding)
        : ContextDiffTracker.computeEmbeddingSimilarity(context.segments, querySegments);

      // Check reuse policy
      const decision = this.reusePolicy.canReuseContext(
        context,
        agentId,
        similarity,
        this.computeContextHash(querySegments)
      );

      if (decision.canReuse) {
        decision.sourceContextId = contextId;
      }

      decisions.push(decision);
    }

    // Sort by confidence
    return decisions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string): SharedContext | undefined {
    return this.sharedContexts.get(contextId);
  }

  /**
   * Get all contexts for an agent
   */
  getContextsForAgent(agentId: string): SharedContext[] {
    const contextIds = this.agentContexts.get(agentId);
    if (!contextIds) return [];

    return Array.from(contextIds)
      .map(id => this.sharedContexts.get(id))
      .filter((c): c is SharedContext => c !== undefined);
  }

  /**
   * Compute diff between two contexts
   */
  computeContextDiff(
    context1Id: string,
    context2Id: string
  ): ContextDiff | undefined {
    const context1 = this.sharedContexts.get(context1Id);
    const context2 = this.sharedContexts.get(context2Id);

    if (!context1 || !context2) {
      return undefined;
    }

    return ContextDiffTracker.computeDiff(context1.segments, context2.segments);
  }

  /**
   * Update context with new segments
   */
  async updateContext(
    contextId: string,
    newSegments: ContextSegment[]
  ): Promise<boolean> {
    const context = this.sharedContexts.get(contextId);
    if (!context) return false;

    // Compute diff if tracking is enabled
    if (this.config.enableDiffTracking) {
      const diff = ContextDiffTracker.computeDiff(context.segments, newSegments);
      this.emit('context_diff', { contextId, diff });
    }

    // Update segments
    context.segments = newSegments.slice(0, this.config.maxSegmentsPerContext);
    context.updatedAt = Date.now();

    this.emit('context_updated', context);

    return true;
  }

  /**
   * Remove expired contexts
   */
  cleanupExpiredContexts(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, context] of this.sharedContexts.entries()) {
      if (context.expiresAt && context.expiresAt < now) {
        this.removeContext(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Remove a context
   */
  removeContext(contextId: string): boolean {
    const context = this.sharedContexts.get(contextId);
    if (!context) return false;

    // Remove from agent tracking
    for (const agentId of context.consumerAgentIds) {
      const contexts = this.agentContexts.get(agentId);
      if (contexts) {
        contexts.delete(contextId);
      }
    }

    // Remove context
    this.sharedContexts.delete(contextId);

    this.emit('context_removed', { contextId });

    return true;
  }

  /**
   * Get statistics
   */
  getStats(): ContextSharingStats {
    let reuseCount = 0;
    let totalSimilarity = 0;
    let totalSpeedup = 0;
    let activeContexts = 0;

    const now = Date.now();

    for (const context of this.sharedContexts.values()) {
      const isExpired = context.expiresAt && context.expiresAt < now;
      if (!isExpired) {
        activeContexts++;
      }

      for (const segment of context.segments) {
        reuseCount += segment.usageCount;
      }
    }

    return {
      totalSharedContexts: this.sharedContexts.size,
      totalSegments: Array.from(this.sharedContexts.values())
        .reduce((sum, ctx) => sum + ctx.segments.length, 0),
      reuseCount,
      reuseRate: reuseCount > 0 ? reuseCount / this.sharedContexts.size : 0,
      avgSimilarity: totalSimilarity / (this.sharedContexts.size || 1),
      avgSpeedup: totalSpeedup / (reuseCount || 1),
      activeContexts,
    };
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.sharedContexts.clear();
    this.agentContexts.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private trackAgentContext(agentId: string, contextId: string): void {
    if (!this.agentContexts.has(agentId)) {
      this.agentContexts.set(agentId, new Set());
    }
    this.agentContexts.get(agentId)!.add(contextId);
  }

  private computeContextSimilarity(
    context: SharedContext,
    queryEmbedding: number[]
  ): number {
    if (context.segments.length === 0) return 0;

    // Compute average embedding of context segments
    const avgEmbedding = this.averageEmbedding(
      context.segments.map(s => s.embedding)
    );

    // Compute cosine similarity
    return ContextDiffTracker.computeEmbeddingSimilarity(
      context.segments,
      [{ id: 'query', content: '', tokens: [], embedding: queryEmbedding, hash: '', length: 1, createdAt: 0, updatedAt: 0, sourceAgentId: '', usageCount: 0, lastUsed: 0 }]
    );
  }

  private averageEmbedding(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dim = embeddings[0].length;
    const avg: number[] = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }

    return avg.map(v => v / embeddings.length);
  }

  private computeContextHash(segments: ContextSegment[]): string {
    return segments.map(s => s.hash).join('-');
  }
}

// ============================================================================
// PLACEHOLDER CONTEXT MANAGER
// ============================================================================

/**
 * Manages placeholder-based context templating
 */
export class PlaceholderContextManager {
  private templates: Map<string, ContextTemplate>;
  private placeholders: Map<string, ContextSegment>;

  constructor() {
    this.templates = new Map();
    this.placeholders = new Map();
  }

  /**
   * Create a context template with placeholders
   */
  createTemplate(
    templateId: string,
    segments: Array<ContextSegment | Placeholder>,
    metadata?: Record<string, unknown>
  ): ContextTemplate {
    const template: ContextTemplate = {
      id: templateId,
      segments,
      placeholderIds: segments
        .filter(s => this.isPlaceholder(s))
        .map(s => (s as Placeholder).placeholderId),
      metadata: metadata || {},
      createdAt: Date.now(),
    };

    this.templates.set(templateId, template);

    return template;
  }

  /**
   * Instantiate a template with actual segments
   */
  instantiateTemplate(
    templateId: string,
    replacements: Map<string, ContextSegment>
  ): ContextSegment[] {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const instantiated: ContextSegment[] = [];

    for (const segment of template.segments) {
      if (this.isPlaceholder(segment)) {
        const placeholder = segment as Placeholder;
        const replacement = replacements.get(placeholder.placeholderId);

        if (replacement) {
          instantiated.push(replacement);
        } else {
          throw new Error(`No replacement for placeholder ${placeholder.placeholderId}`);
        }
      } else {
        instantiated.push(segment as ContextSegment);
      }
    }

    return instantiated;
  }

  /**
   * Register a placeholder segment
   */
  registerPlaceholder(placeholderId: string, segment: ContextSegment): void {
    this.placeholders.set(placeholderId, segment);
  }

  /**
   * Get placeholder by ID
   */
  getPlaceholder(placeholderId: string): ContextSegment | undefined {
    return this.placeholders.get(placeholderId);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ContextTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Check if segment is a placeholder
   */
  private isPlaceholder(segment: ContextSegment | Placeholder): boolean {
    return 'placeholderId' in segment;
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Placeholder in context template
 */
export interface Placeholder {
  placeholderId: string;
  description: string;
  required: boolean;
}

/**
 * Context template with placeholders
 */
export interface ContextTemplate {
  id: string;
  segments: Array<ContextSegment | Placeholder>;
  placeholderIds: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_CONTEXT_REUSE_POLICY: ContextReusePolicy = {
  enableReuse: true,
  minSimilarityThreshold: 0.8,
  maxPrefixChange: 0.2,
  allowedPrivacyLevels: [ContextPrivacy.PUBLIC, ContextPrivacy.COLONY],
  enablePlaceholderTemplating: true,
  maxContextAge: 60 * 60 * 1000, // 1 hour
};

export const DEFAULT_SHARED_CONTEXT_CONFIG: SharedContextManagerConfig = {
  maxSegmentsPerContext: 100,
  maxContextAge: 60 * 60 * 1000,
  reusePolicy: DEFAULT_CONTEXT_REUSE_POLICY,
  embeddingDimension: 128,
  enableDiffTracking: true,
};
