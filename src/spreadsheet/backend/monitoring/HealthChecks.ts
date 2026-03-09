/**
 * HealthChecks.ts
 *
 * Health check endpoints for Kubernetes probes and monitoring.
 * Provides liveness, readiness, startup, and dependency health checks.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';

/**
 * Health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    [key: string]: ComponentHealth;
  };
}

/**
 * Component health check result
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  latency?: number;
  details?: any;
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  /**
   * Custom version string
   */
  version?: string;

  /**
   * Timeout for health checks in milliseconds
   */
  timeout?: number;

  /**
   * Enable detailed health check information
   */
  detailed?: boolean;

  /**
   * Custom health check functions
   */
  customChecks?: Map<string, () => Promise<ComponentHealth>>;
}

/**
 * HealthChecks manager
 */
export class HealthChecks {
  private readonly options: HealthCheckOptions;
  private readonly startTime: number;
  private redisClient: RedisClientType | null = null;
  private databasePool: any | null = null;

  constructor(options: HealthCheckOptions = {}) {
    this.options = {
      timeout: 5000,
      detailed: true,
      ...options,
    };
    this.startTime = Date.now();
  }

  /**
   * Set Redis client for dependency health checks
   */
  setRedisClient(client: RedisClientType): void {
    this.redisClient = client;
  }

  /**
   * Set database pool for dependency health checks
   */
  setDatabasePool(pool: any): void {
    this.databasePool = pool;
  }

  /**
   * Liveness probe - checks if the application is running
   */
  async liveness(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        process: {
          status: HealthStatus.HEALTHY,
          message: 'Process is running',
        },
      },
    };
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic
   */
  async readiness(): Promise<HealthCheckResult> {
    const checks: { [key: string]: ComponentHealth } = {};

    // Check memory usage
    checks.memory = await this.checkMemory();

    // Check Redis connection (if configured)
    if (this.redisClient) {
      checks.redis = await this.checkRedis();
    }

    // Check database connection (if configured)
    if (this.databasePool) {
      checks.database = await this.checkDatabase();
    }

    // Check disk space
    checks.disk = await this.checkDisk();

    // Run custom checks
    if (this.options.customChecks) {
      for (const [name, checkFn] of this.options.customChecks.entries()) {
        try {
          checks[name] = await this.runWithTimeout(checkFn, this.options.timeout);
        } catch (error: any) {
          checks[name] = {
            status: HealthStatus.UNHEALTHY,
            message: error.message,
          };
        }
      }
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = this.determineOverallStatus(statuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.options.version,
      checks,
    };
  }

  /**
   * Startup probe - checks if the application has started successfully
   */
  async startup(): Promise<HealthCheckResult> {
    const checks: { [key: string]: ComponentHealth } = {};

    // Check if initialization is complete
    checks.initialization = {
      status: HealthStatus.HEALTHY,
      message: 'Initialization complete',
    };

    // Check critical dependencies
    if (this.redisClient) {
      checks.redis = await this.checkRedis();
    }

    if (this.databasePool) {
      checks.database = await this.checkDatabase();
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = this.determineOverallStatus(statuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.options.version,
      checks,
    };
  }

  /**
   * Comprehensive health check with all dependencies
   */
  async health(): Promise<HealthCheckResult> {
    const checks: { [key: string]: ComponentHealth } = {};

    // Basic checks
    checks.process = {
      status: HealthStatus.HEALTHY,
      message: 'Process is running',
      details: {
        pid: process.pid,
        uptime: Date.now() - this.startTime,
        platform: process.platform,
        nodeVersion: process.version,
      },
    };

    checks.memory = await this.checkMemory();
    checks.cpu = await this.checkCPU();
    checks.disk = await this.checkDisk();

    // Dependency checks
    if (this.redisClient) {
      checks.redis = await this.checkRedis();
    }

    if (this.databasePool) {
      checks.database = await this.checkDatabase();
    }

    // Run custom checks
    if (this.options.customChecks) {
      for (const [name, checkFn] of this.options.customChecks.entries()) {
        try {
          checks[name] = await this.runWithTimeout(checkFn, this.options.timeout);
        } catch (error: any) {
          checks[name] = {
            status: HealthStatus.UNHEALTHY,
            message: error.message,
          };
        }
      }
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = this.determineOverallStatus(statuses);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.options.version,
      checks,
    };
  }

  /**
   * Check memory health
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const usagePercent = (usedMem / totalMem) * 100;

    let status = HealthStatus.HEALTHY;
    let message = `Memory usage: ${usagePercent.toFixed(2)}%`;

    if (usagePercent > 90) {
      status = HealthStatus.UNHEALTHY;
      message = `Memory usage critical: ${usagePercent.toFixed(2)}%`;
    } else if (usagePercent > 75) {
      status = HealthStatus.DEGRADED;
      message = `Memory usage high: ${usagePercent.toFixed(2)}%`;
    }

    return {
      status,
      message,
      details: this.options.detailed ? {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usagePercent,
      } : undefined,
    };
  }

  /**
   * Check CPU health
   */
  private async checkCPU(): Promise<ComponentHealth> {
    const cpus = require('os').cpus();
    const loadAvg = require('os').loadavg();

    const cpuCount = cpus.length;
    const load1 = loadAvg[0];
    const loadPercent = (load1 / cpuCount) * 100;

    let status = HealthStatus.HEALTHY;
    let message = `CPU load: ${loadPercent.toFixed(2)}%`;

    if (loadPercent > 90) {
      status = HealthStatus.UNHEALTHY;
      message = `CPU load critical: ${loadPercent.toFixed(2)}%`;
    } else if (loadPercent > 75) {
      status = HealthStatus.DEGRADED;
      message = `CPU load high: ${loadPercent.toFixed(2)}%`;
    }

    return {
      status,
      message,
      details: this.options.detailed ? {
        cpuCount,
        loadAverage: loadAvg,
        loadPercent,
      } : undefined,
    };
  }

  /**
   * Check disk health
   */
  private async checkDisk(): Promise<ComponentHealth> {
    const fs = require('fs');
    const stats = fs.statSync('.');

    let status = HealthStatus.HEALTHY;
    let message = 'Disk accessible';

    return {
      status,
      message,
      details: this.options.detailed ? {
        writable: fs.accessSync('.', fs.constants.W_OK) === undefined,
      } : undefined,
    };
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<ComponentHealth> {
    if (!this.redisClient) {
      return {
        status: HealthStatus.UNKNOWN,
        message: 'Redis client not configured',
      };
    }

    const startTime = Date.now();
    try {
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      let status = HealthStatus.HEALTHY;
      if (latency > 100) {
        status = HealthStatus.DEGRADED;
      }

      return {
        status,
        message: `Redis connected (${latency}ms)`,
        latency,
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Redis connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    if (!this.databasePool) {
      return {
        status: HealthStatus.UNKNOWN,
        message: 'Database pool not configured',
      };
    }

    const startTime = Date.now();
    try {
      // Try to get a connection from the pool
      const client = await this.databasePool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency = Date.now() - startTime;

      let status = HealthStatus.HEALTHY;
      if (latency > 500) {
        status = HealthStatus.DEGRADED;
      }

      return {
        status,
        message: `Database connected (${latency}ms)`,
        latency,
        details: this.options.detailed ? {
          totalCount: this.databasePool.totalCount,
          idleCount: this.databasePool.idleCount,
          waitingCount: this.databasePool.waitingCount,
        } : undefined,
      };
    } catch (error: any) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Database connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Determine overall health status from component statuses
   */
  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.some(s => s === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }
    if (statuses.some(s => s === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    if (statuses.some(s => s === HealthStatus.UNKNOWN)) {
      return HealthStatus.UNKNOWN;
    }
    return HealthStatus.HEALTHY;
  }

  /**
   * Run a function with a timeout
   */
  private async runWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);
  }

  /**
   * Create Express middleware for liveness endpoint
   */
  livenessMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.liveness();
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error: any) {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    };
  }

  /**
   * Create Express middleware for readiness endpoint
   */
  readinessMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.readiness();
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error: any) {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    };
  }

  /**
   * Create Express middleware for startup endpoint
   */
  startupMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.startup();
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error: any) {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    };
  }

  /**
   * Create Express middleware for health endpoint
   */
  healthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.health();
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 :
                         result.status === HealthStatus.DEGRADED ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error: any) {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    };
  }

  /**
   * Add a custom health check
   */
  addCustomCheck(name: string, checkFn: () => Promise<ComponentHealth>): void {
    if (!this.options.customChecks) {
      this.options.customChecks = new Map();
    }
    this.options.customChecks.set(name, checkFn);
  }

  /**
   * Remove a custom health check
   */
  removeCustomCheck(name: string): void {
    this.options.customChecks?.delete(name);
  }
}

/**
 * Singleton instance of HealthChecks
 */
let healthChecksInstance: HealthChecks | null = null;

/**
 * Get or create the HealthChecks singleton
 */
export function getHealthChecks(options?: HealthCheckOptions): HealthChecks {
  if (!healthChecksInstance) {
    healthChecksInstance = new HealthChecks(options);
  }
  return healthChecksInstance;
}

/**
 * Reset the HealthChecks singleton (useful for testing)
 */
export function resetHealthChecks(): void {
  healthChecksInstance = null;
}
