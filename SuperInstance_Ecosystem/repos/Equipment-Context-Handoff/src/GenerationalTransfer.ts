/**
 * GenerationalTransfer - Transfer context between generations
 * 
 * Manages the transfer of context from one agent generation
 * to the next, maintaining ancestry and accumulated state.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ContextPackage,
  GenerationInfo,
  TransferResult,
  HandoffEvent,
  HandoffEventHandler,
  HandoffContext,
  HandoffTrigger,
} from './types';
import { HANDOFF_TRIGGERS, DEFAULT_HANDOFF_CONFIG } from './constants';
import { ContextPackager } from './ContextPackager';
import { ContextCompressor } from './ContextCompressor';
import { ResumePointManager } from './ResumePointManager';

/**
 * Options for generational transfer
 */
export interface TransferOptions {
  /** Reason for transfer */
  reason?: string;
  /** Force transfer even if conditions not met */
  force?: boolean;
  /** Target token count for the package */
  targetTokens?: number;
  /** Custom generation number override */
  generationOverride?: number;
  /** Whether to preserve full history */
  preserveFullHistory?: boolean;
}

/**
 * Result of initializing from a parent package
 */
export interface InitResult {
  success: boolean;
  generation: GenerationInfo;
  warnings?: string[];
}

/**
 * Transfer statistics
 */
export interface TransferStats {
  totalTransfers: number;
  totalTokensTransferred: number;
  totalCompressed: number;
  avgCompressionRatio: number;
  avgTransferTime: number;
  generations: number;
}

/**
 * GenerationalTransfer handles context handoff between agent instances
 */
export class GenerationalTransfer {
  private generation: GenerationInfo;
  private packager: ContextPackager;
  private compressor: ContextCompressor;
  private resumePointManager: ResumePointManager;
  private triggers: HandoffTrigger[];
  private eventHandlers: Set<HandoffEventHandler>;
  private transferHistory: Array<{
    from: string;
    to: string;
    timestamp: number;
    tokens: number;
    reason?: string;
  }>;
  private startTime: number;
  private accumulatedCost: number;
  private errorCount: number;

  constructor(parentPackage?: ContextPackage) {
    this.generation = this.initializeGeneration(parentPackage);
    this.packager = new ContextPackager(this.generation);
    this.compressor = new ContextCompressor();
    this.resumePointManager = new ResumePointManager();
    this.triggers = [...HANDOFF_TRIGGERS];
    this.eventHandlers = new Set();
    this.transferHistory = [];
    this.startTime = Date.now();
    this.accumulatedCost = parentPackage?.generation.accumulatedCost ?? 0;
    this.errorCount = 0;

    if (parentPackage) {
      this.loadFromPackage(parentPackage);
    }
  }

  /**
   * Initialize generation info
   */
  private initializeGeneration(parentPackage?: ContextPackage): GenerationInfo {
    const agentInstanceId = uuidv4();

    if (!parentPackage) {
      return {
        generationNumber: 0,
        ancestry: [],
        accumulatedTime: 0,
        accumulatedCost: 0,
        agentInstanceId,
      };
    }

    const parentGen = parentPackage.generation;
    return {
      generationNumber: parentGen.generationNumber + 1,
      parentPackageId: parentPackage.packageId,
      ancestry: [...parentGen.ancestry, parentPackage.packageId],
      accumulatedTime: parentGen.accumulatedTime + (Date.now() - this.startTime),
      accumulatedCost: parentGen.accumulatedCost,
      agentInstanceId,
    };
  }

  /**
   * Load context from parent package
   */
  private loadFromPackage(pkg: ContextPackage): InitResult {
    const warnings: string[] = [];

    // Load content
    this.packager.loadFromPackage(pkg);

    // Load resume points
    this.resumePointManager.import(pkg.resumePoints);

    // Validate loaded content
    if (pkg.totalTokens > DEFAULT_HANDOFF_CONFIG.maxContextSize) {
      warnings.push('Package exceeds max context size, some content may have been trimmed');
    }

    // Check version compatibility
    if (pkg.version !== '1.0.0') {
      warnings.push(`Package version ${pkg.version} may have compatibility issues`);
    }

    return {
      success: true,
      generation: this.generation,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Add content to the current context
   */
  addContent(
    id: string,
    content: unknown,
    type: string,
    priority?: 'critical' | 'essential' | 'important' | 'optional' | 'disposable'
  ): void {
    this.packager.addContent({ id, content, type, priority });
  }

  /**
   * Create a resume point
   */
  createResumePoint(
    name: string,
    state: Record<string, unknown>,
    progress: number = 0,
    type: 'task' | 'conversation' | 'process' | 'checkpoint' = 'checkpoint'
  ): string {
    const rp = this.resumePointManager.create({
      type,
      name,
      state,
      position: progress,
      progress,
    });
    return rp.id;
  }

  /**
   * Prepare context for transfer to next generation
   */
  async prepareTransfer(options: TransferOptions = {}): Promise<TransferResult> {
    const startTime = Date.now();

    this.emitEvent({
      type: 'handoff:initiated',
      timestamp: startTime,
      data: {
        generation: this.generation.generationNumber,
        reason: options.reason,
      },
      generation: this.generation.generationNumber,
      severity: 'info',
    });

    try {
      // Update generation stats
      const elapsed = Date.now() - this.startTime;
      this.generation.accumulatedTime += elapsed;

      // Create resume point if enabled
      if (DEFAULT_HANDOFF_CONFIG.enableResumePoints) {
        const activeRp = this.resumePointManager.getActive();
        if (!activeRp) {
          // Create automatic checkpoint
          this.resumePointManager.checkpoint(
            `pre-transfer-checkpoint`,
            { timestamp: Date.now() },
            100 // Full progress as we're transferring
          );
        }
      }

      // Package current context
      const pkg = await this.packager.package({
        maxTokens: options.targetTokens ?? DEFAULT_HANDOFF_CONFIG.maxContextSize,
      });

      // Compress if needed
      let compressionRatio = 1;
      if (pkg.totalTokens > (options.targetTokens ?? DEFAULT_HANDOFF_CONFIG.maxContextSize) * 0.8) {
        this.emitEvent({
          type: 'compression:started',
          timestamp: Date.now(),
          data: { originalTokens: pkg.totalTokens },
          generation: this.generation.generationNumber,
          severity: 'info',
        });

        const compressed = await this.compressor.compress(pkg.content, options.targetTokens);
        pkg.compressedBlob = compressed.compressed;
        compressionRatio = compressed.ratio;
        pkg.compressionRatio = compressionRatio;

        this.emitEvent({
          type: 'compression:completed',
          timestamp: Date.now(),
          data: { ratio: compressionRatio },
          generation: this.generation.generationNumber,
          severity: 'info',
        });
      }

      // Include resume points
      pkg.resumePoints = this.resumePointManager.export();

      // Calculate stats
      const transferTime = Date.now() - startTime;

      // Record transfer in history
      this.transferHistory.push({
        from: this.generation.agentInstanceId,
        to: 'pending', // Will be updated by next generation
        timestamp: Date.now(),
        tokens: pkg.totalTokens,
        reason: options.reason,
      });

      this.emitEvent({
        type: 'handoff:completed',
        timestamp: Date.now(),
        data: {
          packageId: pkg.packageId,
          tokens: pkg.totalTokens,
          transferTime,
        },
        generation: this.generation.generationNumber,
        severity: 'info',
      });

      return {
        success: true,
        package: pkg,
        stats: {
          originalTokens: pkg.totalTokens,
          finalTokens: Math.floor(pkg.totalTokens * compressionRatio),
          compressionRatio,
          itemsTransferred: pkg.content.size,
          itemsDropped: 0,
          transferTime,
        },
      };
    } catch (error) {
      this.emitEvent({
        type: 'handoff:failed',
        timestamp: Date.now(),
        data: { error: String(error) },
        generation: this.generation.generationNumber,
        severity: 'error',
      });

      return {
        success: false,
        error: String(error),
        stats: {
          originalTokens: 0,
          finalTokens: 0,
          compressionRatio: 0,
          itemsTransferred: 0,
          itemsDropped: 0,
          transferTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Check if handoff should be triggered
   */
  shouldTriggerHandoff(context: HandoffContext): { triggered: boolean; trigger?: HandoffTrigger } {
    for (const trigger of this.triggers) {
      if (!trigger.enabled) continue;

      let shouldTrigger = false;

      switch (trigger.type) {
        case 'time':
          shouldTrigger = context.elapsedTime >= trigger.threshold;
          break;
        case 'token_limit':
          shouldTrigger = context.tokenCount / context.maxTokens >= trigger.threshold;
          break;
        case 'cost':
          shouldTrigger = context.accumulatedCost >= trigger.threshold;
          break;
        case 'complexity':
          shouldTrigger = context.complexityScore >= trigger.threshold;
          break;
        case 'error':
          shouldTrigger = context.errorCount >= trigger.threshold;
          break;
      }

      // Custom condition
      if (trigger.condition) {
        shouldTrigger = trigger.condition(context);
      }

      if (shouldTrigger) {
        this.emitEvent({
          type: 'trigger:fired',
          timestamp: Date.now(),
          data: { triggerType: trigger.type, threshold: trigger.threshold },
          generation: this.generation.generationNumber,
          severity: 'warning',
        });

        return { triggered: true, trigger };
      }
    }

    return { triggered: false };
  }

  /**
   * Get current generation info
   */
  getGeneration(): GenerationInfo {
    return { ...this.generation };
  }

  /**
   * Get current context stats
   */
  getContextStats(): HandoffContext {
    const content = this.packager.getAllContent();
    let tokenCount = 0;
    for (const item of content.values()) {
      tokenCount += item.metadata.tokenCount;
    }

    return {
      tokenCount,
      maxTokens: DEFAULT_HANDOFF_CONFIG.maxContextSize,
      elapsedTime: Date.now() - this.startTime,
      accumulatedCost: this.accumulatedCost,
      complexityScore: this.calculateComplexity(),
      generationNumber: this.generation.generationNumber,
      itemCount: content.size,
      resumePointCount: this.resumePointManager.getAll().length,
      errorCount: this.errorCount,
      lastActivity: Date.now(),
    };
  }

  /**
   * Add a handoff trigger
   */
  addTrigger(trigger: HandoffTrigger): void {
    this.triggers.push(trigger);
  }

  /**
   * Remove a handoff trigger
   */
  removeTrigger(type: HandoffTrigger['type']): boolean {
    const index = this.triggers.findIndex(t => t.type === type);
    if (index >= 0) {
      this.triggers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Record cost accumulation
   */
  recordCost(cost: number): void {
    this.accumulatedCost += cost;
  }

  /**
   * Get transfer statistics
   */
  getTransferStats(): TransferStats {
    const history = this.transferHistory;
    const totalTokens = history.reduce((sum, h) => sum + h.tokens, 0);

    return {
      totalTransfers: history.length,
      totalTokensTransferred: totalTokens,
      totalCompressed: history.filter(h => h.tokens > 0).length,
      avgCompressionRatio: 0.5, // Placeholder
      avgTransferTime: 0, // Placeholder
      generations: this.generation.generationNumber + 1,
    };
  }

  /**
   * Get resume point manager
   */
  getResumePointManager(): ResumePointManager {
    return this.resumePointManager;
  }

  /**
   * Get context packager
   */
  getPackager(): ContextPackager {
    return this.packager;
  }

  /**
   * Add event handler
   */
  on(handler: HandoffEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: HandoffEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Calculate complexity score based on context
   */
  private calculateComplexity(): number {
    const content = this.packager.getAllContent();
    const resumePoints = this.resumePointManager.getAll();

    // Base complexity from content
    let score = content.size * 10;

    // Add complexity from resume points
    score += resumePoints.length * 20;

    // Add complexity from generation depth
    score += this.generation.generationNumber * 50;

    // Add complexity from ancestry
    score += this.generation.ancestry.length * 30;

    return score;
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: HandoffEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    }
  }
}
