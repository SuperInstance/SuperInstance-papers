/**
 * Database Manager for POLLN Spreadsheet System
 *
 * Central database management with connection pooling, transaction support,
 * health checks, and error handling.
 */

import type {
  Transaction,
  HealthStatus,
} from './types.js';
import type {
  Pool,
  PoolClient,
  QueryResult,
} from 'pg';
import {
  ConnectionError,
  TransactionInProgressError,
  NoTransactionError,
  HealthCheckError,
} from './errors.js';

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

/**
 * Database manager configuration
 */
export interface DatabaseManagerConfig {
  database: DatabaseConfig;
  cache: CacheConfig;
}

// ============================================================================
// Database Manager Implementation
// ============================================================================

/**
 * Database Manager - Central database and cache management
 *
 * Provides:
 * - Connection pooling for PostgreSQL
 * - Connection management for Redis cache
 * - Transaction support
 * - Health monitoring
 * - Prepared statement caching
 */
export class DatabaseManager {
  private pgPool: Pool | null = null;
  private redisClient: any | null = null;
  private transactionClient: PoolClient | null = null;
  private config: DatabaseManagerConfig;
  private isInitialized = false;

  constructor(config: DatabaseManagerConfig) {
    this.config = config;
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize database connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize PostgreSQL pool
      await this.initializePostgreSQL();

      // Initialize Redis cache
      await this.initializeRedis();

      this.isInitialized = true;
    } catch (error) {
      throw new ConnectionError(
        'Failed to initialize database connections',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private async initializePostgreSQL(): Promise<void> {
    try {
      // Dynamic import to allow optional pg dependency
      const { Pool } = await import('pg');

      this.pgPool = new Pool({
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        user: this.config.database.user,
        password: this.config.database.password,
        ssl: this.config.database.ssl ? { rejectUnauthorized: false } : undefined,
        min: this.config.database.pool?.min ?? 2,
        max: this.config.database.pool?.max ?? 20,
        idleTimeoutMillis: this.config.database.pool?.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: this.config.database.pool?.connectionTimeoutMillis ?? 2000,
      });

      // Test connection
      const client = await this.pgPool.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (error) {
      throw new ConnectionError(
        'Failed to connect to PostgreSQL',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Initialize Redis cache connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Use existing ioredis from package.json
      const Redis = await import('ioredis');

      this.redisClient = new Redis.default({
        host: this.config.cache.host,
        port: this.config.cache.port,
        password: this.config.cache.password,
        db: this.config.cache.db ?? 0,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      // Test connection
      await this.redisClient.ping();
    } catch (error) {
      throw new ConnectionError(
        'Failed to connect to Redis cache',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  /**
   * Get a PostgreSQL client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pgPool) {
      throw new ConnectionError('PostgreSQL pool not initialized');
    }

    try {
      return await this.pgPool.connect();
    } catch (error) {
      throw new ConnectionError(
        'Failed to get client from pool',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.getClient();

    try {
      return await client.query<T>(text, params);
    } finally {
      client.release();
    }
  }

  // ========================================================================
  // Transaction Management
  // ========================================================================

  /**
   * Execute a callback within a transaction
   *
   * @param callback - Function to execute within transaction
   * @returns Result of the callback
   */
  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    if (this.transactionClient) {
      throw new TransactionInProgressError();
    }

    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      this.transactionClient = client;

      const tx: Transaction = {
        query: async (text: string, params?: any[]) => {
          if (!this.transactionClient) {
            throw new NoTransactionError();
          }
          return await this.transactionClient.query(text, params);
        },
        commit: async () => {
          if (!this.transactionClient) {
            throw new NoTransactionError();
          }
          await this.transactionClient.query('COMMIT');
        },
        rollback: async () => {
          if (!this.transactionClient) {
            throw new NoTransactionError();
          }
          await this.transactionClient.query('ROLLBACK');
        },
      };

      const result = await callback(tx);

      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      this.transactionClient = null;
      client.release();
    }
  }

  // ========================================================================
  // Cache Operations
  // ========================================================================

  /**
   * Get a value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null
   */
  async cacheGet<T = unknown>(key: string): Promise<T | null> {
    if (!this.redisClient) {
      return null;
    }

    const prefixedKey = `${this.config.cache.keyPrefix ?? 'polln'}:${key}`;

    try {
      const value = await this.redisClient.get(prefixedKey);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async cacheSet<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const prefixedKey = `${this.config.cache.keyPrefix ?? 'polln'}:${key}`;

    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redisClient.setex(prefixedKey, ttl, serialized);
      } else {
        await this.redisClient.set(prefixedKey, serialized);
      }
    } catch {
      // Silently fail - cache is optional
    }
  }

  /**
   * Delete a value from cache
   *
   * @param key - Cache key
   */
  async cacheDelete(key: string): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const prefixedKey = `${this.config.cache.keyPrefix ?? 'polln'}:${key}`;

    try {
      await this.redisClient.del(prefixedKey);
    } catch {
      // Silently fail
    }
  }

  /**
   * Delete multiple cache keys by pattern
   *
   * @param pattern - Cache key pattern (supports wildcards)
   */
  async cacheDeletePattern(pattern: string): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const prefixedPattern = `${this.config.cache.keyPrefix ?? 'polln'}:${pattern}`;

    try {
      const keys = await this.redisClient.keys(prefixedPattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear all cache entries with the configured prefix
   */
  async cacheClear(): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const pattern = `${this.config.cache.keyPrefix ?? 'polln'}:*`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch {
      // Silently fail
    }
  }

  // ========================================================================
  // Health Monitoring
  // ========================================================================

  /**
   * Check health of database and cache connections
   *
   * @returns Health status
   */
  async healthCheck(): Promise<HealthStatus> {
    const timestamp = new Date();

    // Check PostgreSQL
    const database = await this.checkDatabaseHealth();

    // Check Redis
    const cache = await this.checkCacheHealth();

    const healthy = database.connected && cache.connected;

    return {
      healthy,
      database,
      cache,
      timestamp,
    };
  }

  /**
   * Check PostgreSQL health
   */
  private async checkDatabaseHealth() {
    const startTime = Date.now();

    try {
      if (!this.pgPool) {
        return {
          connected: false,
          latency: 0,
          poolSize: 0,
          availableConnections: 0,
        };
      }

      await this.query('SELECT 1');

      const latency = Date.now() - startTime;
      const poolSize = this.pgPool.totalCount;
      const availableConnections = this.pgPool.idleCount + (this.pgPool.waitCount ? 0 : 1);

      return {
        connected: true,
        latency,
        poolSize,
        availableConnections,
      };
    } catch {
      return {
        connected: false,
        latency: Date.now() - startTime,
        poolSize: this.pgPool?.totalCount ?? 0,
        availableConnections: 0,
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkCacheHealth() {
    const startTime = Date.now();

    try {
      if (!this.redisClient) {
        return {
          connected: false,
          latency: 0,
          memoryUsage: '0B',
          hitRate: 0,
        };
      }

      await this.redisClient.ping();

      const latency = Date.now() - startTime;
      const info = await this.redisClient.info('stats');
      const hitRate = this.parseRedisHitRate(info);
      const memoryUsage = await this.getRedisMemoryUsage();

      return {
        connected: true,
        latency,
        memoryUsage,
        hitRate,
      };
    } catch {
      return {
        connected: false,
        latency: Date.now() - startTime,
        memoryUsage: '0B',
        hitRate: 0,
      };
    }
  }

  /**
   * Parse Redis hit rate from INFO output
   */
  private parseRedisHitRate(info: string): number {
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    if (!hitsMatch || !missesMatch) {
      return 0;
    }

    const hits = parseInt(hitsMatch[1], 10);
    const misses = parseInt(missesMatch[1], 10);
    const total = hits + misses;

    return total > 0 ? hits / total : 0;
  }

  /**
   * Get Redis memory usage as formatted string
   */
  private async getRedisMemoryUsage(): Promise<string> {
    if (!this.redisClient) {
      return '0B';
    }

    try {
      const info = await this.redisClient.info('memory');
      const usedMatch = info.match(/used_memory_human:(.+)/);

      if (usedMatch) {
        return usedMatch[1].trim();
      }

      return '0B';
    } catch {
      return '0B';
    }
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    const promises: Promise<void>[] = [];

    // Close PostgreSQL pool
    if (this.pgPool) {
      promises.push(
        this.pgPool.end().catch(() => {
          // Ignore errors during close
        })
      );
    }

    // Close Redis connection
    if (this.redisClient) {
      promises.push(
        this.redisClient.quit().catch(() => {
          // Ignore errors during close
        })
      );
    }

    await Promise.all(promises);

    this.pgPool = null;
    this.redisClient = null;
    this.transactionClient = null;
    this.isInitialized = false;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Check if database manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.pgPool) {
      return null;
    }

    return {
      totalCount: this.pgPool.totalCount,
      idleCount: this.pgPool.idleCount,
      waitingCount: this.pgPool.waitCount,
    };
  }

  /**
   * Get Redis client (for advanced use cases)
   */
  getRedisClient() {
    return this.redisClient;
  }

  /**
   * Get PostgreSQL pool (for advanced use cases)
   */
  getPostgreSQLPool() {
    return this.pgPool;
  }
}
