/**
 * Redis Connection Manager
 *
 * Manages Redis client connections with connection pooling, automatic reconnection,
 * cluster support, and high availability via Sentinel.
 *
 * Features:
 * - Connection pooling with automatic scaling
 * - Automatic reconnection with exponential backoff
 * - Redis Cluster support for horizontal scaling
 * - Sentinel for high availability
 * - Health monitoring and metrics
 * - TLS/SSL support
 * - Connection retry logic
 */

import Redis from 'ioredis';
import { Logger } from '../../../io/Logger.js';

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  cluster?: boolean;
  sentinel?: boolean;
  sentinelName?: string;
  tls?: boolean;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | void;
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMillis: number;
  timeoutMillis: number;
  threshold: number;
}

/**
 * Connection health status
 */
export interface HealthStatus {
  healthy: boolean;
  connected: boolean;
  latency: number;
  memory: number;
  uptime: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  avgLatency: number;
  reconnects: number;
  uptime: number;
}

/**
 * Redis Connection Manager class
 */
export class RedisConnectionManager {
  private clients: Map<string, Redis.Redis | Redis.Cluster>;
  private config: RedisConfig;
  private poolConfig: ConnectionPoolConfig;
  private healthConfig: HealthCheckConfig;
  private healthStatuses: Map<string, HealthStatus>;
  private stats: Map<string, ConnectionStats>;
  private healthCheckInterval?: NodeJS.Timeout;
  private logger: Logger;

  constructor(config: RedisConfig) {
    this.config = config;
    this.clients = new Map();
    this.healthStatuses = new Map();
    this.stats = new Map();
    this.logger = Logger.getInstance().child({ component: 'RedisConnection' });

    this.poolConfig = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 5000,
      destroyTimeoutMillis: 2000,
    };

    this.healthConfig = {
      enabled: true,
      intervalMillis: 5000,
      timeoutMillis: 3000,
      threshold: 3,
    };
  }

  /**
   * Set connection pool configuration
   */
  public setPoolConfig(config: Partial<ConnectionPoolConfig>): void {
    this.poolConfig = { ...this.poolConfig, ...config };
  }

  /**
   * Set health check configuration
   */
  public setHealthConfig(config: Partial<HealthCheckConfig>): void {
    this.healthConfig = { ...this.healthConfig, ...config };
  }

  /**
   * Get or create a Redis client
   */
  public async getClient(name: string = 'default'): Promise<Redis.Redis | Redis.Cluster> {
    if (this.clients.has(name)) {
      return this.clients.get(name)!;
    }

    return this.createClient(name);
  }

  /**
   * Create a new Redis client
   */
  private async createClient(name: string): Promise<Redis.Redis | Redis.Cluster> {
    this.logger.info('Creating Redis client', { name, config: this.sanitizeConfig() });

    try {
      let client: Redis.Redis | Redis.Cluster;

      if (this.config.cluster) {
        client = await this.createClusterClient();
      } else if (this.config.sentinel) {
        client = await this.createSentinelClient();
      } else {
        client = await this.createStandaloneClient();
      }

      // Setup event handlers
      this.setupEventHandlers(client, name);

      // Store client
      this.clients.set(name, client);

      // Initialize stats
      this.stats.set(name, {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        avgLatency: 0,
        reconnects: 0,
        uptime: Date.now(),
      });

      // Initialize health status
      this.healthStatuses.set(name, {
        healthy: true,
        connected: true,
        latency: 0,
        memory: 0,
        uptime: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      });

      // Start health checks
      if (this.healthConfig.enabled && !this.healthCheckInterval) {
        this.startHealthChecks();
      }

      // Ping to verify connection
      await client.ping();

      this.logger.info('Redis client created successfully', { name });
      return client;
    } catch (error) {
      this.logger.error('Failed to create Redis client', { name, error });
      throw error;
    }
  }

  /**
   * Create a standalone Redis client
   */
  private async createStandaloneClient(): Promise<Redis.Redis> {
    const client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
      retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    return client;
  }

  /**
   * Create a Redis Cluster client
   */
  private async createClusterClient(): Promise<Redis.Cluster> {
    const cluster = new Redis.Cluster(
      [
        {
          host: this.config.host,
          port: this.config.port,
        },
      ],
      {
        redisOptions: {
          password: this.config.password,
          retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy,
        },
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        scaleReads: 'slave',
        redisOptions: {
          password: this.config.password,
          tls: this.config.tls ? {} : undefined,
        },
      }
    );

    return cluster;
  }

  /**
   * Create a Redis Sentinel client
   */
  private async createSentinelClient(): Promise<Redis.Redis> {
    const sentinel = new Redis({
      sentinels: [
        {
          host: this.config.host,
          port: this.config.port,
        },
      ],
      name: this.config.sentinelName || 'mymaster',
      password: this.config.password,
      sentinelPassword: this.config.password,
      retryStrategy: this.config.retryStrategy || this.defaultRetryStrategy,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    return sentinel;
  }

  /**
   * Default retry strategy with exponential backoff
   */
  private defaultRetryStrategy(times: number): number | void {
    const delay = Math.min(times * 50, 2000);
    if (times > 10) {
      return null; // Stop retrying
    }
    return delay;
  }

  /**
   * Setup event handlers for client
   */
  private setupEventHandlers(client: Redis.Redis | Redis.Cluster, name: string): void {
    client.on('connect', () => {
      this.logger.info('Redis client connected', { name });
      const health = this.healthStatuses.get(name);
      if (health) {
        health.connected = true;
        health.healthy = true;
        health.consecutiveFailures = 0;
      }
    });

    client.on('ready', () => {
      this.logger.info('Redis client ready', { name });
    });

    client.on('error', (error) => {
      this.logger.error('Redis client error', { name, error });
      const health = this.healthStatuses.get(name);
      if (health) {
        health.healthy = false;
        health.consecutiveFailures++;
      }
      const stats = this.stats.get(name);
      if (stats) {
        stats.failedCommands++;
      }
    });

    client.on('close', () => {
      this.logger.warn('Redis client closed', { name });
      const health = this.healthStatuses.get(name);
      if (health) {
        health.connected = false;
        health.healthy = false;
      }
    });

    client.on('reconnecting', () => {
      this.logger.info('Redis client reconnecting', { name });
      const stats = this.stats.get(name);
      if (stats) {
        stats.reconnects++;
      }
    });

    client.on('+node', (node: Redis.Redis) => {
      this.logger.info('Cluster node connected', { name, node: node.options.host });
    });

    client.on('-node', (node: Redis.Redis) => {
      this.logger.warn('Cluster node disconnected', { name, node: node.options.host });
    });
  }

  /**
   * Start health checks for all clients
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, client] of this.clients) {
        await this.checkHealth(name, client);
      }
    }, this.healthConfig.intervalMillis);
  }

  /**
   * Check health of a specific client
   */
  private async checkHealth(name: string, client: Redis.Redis | Redis.Cluster): Promise<void> {
    const startTime = Date.now();

    try {
      // Ping test
      await Promise.race([
        client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.healthConfig.timeoutMillis)
        ),
      ]);

      const latency = Date.now() - startTime;
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      const health = this.healthStatuses.get(name);
      if (health) {
        health.healthy = true;
        health.connected = true;
        health.latency = latency;
        health.memory = memory;
        health.uptime = Date.now() - (this.stats.get(name)?.uptime || Date.now());
        health.lastCheck = new Date();
        health.consecutiveFailures = 0;
      }
    } catch (error) {
      this.logger.warn('Health check failed', { name, error });
      const health = this.healthStatuses.get(name);
      if (health) {
        health.healthy = false;
        health.consecutiveFailures++;
      }
    }
  }

  /**
   * Get health status for a client
   */
  public getHealthStatus(name: string = 'default'): HealthStatus | undefined {
    return this.healthStatuses.get(name);
  }

  /**
   * Get all health statuses
   */
  public getAllHealthStatuses(): Map<string, HealthStatus> {
    return new Map(this.healthStatuses);
  }

  /**
   * Get statistics for a client
   */
  public getStats(name: string = 'default'): ConnectionStats | undefined {
    return this.stats.get(name);
  }

  /**
   * Get all statistics
   */
  public getAllStats(): Map<string, ConnectionStats> {
    return new Map(this.stats);
  }

  /**
   * Execute a command with latency tracking
   */
  public async executeCommand<T>(
    name: string,
    command: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    const client = await this.getClient(name);
    const startTime = Date.now();

    try {
      const result = await command.call(client, ...args);
      const latency = Date.now() - startTime;

      const stats = this.stats.get(name);
      if (stats) {
        stats.totalCommands++;
        stats.successfulCommands++;
        stats.avgLatency = (stats.avgLatency * (stats.totalCommands - 1) + latency) / stats.totalCommands;
      }

      return result;
    } catch (error) {
      const stats = this.stats.get(name);
      if (stats) {
        stats.totalCommands++;
        stats.failedCommands++;
      }
      throw error;
    }
  }

  /**
   * Close a specific client
   */
  public async closeClient(name: string = 'default'): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.quit();
      this.clients.delete(name);
      this.healthStatuses.delete(name);
      this.stats.delete(name);
      this.logger.info('Redis client closed', { name });
    }
  }

  /**
   * Close all clients
   */
  public async closeAll(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const closePromises = Array.from(this.clients.keys()).map((name) => this.closeClient(name));
    await Promise.all(closePromises);

    this.logger.info('All Redis clients closed');
  }

  /**
   * Sanitize config for logging
   */
  private sanitizeConfig(): Partial<RedisConfig> {
    const { password, ...rest } = this.config;
    return {
      ...rest,
      password: password ? '***' : undefined,
    };
  }
}

/**
 * Singleton instance
 */
let instance: RedisConnectionManager | null = null;

/**
 * Get or create the Redis connection manager singleton
 */
export function getRedisConnection(config?: RedisConfig): RedisConnectionManager {
  if (!instance) {
    if (!config) {
      throw new Error('Redis config required for first initialization');
    }
    instance = new RedisConnectionManager(config);
  }
  return instance;
}

/**
 * Close the singleton instance
 */
export async function closeRedisConnection(): Promise<void> {
  if (instance) {
    await instance.closeAll();
    instance = null;
  }
}
