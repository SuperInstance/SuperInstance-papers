/**
 * Metrics Collector
 *
 * Central metrics collection system using OpenTelemetry.
 * Provides high-level API for recording all POLLN metrics.
 */

import { MetricsRegistry, CounterWrapper, GaugeWrapper, HistogramWrapper } from './registry.js';
import { LabelBuilder } from './labels.js';
import { PollnMetrics } from './schema.js';
import type { Attributes } from '@opentelemetry/api';

/**
 * Collector configuration
 */
export interface MetricsCollectorConfig {
  // Colony identification
  colonyId: string;
  keeperId?: string;

  // Additional default labels
  defaultLabels?: Attributes;

  // Registry configuration
  registry?: {
    meterName?: string;
    meterVersion?: string;
  };
}

/**
 * High-level metrics API for POLLN
 */
export class MetricsCollector {
  private registry: MetricsRegistry;
  private config: MetricsCollectorConfig;
  private labelBuilder: LabelBuilder;

  constructor(registry: MetricsRegistry, config: MetricsCollectorConfig) {
    this.registry = registry;
    this.config = config;
    this.labelBuilder = new LabelBuilder();
  }

  // ========================================
  // AGENT METRICS
  // ========================================

  /**
   * Record agent spawn
   */
  recordAgentSpawn(agentType: string): void {
    const counter = this.registry.getCounter('agent_spawn_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_type', agentType)
        .build()
      );
    }
    this.updateAgentCount();
  }

  /**
   * Record agent termination
   */
  recordAgentTerminate(agentType: string, reason: string): void {
    const counter = this.registry.getCounter('agent_terminate_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_type', agentType)
        .with('reason', reason)
        .build()
      );
    }
    this.updateAgentCount();
  }

  /**
   * Record agent execution start
   */
  recordAgentExecutionStart(agentId: string, agentType: string, operation: string): () => void {
    const histogram = this.registry.getHistogram('agent_execution_duration');
    if (histogram) {
      const endTimer = histogram.startTimer();
      return () => {
        const duration = endTimer();
        this.recordAgentExecutionComplete(agentId, agentType, operation, duration);
      };
    }
    return () => {};
  }

  /**
   * Record agent execution complete
   */
  recordAgentExecutionComplete(agentId: string, agentType: string, operation: string, durationMs: number): void {
    const histogram = this.registry.getHistogram('agent_execution_duration');
    if (histogram) {
      histogram.record(durationMs, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_type', agentType)
        .with('operation', operation)
        .build()
      );
    }
  }

  /**
   * Record agent success
   */
  recordAgentSuccess(agentType: string): void {
    const counter = this.registry.getCounter('agent_success_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_type', agentType)
        .build()
      );
    }
  }

  /**
   * Record agent failure
   */
  recordAgentFailure(agentType: string, errorType: string): void {
    const counter = this.registry.getCounter('agent_failure_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_type', agentType)
        .with('error_type', errorType)
        .build()
      );
    }
  }

  /**
   * Record agent value function
   */
  recordAgentValue(agentId: string, agentType: string, value: number): void {
    const gauge = this.registry.getGauge('agent_value_function');
    if (gauge) {
      gauge.set(value, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('agent_id', agentId)
        .with('agent_type', agentType)
        .build()
      );
    }
  }

  /**
   * Update agent count gauges
   */
  private updateAgentCount(): void {
    // This would be called by the colony to update actual counts
    // Placeholder for now
  }

  // ========================================
  // A2A COMMUNICATION METRICS
  // ========================================

  /**
   * Record A2A package sent
   */
  recordA2ASent(packageType: string, sourceType: string, targetType: string, size: number): void {
    const counter = this.registry.getCounter('a2a_packages_sent_total');
    const histogram = this.registry.getHistogram('a2a_package_size');

    const labels = this.labelBuilder
      .withColony(this.config.colonyId)
      .with('package_type', packageType)
      .with('source_type', sourceType)
      .with('target_type', targetType)
      .build();

    if (counter) counter.increment(1, labels);
    if (histogram) histogram.record(size, labels);
  }

  /**
   * Record A2A package received
   */
  recordA2AReceived(packageType: string): void {
    const counter = this.registry.getCounter('a2a_packages_received_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('package_type', packageType)
        .build()
      );
    }
  }

  /**
   * Record A2A package latency
   */
  recordA2ALatency(packageType: string, latencyMs: number): void {
    const histogram = this.registry.getHistogram('a2a_package_latency');
    if (histogram) {
      histogram.record(latencyMs, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('package_type', packageType)
        .build()
      );
    }
  }

  /**
   * Record A2A processing start
   */
  recordA2AProcessingStart(packageType: string, agentType: string): () => void {
    const histogram = this.registry.getHistogram('a2a_package_processing_duration');
    return histogram?.startTimer() || (() => {});
  }

  // ========================================
  // KV-CACHE METRICS
  // ========================================

  /**
   * Record KV-cache hit
   */
  recordKVHit(cacheType: string, hitType: 'exact' | 'approximate'): void {
    const counter = this.registry.getCounter('kv_cache_hits_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('cache_type', cacheType)
        .with('hit_type', hitType)
        .build()
      );
    }
  }

  /**
   * Record KV-cache miss
   */
  recordKVMiss(cacheType: string): void {
    const counter = this.registry.getCounter('kv_cache_misses_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('cache_type', cacheType)
        .build()
      );
    }
  }

  /**
   * Record anchor count
   */
  recordAnchorCount(anchorType: string, count: number): void {
    const gauge = this.registry.getGauge('kv_anchors_total');
    if (gauge) {
      gauge.set(count, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('anchor_type', anchorType)
        .build()
      );
    }
  }

  /**
   * Record cache size
   */
  recordCacheSize(cacheType: string, sizeBytes: number): void {
    const gauge = this.registry.getGauge('kv_cache_size');
    if (gauge) {
      gauge.set(sizeBytes, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('cache_type', cacheType)
        .build()
      );
    }
  }

  /**
   * Record anchor match start
   */
  recordAnchorMatchStart(matchAlgorithm: string): () => void {
    const histogram = this.registry.getHistogram('anchor_match_duration');
    return histogram?.startTimer() || (() => {});
  }

  /**
   * Record anchor match similarity
   */
  recordAnchorMatchSimilarity(similarity: number): void {
    const histogram = this.registry.getHistogram('anchor_match_similarity');
    if (histogram) {
      histogram.record(similarity, this.labelBuilder
        .withColony(this.config.colonyId)
        .build()
      );
    }
  }

  // ========================================
  // FEDERATED LEARNING METRICS
  // ========================================

  /**
   * Record federation participants
   */
  recordFederationParticipants(federationId: string, count: number): void {
    const gauge = this.registry.getGauge('federation_participants');
    if (gauge) {
      gauge.set(count, this.labelBuilder
        .with('federation_id', federationId)
        .build()
      );
    }
  }

  /**
   * Record federated round
   */
  recordFederatedRound(federationId: string): void {
    const counter = this.registry.getCounter('federation_rounds_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .with('federation_id', federationId)
        .build()
      );
    }
  }

  /**
   * Record federated update
   */
  recordFederatedUpdate(federationId: string, colonyId: string, status: string): void {
    const counter = this.registry.getCounter('federation_updates_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .with('federation_id', federationId)
        .with('colony_id', colonyId)
        .with('status', status)
        .build()
      );
    }
  }

  /**
   * Record federated round start
   */
  recordFederatedRoundStart(federationId: string): () => void {
    const histogram = this.registry.getHistogram('federation_round_duration');
    return histogram?.startTimer() || (() => {});
  }

  /**
   * Record convergence score
   */
  recordConvergence(federationId: string, score: number): void {
    const gauge = this.registry.getGauge('federation_convergence');
    if (gauge) {
      gauge.set(score, this.labelBuilder
        .with('federation_id', federationId)
        .build()
      );
    }
  }

  // ========================================
  // DREAMING METRICS
  // ========================================

  /**
   * Record dream cycle start
   */
  recordDreamCycleStart(dreamType: string): () => void {
    const histogram = this.registry.getHistogram('dream_cycle_duration');
    return histogram?.startTimer() || (() => {});
  }

  /**
   * Record dream episode
   */
  recordDreamEpisode(dreamType: string): void {
    const counter = this.registry.getCounter('dream_episodes_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('dream_type', dreamType)
        .build()
      );
    }
  }

  /**
   * Record dream improvement
   */
  recordDreamImprovement(improvementType: string, improvementPercent: number): void {
    const gauge = this.registry.getGauge('dream_improvement');
    if (gauge) {
      gauge.set(improvementPercent, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('improvement_type', improvementType)
        .build()
      );
    }
  }

  /**
   * Record tile dream gain
   */
  recordTileDreamGain(tileType: string, gainPercent: number): void {
    const gauge = this.registry.getGauge('tile_dream_gain');
    if (gauge) {
      gauge.set(gainPercent, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('tile_type', tileType)
        .build()
      );
    }
  }

  // ========================================
  // API METRICS
  // ========================================

  /**
   * Record API request start
   */
  recordAPIRequestStart(endpoint: string, method: string): () => void {
    const histogram = this.registry.getHistogram('api_request_duration');
    return histogram?.startTimer() || (() => {});
  }

  /**
   * Record API request complete
   */
  recordAPIRequestComplete(endpoint: string, method: string, status: number, durationMs: number): void {
    const counter = this.registry.getCounter('api_requests_total');
    const histogram = this.registry.getHistogram('api_request_duration');

    const labels = this.labelBuilder
      .with('endpoint', endpoint)
      .with('method', method)
      .with('status', status.toString())
      .build();

    if (counter) counter.increment(1, labels);
    if (histogram) histogram.record(durationMs, labels);

    if (status >= 400) {
      this.recordAPIError(endpoint, method, 'http_error');
    }
  }

  /**
   * Record WebSocket connection
   */
  recordWebSocketConnection(delta: number): void {
    const gauge = this.registry.getGauge('websocket_connections');
    if (gauge) {
      gauge.increment(delta, this.labelBuilder
        .withColony(this.config.colonyId)
        .build()
      );
    }
  }

  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(messageType: string, direction: 'in' | 'out'): void {
    const counter = this.registry.getCounter('websocket_messages_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('message_type', messageType)
        .with('direction', direction)
        .build()
      );
    }
  }

  /**
   * Record API error
   */
  recordAPIError(endpoint: string, method: string, errorType: string): void {
    const counter = this.registry.getCounter('api_errors_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .with('endpoint', endpoint)
        .with('method', method)
        .with('error_type', errorType)
        .build()
      );
    }
  }

  // ========================================
  // SYSTEM METRICS
  // ========================================

  /**
   * Record memory usage
   */
  recordMemoryUsage(memoryType: string, bytes: number): void {
    const gauge = this.registry.getGauge('system_memory_usage');
    if (gauge) {
      gauge.set(bytes, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('memory_type', memoryType)
        .build()
      );
    }
  }

  /**
   * Record CPU usage
   */
  recordCPUUsage(percent: number): void {
    const gauge = this.registry.getGauge('system_cpu_usage');
    if (gauge) {
      gauge.set(percent, this.labelBuilder
        .withColony(this.config.colonyId)
        .build()
      );
    }
  }

  /**
   * Record GC duration
   */
  recordGCDuration(gcType: string, durationMs: number): void {
    const histogram = this.registry.getHistogram('system_gc_duration');
    if (histogram) {
      histogram.record(durationMs, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('gc_type', gcType)
        .build()
      );
    }
  }

  /**
   * Record event loop delay
   */
  recordEventLoopDelay(delayMs: number): void {
    const histogram = this.registry.getHistogram('event_loop_delay');
    if (histogram) {
      histogram.record(delayMs, this.labelBuilder
        .withColony(this.config.colonyId)
        .build()
      );
    }
  }

  // ========================================
  // SAFETY/GUARDIAN METRICS
  // ========================================

  /**
   * Record safety check
   */
  recordSafetyCheck(constraintCategory: string, result: string): void {
    const counter = this.registry.getCounter('safety_checks_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('constraint_category', constraintCategory)
        .with('result', result)
        .build()
      );
    }
  }

  /**
   * Record guardian veto
   */
  recordGuardianVeto(constraintId: string, severity: string): void {
    const counter = this.registry.getCounter('guardian_vetoes_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('constraint_id', constraintId)
        .with('severity', severity)
        .build()
      );
    }
  }

  /**
   * Record guardian modification
   */
  recordGuardianModification(constraintId: string): void {
    const counter = this.registry.getCounter('guardian_modifications_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('constraint_id', constraintId)
        .build()
      );
    }
  }

  // ========================================
  // LORA METRICS
  // ========================================

  /**
   * Record LoRA experts loaded
   */
  recordLoRAExpertsLoaded(expertType: string, count: number): void {
    const gauge = this.registry.getGauge('lora_experts_loaded');
    if (gauge) {
      gauge.set(count, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('expert_type', expertType)
        .build()
      );
    }
  }

  /**
   * Record LoRA swap
   */
  recordLoRASwap(fromExpert: string, toExpert: string): void {
    const counter = this.registry.getCounter('lora_swaps_total');
    if (counter) {
      counter.increment(1, this.labelBuilder
        .withColony(this.config.colonyId)
        .with('from_expert', fromExpert)
        .with('to_expert', toExpert)
        .build()
      );
    }
  }

  /**
   * Record LoRA composition size
   */
  recordLoRACompositionSize(size: number): void {
    const histogram = this.registry.getHistogram('lora_composition_size');
    if (histogram) {
      histogram.record(size, this.labelBuilder
        .withColony(this.config.colonyId)
        .build()
      );
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get underlying registry
   */
  getRegistry(): MetricsRegistry {
    return this.registry;
  }

  /**
   * Get config
   */
  getConfig(): MetricsCollectorConfig {
    return this.config;
  }
}
