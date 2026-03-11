/**
 * APIInstance - Implementation for external API integration instances
 *
 * Represents connections to external APIs that can make requests,
 * handle responses, manage authentication, and cache results.
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, ValidationResult
} from '../types/base';

/**
 * HTTPMethod - Supported HTTP methods
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * AuthenticationType - Supported authentication types
 */
export enum AuthenticationType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  OAUTH2 = 'oauth2',
  AWS_SIGV4 = 'aws_sigv4'
}

/**
 * CachePolicy - Cache policy for API responses
 */
export interface CachePolicy {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in MB
  strategy: 'memory' | 'disk' | 'hybrid';
  invalidateOnWrite: boolean;
}

/**
 * RateLimit - Rate limiting configuration
 */
export interface RateLimit {
  enabled: boolean;
  requestsPerSecond: number;
  burstCapacity: number;
  strategy: 'fixed_window' | 'sliding_window' | 'token_bucket';
}

/**
 * RetryPolicy - Retry policy for failed requests
 */
export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffFactor: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

/**
 * RequestConfig - Configuration for API requests
 */
export interface RequestConfig {
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: any;
  timeout: number; // Timeout in milliseconds
  followRedirects: boolean;
  validateSSL: boolean;
}

/**
 * ResponseData - API response data
 */
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number; // Response time in milliseconds
  size: number; // Response size in bytes
  cached: boolean;
  timestamp: number;
}

/**
 * EndpointDefinition - API endpoint definition
 */
export interface EndpointDefinition {
  name: string;
  path: string;
  method: HTTPMethod;
  description: string;
  parameters: EndpointParameter[];
  responseSchema?: any;
  exampleRequest?: any;
  exampleResponse?: any;
}

/**
 * EndpointParameter - Parameter for API endpoint
 */
export interface EndpointParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  location: 'query' | 'header' | 'path' | 'body';
  description: string;
  defaultValue?: any;
  validation?: ParameterValidation;
}

/**
 * ParameterValidation - Parameter validation rules
 */
export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
}

/**
 * APIMetrics - API-specific metrics
 */
export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  rateLimitHits: number;
  errorRate: number;
  throughput: number; // Requests per second
}

/**
 * AuthenticationConfig - Authentication configuration
 */
export interface AuthenticationConfig {
  type: AuthenticationType;
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  scope?: string[];
  awsRegion?: string;
  awsService?: string;
}

/**
 * APIInstance - Interface for API instances
 */
export interface APIInstance {
  type: InstanceType.API;

  // API-specific properties
  baseUrl: string;
  endpoints: EndpointDefinition[];
  authentication: AuthenticationConfig;
  cachePolicy: CachePolicy;
  rateLimit: RateLimit;
  retryPolicy: RetryPolicy;
  defaultHeaders: Record<string, string>;

  // API operations
  request(config: RequestConfig): Promise<ResponseData>;
  get(endpoint: string, params?: Record<string, any>): Promise<ResponseData>;
  post(endpoint: string, data?: any): Promise<ResponseData>;
  put(endpoint: string, data?: any): Promise<ResponseData>;
  delete(endpoint: string): Promise<ResponseData>;

  // Endpoint management
  addEndpoint(endpoint: EndpointDefinition): void;
  removeEndpoint(name: string): void;
  updateEndpoint(name: string, updates: Partial<EndpointDefinition>): void;

  // Authentication management
  authenticate(config: AuthenticationConfig): Promise<void>;
  refreshToken(): Promise<void>;
  invalidateAuthentication(): void;

  // Cache management
  clearCache(): Promise<void>;
  getCacheStats(): { size: number; hits: number; misses: number };

  // Monitoring
  getMetrics(): APIMetrics;
  getHealth(): { healthy: boolean; issues: string[] };
}

/**
 * ConcreteAPIInstance - Implementation of APIInstance
 */
export class ConcreteAPIInstance extends BaseSuperInstance implements APIInstance {
  type = InstanceType.API;
  baseUrl: string;
  endpoints: EndpointDefinition[] = [];
  authentication: AuthenticationConfig;
  cachePolicy: CachePolicy;
  rateLimit: RateLimit;
  retryPolicy: RetryPolicy;
  defaultHeaders: Record<string, string> = {};

  private connections: Map<string, Connection> = new Map();
  private children: SuperInstance[] = [];
  private parents: SuperInstance[] = [];
  private cache: Map<string, { data: ResponseData; expires: number }> = new Map();
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    rateLimitHits: 0,
    errorRate: 0,
    throughput: 0
  };
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    baseUrl: string;
    authentication?: AuthenticationConfig;
    cachePolicy?: Partial<CachePolicy>;
    rateLimit?: Partial<RateLimit>;
    retryPolicy?: Partial<RetryPolicy>;
    defaultHeaders?: Record<string, string>;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.API,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['network', 'computation', 'communication', 'storage']
    });

    this.baseUrl = config.baseUrl;
    this.authentication = config.authentication || { type: AuthenticationType.NONE };
    this.cachePolicy = {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 100, // 100MB
      strategy: 'memory',
      invalidateOnWrite: true,
      ...config.cachePolicy
    };
    this.rateLimit = {
      enabled: false,
      requestsPerSecond: 10,
      burstCapacity: 20,
      strategy: 'fixed_window',
      ...config.rateLimit
    };
    this.retryPolicy = {
      enabled: true,
      maxRetries: 3,
      backoffFactor: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'],
      ...config.retryPolicy
    };
    this.defaultHeaders = config.defaultHeaders || {
      'Content-Type': 'application/json',
      'User-Agent': 'SuperInstance-API/1.0.0'
    };
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    const validation = this.validateConfiguration(this.configuration);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Initialize authentication if provided
    if (this.authentication.type !== AuthenticationType.NONE) {
      await this.initializeAuthentication();
    }

    this.updateState(InstanceState.INITIALIZED);
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }
    this.updateState(InstanceState.RUNNING);
  }

  async deactivate(): Promise<void> {
    if (this.state !== InstanceState.RUNNING && this.state !== InstanceState.PROCESSING) {
      throw new Error(`Cannot deactivate from state: ${this.state}`);
    }
    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    // Clean up connections
    this.connections.clear();
    this.children = [];
    this.parents = [];

    // Clear cache
    this.cache.clear();

    // Reset metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      errorRate: 0,
      throughput: 0
    };

    this.updateState(InstanceState.TERMINATED);
  }

  async serialize(): Promise<InstanceSnapshot> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        baseUrl: this.baseUrl,
        endpoints: this.endpoints,
        authentication: this.redactSensitiveData(this.authentication),
        cachePolicy: this.cachePolicy,
        rateLimit: this.rateLimit,
        retryPolicy: this.retryPolicy,
        defaultHeaders: this.defaultHeaders,
        metrics: this.metrics
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.API) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into APIInstance`);
    }

    const data = snapshot.data;
    this.baseUrl = data.baseUrl;
    this.endpoints = data.endpoints || [];
    this.authentication = data.authentication || { type: AuthenticationType.NONE };
    this.cachePolicy = data.cachePolicy || this.cachePolicy;
    this.rateLimit = data.rateLimit || this.rateLimit;
    this.retryPolicy = data.retryPolicy || this.retryPolicy;
    this.defaultHeaders = data.defaultHeaders || this.defaultHeaders;
    this.metrics = data.metrics || this.metrics;

    this.configuration = snapshot.configuration;
    this.updateState(snapshot.state as InstanceState);
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);
      return {
        messageId: message.id,
        status: 'success',
        payload: { received: true, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'MESSAGE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          context: { messageType: message.type }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    switch (message.type) {
      case 'data':
        await this.handleDataMessage(message);
        break;
      case 'command':
        await this.handleCommandMessage(message);
        break;
      case 'query':
        await this.handleQueryMessage(message);
        break;
      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }

  async getStatus(): Promise<InstanceStatus> {
    const health = this.getHealth();
    return {
      state: this.state,
      health: health.healthy ? 'healthy' : 'unhealthy',
      uptime: Date.now() - this.createdAt,
      warnings: health.issues,
      lastError: undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const apiMetrics = this.getMetrics();
    return {
      cpuUsage: 0, // API instances typically don't use much CPU
      memoryUsage: this.calculateMemoryUsage(),
      diskUsage: 0,
      networkIn: 0, // Would track actual network usage in production
      networkOut: 0,
      requestCount: apiMetrics.totalRequests,
      errorRate: apiMetrics.errorRate,
      latency: {
        p50: apiMetrics.averageResponseTime,
        p90: apiMetrics.averageResponseTime * 1.5,
        p95: apiMetrics.averageResponseTime * 2,
        p99: apiMetrics.averageResponseTime * 3,
        max: apiMetrics.averageResponseTime * 5
      }
    };
  }

  async getChildren(): Promise<SuperInstance[]> {
    return [...this.children];
  }

  async getParents(): Promise<SuperInstance[]> {
    return [...this.parents];
  }

  async getNeighbors(): Promise<SuperInstance[]> {
    // In a real implementation, this would query the spreadsheet for neighboring cells
    return [];
  }

  async connectTo(target: SuperInstance, connectionType: ConnectionType): Promise<Connection> {
    const connection: Connection = {
      id: `${this.id}-${target.id}-${Date.now()}`,
      source: this.id,
      target: target.id,
      type: connectionType,
      bandwidth: 1000, // 1 Gbps
      latency: 10, // 10ms
      reliability: 0.99,
      establishedAt: Date.now()
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  async disconnectFrom(target: SuperInstance): Promise<void> {
    for (const [id, connection] of this.connections) {
      if (connection.target === target.id) {
        this.connections.delete(id);
        break;
      }
    }
  }

  // APIInstance specific methods

  async request(config: RequestConfig): Promise<ResponseData> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(config);

    // Check cache first
    if (this.cachePolicy.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.metrics.cacheHitRate = (this.metrics.cacheHitRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
        return {
          ...cached.data,
          cached: true,
          timestamp: Date.now()
        };
      }
    }

    // Apply rate limiting
    if (this.rateLimit.enabled) {
      await this.applyRateLimit();
    }

    // Make the request with retry logic
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= (this.retryPolicy.enabled ? this.retryPolicy.maxRetries : 0); attempt++) {
      try {
        const response = await this.makeRequest(config);
        const duration = Date.now() - startTime;

        const responseData: ResponseData = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          duration,
          size: this.calculateResponseSize(response),
          cached: false,
          timestamp: Date.now()
        };

        // Update metrics
        this.updateMetrics(responseData, true);

        // Cache the response if successful
        if (this.cachePolicy.enabled && response.status >= 200 && response.status < 300) {
          this.cache.set(cacheKey, {
            data: responseData,
            expires: Date.now() + this.cachePolicy.ttl
          });
          this.enforceCacheSizeLimit();
        }

        return responseData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if we should retry
        if (attempt < (this.retryPolicy.enabled ? this.retryPolicy.maxRetries : 0) &&
            this.shouldRetry(error, config)) {
          const backoff = Math.pow(this.retryPolicy.backoffFactor, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        break;
      }
    }

    // Update metrics for failure
    this.updateMetrics({
      status: 0,
      statusText: 'Request failed',
      headers: {},
      data: null,
      duration: Date.now() - startTime,
      size: 0,
      cached: false,
      timestamp: Date.now()
    }, false);

    throw lastError || new Error('API request failed');
  }

  async get(endpoint: string, params?: Record<string, any>): Promise<ResponseData> {
    const config: RequestConfig = {
      method: HTTPMethod.GET,
      url: this.buildUrl(endpoint),
      headers: { ...this.defaultHeaders },
      queryParams: params || {},
      timeout: 30000,
      followRedirects: true,
      validateSSL: true
    };

    return this.request(config);
  }

  async post(endpoint: string, data?: any): Promise<ResponseData> {
    const config: RequestConfig = {
      method: HTTPMethod.POST,
      url: this.buildUrl(endpoint),
      headers: { ...this.defaultHeaders },
      queryParams: {},
      body: data,
      timeout: 30000,
      followRedirects: true,
      validateSSL: true
    };

    return this.request(config);
  }

  async put(endpoint: string, data?: any): Promise<ResponseData> {
    const config: RequestConfig = {
      method: HTTPMethod.PUT,
      url: this.buildUrl(endpoint),
      headers: { ...this.defaultHeaders },
      queryParams: {},
      body: data,
      timeout: 30000,
      followRedirects: true,
      validateSSL: true
    };

    return this.request(config);
  }

  async delete(endpoint: string): Promise<ResponseData> {
    const config: RequestConfig = {
      method: HTTPMethod.DELETE,
      url: this.buildUrl(endpoint),
      headers: { ...this.defaultHeaders },
      queryParams: {},
      timeout: 30000,
      followRedirects: true,
      validateSSL: true
    };

    return this.request(config);
  }

  addEndpoint(endpoint: EndpointDefinition): void {
    const existingIndex = this.endpoints.findIndex(e => e.name === endpoint.name);
    if (existingIndex >= 0) {
      this.endpoints[existingIndex] = endpoint;
    } else {
      this.endpoints.push(endpoint);
    }
  }

  removeEndpoint(name: string): void {
    this.endpoints = this.endpoints.filter(e => e.name !== name);
  }

  updateEndpoint(name: string, updates: Partial<EndpointDefinition>): void {
    const endpoint = this.endpoints.find(e => e.name === name);
    if (endpoint) {
      Object.assign(endpoint, updates);
    }
  }

  async authenticate(config: AuthenticationConfig): Promise<void> {
    this.authentication = config;
    await this.initializeAuthentication();
  }

  async refreshToken(): Promise<void> {
    if (this.authentication.type === AuthenticationType.OAUTH2 &&
        this.authentication.refreshToken &&
        this.authentication.tokenUrl) {
      // Implement OAuth2 token refresh
      const response = await this.makeRequest({
        method: HTTPMethod.POST,
        url: this.authentication.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        queryParams: {},
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.authentication.refreshToken,
          client_id: this.authentication.clientId || '',
          client_secret: this.authentication.clientSecret || ''
        }).toString(),
        timeout: 10000,
        followRedirects: false,
        validateSSL: true
      });

      if (response.data.access_token) {
        this.authentication.accessToken = response.data.access_token;
        if (response.data.refresh_token) {
          this.authentication.refreshToken = response.data.refresh_token;
        }
      }
    }
  }

  invalidateAuthentication(): void {
    this.authentication = { type: AuthenticationType.NONE };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hits: number; misses: number } {
    const hits = this.metrics.totalRequests * this.metrics.cacheHitRate;
    const misses = this.metrics.totalRequests - hits;
    return {
      size: this.cache.size,
      hits: Math.round(hits),
      misses: Math.round(misses)
    };
  }

  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  getHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if base URL is reachable (simplified check)
    if (!this.baseUrl || !this.baseUrl.startsWith('http')) {
      issues.push('Invalid base URL');
    }

    // Check authentication if required
    if (this.authentication.type !== AuthenticationType.NONE) {
      switch (this.authentication.type) {
        case AuthenticationType.API_KEY:
          if (!this.authentication.apiKey) issues.push('Missing API key');
          break;
        case AuthenticationType.BEARER_TOKEN:
          if (!this.authentication.bearerToken) issues.push('Missing bearer token');
          break;
        case AuthenticationType.OAUTH2:
          if (!this.authentication.accessToken) issues.push('Missing OAuth2 access token');
          break;
      }
    }

    // Check rate limit status
    if (this.rateLimit.enabled && this.metrics.rateLimitHits > 10) {
      issues.push('High rate limit hits detected');
    }

    // Check error rate
    if (this.metrics.errorRate > 0.1) {
      issues.push('High error rate detected');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Private helper methods

  private async initializeAuthentication(): Promise<void> {
    // Initialize authentication based on type
    switch (this.authentication.type) {
      case AuthenticationType.API_KEY:
        if (this.authentication.apiKey) {
          this.defaultHeaders['X-API-Key'] = this.authentication.apiKey;
        }
        break;
      case AuthenticationType.BEARER_TOKEN:
        if (this.authentication.bearerToken) {
          this.defaultHeaders['Authorization'] = `Bearer ${this.authentication.bearerToken}`;
        }
        break;
      case AuthenticationType.BASIC_AUTH:
        if (this.authentication.username && this.authentication.password) {
          const credentials = btoa(`${this.authentication.username}:${this.authentication.password}`);
          this.defaultHeaders['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case AuthenticationType.OAUTH2:
        if (this.authentication.accessToken) {
          this.defaultHeaders['Authorization'] = `Bearer ${this.authentication.accessToken}`;
        }
        break;
      // AWS SigV4 would require more complex signing logic
    }
  }

  private async makeRequest(config: RequestConfig): Promise<any> {
    // This is a simplified implementation
    // In production, this would use fetch, axios, or similar
    const url = new URL(config.url);

    // Add query parameters
    Object.entries(config.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    // Prepare headers
    const headers = new Headers(config.headers);

    // Add authentication headers if not already present
    if (this.authentication.type !== AuthenticationType.NONE) {
      for (const [key, value] of Object.entries(this.defaultHeaders)) {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      }
    }

    // Prepare request options
    const options: RequestInit = {
      method: config.method,
      headers,
      redirect: config.followRedirects ? 'follow' : 'manual'
    };

    // Add body for methods that support it
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      if (typeof config.body === 'string') {
        options.body = config.body;
      } else {
        options.body = JSON.stringify(config.body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }

    // Make the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private generateCacheKey(config: RequestConfig): string {
    // Generate a cache key based on request parameters
    const keyParts = [
      config.method,
      config.url,
      JSON.stringify(config.queryParams),
      JSON.stringify(config.body)
    ];
    return keyParts.join('|');
  }

  private async applyRateLimit(): Promise<void> {
    if (!this.rateLimit.enabled) return;

    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    // Simple fixed window rate limiting
    // In production, use a more sophisticated algorithm
    if (this.lastRequestTime > windowStart) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      const requestsInWindow = Math.floor(1000 / this.rateLimit.requestsPerSecond);

      if (timeSinceLastRequest < 1000 / this.rateLimit.requestsPerSecond) {
        this.metrics.rateLimitHits++;
        await new Promise(resolve => setTimeout(resolve, 1000 / this.rateLimit.requestsPerSecond - timeSinceLastRequest));
      }
    }

    this.lastRequestTime = now;
  }

  private shouldRetry(error: any, config: RequestConfig): boolean {
    if (!this.retryPolicy.enabled) return false;

    // Check if error is in retryable errors list
    if (error instanceof Error) {
      for (const retryableError of this.retryPolicy.retryableErrors) {
        if (error.message.includes(retryableError)) {
          return true;
        }
      }
    }

    // Check if response status is retryable
    if (error.status && this.retryPolicy.retryableStatusCodes.includes(error.status)) {
      return true;
    }

    return false;
  }

  private updateMetrics(response: ResponseData, success: boolean): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const oldTotal = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (oldTotal + response.duration) / this.metrics.totalRequests;

    // Update error rate
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;

    // Update throughput (requests per second over last minute)
    const now = Date.now();
    const windowStart = now - 60000;
    // Simplified - in production, track timestamps of recent requests
    this.metrics.throughput = this.metrics.totalRequests / ((now - this.createdAt) / 1000);
  }

  private calculateResponseSize(response: any): number {
    if (!response.data) return 0;

    if (typeof response.data === 'string') {
      return new TextEncoder().encode(response.data).length;
    }

    try {
      return new TextEncoder().encode(JSON.stringify(response.data)).length;
    } catch {
      return 1024; // Default size
    }
  }

  private calculateMemoryUsage(): number {
    // Calculate memory usage based on cache size and other data
    let totalSize = 0;

    // Cache size
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // UTF-16 string size
      totalSize += this.calculateResponseSize(value.data);
    }

    // Endpoints and configuration
    totalSize += JSON.stringify(this.endpoints).length * 2;
    totalSize += JSON.stringify(this.authentication).length * 2;

    return totalSize / 1024 / 1024; // Convert to MB
  }

  private enforceCacheSizeLimit(): void {
    if (!this.cachePolicy.enabled || this.cachePolicy.maxSize <= 0) return;

    let totalSize = 0;
    const entries: Array<[string, { data: ResponseData; expires: number }]> = [];

    for (const [key, value] of this.cache) {
      const size = this.calculateResponseSize(value.data) + key.length * 2;
      totalSize += size;
      entries.push([key, value]);
    }

    // Sort by expiration time (oldest first)
    entries.sort((a, b) => a[1].expires - b[1].expires);

    // Remove oldest entries until under limit
    while (totalSize > this.cachePolicy.maxSize * 1024 * 1024 && entries.length > 0) {
      const [key, value] = entries.shift()!;
      const size = this.calculateResponseSize(value.data) + key.length * 2;
      totalSize -= size;
      this.cache.delete(key);
    }
  }

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${path}`;
  }

  private redactSensitiveData(auth: AuthenticationConfig): AuthenticationConfig {
    // Redact sensitive data for serialization
    const redacted = { ...auth };

    if (redacted.apiKey) redacted.apiKey = '[REDACTED]';
    if (redacted.bearerToken) redacted.bearerToken = '[REDACTED]';
    if (redacted.password) redacted.password = '[REDACTED]';
    if (redacted.clientSecret) redacted.clientSecret = '[REDACTED]';
    if (redacted.accessToken) redacted.accessToken = '[REDACTED]';
    if (redacted.refreshToken) redacted.refreshToken = '[REDACTED]';

    return redacted;
  }

  private handleDataMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.config) {
      // Handle API configuration updates
      if (payload.config.baseUrl) {
        this.baseUrl = payload.config.baseUrl;
      }
      if (payload.config.authentication) {
        this.authenticate(payload.config.authentication);
      }
      if (payload.config.endpoints) {
        this.endpoints = payload.config.endpoints;
      }
    }
  }

  private handleCommandMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.command) {
      switch (payload.command) {
        case 'clear_cache':
          this.clearCache();
          break;
        case 'refresh_token':
          this.refreshToken();
          break;
        case 'add_endpoint':
          if (payload.endpoint) {
            this.addEndpoint(payload.endpoint);
          }
          break;
        case 'remove_endpoint':
          if (payload.name) {
            this.removeEndpoint(payload.name);
          }
          break;
      }
    }
  }

  private handleQueryMessage(message: InstanceMessage): void {
    const { payload } = message;

    if (payload && payload.query) {
      // Handle API queries
      console.log(`Processing API query: ${JSON.stringify(payload.query)}`);
    }
  }
}