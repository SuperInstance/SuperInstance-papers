/**
 * WebSocket event types for pattern recognition
 *
 * Defines events for pattern detection, alerts, and notifications.
 */

import { PatternType, DetectedPattern } from './PatternDetector';

/**
 * Pattern detected event
 */
export interface PatternDetectedEvent {
  type: 'pattern_detected';
  cellId: string;
  targetCellId: string;
  pattern: {
    type: PatternType;
    confidence: number;
    description: string;
    metadata: Record<string, unknown>;
  };
  timestamp: Date;
}

/**
 * Pattern alert event
 */
export interface PatternAlertEvent {
  type: 'pattern_alert';
  cellId: string;
  alert: {
    id: string;
    patternType: PatternType;
    confidence: number;
    description: string;
    severity: 'info' | 'warning' | 'critical';
  };
  timestamp: Date;
}

/**
 * Pattern statistics event
 */
export interface PatternStatisticsEvent {
  type: 'pattern_statistics';
  cellId: string;
  statistics: {
    totalDetections: number;
    activeAlerts: number;
    patternTypes: Record<PatternType, number>;
    lastDetection: Date | null;
  };
  timestamp: Date;
}

/**
 * Pattern acknowledged event
 */
export interface PatternAcknowledgedEvent {
  type: 'pattern_acknowledged';
  cellId: string;
  alertId: string;
  timestamp: Date;
}

/**
 * Pattern cleared event
 */
export interface PatternClearedEvent {
  type: 'pattern_cleared';
  cellId: string;
  timestamp: Date;
}

/**
 * Pattern options updated event
 */
export interface PatternOptionsUpdatedEvent {
  type: 'pattern_options_updated';
  cellId: string;
  options: {
    confidenceThreshold?: number;
    minDataPoints?: number;
    alertThreshold?: number;
  };
  timestamp: Date;
}

/**
 * Pattern event union
 */
export type PatternEvent =
  | PatternDetectedEvent
  | PatternAlertEvent
  | PatternStatisticsEvent
  | PatternAcknowledgedEvent
  | PatternClearedEvent
  | PatternOptionsUpdatedEvent;

/**
 * Pattern event handler
 */
export type PatternEventHandler = (event: PatternEvent) => void;

/**
 * Pattern event bus
 */
export class PatternEventBus {
  private handlers: Map<string, Set<PatternEventHandler>> = new Map();

  /**
   * Subscribe to pattern events
   */
  on(eventType: PatternEvent['type'], handler: PatternEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit pattern event
   */
  emit(event: PatternEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in pattern event handler for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Clear handlers for specific event type
   */
  clearType(eventType: PatternEvent['type']): void {
    this.handlers.delete(eventType);
  }
}

/**
 * Global pattern event bus instance
 */
export const patternEventBus = new PatternEventBus();
