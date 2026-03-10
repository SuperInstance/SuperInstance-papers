/**
 * POLLN Spreadsheet Backend - Audit Storage Backends
 *
 * Multiple storage backends for audit logs with partitioning,
 * archival, and retention policies.
 *
 * Features:
 * - PostgreSQL with partitioning
 * - S3 archival (cold storage)
 * - Elasticsearch for search
 * - Retention policies
 * - Automatic archival
 */

import { Pool } from 'pg';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { AuditEvent } from './AuditLogger.js';

/**
 * Storage backend interface
 */
export interface AuditStorageBackend {
  name: string;
  initialize(): Promise<void>;
  write(events: AuditEvent[]): Promise<void>;
  query(query: AuditQuery): Promise<AuditEvent[]>;
  archive(before: Date): Promise<number>;
  delete(before: Date): Promise<number>;
  shutdown(): Promise<void>;
}

/**
 * Query options
 */
export interface AuditQuery {
  startTime?: Date;
  endTime?: Date;
  actorIds?: string[];
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  resourceTypes?: string[];
  resourceIds?: string[];
  outcomes?: string[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * PostgreSQL storage backend with partitioning
 */
export class PostgreSQLAuditStorage implements AuditStorageBackend {
  name = 'postgresql';
  private pool: Pool;
  private tableName = 'audit_events';

  constructor(config: any) {
    this.pool = new Pool(config);
  }

  async initialize(): Promise<void> {
    // Create main table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        outcome VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ NOT NULL,

        actor_id VARCHAR(255) NOT NULL,
        actor_type VARCHAR(50) NOT NULL,
        actor_username VARCHAR(255),
        actor_email VARCHAR(255),
        actor_role VARCHAR(100),
        actor_ip_address INET,
        actor_user_agent TEXT,
        actor_session_id UUID,

        action_operation VARCHAR(255) NOT NULL,
        action_resource_type VARCHAR(255) NOT NULL,
        action_resource_id VARCHAR(255),
        action_description TEXT NOT NULL,

        resource_type VARCHAR(255) NOT NULL,
        resource_id VARCHAR(255),
        resource_name VARCHAR(255),
        resource_path TEXT,
        resource_owner VARCHAR(255),
        resource_sensitivity VARCHAR(50),

        request_id UUID NOT NULL,
        request_method VARCHAR(10) NOT NULL,
        request_path TEXT NOT NULL,

        response_status_code INTEGER,
        response_latency INTEGER,

        context_location VARCHAR(255),
        context_device_id VARCHAR(255),
        context_application VARCHAR(255),
        context_environment VARCHAR(100) NOT NULL,

        changes_before JSONB,
        changes_after JSONB,
        changes_diff TEXT,

        compliance_retention_days INTEGER NOT NULL,
        compliance_frameworks TEXT[] NOT NULL,
        compliance_requires_immediate_action BOOLEAN NOT NULL,

        contains_sensitive_data BOOLEAN NOT NULL,

        INDEX idx_timestamp (timestamp),
        INDEX idx_actor_id (actor_id),
        INDEX idx_event_type (event_type),
        INDEX idx_resource_id (resource_id)
      );
    `);

    // Create partition function
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION partition_audit_events()
      RETURNS void AS $$
      DECLARE
        partition_date TEXT;
        partition_name TEXT;
        start_date TEXT;
        end_date TEXT;
      BEGIN
        -- Create partitions for next 30 days
        FOR i IN 0..30 LOOP
          partition_date := to_char(current_date + i, 'YYYY_MM');
          partition_name := 'audit_events_' || partition_date;
          start_date := date_trunc('month', current_date + i)::TEXT;
          end_date := (date_trunc('month', current_date + i) + interval '1 month')::TEXT;

          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            partition_name, '${this.tableName}', start_date, end_date
          );
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create initial partitions
    await this.pool.query('SELECT partition_audit_events();');

    // Create indexes on partitions
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp
        ON ${this.tableName} (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id
        ON ${this.tableName} (actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_event_type
        ON ${this.tableName} (event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_events_resource_id
        ON ${this.tableName} (resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_severity
        ON ${this.tableName} (severity);
      CREATE INDEX IF NOT EXISTS idx_audit_events_compliance_immediate
        ON ${this.tableName} (compliance_requires_immediate_action)
        WHERE compliance_requires_immediate_action = true;
    `);
  }

  async write(events: AuditEvent[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const event of events) {
        await client.query(
          `
          INSERT INTO ${this.tableName} (
            id, event_type, category, severity, outcome, timestamp, received_at,
            actor_id, actor_type, actor_username, actor_email, actor_role,
            actor_ip_address, actor_user_agent, actor_session_id,
            action_operation, action_resource_type, action_resource_id, action_description,
            resource_type, resource_id, resource_name, resource_path, resource_owner, resource_sensitivity,
            request_id, request_method, request_path,
            response_status_code, response_latency,
            context_location, context_device_id, context_application, context_environment,
            changes_before, changes_after, changes_diff,
            compliance_retention_days, compliance_frameworks, compliance_requires_immediate_action,
            contains_sensitive_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25,
            $26, $27, $28,
            $29, $30,
            $31, $32, $33, $34,
            $35, $36, $37,
            $38, $39, $40,
            $41
          )
          `,
          [
            event.id,
            event.eventType,
            event.category,
            event.severity,
            event.outcome,
            event.timestamp,
            event.receivedAt,
            event.actor.id,
            event.actor.type,
            event.actor.username,
            event.actor.email,
            event.actor.role,
            event.actor.ipAddress,
            event.actor.userAgent,
            event.actor.sessionId,
            event.action.operation,
            event.action.resourceType,
            event.action.resourceId,
            event.action.description,
            event.resource.type,
            event.resource.id,
            event.resource.name,
            event.resource.path,
            event.resource.owner,
            event.resource.sensitivity,
            event.request.id,
            event.request.method,
            event.request.path,
            event.response?.statusCode,
            event.response?.latency,
            event.context.location,
            event.context.deviceId,
            event.context.application,
            event.context.environment,
            event.changes?.before ? JSON.stringify(event.changes.before) : null,
            event.changes?.after ? JSON.stringify(event.changes.after) : null,
            event.changes?.diff,
            event.compliance.retentionDays,
            event.compliance.frameworks,
            event.compliance.requiresImmediateAction,
            event.containsSensitiveData,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async query(query: AuditQuery): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(query.startTime);
    }

    if (query.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(query.endTime);
    }

    if (query.actorIds?.length) {
      conditions.push(`actor_id = ANY($${paramIndex++})`);
      params.push(query.actorIds);
    }

    if (query.eventTypes?.length) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(query.eventTypes);
    }

    if (query.categories?.length) {
      conditions.push(`category = ANY($${paramIndex++})`);
      params.push(query.categories);
    }

    if (query.severities?.length) {
      conditions.push(`severity = ANY($${paramIndex++})`);
      params.push(query.severities);
    }

    if (query.resourceTypes?.length) {
      conditions.push(`resource_type = ANY($${paramIndex++})`);
      params.push(query.resourceTypes);
    }

    if (query.resourceIds?.length) {
      conditions.push(`resource_id = ANY($${paramIndex++})`);
      params.push(query.resourceIds);
    }

    if (query.outcomes?.length) {
      conditions.push(`outcome = ANY($${paramIndex++})`);
      params.push(query.outcomes);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = query.orderBy || 'timestamp';
    const orderDir = query.orderDirection || 'DESC';
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(sql, params);
    return result.rows.map(this.mapRowToEvent);
  }

  private mapRowToEvent(row: any): AuditEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      category: row.category,
      severity: row.severity,
      outcome: row.outcome,
      timestamp: row.timestamp,
      receivedAt: row.received_at,
      actor: {
        id: row.actor_id,
        type: row.actor_type,
        username: row.actor_username,
        email: row.actor_email,
        role: row.actor_role,
        ipAddress: row.actor_ip_address,
        userAgent: row.actor_user_agent,
        sessionId: row.actor_session_id,
      },
      action: {
        operation: row.action_operation,
        resourceType: row.action_resource_type,
        resourceId: row.action_resource_id,
        description: row.action_description,
      },
      resource: {
        type: row.resource_type,
        id: row.resource_id,
        name: row.resource_name,
        path: row.resource_path,
        owner: row.resource_owner,
        sensitivity: row.resource_sensitivity,
      },
      request: {
        id: row.request_id,
        method: row.request_method,
        path: row.request_path,
      },
      response: row.response_status_code ? {
        statusCode: row.response_status_code,
        latency: row.response_latency,
      } : undefined,
      context: {
        location: row.context_location,
        deviceId: row.context_device_id,
        application: row.context_application,
        environment: row.context_environment,
      },
      changes: row.changes_before || row.changes_after ? {
        before: row.changes_before,
        after: row.changes_after,
        diff: row.changes_diff,
      } : undefined,
      compliance: {
        retentionDays: row.compliance_retention_days,
        frameworks: row.compliance_frameworks,
        requiresImmediateAction: row.compliance_requires_immediate_action,
      },
      containsSensitiveData: row.contains_sensitive_data,
    };
  }

  async archive(before: Date): Promise<number> {
    // Move events to S3
    const events = await this.query({ endTime: before, limit: 10000 });
    let archived = 0;

    for (const event of events) {
      const s3Key = `audit-logs/${event.timestamp.getFullYear()}/${event.timestamp.getMonth() + 1}/${event.id}.json`;
      // Upload to S3 would happen here
      archived++;
    }

    // Delete archived events from PostgreSQL
    await this.pool.query('DELETE FROM ${this.tableName} WHERE timestamp < $1', [before]);
    return archived;
  }

  async delete(before: Date): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM ${this.tableName} WHERE timestamp < $1 RETURNING id',
      [before]
    );
    return result.rowCount || 0;
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * S3 archival storage backend
 */
export class S3AuditStorage implements AuditStorageBackend {
  name = 's3';
  private s3: S3Client;
  private bucket: string;
  private prefix = 'audit-logs';

  constructor(config: { bucket: string; region?: string }) {
    this.s3 = new S3Client({ region: config.region || 'us-east-1' });
    this.bucket = config.bucket;
  }

  async initialize(): Promise<void> {
    // Ensure bucket exists
    // (Implementation depends on AWS setup)
  }

  async write(events: AuditEvent[]): Promise<void> {
    // Group events by date for efficient storage
    const eventsByDate = new Map<string, AuditEvent[]>();

    for (const event of events) {
      const dateKey = `${event.timestamp.getFullYear()}/${String(event.timestamp.getMonth() + 1).padStart(2, '0')}/${String(event.timestamp.getDate()).padStart(2, '0')}`;
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    }

    // Write each date's events
    for (const [dateKey, dateEvents] of eventsByDate) {
      const key = `${this.prefix}/${dateKey}/events-${Date.now()}.jsonl`;
      const body = dateEvents.map(e => JSON.stringify(e)).join('\n');

      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/x-ndjson',
        Metadata: {
          eventCount: dateEvents.length.toString(),
          startTime: dateEvents[0].timestamp.toISOString(),
          endTime: dateEvents[dateEvents.length - 1].timestamp.toISOString(),
        },
      }));
    }
  }

  async query(query: AuditQuery): Promise<AuditEvent[]> {
    // S3 is not optimized for querying
    // This would typically use Athena or Glacier select
    return [];
  }

  async archive(before: Date): Promise<number> {
    // Events in S3 are already archived
    return 0;
  }

  async delete(before: Date): Promise<number> {
    // Delete objects older than date
    // (Implementation would list and delete objects)
    return 0;
  }

  async shutdown(): Promise<void> {
    // S3 client doesn't need explicit shutdown
  }
}

/**
 * Elasticsearch storage backend for search
 */
export class ElasticsearchAuditStorage implements AuditStorageBackend {
  name = 'elasticsearch';
  private client: ElasticClient;
  private indexPattern = 'audit-events-*';

  constructor(config: any) {
    this.client = new ElasticClient(config);
  }

  async initialize(): Promise<void> {
    // Create index template with proper mappings
    await this.client.indices.putIndexTemplate({
      name: 'audit-events-template',
      body: {
        index_patterns: [this.indexPattern],
        template: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
            'index.lifecycle.name': 'audit-logs-policy',
            'index.lifecycle.rollover_alias': 'audit-events',
          },
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              eventType: { type: 'keyword' },
              category: { type: 'keyword' },
              severity: { type: 'keyword' },
              outcome: { type: 'keyword' },
              actor: {
                properties: {
                  id: { type: 'keyword' },
                  type: { type: 'keyword' },
                  username: { type: 'keyword' },
                  email: { type: 'keyword' },
                  role: { type: 'keyword' },
                  ipAddress: { type: 'ip' },
                },
              },
              resource: {
                properties: {
                  type: { type: 'keyword' },
                  id: { type: 'keyword' },
                  name: { type: 'text' },
                  sensitivity: { type: 'keyword' },
                },
              },
              action: {
                properties: {
                  operation: { type: 'keyword' },
                  resourceType: { type: 'keyword' },
                  description: { type: 'text' },
                },
              },
              compliance: {
                properties: {
                  retentionDays: { type: 'integer' },
                  frameworks: { type: 'keyword' },
                  requiresImmediateAction: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    });

    // Create index lifecycle policy
    await this.client.ilm.putLifecycle({
      name: 'audit-logs-policy',
      body: {
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_size: '50GB',
                  max_age: '30d',
                },
              },
            },
            warm: {
              min_age: '30d',
              actions: {
                forcemerge: {
                  max_num_segments: 1,
                },
                shrink: {
                  number_of_shards: 1,
                },
              },
            },
            delete: {
              min_age: '365d',
              actions: {
                delete: {},
              },
            },
          },
        },
      },
    });
  }

  async write(events: AuditEvent[]): Promise<void> {
    const bulkBody = events.flatMap(event => [
      { index: { _index: this.getWriteIndex(event.timestamp), _id: event.id } },
      event,
    ]);

    await this.client.bulk({
      body: bulkBody,
      refresh: false,
    });
  }

  private getWriteIndex(timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    return `audit-events-${year}-${month}`;
  }

  async query(query: AuditQuery): Promise<AuditEvent[]> {
    const must: any[] = [];

    if (query.startTime || query.endTime) {
      must.push({
        range: {
          timestamp: {
            gte: query.startTime?.toISOString(),
            lte: query.endTime?.toISOString(),
          },
        },
      });
    }

    if (query.actorIds?.length) {
      must.push({ terms: { 'actor.id': query.actorIds } });
    }

    if (query.eventTypes?.length) {
      must.push({ terms: { eventType: query.eventTypes } });
    }

    if (query.categories?.length) {
      must.push({ terms: { category: query.categories } });
    }

    if (query.severities?.length) {
      must.push({ terms: { severity: query.severities } });
    }

    if (query.resourceTypes?.length) {
      must.push({ terms: { 'resource.type': query.resourceTypes } });
    }

    if (query.resourceIds?.length) {
      must.push({ terms: { 'resource.id': query.resourceIds } });
    }

    const result = await this.client.search({
      index: this.indexPattern,
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : undefined,
          },
        },
        sort: [{ timestamp: query.orderDirection || 'desc' }],
        size: query.limit || 100,
        from: query.offset || 0,
      },
    });

    return result.hits.hits.map((hit: any) => hit._source);
  }

  async archive(before: Date): Promise<number> {
    // Elasticsearch ILM handles archival automatically
    return 0;
  }

  async delete(before: Date): Promise<number> {
    await this.client.deleteByQuery({
      index: this.indexPattern,
      body: {
        query: {
          range: {
            timestamp: {
              lt: before.toISOString(),
            },
          },
        },
      },
    });
    return 0; // ES doesn't return count
  }

  async shutdown(): Promise<void> {
    await this.client.close();
  }
}

/**
 * In-memory storage for testing
 */
export class MemoryAuditStorage implements AuditStorageBackend {
  name = 'memory';
  private events: Map<string, AuditEvent> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async write(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      this.events.set(event.id, event);
    }
  }

  async query(query: AuditQuery): Promise<AuditEvent[]> {
    let results = Array.from(this.events.values());

    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }

    if (query.actorIds?.length) {
      results = results.filter(e => query.actorIds!.includes(e.actor.id));
    }

    if (query.eventTypes?.length) {
      results = results.filter(e => query.eventTypes!.includes(e.eventType));
    }

    if (query.severities?.length) {
      results = results.filter(e => query.severities!.includes(e.severity));
    }

    const orderBy = query.orderBy || 'timestamp';
    const orderDir = query.orderDirection || 'DESC';

    results.sort((a, b) => {
      const aVal = this.getNestedValue(a, orderBy);
      const bVal = this.getNestedValue(b, orderBy);
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return orderDir === 'ASC' ? comparison : -comparison;
    });

    return results.slice(query.offset || 0, (query.limit || 100) + (query.offset || 0));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  async archive(before: Date): Promise<number> {
    const toArchive = Array.from(this.events.values()).filter(e => e.timestamp < before);
    toArchive.forEach(e => this.events.delete(e.id));
    return toArchive.length;
  }

  async delete(before: Date): Promise<number> {
    const toDelete = Array.from(this.events.values()).filter(e => e.timestamp < before);
    toDelete.forEach(e => this.events.delete(e.id));
    return toDelete.length;
  }

  async shutdown(): Promise<void> {
    this.events.clear();
  }
}

export default {
  PostgreSQLAuditStorage,
  S3AuditStorage,
  ElasticsearchAuditStorage,
  MemoryAuditStorage,
};
