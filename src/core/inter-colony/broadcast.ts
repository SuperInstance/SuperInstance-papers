/**
 * Inter-Colony Broadcast
 * Broadcast messages to multiple colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { InterColonyMessage, ColonyFilter } from '../colony-manager/types.js';
import { MessageFactory } from './protocol.js';
import { ColonyBridge } from './bridge.js';

export interface BroadcastResult {
  targetColonyId: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface BroadcastConfig {
  targetColonies: string[];
  filter?: ColonyFilter;
  priority: number;
  timeout?: number;
  requireAck: boolean;
  maxConcurrent: number;
}

export class ColonyBroadcast extends EventEmitter {
  public readonly id: string;
  private bridges: Map<string, ColonyBridge> = new Map();

  constructor() {
    super();
    this.id = uuidv4();
  }

  // ============================================================================
  // Bridge Management
  // ============================================================================

  /**
   * Add a bridge to a colony
   */
  addBridge(bridge: ColonyBridge): void {
    this.bridges.set(bridge.targetColonyId, bridge);
  }

  /**
   * Remove a bridge
   */
  removeBridge(colonyId: string): void {
    this.bridges.delete(colonyId);
  }

  /**
   * Get a bridge
   */
  getBridge(colonyId: string): ColonyBridge | undefined {
    return this.bridges.get(colonyId);
  }

  /**
   * Get all bridges
   */
  getAllBridges(): ColonyBridge[] {
    return Array.from(this.bridges.values());
  }

  // ============================================================================
  // Broadcasting
  // ============================================================================

  /**
   * Broadcast a message to multiple colonies
   */
  async broadcast(
    sourceColonyId: string,
    messageType: string,
    payload: Record<string, unknown>,
    config: Partial<BroadcastConfig> = {}
  ): Promise<Map<string, BroadcastResult>> {
    const fullConfig: BroadcastConfig = {
      targetColonies: config.targetColonies || Array.from(this.bridges.keys()),
      filter: config.filter,
      priority: config.priority || 0.5,
      timeout: config.timeout || 30000,
      requireAck: config.requireAck !== false,
      maxConcurrent: config.maxConcurrent || 10,
    };

    // Filter target colonies
    const targetColonyIds = this.filterColonies(fullConfig.targetColonies, fullConfig.filter);

    // Create message for each target
    const promises: Array<Promise<{ colonyId: string; result: BroadcastResult }>> = [];

    for (const targetColonyId of targetColonyIds) {
      const bridge = this.bridges.get(targetColonyId);
      if (!bridge) {
        promises.push(
          Promise.resolve({
            colonyId: targetColonyId,
            result: {
              targetColonyId,
              success: false,
              error: 'No bridge available',
              timestamp: Date.now(),
            },
          })
        );
        continue;
      }

      const message = MessageFactory.create(
        sourceColonyId,
        targetColonyId,
        messageType as any,
        payload,
        {
          priority: fullConfig.priority,
          timeout: fullConfig.timeout,
          requiresAck: fullConfig.requireAck,
        }
      );

      promises.push(this.sendToColony(bridge, message));
    }

    // Send with concurrency limit
    const results = new Map<string, BroadcastResult>();
    const batches = this.chunk(promises, fullConfig.maxConcurrent);

    for (const batch of batches) {
      const batchResults = await Promise.all(batch);
      for (const { colonyId, result } of batchResults) {
        results.set(colonyId, result);
      }
    }

    this.emit('broadcast_complete', {
      messageCount: results.size,
      successCount: Array.from(results.values()).filter(r => r.success).length,
      failureCount: Array.from(results.values()).filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Broadcast with fire-and-forget (no acknowledgment)
   */
  async broadcastFireAndForget(
    sourceColonyId: string,
    messageType: string,
    payload: Record<string, unknown>,
    config: Partial<BroadcastConfig> = {}
  ): Promise<void> {
    const fullConfig: BroadcastConfig = {
      targetColonies: config.targetColonies || Array.from(this.bridges.keys()),
      filter: config.filter,
      priority: config.priority || 0.5,
      requireAck: false,
      maxConcurrent: config.maxConcurrent || 10,
    };

    const targetColonyIds = this.filterColonies(fullConfig.targetColonies, fullConfig.filter);

    for (const targetColonyId of targetColonyIds) {
      const bridge = this.bridges.get(targetColonyId);
      if (!bridge) continue;

      const message = MessageFactory.create(
        sourceColonyId,
        targetColonyId,
        messageType as any,
        payload,
        {
          priority: fullConfig.priority,
          requiresAck: false,
        }
      );

      // Send without waiting
      bridge.send(message).catch(err => {
        this.emit('send_failed', { colonyId: targetColonyId, error: err });
      });
    }
  }

  /**
   * Broadcast to all colonies
   */
  async broadcastToAll(
    sourceColonyId: string,
    messageType: string,
    payload: Record<string, unknown>,
    config: Partial<BroadcastConfig> = {}
  ): Promise<Map<string, BroadcastResult>> {
    return this.broadcast(sourceColonyId, messageType, payload, {
      ...config,
      targetColonies: Array.from(this.bridges.keys()),
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async sendToColony(
    bridge: ColonyBridge,
    message: InterColonyMessage
  ): Promise<{ colonyId: string; result: BroadcastResult }> {
    try {
      const response = await bridge.send(message);
      return {
        colonyId: bridge.targetColonyId,
        result: {
          targetColonyId: bridge.targetColonyId,
          success: response.success,
          timestamp: response.timestamp,
        },
      };
    } catch (error) {
      return {
        colonyId: bridge.targetColonyId,
        result: {
          targetColonyId: bridge.targetColonyId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        },
      };
    }
  }

  private filterColonies(colonyIds: string[], filter?: ColonyFilter): string[] {
    if (!filter) {
      return colonyIds;
    }

    let filtered = [...colonyIds];

    // Filter by state (would need access to colony instances)
    // This is a placeholder for actual state-based filtering

    // Filter by specialization (would need access to colony specializations)
    if (filter.specializations && filter.specializations.length > 0) {
      // Placeholder: would filter by actual specializations
    }

    // Filter by tags (would need access to colony metadata)
    if (filter.tags && filter.tags.length > 0) {
      // Placeholder: would filter by actual tags
    }

    // Filter by health score (would need access to colony health)
    if (filter.minHealthScore !== undefined) {
      // Placeholder: would filter by actual health scores
    }

    return filtered;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get broadcast statistics
   */
  getStats(): {
    totalBridges: number;
    connectedBridges: number;
    totalBroadcasts: number;
  } {
    let connected = 0;

    for (const bridge of this.bridges.values()) {
      if (bridge.isConnected()) {
        connected++;
      }
    }

    return {
      totalBridges: this.bridges.size,
      connectedBridges: connected,
      totalBroadcasts: 0, // TODO: track broadcasts
    };
  }
}
