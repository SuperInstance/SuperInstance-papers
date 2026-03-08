/**
 * Metrics Exporters
 *
 * Exporters for various metrics backends:
 * - Prometheus
 * - StatsD
 * - OpenTelemetry Collector
 */

import { MeterProvider, Meter, ConsoleMeterProvider } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { StdoutMetricsExporter } from '@opentelemetry/exporter-metrics-stdout';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { MetricsRegistry } from './registry.js';

/**
 * Prometheus exporter configuration
 */
export interface PrometheusExporterConfig {
  port: number;
  endpoint: string;
  appendMetadata?: boolean;
}

/**
 * StatsD exporter configuration
 */
export interface StatsDExporterConfig {
  host: string;
  port: number;
  prefix?: string;
}

/**
 * Console exporter configuration
 */
export interface ConsoleExporterConfig {
  verbose?: boolean;
}

/**
 * Create a Prometheus exporter
 */
export async function createPrometheusExporter(
  config: PrometheusExporterConfig = { port: 9464, endpoint: '/metrics' }
): Promise<PrometheusExporter> {
  const exporter = new PrometheusExporter({
    port: config.port,
    endpoint: config.endpoint,
    appendMetadata: config.appendMetadata ?? true,
  });

  await exporter.start();

  return exporter;
}

/**
 * Create a Prometheus meter provider
 */
export async function createPrometheusMeterProvider(
  config: PrometheusExporterConfig = { port: 9464, endpoint: '/metrics' }
): Promise<MeterProvider> {
  const exporter = await createPrometheusExporter(config);

  const meterProvider = new (await import('@opentelemetry/sdk-metrics')).MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: exporter as any,
        exportIntervalMillis: 10000,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  return meterProvider as MeterProvider;
}

/**
 * Create a console (stdout) exporter
 */
export function createConsoleExporter(
  config: ConsoleExporterConfig = {}
): StdoutMetricsExporter {
  return new StdoutMetricsExporter(config);
}

/**
 * Create a console meter provider
 */
export function createConsoleMeterProvider(
  config: ConsoleExporterConfig = {}
): MeterProvider {
  const exporter = createConsoleExporter(config);

  const meterProvider = new (await import('@opentelemetry/sdk-metrics')).MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: exporter as any,
        exportIntervalMillis: 10000,
      }),
    ],
  });

  return meterProvider as MeterProvider;
}

/**
 * Create a StatsD exporter
 *
 * Note: This requires the @opentelemetry/exporter-statsd package
 */
export async function createStatsDExporter(
  config: StatsDExporterConfig
): Promise<any> {
  // Dynamic import to make it optional
  try {
    const { StatsDExporter } = await import('@opentelemetry/exporter-statsd');

    const exporter = new StatsDExporter({
      host: config.host,
      port: config.port,
      prefix: config.prefix || 'polln',
    });

    return exporter;
  } catch (error) {
    console.warn('StatsD exporter not available. Install @opentelemetry/exporter-statsd.');
    throw error;
  }
}

/**
 * Create a meter provider with StatsD exporter
 */
export async function createStatsDMeterProvider(
  config: StatsDExporterConfig
): Promise<MeterProvider> {
  const exporter = await createStatsDExporter(config);

  const meterProvider = new (await import('@opentelemetry/sdk-metrics')).MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: exporter,
        exportIntervalMillis: 10000,
      }),
    ],
  });

  return meterProvider as MeterProvider;
}

/**
 * Create a composite meter provider with multiple exporters
 */
export async function createMultiExporterMeterProvider(config: {
  prometheus?: PrometheusExporterConfig;
  console?: ConsoleExporterConfig;
  statsd?: StatsDExporterConfig;
}): Promise<MeterProvider> {
  const readers: any[] = [];

  // Add Prometheus exporter
  if (config.prometheus) {
    const prometheusExporter = await createPrometheusExporter(config.prometheus);
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: prometheusExporter as any,
        exportIntervalMillis: 10000,
        exportTimeoutMillis: 30000,
      })
    );
  }

  // Add console exporter
  if (config.console) {
    const consoleExporter = createConsoleExporter(config.console);
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: consoleExporter as any,
        exportIntervalMillis: 10000,
      })
    );
  }

  // Add StatsD exporter
  if (config.statsd) {
    try {
      const statsdExporter = await createStatsDExporter(config.statsd);
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: statsdExporter,
          exportIntervalMillis: 10000,
        })
      );
    } catch (error) {
      console.warn('Failed to create StatsD exporter:', error);
    }
  }

  if (readers.length === 0) {
    // Default to console if no exporters specified
    const consoleExporter = createConsoleExporter({});
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: consoleExporter as any,
        exportIntervalMillis: 10000,
      })
    );
  }

  const meterProvider = new (await import('@opentelemetry/sdk-metrics')).MeterProvider({
    readers,
  });

  return meterProvider as MeterProvider;
}

/**
 * Create a metrics registry with Prometheus exporter
 */
export async function createPrometheusMetricsRegistry(
  config: PrometheusExporterConfig & {
    meterName?: string;
    meterVersion?: string;
  } = {}
): Promise<MetricsRegistry> {
  const meterProvider = await createPrometheusMeterProvider(config);

  const { MetricsRegistry: MR } = await import('./registry.js');
  return new MR(meterProvider, {
    meterName: config.meterName,
    meterVersion: config.meterVersion,
  });
}

/**
 * Create a metrics registry with console exporter
 */
export async function createConsoleMetricsRegistry(
  config: ConsoleExporterConfig & {
    meterName?: string;
    meterVersion?: string;
  } = {}
): Promise<MetricsRegistry> {
  const meterProvider = createConsoleMeterProvider(config);

  const { MetricsRegistry: MR } = await import('./registry.js');
  return new MR(meterProvider, {
    meterName: config.meterName,
    meterVersion: config.meterVersion,
  });
}

/**
 * Create a metrics registry with multiple exporters
 */
export async function createMultiExporterMetricsRegistry(
  config: {
    prometheus?: PrometheusExporterConfig;
    console?: ConsoleExporterConfig;
    statsd?: StatsDExporterConfig;
    meterName?: string;
    meterVersion?: string;
  } = {}
): Promise<MetricsRegistry> {
  const meterProvider = await createMultiExporterMeterProvider(config);

  const { MetricsRegistry: MR } = await import('./registry.js');
  return new MR(meterProvider, {
    meterName: config.meterName,
    meterVersion: config.meterVersion,
  });
}
