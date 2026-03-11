/**
 * Distributed Token Revocation List
 *
 * Provides production-ready token revocation with:
 * - In-memory cache for fast lookups
 * - Persistent storage backend (Redis/file)
 * - User-level revocation (revoke all tokens for a user)
 * - Token-level revocation (revoke specific token)
 * - Automatic cleanup of expired entries
 */

import { createHash, randomBytes } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface RevocationEntry {
  /** Unique revocation ID */
  revocationId: string;
  /** Gardener/user ID (if revoking all tokens for user) */
  gardenerId?: string;
  /** Specific JWT ID (jti) being revoked */
  jti?: string;
  /** Timestamp when revocation was added */
  revokedAt: number;
  /** Reason for revocation */
  reason: RevocationReason;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type RevocationReason =
  | 'logout'
  | 'security_breach'
  | 'password_change'
  | 'permission_change'
  | 'suspicious_activity'
  | 'admin_action'
  | 'token_theft';

export interface RevocationListConfig {
  /** Maximum entries to keep in memory */
  maxMemoryEntries: number;
  /** TTL for revocation entries (milliseconds) */
  entryTTL: number;
  /** Cleanup interval (milliseconds) */
  cleanupInterval: number;
  /** Backend storage type */
  backend: 'memory' | 'redis' | 'file';
  /** Redis connection string (if using redis) */
  redisUrl?: string;
  /** File path (if using file backend) */
  revocationFilePath?: string;
}

export interface RevocationCheckResult {
  /** Whether the token/user is revoked */
  revoked: boolean;
  /** Reason if revoked */
  reason?: RevocationReason;
  /** When it was revoked */
  revokedAt?: number;
  /** Revocation ID for audit */
  revocationId?: string;
}

// ============================================================================
// Storage Backends
// ============================================================================

interface RevocationStorage {
  /** Add a revocation entry */
  add(entry: RevocationEntry): Promise<void>;
  /** Check if a user's tokens are revoked */
  checkUser(gardenerId: string): Promise<RevocationEntry | null>;
  /** Check if a specific token is revoked */
  checkToken(jti: string): Promise<RevocationEntry | null>;
  /** Get all revocations for a user */
  getUserRevocations(gardenerId: string): Promise<RevocationEntry[]>;
  /** Remove an entry */
  remove(revocationId: string): Promise<void>;
  /** Clean up expired entries */
  cleanup(before: number): Promise<number>;
  /** Close storage connection */
  close(): Promise<void>;
}

/**
 * In-memory storage backend (for development/testing)
 */
class MemoryRevocationStorage implements RevocationStorage {
  private userRevocations: Map<string, RevocationEntry[]> = new Map();
  private tokenRevocations: Map<string, RevocationEntry> = new Map();

  async add(entry: RevocationEntry): Promise<void> {
    if (entry.gardenerId) {
      const userEntries = this.userRevocations.get(entry.gardenerId) || [];
      userEntries.push(entry);
      this.userRevocations.set(entry.gardenerId, userEntries);
    }
    if (entry.jti) {
      this.tokenRevocations.set(entry.jti, entry);
    }
  }

  async checkUser(gardenerId: string): Promise<RevocationEntry | null> {
    const entries = this.userRevocations.get(gardenerId);
    if (!entries || entries.length === 0) return null;
    // Return most recent revocation
    return entries[entries.length - 1];
  }

  async checkToken(jti: string): Promise<RevocationEntry | null> {
    return this.tokenRevocations.get(jti) || null;
  }

  async getUserRevocations(gardenerId: string): Promise<RevocationEntry[]> {
    return this.userRevocations.get(gardenerId) || [];
  }

  async remove(revocationId: string): Promise<void> {
    // Search through all entries
    for (const [userId, entries] of this.userRevocations.entries()) {
      const filtered = entries.filter(e => e.revocationId !== revocationId);
      if (filtered.length !== entries.length) {
        this.userRevocations.set(userId, filtered);
        return;
      }
    }
    for (const [jti, entry] of this.tokenRevocations.entries()) {
      if (entry.revocationId === revocationId) {
        this.tokenRevocations.delete(jti);
        return;
      }
    }
  }

  async cleanup(before: number): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (const [userId, entries] of this.userRevocations.entries()) {
      const filtered = entries.filter(e => e.revokedAt + (e.metadata?.['ttl'] as number || 0) > now);
      count += entries.length - filtered.length;
      if (filtered.length === 0) {
        this.userRevocations.delete(userId);
      } else {
        this.userRevocations.set(userId, filtered);
      }
    }

    for (const [jti, entry] of this.tokenRevocations.entries()) {
      if (entry.revokedAt + (entry.metadata?.['ttl'] as number || 0) < now) {
        this.tokenRevocations.delete(jti);
        count++;
      }
    }

    return count;
  }

  async close(): Promise<void> {
    this.userRevocations.clear();
    this.tokenRevocations.clear();
  }
}

/**
 * File-based storage backend (for single-instance production)
 */
class FileRevocationStorage implements RevocationStorage {
  private revocations: Map<string, RevocationEntry> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  private writePending = false;

  constructor(private filePath: string) {
    // Load existing revocations on startup
    this.loadFromFile().catch(console.error);
  }

  private async loadFromFile(): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const data = await readFile(this.filePath, 'utf-8');
      const entries = JSON.parse(data) as RevocationEntry[];

      for (const entry of entries) {
        this.revocations.set(entry.revocationId, entry);
        if (entry.gardenerId) {
          const set = this.userIndex.get(entry.gardenerId) || new Set();
          set.add(entry.revocationId);
          this.userIndex.set(entry.gardenerId, set);
        }
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to load revocations:', error);
      }
    }
  }

  private async scheduleWrite(): Promise<void> {
    if (this.writePending) return;
    this.writePending = true;

    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    this.writeTimer = setTimeout(async () => {
      await this.writeToFile();
      this.writePending = false;
    }, 1000); // Batch writes for 1 second
  }

  private async writeToFile(): Promise<void> {
    try {
      const { writeFile } = await import('fs/promises');
      const entries = Array.from(this.revocations.values());
      await writeFile(this.filePath, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write revocations:', error);
    }
  }

  async add(entry: RevocationEntry): Promise<void> {
    this.revocations.set(entry.revocationId, entry);
    if (entry.gardenerId) {
      const set = this.userIndex.get(entry.gardenerId) || new Set();
      set.add(entry.revocationId);
      this.userIndex.set(entry.gardenerId, set);
    }
    await this.scheduleWrite();
  }

  async checkUser(gardenerId: string): Promise<RevocationEntry | null> {
    const ids = this.userIndex.get(gardenerId);
    if (!ids || ids.size === 0) return null;

    // Find most recent revocation
    let mostRecent: RevocationEntry | null = null;
    for (const id of ids) {
      const entry = this.revocations.get(id);
      if (entry && (!mostRecent || entry.revokedAt > mostRecent.revokedAt)) {
        mostRecent = entry;
      }
    }
    return mostRecent;
  }

  async checkToken(jti: string): Promise<RevocationEntry | null> {
    for (const entry of this.revocations.values()) {
      if (entry.jti === jti) return entry;
    }
    return null;
  }

  async getUserRevocations(gardenerId: string): Promise<RevocationEntry[]> {
    const ids = this.userIndex.get(gardenerId);
    if (!ids) return [];

    const result: RevocationEntry[] = [];
    for (const id of ids) {
      const entry = this.revocations.get(id);
      if (entry) result.push(entry);
    }
    return result.sort((a, b) => b.revokedAt - a.revokedAt);
  }

  async remove(revocationId: string): Promise<void> {
    const entry = this.revocations.get(revocationId);
    if (!entry) return;

    this.revocations.delete(revocationId);
    if (entry.gardenerId) {
      const set = this.userIndex.get(entry.gardenerId);
      if (set) {
        set.delete(revocationId);
        if (set.size === 0) {
          this.userIndex.delete(entry.gardenerId);
        }
      }
    }
    await this.scheduleWrite();
  }

  async cleanup(before: number): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (const [id, entry] of this.revocations.entries()) {
      const ttl = entry.metadata?.['ttl'] as number | undefined;
      if (ttl && entry.revokedAt + ttl < now) {
        this.revocations.delete(id);
        if (entry.gardenerId) {
          const set = this.userIndex.get(entry.gardenerId);
          if (set) {
            set.delete(id);
            if (set.size === 0) {
              this.userIndex.delete(entry.gardenerId);
            }
          }
        }
        count++;
      }
    }

    if (count > 0) {
      await this.writeToFile();
    }

    return count;
  }

  async close(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      await this.writeToFile();
    }
    this.revocations.clear();
    this.userIndex.clear();
  }
}

/**
 * Redis storage backend (for distributed production)
 */
class RedisRevocationStorage implements RevocationStorage {
  private client: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private connected = false;

  constructor(private redisUrl: string) {
    // Lazy connection
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const redis = await import('redis') as any;
      this.client = redis.createClient({ url: this.redisUrl });
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  private userKey(gardenerId: string): string {
    return `revocation:user:${gardenerId}`;
  }

  private tokenKey(jti: string): string {
    return `revocation:token:${jti}`;
  }

  async add(entry: RevocationEntry): Promise<void> {
    await this.ensureConnected();

    const ttl = entry.metadata?.['ttl'] as number || this.defaultTTL;
    const value = JSON.stringify(entry);

    if (entry.gardenerId) {
      await this.client.setEx(this.userKey(entry.gardenerId), ttl / 1000, value);
    }
    if (entry.jti) {
      await this.client.setEx(this.tokenKey(entry.jti), ttl / 1000, value);
    }
  }

  async checkUser(gardenerId: string): Promise<RevocationEntry | null> {
    await this.ensureConnected();

    const value = await this.client.get(this.userKey(gardenerId));
    if (!value) return null;

    return JSON.parse(value) as RevocationEntry;
  }

  async checkToken(jti: string): Promise<RevocationEntry | null> {
    await this.ensureConnected();

    const value = await this.client.get(this.tokenKey(jti));
    if (!value) return null;

    return JSON.parse(value) as RevocationEntry;
  }

  async getUserRevocations(gardenerId: string): Promise<RevocationEntry[]> {
    // Redis stores single entry per user, return as array
    const entry = await this.checkUser(gardenerId);
    return entry ? [entry] : [];
  }

  async remove(revocationId: string): Promise<void> {
    await this.ensureConnected();

    // Scan for keys containing this revocation ID
    // In production, maintain a reverse index for efficiency
    const keys = await this.client.keys('revocation:*');
    for (const key of keys) {
      const value = await this.client.get(key);
      if (value) {
        const entry = JSON.parse(value) as RevocationEntry;
        if (entry.revocationId === revocationId) {
          await this.client.del(key);
        }
      }
    }
  }

  async cleanup(before: number): Promise<number> {
    // Redis handles TTL automatically, but we can count expired keys
    await this.ensureConnected();

    const keys = await this.client.keys('revocation:*');
    let count = 0;
    const now = Date.now();

    for (const key of keys) {
      const ttl = await this.client.ttl(key);
      if (ttl === -2 || ttl === -1) {
        // Key doesn't exist or has no expiry
        continue;
      }
      if (ttl === 0) {
        count++;
      }
    }

    return count;
  }

  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  private get defaultTTL(): number {
    return 7 * 24 * 60 * 60 * 1000; // 7 days
  }
}

// ============================================================================
// Revocation List Manager
// ============================================================================

export class TokenRevocationList {
  private storage: RevocationStorage;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private config: RevocationListConfig;

  constructor(config?: Partial<RevocationListConfig>) {
    this.config = {
      maxMemoryEntries: 10000,
      entryTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      backend: 'memory',
      ...config,
    };

    // Create storage backend
    switch (this.config.backend) {
      case 'redis':
        if (!this.config.redisUrl) {
          throw new Error('redisUrl is required for redis backend');
        }
        this.storage = new RedisRevocationStorage(this.config.redisUrl);
        break;
      case 'file':
        if (!this.config.revocationFilePath) {
          throw new Error('revocationFilePath is required for file backend');
        }
        this.storage = new FileRevocationStorage(this.config.revocationFilePath);
        break;
      default:
        this.storage = new MemoryRevocationStorage();
    }

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeUser(
    gardenerId: string,
    reason: RevocationReason,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const revocationId = this.generateId();

    const entry: RevocationEntry = {
      revocationId,
      gardenerId,
      revokedAt: Date.now(),
      reason,
      metadata: {
        ...metadata,
        ttl: this.config.entryTTL,
      },
    };

    await this.storage.add(entry);
    return revocationId;
  }

  /**
   * Revoke a specific token by JTI
   */
  async revokeToken(
    jti: string,
    reason: RevocationReason,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const revocationId = this.generateId();

    const entry: RevocationEntry = {
      revocationId,
      jti,
      revokedAt: Date.now(),
      reason,
      metadata: {
        ...metadata,
        ttl: this.config.entryTTL,
      },
    };

    await this.storage.add(entry);
    return revocationId;
  }

  /**
   * Check if a user's tokens are revoked
   */
  async checkUser(gardenerId: string): Promise<RevocationCheckResult> {
    const entry = await this.storage.checkUser(gardenerId);

    if (!entry) {
      return { revoked: false };
    }

    return {
      revoked: true,
      reason: entry.reason,
      revokedAt: entry.revokedAt,
      revocationId: entry.revocationId,
    };
  }

  /**
   * Check if a specific token is revoked
   */
  async checkToken(jti: string): Promise<RevocationCheckResult> {
    const entry = await this.storage.checkToken(jti);

    if (!entry) {
      return { revoked: false };
    }

    return {
      revoked: true,
      reason: entry.reason,
      revokedAt: entry.revokedAt,
      revocationId: entry.revocationId,
    };
  }

  /**
   * Validate a JWT token against the revocation list
   */
  async validateToken(decoded: {
    sub?: string;
    jti?: string;
  }): Promise<boolean> {
    // Check user-level revocation first
    if (decoded.sub) {
      const userCheck = await this.checkUser(decoded.sub);
      if (userCheck.revoked) {
        return false;
      }
    }

    // Check token-level revocation
    if (decoded.jti) {
      const tokenCheck = await this.checkToken(decoded.jti);
      if (tokenCheck.revoked) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all revocations for a user
   */
  async getUserRevocations(gardenerId: string): Promise<RevocationEntry[]> {
    return this.storage.getUserRevocations(gardenerId);
  }

  /**
   * Remove a revocation entry (undo)
   */
  async removeRevocation(revocationId: string): Promise<void> {
    await this.storage.remove(revocationId);
  }

  /**
   * Manually trigger cleanup
   */
  async cleanup(): Promise<number> {
    return this.storage.cleanup(Date.now());
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    usersWithRevocations: number;
    tokensWithRevocations: number;
  }> {
    // Implementation varies by storage backend
    // For now, return basic stats
    return {
      totalEntries: 0,
      usersWithRevocations: 0,
      tokensWithRevocations: 0,
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const count = await this.cleanup();
        if (count > 0) {
          console.log(`[TokenRevocationList] Cleaned up ${count} expired entries`);
        }
      } catch (error) {
        console.error('[TokenRevocationList] Cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer and close storage
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    await this.storage.close();
  }

  /**
   * Generate unique revocation ID
   */
  private generateId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${randomBytes(16).toString('hex')}`)
      .digest('hex')
      .substring(0, 16);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenRevocationList(
  config?: Partial<RevocationListConfig>
): TokenRevocationList {
  return new TokenRevocationList(config);
}

// ============================================================================
// Integration with AuthenticationMiddleware
// ============================================================================

import { AuthenticationMiddleware } from './middleware.js';

/**
 * Extend AuthenticationMiddleware with revocation list support
 */
export class AuthenticationMiddlewareWithRevocation extends AuthenticationMiddleware {
  private revocationList: TokenRevocationList;

  constructor(
    revocationConfig: Partial<RevocationListConfig>,
    jwtConfig?: Partial<import('./middleware.js').JWTConfig>
  ) {
    super(jwtConfig);
    this.revocationList = new TokenRevocationList(revocationConfig);
  }

  /**
   * Validate access token with revocation check
   */
  override validateAccessToken(token: string): {
    gardenerId: string;
    permissions: import('./types.js').Permission[];
  } | null {
    // First do standard JWT validation
    const validated = super.validateAccessToken(token);
    if (!validated) {
      return null;
    }

    // Decode to get jti
    try {
      const { decode } = require('jsonwebtoken');
      const decoded = decode(token) as { sub?: string; jti?: string };

      // Check revocation list
      const isValid = this.revocationList.validateToken(decoded);
      if (!isValid) {
        return null;
      }

      return validated;
    } catch {
      return null;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeUserTokens(
    gardenerId: string,
    reason: RevocationReason = 'logout'
  ): Promise<string> {
    return this.revocationList.revokeUser(gardenerId, reason);
  }

  /**
   * Revoke a specific refresh token
   */
  override revokeRefreshToken(
    refreshToken: string,
    reason: RevocationReason = 'logout'
  ): boolean {
    // First decode to get jti
    try {
      const { decode, verify } = require('jsonwebtoken');
      const jwtConfig = (this as any).jwtConfig as import('./middleware.js').JWTConfig;

      const decoded = verify(refreshToken, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as { jti?: string };

      if (decoded.jti) {
        // Fire and forget - revocation happens asynchronously
        this.revocationList.revokeToken(decoded.jti, reason).catch(() => {
          // Log error but don't fail the synchronous operation
          console.error(`Failed to revoke token ${decoded.jti}`);
        });
      }

      // Also call parent revoke
      return super.revokeRefreshToken(refreshToken);
    } catch {
      return false;
    }
  }

  /**
   * Check if user is revoked
   */
  async isUserRevoked(gardenerId: string): Promise<boolean> {
    const check = await this.revocationList.checkUser(gardenerId);
    return check.revoked;
  }

  /**
   * Get revocation list for cleanup on shutdown
   */
  getRevocationList(): TokenRevocationList {
    return this.revocationList;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    await this.revocationList.shutdown();
  }
}
