/**
 * POLLN Incident Response Types
 * Comprehensive type definitions for incident management
 */

// Incident categories
export enum IncidentType {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  DATA = 'data',
  AVAILABILITY = 'availability',
  COMPLIANCE = 'compliance'
}

// Severity levels
export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// Incident status
export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// Action types
export enum ActionType {
  NOTIFICATION = 'notification',
  ESCALATION = 'escalation',
  RUNBOOK_EXECUTION = 'runbook_execution',
  THROTTLE = 'throttle',
  SHUTDOWN = 'shutdown',
  RESTART = 'restart',
  BACKUP = 'backup',
  RESTORE = 'restore',
  INVESTIGATION = 'investigation',
  MITIGATION = 'mitigation'
}

// Core incident interface
export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  assignee?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  impact: {
    score: number;
    affectedSystems: string[];
    estimatedUsers?: number;
    businessCritical: boolean;
  };
  evidence: IncidentEvidence[];
  actions: IncidentAction[];
}

// Evidence collection
export interface IncidentEvidence {
  id: string;
  type: string;
  data: unknown;
  collectedAt: Date;
  source: string;
  verified: boolean;
}

// Incident action
export interface IncidentAction {
  id: string;
  type: ActionType;
  executor: string;
  timestamp: Date;
  result: ActionResult;
  metadata?: Record<string, unknown>;
}

// Action result
export interface ActionResult {
  success: boolean;
  message: string;
  duration: number;
  output?: unknown;
  error?: string;
}

// Detection rule
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: DetectionCondition[];
  thresholds: ThresholdConfig[];
  cooldownPeriod: number;
  severity: IncidentSeverity;
  type: IncidentType;
}

// Detection condition
export interface DetectionCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  value: number | string;
  timeframe: number;
}

// Threshold configuration
export interface ThresholdConfig {
  metric: string;
  warning: number;
  critical: number;
  duration: number;
}

// Escalation rule
export interface EscalationRule {
  id: string;
  name: string;
  type: IncidentType;
  severity: IncidentSeverity;
  conditions: EscalationCondition[];
  steps: EscalationStep[];
  autoEscalate: boolean;
  maxEscalations: number;
}

// Escalation condition
export interface EscalationCondition {
  status: IncidentStatus[];
  timeElapsed: number;
  noActionFor: number;
  customConditions?: Record<string, unknown>;
}

// Escalation step
export interface EscalationStep {
  level: number;
  recipients: string[];
  message: string;
  actions: ActionType[];
  delay: number;
  requiredApprovals?: string[];
}

// Notification template
export interface NotificationTemplate {
  id: string;
  name: string;
  type: IncidentType;
  severity: IncidentSeverity;
  subject: string;
  body: string;
  channels: NotificationChannel[];
  variables: string[];
}

// Notification channels
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PUSH = 'push'
}

// Stakeholder
export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  notificationPreferences: NotificationChannel[];
  escalationLevel: number;
}

// Runbook step
export interface RunbookStep {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automated' | 'approval';
  command?: string;
  timeout: number;
  retryCount: number;
  dependencies: string[];
  expectedOutput?: unknown;
  errorMessage?: string;
}

// Runbook
export interface Runbook {
  id: string;
  name: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  estimatedDuration: number;
  steps: RunbookStep[];
  rollbackSteps?: RunbookStep[];
  requiredApprovals: string[];
  conditions: RunbookCondition[];
}

// Runbook condition
export interface RunbookCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  value: number | string;
}

// Dashboard filter
export interface DashboardFilter {
  types?: IncidentType[];
  severities?: IncidentSeverity[];
  statuses?: IncidentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  assignee?: string;
}

// Timeline event
export interface TimelineEvent {
  id: string;
  incidentId: string;
  timestamp: Date;
  type: string;
  description: string;
  user: string;
  details?: unknown;
}

// Incident configuration
export interface IncidentConfig {
  detection: {
    enabled: boolean;
    interval: number;
    maxIncidents: number;
    cooldownPeriod: number;
  };
  escalation: {
    enabled: boolean;
    defaultEscalationDelay: number;
    maxEscalationLevels: number;
    requireApproval: boolean;
  };
  notifications: {
    enabled: boolean;
    defaultChannels: NotificationChannel[];
    templates: NotificationTemplate[];
  };
  runbooks: {
    enabled: boolean;
    autoExecute: boolean;
    requireApproval: boolean;
    timeout: number;
  };
  retention: {
    resolvedIncidentRetention: number;
    closedIncidentRetention: number;
    metricsRetention: number;
  };
}

// Helper utilities
export const IncidentUtils = {
  calculateImpactScore(
    affectedSystems: string[],
    businessCritical: boolean,
    estimatedUsers?: number
  ): number {
    let score = 0;
    score += affectedSystems.length * 10;
    if (businessCritical) score += 50;
    if (estimatedUsers) score += Math.min(estimatedUsers / 100, 30);
    return Math.min(score, 100);
  },

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  },

  meetsEscalationConditions(
    incident: Incident,
    timeElapsed: number,
    noActionFor: number,
    conditions: EscalationCondition[]
  ): boolean {
    return conditions.some(condition =>
      condition.status.includes(incident.status) &&
      timeElapsed >= condition.timeElapsed &&
      noActionFor >= condition.noActionFor
    );
  }
};

// Default configuration
export const DEFAULT_INCIDENT_CONFIG: IncidentConfig = {
  detection: {
    enabled: true,
    interval: 30,
    maxIncidents: 1000,
    cooldownPeriod: 300
  },
  escalation: {
    enabled: true,
    defaultEscalationDelay: 15,
    maxEscalationLevels: 3,
    requireApproval: true
  },
  notifications: {
    enabled: true,
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
    templates: []
  },
  runbooks: {
    enabled: true,
    autoExecute: false,
    requireApproval: true,
    timeout: 60
  },
  retention: {
    resolvedIncidentRetention: 90,
    closedIncidentRetention: 365,
    metricsRetention: 180
  }
};
