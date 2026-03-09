# Analytics & Data Pipeline Architecture for POLLN

**Date:** 2026-03-09
**Mission:** Comprehensive analytics infrastructure for LOG spreadsheet product
**Status:** ARCHITECTURE SPECIFICATION
**Version:** 1.0

---

## Executive Summary

This document defines the analytics and data pipeline architecture for POLLN's spreadsheet product. The system is designed to:

1. **Capture every cell interaction** with zero impact on user experience
2. **Enable real-time analytics** for product insights and user behavior
3. **Support batch analysis** for deep-dive investigations
4. **Maintain privacy compliance** with GDPR/CCPA-ready design
5. **Optimize costs** through intelligent data lifecycle management

**Key Design Principle:** Analytics should be invisible to users but invaluable to the product team.

---

## Table of Contents

1. [Event Collection](#1-event-collection)
2. [Data Warehouse](#2-data-warehouse)
3. [ETL/ELT Pipeline](#3-etlelt-pipeline)
4. [Real-time Analytics](#4-real-time-analytics)
5. [Product Analytics](#5-product-analytics)
6. [Business Intelligence](#6-business-intelligence)
7. [Privacy & Compliance](#7-privacy--compliance)
8. [Cost Optimization](#8-cost-optimization)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Event Collection

### 1.1 Event Taxonomy

#### Cell-Level Events
```typescript
enum CellEventType {
  // Lifecycle events
  CELL_CREATED = 'cell_created',
  CELL_DELETED = 'cell_deleted',
  CELL_MODIFIED = 'cell_modified',

  // State changes
  CELL_STATE_CHANGED = 'cell_state_changed',
  CELL_VALUE_CHANGED = 'cell_value_changed',
  CELL_DEPENDENCY_UPDATED = 'cell_dependency_updated',

  // Sensation events (POLLN-specific)
  CELL_SENSING_STARTED = 'cell_sensing_started',
  CELL_SENSING_COMPLETED = 'cell_sensing_completed',
  CELL_PATTERN_DETECTED = 'cell_pattern_detected',
  CELL_ANOMALY_DETECTED = 'cell_anomaly_detected',

  // Processing events
  CELL_PROCESSING_STARTED = 'cell_processing_started',
  CELL_PROCESSING_COMPLETED = 'cell_processing_completed',
  CELL_PROCESSING_FAILED = 'cell_processing_failed',

  // Memory events
  CELL_MEMORY_STORED = 'cell_memory_stored',
  CELL_MEMORY_RECALLED = 'cell_memory_recalled',

  // Learning events
  CELL_LEARNINGOccurred = 'cell_learning_occurred',
  CELL_PATTERN_LEARNED = 'cell_pattern_learned',
}

interface CellEvent {
  eventId: string;
  eventType: CellEventType;
  timestamp: number;
  cellId: string;
  cellType: string;
  logicLevel: number;

  // Event-specific data
  previousValue?: unknown;
  newValue?: unknown;
  dependencies?: string[];
  sensationType?: string;

  // Performance metrics
  processingTime?: number;
  memoryUsage?: number;

  // User context
  userId?: string;
  sessionId?: string;
  spreadsheetId: string;

  // Metadata
  metadata?: Record<string, unknown>;
}
```

#### Spreadsheet-Level Events
```typescript
enum SpreadsheetEventType {
  SPREADSHEET_CREATED = 'spreadsheet_created',
  SPREADSHEET_OPENED = 'spreadsheet_opened',
  SPREADSHEET_CLOSED = 'spreadsheet_closed',
  SPREADSHEET_SAVED = 'spreadsheet_saved',
  SPREADSHEET_SHARED = 'spreadsheet_shared',
  SPREADSHEET_EXPORTED = 'spreadsheet_exported',

  // Collaboration events
  COLLABORATION_STARTED = 'collaboration_started',
  COLLABORATION_ENDED = 'collaboration_ended',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed',

  // Performance events
  PERFORMANCE_DEGRADED = 'performance_degraded',
  RENDERING_SLOW = 'rendering_slow',
  CALCULATION_SLOW = 'calculation_slow',
}

interface SpreadsheetEvent {
  eventId: string;
  eventType: SpreadsheetEventType;
  timestamp: number;
  spreadsheetId: string;
  userId?: string;
  sessionId: string;

  // Context
  cellCount?: number;
  activeCellCount?: number;
  collaboratorCount?: number;

  // Performance
  renderTime?: number;
  calculationTime?: number;

  metadata?: Record<string, unknown>;
}
```

#### User-Level Events
```typescript
enum UserEventType {
  USER_SIGNED_UP = 'user_signed_up',
  USER_SIGNED_IN = 'user_signed_in',
  USER_SIGNED_OUT = 'user_signed_out',

  // Feature usage
  FEATURE_USED = 'feature_used',
  FEATURE_DISCOVERED = 'feature_discovered',
  HELP_ACCESSED = 'help_accessed',

  // Onboarding
  ONBOARDING_STARTED = 'onboarding_started',
  ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed',
  ONBOARDING_COMPLETED = 'onboarding_completed',

  // Errors
  ERROR_OCCURRED = 'error_occurred',
  ERROR_REPORTED = 'error_reported',
}

interface UserEvent {
  eventId: string;
  eventType: UserEventType;
  timestamp: number;
  userId: string;
  sessionId: string;

  // Context
  featureName?: string;
  onboardingStep?: string;
  errorMessage?: string;
  errorStack?: string;

  metadata?: Record<string, unknown>;
}
```

### 1.2 Client-Side vs Server-Side Tracking

#### Client-Side Tracking
```typescript
/**
 * Client-side event collector
 * Runs in browser, batches events, sends to server
 */
class ClientEventCollector {
  private eventBuffer: Event[] = [];
  private maxBufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private apiKey: string) {
    this.startFlushTimer();
  }

  /**
   * Track an event (non-blocking)
   */
  track(event: Event): void {
    // Add client context
    const enrichedEvent = {
      ...event,
      clientId: this.getClientId(),
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    this.eventBuffer.push(enrichedEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush events to server
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await fetch('/api/events/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ events }),
        keepalive: true, // Send even if page is closing
      });
    } catch (error) {
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private getClientId(): string {
    let clientId = localStorage.getItem('polln_client_id');
    if (!clientId) {
      clientId = this.generateUUID();
      localStorage.setItem('polln_client_id', clientId);
    }
    return clientId;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('polln_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('polln_session_id', sessionId);
    }
    return sessionId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Flush events before page unload
   */
  enablePageUnloadFlush(): void {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Use Page Visibility API for more reliable flushing
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }
}
```

#### Server-Side Tracking
```typescript
/**
 * Server-side event collector
 * Runs on backend, captures server events
 */
class ServerEventCollector {
  constructor(
    private eventQueue: EventQueue,
    private metricsCollector: MetricsCollector
  ) {}

  /**
   * Track a server-side event
   */
  async track(event: Event): Promise<void> {
    const startTime = Date.now();

    try {
      // Add server context
      const enrichedEvent = {
        ...event,
        serverId: this.getServerId(),
        timestamp: Date.now(),
      };

      // Send to event queue
      await this.eventQueue.produce(enrichedEvent);

      // Update metrics
      this.metricsCollector.incrementQueueMessages({
        queue_name: 'analytics',
        operation: 'produce',
      });
    } catch (error) {
      this.metricsCollector.incrementErrors({
        error_type: 'event_collection_failed',
        component: 'analytics',
      });
      throw error;
    }
  }

  /**
   * Track API request
   */
  async trackRequest(request: Request, response: Response): Promise<void> {
    await this.track({
      eventType: 'API_REQUEST',
      timestamp: Date.now(),
      metadata: {
        method: request.method,
        path: request.url,
        status: response.status,
        duration: response.headers.get('X-Response-Time'),
      },
    });
  }

  /**
   * Track database operation
   */
  async trackDatabaseOperation(
    operation: string,
    collection: string,
    duration: number
  ): Promise<void> {
    await this.track({
      eventType: 'DATABASE_OPERATION',
      timestamp: Date.now(),
      metadata: {
        operation,
        collection,
        duration,
      },
    });
  }

  private getServerId(): string {
    return process.env.SERVER_ID || 'unknown';
  }
}
```

### 1.3 Sampling Strategies

```typescript
enum SamplingStrategy {
  NONE = 'none',           // 100% of events
  RATE = 'rate',           // Fixed percentage (e.g., 10%)
  ADAPTIVE = 'adaptive',   // Dynamic based on load
  IMPORTANCE = 'importance', // Sample important events more
}

interface SamplingConfig {
  strategy: SamplingStrategy;
  rate?: number;           // For RATE strategy (0-1)
  maxEventsPerSecond?: number; // For ADAPTIVE strategy
  importanceRules?: Array<{ // For IMPORTANCE strategy
    eventPattern: string;
    sampleRate: number;
  }>;
}

class EventSampler {
  constructor(private config: SamplingConfig) {}

  shouldSample(event: Event): boolean {
    switch (this.config.strategy) {
      case SamplingStrategy.NONE:
        return true;

      case SamplingStrategy.RATE:
        return Math.random() < (this.config.rate || 1);

      case SamplingStrategy.ADAPTIVE:
        return this.adaptiveSample(event);

      case SamplingStrategy.IMPORTANCE:
        return this.importanceSample(event);
    }
  }

  private adaptiveSample(event: Event): boolean {
    // Implement adaptive sampling based on current load
    // This is a simplified version
    const currentLoad = this.getCurrentLoad();
    const targetLoad = this.config.maxEventsPerSecond || 10000;
    const sampleRate = Math.min(1, targetLoad / currentLoad);
    return Math.random() < sampleRate;
  }

  private importanceSample(event: Event): boolean {
    if (!this.config.importanceRules) return true;

    for (const rule of this.config.importanceRules) {
      if (event.eventType.match(rule.eventPattern)) {
        return Math.random() < rule.sampleRate;
      }
    }

    return true;
  }

  private getCurrentLoad(): number {
    // In production, this would check actual event rate
    return 1000;
  }
}
```

**Recommended Sampling Configuration:**
```typescript
const productionSamplingConfig: SamplingConfig = {
  strategy: SamplingStrategy.IMPORTANCE,
  importanceRules: [
    // Sample all user-level events (critical for understanding)
    { eventPattern: 'user_.*', sampleRate: 1.0 },

    // Sample all error events (critical for debugging)
    { eventPattern: '.*_failed|error_.*', sampleRate: 1.0 },

    // Sample 50% of cell processing events
    { eventPattern: 'cell_processing_.*', sampleRate: 0.5 },

    // Sample 10% of cell state changes (high volume)
    { eventPattern: 'cell_state_changed', sampleRate: 0.1 },

    // Sample 100% of sensation events (POLLN-specific, novel)
    { eventPattern: 'cell_sensation_.*', sampleRate: 1.0 },

    // Sample 100% of learning events (POLLN-specific, novel)
    { eventPattern: 'cell_learning_.*', sampleRate: 1.0 },
  ],
};
```

### 1.4 Batch vs Real-time

```typescript
enum IngestionMode {
  REALTIME = 'realtime',     // Events processed immediately
  BATCH = 'batch',           // Events processed in batches
  HYBRID = 'hybrid',         // Critical events realtime, others batched
}

interface IngestionConfig {
  mode: IngestionMode;
  batchSize?: number;
  batchTimeout?: number;
  realtimeEventPatterns?: string[];
}

class EventIngestionManager {
  private realtimeBuffer: Event[] = [];
  private batchBuffer: Event[] = [];

  constructor(private config: IngestionConfig) {}

  async ingest(event: Event): Promise<void> {
    const isRealtime = this.isRealtimeEvent(event);

    if (isRealtime) {
      await this.ingestRealtime(event);
    } else {
      await this.ingestBatch(event);
    }
  }

  private isRealtimeEvent(event: Event): boolean {
    if (this.config.mode === IngestionMode.REALTIME) return true;
    if (this.config.mode === IngestionMode.BATCH) return false;

    // HYBRID mode: check if event matches realtime patterns
    return this.config.realtimeEventPatterns?.some(pattern =>
      event.eventType.match(pattern)
    ) || false;
  }

  private async ingestRealtime(event: Event): Promise<void> {
    // Send directly to real-time processing pipeline
    await this.sendToRealtimePipeline(event);
  }

  private async ingestBatch(event: Event): Promise<void> {
    this.batchBuffer.push(event);

    if (this.batchBuffer.length >= (this.config.batchSize || 1000)) {
      await this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const events = [...this.batchBuffer];
    this.batchBuffer = [];

    await this.sendToBatchPipeline(events);
  }

  private async sendToRealtimePipeline(event: Event): Promise<void> {
    // Implementation depends on real-time pipeline
  }

  private async sendToBatchPipeline(events: Event[]): Promise<void> {
    // Implementation depends on batch pipeline
  }
}
```

---

## 2. Data Warehouse

### 2.1 Platform Comparison

| Feature | Snowflake | BigQuery | Redshift | ClickHouse |
|---------|-----------|----------|----------|------------|
| **Architecture** | Cloud-native | Cloud-native | Traditional | Columnar |
| **Pricing** | Compute + Storage | On-demand + Storage | Compute + Storage | Compute + Storage |
| **Scalability** | Excellent | Excellent | Good | Excellent |
| **Query Performance** | Fast | Very Fast | Fast | Very Fast |
| **Real-time Ingestion** | Good | Good | Poor | Excellent |
| **Best For** | Enterprise analytics | Big data analytics | Traditional DW | Real-time analytics |
| **Learning Curve** | Low | Low | Medium | High |

**Recommendation:** **BigQuery** for POLLN
- Excellent for event data analytics
- Scales automatically
- Cost-effective for sporadic usage
- Great integration with Google Cloud
- Built-in ML features

### 2.2 Schema Design

#### Star Schema for Events
```sql
-- Fact table: Events
CREATE TABLE `polln_analytics.fact_events` (
  -- Primary key
  event_id STRING NOT NULL,

  -- Foreign keys
  user_id STRING,
  session_id STRING NOT NULL,
  spreadsheet_id STRING,
  cell_id STRING,

  -- Event details
  event_type STRING NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,

  -- Measures
  processing_time_ms INT64,
  memory_usage_bytes INT64,

  -- Dimensions (denormalized for query performance)
  cell_type STRING,
  logic_level INT64,
  user_agent STRING,
  screen_resolution STRING,

  -- Metadata
  event_metadata JSON,

  -- Partitioning
  event_date DATE NOT NULL,

  -- Clustering
) PARTITION BY event_date
CLUSTER BY user_id, spreadsheet_id, event_type;

-- Dimension table: Users
CREATE TABLE `polln_analytics.dim_users` (
  user_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,

  -- User properties
  email STRING,
  plan_type STRING,

  -- Firmographic
  company_name STRING,
  company_size STRING,
  industry STRING,

  -- Behavioral
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  total_sessions INT64,

  --Computed fields
  account_age_days INT64,
  is_active BOOLEAN,

) PRIMARY KEY (user_id);

-- Dimension table: Spreadsheets
CREATE TABLE `polln_analytics.dim_spreadsheets` (
  spreadsheet_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by_user_id STRING NOT NULL,

  -- Properties
  name STRING,
  template_id STRING,

  -- Statistics
  total_cells INT64,
  active_cells INT64,
  total_views INT64,

  -- Collaboration
  is_shared BOOLEAN,
  collaborator_count INT64,

  -- Computed
  age_days INT64,

) PRIMARY KEY (spreadsheet_id);

-- Dimension table: Cells
CREATE TABLE `polln_analytics.dim_cells` (
  cell_id STRING NOT NULL,
  spreadsheet_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,

  -- Properties
  cell_type STRING NOT NULL,
  logic_level INT64 NOT NULL,
  position STRING, -- e.g., "A1", "B2"

  -- Statistics
  total_state_changes INT64,
  total_sensations INT64,
  total_processing_time_ms INT64,

  -- Relationships
  depends_on ARRAY<STRING>,
  feeds_into ARRAY<STRING>,
  senses ARRAY<STRING>,

) PRIMARY KEY (cell_id);
```

#### Snowflake Schema for Complex Data
```sql
-- Fact table: Cell Sensations (POLLN-specific)
CREATE TABLE `polln_analytics.fact_cell_sensations` (
  sensation_id STRING NOT NULL,
  cell_id STRING NOT NULL,
  target_cell_id STRING NOT NULL,
  sensation_type STRING NOT NULL, -- ABSOLUTE_CHANGE, RATE_OF_CHANGE, etc.

  -- Timestamps
  sensed_at TIMESTAMP NOT NULL,

  -- Measures
  detected_value FLOAT64,
  confidence_score FLOAT64,

  -- Context
  previous_value FLOAT64,
  current_value FLOAT64,
  rate_of_change FLOAT64,

  -- Metadata
  sensation_metadata JSON,

  -- Partitioning
  sensation_date DATE NOT NULL,

) PARTITION BY sensation_date
CLUSTER BY cell_id, target_cell_id, sensation_type;

-- Fact table: Cell Learning (POLLN-specific)
CREATE TABLE `polln_analytics.fact_cell_learning` (
  learning_event_id STRING NOT NULL,
  cell_id STRING NOT NULL,
  learned_at TIMESTAMP NOT NULL,

  -- What was learned
  pattern_type STRING NOT NULL,
  pattern_description STRING NOT NULL,

  -- Learning metrics
  confidence_score FLOAT64,
  sample_size INT64,

  -- Pattern details
  pattern_details JSON,

  -- Metadata
  learning_metadata JSON,

  -- Partitioning
  learning_date DATE NOT NULL,

) PARTITION BY learning_date
CLUSTER BY cell_id, pattern_type;

-- Aggregate table: Daily Active Spreadsheets
CREATE TABLE `polln_analytics.aggr_daily_active_spreadsheets` (
  date DATE NOT NULL,
  user_id STRING NOT NULL,
  spreadsheet_id STRING NOT NULL,

  -- Metrics
  total_sessions INT64,
  total_session_duration_ms INT64,
  total_cell_operations INT64,
  unique_cells_modified INT64,

  -- Performance
  avg_render_time_ms FLOAT64,
  avg_calculation_time_ms FLOAT64,
  p95_render_time_ms FLOAT64,
  p99_render_time_ms FLOAT64,

  -- Errors
  total_errors INT64,

) PARTITION BY date
CLUSTER BY user_id;

-- Aggregate table: Cell Type Usage
CREATE TABLE `polln_analytics.aggr_cell_type_usage` (
  date DATE NOT NULL,
  cell_type STRING NOT NULL,
  logic_level INT64 NOT NULL,

  -- Metrics
  total_cells INT64,
  active_cells INT64,
  total_operations INT64,
  total_processing_time_ms INT64,
  avg_processing_time_ms FLOAT64,

  -- Sensation metrics (POLLN-specific)
  total_sensations INT64,
  avg_sensations_per_cell FLOAT64,

  -- Learning metrics (POLLN-specific)
  total_learning_events INT64,
  avg_learning_confidence FLOAT64,

) PARTITION BY date
CLUSTER BY cell_type, logic_level;
```

### 2.3 Partitioning Strategies

```sql
-- Time-based partitioning (most events)
PARTITION BY event_date DATE NOT NULL

-- Ingestion-time partitioning (for real-time data)
PARTITION BY ingestion_timestamp TIMESTAMP NOT NULL
AS (SELECT TIMESTAMP_TRUNC(ingestion_timestamp, DAY) AS partition_id)

-- Composite partitioning (for complex queries)
PARTITION BY event_date DATE, region STRING
```

**Partitioning Recommendations:**
1. **Daily partitions** for event tables (balance between query performance and storage)
2. **Monthly partitions** for dimension tables (less frequent updates)
3. **Ingestion-time partitioning** for real-time analytics (no event time dependency)
4. **Partition pruning** in queries (always filter on partition key)

### 2.4 Incremental Updates

```sql
-- Create a view for incremental updates
CREATE OR REPLACE VIEW `polln_analytics.vw_latest_events` AS
SELECT *
FROM `polln_analytics.fact_events`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);

-- Use MERGE statement for upserts
MERGE `polln_analytics.dim_users` T
USING (
  SELECT
    user_id,
    MAX(event_timestamp) as last_seen_at,
    COUNT(DISTINCT session_id) as total_sessions
  FROM `polln_analytics.fact_events`
  WHERE event_date = CURRENT_DATE()
  GROUP BY user_id
) S
ON T.user_id = S.user_id
WHEN MATCHED THEN
  UPDATE SET
    last_seen_at = S.last_seen_at,
    total_sessions = T.total_sessions + S.total_sessions,
    account_age_days = DATE_DIFF(CURRENT_DATE(), created_at, DAY)
WHEN NOT MATCHED THEN
  INSERT (user_id, last_seen_at, total_sessions, account_age_days, is_active)
  VALUES (S.user_id, S.last_seen_at, S.total_sessions, 0, TRUE);
```

---

## 3. ETL/ELT Pipeline

### 3.1 Tool Comparison

| Feature | Fivetran | Airbyte | dbt | Custom |
|---------|----------|---------|-----|--------|
| **Setup Time** | Minutes | Hours | Hours | Days |
| **Maintenance** | Low | Medium | Low | High |
| **Cost** | High | Low | Low | Very High |
| **Flexibility** | Low | Medium | High | Very High |
| **Transformations** | Limited | Limited | Excellent | Unlimited |
| **Best For** | Simple integrations | Open-source alternative | Data transformations | Complex logic |

**Recommendation:** **Airbyte + dbt** for POLLN
- Airbyte for data ingestion (cost-effective, flexible)
- dbt for transformations (version-controlled, testable)
- Custom Python scripts for complex POLLN-specific logic

### 3.2 Airbyte Configuration

```yaml
# airbyte_config.yaml
connections:
  - name: polln_events_source
    source:
      type: postgres
      host: ${POSTGRES_HOST}
      port: 5432
      database: polln_events
      username: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      replication_method: CDC
      publications: ["polln_events_publication"]

    destination:
      type: bigquery
      project_id: ${GCP_PROJECT_ID}
      dataset_id: polln_analytics_raw
      credentials_json: ${GCP Credentials}

    streams:
      - name: events
        namespace: public
        destination_stream: fact_events_raw

      - name: cell_sensations
        namespace: public
        destination_stream: fact_cell_sensations_raw

      - name: cell_learning
        namespace: public
        destination_stream: fact_cell_learning_raw

  - name: polln_users_source
    source:
      type: mongodb
      connection_string: ${MONGODB_CONNECTION_STRING}
      database: polln_users
      collection: users

    destination:
      type: bigquery
      project_id: ${GCP_PROJECT_ID}
      dataset_id: polln_analytics_raw

    streams:
      - name: users
        destination_stream: dim_users_raw
```

### 3.3 dbt Models

#### Base Models (Staging)
```sql
-- models/staging/stg_events.sql
WITH source AS (
  SELECT
    event_id,
    user_id,
    session_id,
    spreadsheet_id,
    cell_id,
    event_type,
    event_timestamp,
    processing_time_ms,
    memory_usage_bytes,
    cell_type,
    logic_level,
    user_agent,
    screen_resolution,
    event_metadata,
    event_date
  FROM
    `polln_analytics_raw.fact_events_raw`
),

renamed AS (
  SELECT
    event_id,
    user_id,
    session_id,
    spreadsheet_id,
    cell_id,
    event_type,
    -- Cast to proper types
    SAFE_CAST(event_timestamp AS TIMESTAMP) AS event_timestamp,
    SAFE_CAST(processing_time_ms AS INT64) AS processing_time_ms,
    SAFE_CAST(memory_usage_bytes AS INT64) AS memory_usage_bytes,
    cell_type,
    SAFE_CAST(logic_level AS INT64) AS logic_level,
    user_agent,
    screen_resolution,
    SAFE.PARSE_JSON(event_metadata) AS event_metadata,
    SAFE_CAST(event_date AS DATE) AS event_date
  FROM
    source
)

SELECT * FROM renamed
```

#### Intermediate Models
```sql
-- models/intermediate/int_cell_performance.sql
WITH cell_events AS (
  SELECT *
  FROM `models.staging.stg_events`
  WHERE cell_id IS NOT NULL
    AND event_type IN (
      'cell_processing_completed',
      'cell_processing_failed'
    )
),

performance_metrics AS (
  SELECT
    cell_id,
    cell_type,
    logic_level,
    event_date,

    -- Processing metrics
    COUNT(*) as total_operations,
    SUM(processing_time_ms) as total_processing_time_ms,
    AVG(processing_time_ms) as avg_processing_time_ms,

    -- Percentiles
    PERCENTILE_CONT(processing_time_ms, 0.5) OVER (
      PARTITION BY cell_id, event_date
    ) as p50_processing_time_ms,
    PERCENTILE_CONT(processing_time_ms, 0.95) OVER (
      PARTITION BY cell_id, event_date
    ) as p95_processing_time_ms,
    PERCENTILE_CONT(processing_time_ms, 0.99) OVER (
      PARTITION BY cell_id, event_date
    ) as p99_processing_time_ms,

    -- Error rate
    SUM(CASE WHEN event_type = 'cell_processing_failed' THEN 1 ELSE 0 END)
      as total_failures,

  FROM cell_events
  GROUP BY
    cell_id,
    cell_type,
    logic_level,
    event_date
)

SELECT DISTINCT
  cell_id,
  cell_type,
  logic_level,
  event_date,
  total_operations,
  total_processing_time_ms,
  avg_processing_time_ms,
  p50_processing_time_ms,
  p95_processing_time_ms,
  p99_processing_time_ms,
  total_failures,
  ROUND(total_failures * 100.0 / total_operations, 2) as error_rate_percent
FROM performance_metrics
```

#### POLLN-Specific Models
```sql
-- models/intermediate/int_cell_sensation_analysis.sql
WITH sensation_events AS (
  SELECT
    cell_id,
    target_cell_id,
    sensation_type,
    sensed_at,
    detected_value,
    confidence_score,
    EXTRACT(DATE FROM sensed_at) as sensation_date
  FROM
    `polln_analytics_raw.fact_cell_sensations_raw`
),

sensation_metrics AS (
  SELECT
    cell_id,
    target_cell_id,
    sensation_type,
    sensation_date,

    -- Count sensations
    COUNT(*) as total_sensations,

    -- Confidence metrics
    AVG(confidence_score) as avg_confidence,
    MAX(confidence_score) as max_confidence,
    MIN(confidence_score) as min_confidence,

    -- Value metrics
    AVG(detected_value) as avg_detected_value,
    STDDEV(detected_value) as stddev_detected_value,

    -- High-confidence sensations
    SUM(CASE WHEN confidence_score > 0.8 THEN 1 ELSE 0 END)
      as high_confidence_count,

  FROM sensation_events
  GROUP BY
    cell_id,
    target_cell_id,
    sensation_type,
    sensation_date
)

SELECT
  cell_id,
  target_cell_id,
  sensation_type,
  sensation_date,
  total_sensations,
  avg_confidence,
  max_confidence,
  min_confidence,
  avg_detected_value,
  stddev_detected_value,
  high_confidence_count,
  ROUND(high_confidence_count * 100.0 / total_sensations, 2)
    as high_confidence_percent
FROM sensation_metrics
```

#### Final Models (Marts)
```sql
-- models/marts/fct_daily_user_activity.sql
WITH user_sessions AS (
  SELECT
    user_id,
    session_id,
    event_date,
    MIN(event_timestamp) as session_start,
    MAX(event_timestamp) as session_end,
    COUNT(*) as total_events,

    -- Spreadsheet activity
    COUNT(DISTINCT spreadsheet_id) as unique_spreadsheets,

    -- Cell operations
    SUM(CASE
      WHEN event_type LIKE 'cell_%'
      THEN 1 ELSE 0
    END) as total_cell_operations,

    -- Error tracking
    SUM(CASE
      WHEN event_type LIKE '%_failed'
      THEN 1 ELSE 0
    END) as total_errors,

  FROM `models.staging.stg_events`
  WHERE user_id IS NOT NULL
  GROUP BY
    user_id,
    session_id,
    event_date
),

session_metrics AS (
  SELECT
    user_id,
    event_date,

    -- Session metrics
    COUNT(*) as total_sessions,
    SUM(total_events) as total_events,
    SUM(unique_spreadsheets) as total_unique_spreadsheets,
    SUM(total_cell_operations) as total_cell_operations,
    SUM(total_errors) as total_errors,

    -- Session duration
    SUM(
      TIMESTAMP_DIFF(session_end, session_start, SECOND)
    ) as total_session_duration_seconds,
    AVG(
      TIMESTAMP_DIFF(session_end, session_start, SECOND)
    ) as avg_session_duration_seconds,

  FROM user_sessions
  GROUP BY
    user_id,
    event_date
)

SELECT
  user_id,
  event_date,
  total_sessions,
  total_events,
  total_unique_spreadsheets,
  total_cell_operations,
  total_errors,
  total_session_duration_seconds,
  avg_session_duration_seconds,
  ROUND(
    total_errors * 100.0 / NULLIF(total_events, 0),
    2
  ) as error_rate_percent
FROM session_metrics
```

### 3.4 Data Quality Checks

```sql
-- models/tests/test_event_data_quality.sql
-- Test 1: No null event IDs
SELECT
  event_id
FROM
  `models.staging.stg_events`
WHERE
  event_id IS NULL

-- Test 2: No null event timestamps
SELECT
  event_id
FROM
  `models.staging.stg_events`
WHERE
  event_timestamp IS NULL

-- Test 3: No future timestamps
SELECT
  event_id,
  event_timestamp
FROM
  `models.staging.stg_events`
WHERE
  event_timestamp > CURRENT_TIMESTAMP()

-- Test 4: No negative processing times
SELECT
  event_id,
  processing_time_ms
FROM
  `models.staging.stg_events`
WHERE
  processing_time_ms < 0

-- Test 5: All cells have valid cell types
SELECT
  cell_id,
  cell_type
FROM
  `models.staging.stg_events`
WHERE
  cell_id IS NOT NULL
  AND cell_type NOT IN (
    'InputCell',
    'OutputCell',
    'TransformCell',
    'FilterCell',
    'AggregateCell',
    'ValidateCell',
    'AnalysisCell',
    'PredictionCell',
    'DecisionCell',
    'ExplainCell'
  )
```

### 3.5 Backfill Strategies

```python
# scripts/backfill_analytics.py
import logging
from datetime import datetime, timedelta
from google.cloud import bigquery

def backfill_events(
    start_date: str,
    end_date: str,
    batch_size: int = 10000
):
    """
    Backfill events from PostgreSQL to BigQuery

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        batch_size: Number of events to process per batch
    """
    client = bigquery.Client()
    table_id = "polln_analytics_raw.fact_events_raw"

    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    while current_date <= end:
        date_str = current_date.strftime("%Y-%m-%d")
        logging.info(f"Processing date: {date_str}")

        # Query events for this date
        query = f"""
            SELECT *
            FROM events
            WHERE DATE(event_timestamp) = '{date_str}'
            ORDER BY event_timestamp
            LIMIT {batch_size}
        """

        # Execute query and load to BigQuery
        # Implementation details...

        current_date += timedelta(days=1)

    logging.info("Backfill complete")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    backfill_events("2024-01-01", "2024-03-09")
```

---

## 4. Real-time Analytics

### 4.1 Streaming Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Browser   │─────▶│  WebSocket  │─────▶│  Event Queue    │
│  (Client)   │      │   Server    │      │   (Redis)       │
└─────────────┘      └─────────────┘      └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  Stream         │
                                          │  Processor      │
                                          │  (Node.js)      │
                                          └─────────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                       │  ClickHouse │     │  Redis      │     │  BigQuery   │
                       │  (Hot Data) │     │  (Aggregates)│     │  (Cold Data)│
                       └─────────────┘     └─────────────┘     └─────────────┘
```

### 4.2 Kafka/Kinesis Implementation

```typescript
/**
 * Kafka producer for real-time events
 */
import { Kafka } from 'kafkajs';

class AnalyticsKafkaProducer {
  private kafka: Kafka;
  private producer: any;

  constructor(brokers: string[]) {
    this.kafka = new Kafka({
      clientId: 'polln-analytics',
      brokers: brokers,
    });

    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async produceEvent(event: Event): Promise<void> {
    await this.producer.send({
      topic: this.getTopicForEvent(event),
      messages: [{
        key: event.eventId,
        value: JSON.stringify(event),
        timestamp: Date.now().toString(),
      }],
    });
  }

  private getTopicForEvent(event: Event): string {
    if (event.eventType.startsWith('cell_')) {
      return 'polln.cell-events';
    } else if (event.eventType.startsWith('spreadsheet_')) {
      return 'polln.spreadsheet-events';
    } else if (event.eventType.startsWith('user_')) {
      return 'polln.user-events';
    }
    return 'polln.other-events';
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
```

### 4.3 Materialized Views

```sql
-- Real-time active users
CREATE MATERIALIZED VIEW `polln_analytics.mv_active_users`
AS
SELECT
  user_id,
  COUNT(DISTINCT session_id) as active_sessions,
  MAX(event_timestamp) as last_activity,
  CURRENT_TIMESTAMP() as computed_at
FROM
  `polln_analytics_raw.fact_events_raw`
WHERE
  event_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
GROUP BY
  user_id;

-- Real-time cell operations
CREATE MATERIALIZED VIEW `polln_analytics.mv_cell_operations`
AS
SELECT
  cell_type,
  logic_level,
  COUNT(*) as operations_last_5min,
  AVG(processing_time_ms) as avg_processing_time,
  PERCENTILE_CONT(processing_time_ms, 0.95) OVER () as p95_processing_time
FROM
  `polln_analytics_raw.fact_events_raw`
WHERE
  event_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
  AND event_type LIKE 'cell_%'
GROUP BY
  cell_type,
  logic_level;
```

### 4.4 ClickHouse for Fast Queries

```sql
-- ClickHouse table for real-time analytics
CREATE TABLE polln_analytics.events_realtime
(
    event_id String,
    event_type String,
    event_timestamp DateTime64(3),
    user_id Nullable(String),
    session_id String,
    spreadsheet_id Nullable(String),
    cell_id Nullable(String),
    cell_type Nullable(String),
    logic_level Nullable(Int32),
    processing_time_ms Nullable(Int32),
    -- Add more fields as needed
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (event_timestamp, user_id, spreadsheet_id)
TTL event_timestamp + INTERVAL 7 DAY;

-- Create a materialized view for aggregation
CREATE MATERIALIZED VIEW polln_analytics.events_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (toStartOfHour(event_timestamp), event_type)
AS SELECT
    toStartOfHour(event_timestamp) as hour,
    event_type,
    count() as event_count,
    sum(processing_time_ms) as total_processing_time
FROM polln_analytics.events_realtime
GROUP BY hour, event_type;
```

### 4.5 Redis for Aggregates

```typescript
/**
 * Redis-based real-time aggregations
 */
class RealTimeAggregator {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Track active spreadsheets
   */
  async trackActiveSpreadsheet(
    spreadsheetId: string,
    userId: string
  ): Promise<void> {
    const key = `analytics:active_spreadsheets:${spreadsheetId}`;
    const field = userId;

    // Update with TTL of 5 minutes
    await this.redis.hset(key, field, Date.now());
    await this.redis.expire(key, 300);
  }

  /**
   * Get count of active spreadsheets
   */
  async getActiveSpreadsheetCount(): Promise<number> {
    const keys = await this.redis.keys('analytics:active_spreadsheets:*');
    return keys.length;
  }

  /**
   * Track cell operations by type
   */
  async trackCellOperation(
    cellType: string,
    operation: string,
    processingTime: number
  ): Promise<void> {
    const key = `analytics:cell_ops:${cellType}:${operation}`;

    // Increment counter
    await this.redis.hincrby(key, 'count', 1);

    // Update processing time (running average)
    const currentAvg = await this.redis.hget(key, 'avg_processing_time');
    const newAvg = this.updateAverage(
      currentAvg ? parseFloat(currentAvg) : 0,
      processingTime,
      await this.redis.hget(key, 'count')
    );

    await this.redis.hset(key, 'avg_processing_time', newAvg);
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  /**
   * Track sensation events (POLLN-specific)
   */
  async trackSensation(
    cellId: string,
    sensationType: string,
    confidence: number
  ): Promise<void> {
    const key = `analytics:sensations:${cellId}`;

    await this.redis.hincrby(key, `count:${sensationType}`, 1);

    // Track high-confidence sensations
    if (confidence > 0.8) {
      await this.redis.hincrby(key, 'high_confidence_count', 1);
    }

    await this.redis.expire(key, 86400); // 24 hour TTL
  }

  /**
   * Get sensation statistics for a cell
   */
  async getSensationStats(
    cellId: string
  ): Promise<Record<string, number>> {
    const key = `analytics:sensations:${cellId}`;
    const stats = await this.redis.hgetall(key);

    return {
      total: Object.values(stats).reduce((sum, val) => sum + parseInt(val), 0),
      ...stats,
    };
  }

  private updateAverage(
    currentAvg: number,
    newValue: number,
    count: string
  ): number {
    const n = parseInt(count);
    return ((currentAvg * (n - 1)) + newValue) / n;
  }
}
```

---

## 5. Product Analytics

### 5.1 Funnel Analysis

```sql
-- User onboarding funnel
WITH funnel_steps AS (
  -- Step 1: Sign up
  SELECT
    user_id,
    MIN(event_timestamp) as step1_timestamp
  FROM `polln_analytics.fact_events`
  WHERE event_type = 'user_signed_up'
  GROUP BY user_id

  UNION ALL

  -- Step 2: Create first spreadsheet
  SELECT
    user_id,
    MIN(event_timestamp) as step1_timestamp
  FROM `polln_analytics.fact_events`
  WHERE event_type = 'spreadsheet_created'
  GROUP BY user_id

  UNION ALL

  -- Step 3: Add first cell
  SELECT
    user_id,
    MIN(event_timestamp) as step1_timestamp
  FROM `polln_analytics.fact_events`
  WHERE event_type = 'cell_created'
  GROUP BY user_id

  UNION ALL

  -- Step 4: First sensation (POLLN-specific)
  SELECT
    user_id,
    MIN(event_timestamp) as step1_timestamp
  FROM `polln_analytics.fact_cell_sensations`
  GROUP BY user_id

  UNION ALL

  -- Step 5: First learning event (POLLN-specific)
  SELECT
    user_id,
    MIN(event_timestamp) as step1_timestamp
  FROM `polln_analytics.fact_cell_learning`
  GROUP BY user_id
)

SELECT
  'Step 1: Sign up' as step,
  COUNT(DISTINCT user_id) as users,
  1.0 as conversion_rate
FROM funnel_steps
WHERE step = 'Step 1: Sign up'

UNION ALL

SELECT
  'Step 2: Create spreadsheet' as step,
  COUNT(DISTINCT user_id) as users,
  COUNT(DISTINCT user_id) * 1.0 / (
    SELECT COUNT(DISTINCT user_id)
    FROM funnel_steps
    WHERE step = 'Step 1: Sign up'
  ) as conversion_rate
FROM funnel_steps
WHERE step = 'Step 2: Create spreadsheet'

-- Continue for other steps...
```

### 5.2 Cohort Analysis

```sql
-- Monthly cohort analysis
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC(created_at, MONTH) as cohort_month
  FROM `polln_analytics.dim_users`
),

user_activity AS (
  SELECT
    user_id,
    DATE_TRUNC(event_timestamp, MONTH) as activity_month
  FROM `polln_analytics.fact_events`
  GROUP BY user_id, activity_month
),

cohort_analysis AS (
  SELECT
    c.cohort_month,
    a.activity_month,
    DATE_DIFF(a.activity_month, c.cohort_month, MONTH) as month_number,
    COUNT(DISTINCT c.user_id) as user_count
  FROM user_cohorts c
  JOIN user_activity a ON c.user_id = a.user_id
  WHERE a.activity_month >= c.cohort_month
  GROUP BY c.cohort_month, a.activity_month
),

cohort_sizes AS (
  SELECT
    cohort_month,
    COUNT(DISTINCT user_id) as cohort_size
  FROM user_cohorts
  GROUP BY cohort_month
)

SELECT
  ca.cohort_month,
  cs.cohort_size,
  ca.month_number,
  ca.user_count,
  ROUND(ca.user_count * 100.0 / cs.cohort_size, 2) as retention_percent
FROM cohort_analysis ca
JOIN cohort_sizes cs ON ca.cohort_month = cs.cohort_month
ORDER BY ca.cohort_month, ca.month_number;
```

### 5.3 Retention Curves

```sql
-- Day-30 retention by acquisition cohort
WITH acquisition_cohorts AS (
  SELECT
    user_id,
    created_at as acquisition_date,
    DATE_TRUNC(created_at, WEEK) as cohort_week
  FROM `polln_analytics.dim_users`
),

user_activities AS (
  SELECT
    user_id,
    DATE_TRUNC(event_timestamp, DAY) as activity_date
  FROM `polln_analytics.fact_events`
  GROUP BY user_id, activity_date
),

retention_data AS (
  SELECT
    a.cohort_week,
    DATE_DIFF(b.activity_date, a.acquisition_date, DAY) as day_number,
    COUNT(DISTINCT a.user_id) as retained_users
  FROM acquisition_cohorts a
  JOIN user_activities b ON a.user_id = b.user_id
  WHERE b.activity_date <= DATE_ADD(a.acquisition_date, INTERVAL 30 DAY)
  GROUP BY a.cohort_week, day_number
),

cohort_sizes AS (
  SELECT
    cohort_week,
    COUNT(DISTINCT user_id) as cohort_size
  FROM acquisition_cohorts
  GROUP BY cohort_week
)

SELECT
  rd.cohort_week,
  cs.cohort_size,
  rd.day_number,
  rd.retained_users,
  ROUND(rd.retained_users * 100.0 / cs.cohort_size, 2) as retention_percent
FROM retention_data rd
JOIN cohort_sizes cs ON rd.cohort_week = cs.cohort_week
ORDER BY rd.cohort_week, rd.day_number;
```

### 5.4 Feature Usage

```sql
-- Feature usage analysis
WITH feature_events AS (
  SELECT
    event_type,
    user_id,
    DATE_TRUNC(event_timestamp, DAY) as event_date,
    COUNT(*) as usage_count
  FROM `polln_analytics.fact_events`
  WHERE event_type LIKE '%feature%'
  GROUP BY event_type, user_id, event_date
),

feature_users AS (
  SELECT
    event_type,
    event_date,
    COUNT(DISTINCT user_id) as unique_users
  FROM feature_events
  GROUP BY event_type, event_date
),

total_users AS (
  SELECT
    event_date,
    COUNT(DISTINCT user_id) as total_active_users
  FROM (
    SELECT
      user_id,
      DATE_TRUNC(event_timestamp, DAY) as event_date
    FROM `polln_analytics.fact_events`
    GROUP BY user_id, event_date
  )
  GROUP BY event_date
)

SELECT
  fe.event_type,
  fe.event_date,
  fu.unique_users,
  tu.total_active_users,
  ROUND(fu.unique_users * 100.0 / tu.total_active_users, 2) as penetration_percent,
  AVG(fe.usage_count) as avg_usage_per_user
FROM feature_events fe
JOIN feature_users fu ON fe.event_type = fu.event_type AND fe.event_date = fu.event_date
JOIN total_users tu ON fu.event_date = tu.event_date
GROUP BY fe.event_type, fe.event_date, fu.unique_users, tu.total_active_users
ORDER BY fe.event_date DESC, penetration_percent DESC;
```

---

## 6. Business Intelligence

### 6.1 Tool Comparison

| Feature | Looker | Tableau | Metabase | Power BI |
|---------|--------|---------|----------|---------|
| **Cost** | High | High | Free | Medium |
| **Learning Curve** | Low | Medium | Low | Low |
| **Data Modeling** | Excellent | Good | Basic | Good |
| **Embedding** | Excellent | Good | Basic | Good |
| **Self-Service** | Excellent | Good | Good | Good |
| **Best For** | Enterprise | Visualization | Startups | Microsoft Shops |

**Recommendation:** **Metabase** for POLLN (MVP), **Looker** (Enterprise)

### 6.2 Self-Service Analytics

```sql
-- Metabase question: Top 10 most used cell types
SELECT
  cell_type,
  logic_level,
  COUNT(*) as total_cells,
  COUNT(DISTINCT spreadsheet_id) as unique_spreadsheets,
  AVG(processing_time_ms) as avg_processing_time_ms,
  PERCENTILE_CONT(processing_time_ms, 0.95) OVER (
    PARTITION BY cell_type
  ) as p95_processing_time_ms
FROM `polln_analytics.fact_events`
WHERE event_type = 'cell_created'
GROUP BY cell_type, logic_level
ORDER BY total_cells DESC
LIMIT 10;
```

### 6.3 Embedded Analytics

```typescript
/**
 * Embedded analytics component for POLLN
 */
import { EmbeddedAnalytics } from '@polln/analytics-embed';

interface AnalyticsConfig {
  containerId: string;
  dashboardId: string;
  filters?: {
    userId?: string;
    spreadsheetId?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

class SpreadsheetAnalytics {
  private embedded: EmbeddedAnalytics;

  constructor(config: AnalyticsConfig) {
    this.embedded = new EmbeddedAnalytics({
      baseUrl: 'https://analytics.polln.ai',
      dashboardId: config.dashboardId,
      container: document.getElementById(config.containerId)!,
      filters: config.filters,
    });
  }

  /**
   * Show cell performance dashboard
   */
  showCellPerformance(cellId: string): void {
    this.embedded.setFilter('cell_id', cellId);
    this.embedded.render();
  }

  /**
   * Show spreadsheet analytics
   */
  showSpreadsheetAnalytics(spreadsheetId: string): void {
    this.embedded.setFilter('spreadsheet_id', spreadsheetId);
    this.embedded.render();
  }

  /**
   * Export analytics data
   */
  async exportData(format: 'csv' | 'json'): Promise<void> {
    return this.embedded.export(format);
  }
}
```

### 6.4 Scheduled Reports

```python
# scripts/scheduled_reports.py
import jinja2
from google.cloud import bigquery
import sendgrid

class AnalyticsReportGenerator:
    def __init__(self):
        self.client = bigquery.Client()
        self.sendgrid_client = sendgrid.SendGridAPIClient(
            api_key=os.environ['SENDGRID_API_KEY']
        )

    def generate_daily_report(self, date: str):
        """Generate daily analytics report"""

        # Key metrics
        metrics = self.get_daily_metrics(date)

        # Render template
        template = jinja2.Template("""
        <h2>Daily Analytics Report - {{ date }}</h2>

        <h3>Key Metrics</h3>
        <ul>
            <li>Active Users: {{ metrics.active_users }}</li>
            <li>Active Spreadsheets: {{ metrics.active_spreadsheets }}</li>
            <li>Total Cell Operations: {{ metrics.total_operations }}</li>
            <li>Average Processing Time: {{ metrics.avg_processing_time }}ms</li>
        </ul>

        <h3>Cell Type Distribution</h3>
        <table>
            {% for cell_type, count in metrics.cell_types.items() %}
            <tr>
                <td>{{ cell_type }}</td>
                <td>{{ count }}</td>
            </tr>
            {% endfor %}
        </table>
        """)

        html_content = template.render(date=date, metrics=metrics)

        # Send email
        self.send_email(
            to='analytics@polln.ai',
            subject=f'Daily Analytics Report - {date}',
            html_content=html_content
        )

    def get_daily_metrics(self, date: str) -> dict:
        query = f"""
            SELECT
                COUNT(DISTINCT user_id) as active_users,
                COUNT(DISTINCT spreadsheet_id) as active_spreadsheets,
                COUNT(*) as total_operations,
                AVG(processing_time_ms) as avg_processing_time
            FROM `polln_analytics.fact_events`
            WHERE event_date = '{date}'
        """

        job = self.client.query(query)
        results = job.result()
        row = next(results)

        return {
            'active_users': row.active_users,
            'active_spreadsheets': row.active_spreadsheets,
            'total_operations': row.total_operations,
            'avg_processing_time': row.avg_processing_time,
        }

    def send_email(self, to: str, subject: str, html_content: str):
        message = sendgrid.Mail(
            from_email='analytics@polln.ai',
            to_emails=to,
            subject=subject,
            html_content=html_content
        )
        self.sendgrid_client.send(message)

if __name__ == '__main__':
    generator = AnalyticsReportGenerator()
    generator.generate_daily_report('2024-03-09')
```

---

## 7. Privacy & Compliance

### 7.1 Data Anonymization

```sql
-- Anonymize user IDs
CREATE OR REPLACE FUNCTION `polln_analytics.anonymize_user_id`(user_id STRING)
RETURNS STRING
AS (
  CASE
    WHEN user_id IS NULL THEN NULL
    ELSE SHA256(CONCAT(user_id, '@salt_secret_key'))
  END
);

-- Anonymize spreadsheet IDs
CREATE OR REPLACE FUNCTION `polln_analytics.anonymize_spreadsheet_id`(spreadsheet_id STRING)
RETURNS STRING
AS (
  CASE
    WHEN spreadsheet_id IS NULL THEN NULL
    ELSE SHA256(CONCAT(spreadsheet_id, '@salt_secret_key'))
  END
);

-- Create anonymized view
CREATE OR REPLACE VIEW `polln_analytics.vw_anonymized_events`
AS
SELECT
  event_id,
  anonymize_user_id(user_id) as user_id_hash,
  session_id,
  anonymize_spreadsheet_id(spreadsheet_id) as spreadsheet_id_hash,
  cell_id,
  event_type,
  event_timestamp,
  processing_time_ms,
  cell_type,
  logic_level
FROM `polln_analytics.fact_events`;
```

### 7.2 User Consent Management

```typescript
/**
 * Consent management for analytics
 */
enum ConsentType {
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
}

interface ConsentState {
  [key: string]: boolean;
}

class ConsentManager {
  private consentState: ConsentState = {};

  constructor(private userId: string) {
    this.loadConsent();
  }

  /**
   * Check if user has given consent for a specific type
   */
  hasConsent(type: ConsentType): boolean {
    return this.consentState[type] === true;
  }

  /**
   * Grant consent
   */
  grantConsent(type: ConsentType): void {
    this.consentState[type] = true;
    this.saveConsent();
    this.trackConsentChange(type, true);
  }

  /**
   * Revoke consent
   */
  revokeConsent(type: ConsentType): void {
    this.consentState[type] = false;
    this.saveConsent();
    this.trackConsentChange(type, false);

    // Trigger data deletion if analytics consent is revoked
    if (type === ConsentType.ANALYTICS) {
      this.initiateDataDeletion();
    }
  }

  /**
   * Load consent from storage
   */
  private loadConsent(): void {
    const stored = localStorage.getItem(`consent_${this.userId}`);
    if (stored) {
      this.consentState = JSON.parse(stored);
    }
  }

  /**
   * Save consent to storage
   */
  private saveConsent(): void {
    localStorage.setItem(
      `consent_${this.userId}`,
      JSON.stringify(this.consentState)
    );
  }

  /**
   * Track consent changes
   */
  private trackConsentChange(type: ConsentType, granted: boolean): void {
    if (!this.hasConsent(ConsentType.ANALYTICS)) {
      return; // Don't track if analytics consent not granted
    }

    // Track consent change event
    window.analytics?.track('consent_changed', {
      consent_type: type,
      granted: granted,
      timestamp: Date.now(),
    });
  }

  /**
   * Initiate data deletion (GDPR right to be forgotten)
   */
  private async initiateDataDeletion(): Promise<void> {
    const response = await fetch('/api/analytics/delete-user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.userId,
        requestId: crypto.randomUUID(),
      }),
    });

    if (response.ok) {
      console.log('Data deletion initiated');
    }
  }
}
```

### 7.3 Right to be Forgotten

```sql
-- Stored procedure to delete all user data
CREATE OR REPLACE PROCEDURE `polln_analytics.delete_user_data`(user_id STRING)
BEGIN
  -- Delete from fact table
  DELETE FROM `polln_analytics.fact_events`
  WHERE user_id = user_id;

  -- Delete from dimension table
  DELETE FROM `polln_analytics.dim_users`
  WHERE user_id = user_id;

  -- Delete from aggregate tables
  DELETE FROM `polln_analytics.aggr_daily_user_activity`
  WHERE user_id = user_id;

  -- Log deletion
  INSERT INTO `polln_analytics.data_deletions` (
    user_id,
    deleted_at,
    deleted_by
  ) VALUES (
    user_id,
    CURRENT_TIMESTAMP(),
    'gdpr_request'
  );

  -- Select deleted row count
  SELECT ROW_COUNT() as deleted_rows;
END;

-- Create data deletion log table
CREATE TABLE `polln_analytics.data_deletions` (
  deletion_id STRING NOT NULL,
  user_id STRING NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  deleted_by STRING NOT NULL,
  deletion_reason STRING,
  rows_deleted INT64,

) PRIMARY KEY (deletion_id);
```

### 7.4 Data Retention Policies

```sql
-- Create retention policy table
CREATE TABLE `polln_analytics.retention_policies` (
  policy_id STRING NOT NULL,
  table_name STRING NOT NULL,
  retention_days INT64 NOT NULL,
  policy_description STRING,
  created_at TIMESTAMP NOT NULL,

) PRIMARY KEY (policy_id);

-- Insert retention policies
INSERT INTO `polln_analytics.retention_policies` VALUES
  ('raw_events_90d', 'fact_events_raw', 90, 'Raw events retained for 90 days', CURRENT_TIMESTAMP()),
  'processed_events_1y', 'fact_events', 365, 'Processed events retained for 1 year', CURRENT_TIMESTAMP()),
  ('aggregates_2y', 'aggr_daily_user_activity', 730, 'Daily aggregates retained for 2 years', CURRENT_TIMESTAMP()),
  ('dimensions_forever', 'dim_users', NULL, 'User dimensions retained indefinitely', CURRENT_TIMESTAMP());

-- Stored procedure to enforce retention
CREATE OR REPLACE PROCEDURE `polln_analytics.enforce_retention`()
BEGIN
  DECLARE table_name STRING;
  DECLARE retention_days INT64;
  DECLARE cutoff_date DATE;

  -- Cursor for policies
  DECLARE policy_cursor CURSOR FOR
    SELECT table_name, retention_days
    FROM `polln_analytics.retention_policies`
    WHERE retention_days IS NOT NULL;

  OPEN policy_cursor;
  LOOP
    FETCH policy_cursor INTO table_name, retention_days;
    IF NOT DONE THEN
      SET cutoff_date = DATE_SUB(CURRENT_DATE(), INTERVAL retention_days DAY);

      -- Execute delete for each table
      EXECUTE IMMEDIATE FORMAT(
        'DELETE FROM `polln_analytics.%s` WHERE event_date < "%s"',
        table_name, cutoff_date
      );

      -- Log deletion
      INSERT INTO `polln_analytics.retention_logs` (
        table_name,
        cutoff_date,
        deleted_at,
        rows_deleted
      ) VALUES (
        table_name,
        cutoff_date,
        CURRENT_TIMESTAMP(),
        ROW_COUNT()
      );
    END IF;
  END LOOP;
  CLOSE policy_cursor;
END;

-- Schedule to run daily
-- (Use BigQuery scheduled queries or Cloud Scheduler)
```

---

## 8. Cost Optimization

### 8.1 Query Optimization

```sql
-- Bad: Scans entire table
SELECT *
FROM `polln_analytics.fact_events`
WHERE cell_type = 'AnalysisCell';

-- Good: Uses partition pruning
SELECT *
FROM `polln_analytics.fact_events`
WHERE cell_type = 'AnalysisCell'
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);

-- Better: Uses clustering
SELECT *
FROM `polln_analytics.fact_events`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND cell_type = 'AnalysisCell';

-- Best: Materialized view
SELECT *
FROM `polln_analytics.mv_analysis_cell_performance`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
```

### 8.2 Materialized Views

```sql
-- Frequently accessed aggregations
CREATE MATERIALIZED VIEW `polln_analytics.mv_daily_cell_metrics`
AS
SELECT
  event_date,
  cell_type,
  logic_level,
  COUNT(*) as total_operations,
  SUM(processing_time_ms) as total_processing_time_ms,
  AVG(processing_time_ms) as avg_processing_time_ms,
  PERCENTILE_CONT(processing_time_ms, 0.95) OVER (
    PARTITION BY event_date, cell_type
  ) as p95_processing_time_ms,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT spreadsheet_id) as unique_spreadsheets
FROM `polln_analytics.fact_events`
WHERE event_type LIKE 'cell_%'
GROUP BY event_date, cell_type, logic_level
OPTIONS (enable_refresh = true, refresh_interval_minutes = 60);

-- Refresh manually when needed
CALL BQ.REFRESH_MATERIALIZED_VIEW('polln_analytics.mv_daily_cell_metrics');
```

### 8.3 Data Lifecycle Management

```sql
-- Automated data lifecycle
CREATE OR REPLACE PROCEDURE `polln_analytics.manage_data_lifecycle`()
BEGIN
  -- Move hot data to warm storage (after 30 days)
  INSERT INTO `polln_analytics.fact_events_warm`
  SELECT * FROM `polln_analytics.fact_events_hot`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);

  DELETE FROM `polln_analytics.fact_events_hot`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);

  -- Move warm data to cold storage (after 90 days)
  INSERT INTO `polln_analytics.fact_events_cold`
  SELECT * FROM `polln_analytics.fact_events_warm`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

  DELETE FROM `polln_analytics.fact_events_warm`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

  -- Archive cold data to GCS (after 1 year)
  EXPORT DATA OPTIONS(
    uri='gs://polln-analytics-archive/events_*.parquet',
    format='PARQUET',
    compression='SNAPPY'
  ) AS
  SELECT * FROM `polln_analytics.fact_events_cold`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY);

  DELETE FROM `polln_analytics.fact_events_cold`
  WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY);
END;
```

### 8.4 Compression Strategies

```sql
-- Use nested/repeated fields instead of multiple rows
CREATE TABLE `polln_analytics.fact_events_optimized` (
  event_id STRING NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  user_id STRING,

  -- Nested fields for better compression
  event_properties STRUCT<
    cell_type STRING,
    logic_level INT64,
    processing_time_ms INT64,
    memory_usage_bytes INT64
  >,

  -- Repeated fields for arrays
  tags ARRAY<STRING>,

  -- Partitioning
  event_date DATE NOT NULL,

) PARTITION BY event_date
CLUSTER BY user_id;

-- Use PARTITION BY with integer partitioning for better pruning
CREATE TABLE `polln_analytics.fact_events_partitioned` (
  event_id STRING NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  user_id STRING,

  -- Integer partitioning (more efficient than date)
  partition_id INT64 NOT NULL,

) PARTITION BY RANGE_BUCKET(partition_id, GENERATE_ARRAY(0, 1000));
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up BigQuery project and datasets
- [ ] Configure Airbyte for data ingestion
- [ ] Implement client-side event tracking
- [ ] Set up Redis for real-time aggregates
- [ ] Create basic dbt models (staging)

### Phase 2: Core Pipeline (Weeks 3-4)
- [ ] Implement server-side event tracking
- [ ] Set up event queue with Redis Streams
- [ ] Create dbt intermediate models
- [ ] Implement data quality checks
- [ ] Set up ClickHouse for real-time queries

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Implement real-time analytics with Kafka
- [ ] Create materialized views
- [ ] Build POLLN-specific sensation/learning models
- [ ] Implement data anonymization
- [ ] Set up consent management

### Phase 4: BI & Visualization (Weeks 7-8)
- [ ] Deploy Metabase instance
- [ ] Create core dashboards
- [ ] Implement embedded analytics
- [ ] Set up scheduled reports
- [ ] Build self-service analytics

### Phase 5: Optimization & Compliance (Weeks 9-10)
- [ ] Implement query optimization
- [ ] Set up data lifecycle management
- [ ] Implement GDPR compliance
- [ ] Create retention policies
- [ ] Optimize storage costs

### Phase 6: Advanced Analytics (Weeks 11-12)
- [ ] Implement funnel analysis
- [ ] Build cohort analysis
- [ ] Create retention curves
- [ ] Implement feature usage tracking
- [ ] Build custom analytics APIs

---

## Appendix: Sample Queries

### A1: Daily Active Users
```sql
SELECT
  event_date,
  COUNT(DISTINCT user_id) as daily_active_users
FROM `polln_analytics.fact_events`
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30;
```

### A2: Cell Performance by Type
```sql
SELECT
  cell_type,
  logic_level,
  COUNT(*) as total_operations,
  AVG(processing_time_ms) as avg_processing_time_ms,
  PERCENTILE_CONT(processing_time_ms, 0.95) OVER (
    PARTITION BY cell_type
  ) as p95_processing_time_ms,
  SUM(CASE WHEN event_type = 'cell_processing_failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as failure_rate_percent
FROM `polln_analytics.fact_events`
WHERE event_type LIKE 'cell_processing%'
GROUP BY cell_type, logic_level
ORDER BY total_operations DESC;
```

### A3: POLLN Sensation Analysis
```sql
WITH sensation_stats AS (
  SELECT
    sensation_type,
    DATE(sensed_at) as sensation_date,
    COUNT(*) as total_sensations,
    AVG(confidence_score) as avg_confidence,
    COUNT(DISTINCT cell_id) as unique_cells
  FROM `polln_analytics.fact_cell_sensations`
  GROUP BY sensation_type, sensation_date
)

SELECT
  sensation_type,
  sensation_date,
  total_sensations,
  unique_cells,
  avg_confidence,
  LAG(total_sensations) OVER (
    PARTITION BY sensation_type
    ORDER BY sensation_date
  ) as prev_day_sensations
FROM sensation_stats
ORDER BY sensation_type, sensation_date DESC;
```

### A4: Learning Events Trend
```sql
SELECT
  DATE(learned_at) as learning_date,
  pattern_type,
  COUNT(*) as total_learning_events,
  AVG(confidence_score) as avg_confidence,
  COUNT(DISTINCT cell_id) as unique_cells_learning,
  AVG(sample_size) as avg_pattern_sample_size
FROM `polln_analytics.fact_cell_learning`
GROUP BY learning_date, pattern_type
ORDER BY learning_date DESC, pattern_type;
```

### A5: User Journey Analysis
```sql
WITH user_journey AS (
  SELECT
    user_id,
    event_type,
    event_timestamp,
    LEAD(event_type) OVER (
      PARTITION BY user_id
      ORDER BY event_timestamp
    ) as next_event_type,
    LEAD(event_timestamp) OVER (
      PARTITION BY user_id
      ORDER BY event_timestamp
    ) as next_event_timestamp
  FROM `polln_analytics.fact_events`
  WHERE user_id IS NOT NULL
),

transitions AS (
  SELECT
    event_type,
    next_event_type,
    COUNT(*) as transition_count,
    AVG(TIMESTAMP_DIFF(next_event_timestamp, event_timestamp, SECOND)) as avg_time_seconds
  FROM user_journey
  WHERE next_event_type IS NOT NULL
  GROUP BY event_type, next_event_type
)

SELECT
  event_type,
  next_event_type,
  transition_count,
  SUM(transition_count) OVER (PARTITION BY event_type) as total_from_event,
  ROUND(transition_count * 100.0 / SUM(transition_count) OVER (PARTITION BY event_type), 2) as transition_percent,
  avg_time_seconds
FROM transitions
ORDER BY event_type, transition_count DESC;
```

---

**Document Version:** 1.0
**Last Updated:** 2026-03-09
**Author:** POLLN Analytics Team
**Status:** Ready for Implementation
