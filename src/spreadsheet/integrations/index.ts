/**
 * POLLN Spreadsheet Integrations - Export Index
 *
 * Central export point for all integration connectors and utilities.
 * Provides factory functions for easy instantiation and type exports.
 */

// ============================================================================
// Core Exports
// ============================================================================

export {
  IntegrationManager,
} from './IntegrationManager.js';

export {
  WebhookReceiver,
} from './webhook/WebhookReceiver.js';

// ============================================================================
// Connector Exports
// ============================================================================

export {
  SlackConnector,
  SlackConfig,
  SlackMessage,
  SlackBlock,
  SlackAttachment,
  SlackSlashCommand,
  SlackFile,
} from './slack/SlackConnector.js';

export {
  TeamsConnector,
  TeamsConfig,
  TeamsMessage,
  TeamsAttachment,
  TeamsAdaptiveCard,
  TeamsActivity,
} from './teams/TeamsConnector.js';

export {
  GitHubConnector,
  GitHubConfig,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubFile,
  GitHubWorkflowRun,
} from './github/GitHubConnector.js';

export {
  DatabaseConnector,
  DatabaseConfig,
  QueryBuilder,
  TransactionHandler,
  QueryOptions,
  TransactionOptions,
  DatabaseSchema,
  TableSchema,
} from './database/DatabaseConnector.js';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  IntegrationConnector,
  IntegrationConfig,
  IntegrationType,
  ConnectionState,
  IntegrationResult,
  IntegrationError,
  HealthStatus,
  IntegrationMetrics,
  WebhookRequest,
  WebhookRoute,
  EventListener,
  ConnectionCallback,
  DataCallback,
  ErrorCallback,
} from './types.js';

export {
  EventType,
  ErrorCode,
  IntegrationType as IntegrationTypeEnum,
  ConnectionState as ConnectionStateEnum,
  HealthState,
  SelfAwarenessLevel,
} from './types.js';

// ============================================================================
// Factory Functions
// ============================================================================

import { IntegrationConfig, IntegrationType } from './types.js';
import { SlackConnector } from './slack/SlackConnector.js';
import { TeamsConnector } from './teams/TeamsConnector.js';
import { GitHubConnector } from './github/GitHubConnector.js';
import { DatabaseConnector } from './database/DatabaseConnector.js';

/**
 * Create an integration connector based on type
 */
export function createIntegrationConnector(config: IntegrationConfig) {
  switch (config.type) {
    case IntegrationType.SLACK:
      return new SlackConnector(config as any);

    case IntegrationType.TEAMS:
      return new TeamsConnector(config as any);

    case IntegrationType.GITHUB:
      return new GitHubConnector(config as any);

    case IntegrationType.DATABASE:
      return new DatabaseConnector(config as any);

    default:
      throw new Error(`Unsupported integration type: ${config.type}`);
  }
}

/**
 * Create a Slack connector
 */
export function createSlackConnector(config: {
  id: string;
  name: string;
  apiToken: string;
  signingSecret?: string;
  webhookUrl?: string;
  defaultChannel?: string;
  enabled?: boolean;
}) {
  return new SlackConnector({
    id: config.id,
    name: config.name,
    type: IntegrationType.SLACK,
    enabled: config.enabled ?? true,
    credentials: {
      apiToken: config.apiToken,
      signingSecret: config.signingSecret,
      webhookUrl: config.webhookUrl,
    },
    options: {
      defaultChannel: config.defaultChannel,
    },
  });
}

/**
 * Create a Teams connector
 */
export function createTeamsConnector(config: {
  id: string;
  name: string;
  appId: string;
  appPassword: string;
  tenantId?: string;
  webhookUrl?: string;
  defaultChannel?: string;
  enabled?: boolean;
}) {
  return new TeamsConnector({
    id: config.id,
    name: config.name,
    type: IntegrationType.TEAMS,
    enabled: config.enabled ?? true,
    credentials: {
      appId: config.appId,
      appPassword: config.appPassword,
      tenantId: config.tenantId,
      webhookUrl: config.webhookUrl,
    },
    options: {
      defaultChannel: config.defaultChannel,
    },
  });
}

/**
 * Create a GitHub connector
 */
export function createGitHubConnector(config: {
  id: string;
  name: string;
  apiToken: string;
  webhookSecret?: string;
  appId?: number;
  installationId?: number;
  privateKey?: string;
  defaultOwner?: string;
  defaultRepo?: string;
  enabled?: boolean;
}) {
  return new GitHubConnector({
    id: config.id,
    name: config.name,
    type: IntegrationType.GITHUB,
    enabled: config.enabled ?? true,
    credentials: {
      apiToken: config.apiToken,
      webhookSecret: config.webhookSecret,
      appId: config.appId,
      installationId: config.installationId,
      privateKey: config.privateKey,
    },
    options: {
      defaultOwner: config.defaultOwner,
      defaultRepo: config.defaultRepo,
    },
  });
}

/**
 * Create a Database connector
 */
export function createDatabaseConnector(config: {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  enabled?: boolean;
}) {
  return new DatabaseConnector({
    id: config.id,
    name: config.name,
    type: IntegrationType.DATABASE,
    enabled: config.enabled ?? true,
    credentials: {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
    },
    options: {
      poolSize: config.poolSize,
      idleTimeoutMs: config.idleTimeoutMs,
      connectionTimeoutMs: config.connectionTimeoutMs,
    },
  });
}

/**
 * Create integration configuration template
 */
export function createIntegrationConfigTemplate(
  type: IntegrationType,
  id: string,
  name: string
): IntegrationConfig {
  return {
    id,
    name,
    type,
    enabled: true,
    credentials: {},
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate integration configuration
 */
export function validateIntegrationConfig(
  config: IntegrationConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation
  if (!config.id) {
    errors.push('Integration ID is required');
  }

  if (!config.name) {
    errors.push('Integration name is required');
  }

  if (!config.type) {
    errors.push('Integration type is required');
  }

  // Type-specific validation
  switch (config.type) {
    case IntegrationType.SLACK:
      if (!config.credentials.apiToken) {
        errors.push('Slack API token is required');
      }
      break;

    case IntegrationType.TEAMS:
      if (!config.credentials.appId) {
        errors.push('Teams App ID is required');
      }
      if (!config.credentials.appPassword) {
        errors.push('Teams App Password is required');
      }
      break;

    case IntegrationType.GITHUB:
      if (!config.credentials.apiToken) {
        errors.push('GitHub API token is required');
      }
      break;

    case IntegrationType.DATABASE:
      const dbCreds = config.credentials;
      if (!dbCreds.host) {
        errors.push('Database host is required');
      }
      if (!dbCreds.database) {
        errors.push('Database name is required');
      }
      if (!dbCreds.user) {
        errors.push('Database user is required');
      }
      if (!dbCreds.password) {
        errors.push('Database password is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mask sensitive credentials for logging
 */
export function maskCredentials(
  config: IntegrationConfig
): IntegrationConfig {
  const masked = { ...config };
  const { credentials } = masked;

  // Mask sensitive fields
  if (credentials.apiToken) {
    credentials.apiToken = maskString(credentials.apiToken);
  }

  if (credentials.apiKey) {
    credentials.apiKey = maskString(credentials.apiKey);
  }

  if (credentials.apiSecret) {
    credentials.apiSecret = maskString(credentials.apiSecret);
  }

  if (credentials.webhookSecret) {
    credentials.webhookSecret = maskString(credentials.webhookSecret);
  }

  if (credentials.appPassword) {
    credentials.appPassword = maskString(credentials.appPassword);
  }

  if (credentials.oauth?.accessToken) {
    credentials.oauth.accessToken = maskString(credentials.oauth.accessToken);
  }

  if (credentials.oauth?.refreshToken) {
    credentials.oauth.refreshToken = maskString(credentials.oauth.refreshToken);
  }

  if (credentials.oauth?.clientSecret) {
    credentials.oauth.clientSecret = maskString(credentials.oauth.clientSecret);
  }

  if (credentials.basic?.password) {
    credentials.basic.password = maskString(credentials.basic.password);
  }

  if (credentials.password) {
    credentials.password = maskString(credentials.password);
  }

  return masked;
}

/**
 * Mask string for logging (show first 4 and last 4 characters)
 */
function maskString(str: string): string {
  if (str.length <= 8) {
    return '****';
  }

  return `${str.substring(0, 4)}****${str.substring(str.length - 4)}`;
}

/**
 * Format integration metrics for display
 */
export function formatIntegrationMetrics(metrics: any): string {
  const lines = [
    `Total Operations: ${metrics.totalOperations}`,
    `Successful: ${metrics.successfulOperations}`,
    `Failed: ${metrics.failedOperations}`,
    `Success Rate: ${((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(2)}%`,
    `Average Duration: ${metrics.averageDuration.toFixed(2)}ms`,
    `Bytes Sent: ${formatBytes(metrics.bytesSent)}`,
    `Bytes Received: ${formatBytes(metrics.bytesReceived)}`,
    `Rate Limit Hits: ${metrics.rateLimitHits}`,
    `Retry Attempts: ${metrics.retryAttempts}`,
    `Uptime: ${((metrics.uptime || 0) / 1000).toFixed(2)}s`,
  ];

  return lines.join('\n');
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Generate integration webhook URL
 */
export function generateWebhookUrl(
  baseUrl: string,
  integrationId: string,
  secret?: string
): string {
  const url = new URL('/webhook', baseUrl);
  url.searchParams.set('integration', integrationId);

  if (secret) {
    url.searchParams.set('secret', secret);
  }

  return url.toString();
}

/**
 * Parse integration type from string
 */
export function parseIntegrationType(type: string): IntegrationType | null {
  const normalized = type.toLowerCase().replace(/[^a-z]/g, '');

  const typeMap: Record<string, IntegrationType> = {
    'slack': IntegrationType.SLACK,
    'teams': IntegrationType.TEAMS,
    'microsoftteams': IntegrationType.TEAMS,
    'github': IntegrationType.GITHUB,
    'database': IntegrationType.DATABASE,
    'postgres': IntegrationType.DATABASE,
    'postgresql': IntegrationType.DATABASE,
    'webhook': IntegrationType.WEBHOOK,
    'custom': IntegrationType.CUSTOM,
  };

  return typeMap[normalized] || null;
}
