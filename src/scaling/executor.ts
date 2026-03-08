/**
 * Scaling Action Executor
 *
 * Executes scaling actions with proper orchestration
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { ScalingAction, ScalingDecision, ResourceMetrics } from './types.js';
import { ScalingActionType, ScalingDirection } from './types.js';

/**
 * Execution result
 */
interface ExecutionResult {
  action: ScalingAction;
  success: boolean;
  duration: number;
  error?: Error;
  details: Record<string, unknown>;
}

/**
 * Agent spawn result
 */
interface SpawnResult {
  agentIds: string[];
  count: number;
  duration: number;
}

/**
 * Executor config
 */
interface ExecutorConfig {
  maxConcurrentExecutions: number;
  executionTimeout: number;
  rollbackOnFailure: boolean;
  dryRun: boolean;
}

/**
 * Scaling Action Executor
 */
export class ScalingActionExecutor extends EventEmitter {
  private config: ExecutorConfig;
  private activeExecutions: Map<string, ScalingDecision> = new Map();
  private executionHistory: ExecutionResult[] = [];

  constructor(config: ExecutorConfig) {
    super();
    this.config = config;
  }

  /**
   * Execute scaling decision
   */
  public async execute(decision: ScalingDecision): Promise<ExecutionResult[]> {
    this.activeExecutions.set(decision.id, decision);
    this.emit('execution_started', decision);

    const startTime = Date.now();
    const results: ExecutionResult[] = [];

    try {
      // Execute actions in order of priority
      const sortedActions = [...decision.actions].sort(
        (a, b) => b.priority - a.priority
      );

      for (const action of sortedActions) {
        // Check concurrent execution limit
        while (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
          await this.sleep(100);
        }

        // Execute action
        const result = await this.executeAction(action);

        results.push(result);

        // Check if we should rollback
        if (!result.success && this.config.rollbackOnFailure) {
          this.emit('rollback_initiated', { decision, results });
          await this.rollback(results);
          break;
        }
      }

      const duration = Date.now() - startTime;

      // Store results
      for (const result of results) {
        this.executionHistory.push(result);
      }

      // Prune old history
      this.pruneHistory();

      this.emit('execution_completed', {
        decision,
        results,
        duration,
      });

      return results;
    } catch (error) {
      this.emit('execution_failed', {
        decision,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    } finally {
      this.activeExecutions.delete(decision.id);
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: ScalingAction): Promise<ExecutionResult> {
    const startTime = Date.now();

    this.emit('action_started', action);

    try {
      // Check dry run
      if (this.config.dryRun) {
        return {
          action,
          success: true,
          duration: 0,
          details: { dryRun: true },
        };
      }

      // Execute based on action type
      let result: any;

      switch (action.type) {
        case ScalingActionType.SPAWN_AGENTS:
          result = await this.spawnAgents(action);
          break;
        case ScalingActionType.DESPAWN_AGENTS:
          result = await this.despawnAgents(action);
          break;
        case ScalingActionType.INCREASE_CAPACITY:
          result = await this.increaseCapacity(action);
          break;
        case ScalingActionType.DECREASE_CAPACITY:
          result = await this.decreaseCapacity(action);
          break;
        case ScalingActionType.EXPAND_KV_CACHE:
          result = await this.expandKVCache(action);
          break;
        case ScalingActionType.SHRINK_KV_CACHE:
          result = await this.shrinkKVCache(action);
          break;
        case ScalingActionType.ALLOCATE_MEMORY:
          result = await this.allocateMemory(action);
          break;
        case ScalingActionType.RELEASE_MEMORY:
          result = await this.releaseMemory(action);
          break;
        case ScalingActionType.ADD_NODE:
          result = await this.addNode(action);
          break;
        case ScalingActionType.REMOVE_NODE:
          result = await this.removeNode(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      const duration = Date.now() - startTime;

      this.emit('action_completed', {
        action,
        result,
        duration,
      });

      return {
        action,
        success: true,
        duration,
        details: result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit('action_failed', {
        action,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        action,
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        details: {},
      };
    }
  }

  /**
   * Spawn agents
   */
  private async spawnAgents(action: ScalingAction): Promise<SpawnResult> {
    const startTime = Date.now();
    const agentIds: string[] = [];

    // Emit spawn request
    this.emit('spawn_agents_request', {
      count: action.magnitude,
      params: action.params,
    });

    // In a real implementation, this would coordinate with the ColonyManager
    // For now, we simulate spawning
    for (let i = 0; i < action.magnitude; i++) {
      const agentId = uuidv4();
      agentIds.push(agentId);

      this.emit('agent_spawned', {
        agentId,
        type: action.params.agentType || 'task',
      });
    }

    const duration = Date.now() - startTime;

    return {
      agentIds,
      count: agentIds.length,
      duration,
    };
  }

  /**
   * Despawn agents
   */
  private async despawnAgents(action: ScalingAction): Promise<any> {
    const startTime = Date.now();

    // Emit despawn request
    this.emit('despawn_agents_request', {
      count: action.magnitude,
      params: action.params,
    });

    // In a real implementation, this would coordinate with the ColonyManager
    // For now, we simulate despawning
    const duration = Date.now() - startTime;

    return {
      count: action.magnitude,
      duration,
    };
  }

  /**
   * Increase capacity
   */
  private async increaseCapacity(action: ScalingAction): Promise<any> {
    this.emit('increase_capacity_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Decrease capacity
   */
  private async decreaseCapacity(action: ScalingAction): Promise<any> {
    this.emit('decrease_capacity_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Expand KV cache
   */
  private async expandKVCache(action: ScalingAction): Promise<any> {
    this.emit('expand_kv_cache_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Shrink KV cache
   */
  private async shrinkKVCache(action: ScalingAction): Promise<any> {
    this.emit('shrink_kv_cache_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Allocate memory
   */
  private async allocateMemory(action: ScalingAction): Promise<any> {
    this.emit('allocate_memory_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Release memory
   */
  private async releaseMemory(action: ScalingAction): Promise<any> {
    this.emit('release_memory_request', {
      amount: action.magnitude,
      params: action.params,
    });

    return {
      amount: action.magnitude,
    };
  }

  /**
   * Add node
   */
  private async addNode(action: ScalingAction): Promise<any> {
    this.emit('add_node_request', {
      params: action.params,
    });

    return {
      nodeId: uuidv4(),
    };
  }

  /**
   * Remove node
   */
  private async removeNode(action: ScalingAction): Promise<any> {
    this.emit('remove_node_request', {
      params: action.params,
    });

    return {
      nodeId: action.params.nodeId,
    };
  }

  /**
   * Rollback executed actions
   */
  private async rollback(results: ExecutionResult[]): Promise<void> {
    // Reverse the successful actions
    const successful = results.filter((r) => r.success).reverse();

    for (const result of successful) {
      try {
        await this.rollbackAction(result.action);
      } catch (error) {
        this.emit('rollback_failed', {
          action: result.action,
          error,
        });
      }
    }

    this.emit('rollback_completed');
  }

  /**
   * Rollback individual action
   */
  private async rollbackAction(action: ScalingAction): Promise<void> {
    const reverseAction: ScalingAction = {
      ...action,
      direction:
        action.direction === ScalingDirection.UP
          ? ScalingDirection.DOWN
          : ScalingDirection.UP,
    };

    // Execute reverse action
    await this.executeAction(reverseAction);
  }

  /**
   * Prune old execution history
   */
  private pruneHistory(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.executionHistory = this.executionHistory.filter((r) => {
      // We can't easily get timestamp from ExecutionResult, so we'll keep last 1000
      return true;
    }).slice(-1000);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution history
   */
  public getHistory(limit?: number): ExecutionResult[] {
    const history = [...this.executionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get active executions
   */
  public getActiveExecutions(): ScalingDecision[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel execution
   */
  public cancel(decisionId: string): boolean {
    const decision = this.activeExecutions.get(decisionId);

    if (!decision) {
      return false;
    }

    this.activeExecutions.delete(decisionId);
    this.emit('execution_cancelled', decision);

    return true;
  }

  /**
   * Update config
   */
  public updateConfig(updates: Partial<ExecutorConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    this.emit('config_updated', this.config);
  }

  /**
   * Get config
   */
  public getConfig(): ExecutorConfig {
    return { ...this.config };
  }
}

/**
 * Create default executor config
 */
export function createDefaultExecutorConfig(): ExecutorConfig {
  return {
    maxConcurrentExecutions: 5,
    executionTimeout: 300000, // 5 minutes
    rollbackOnFailure: true,
    dryRun: false,
  };
}
