/**
 * ContextPackager - Package context for transfer
 * 
 * Collects, prioritizes, and packages context content for
 * transfer between agent instances.
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import type {
  ContextPackage,
  ContextMetadata,
  ContextPriority,
  PrioritizedContent,
  GenerationInfo,
  ResumePoint,
  ContextMetadata as CM,
} from './types';
import {
  PACKAGE_VERSION,
  PRIORITY_LEVELS,
  CONTENT_TYPE_WEIGHTS,
  DECAY_FACTORS,
  CHECKSUM_ALGORITHM,
} from './constants';

/**
 * Options for packaging context
 */
export interface PackageOptions {
  /** Include all content regardless of priority */
  includeAll?: boolean;
  /** Maximum tokens for the package */
  maxTokens?: number;
  /** Specific content IDs to include */
  includeIds?: string[];
  /** Specific content IDs to exclude */
  excludeIds?: string[];
  /** Custom priority calculation */
  customPriorityCalc?: (item: PrioritizedContent) => number;
}

/**
 * Content item to be packaged
 */
export interface ContentItem {
  id: string;
  content: unknown;
  type: string;
  priority?: ContextPriority;
  tags?: string[];
  dependencies?: string[];
}

/**
 * ContextPackager manages the collection and packaging of context
 */
export class ContextPackager {
  private content: Map<string, PrioritizedContent>;
  private generation: GenerationInfo;
  private resumePoints: ResumePoint[];
  private tokenCounter: TokenCounter;

  constructor(generation: GenerationInfo) {
    this.content = new Map();
    this.generation = generation;
    this.resumePoints = [];
    this.tokenCounter = new TokenCounter();
  }

  /**
   * Add content to be packaged
   */
  addContent(item: ContentItem): string {
    const id = item.id || uuidv4();
    const now = Date.now();

    const priority = item.priority ?? this.inferPriority(item.type);
    const tokenCount = this.tokenCounter.count(item.content);

    const metadata: ContextMetadata = {
      id,
      type: item.type,
      priority,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tokenCount,
      tags: item.tags,
      dependencies: item.dependencies,
      sourceAgentId: this.generation.agentInstanceId,
    };

    const prioritizedContent: PrioritizedContent = {
      id,
      content: item.content,
      metadata,
      priorityScore: this.calculatePriorityScore(metadata),
      compressible: this.canCompress(item.type),
      droppable: this.canDrop(priority),
    };

    this.content.set(id, prioritizedContent);
    return id;
  }

  /**
   * Update existing content
   */
  updateContent(id: string, updates: Partial<ContentItem>): boolean {
    const existing = this.content.get(id);
    if (!existing) {
      return false;
    }

    const now = Date.now();
    const metadata: ContextMetadata = {
      ...existing.metadata,
      lastAccessedAt: now,
      accessCount: existing.metadata.accessCount + 1,
    };

    if (updates.content !== undefined) {
      metadata.tokenCount = this.tokenCounter.count(updates.content);
    }
    if (updates.type !== undefined) {
      metadata.type = updates.type;
    }
    if (updates.priority !== undefined) {
      metadata.priority = updates.priority;
    }
    if (updates.tags !== undefined) {
      metadata.tags = updates.tags;
    }
    if (updates.dependencies !== undefined) {
      metadata.dependencies = updates.dependencies;
    }

    const prioritizedContent: PrioritizedContent = {
      ...existing,
      content: updates.content ?? existing.content,
      metadata,
      priorityScore: this.calculatePriorityScore(metadata),
    };

    this.content.set(id, prioritizedContent);
    return true;
  }

  /**
   * Remove content from package
   */
  removeContent(id: string): boolean {
    return this.content.delete(id);
  }

  /**
   * Get content by ID
   */
  getContent(id: string): PrioritizedContent | undefined {
    const item = this.content.get(id);
    if (item) {
      // Update access metadata
      this.updateContent(id, {});
    }
    return item;
  }

  /**
   * Add a resume point
   */
  addResumePoint(resumePoint: Omit<ResumePoint, 'id' | 'createdAt'>): string {
    const id = uuidv4();
    const point: ResumePoint = {
      ...resumePoint,
      id,
      createdAt: Date.now(),
    };
    this.resumePoints.push(point);
    return id;
  }

  /**
   * Remove a resume point
   */
  removeResumePoint(id: string): boolean {
    const index = this.resumePoints.findIndex(rp => rp.id === id);
    if (index >= 0) {
      this.resumePoints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Create the final context package
   */
  async package(options: PackageOptions = {}): Promise<ContextPackage> {
    const now = Date.now();
    const packageId = uuidv4();

    // Filter content based on options
    let contentToPackage = this.filterContent(options);

    // Calculate total tokens
    let totalTokens = 0;
    for (const item of contentToPackage.values()) {
      totalTokens += item.metadata.tokenCount;
    }

    // Apply token limit if specified
    if (options.maxTokens && totalTokens > options.maxTokens) {
      contentToPackage = this.applyTokenLimit(contentToPackage, options.maxTokens);
      totalTokens = 0;
      for (const item of contentToPackage.values()) {
        totalTokens += item.metadata.tokenCount;
      }
    }

    // Generate checksum
    const checksum = this.generateChecksum(contentToPackage);

    const pkg: ContextPackage = {
      version: PACKAGE_VERSION,
      packageId,
      generation: this.generation,
      content: contentToPackage,
      resumePoints: [...this.resumePoints],
      checksum,
      createdAt: now,
      totalTokens,
    };

    return pkg;
  }

  /**
   * Load content from an existing package
   */
  loadFromPackage(pkg: ContextPackage): void {
    for (const [id, item] of pkg.content) {
      this.content.set(id, item);
    }
    this.resumePoints = [...pkg.resumePoints];
  }

  /**
   * Get all content
   */
  getAllContent(): Map<string, PrioritizedContent> {
    return new Map(this.content);
  }

  /**
   * Get all resume points
   */
  getResumePoints(): ResumePoint[] {
    return [...this.resumePoints];
  }

  /**
   * Calculate total tokens
   */
  getTotalTokens(): number {
    let total = 0;
    for (const item of this.content.values()) {
      total += item.metadata.tokenCount;
    }
    return total;
  }

  /**
   * Calculate priority score for content
   */
  private calculatePriorityScore(metadata: ContextMetadata): number {
    const priorityWeight = PRIORITY_LEVELS[metadata.priority];
    const typeWeight = CONTENT_TYPE_WEIGHTS[metadata.type] ?? 50;

    // Age decay
    const age = Date.now() - metadata.createdAt;
    const ageHours = age / (1000 * 60 * 60);
    const ageDecay = Math.pow(DECAY_FACTORS.hourlyDecay, ageHours);

    // Recent access bonus
    const timeSinceAccess = Date.now() - metadata.lastAccessedAt;
    const recentBonus = timeSinceAccess < DECAY_FACTORS.recentWindow
      ? DECAY_FACTORS.recentAccessBonus
      : 1;

    // Access frequency bonus
    const accessBonus = Math.min(1 + metadata.accessCount * 0.1, 2);

    return priorityWeight * 0.4 + typeWeight * 0.3 + ageDecay * 20 * 0.2 + recentBonus * accessBonus * 10;
  }

  /**
   * Infer priority from content type
   */
  private inferPriority(type: string): ContextPriority {
    if (type.includes('critical') || type.includes('error')) return 'critical';
    if (type.includes('task') || type.includes('goal')) return 'essential';
    if (type.includes('result') || type.includes('key')) return 'important';
    if (type.includes('cache') || type.includes('temp')) return 'disposable';
    return 'optional';
  }

  /**
   * Check if content type can be compressed
   */
  private canCompress(type: string): boolean {
    const nonCompressible = ['task_definition', 'user_goal', 'critical_result'];
    return !nonCompressible.includes(type);
  }

  /**
   * Check if priority level can be dropped
   */
  private canDrop(priority: ContextPriority): boolean {
    return priority === 'optional' || priority === 'disposable';
  }

  /**
   * Filter content based on options
   */
  private filterContent(options: PackageOptions): Map<string, PrioritizedContent> {
    const filtered = new Map<string, PrioritizedContent>();

    for (const [id, item] of this.content) {
      // Check exclusion
      if (options.excludeIds?.includes(id)) {
        continue;
      }

      // Check inclusion
      if (options.includeIds) {
        if (options.includeIds.includes(id)) {
          filtered.set(id, item);
        }
        continue;
      }

      // Include all or check priority
      if (options.includeAll) {
        filtered.set(id, item);
      } else {
        filtered.set(id, item);
      }
    }

    return filtered;
  }

  /**
   * Apply token limit by removing lowest priority items
   */
  private applyTokenLimit(
    content: Map<string, PrioritizedContent>,
    maxTokens: number
  ): Map<string, PrioritizedContent> {
    const sorted = Array.from(content.values())
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const result = new Map<string, PrioritizedContent>();
    let currentTokens = 0;

    for (const item of sorted) {
      if (currentTokens + item.metadata.tokenCount <= maxTokens) {
        result.set(item.id, item);
        currentTokens += item.metadata.tokenCount;
      } else if (item.metadata.priority === 'critical') {
        // Always include critical items
        result.set(item.id, item);
        currentTokens += item.metadata.tokenCount;
      }
    }

    return result;
  }

  /**
   * Generate checksum for content integrity
   */
  private generateChecksum(content: Map<string, PrioritizedContent>): string {
    const data = Array.from(content.values())
      .map(item => `${item.id}:${item.metadata.tokenCount}:${item.priorityScore}`)
      .join('|');

    return crypto.createHash(CHECKSUM_ALGORITHM).update(data).digest('hex');
  }

  /**
   * Clear all content
   */
  clear(): void {
    this.content.clear();
    this.resumePoints = [];
  }
}

/**
 * Simple token counter utility
 */
class TokenCounter {
  // Average characters per token (approximation)
  private static readonly CHARS_PER_TOKEN = 4;

  count(content: unknown): number {
    if (typeof content === 'string') {
      return Math.ceil(content.length / TokenCounter.CHARS_PER_TOKEN);
    }

    if (typeof content === 'number' || typeof content === 'boolean') {
      return 1;
    }

    if (content === null || content === undefined) {
      return 1;
    }

    if (Array.isArray(content)) {
      return content.reduce((sum, item) => sum + this.count(item), 2);
    }

    if (typeof content === 'object') {
      const str = JSON.stringify(content);
      return Math.ceil(str.length / TokenCounter.CHARS_PER_TOKEN);
    }

    return 1;
  }
}
