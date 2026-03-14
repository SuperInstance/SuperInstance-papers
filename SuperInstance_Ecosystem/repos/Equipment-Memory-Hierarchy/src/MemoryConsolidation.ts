/**
 * @fileoverview Memory Consolidation - Moves items between memory tiers based on importance
 * Implements automatic consolidation with importance and frequency-based promotion
 */

import {
  MemoryTier,
  ConsolidationResult,
  ConsolidationPolicy,
  WorkingMemoryItem,
  EpisodicMemoryItem,
  SemanticMemoryItem,
  ProceduralMemoryItem,
  SemanticRelationType,
  ProceduralStep,
  SkillStatus,
  MemoryEvent,
  MemoryEventType,
  MemoryEventHandler
} from './types.js';
import { WorkingMemory } from './WorkingMemory.js';
import { EpisodicMemory } from './EpisodicMemory.js';
import { SemanticMemory } from './SemanticMemory.js';
import { ProceduralMemory } from './ProceduralMemory.js';

/**
 * Default consolidation policy
 */
const DEFAULT_POLICY: ConsolidationPolicy = {
  workingToEpisodic: {
    accessThreshold: 3,
    importanceThreshold: 0.6,
    emotionalWeighting: true
  },
  episodicToSemantic: {
    occurrenceThreshold: 3, // Number of similar episodes
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
};

/**
 * Episode similarity match for consolidation
 */
interface EpisodeMatch {
  episodes: EpisodicMemoryItem[];
  concept: string;
  attributes: Record<string, unknown>;
}

/**
 * Memory Consolidation class
 * Handles transfer of memories between tiers based on importance and access patterns
 * Features:
 * - Working -> Episodic consolidation (fast)
 * - Episodic -> Semantic consolidation (pattern extraction)
 * - Semantic -> Procedural consolidation (skill learning)
 * - Automatic periodic consolidation
 * - Forgetting curve management
 */
export class MemoryConsolidation {
  private workingMemory: WorkingMemory;
  private episodicMemory: EpisodicMemory;
  private semanticMemory: SemanticMemory;
  private proceduralMemory: ProceduralMemory;
  private policy: ConsolidationPolicy;
  private consolidationCount: number = 0;
  private consolidationTimer?: ReturnType<typeof setInterval>;
  private eventHandlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();

  constructor(
    workingMemory: WorkingMemory,
    episodicMemory: EpisodicMemory,
    semanticMemory: SemanticMemory,
    proceduralMemory: ProceduralMemory,
    policy: Partial<ConsolidationPolicy> = {}
  ) {
    this.workingMemory = workingMemory;
    this.episodicMemory = episodicMemory;
    this.semanticMemory = semanticMemory;
    this.proceduralMemory = proceduralMemory;
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Start automatic consolidation
   */
  startAutoConsolidation(interval: number = 60000): void {
    if (this.consolidationTimer) return;
    
    this.consolidationTimer = setInterval(() => {
      this.runConsolidation();
    }, interval);
  }

  /**
   * Stop automatic consolidation
   */
  stopAutoConsolidation(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = undefined;
    }
  }

  /**
   * Run full consolidation cycle
   */
  async runConsolidation(): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];
    
    // Working -> Episodic
    const workingResults = await this.consolidateWorkingToEpisodic();
    results.push(...workingResults);
    
    // Episodic -> Semantic
    const semanticResults = await this.consolidateEpisodicToSemantic();
    results.push(...semanticResults);
    
    // Semantic -> Procedural
    const proceduralResults = await this.consolidateSemanticToProcedural();
    results.push(...proceduralResults);
    
    // Process forgetting
    this.processForgetting();
    
    this.consolidationCount++;
    
    return results;
  }

  /**
   * Consolidate working memory items to episodic memory
   */
  async consolidateWorkingToEpisodic(): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];
    const candidates = this.workingMemory.getConsolidationCandidates();
    
    for (const item of candidates) {
      const result = await this.consolidateWorkingItem(item);
      results.push(result);
      
      if (result.success) {
        // Remove from working memory after successful consolidation
        this.workingMemory.remove(item.id);
      }
    }
    
    return results;
  }

  /**
   * Consolidate a single working memory item to episodic
   */
  private async consolidateWorkingItem(item: WorkingMemoryItem): Promise<ConsolidationResult> {
    const now = new Date();
    
    try {
      // Determine if consolidation should happen
      const shouldConsolidate = this.shouldConsolidateWorkingItem(item);
      
      if (!shouldConsolidate) {
        return {
          success: false,
          sourceTier: MemoryTier.WORKING,
          targetTier: MemoryTier.EPISODIC,
          itemId: item.id,
          reason: 'Item does not meet consolidation criteria',
          timestamp: now
        };
      }

      // Extract emotional context from metadata
      const emotionalContext = item.metadata.emotionalContext as { valence: number; arousal: number; dominance: number } | undefined;
      
      // Create episodic memory
      const episode = this.episodicMemory.add(
        'Working memory consolidation',
        {
          originalContent: item.content,
          slot: item.slot,
          attentionWeight: item.attentionWeight
        },
        {
          importance: item.importance,
          emotionalContext: emotionalContext || {
            valence: 0,
            arousal: item.attentionWeight,
            dominance: 0.5
          },
          tags: item.tags,
          metadata: item.metadata,
          source: {
            type: 'internal',
            context: 'consolidation'
          }
        }
      );

      this.emitEvent({
        type: MemoryEventType.CONSOLIDATION_COMPLETED,
        timestamp: now,
        tier: MemoryTier.EPISODIC,
        itemId: episode.id,
        data: { sourceId: item.id, sourceTier: MemoryTier.WORKING }
      });

      return {
        success: true,
        sourceTier: MemoryTier.WORKING,
        targetTier: MemoryTier.EPISODIC,
        itemId: item.id,
        newItemId: episode.id,
        reason: 'High importance or frequent access',
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        sourceTier: MemoryTier.WORKING,
        targetTier: MemoryTier.EPISODIC,
        itemId: item.id,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now
      };
    }
  }

  /**
   * Check if a working memory item should be consolidated
   */
  private shouldConsolidateWorkingItem(item: WorkingMemoryItem): boolean {
    const { workingToEpisodic } = this.policy;
    
    // High importance
    if (item.importance >= workingToEpisodic.importanceThreshold) {
      return true;
    }
    
    // Frequent access
    if (item.accessCount >= workingToEpisodic.accessThreshold) {
      return true;
    }
    
    // Emotional weight
    if (workingToEpisodic.emotionalWeighting && item.metadata.emotionalWeight) {
      const weight = item.metadata.emotionalWeight as number;
      if (weight >= 0.6) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Consolidate episodic memories to semantic memory
   */
  async consolidateEpisodicToSemantic(): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];
    const candidates = this.episodicMemory.getConsolidationCandidates();
    
    // Group similar episodes
    const episodeGroups = this.groupSimilarEpisodes(candidates);
    
    for (const group of episodeGroups) {
      if (group.episodes.length >= this.policy.episodicToSemantic.occurrenceThreshold) {
        const result = await this.createSemanticConcept(group);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Group similar episodes for pattern extraction
   */
  private groupSimilarEpisodes(episodes: EpisodicMemoryItem[]): EpisodeMatch[] {
    const groups: Map<string, EpisodeMatch> = new Map();
    
    for (const episode of episodes) {
      // Create a signature based on event type and key attributes
      const eventKey = this.extractEventKey(episode);
      
      if (!groups.has(eventKey)) {
        groups.set(eventKey, {
          episodes: [],
          concept: this.extractConcept(episode),
          attributes: this.extractAttributes(episode)
        });
      }
      
      groups.get(eventKey)!.episodes.push(episode);
    }
    
    return Array.from(groups.values())
      .filter(g => g.episodes.length >= this.policy.episodicToSemantic.occurrenceThreshold);
  }

  /**
   * Extract event key for grouping
   */
  private extractEventKey(episode: EpisodicMemoryItem): string {
    const event = episode.content.event;
    const tags = episode.tags.slice(0, 2).sort().join(',');
    return `${event}:${tags}`;
  }

  /**
   * Extract concept name from episode
   */
  private extractConcept(episode: EpisodicMemoryItem): string {
    return episode.content.event;
  }

  /**
   * Extract attributes from episode
   */
  private extractAttributes(episode: EpisodicMemoryItem): Record<string, unknown> {
    return {
      ...episode.content.details,
      source: episode.source.type,
      location: episode.content.location,
      emotionalAverage: (episode.emotionalContext.valence + episode.emotionalContext.arousal) / 2
    };
  }

  /**
   * Create semantic concept from episode group
   */
  private async createSemanticConcept(group: EpisodeMatch): Promise<ConsolidationResult> {
    const now = new Date();
    
    try {
      // Calculate confidence from episode consistency
      const confidence = this.calculateGroupConfidence(group.episodes);
      
      // Create or update semantic concept
      const existing = this.semanticMemory.getByName(group.concept);
      
      if (existing) {
        // Update existing concept with new examples
        const examples = group.episodes.map(e => e.content.event);
        this.semanticMemory.update(existing.id, {
          examples,
          confidence: Math.min(1, existing.confidence + 0.1)
        });
        
        return {
          success: true,
          sourceTier: MemoryTier.EPISODIC,
          targetTier: MemoryTier.SEMANTIC,
          itemId: group.episodes[0].id,
          newItemId: existing.id,
          reason: 'Updated existing concept with new episodes',
          timestamp: now
        };
      }
      
      // Create new concept
      const concept = this.semanticMemory.add(
        group.concept,
        {
          attributes: group.attributes,
          examples: group.episodes.map(e => e.content.event),
          importance: group.episodes.reduce((sum, e) => sum + e.importance, 0) / group.episodes.length,
          confidence,
          sourceEpisodes: group.episodes.map(e => e.id)
        }
      );

      // Create relationships between related concepts
      this.createDerivedRelationships(concept, group.episodes);

      this.emitEvent({
        type: MemoryEventType.CONSOLIDATION_COMPLETED,
        timestamp: now,
        tier: MemoryTier.SEMANTIC,
        itemId: concept.id,
        data: { 
          sourceIds: group.episodes.map(e => e.id), 
          sourceTier: MemoryTier.EPISODIC 
        }
      });

      return {
        success: true,
        sourceTier: MemoryTier.EPISODIC,
        targetTier: MemoryTier.SEMANTIC,
        itemId: group.episodes[0].id,
        newItemId: concept.id,
        reason: `Extracted from ${group.episodes.length} similar episodes`,
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        sourceTier: MemoryTier.EPISODIC,
        targetTier: MemoryTier.SEMANTIC,
        itemId: group.episodes[0].id,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now
      };
    }
  }

  /**
   * Calculate confidence from episode consistency
   */
  private calculateGroupConfidence(episodes: EpisodicMemoryItem[]): number {
    if (episodes.length === 0) return 0;
    if (episodes.length === 1) return 0.5;
    
    // Base confidence on number of supporting episodes
    const countFactor = Math.min(1, episodes.length / 10);
    
    // Factor in individual episode importances
    const importanceAvg = episodes.reduce((sum, e) => sum + e.importance, 0) / episodes.length;
    
    // Factor in retention of episodes
    const retentionSum = episodes.reduce((sum, e) => {
      const retention = this.episodicMemory.calculateRetention(e);
      return sum + retention;
    }, 0);
    const retentionAvg = retentionSum / episodes.length;
    
    return countFactor * 0.3 + importanceAvg * 0.4 + retentionAvg * 0.3;
  }

  /**
   * Create relationships derived from episodes
   */
  private createDerivedRelationships(
    concept: SemanticMemoryItem,
    episodes: EpisodicMemoryItem[]
  ): void {
    // Find related concepts from episode tags
    const relatedTags = new Set<string>();
    for (const episode of episodes) {
      for (const tag of episode.tags) {
        relatedTags.add(tag);
      }
    }
    
    // Link to concepts with matching tags
    for (const tag of relatedTags) {
      const related = this.semanticMemory.getByName(tag);
      if (related && related.id !== concept.id) {
        this.semanticMemory.relate(
          concept.id,
          related.id,
          SemanticRelationType.RELATED_TO,
          { strength: 0.5 }
        );
      }
    }
    
    // Link to location concepts
    const locations = new Set(
      episodes
        .map(e => e.content.location)
        .filter((l): l is string => l !== undefined)
    );
    
    for (const location of locations) {
      const locationConcept = this.semanticMemory.getByName(location);
      if (locationConcept) {
        this.semanticMemory.relate(
          concept.id,
          locationConcept.id,
          SemanticRelationType.RELATED_TO,
          { strength: 0.4 }
        );
      }
    }
  }

  /**
   * Consolidate semantic memories to procedural memory
   */
  async consolidateSemanticToProcedural(): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];
    const candidates = this.semanticMemory.getConsolidationCandidates();
    
    for (const concept of candidates) {
      // Check if this concept represents a learnable procedure
      const procedure = this.extractProcedure(concept);
      
      if (procedure) {
        const result = await this.createProceduralSkill(concept, procedure);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Extract procedure from semantic concept
   */
  private extractProcedure(concept: SemanticMemoryItem): { steps: ProceduralStep[]; triggers: string[] } | null {
    const { attributes } = concept.content;
    
    // Check if concept has procedure-related attributes
    if (!attributes['isProcedure'] && !attributes['hasSteps']) {
      return null;
    }
    
    // Extract steps from attributes
    const steps: ProceduralStep[] = [];
    const stepData = attributes['steps'] as Array<{ action: string; params?: Record<string, unknown> }> | undefined;
    
    if (stepData && Array.isArray(stepData)) {
      for (let i = 0; i < stepData.length; i++) {
        steps.push({
          order: i + 1,
          action: stepData[i].action,
          parameters: stepData[i].params || {}
        });
      }
    }
    
    if (steps.length === 0) return null;
    
    // Extract triggers
    const triggers: string[] = [];
    const triggerData = attributes['triggers'] as string[] | undefined;
    if (triggerData && Array.isArray(triggerData)) {
      triggers.push(...triggerData);
    }
    
    return { steps, triggers };
  }

  /**
   * Create procedural skill from semantic concept
   */
  private async createProceduralSkill(
    concept: SemanticMemoryItem,
    procedure: { steps: ProceduralStep[]; triggers: string[] }
  ): Promise<ConsolidationResult> {
    const now = new Date();
    
    try {
      // Create procedural memory item
      const skill = this.proceduralMemory.add(
        concept.content.concept,
        procedure.steps,
        {
          description: concept.content.definition,
          parameters: concept.content.attributes,
          importance: concept.importance,
          sourceEpisodes: concept.sourceEpisodes
        }
      );
      
      // Add triggers
      for (const triggerCondition of procedure.triggers) {
        this.proceduralMemory.addTrigger(skill.id, triggerCondition, 0.5);
      }
      
      this.emitEvent({
        type: MemoryEventType.CONSOLIDATION_COMPLETED,
        timestamp: now,
        tier: MemoryTier.PROCEDURAL,
        itemId: skill.id,
        data: { sourceId: concept.id, sourceTier: MemoryTier.SEMANTIC }
      });

      return {
        success: true,
        sourceTier: MemoryTier.SEMANTIC,
        targetTier: MemoryTier.PROCEDURAL,
        itemId: concept.id,
        newItemId: skill.id,
        reason: 'Extracted procedure from semantic concept',
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        sourceTier: MemoryTier.SEMANTIC,
        targetTier: MemoryTier.PROCEDURAL,
        itemId: concept.id,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now
      };
    }
  }

  /**
   * Process forgetting across all tiers
   */
  processForgetting(): {
    episodic: number;
    semantic: number;
    procedural: number;
  } {
    const episodicForgotten = this.episodicMemory.processForgetting();
    
    // Semantic memory rarely forgets - only very low confidence items
    // This would typically be done manually or through specific policies
    
    const proceduralForgotten = this.proceduralMemory.processForgetting();
    
    return {
      episodic: episodicForgotten,
      semantic: 0,
      procedural: proceduralForgotten
    };
  }

  /**
   * Manual consolidation of a specific item
   */
  async consolidateItem(
    itemId: string,
    sourceTier: MemoryTier,
    targetTier: MemoryTier
  ): Promise<ConsolidationResult> {
    const now = new Date();
    
    this.emitEvent({
      type: MemoryEventType.CONSOLIDATION_STARTED,
      timestamp: now,
      tier: sourceTier,
      itemId
    });
    
    try {
      switch (sourceTier) {
        case MemoryTier.WORKING:
          if (targetTier === MemoryTier.EPISODIC) {
            const items = this.workingMemory.getAll();
            const item = items.find(i => i.id === itemId);
            if (item) {
              return this.consolidateWorkingItem(item);
            }
          }
          break;
          
        case MemoryTier.EPISODIC:
          if (targetTier === MemoryTier.SEMANTIC) {
            const item = this.episodicMemory.get(itemId);
            if (item) {
              const group: EpisodeMatch = {
                episodes: [item],
                concept: this.extractConcept(item),
                attributes: this.extractAttributes(item)
              };
              return this.createSemanticConcept(group);
            }
          }
          break;
          
        case MemoryTier.SEMANTIC:
          if (targetTier === MemoryTier.PROCEDURAL) {
            const item = this.semanticMemory.get(itemId);
            if (item) {
              const procedure = this.extractProcedure(item);
              if (procedure) {
                return this.createProceduralSkill(item, procedure);
              }
            }
          }
          break;
      }
      
      return {
        success: false,
        sourceTier,
        targetTier,
        itemId,
        reason: 'Invalid consolidation path or item not found',
        timestamp: now
      };
    } catch (error) {
      return {
        success: false,
        sourceTier,
        targetTier,
        itemId,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now
      };
    }
  }

  /**
   * Get consolidation statistics
   */
  getStatistics(): {
    totalConsolidations: number;
    recentConsolidations: number;
    consolidationRate: number;
  } {
    return {
      totalConsolidations: this.consolidationCount,
      recentConsolidations: 0, // Would need to track recent consolidations
      consolidationRate: this.consolidationCount / Math.max(1, Date.now() - (this.consolidationTimer ? Date.now() : Date.now()))
    };
  }

  /**
   * Subscribe to consolidation events
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
   * Emit event
   */
  private emitEvent(event: MemoryEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in consolidation event handler:', error);
        }
      }
    }
  }
}

export default MemoryConsolidation;
