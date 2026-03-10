/**
 * UserRepository
 *
 * Handles all user-related database operations including:
 * - User CRUD operations
 * - OAuth identity management
 * - User preferences and settings
 * - Activity tracking
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  settings: Record<string, any>;
  preferences: Record<string, any>;
}

export interface OAuthIdentity {
  id: string;
  userId: string;
  provider: 'google' | 'github' | 'microsoft';
  providerUserId: string;
  providerEmail?: string;
  providerData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  settings?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive?: boolean;
  settings?: Record<string, any>;
  preferences?: Record<string, any>;
}

export class UserRepository {
  constructor(private pool: Pool) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_active_at as "lastActiveAt",
        is_active as "isActive",
        settings,
        preferences
      FROM users
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_active_at as "lastActiveAt",
        is_active as "isActive",
        settings,
        preferences
      FROM users
      WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_active_at as "lastActiveAt",
        is_active as "isActive",
        settings,
        preferences
      FROM users
      WHERE username = $1`,
      [username]
    );

    return result.rows[0] || null;
  }

  /**
   * Find or create user by OAuth identity
   */
  async findOrCreateByOAuth(
    provider: 'google' | 'github' | 'microsoft',
    providerUserId: string,
    providerEmail: string | null,
    providerData: Record<string, any>,
    userInfo: Partial<CreateUserInput>
  ): Promise<{ user: User; created: boolean }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Try to find existing OAuth identity
      const identityResult = await client.query(
        `SELECT
          oi.*,
          u.id as user_id,
          u.email,
          u.username,
          u.display_name as "displayName",
          u.avatar_url as "avatarUrl",
          u.created_at as "createdAt",
          u.updated_at as "updatedAt",
          u.last_active_at as "lastActiveAt",
          u.is_active as "isActive",
          u.settings,
          u.preferences
        FROM oauth_identities oi
        JOIN users u ON oi.user_id = u.id
        WHERE oi.provider = $1 AND oi.provider_user_id = $2`,
        [provider, providerUserId]
      );

      if (identityResult.rows.length > 0) {
        await client.query('COMMIT');
        return { user: identityResult.rows[0], created: false };
      }

      // Create new user
      const userId = uuidv4();
      const now = new Date();

      const userResult = await client.query(
        `INSERT INTO users (
          id,
          email,
          username,
          display_name,
          avatar_url,
          settings,
          preferences,
          created_at,
          updated_at,
          last_active_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          email,
          username,
          display_name as "displayName",
          avatar_url as "avatarUrl",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_active_at as "lastActiveAt",
          is_active as "isActive",
          settings,
          preferences`,
        [
          userId,
          userInfo.email || providerEmail,
          userInfo.username,
          userInfo.displayName || userInfo.email?.split('@')[0],
          userInfo.avatarUrl,
          userInfo.settings || {},
          userInfo.preferences || {},
          now,
          now,
          now,
        ]
      );

      // Create OAuth identity
      await client.query(
        `INSERT INTO oauth_identities (
          id,
          user_id,
          provider,
          provider_user_id,
          provider_email,
          provider_data,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), userId, provider, providerUserId, providerEmail, providerData, now, now]
      );

      await client.query('COMMIT');

      return { user: userResult.rows[0], created: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO users (
        id,
        email,
        username,
        display_name,
        avatar_url,
        settings,
        preferences,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_active_at as "lastActiveAt",
        is_active as "isActive",
        settings,
        preferences`,
      [
        id,
        input.email,
        input.username,
        input.displayName,
        input.avatarUrl,
        input.settings || {},
        input.preferences || {},
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (input.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(input.username);
    }
    if (input.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(input.displayName);
    }
    if (input.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(input.avatarUrl);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }
    if (input.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(input.settings);
    }
    if (input.preferences !== undefined) {
      updates.push(`preferences = $${paramIndex++}`);
      values.push(input.preferences);
    }

    if (updates.length === 0) {
      return this.findById(id)!;
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        email,
        username,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_active_at as "lastActiveAt",
        is_active as "isActive",
        settings,
        preferences`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   */
  async deactivate(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET is_active = FALSE WHERE id = $1',
      [id]
    );
  }

  /**
   * List users with pagination
   */
  async list(options: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { limit = 50, offset = 0, includeInactive = false } = options;

    const conditions = includeInactive ? [] : ['is_active = TRUE'];

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [usersResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT
          id,
          email,
          username,
          display_name as "displayName",
          avatar_url as "avatarUrl",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_active_at as "lastActiveAt",
          is_active as "isActive",
          settings,
          preferences
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        []
      ),
    ]);

    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Get OAuth identities for user
   */
  async getOAuthIdentities(userId: string): Promise<OAuthIdentity[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        user_id as "userId",
        provider,
        provider_user_id as "providerUserId",
        provider_email as "providerEmail",
        provider_data as "providerData",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM oauth_identities
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Link OAuth identity to user
   */
  async linkOAuthIdentity(
    userId: string,
    provider: 'google' | 'github' | 'microsoft',
    providerUserId: string,
    providerEmail: string | null,
    providerData: Record<string, any>
  ): Promise<OAuthIdentity> {
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO oauth_identities (
        id,
        user_id,
        provider,
        provider_user_id,
        provider_email,
        provider_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        user_id as "userId",
        provider,
        provider_user_id as "providerUserId",
        provider_email as "providerEmail",
        provider_data as "providerData",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [uuidv4(), userId, provider, providerUserId, providerEmail, providerData, now, now]
    );

    return result.rows[0];
  }

  /**
   * Unlink OAuth identity
   */
  async unlinkOAuthIdentity(identityId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM oauth_identities WHERE id = $1',
      [identityId]
    );
  }
}
