/**
 * @fileoverview Semantic Memory - Facts and concepts memory with relationships
 * Stores general knowledge, concepts, and their relationships
 */

import { randomUUID } from 'crypto';
import {
  MemoryTier,
  SemanticMemoryItem,
  SemanticMemoryConfig,
  SemanticRelationship,
  SemanticRelationType,
  SemanticQuery,
  ForgettingCurveParams,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler
} from './types.js';

/**
 * Default semantic memory configuration
 */
const DEFAULT_CONFIG: SemanticMemoryConfig = {
  maxConcepts: 50000,
  relationshipThreshold: 0.1,
  confidenceThreshold: 0.3,
  autoCategorize: true
};

/**
 * Semantic Memory class
 * Implements knowledge storage with concept relationships
 * Features:
 * - Concept storage with definitions and attributes
 * - Relationship graph between concepts
 * - Importance-weighted retention
 * - Confidence tracking
 * - Category organization
 */
export class SemanticMemory {
  private concepts: Map<string, SemanticMemoryItem> = new Map();
  private relationships: Map<string, SemanticRelationship> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private nameIndex: Map<string, string> = new Map(); // concept name -> ID
  private config: SemanticMemoryConfig;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();

  constructor(config: Partial<SemanticMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a concept to semantic memory
   */
  add(
    concept: string,
    options: {
      definition?: string;
      attributes?: Record<string, unknown>;
      examples?: string[];
      category?: string;
      importance?: number;
      confidence?: number;
      sourceEpisodes?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): SemanticMemoryItem {
    // Check if concept already exists
    const existingId = this.nameIndex.get(concept.toLowerCase());
    if (existingId) {
      // Update existing concept
      return this.update(existingId, {
        attributes: options.attributes,
        examples: options.examples,
        confidence: options.confidence
      })!;
    }

    const now = new Date();
    
    // Check capacity
    if (this.concepts.size >= this.config.maxConcepts) {
      this.pruneLowConfidence();
    }

    const forgettingCurve: ForgettingCurveParams = {
      strength: 0.5 + (options.importance || 0.5) * 0.3,
      decayRate: this.calculateDecayRate(options.importance || 0.5),
      lastReinforcement: now,
      reinforcementCount: 1
    };

    // Auto-categorize if enabled
    let category = options.category;
    if (!category && this.config.autoCategorize) {
      category = this.inferCategory(concept, options.attributes);
    }

    const item: SemanticMemoryItem = {
      id: randomUUID(),
      content: {
        concept,
        definition: options.definition,
        attributes: options.attributes || {},
        examples: options.examples,
        category
      },
      importance: options.importance || 0.5,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tier: MemoryTier.SEMANTIC,
      tags: options.tags || [],
      metadata: options.metadata || {},
      relationships: [],
      confidence: options.confidence || 0.7,
      sourceEpisodes: options.sourceEpisodes || [],
      forgettingCurve
    };

    // Store and index
    this.concepts.set(item.id, item);
    this.nameIndex.set(concept.toLowerCase(), item.id);
    
    if (category) {
      this.indexByCategory(item.id, category);
    }

    this.emitEvent({
      type: MemoryEventType.ITEM_ADDED,
      timestamp: now,
      tier: MemoryTier.SEMANTIC,
      itemId: item.id,
      data: { concept, category }
    });

    return item;
  }

  /**
   * Get a concept by ID
   */
  get(id: string): SemanticMemoryItem | null {
    const item = this.concepts.get(id);
    if (!item) return null;

    // Update access and reconsolidate
    item.lastAccessedAt = new Date();
    item.accessCount++;
    this.reconsolidate(item);

    this.emitEvent({
      type: MemoryEventType.ITEM_ACCESSED,
      timestamp: new Date(),
      tier: MemoryTier.SEMANTIC,
      itemId: id
    });

    return item;
  }

  /**
   * Get a concept by name
   */
  getByName(conceptName: string): SemanticMemoryItem | null {
    const id = this.nameIndex.get(conceptName.toLowerCase());
    if (!id) return null;
    return this.get(id);
  }

  /**
   * Update a concept
   */
  update(
    id: string,
    updates: {
      definition?: string;
      attributes?: Record<string, unknown>;
      examples?: string[];
      category?: string;
      importance?: number;
      confidence?: number;
    }
  ): SemanticMemoryItem | null {
    const item = this.concepts.get(id);
    if (!item) return null;

    if (updates.definition !== undefined) {
      item.content.definition = updates.definition;
    }
    if (updates.attributes !== undefined) {
      item.content.attributes = { ...item.content.attributes, ...updates.attributes };
    }
    if (updates.examples !== undefined) {
      item.content.examples = [
        ...(item.content.examples || []),
        ...updates.examples
      ];
    }
    if (updates.category !== undefined) {
      // Update category index
      if (item.content.category) {
        this.categoryIndex.get(item.content.category)?.delete(id);
      }
      item.content.category = updates.category;
      this.indexByCategory(id, updates.category);
    }
    if (updates.importance !== undefined) {
      item.importance = Math.max(0, Math.min(1, updates.importance));
    }
    if (updates.confidence !== undefined) {
      item.confidence = Math.max(0, Math.min(1, updates.confidence));
    }

    item.lastAccessedAt = new Date();

    this.emitEvent({
      type: MemoryEventType.ITEM_UPDATED,
      timestamp: new Date(),
      tier: MemoryTier.SEMANTIC,
      itemId: id
    });

    return item;
  }

  /**
   * Create a relationship between two concepts
   */
  relate(
    sourceId: string,
    targetId: string,
    type: SemanticRelationType,
    options: {
      strength?: number;
      bidirectional?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): SemanticRelationship | null {
    const source = this.concepts.get(sourceId);
    const target = this.concepts.get(targetId);
    
    if (!source || !target) return null;

    // Check for existing relationship
    const existing = this.findRelationship(sourceId, targetId, type);
    if (existing) {
      // Strengthen existing relationship
      existing.strength = Math.min(1, existing.strength + (options.strength || 0.1));
      return existing;
    }

    const relationship: SemanticRelationship = {
      id: randomUUID(),
      sourceId,
      targetId,
      type,
      strength: options.strength || 0.5,
      bidirectional: options.bidirectional || false,
      metadata: options.metadata || {}
    };

    this.relationships.set(relationship.id, relationship);
    source.relationships.push(relationship);

    // If bidirectional, add reverse relationship
    if (relationship.bidirectional) {
      const reverseRelationship: SemanticRelationship = {
        ...relationship,
        id: randomUUID(),
        sourceId: targetId,
        targetId: sourceId,
        type: this.getReverseRelationType(type)
      };
      this.relationships.set(reverseRelationship.id, reverseRelationship);
      target.relationships.push(reverseRelationship);
    }

    return relationship;
  }

  /**
   * Find relationship between concepts
   */
  findRelationship(
    sourceId: string,
    targetId: string,
    type?: SemanticRelationType
  ): SemanticRelationship | null {
    for (const rel of this.relationships.values()) {
      if (rel.sourceId === sourceId && rel.targetId === targetId) {
        if (!type || rel.type === type) {
          return rel;
        }
      }
    }
    return null;
  }

  /**
   * Get all relationships for a concept
   */
  getRelationships(conceptId: string, type?: SemanticRelationType): SemanticRelationship[] {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];
    
    if (type) {
      return concept.relationships.filter(r => r.type === type);
    }
    return [...concept.relationships];
  }

  /**
   * Get related concepts
   */
  getRelated(
    conceptId: string,
    options: {
      type?: SemanticRelationType;
      minStrength?: number;
      limit?: number;
    } = {}
  ): Array<{ concept: SemanticMemoryItem; relationship: SemanticRelationship }> {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];

    let relationships = concept.relationships;
    
    if (options.type) {
      relationships = relationships.filter(r => r.type === options.type);
    }
    if (options.minStrength !== undefined) {
      relationships = relationships.filter(r => r.strength >= options.minStrength!);
    }

    // Sort by strength
    relationships.sort((a, b) => b.strength - a.strength);

    if (options.limit !== undefined) {
      relationships = relationships.slice(0, options.limit);
    }

    return relationships
      .map(rel => {
        const related = this.concepts.get(rel.targetId);
        return related ? { concept: related, relationship: rel } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  /**
   * Query semantic memory
   */
  query(query: SemanticQuery): SemanticMemoryItem[] {
    let results: SemanticMemoryItem[] = [];

    // By concept name
    if (query.concept) {
      const byName = this.getByName(query.concept);
      if (byName) results.push(byName);
    } else {
      results = Array.from(this.concepts.values());
    }

    // By category
    if (query.category) {
      results = results.filter(item => item.content.category === query.category);
    }

    // By attributes
    if (query.attributes) {
      results = results.filter(item => {
        for (const [key, value] of Object.entries(query.attributes!)) {
          if (item.content.attributes[key] !== value) return false;
        }
        return true;
      });
    }

    // By confidence
    if (query.minConfidence !== undefined) {
      results = results.filter(item => item.confidence >= query.minConfidence!);
    }

    // By related concept
    if (query.relatedTo) {
      const relatedIds = new Set(
        this.getRelated(query.relatedTo, { type: query.relationType })
          .map(r => r.concept.id)
      );
      results = results.filter(item => relatedIds.has(item.id));
    }

    // Sort by relevance (confidence + importance + access)
    results.sort((a, b) => {
      const scoreA = a.confidence * 0.4 + a.importance * 0.4 + (a.accessCount / 100) * 0.2;
      const scoreB = b.confidence * 0.4 + b.importance * 0.4 + (b.accessCount / 100) * 0.2;
      return scoreB - scoreA;
    });

    // Apply limit
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get concepts by category
   */
  getByCategory(category: string): SemanticMemoryItem[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.concepts.get(id))
      .filter((item): item is SemanticMemoryItem => item !== undefined);
  }

  /**
   * Get consolidation candidates for procedural memory
   */
  getConsolidationCandidates(): SemanticMemoryItem[] {
    return this.getAll().filter(item => {
      // High confidence concepts
      if (item.confidence >= 0.8 && item.importance >= 0.7) return true;
      
      // Frequently accessed with multiple relationships
      if (item.accessCount >= 10 && item.relationships.length >= 3) return true;
      
      // Has procedure-related attributes
      if (item.content.attributes['isProcedure'] || 
          item.content.attributes['hasSteps']) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Remove a concept
   */
  remove(id: string): boolean {
    const item = this.concepts.get(id);
    if (!item) return false;

    // Remove relationships
    for (const rel of item.relationships) {
      this.relationships.delete(rel.id);
    }

    // Remove from indexes
    this.nameIndex.delete(item.content.concept.toLowerCase());
    if (item.content.category) {
      this.categoryIndex.get(item.content.category)?.delete(id);
    }

    this.concepts.delete(id);

    this.emitEvent({
      type: MemoryEventType.ITEM_REMOVED,
      timestamp: new Date(),
      tier: MemoryTier.SEMANTIC,
      itemId: id
    });

    return true;
  }

  /**
   * Get all concepts
   */
  getAll(): SemanticMemoryItem[] {
    return Array.from(this.concepts.values());
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * Calculate retention for a concept
   */
  calculateRetention(item: SemanticMemoryItem): number {
    const now = Date.now();
    const timeSinceReinforcement = now - item.forgettingCurve.lastReinforcement.getTime();
    const daysSince = timeSinceReinforcement / (1000 * 60 * 60 * 24);
    
    // Slower decay for semantic memory (knowledge is more stable)
    const retention = Math.exp(-daysSince / (item.forgettingCurve.strength * 365));
    const reinforcementBonus = Math.min(0.2, item.forgettingCurve.reinforcementCount * 0.02);
    
    return Math.min(1, retention + reinforcementBonus);
  }

  /**
   * Clear all concepts
   */
  clear(): void {
    const ids = Array.from(this.concepts.keys());
    for (const id of ids) {
      this.emitEvent({
        type: MemoryEventType.ITEM_REMOVED,
        timestamp: new Date(),
        tier: MemoryTier.SEMANTIC,
        itemId: id
      });
    }
    this.concepts.clear();
    this.relationships.clear();
    this.categoryIndex.clear();
    this.nameIndex.clear();
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

  /**
   * Get statistics
   */
  getStatistics(): {
    conceptCount: number;
    relationshipCount: number;
    averageConfidence: number;
    categoryDistribution: Record<string, number>;
  } {
    const items = this.getAll();
    const totalConfidence = items.reduce((sum, item) => sum + item.confidence, 0);
    
    const categoryDistribution: Record<string, number> = {};
    for (const [category, ids] of this.categoryIndex) {
      categoryDistribution[category] = ids.size;
    }

    return {
      conceptCount: items.length,
      relationshipCount: this.relationships.size,
      averageConfidence: items.length > 0 ? totalConfidence / items.length : 0,
      categoryDistribution
    };
  }

  // Private methods

  private calculateDecayRate(importance: number): number {
    // Semantic memory decays very slowly
    return Math.max(0.001, Math.min(0.01, 0.005 * (1 - importance)));
  }

  private reconsolidate(item: SemanticMemoryItem): void {
    item.forgettingCurve.lastReinforcement = new Date();
    item.forgettingCurve.reinforcementCount++;
    
    const strengthBoost = 0.02 / Math.log2(item.forgettingCurve.reinforcementCount + 2);
    item.forgettingCurve.strength = Math.min(1, item.forgettingCurve.strength + strengthBoost);
  }

  private indexByCategory(id: string, category: string): void {
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, new Set());
    }
    this.categoryIndex.get(category)!.add(id);
  }

  private inferCategory(concept: string, attributes?: Record<string, unknown>): string | undefined {
    // Simple category inference based on concept name patterns
    const conceptLower = concept.toLowerCase();
    
    if (conceptLower.includes('function') || conceptLower.includes('method')) {
      return 'procedure';
    }
    if (conceptLower.includes('object') || conceptLower.includes('entity')) {
      return 'object';
    }
    if (conceptLower.includes('event') || conceptLower.includes('action')) {
      return 'event';
    }
    if (conceptLower.includes('property') || conceptLower.includes('attribute')) {
      return 'property';
    }
    
    // Infer from attributes
    if (attributes) {
      if (attributes['type']) {
        return String(attributes['type']);
      }
    }
    
    return 'general';
  }

  private getReverseRelationType(type: SemanticRelationType): SemanticRelationType {
    const reverses: Record<SemanticRelationType, SemanticRelationType> = {
      [SemanticRelationType.IS_A]: SemanticRelationType.HAS_A,
      [SemanticRelationType.HAS_A]: SemanticRelationType.IS_A,
      [SemanticRelationType.PART_OF]: SemanticRelationType.HAS_A,
      [SemanticRelationType.RELATED_TO]: SemanticRelationType.RELATED_TO,
      [SemanticRelationType.OPPOSITE_OF]: SemanticRelationType.OPPOSITE_OF,
      [SemanticRelationType.CAUSES]: SemanticRelationType.ENABLES,
      [SemanticRelationType.ENABLES]: SemanticRelationType.CAUSES,
      [SemanticRelationType.PREVENTS]: SemanticRelationType.ENABLES
    };
    return reverses[type] || type;
  }

  private pruneLowConfidence(): void {
    // Remove concepts with lowest confidence
    const items = this.getAll()
      .sort((a, b) => a.confidence - b.confidence);
    
    const toRemove = Math.ceil(this.config.maxConcepts * 0.05);
    for (let i = 0; i < toRemove && i < items.length; i++) {
      if (items[i].confidence < this.config.confidenceThreshold) {
        this.remove(items[i].id);
      }
    }
  }

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

export default SemanticMemory;
