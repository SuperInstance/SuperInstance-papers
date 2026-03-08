/**
 * POLLN Monitoring System
 *
 * Comprehensive monitoring and observability for POLLN.
 * Includes metrics, tracing, logging, health checks, and alerting.
 */

// Metrics
export * from './metrics/labels.js';
export * from './metrics/schema.js';
export * from './metrics/registry.js';
export * from './metrics/collector.js';
export * from './metrics/exporters.js';

// Tracing
export * from './tracing/tracer.js';

// Logging
export * from './logging/logger.js';

// Health
export * from './health/health.js';

// Alerts
export * from './alerts/alerts.js';

// DR Monitoring
export * from './dr-metrics.js';

/**
 * Create a complete monitoring setup
 */
import { MetricsCollector } from './metrics/collector.js';
import { MetricsRegistry } from './metrics/registry.js';
import { PollnTracer } from './tracing/tracer.js';
import { PollnLogger, LogManager } from './logging/logger.js';
import { HealthCheckManager } from './health/health.js';
import { AlertManager } from './alerts/alerts.js';
import { createMultiExporterMeterProvider, createPrometheusMeterProvider } from './metrics/exporters.js';
import { MeterProvider } from '@opentelemetry/api';

/**
 * Monitoring system configuration
 */
export interface MonitoringConfig {
  // Colony identification
  colonyId: string;
  keeperId?: string;

  // Metrics configuration
  metrics?: {
    prometheus?: {
      enabled: boolean;
      port?: number;
      endpoint?: string;
    };
    console?: {
      enabled: boolean;
    };
  };

  // Tracing configuration
  tracing?: {
    serviceName?: string;
    jaeger?: {
      host: string;
      port: number;
    };
    console?: {
      enabled: boolean;
    };
  };

  // Logging configuration
  logging?: {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    prettyPrint?: boolean;
  };

  // Health check configuration
  healthCheck?: {
    interval?: number;
  };

  // Alerting configuration
  alerting?: {
    enabled: boolean;
    evaluationInterval?: number;
  };
}

/**
 * Complete monitoring system
 */
export class MonitoringSystem {
  private config: MonitoringConfig;
  private metricsRegistry?: MetricsRegistry;
  private metricsCollector?: MetricsCollector;
  private tracer?: PollnTracer;
  private logger?: PollnLogger;
  private healthCheckManager?: HealthCheckManager;
  private alertManager?: AlertManager;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Initialize monitoring system
   */
  async initialize(): Promise<void> {
    // Initialize metrics
    await this.initializeMetrics();

    // Initialize tracing
    await this.initializeTracing();

    // Initialize logging
    this.initializeLogging();

    // Initialize health checks
    this.initializeHealthChecks();

    // Initialize alerting
    if (this.config.alerting?.enabled) {
      this.initializeAlerting();
    }
  }

  /**
   * Initialize metrics
   */
  private async initializeMetrics(): Promise<void> {
    let meterProvider: MeterProvider;

    if (this.config.metrics?.prometheus?.enabled) {
      meterProvider = await createPrometheusMeterProvider({
        port: this.config.metrics.prometheus.port || 9464,
        endpoint: this.config.metrics.prometheus.endpoint || '/metrics',
      });
    } else {
      meterProvider = await createMultiExporterMeterProvider({
        console: { enabled: this.config.metrics?.console?.enabled ?? true },
      });
    }

    this.metricsRegistry = new MetricsRegistry(meterProvider, {
      meterName: 'polln',
      meterVersion: '1.0.0',
    });

    this.metricsCollector = new MetricsCollector(this.metricsRegistry, {
      colonyId: this.config.colonyId,
      keeperId: this.config.keeperId,
    });
  }

  /**
   * Initialize tracing
   */
  private async initializeTracing(): Promise<void> {
    this.tracer = new PollnTracer({
      serviceName: this.config.tracing?.serviceName || 'polln',
      serviceVersion: '1.0.0',
      serviceNamespace: 'polln',
      colonyId: this.config.colonyId,
      keeperId: this.config.keeperId,
      exporters: {
        console: {
          enabled: this.config.tracing?.console?.enabled ?? true,
        },
        ...(this.config.tracing?.jaeger && {
          jaeger: this.config.tracing.jaeger,
        }),
      },
    });
  }

  /**
   * Initialize logging
   */
  private initializeLogging(): void {
    LogManager.setDefaultConfig({
      level: this.config.logging?.level || 'info',
      prettyPrint: this.config.logging?.prettyPrint ?? true,
    });

    this.logger = LogManager.getLogger('monitoring', {
      baseContext: {
        colonyId: this.config.colonyId,
        keeperId: this.config.keeperId,
      },
    });
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    this.healthCheckManager = new HealthCheckManager();
  }

  /**
   * Initialize alerting
   */
  private initializeAlerting(): void {
    this.alertManager = new AlertManager({
      evaluationInterval: this.config.alerting?.evaluationInterval,
    });

    // Connect to metrics and health check
    if (this.metricsCollector) {
      this.alertManager.setMetricsCollector(this.metricsCollector);
    }

    if (this.healthCheckManager) {
      this.alertManager.setHealthCheckManager(this.healthCheckManager);
    }

    this.alertManager.start();
  }

  /**
   * Get metrics collector
   */
  getMetricsCollector(): MetricsCollector | undefined {
    return this.metricsCollector;
  }

  /**
   * Get tracer
   */
  getTracer(): PollnTracer | undefined {
    return this.tracer;
  }

  /**
   * Get logger
   */
  getLogger(): PollnLogger | undefined {
    return this.logger;
  }

  /**
   * Get health check manager
   */
  getHealthCheckManager(): HealthCheckManager | undefined {
    return this.healthCheckManager;
  }

  /**
   * Get alert manager
   */
  getAlertManager(): AlertManager | undefined {
    return this.alertManager;
  }

  /**
   * Shutdown monitoring system
   */
  async shutdown(): Promise<void> {
    // Stop alert manager
    if (this.alertManager) {
      this.alertManager.shutdown();
    }

    // Shutdown health check manager
    if (this.healthCheckManager) {
      this.healthCheckManager.shutdown();
    }

    // Close logger
    if (this.logger) {
      await this.logger.close();
    }

    // Shutdown tracer
    if (this.tracer) {
      await this.tracer.shutdown();
    }

    // Shutdown metrics registry
    if (this.metricsRegistry) {
      await this.metricsRegistry.shutdown();
    }
  }
}

/**
 * Create a monitoring system
 */
export async function createMonitoring(config: MonitoringConfig): Promise<MonitoringSystem> {
  const monitoring = new MonitoringSystem(config);
  await monitoring.initialize();
  return monitoring;
}
