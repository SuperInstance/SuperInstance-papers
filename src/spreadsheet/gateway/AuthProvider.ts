/**
 * POLLN Authentication Provider
 * JWT, API Key, OAuth, and Session authentication
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { AuthResult, AuthToken, GatewayUser, JWTConfig, APIKeyConfig, SessionConfig } from './types.js';

/**
 * JWT Provider
 */
export class JWTProvider {
  constructor(private config: JWTConfig) {}

  /**
   * Generate JWT token
   */
  async generateToken(user: GatewayUser): Promise<AuthToken> {
    const header = this.encodeHeader();
    const payload = this.encodePayload(user);
    const signature = this.sign(header, payload);

    const token = `${header}.${payload}.${signature}`;

    return {
      accessToken: token,
      expiresIn: this.parseExpirationTime(this.config.expiresIn),
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<GatewayUser | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [header, payload, signature] = parts;

      // Verify signature
      const expectedSignature = this.sign(header, payload);
      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

      // Check expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return null;
      }

      return decoded as GatewayUser;
    } catch {
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<AuthToken | null> {
    const user = await this.verifyToken(token);
    if (!user) {
      return null;
    }

    return await this.generateToken(user);
  }

  private encodeHeader(): string {
    const header = {
      alg: this.config.algorithm,
      typ: 'JWT'
    };
    return Buffer.from(JSON.stringify(header)).toString('base64url');
  }

  private encodePayload(user: GatewayUser): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      name: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.parseExpirationTime(this.config.expiresIn)
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private sign(header: string, payload: string): string {
    const data = `${header}.${payload}`;
    const signature = createHmac('sha256', this.config.secret)
      .update(data)
      .digest('base64url');
    return signature;
  }

  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600; // Default 1 hour
    }
  }
}

/**
 * API Key Provider
 */
export class APIKeyProvider {
  private keys: Map<string, GatewayUser> = new Map();

  constructor(private config: APIKeyConfig) {}

  /**
   * Register API key
   */
  registerKey(key: string, user: GatewayUser): void {
    this.keys.set(key, user);
  }

  /**
   * Validate API key
   */
  async validateKey(key: string): Promise<GatewayUser | null> {
    // Remove prefix if present
    const cleanKey = key.replace(this.config.prefix, '');

    const user = this.keys.get(cleanKey);

    if (!user) {
      // Call custom validator if provided
      if (this.config.validator) {
        const valid = await this.config.validator(cleanKey);
        if (valid) {
          // Return a default user (in real implementation, fetch user details)
          return {
            id: cleanKey.substring(0, 8),
            username: 'api-user',
            email: 'api@example.com',
            roles: ['api'],
            permissions: [],
            metadata: {}
          };
        }
      }
      return null;
    }

    return user;
  }

  /**
   * Generate API key
   */
  generateKey(): string {
    const bytes = randomBytes(32);
    return bytes.toString('hex');
  }

  /**
   * Revoke API key
   */
  revokeKey(key: string): boolean {
    return this.keys.delete(key);
  }
}

/**
 * Session Provider
 */
export class SessionProvider {
  private sessions: Map<string, GatewaySession> = new Map();

  constructor(private config: SessionConfig) {}

  /**
   * Create session
   */
  async createSession(user: GatewayUser): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: GatewaySession = {
      id: sessionId,
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.ttl),
      data: {
        user,
        createdAt: new Date()
      }
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<GatewaySession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<GatewayUser | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    return session.data.user as GatewayUser;
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  /**
   * Extend session
   */
  async extendSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.expiresAt = new Date(Date.now() + this.config.ttl);
    this.sessions.set(sessionId, session);
    return true;
  }

  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }
}

/**
 * Gateway Session interface
 */
interface GatewaySession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  data: Record<string, unknown>;
}

/**
 * Authentication Provider
 * Main authentication provider that delegates to specific providers
 */
export class AuthenticationProvider {
  private jwt: JWTProvider;
  private apiKey: APIKeyProvider;
  private session: SessionProvider;

  constructor(config: { jwt: JWTConfig; apiKey: APIKeyConfig; session: SessionConfig }) {
    this.jwt = new JWTProvider(config.jwt);
    this.apiKey = new APIKeyProvider(config.apiKey);
    this.session = new SessionProvider(config.session);
  }

  /**
   * Authenticate using various methods
   */
  async authenticate(method: 'jwt' | 'apiKey' | 'session', credentials: string): Promise<AuthResult> {
    try {
      let user: GatewayUser | null = null;

      switch (method) {
        case 'jwt':
          user = await this.jwt.verifyToken(credentials);
          break;

        case 'apiKey':
          user = await this.apiKey.validateKey(credentials);
          break;

        case 'session':
          user = await this.session.validateSession(credentials);
          break;
      }

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      return {
        success: true,
        user,
        token: method === 'jwt' ? await this.jwt.generateToken(user) : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Generate token for user
   */
  async generateToken(user: GatewayUser): Promise<AuthToken> {
    return await this.jwt.generateToken(user);
  }

  /**
   * Create session for user
   */
  async createSession(user: GatewayUser): Promise<string> {
    return await this.session.createSession(user);
  }

  /**
   * Register API key
   */
  registerAPIKey(key: string, user: GatewayUser): void {
    this.apiKey.registerKey(key, user);
  }

  /**
   * Get JWT provider
   */
  getJWT(): JWTProvider {
    return this.jwt;
  }

  /**
   * Get API key provider
   */
  getAPIKey(): APIKeyProvider {
    return this.apiKey;
  }

  /**
   * Get session provider
   */
  getSession(): SessionProvider {
    return this.session;
  }
}
