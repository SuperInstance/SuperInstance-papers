/**
 * ContextCompressor - Compress context for efficiency
 * 
 * Provides intelligent compression strategies that preserve critical
 * information while reducing token count for transfer.
 */

import * as zlib from 'zlib';
import { promisify } from 'util';
import type {
  PrioritizedContent,
  CompressionOptions,
  ContextPriority,
} from './types';
import {
  COMPRESSION_STRATEGIES,
  PRIORITY_LEVELS,
  MIN_PRESERVED_CONTEXT,
} from './constants';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Compression result with metadata
 */
interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  droppedIds: string[];
  preservedIds: string[];
}

/**
 * Content summary for lossy compression
 */
interface ContentSummary {
  id: string;
  summary: string;
  keyPoints: string[];
  originalTokens: number;
  summaryTokens: number;
}

/**
 * ContextCompressor handles intelligent compression of context content
 */
export class ContextCompressor {
  private options: Required<CompressionOptions>;
  private compressionStats: Map<string, { ratio: number; timestamp: number }>;

  constructor(options: CompressionOptions = {}) {
    this.options = {
      level: options.level ?? 6,
      strategy: options.strategy ?? 'balanced',
      allowLossy: options.allowLossy ?? false,
      targetRatio: options.targetRatio ?? 0.5,
      preserveIds: options.preserveIds ?? [],
      customCompressor: options.customCompressor ?? this.defaultCompressor,
    };
    this.compressionStats = new Map();
  }

  /**
   * Compress a map of prioritized content
   */
  async compress(
    content: Map<string, PrioritizedContent>,
    targetTokens?: number
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = this.calculateTotalTokens(content);
    const target = targetTokens ?? Math.floor(originalSize * this.options.targetRatio);

    // Sort content by priority score
    const sorted = this.sortByPriority(content);

    // Determine what to preserve vs compress vs drop
    const { toPreserve, toCompress, toDrop } = this.categorizeContent(sorted, target);

    // Process content
    const preservedItems: PrioritizedContent[] = [];
    const compressedItems: PrioritizedContent[] = [];
    const droppedIds: string[] = [];
    const preservedIds: string[] = [];

    // Preserve critical content
    for (const item of toPreserve) {
      preservedItems.push(item);
      preservedIds.push(item.id);
    }

    // Compress non-critical content
    for (const item of toCompress) {
      if (this.options.allowLossy && item.compressible) {
        const compressed = await this.compressItem(item);
        compressedItems.push(compressed);
        preservedIds.push(item.id);
      } else if (!item.droppable) {
        preservedItems.push(item);
        preservedIds.push(item.id);
      } else {
        droppedIds.push(item.id);
      }
    }

    // Drop low-priority content
    for (const item of toDrop) {
      droppedIds.push(item.id);
    }

    // Combine all preserved and compressed items
    const finalContent = [...preservedItems, ...compressedItems];
    const finalSize = this.calculateItemTokens(finalContent);

    // Serialize and compress the final content
    const serialized = JSON.stringify(finalContent);
    const compressed = await gzip(Buffer.from(serialized));

    const result: CompressionResult = {
      compressed,
      originalSize,
      compressedSize: compressed.length,
      ratio: compressed.length / originalSize,
      droppedIds,
      preservedIds,
    };

    // Track compression stats
    this.compressionStats.set(Date.now().toString(), {
      ratio: result.ratio,
      timestamp: startTime,
    });

    return result;
  }

  /**
   * Decompress previously compressed content
   */
  async decompress(compressed: Buffer): Promise<PrioritizedContent[]> {
    const decompressed = await gunzip(compressed);
    const parsed = JSON.parse(decompressed.toString());
    return parsed as PrioritizedContent[];
  }

  /**
   * Calculate total tokens in content map
   */
  private calculateTotalTokens(content: Map<string, PrioritizedContent>): number {
    let total = 0;
    for (const item of content.values()) {
      total += item.metadata.tokenCount;
    }
    return total;
  }

  /**
   * Calculate total tokens in array of items
   */
  private calculateItemTokens(items: PrioritizedContent[]): number {
    return items.reduce((sum, item) => sum + item.metadata.tokenCount, 0);
  }

  /**
   * Sort content by priority score (highest first)
   */
  private sortByPriority(content: Map<string, PrioritizedContent>): PrioritizedContent[] {
    return Array.from(content.values()).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Categorize content into preserve, compress, and drop buckets
   */
  private categorizeContent(
    sorted: PrioritizedContent[],
    targetTokens: number
  ): {
    toPreserve: PrioritizedContent[];
    toCompress: PrioritizedContent[];
    toDrop: PrioritizedContent[];
  } {
    const toPreserve: PrioritizedContent[] = [];
    const toCompress: PrioritizedContent[] = [];
    const toDrop: PrioritizedContent[] = [];

    let currentTokens = 0;
    const minPreserve = Math.min(MIN_PRESERVED_CONTEXT, targetTokens);

    for (const item of sorted) {
      const isPreserved = this.options.preserveIds.includes(item.id);
      const isCritical = item.metadata.priority === 'critical' || item.metadata.priority === 'essential';

      // Always preserve critical or explicitly marked content
      if (isPreserved || isCritical) {
        toPreserve.push(item);
        currentTokens += item.metadata.tokenCount;
        continue;
      }

      // Check if we can fit this content
      if (currentTokens + item.metadata.tokenCount <= targetTokens) {
        if (item.compressible) {
          toCompress.push(item);
        } else {
          toPreserve.push(item);
        }
        currentTokens += item.metadata.tokenCount;
      } else {
        // Can't fit, decide to compress or drop
        if (item.compressible && currentTokens < minPreserve) {
          toCompress.push(item);
        } else if (item.droppable) {
          toDrop.push(item);
        } else {
          toCompress.push(item);
        }
      }
    }

    return { toPreserve, toCompress, toDrop };
  }

  /**
   * Compress a single item using lossy compression
   */
  private async compressItem(item: PrioritizedContent): Promise<PrioritizedContent> {
    const compressedContent = await this.options.customCompressor(item.content);

    // Estimate new token count
    const newTokens = Math.floor(item.metadata.tokenCount * 0.3);

    return {
      ...item,
      content: compressedContent,
      metadata: {
        ...item.metadata,
        tokenCount: newTokens,
      },
      priorityScore: item.priorityScore * 0.9, // Slightly reduce priority for compressed
    };
  }

  /**
   * Default lossy compression - creates summary
   */
  private defaultCompressor(content: unknown): unknown {
    if (typeof content === 'string') {
      // Simple summarization - keep first and last parts
      if (content.length > 500) {
        const first = content.slice(0, 200);
        const last = content.slice(-200);
        return `${first}\n...[compressed]...\n${last}`;
      }
      return content;
    }

    if (typeof content === 'object' && content !== null) {
      // For objects, keep key structure but compress values
      const keys = Object.keys(content as Record<string, unknown>);
      const summary: Record<string, unknown> = {};
      
      for (const key of keys.slice(0, 10)) {
        const value = (content as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.length > 100) {
          summary[key] = value.slice(0, 100) + '...[truncated]';
        } else {
          summary[key] = value;
        }
      }
      
      return summary;
    }

    return content;
  }

  /**
   * Get compression statistics
   */
  getStats(): Array<{ ratio: number; timestamp: number }> {
    return Array.from(this.compressionStats.values());
  }

  /**
   * Estimate compression ratio for content
   */
  estimateCompressionRatio(content: Map<string, PrioritizedContent>): number {
    let compressibleTokens = 0;
    let totalTokens = 0;

    for (const item of content.values()) {
      totalTokens += item.metadata.tokenCount;
      if (item.compressible) {
        compressibleTokens += item.metadata.tokenCount;
      }
    }

    // Estimate: preserved content stays same, compressible content reduces to 30%
    const preservedTokens = totalTokens - compressibleTokens;
    const estimatedCompressed = preservedTokens + compressibleTokens * 0.3;

    return estimatedCompressed / totalTokens;
  }

  /**
   * Create a content summary for reference
   */
  createSummary(item: PrioritizedContent): ContentSummary {
    const content = item.content;
    let summary = '';
    const keyPoints: string[] = [];

    if (typeof content === 'string') {
      summary = content.slice(0, 200);
      keyPoints.push(`Length: ${content.length}`);
    } else if (typeof content === 'object' && content !== null) {
      const keys = Object.keys(content as Record<string, unknown>);
      summary = `Object with ${keys.length} keys: ${keys.slice(0, 5).join(', ')}`;
      keyPoints.push(...keys.slice(0, 10));
    }

    return {
      id: item.id,
      summary,
      keyPoints,
      originalTokens: item.metadata.tokenCount,
      summaryTokens: Math.floor(item.metadata.tokenCount * 0.1),
    };
  }

  /**
   * Check if content can be further compressed
   */
  canCompressFurther(item: PrioritizedContent): boolean {
    return item.compressible && item.metadata.priority !== 'critical';
  }

  /**
   * Update compression options
   */
  updateOptions(options: Partial<CompressionOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }
}
