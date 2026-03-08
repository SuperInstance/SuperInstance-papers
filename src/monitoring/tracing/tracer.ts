/**
 * Distributed Tracing
 *
 * OpenTelemetry distributed tracing implementation for POLLN.
 * Provides end-to-end tracing across agents, colonies, and services.
 */

import {
  trace,
  context,
  propagation,
  Attributes,
  Span,
  SpanStatusCode,
  SpanKind,
  Tracer,
  Context,
} from '@opentelemetry/api';
import {
  NodeTracerProvider,
  NodeTracerConfig,
} from '@opentelemetry/sdk-trace-node';
import {
  Resource,
  ResourceAttributes,
} from '@opentelemetry/resources';
import {
  SemanticResourceAttributes,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-trace-zipkin';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ConsoleSpanExporter } from '@opentelemetry/exporter-trace-stdout';

/**
 * Tracer configuration
 */
export interface TracerConfig {
  // Service identification
  serviceName: string;
  serviceVersion?: string;
  serviceNamespace?: string;

  // Colony identification
  colonyId?: string;
  keeperId?: string;

  // Exporter configuration
  exporters: {
    jaeger?: {
      host: string;
      port: number;
      tags?: Record<string, string>;
    };
    zipkin?: {
      url: string;
    };
    otlp?: {
      url: string;
      headers?: Record<string, string>;
    };
    console?: {
      enabled: boolean;
    };
  };

  // Sampling configuration
  sampling?: {
    type: 'always' | 'never' | 'traceidratio' | 'parentbased';
    ratio?: number;
  };

  // Additional resource attributes
  resourceAttributes?: ResourceAttributes;

  // Batch processor configuration
  batchTimeoutMillis?: number;
  maxQueueSize?: number;
  maxExportBatchSize?: number;
}

/**
 * Default tracer configuration
 */
export const DEFAULT_TRACER_CONFIG: Partial<TracerConfig> = {
  exporters: {
    console: {
      enabled: true,
    },
  },
  sampling: {
    type: 'always',
  },
  batchTimeoutMillis: 30000,
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
};

/**
 * POLLN Tracer class
 */
export class PollnTracer {
  private tracer: Tracer;
  private config: TracerConfig;
  private provider: NodeTracerProvider;

  constructor(config: TracerConfig) {
    this.config = { ...DEFAULT_TRACER_CONFIG, ...config };
    this.provider = this.createTracerProvider();
    this.tracer = trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion
    );
  }

  /**
   * Create tracer provider
   */
  private createTracerProvider(): NodeTracerProvider {
    // Create resource with service info
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion || '1.0.0',
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: this.config.serviceNamespace || 'polln',
        ...(this.config.colonyId && {
          'polln.colony.id': this.config.colonyId,
        }),
        ...(this.config.keeperId && {
          'polln.keeper.id': this.config.keeperId,
        }),
        ...this.config.resourceAttributes,
      })
    );

    // Create tracer provider
    const provider = new NodeTracerProvider({
      resource,
    });

    // Add exporters
    this.addExporters(provider);

    // Register provider
    provider.register();

    return provider;
  }

  /**
   * Add exporters to provider
   */
  private addExporters(provider: NodeTracerProvider): void {
    const { exporters, batchTimeoutMillis, maxQueueSize, maxExportBatchSize } = this.config;

    // Jaeger exporter
    if (exporters.jaeger) {
      const jaegerExporter = new JaegerExporter({
        host: exporters.jaeger.host,
        port: exporters.jaeger.port,
        tags: exporters.jaeger.tags,
      });

      provider.addSpanProcessor(
        new BatchSpanProcessor(jaegerExporter, {
          maxQueueSize: maxQueueSize || 2048,
          scheduledDelayMillis: batchTimeoutMillis || 30000,
          maxExportBatchSize: maxExportBatchSize || 512,
        })
      );
    }

    // Zipkin exporter
    if (exporters.zipkin) {
      const zipkinExporter = new ZipkinExporter({
        url: exporters.zipkin.url,
      });

      provider.addSpanProcessor(
        new BatchSpanProcessor(zipkinExporter, {
          maxQueueSize: maxQueueSize || 2048,
          scheduledDelayMillis: batchTimeoutMillis || 30000,
          maxExportBatchSize: maxExportBatchSize || 512,
        })
      );
    }

    // OTLP exporter
    if (exporters.otlp) {
      const otlpExporter = new OTLPTraceExporter({
        url: exporters.otlp.url,
        headers: exporters.otlp.headers,
      });

      provider.addSpanProcessor(
        new BatchSpanProcessor(otlpExporter, {
          maxQueueSize: maxQueueSize || 2048,
          scheduledDelayMillis: batchTimeoutMillis || 30000,
          maxExportBatchSize: maxExportBatchSize || 512,
        })
      );
    }

    // Console exporter
    if (exporters.console?.enabled) {
      const consoleExporter = new ConsoleSpanExporter();

      provider.addSpanProcessor(
        new BatchSpanProcessor(consoleExporter, {
          maxQueueSize: maxQueueSize || 2048,
          scheduledDelayMillis: batchTimeoutMillis || 30000,
          maxExportBatchSize: maxExportBatchSize || 512,
        })
      );
    }
  }

  /**
   * Start a span
   */
  startSpan(name: string, options?: {
    kind?: SpanKind;
    attributes?: Attributes;
    links?: any[];
    startTime?: number;
  }): Span {
    return this.tracer.startSpan(name, {
      kind: options?.kind,
      attributes: {
        ...this.getDefaultAttributes(),
        ...options?.attributes,
      },
      links: options?.links,
      startTime: options?.startTime,
    });
  }

  /**
   * Start a span with a callback
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options?: {
      kind?: SpanKind;
      attributes?: Attributes;
      links?: any[];
      startTime?: number;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get default span attributes
   */
  private getDefaultAttributes(): Attributes {
    const attrs: Attributes = {};

    if (this.config.colonyId) {
      attrs['polln.colony.id'] = this.config.colonyId;
    }

    if (this.config.keeperId) {
      attrs['polln.keeper.id'] = this.config.keeperId;
    }

    return attrs;
  }

  /**
   * Inject context into carrier
   */
  injectContext(carrier: Record<string, string>): void {
    propagation.inject(context.active(), carrier);
  }

  /**
   * Extract context from carrier
   */
  extractContext(carrier: Record<string, string>): Context {
    return propagation.extract(context.active(), carrier);
  }

  /**
   * Get the underlying tracer
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Shutdown tracer provider
   */
  async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }

  /**
   * Force flush spans
   */
  async forceFlush(): Promise<void> {
    await this.provider.forceFlush();
  }
}

/**
 * Predefined span names for POLLN operations
 */
export const SpanNames = {
  // Agent operations
  AGENT_SPAWN: 'polln.agent.spawn',
  AGENT_EXECUTE: 'polln.agent.execute',
  AGENT_TERMINATE: 'polln.agent.terminate',

  // Communication operations
  A2A_SEND: 'polln.a2a.send',
  A2A_RECEIVE: 'polln.a2a.receive',
  A2A_PROCESS: 'polln.a2a.process',

  // Learning operations
  HEBBIAN_UPDATE: 'polln.learning.hebbian_update',
  VALUE_UPDATE: 'polln.learning.value_update',
  DREAM_CYCLE: 'polln.learning.dream_cycle',

  // Cache operations
  CACHE_LOOKUP: 'polln.cache.lookup',
  CACHE_STORE: 'polln.cache.store',
  ANCHOR_MATCH: 'polln.cache.anchor_match',

  // Federation operations
  FEDERATION_SYNC: 'polln.federation.sync',
  FEDERATION_AGGREGATE: 'polln.federation.aggregate',

  // API operations
  API_REQUEST: 'polln.api.request',
  WEBSOCKET_CONNECT: 'polln.api.websocket_connect',
  WEBSOCKET_MESSAGE: 'polln.api.websocket_message',

  // Safety operations
  SAFETY_CHECK: 'polln.safety.check',
  GUARDIAN_EVALUATE: 'polln.guardian.evaluate',

  // Dream operations
  DREAM_GENERATE: 'polln.dream.generate',
  DREAM_OPTIMIZE: 'polln.dream.optimize',
  TILE_DREAM: 'polln.dream.tile',

  // System operations
  SYSTEM_GC: 'polln.system.gc',
} as const;

/**
 * Predefined span attributes
 */
export const SpanAttributes = {
  // Agent attributes
  AGENT_ID: 'polln.agent.id',
  AGENT_TYPE: 'polln.agent.type',
  AGENT_OPERATION: 'polln.agent.operation',

  // Communication attributes
  PACKAGE_TYPE: 'polln.a2a.package_type',
  SOURCE_ID: 'polln.a2a.source_id',
  TARGET_ID: 'polln.a2a.target_id',

  // Cache attributes
  CACHE_TYPE: 'polln.cache.type',
  ANCHOR_ID: 'polln.cache.anchor_id',
  HIT_TYPE: 'polln.cache.hit_type',

  // Federation attributes
  FEDERATION_ID: 'polln.federation.id',
  COLONY_COUNT: 'polln.federation.colony_count',
  ROUND_NUMBER: 'polln.federation.round_number',

  // Error attributes
  ERROR_TYPE: 'polln.error.type',
  ERROR_MESSAGE: 'polln.error.message',
} as const;

/**
 * Create a tracer with default configuration
 */
export async function createTracer(config: TracerConfig): Promise<PollnTracer> {
  return new PollnTracer(config);
}

/**
 * Create a tracer with console exporter only
 */
export async function createConsoleTracer(serviceName: string, colonyId?: string): Promise<PollnTracer> {
  return new PollnTracer({
    serviceName,
    colonyId,
    exporters: {
      console: { enabled: true },
    },
  });
}

/**
 * Create a tracer with Jaeger exporter
 */
export async function createJaegerTracer(
  serviceName: string,
  jaegerConfig: { host: string; port: number },
  colonyId?: string
): Promise<PollnTracer> {
  return new PollnTracer({
    serviceName,
    colonyId,
    exporters: {
      jaeger: jaegerConfig,
    },
  });
}
