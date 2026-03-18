/**
 * HealthChecker - System Health Monitoring
 *
 * Comprehensive health checking for Claw API integration including:
 * - HTTP endpoint health
 * - WebSocket connection health
 * - Performance degradation detection
 * - Resource usage monitoring
 * - Dependency health checks
 *
 * @packageDocumentation
 * @version 1.0.0 - Week 4: Production Deployment
 */

import { EventEmitter } from 'events';
import { MetricsCollector, MetricCategory } from './MetricsCollector';

// ============================================================================
// HEALTH STATUS TYPES
// ============================================================================

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  checks: CheckResult[];
  timestamp: number;
  summary: string;
}

/**
 * Individual check result
 */
export interface CheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check name */
  name: string;

  /** Check interval in milliseconds */
  interval?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Failure threshold before marking unhealthy */
  failureThreshold?: number;

  /** Check function */
  check: () => Promise<CheckResult>;
}

// ============================================================================
// PREDEFINED CHECKS
// ============================================================================

/**
 * HTTP endpoint health check
 */
export interface HTTPHealthCheckConfig {
  /** Endpoint URL */
  url: string;

  /** Expected status code (default: 200) */
  expectedStatus?: number;

  /** Request timeout (default: 5000ms) */
  timeout?: number;

  /** Headers to include */
  headers?: Record<string, string>;
}

/**
 * WebSocket health check
 */
export interface WebSocketHealthCheckConfig {
  /** WebSocket URL */
  url: string;

  /** Connection timeout (default: 5000ms) */
  timeout?: number;

  /** Expected connection state */
  expectConnected?: boolean;
}

/**
 * Resource usage thresholds
 */
export interface ResourceThresholds {
  /** Maximum heap size in MB */
  maxHeapMB?: number;

  /** Maximum heap usage percentage */
  maxHeapUsagePercent?: number;

  /** Maximum event loop delay in ms */
  maxEventLoopDelay?: number;
}

// ============================================================================
// HEALTH CHECKER IMPLEMENTATION
// ============================================================================

/**
 * HealthChecker configuration
 */
export interface HealthCheckerConfig {
  /** Metrics collector for tracking health metrics */
  metricsCollector?: MetricsCollector;

  /** Default check interval (default: 60000ms) */
  defaultInterval?: number;

  /** Default timeout (default: 5000ms) */
  defaultTimeout?: number;

  /** Default failure threshold (default: 3) */
  defaultFailureThreshold?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * HealthChecker - System health monitoring
 *
 * Monitors system health including:
 * - API endpoints
 * - WebSocket connections
 * - Resource usage
 * - Custom health checks
 *
 * Usage:
 * ```typescript
 * const checker = new HealthChecker({
 *   debug: true
 * });
 *
 * // Add HTTP health check
 * checker.addHTTPCheck('api', 'https://api.example.com/health');
 *
 * // Add resource check
 * checker.addResourceCheck({
 *   maxHeapMB: 512,
 *   maxHeapUsagePercent: 80
 * });
 *
 * // Start monitoring
 * checker.start();
 *
 * // Get current health
 * const health = await checker.checkHealth();
 * ```
 */
export class HealthChecker extends EventEmitter {
  private config: Omit<Required<HealthCheckerConfig>, 'metricsCollector'> & { metricsCollector?: MetricsCollector };
  private checks: Map<string, HealthCheckConfig> = new Map();
  private checkTimers: Map<string, NodeJS.Timeout> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private lastResults: Map<string, CheckResult> = new Map();
  private isRunning: boolean = false;
  private metricsCollector?: MetricsCollector;

  constructor(config: HealthCheckerConfig = {}) {
    super();

    this.config = {
      metricsCollector: config.metricsCollector,
      defaultInterval: config.defaultInterval || 60000,
      defaultTimeout: config.defaultTimeout || 5000,
      defaultFailureThreshold: config.defaultFailureThreshold || 3,
      debug: config.debug || false
    };

    this.metricsCollector = config.metricsCollector;

    // Setup process event listeners for resource monitoring
    this.setupResourceMonitoring();
  }

  // ========================================================================
  // HEALTH CHECK REGISTRATION
  // ========================================================================

  /**
   * Add a custom health check
   */
  addHealthCheck(config: HealthCheckConfig): void {
    const checkConfig: HealthCheckConfig = {
      name: config.name,
      interval: config.interval || this.config.defaultInterval,
      timeout: config.timeout || this.config.defaultTimeout,
      failureThreshold: config.failureThreshold || this.config.defaultFailureThreshold,
      check: config.check
    };

    this.checks.set(config.name, checkConfig);
    this.debugLog(`Added health check: ${config.name}`);

    // Start check if checker is running
    if (this.isRunning) {
      this.scheduleCheck(config.name);
    }
  }

  /**
   * Add HTTP endpoint health check
   */
  addHTTPCheck(
    name: string,
    config: HTTPHealthCheckConfig
  ): void {
    const checkFn = async (): Promise<CheckResult> => {
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.config.defaultTimeout);

        const response = await fetch(config.url, {
          method: 'GET',
          headers: config.headers || {},
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const expectedStatus = config.expectedStatus || 200;

        if (response.status === expectedStatus) {
          return {
            name,
            status: HealthStatus.HEALTHY,
            message: `HTTP ${response.status} OK`,
            duration,
            metadata: {
              url: config.url,
              statusCode: response.status
            }
          };
        } else {
          return {
            name,
            status: HealthStatus.UNHEALTHY,
            message: `Unexpected status: ${response.status}`,
            duration,
            metadata: {
              url: config.url,
              statusCode: response.status,
              expectedStatus
            }
          };
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `HTTP check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration,
          metadata: {
            url: config.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }
    };

    this.addHealthCheck({
      name,
      check: checkFn
    });
  }

  /**
   * Add WebSocket health check
   */
  addWebSocketCheck(
    name: string,
    config: WebSocketHealthCheckConfig,
    webSocketRef?: { ws: WebSocket | null; connected: boolean }
  ): void {
    const checkFn = async (): Promise<CheckResult> => {
      const startTime = Date.now();

      try {
        // Check if WebSocket reference provided
        if (webSocketRef) {
          const isConnected = webSocketRef.connected;
          const expectConnected = config.expectConnected !== false;

          if (isConnected === expectConnected) {
            return {
              name,
              status: HealthStatus.HEALTHY,
              message: `WebSocket ${isConnected ? 'connected' : 'disconnected'}`,
              duration: Date.now() - startTime,
              metadata: {
                url: config.url,
                connected: isConnected
              }
            };
          } else {
            return {
              name,
              status: HealthStatus.UNHEALTHY,
              message: `WebSocket unexpected state: ${isConnected ? 'connected' : 'disconnected'}`,
              duration: Date.now() - startTime,
              metadata: {
                url: config.url,
                connected: isConnected,
                expected: expectConnected
              }
            };
          }
        }

        // No reference provided, assume unhealthy
        return {
          name,
          status: HealthStatus.UNKNOWN,
          message: 'WebSocket reference not provided',
          duration: Date.now() - startTime,
          metadata: {
            url: config.url
          }
        };
      } catch (error) {
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `WebSocket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          metadata: {
            url: config.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }
    };

    this.addHealthCheck({
      name,
      check: checkFn
    });
  }

  /**
   * Add resource usage health check
   */
  addResourceCheck(name: string, thresholds: ResourceThresholds): void {
    const checkFn = async (): Promise<CheckResult> => {
      const startTime = Date.now();

      try {
        // Check memory usage
        if (typeof process !== 'undefined' && process.memoryUsage) {
          const usage = process.memoryUsage();
          const heapUsedMB = usage.heapUsed / (1024 * 1024);
          const heapTotalMB = usage.heapTotal / (1024 * 1024);
          const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

          // Check thresholds
          const issues: string[] = [];

          if (thresholds.maxHeapMB && heapUsedMB > thresholds.maxHeapMB) {
            issues.push(`Heap usage (${heapUsedMB.toFixed(2)}MB) exceeds threshold (${thresholds.maxHeapMB}MB)`);
          }

          if (thresholds.maxHeapUsagePercent && heapUsagePercent > thresholds.maxHeapUsagePercent) {
            issues.push(`Heap usage (${heapUsagePercent.toFixed(2)}%) exceeds threshold (${thresholds.maxHeapUsagePercent}%)`);
          }

          if (issues.length > 0) {
            return {
              name,
              status: HealthStatus.DEGRADED,
              message: issues.join(', '),
              duration: Date.now() - startTime,
              metadata: {
                heapUsedMB,
                heapTotalMB,
                heapUsagePercent: heapUsagePercent.toFixed(2)
              }
            };
          }

          return {
            name,
            status: HealthStatus.HEALTHY,
            message: 'Resource usage within normal limits',
            duration: Date.now() - startTime,
            metadata: {
              heapUsedMB,
              heapTotalMB,
              heapUsagePercent: heapUsagePercent.toFixed(2)
            }
          };
        }

        return {
          name,
          status: HealthStatus.UNKNOWN,
          message: 'Resource usage not available',
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `Resource check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }
    };

    this.addHealthCheck({
      name,
      check: checkFn
    });
  }

  // ========================================================================
  // HEALTH CHECK EXECUTION
  // ========================================================================

  /**
   * Run all health checks
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const checks: CheckResult[] = [];

    for (const [name, checkConfig] of this.checks.entries()) {
      try {
        const result = await this.runCheck(name);
        checks.push(result);
      } catch (error) {
        checks.push({
          name,
          status: HealthStatus.UNHEALTHY,
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0
        });
      }
    }

    // Calculate overall status
    const status = this.calculateOverallStatus(checks);
    const summary = this.generateSummary(status, checks);

    const result: HealthCheckResult = {
      status,
      checks,
      timestamp: Date.now(),
      summary
    };

    // Record health metrics
    if (this.metricsCollector) {
      this.metricsCollector.recordOperationDuration('health_check', Date.now() - result.timestamp, {
        status: result.status
      });
    }

    // Emit health status change
    this.emit('healthChange', result);

    return result;
  }

  /**
   * Run a single health check
   */
  private async runCheck(name: string): Promise<CheckResult> {
    const checkConfig = this.checks.get(name);
    if (!checkConfig) {
      throw new Error(`Health check not found: ${name}`);
    }

    const startTime = Date.now();

    try {
      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
      });

      // Run check with timeout
      const result = await Promise.race([
        checkConfig.check(),
        timeoutPromise
      ]) as CheckResult;

      // Update failure count
      if (result.status === HealthStatus.HEALTHY) {
        this.failureCounts.set(name, 0);
      } else {
        const currentCount = this.failureCounts.get(name) || 0;
        this.failureCounts.set(name, currentCount + 1);
      }

      // Check if should mark as unhealthy
      const failureCount = this.failureCounts.get(name) || 0;
      if (failureCount >= (checkConfig.failureThreshold || this.config.defaultFailureThreshold)) {
        result.status = HealthStatus.UNHEALTHY;
        result.message += ` (failed ${failureCount} times)`;
      }

      // Store last result
      this.lastResults.set(name, result);

      this.debugLog(`Health check ${name}: ${result.status} (${result.duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: CheckResult = {
        name,
        status: HealthStatus.UNHEALTHY,
        message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };

      this.lastResults.set(name, result);

      return result;
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallStatus(checks: CheckResult[]): HealthStatus {
    if (checks.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const check of checks) {
      if (check.status === HealthStatus.UNHEALTHY) {
        hasUnhealthy = true;
      } else if (check.status === HealthStatus.DEGRADED) {
        hasDegraded = true;
      }
    }

    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    } else if (hasDegraded) {
      return HealthStatus.DEGRADED;
    } else {
      return HealthStatus.HEALTHY;
    }
  }

  /**
   * Generate health summary
   */
  private generateSummary(status: HealthStatus, checks: CheckResult[]): string {
    const healthyCount = checks.filter(c => c.status === HealthStatus.HEALTHY).length;
    const degradedCount = checks.filter(c => c.status === HealthStatus.DEGRADED).length;
    const unhealthyCount = checks.filter(c => c.status === HealthStatus.UNHEALTHY).length;

    const parts: string[] = [];

    if (healthyCount > 0) {
      parts.push(`${healthyCount} healthy`);
    }

    if (degradedCount > 0) {
      parts.push(`${degradedCount} degraded`);
    }

    if (unhealthyCount > 0) {
      parts.push(`${unhealthyCount} unhealthy`);
    }

    return `Overall status: ${status}. ${parts.join(', ')}`;
  }

  // ========================================================================
  // SCHEDULING & CONTROL
  // ========================================================================

  /**
   * Start health check monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.debugLog('Starting health checker');

    // Schedule all checks
    for (const name of this.checks.keys()) {
      this.scheduleCheck(name);
    }

    this.emit('started');
  }

  /**
   * Stop health check monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.debugLog('Stopping health checker');

    // Clear all timers
    for (const timer of this.checkTimers.values()) {
      clearTimeout(timer);
    }
    this.checkTimers.clear();

    this.emit('stopped');
  }

  /**
   * Schedule a health check
   */
  private scheduleCheck(name: string): void {
    const checkConfig = this.checks.get(name);
    if (!checkConfig) {
      return;
    }

    // Clear existing timer
    const existingTimer = this.checkTimers.get(name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new check
    const timer = setTimeout(async () => {
      if (this.isRunning) {
        try {
          await this.runCheck(name);
        } catch (error) {
          this.debugLog(`Scheduled health check failed: ${name} - ${error}`);
        }

        // Reschedule
        if (this.isRunning) {
          this.scheduleCheck(name);
        }
      }
    }, checkConfig.interval || this.config.defaultInterval);

    this.checkTimers.set(name, timer);
  }

  /**
   * Remove a health check
   */
  removeHealthCheck(name: string): void {
    const timer = this.checkTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.checkTimers.delete(name);
    }

    this.checks.delete(name);
    this.failureCounts.delete(name);
    this.lastResults.delete(name);

    this.debugLog(`Removed health check: ${name}`);
  }

  // ========================================================================
  // RESOURCE MONITORING
  // ========================================================================

  /**
   * Setup resource monitoring
   */
  private setupResourceMonitoring(): void {
    // Monitor memory usage periodically
    if (typeof process !== 'undefined' && process.memoryUsage) {
      setInterval(() => {
        const usage = process.memoryUsage();
        if (this.metricsCollector) {
          this.metricsCollector.recordMemoryUsage();
        }

        // Check for memory leaks
        const heapUsedMB = usage.heapUsed / (1024 * 1024);
        if (heapUsedMB > 500) {
          this.emit('warning', {
            type: 'high_memory',
            message: `High memory usage: ${heapUsedMB.toFixed(2)}MB`,
            metadata: { heapUsedMB }
          });
        }
      }, 30000); // Every 30 seconds
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get last check result
   */
  getLastResult(name: string): CheckResult | undefined {
    return this.lastResults.get(name);
  }

  /**
   * Get all registered health checks
   */
  getHealthChecks(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Check if health checker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Debug logging
   */
  private debugLog(message: string): void {
    if (this.config.debug) {
      console.log(`[HealthChecker] ${message}`);
    }
  }

  /**
   * Dispose of health checker
   */
  dispose(): void {
    this.stop();
    this.checks.clear();
    this.failureCounts.clear();
    this.lastResults.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalHealthChecker: HealthChecker | null = null;

/**
 * Get or create global health checker
 */
export function getHealthChecker(config?: HealthCheckerConfig): HealthChecker {
  if (!globalHealthChecker) {
    globalHealthChecker = new HealthChecker(config);
  }
  return globalHealthChecker;
}

/**
 * Reset global health checker
 */
export function resetHealthChecker(): void {
  if (globalHealthChecker) {
    globalHealthChecker.dispose();
    globalHealthChecker = null;
  }
}

export default HealthChecker;
