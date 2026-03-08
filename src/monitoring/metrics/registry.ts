/**
 * Metrics Registry
 *
 * Central registry for all metrics in POLLN.
 * Uses OpenTelemetry metrics API.
 */

import { MeterProvider, Meter, Attributes, Counter, Gauge, Histogram, UpDownCounter } from '@opentelemetry/api';
import { getMetrics } from './schema.js';

/**
 * Metric configuration
 */
export interface MetricConfig {
  // Meter configuration
  meterName?: string;
  meterVersion?: string;

  // Exporter configuration
  prometheus?: {
    enabled: boolean;
    port?: number;
    endpoint?: string;
  };
  stdout?: {
    enabled: boolean;
    verbose?: boolean;
  };
}

/**
 * Metric wrapper for Counter
 */
export class CounterWrapper {
  constructor(
    private counter: Counter,
    private metricName: string
  ) {}

  /**
   * Increment counter
   */
  increment(value: number = 1, attributes?: Attributes): void {
    this.counter.add(value, attributes);
  }

  /**
   * Get counter
   */
  getCounter(): Counter {
    return this.counter;
  }
}

/**
 * Metric wrapper for Gauge (using UpDownCounter)
 */
export class GaugeWrapper {
  constructor(
    private gauge: UpDownCounter,
    private metricName: string
  ) {}

  /**
   * Set gauge value
   */
  set(value: number, attributes?: Attributes): void {
    // OpenTelemetry doesn't have "set" for gauges, we record the value
    // The delta approach is used here
    this.gauge.add(value, attributes);
  }

  /**
   * Increment gauge
   */
  increment(value: number = 1, attributes?: Attributes): void {
    this.gauge.add(value, attributes);
  }

  /**
   * Decrement gauge
   */
  decrement(value: number = 1, attributes?: Attributes): void {
    this.gauge.add(-value, attributes);
  }

  /**
   * Get gauge
   */
  getGauge(): UpDownCounter {
    return this.gauge;
  }
}

/**
 * Metric wrapper for Histogram
 */
export class HistogramWrapper {
  constructor(
    private histogram: Histogram,
    private metricName: string
  ) {}

  /**
   * Record value
   */
  record(value: number, attributes?: Attributes): void {
    this.histogram.record(value, attributes);
  }

  /**
   * Start a timer
   */
  startTimer(): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.record(duration);
    };
  }

  /**
   * Get histogram
   */
  getHistogram(): Histogram {
    return this.histogram;
  }
}

/**
 * Metrics Registry class
 */
export class MetricsRegistry {
  private meter: Meter;
  private counters: Map<string, CounterWrapper> = new Map();
  private gauges: Map<string, GaugeWrapper> = new Map();
  private histograms: Map<string, HistogramWrapper> = new Map();

  constructor(
    meterProvider: MeterProvider,
    config: MetricConfig = {}
  ) {
    this.meter = meterProvider.getMeter(
      config.meterName || 'polln',
      config.meterVersion || '1.0.0'
    );

    this.initializeMetrics();
  }

  /**
   * Initialize all metrics from schema
   */
  private initializeMetrics(): void {
    const metrics = getMetrics();

    for (const [name, metric] of Object.entries(metrics)) {
      this.createMetric(name, metric);
    }
  }

  /**
   * Create a single metric
   */
  private createMetric(name: string, metric: any): void {
    const metricDef = getMetric(name);

    switch (metricDef.type) {
      case 'counter':
        this.createCounter(name, metricDef);
        break;
      case 'gauge':
        this.createGauge(name, metricDef);
        break;
      case 'histogram':
        this.createHistogram(name, metricDef);
        break;
      case 'up_down_counter':
        this.createUpDownCounter(name, metricDef);
        break;
    }
  }

  /**
   * Create counter metric
   */
  private createCounter(name: string, metric: any): void {
    try {
      const counter = this.meter.createCounter(
        metric.name,
        {
          description: metric.description,
          unit: metric.unit,
        }
      );
      this.counters.set(name, new CounterWrapper(counter, name));
    } catch (error) {
      // Metric might already exist
      console.warn(`Failed to create counter ${name}:`, error);
    }
  }

  /**
   * Create gauge metric
   */
  private createGauge(name: string, metric: any): void {
    try {
      const gauge = this.meter.createUpDownCounter(
        metric.name,
        {
          description: metric.description,
          unit: metric.unit,
        }
      );
      this.gauges.set(name, new GaugeWrapper(gauge, name));
    } catch (error) {
      console.warn(`Failed to create gauge ${name}:`, error);
    }
  }

  /**
   * Create histogram metric
   */
  private createHistogram(name: string, metric: any): void {
    try {
      const histogram = this.meter.createHistogram(
        metric.name,
        {
          description: metric.description,
          unit: metric.unit,
          advice: {
            explicitBucketBoundaries: metric.buckets,
          },
        }
      );
      this.histograms.set(name, new HistogramWrapper(histogram, name));
    } catch (error) {
      console.warn(`Failed to create histogram ${name}:`, error);
    }
  }

  /**
   * Create up-down counter metric
   */
  private createUpDownCounter(name: string, metric: any): void {
    try {
      const upDownCounter = this.meter.createUpDownCounter(
        metric.name,
        {
          description: metric.description,
          unit: metric.unit,
        }
      );
      this.gauges.set(name, new GaugeWrapper(upDownCounter, name));
    } catch (error) {
      console.warn(`Failed to create up-down counter ${name}:`, error);
    }
  }

  /**
   * Get counter by name
   */
  getCounter(name: string): CounterWrapper | undefined {
    return this.counters.get(name);
  }

  /**
   * Get gauge by name
   */
  getGauge(name: string): GaugeWrapper | undefined {
    return this.gauges.get(name);
  }

  /**
   * Get histogram by name
   */
  getHistogram(name: string): HistogramWrapper | undefined {
    return this.histograms.get(name);
  }

  /**
   * Get all registered metric names
   */
  getMetricNames(): string[] {
    return [
      ...Array.from(this.counters.keys()),
      ...Array.from(this.gauges.keys()),
      ...Array.from(this.histograms.keys()),
    ];
  }

  /**
   * Get metrics count by type
   */
  getMetricsCount(): { counters: number; gauges: number; histograms: number } {
    return {
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
    };
  }

  /**
   * Get meter instance
   */
  getMeter(): Meter {
    return this.meter;
  }

  /**
   * Force flush metrics
   */
  async forceFlush(): Promise<void> {
    // The meter provider handles this
    // This is a placeholder for any cleanup needed
  }

  /**
   * Shutdown registry
   */
  async shutdown(): Promise<void> {
    await this.forceFlush();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Helper to get metric definition
 */
function getMetric(name: string): any {
  // Import dynamically to avoid circular dependencies
  // This is a placeholder - actual implementation would use the schema
  return {} as any;
}

/**
 * Get all metrics from schema
 */
function getMetrics(): Record<string, any> {
  // This is a placeholder - actual implementation would use the schema
  return {};
}
