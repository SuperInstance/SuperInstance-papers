/**
 * WebSocket integration for pattern recognition
 *
 * Integrates pattern detection with WebSocket server for real-time updates.
 */

import { WebSocketHandler } from '../../api/handlers/WebSocketHandler';
import { PatternEventBus, PatternEvent, patternEventBus } from './websocket-types';
import { PatternCell } from './PatternCell';
import { DetectedPattern } from './PatternDetector';

/**
 * Pattern WebSocket integration options
 */
export interface PatternWebSocketOptions {
  autoBroadcast?: boolean; // Automatically broadcast pattern events
  broadcastInterval?: number; // Throttle broadcast interval (ms)
  includeStatistics?: boolean; // Include statistics in broadcasts
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: PatternWebSocketOptions = {
  autoBroadcast: true,
  broadcastInterval: 1000, // 1 second
  includeStatistics: true
};

/**
 * Pattern WebSocket integration
 */
export class PatternWebSocketIntegration {
  private eventBus: PatternEventBus;
  private wsHandler: WebSocketHandler | null = null;
  private options: PatternWebSocketOptions;
  private lastBroadcastTime: Map<string, number> = new Map();
  private unsubscribers: Array<() => void> = [];

  constructor(
    wsHandler: WebSocketHandler | null = null,
    options: PatternWebSocketOptions = {}
  ) {
    this.eventBus = patternEventBus;
    this.wsHandler = wsHandler;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.autoBroadcast && wsHandler) {
      this.setupEventListeners();
    }
  }

  /**
   * Set up event listeners for pattern events
   */
  private setupEventListeners(): void {
    // Pattern detected
    const patternDetectedUnsub = this.eventBus.on('pattern_detected', (event) => {
      this.handlePatternDetected(event);
    });
    this.unsubscribers.push(patternDetectedUnsub);

    // Pattern alert
    const patternAlertUnsub = this.eventBus.on('pattern_alert', (event) => {
      this.handlePatternAlert(event);
    });
    this.unsubscribers.push(patternAlertUnsub);

    // Pattern statistics
    const patternStatsUnsub = this.eventBus.on('pattern_statistics', (event) => {
      this.handlePatternStatistics(event);
    });
    this.unsubscribers.push(patternStatsUnsub);

    // Pattern acknowledged
    const patternAckUnsub = this.eventBus.on('pattern_acknowledged', (event) => {
      this.handlePatternAcknowledged(event);
    });
    this.unsubscribers.push(patternAckUnsub);

    // Pattern cleared
    const patternClearedUnsub = this.eventBus.on('pattern_cleared', (event) => {
      this.handlePatternCleared(event);
    });
    this.unsubscribers.push(patternClearedUnsub);

    // Options updated
    const optionsUpdatedUnsub = this.eventBus.on('pattern_options_updated', (event) => {
      this.handleOptionsUpdated(event);
    });
    this.unsubscribers.push(optionsUpdatedUnsub);
  }

  /**
   * Handle pattern detected event
   */
  private handlePatternDetected(event: PatternEvent): void {
    if (!this.shouldBroadcast(event)) return;

    const message = {
      type: 'pattern_detected',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Handle pattern alert event
   */
  private handlePatternAlert(event: PatternEvent): void {
    // Always broadcast alerts immediately
    const message = {
      type: 'pattern_alert',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Handle pattern statistics event
   */
  private handlePatternStatistics(event: PatternEvent): void {
    if (!this.options.includeStatistics) return;
    if (!this.shouldBroadcast(event)) return;

    const message = {
      type: 'pattern_statistics',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Handle pattern acknowledged event
   */
  private handlePatternAcknowledged(event: PatternEvent): void {
    const message = {
      type: 'pattern_acknowledged',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Handle pattern cleared event
   */
  private handlePatternCleared(event: PatternEvent): void {
    const message = {
      type: 'pattern_cleared',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Handle options updated event
   */
  private handleOptionsUpdated(event: PatternEvent): void {
    const message = {
      type: 'pattern_options_updated',
      data: event,
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * Check if event should be broadcast (throttling)
   */
  private shouldBroadcast(event: PatternEvent): boolean {
    const cellId = (event as any).cellId;
    if (!cellId) return true;

    const now = Date.now();
    const lastBroadcast = this.lastBroadcastTime.get(cellId) || 0;
    const elapsed = now - lastBroadcast;

    if (elapsed >= this.options.broadcastInterval!) {
      this.lastBroadcastTime.set(cellId, now);
      return true;
    }

    return false;
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: unknown): void {
    if (!this.wsHandler) return;

    try {
      this.wsHandler.broadcast(message);
    } catch (error) {
      console.error('Error broadcasting pattern event:', error);
    }
  }

  /**
   * Attach event listeners to a pattern cell
   */
  attachToCell(cell: PatternCell): void {
    // Emit pattern detected events when patterns are found
    const originalDetect = (cell as any).detectPatterns;
    if (originalDetect) {
      (cell as any).detectPatterns = (...args: unknown[]) => {
        const result = originalDetect.apply(cell, args);
        const patterns = cell.getDetectedPatterns();

        for (const pattern of patterns) {
          this.eventBus.emit({
            type: 'pattern_detected',
            cellId: cell.id,
            targetCellId: (cell as any).config?.targetCellId,
            pattern: {
              type: pattern.type,
              confidence: pattern.confidence,
              description: pattern.description,
              metadata: pattern.metadata
            },
            timestamp: pattern.timestamp
          });
        }

        return result;
      };
    }

    // Emit alert events
    const checkInterval = setInterval(() => {
      const alerts = cell.getAlerts();
      const stats = cell.getStatistics();

      // Emit new alerts
      for (const alert of alerts) {
        this.eventBus.emit({
          type: 'pattern_alert',
          cellId: cell.id,
          alert: {
            id: alert.id,
            patternType: alert.pattern.type,
            confidence: alert.pattern.confidence,
            description: alert.pattern.description,
            severity: alert.severity
          },
          timestamp: alert.timestamp
        });
      }

      // Emit statistics
      if (this.options.includeStatistics) {
        this.eventBus.emit({
          type: 'pattern_statistics',
          cellId: cell.id,
          statistics: {
            totalDetections: stats.totalDetections,
            activeAlerts: stats.activeAlerts,
            patternTypes: Object.fromEntries(stats.patternTypes),
            lastDetection: stats.lastDetection
          },
          timestamp: new Date()
        });
      }
    }, 5000); // Check every 5 seconds

    // Clean up on cell destroy
    const originalDestroy = cell.destroy;
    if (originalDestroy) {
      cell.destroy = () => {
        clearInterval(checkInterval);
        originalDestroy.apply(cell);
      };
    }
  }

  /**
   * Set WebSocket handler
   */
  setWebSocketHandler(wsHandler: WebSocketHandler): void {
    this.wsHandler = wsHandler;
  }

  /**
   * Update options
   */
  setOptions(options: Partial<PatternWebSocketOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.lastBroadcastTime.clear();
  }
}

/**
 * Create pattern WebSocket integration
 */
export function createPatternWebSocketIntegration(
  wsHandler: WebSocketHandler,
  options?: PatternWebSocketOptions
): PatternWebSocketIntegration {
  return new PatternWebSocketIntegration(wsHandler, options);
}
