/**
 * ConnectorInstance - Implementation for external system connection instances
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, RateBasedState, OriginReference
} from '../types/base';

/**
 * ProtocolType - Supported connection protocols
 */
export enum ProtocolType {
  HTTP = 'http',
  HTTPS = 'https',
  WEBSOCKET = 'websocket',
  TCP = 'tcp',
  UDP = 'udp',
  MQTT = 'mqtt',
  GRPC = 'grpc',
  GRAPHQL = 'graphql',
  REST = 'rest',
  SOAP = 'soap',
  FTP = 'ftp',
  SFTP = 'sftp',
  DATABASE = 'database',
  MESSAGE_QUEUE = 'message_queue'
}

/**
 * AuthenticationType - Authentication methods
 */
export enum AuthenticationType {
  NONE = 'none',
  BASIC = 'basic',
  TOKEN = 'token',
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  CERTIFICATE = 'certificate',
  BEARER = 'bearer'
}

/**
 * ConnectionStatus - Connection state
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * ConnectorRole - Role of the connector
 */
export enum ConnectorRole {
  SOURCE = 'source',
  SINK = 'sink',
  BIDIRECTIONAL = 'bidirectional',
  PROXY = 'proxy',
  GATEWAY = 'gateway'
}

/**
 * ConnectorConfiguration - Configuration for connector instances
 */
export interface ConnectorConfiguration {
  protocol: ProtocolType;
  endpoint: string;
  port?: number;
  path?: string;
  role: ConnectorRole;
  authentication?: AuthenticationType;
  credentials?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  rateLimit?: RateLimitPolicy;
  batchSize?: number;
  batchTimeout?: number;
  compress?: boolean;
  encrypt?: boolean;
}

/**
 * RetryPolicy - Retry configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryMultiplier: number; // exponential backoff
  maxRetryDelay: number;
  retryOn: number[]; // HTTP status codes to retry
}

/**
 * RateLimitPolicy - Rate limiting configuration
 */
export interface RateLimitPolicy {
  requestsPerSecond: number;
  burstSize: number;
}

/**
 * ConnectionRecord - Connection metadata
 */
export interface ConnectionRecord {
  id: string;
  localAddress: string;
  remoteAddress: string;
  protocol: ProtocolType;
  establishedAt: number;
  lastActivity: number;
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  latency?: number;
  throughput?: number;
}

/**
 * MessageRecord - Message metadata
 */
export interface MessageRecord {
  id: string;
  direction: 'in' | 'out';
  timestamp: number;
  size: number;
  protocol: ProtocolType;
  status: 'success' | 'error' | 'retry';
  error?: string;
  latency?: number;
}

/**
 * HealthCheck - Health monitoring
 */
export interface HealthCheck {
  type: 'ping' | 'tcp_syn' | 'http_get' | 'custom';
  interval: number; // milliseconds
  timeout: number;
  enabled: boolean;
  healthyThreshold: number;
  unhealthyThreshold: number;
  customCheck?: () => Promise<boolean>;
}

/**
 * ConnectorInstance - Interface for connector instances
 */
export interface ConnectorInstance {
  type: InstanceType.CONNECTOR;
  configuration: ConnectorConfiguration;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;

  // Data exchange
  send(data: any): Promise<void>;
  receive(): Promise<any>;
  sendAndReceive(data: any): Promise<any>;
  sendBatch(items: any[]): Promise<void>;
  receiveBatch(maxItems?: number): Promise<any[]>;

  // Message handling
  subscribe(topic?: string): Promise<void>;
  unsubscribe(topic?: string): Promise<void>;
  publish(topic: string, message: any): Promise<void>;

  // Monitoring
  getConnectionRecord(): ConnectionRecord;
  getMessageHistory(limit?: number): MessageRecord[];
  getThroughput(): number; // messages per second
  getLatency(): number; // average latency in ms

  // Configuration
  updateConfiguration(config: Partial<ConnectorConfiguration>): Promise<void>;
  testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }>;
}

/**
 * ConcreteConnectorInstance - Implementation of ConnectorInstance
 */
export class ConcreteConnectorInstance extends BaseSuperInstance implements ConnectorInstance {
  type = InstanceType.CONNECTOR;
  configuration: ConnectorConfiguration;

  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private connectionRecord: ConnectionRecord;
  private messageHistory: MessageRecord[] = [];
  private listeners: Map<string, Set<(message: any) => void>> = new Map();
  private connectionError: Error | null = null;
  private messageQueue: any[] = [];
  private batchBuffer: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private lastBatchSend: number = 0;
  private healthCheck: HealthCheck;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private connectionStartTime: number = 0;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    connectorConfig: ConnectorConfiguration;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.CONNECTOR,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['network', 'communication', 'composition']
    });

    this.configuration = {
      ...config.connectorConfig,
      retryPolicy: config.connectorConfig.retryPolicy || {
        maxRetries: 3,
        retryDelay: 1000,
        retryMultiplier: 2,
        maxRetryDelay: 30000,
        retryOn: [500, 502, 503, 504, 429]
      },
      rateLimit: config.connectorConfig.rateLimit || {
        requestsPerSecond: 100,
        burstSize: 10
      }
    };

    this.connectionRecord = {
      id: this.id,
      localAddress: 'unknown',
      remoteAddress: this.configuration.endpoint + ':' + (this.configuration.port || 80),
      protocol: this.configuration.protocol,
      establishedAt: 0,
      lastActivity: Date.now(),
      bytesSent: 0,
      bytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0
    };

    this.healthCheck = {
      type: this.configuration.protocol === ProtocolType.HTTP ? 'http_get' : 'tcp_syn',
      interval: 30000, // 30 seconds
      timeout: 5000,
      enabled: true,
      healthyThreshold: 3,
      unhealthyThreshold: 3
    };
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    // Initialize rate-based state for connection metrics
    this.rateState = {
      currentValue: {
        messagesPerSecond: 0,
        bytesPerSecond: 0,
        latency: 0,
        active: false
      },
      rateOfChange: {
        value: 0,
        acceleration: 0,
        timestamp: Date.now(),
        confidence: 1.0
      },
      lastUpdate: Date.now(),
      predictState: (atTime: number) => {
        if (!this.rateState) return { active: this.connectionStatus === ConnectionStatus.CONNECTED };

        const dt = (atTime - this.rateState.lastUpdate) / 1000;
        if (dt <= 0) return this.rateState.currentValue;

        // Predict connection activity
        const predictedMessageRate = this.rateState.currentValue.messagesPerSecond;
        return {
          messagesPerSecond: predictedMessageRate,
          latency: this.rateState.currentValue.latency,
          active: predictedMessageRate > 0.1
        };
      }
    };

    this.originReference = {
      relativePosition: { x: this.cellPosition.col, y: this.cellPosition.row, z: 0 },
      rateVector: {
        value: 0,
        acceleration: 0,
        timestamp: Date.now(),
        confidence: this.calculateConnectionConfidence()
      },
      confidence: this.calculateConnectionConfidence()
    };
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }

    // Attempt initial connection
    await this.connect();
  }

  async deactivate(): Promise<void> {
    if (this.connectionStatus === ConnectionStatus.CONNECTED ||
        this.connectionStatus === ConnectionStatus.AUTHENTICATED) {
      await this.disconnect();
    }

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    await this.deactivate();

    // Clear message history
    this.messageHistory = [];

    // Clear message queue
    this.messageQueue = [];

    // Clear listeners
    this.listeners.clear();

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.updateState(InstanceState.TERMINATED);
  }

  async serialize(): Promise<InstanceSnapshot> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        configuration: this.configuration,
        connectionStatus: this.connectionStatus,
        connectionRecord: this.connectionRecord,
        messageHistory: this.messageHistory.slice(-100), // Last 100 messages
        messageQueue: this.messageQueue,
        batchBuffer: this.batchBuffer,
        consecutiveFailures: this.consecutiveFailures,
        consecutiveSuccesses: this.consecutiveSuccesses
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0',
      rateState: this.rateState,
      originReference: this.originReference
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.CONNECTOR) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into Connector`);
    }

    const data = snapshot.data;
    this.configuration = data.configuration;
    this.connectionStatus = data.connectionStatus;
    this.connectionRecord = data.connectionRecord;
    this.messageHistory = data.messageHistory || [];
    this.messageQueue = data.messageQueue || [];
    this.batchBuffer = data.batchBuffer || [];
    this.consecutiveFailures = data.consecutiveFailures || 0;
    this.consecutiveSuccesses = data.consecutiveSuccesses || 0;

    this.rateState = data.rateState;
    this.originReference = data.originReference;

    this.updateState(snapshot.state);
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);
      return {
        messageId: message.id,
        status: 'success',
        payload: {
          connectionStatus: this.connectionStatus,
          bytesSent: this.connectionRecord.bytesSent,
          messagesSent: this.connectionRecord.messagesSent
        }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'CONNECTOR_MESSAGE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: this.connectionStatus === ConnectionStatus.ERROR,
          context: { protocol: this.configuration.protocol }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    if (message.type === 'data' && message.payload) {
      await this.send(message.payload);
    } else if (message.type === 'command' && message.payload) {
      await this.handleCommandMessage(message.payload);
    }
  }

  private async handleCommandMessage(payload: any): Promise<void> {
    switch (payload.command) {
      case 'connect':
        await this.connect();
        break;
      case 'disconnect':
        await this.disconnect();
        break;
      case 'test':
        const result = await this.testConnection();
        console.log(`Connection test: ${result.success ? 'SUCCESS' : 'FAILED'}`, result);
        break;
      case 'update_config':
        await this.updateConfiguration(payload.config);
        break;
    }
  }

  async getStatus(): Promise<InstanceStatus> {
    return {
      state: this.state,
      health: this.calculateHealth(),
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      warnings: this.getWarnings(),
      lastError: this.connectionError ? {
        code: 'CONNECTION_ERROR',
        message: this.connectionError.message,
        recoverable: this.connectionStatus === ConnectionStatus.ERROR,
        context: { protocol: this.configuration.protocol }
      } : undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const metrics = this.calculateMetrics();
    return {
      cpuUsage: metrics.cpuUsage,
      memoryUsage: this.messageHistory.length * 0.1, // Rough estimate
      diskUsage: 0,
      networkIn: this.connectionRecord.bytesReceived,
      networkOut: this.connectionRecord.bytesSent,
      requestCount: this.connectionRecord.messagesSent + this.connectionRecord.messagesReceived,
      errorRate: this.messageHistory.filter(m => m.status === 'error').length / Math.max(this.messageHistory.length, 1),
      latency: {
        p50: metrics.avgLatency,
        p90: metrics.p90Latency,
        p95: metrics.p95Latency,
        p99: metrics.p99Latency,
        max: metrics.maxLatency
      }
    };
  }

  async getChildren(): Promise<SuperInstance[]> {
    // In a real implementation, this would query child instances
    return [];
  }

  async getParents(): Promise<SuperInstance[]> {
    // In a real implementation, this would query parent instances
    return [];
  }

  async getNeighbors(): Promise<SuperInstance[]> {
    // In a real implementation, this would query neighboring cells
    return [];
  }

  async connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection> {
    const connection: Connection = {
      id: `${this.id}-${target.id}-${Date.now()}`,
      source: this.id,
      target: target.id,
      type: connectionType,
      bandwidth: 10000,
      latency: Math.random() * 50 + 10,
      reliability: 0.98,
      establishedAt: Date.now()
    };

    return connection;
  }

  async disconnectFrom(target: SuperInstance): Promise<void> {
    // Remove from subscriptions if applicable
    if (this.listeners.has(target.id)) {
      this.listeners.delete(target.id);
    }
  }

  // Connector-specific methods
  async connect(): Promise<void> {
    if (this.connectionStatus === ConnectionStatus.CONNECTED ||
        this.connectionStatus === ConnectionStatus.AUTHENTICATED) {
      return;
    }

    this.connectionStatus = ConnectionStatus.CONNECTING;
    this.connectionError = null;
    this.connectionStartTime = Date.now();

    try {
      await this.establishConnection();
      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.connectionRecord.establishedAt = Date.now();

      // Start health checks if enabled
      if (this.healthCheck.enabled) {
        this.startHealthChecks();
      }

      // Start batch processing if batchSize > 1
      if (this.configuration.batchSize > 1) {
        this.startBatchProcessing();
      }

      this.updateState(InstanceState.RUNNING);
    } catch (error) {
      this.connectionStatus = ConnectionStatus.ERROR;
      this.connectionError = error as Error;
      this.consecutiveFailures++;
      this.updateConfidence(1.0 - (this.consecutiveFailures / 10));

      // Attempt reconnection with exponential backoff
      await this.handleConnectionFailure(error as Error);
    }
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = ConnectionStatus.DISCONNECTED;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Send any pending batch
    if (this.batchBuffer.length > 0) {
      await this.sendBatchNow();
    }

    // Update connection record
    this.connectionRecord.lastActivity = Date.now();

    this.updateState(InstanceState.IDLE);
  }

  async reconnect(): Promise<void> {
    console.log(`Reconnecting connector ${this.id}...`);
    await this.disconnect();
    await this.connect();
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async send(data: any): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED &&
        this.connectionStatus !== ConnectionStatus.AUTHENTICATED) {
      throw new Error('Not connected');
    }

    const messageStart = Date.now();

    try {
      if (this.configuration.batchSize > 1) {
        // Add to batch buffer
        this.batchBuffer.push(data);

        if (this.batchBuffer.length >= this.configuration.batchSize) {
          await this.sendBatchNow();
        }
      } else {
        // Send immediately
        await this.sendData(data);
      }

      this.recordMessage('out', Date.now() - messageStart, true);
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
      this.updateConfidence(1.0);
    } catch (error) {
      this.recordMessage('out', Date.now() - messageStart, false, String(error));
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;

      // Check if we should retry
      if (this.shouldRetryMessage(error)) {
        await this.retryMessage(data, error);
      } else {
        throw error;
      }
    }
  }

  async receive(): Promise<any> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED &&
        this.connectionStatus !== ConnectionStatus.AUTHENTICATED) {
      throw new Error('Not connected');
    }

    const messageStart = Date.now();

    try {
      const data = await this.receiveData();
      this.connectionRecord.lastActivity = Date.now();
      this.recordMessage('in', Date.now() - messageStart, true);
      return data;
    } catch (error) {
      this.recordMessage('in', Date.now() - messageStart, false, String(error));
      throw error;
    }
  }

  async sendAndReceive(data: any): Promise<any> {
    await this.send(data);
    return this.receive();
  }

  async sendBatch(items: any[]): Promise<void> {
    const promises = items.map(item => this.send(item));
    await Promise.all(promises);
  }

  async receiveBatch(maxItems?: number): Promise<any[]> {
    const items: any[] = [];
    const max = maxItems || 100; // Default max batch size

    try {
      for (let i = 0; i < max; i++) {
        const item = await this.receiveData(100); // 100ms timeout per item
        items.push(item);

        // Stop if no more data
        if (!item) break;
      }
    } catch (error) {
      // Ignore timeout errors in batch receive
      if (!String(error).includes('timeout')) {
        throw error;
      }
    }

    return items;
  }

  private async sendData(data: any): Promise<void> {
    // Simulate sending data based on protocol
    await this.simulateNetworkLatency();

    // Update metrics
    const dataSize = JSON.stringify(data).length;
    this.connectionRecord.messagesSent++;
    this.connectionRecord.bytesSent += dataSize;
    this.connectionRecord.lastActivity = Date.now();

    // Simulate occasional failures
    if (Math.random() < 0.01) { // 1% failure rate
      throw new Error('Simulated network failure');
    }
  }

  private async receiveData(timeout?: number): Promise<any> {
    // Simulate receiving data based on protocol
    await this.simulateNetworkLatency();

    // Update metrics
    const mockData = this.generateMockResponse();
    const dataSize = JSON.stringify(mockData).length;
    this.connectionRecord.messagesReceived++;
    this.connectionRecord.bytesReceived += dataSize;
    this.connectionRecord.lastActivity = Date.now();

    return mockData;
  }

  private async simulateNetworkLatency(): Promise<void> {
    // Simulate network delay based on protocol and rate limiting
    const baseDelay = {
      [ProtocolType.HTTP]: 50,
      [ProtocolType.HTTPS]: 100,
      [ProtocolType.WEBSOCKET]: 20,
      [ProtocolType.TCP]: 10,
      [ProtocolType.UDP]: 5,
      [ProtocolType.MQTT]: 30,
      [ProtocolType.GRPC]: 15
    }[this.configuration.protocol] || 100;

    const jitter = Math.random() * baseDelay * 0.2; // 0-20% jitter
    await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
  }

  private generateMockResponse(): any {
    // Generate appropriate mock response based on protocol
    switch (this.configuration.protocol) {
      case ProtocolType.HTTP:
      case ProtocolType.HTTPS:
      case ProtocolType.REST:
        return {
          status: 200,
          data: { timestamp: Date.now(), value: Math.random() * 100 }
        };
      case ProtocolType.WEBSOCKET:
        return {
          type: 'message',
          timestamp: Date.now(),
          payload: { id: Math.floor(Math.random() * 1000), content: 'hello' }
        };
      case ProtocolType.MQTT:
        return {
          topic: 'test/topic',
          payload: { sensor: 'temp', value: 20 + Math.random() * 10 }
        };
      default:
        return { timestamp: Date.now(), data: Math.random() };
    }
  }

  private shouldRetryMessage(error: any): boolean {
    const policy = this.configuration.retryPolicy;
    if (!policy) return false;

    // Check if error code indicates retryable failure
    if (error.code) {
      const errorCode = parseInt(error.code);
      return policy.retryOn.includes(errorCode) || errorCode >= 500;
    }

    return true; // Retry on unknown errors
  }

  private async retryMessage(data: any, originalError: any): Promise<void> {
    const policy = this.configuration.retryPolicy!;
    let retryDelay = policy.retryDelay;

    for (let attempt = 1; attempt <= policy.maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await this.sendData(data);
        console.log(`Message sent after ${attempt} retries`);
        return;
      } catch (error) {
        retryDelay = Math.min(
          retryDelay * policy.retryMultiplier,
          policy.maxRetryDelay
        );
      }
    }

    // All retries exhausted
    throw originalError;
  }

  private async sendBatchNow(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.sendData({ batch, count: batch.length, type: 'batch' });
      console.log(`Batch of ${batch.length} items sent successfully`);
      this.lastBatchSend = Date.now();
    } catch (error) {
      // Restore buffer on failure
      this.batchBuffer.unshift(...batch);
      throw error;
    }
  }

  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.batchBuffer.length > 0) {
        this.sendBatchNow().catch(error => {
          console.error('Batch send failed:', error);
        });
      }
    }, this.configuration.batchTimeout || 5000);
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().then(healthy => {
        if (healthy) {
          this.consecutiveSuccesses++;
          this.consecutiveFailures = 0;
          if (this.consecutiveSuccesses >= this.healthCheck.healthyThreshold) {
            this.connectionStatus = ConnectionStatus.CONNECTED;
            this.updateConfidence(1.0);
          }
        } else {
          this.consecutiveFailures++;
          this.consecutiveSuccesses = 0;
          if (this.consecutiveFailures >= this.healthCheck.unhealthyThreshold) {
            this.connectionStatus = ConnectionStatus.ERROR;
            this.updateConfidence(0.5);
            // Trigger reconnection
            this.reconnect().catch(console.error);
          }
        }
      }).catch(error => {
        console.error('Health check failed:', error);
        this.consecutiveFailures++;
      });
    }, this.healthCheck.interval);
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      const result = await this.testConnection();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  private async handleConnectionFailure(error: Error): Promise<void> {
    const policy = this.configuration.retryPolicy;
    if (!policy || this.consecutiveFailures > policy.maxRetries) {
      console.error('Connection failed after maximum retries:', error);
      this.updateState(InstanceState.ERROR);
      return;
    }

    const backoffDelay = policy.retryDelay * Math.pow(policy.retryMultiplier, this.consecutiveFailures - 1);
    const delay = Math.min(backoffDelay, policy.maxRetryDelay);

    console.log(`Reconnecting in ${delay}ms...`);
    this.connectionStatus = ConnectionStatus.RECONNECTING;

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }

  private recordMessage(direction: 'in' | 'out', latency: number, success: boolean, error?: string): void {
    const record: MessageRecord = {
      id: `msg-${Date.now()}-${Math.random()}`,
      direction,
      timestamp: Date.now(),
      size: Math.floor(Math.random() * 10000), // Estimate
      protocol: this.configuration.protocol,
      status: success ? 'success' : 'error',
      latency,
      error
    };

    this.messageHistory.push(record);

    // Keep only last 1000 messages
    if (this.messageHistory.length > 1000) {
      this.messageHistory = this.messageHistory.slice(-1000);
    }

    // Update connection record
    if (direction === 'out') {
      this.connectionRecord.messagesSent++;
      this.connectionRecord.bytesSent += record.size;
    } else {
      this.connectionRecord.messagesReceived++;
      this.connectionRecord.bytesReceived += record.size;
    }

    if (!success) {
      this.connectionRecord.errors++;
      this.connectionRecord.lastActivity = Date.now();
    }
  }

  // Update methods following confidence cascade pattern
  updateConnectionMetrics(): void {
    const recentMessages = this.getRecentMessages(100);
    const successRate = recentMessages.filter(m => m.status === 'success').length / recentMessages.length;

    // Update confidence based on success rate
    this.updateConfidence(successRate);

    // Update rate-based state
    const now = Date.now();
    const dt = (now - this.rateState!.lastUpdate) / 1000;

    if (dt > 0) {
      const msgRate = recentMessages.length / Math.max(dt, 60); // messages per minute
      const byteRate = recentMessages.reduce((sum, m) => sum + m.size, 0) / Math.max(dt, 60);
      const avgLatency = recentMessages.reduce((sum, m) => sum + (m.latency || 0), 0) / recentMessages.length;

      this.updateRateState({
        messagesPerSecond: msgRate / 60,
        bytesPerSecond: byteRate / 60,
        latency: avgLatency,
        active: connectionStatus === ConnectionStatus.CONNECTED || connectionStatus === ConnectionStatus.AUTHENTICATED
      });
    }
  }

  private getRecentMessages(limit: number): MessageRecord[] {
    return this.messageHistory.slice(-limit);
  }

  private calculateMetrics(): {
    cpuUsage: number;
    avgLatency: number;
    p90Latency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
  } {
    const recentMessages = this.getRecentMessages(100);
    const latencies = recentMessages
      .filter(m => m.latitude > 0)
      .map(m => m.latency!)
      .sort((a, b) => a - b);

    const calculatePercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * latencies.length) - 1;
      return latencies[Math.max(0, index)] || 0;
    };

    return {
      cpuUsage: this.connectionStatus === ConnectionStatus.CONNECTED ? 10 : 2,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / Math.max(latencies.length, 1),
      p90Latency: calculatePercentile(90),
      p95Latency: calculatePercentile(95),
      p99Latency: calculatePercentile(99),
      maxLatency: latencies[latencies.length - 1] || 0
    };
  }

  private calculateHealth(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    switch (this.connectionStatus) {
      case ConnectionStatus.ERROR:
        return 'unhealthy';
      case ConnectionStatus.RECONNECTING:
        return 'degraded';
      case ConnectionStatus.CONNECTED:
      case ConnectionStatus.AUTHENTICATED:
        // Additional health checks based on metrics
        const recentMessages = this.getRecentMessages(10);
        const errorRate = recentMessages.filter(m => m.status === 'error').length / recentMessages.length;

        if (errorRate > 0.3) return 'degraded';
        if (errorRate > 0.5) return 'unhealthy';

        return 'healthy';
      default:
        return 'unknown';
    }
  }

  private getWarnings(): string[] {
    const warnings: string[] = [];

    if (this.consecutiveFailures > 5) {
      warnings.push(`Connection has failed ${this.consecutiveFailures} times consecutively`);
    }

    if (this.configuration.batchSize > 1 && this.batchBuffer.length > this.configuration.batchSize * 2) {
      warnings.push(`Batch buffer has ${this.batchBuffer.length} items (size limit: ${this.configuration.batchSize})`);
    }

    const throughput = this.getThroughput();
    if (throughput > this.configuration.rateLimit?.requestsPerSecond! * 0.9) {
      warnings.push(`High throughput detected (${throughput} msgs/s), approaching rate limit`);
    }

    return warnings;
  }

  private async establishConnection(): Promise<void> {
    // Simulate connection establishment
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

    // Simulate authentication if needed
    if (this.configuration.authentication !== AuthenticationType.NONE) {
      this.connectionStatus = ConnectionStatus.AUTHENTICATING;
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

      // Simulate auth success/failure
      if (Math.random() > 0.95) {
        throw new Error('Authentication failed');
      }

      this.connectionStatus = ConnectionStatus.AUTHENTICATED;
    }
  }

  private calculateConnectionConfidence(): number {
    let confidence = 1.0;

    // Reduce confidence based on consecutive failures
    confidence -= this.consecutiveFailures * 0.1;

    // Reduce confidence based on error rate
    const recentMessages = this.getRecentMessages(100);
    const errorRate = recentMessages.filter(m => m.status === 'error').length / recentMessages.length;
    confidence -= (errorRate * 0.5);

    // Reduce confidence based on latency
    const avgLatency = recentMessages.reduce((sum, m) => sum + (m.latency || 0), 0) / recentMessages.length;
    if (avgLatency > 5000) confidence -= 0.2; // 5 seconds is bad

    return Math.max(0, Math.min(1, confidence));
  }

  // Public getter methods
  getConnectionRecord(): ConnectionRecord {
    return { ...this.connectionRecord };
  }

  getMessageHistory(limit?: number): MessageRecord[] {
    const messages = this.getRecentMessages(limit || this.messageHistory.length);
    return messages.map(m => ({ ...m }));
  }

  getThroughput(): number {
    const recentMessages = this.getRecentMessages(10);
    const timeSpan = Date.now() - (recentMessages[0]?.timestamp || Date.now());
    if (timeSpan === 0) return 0;
    return (recentMessages.length * 1000) / timeSpan; // messages per second
  }

  getLatency(): number {
    const recentMessages = this.getRecentMessages(10);
    const validLatencies = recentMessages.filter(m => m.latency > 0 && m.direction === 'out');
    if (validLatencies.length === 0) return 0;

    return validLatencies.reduce((sum, m) => sum + m.latency!, 0) / validLatencies.length;
  }

  async updateConfiguration(config: Partial<ConnectorConfiguration>): Promise<void> {
    // Validate the configuration
    if (config.endpoint) {
      try {
        new URL(config.endpoint);
      } catch {
        throw new Error('Invalid endpoint URL');
      }
    }

    if (config.rateLimit) {
      if (config.rateLimit.requestsPerSecond > 10000) {
        throw new Error('Max requests per second is 10000');
      }
      if (config.rateLimit.burstSize > 1000) {
        throw new Error('Max burst size is 1000');
      }
    }

    // Update configuration
    this.configuration = { ...this.configuration, ...config };

    console.log(`Connector ${this.id} configuration updated`);
  }

  async testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.sendData({ type: 'ping', timestamp: startTime });
      const latency = Date.now() - startTime;

      return {
        success: true,
        latency
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Missing message types
  async subscribe(topic?: string): Promise<void> {
    if (this.configuration.protocol !== ProtocolType.MQTT &
        this.configuration.protocol !== ProtocolType.WEBSOCKET) {
      throw new Error('Protocol does not support subscription');
    }

    // Simulate subscription
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Subscribed to ${topic || default topic}`);
  }

  async unsubscribe(topic?: string): Promise<void> {
    // Simulate unsubscription
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Unsubscribed from ${topic || default topic}`);
  }

  async publish(topic: string, message: any): Promise<void> {
    if (this.configuration.protocol !== ProtocolType.MQTT) {
      throw new Error('Protocol does not support publishing');
    }

    await this.send({ topic, message, timestamp: Date.now() });
  }
}