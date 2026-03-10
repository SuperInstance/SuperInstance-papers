/**
 * User Repository for POLLN Spreadsheet System
 *
 * Handles user management, session handling, and OAuth integration.
 */

import type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  Session,
  CreateSessionDTO,
  PaginatedResult,
  PaginationOptions,
  SortOptions,
  AuthProvider,
} from './types.js';
import type { DatabaseManager } from './DatabaseManager.js';
import {
  NotFoundError,
  AlreadyExistsError,
  QueryError,
  InvalidFieldValueError,
} from './errors.js';

// ============================================================================
// Query Builder Helpers
// ============================================================================

function buildSelectQuery(
  baseQuery: string,
  pagination?: PaginationOptions,
  sort?: SortOptions
): { query: string; params: any[] } {
  const params: any[] = [];
  let query = baseQuery;

  if (sort) {
    query += ` ORDER BY "${sort.field}" ${sort.order}`;
  }

  if (pagination) {
    const limit = pagination.limit ?? 50;
    const offset = pagination.offset ?? ((pagination.page ?? 1) - 1) * limit;

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
  }

  return { query, params };
}

// ============================================================================
// User Repository Implementation
// ============================================================================

/**
 * Repository for user operations
 */
export class UserRepository {
  constructor(private readonly db: DatabaseManager) {}

  // ========================================================================
  // User CRUD Operations
  // ========================================================================

  /**
   * Find a user by ID
   *
   * @param id - User ID
   * @returns User or null if not found
   */
  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        provider,
        provider_id as "providerId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE id = $1
    `;

    try {
      const result = await this.db.query<User>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find user by ID', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find a user by email
   *
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        provider,
        provider_id as "providerId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE email = $1
    `;

    try {
      const result = await this.db.query<User>(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find user by email', query, [email], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find a user by provider and provider ID (for OAuth)
   *
   * @param provider - Auth provider
   * @param providerId - Provider's user ID
   * @returns User or null if not found
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string
  ): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        provider,
        provider_id as "providerId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE provider = $1 AND provider_id = $2
    `;

    try {
      const result = await this.db.query<User>(query, [provider, providerId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError(
        'Failed to find user by provider',
        query,
        [provider, providerId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find a user by username
   *
   * @param username - Username
   * @returns User or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        provider,
        provider_id as "providerId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE username = $1
    `;

    try {
      const result = await this.db.query<User>(query, [username]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find user by username', query, [username], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * List all users with pagination
   *
   * @param pagination - Pagination options
   * @param sort - Sort options
   * @returns Paginated result of users
   */
  async list(
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<PaginatedResult<User>> {
    const baseQuery = `
      SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        provider,
        provider_id as "providerId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM users';

    try {
      const { query, params } = buildSelectQuery(baseQuery, pagination, sort);

      const [usersResult, countResult] = await Promise.all([
        this.db.query<User>(query, params),
        this.db.query<{ total: bigint }>(countQuery),
      ]);

      const total = Number(countResult.rows[0].total);
      const limit = pagination?.limit ?? 50;
      const page = pagination?.page ?? 1;
      const totalPages = Math.ceil(total / limit);

      return {
        data: usersResult.rows.map((row) => this.mapUser(row)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new QueryError('Failed to list users', baseQuery, [], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a new user
   *
   * @param dto - User creation data
   * @returns Created user
   */
  async create(dto: CreateUserDTO): Promise<User> {
    // Validate email
    if (!this.isValidEmail(dto.email)) {
      throw new InvalidFieldValueError('email', dto.email, 'Invalid email format');
    }

    // Check if email already exists
    const existingByEmail = await this.findByEmail(dto.email);
    if (existingByEmail) {
      throw new AlreadyExistsError('User', 'email', dto.email);
    }

    // Check if username already exists
    if (dto.username) {
      const existingByUsername = await this.findByUsername(dto.username);
      if (existingByUsername) {
        throw new AlreadyExistsError('User', 'username', dto.username);
      }
    }

    const id = this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO users (
        id,
        email,
        username,
        display_name,
        avatar_url,
        provider,
        provider_id,
        metadata,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NULL
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.email.toLowerCase(),
        dto.username ?? null,
        dto.displayName,
        dto.avatarUrl ?? null,
        dto.provider,
        dto.providerId,
        JSON.stringify(dto.metadata ?? {}),
        now,
      ]);

      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create user', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update a user
   *
   * @param id - User ID
   * @param updates - Update data
   * @returns Updated user
   */
  async update(id: string, updates: UpdateUserDTO): Promise<User> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('User', id);
    }

    // Check if username already exists
    if (updates.username && updates.username !== existing.username) {
      const existingByUsername = await this.findByUsername(updates.username);
      if (existingByUsername) {
        throw new AlreadyExistsError('User', 'username', updates.username);
      }
    }

    const updatesArray: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.username !== undefined) {
      updatesArray.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }

    if (updates.displayName !== undefined) {
      updatesArray.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }

    if (updates.avatarUrl !== undefined) {
      updatesArray.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }

    if (updates.metadata !== undefined) {
      updatesArray.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updatesArray.length === 0) {
      return existing;
    }

    updatesArray.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE users
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);
      return this.mapUser(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update user', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete a user
   *
   * @param id - User ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('User', id);
    }

    const query = 'DELETE FROM users WHERE id = $1';

    try {
      await this.db.query(query, [id]);
    } catch (error) {
      throw new QueryError('Failed to delete user', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update last login timestamp
   *
   * @param id - User ID
   */
  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login_at = $1
      WHERE id = $2
    `;

    try {
      await this.db.query(query, [new Date(), id]);
    } catch (error) {
      // Silently fail - this is just for tracking
    }
  }

  // ========================================================================
  // Session Management
  // ========================================================================

  /**
   * Find a session by ID
   *
   * @param id - Session ID
   * @returns Session or null if not found
   */
  async findSessionById(id: string): Promise<Session | null> {
    const query = `
      SELECT
        id,
        user_id as "userId",
        token,
        refresh_token as "refreshToken",
        expires_at as "expiresAt",
        created_at as "createdAt",
        last_accessed_at as "lastAccessedAt",
        metadata
      FROM sessions
      WHERE id = $1 AND expires_at > NOW()
    `;

    try {
      const result = await this.db.query<Session>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSession(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find session by ID', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find a session by token
   *
   * @param token - Session token
   * @returns Session or null if not found
   */
  async findSessionByToken(token: string): Promise<Session | null> {
    const query = `
      SELECT
        id,
        user_id as "userId",
        token,
        refresh_token as "refreshToken",
        expires_at as "expiresAt",
        created_at as "createdAt",
        last_accessed_at as "lastAccessedAt",
        metadata
      FROM sessions
      WHERE token = $1 AND expires_at > NOW()
    `;

    try {
      const result = await this.db.query<Session>(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSession(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find session by token', query, [token], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find all sessions for a user
   *
   * @param userId - User ID
   * @returns Array of sessions
   */
  async findSessionsByUser(userId: string): Promise<Session[]> {
    const query = `
      SELECT
        id,
        user_id as "userId",
        token,
        refresh_token as "refreshToken",
        expires_at as "expiresAt",
        created_at as "createdAt",
        last_accessed_at as "lastAccessedAt",
        metadata
      FROM sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query<Session>(query, [userId]);

      return result.rows.map((row) => this.mapSession(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find sessions by user',
        query,
        [userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Create a new session
   *
   * @param dto - Session creation data
   * @returns Created session
   */
  async createSession(dto: CreateSessionDTO): Promise<Session> {
    const id = this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO sessions (
        id,
        user_id,
        token,
        refresh_token,
        expires_at,
        created_at,
        last_accessed_at,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $6, $7
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.userId,
        dto.token,
        dto.refreshToken ?? null,
        dto.expiresAt,
        now,
        JSON.stringify(dto.metadata ?? {}),
      ]);

      return this.mapSession(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create session', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update session last accessed timestamp
   *
   * @param id - Session ID
   */
  async updateSessionAccess(id: string): Promise<void> {
    const query = `
      UPDATE sessions
      SET last_accessed_at = $1
      WHERE id = $2
    `;

    try {
      await this.db.query(query, [new Date(), id]);
    } catch (error) {
      // Silently fail - this is just for tracking
    }
  }

  /**
   * Delete a session
   *
   * @param id - Session ID
   */
  async deleteSession(id: string): Promise<void> {
    const query = 'DELETE FROM sessions WHERE id = $1';

    try {
      await this.db.query(query, [id]);
    } catch (error) {
      throw new QueryError('Failed to delete session', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete all sessions for a user
   *
   * @param userId - User ID
   * @returns Number of sessions deleted
   */
  async deleteSessionsByUser(userId: string): Promise<number> {
    const query = 'DELETE FROM sessions WHERE user_id = $1 RETURNING id';

    try {
      const result = await this.db.query<{ id: string }>(query, [userId]);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new QueryError(
        'Failed to delete sessions by user',
        query,
        [userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Clean up expired sessions
   *
   * @returns Number of sessions deleted
   */
  async cleanupExpiredSessions(): Promise<number> {
    const query = 'DELETE FROM sessions WHERE expires_at <= NOW() RETURNING id';

    try {
      const result = await this.db.query<{ id: string }>(query);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new QueryError(
        'Failed to cleanup expired sessions',
        query,
        [],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // OAuth Integration
  // ========================================================================

  /**
   * Find or create user from OAuth provider
   *
   * @param provider - Auth provider
   * @param providerId - Provider's user ID
   * @param email - User email
   * @param profile - OAuth profile data
   * @returns User
   */
  async findOrCreateOAuthUser(
    provider: AuthProvider,
    providerId: string,
    email: string,
    profile: {
      displayName: string;
      avatarUrl?: string;
      username?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<User> {
    // Try to find existing user by provider
    let user = await this.findByProvider(provider, providerId);

    if (user) {
      // Update last login
      await this.updateLastLogin(user.id);
      return user;
    }

    // Try to find existing user by email
    user = await this.findByEmail(email);

    if (user) {
      // Link provider to existing user
      await this.linkProvider(user.id, provider, providerId);
      await this.updateLastLogin(user.id);
      return user;
    }

    // Create new user
    user = await this.create({
      email,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      provider,
      providerId,
      metadata: profile.metadata ?? {},
    });

    return user;
  }

  /**
   * Link OAuth provider to existing user
   *
   * @param userId - User ID
   * @param provider - Auth provider
   * @param providerId - Provider's user ID
   */
  async linkProvider(
    userId: string,
    provider: AuthProvider,
    providerId: string
  ): Promise<void> {
    const query = `
      UPDATE users
      SET provider = $1,
          provider_id = $2,
          updated_at = $3
      WHERE id = $4
    `;

    try {
      await this.db.query(query, [provider, providerId, new Date(), userId]);
    } catch (error) {
      throw new QueryError(
        'Failed to link provider',
        query,
        [userId, provider, providerId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Unlink OAuth provider from user
   *
   * @param userId - User ID
   */
  async unlinkProvider(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET provider = 'local',
          provider_id = NULL,
          updated_at = $1
      WHERE id = $2
    `;

    try {
      await this.db.query(query, [new Date(), userId]);
    } catch (error) {
      throw new QueryError(
        'Failed to unlink provider',
        query,
        [userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      provider: row.provider,
      providerId: row.providerId,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
    };
  }

  private mapSession(row: any): Session {
    return {
      id: row.id,
      userId: row.userId,
      token: row.token,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      lastAccessedAt: row.lastAccessedAt,
      metadata: row.metadata,
    };
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
