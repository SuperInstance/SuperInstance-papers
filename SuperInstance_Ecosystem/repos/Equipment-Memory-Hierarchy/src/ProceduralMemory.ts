/**
 * @fileoverview Procedural Memory - Skills and procedures memory with automatic execution
 * Stores learned skills, patterns, and procedures with trigger conditions
 */

import { randomUUID } from 'crypto';
import {
  MemoryTier,
  ProceduralMemoryItem,
  ProceduralMemoryConfig,
  ProceduralStep,
  ProceduralTrigger,
  SkillStatus,
  SkillExecutionResult,
  ForgettingCurveParams,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler
} from './types.js';

/**
 * Default procedural memory configuration
 */
const DEFAULT_CONFIG: ProceduralMemoryConfig = {
  maxSkills: 1000,
  autoExecution: true,
  learningThreshold: 3, // Episodes needed to learn
  expertiseThreshold: 50, // Executions for expertise
  forgettingThreshold: 0.2
};

/**
 * Procedural Memory class
 * Implements skill and procedure storage with automatic execution triggers
 * Features:
 * - Skill storage with step-by-step procedures
 * - Trigger conditions for automatic execution
 * - Skill status progression (learning -> expert -> automatic)
 * - Success rate tracking
 * - Forgetting curve for unused skills
 */
export class ProceduralMemory {
  private skills: Map<string, ProceduralMemoryItem> = new Map();
  private triggerIndex: Map<string, Set<string>> = new Map(); // Trigger condition -> skill IDs
  private nameIndex: Map<string, string> = new Map(); // skill name -> ID
  private config: ProceduralMemoryConfig;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();
  private automaticExecutionCount: number = 0;

  constructor(config: Partial<ProceduralMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a new skill to procedural memory
   */
  add(
    skill: string,
    steps: ProceduralStep[],
    options: {
      description?: string;
      parameters?: Record<string, unknown>;
      triggers?: Omit<ProceduralTrigger, 'id' | 'lastTriggered' | 'triggerCount'>[];
      outcomes?: Record<string, unknown>;
      importance?: number;
      sourceEpisodes?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): ProceduralMemoryItem {
    // Check if skill already exists
    const existingId = this.nameIndex.get(skill.toLowerCase());
    if (existingId) {
      return this.update(existingId, { steps })!;
    }

    const now = new Date();
    
    // Check capacity
    if (this.skills.size >= this.config.maxSkills) {
      this.pruneUnused();
    }

    const forgettingCurve: ForgettingCurveParams = {
      strength: 0.4, // Skills start with moderate strength
      decayRate: 0.02,
      lastReinforcement: now,
      reinforcementCount: 1
    };

    // Create triggers with IDs
    const triggers: ProceduralTrigger[] = (options.triggers || []).map(t => ({
      ...t,
      id: randomUUID(),
      lastTriggered: undefined,
      triggerCount: 0
    }));

    const item: ProceduralMemoryItem = {
      id: randomUUID(),
      content: {
        skill,
        description: options.description || '',
        steps,
        parameters: options.parameters || {},
        outcomes: options.outcomes || {}
      },
      importance: options.importance || 0.5,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tier: MemoryTier.PROCEDURAL,
      tags: options.tags || [],
      metadata: options.metadata || {},
      status: SkillStatus.LEARNING,
      triggers,
      executionCount: 0,
      successRate: 0,
      averageExecutionTime: 0,
      lastExecutedAt: undefined,
      sourceEpisodes: options.sourceEpisodes || [],
      forgettingCurve
    };

    // Store and index
    this.skills.set(item.id, item);
    this.nameIndex.set(skill.toLowerCase(), item.id);
    
    // Index triggers
    for (const trigger of triggers) {
      this.indexTrigger(trigger.condition, item.id);
    }

    this.emitEvent({
      type: MemoryEventType.ITEM_ADDED,
      timestamp: now,
      tier: MemoryTier.PROCEDURAL,
      itemId: item.id,
      data: { skill, stepCount: steps.length }
    });

    return item;
  }

  /**
   * Get a skill by ID
   */
  get(id: string): ProceduralMemoryItem | null {
    const item = this.skills.get(id);
    if (!item) return null;

    item.lastAccessedAt = new Date();
    item.accessCount++;

    this.emitEvent({
      type: MemoryEventType.ITEM_ACCESSED,
      timestamp: new Date(),
      tier: MemoryTier.PROCEDURAL,
      itemId: id
    });

    return item;
  }

  /**
   * Get a skill by name
   */
  getByName(skillName: string): ProceduralMemoryItem | null {
    const id = this.nameIndex.get(skillName.toLowerCase());
    if (!id) return null;
    return this.get(id);
  }

  /**
   * Update a skill
   */
  update(
    id: string,
    updates: {
      description?: string;
      steps?: ProceduralStep[];
      parameters?: Record<string, unknown>;
      outcomes?: Record<string, unknown>;
      importance?: number;
    }
  ): ProceduralMemoryItem | null {
    const item = this.skills.get(id);
    if (!item) return null;

    if (updates.description !== undefined) {
      item.content.description = updates.description;
    }
    if (updates.steps !== undefined) {
      item.content.steps = updates.steps;
    }
    if (updates.parameters !== undefined) {
      item.content.parameters = { ...item.content.parameters, ...updates.parameters };
    }
    if (updates.outcomes !== undefined) {
      item.content.outcomes = { ...item.content.outcomes, ...updates.outcomes };
    }
    if (updates.importance !== undefined) {
      item.importance = Math.max(0, Math.min(1, updates.importance));
    }

    item.lastAccessedAt = new Date();

    this.emitEvent({
      type: MemoryEventType.ITEM_UPDATED,
      timestamp: new Date(),
      tier: MemoryTier.PROCEDURAL,
      itemId: id
    });

    return item;
  }

  /**
   * Add a trigger to a skill
   */
  addTrigger(
    skillId: string,
    condition: string,
    priority: number = 0.5,
    cooldown: number = 60000
  ): ProceduralTrigger | null {
    const item = this.skills.get(skillId);
    if (!item) return null;

    const trigger: ProceduralTrigger = {
      id: randomUUID(),
      condition,
      priority,
      cooldown,
      lastTriggered: undefined,
      triggerCount: 0
    };

    item.triggers.push(trigger);
    this.indexTrigger(condition, skillId);

    return trigger;
  }

  /**
   * Execute a skill
   */
  async execute(
    id: string,
    context: Record<string, unknown>,
    executor: (step: ProceduralStep, context: Record<string, unknown>) => Promise<unknown>
  ): Promise<SkillExecutionResult> {
    const item = this.skills.get(id);
    if (!item) {
      return {
        skillId: id,
        success: false,
        executionTime: 0,
        error: 'Skill not found',
        confidence: 0
      };
    }

    const startTime = Date.now();
    let success = true;
    let output: unknown;
    let error: string | undefined;

    try {
      // Execute steps in order
      for (const step of item.content.steps) {
        // Check preconditions
        if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
          // Try alternatives
          if (step.alternatives && step.alternatives.length > 0) {
            let alternativeSuccess = false;
            for (const alt of step.alternatives) {
              try {
                await executor({ ...step, action: alt }, context);
                alternativeSuccess = true;
                break;
              } catch {
                continue;
              }
            }
            if (!alternativeSuccess) {
              throw new Error(`Preconditions not met for step ${step.order} and alternatives failed`);
            }
          } else {
            throw new Error(`Preconditions not met for step ${step.order}`);
          }
        } else {
          output = await executor(step, context);
        }
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
    }

    const executionTime = Date.now() - startTime;

    // Update skill statistics
    this.updateExecutionStats(item, success, executionTime);

    const result: SkillExecutionResult = {
      skillId: id,
      success,
      executionTime,
      output,
      error,
      confidence: this.calculateConfidence(item)
    };

    this.emitEvent({
      type: MemoryEventType.SKILL_EXECUTED,
      timestamp: new Date(),
      tier: MemoryTier.PROCEDURAL,
      itemId: id,
      data: { success, executionTime }
    });

    return result;
  }

  /**
   * Check triggers and return skills that should be automatically executed
   */
  checkTriggers(
    context: Record<string, unknown>
  ): Array<{ skill: ProceduralMemoryItem; trigger: ProceduralTrigger }> {
    if (!this.config.autoExecution) return [];

    const results: Array<{ skill: ProceduralMemoryItem; trigger: ProceduralTrigger }> = [];

    for (const [condition, skillIds] of this.triggerIndex) {
      if (this.evaluateCondition(condition, context)) {
        for (const skillId of skillIds) {
          const skill = this.skills.get(skillId);
          if (!skill || skill.status !== SkillStatus.AUTOMATIC) continue;

          // Find the matching trigger
          const trigger = skill.triggers.find(t => t.condition === condition);
          if (!trigger) continue;

          // Check cooldown
          if (trigger.lastTriggered) {
            const timeSinceLast = Date.now() - trigger.lastTriggered.getTime();
            if (timeSinceLast < trigger.cooldown) continue;
          }

          results.push({ skill, trigger });
        }
      }
    }

    // Sort by trigger priority
    results.sort((a, b) => b.trigger.priority - a.trigger.priority);

    return results;
  }

  /**
   * Mark a trigger as fired
   */
  markTriggerFired(skillId: string, triggerId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    const trigger = skill.triggers.find(t => t.id === triggerId);
    if (!trigger) return;

    trigger.lastTriggered = new Date();
    trigger.triggerCount++;

    this.automaticExecutionCount++;

    this.emitEvent({
      type: MemoryEventType.TRIGGER_ACTIVATED,
      timestamp: new Date(),
      tier: MemoryTier.PROCEDURAL,
      itemId: skillId,
      data: { triggerId, triggerCount: trigger.triggerCount }
    });
  }

  /**
   * Get skills by status
   */
  getByStatus(status: SkillStatus): ProceduralMemoryItem[] {
    return this.getAll().filter(item => item.status === status);
  }

  /**
   * Get all skills
   */
  getAll(): ProceduralMemoryItem[] {
    return Array.from(this.skills.values());
  }

  /**
   * Remove a skill
   */
  remove(id: string): boolean {
    const item = this.skills.get(id);
    if (!item) return false;

    // Remove from indexes
    this.nameIndex.delete(item.content.skill.toLowerCase());
    for (const trigger of item.triggers) {
      this.triggerIndex.get(trigger.condition)?.delete(id);
    }

    this.skills.delete(id);

    this.emitEvent({
      type: MemoryEventType.ITEM_REMOVED,
      timestamp: new Date(),
      tier: MemoryTier.PROCEDURAL,
      itemId: id
    });

    return true;
  }

  /**
   * Calculate retention for a skill
   */
  calculateRetention(item: ProceduralMemoryItem): number {
    const now = Date.now();
    const timeSinceExecution = item.lastExecutedAt 
      ? now - item.lastExecutedAt.getTime()
      : now - item.createdAt.getTime();
    const daysSince = timeSinceExecution / (1000 * 60 * 60 * 24);
    
    // Skills decay based on disuse
    const retention = Math.exp(-daysSince / (item.forgettingCurve.strength * 180));
    const executionBonus = Math.min(0.3, item.executionCount * 0.01);
    
    return Math.min(1, retention + executionBonus);
  }

  /**
   * Process forgetting for unused skills
   */
  processForgetting(): number {
    const toRemove: string[] = [];
    
    for (const [id, item] of this.skills) {
      const retention = this.calculateRetention(item);
      if (retention < this.config.forgettingThreshold && item.status !== SkillStatus.EXPERT) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.emitEvent({
        type: MemoryEventType.FORGETTING_TRIGGERED,
        timestamp: new Date(),
        tier: MemoryTier.PROCEDURAL,
        itemId: id,
        data: { retention: this.calculateRetention(this.skills.get(id)!) }
      });
      this.remove(id);
    }
    
    return toRemove.length;
  }

  /**
   * Clear all skills
   */
  clear(): void {
    const ids = Array.from(this.skills.keys());
    for (const id of ids) {
      this.emitEvent({
        type: MemoryEventType.ITEM_REMOVED,
        timestamp: new Date(),
        tier: MemoryTier.PROCEDURAL,
        itemId: id
      });
    }
    this.skills.clear();
    this.triggerIndex.clear();
    this.nameIndex.clear();
    this.automaticExecutionCount = 0;
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
    skillCount: number;
    averageSuccessRate: number;
    expertLevelCount: number;
    automaticExecutionCount: number;
  } {
    const items = this.getAll();
    const totalSuccessRate = items.reduce((sum, item) => sum + item.successRate, 0);
    const expertCount = items.filter(
      item => item.status === SkillStatus.EXPERT || item.status === SkillStatus.AUTOMATIC
    ).length;

    return {
      skillCount: items.length,
      averageSuccessRate: items.length > 0 ? totalSuccessRate / items.length : 0,
      expertLevelCount: expertCount,
      automaticExecutionCount: this.automaticExecutionCount
    };
  }

  // Private methods

  private updateExecutionStats(item: ProceduralMemoryItem, success: boolean, executionTime: number): void {
    item.executionCount++;
    item.lastExecutedAt = new Date();
    
    // Update success rate with exponential moving average
    const alpha = 0.1;
    item.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * item.successRate;
    
    // Update average execution time
    item.averageExecutionTime = alpha * executionTime + (1 - alpha) * item.averageExecutionTime;
    
    // Update forgetting curve
    item.forgettingCurve.lastReinforcement = new Date();
    item.forgettingCurve.reinforcementCount++;
    const strengthBoost = 0.05 / Math.log2(item.forgettingCurve.reinforcementCount + 2);
    item.forgettingCurve.strength = Math.min(1, item.forgettingCurve.strength + strengthBoost);
    
    // Update skill status
    this.updateSkillStatus(item);
  }

  private updateSkillStatus(item: ProceduralMemoryItem): void {
    const { status, executionCount, successRate, content } = item;
    
    // Progress through skill levels
    if (status === SkillStatus.LEARNING && executionCount >= this.config.learningThreshold) {
      item.status = SkillStatus.PRACTICING;
    }
    
    if (status === SkillStatus.PRACTICING && executionCount >= this.config.expertThreshold / 2) {
      if (successRate >= 0.7) {
        item.status = SkillStatus.COMPETENT;
      }
    }
    
    if (status === SkillStatus.COMPETENT && executionCount >= this.config.expertThreshold) {
      if (successRate >= 0.85) {
        item.status = SkillStatus.EXPERT;
      }
    }
    
    if (status === SkillStatus.EXPERT && executionCount >= this.config.expertThreshold * 2) {
      if (successRate >= 0.95 && item.triggers.length > 0) {
        item.status = SkillStatus.AUTOMATIC;
      }
    }
  }

  private calculateConfidence(item: ProceduralMemoryItem): number {
    // Confidence based on success rate and experience
    const experienceFactor = Math.min(1, item.executionCount / this.config.expertThreshold);
    const retention = this.calculateRetention(item);
    
    return item.successRate * 0.5 + experienceFactor * 0.3 + retention * 0.2;
  }

  private indexTrigger(condition: string, skillId: string): void {
    if (!this.triggerIndex.has(condition)) {
      this.triggerIndex.set(condition, new Set());
    }
    this.triggerIndex.get(condition)!.add(skillId);
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple condition evaluation
    // Supports: "context.path == value", "context.path > value", etc.
    try {
      // Handle simple equality checks
      const eqMatch = condition.match(/^(\w+(?:\.\w+)*)\s*==\s*(.+)$/);
      if (eqMatch) {
        const [, path, value] = eqMatch;
        const contextValue = this.getNestedValue(context, path);
        const compareValue = value.trim().replace(/^["']|["']$/g, '');
        return String(contextValue) === compareValue;
      }
      
      // Handle existence checks
      const existsMatch = condition.match(/^exists\((\w+(?:\.\w+)*)\)$/);
      if (existsMatch) {
        const [, path] = existsMatch;
        const value = this.getNestedValue(context, path);
        return value !== undefined && value !== null;
      }
      
      // Handle numeric comparisons
      const numMatch = condition.match(/^(\w+(?:\.\w+)*)\s*([><]=?|==)\s*(\d+(?:\.\d+)?)$/);
      if (numMatch) {
        const [, path, op, valueStr] = numMatch;
        const contextValue = Number(this.getNestedValue(context, path));
        const compareValue = Number(valueStr);
        
        switch (op) {
          case '>': return contextValue > compareValue;
          case '>=': return contextValue >= compareValue;
          case '<': return contextValue < compareValue;
          case '<=': return contextValue <= compareValue;
          case '==': return contextValue === compareValue;
        }
      }
      
      // Default: treat as a key existence check
      return this.getNestedValue(context, condition) !== undefined;
    } catch {
      return false;
    }
  }

  private evaluateConditions(conditions: string[], context: Record<string, unknown>): boolean {
    return conditions.every(cond => this.evaluateCondition(cond, context));
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }

  private pruneUnused(): void {
    // Remove skills with lowest retention
    const items = this.getAll()
      .filter(item => item.status !== SkillStatus.EXPERT && item.status !== SkillStatus.AUTOMATIC)
      .sort((a, b) => this.calculateRetention(a) - this.calculateRetention(b));
    
    const toRemove = Math.ceil(this.config.maxSkills * 0.05);
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

export default ProceduralMemory;
