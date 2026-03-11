/**
 * SuperInstance Type Definitions
 *
 * This file contains the core type definitions for the SuperInstance system.
 * Based on Round 1 research: "every cell is an instance of any kind"
 */

/**
 * SuperInstance - Base interface for all instance types
 *
 * Every cell in the spreadsheet can be an instance of any kind.
 * This interface defines the minimal contract all instances must satisfy.
 */
export interface SuperInstance {
  // Core Identity
  id: string;
  type: InstanceType;
  name: string;
  description: string;

  // Lifecycle State
  state: InstanceState;
  createdAt: number;
  updatedAt: number;
  lastActive: number;

  // Location & Context
  cellPosition: CellPosition;
  spreadsheetId: string;
  parentInstanceId?: string; // For nested instances

  // Capabilities & Configuration
  capabilities: InstanceCapability[];
  configuration: InstanceConfiguration;
  permissions: InstancePermissions;

  // Lifecycle Methods
  initialize(config?: Partial<InstanceConfiguration>): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  terminate(): Promise<void>;
  serialize(): Promise<InstanceSnapshot>;
  deserialize(snapshot: InstanceSnapshot): Promise<void>;

  // Communication & Interaction
  sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse>;
  receiveMessage(message: InstanceMessage): Promise<void>;
  getStatus(): Promise<InstanceStatus>;
  getMetrics(): Promise<InstanceMetrics>;

  // Composition & Relationships
  getChildren(): Promise<SuperInstance[]>;
  getParents(): Promise<SuperInstance[]>;
  getNeighbors(): Promise<SuperInstance[]>;
  connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection>;
  disconnectFrom(target: SuperInstance): Promise<void>;
}

/**
 * InstanceType - All possible types a SuperInstance can be
 *
 * This extends beyond traditional cell types to include
 * arbitrary computational entities and real-world systems.
 */
export enum InstanceType {
  // Data & Information Types
  DATA_BLOCK = 'data_block',
  FILE = 'file',
  DATABASE = 'database',
  STREAM = 'stream',
  MESSAGE = 'message',
  DOCUMENT = 'document',
  DATASET = 'dataset',

  // Computational Types
  PROCESS = 'process',
  FUNCTION = 'function',
  ALGORITHM = 'algorithm',
  MODEL = 'model',
  SIMULATION = 'simulation',
  CALCULATION = 'calculation',
  TRANSFORMATION = 'transformation',

  // Application & System Types
  APPLICATION = 'application',
  SERVICE = 'service',
  API = 'api',
  MICROSERVICE = 'microservice',
  CONTAINER = 'container',
  VIRTUAL_MACHINE = 'virtual_machine',

  // Agent & AI Types
  LEARNING_AGENT = 'learning_agent',
  REASONING_AGENT = 'reasoning_agent',
  DECISION_AGENT = 'decision_agent',
  OPTIMIZATION_AGENT = 'optimization_agent',
  GENERATIVE_AGENT = 'generative_agent',
  SMPBOT = 'smpbot', // Specialized SMP agent

  // Terminal & Interface Types
  TERMINAL = 'terminal',
  SHELL = 'shell',
  POWERSHELL = 'powershell',
  COMMAND_LINE = 'command_line',
  WEB_INTERFACE = 'web_interface',
  GUI_APPLICATION = 'gui_application',

  // Network & Communication Types
  NETWORK_SERVICE = 'network_service',
  MESSAGE_QUEUE = 'message_queue',
  EVENT_BUS = 'event_bus',
  WEBHOOK = 'webhook',
  WEBSOCKET = 'websocket',

  // Storage Types
  OBJECT_STORAGE = 'object_storage',
  BLOCK_STORAGE = 'block_storage',
  FILE_SYSTEM = 'file_system',
  KEY_VALUE_STORE = 'key_value_store',
  CACHE = 'cache',

  // Special Types
  SUPERVISOR = 'supervisor', // Manages other instances
  GATEWAY = 'gateway', // Bridges different instance types
  ADAPTER = 'adapter', // Converts between formats/protocols
  PROXY = 'proxy', // Intercepts and modifies communications
  NESTED_SUPERINSTANCE = 'nested_superinstance', // Contains other SuperInstances
}

/**
 * InstanceState - Lifecycle states for SuperInstances
 */
export enum InstanceState {
  // Creation & Initialization
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',

  // Active Operation
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  SUSPENDED = 'suspended',

  // Processing States
  PROCESSING = 'processing',
  WAITING = 'waiting',
  BLOCKED = 'blocked',

  // Communication States
  LISTENING = 'listening',
  SENDING = 'sending',
  RECEIVING = 'receiving',

  // Error & Recovery
  ERROR = 'error',
  RECOVERING = 'recovering',
  DEGRADED = 'degraded',

  // Termination
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  TERMINATED = 'terminated',
  ARCHIVED = 'archived',
}

/**
 * InstanceCapability - Capabilities an instance can have
 */
export type InstanceCapability =
  | 'read'
  | 'write'
  | 'execute'
  | 'network'
  | 'persistence'
  | 'composition'
  | 'learning'
  | 'reasoning'
  | 'generation'
  | 'optimization'
  | 'storage'
  | 'computation'
  | 'communication'
  | 'monitoring'
  | 'adaptation';

/**
 * CellPosition - Position in spreadsheet grid
 */
export interface CellPosition {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * InstanceConfiguration - Configuration for SuperInstances
 */
export interface InstanceConfiguration {
  resources: ResourceAllocation;
  constraints: InstanceConstraints;
  policies: InstancePolicies;
  hooks: LifecycleHooks;
  monitoring: MonitoringConfiguration;
}

/**
 * ResourceAllocation - Resource allocation for instances
 */
export interface ResourceAllocation {
  cpu: number; // CPU shares (0-100)
  memory: number; // Memory in MB
  storage: number; // Storage in MB
  network: number; // Network bandwidth in Mbps
  gpu?: number; // GPU allocation (0-100)
}

/**
 * InstanceConstraints - Operational constraints
 */
export interface InstanceConstraints {
  maxRuntime: number; // Maximum runtime in milliseconds
  maxMemory: number; // Maximum memory in MB
  networkQuota: number; // Network quota in MB
  allowedOperations: string[]; // Allowed operation types
  disallowedOperations: string[]; // Disallowed operation types
}

/**
 * InstancePolicies - Security and operational policies
 */
export interface InstancePolicies {
  isolationLevel: 'none' | 'partial' | 'full';
  dataEncryption: boolean;
  auditLogging: boolean;
  backupFrequency: number; // Backup frequency in minutes
  retentionPeriod: number; // Retention period in days
}

/**
 * LifecycleHooks - Lifecycle event hooks
 */
export interface LifecycleHooks {
  onInitialize?: () => Promise<void>;
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onTerminate?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * MonitoringConfiguration - Monitoring settings
 */
export interface MonitoringConfiguration {
  enabled: boolean;
  metricsInterval: number; // Metrics collection interval in seconds
  alertThresholds: AlertThresholds;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * AlertThresholds - Alert thresholds for monitoring
 */
export interface AlertThresholds {
  cpuUsage: number; // CPU usage threshold (0-100)
  memoryUsage: number; // Memory usage threshold (0-100)
  errorRate: number; // Error rate threshold (0-1)
  latency: number; // Latency threshold in milliseconds
}

/**
 * InstancePermissions - Permissions for instance operations
 */
export interface InstancePermissions {
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canNetwork: boolean;
  canCompose: boolean;
  canModify: boolean;
  canDelete: boolean;
  allowedResources: string[];
  disallowedResources: string[];
}

/**
 * InstanceMessage - Message between instances
 */
export interface InstanceMessage {
  id: string;
  type: MessageType;
  sender: string;
  recipient: string;
  payload: any;
  timestamp: number;
  ttl?: number;
  priority?: MessagePriority;
}

/**
 * MessageType - Types of messages instances can send
 */
export enum MessageType {
  DATA = 'data',
  COMMAND = 'command',
  QUERY = 'query',
  RESPONSE = 'response',
  EVENT = 'event',
  NOTIFICATION = 'notification',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
}

/**
 * MessagePriority - Message priority levels
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * InstanceMessageResponse - Response to a message
 */
export interface InstanceMessageResponse {
  messageId: string;
  status: ResponseStatus;
  payload?: any;
  error?: ErrorDetails;
}

/**
 * ResponseStatus - Response status codes
 */
export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
}

/**
 * ErrorDetails - Detailed error information
 */
export interface ErrorDetails {
  code: string;
  message: string;
  stack?: string;
  context?: any;
  recoverable: boolean;
}

/**
 * Connection - Connection between instances
 */
export interface Connection {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;
  bandwidth: number;
  latency: number;
  reliability: number;
  establishedAt: number;
}

/**
 * ConnectionType - Types of connections between instances
 */
export enum ConnectionType {
  DATA_FLOW = 'data_flow',
  CONTROL_FLOW = 'control_flow',
  EVENT = 'event',
  MESSAGE = 'message',
  RPC = 'rpc',
  STREAM = 'stream',
  BROADCAST = 'broadcast',
}

/**
 * InstanceStatus - Current status of an instance
 */
export interface InstanceStatus {
  state: InstanceState;
  health: HealthStatus;
  uptime: number;
  lastError?: ErrorDetails;
  warnings: string[];
}

/**
 * HealthStatus - Health status of an instance
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * InstanceMetrics - Performance metrics for an instance
 */
export interface InstanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  requestCount: number;
  errorRate: number;
  latency: LatencyMetrics;
}

/**
 * LatencyMetrics - Latency distribution metrics
 */
export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

/**
 * RateVector - Rate of change tracking
 */
export interface RateVector {
  value: number;           // Current rate of change
  acceleration: number;    // Second derivative (rate of change of rate)
  jerk?: number;          // Third derivative (optional)
  timestamp: number;       // When this rate was measured
  confidence: number;      // Confidence in this measurement (0-1)
}

/**
 * RateBasedState - State tracking using rate-based mechanics
 */
export interface RateBasedState {
  currentValue: any;
  rateOfChange: RateVector;
  lastUpdate: number;

  // Predict state at future time
  predictState(atTime: number): any;
}

/**
 * OriginReference - Origin-centric reference frame
 */
export interface OriginReference {
  // Position relative to this cell's origin
  relativePosition: Vector3D;

  // Rate of change from this perspective
  rateVector: RateVector;

  // Confidence in this measurement
  confidence: number; // 0-1
}

/**
 * Vector3D - 3D vector for spatial references
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * InstanceSnapshot - Snapshot for serialization
 */
export interface InstanceSnapshot {
  id: string;
  type: InstanceType;
  state: InstanceState;
  data: any;
  configuration: InstanceConfiguration;
  children?: InstanceSnapshot[];
  timestamp: number;
  version: string;
  rateState?: RateBasedState;      // Rate-based state tracking
  originReference?: OriginReference; // Origin-centric reference
}

/**
 * BaseSuperInstance - Abstract base class for all SuperInstances
 */
export abstract class BaseSuperInstance implements SuperInstance {
  id: string;
  type: InstanceType;
  name: string;
  description: string;
  state: InstanceState;
  createdAt: number;
  updatedAt: number;
  lastActive: number;
  cellPosition: CellPosition;
  spreadsheetId: string;
  parentInstanceId?: string;
  capabilities: InstanceCapability[];
  configuration: InstanceConfiguration;
  permissions: InstancePermissions;

  // Rate-based state tracking
  rateState?: RateBasedState;

  // Origin-centric reference system
  originReference?: OriginReference;

  // Confidence tracking (integrated with confidence cascade)
  confidenceScore: number = 1.0; // Default to maximum confidence
  confidenceZone: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';

  // Deadband trigger configuration
  deadbandConfig: DeadbandConfig = {
    threshold: 0.1,    // 10% change threshold
    deadband: 0.05,    // 5% deadband
    enabled: true
  };

  // Performance optimization: Cache for rate calculations
  private rateCalculationCache = new Map<string, { value: any; timestamp: number; rate: number }>();
  private lastRateUpdate: number = 0;
  private rateUpdateDebounceThreshold: number = 100; // ms

  constructor(config: {
    id: string;
    type: InstanceType;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    configuration?: Partial<InstanceConfiguration>;
    capabilities?: InstanceCapability[];
    rateState?: RateBasedState;
    originReference?: OriginReference;
    confidenceScore?: number;
    deadbandConfig?: Partial<DeadbandConfig>;
  }) {
    this.id = config.id;
    this.type = config.type;
    this.name = config.name;
    this.description = config.description;
    this.cellPosition = config.cellPosition;
    this.spreadsheetId = config.spreadsheetId;

    this.state = InstanceState.UNINITIALIZED;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.lastActive = Date.now();

    this.capabilities = config.capabilities || [];
    this.configuration = {
      resources: { cpu: 10, memory: 100, storage: 1000, network: 10 },
      constraints: {
        maxRuntime: 60000,
        maxMemory: 500,
        networkQuota: 100,
        allowedOperations: [],
        disallowedOperations: []
      },
      policies: {
        isolationLevel: 'partial',
        dataEncryption: true,
        auditLogging: true,
        backupFrequency: 60,
        retentionPeriod: 30
      },
      hooks: {},
      monitoring: {
        enabled: true,
        metricsInterval: 30,
        alertThresholds: {
          cpuUsage: 80,
          memoryUsage: 80,
          errorRate: 0.1,
          latency: 1000
        },
        logLevel: 'info'
      },
      ...config.configuration
    };

    this.permissions = {
      canRead: true,
      canWrite: true,
      canExecute: true,
      canNetwork: true,
      canCompose: true,
      canModify: true,
      canDelete: false,
      allowedResources: [],
      disallowedResources: []
    };

    // Rate-based state
    this.rateState = config.rateState;

    // Origin reference
    this.originReference = config.originReference;

    // Confidence tracking
    this.confidenceScore = config.confidenceScore ?? 1.0;
    this.updateConfidenceZone();

    // Deadband configuration
    if (config.deadbandConfig) {
      this.deadbandConfig = { ...this.deadbandConfig, ...config.deadbandConfig };
    }
  }

  // Rate-based state management with performance optimizations
  updateRateState(newValue: any, timestamp: number = Date.now()): void {
    // Debounce frequent updates
    const now = Date.now();
    if (now - this.lastRateUpdate < this.rateUpdateDebounceThreshold) {
      return;
    }
    this.lastRateUpdate = now;

    // Check cache for identical values
    const cacheKey = JSON.stringify(newValue);
    const cached = this.rateCalculationCache.get(cacheKey);
    if (cached && now - cached.timestamp < 1000) {
      // Use cached rate calculation for identical values within 1 second
      if (this.rateState) {
        this.rateState = {
          currentValue: newValue,
          rateOfChange: {
            value: cached.rate,
            acceleration: this.rateState.rateOfChange.acceleration,
            timestamp,
            confidence: this.rateState.rateOfChange.confidence
          },
          lastUpdate: timestamp,
          predictState: this.rateState.predictState
        };
      }
      return;
    }

    if (!this.rateState) {
      // Initialize rate state
      this.rateState = {
        currentValue: newValue,
        rateOfChange: {
          value: 0,
          acceleration: 0,
          timestamp,
          confidence: 1.0
        },
        lastUpdate: timestamp,
        predictState: (atTime: number) => {
          if (!this.rateState) return newValue;
          const dt = (atTime - this.rateState.lastUpdate) / 1000;
          if (dt <= 0) return this.rateState.currentValue;

          if (typeof this.rateState.currentValue === 'number') {
            return this.rateState.currentValue + this.rateState.rateOfChange.value * dt;
          }
          return this.rateState.currentValue;
        }
      };

      // Cache the initial rate
      this.rateCalculationCache.set(cacheKey, {
        value: newValue,
        timestamp,
        rate: 0
      });

      // Limit cache size
      if (this.rateCalculationCache.size > 100) {
        const firstKey = this.rateCalculationCache.keys().next().value;
        this.rateCalculationCache.delete(firstKey);
      }

      return;
    }

    // Calculate time delta in seconds
    const dt = (timestamp - this.rateState.lastUpdate) / 1000;
    if (dt <= 0) return;

    // Calculate new rate of change
    const oldValue = this.rateState.currentValue;
    let newRate = 0;

    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      newRate = (newValue - oldValue) / dt;
    }

    // Update acceleration (rate of change of rate)
    const oldRate = this.rateState.rateOfChange.value;
    const newAcceleration = dt > 0 ? (newRate - oldRate) / dt : 0;

    // Update rate state
    this.rateState = {
      currentValue: newValue,
      rateOfChange: {
        value: newRate,
        acceleration: newAcceleration,
        timestamp,
        confidence: this.calculateRateConfidence(oldValue, newValue, dt)
      },
      lastUpdate: timestamp,
      predictState: (atTime: number) => {
        if (!this.rateState) return newValue;
        const dt = (atTime - this.rateState.lastUpdate) / 1000;
        if (dt <= 0) return this.rateState.currentValue;

        if (typeof this.rateState.currentValue === 'number') {
          return this.rateState.currentValue + this.rateState.rateOfChange.value * dt;
        }
        return this.rateState.currentValue;
      }
    };

    // Cache the calculation
    this.rateCalculationCache.set(cacheKey, {
      value: newValue,
      timestamp,
      rate: newRate
    });

    // Limit cache size
    if (this.rateCalculationCache.size > 100) {
      const firstKey = this.rateCalculationCache.keys().next().value;
      this.rateCalculationCache.delete(firstKey);
    }

    // Check deadband trigger
    this.checkDeadbandTrigger(oldValue, newValue);
  }

  predictState(atTime: number): any {
    if (!this.rateState) return this.rateState?.currentValue;
    return this.rateState.predictState(atTime);
  }

  // Confidence management
  updateConfidence(newConfidence: number): void {
    this.confidenceScore = Math.max(0, Math.min(1, newConfidence));
    this.updateConfidenceZone();
  }

  updateConfidenceZone(): void {
    if (this.confidenceScore >= 0.85) {
      this.confidenceZone = 'GREEN';
    } else if (this.confidenceScore >= 0.60) {
      this.confidenceZone = 'YELLOW';
    } else {
      this.confidenceZone = 'RED';
    }
  }

  // Deadband trigger management
  checkDeadbandTrigger(oldValue: any, newValue: any): boolean {
    if (typeof oldValue !== 'number' || typeof newValue !== 'number') {
      return false;
    }

    const trigger = new DeadbandTrigger(this.deadbandConfig);
    const shouldTrigger = trigger.shouldTrigger(newValue, oldValue);

    if (shouldTrigger && trigger.canUpdate()) {
      this.onDeadbandTrigger(oldValue, newValue);
      return true;
    }

    return false;
  }

  onDeadbandTrigger(oldValue: number, newValue: number): void {
    // Default implementation - can be overridden by subclasses
    console.log(`Deadband triggered: ${oldValue} -> ${newValue}`);

    // Update confidence based on change magnitude
    const change = Math.abs(newValue - oldValue);
    const relativeChange = change / Math.max(Math.abs(oldValue), 1);

    // Larger changes reduce confidence
    const confidencePenalty = Math.min(relativeChange * 0.1, 0.3);
    this.updateConfidence(this.confidenceScore - confidencePenalty);
  }

  // Origin reference management
  updateOriginReference(position: Vector3D, rateVector: RateVector): void {
    this.originReference = {
      relativePosition: position,
      rateVector,
      confidence: rateVector.confidence
    };
  }

  getRelativePosition(target: Vector3D): Vector3D | null {
    if (!this.originReference) return null;

    return {
      x: target.x - this.originReference.relativePosition.x,
      y: target.y - this.originReference.relativePosition.y,
      z: target.z - this.originReference.relativePosition.z
    };
  }

  // Utility methods
  private calculateRateConfidence(oldValue: any, newValue: any, dt: number): number {
    // Simple confidence calculation based on value stability
    if (dt <= 0) return 0;

    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      const change = Math.abs(newValue - oldValue);
      const rate = change / dt;

      // Lower confidence for very high rates (potentially noisy)
      if (rate > 1000) return 0.3;
      if (rate > 100) return 0.6;
      if (rate > 10) return 0.8;
      return 0.95;
    }

    return 0.5; // Default confidence for non-numeric values
  }

  abstract initialize(config?: Partial<InstanceConfiguration>): Promise<void>;
  abstract activate(): Promise<void>;
  abstract deactivate(): Promise<void>;
  abstract terminate(): Promise<void>;
  abstract serialize(): Promise<InstanceSnapshot>;
  abstract deserialize(snapshot: InstanceSnapshot): Promise<void>;
  abstract sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse>;
  abstract receiveMessage(message: InstanceMessage): Promise<void>;
  abstract getStatus(): Promise<InstanceStatus>;
  abstract getMetrics(): Promise<InstanceMetrics>;
  abstract getChildren(): Promise<SuperInstance[]>;
  abstract getParents(): Promise<SuperInstance[]>;
  abstract getNeighbors(): Promise<SuperInstance[]>;
  abstract connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection>;
  abstract disconnectFrom(target: SuperInstance): Promise<void>;

  protected updateState(newState: InstanceState): void {
    this.state = newState;
    this.updatedAt = Date.now();
    this.lastActive = Date.now();
  }

  protected validateConfiguration(config: InstanceConfiguration): ValidationResult {
    // Basic validation logic
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (config.resources.cpu < 0 || config.resources.cpu > 100) {
      errors.push({
        code: 'INVALID_CPU',
        message: 'CPU allocation must be between 0 and 100',
        path: ['resources', 'cpu'],
        severity: 'error'
      });
    }

    if (config.resources.memory < 0) {
      errors.push({
        code: 'INVALID_MEMORY',
        message: 'Memory allocation must be non-negative',
        path: ['resources', 'memory'],
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
}

/**
 * ValidationResult - Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

/**
 * ValidationError - Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * ValidationWarning - Validation warning details
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string[];
  severity: 'warning' | 'info';
}

/**
 * ValidationSuggestion - Validation suggestion
 */
export interface ValidationSuggestion {
  description: string;
  operation: 'add' | 'remove' | 'modify' | 'retype';
  value?: any;
  path: string[];
}

/**
 * DeadbandConfig - Configuration for deadband triggers
 */
export interface DeadbandConfig {
  threshold: number;      // Change threshold to trigger action
  deadband: number;       // Hysteresis band to prevent thrashing
  enabled: boolean;       // Whether deadband triggering is enabled
  minUpdateInterval?: number; // Minimum time between updates (ms)
}

/**
 * DeadbandTrigger - Deadband trigger logic
 */
export class DeadbandTrigger {
  private lastValue: number = 0;
  private lastUpdate: number = 0;
  private triggered: boolean = false;

  constructor(private config: DeadbandConfig) {}

  /**
   * Check if a change should trigger action
   */
  shouldTrigger(newValue: number, oldValue: number): boolean {
    if (!this.config.enabled) return true;

    const change = Math.abs(newValue - oldValue);
    const relativeChange = change / Math.max(Math.abs(oldValue), 1);

    // Check if change exceeds threshold
    if (relativeChange > this.config.threshold) {
      // Check if we're outside the deadband
      if (!this.triggered || relativeChange > this.config.deadband) {
        this.triggered = true;
        this.lastValue = newValue;
        this.lastUpdate = Date.now();
        return true;
      }
    } else if (relativeChange <= this.config.deadband) {
      // Reset trigger if we're back within deadband
      this.triggered = false;
    }

    return false;
  }

  /**
   * Check if minimum update interval has passed
   */
  canUpdate(): boolean {
    if (!this.config.minUpdateInterval) return true;
    return Date.now() - this.lastUpdate >= this.config.minUpdateInterval;
  }
}