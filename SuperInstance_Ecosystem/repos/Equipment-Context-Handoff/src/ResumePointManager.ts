/**
 * ResumePointManager - Manage resume points
 * 
 * Creates and manages checkpoint positions where agent
 * instances can pick up where previous instances left off.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ResumePoint,
  HandoffEvent,
  HandoffEventHandler,
} from './types';
import { RESUME_POINT_PRIORITIES } from './constants';

/**
 * Options for creating resume points
 */
export interface CreateResumePointOptions {
  type: ResumePoint['type'];
  name: string;
  description?: string;
  state: Record<string, unknown>;
  position: number | string;
  progress?: number;
  estimatedRemaining?: number;
  dependencies?: string[];
  requiredContext?: string[];
}

/**
 * Resume point with additional metadata
 */
interface ManagedResumePoint extends ResumePoint {
  /** Whether this point has been activated */
  activated?: boolean;
  /** Number of times activated */
  activationCount?: number;
  /** Last activation timestamp */
  lastActivatedAt?: number;
  /** Parent resume point (for hierarchical checkpoints) */
  parentId?: string;
  /** Child resume points */
  children?: string[];
  /** Whether this point is valid */
  valid?: boolean;
  /** Validation error if invalid */
  validationError?: string;
}

/**
 * Result of activating a resume point
 */
export interface ActivationResult {
  success: boolean;
  resumePoint?: ResumePoint;
  state?: Record<string, unknown>;
  error?: string;
  warnings?: string[];
}

/**
 * ResumePointManager handles checkpoint creation and restoration
 */
export class ResumePointManager {
  private resumePoints: Map<string, ManagedResumePoint>;
  private activeResumePoint: string | null;
  private eventHandlers: Set<HandoffEventHandler>;
  private autoCheckpoint: boolean;
  private checkpointInterval: NodeJS.Timeout | null;

  constructor() {
    this.resumePoints = new Map();
    this.activeResumePoint = null;
    this.eventHandlers = new Set();
    this.autoCheckpoint = false;
    this.checkpointInterval = null;
  }

  /**
   * Create a new resume point
   */
  create(options: CreateResumePointOptions): ResumePoint {
    const now = Date.now();
    
    const resumePoint: ManagedResumePoint = {
      id: uuidv4(),
      type: options.type,
      name: options.name,
      description: options.description ?? '',
      state: options.state,
      position: options.position,
      progress: options.progress ?? this.calculateProgress(options.position),
      createdAt: now,
      estimatedRemaining: options.estimatedRemaining,
      dependencies: options.dependencies ?? [],
      requiredContext: options.requiredContext ?? [],
      activated: false,
      activationCount: 0,
      valid: true,
    };

    this.resumePoints.set(resumePoint.id, resumePoint);

    this.emitEvent({
      type: 'resume:created',
      timestamp: now,
      data: { resumePointId: resumePoint.id, type: resumePoint.type },
      generation: 0,
      severity: 'info',
    });

    return resumePoint;
  }

  /**
   * Create a checkpoint (task-type resume point)
   */
  checkpoint(
    name: string,
    state: Record<string, unknown>,
    progress: number = 0
  ): ResumePoint {
    return this.create({
      type: 'checkpoint',
      name,
      state,
      position: progress,
      progress,
    });
  }

  /**
   * Activate a resume point
   */
  activate(id: string): ActivationResult {
    const resumePoint = this.resumePoints.get(id);

    if (!resumePoint) {
      return {
        success: false,
        error: `Resume point ${id} not found`,
      };
    }

    if (!resumePoint.valid) {
      return {
        success: false,
        error: `Resume point is invalid: ${resumePoint.validationError}`,
      };
    }

    // Check dependencies
    const depErrors = this.validateDependencies(resumePoint);
    if (depErrors.length > 0) {
      return {
        success: false,
        error: 'Dependency validation failed',
        warnings: depErrors,
      };
    }

    // Activate the resume point
    resumePoint.activated = true;
    resumePoint.activationCount = (resumePoint.activationCount ?? 0) + 1;
    resumePoint.lastActivatedAt = Date.now();
    this.activeResumePoint = id;

    this.emitEvent({
      type: 'resume:activated',
      timestamp: Date.now(),
      data: { resumePointId: id, activationCount: resumePoint.activationCount },
      generation: 0,
      severity: 'info',
    });

    return {
      success: true,
      resumePoint,
      state: resumePoint.state,
    };
  }

  /**
   * Get a resume point by ID
   */
  get(id: string): ResumePoint | undefined {
    return this.resumePoints.get(id);
  }

  /**
   * Get all resume points
   */
  getAll(): ResumePoint[] {
    return Array.from(this.resumePoints.values());
  }

  /**
   * Get resume points by type
   */
  getByType(type: ResumePoint['type']): ResumePoint[] {
    return this.getAll().filter(rp => rp.type === type);
  }

  /**
   * Get the currently active resume point
   */
  getActive(): ResumePoint | undefined {
    if (this.activeResumePoint) {
      return this.resumePoints.get(this.activeResumePoint);
    }
    return undefined;
  }

  /**
   * Get the latest resume point
   */
  getLatest(): ResumePoint | undefined {
    const all = this.getAll();
    if (all.length === 0) return undefined;

    return all.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
    );
  }

  /**
   * Get the best resume point for continuation
   */
  getBestForResume(): ResumePoint | undefined {
    const all = this.getAll()
      .filter(rp => rp.valid)
      .sort((a, b) => {
        // Sort by type priority, then by progress, then by recency
        const typePriorityA = RESUME_POINT_PRIORITIES[a.type] ?? 0;
        const typePriorityB = RESUME_POINT_PRIORITIES[b.type] ?? 0;

        if (typePriorityA !== typePriorityB) {
          return typePriorityB - typePriorityA;
        }

        if (a.progress !== b.progress) {
          return b.progress - a.progress;
        }

        return b.createdAt - a.createdAt;
      });

    return all[0];
  }

  /**
   * Update a resume point
   */
  update(
    id: string,
    updates: Partial<Omit<ResumePoint, 'id' | 'createdAt'>>
  ): boolean {
    const resumePoint = this.resumePoints.get(id);
    if (!resumePoint) {
      return false;
    }

    const updated: ManagedResumePoint = {
      ...resumePoint,
      ...updates,
    };

    this.resumePoints.set(id, updated);
    return true;
  }

  /**
   * Delete a resume point
   */
  delete(id: string): boolean {
    const resumePoint = this.resumePoints.get(id);
    if (!resumePoint) {
      return false;
    }

    // Don't delete if it has children
    if (resumePoint.children && resumePoint.children.length > 0) {
      return false;
    }

    this.resumePoints.delete(id);

    if (this.activeResumePoint === id) {
      this.activeResumePoint = null;
    }

    return true;
  }

  /**
   * Invalidate a resume point
   */
  invalidate(id: string, reason: string): boolean {
    const resumePoint = this.resumePoints.get(id);
    if (!resumePoint) {
      return false;
    }

    resumePoint.valid = false;
    resumePoint.validationError = reason;

    return true;
  }

  /**
   * Create a hierarchical child resume point
   */
  createChild(parentId: string, options: Omit<CreateResumePointOptions, 'type'>): ResumePoint | null {
    const parent = this.resumePoints.get(parentId);
    if (!parent) {
      return null;
    }

    const child = this.create({
      ...options,
      type: parent.type,
    });

    // Set up parent-child relationship
    child.dependencies = [...(child.dependencies ?? []), parentId];
    
    const managedChild = child as ManagedResumePoint;
    managedChild.parentId = parentId;

    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(child.id);

    return child;
  }

  /**
   * Enable auto-checkpointing
   */
  enableAutoCheckpoint(
    callback: () => Record<string, unknown>,
    intervalMs: number = 60000 // 1 minute default
  ): void {
    this.autoCheckpoint = true;

    this.checkpointInterval = setInterval(() => {
      const state = callback();
      const checkpoint = this.checkpoint(`auto-checkpoint-${Date.now()}`, state);
      console.log(`Auto-checkpoint created: ${checkpoint.id}`);
    }, intervalMs);
  }

  /**
   * Disable auto-checkpointing
   */
  disableAutoCheckpoint(): void {
    this.autoCheckpoint = false;
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
    }
  }

  /**
   * Get resume points within a progress range
   */
  getByProgressRange(minProgress: number, maxProgress: number): ResumePoint[] {
    return this.getAll().filter(
      rp => rp.progress >= minProgress && rp.progress <= maxProgress
    );
  }

  /**
   * Get resume statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgProgress: number;
    activeCount: number;
  } {
    const all = this.getAll();
    const byType: Record<string, number> = {};

    for (const rp of all) {
      byType[rp.type] = (byType[rp.type] ?? 0) + 1;
    }

    const avgProgress = all.length > 0
      ? all.reduce((sum, rp) => sum + rp.progress, 0) / all.length
      : 0;

    return {
      total: all.length,
      byType,
      avgProgress,
      activeCount: all.filter(rp => (rp as ManagedResumePoint).activated).length,
    };
  }

  /**
   * Export resume points for transfer
   */
  export(): ResumePoint[] {
    return this.getAll();
  }

  /**
   * Import resume points
   */
  import(resumePoints: ResumePoint[]): void {
    for (const rp of resumePoints) {
      this.resumePoints.set(rp.id, {
        ...rp,
        activated: false,
        valid: true,
      });
    }
  }

  /**
   * Clear all resume points
   */
  clear(): void {
    this.disableAutoCheckpoint();
    this.resumePoints.clear();
    this.activeResumePoint = null;
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
   * Calculate progress from position
   */
  private calculateProgress(position: number | string): number {
    if (typeof position === 'number') {
      return position;
    }
    // For string positions, return 0 (unknown progress)
    return 0;
  }

  /**
   * Validate dependencies for a resume point
   */
  private validateDependencies(resumePoint: ResumePoint): string[] {
    const errors: string[] = [];

    if (!resumePoint.dependencies) {
      return errors;
    }

    for (const depId of resumePoint.dependencies) {
      const dep = this.resumePoints.get(depId);
      if (!dep) {
        errors.push(`Dependency ${depId} not found`);
      } else if (!dep.valid) {
        errors.push(`Dependency ${depId} is invalid`);
      }
    }

    return errors;
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
