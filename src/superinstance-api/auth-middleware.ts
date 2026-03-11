/**
 * Authentication and Authorization Middleware for SuperInstance API
 *
 * Provides API key authentication, JWT validation, rate limiting,
 * and role-based access control for SuperInstance operations.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Types for authentication and authorization
interface ApiKey {
  key: string;
  name: string;
  owner: string;
  permissions: string[];
  rateLimit: number;
  createdAt: Date;
  lastUsed: Date;
  enabled: boolean;
}

interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  lastLogin: Date;
}

interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

class AuthMiddleware {
  private apiKeys: Map<string, ApiKey>;
  private rateLimitStore: Map<string, RateLimitState>;
  private jwtSecret: string;
  private adminUsers: Set<string>;

  constructor(jwtSecret: string = process.env.JWT_SECRET || 'superinstance-secret-key') {
    this.apiKeys = new Map();
    this.rateLimitStore = new Map();
    this.jwtSecret = jwtSecret;
    this.adminUsers = new Set();

    // Initialize with sample API keys (in production, load from database)
    this.initializeSampleKeys();
  }

  /**
   * API Key Authentication Middleware
   */
  apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      this.sendError(res, 401, 'API_KEY_REQUIRED', 'API key is required');
      return;
    }

    const keyData = this.apiKeys.get(apiKey);

    if (!keyData) {
      this.sendError(res, 401, 'INVALID_API_KEY', 'Invalid API key');
      return;
    }

    if (!keyData.enabled) {
      this.sendError(res, 403, 'API_KEY_DISABLED', 'API key is disabled');
      return;
    }

    // Check rate limiting
    if (!this.checkRateLimit(apiKey, keyData.rateLimit)) {
      this.sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
      return;
    }

    // Update last used timestamp
    keyData.lastUsed = new Date();
    this.apiKeys.set(apiKey, keyData);

    // Attach API key info to request
    req.apiKey = keyData;
    req.user = {
      id: `api-key-${keyData.key.substring(0, 8)}`,
      email: `${keyData.owner}@api-key`,
      roles: ['api-key'],
      permissions: keyData.permissions
    };

    next();
  }

  /**
   * JWT Authentication Middleware
   */
  jwtAuth(req: Request, res: Response, next: NextFunction): void {
    const token = this.extractJwtToken(req);

    if (!token) {
      this.sendError(res, 401, 'JWT_TOKEN_REQUIRED', 'JWT token is required');
      return;
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

      // Check if token is expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        this.sendError(res, 401, 'JWT_TOKEN_EXPIRED', 'JWT token has expired');
        return;
      }

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        roles: decoded.roles,
        permissions: decoded.permissions
      };

      req.jwtPayload = decoded;

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.sendError(res, 401, 'INVALID_JWT_TOKEN', 'Invalid JWT token');
      } else if (error instanceof jwt.TokenExpiredError) {
        this.sendError(res, 401, 'JWT_TOKEN_EXPIRED', 'JWT token has expired');
      } else {
        this.sendError(res, 500, 'JWT_VALIDATION_ERROR', 'JWT validation error');
      }
    }
  }

  /**
   * Role-Based Access Control Middleware
   */
  requireRole(requiredRoles: string | string[]) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        this.sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
        return;
      }

      const hasRole = roles.some(role => req.user!.roles.includes(role));

      if (!hasRole) {
        this.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
        return;
      }

      next();
    };
  }

  /**
   * Permission-Based Access Control Middleware
   */
  requirePermission(requiredPermissions: string | string[]) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        this.sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
        return;
      }

      const hasPermission = permissions.every(permission =>
        req.user!.permissions.includes(permission) || req.user!.permissions.includes('*')
      );

      if (!hasPermission) {
        this.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
        return;
      }

      next();
    };
  }

  /**
   * Instance Ownership Middleware
   */
  requireInstanceOwnership(paramName: string = 'instanceId') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const instanceId = req.params[paramName];

        if (!instanceId) {
          this.sendError(res, 400, 'INSTANCE_ID_REQUIRED', 'Instance ID is required');
          return;
        }

        if (!req.user) {
          this.sendError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
          return;
        }

        // In a real implementation, this would check if the user owns the instance
        // For now, allow all authenticated users (admin can access all)
        const isAdmin = req.user.roles.includes('admin') || req.user.permissions.includes('*');

        if (isAdmin) {
          next();
          return;
        }

        // Check if user has permission to access all instances
        if (req.user.permissions.includes('instances:read:all') ||
            req.user.permissions.includes('instances:*')) {
          next();
          return;
        }

        // Check if this is the user's own instance
        // This would require instance ownership data in a real implementation
        const canAccess = await this.checkInstanceAccess(req.user.id, instanceId);

        if (!canAccess) {
          this.sendError(res, 403, 'INSTANCE_ACCESS_DENIED', 'Access to this instance is denied');
          return;
        }

        next();
      } catch (error) {
        this.sendError(res, 500, 'INSTANCE_ACCESS_CHECK_FAILED', 'Failed to check instance access');
      }
    };
  }

  /**
   * Rate Limiting Middleware (per endpoint)
   */
  rateLimit(requestsPerMinute: number, keyPrefix: string = 'endpoint') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const userKey = req.user?.id || req.ip || 'anonymous';
      const endpointKey = `${keyPrefix}:${req.method}:${req.path}`;
      const rateLimitKey = `${userKey}:${endpointKey}`;

      if (!this.checkRateLimit(rateLimitKey, requestsPerMinute)) {
        this.sendError(res, 429, 'ENDPOINT_RATE_LIMIT_EXCEEDED', 'Endpoint rate limit exceeded');
        return;
      }

      next();
    };
  }

  /**
   * Audit Logging Middleware
   */
  auditLog(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Store original send function
    const originalSend = res.send;

    // Override send to log after response
    res.send = function(body: any): Response {
      const duration = Date.now() - startTime;

      // Log the request (in production, send to audit log service)
      const auditLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id || 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        params: Object.keys(req.params).length > 0 ? req.params : undefined
      };

      console.log('[AUDIT]', JSON.stringify(auditLog));

      return originalSend.call(this, body);
    };

    next();
  }

  /**
   * CORS Middleware with specific origins
   */
  corsWithOrigins(allowedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
      }

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    };
  }

  /**
   * API Key Management Methods
   */
  createApiKey(name: string, owner: string, permissions: string[], rateLimit: number = 100): string {
    const key = this.generateApiKey();
    const apiKey: ApiKey = {
      key,
      name,
      owner,
      permissions,
      rateLimit,
      createdAt: new Date(),
      lastUsed: new Date(),
      enabled: true
    };

    this.apiKeys.set(key, apiKey);
    return key;
  }

  disableApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) return false;

    apiKey.enabled = false;
    this.apiKeys.set(key, apiKey);
    return true;
  }

  enableApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) return false;

    apiKey.enabled = true;
    this.apiKeys.set(key, apiKey);
    return true;
  }

  deleteApiKey(key: string): boolean {
    return this.apiKeys.delete(key);
  }

  getApiKeyInfo(key: string): ApiKey | null {
    return this.apiKeys.get(key) || null;
  }

  listApiKeys(owner?: string): ApiKey[] {
    const keys = Array.from(this.apiKeys.values());
    return owner ? keys.filter(k => k.owner === owner) : keys;
  }

  /**
   * JWT Token Generation
   */
  generateJwtToken(userId: string, email: string, roles: string[], permissions: string[], expiresIn: string = '24h'): string {
    const payload: JwtPayload = {
      userId,
      email,
      roles,
      permissions,
      exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(expiresIn),
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Admin User Management
   */
  addAdminUser(userId: string): void {
    this.adminUsers.add(userId);
  }

  removeAdminUser(userId: string): boolean {
    return this.adminUsers.delete(userId);
  }

  isAdminUser(userId: string): boolean {
    return this.adminUsers.has(userId);
  }

  // Private helper methods

  private extractApiKey(req: Request): string | null {
    // Check header first
    const headerKey = req.headers['x-api-key'];
    if (headerKey && typeof headerKey === 'string') {
      return headerKey;
    }

    // Check authorization header (Bearer token style)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    const queryKey = req.query.apiKey;
    if (queryKey && typeof queryKey === 'string') {
      return queryKey;
    }

    return null;
  }

  private extractJwtToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    if (req.cookies && req.cookies.jwtToken) {
      return req.cookies.jwtToken;
    }

    // Check query parameter
    const queryToken = req.query.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  private checkRateLimit(key: string, limit: number): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    let state = this.rateLimitStore.get(key);

    if (!state || now >= state.resetTime) {
      // Reset or initialize
      state = {
        count: 1,
        resetTime: now + windowMs
      };
      this.rateLimitStore.set(key, state);
      return true;
    }

    if (state.count >= limit) {
      return false;
    }

    state.count++;
    this.rateLimitStore.set(key, state);
    return true;
  }

  private generateApiKey(): string {
    // Generate a secure API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'sk_';
    let key = prefix;

    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return key;
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60; // Default 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value; // seconds
      case 'm': return value * 60; // minutes
      case 'h': return value * 60 * 60; // hours
      case 'd': return value * 24 * 60 * 60; // days
      default: return 24 * 60 * 60;
    }
  }

  private sendError(res: Response, statusCode: number, code: string, message: string): void {
    res.status(statusCode).json({
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async checkInstanceAccess(userId: string, instanceId: string): Promise<boolean> {
    // In a real implementation, this would query a database
    // For now, simulate based on instance ID pattern
    return instanceId.includes(userId) || instanceId.startsWith('shared-');
  }

  private initializeSampleKeys(): void {
    // Sample admin API key
    this.createApiKey(
      'Admin Key',
      'admin@superinstance.ai',
      ['*'], // All permissions
      1000
    );

    // Sample user API key
    this.createApiKey(
      'User Key',
      'user@example.com',
      [
        'instances:read',
        'instances:write',
        'instances:delete:own',
        'rate:read',
        'rate:write'
      ],
      100
    );

    // Sample read-only API key
    this.createApiKey(
      'Read Only Key',
      'monitor@example.com',
      [
        'instances:read',
        'rate:read',
        'system:read'
      ],
      50
    );
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
      };
      jwtPayload?: JwtPayload;
    }
  }
}

export { AuthMiddleware };