/**
 * POLLN Context Sharing Tests
 * Tests for cross-agent context sharing inspired by KVCOMM
 */

import {
  SharedContextManager,
  ContextSegmentImpl,
  ContextReusePolicyImpl,
  ContextDiffTracker,
  PlaceholderContextManager,
  ContextPrivacy,
  DEFAULT_CONTEXT_REUSE_POLICY,
  DEFAULT_SHARED_CONTEXT_CONFIG,
} from '../contextshare';
import type {
  ContextSegment,
  SharedContext,
  ContextReuseDecision,
  ContextDiff,
  Placeholder,
  ContextTemplate,
} from '../contextshare';

describe('ContextSegmentImpl', () => {
  it('should create a context segment with valid properties', () => {
    const content = 'Test context content';
    const tokens = [1, 2, 3, 4, 5];
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const sourceAgentId = 'agent-1';

    const segment = new ContextSegmentImpl(content, tokens, embedding, sourceAgentId);

    expect(segment.id).toBeDefined();
    expect(segment.content).toBe(content);
    expect(segment.tokens).toEqual(tokens);
    expect(segment.embedding).toEqual(embedding);
    expect(segment.sourceAgentId).toBe(sourceAgentId);
    expect(segment.length).toBe(tokens.length);
    expect(segment.hash).toBeDefined();
    expect(segment.usageCount).toBe(0);
    expect(segment.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it('should record usage correctly', () => {
    const segment = new ContextSegmentImpl(
      'content',
      [1, 2, 3],
      [0.1, 0.2, 0.3],
      'agent-1'
    );

    expect(segment.usageCount).toBe(0);

    segment.recordUsage();
    expect(segment.usageCount).toBe(1);

    segment.recordUsage();
    expect(segment.usageCount).toBe(2);
  });

  it('should update segment content and recompute hash', () => {
    const segment = new ContextSegmentImpl(
      'old content',
      [1, 2, 3],
      [0.1, 0.2, 0.3],
      'agent-1'
    );

    const oldHash = segment.hash;

    segment.update('new content', [4, 5, 6], [0.4, 0.5, 0.6]);

    expect(segment.content).toBe('new content');
    expect(segment.tokens).toEqual([4, 5, 6]);
    expect(segment.embedding).toEqual([0.4, 0.5, 0.6]);
    expect(segment.hash).not.toBe(oldHash);
  });
});

describe('ContextDiffTracker', () => {
  it('should compute diff for identical contexts', () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');

    const diff = ContextDiffTracker.computeDiff([segment1, segment2], [segment1, segment2]);

    expect(diff.prefixMatch).toBe(true);
    expect(diff.similarity).toBe(1.0);
    expect(diff.addedSegments).toHaveLength(0);
    expect(diff.removedSegments).toHaveLength(0);
    expect(diff.modifiedSegments).toHaveLength(0);
  });

  it('should detect added segments', () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');
    const segment3 = new ContextSegmentImpl('content3', [5, 6], [0.5, 0.6], 'agent-1');

    const diff = ContextDiffTracker.computeDiff([segment1], [segment1, segment2, segment3]);

    expect(diff.addedSegments).toHaveLength(2);
    expect(diff.addedSegments).toContain(segment2);
    expect(diff.addedSegments).toContain(segment3);
  });

  it('should detect removed segments', () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');

    const diff = ContextDiffTracker.computeDiff([segment1, segment2], [segment1]);

    expect(diff.removedSegments).toHaveLength(1);
    expect(diff.removedSegments).toContain(segment2);
  });

  it('should compute embedding similarity correctly', () => {
    const segment1 = new ContextSegmentImpl('content1', [1], [1, 0, 0], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [2], [1, 0, 0], 'agent-1');

    const similarity = ContextDiffTracker.computeEmbeddingSimilarity(
      [segment1],
      [segment2]
    );

    expect(similarity).toBeCloseTo(1.0, 1);
  });

  it('should detect prefix mismatch', () => {
    const segment1 = new ContextSegmentImpl('content1', [1], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [2], [0.3, 0.4], 'agent-1');
    const segment3 = new ContextSegmentImpl('content3', [3], [0.5, 0.6], 'agent-1');

    const diff = ContextDiffTracker.computeDiff([segment1, segment2], [segment3, segment1]);

    expect(diff.prefixMatch).toBe(false);
    expect(diff.similarity).toBeGreaterThan(0);
    expect(diff.offset).toBeDefined();
  });
});

describe('ContextReusePolicyImpl', () => {
  it('should use default policy values', () => {
    const policy = new ContextReusePolicyImpl();

    expect(policy.enableReuse).toBe(true);
    expect(policy.minSimilarityThreshold).toBe(0.8);
    expect(policy.maxPrefixChange).toBe(0.2);
    expect(policy.enablePlaceholderTemplating).toBe(true);
    expect(policy.maxContextAge).toBe(60 * 60 * 1000);
  });

  it('should allow custom policy values', () => {
    const customPolicy = {
      enableReuse: false,
      minSimilarityThreshold: 0.9,
      maxPrefixChange: 0.1,
      allowedPrivacyLevels: [ContextPrivacy.PUBLIC],
      enablePlaceholderTemplating: false,
      maxContextAge: 30 * 60 * 1000,
    };

    const policy = new ContextReusePolicyImpl(customPolicy);

    expect(policy.enableReuse).toBe(false);
    expect(policy.minSimilarityThreshold).toBe(0.9);
    expect(policy.allowedPrivacyLevels).toEqual([ContextPrivacy.PUBLIC]);
  });

  it('should allow reuse for context owner', () => {
    const policy = new ContextReusePolicyImpl();
    const sharedContext: SharedContext = {
      id: 'context-1',
      segments: [],
      ownerAgentId: 'agent-1',
      consumerAgentIds: new Set(['agent-1', 'agent-2']),
      privacyLevel: ContextPrivacy.COLONY,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const decision = policy.canReuseContext(sharedContext, 'agent-1', 0.5, 'hash');

    expect(decision.canReuse).toBe(true);
    expect(decision.confidence).toBe(1.0);
    expect(decision.reason).toBe('Requester is context owner');
    expect(decision.sourceContextId).toBe('context-1');
  });

  it('should deny reuse when disabled', () => {
    const policy = new ContextReusePolicyImpl({ enableReuse: false });
    const sharedContext: SharedContext = {
      id: 'context-1',
      segments: [],
      ownerAgentId: 'agent-1',
      consumerAgentIds: new Set(['agent-2']),
      privacyLevel: ContextPrivacy.PUBLIC,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const decision = policy.canReuseContext(sharedContext, 'agent-2', 0.9, 'hash');

    expect(decision.canReuse).toBe(false);
    expect(decision.reason).toBe('Context reuse is disabled');
  });

  it('should deny reuse for unauthorized agents', () => {
    const policy = new ContextReusePolicyImpl();
    const sharedContext: SharedContext = {
      id: 'context-1',
      segments: [],
      ownerAgentId: 'agent-1',
      consumerAgentIds: new Set(['agent-1']),
      privacyLevel: ContextPrivacy.COLONY, // Use COLONY instead of PRIVATE
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const decision = policy.canReuseContext(sharedContext, 'agent-2', 0.9, 'hash');

    expect(decision.canReuse).toBe(false);
    expect(decision.reason).toContain('not authorized');
  });

  it('should deny reuse when similarity is below threshold', () => {
    const policy = new ContextReusePolicyImpl({ minSimilarityThreshold: 0.8 });
    const sharedContext: SharedContext = {
      id: 'context-1',
      segments: [],
      ownerAgentId: 'agent-1',
      consumerAgentIds: new Set(['agent-1', 'agent-2']),
      privacyLevel: ContextPrivacy.COLONY,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const decision = policy.canReuseContext(sharedContext, 'agent-2', 0.5, 'hash');

    expect(decision.canReuse).toBe(false);
    expect(decision.confidence).toBe(0.5);
    expect(decision.reason).toContain('below threshold');
  });

  it('should allow reuse when conditions are met', () => {
    const policy = new ContextReusePolicyImpl({ minSimilarityThreshold: 0.8 });
    const segment = new ContextSegmentImpl('content', [1, 2, 3], [0.1, 0.2, 0.3], 'agent-1');
    const sharedContext: SharedContext = {
      id: 'context-1',
      segments: [segment],
      ownerAgentId: 'agent-1',
      consumerAgentIds: new Set(['agent-1', 'agent-2']),
      privacyLevel: ContextPrivacy.COLONY,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const decision = policy.canReuseContext(sharedContext, 'agent-2', 0.9, 'hash');

    expect(decision.canReuse).toBe(true);
    expect(decision.confidence).toBe(0.9);
    expect(decision.sourceContextId).toBe('context-1');
    expect(decision.estimatedSpeedup).toBeGreaterThan(0);
  });
});

describe('SharedContextManager', () => {
  let manager: SharedContextManager;

  beforeEach(() => {
    manager = new SharedContextManager();
  });

  it('should create a shared context', async () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');

    const context = await manager.createSharedContext(
      'agent-1',
      [segment1, segment2],
      ContextPrivacy.COLONY
    );

    expect(context.id).toBeDefined();
    expect(context.ownerAgentId).toBe('agent-1');
    expect(context.segments).toHaveLength(2);
    expect(context.privacyLevel).toBe(ContextPrivacy.COLONY);
    expect(context.consumerAgentIds).toContain('agent-1');
  });

  it('should share context with another agent', async () => {
    const segment = new ContextSegmentImpl('content', [1, 2], [0.1, 0.2], 'agent-1');
    const context = await manager.createSharedContext(
      'agent-1',
      [segment],
      ContextPrivacy.PUBLIC
    );

    const success = await manager.shareWithContext(context.id, 'agent-2');

    expect(success).toBe(true);

    const retrievedContext = manager.getContext(context.id);
    expect(retrievedContext?.consumerAgentIds).toContain('agent-2');
  });

  it('should not share context if it does not exist', async () => {
    const success = await manager.shareWithContext('non-existent', 'agent-2');
    expect(success).toBe(false);
  });

  it('should find reusable context for agent', async () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');
    const context = await manager.createSharedContext(
      'agent-1',
      [segment1, segment2],
      ContextPrivacy.PUBLIC
    );

    // Share with agent-2
    await manager.shareWithContext(context.id, 'agent-2');

    // Find reusable context
    const querySegment = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-2');
    const decisions = manager.findReusableContext('agent-2', [querySegment]);

    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].canReuse).toBe(true);
  });

  it('should return no reusable context for agent with no contexts', () => {
    const querySegment = new ContextSegmentImpl('content', [1, 2], [0.1, 0.2], 'agent-1');
    const decisions = manager.findReusableContext('agent-1', [querySegment]);

    expect(decisions.length).toBe(1);
    expect(decisions[0].canReuse).toBe(false);
    expect(decisions[0].reason).toContain('No existing contexts');
  });

  it('should compute context diff', async () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');
    const segment3 = new ContextSegmentImpl('content3', [5, 6], [0.5, 0.6], 'agent-1');

    const context1 = await manager.createSharedContext('agent-1', [segment1, segment2]);
    const context2 = await manager.createSharedContext('agent-1', [segment1, segment3]);

    const diff = manager.computeContextDiff(context1.id, context2.id);

    expect(diff).toBeDefined();
    // First segment matches, so prefix is partially matching
    expect(diff?.addedSegments).toHaveLength(1);
    expect(diff?.removedSegments).toHaveLength(1);
    // Verify the correct segments were added/removed
    expect(diff?.addedSegments).toContain(segment3);
    expect(diff?.removedSegments).toContain(segment2);
  });

  it('should update context with new segments', async () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');
    const segment3 = new ContextSegmentImpl('content3', [5, 6], [0.5, 0.6], 'agent-1');

    const context = await manager.createSharedContext('agent-1', [segment1]);
    const success = await manager.updateContext(context.id, [segment2, segment3]);

    expect(success).toBe(true);

    const updatedContext = manager.getContext(context.id);
    expect(updatedContext?.segments).toHaveLength(2);
  });

  it('should remove expired contexts', async () => {
    const segment = new ContextSegmentImpl('content', [1, 2], [0.1, 0.2], 'agent-1');
    const expiresAt = Date.now() - 1000; // Already expired
    const context = await manager.createSharedContext(
      'agent-1',
      [segment],
      ContextPrivacy.PUBLIC,
      expiresAt
    );

    const removed = manager.cleanupExpiredContexts();

    expect(removed).toBe(1);
    expect(manager.getContext(context.id)).toBeUndefined();
  });

  it('should get statistics', async () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');

    await manager.createSharedContext('agent-1', [segment1], ContextPrivacy.PUBLIC);
    await manager.createSharedContext('agent-2', [segment2], ContextPrivacy.COLONY);

    const stats = manager.getStats();

    expect(stats.totalSharedContexts).toBe(2);
    expect(stats.totalSegments).toBe(2);
    expect(stats.activeContexts).toBe(2);
  });

  it('should clear all contexts', async () => {
    const segment = new ContextSegmentImpl('content', [1, 2], [0.1, 0.2], 'agent-1');
    await manager.createSharedContext('agent-1', [segment]);

    manager.clear();

    const stats = manager.getStats();
    expect(stats.totalSharedContexts).toBe(0);
  });
});

describe('PlaceholderContextManager', () => {
  let placeholderManager: PlaceholderContextManager;

  beforeEach(() => {
    placeholderManager = new PlaceholderContextManager();
  });

  it('should create a context template with placeholders', () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const placeholder1: Placeholder = {
      placeholderId: 'dynamic-content',
      description: 'Dynamic content placeholder',
      required: true,
    };

    const template = placeholderManager.createTemplate('template-1', [segment1, placeholder1]);

    expect(template.id).toBe('template-1');
    expect(template.segments).toHaveLength(2);
    expect(template.placeholderIds).toContain('dynamic-content');
  });

  it('should instantiate template with replacements', () => {
    const segment1 = new ContextSegmentImpl('static', [1], [0.1], 'agent-1');
    const placeholder1: Placeholder = {
      placeholderId: 'dynamic',
      description: 'Dynamic content',
      required: true,
    };

    placeholderManager.createTemplate('template-1', [segment1, placeholder1]);

    const replacement = new ContextSegmentImpl('replacement', [2], [0.2], 'agent-1');
    const replacements = new Map([['dynamic', replacement]]);

    const instantiated = placeholderManager.instantiateTemplate('template-1', replacements);

    expect(instantiated).toHaveLength(2);
    expect(instantiated[0].content).toBe('static');
    expect(instantiated[1].content).toBe('replacement');
  });

  it('should throw error when template not found', () => {
    const replacements = new Map();

    expect(() => {
      placeholderManager.instantiateTemplate('non-existent', replacements);
    }).toThrow('Template non-existent not found');
  });

  it('should throw error when required placeholder missing', () => {
    const segment1 = new ContextSegmentImpl('static', [1], [0.1], 'agent-1');
    const placeholder1: Placeholder = {
      placeholderId: 'dynamic',
      description: 'Dynamic content',
      required: true,
    };

    placeholderManager.createTemplate('template-1', [segment1, placeholder1]);

    const replacements = new Map(); // Empty replacements

    expect(() => {
      placeholderManager.instantiateTemplate('template-1', replacements);
    }).toThrow('No replacement for placeholder dynamic');
  });

  it('should register and retrieve placeholder', () => {
    const placeholder = new ContextSegmentImpl('placeholder content', [1, 2], [0.1, 0.2], 'agent-1');

    placeholderManager.registerPlaceholder('placeholder-1', placeholder);

    const retrieved = placeholderManager.getPlaceholder('placeholder-1');

    expect(retrieved).toEqual(placeholder);
  });

  it('should retrieve template by ID', () => {
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const template = placeholderManager.createTemplate('template-1', [segment1]);

    const retrieved = placeholderManager.getTemplate('template-1');

    expect(retrieved).toEqual(template);
  });
});

describe('Integration Tests', () => {
  it('should share context between multiple agents', async () => {
    const manager = new SharedContextManager();

    // Agent 1 creates context
    const segment1 = new ContextSegmentImpl('shared context', [1, 2, 3], [0.1, 0.2, 0.3], 'agent-1');
    const context = await manager.createSharedContext(
      'agent-1',
      [segment1],
      ContextPrivacy.COLONY
    );

    // Share with agents 2 and 3
    await manager.shareWithContext(context.id, 'agent-2');
    await manager.shareWithContext(context.id, 'agent-3');

    const retrievedContext = manager.getContext(context.id);
    expect(retrievedContext?.consumerAgentIds.size).toBe(3);

    // Agent 2 should be able to reuse the context
    const querySegment = new ContextSegmentImpl('shared context', [1, 2, 3], [0.1, 0.2, 0.3], 'agent-2');
    const decisions = manager.findReusableContext('agent-2', [querySegment]);

    expect(decisions[0].canReuse).toBe(true);
  });

  it('should handle context lifecycle correctly', async () => {
    const manager = new SharedContextManager();

    // Create context
    const segment1 = new ContextSegmentImpl('content1', [1, 2], [0.1, 0.2], 'agent-1');
    const context = await manager.createSharedContext('agent-1', [segment1]);

    // Update context
    const segment2 = new ContextSegmentImpl('content2', [3, 4], [0.3, 0.4], 'agent-1');
    await manager.updateContext(context.id, [segment2]);

    // Verify update
    const updated = manager.getContext(context.id);
    expect(updated?.segments[0].content).toBe('content2');

    // Remove context
    const removed = manager.removeContext(context.id);
    expect(removed).toBe(true);

    // Verify removal
    const retrieved = manager.getContext(context.id);
    expect(retrieved).toBeUndefined();
  });

  it('should enforce privacy levels correctly', async () => {
    const manager = new SharedContextManager({
      reusePolicy: {
        ...DEFAULT_CONTEXT_REUSE_POLICY,
        allowedPrivacyLevels: [ContextPrivacy.PUBLIC],
      },
    });

    // Create private context
    const segment1 = new ContextSegmentImpl('private content', [1, 2], [0.1, 0.2], 'agent-1');
    const privateContext = await manager.createSharedContext(
      'agent-1',
      [segment1],
      ContextPrivacy.PRIVATE
    );

    // Try to reuse with policy that only allows PUBLIC
    const querySegment = new ContextSegmentImpl('private content', [1, 2], [0.1, 0.2], 'agent-1');
    const decisions = manager.findReusableContext('agent-1', [querySegment]);

    expect(decisions[0].canReuse).toBe(false);
    expect(decisions[0].reason).toContain('Privacy level');
  });
});

describe('Constants and Defaults', () => {
  it('should have valid default context reuse policy', () => {
    expect(DEFAULT_CONTEXT_REUSE_POLICY.enableReuse).toBe(true);
    expect(DEFAULT_CONTEXT_REUSE_POLICY.minSimilarityThreshold).toBe(0.8);
    expect(DEFAULT_CONTEXT_REUSE_POLICY.maxPrefixChange).toBe(0.2);
    expect(DEFAULT_CONTEXT_REUSE_POLICY.allowedPrivacyLevels).toContain(ContextPrivacy.PUBLIC);
    expect(DEFAULT_CONTEXT_REUSE_POLICY.allowedPrivacyLevels).toContain(ContextPrivacy.COLONY);
  });

  it('should have valid default shared context config', () => {
    expect(DEFAULT_SHARED_CONTEXT_CONFIG.maxSegmentsPerContext).toBe(100);
    expect(DEFAULT_SHARED_CONTEXT_CONFIG.maxContextAge).toBe(60 * 60 * 1000);
    expect(DEFAULT_SHARED_CONTEXT_CONFIG.enableDiffTracking).toBe(true);
    expect(DEFAULT_SHARED_CONTEXT_CONFIG.embeddingDimension).toBe(128);
  });
});

describe('Context Privacy Enum', () => {
  it('should have correct privacy level values', () => {
    expect(ContextPrivacy.PUBLIC).toBe('PUBLIC');
    expect(ContextPrivacy.COLONY).toBe('COLONY');
    expect(ContextPrivacy.PRIVATE).toBe('PRIVATE');
  });
});
