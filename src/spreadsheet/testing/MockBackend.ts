/**
 * MockBackend - Mock server and backend services for testing
 *
 * Provides:
 * - Mock WebSocket server
 * - Mock API endpoints
 * - Mock cache layer
 * - Request/response interception
 * - Latency simulation
 *
 * @module testing
 */

import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';

/**
 * Mock WebSocket message
 */
export interface MockWebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * Mock API response
 */
export interface MockApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  delay: number;
}

/**
 * Mock cache entry
 */
export interface MockCacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Mock backend configuration
 */
export interface MockBackendConfig {
  /** WebSocket port */
  wsPort?: number;
  /** API base URL */
  apiUrl?: string;
  /** Latency simulation range in ms */
  latencyRange?: [number, number];
  /** Error rate (0-1) */
  errorRate?: number;
  /** Cache TTL in ms */
  cacheTtl?: number;
  /** Enable request logging */
  logging?: boolean;
}

/**
 * Mock WebSocket server
 */
export class MockWebSocketServer extends EventEmitter {
  private clients: Set<WebSocket> = new Set();
  private messageHistory: MockWebSocketMessage[] = [];
  private latencyRange: [number, number];

  constructor(latencyRange: [number, number] = [0, 10]) {
    super();
    this.latencyRange = latencyRange;
  }

  /**
   * Simulate a client connecting
   */
  async connect(clientId: string): Promise<WebSocket> {
    const mockWs = {
      id: clientId,
      send: (data: string) => this.handleSend(data),
      on: (event: string, handler: Function) => {
        this.on(`client-${clientId}-${event}`, handler);
      },
      close: () => this.disconnect(clientId)
    } as unknown as WebSocket;

    this.clients.add(mockWs);
    this.emit('connection', mockWs);

    return mockWs;
  }

  /**
   * Disconnect a client
   */
  disconnect(clientId: string): void {
    const client = Array.from(this.clients).find(
      c => (c as any).id === clientId
    );
    if (client) {
      this.clients.delete(client);
      this.emit('disconnection', client);
    }
  }

  /**
   * Broadcast message to all clients
   */
  async broadcast(type: string, data: any): Promise<void> {
    const message: MockWebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    this.messageHistory.push(message);

    const latency = this.getRandomLatency();
    await this.delay(latency);

    this.clients.forEach(client => {
      this.emit(`client-${(client as any).id}-message`, JSON.stringify(message));
    });
  }

  /**
   * Send message to specific client
   */
  async sendTo(clientId: string, type: string, data: any): Promise<void> {
    const message: MockWebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    this.messageHistory.push(message);

    const latency = this.getRandomLatency();
    await this.delay(latency);

    this.emit(`client-${clientId}-message`, JSON.stringify(message));
  }

  /**
   * Get message history
   */
  getHistory(): MockWebSocketMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  private handleSend(data: string): void {
    try {
      const message = JSON.parse(data);
      this.emit('message', message);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private getRandomLatency(): number {
    const [min, max] = this.latencyRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock API server
 */
export class MockApiServer {
  private endpoints: Map<string, (data: any) => Promise<MockApiResponse>> = new Map();
  private requestHistory: Array<{
    method: string;
    path: string;
    data: any;
    timestamp: number;
  }> = [];
  private latencyRange: [number, number];
  private errorRate: number;
  private logging: boolean;

  constructor(config: MockBackendConfig) {
    this.latencyRange = config.latencyRange || [0, 50];
    this.errorRate = config.errorRate || 0;
    this.logging = config.logging || false;
  }

  /**
   * Register an endpoint handler
   */
  registerEndpoint(
    path: string,
    handler: (data: any) => Promise<MockApiResponse>
  ): void {
    this.endpoints.set(path, handler);
  }

  /**
   * Make a request to an endpoint
   */
  async request(method: string, path: string, data?: any): Promise<MockApiResponse> {
    const startTime = Date.now();

    // Log request
    this.requestHistory.push({
      method,
      path,
      data,
      timestamp: startTime
    });

    if (this.logging) {
      console.log(`[MockAPI] ${method} ${path}`, data);
    }

    // Simulate error
    if (Math.random() < this.errorRate) {
      await this.delay(this.getRandomLatency());
      return {
        status: 500,
        data: { error: 'Internal server error' },
        headers: {},
        delay: Date.now() - startTime
      };
    }

    // Get handler
    const handler = this.endpoints.get(path);
    if (!handler) {
      return {
        status: 404,
        data: { error: 'Not found' },
        headers: {},
        delay: Date.now() - startTime
      };
    }

    // Simulate latency
    await this.delay(this.getRandomLatency());

    // Execute handler
    const response = await handler(data);
    response.delay = Date.now() - startTime;

    if (this.logging) {
      console.log(`[MockAPI] Response ${response.status}`, response.data);
    }

    return response;
  }

  /**
   * Get request history
   */
  getRequestHistory(): Array<{
    method: string;
    path: string;
    data: any;
    timestamp: number;
  }> {
    return [...this.requestHistory];
  }

  /**
   * Clear request history
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * Setup common spreadsheet endpoints
   */
  setupSpreadsheetEndpoints(): void {
    // Get spreadsheet
    this.registerEndpoint('GET /api/spreadsheets/:id', async (data) => ({
      status: 200,
      data: {
        id: data.id,
        name: 'Test Spreadsheet',
        cells: {},
        createdAt: Date.now()
      },
      headers: { 'content-type': 'application/json' },
      delay: 0
    }));

    // Update cell
    this.registerEndpoint('PUT /api/cells/:id', async (data) => ({
      status: 200,
      data: {
        id: data.id,
        value: data.value,
        updatedAt: Date.now()
      },
      headers: { 'content-type': 'application/json' },
      delay: 0
    }));

    // Batch update
    this.registerEndpoint('POST /api/cells/batch', async (data) => ({
      status: 200,
      data: {
        updated: data.cells.length,
        results: data.cells.map((cell: any) => ({
          id: cell.id,
          success: true
        }))
      },
      headers: { 'content-type': 'application/json' },
      delay: 0
    }));
  }

  private getRandomLatency(): number {
    const [min, max] = this.latencyRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock cache layer
 */
export class MockCache {
  private cache: Map<string, MockCacheEntry> = new Map();
  private defaultTtl: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttl: number = 60000) {
    this.defaultTtl = ttl;
  }

  /**
   * Get value from cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: any, ttl?: number): void {
    this.cache.set(key, {
      key,
      value,
      ttl: ttl || this.defaultTtl,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Get all cache entries
   */
  getEntries(): MockCacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    return cleaned;
  }
}

/**
 * Mock backend - combines WebSocket, API, and cache
 */
export class MockBackend {
  public ws: MockWebSocketServer;
  public api: MockApiServer;
  public cache: MockCache;
  private config: MockBackendConfig;

  constructor(config: MockBackendConfig = {}) {
    this.config = {
      latencyRange: [0, 50],
      errorRate: 0,
      cacheTtl: 60000,
      logging: false,
      ...config
    };

    this.ws = new MockWebSocketServer(this.config.latencyRange);
    this.api = new MockApiServer(this.config);
    this.cache = new MockCache(this.config.cacheTtl);
  }

  /**
   * Start the mock backend
   */
  async start(): Promise<void> {
    if (this.config.logging) {
      console.log('[MockBackend] Starting...');
    }

    // Setup common endpoints
    this.api.setupSpreadsheetEndpoints();

    if (this.config.logging) {
      console.log('[MockBackend] Started');
    }
  }

  /**
   * Stop the mock backend
   */
  async stop(): Promise<void> {
    if (this.config.logging) {
      console.log('[MockBackend] Stopping...');
    }

    this.ws.clearHistory();
    this.api.clearHistory();
    this.cache.clear();

    if (this.config.logging) {
      console.log('[MockBackend] Stopped');
    }
  }

  /**
   * Reset all mock services
   */
  reset(): void {
    this.ws.clearHistory();
    this.api.clearHistory();
    this.cache.clear();
  }

  /**
   * Get combined statistics
   */
  getStats(): {
    websocket: {
      clientCount: number;
      messageCount: number;
    };
    api: {
      requestCount: number;
      endpoints: number;
    };
    cache: {
      size: number;
      hitRate: number;
    };
  } {
    return {
      websocket: {
        clientCount: this.ws.getClientCount(),
        messageCount: this.ws.getHistory().length
      },
      api: {
        requestCount: this.api.getRequestHistory().length,
        endpoints: (this.api as any).endpoints.size
      },
      cache: {
        size: this.cache.getStats().size,
        hitRate: this.cache.getStats().hitRate
      }
    };
  }
}

/**
 * Create a configured mock backend instance
 *
 * @param config - Backend configuration
 * @returns Mock backend instance
 *
 * @example
 * ```typescript
 * const backend = createMockBackend({
 *   latencyRange: [10, 100],
 *   errorRate: 0.01,
 *   logging: true
 * });
 * await backend.start();
 * ```
 */
export function createMockBackend(config: MockBackendConfig = {}): MockBackend {
  return new MockBackend(config);
}
