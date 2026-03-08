/**
 * Health Check System
 *
 * Production-ready health checks for all POLLN components.
 * Provides liveness, readiness, and startup probes.
 */

import { EventEmitter } from 'events';

/**
 * Health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  duration?: number;
  timestamp: number;
  details?: Record<string, any>;
}

/**
 * Health check function
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult> | HealthCheckResult;

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string;
  check: HealthCheckFunction;
  timeout?: number;
  interval?: number;
  critical?: boolean;
}

/**
 * Overall health status
 */
export interface OverallHealth {
  status: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: number;
  uptime: number;
}

/**
 * Health check server configuration
 */
export interface HealthServerConfig {
  port?: number;
  endpoint?: string;
  livenessEndpoint?: string;
  readinessEndpoint?: string;
  startupEndpoint?: string;
}

/**
 * Health check manager
 */
export class HealthCheckManager extends EventEmitter {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private startTime: number;
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.startTime = Date.now();
  }

  /**
   * Register a health check
   */
  register(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);

    // Start interval check if configured
    if (config.interval && config.interval > 0) {
      const intervalId = setInterval(async () => {
        await this.executeCheck(config.name);
      }, config.interval);
      this.intervalIds.set(config.name, intervalId);
    }
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);

    // Clear interval if exists
    const intervalId = this.intervalIds.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(name);
    }
  }

  /**
   * Execute a single health check
   */
  async executeCheck(name: string): Promise<HealthCheckResult> {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error(`Health check '${name}' not found`);
    }

    const start = Date.now();

    try {
      // Apply timeout if configured
      const result = config.timeout
        ? await this.withTimeout(config.check(), config.timeout)
        : await config.check();

      const duration = Date.now() - start;

      const checkResult: HealthCheckResult = {
        name,
        status: result.status,
        message: result.message,
        duration,
        timestamp: Date.now(),
        details: result.details,
      };

      this.results.set(name, checkResult);

      // Emit event for this check
      this.emit('check', checkResult);

      return checkResult;
    } catch (error) {
      const duration = Date.now() - start;

      const checkResult: HealthCheckResult = {
        name,
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: Date.now(),
      };

      this.results.set(name, checkResult);

      this.emit('check', checkResult);
      this.emit('check_error', { name, error });

      return checkResult;
    }
  }

  /**
   * Execute all health checks
   */
  async executeAll(): Promise<HealthCheckResult[]> {
    const promises = Array.from(this.checks.keys()).map((name) =>
      this.executeCheck(name)
    );

    return Promise.all(promises);
  }

  /**
   * Get overall health status
   */
  async getOverallHealth(): Promise<OverallHealth> {
    const checkResults = await this.executeAll();

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;

    const criticalChecks = checkResults.filter(
      (r) => this.checks.get(r.name)?.critical
    );

    // If any critical check is unhealthy, overall is unhealthy
    if (criticalChecks.some((r) => r.status === HealthStatus.UNHEALTHY)) {
      overallStatus = HealthStatus.UNHEALTHY;
    }
    // If any critical check is degraded, overall is degraded
    else if (criticalChecks.some((r) => r.status === HealthStatus.DEGRADED)) {
      overallStatus = HealthStatus.DEGRADED;
    }
    // If any check is unhealthy, overall is degraded
    else if (checkResults.some((r) => r.status === HealthStatus.UNHEALTHY)) {
      overallStatus = HealthStatus.DEGRADED;
    }

    return {
      status: overallStatus,
      checks: checkResults,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get liveness (is the service running?)
   */
  async getLiveness(): Promise<{ status: string; alive: boolean }> {
    return {
      status: 'ok',
      alive: true,
    };
  }

  /**
   * Get readiness (can the service handle requests?)
   */
  async getReadiness(): Promise<{
    status: string;
    ready: boolean;
    checks?: HealthCheckResult[];
  }> {
    const health = await this.getOverallHealth();
    const ready = health.status !== HealthStatus.UNHEALTHY;

    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
      checks: health.checks,
    };
  }

  /**
   * Get startup (has the service finished starting?)
   */
  async getStartup(): Promise<{
    status: string;
    started: boolean;
    uptime: number;
  }> {
    // Consider startup complete after 10 seconds
    const minStartupTime = 10000;
    const uptime = Date.now() - this.startTime;
    const started = uptime >= minStartupTime;

    return {
      status: started ? 'started' : 'starting',
      started,
      uptime,
    };
  }

  /**
   * Get health check result by name
   */
  getResult(name: string): HealthCheckResult | undefined {
    return this.results.get(name);
  }

  /**
   * Get all health check results
   */
  getResults(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear();
  }

  /**
   * Shutdown health check manager
   */
  shutdown(): void {
    // Clear all intervals
    for (const intervalId of this.intervalIds.values()) {
      clearInterval(intervalId);
    }
    this.intervalIds.clear();
    this.checks.clear();
    this.results.clear();
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([Promise.resolve(promise), timeoutPromise]);
  }
}

/**
 * Predefined health checks for POLLN components
 */

/**
 * Agent pool health check
 */
export function createAgentPoolHealthCheck(getStats: () => { total: number; active: number }): HealthCheckConfig {
  return {
    name: 'agent_pool',
    critical: true,
    check: () => {
      const stats = getStats();
      const activeRatio = stats.total > 0 ? stats.active / stats.total : 0;

      if (stats.total === 0) {
        return {
          name: 'agent_pool',
          status: HealthStatus.DEGRADED,
          message: 'No agents in pool',
          details: stats,
        };
      }

      if (activeRatio > 0.8) {
        return {
          name: 'agent_pool',
          status: HealthStatus.HEALTHY,
          message: 'Agent pool healthy',
          details: stats,
        };
      }

      return {
        name: 'agent_pool',
        status: HealthStatus.DEGRADED,
        message: 'Low agent activity',
        details: stats,
      };
    },
  };
}

/**
 * KV-cache health check
 */
export function createKVCacheHealthCheck(getStats: () => {
  size: number;
  hitRate: number;
  anchorCount: number;
}): HealthCheckConfig {
  return {
    name: 'kv_cache',
    critical: true,
    check: () => {
      const stats = getStats();

      if (stats.anchorCount === 0) {
        return {
          name: 'kv_cache',
          status: HealthStatus.DEGRADED,
          message: 'No KV anchors available',
          details: stats,
        };
      }

      if (stats.hitRate < 0.5) {
        return {
          name: 'kv_cache',
          status: HealthStatus.DEGRADED,
          message: 'Low cache hit rate',
          details: stats,
        };
      }

      return {
        name: 'kv_cache',
        status: HealthStatus.HEALTHY,
        message: 'KV-cache healthy',
        details: stats,
      };
    },
  };
}

/**
 * Federation health check
 */
export function createFederationHealthCheck(getStatus: () => {
  connected: boolean;
  participantCount: number;
  lastSync: number;
}): HealthCheckConfig {
  return {
    name: 'federation',
    critical: false,
    check: () => {
      const status = getStatus();

      if (!status.connected) {
        return {
          name: 'federation',
          status: HealthStatus.DEGRADED,
          message: 'Not connected to federation',
          details: status,
        };
      }

      const timeSinceLastSync = Date.now() - status.lastSync;
      if (timeSinceLastSync > 60000) { // 1 minute
        return {
          name: 'federation',
          status: HealthStatus.DEGRADED,
          message: 'Stale federation sync',
          details: status,
        };
      }

      return {
        name: 'federation',
        status: HealthStatus.HEALTHY,
        message: 'Federation healthy',
        details: status,
      };
    },
  };
}

/**
 * Memory health check
 */
export function createMemoryHealthCheck(thresholdMb: number = 1000): HealthCheckConfig {
  return {
    name: 'memory',
    critical: true,
    check: () => {
      const usage = process.memoryUsage();
      const heapUsedMb = usage.heapUsed / 1024 / 1024;

      if (heapUsedMb > thresholdMb) {
        return {
          name: 'memory',
          status: HealthStatus.DEGRADED,
          message: `High memory usage: ${heapUsedMb.toFixed(2)}MB`,
          details: {
            heapUsedMb: heapUsedMb.toFixed(2),
            heapTotalMb: (usage.heapTotal / 1024 / 1024).toFixed(2),
            rssMb: (usage.rss / 1024 / 1024).toFixed(2),
          },
        };
      }

      return {
        name: 'memory',
        status: HealthStatus.HEALTHY,
        message: 'Memory usage normal',
        details: {
          heapUsedMb: heapUsedMb.toFixed(2),
        },
      };
    },
  };
}

/**
 * API server health check
 */
export function createAPIServerHealthCheck(isServerHealthy: () => boolean): HealthCheckConfig {
  return {
    name: 'api_server',
    critical: true,
    check: () => {
      const healthy = isServerHealthy();

      if (!healthy) {
        return {
          name: 'api_server',
          status: HealthStatus.UNHEALTHY,
          message: 'API server not healthy',
        };
      }

      return {
        name: 'api_server',
        status: HealthStatus.HEALTHY,
        message: 'API server healthy',
      };
    },
  };
}
