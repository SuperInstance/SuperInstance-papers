/**
 * ContextHandoff - Main equipment class
 * 
 * Provides a unified interface for generational context transfer
 * between agent instances. This is the primary entry point for
 * the Equipment-Context-Handoff equipment.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  HandoffConfig,
  ContextPackage,
  TransferResult,
  ResumePoint,
  HandoffEvent,
  HandoffEventHandler,
  HandoffContext,
  PrioritizedContent,
  ContextPriority,
} from './types';
import { DEFAULT_HANDOFF_CONFIG } from './constants';
import { ContextPackager, PackageOptions, ContentItem } from './ContextPackager';
import { GenerationalTransfer, TransferOptions, TransferStats } from './GenerationalTransfer';
import { ContextCompressor, CompressionOptions } from './ContextCompressor';
import { ResumePointManager, CreateResumePointOptions, ActivationResult } from './ResumePointManager';

/**
 * ContextHandoff - Main equipment class for context transfer
 * 
 * @example
 * ```typescript
 * // Initialize with optional parent package
 * const handoff = new ContextHandoff(parentPackage);
 * 
 * // Add content to context
 * handoff.addContent('task-1', taskDefinition, 'task_definition', 'critical');
 * 
 * // Create resume points
 * handoff.checkpoint('phase-1-complete', phase1State);
 * 
 * // Check if handoff needed
 * if (handoff.needsHandoff()) {
 *   const result = await handoff.transfer();
 *   // Pass result.package to next agent instance
 * }
 * ```
 */
export class ContextHandoff {
  private config: Required<Omit<HandoffConfig, 'onHandoff'>> & { onHandoff?: HandoffEventHandler };
  private transfer: GenerationalTransfer;
  private compressor: ContextCompressor;
  private startTime: number;
  private lastActivity: number;
  private accumulatedCost: number;
  private errorCount: number;
  private isTransferred: boolean;

  constructor(parentPackage?: ContextPackage, config: HandoffConfig = {}) {
    this.config = {
      ...DEFAULT_HANDOFF_CONFIG,
      ...config,
    };

    this.transfer = new GenerationalTransfer(parentPackage);
    this.compressor = new ContextCompressor({
      level: this.config.compressionLevel,
      targetRatio: 0.5,
    });
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.accumulatedCost = 0;
    this.errorCount = 0;
    this.isTransferred = false;

    // Set up event forwarding
    if (this.config.onHandoff) {
      this.transfer.on(this.config.onHandoff);
    }

    // Set up auto-handoff monitoring if enabled
    if (this.config.enableAutoTriggers) {
      this.setupAutoMonitoring();
    }
  }

  // ============================================
  // Content Management
  // ============================================

  /**
   * Add content to the context
   */
  addContent(
    id: string,
    content: unknown,
    type: string,
    priority?: ContextPriority,
    tags?: string[]
  ): string {
    this.updateActivity();
    return this.transfer.addContent(id, content, type, priority);
  }

  /**
   * Update existing content
   */
  updateContent(id: string, content: unknown, priority?: ContextPriority): boolean {
    this.updateActivity();
    const packager = this.transfer.getPackager();
    return packager.updateContent(id, { content, priority });
  }

  /**
   * Remove content from context
   */
  removeContent(id: string): boolean {
    this.updateActivity();
    const packager = this.transfer.getPackager();
    return packager.removeContent(id);
  }

  /**
   * Get content by ID
   */
  getContent(id: string): PrioritizedContent | undefined {
    const packager = this.transfer.getPackager();
    return packager.getContent(id);
  }

  /**
   * Get all content
   */
  getAllContent(): Map<string, PrioritizedContent> {
    return this.transfer.getPackager().getAllContent();
  }

  /**
   * Get total token count
   */
  getTokenCount(): number {
    return this.transfer.getPackager().getTotalTokens();
  }

  // ============================================
  // Resume Point Management
  // ============================================

  /**
   * Create a checkpoint resume point
   */
  checkpoint(name: string, state: Record<string, unknown>, progress: number = 0): string {
    this.updateActivity();
    return this.transfer.createResumePoint(name, state, progress, 'checkpoint');
  }

  /**
   * Create a task resume point
   */
  taskPoint(
    name: string,
    state: Record<string, unknown>,
    position: number | string,
    progress: number = 0
  ): string {
    this.updateActivity();
    const rpm = this.transfer.getResumePointManager();
    return rpm.create({
      type: 'task',
      name,
      state,
      position,
      progress,
    }).id;
  }

  /**
   * Create a conversation resume point
   */
  conversationPoint(
    name: string,
    state: Record<string, unknown>,
    position: number | string
  ): string {
    this.updateActivity();
    const rpm = this.transfer.getResumePointManager();
    return rpm.create({
      type: 'conversation',
      name,
      state,
      position,
      progress: 0,
    }).id;
  }

  /**
   * Activate a resume point
   */
  activateResumePoint(id: string): ActivationResult {
    this.updateActivity();
    const rpm = this.transfer.getResumePointManager();
    return rpm.activate(id);
  }

  /**
   * Get the best resume point for continuation
   */
  getBestResumePoint(): ResumePoint | undefined {
    return this.transfer.getResumePointManager().getBestForResume();
  }

  /**
   * Get all resume points
   */
  getResumePoints(): ResumePoint[] {
    return this.transfer.getResumePointManager().getAll();
  }

  // ============================================
  // Handoff Operations
  // ============================================

  /**
   * Check if handoff should be triggered
   */
  needsHandoff(): boolean {
    const context = this.getContextStats();
    const { triggered } = this.transfer.shouldTriggerHandoff(context);
    return triggered;
  }

  /**
   * Prepare context for transfer to next generation
   */
  async transfer(options: TransferOptions = {}): Promise<TransferResult> {
    if (this.isTransferred) {
      return {
        success: false,
        error: 'Context has already been transferred',
        stats: {
          originalTokens: 0,
          finalTokens: 0,
          compressionRatio: 0,
          itemsTransferred: 0,
          itemsDropped: 0,
          transferTime: 0,
        },
      };
    }

    const result = await this.transfer.prepareTransfer(options);
    if (result.success) {
      this.isTransferred = true;
    }
    return result;
  }

  /**
   * Receive context from a previous generation
   */
  static receive(pkg: ContextPackage, config?: HandoffConfig): ContextHandoff {
    return new ContextHandoff(pkg, config);
  }

  /**
   * Force handoff regardless of conditions
   */
  async forceTransfer(reason: string): Promise<TransferResult> {
    return this.transfer({ force: true, reason });
  }

  // ============================================
  // Compression
  // ============================================

  /**
   * Compress context
   */
  async compress(options: CompressionOptions = {}): Promise<{
    success: boolean;
    originalTokens: number;
    compressedTokens: number;
    ratio: number;
  }> {
    const content = this.getAllContent();
    const originalTokens = this.getTokenCount();

    const result = await this.compressor.compress(content, options.targetTokens);

    return {
      success: true,
      originalTokens,
      compressedTokens: result.compressedSize,
      ratio: result.ratio,
    };
  }

  /**
   * Estimate compression ratio
   */
  estimateCompressionRatio(): number {
    const content = this.getAllContent();
    return this.compressor.estimateCompressionRatio(content);
  }

  // ============================================
  // Monitoring & Stats
  // ============================================

  /**
   * Get current context statistics
   */
  getContextStats(): HandoffContext {
    return this.transfer.getContextStats();
  }

  /**
   * Get generation information
   */
  getGeneration(): { number: number; ancestry: string[]; accumulatedTime: number } {
    const gen = this.transfer.getGeneration();
    return {
      number: gen.generationNumber,
      ancestry: gen.ancestry,
      accumulatedTime: gen.accumulatedTime,
    };
  }

  /**
   * Get transfer statistics
   */
  getTransferStats(): TransferStats {
    return this.transfer.getTransferStats();
  }

  /**
   * Record an error
   */
  recordError(error?: Error): void {
    this.errorCount++;
    this.transfer.recordError();
  }

  /**
   * Record cost accumulation
   */
  recordCost(cost: number): void {
    this.accumulatedCost += cost;
    this.transfer.recordCost(cost);
  }

  /**
   * Get elapsed time since creation
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Check if context has been transferred
   */
  isComplete(): boolean {
    return this.isTransferred;
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HandoffConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    if (config.onHandoff) {
      this.transfer.on(config.onHandoff);
    }
  }

  /**
   * Add event handler
   */
  on(handler: HandoffEventHandler): void {
    this.transfer.on(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: HandoffEventHandler): void {
    this.transfer.off(handler);
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Create a snapshot without transferring
   */
  async snapshot(): Promise<ContextPackage> {
    const packager = this.transfer.getPackager();
    return packager.package();
  }

  /**
   * Validate context integrity
   */
  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const content = this.getAllContent();

    // Check for missing dependencies
    for (const item of content.values()) {
      if (item.metadata.dependencies) {
        for (const depId of item.metadata.dependencies) {
          if (!content.has(depId)) {
            issues.push(`Content ${item.id} depends on missing ${depId}`);
          }
        }
      }
    }

    // Check resume points
    const resumePoints = this.getResumePoints();
    for (const rp of resumePoints) {
      if (rp.dependencies) {
        for (const depId of rp.dependencies) {
          if (!resumePoints.find(r => r.id === depId)) {
            issues.push(`Resume point ${rp.id} depends on missing ${depId}`);
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.transfer.getPackager().clear();
    this.transfer.getResumePointManager().clear();
    this.accumulatedCost = 0;
    this.errorCount = 0;
    this.lastActivity = Date.now();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Set up automatic monitoring for handoff triggers
   */
  private setupAutoMonitoring(): void {
    // Check every 30 seconds
    const interval = setInterval(() => {
      if (this.isTransferred) {
        clearInterval(interval);
        return;
      }

      if (this.needsHandoff()) {
        this.emitWarning('Auto-handoff trigger detected');
      }
    }, 30000);

    // Clean up on process exit
    process.on('beforeExit', () => {
      clearInterval(interval);
    });
  }

  /**
   * Emit a warning event
   */
  private emitWarning(message: string): void {
    const event: HandoffEvent = {
      type: 'trigger:fired',
      timestamp: Date.now(),
      data: { message },
      generation: this.transfer.getGeneration().generationNumber,
      severity: 'warning',
    };

    if (this.config.onHandoff) {
      this.config.onHandoff(event);
    }
  }
}

// Re-export types and utilities
export { ContextPackager } from './ContextPackager';
export { GenerationalTransfer } from './GenerationalTransfer';
export { ContextCompressor } from './ContextCompressor';
export { ResumePointManager } from './ResumePointManager';
