/**
 * @fileoverview Working Memory - Short-term high-speed memory with limited capacity
 * Based on Miller's Law: 7±2 items capacity
 */

import { randomUUID } from 'crypto';
import {
  MemoryTier,
  WorkingMemoryItem,
  WorkingMemoryConfig,
  WorkingMemoryState,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler
} from './types.js';

/**
 * Default working memory configuration
 */
const DEFAULT_CONFIG: WorkingMemoryConfig = {
  capacity: 7, // Miller's law: 7±2
  decayInterval: 5000, // 5 seconds
  attentionThreshold: 0.1,
  autoConsolidate: true
};

/**
 * Working Memory class
 * Implements short-term, high-speed memory with limited capacity
 * Features:
 * - Fast access (O(1) for retrieval)
 * - Limited capacity (7±2 items)
 * - Attention-based decay
 * - Automatic consolidation of high-importance items
 */
export class WorkingMemory {
  private state: WorkingMemoryState;
  private config: WorkingMemoryConfig;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();
  private decayTimer?: ReturnType<typeof setInterval>;
  private sequenceNumber: number = 0;

  constructor(config: Partial<WorkingMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      items: new Map(),
      totalAttentionBudget: 1.0,
      currentFocus: null,
      context: {}
    };
  }

  /**
   * Start the working memory system
   */
  start(): void {
    if (this.decayTimer) return;
    
    this.decayTimer = setInterval(() => {
      this.processDecay();
    }, this.config.decayInterval);
  }

  /**
   * Stop the working memory system
   */
  stop(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = undefined;
    }
  }

  /**
   * Add an item to working memory
   * If capacity is exceeded, removes least important/attended item
   */
  add(
    content: unknown,
    importance: number = 0.5,
    tags: string[] = [],
    metadata: Record<string, unknown> = {}
  ): WorkingMemoryItem {
    const now = new Date();
    
    // Check capacity and evict if necessary
    if (this.state.items.size >= this.config.capacity) {
      this.evictLeastValuable();
    }

    // Find available slot
    const usedSlots = new Set(Array.from(this.state.items.values()).map(item => item.slot));
    let slot = 1;
    while (usedSlots.has(slot)) slot++;

    const item: WorkingMemoryItem = {
      id: randomUUID(),
      content,
      importance: Math.max(0, Math.min(1, importance)),
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tier: MemoryTier.WORKING,
      tags,
      metadata,
      slot,
      attentionWeight: this.calculateInitialAttention(importance),
      decayRate: this.calculateDecayRate(importance),
      relatedItems: []
    };

    this.state.items.set(item.id, item);
    this.emitEvent({
      type: MemoryEventType.ITEM_ADDED,
      timestamp: now,
      tier: MemoryTier.WORKING,
      itemId: item.id,
      data: { slot, importance }
    });

    return item;
  }

  /**
   * Get an item from working memory by ID
   * Updates access time and count
   */
  get(id: string): WorkingMemoryItem | null {
    const item = this.state.items.get(id);
    if (!item) return null;

    // Update access metadata
    item.lastAccessedAt = new Date();
    item.accessCount++;

    // Reconsolidate - boost attention
    this.boostAttention(item);

    this.emitEvent({
      type: MemoryEventType.ITEM_ACCESSED,
      timestamp: new Date(),
      tier: MemoryTier.WORKING,
      itemId: id
    });

    return item;
  }

  /**
   * Get all items in working memory
   */
  getAll(): WorkingMemoryItem[] {
    return Array.from(this.state.items.values());
  }

  /**
   * Get current focus item
   */
  getCurrentFocus(): WorkingMemoryItem | null {
    if (!this.state.currentFocus) return null;
    return this.state.items.get(this.state.currentFocus) || null;
  }

  /**
   * Set focus to a specific item
   */
  setFocus(id: string): boolean {
    if (!this.state.items.has(id)) return false;
    
    // Redistribute attention
    this.redistributeAttention(id);
    this.state.currentFocus = id;
    
    return true;
  }

  /**
   * Remove an item from working memory
   */
  remove(id: string): boolean {
    const item = this.state.items.get(id);
    if (!item) return false;

    this.state.items.delete(id);
    
    if (this.state.currentFocus === id) {
      this.state.currentFocus = null;
    }

    this.emitEvent({
      type: MemoryEventType.ITEM_REMOVED,
      timestamp: new Date(),
      tier: MemoryTier.WORKING,
      itemId: id
    });

    return true;
  }

  /**
   * Update an item's content or metadata
   */
  update(
    id: string,
    updates: Partial<Pick<WorkingMemoryItem, 'content' | 'importance' | 'tags' | 'metadata'>>
  ): WorkingMemoryItem | null {
    const item = this.state.items.get(id);
    if (!item) return null;

    if (updates.content !== undefined) item.content = updates.content;
    if (updates.importance !== undefined) {
      item.importance = Math.max(0, Math.min(1, updates.importance));
      item.decayRate = this.calculateDecayRate(item.importance);
    }
    if (updates.tags !== undefined) item.tags = updates.tags;
    if (updates.metadata !== undefined) {
      item.metadata = { ...item.metadata, ...updates.metadata };
    }

    item.lastAccessedAt = new Date();
    item.accessCount++;

    this.emitEvent({
      type: MemoryEventType.ITEM_UPDATED,
      timestamp: new Date(),
      tier: MemoryTier.WORKING,
      itemId: id
    });

    return item;
  }

  /**
   * Link two items as related
   */
  relateItems(id1: string, id2: string): boolean {
    const item1 = this.state.items.get(id1);
    const item2 = this.state.items.get(id2);
    
    if (!item1 || !item2) return false;
    
    if (!item1.relatedItems.includes(id2)) {
      item1.relatedItems.push(id2);
    }
    if (!item2.relatedItems.includes(id1)) {
      item2.relatedItems.push(id1);
    }
    
    return true;
  }

  /**
   * Get items that should be consolidated to episodic memory
   */
  getConsolidationCandidates(): WorkingMemoryItem[] {
    if (!this.config.autoConsolidate) return [];
    
    return this.getAll().filter(item => {
      // High importance items
      if (item.importance >= 0.7) return true;
      
      // Frequently accessed items
      if (item.accessCount >= 3) return true;
      
      // Items with emotional weight in metadata
      if (item.metadata.emotionalWeight && 
          (item.metadata.emotionalWeight as number) >= 0.6) return true;
      
      return false;
    });
  }

  /**
   * Get current capacity utilization
   */
  getUtilization(): number {
    return this.state.items.size / this.config.capacity;
  }

  /**
   * Get working memory state
   */
  getState(): WorkingMemoryState {
    return {
      ...this.state,
      items: new Map(this.state.items)
    };
  }

  /**
   * Set context for working memory
   */
  setContext(context: Record<string, unknown>): void {
    this.state.context = { ...this.state.context, ...context };
  }

  /**
   * Clear all items from working memory
   */
  clear(): void {
    const itemIds = Array.from(this.state.items.keys());
    for (const id of itemIds) {
      this.emitEvent({
        type: MemoryEventType.ITEM_REMOVED,
        timestamp: new Date(),
        tier: MemoryTier.WORKING,
        itemId: id
      });
    }
    this.state.items.clear();
    this.state.currentFocus = null;
  }

  /**
   * Subscribe to memory events
   */
  subscribe(eventType: MemoryEventType, handler: MemoryEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  // Private methods

  /**
   * Calculate initial attention weight based on importance
   */
  private calculateInitialAttention(importance: number): number {
    // Higher importance = higher initial attention
    return Math.max(0.2, Math.min(0.8, importance));
  }

  /**
   * Calculate decay rate based on importance
   */
  private calculateDecayRate(importance: number): number {
    // Higher importance = slower decay
    return Math.max(0.01, Math.min(0.2, 0.1 * (1 - importance)));
  }

  /**
   * Process decay for all items
   */
  private processDecay(): void {
    const itemsToRemove: string[] = [];
    
    for (const [id, item] of this.state.items) {
      // Apply decay
      item.attentionWeight -= item.decayRate;
      
      // Check if item should be removed
      if (item.attentionWeight < this.config.attentionThreshold) {
        itemsToRemove.push(id);
      }
    }
    
    // Remove decayed items
    for (const id of itemsToRemove) {
      this.emitEvent({
        type: MemoryEventType.FORGETTING_TRIGGERED,
        timestamp: new Date(),
        tier: MemoryTier.WORKING,
        itemId: id,
        data: { reason: 'attention_decay' }
      });
      this.state.items.delete(id);
    }
  }

  /**
   * Boost attention for an accessed item (reconsolidation)
   */
  private boostAttention(item: WorkingMemoryItem): void {
    // Access boosts attention, but with diminishing returns
    const boostAmount = 0.1 / Math.log2(item.accessCount + 2);
    item.attentionWeight = Math.min(1.0, item.attentionWeight + boostAmount);
  }

  /**
   * Redistribute attention when focus changes
   */
  private redistributeAttention(focusId: string): void {
    const focusItem = this.state.items.get(focusId);
    if (!focusItem) return;
    
    // Give focused item more attention
    const focusBoost = 0.3;
    focusItem.attentionWeight = Math.min(1.0, focusItem.attentionWeight + focusBoost);
    
    // Reduce attention of other items
    const reduction = focusBoost / (this.state.items.size - 1 || 1);
    for (const [id, item] of this.state.items) {
      if (id !== focusId) {
        item.attentionWeight = Math.max(0.1, item.attentionWeight - reduction);
      }
    }
  }

  /**
   * Evict the least valuable item when capacity is exceeded
   */
  private evictLeastValuable(): void {
    if (this.state.items.size === 0) return;
    
    let lowestScore = Infinity;
    let lowestId: string | null = null;
    
    for (const [id, item] of this.state.items) {
      // Score combines importance, attention, and access recency
      const recencyBonus = (Date.now() - item.lastAccessedAt.getTime()) < 10000 ? 0.2 : 0;
      const score = (item.importance * 0.4) + 
                    (item.attentionWeight * 0.4) + 
                    (Math.min(item.accessCount / 10, 0.2)) + 
                    recencyBonus;
      
      if (score < lowestScore) {
        lowestScore = score;
        lowestId = id;
      }
    }
    
    if (lowestId) {
      this.emitEvent({
        type: MemoryEventType.FORGETTING_TRIGGERED,
        timestamp: new Date(),
        tier: MemoryTier.WORKING,
        itemId: lowestId,
        data: { reason: 'capacity_eviction', score: lowestScore }
      });
      this.state.items.delete(lowestId);
      
      if (this.state.currentFocus === lowestId) {
        this.state.currentFocus = null;
      }
    }
  }

  /**
   * Emit a memory event
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

  /**
   * Get statistics about working memory
   */
  getStatistics(): {
    itemCount: number;
    capacity: number;
    utilization: number;
    averageAge: number;
    averageAccessCount: number;
  } {
    const items = this.getAll();
    const now = Date.now();
    
    const totalAge = items.reduce((sum, item) => 
      sum + (now - item.createdAt.getTime()), 0);
    const totalAccess = items.reduce((sum, item) => 
      sum + item.accessCount, 0);
    
    return {
      itemCount: items.length,
      capacity: this.config.capacity,
      utilization: this.getUtilization(),
      averageAge: items.length > 0 ? totalAge / items.length : 0,
      averageAccessCount: items.length > 0 ? totalAccess / items.length : 0
    };
  }
}

export default WorkingMemory;
