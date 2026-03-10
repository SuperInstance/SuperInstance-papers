/**
 * POLLN Database Integration Connector
 *
 * Integrates POLLN cells with PostgreSQL for persistent storage,
 * complex queries, transactions, and streaming results.
 */

import { EventEmitter } from 'events';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import {
  IntegrationConnector,
  IntegrationConfig,
  IntegrationType,
  ConnectionState,
  IntegrationResult,
  IntegrationError,
  HealthStatus,
  IntegrationMetrics,
  ErrorCode,
} from '../types.js';

// ============================================================================
// Database-Specific Types
// ============================================================================

export interface DatabaseConfig extends IntegrationConfig {
  type: IntegrationType.DATABASE;
  credentials: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
  options?: {
    poolSize?: number;
    idleTimeoutMs?: number;
    connectionTimeoutMs?: number;
    statementTimeout?: number;
  };
}

export interface QueryOptions {
  parameters?: any[];
  timeout?: number;
  rows?: boolean; // Return rows only
  single?: boolean; // Return single row
  stream?: boolean; // Return stream
}

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
}

export interface DatabaseSchema {
  tables: TableSchema[];
  views: ViewSchema[];
  functions: FunctionSchema[];
}

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKeySchema {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface ViewSchema {
  name: string;
  schema: string;
  definition: string;
}

export interface FunctionSchema {
  name: string;
  schema: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
}

// ============================================================================
// Query Builder
// ============================================================================

class QueryBuilder {
  private tableName: string;
  private action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  private columns: string[] = [];
  private where: string[] = [];
  private orderBy: string[] = [];
  private parameters: any[] = [];
  private limit?: number;
  private offset?: number;
  private joins: string[] = [];
  private groupBy: string[] = [];
  private having: string[] = [];

  constructor(table: string, action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') {
    this.tableName = table;
    this.action = action;
  }

  static select(table: string, columns?: string[]): QueryBuilder {
    const builder = new QueryBuilder(table, 'SELECT');
    if (columns) {
      builder.columns = columns;
    }
    return builder;
  }

  static insert(table: string): QueryBuilder {
    return new QueryBuilder(table, 'INSERT');
  }

  static update(table: string): QueryBuilder {
    return new QueryBuilder(table, 'UPDATE');
  }

  static delete(table: string): QueryBuilder {
    return new QueryBuilder(table, 'DELETE');
  }

  where(condition: string, ...params: any[]): this {
    this.where.push(condition);
    this.parameters.push(...params);
    return this;
  }

  join(table: string, on: string): this {
    this.joins.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table: string, on: string): this {
    this.joins.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  groupBy(...columns: string[]): this {
    this.groupBy.push(...columns);
    return this;
  }

  having(condition: string, ...params: any[]): this {
    this.having.push(condition);
    this.parameters.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBy.push(`${column} ${direction}`);
    return this;
  }

  limit(count: number): this {
    this.limit = count;
    return this;
  }

  offset(count: number): this {
    this.offset = count;
    return this;
  }

  set(column: string, value: any): this {
    this.columns.push(column);
    this.parameters.push(value);
    return this;
  }

  values(data: Record<string, any>): this {
    Object.keys(data).forEach(key => {
      this.columns.push(key);
      this.parameters.push(data[key]);
    });
    return this;
  }

  build(): { text: string; values: any[] } {
    let query = '';

    switch (this.action) {
      case 'SELECT':
        query = this.buildSelect();
        break;
      case 'INSERT':
        query = this.buildInsert();
        break;
      case 'UPDATE':
        query = this.buildUpdate();
        break;
      case 'DELETE':
        query = this.buildDelete();
        break;
    }

    return {
      text: query,
      values: this.parameters,
    };
  }

  private buildSelect(): string {
    const cols = this.columns.length > 0 ? this.columns.join(', ') : '*';
    let query = `SELECT ${cols} FROM ${this.tableName}`;

    if (this.joins.length > 0) {
      query += ' ' + this.joins.join(' ');
    }

    if (this.where.length > 0) {
      query += ' WHERE ' + this.where.join(' AND ');
    }

    if (this.groupBy.length > 0) {
      query += ' GROUP BY ' + this.groupBy.join(', ');
    }

    if (this.having.length > 0) {
      query += ' HAVING ' + this.having.join(' AND ');
    }

    if (this.orderBy.length > 0) {
      query += ' ORDER BY ' + this.orderBy.join(', ');
    }

    if (this.limit !== undefined) {
      query += ` LIMIT ${this.limit}`;
    }

    if (this.offset !== undefined) {
      query += ` OFFSET ${this.offset}`;
    }

    return query;
  }

  private buildInsert(): string {
    const cols = this.columns.join(', ');
    const placeholders = this.columns.map((_, i) => `$${i + 1}`).join(', ');
    return `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders}) RETURNING *`;
  }

  private buildUpdate(): string {
    const setClause = this.columns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(', ');
    let query = `UPDATE ${this.tableName} SET ${setClause}`;

    if (this.where.length > 0) {
      const offset = this.columns.length;
      const whereClause = this.where
        .map((cond, i) => cond.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + offset}`))
        .join(' AND ');
      query += ' WHERE ' + whereClause;
    }

    query += ' RETURNING *';
    return query;
  }

  private buildDelete(): string {
    let query = `DELETE FROM ${this.tableName}`;

    if (this.where.length > 0) {
      query += ' WHERE ' + this.where.join(' AND ');
    }

    query += ' RETURNING *';
    return query;
  }
}

// ============================================================================
// Transaction Handler
// ============================================================================

class TransactionHandler {
  constructor(
    private client: PoolClient,
    private connector: DatabaseConnector
  ) {}

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return await this.client.query<T>(text, params);
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
    await this.client.release();
    this.connector.emit('transaction:committed', { timestamp: Date.now() });
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
    await this.client.release();
    this.connector.emit('transaction:rolledback', { timestamp: Date.now() });
  }
}

// ============================================================================
// Database Connector
// ============================================================================

export class DatabaseConnector extends EventEmitter implements IntegrationConnector {
  readonly id: string;
  readonly name: string;
  readonly type = IntegrationType.DATABASE;
  state: ConnectionState = ConnectionState.DISCONNECTED;

  private config: DatabaseConfig;
  private pool: Pool;
  private metrics: IntegrationMetrics;
  private connectionTime: number = 0;

  constructor(config: DatabaseConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.pool = this.createPool();
    this.metrics = this.createEmptyMetrics();
  }

  // ========================================================================
  // Connector Interface Implementation
  // ========================================================================

  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config as DatabaseConfig;
    this.pool = this.createPool();
    this.state = ConnectionState.DISCONNECTED;
    this.emit('initialized', { timestamp: Date.now() });
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.state = ConnectionState.CONNECTED;
      this.connectionTime = Date.now();

      this.emit('connected', {
        timestamp: Date.now(),
        connectionTime: this.connectionTime,
      });
    } catch (error) {
      this.state = ConnectionState.ERROR;
      throw this.createError(
        ErrorCode.CONNECTION_REFUSED,
        `Failed to connect to database: ${error.message}`,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    this.state = ConnectionState.DISCONNECTED;
    this.connectionTime = 0;
    this.emit('disconnected', { timestamp: Date.now() });
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.pool.totalCount > 0;
  }

  async send(operation: string, data: any): Promise<IntegrationResult> {
    if (!this.isConnected()) {
      return this.errorResult(
        ErrorCode.CONNECTION_REFUSED,
        'Not connected to database'
      );
    }

    const startTime = Date.now();

    try {
      let result: any;

      switch (operation) {
        case 'query':
        case 'execute':
          result = await this.executeQuery(data.text, data.parameters);
          break;

        case 'select':
          result = await this.select(data.table, data);
          break;

        case 'insert':
          result = await this.insert(data.table, data);
          break;

        case 'update':
          result = await this.update(data.table, data);
          break;

        case 'delete':
          result = await this.delete(data.table, data);
          break;

        case 'transaction':
        case 'begin':
          result = await this.beginTransaction(data);
          break;

        case 'schema':
        case 'getSchema':
          result = await this.getSchema(data.schemaName);
          break;

        case 'table':
        case 'getTableSchema':
          result = await this.getTableSchema(data.tableName, data.schemaName);
          break;

        case 'stream':
        case 'executeStream':
          result = await this.executeStream(data.text, data.parameters);
          break;

        default:
          return this.errorResult(
            ErrorCode.OPERATION_NOT_SUPPORTED,
            `Unsupported operation: ${operation}`
          );
      }

      const duration = Date.now() - startTime;
      this.recordSuccess(duration, 0, 0);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: Date.now(),
          duration,
          retries: 0,
          requestId: this.generateRequestId(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(duration);

      return this.errorResult(
        this.mapErrorCode(error),
        error.message,
        error
      );
    }
  }

  async receive(event: string, data: any): Promise<void> {
    // Database connector doesn't receive external events
    this.emit('received', { event, data, timestamp: Date.now() });
  }

  async healthCheck(): Promise<HealthStatus> {
    const details: any = {
      connection: false,
      authentication: false,
      rateLimit: true,
      errors: [],
    };

    try {
      // Check connection
      details.connection = this.isConnected();

      // Check authentication by executing a query
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        details.authentication = true;
      } catch (error) {
        details.authentication = false;
        details.errors.push(error.message);
      }

      // Check pool status
      details.pool = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };

      return {
        status: details.connection && details.authentication ? 'healthy' : 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    } catch (error) {
      details.errors.push(error.message);
      return {
        status: 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    }
  }

  getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  async dispose(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }

  // ========================================================================
  // Query Operations
  // ========================================================================

  /**
   * Execute a raw SQL query
   */
  async executeQuery<T extends QueryResultRow = any>(
    text: string,
    parameters?: any[]
  ): Promise<QueryResult<T>> {
    return await this.pool.query<T>(text, parameters);
  }

  /**
   * Select from table
   */
  async select<T extends QueryResultRow = any>(
    table: string,
    options: QueryOptions & {
      where?: { [key: string]: any };
      orderBy?: string | { [key: string]: 'ASC' | 'DESC' };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueryResult<T>> {
    let builder = QueryBuilder.select(table);

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.where(`${key} = $${builder['parameters'].length + 1}`, value);
      });
    }

    if (options.orderBy) {
      if (typeof options.orderBy === 'string') {
        builder.orderBy(options.orderBy);
      } else {
        Object.entries(options.orderBy).forEach(([col, dir]) => {
          builder.orderBy(col, dir);
        });
      }
    }

    if (options.limit) builder.limit(options.limit);
    if (options.offset) builder.offset(options.offset);

    const query = builder.build();
    return await this.executeQuery<T>(query.text, query.values);
  }

  /**
   * Insert into table
   */
  async insert<T extends QueryResultRow = any>(
    table: string,
    data: Record<string, any>
  ): Promise<QueryResult<T>> {
    const builder = QueryBuilder.insert(table).values(data);
    const query = builder.build();
    return await this.executeQuery<T>(query.text, query.values);
  }

  /**
   * Update table
   */
  async update<T extends QueryResultRow = any>(
    table: string,
    options: {
      data: Record<string, any>;
      where?: { [key: string]: any };
    }
  ): Promise<QueryResult<T>> {
    let builder = QueryBuilder.update(table);

    Object.entries(options.data).forEach(([key, value]) => {
      builder = builder.set(key, value);
    });

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.where(`${key} = ?`, value);
      });
    }

    const query = builder.build();
    return await this.executeQuery<T>(query.text, query.values);
  }

  /**
   * Delete from table
   */
  async delete<T extends QueryResultRow = any>(
    table: string,
    where?: { [key: string]: any }
  ): Promise<QueryResult<T>> {
    let builder = QueryBuilder.delete(table);

    if (where) {
      Object.entries(where).forEach(([key, value]) => {
        builder = builder.where(`${key} = ?`, value);
      });
    }

    const query = builder.build();
    return await this.executeQuery<T>(query.text, query.values);
  }

  // ========================================================================
  // Transaction Operations
  // ========================================================================

  /**
   * Begin a transaction
   */
  async beginTransaction(options?: TransactionOptions): Promise<TransactionHandler> {
    const client = await this.pool.connect();

    try {
      let query = 'BEGIN';
      if (options?.isolationLevel) {
        query += ` ISOLATION LEVEL ${options.isolationLevel}`;
      }
      if (options?.readOnly) {
        query += ' READ ONLY';
      }
      if (options?.deferrable) {
        query += ' DEFERRABLE';
      }

      await client.query(query);

      this.emit('transaction:started', {
        timestamp: Date.now(),
        options,
      });

      return new TransactionHandler(client, this);
    } catch (error) {
      client.release();
      throw error;
    }
  }

  // ========================================================================
  // Schema Operations
  // ========================================================================

  /**
   * Get database schema
   */
  async getSchema(schemaName: string = 'public'): Promise<DatabaseSchema> {
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    `;
    const tablesResult = await this.executeQuery(tablesQuery, [schemaName]);

    const tables: TableSchema[] = [];
    for (const row of tablesResult.rows) {
      const tableSchema = await this.getTableSchema(row.table_name, schemaName);
      tables.push(tableSchema);
    }

    const viewsQuery = `
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = $1
    `;
    const viewsResult = await this.executeQuery(viewsQuery, [schemaName]);
    const views: ViewSchema[] = viewsResult.rows.map(row => ({
      name: row.table_name,
      schema: schemaName,
      definition: row.view_definition,
    }));

    return {
      tables,
      views,
      functions: [],
    };
  }

  /**
   * Get table schema
   */
  async getTableSchema(
    tableName: string,
    schemaName: string = 'public'
  ): Promise<TableSchema> {
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = $1
            AND tc.table_name = $2
            AND kcu.column_name = columns.column_name
            AND tc.constraint_type = 'PRIMARY KEY'
        ) as is_primary_key
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const columnsResult = await this.executeQuery(columnsQuery, [
      schemaName,
      tableName,
    ]);

    const columns: ColumnSchema[] = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      primaryKey: row.is_primary_key,
    }));

    const indexesQuery = `
      SELECT
        i.indexname as name,
        i.indexdef as definition,
        ix.indisunique as is_unique
      FROM pg_indexes i
      JOIN pg_index ix ON i.indexname = ix.indexrelname::name
      WHERE i.schemaname = $1 AND i.tablename = $2
    `;

    const indexesResult = await this.executeQuery(indexesQuery, [
      schemaName,
      tableName,
    ]);

    const indexes: IndexSchema[] = indexesResult.rows.map(row => {
      const columns = row.definition.match(/\(([^)]+)\)/)?.[1].split(', ') || [];
      return {
        name: row.name,
        columns,
        unique: row.is_unique,
      };
    });

    return {
      name: tableName,
      schema: schemaName,
      columns,
      indexes,
      foreignKeys: [],
    };
  }

  // ========================================================================
  // Streaming Operations
  // ========================================================================

  /**
   * Execute a streaming query
   */
  async executeStream(
    text: string,
    parameters?: any[],
    onRow: (row: any) => void = () => {}
  ): Promise<any[]> {
    const client = await this.pool.connect();
    const rows: any[] = [];

    try {
      const stream = client.query(new this.pool.Query(text, parameters));

      return new Promise((resolve, reject) => {
        stream.on('row', (row: any) => {
          rows.push(row);
          onRow(row);
        });

        stream.on('error', (error: Error) => {
          client.release();
          reject(error);
        });

        stream.on('end', () => {
          client.release();
          resolve(rows);
        });
      });
    } catch (error) {
      client.release();
      throw error;
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private createPool(): Pool {
    const config = this.config.credentials;
    const options = this.config.options || {};

    return new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: options.poolSize || 20,
      idleTimeoutMillis: options.idleTimeoutMs || 30000,
      connectionTimeoutMillis: options.connectionTimeoutMs || 2000,
      statement_timeout: options.statementTimeout,
    });
  }

  private createEmptyMetrics(): IntegrationMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      bytesSent: 0,
      bytesReceived: 0,
      rateLimitHits: 0,
      retryAttempts: 0,
      uptime: 100,
    };
  }

  private recordSuccess(duration: number, bytesSent: number, bytesReceived: number): void {
    this.metrics.totalOperations++;
    this.metrics.successfulOperations++;
    this.metrics.bytesSent += bytesSent;
    this.metrics.bytesReceived += bytesReceived;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private recordError(duration: number): void {
    this.metrics.totalOperations++;
    this.metrics.failedOperations++;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private errorResult(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationResult {
    return {
      success: false,
      error: this.createError(code, message, cause),
      metadata: {
        timestamp: Date.now(),
        duration: 0,
        retries: 0,
      },
    };
  }

  private createError(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationError {
    return {
      code,
      message,
      cause,
      retryable: this.isRetryable(code),
      retryDelay: this.calculateRetryDelay(code),
    };
  }

  private mapErrorCode(error: any): ErrorCode {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    if (message.includes('connection') || code === 'ECONNREFUSED') {
      return ErrorCode.CONNECTION_REFUSED;
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT;
    }
    if (message.includes('authentication') || message.includes('password')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('syntax') || message.includes('invalid')) {
      return ErrorCode.BAD_REQUEST;
    }
    if (message.includes('duplicate') || message.includes('unique')) {
      return ErrorCode.CONFLICT;
    }
    if (message.includes('not found')) {
      return ErrorCode.NOT_FOUND;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  private isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.CONNECTION_REFUSED,
      ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(code);
  }

  private calculateRetryDelay(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.TIMEOUT:
      case ErrorCode.CONNECTION_REFUSED:
        return 5000; // 5 seconds
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 10000; // 10 seconds
      default:
        return 1000; // 1 second
    }
  }

  private generateRequestId(): string {
    return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export QueryBuilder for external use
export { QueryBuilder };
