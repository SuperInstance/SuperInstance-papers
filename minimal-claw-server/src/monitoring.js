/**
 * Monitoring and Metrics Collection for Minimal CLAW Server
 *
 * This module integrates with Prometheus for metrics collection
 * and provides structured logging for observability.
 */

import promClient from 'prom-client';

// ============================================================================
// Prometheus Metrics Setup
// ============================================================================

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// ============================================================================
// HTTP Metrics
// ============================================================================

// HTTP request counter
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// ============================================================================
// Agent Metrics
// ============================================================================

// Active agents gauge
const activeAgentsGauge = new promClient.Gauge({
  name: 'claw_agents_active_total',
  help: 'Number of active agents',
  registers: [register],
});

// Agent operations counter
const agentOperationsCounter = new promClient.Counter({
  name: 'claw_agent_operations_total',
  help: 'Total number of agent operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Agent state transitions
const agentStateTransitions = new promClient.Counter({
  name: 'claw_agent_state_transitions_total',
  help: 'Total number of agent state transitions',
  labelNames: ['from_state', 'to_state'],
  registers: [register],
});

// ============================================================================
// WebSocket Metrics
// ============================================================================

// Active WebSocket connections
const wsConnectionsGauge = new promClient.Gauge({
  name: 'claw_ws_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// WebSocket messages counter
const wsMessagesCounter = new promClient.Counter({
  name: 'claw_ws_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type'],
  registers: [register],
});

// ============================================================================
// Database Metrics
// ============================================================================

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'claw_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Database connection pool gauge
const dbConnectionsGauge = new promClient.Gauge({
  name: 'claw_db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// ============================================================================
// Cache Metrics
// ============================================================================

// Cache hit rate
const cacheHitRate = new promClient.Counter({
  name: 'claw_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// ============================================================================
// Business Metrics
// ============================================================================

// Agent triggers counter
const agentTriggersCounter = new promClient.Counter({
  name: 'claw_agent_triggers_total',
  help: 'Total number of agent triggers',
  labelNames: ['agent_type', 'trigger_type'],
  registers: [register],
});

// Equipment changes
const equipmentChangesCounter = new promClient.Counter({
  name: 'claw_equipment_changes_total',
  help: 'Total number of equipment changes',
  labelNames: ['equipment_slot', 'action'],
  registers: [register],
});

// ============================================================================
// Middleware
// ============================================================================

/**
 * Express middleware to track HTTP requests
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );
  });

  next();
}

// ============================================================================
// Metrics Endpoint
// ============================================================================

/**
 * Express handler to expose Prometheus metrics
 */
export async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
}

// ============================================================================
// Helper Functions
// =============================================================================

/**
 * Update active agents gauge
 */
export function updateActiveAgents(count) {
  activeAgentsGauge.set(count);
}

/**
 * Record agent operation
 */
export function recordAgentOperation(operation, status) {
  agentOperationsCounter.inc({ operation, status });
}

/**
 * Record agent state transition
 */
export function recordAgentStateTransition(fromState, toState) {
  agentStateTransitions.inc({ from_state: fromState, to_state: toState });
}

/**
 * Update WebSocket connections gauge
 */
export function updateWebSocketConnections(count) {
  wsConnectionsGauge.set(count);
}

/**
 * Record WebSocket message
 */
export function recordWebSocketMessage(direction, type) {
  wsMessagesCounter.inc({ direction, type });
}

/**
 * Record database query duration
 */
export function recordDbQueryDuration(operation, table, duration) {
  dbQueryDuration.observe({ operation, table }, duration);
}

/**
 * Update database connections gauge
 */
export function updateDbConnections(count) {
  dbConnectionsGauge.set(count);
}

/**
 * Record cache operation
 */
export function recordCacheOperation(operation, status) {
  cacheHitRate.inc({ operation, status });
}

/**
 * Record agent trigger
 */
export function recordAgentTrigger(agentType, triggerType) {
  agentTriggersCounter.inc({ agent_type: agentType, trigger_type: triggerType });
}

/**
 * Record equipment change
 */
export function recordEquipmentChange(equipmentSlot, action) {
  equipmentChangesCounter.inc({ equipment_slot: equipmentSlot, action });
}

// ============================================================================
// Export Metrics
// ============================================================================

export {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeAgentsGauge,
  agentOperationsCounter,
  agentStateTransitions,
  wsConnectionsGauge,
  wsMessagesCounter,
  dbQueryDuration,
  dbConnectionsGauge,
  cacheHitRate,
  agentTriggersCounter,
  equipmentChangesCounter,
};

// ============================================================================
// Health Check
// ============================================================================

/**
 * Comprehensive health check endpoint
 */
export async function healthCheckHandler(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'unknown',
      },
      redis: {
        status: 'unknown',
      },
      agents: {
        status: 'unknown',
        count: 0,
      },
    },
  };

  try {
    // Check database connection (if configured)
    if (process.env.DB_HOST) {
      // Add your database health check here
      health.checks.database.status = 'ok';
    }

    // Check Redis connection (if configured)
    if (process.env.REDIS_HOST) {
      // Add your Redis health check here
      health.checks.redis.status = 'ok';
    }

    // Check agent count
    health.checks.agents.count = activeAgentsGauge.get();
    health.checks.agents.status = 'ok';

    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    res.status(503).json(health);
  }
}

// ============================================================================
// Structured Logging
// =============================================================================

/**
 * Structured logger with context
 */
export class Logger {
  constructor(context) {
    this.context = context;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...data,
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${level.toUpperCase()}] ${this.context}: ${message}`, data);
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  debug(message, data) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, data);
    }
  }
}

/**
 * Create a logger with context
 */
export function createLogger(context) {
  return new Logger(context);
}

export default {
  metricsMiddleware,
  metricsHandler,
  healthCheckHandler,
  updateActiveAgents,
  recordAgentOperation,
  recordAgentStateTransition,
  updateWebSocketConnections,
  recordWebSocketMessage,
  recordDbQueryDuration,
  updateDbConnections,
  recordCacheOperation,
  recordAgentTrigger,
  recordEquipmentChange,
  createLogger,
  register,
};
