/**
 * CellTail - Output and Action System for LOG Cells
 *
 * The tail is the cell's effector, responsible for:
 * - Emitting processed values through output channels
 * - Triggering effects on other cells
 * - Executing external actions (API calls, etc.)
 * - Notifying watching cells
 *
 * Part of the POLLN spreadsheet integration.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reference to a cell in the spreadsheet
 */
export interface CellReference {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Types of effects a cell can trigger on other cells
 */
export enum EffectType {
  TRIGGER = 'trigger',           // Trigger another cell to process
  INVALIDATE = 'invalidate',     // Invalidate another cell's cache
  NOTIFY = 'notify',             // Send notification to another cell
  CASCADE = 'cascade',           // Trigger cascade effect
  BLOCK = 'block',               // Block another cell from processing
  PRIORITY = 'priority',         // Change another cell's priority
}

/**
 * Effect that one cell can have on another
 */
export interface Effect {
  id: string;
  type: EffectType;
  source: CellReference;
  target: CellReference;
  timestamp: number;
  payload?: any;
  condition?: () => boolean;
  delay?: number;  // Delay in milliseconds
}

/**
 * Types of external actions a cell can perform
 */
export enum ActionType {
  API_CALL = 'api_call',
  HTTP_REQUEST = 'http_request',
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  FILE_WRITE = 'file_write',
  DATABASE_WRITE = 'database_write',
  CUSTOM = 'custom',
}

/**
 * External action that a cell can execute
 */
export interface Action {
  id: string;
  type: ActionType;
  timestamp: number;
  config: Record<string, any>;
  execute: () => Promise<ActionResult>;
  condition?: () => boolean;
  retryPolicy?: RetryPolicy;
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  success: boolean;
  data?: any;
  error?: Error;
  duration: number;
}

/**
 * Retry policy for failed actions
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

/**
 * Output channel for emitting values
 */
export interface OutputChannel {
  id: string;
  name: string;
  value: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Configuration for the CellTail
 */
export interface CellTailConfig {
  maxOutputs?: number;
  maxEffects?: number;
  maxActions?: number;
  maxSubscribers?: number;
}

/**
 * Subscriber that watches cell outputs
 */
export interface CellSubscriber {
  id: string;
  cellRef: CellReference;
  callback: (output: OutputChannel) => void;
  filter?: (output: OutputChannel) => boolean;
}

/**
 * CellTail - The output and action component of a LOG cell
 *
 * Responsibilities:
 * - Emit processed values through output channels
 * - Trigger effects on other cells
 * - Execute external actions
 * - Notify watching cells
 */
export class CellTail extends EventEmitter {
  public readonly id: string;
  public readonly cellId: string;

  // Output channels
  private outputs: Map<string, OutputChannel> = new Map();
  private readonly maxOutputs: number;

  // Effects on other cells
  private effects: Map<string, Effect> = new Map();
  private readonly maxEffects: number;

  // External actions
  private actions: Map<string, Action> = new Map();
  private readonly maxActions: number;

  // Subscribers
  private subscribers: Map<string, CellSubscriber> = new Map();
  private readonly maxSubscribers: number;

  // Configuration
  private config: CellTailConfig;

  // State tracking
  private lastEmitTime: number = 0;
  private totalEmits: number = 0;
  private totalEffectsTriggered: number = 0;
  private totalActionsExecuted: number = 0;

  constructor(cellId: string, config: CellTailConfig = {}) {
    super();
    this.id = uuidv4();
    this.cellId = cellId;
    this.config = config;

    // Set limits with defaults
    this.maxOutputs = config.maxOutputs ?? 100;
    this.maxEffects = config.maxEffects ?? 50;
    this.maxActions = config.maxActions ?? 20;
    this.maxSubscribers = config.maxSubscribers ?? 100;
  }

  /**
   * Emit a value through an output channel
   */
  public emitOutput(name: string, value: any, metadata?: Record<string, any>): OutputChannel {
    const output: OutputChannel = {
      id: uuidv4(),
      name,
      value,
      timestamp: Date.now() + this.totalEmits, // Add offset to ensure unique timestamps
      metadata,
    };

    // Add to outputs (with size limit)
    if (this.outputs.size >= this.maxOutputs) {
      // Remove oldest output (by insertion order, which is the first key)
      const oldestKey = this.outputs.keys().next().value;
      this.outputs.delete(oldestKey);
    }
    this.outputs.set(output.id, output);

    // Update tracking
    this.lastEmitTime = output.timestamp;
    this.totalEmits++;

    // Notify subscribers
    this.notifySubscribers(output);

    // Emit event for listeners (using EventEmitter's emit)
    super.emit('output', output);

    return output;
  }

  /**
   * Get the most recent output by name
   */
  public getOutput(name: string): OutputChannel | undefined {
    const outputs = Array.from(this.outputs.values())
      .filter(o => o.name === name)
      .sort((a, b) => b.timestamp - a.timestamp);
    return outputs[0];
  }

  /**
   * Get all outputs
   */
  public getOutputs(): OutputChannel[] {
    return Array.from(this.outputs.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get outputs by name
   */
  public getOutputsByName(name: string): OutputChannel[] {
    return Array.from(this.outputs.values())
      .filter(o => o.name === name)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all outputs
   */
  public clearOutputs(): void {
    this.outputs.clear();
  }

  /**
   * Add an effect that will be triggered on another cell
   */
  public addEffect(
    type: EffectType,
    target: CellReference,
    source: CellReference,
    payload?: any,
    options?: {
      condition?: () => boolean;
      delay?: number;
    }
  ): Effect {
    const effect: Effect = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload,
      condition: options?.condition,
      delay: options?.delay,
    };

    // Add to effects (with size limit)
    if (this.effects.size >= this.maxEffects) {
      // Remove oldest effect
      const oldestKey = this.effects.keys().next().value;
      this.effects.delete(oldestKey);
    }
    this.effects.set(effect.id, effect);

    return effect;
  }

  /**
   * Trigger an effect on another cell
   */
  public async triggerEffect(effectId: string): Promise<boolean> {
    const effect = this.effects.get(effectId);
    if (!effect) {
      return false;
    }

    // Check condition if present
    if (effect.condition && !effect.condition()) {
      return false;
    }

    // Apply delay if specified
    if (effect.delay && effect.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, effect.delay!));
    }

    // Emit effect event
    super.emit('effect', effect);
    this.totalEffectsTriggered++;

    return true;
  }

  /**
   * Trigger all effects
   */
  public async triggerAllEffects(): Promise<number> {
    const promises = Array.from(this.effects.keys()).map(id =>
      this.triggerEffect(id)
    );
    const results = await Promise.all(promises);
    return results.filter(r => r).length;
  }

  /**
   * Get all effects
   */
  public getEffects(): Effect[] {
    return Array.from(this.effects.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get effects targeting a specific cell
   */
  public getEffectsForTarget(target: CellReference): Effect[] {
    return Array.from(this.effects.values()).filter(e =>
      e.target.row === target.row && e.target.col === target.col
    );
  }

  /**
   * Remove an effect
   */
  public removeEffect(effectId: string): boolean {
    return this.effects.delete(effectId);
  }

  /**
   * Clear all effects
   */
  public clearEffects(): void {
    this.effects.clear();
  }

  /**
   * Add an external action to execute
   */
  public addAction(
    type: ActionType,
    executeFn: () => Promise<ActionResult>,
    config: Record<string, any> = {},
    options?: {
      condition?: () => boolean;
      retryPolicy?: RetryPolicy;
    }
  ): Action {
    const action: Action = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      config,
      execute: executeFn,
      condition: options?.condition,
      retryPolicy: options?.retryPolicy,
    };

    // Add to actions (with size limit)
    if (this.actions.size >= this.maxActions) {
      // Remove oldest action
      const oldestKey = this.actions.keys().next().value;
      this.actions.delete(oldestKey);
    }
    this.actions.set(action.id, action);

    return action;
  }

  /**
   * Execute an action
   */
  public async executeAction(actionId: string): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    // Check condition if present
    if (action.condition && !action.condition()) {
      return {
        success: false,
        error: new Error('Action condition not met'),
        duration: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Execute with retry policy if specified
      const result = action.retryPolicy
        ? await this.executeWithRetry(action)
        : await action.execute();

      this.totalActionsExecuted++;
      super.emit('action', { action, result });

      return result;
    } catch (error) {
      const result: ActionResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      };

      this.totalActionsExecuted++;
      super.emit('action-error', { action, error });
      return result;
    }
  }

  /**
   * Execute an action with retry policy
   */
  private async executeWithRetry(action: Action): Promise<ActionResult> {
    const maxRetries = action.retryPolicy!.maxRetries;
    const backoffMs = action.retryPolicy!.backoffMs;
    const retryableErrors = action.retryPolicy!.retryableErrors;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await action.execute();
        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = retryableErrors.some(pattern =>
          lastError!.message.includes(pattern)
        );

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve =>
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
      }
    }

    throw lastError;
  }

  /**
   * Execute all actions
   */
  public async executeAllActions(): Promise<ActionResult[]> {
    const promises = Array.from(this.actions.keys()).map(id =>
      this.executeAction(id).catch(error => ({
        success: false,
        error,
        duration: 0,
      }))
    );
    return Promise.all(promises);
  }

  /**
   * Get all actions
   */
  public getActions(): Action[] {
    return Array.from(this.actions.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Remove an action
   */
  public removeAction(actionId: string): boolean {
    return this.actions.delete(actionId);
  }

  /**
   * Clear all actions
   */
  public clearActions(): void {
    this.actions.clear();
  }

  /**
   * Subscribe to cell outputs
   */
  public subscribe(
    cellRef: CellReference,
    callback: (output: OutputChannel) => void,
    filter?: (output: OutputChannel) => boolean
  ): string {
    // Check subscriber limit
    if (this.subscribers.size >= this.maxSubscribers) {
      throw new Error('Maximum subscribers reached');
    }

    const subscriber: CellSubscriber = {
      id: uuidv4(),
      cellRef,
      callback,
      filter,
    };

    this.subscribers.set(subscriber.id, subscriber);
    super.emit('subscribed', subscriber);

    return subscriber.id;
  }

  /**
   * Unsubscribe from cell outputs
   */
  public unsubscribe(subscriberId: string): boolean {
    const removed = this.subscribers.delete(subscriberId);
    if (removed) {
      super.emit('unsubscribed', subscriberId);
    }
    return removed;
  }

  /**
   * Notify all subscribers of an output
   */
  private notifySubscribers(output: OutputChannel): void {
    const subscribers = Array.from(this.subscribers.values());
    for (const subscriber of subscribers) {
      try {
        // Apply filter if present
        if (subscriber.filter && !subscriber.filter(output)) {
          continue;
        }

        // Notify subscriber
        subscriber.callback(output);
      } catch (error) {
        super.emit('subscriber-error', {
          subscriber,
          error,
          output,
        });
      }
    }
  }

  /**
   * Get all subscribers
   */
  public getSubscribers(): CellSubscriber[] {
    return Array.from(this.subscribers.values());
  }

  /**
   * Clear all subscribers
   */
  public clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Get statistics about the tail
   */
  public getStats(): {
    outputsCount: number;
    effectsCount: number;
    actionsCount: number;
    subscribersCount: number;
    lastEmitTime: number;
    totalEmits: number;
    totalEffectsTriggered: number;
    totalActionsExecuted: number;
  } {
    return {
      outputsCount: this.outputs.size,
      effectsCount: this.effects.size,
      actionsCount: this.actions.size,
      subscribersCount: this.subscribers.size,
      lastEmitTime: this.lastEmitTime,
      totalEmits: this.totalEmits,
      totalEffectsTriggered: this.totalEffectsTriggered,
      totalActionsExecuted: this.totalActionsExecuted,
    };
  }

  /**
   * Reset the tail state
   */
  public reset(): void {
    this.clearOutputs();
    this.clearEffects();
    this.clearActions();
    this.clearSubscribers();
    this.lastEmitTime = 0;
    this.totalEmits = 0;
    this.totalEffectsTriggered = 0;
    this.totalActionsExecuted = 0;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.reset();
    this.removeAllListeners();
  }
}
