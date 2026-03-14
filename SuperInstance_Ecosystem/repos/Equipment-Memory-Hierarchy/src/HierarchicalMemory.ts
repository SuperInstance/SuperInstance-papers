/**
 * @fileoverview Hierarchical Memory - Main equipment class for 4-tier cognitive memory
 * Integrates Working, Episodic, Semantic, and Procedural memory with automatic consolidation
 */

import {
  MemoryTier,
  HierarchicalMemoryConfig,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStatistics,
  BaseMemoryItem,
  WorkingMemoryItem,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
  EmotionalContext,
  MemorySource,
  SemanticRelationType,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler,
  SkillExecutionResult,
  ProceduralStep
} from './types.js';
import { WorkingMemory } from './WorkingMemory.js';
import { EpisodicMemory } from './EpisodicMemory.js';
import { SemanticMemory } from './SemanticMemory.js';
import { ProceduralMemory } from './ProceduralMemory.js';
import { MemoryConsolidation } from './MemoryConsolidation.js';

/**
 * Default hierarchical memory configuration
 */
const DEFAULT_CONFIG: HierarchicalMemoryConfig = {
  working: {
    capacity: 7,
    decayInterval: 5000,
    attentionThreshold: 0.1,
    autoConsolidate: true
  },
  episodic: {
    maxCapacity: 10000,
    consolidationThreshold: 0.7,
    emotionalWeighting: true,
    temporalResolution: 1000
  },
  semantic: {
    maxConcepts: 50000,
    relationshipThreshold: 0.1,
    confidenceThreshold: 0.3,
    autoCategorize: true
  },
  procedural: {
    maxSkills: 1000,
    autoExecution: true,
    learningThreshold: 3,
    expertiseThreshold: 50,
    forgettingThreshold: 0.2
  },
  consolidation: {
    workingToEpisodic: {
      accessThreshold: 3,
      importanceThreshold: 0.6,
      emotionalWeighting: true
    },
    episodicToSemantic: {
      occurrenceThreshold: 3,
      importanceThreshold: 0.7,
      confidenceWeighting: true
    },
    semanticToProcedural: {
      applicationThreshold: 10,
      successThreshold: 0.8,
      patternRecognition: true
    },
    decayConfig: {
      workingDecayRate: 0.1,
      episodicDecayRate: 0.05,
      semanticDecayRate: 0.01,
      proceduralDecayRate: 0.02,
      reinforcementFactor: 0.2
    }
  },
  enableAutoConsolidation: true,
  consolidationInterval: 60000,
  enableForgetting: true,
  forgettingCheckInterval: 300000
};

/**
 * Hierarchical Memory class
 * Main equipment class that orchestrates the 4-tier cognitive memory system
 * 
 * Features:
 * - Unified interface for all memory tiers
 * - Automatic consolidation between tiers
 * - Cross-tier search capabilities
 * - Memory statistics and monitoring
 * - Event-driven architecture
 * 
 * Memory Hierarchy:
 * 1. Working Memory - Immediate context, limited capacity (7±2 items), fast decay
 * 2. Episodic Memory - Events with temporal/emotional context, moderate decay
 * 3. Semantic Memory - Facts and concepts, relationships, slow decay
 * 4. Procedural Memory - Skills and procedures, trigger-based execution
 */
export class HierarchicalMemory {
  private config: HierarchicalMemoryConfig;
  private workingMemory: WorkingMemory;
  private episodicMemory: EpisodicMemory;
  private semanticMemory: SemanticMemory;
  private proceduralMemory: ProceduralMemory;
  private consolidation: MemoryConsolidation;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();
  private started: boolean = false;

  constructor(config: Partial<HierarchicalMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize memory tiers
    this.workingMemory = new WorkingMemory(this.config.working);
    this.episodicMemory = new EpisodicMemory(this.config.episodic);
    this.semanticMemory = new SemanticMemory(this.config.semantic);
    this.proceduralMemory = new ProceduralMemory(this.config.procedural);
    
    // Initialize consolidation engine
    this.consolidation = new MemoryConsolidation(
      this.workingMemory,
      this.episodicMemory,
      this.semanticMemory,
      this.proceduralMemory,
      this.config.consolidation
    );
    
    // Set up internal event routing
    this.setupEventRouting();
  }

  /**
   * Start the hierarchical memory system
   */
  start(): void {
    if (this.started) return;
    
    this.workingMemory.start();
    
    if (this.config.enableAutoConsolidation) {
      this.consolidation.startAutoConsolidation(this.config.consolidationInterval);
    }
    
    this.started = true;
  }

  /**
   * Stop the hierarchical memory system
   */
  stop(): void {
    this.workingMemory.stop();
    this.consolidation.stopAutoConsolidation();
    this.started = false;
  }

  // =========================================================================
  // Working Memory Operations
  // =========================================================================

  /**
   * Add item to working memory
   */
  addToWorkingMemory(
    content: unknown,
    options: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): WorkingMemoryItem {
    return this.workingMemory.add(
      content,
      options.importance,
      options.tags,
      options.metadata
    );
  }

  /**
   * Get from working memory
   */
  getFromWorkingMemory(id: string): WorkingMemoryItem | null {
    return this.workingMemory.get(id);
  }

  /**
   * Get working memory focus
   */
  getWorkingMemoryFocus(): WorkingMemoryItem | null {
    return this.workingMemory.getCurrentFocus();
  }

  /**
   * Set working memory focus
   */
  setWorkingMemoryFocus(id: string): boolean {
    return this.workingMemory.setFocus(id);
  }

  /**
   * Get working memory capacity info
   */
  getWorkingMemoryCapacity(): { used: number; total: number; utilization: number } {
    const stats = this.workingMemory.getStatistics();
    return {
      used: stats.itemCount,
      total: stats.capacity,
      utilization: stats.utilization
    };
  }

  // =========================================================================
  // Episodic Memory Operations
  // =========================================================================

  /**
   * Add episode to episodic memory
   */
  addEpisode(
    event: string,
    details: Record<string, unknown>,
    options: {
      importance?: number;
      emotionalContext?: EmotionalContext;
      source?: MemorySource;
      participants?: string[];
      location?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): EpisodicMemoryItem {
    return this.episodicMemory.add(event, details, options);
  }

  /**
   * Get episode by ID
   */
  getEpisode(id: string): EpisodicMemoryItem | null {
    return this.episodicMemory.get(id);
  }

  /**
   * Query episodes
   */
  queryEpisodes(query: {
    startTime?: Date;
    endTime?: Date;
    participants?: string[];
    location?: string;
    minImportance?: number;
    tags?: string[];
    limit?: number;
  }): EpisodicMemoryItem[] {
    return this.episodicMemory.query(query);
  }

  /**
   * Get recent episodes
   */
  getRecentEpisodes(count: number = 10): EpisodicMemoryItem[] {
    return this.episodicMemory.getRecent(count);
  }

  // =========================================================================
  // Semantic Memory Operations
  // =========================================================================

  /**
   * Add concept to semantic memory
   */
  addConcept(
    concept: string,
    options: {
      definition?: string;
      attributes?: Record<string, unknown>;
      examples?: string[];
      category?: string;
      importance?: number;
      confidence?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): SemanticMemoryItem {
    return this.semanticMemory.add(concept, options);
  }

  /**
   * Get concept by ID
   */
  getConcept(id: string): SemanticMemoryItem | null {
    return this.semanticMemory.get(id);
  }

  /**
   * Get concept by name
   */
  getConceptByName(name: string): SemanticMemoryItem | null {
    return this.semanticMemory.getByName(name);
  }

  /**
   * Relate concepts
   */
  relateConcepts(
    sourceId: string,
    targetId: string,
    relationType: SemanticRelationType,
    options: {
      strength?: number;
      bidirectional?: boolean;
    } = {}
  ) {
    return this.semanticMemory.relate(sourceId, targetId, relationType, options);
  }

  /**
   * Query semantic memory
   */
  queryConcepts(query: {
    concept?: string;
    category?: string;
    minConfidence?: number;
    relatedTo?: string;
    limit?: number;
  }): SemanticMemoryItem[] {
    return this.semanticMemory.query(query);
  }

  // =========================================================================
  // Procedural Memory Operations
  // =========================================================================

  /**
   * Add skill to procedural memory
   */
  addSkill(
    skill: string,
    steps: ProceduralStep[],
    options: {
      description?: string;
      parameters?: Record<string, unknown>;
      triggers?: Array<{ condition: string; priority?: number; cooldown?: number }>;
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): ProceduralMemoryItem {
    return this.proceduralMemory.add(skill, steps, options);
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): ProceduralMemoryItem | null {
    return this.proceduralMemory.get(id);
  }

  /**
   * Get skill by name
   */
  getSkillByName(name: string): ProceduralMemoryItem | null {
    return this.proceduralMemory.getByName(name);
  }

  /**
   * Execute a skill
   */
  async executeSkill(
    skillId: string,
    context: Record<string, unknown>,
    executor: (step: ProceduralStep, context: Record<string, unknown>) => Promise<unknown>
  ): Promise<SkillExecutionResult> {
    return this.proceduralMemory.execute(skillId, context, executor);
  }

  /**
   * Check for automatic skill triggers
   */
  checkSkillTriggers(context: Record<string, unknown>): Array<{
    skill: ProceduralMemoryItem;
    trigger: { id: string; condition: string; priority: number };
  }> {
    return this.proceduralMemory.checkTriggers(context);
  }

  // =========================================================================
  // Cross-Tier Operations
  // =========================================================================

  /**
   * Search across all memory tiers
   */
  search(options: MemorySearchOptions): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const tiers = options.tiers || [
      MemoryTier.WORKING,
      MemoryTier.EPISODIC,
      MemoryTier.SEMANTIC,
      MemoryTier.PROCEDURAL
    ];

    // Search working memory
    if (tiers.includes(MemoryTier.WORKING)) {
      const items = this.workingMemory.getAll();
      for (const item of items) {
        const relevance = this.calculateRelevance(item, options);
        if (relevance > 0) {
          results.push({
            item,
            relevance,
            tier: MemoryTier.WORKING
          });
        }
      }
    }

    // Search episodic memory
    if (tiers.includes(MemoryTier.EPISODIC)) {
      const items = this.episodicMemory.getAll();
      for (const item of items) {
        const relevance = this.calculateRelevance(item, options);
        if (relevance > 0) {
          results.push({
            item,
            relevance,
            tier: MemoryTier.EPISODIC
          });
        }
      }
    }

    // Search semantic memory
    if (tiers.includes(MemoryTier.SEMANTIC)) {
      const items = this.semanticMemory.getAll();
      for (const item of items) {
        const relevance = this.calculateRelevance(item, options);
        if (relevance > 0) {
          results.push({
            item,
            relevance,
            tier: MemoryTier.SEMANTIC
          });
        }
      }
    }

    // Search procedural memory
    if (tiers.includes(MemoryTier.PROCEDURAL)) {
      const items = this.proceduralMemory.getAll();
      for (const item of items) {
        const relevance = this.calculateRelevance(item, options);
        if (relevance > 0) {
          results.push({
            item,
            relevance,
            tier: MemoryTier.PROCEDURAL
          });
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Apply limit
    if (options.limit !== undefined) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get item by ID from any tier
   */
  getById(id: string): { item: BaseMemoryItem; tier: MemoryTier } | null {
    // Check each tier
    const workingItem = this.workingMemory.get(id);
    if (workingItem) {
      return { item: workingItem, tier: MemoryTier.WORKING };
    }

    const episodicItem = this.episodicMemory.get(id);
    if (episodicItem) {
      return { item: episodicItem, tier: MemoryTier.EPISODIC };
    }

    const semanticItem = this.semanticMemory.get(id);
    if (semanticItem) {
      return { item: semanticItem, tier: MemoryTier.SEMANTIC };
    }

    const proceduralItem = this.proceduralMemory.get(id);
    if (proceduralItem) {
      return { item: proceduralItem, tier: MemoryTier.PROCEDURAL };
    }

    return null;
  }

  /**
   * Run consolidation cycle
   */
  async consolidate(): Promise<void> {
    await this.consolidation.runConsolidation();
  }

  /**
   * Process forgetting across tiers
   */
  processForgetting(): { episodic: number; procedural: number } {
    return this.consolidation.processForgetting();
  }

  // =========================================================================
  // Statistics and Monitoring
  // =========================================================================

  /**
   * Get comprehensive memory statistics
   */
  getStatistics(): MemoryStatistics {
    const workingStats = this.workingMemory.getStatistics();
    const episodicStats = this.episodicMemory.getStatistics();
    const semanticStats = this.semanticMemory.getStatistics();
    const proceduralStats = this.proceduralMemory.getStatistics();
    const consolidationStats = this.consolidation.getStatistics();

    return {
      working: {
        itemCount: workingStats.itemCount,
        capacity: workingStats.capacity,
        utilization: workingStats.utilization,
        averageAge: workingStats.averageAge,
        averageAccessCount: workingStats.averageAccessCount
      },
      episodic: {
        itemCount: episodicStats.itemCount,
        averageAge: episodicStats.averageAge,
        averageImportance: episodicStats.averageImportance,
        averageRetention: episodicStats.averageRetention
      },
      semantic: {
        conceptCount: semanticStats.conceptCount,
        relationshipCount: semanticStats.relationshipCount,
        averageConfidence: semanticStats.averageConfidence,
        categoryDistribution: semanticStats.categoryDistribution
      },
      procedural: {
        skillCount: proceduralStats.skillCount,
        averageSuccessRate: proceduralStats.averageSuccessRate,
        expertLevelCount: proceduralStats.expertLevelCount,
        automaticExecutionCount: proceduralStats.automaticExecutionCount
      },
      consolidation: {
        totalConsolidations: consolidationStats.totalConsolidations,
        recentConsolidations: consolidationStats.recentConsolidations,
        consolidationRate: consolidationStats.consolidationRate
      }
    };
  }

  /**
   * Clear all memory tiers
   */
  clearAll(): void {
    this.workingMemory.clear();
    this.episodicMemory.clear();
    this.semanticMemory.clear();
    this.proceduralMemory.clear();
  }

  /**
   * Subscribe to memory events
   */
  subscribe(eventType: MemoryEventType, handler: MemoryEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  // =========================================================================
  // Direct Access to Memory Tiers
  // =========================================================================

  /**
   * Get working memory instance
   */
  getWorkingMemory(): WorkingMemory {
    return this.workingMemory;
  }

  /**
   * Get episodic memory instance
   */
  getEpisodicMemory(): EpisodicMemory {
    return this.episodicMemory;
  }

  /**
   * Get semantic memory instance
   */
  getSemanticMemory(): SemanticMemory {
    return this.semanticMemory;
  }

  /**
   * Get procedural memory instance
   */
  getProceduralMemory(): ProceduralMemory {
    return this.proceduralMemory;
  }

  /**
   * Get consolidation engine
   */
  getConsolidationEngine(): MemoryConsolidation {
    return this.consolidation;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Set up event routing from tier memories to main handlers
   */
  private setupEventRouting(): void {
    const eventTypes = [
      MemoryEventType.ITEM_ADDED,
      MemoryEventType.ITEM_ACCESSED,
      MemoryEventType.ITEM_UPDATED,
      MemoryEventType.ITEM_REMOVED,
      MemoryEventType.CONSOLIDATION_STARTED,
      MemoryEventType.CONSOLIDATION_COMPLETED,
      MemoryEventType.FORGETTING_TRIGGERED,
      MemoryEventType.SKILL_EXECUTED,
      MemoryEventType.TRIGGER_ACTIVATED
    ];

    for (const eventType of eventTypes) {
      // Route working memory events
      this.workingMemory.subscribe(eventType, event => this.emitEvent(event));
      
      // Route episodic memory events
      this.episodicMemory.subscribe(eventType, event => this.emitEvent(event));
      
      // Route semantic memory events
      this.semanticMemory.subscribe(eventType, event => this.emitEvent(event));
      
      // Route procedural memory events
      this.proceduralMemory.subscribe(eventType, event => this.emitEvent(event));
      
      // Route consolidation events
      this.consolidation.subscribe(eventType, event => this.emitEvent(event));
    }
  }

  /**
   * Calculate relevance of an item to search options
   */
  private calculateRelevance(item: BaseMemoryItem, options: MemorySearchOptions): number {
    let relevance = 0;
    
    // Query matching
    const queryLower = options.query.toLowerCase();
    const contentStr = JSON.stringify(item.content).toLowerCase();
    
    if (contentStr.includes(queryLower)) {
      relevance += 0.4;
      
      // Exact match bonus
      if (contentStr.includes(`"${queryLower}"`)) {
        relevance += 0.2;
      }
    }
    
    // Tag matching
    if (options.tags && options.tags.length > 0) {
      const matchingTags = item.tags.filter(t => 
        options.tags!.some(qt => t.toLowerCase().includes(qt.toLowerCase()))
      );
      relevance += (matchingTags.length / options.tags.length) * 0.2;
    }
    
    // Importance weighting
    relevance += item.importance * 0.2;
    
    // Recency weighting
    if (options.maxAge !== undefined) {
      const age = Date.now() - item.createdAt.getTime();
      if (age > options.maxAge) {
        relevance *= 0.5;
      }
    }
    
    // Minimum importance filter
    if (options.minImportance !== undefined && item.importance < options.minImportance) {
      relevance = 0;
    }
    
    return Math.min(1, relevance);
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: MemoryEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in memory event handler:', error);
        }
      }
    }
  }
}

export default HierarchicalMemory;
