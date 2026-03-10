/**
 * POLLN Spreadsheet Backend - Audit Module
 *
 * Comprehensive audit logging system for compliance.
 * Exports all audit-related components.
 */

// Core audit logger
export {
  AuditLogger,
  getAuditLogger,
  destroyAuditLogger,
  type AuditEvent,
  type AuditLoggerOptions,
  type AuditStatistics,
} from './AuditLogger.js';

// Event types
export {
  AuditCategory,
  AuthEventType,
  AuthzEventType,
  DataAccessEventType,
  DataModificationEventType,
  CollaborationEventType,
  UserManagementEventType,
  ConfigurationEventType,
  SystemEventType,
  SecurityEventType,
  ComplianceEventType,
  PerformanceEventType,
  AuditSeverity,
  AuditOutcome,
  getEventTypeMetadata,
  requiresImmediateAction,
  getRetentionDays,
  getSeverity,
  EVENT_TYPE_METADATA,
  EVENT_TYPE_GROUPS,
  type EventTypeMetadata,
} from './EventTypes.js';

// Storage backends
export {
  PostgreSQLAuditStorage,
  S3AuditStorage,
  ElasticsearchAuditStorage,
  MemoryAuditStorage,
  type AuditStorageBackend,
  type AuditQuery,
} from './AuditStorage.js';

// Query service
export {
  AuditQueryService,
  getAuditQueryService,
  type AuditQueryFilters,
  type AuditQueryOptions,
  type AuditQueryResult,
  type AggregationRequest,
  type AggregationResult,
  type QueryStatistics,
  type TimeSeriesPoint,
} from './AuditQuery.js';

// Compliance reporter
export {
  ComplianceReporter,
  getComplianceReporter,
  ReportType,
  ReportFormat,
  type ComplianceReport,
  type ReportMetadata,
  type ReportSummary,
  type UserActivityRecord,
  type SecurityIncident,
  type AccessReviewEntry,
  type GDPRDataAccessRecord,
} from './ComplianceReporter.js';

// Middleware
export {
  auditMiddleware,
  auditErrorHandler,
  performanceMonitor,
  type AuditMiddlewareOptions,
  type AuditedRequest,
} from './Middleware.js';

/**
 * Initialize audit system with recommended defaults
 */
export async function initializeAuditSystem(config?: {
  storage?: {
    postgres?: any;
    s3?: { bucket: string; region?: string };
    elasticsearch?: any;
  };
  logger?: {
    bufferSize?: number;
    flushInterval?: number;
    samplingEnabled?: boolean;
    maskSensitiveData?: boolean;
  };
  middleware?: {
    logBody?: boolean;
    logHeaders?: boolean;
    excludePaths?: string[];
  };
}) {
  const { getAuditLogger: getLogger } = await import('./AuditLogger.js');
  const { PostgreSQLAuditStorage, S3AuditStorage, ElasticsearchAuditStorage } = await import('./AuditStorage.js');

  const logger = getLogger(config?.logger);

  // Register storage backends
  if (config?.storage?.postgres) {
    const pgStorage = new PostgreSQLAuditStorage(config.storage.postgres);
    await pgStorage.initialize();
    logger.registerStorageBackend('postgresql', pgStorage);
  }

  if (config?.storage?.s3) {
    const s3Storage = new S3AuditStorage(config.storage.s3);
    await s3Storage.initialize();
    logger.registerStorageBackend('s3', s3Storage);
  }

  if (config?.storage?.elasticsearch) {
    const esStorage = new ElasticsearchAuditStorage(config.storage.elasticsearch);
    await esStorage.initialize();
    logger.registerStorageBackend('elasticsearch', esStorage);
  }

  return logger;
}

/**
 * Create Express middleware for audit logging
 */
export async function createAuditMiddleware(config?: {
  logger?: {
    bufferSize?: number;
    flushInterval?: number;
    samplingEnabled?: boolean;
    maskSensitiveData?: boolean;
  };
  middleware?: {
    logBody?: boolean;
    logHeaders?: boolean;
    excludePaths?: string[];
    sensitiveFields?: string[];
  };
}) {
  await initializeAuditSystem(config);
  const { auditMiddleware } = await import('./Middleware.js');
  return auditMiddleware(config?.middleware);
}

/**
 * Get compliance reporter instance
 */
export async function getComplianceReporter() {
  const { getComplianceReporter: getReporter } = await import('./ComplianceReporter.js');
  return getReporter();
}

/**
 * Shutdown audit system
 */
export async function shutdownAuditSystem() {
  const { destroyAuditLogger } = await import('./AuditLogger.js');
  destroyAuditLogger();
}
