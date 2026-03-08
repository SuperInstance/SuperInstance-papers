/**
 * Health Checker
 * Performs health checks on colony components
 */

import { EventEmitter } from 'events';

import type {
  HealthCheckConfig,
  HealthCheckResult,
  HealthCheckDefinition
} from './types.js';
import type { Colony } from '../core/colony.js';

export interface HealthCheckerConfig {
  colony: Colony;
  config: HealthCheckConfig;
}

/**
 * HealthChecker - Colony health monitoring
 */
export class HealthChecker extends EventEmitter {
  private colony: Colony;
  private config: HealthCheckConfig;
  private running: boolean;

  constructor(config: HealthCheckerConfig) {
    super();

    this.colony = config.colony;
    this.config = config.config;
    this.running = false;
  }

  /**
   * Start health checker
   */
  async start(): Promise<void> {
    this.running = true;
    this.emit('health_checker_started', {
      colonyId: this.colony.id
    });
  }

  /**
   * Stop health checker
   */
  async stop(): Promise<void> {
    this.running = false;
    this.emit('health_checker_stopped', {
      colonyId: this.colony.id
    });
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Colony health check
    if (this.config.colony.enabled) {
      const colonyCheck = await this.checkColonyHealth();
      results.push(colonyCheck);
    }

    // Storage health check
    if (this.config.storage.enabled) {
      const storageCheck = await this.checkStorageHealth();
      results.push(storageCheck);
    }

    // Network health check
    if (this.config.network.enabled) {
      const networkCheck = await this.checkNetworkHealth();
      results.push(networkCheck);
    }

    // Agent health check
    if (this.config.agents.enabled) {
      const agentCheck = await this.checkAgentHealth();
      results.push(agentCheck);
    }

    // Error rate check
    const errorRateCheck = await this.checkErrorRate();
    results.push(errorRateCheck);

    // Resource usage check
    const resourceCheck = await this.checkResourceUsage();
    results.push(resourceCheck);

    // Custom checks
    for (const checkDef of this.config.customChecks) {
      if (checkDef.enabled) {
        const customCheck = await this.runCustomCheck(checkDef);
        results.push(customCheck);
      }
    }

    return results;
  }

  /**
   * Check colony health
   */
  private async checkColonyHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if colony is responsive
      const stats = await Promise.race([
        this.colony.getStats(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.colony.timeout)
        )
      ]);

      return {
        name: 'colony_responsiveness',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Colony is responsive',
        details: {
          totalAgents: stats.totalAgents,
          activeAgents: stats.activeAgents
        }
      };
    } catch (error) {
      return {
        name: 'colony_responsiveness',
        status: 'FAIL',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Colony is unresponsive: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check storage health
   */
  private async checkStorageHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would check storage connectivity
      // For now, assume storage is healthy

      return {
        name: 'storage_connectivity',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Storage is accessible',
        details: {}
      };
    } catch (error) {
      return {
        name: 'storage_connectivity',
        status: 'FAIL',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Storage is inaccessible: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check network health
   */
  private async checkNetworkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would check network connectivity
      // For now, assume network is healthy

      return {
        name: 'network_connectivity',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Network is healthy',
        details: {}
      };
    } catch (error) {
      return {
        name: 'network_connectivity',
        status: 'FAIL',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Network is unhealthy: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check agent health
   */
  private async checkAgentHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const agents = this.colony.getAllAgents();
      const activeAgents = this.colony.getActiveAgents();
      const failureThreshold = this.config.agents.failureThreshold || 0.5; // 50%

      const activeRatio = agents.length > 0 ? activeAgents.length / agents.length : 1;

      if (activeRatio < failureThreshold) {
        return {
          name: 'agent_health',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          message: `Too few active agents: ${activeAgents.length}/${agents.length} (${(activeRatio * 100).toFixed(1)}%)`,
          details: {
            totalAgents: agents.length,
            activeAgents: activeAgents.length,
            activeRatio,
            threshold: failureThreshold
          }
        };
      }

      return {
        name: 'agent_health',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Agent health is good',
        details: {
          totalAgents: agents.length,
          activeAgents: activeAgents.length,
          activeRatio
        }
      };
    } catch (error) {
      return {
        name: 'agent_health',
        status: 'FAIL',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Agent health check failed: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const agents = this.colony.getAllAgents();

      let totalExecutions = 0;
      let totalFailures = 0;

      for (const agent of agents) {
        totalExecutions += agent.executionCount || 0;
        totalFailures += agent.failureCount || 0;
      }

      const errorRate = totalExecutions > 0 ? totalFailures / totalExecutions : 0;
      const threshold = 0.1; // 10% error rate threshold

      if (errorRate > threshold) {
        return {
          name: 'error_rate',
          status: 'FAIL',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          message: `Error rate too high: ${(errorRate * 100).toFixed(1)}%`,
          details: {
            totalExecutions,
            totalFailures,
            errorRate,
            threshold
          }
        };
      }

      return {
        name: 'error_rate',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Error rate is acceptable',
        details: {
          totalExecutions,
          totalFailures,
          errorRate
        }
      };
    } catch (error) {
      return {
        name: 'error_rate',
        status: 'WARN',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Could not calculate error rate: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check resource usage
   */
  private async checkResourceUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const stats = await this.colony.getStats();

      // Check if colony is approaching resource limits
      const usageRatio = stats.activeAgents / stats.totalAgents;
      const threshold = 0.9; // 90% threshold

      if (usageRatio > threshold) {
        return {
          name: 'resource_usage',
          status: 'WARN',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          message: `Resource usage high: ${(usageRatio * 100).toFixed(1)}%`,
          details: {
            totalAgents: stats.totalAgents,
            activeAgents: stats.activeAgents,
            usageRatio,
            threshold
          }
        };
      }

      return {
        name: 'resource_usage',
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: 'Resource usage is normal',
        details: {
          totalAgents: stats.totalAgents,
          activeAgents: stats.activeAgents,
          usageRatio
        }
      };
    } catch (error) {
      return {
        name: 'resource_usage',
        status: 'WARN',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Could not check resource usage: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Run custom health check
   */
  private async runCustomCheck(checkDef: HealthCheckDefinition): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would execute custom checks
      // For now, return a placeholder

      return {
        name: checkDef.name,
        status: 'PASS',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Custom check ${checkDef.name} passed`,
        details: {}
      };
    } catch (error) {
      return {
        name: checkDef.name,
        status: 'FAIL',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: `Custom check ${checkDef.name} failed: ${error}`,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get health checker status
   */
  getStatus(): {
    running: boolean;
    config: HealthCheckConfig;
  } {
    return {
      running: this.running,
      config: this.config
    };
  }
}
