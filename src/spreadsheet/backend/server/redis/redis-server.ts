/**
 * Redis Server Configuration and Management
 *
 * Provides utilities for setting up and managing Redis instances
 * for development, testing, and production environments.
 *
 * Features:
 * - Docker Compose management
 * - Redis configuration validation
 * - Cluster setup utilities
 * - Sentinel configuration
 * - Health monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../../io/Logger.js';

const execAsync = promisify(exec);

/**
 * Redis server configuration
 */
export interface RedisServerConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  mode: 'standalone' | 'replica' | 'cluster' | 'sentinel';
  clusterNodes?: RedisClusterNode[];
  replicaOf?: { host: string; port: number };
  sentinelMaster?: string;
}

/**
 * Redis cluster node configuration
 */
export interface RedisClusterNode {
  host: string;
  port: number;
  replicas?: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  memory: number;
  connections: number;
  uptime: number;
  version: string;
}

/**
 * Redis Server Manager class
 */
export class RedisServerManager {
  private config: RedisServerConfig;
  private logger: Logger;
  private composePath: string;

  constructor(config: RedisServerConfig) {
    this.config = config;
    this.logger = Logger.getInstance().child({ component: 'RedisServer' });
    this.composePath = process.env.REDIS_COMPOSE_PATH || './src/spreadsheet/backend/server/redis';
  }

  /**
   * Start Redis servers using Docker Compose
   */
  public async start(): Promise<void> {
    this.logger.info('Starting Redis servers', { config: this.config });

    try {
      const command = `cd ${this.composePath} && docker-compose up -d`;
      await execAsync(command);

      this.logger.info('Redis servers started successfully');

      // Wait for servers to be ready
      await this.waitForReady();
    } catch (error) {
      this.logger.error('Failed to start Redis servers', { error });
      throw error;
    }
  }

  /**
   * Stop Redis servers
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping Redis servers');

    try {
      const command = `cd ${this.composePath} && docker-compose down`;
      await execAsync(command);

      this.logger.info('Redis servers stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop Redis servers', { error });
      throw error;
    }
  }

  /**
   * Restart Redis servers
   */
  public async restart(): Promise<void> {
    this.logger.info('Restarting Redis servers');

    try {
      const command = `cd ${this.composePath} && docker-compose restart`;
      await execAsync(command);

      this.logger.info('Redis servers restarted successfully');

      // Wait for servers to be ready
      await this.waitForReady();
    } catch (error) {
      this.logger.error('Failed to restart Redis servers', { error });
      throw error;
    }
  }

  /**
   * Get status of Redis servers
   */
  public async getStatus(): Promise<any> {
    try {
      const command = `cd ${this.composePath} && docker-compose ps`;
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      this.logger.error('Failed to get Redis server status', { error });
      throw error;
    }
  }

  /**
   * Check Redis server health
   */
  public async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const command = `redis-cli -h ${this.config.host} -p ${this.config.port} INFO`;
      const { stdout } = await execAsync(command);

      const latency = Date.now() - startTime;
      const info = this.parseRedisInfo(stdout);

      return {
        healthy: true,
        latency,
        memory: info.used_memory || 0,
        connections: info.connected_clients || 0,
        uptime: info.uptime_in_seconds || 0,
        version: info.redis_version || 'unknown',
      };
    } catch (error) {
      this.logger.error('Redis health check failed', { error });
      return {
        healthy: false,
        latency: Date.now() - startTime,
        memory: 0,
        connections: 0,
        uptime: 0,
        version: 'unknown',
      };
    }
  }

  /**
   * Wait for Redis servers to be ready
   */
  public async waitForReady(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const health = await this.checkHealth();
        if (health.healthy) {
          this.logger.info('Redis servers are ready');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(1000);
    }

    throw new Error('Redis servers failed to start within timeout');
  }

  /**
   * Setup Redis cluster
   */
  public async setupCluster(): Promise<void> {
    this.logger.info('Setting up Redis cluster');

    if (!this.config.clusterNodes || this.config.clusterNodes.length < 3) {
      throw new Error('At least 3 cluster nodes required');
    }

    try {
      // Create cluster using redis-cli --cluster create
      const nodes = this.config.clusterNodes.map((node) => `${node.host}:${node.port}`).join(' ');
      const command = `redis-cli --cluster create ${nodes} --cluster-replicas ${this.config.clusterNodes[0].replicas || 1} --cluster-yes`;

      await execAsync(command);

      this.logger.info('Redis cluster setup successfully');
    } catch (error) {
      this.logger.error('Failed to setup Redis cluster', { error });
      throw error;
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(output: string): Record<string, any> {
    const info: Record<string, any> = {};
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }

      const [key, value] = line.split(':');
      if (key && value) {
        const numValue = parseFloat(value);
        info[key.trim()] = isNaN(numValue) ? value.trim() : numValue;
      }
    }

    return info;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get configuration for Redis connection
   */
  public getConnectionConfig(): any {
    return {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
    };
  }
}

/**
 * Predefined configurations for different environments
 */
export class RedisConfigPresets {
  /**
   * Development configuration
   */
  static development(): RedisServerConfig {
    return {
      host: 'localhost',
      port: 6379,
      db: 0,
      mode: 'standalone',
    };
  }

  /**
   * Testing configuration
   */
  static testing(): RedisServerConfig {
    return {
      host: 'localhost',
      port: 6380,
      db: 1,
      mode: 'standalone',
    };
  }

  /**
   * Production configuration with replica
   */
  static productionWithReplica(): RedisServerConfig {
    return {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      mode: 'replica',
      replicaOf: {
        host: process.env.REDIS_PRIMARY_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PRIMARY_PORT || '6379'),
      },
    };
  }

  /**
   * Production configuration with Sentinel
   */
  static productionWithSentinel(): RedisServerConfig {
    return {
      host: 'localhost',
      port: 26379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      mode: 'sentinel',
      sentinelMaster: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
    };
  }

  /**
   * Production configuration with Cluster
   */
  static productionWithCluster(): RedisServerConfig {
    return {
      host: 'localhost',
      port: 7001,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      mode: 'cluster',
      clusterNodes: [
        { host: 'localhost', port: 7001, replicas: 1 },
        { host: 'localhost', port: 7002, replicas: 1 },
        { host: 'localhost', port: 7003, replicas: 1 },
      ],
    };
  }
}

/**
 * Utility functions
 */
export class RedisServerUtils {
  /**
   * Validate Redis configuration
   */
  static validateConfig(config: RedisServerConfig): boolean {
    if (!config.host || !config.port) {
      return false;
    }

    if (config.port < 1 || config.port > 65535) {
      return false;
    }

    if (config.mode === 'cluster' && (!config.clusterNodes || config.clusterNodes.length < 3)) {
      return false;
    }

    if (config.mode === 'replica' && !config.replicaOf) {
      return false;
    }

    if (config.mode === 'sentinel' && !config.sentinelMaster) {
      return false;
    }

    return true;
  }

  /**
   * Get connection string
   */
  static getConnectionString(config: RedisServerConfig): string {
    const auth = config.password ? `:${config.password}@` : '';
    return `redis://${auth}${config.host}:${config.port}/${config.db || 0}`;
  }

  /**
   * Parse connection string
   */
  static parseConnectionString(connectionString: string): Partial<RedisServerConfig> {
    try {
      const url = new URL(connectionString);
      return {
        host: url.hostname,
        port: parseInt(url.port),
        password: url.password || undefined,
        db: parseInt(url.pathname.slice(1)) || 0,
      };
    } catch (error) {
      throw new Error(`Invalid connection string: ${connectionString}`);
    }
  }
}

/**
 * Factory function to create a Redis server manager
 */
export function createRedisServerManager(config: RedisServerConfig): RedisServerManager {
  if (!RedisServerUtils.validateConfig(config)) {
    throw new Error('Invalid Redis configuration');
  }

  return new RedisServerManager(config);
}
