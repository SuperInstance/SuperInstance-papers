/**
 * @fileoverview Episodic Memory - Event/experience memory with temporal and emotional context
 * Stores personal experiences and events with rich contextual information
 */

import { randomUUID } from 'crypto';
import {
  MemoryTier,
  EpisodicMemoryItem,
  EpisodicMemoryConfig,
  EmotionalContext,
  MemorySource,
  TemporalContext,
  EpisodeQuery,
  ForgettingCurveParams,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler
} from './types.js';

/**
 * Default episodic memory configuration
 */
const DEFAULT_CONFIG: EpisodicMemoryConfig = {
  maxCapacity: 10000,
  consolidationThreshold: 0.7,
  emotionalWeighting: true,
  temporalResolution: 1000 // 1 second
};

/**
 * Episodic Memory class
 * Implements event-based memory with temporal and emotional context
 * Features:
 * - Timestamp-based storage and retrieval
 * - Emotional context weighting
 * - Source tracking
 * - Forgetting curve (Ebbinghaus model)
 * - Memory reconsolidation on access
 */
export class EpisodicMemory {
  private items: Map<string, EpisodicMemoryItem> = new Map();
  private temporalIndex: Map<string, string[]> = new Map(); // Date string -> item IDs
  private tagIndex: Map<string, Set<string>> = new Map();
  private config: EpisodicMemoryConfig;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();
  private sequenceNumber: number = 0;

  constructor(config: Partial<EpisodicMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add an episode to episodic memory
   */
  add(
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
    const now = new Date();
    
    // Check capacity
    if (this.items.size >= this.config.maxCapacity) {
      this.pruneForgotten();
    }

    const temporalContext: TemporalContext = {
      startTime: now,
      sequence: this.sequenceNumber++,
      relatedEpisodes: []
    };

    const forgettingCurve: ForgettingCurveParams = {
      strength: this.calculateInitialStrength(options.importance || 0.5, options.emotionalContext),
      decayRate: this.calculateDecayRate(options.importance || 0.5),
      lastReinforcement: now,
      reinforcementCount: 1
    };

    const item: EpisodicMemoryItem = {
      id: randomUUID(),
      content: {
        event,
        details,
        participants: options.participants,
        location: options.location
      },
      importance: options.importance || 0.5,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tier: MemoryTier.EPISODIC,
      tags: options.tags || [],
      metadata: options.metadata || {},
      temporalContext,
      emotionalContext: options.emotionalContext || {
        valence: 0,
        arousal: 0.5,
        dominance: 0.5
      },
      source: options.source || {
        type: 'internal'
      },
      forgettingCurve
    };

    // Store and index
    this.items.set(item.id, item);
    this.indexByTime(item);
    this.indexByTags(item);

    // Find related episodes
    this.findAndLinkRelated(item);

    this.emitEvent({
      type: MemoryEventType.ITEM_ADDED,
      timestamp: now,
      tier: MemoryTier.EPISODIC,
      itemId: item.id,
      data: { event, emotionalContext: item.emotionalContext }
    });

    return item;
  }

  /**
   * Get an episode by ID
   * Triggers reconsolidation (strengthens memory)
   */
  get(id: string): EpisodicMemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    // Update access metadata and reconsolidate
    item.lastAccessedAt = new Date();
    item.accessCount++;
    this.reconsolidate(item);

    this.emitEvent({
      type: MemoryEventType.ITEM_ACCESSED,
      timestamp: new Date(),
      tier: MemoryTier.EPISODIC,
      itemId: id
    });

    return item;
  }

  /**
   * Query episodes by various criteria
   */
  query(query: EpisodeQuery): EpisodicMemoryItem[] {
    let results = Array.from(this.items.values());

    // Time range filter
    if (query.startTime || query.endTime) {
      results = results.filter(item => {
        const itemTime = item.temporalContext.startTime.getTime();
        if (query.startTime && itemTime < query.startTime.getTime()) return false;
        if (query.endTime && itemTime > query.endTime.getTime()) return false;
        return true;
      });
    }

    // Participants filter
    if (query.participants && query.participants.length > 0) {
      results = results.filter(item => 
        item.content.participants?.some(p => query.participants!.includes(p))
      );
    }

    // Location filter
    if (query.location) {
      results = results.filter(item => 
        item.content.location?.includes(query.location!)
      );
    }

    // Emotional context filter
    if (query.emotionalContext) {
      results = results.filter(item => {
        if (query.emotionalContext!.valence !== undefined) {
          if (Math.abs(item.emotionalContext.valence - query.emotionalContext!.valence) > 0.3) return false;
        }
        if (query.emotionalContext!.arousal !== undefined) {
          if (Math.abs(item.emotionalContext.arousal - query.emotionalContext!.arousal) > 0.3) return false;
        }
        return true;
      });
    }

    // Importance filter
    if (query.minImportance !== undefined) {
      results = results.filter(item => item.importance >= query.minImportance!);
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(item => 
        query.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Sort by relevance (importance + recency + retention)
    results.sort((a, b) => {
      const scoreA = a.importance + this.calculateRetention(a) * 0.5;
      const scoreB = b.importance + this.calculateRetention(b) * 0.5;
      return scoreB - scoreA;
    });

    // Apply limit
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get episodes within a time range
   */
  getByTimeRange(start: Date, end: Date): EpisodicMemoryItem[] {
    return this.query({ startTime: start, endTime: end });
  }

  /**
   * Get recent episodes
   */
  getRecent(count: number = 10): EpisodicMemoryItem[] {
    const items = Array.from(this.items.values());
    return items
      .sort((a, b) => b.temporalContext.startTime.getTime() - a.temporalContext.startTime.getTime())
      .slice(0, count);
  }

  /**
   * Get episodes by tag
   */
  getByTag(tag: string): EpisodicMemoryItem[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((item): item is EpisodicMemoryItem => item !== undefined);
  }

  /**
   * Get related episodes for a given episode
   */
  getRelated(id: string): EpisodicMemoryItem[] {
    const item = this.items.get(id);
    if (!item) return [];
    
    return item.temporalContext.relatedEpisodes
      .map(relatedId => this.items.get(relatedId))
      .filter((related): related is EpisodicMemoryItem => related !== undefined);
  }

  /**
   * Get episodes that are candidates for consolidation to semantic memory
   */
  getConsolidationCandidates(): EpisodicMemoryItem[] {
    return this.getAll().filter(item => {
      // High importance with good retention
      if (item.importance >= this.config.consolidationThreshold && 
          this.calculateRetention(item) >= 0.6) {
        return true;
      }
      
      // Frequently accessed
      if (item.accessCount >= 5) return true;
      
      // High emotional arousal (memorable events)
      if (this.config.emotionalWeighting && 
          item.emotionalContext.arousal >= 0.7) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Update an episode's emotional context
   */
  updateEmotionalContext(id: string, context: Partial<EmotionalContext>): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    item.emotionalContext = { ...item.emotionalContext, ...context };
    item.lastAccessedAt = new Date();
    
    return true;
  }

  /**
   * Calculate current retention strength based on forgetting curve
   */
  calculateRetention(item: EpisodicMemoryItem): number {
    const now = Date.now();
    const timeSinceReinforcement = now - item.forgettingCurve.lastReinforcement.getTime();
    const hoursSince = timeSinceReinforcement / (1000 * 60 * 60);
    
    // Ebbinghaus forgetting curve: R = e^(-t/S)
    // where R is retention, t is time, S is strength
    const retention = Math.exp(-hoursSince / (item.forgettingCurve.strength * 100));
    
    // Apply reinforcement bonus
    const reinforcementBonus = Math.min(0.3, item.forgettingCurve.reinforcementCount * 0.05);
    
    return Math.min(1, retention + reinforcementBonus);
  }

  /**
   * Get all episodes
   */
  getAll(): EpisodicMemoryItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Remove an episode
   */
  remove(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    // Remove from indexes
    this.removeFromTimeIndex(item);
    this.removeFromTagIndex(item);
    
    // Remove from related episodes
    for (const relatedId of item.temporalContext.relatedEpisodes) {
      const related = this.items.get(relatedId);
      if (related) {
        related.temporalContext.relatedEpisodes = 
          related.temporalContext.relatedEpisodes.filter(rid => rid !== id);
      }
    }

    this.items.delete(id);

    this.emitEvent({
      type: MemoryEventType.ITEM_REMOVED,
      timestamp: new Date(),
      tier: MemoryTier.EPISODIC,
      itemId: id
    });

    return true;
  }

  /**
   * Process forgetting - remove items below retention threshold
   */
  processForgetting(threshold: number = 0.1): number {
    const toRemove: string[] = [];
    
    for (const [id, item] of this.items) {
      const retention = this.calculateRetention(item);
      if (retention < threshold) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.emitEvent({
        type: MemoryEventType.FORGETTING_TRIGGERED,
        timestamp: new Date(),
        tier: MemoryTier.EPISODIC,
        itemId: id,
        data: { retention: this.calculateRetention(this.items.get(id)!) }
      });
      this.remove(id);
    }
    
    return toRemove.length;
  }

  /**
   * Clear all episodes
   */
  clear(): void {
    const ids = Array.from(this.items.keys());
    for (const id of ids) {
      this.emitEvent({
        type: MemoryEventType.ITEM_REMOVED,
        timestamp: new Date(),
        tier: MemoryTier.EPISODIC,
        itemId: id
      });
    }
    this.items.clear();
    this.temporalIndex.clear();
    this.tagIndex.clear();
    this.sequenceNumber = 0;
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
    itemCount: number;
    averageAge: number;
    averageImportance: number;
    averageRetention: number;
  } {
    const items = this.getAll();
    const now = Date.now();
    
    const totalAge = items.reduce((sum, item) => 
      sum + (now - item.createdAt.getTime()), 0);
    const totalImportance = items.reduce((sum, item) => sum + item.importance, 0);
    const totalRetention = items.reduce((sum, item) => 
      sum + this.calculateRetention(item), 0);
    
    return {
      itemCount: items.length,
      averageAge: items.length > 0 ? totalAge / items.length : 0,
      averageImportance: items.length > 0 ? totalImportance / items.length : 0,
      averageRetention: items.length > 0 ? totalRetention / items.length : 0
    };
  }

  // Private methods

  private calculateInitialStrength(importance: number, emotionalContext?: EmotionalContext): number {
    let strength = 0.5 + (importance * 0.3);
    
    if (emotionalContext && this.config.emotionalWeighting) {
      // High arousal increases memory strength
      strength += emotionalContext.arousal * 0.2;
      // Extreme valence (positive or negative) increases strength
      strength += Math.abs(emotionalContext.valence) * 0.1;
    }
    
    return Math.min(1, strength);
  }

  private calculateDecayRate(importance: number): number {
    // Higher importance = slower decay
    return Math.max(0.01, Math.min(0.1, 0.05 * (1 - importance)));
  }

  private reconsolidate(item: EpisodicMemoryItem): void {
    // Strengthen memory on access
    item.forgettingCurve.lastReinforcement = new Date();
    item.forgettingCurve.reinforcementCount++;
    
    // Gradually increase strength with repeated access
    const strengthBoost = 0.05 / Math.log2(item.forgettingCurve.reinforcementCount + 2);
    item.forgettingCurve.strength = Math.min(1, item.forgettingCurve.strength + strengthBoost);
  }

  private indexByTime(item: EpisodicMemoryItem): void {
    const dateKey = item.temporalContext.startTime.toISOString().split('T')[0];
    if (!this.temporalIndex.has(dateKey)) {
      this.temporalIndex.set(dateKey, []);
    }
    this.temporalIndex.get(dateKey)!.push(item.id);
  }

  private indexByTags(item: EpisodicMemoryItem): void {
    for (const tag of item.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(item.id);
    }
  }

  private removeFromTimeIndex(item: EpisodicMemoryItem): void {
    const dateKey = item.temporalContext.startTime.toISOString().split('T')[0];
    const ids = this.temporalIndex.get(dateKey);
    if (ids) {
      const index = ids.indexOf(item.id);
      if (index !== -1) {
        ids.splice(index, 1);
        if (ids.length === 0) {
          this.temporalIndex.delete(dateKey);
        }
      }
    }
  }

  private removeFromTagIndex(item: EpisodicMemoryItem): void {
    for (const tag of item.tags) {
      this.tagIndex.get(tag)?.delete(item.id);
      if (this.tagIndex.get(tag)?.size === 0) {
        this.tagIndex.delete(tag);
      }
    }
  }

  private findAndLinkRelated(item: EpisodicMemoryItem): void {
    // Find episodes with similar content, tags, or temporal proximity
    const candidates = this.getAll().filter(other => {
      if (other.id === item.id) return false;
      
      // Check tag overlap
      const tagOverlap = item.tags.filter(t => other.tags.includes(t)).length;
      if (tagOverlap >= 2) return true;
      
      // Check temporal proximity (within 1 hour)
      const timeDiff = Math.abs(
        item.temporalContext.startTime.getTime() - 
        other.temporalContext.startTime.getTime()
      );
      if (timeDiff < 3600000) return true;
      
      // Check same location
      if (item.content.location && item.content.location === other.content.location) {
        return true;
      }
      
      // Check participant overlap
      if (item.content.participants && other.content.participants) {
        const participantOverlap = item.content.participants.filter(
          p => other.content.participants?.includes(p)
        ).length;
        if (participantOverlap > 0) return true;
      }
      
      return false;
    });
    
    // Link to top 5 most related
    const relatedIds = candidates
      .sort((a, b) => {
        const scoreA = this.calculateRelatedness(item, a);
        const scoreB = this.calculateRelatedness(item, b);
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(c => c.id);
    
    item.temporalContext.relatedEpisodes = relatedIds;
    
    // Add reverse links
    for (const relatedId of relatedIds) {
      const related = this.items.get(relatedId);
      if (related && !related.temporalContext.relatedEpisodes.includes(item.id)) {
        related.temporalContext.relatedEpisodes.push(item.id);
      }
    }
  }

  private calculateRelatedness(item1: EpisodicMemoryItem, item2: EpisodicMemoryItem): number {
    let score = 0;
    
    // Tag overlap
    const tagOverlap = item1.tags.filter(t => item2.tags.includes(t)).length;
    score += tagOverlap * 0.2;
    
    // Temporal proximity
    const timeDiff = Math.abs(
      item1.temporalContext.startTime.getTime() - 
      item2.temporalContext.startTime.getTime()
    );
    if (timeDiff < 3600000) score += 0.3;
    else if (timeDiff < 86400000) score += 0.1;
    
    // Same location
    if (item1.content.location && item1.content.location === item2.content.location) {
      score += 0.2;
    }
    
    // Emotional similarity
    const emotionalDiff = Math.abs(item1.emotionalContext.valence - item2.emotionalContext.valence) +
                          Math.abs(item1.emotionalContext.arousal - item2.emotionalContext.arousal);
    score += Math.max(0, 0.3 - emotionalDiff * 0.15);
    
    return score;
  }

  private pruneForgotten(): void {
    // Remove items with lowest retention until under capacity
    const items = this.getAll()
      .map(item => ({ id: item.id, retention: this.calculateRetention(item) }))
      .sort((a, b) => a.retention - b.retention);
    
    const toRemove = Math.ceil(this.config.maxCapacity * 0.1); // Remove 10%
    for (let i = 0; i < toRemove && i < items.length; i++) {
      this.remove(items[i].id);
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

export default EpisodicMemory;
