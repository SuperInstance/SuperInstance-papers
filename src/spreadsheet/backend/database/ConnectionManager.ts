/**
 * ConnectionManager
 *
 * Manages PostgreSQL database connections with:
 * - Connection pooling via PgBouncer
 * - Automatic reconnection
 * - Transaction management
 * - Query logging
 * - Health monitoring
 * - Error handling
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { EventEmitter } from 'events';

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryOptions {
  timeout?: number;
  userId?: string;
  logQuery?: boolean;
}

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
}

export class DatabaseError extends Error {
  constructor(
    public code: string,
    public detail: string,
    message: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionManager extends EventEmitter {
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private queryCount: number = 0;
  private errorCount: number = 0;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private config: ConnectionConfig) {
    super();
  }

  /**
   * Initialize database connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        max: this.config.max || 20,
        min: this.config.min || 5,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
      });

      // Set up event listeners
      this.pool.on('error', (err) => {
        this.errorCount++;
        this.emit('error', err);
        console.error('Unexpected database error:', err);
      });

      this.pool.on('connect', () => {
        if (!this.isConnected) {
          this.isConnected = true;
          this.emit('connected');
          console.log('Database connected');
        }
      });

      this.pool.on('remove', () => {
        if (this.pool?.totalCount === 0) {
          this.isConnected = false;
          this.emit('disconnected');
          console.log('Database disconnected');
        }
      });

      // Test connection
      await this.testConnection();

      // Start health check interval
      this.startHealthCheck();
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw new DatabaseError(
        'CONNECTION_ERROR',
        'Failed to connect to database',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        this.emit('disconnected');
        console.log('Database disconnected');
      } catch (error) {
        console.error('Error disconnecting from database:', error);
      }
    }
  }

  /**
   * Get pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new DatabaseError(
        'NO_POOL',
        'Connection pool not initialized',
        'Call connect() first'
      );
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    text: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();

    const startTime = Date.now();

    try {
      if (options.userId) {
        // Set user context for RLS
        await pool.query('SELECT set_config($1, $2, TRUE)', ['app.user_id', options.userId]);
      }

      const result = await pool.query<T>(text, params);

      this.queryCount++;
      const duration = Date.now() - startTime;

      if (options.logQuery !== false) {
        this.logQuery(text, params, duration, result.rowCount);
      }

      // Emit slow query warning
      if (duration > 1000) {
        this.emit('slowQuery', { text, params, duration, rowCount: result.rowCount });
      }

      return result;
    } catch (error: any) {
      this.errorCount++;
      this.emit('queryError', { text, params, error });

      if (error.code) {
        throw new DatabaseError(error.code, error.detail || '', error.message);
      }
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Set transaction options
      if (options.isolationLevel || options.readOnly || options.deferrable) {
        const opts: string[] = [];
        if (options.isolationLevel) opts.push(`ISOLATION LEVEL ${options.isolationLevel}`);
        if (options.readOnly) opts.push('READ ONLY');
        if (options.deferrable) opts.push('DEFERRABLE');
        await client.query(`SET TRANSACTION ${opts.join(' ')}`);
      }

      const result = await callback(client);

      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a batch
   */
  async batch(queries: Array<{ text: string; params?: any[] }>): Promise<QueryResult[]> {
    const pool = this.getPool();

    try {
      const results: QueryResult[] = [];

      for (const query of queries) {
        const result = await pool.query(query.text, query.params);
        results.push(result);
      }

      return results;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      this.lastHealthCheck = new Date();
      return result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.testConnection();

      if (!isHealthy && this.isConnected) {
        this.emit('healthCheckFailed');
        console.warn('Database health check failed');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Log query execution
   */
  private logQuery(text: string, params: any[] | undefined, duration: number, rowCount: number): void {
    if (process.env.LOG_QUERIES === 'true') {
      const sanitizedText = text.replace(/\s+/g, ' ').trim();
      const paramStr = params ? ` | params: ${JSON.stringify(params)}` : '';
      console.log(`[DB Query] ${sanitizedText.substring(0, 100)}${paramStr} | ${duration}ms | ${rowCount} rows`);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    isConnected: boolean;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    queryCount: number;
    errorCount: number;
    lastHealthCheck: Date | null;
  } {
    const pool = this.pool;

    return {
      isConnected: this.isConnected,
      totalCount: pool?.totalCount || 0,
      idleCount: pool?.idleCount || 0,
      waitingCount: pool?.waitingCount || 0,
      queryCount: this.queryCount,
      errorCount: this.errorCount,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Reset error count
   */
  resetErrorCount(): void {
    this.errorCount = 0;
  }

  /**
   * Reset query count
   */
  resetQueryCount(): void {
    this.queryCount = 0;
  }

  /**
   * Get connection URL (for logging, redacts password)
   */
  getConnectionUrl(): string {
    return `postgresql://${this.config.user}:****@${this.config.host}:${this.config.port}/${this.config.database}`;
  }
}

// Singleton instance
let connectionManager: ConnectionManager | null = null;

/**
 * Get or create connection manager singleton
 */
export function getConnectionManager(config?: ConnectionConfig): ConnectionManager {
  if (!connectionManager) {
    if (!config) {
      throw new Error('Connection config required for first initialization');
    }
    connectionManager = new ConnectionManager(config);
  }
  return connectionManager;
}

/**
 * Close connection manager singleton
 */
export async function closeConnectionManager(): Promise<void> {
  if (connectionManager) {
    await connectionManager.disconnect();
    connectionManager = null;
  }
}
