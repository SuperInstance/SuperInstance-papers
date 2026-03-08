/**
 * Structured Logging System
 *
 * Production-ready structured logging using pino.
 * Provides consistent log format across all POLLN components.
 */

import pino from 'pino';

/**
 * Log levels
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Standard log context fields
 */
export interface LogContext {
  // Core identification
  colonyId?: string;
  keeperId?: string;
  agentId?: string;
  agentType?: string;

  // Operation context
  operation?: string;
  operationId?: string;

  // Request context
  requestId?: string;
  traceId?: string;
  spanId?: string;

  // Error context
  errorType?: string;
  errorCode?: string;

  // Module context
  module: string;

  // Additional context
  [key: string]: any;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  // Log level
  level?: LogLevel;

  // Output destination
  destination?: {
    type: 'stdout' | 'file' | 'stream';
    path?: string;
    stream?: NodeJS.WritableStream;
  };

  // Formatting options
  prettyPrint?: boolean;
  colorize?: boolean;
  timestamp?: boolean;
  messageKey?: string;

  // Redaction options
  redact?: {
    paths: string[];
    remove?: boolean;
    replace?: string;
  };

  // Child logger options
  serializers?: {
    err?: pino.SerializerFn;
    error?: pino.SerializerFn;
  };

  // Base context applied to all logs
  baseContext?: Partial<LogContext>;
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  destination: {
    type: 'stdout',
  },
  prettyPrint: process.env.NODE_ENV !== 'production',
  colorize: false,
  timestamp: true,
  messageKey: 'msg',
};

/**
 * POLLN Logger class
 */
export class PollnLogger {
  private logger: pino.Logger;
  private config: LoggerConfig;
  private baseContext: LogContext;

  constructor(module: string, config: LoggerConfig = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.baseContext = {
      module,
      ...this.config.baseContext,
    };

    this.logger = this.createLogger();
  }

  /**
   * Create pino logger
   */
  private createLogger(): pino.Logger {
    const opts: pino.LoggerOptions = {
      level: this.config.level || LogLevel.INFO,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: this.config.timestamp
        ? pino.stdTimeFunctions.isoTime
        : false,
      messageKey: this.config.messageKey,
      base: {
        ...this.baseContext,
      },
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        ...this.config.serializers,
      },
      redact: this.config.redact,
    };

    // Determine destination
    let destination: NodeJS.WritableStream;

    if (this.config.destination?.type === 'file' && this.config.destination.path) {
      destination = pino.destination(this.config.destination.path);
    } else if (this.config.destination?.type === 'stream' && this.config.destination.stream) {
      destination = this.config.destination.stream;
    } else {
      destination = pino.destination(1);
    }

    // Apply pretty print if enabled
    if (this.config.prettyPrint) {
      return pino(
        {
          ...opts,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: this.config.colorize,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        },
        destination
      );
    }

    return pino(opts, destination);
  }

  /**
   * Update base context
   */
  updateBaseContext(context: Partial<LogContext>): void {
    Object.assign(this.baseContext, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): PollnLogger {
    const childModule = `${this.baseContext.module}:${context.module || 'child'}`;
    const childConfig = {
      ...this.config,
      baseContext: {
        ...this.baseContext,
        ...context,
      },
    };
    return new PollnLogger(childModule, childConfig);
  }

  /**
   * Log at trace level
   */
  trace(message: string, context?: Partial<LogContext>): void {
    this.logger.trace({ ...context }, message);
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: Partial<LogContext>): void {
    this.logger.debug({ ...context }, message);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: Partial<LogContext>): void {
    this.logger.info({ ...context }, message);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: Partial<LogContext>): void {
    this.logger.warn({ ...context }, message);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    if (error instanceof Error) {
      this.logger.error({ err: error, ...context }, message);
    } else {
      this.logger.error({ error, ...context }, message);
    }
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    if (error instanceof Error) {
      this.logger.fatal({ err: error, ...context }, message);
    } else {
      this.logger.fatal({ error, ...context }, message);
    }
  }

  /**
   * Log a lifecycle event
   */
  lifecycle(event: string, details?: any): void {
    this.info(`Lifecycle: ${event}`, { event, ...details });
  }

  /**
   * Log a metric event
   */
  metric(name: string, value: number, unit?: string): void {
    this.debug(`Metric: ${name}`, {
      metric: name,
      value,
      unit,
    });
  }

  /**
   * Log an A2A package event
   */
  a2a(
    action: 'sent' | 'received' | 'processed',
    packageType: string,
    details?: any
  ): void {
    this.info(`A2A ${action}`, {
      action: `a2a_${action}`,
      packageType,
      ...details,
    });
  }

  /**
   * Log an agent event
   */
  agent(
    action: 'spawn' | 'execute' | 'terminate' | 'success' | 'failure',
    agentId: string,
    agentType?: string,
    details?: any
  ): void {
    this.info(`Agent ${action}`, {
      action: `agent_${action}`,
      agentId,
      agentType,
      ...details,
    });
  }

  /**
   * Log a cache event
   */
  cache(
    action: 'hit' | 'miss' | 'store' | 'evict',
    cacheType: string,
    details?: any
  ): void {
    this.debug(`Cache ${action}`, {
      action: `cache_${action}`,
      cacheType,
      ...details,
    });
  }

  /**
   * Log a federation event
   */
  federation(
    action: 'sync' | 'update' | 'round_complete' | 'convergence',
    federationId: string,
    details?: any
  ): void {
    this.info(`Federation ${action}`, {
      action: `federation_${action}`,
      federationId,
      ...details,
    });
  }

  /**
   * Log a dreaming event
   */
  dreaming(
    action: 'cycle_start' | 'cycle_complete' | 'episode' | 'improvement',
    dreamType: string,
    details?: any
  ): void {
    this.info(`Dreaming ${action}`, {
      action: `dreaming_${action}`,
      dreamType,
      ...details,
    });
  }

  /**
   * Log an API event
   */
  api(
    action: 'request' | 'response' | 'error',
    method: string,
    endpoint: string,
    statusCode?: number,
    details?: any
  ): void {
    this.info(`API ${action}`, {
      action: `api_${action}`,
      method,
      endpoint,
      statusCode,
      ...details,
    });
  }

  /**
   * Log a safety/guardian event
   */
  safety(
    action: 'check' | 'violation' | 'veto' | 'modification',
    constraintId?: string,
    details?: any
  ): void {
    this.warn(`Safety ${action}`, {
      action: `safety_${action}`,
      constraintId,
      ...details,
    });
  }

  /**
   * Get the underlying pino logger
   */
  getPinoLogger(): pino.Logger {
    return this.logger;
  }

  /**
   * Flush any buffered logs
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(resolve);
    });
  }

  /**
   * Close the logger
   */
  async close(): Promise<void> {
    await this.flush();
    if (this.logger[pino.symbols.streamSym]) {
      const stream = this.logger[pino.symbols.streamSym] as pino.DestinationStream;
      if (typeof stream.flush === 'function') {
        await new Promise<void>((resolve) => stream.flush(() => resolve()));
      }
      if (typeof stream.end === 'function') {
        stream.end();
      }
    }
  }
}

/**
 * Logger manager for creating loggers
 */
export class LogManager {
  private static loggers: Map<string, PollnLogger> = new Map();
  private static defaultConfig: LoggerConfig = {};

  /**
   * Set default configuration for all loggers
   */
  static setDefaultConfig(config: LoggerConfig): void {
    this.defaultConfig = config;
  }

  /**
   * Get or create a logger for a module
   */
  static getLogger(module: string, config?: LoggerConfig): PollnLogger {
    if (!this.loggers.has(module)) {
      const logger = new PollnLogger(module, {
        ...this.defaultConfig,
        ...config,
      });
      this.loggers.set(module, logger);
    }
    return this.loggers.get(module)!;
  }

  /**
   * Get all loggers
   */
  static getAllLoggers(): PollnLogger[] {
    return Array.from(this.loggers.values());
  }

  /**
   * Flush all loggers
   */
  static async flushAll(): Promise<void> {
    await Promise.all(
      Array.from(this.loggers.values()).map((logger) => logger.flush())
    );
  }

  /**
   * Close all loggers
   */
  static async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.loggers.values()).map((logger) => logger.close())
    );
    this.loggers.clear();
  }
}

/**
 * Create a logger for a module
 */
export function createLogger(module: string, config?: LoggerConfig): PollnLogger {
  return LogManager.getLogger(module, config);
}

/**
 * Create a logger with colony context
 */
export function createColonyLogger(
  module: string,
  colonyId: string,
  keeperId?: string,
  config?: LoggerConfig
): PollnLogger {
  return LogManager.getLogger(module, {
    ...config,
    baseContext: {
      ...config?.baseContext,
      colonyId,
      keeperId,
    },
  });
}

/**
 * Create a logger with agent context
 */
export function createAgentLogger(
  module: string,
  agentId: string,
  agentType: string,
  colonyId?: string,
  config?: LoggerConfig
): PollnLogger {
  return LogManager.getLogger(module, {
    ...config,
    baseContext: {
      ...config?.baseContext,
      agentId,
      agentType,
      colonyId,
    },
  });
}
