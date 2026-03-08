/**
 * Failure Detector
 * Detects colony failures and triggers failover
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

import type {
  FailureDetectionConfig,
  FailureDetectionResult,
  FailureType,
  HealthCheckConfig,
  HealthCheckResult,
  ColonyHealthStatus
} from './types.js';
import type { Colony } from '../core/colony.js';
import { HealthChecker } from './health-check.js';

export interface DetectorConfig {
  colony: Colony;
  detection: FailureDetectionConfig;
  healthCheck: HealthCheckConfig;
  failureThreshold: number;
  recoveryThreshold: number;
}

/**
 * FailureDetector - Colony failure detection
 */
export class FailureDetector extends EventEmitter {
  private colony: Colony;
  private config: DetectorConfig;
  private healthChecker: HealthChecker;
  private detectionHistory: Map<string, FailureDetectionResult[]>;
  private healthStatus: ColonyHealthStatus;
  private running: boolean;
  private checkInterval?: NodeJS.Timeout;

  constructor(config: DetectorConfig) {
    super();

    this.colony = config.colony;
    this.config = config;
    this.healthChecker = new HealthChecker({
      colony: this.colony,
      config: config.healthCheck
    });
    this.detectionHistory = new Map();
    this.healthStatus = {
      overall: 'HEALTHY',
      checks: [],
      lastCheckTime: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
    this.running = false;
  }

  /**
   * Start failure detection
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // Start health checks
    await this.healthChecker.start();

    // Set up detection interval
    const interval = Math.max(
      this.config.detection.enabled
        ? 30000 // Default 30 seconds
        : 60000, // Default 60 seconds
      this.config.healthCheck.colony.interval
    );

    this.checkInterval = setInterval(async () => {
      await this.performDetectionCycle();
    }, interval);

    this.emit('detector_started', {
      colonyId: this.colony.id,
      interval
    });
  }

  /**
   * Stop failure detection
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // Stop health checks
    await this.healthChecker.stop();

    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.emit('detector_stopped', {
      colonyId: this.colony.id
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ColonyHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Perform detection cycle
   */
  private async performDetectionCycle(): Promise<void> {
    try {
      // Run health checks
      const healthResults = await this.healthChecker.runAllChecks();

      // Update health status
      this.healthStatus.checks = healthResults;
      this.healthStatus.lastCheckTime = Date.now();

      // Calculate overall health
      const failedChecks = healthResults.filter(c => c.status === 'FAIL');
      const warnedChecks = healthResults.filter(c => c.status === 'WARN');

      if (failedChecks.length > 0) {
        this.healthStatus.overall = 'UNHEALTHY';
        this.healthStatus.consecutiveFailures++;
        this.healthStatus.consecutiveSuccesses = 0;
      } else if (warnedChecks.length > 0) {
        this.healthStatus.overall = 'DEGRADED';
      } else {
        this.healthStatus.overall = 'HEALTHY';
        this.healthStatus.consecutiveSuccesses++;
        this.healthStatus.consecutiveFailures = 0;
      }

      // Check if failure threshold reached
      if (this.healthStatus.consecutiveFailures >= this.config.failureThreshold) {
        await this.triggerFailoverDetection();
      } else if (this.healthStatus.consecutiveSuccesses >= this.config.recoveryThreshold) {
        await this.triggerRecoveryDetection();
      }

      // Emit health status update
      this.emit('health_status_updated', this.healthStatus);
    } catch (error) {
      this.emit('detection_error', {
        colonyId: this.colony.id,
        error
      });
    }
  }

  /**
   * Trigger failover detection
   */
  private async triggerFailoverDetection(): Promise<void> {
    this.emit('failure_threshold_reached', {
      colonyId: this.colony.id,
      consecutiveFailures: this.healthStatus.consecutiveFailures,
      threshold: this.config.failureThreshold
    });

    // Determine failure type
    const failureType = this.determineFailureType();

    // Create detection result
    const result: FailureDetectionResult = {
      detected: true,
      confidence: Math.min(this.healthStatus.consecutiveFailures / this.config.failureThreshold, 1.0),
      failureType,
      detector: 'threshold',
      timestamp: Date.now(),
      details: {
        metric: 'health_check_failures',
        value: this.healthStatus.consecutiveFailures,
        threshold: this.config.failureThreshold,
        message: `Colony has failed ${this.healthStatus.consecutiveFailures} consecutive health checks`
      }
    };

    // Store in history
    this.storeDetectionResult(result);

    // Emit failure detected
    this.emit('failure_detected', {
      colonyId: this.colony.id,
      result
    });
  }

  /**
   * Trigger recovery detection
   */
  private async triggerRecoveryDetection(): Promise<void> {
    this.emit('recovery_threshold_reached', {
      colonyId: this.colony.id,
      consecutiveSuccesses: this.healthStatus.consecutiveSuccesses,
      threshold: this.config.recoveryThreshold
    });

    // Emit recovery ready
    this.emit('recovery_ready', {
      colonyId: this.colony.id,
      healthStatus: this.healthStatus
    });
  }

  /**
   * Determine failure type from health check results
   */
  private determineFailureType(): FailureType {
    const failedChecks = this.healthStatus.checks.filter(c => c.status === 'FAIL');

    for (const check of failedChecks) {
      switch (check.name) {
        case 'colony_responsiveness':
          return 'COLONY_UNRESPONSIVE';
        case 'storage_connectivity':
          return 'STORAGE_FAILURE';
        case 'network_connectivity':
          return 'NETWORK_FAILURE';
        case 'agent_health':
          return 'AGENT_FAILURE';
      }
    }

    // Check error rates
    const errorRateCheck = this.healthStatus.checks.find(c => c.name === 'error_rate');
    if (errorRateCheck && errorRateCheck.status === 'FAIL') {
      return 'HIGH_ERROR_RATE';
    }

    // Check resource exhaustion
    const resourceCheck = this.healthStatus.checks.find(c => c.name === 'resource_usage');
    if (resourceCheck && resourceCheck.status === 'FAIL') {
      return 'RESOURCE_EXHAUSTION';
    }

    return 'COLONY_UNRESPONSIVE';
  }

  /**
   * Store detection result in history
   */
  private storeDetectionResult(result: FailureDetectionResult): void {
    const key = `${result.failureType}_${result.detector}`;
    const history = this.detectionHistory.get(key) || [];

    history.push(result);

    // Keep last 100 results
    if (history.length > 100) {
      history.shift();
    }

    this.detectionHistory.set(key, history);
  }

  /**
   * Get detection history
   */
  getDetectionHistory(failureType?: FailureType): Map<string, FailureDetectionResult[]> {
    if (failureType) {
      const filtered = new Map<string, FailureDetectionResult[]>();
      for (const [key, results] of this.detectionHistory) {
        if (key.startsWith(failureType)) {
          filtered.set(key, results);
        }
      }
      return filtered;
    }
    return new Map(this.detectionHistory);
  }

  /**
   * Manually trigger failure detection
   */
  async manualTrigger(reason: string): Promise<void> {
    this.emit('manual_failure_trigger', {
      colonyId: this.colony.id,
      reason,
      timestamp: Date.now()
    });

    const result: FailureDetectionResult = {
      detected: true,
      confidence: 1.0,
      failureType: 'MANUAL_TRIGGER',
      detector: 'manual',
      timestamp: Date.now(),
      details: {
        metric: 'manual_trigger',
        value: 1,
        threshold: 0,
        message: reason
      }
    };

    this.storeDetectionResult(result);

    this.emit('failure_detected', {
      colonyId: this.colony.id,
      result
    });
  }
}
