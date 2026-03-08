/**
 * POLLN Metrics Schema
 *
 * Defines all metrics collected by the POLLN monitoring system
 * Following OpenTelemetry semantic conventions where applicable
 */

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  UP_DOWN_COUNTER = 'up_down_counter',
}

/**
 * Metric unit standards
 */
export enum MetricUnit {
  NONE = '1',
  BYTES = 'By',
  KILOBYTES = 'kBBy',
  MEGABYTES = 'MBBy',
  SECONDS = 's',
  MILLISECONDS = 'ms',
  MICROSECONDS = 'us',
  NANOSECONDS = 'ns',
  PERCENT = '%',
  REQUESTS_PER_SECOND = 'req/s',
  OPERATIONS_PER_SECOND = 'ops/s',
  MESSAGES_PER_SECOND = 'msg/s',
  COUNT = 'count',
}

/**
 * Base metric interface
 */
export interface BaseMetric {
  name: string;
  description: string;
  type: MetricType;
  unit: MetricUnit;
  labels: string[];
}

/**
 * Counter metric - monotonically increasing
 */
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
}

/**
 * Gauge metric - can go up or down
 */
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
}

/**
 * Histogram metric - distribution of values
 */
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  buckets?: number[];
}

/**
 * Up-Down Counter - can increment or decrement
 */
export interface UpDownCounterMetric extends BaseMetric {
  type: MetricType.UP_DOWN_COUNTER;
}

/**
 * All POLLN metrics definitions
 */
export const PollnMetrics = {
  // ========================================
  // AGENT METRICS
  // ========================================

  /** Total number of agents in colony */
  agent_total: {
    name: 'polln_agent_total',
    description: 'Total number of agents in the colony',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type'],
  } as GaugeMetric,

  /** Number of active agents */
  agent_active: {
    name: 'polln_agent_active',
    description: 'Number of currently active agents',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type'],
  } as GaugeMetric,

  /** Agent spawn rate */
  agent_spawn_total: {
    name: 'polln_agent_spawn_total',
    description: 'Total number of agents spawned',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type'],
  } as CounterMetric,

  /** Agent termination rate */
  agent_terminate_total: {
    name: 'polln_agent_terminate_total',
    description: 'Total number of agents terminated',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type', 'reason'],
  } as CounterMetric,

  /** Agent execution duration */
  agent_execution_duration: {
    name: 'polln_agent_execution_duration',
    description: 'Time taken for agent execution',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id', 'agent_type', 'operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  } as HistogramMetric,

  /** Agent success rate */
  agent_success_total: {
    name: 'polln_agent_success_total',
    description: 'Total number of successful agent executions',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type'],
  } as CounterMetric,

  /** Agent failure rate */
  agent_failure_total: {
    name: 'polln_agent_failure_total',
    description: 'Total number of failed agent executions',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'agent_type', 'error_type'],
  } as CounterMetric,

  /** Agent value function */
  agent_value_function: {
    name: 'polln_agent_value_function',
    description: 'Current value function of agent',
    type: MetricType.GAUGE,
    unit: MetricUnit.NONE,
    labels: ['colony_id', 'agent_id', 'agent_type'],
  } as GaugeMetric,

  // ========================================
  // A2A COMMUNICATION METRICS
  // ========================================

  /** A2A packages sent */
  a2a_packages_sent_total: {
    name: 'polln_a2a_packages_sent_total',
    description: 'Total number of A2A packages sent',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'package_type', 'source_type', 'target_type'],
  } as CounterMetric,

  /** A2A packages received */
  a2a_packages_received_total: {
    name: 'polln_a2a_packages_received_total',
    description: 'Total number of A2A packages received',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'package_type'],
  } as CounterMetric,

  /** A2A package size */
  a2a_package_size: {
    name: 'polln_a2a_package_size',
    description: 'Size of A2A packages in bytes',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.BYTES,
    labels: ['colony_id', 'package_type'],
    buckets: [1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216],
  } as HistogramMetric,

  /** A2A package latency */
  a2a_package_latency: {
    name: 'polln_a2a_package_latency',
    description: 'Time from package creation to delivery',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id', 'package_type'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  } as HistogramMetric,

  /** A2A package processing duration */
  a2a_package_processing_duration: {
    name: 'polln_a2a_package_processing_duration',
    description: 'Time taken to process A2A package',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id', 'package_type', 'agent_type'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  } as HistogramMetric,

  // ========================================
  // KV-CACHE METRICS
  // ========================================

  /** KV-cache hit rate */
  kv_cache_hits_total: {
    name: 'polln_kv_cache_hits_total',
    description: 'Total number of KV-cache hits',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'cache_type', 'hit_type'],
  } as CounterMetric,

  /** KV-cache miss rate */
  kv_cache_misses_total: {
    name: 'polln_kv_cache_misses_total',
    description: 'Total number of KV-cache misses',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'cache_type'],
  } as CounterMetric,

  /** KV-cache anchor count */
  kv_anchors_total: {
    name: 'polln_kv_anchors_total',
    description: 'Total number of KV anchors in pool',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'anchor_type'],
  } as GaugeMetric,

  /** KV-cache size in bytes */
  kv_cache_size: {
    name: 'polln_kv_cache_size',
    description: 'Current KV-cache size in bytes',
    type: MetricType.GAUGE,
    unit: MetricUnit.BYTES,
    labels: ['colony_id', 'cache_type'],
  } as GaugeMetric,

  /** Anchor match duration */
  anchor_match_duration: {
    name: 'polln_anchor_match_duration',
    description: 'Time taken to find matching anchor',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id', 'match_algorithm'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100],
  } as HistogramMetric,

  /** Anchor match similarity */
  anchor_match_similarity: {
    name: 'polln_anchor_match_similarity',
    description: 'Similarity score of matched anchors',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.NONE,
    labels: ['colony_id'],
    buckets: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  } as HistogramMetric,

  // ========================================
  // FEDERATED LEARNING METRICS
  // ========================================

  /** Federated learning participants */
  federation_participants: {
    name: 'polln_federation_participants',
    description: 'Number of colonies participating in federation',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['federation_id'],
  } as GaugeMetric,

  /** Federated learning rounds */
  federation_rounds_total: {
    name: 'polln_federation_rounds_total',
    description: 'Total number of federated learning rounds',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['federation_id'],
  } as CounterMetric,

  /** Federated updates received */
  federation_updates_total: {
    name: 'polln_federation_updates_total',
    description: 'Total number of federated updates received',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['federation_id', 'colony_id', 'status'],
  } as CounterMetric,

  /** Federated round duration */
  federation_round_duration: {
    name: 'polln_federation_round_duration',
    description: 'Time taken for federated learning round',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.SECONDS,
    labels: ['federation_id'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800],
  } as HistogramMetric,

  /** Model convergence score */
  federation_convergence: {
    name: 'polln_federation_convergence',
    description: 'Model convergence score',
    type: MetricType.GAUGE,
    unit: MetricUnit.NONE,
    labels: ['federation_id'],
  } as GaugeMetric,

  // ========================================
  // DREAMING METRICS
  // ========================================

  /** Dream cycle duration */
  dream_cycle_duration: {
    name: 'polln_dream_cycle_duration',
    description: 'Time taken for dream cycle',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.SECONDS,
    labels: ['colony_id', 'dream_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  } as HistogramMetric,

  /** Dream episodes generated */
  dream_episodes_total: {
    name: 'polln_dream_episodes_total',
    description: 'Total number of dream episodes generated',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'dream_type'],
  } as CounterMetric,

  /** Policy improvement score */
  dream_improvement: {
    name: 'polln_dream_improvement',
    description: 'Policy improvement from dreaming',
    type: MetricType.GAUGE,
    unit: MetricUnit.PERCENT,
    labels: ['colony_id', 'improvement_type'],
  } as GaugeMetric,

  /** Tile dreaming optimization gain */
  tile_dream_gain: {
    name: 'polln_tile_dream_gain',
    description: 'Optimization gain from tile dreaming',
    type: MetricType.GAUGE,
    unit: MetricUnit.PERCENT,
    labels: ['colony_id', 'tile_type'],
  } as GaugeMetric,

  // ========================================
  // API METRICS
  // ========================================

  /** API request duration */
  api_request_duration: {
    name: 'polln_api_request_duration',
    description: 'API request processing duration',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['endpoint', 'method', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  } as HistogramMetric,

  /** API request rate */
  api_requests_total: {
    name: 'polln_api_requests_total',
    description: 'Total number of API requests',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['endpoint', 'method', 'status'],
  } as CounterMetric,

  /** WebSocket connections */
  websocket_connections: {
    name: 'polln_websocket_connections',
    description: 'Number of active WebSocket connections',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['colony_id'],
  } as GaugeMetric,

  /** WebSocket messages */
  websocket_messages_total: {
    name: 'polln_websocket_messages_total',
    description: 'Total number of WebSocket messages',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'message_type', 'direction'],
  } as CounterMetric,

  /** API error rate */
  api_errors_total: {
    name: 'polln_api_errors_total',
    description: 'Total number of API errors',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['endpoint', 'method', 'error_type'],
  } as CounterMetric,

  // ========================================
  // SYSTEM METRICS
  // ========================================

  /** Memory usage */
  system_memory_usage: {
    name: 'polln_system_memory_usage',
    description: 'Memory usage in bytes',
    type: MetricType.GAUGE,
    unit: MetricUnit.BYTES,
    labels: ['colony_id', 'memory_type'],
  } as GaugeMetric,

  /** CPU usage */
  system_cpu_usage: {
    name: 'polln_system_cpu_usage',
    description: 'CPU usage as percentage',
    type: MetricType.GAUGE,
    unit: MetricUnit.PERCENT,
    labels: ['colony_id'],
  } as GaugeMetric,

  /** GC duration */
  system_gc_duration: {
    name: 'polln_system_gc_duration',
    description: 'Garbage collection duration',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id', 'gc_type'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  } as HistogramMetric,

  /** Event loop delay */
  event_loop_delay: {
    name: 'polln_event_loop_delay',
    description: 'Event loop delay in milliseconds',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.MILLISECONDS,
    labels: ['colony_id'],
    buckets: [0, 1, 2, 5, 10, 25, 50, 100, 250, 500],
  } as HistogramMetric,

  // ========================================
  // SAFETY/GUARDIAN METRICS
  // ========================================

  /** Safety checks performed */
  safety_checks_total: {
    name: 'polln_safety_checks_total',
    description: 'Total number of safety checks performed',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'constraint_category', 'result'],
  } as CounterMetric,

  /** Guardian vetoes */
  guardian_vetoes_total: {
    name: 'polln_guardian_vetoes_total',
    description: 'Total number of guardian vetoes',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'constraint_id', 'severity'],
  } as CounterMetric,

  /** Guardian modifications */
  guardian_modifications_total: {
    name: 'polln_guardian_modifications_total',
    description: 'Total number of guardian modifications',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'constraint_id'],
  } as CounterMetric,

  // ========================================
  // LORA METRICS
  // ========================================

  /** LoRA experts loaded */
  lora_experts_loaded: {
    name: 'polln_lora_experts_loaded',
    description: 'Number of LoRA experts currently loaded',
    type: MetricType.GAUGE,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'expert_type'],
  } as GaugeMetric,

  /** LoRA swaps */
  lora_swaps_total: {
    name: 'polln_lora_swaps_total',
    description: 'Total number of LoRA swaps',
    type: MetricType.COUNTER,
    unit: MetricUnit.COUNT,
    labels: ['colony_id', 'from_expert', 'to_expert'],
  } as CounterMetric,

  /** LoRA composition size */
  lora_composition_size: {
    name: 'polln_lora_composition_size',
    description: 'Number of LoRAs in composition',
    type: MetricType.HISTOGRAM,
    unit: MetricUnit.COUNT,
    labels: ['colony_id'],
    buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  } as HistogramMetric,
} as const;

/**
 * Metric registry type
 */
export type MetricRegistry = typeof PollnMetrics;

/**
 * Get metric by name
 */
export function getMetric(name: keyof MetricRegistry): BaseMetric {
  return PollnMetrics[name];
}

/**
 * Get all metric names
 */
export function getAllMetricNames(): string[] {
  return Object.keys(PollnMetrics);
}

/**
 * Get metrics by type
 */
export function getMetricsByType(type: MetricType): BaseMetric[] {
  return Object.values(PollnMetrics).filter(m => m.type === type);
}
