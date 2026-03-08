# POLLN Monitoring System

Comprehensive monitoring and observability for POLLN colonies using OpenTelemetry.

## Features

- **Metrics Collection**: OpenTelemetry-based metrics with Prometheus/StatsD exporters
- **Distributed Tracing**: End-to-end tracing with Jaeger/Zipkin/OTLP support
- **Structured Logging**: Pino-based structured logging with multiple output formats
- **Health Checks**: Liveness, readiness, and startup probes
- **Alerting**: Configurable alert rules with multiple notification channels
- **Grafana Dashboard**: Pre-built dashboards for visualization
- **CLI Integration**: Command-line tools for monitoring

## Installation

```bash
npm install @opentelemetry/api @opentelemetry/sdk-metrics @opentelemetry/sdk-trace-node pino
```

## Quick Start

### Basic Setup

```typescript
import { createMonitoring } from 'polln/monitoring';

const monitoring = await createMonitoring({
  colonyId: 'my-colony',
  keeperId: 'keeper-1',

  metrics: {
    prometheus: {
      enabled: true,
      port: 9464,
      endpoint: '/metrics',
    },
  },

  tracing: {
    serviceName: 'polln-service',
    jaeger: {
      host: 'localhost',
      port: 6832,
    },
  },

  logging: {
    level: 'info',
    prettyPrint: true,
  },

  alerting: {
    enabled: true,
    evaluationInterval: 30000,
  },
});

// Get monitoring components
const metrics = monitoring.getMetricsCollector();
const tracer = monitoring.getTracer();
const logger = monitoring.getLogger();
const health = monitoring.getHealthCheckManager();
const alerts = monitoring.getAlertManager();
```

### Using Metrics

```typescript
// Record agent operations
metrics.recordAgentSpawn('task');
metrics.recordAgentSuccess('task');
metrics.recordAgentFailure('task', 'timeout');

// Record A2A communication
metrics.recordA2ASent('task', 'task', 'role', 1024);
metrics.recordA2AReceived('task');

// Record KV-cache operations
metrics.recordKVHit('kv_anchor', 'exact');
metrics.recordKVMiss('kv_anchor');

// Record with timing
const endTimer = metrics.recordAgentExecutionStart('agent-1', 'task', 'execute');
// ... do work ...
endTimer();
```

### Using Tracing

```typescript
// Create a span
const span = tracer.startSpan('agent.execute');
try {
  // Do work
  span.setAttribute('agent.id', 'agent-1');
  span.setAttribute('agent.type', 'task');
} finally {
  span.end();
}

// Use withSpan for automatic span management
const result = await tracer.withSpan('agent.execute', async (span) => {
  span.setAttribute('agent.id', 'agent-1');
  return await doWork();
});
```

### Using Logging

```typescript
// Basic logging
logger.info('Agent spawned', { agentId: 'agent-1' });
logger.error('Agent failed', error, { agentId: 'agent-1' });

// Specialized logging methods
logger.agent('spawn', 'agent-1', 'task');
logger.a2a('sent', 'task', { size: 1024 });
logger.cache('hit', 'kv_anchor', { latency: 5 });
logger.federation('sync', 'fed-1', { round: 5 });
logger.safety('check', 'constraint-1', { result: 'allowed' });

// Create child logger with context
const agentLogger = logger.child({ agentId: 'agent-1', agentType: 'task' });
agentLogger.info('Agent initialized');
```

### Using Health Checks

```typescript
import {
  createAgentPoolHealthCheck,
  createKVCacheHealthCheck,
  createMemoryHealthCheck,
} from 'polln/monitoring';

// Register health checks
health.register(createAgentPoolHealthCheck(() => ({
  total: colony.count,
  active: colony.getActiveAgents().length,
})));

health.register(createKVCacheHealthCheck(() => ({
  size: kvCache.getSize(),
  hitRate: kvCache.getHitRate(),
  anchorCount: kvCache.getAnchorCount(),
})));

health.register(createMemoryHealthCheck(1000)); // 1GB threshold

// Check health
const healthStatus = await health.getOverallHealth();
console.log(`Health: ${healthStatus.status}`);

// Liveness/Readiness/Startup probes
const liveness = await health.getLiveness();
const readiness = await health.getReadiness();
const startup = await health.getStartup();
```

### Using Alerting

```typescript
import {
  createHighErrorRateAlert,
  createHighLatencyAlert,
  AlertSeverity,
} from 'polln/monitoring';

// Add alert rules
alerts.addRule(createHighErrorRateAlert(0.05)); // 5% error rate
alerts.addRule(createHighLatencyAlert(2000));   // 2s latency

// Custom alert rule
alerts.addRule({
  id: 'custom_alert',
  name: 'Custom Alert',
  description: 'My custom alert',
  severity: AlertSeverity.WARNING,
  enabled: true,
  condition: {
    type: 'threshold',
    metric: 'my_metric',
    threshold: 100,
    operator: '>',
  },
  actions: [
    {
      type: 'webhook',
      config: {
        url: 'https://hooks.slack.com/...',
      },
    },
  ],
  cooldown: 60000,
});

// Listen for alert events
alerts.on('alert_triggered', (alert) => {
  console.log(`Alert triggered: ${alert.ruleName}`);
  logger.warn('Alert triggered', { alert });
});

alerts.start();
```

## CLI Commands

```bash
# Show current metrics
npm run monitor:metrics

# Show recent traces
npm run monitor:traces

# Tail logs
npm run monitor:logs

# Check system health
npm run monitor:health

# Show active alerts
npm run monitor:alerts

# Launch monitoring dashboard
npm run monitor:dashboard
```

## Metrics Reference

### Agent Metrics

- `polln_agent_total` - Total number of agents
- `polln_agent_active` - Number of active agents
- `polln_agent_spawn_total` - Total agents spawned
- `polln_agent_terminate_total` - Total agents terminated
- `polln_agent_execution_duration` - Agent execution time (histogram)
- `polln_agent_success_total` - Successful executions
- `polln_agent_failure_total` - Failed executions
- `polln_agent_value_function` - Agent value function

### A2A Communication Metrics

- `polln_a2a_packages_sent_total` - A2A packages sent
- `polln_a2a_packages_received_total` - A2A packages received
- `polln_a2a_package_size` - Package size (histogram)
- `polln_a2a_package_latency` - Package latency (histogram)
- `polln_a2a_package_processing_duration` - Processing time (histogram)

### KV-Cache Metrics

- `polln_kv_cache_hits_total` - Cache hits
- `polln_kv_cache_misses_total` - Cache misses
- `polln_kv_anchors_total` - Number of anchors
- `polln_kv_cache_size` - Cache size in bytes
- `polln_anchor_match_duration` - Match duration (histogram)
- `polln_anchor_match_similarity` - Match similarity (histogram)

### Federated Learning Metrics

- `polln_federation_participants` - Number of participants
- `polln_federation_rounds_total` - Total rounds
- `polln_federation_updates_total` - Updates received
- `polln_federation_round_duration` - Round duration (histogram)
- `polln_federation_convergence` - Convergence score

### Dreaming Metrics

- `polln_dream_cycle_duration` - Dream cycle duration (histogram)
- `polln_dream_episodes_total` - Dream episodes generated
- `polln_dream_improvement` - Policy improvement percentage
- `polln_tile_dream_gain` - Tile dream gain percentage

### API Metrics

- `polln_api_request_duration` - Request duration (histogram)
- `polln_api_requests_total` - Total requests
- `polln_websocket_connections` - Active connections
- `polln_websocket_messages_total` - Messages sent/received
- `polln_api_errors_total` - API errors

### System Metrics

- `polln_system_memory_usage` - Memory usage in bytes
- `polln_system_cpu_usage` - CPU usage percentage
- `polln_system_gc_duration` - GC duration (histogram)
- `polln_event_loop_delay` - Event loop delay (histogram)

## Grafana Dashboard

1. Import the dashboard from `src/monitoring/dashboard/grafana-dashboard.json`
2. Configure Prometheus data source
3. View metrics at `http://localhost:3000`

## Production Configuration

```typescript
const monitoring = await createMonitoring({
  colonyId: 'prod-colony',
  keeperId: 'prod-keeper',

  metrics: {
    prometheus: {
      enabled: true,
      port: 9464,
      endpoint: '/metrics',
    },
  },

  tracing: {
    serviceName: 'polln-prod',
    jaeger: {
      host: process.env.JAEGER_HOST || 'jaeger',
      port: parseInt(process.env.JAEGER_PORT || '6832'),
    },
  },

  logging: {
    level: 'info',
    prettyPrint: false,
    destination: {
      type: 'file',
      path: '/var/log/polln/app.log',
    },
  },

  alerting: {
    enabled: true,
    evaluationInterval: 30000,
  },
});
```

## License

MIT
