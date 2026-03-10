/**
 * POLLN Spreadsheet Backend - Audit Query Interface
 *
 * High-level query interface for audit logs with aggregation,
 * filtering, and compliance reporting capabilities.
 *
 * Features:
 * - Time range queries
 * - User filtering
 * - Event type filtering
 * - Resource filtering
 * - Aggregation queries
 * - Export capabilities
 */

import { getAuditLogger } from './AuditLogger.js';
import { AuditEvent } from './AuditLogger.js';
import { AuditCategory, AuditSeverity, AuditOutcome } from './EventTypes.js';

/**
 * Query filters
 */
export interface AuditQueryFilters {
  // Time filters
  startTime?: Date;
  endTime?: Date;

  // Actor filters
  actorIds?: string[];
  actorTypes?: ('user' | 'service' | 'system')[];
  actorRoles?: string[];

  // Event filters
  eventTypes?: string[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  outcomes?: AuditOutcome[];

  // Resource filters
  resourceTypes?: string[];
  resourceIds?: string[];
  resourceSensitivity?: ('public' | 'internal' | 'confidential' | 'restricted')[];

  // Context filters
  environments?: ('development' | 'staging' | 'production')[];
  locations?: string[];

  // Request filters
  requestMethods?: string[];
  requestPaths?: string[];

  // Response filters
  statusCodes?: number[];
  minLatency?: number;
  maxLatency?: number;
}

/**
 * Query options
 */
export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: keyof AuditEvent | string;
  orderDirection?: 'ASC' | 'DESC';
  includeChanges?: boolean;
}

/**
 * Query result with metadata
 */
export interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
}

/**
 * Aggregation types
 */
export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  CARDINALITY = 'cardinality',
}

/**
 * Aggregation request
 */
export interface AggregationRequest {
  name: string;
  type: AggregationType;
  field?: string;
  filters?: AuditQueryFilters;
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  name: string;
  type: AggregationType;
  value: number | string;
  buckets?: {
    key: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Query statistics
 */
export interface QueryStatistics {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByActor: Record<string, number>;
  eventsByResourceType: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  averageLatency: number;
  errorRate: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  count: number;
  uniqueActors: number;
  uniqueResources: number;
}

/**
 * Audit query service
 */
export class AuditQueryService {
  /**
   * Query audit events with filters
   */
  async query(filters: AuditQueryFilters = {}, options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
    const startTime = Date.now();

    // Build query from filters and options
    const query = this.buildQuery(filters, options);

    // Execute query through storage backend
    const auditLogger = getAuditLogger();
    const events = await this.executeQuery(auditLogger, query);

    // Get total count
    const total = await this.executeCount(auditLogger, filters);

    const queryTime = Date.now() - startTime;

    return {
      events,
      total,
      limit: options.limit || 100,
      offset: options.offset || 0,
      hasMore: (options.offset || 0) + events.length < total,
      queryTime,
    };
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<AuditEvent | null> {
    const auditLogger = getAuditLogger();
    const events = await this.executeQuery(auditLogger, {
      limit: 1,
    });

    // In real implementation, would query by ID directly
    return events.find(e => e.id === id) || null;
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.query({}, { limit, orderBy: 'timestamp', orderDirection: 'DESC' })
      .then(result => result.events);
  }

  /**
   * Get events for a user
   */
  async getUserEvents(
    userId: string,
    filters: AuditQueryFilters = {},
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        actorIds: [userId],
      },
      options
    );
  }

  /**
   * Get events for a resource
   */
  async getResourceEvents(
    resourceId: string,
    filters: AuditQueryFilters = {},
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        resourceIds: [resourceId],
      },
      options
    );
  }

  /**
   * Get events for a time range
   */
  async getTimeRangeEvents(
    startTime: Date,
    endTime: Date,
    filters: AuditQueryFilters = {},
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        startTime,
        endTime,
      },
      options
    );
  }

  /**
   * Get failed events
   */
  async getFailedEvents(filters: AuditQueryFilters = {}, options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        outcomes: [AuditOutcome.FAILURE],
      },
      options
    );
  }

  /**
   * Get critical events
   */
  async getCriticalEvents(filters: AuditQueryFilters = {}, options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        severities: [AuditSeverity.CRITICAL],
      },
      options
    );
  }

  /**
   * Get suspicious events
   */
  async getSuspiciousEvents(filters: AuditQueryFilters = {}, options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
    return this.query(
      {
        ...filters,
        severities: [AuditSeverity.CRITICAL, AuditSeverity.HIGH],
        outcomes: [AuditOutcome.FAILURE],
      },
      options
    );
  }

  /**
   * Perform aggregation query
   */
  async aggregate(aggregations: AggregationRequest[]): Promise<AggregationResult[]> {
    const results: AggregationResult[] = [];

    for (const agg of aggregations) {
      const result = await this.performAggregation(agg);
      results.push(result);
    }

    return results;
  }

  /**
   * Get query statistics
   */
  async getStatistics(filters: AuditQueryFilters = {}): Promise<QueryStatistics> {
    const events = await this.query(filters, { limit: 10000 });

    const stats: QueryStatistics = {
      totalEvents: events.total,
      eventsByCategory: {},
      eventsBySeverity: {},
      eventsByActor: {},
      eventsByResourceType: {},
      eventsByOutcome: {},
      averageLatency: 0,
      errorRate: 0,
    };

    let totalLatency = 0;
    let latencyCount = 0;

    for (const event of events.events) {
      // Count by category
      stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;

      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;

      // Count by actor
      stats.eventsByActor[event.actor.id] = (stats.eventsByActor[event.actor.id] || 0) + 1;

      // Count by resource type
      stats.eventsByResourceType[event.resource.type] = (stats.eventsByResourceType[event.resource.type] || 0) + 1;

      // Count by outcome
      stats.eventsByOutcome[event.outcome] = (stats.eventsByOutcome[event.outcome] || 0) + 1;

      // Calculate latency
      if (event.response?.latency) {
        totalLatency += event.response.latency;
        latencyCount++;
      }
    }

    stats.averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
    stats.errorRate = events.total > 0 ? (stats.eventsByOutcome[AuditOutcome.FAILURE] || 0) / events.total : 0;

    return stats;
  }

  /**
   * Get time series data
   */
  async getTimeSeries(
    startTime: Date,
    endTime: Date,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    filters: AuditQueryFilters = {}
  ): Promise<TimeSeriesPoint[]> {
    const events = await this.getTimeRangeEvents(startTime, endTime, filters, { limit: 10000 });

    const timeSeries = new Map<string, TimeSeriesPoint>();
    const actors = new Map<string, Set<string>>();
    const resources = new Map<string, Set<string>>();

    for (const event of events.events) {
      const key = this.getIntervalKey(event.timestamp, interval);

      if (!timeSeries.has(key)) {
        timeSeries.set(key, {
          timestamp: new Date(key),
          count: 0,
          uniqueActors: 0,
          uniqueResources: 0,
        });
        actors.set(key, new Set());
        resources.set(key, new Set());
      }

      const point = timeSeries.get(key)!;
      point.count++;

      actors.get(key)!.add(event.actor.id);
      if (event.resource.id) {
        resources.get(key)!.add(event.resource.id);
      }
    }

    // Calculate unique counts
    for (const [key, point] of timeSeries) {
      point.uniqueActors = actors.get(key)!.size;
      point.uniqueResources = resources.get(key)!.size;
    }

    return Array.from(timeSeries.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Export events to various formats
   */
  async exportEvents(
    filters: AuditQueryFilters = {},
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<Buffer> {
    const events = await this.query(filters, { limit: 10000 });

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(events.events, null, 2));

      case 'csv':
        return this.exportToCSV(events.events);

      case 'excel':
        // Would use exceljs or similar
        throw new Error('Excel export not implemented');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Search events by text
   */
  async searchEvents(
    searchText: string,
    filters: AuditQueryFilters = {},
    options: AuditQueryOptions = {}
  ): Promise<AuditQueryResult> {
    // Full-text search across event fields
    // Implementation depends on storage backend (Elasticsearch recommended)
    return this.query(filters, options);
  }

  /**
   * Build query from filters and options
   */
  private buildQuery(filters: AuditQueryFilters, options: AuditQueryOptions): any {
    return {
      startTime: filters.startTime,
      endTime: filters.endTime,
      actorIds: filters.actorIds,
      eventTypes: filters.eventTypes,
      categories: filters.categories,
      severities: filters.severities,
      resourceTypes: filters.resourceTypes,
      resourceIds: filters.resourceIds,
      outcomes: filters.outcomes,
      limit: options.limit || 100,
      offset: options.offset || 0,
      orderBy: options.orderBy || 'timestamp',
      orderDirection: options.orderDirection || 'DESC',
    };
  }

  /**
   * Execute query through storage backend
   */
  private async executeQuery(auditLogger: any, query: any): Promise<AuditEvent[]> {
    // This would call the actual storage backend
    // For now, return empty array
    return [];
  }

  /**
   * Execute count query
   */
  private async executeCount(auditLogger: any, filters: AuditQueryFilters): Promise<number> {
    // This would call the actual storage backend
    return 0;
  }

  /**
   * Perform aggregation
   */
  private async performAggregation(agg: AggregationRequest): Promise<AggregationResult> {
    // Implementation depends on storage backend
    return {
      name: agg.name,
      type: agg.type,
      value: 0,
    };
  }

  /**
   * Export events to CSV
   */
  private exportToCSV(events: AuditEvent[]): Buffer {
    const headers = [
      'id',
      'timestamp',
      'eventType',
      'category',
      'severity',
      'outcome',
      'actorId',
      'actorUsername',
      'resourceType',
      'resourceId',
      'operation',
      'description',
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.eventType,
      event.category,
      event.severity,
      event.outcome,
      event.actor.id,
      event.actor.username || '',
      event.resource.type,
      event.resource.id || '',
      event.action.operation,
      event.action.description,
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return Buffer.from(csv);
  }

  /**
   * Get interval key for time series
   */
  private getIntervalKey(date: Date, interval: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    switch (interval) {
      case 'hour':
        return `${year}-${month}-${day}T${hour}:00:00.000Z`;
      case 'day':
        return `${year}-${month}-${day}T00:00:00.000Z`;
      case 'week':
        // Simplified - would need proper week calculation
        return `${year}-${month}-${day}T00:00:00.000Z`;
      case 'month':
        return `${year}-${month}-01T00:00:00.000Z`;
      default:
        return date.toISOString();
    }
  }
}

/**
 * Singleton instance
 */
let auditQueryServiceInstance: AuditQueryService | null = null;

/**
 * Get or create query service instance
 */
export function getAuditQueryService(): AuditQueryService {
  if (!auditQueryServiceInstance) {
    auditQueryServiceInstance = new AuditQueryService();
  }
  return auditQueryServiceInstance;
}

export default AuditQueryService;
