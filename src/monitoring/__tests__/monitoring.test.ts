/**
 * Monitoring System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'jest';
import {
  LabelBuilder,
  MetricsRegistry,
  MetricsCollector,
  PollnTracer,
  PollnLogger,
  LogManager,
  HealthCheckManager,
  createAgentPoolHealthCheck,
  createKVCacheHealthCheck,
  createMemoryHealthCheck,
  HealthStatus,
  AlertManager,
  createHighErrorRateAlert,
  createHighLatencyAlert,
  AlertSeverity,
  createMonitoring,
  MonitoringSystem,
} from '../index.js';

describe('LabelBuilder', () => {
  it('should build labels with colony ID', () => {
    const builder = new LabelBuilder();
    const labels = builder.withColony('test-colony').build();
    expect(labels).toEqual({ colony_id: 'test-colony' });
  });

  it('should build labels with agent info', () => {
    const builder = new LabelBuilder();
    const labels = builder.withAgent('agent-1', 'task').build();
    expect(labels).toEqual({
      agent_id: 'agent-1',
      agent_type: 'task',
    });
  });

  it('should build labels with operation', () => {
    const builder = new LabelBuilder();
    const labels = builder.withOperation('execute').build();
    expect(labels).toEqual({ operation: 'execute' });
  });

  it('should build labels with status', () => {
    const builder = new LabelBuilder();
    const labels = builder.withStatus('success').build();
    expect(labels).toEqual({ status: 'success' });
  });

  it('should chain label builders', () => {
    const builder = new LabelBuilder();
    const labels = builder
      .withColony('test-colony')
      .withAgent('agent-1', 'task')
      .withOperation('execute')
      .withStatus('success')
      .build();
    expect(labels).toEqual({
      colony_id: 'test-colony',
      agent_id: 'agent-1',
      agent_type: 'task',
      operation: 'execute',
      status: 'success',
    });
  });
});

describe('MetricsCollector', () => {
  let registry: MetricsRegistry;
  let collector: MetricsCollector;

  beforeEach(() => {
    // Create a simple registry for testing
    registry = new MetricsRegistry({
      getMeter: () => ({
        createCounter: jest.fn().mockReturnValue({
          add: jest.fn(),
        }),
        createGauge: jest.fn().mockReturnValue({
          record: jest.fn(),
          add: jest.fn(),
        }),
        createHistogram: jest.fn().mockReturnValue({
          record: jest.fn(),
        }),
        createUpDownCounter: jest.fn().mockReturnValue({
          add: jest.fn(),
        }),
      } as any),
    } as any);
    collector = new MetricsCollector(registry, {
      colonyId: 'test-colony',
      keeperId: 'test-keeper',
    });
  });

  it('should record agent spawn', () => {
    expect(() => collector.recordAgentSpawn('task')).not.toThrow();
  });

  it('should record agent termination', () => {
    expect(() => collector.recordAgentTerminate('task', 'shutdown')).not.toThrow();
  });

  it('should record agent success', () => {
    expect(() => collector.recordAgentSuccess('task')).not.toThrow();
  });

  it('should record agent failure', () => {
    expect(() => collector.recordAgentFailure('task', 'timeout')).not.toThrow();
  });

  it('should record agent value', () => {
    expect(() => collector.recordAgentValue('agent-1', 'task', 0.75)).not.toThrow();
  });

  it('should record A2A sent', () => {
    expect(() => collector.recordA2ASent('task', 'task', 'role', 1024)).not.toThrow();
  });

  it('should record A2A received', () => {
    expect(() => collector.recordA2AReceived('task')).not.toThrow();
  });

  it('should record KV cache hit', () => {
    expect(() => collector.recordKVHit('kv_anchor', 'exact')).not.toThrow();
  });

  it('should record KV cache miss', () => {
    expect(() => collector.recordKVMiss('kv_anchor')).not.toThrow();
  });

  it('should record safety check', () => {
    expect(() => collector.recordSafetyCheck('safety', 'allowed')).not.toThrow();
  });

  it('should get config', () => {
    const config = collector.getConfig();
    expect(config.colonyId).toBe('test-colony');
    expect(config.keeperId).toBe('test-keeper');
  });
});

describe('PollnTracer', () => {
  let tracer: PollnTracer;

  beforeEach(() => {
    tracer = new PollnTracer({
      serviceName: 'test-service',
      colonyId: 'test-colony',
      exporters: {
        console: { enabled: false },
      },
    });
  });

  afterEach(async () => {
    await tracer.shutdown();
  });

  it('should start a span', () => {
    const span = tracer.startSpan('test-operation');
    expect(span).toBeDefined();
    span.end();
  });

  it('should execute code with span', async () => {
    const result = await tracer.withSpan('test-operation', async (span) => {
      return 'test-result';
    });
    expect(result).toBe('test-result');
  });

  it('should handle errors in spans', async () => {
    await expect(
      tracer.withSpan('test-operation', async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');
  });

  it('should inject and extract context', () => {
    const carrier: Record<string, string> = {};
    tracer.injectContext(carrier);
    expect(carrier).toBeDefined();

    const context = tracer.extractContext(carrier);
    expect(context).toBeDefined();
  });
});

describe('PollnLogger', () => {
  let logger: PollnLogger;

  beforeEach(() => {
    logger = new PollnLogger('test-module', {
      level: 'info',
      prettyPrint: false,
    });
  });

  afterEach(async () => {
    await logger.close();
  });

  it('should log trace messages', () => {
    expect(() => logger.trace('trace message')).not.toThrow();
  });

  it('should log debug messages', () => {
    expect(() => logger.debug('debug message')).not.toThrow();
  });

  it('should log info messages', () => {
    expect(() => logger.info('info message')).not.toThrow();
  });

  it('should log warn messages', () => {
    expect(() => logger.warn('warn message')).not.toThrow();
  });

  it('should log error messages', () => {
    expect(() => logger.error('error message')).not.toThrow();
  });

  it('should log error with Error object', () => {
    const error = new Error('Test error');
    expect(() => logger.error('error message', error)).not.toThrow();
  });

  it('should log fatal messages', () => {
    expect(() => logger.fatal('fatal message')).not.toThrow();
  });

  it('should create child logger', () => {
    const child = logger.child({ agentId: 'agent-1' });
    expect(child).toBeDefined();
  });

  it('should log lifecycle events', () => {
    expect(() => logger.lifecycle('startup')).not.toThrow();
  });

  it('should log metric events', () => {
    expect(() => logger.metric('test_metric', 42, 'count')).not.toThrow();
  });

  it('should log A2A events', () => {
    expect(() => logger.a2a('sent', 'task', { size: 1024 })).not.toThrow();
  });

  it('should log agent events', () => {
    expect(() => logger.agent('spawn', 'agent-1', 'task')).not.toThrow();
  });

  it('should log cache events', () => {
    expect(() => logger.cache('hit', 'kv_anchor', { latency: 5 })).not.toThrow();
  });

  it('should log federation events', () => {
    expect(() => logger.federation('sync', 'fed-1', { round: 5 })).not.toThrow();
  });

  it('should log dreaming events', () => {
    expect(() => logger.dreaming('cycle_complete', 'policy', { improvement: 0.1 })).not.toThrow();
  });

  it('should log API events', () => {
    expect(() => logger.api('request', 'GET', '/api/agents', 200)).not.toThrow();
  });

  it('should log safety events', () => {
    expect(() => logger.safety('check', 'constraint-1', { result: 'allowed' })).not.toThrow();
  });
});

describe('LogManager', () => {
  afterEach(async () => {
    await LogManager.closeAll();
  });

  it('should get logger for module', () => {
    const logger = LogManager.getLogger('test-module');
    expect(logger).toBeDefined();
  });

  it('should return same logger for same module', () => {
    const logger1 = LogManager.getLogger('test-module');
    const logger2 = LogManager.getLogger('test-module');
    expect(logger1).toBe(logger2);
  });

  it('should return different loggers for different modules', () => {
    const logger1 = LogManager.getLogger('module-1');
    const logger2 = LogManager.getLogger('module-2');
    expect(logger1).not.toBe(logger2);
  });

  it('should flush all loggers', async () => {
    LogManager.getLogger('test-module');
    await expect(LogManager.flushAll()).resolves.not.toThrow();
  });

  it('should close all loggers', async () => {
    LogManager.getLogger('test-module');
    await expect(LogManager.closeAll()).resolves.not.toThrow();
  });
});

describe('HealthCheckManager', () => {
  let manager: HealthCheckManager;

  beforeEach(() => {
    manager = new HealthCheckManager();
  });

  afterEach(() => {
    manager.shutdown();
  });

  it('should register health check', () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 10,
      active: 8,
    }));
    manager.register(check);
    expect(manager.getRules().length).toBe(1);
  });

  it('should unregister health check', () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 10,
      active: 8,
    }));
    manager.register(check);
    manager.unregister('agent_pool');
    expect(manager.getRules().length).toBe(0);
  });

  it('should execute health check', async () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 10,
      active: 8,
    }));
    manager.register(check);
    const result = await manager.executeCheck('agent_pool');
    expect(result).toBeDefined();
    expect(result.name).toBe('agent_pool');
  });

  it('should execute all health checks', async () => {
    manager.register(createAgentPoolHealthCheck(() => ({ total: 10, active: 8 })));
    manager.register(createKVCacheHealthCheck(() => ({
      size: 1000000,
      hitRate: 0.9,
      anchorCount: 100,
    })));
    const results = await manager.executeAll();
    expect(results.length).toBe(2);
  });

  it('should get overall health', async () => {
    manager.register(createAgentPoolHealthCheck(() => ({ total: 10, active: 8 })));
    const health = await manager.getOverallHealth();
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.checks).toBeDefined();
    expect(health.uptime).toBeGreaterThan(0);
  });

  it('should get liveness', async () => {
    const liveness = await manager.getLiveness();
    expect(liveness.alive).toBe(true);
  });

  it('should get readiness', async () => {
    manager.register(createAgentPoolHealthCheck(() => ({ total: 10, active: 8 })));
    const readiness = await manager.getReadiness();
    expect(readiness.ready).toBeDefined();
  });

  it('should get startup', async () => {
    const startup = await manager.getStartup();
    expect(startup.started).toBeDefined();
    expect(startup.uptime).toBeGreaterThan(0);
  });

  it('should clear results', () => {
    manager.register(createAgentPoolHealthCheck(() => ({ total: 10, active: 8 })));
    manager.clearResults();
    expect(manager.getResults().length).toBe(0);
  });
});

describe('createAgentPoolHealthCheck', () => {
  it('should create health check config', () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 10,
      active: 8,
    }));
    expect(check.name).toBe('agent_pool');
    expect(check.critical).toBe(true);
    expect(check.check).toBeDefined();
  });

  it('should return healthy when agents are active', async () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 10,
      active: 8,
    }));
    const result = await check.check();
    expect(result.status).toBe(HealthStatus.HEALTHY);
  });

  it('should return degraded when no agents', async () => {
    const check = createAgentPoolHealthCheck(() => ({
      total: 0,
      active: 0,
    }));
    const result = await check.check();
    expect(result.status).toBe(HealthStatus.DEGRADED);
  });
});

describe('createKVCacheHealthCheck', () => {
  it('should create health check config', () => {
    const check = createKVCacheHealthCheck(() => ({
      size: 1000000,
      hitRate: 0.9,
      anchorCount: 100,
    }));
    expect(check.name).toBe('kv_cache');
    expect(check.critical).toBe(true);
    expect(check.check).toBeDefined();
  });

  it('should return healthy when cache is good', async () => {
    const check = createKVCacheHealthCheck(() => ({
      size: 1000000,
      hitRate: 0.9,
      anchorCount: 100,
    }));
    const result = await check.check();
    expect(result.status).toBe(HealthStatus.HEALTHY);
  });

  it('should return degraded when hit rate is low', async () => {
    const check = createKVCacheHealthCheck(() => ({
      size: 1000000,
      hitRate: 0.3,
      anchorCount: 100,
    }));
    const result = await check.check();
    expect(result.status).toBe(HealthStatus.DEGRADED);
  });
});

describe('createMemoryHealthCheck', () => {
  it('should create health check config', () => {
    const check = createMemoryHealthCheck(1000);
    expect(check.name).toBe('memory');
    expect(check.critical).toBe(true);
    expect(check.check).toBeDefined();
  });

  it('should return healthy when memory is normal', async () => {
    const check = createMemoryHealthCheck(10000);
    const result = await check.check();
    expect(result.status).toBe(HealthStatus.HEALTHY);
  });
});

describe('AlertManager', () => {
  let manager: AlertManager;

  beforeEach(() => {
    manager = new AlertManager({
      evaluationInterval: 1000,
    });
  });

  afterEach(() => {
    manager.shutdown();
  });

  it('should add alert rule', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    expect(manager.getRules().length).toBe(1);
  });

  it('should remove alert rule', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    manager.removeRule('high_error_rate');
    expect(manager.getRules().length).toBe(0);
  });

  it('should update alert rule', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    rule.severity = AlertSeverity.CRITICAL;
    manager.updateRule(rule);
    expect(manager.getRule('high_error_rate')?.severity).toBe(AlertSeverity.CRITICAL);
  });

  it('should get rule by ID', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    const retrieved = manager.getRule('high_error_rate');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('high_error_rate');
  });

  it('should get all rules', () => {
    manager.addRule(createHighErrorRateAlert());
    manager.addRule(createHighLatencyAlert());
    expect(manager.getRules().length).toBe(2);
  });

  it('should acknowledge alert', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    manager.start();
    // Wait a bit for evaluation
    setTimeout(() => {
      const alerts = manager.getActiveAlerts();
      if (alerts.length > 0) {
        manager.acknowledgeAlert(alerts[0].id);
        expect(manager.getActiveAlerts()[0].status).not.toBe('active');
      }
      manager.stop();
    }, 2000);
  });

  it('should silence alert', () => {
    const rule = createHighErrorRateAlert();
    manager.addRule(rule);
    manager.silenceAlert('high_error_rate', 60000);
    const updated = manager.getRule('high_error_rate');
    expect(updated?.silenceUntil).toBeGreaterThan(Date.now());
  });

  it('should register notifier', () => {
    const notifier = {
      name: 'test',
      send: jest.fn(),
    };
    manager.registerNotifier(notifier);
    expect(manager['notifiers'].has('test')).toBe(true);
  });

  it('should unregister notifier', () => {
    const notifier = {
      name: 'test',
      send: jest.fn(),
    };
    manager.registerNotifier(notifier);
    manager.unregisterNotifier('test');
    expect(manager['notifiers'].has('test')).toBe(false);
  });
});

describe('createHighErrorRateAlert', () => {
  it('should create alert rule', () => {
    const rule = createHighErrorRateAlert(0.1);
    expect(rule.id).toBe('high_error_rate');
    expect(rule.name).toBe('High Error Rate');
    expect(rule.severity).toBe(AlertSeverity.ERROR);
    expect(rule.enabled).toBe(true);
  });
});

describe('createHighLatencyAlert', () => {
  it('should create alert rule', () => {
    const rule = createHighLatencyAlert(2000);
    expect(rule.id).toBe('high_latency');
    expect(rule.name).toBe('High Latency');
    expect(rule.severity).toBe(AlertSeverity.WARNING);
    expect(rule.enabled).toBe(true);
  });
});

describe('createMonitoring', () => {
  it('should create monitoring system', async () => {
    const monitoring = await createMonitoring({
      colonyId: 'test-colony',
      keeperId: 'test-keeper',
      metrics: {
        console: { enabled: true },
      },
      tracing: {
        console: { enabled: false },
      },
      logging: {
        level: 'info',
        prettyPrint: false,
      },
      alerting: {
        enabled: false,
      },
    });
    expect(monitoring).toBeDefined();
    expect(monitoring.getMetricsCollector()).toBeDefined();
    expect(monitoring.getTracer()).toBeDefined();
    expect(monitoring.getLogger()).toBeDefined();
    expect(monitoring.getHealthCheckManager()).toBeDefined();
    await monitoring.shutdown();
  });

  it('should create monitoring with alerting', async () => {
    const monitoring = await createMonitoring({
      colonyId: 'test-colony',
      alerting: {
        enabled: true,
        evaluationInterval: 1000,
      },
      metrics: {
        console: { enabled: true },
      },
      tracing: {
        console: { enabled: false },
      },
    });
    expect(monitoring.getAlertManager()).toBeDefined();
    await monitoring.shutdown();
  });

  it('should shutdown monitoring system', async () => {
    const monitoring = await createMonitoring({
      colonyId: 'test-colony',
      metrics: {
        console: { enabled: true },
      },
      tracing: {
        console: { enabled: false },
      },
      alerting: {
        enabled: false,
      },
    });
    await expect(monitoring.shutdown()).resolves.not.toThrow();
  });
});
