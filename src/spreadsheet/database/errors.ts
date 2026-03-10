/**
 * Database Errors for POLLN Spreadsheet System
 *
 * Custom error classes for database operations.
 */

// ============================================================================
// Base Database Error
// ============================================================================

/**
 * Base class for all database errors
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Connection Errors
// ============================================================================

/**
 * Error thrown when database connection fails
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when connection pool is exhausted
 */
export class PoolExhaustedError extends ConnectionError {
  constructor(details?: Record<string, unknown>) {
    super('Connection pool exhausted - no available connections', 'POOL_EXHAUSTED', details);
    this.name = 'PoolExhaustedError';
  }
}

// ============================================================================
// Query Errors
// ============================================================================

/**
 * Error thrown when a query fails
 */
export class QueryError extends DatabaseError {
  public readonly query?: string;
  public readonly params?: unknown[];

  constructor(message: string, query?: string, params?: unknown[], details?: Record<string, unknown>) {
    super(message, 'QUERY_ERROR', { ...details, query, params });
    this.name = 'QueryError';
    this.query = query;
    this.params = params;
  }
}

/**
 * Error thrown when a constraint is violated
 */
export class ConstraintViolationError extends QueryError {
  public readonly constraint: string;

  constructor(message: string, constraint: string, query?: string, params?: unknown[]) {
    super(message, query, params, { constraint });
    this.name = 'ConstraintViolationError';
    this.constraint = constraint;
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueViolationError extends ConstraintViolationError {
  constructor(constraint: string, query?: string, params?: unknown[]) {
    super(`Unique constraint '${constraint}' violated`, constraint, query, params);
    this.name = 'UniqueViolationError';
  }
}

/**
 * Error thrown when a foreign key constraint is violated
 */
export class ForeignKeyViolationError extends ConstraintViolationError {
  constructor(constraint: string, query?: string, params?: unknown[]) {
    super(`Foreign key constraint '${constraint}' violated`, constraint, query, params);
    this.name = 'ForeignKeyViolationError';
  }
}

/**
 * Error thrown when a check constraint is violated
 */
export class CheckViolationError extends ConstraintViolationError {
  constructor(constraint: string, query?: string, params?: unknown[]) {
    super(`Check constraint '${constraint}' violated`, constraint, query, params);
    this.name = 'CheckViolationError';
  }
}

// ============================================================================
// Transaction Errors
// ============================================================================

/**
 * Error thrown when a transaction fails
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

/**
 * Error thrown when a transaction is already in progress
 */
export class TransactionInProgressError extends TransactionError {
  constructor() {
    super('Transaction already in progress', { status: 'in_progress' });
    this.name = 'TransactionInProgressError';
  }
}

/**
 * Error thrown when no transaction is in progress
 */
export class NoTransactionError extends TransactionError {
  constructor() {
    super('No transaction in progress', { status: 'none' });
    this.name = 'NoTransactionError';
  }
}

/**
 * Error thrown when a transaction times out
 */
export class TransactionTimeoutError extends TransactionError {
  constructor(timeout: number) {
    super(`Transaction timeout after ${timeout}ms`, { timeout });
    this.name = 'TransactionTimeoutError';
  }
}

// ============================================================================
// Entity Errors
// ============================================================================

/**
 * Error thrown when an entity is not found
 */
export class NotFoundError extends DatabaseError {
  public readonly entity: string;
  public readonly id?: string;

  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` with id '${id}'` : ''} not found`, 'NOT_FOUND', { entity, id });
    this.name = 'NotFoundError';
    this.entity = entity;
    this.id = id;
  }
}

/**
 * Error thrown when an entity already exists
 */
export class AlreadyExistsError extends DatabaseError {
  public readonly entity: string;
  public readonly field: string;
  public readonly value: unknown;

  constructor(entity: string, field: string, value: unknown) {
    super(`${entity} with ${field} '${value}' already exists`, 'ALREADY_EXISTS', { entity, field, value });
    this.name = 'AlreadyExistsError';
    this.entity = entity;
    this.field = field;
    this.value = value;
  }
}

/**
 * Error thrown when an entity version mismatch occurs (optimistic locking)
 */
export class VersionMismatchError extends DatabaseError {
  public readonly entity: string;
  public readonly id: string;
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(entity: string, id: string, expectedVersion: number, actualVersion: number) {
    super(
      `${entity} version mismatch: expected ${expectedVersion}, got ${actualVersion}`,
      'VERSION_MISMATCH',
      { entity, id, expectedVersion, actualVersion }
    );
    this.name = 'VersionMismatchError';
    this.entity = entity;
    this.id = id;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

// ============================================================================
// Migration Errors
// ============================================================================

/**
 * Error thrown when a migration fails
 */
export class MigrationError extends DatabaseError {
  public readonly migration: string;

  constructor(message: string, migration: string, details?: Record<string, unknown>) {
    super(message, 'MIGRATION_ERROR', { migration, ...details });
    this.name = 'MigrationError';
    this.migration = migration;
  }
}

/**
 * Error thrown when a migration version is invalid
 */
export class InvalidMigrationVersionError extends MigrationError {
  constructor(migration: string, version: number) {
    super(`Invalid migration version ${version} for ${migration}`, migration, { version });
    this.name = 'InvalidMigrationVersionError';
  }
}

/**
 * Error thrown when a migration is already applied
 */
export class MigrationAlreadyAppliedError extends MigrationError {
  constructor(migration: string, version: number) {
    super(`Migration ${migration} (version ${version}) already applied`, migration, { version });
    this.name = 'MigrationAlreadyAppliedError';
  }
}

/**
 * Error thrown when a migration has not been applied
 */
export class MigrationNotAppliedError extends MigrationError {
  constructor(migration: string, version: number) {
    super(`Migration ${migration} (version ${version}) has not been applied`, migration, { version });
    this.name = 'MigrationNotAppliedError';
  }
}

// ============================================================================
// Cache Errors
// ============================================================================

/**
 * Error thrown when cache operation fails
 */
export class CacheError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CACHE_ERROR', details);
    this.name = 'CacheError';
  }
}

/**
 * Error thrown when cache connection fails
 */
export class CacheConnectionError extends CacheError {
  constructor(details?: Record<string, unknown>) {
    super('Failed to connect to cache', details);
    this.name = 'CacheConnectionError';
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends DatabaseError {
  public readonly field: string;
  public readonly value: unknown;

  constructor(message: string, field: string, value: unknown) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Error thrown when required field is missing
 */
export class MissingFieldError extends ValidationError {
  constructor(field: string) {
    super(`Required field '${field}' is missing`, field, undefined);
    this.name = 'MissingFieldError';
  }
}

/**
 * Error thrown when field value is invalid
 */
export class InvalidFieldValueError extends ValidationError {
  constructor(field: string, value: unknown, reason: string) {
    super(`Invalid value for field '${field}': ${reason}`, field, value);
    this.name = 'InvalidFieldValueError';
  }
}

// ============================================================================
// Permission Errors
// ============================================================================

/**
 * Error thrown when user lacks permission
 */
export class PermissionDeniedError extends DatabaseError {
  public readonly resource: string;
  public readonly action: string;
  public readonly userId: string;

  constructor(resource: string, action: string, userId: string) {
    super(
      `User '${userId}' denied permission to ${action} on ${resource}`,
      'PERMISSION_DENIED',
      { resource, action, userId }
    );
    this.name = 'PermissionDeniedError';
    this.resource = resource;
    this.action = action;
    this.userId = userId;
  }
}

// ============================================================================
// Health Check Errors
// ============================================================================

/**
 * Error thrown when health check fails
 */
export class HealthCheckError extends DatabaseError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Health check failed for ${service}`, 'HEALTH_CHECK_ERROR', { service, ...details });
    this.name = 'HealthCheckError';
  }
}
