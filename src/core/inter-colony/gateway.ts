/**
 * Inter-Colony Gateway
 * Gateway for external systems to access colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  GatewayConfig,
  RoutingConfig,
  RoutingRule,
  InterColonyMessage,
} from '../colony-manager/types.js';
import { ColonyBroadcast } from './broadcast.js';
import { MessageFactory } from './protocol.js';
import { ColonyBridge } from './bridge.js';

export interface GatewayRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

export interface GatewayResponse {
  id: string;
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
  duration: number;
}

export interface GatewayStats {
  requestsReceived: number;
  requestsProcessed: number;
  requestsFailed: number;
  avgResponseTime: number;
  rateLimitHits: number;
  authenticationFailures: number;
}

export class ColonyGateway extends EventEmitter {
  public readonly id: string;
  public readonly config: GatewayConfig;
  private broadcast: ColonyBroadcast;
  private stats: GatewayStats;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: GatewayConfig) {
    super();

    this.id = config.id;
    this.config = config;

    this.broadcast = new ColonyBroadcast();
    this.initializeBridges();

    this.stats = {
      requestsReceived: 0,
      requestsProcessed: 0,
      requestsFailed: 0,
      avgResponseTime: 0,
      rateLimitHits: 0,
      authenticationFailures: 0,
    };

    // Start rate limit cleanup
    setInterval(() => this.cleanupRateLimits(), 60000);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeBridges(): void {
    // Create bridges to all configured colonies
    for (const colonyId of this.config.colonies) {
      const bridge = new ColonyBridge({
        sourceColonyId: this.id,
        targetColonyId: colonyId,
        protocol: 'direct',
        bufferSize: 1000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000,
          exponentialBackoff: true,
        },
        compression: false,
        encryption: this.config.authentication.enabled,
      });

      this.broadcast.addBridge(bridge);
    }
  }

  // ============================================================================
  // Request Handling
  // ============================================================================

  /**
   * Handle an incoming request
   */
  async handleRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();

    // Update stats
    this.stats.requestsReceived++;

    try {
      // Check authentication
      if (!this.authenticate(request)) {
        this.stats.authenticationFailures++;
        return this.createErrorResponse(request.id, 401, 'Unauthorized', startTime);
      }

      // Check rate limit
      if (!this.checkRateLimit(request)) {
        this.stats.rateLimitHits++;
        return this.createErrorResponse(request.id, 429, 'Too Many Requests', startTime);
      }

      // Route request
      const targetColonyId = this.routeRequest(request);
      if (!targetColonyId) {
        return this.createErrorResponse(request.id, 404, 'Colony not found', startTime);
      }

      // Forward to colony
      const response = await this.forwardToColony(targetColonyId, request);

      // Update stats
      this.stats.requestsProcessed++;
      const duration = Date.now() - startTime;
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (this.stats.requestsProcessed - 1) + duration) /
        this.stats.requestsProcessed;

      return response;
    } catch (error) {
      this.stats.requestsFailed++;
      this.emit('error', error);
      return this.createErrorResponse(
        request.id,
        500,
        error instanceof Error ? error.message : 'Internal server error',
        startTime
      );
    }
  }

  /**
   * Route request to target colony
   */
  private routeRequest(request: GatewayRequest): string | null {
    const routing = this.config.routing;

    switch (routing.strategy) {
      case 'path_based':
        return this.routeByPath(request.path, routing.rules);
      case 'header_based':
        return this.routeByHeader(request.headers, routing.rules);
      case 'weight_based':
        return this.routeByWeight(routing.rules);
      case 'specialization_based':
        return this.routeBySpecialization(request, routing.rules);
      default:
        return this.config.colonies[0] || null;
    }
  }

  private routeByPath(path: string, rules: RoutingRule[]): string | null {
    for (const rule of rules) {
      if (path.match(rule.pattern)) {
        return rule.targetColonyId || this.selectBySpecialization(rule.targetSpecialization);
      }
    }
    return this.config.colonies[0] || null;
  }

  private routeByHeader(headers: Record<string, string>, rules: RoutingRule[]): string | null {
    for (const rule of rules) {
      for (const [key, value] of Object.entries(headers)) {
        if (key.match(rule.pattern) && headers[key] === value) {
          return rule.targetColonyId || this.selectBySpecialization(rule.targetSpecialization);
        }
      }
    }
    return this.config.colonies[0] || null;
  }

  private routeByWeight(rules: RoutingRule[]): string | null {
    const weightedRules = rules.filter(r => r.weight !== undefined);
    if (weightedRules.length === 0) {
      return this.config.colonies[0] || null;
    }

    const totalWeight = weightedRules.reduce((sum, r) => sum + (r.weight || 0), 0);
    let random = Math.random() * totalWeight;

    for (const rule of weightedRules) {
      random -= rule.weight || 0;
      if (random <= 0) {
        return rule.targetColonyId || this.selectBySpecialization(rule.targetSpecialization);
      }
    }

    return this.config.colonies[0] || null;
  }

  private routeBySpecialization(request: GatewayRequest, rules: RoutingRule[]): string | null {
    // Extract required specialization from request
    // This is a simplified implementation
    const requiredSpecialization = request.headers['X-Colony-Specialization'] as string;

    if (!requiredSpecialization) {
      return this.config.colonies[0] || null;
    }

    return this.selectBySpecialization(requiredSpecialization);
  }

  private selectBySpecialization(specialization?: string): string | null {
    if (!specialization) {
      return this.config.colonies[Math.floor(Math.random() * this.config.colonies.length)];
    }

    // In a real implementation, would query colonies for their specializations
    // For now, return first colony
    return this.config.colonies[0] || null;
  }

  /**
   * Forward request to colony
   */
  private async forwardToColony(
    colonyId: string,
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    const bridge = this.broadcast.getBridge(colonyId);
    if (!bridge) {
      throw new Error(`No bridge to colony: ${colonyId}`);
    }

    // Create message
    const message = MessageFactory.create(
      this.id,
      colonyId,
      'GATEWAY_REQUEST' as any,
      {
        method: request.method,
        path: request.path,
        headers: request.headers,
        body: request.body,
      },
      {
        priority: 0.7,
        timeout: 30000,
        requiresAck: true,
      }
    );

    try {
      const response = await bridge.send(message);

      return {
        id: uuidv4(),
        statusCode: response.success ? 200 : 500,
        headers: {},
        body: response.payload,
        timestamp: Date.now(),
        duration: response.timestamp - request.timestamp,
      };
    } catch (error) {
      throw new Error(`Failed to forward request: ${error}`);
    }
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  private authenticate(request: GatewayRequest): boolean {
    if (!this.config.authentication.enabled) {
      return true;
    }

    const authHeader = request.headers['authorization'];

    switch (this.config.authentication.type) {
      case 'jwt':
        return this.authenticateJWT(authHeader);
      case 'api_key':
        return this.authenticateApiKey(authHeader);
      case 'oauth':
        return this.authenticateOAuth(authHeader);
      case 'none':
      default:
        return true;
    }
  }

  private authenticateJWT(authHeader: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    // In a real implementation, would validate JWT signature and claims
    return token.length > 0;
  }

  private authenticateApiKey(authHeader: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith('ApiKey ')) {
      return false;
    }

    const apiKey = authHeader.substring(7);
    // In a real implementation, would validate against stored API keys
    return apiKey === this.config.authentication.secret;
  }

  private authenticateOAuth(authHeader: string | undefined): boolean {
    // Simplified OAuth validation
    return authHeader !== undefined;
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  private checkRateLimit(request: GatewayRequest): boolean {
    if (!this.config.rateLimit.enabled) {
      return true;
    }

    const clientId = this.extractClientId(request);
    const now = Date.now();

    let limit = this.rateLimitMap.get(clientId);

    if (!limit || now > limit.resetTime) {
      limit = {
        count: 0,
        resetTime: now + 60000, // 1 minute window
      };
      this.rateLimitMap.set(clientId, limit);
    }

    limit.count++;

    return limit.count <= this.config.rateLimit.requestsPerMinute;
  }

  private extractClientId(request: GatewayRequest): string {
    // Extract client ID from request (IP address, API key, etc.)
    return request.headers['x-forwarded-for'] as string ||
           request.headers['x-client-id'] as string ||
           'anonymous';
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [clientId, limit] of this.rateLimitMap) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private createErrorResponse(
    requestId: string,
    statusCode: number,
    message: string,
    startTime: number
  ): GatewayResponse {
    return {
      id: uuidv4(),
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: { error: message },
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get gateway statistics
   */
  getStats(): GatewayStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      requestsReceived: 0,
      requestsProcessed: 0,
      requestsFailed: 0,
      avgResponseTime: 0,
      rateLimitHits: 0,
      authenticationFailures: 0,
    };
  }

  /**
   * Get broadcast instance
   */
  getBroadcast(): ColonyBroadcast {
    return this.broadcast;
  }
}
