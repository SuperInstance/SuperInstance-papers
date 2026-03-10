/**
 * @file telemetry/Aggregator.ts
 * @brief Event aggregation, rollup calculations, and statistics generation
 *
 * This file implements event aggregation functionality including time-based windowing,
 * rollup calculations, data sampling, and statistical analysis for the telemetry system.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import {
  BaseEvent,
  EventCategory,
  AggregatedStats,
  AnonymousUserId,
  SessionId,
  Timestamp,
} from './types.js';

/**
 * Time window configuration
 */
interface TimeWindow {
  start: Timestamp;
  end: Timestamp;
  duration: number; // milliseconds
}

/**
 * Aggregation key
 */
interface AggregationKey {
  category: EventCategory;
  eventType: string;
  timeWindow: string; // ISO format of window start
}

/**
 * Aggregated value
 */
interface AggregatedValue {
  count: number;
  uniqueUsers: Set<AnonymousUserId>;
  uniqueSessions: Set<SessionId>;
  sumDuration?: number;
  minDuration?: number;
  maxDuration?: number;
  durations: number[];
}

/**
 * Rollup configuration
 */
export interface RollupConfig {
  /** Window size in milliseconds */
  windowSize: number;

  /** Time windows to roll up */
  windows: ('hour' | 'day' | 'week' | 'month' | 'quarter' | 'year')[];

  /** Enable sampling */
  enableSampling: boolean;

  /** Sampling rate (0-1) */
  samplingRate: number;

  /** Sampling strategy */
  samplingStrategy: 'random' | 'consistent_hash' | 'adaptive';

  /** Maximum events per window before sampling */
  maxEventsPerWindow: number;
}

/**
 * Aggregator class
 * Handles event aggregation and statistics generation
 */
export class Aggregator {
  private readonly config: RollupConfig;
  private readonly aggregations: Map<AggregationKey, AggregatedValue>;
  private readonly eventHistory: BaseEvent[];
  private readonly windowCache: Map<string, TimeWindow>;

  /**
   * Create a new Aggregator
   * @param config - Rollup configuration
   */
  constructor(config?: Partial<RollupConfig>) {
    this.config = this.mergeConfig(config);
    this.aggregations = new Map();
    this.eventHistory = [];
    this.windowCache = new Map();
  }

  /**
   * Merge user config with defaults
   * @param config - User configuration
   * @returns Merged configuration
   */
  private mergeConfig(config?: Partial<RollupConfig>): RollupConfig {
    return {
      windowSize: config?.windowSize || 60000, // 1 minute default
      windows: config?.windows || ['hour', 'day', 'week'],
      enableSampling: config?.enableSampling ?? true,
      samplingRate: config?.samplingRate ?? 1.0,
      samplingStrategy: config?.samplingStrategy || 'random',
      maxEventsPerWindow: config?.maxEventsPerWindow || 10000,
    };
  }

  /**
   * Add events to aggregation
   * @param events - Events to aggregate
   */
  aggregate(events: BaseEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }

    this.eventHistory.push(...events);

    // Limit history size
    if (this.eventHistory.length > 100000) {
      this.eventHistory.splice(0, this.eventHistory.length - 100000);
    }
  }

  /**
   * Process a single event
   * @param event - Event to process
   */
  private processEvent(event: BaseEvent): void {
    // Apply sampling if enabled
    if (this.config.enableSampling && this.shouldSample(event)) {
      return;
    }

    // Get time window for event
    const window = this.getTimeWindow(event.timestamp, this.config.windowSize);
    const windowKey = window.start.toISOString();

    // Create aggregation key
    const key: AggregationKey = {
      category: event.category,
      eventType: event.type,
      timeWindow: windowKey,
    };

    // Get or create aggregated value
    let aggValue = this.aggregations.get(key);
    if (!aggValue) {
      aggValue = {
        count: 0,
        uniqueUsers: new Set(),
        uniqueSessions: new Set(),
        durations: [],
      };
      this.aggregations.set(key, aggValue);
    }

    // Update aggregated value
    aggValue.count++;
    aggValue.uniqueUsers.add(event.userId);
    aggValue.uniqueSessions.add(event.sessionId);

    // Track duration if present
    if (event.properties && 'duration' in event.properties) {
      const duration = event.properties.duration as number;
      aggValue.durations.push(duration);

      if (aggValue.sumDuration === undefined) {
        aggValue.sumDuration = 0;
        aggValue.minDuration = duration;
        aggValue.maxDuration = duration;
      } else {
        aggValue.sumDuration += duration;
        aggValue.minDuration = Math.min(aggValue.minDuration, duration);
        aggValue.maxDuration = Math.max(aggValue.maxDuration, duration);
      }
    }
  }

  /**
   * Determine if event should be sampled
   * @param event - Event to check
   * @returns Whether to sample (skip) this event
   */
  private shouldSample(event: BaseEvent): boolean {
    if (this.config.samplingRate >= 1.0) {
      return false;
    }

    switch (this.config.samplingStrategy) {
      case 'random':
        return Math.random() > this.config.samplingRate;

      case 'consistent_hash':
        const hash = this.hashString(event.userId + event.type);
        return (hash % 100) / 100 > this.config.samplingRate;

      case 'adaptive':
        // Sample low priority events more aggressively
        const priorityFactor = event.priority === 'low' ? 0.5 : 1.0;
        return Math.random() > this.config.samplingRate * priorityFactor;

      default:
        return false;
    }
  }

  /**
   * Hash a string to a number
   * @param str - String to hash
   * @returns Hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get time window for a timestamp
   * @param timestamp - Event timestamp
   * @param windowSize - Window size in milliseconds
   * @returns Time window
   */
  private getTimeWindow(timestamp: Timestamp, windowSize: number): TimeWindow {
    const cacheKey = `${timestamp}_${windowSize}`;
    const cached = this.windowCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const date = new Date(timestamp);
    const windowStart = Math.floor(date.getTime() / windowSize) * windowSize;
    const windowEnd = windowStart + windowSize;

    const window: TimeWindow = {
      start: new Date(windowStart).toISOString() as Timestamp,
      end: new Date(windowEnd).toISOString() as Timestamp,
      duration: windowSize,
    };

    this.windowCache.set(cacheKey, window);
    return window;
  }

  /**
   * Get aggregated statistics for a time window
   * @param start - Window start
   * @param end - Window end
   * @returns Aggregated statistics
   */
  getStats(start: Timestamp, end: Timestamp): AggregatedStats {
    const windowEvents = this.eventHistory.filter(
      e => e.timestamp >= start && e.timestamp < end
    );

    const eventsByCategory: Record<EventCategory, number> = {
      [EventCategory.UI]: 0,
      [EventCategory.CELL]: 0,
      [EventCategory.PERFORMANCE]: 0,
      [EventCategory.ERROR]: 0,
      [EventCategory.FEATURE]: 0,
      [EventCategory.LIFECYCLE]: 0,
      [EventCategory.COLLABORATION]: 0,
      [EventCategory.SECURITY]: 0,
      [EventCategory.CUSTOM]: 0,
    };

    const eventsByType: Record<string, number> = {};
    const uniqueUsers = new Set<AnonymousUserId>();
    const durations: number[] = [];
    const errorCount = windowEvents.filter(e => e.category === EventCategory.ERROR).length;

    for (const event of windowEvents) {
      eventsByCategory[event.category]++;
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      uniqueUsers.add(event.userId);

      if (event.properties && 'duration' in event.properties) {
        durations.push(event.properties.duration as number);
      }
    }

    const sortedDurations = durations.sort((a, b) => a - b);

    return {
      windowStart: start,
      windowEnd: end,
      totalEvents: windowEvents.length,
      eventsByCategory,
      eventsByType,
      uniqueUsers: uniqueUsers.size,
      avgEventsPerUser: windowEvents.length / uniqueUsers.size || 0,
      errorRate: windowEvents.length > 0 ? errorCount / windowEvents.length : 0,
      performance: {
        avgDuration: this.average(durations),
        p50Duration: this.percentile(sortedDurations, 50),
        p95Duration: this.percentile(sortedDurations, 95),
        p99Duration: this.percentile(sortedDurations, 99),
      },
    };
  }

  /**
   * Calculate rollup for a specific time period
   * @param period - Time period ('hour', 'day', 'week', 'month', 'quarter', 'year')
   * @param timestamp - Timestamp within the period
   * @returns Rollup statistics
   */
  rollup(period: string, timestamp: Timestamp): AggregatedStats {
    const date = new Date(timestamp);
    let start: Date;
    let end: Date;

    switch (period) {
      case 'hour':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0);
        end = new Date(start.getTime() + 60 * 60 * 1000);
        break;

      case 'day':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;

      case 'week':
        const dayOfWeek = date.getDay();
        start = new Date(date.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;

      case 'month':
        start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0);
        break;

      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3);
        start = new Date(date.getFullYear(), quarter * 3, 1, 0, 0, 0);
        end = new Date(date.getFullYear(), (quarter + 1) * 3, 1, 0, 0, 0);
        break;

      case 'year':
        start = new Date(date.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(date.getFullYear() + 1, 0, 1, 0, 0, 0);
        break;

      default:
        throw new Error(`Invalid period: ${period}`);
    }

    return this.getStats(start.toISOString() as Timestamp, end.toISOString() as Timestamp);
  }

  /**
   * Get time series data for a metric
   * @param eventType - Event type to track
   * @param start - Start timestamp
   * @param end - End timestamp
   * @param interval - Interval in milliseconds
   * @returns Time series data
   */
  getTimeSeries(
    eventType: string,
    start: Timestamp,
    end: Timestamp,
    interval: number
  ): Array<{ timestamp: Timestamp; count: number; uniqueUsers: number }> {
    const series: Array<{ timestamp: Timestamp; count: number; uniqueUsers: number }> = [];

    let currentStart = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    while (currentStart < endTime) {
      const currentEnd = Math.min(currentStart + interval, endTime);
      const windowEvents = this.eventHistory.filter(
        e =>
          e.type === eventType &&
          e.timestamp >= new Date(currentStart).toISOString() &&
          e.timestamp < new Date(currentEnd).toISOString()
      );

      const uniqueUsers = new Set(windowEvents.map(e => e.userId));

      series.push({
        timestamp: new Date(currentStart).toISOString() as Timestamp,
        count: windowEvents.length,
        uniqueUsers: uniqueUsers.size,
      });

      currentStart = currentEnd;
    }

    return series;
  }

  /**
   * Get top events by count
   * @param limit - Maximum number of events to return
   * @returns Top events
   */
  getTopEvents(limit = 10): Array<{ type: string; count: number; uniqueUsers: number }> {
    const eventCounts = new Map<string, { count: number; uniqueUsers: Set<AnonymousUserId> }>();

    for (const event of this.eventHistory) {
      let entry = eventCounts.get(event.type);
      if (!entry) {
        entry = { count: 0, uniqueUsers: new Set() };
        eventCounts.set(event.type, entry);
      }
      entry.count++;
      entry.uniqueUsers.add(event.userId);
    }

    return Array.from(eventCounts.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        uniqueUsers: data.uniqueUsers.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate average of numbers
   * @param values - Array of numbers
   * @returns Average or 0 if empty
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile of sorted numbers
   * @param sortedValues - Sorted array of numbers
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value or 0 if empty
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.floor((percentile / 100) * sortedValues.length);
    return sortedValues[Math.min(index, sortedValues.length - 1)];
  }

  /**
   * Clear all aggregated data
   */
  clear(): void {
    this.aggregations.clear();
    this.eventHistory.length = 0;
    this.windowCache.clear();
  }

  /**
   * Get aggregation statistics
   * @returns Aggregation statistics
   */
  getAggregationStats(): {
    totalAggregations: number;
    totalEvents: number;
    memoryUsage: {
      aggregations: number;
      history: number;
      cache: number;
    };
  } {
    return {
      totalAggregations: this.aggregations.size,
      totalEvents: this.eventHistory.length,
      memoryUsage: {
        aggregations: this.estimateSize(this.aggregations),
        history: this.estimateSize(this.eventHistory),
        cache: this.estimateSize(this.windowCache),
      },
    };
  }

  /**
   * Estimate size of a data structure in bytes
   * @param obj - Object to measure
   * @returns Estimated size in bytes
   */
  private estimateSize(obj: unknown): number {
    return JSON.stringify(obj, (_, value) => {
      if (value instanceof Set || value instanceof Map) {
        return Array.from(value.entries());
      }
      return value;
    }).length * 2; // Approximate bytes (2 bytes per char)
  }
}

/**
 * Default rollup configuration
 */
export const DEFAULT_ROLLUP_CONFIG: RollupConfig = {
  windowSize: 60000, // 1 minute
  windows: ['hour', 'day', 'week'],
  enableSampling: true,
  samplingRate: 1.0,
  samplingStrategy: 'random',
  maxEventsPerWindow: 10000,
};
