/**
 * Claw API Client
 *
 * Production-ready API client with retry logic, connection pooling,
 * and comprehensive error handling for Claw agent integration.
 *
 * @module agent-ai/api/claw-api
 */

import {
  ClawConfig,
  CreateAgentRequest,
  CreateAgentResponse,
  QueryRequest,
  QueryResponse,
  AgentStatus,
  CancelAgentRequest,
  CancelAgentResponse,
  APIError,
  RetryConfig,
  ConnectionPoolConfig
} from './claw-types';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN']
};

/**
 * Default connection pool configuration
 */
const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 30000,
  idleTimeout: 60000,
  maxLifetime: 300000
};

/**
 * Connection pool entry
 */
interface PoolEntry {
  id: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

/**
 * Claw API Client
 */
export class ClawAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private retryConfig: RetryConfig;
  private poolConfig: ConnectionPoolConfig;
  private connectionPool: Map<string, PoolEntry>;
  private requestInterceptors: Array<(request: RequestInit) => RequestInit>;
  private responseInterceptors: Array<(response: Response) => Response>;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    retries: number;
    averageResponseTime: number;
  };

  /**
   * Create a new Claw API client
   */
  constructor(config: {
    baseUrl: string;
    apiKey: string;
    retryConfig?: Partial<RetryConfig>;
    poolConfig?: Partial<ConnectionPoolConfig>;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
    this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...config.poolConfig };
    this.connectionPool = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retries: 0,
      averageResponseTime: 0
    };

    // Initialize connection pool
    this.initializePool();
  }

  /**
   * Initialize connection pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.poolConfig.minConnections; i++) {
      const entry: PoolEntry = {
        id: `pool-${i}`,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: false
      };
      this.connectionPool.set(entry.id, entry);
    }
  }

  /**
   * Acquire connection from pool
   */
  private acquireConnection(): PoolEntry | null {
    const now = Date.now();

    // Clean up expired connections
    for (const [id, entry] of this.connectionPool) {
      const age = now - entry.createdAt;
      const idle = now - entry.lastUsed;

      if (age > this.poolConfig.maxLifetime || idle > this.poolConfig.idleTimeout) {
        this.connectionPool.delete(id);
      }
    }

    // Find available connection
    for (const [id, entry] of this.connectionPool) {
      if (!entry.inUse) {
        entry.inUse = true;
        entry.lastUsed = now;
        return entry;
      }
    }

    // Create new connection if under max
    if (this.connectionPool.size < this.poolConfig.maxConnections) {
      const entry: PoolEntry = {
        id: `pool-${Date.now()}`,
        createdAt: now,
        lastUsed: now,
        inUse: true
      };
      this.connectionPool.set(entry.id, entry);
      return entry;
    }

    return null;
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(entry: PoolEntry): void {
    entry.inUse = false;
    entry.lastUsed = Date.now();
  }

  /**
   * Add request interceptor
   */
  public addRequestInterceptor(
    interceptor: (request: RequestInit) => RequestInit
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  public addResponseInterceptor(
    interceptor: (response: Response) => Response
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Acquire connection
        const connection = this.acquireConnection();
        if (!connection) {
          throw new Error('No available connections in pool');
        }

        try {
          // Build request
          let requestInit: RequestInit = {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              ...options.headers
            }
          };

          // Apply request interceptors
          for (const interceptor of this.requestInterceptors) {
            requestInit = interceptor(requestInit);
          }

          // Make request
          const url = `${this.baseUrl}${endpoint}`;
          const response = await fetch(url, requestInit);

          // Apply response interceptors
          let processedResponse = response;
          for (const interceptor of this.responseInterceptors) {
            processedResponse = interceptor(processedResponse);
          }

          // Handle errors
          if (!processedResponse.ok) {
            const errorData = await processedResponse.json().catch(() => ({}));
            throw this.createAPIError(processedResponse.status, errorData);
          }

          // Parse response
          const data = await processedResponse.json();

          // Update metrics
          const responseTime = Date.now() - startTime;
          this.metrics.totalRequests++;
          this.metrics.successfulRequests++;
          this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
              responseTime) /
            this.metrics.totalRequests;

          return data;
        } finally {
          // Release connection
          this.releaseConnection(connection);
        }
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Increment retry counter
        this.metrics.retries++;

        // Wait before retry
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelay
        );
      }
    }

    // All retries failed
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    // Check if error code is in retryable list
    if ('code' in error && typeof error.code === 'string') {
      return this.retryConfig.retryableErrors.includes(error.code);
    }

    // Check if it's a network error
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset')
    );
  }

  /**
   * Create API error
   */
  private createAPIError(statusCode: number, data: any): APIError {
    return {
      message: data.message || 'Request failed',
      code: data.code || 'API_ERROR',
      statusCode,
      details: data.details
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a new Claw agent
   */
  async createAgent(request: CreateAgentRequest): Promise<CreateAgentResponse> {
    return this.request<CreateAgentResponse>('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Query a Claw agent
   */
  async queryAgent(request: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>(`/api/v1/agents/${request.agentId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query: request.query, context: request.context })
    });
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    return this.request<AgentStatus>(`/api/v1/agents/${agentId}/status`);
  }

  /**
   * Cancel an agent
   */
  async cancelAgent(request: CancelAgentRequest): Promise<CancelAgentResponse> {
    return this.request<CancelAgentResponse>(`/api/v1/agents/${request.agentId}`, {
      method: 'DELETE',
      body: JSON.stringify(request)
    });
  }

  /**
   * List all agents
   */
  async listAgents(sheetId?: string): Promise<AgentStatus[]> {
    const params = sheetId ? `?sheetId=${sheetId}` : '';
    return this.request<AgentStatus[]>(`/api/v1/agents${params}`);
  }

  /**
   * Get client metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retries: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get connection pool stats
   */
  getPoolStats() {
    const active = Array.from(this.connectionPool.values()).filter(e => e.inUse)
      .length;
    const idle = this.connectionPool.size - active;

    return {
      total: this.connectionPool.size,
      active,
      idle,
      maxConnections: this.poolConfig.maxConnections,
      minConnections: this.poolConfig.minConnections
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    this.connectionPool.clear();
  }
}

/**
 * Create a default Claw API client
 */
export function createClawAPIClient(apiKey: string, baseUrl?: string): ClawAPIClient {
  return new ClawAPIClient({
    baseUrl: baseUrl || 'https://api.claw.superinstance.ai',
    apiKey
  });
}
