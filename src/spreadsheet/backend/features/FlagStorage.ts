/**
 * FlagStorage - Storage backend for feature flags
 *
 * Provides:
 * - PostgreSQL persistence
 * - Redis caching for fast lookups
 * - Environment fallback
 * - Flag change events
 * - Statistics tracking
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  FlagDefinition,
  FlagState,
  FlagType
} from './FeatureFlagManager.js';

/**
 * Storage configuration
 */
export interface FlagStorageConfig {
  postgresql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  cacheEnabled?: boolean;
  cacheTTL?: number;  // seconds
}

/**
 * Flag statistics
 */
export interface FlagStatistics {
  flagId: string;
  evaluationCount: number;
  trueCount: number;
  falseCount: number;
  avgEvaluationTime: number;
  lastEvaluatedAt: Date;
}

/**
 * Flag change event
 */
export interface FlagChangeEvent {
  flagId: string;
  type: 'created' | 'updated' | 'deleted';
  flag?: FlagDefinition;
  timestamp: Date;
}

/**
 * FlagStorage - Main storage class
 */
export class FlagStorage extends EventEmitter {
  private pool: Pool;
  private redis?: Redis;
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(config: FlagStorageConfig) {
    super();

    // PostgreSQL connection
    this.pool = new Pool({
      host: config.postgresql.host,
      port: config.postgresql.port,
      database: config.postgresql.database,
      user: config.postgresql.user,
      password: config.postgresql.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis connection (optional)
    if (config.redis && config.cacheEnabled !== false) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db ?? 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
      });

      this.redis.on('connect', () => {
        console.log('Redis connected for feature flags');
      });

      this.cacheEnabled = true;
    } else {
      this.cacheEnabled = false;
    }

    this.cacheTTL = config.cacheTTL ?? 60; // 60 seconds default

    // Subscribe to PostgreSQL notifications for real-time updates
    this.subscribeToNotifications();
  }

  /**
   * Create a new flag
   */
  async createFlag(flag: FlagDefinition): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert flag
      await client.query(
        `INSERT INTO feature_flags (
          id, name, description, type, state,
          created_at, updated_at, created_by,
          environment, tags, default_value, kill_switch_enabled,
          kill_switch_reason, rollout_percentage, rollout_strategy,
          experiment_id, evaluation_count, last_evaluated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          flag.id,
          flag.name,
          flag.description,
          flag.type,
          flag.state,
          flag.createdAt,
          flag.updatedAt,
          flag.createdBy,
          flag.environment,
          JSON.stringify(flag.tags),
          JSON.stringify(flag.defaultValue),
          flag.killSwitchEnabled,
          flag.killSwitchReason,
          flag.rolloutPercentage,
          flag.rolloutStrategy,
          flag.experimentId,
          flag.evaluationCount,
          flag.lastEvaluatedAt
        ]
      );

      // Insert rules
      for (const rule of flag.rules) {
        await client.query(
          `INSERT INTO flag_rules (
            id, flag_id, name, condition, value,
            priority, enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            rule.id,
            flag.id,
            rule.name,
            JSON.stringify(rule.condition),
            JSON.stringify(rule.value),
            rule.priority,
            rule.enabled
          ]
        );
      }

      // Insert variants if present
      if (flag.variants) {
        for (const variant of flag.variants) {
          await client.query(
            `INSERT INTO flag_variants (
              id, flag_id, name, description,
              weight, payload, is_control
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              variant.id,
              flag.id,
              variant.name,
              variant.description,
              variant.weight,
              JSON.stringify(variant.payload),
              variant.isControl ?? false
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Cache the flag
      if (this.cacheEnabled && this.redis) {
        await this.cacheFlag(flag);
      }

      this.emit('flagCreated', flag);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing flag
   */
  async updateFlag(flagId: string, flag: Partial<FlagDefinition>): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (flag.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(flag.name);
      }
      if (flag.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(flag.description);
      }
      if (flag.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(flag.type);
      }
      if (flag.state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(flag.state);
      }
      if (flag.updatedAt !== undefined) {
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(flag.updatedAt);
      }
      if (flag.environment !== undefined) {
        updates.push(`environment = $${paramIndex++}`);
        values.push(flag.environment);
      }
      if (flag.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(flag.tags));
      }
      if (flag.defaultValue !== undefined) {
        updates.push(`default_value = $${paramIndex++}`);
        values.push(JSON.stringify(flag.defaultValue));
      }
      if (flag.killSwitchEnabled !== undefined) {
        updates.push(`kill_switch_enabled = $${paramIndex++}`);
        values.push(flag.killSwitchEnabled);
      }
      if (flag.killSwitchReason !== undefined) {
        updates.push(`kill_switch_reason = $${paramIndex++}`);
        values.push(flag.killSwitchReason);
      }
      if (flag.rolloutPercentage !== undefined) {
        updates.push(`rollout_percentage = $${paramIndex++}`);
        values.push(flag.rolloutPercentage);
      }
      if (flag.rolloutStrategy !== undefined) {
        updates.push(`rollout_strategy = $${paramIndex++}`);
        values.push(flag.rolloutStrategy);
      }
      if (flag.experimentId !== undefined) {
        updates.push(`experiment_id = $${paramIndex++}`);
        values.push(flag.experimentId);
      }
      if (flag.evaluationCount !== undefined) {
        updates.push(`evaluation_count = $${paramIndex++}`);
        values.push(flag.evaluationCount);
      }
      if (flag.lastEvaluatedAt !== undefined) {
        updates.push(`last_evaluated_at = $${paramIndex++}`);
        values.push(flag.lastEvaluatedAt);
      }

      if (updates.length > 0) {
        values.push(flagId);
        await client.query(
          `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      // Update rules if provided
      if (flag.rules) {
        // Delete existing rules
        await client.query('DELETE FROM flag_rules WHERE flag_id = $1', [flagId]);

        // Insert new rules
        for (const rule of flag.rules) {
          await client.query(
            `INSERT INTO flag_rules (
              id, flag_id, name, condition, value,
              priority, enabled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              rule.id,
              flagId,
              rule.name,
              JSON.stringify(rule.condition),
              JSON.stringify(rule.value),
              rule.priority,
              rule.enabled
            ]
          );
        }
      }

      // Update variants if provided
      if (flag.variants) {
        // Delete existing variants
        await client.query('DELETE FROM flag_variants WHERE flag_id = $1', [flagId]);

        // Insert new variants
        for (const variant of flag.variants) {
          await client.query(
            `INSERT INTO flag_variants (
              id, flag_id, name, description,
              weight, payload, is_control
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              variant.id,
              flagId,
              variant.name,
              variant.description,
              variant.weight,
              JSON.stringify(variant.payload),
              variant.isControl ?? false
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Invalidate cache
      if (this.cacheEnabled && this.redis) {
        await this.invalidateFlagCache(flagId);
      }

      // Get updated flag and emit event
      const updatedFlag = await this.getFlag(flagId);
      if (updatedFlag) {
        this.emit('flagUpdated', updatedFlag);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a flag
   */
  async deleteFlag(flagId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Delete variants
      await client.query('DELETE FROM flag_variants WHERE flag_id = $1', [flagId]);

      // Delete rules
      await client.query('DELETE FROM flag_rules WHERE flag_id = $1', [flagId]);

      // Delete flag
      await client.query('DELETE FROM feature_flags WHERE id = $1', [flagId]);

      await client.query('COMMIT');

      // Invalidate cache
      if (this.cacheEnabled && this.redis) {
        await this.invalidateFlagCache(flagId);
      }

      this.emit('flagDeleted', flagId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a flag by ID
   */
  async getFlag(flagId: string): Promise<FlagDefinition | null> {
    // Try Redis cache first
    if (this.cacheEnabled && this.redis) {
      const cached = await this.getCachedFlag(flagId);
      if (cached) {
        return cached;
      }
    }

    // Query from PostgreSQL
    const result = await this.pool.query(
      `SELECT
        id, name, description, type, state,
        created_at, updated_at, created_by,
        environment, tags, default_value, kill_switch_enabled,
        kill_switch_reason, rollout_percentage, rollout_strategy,
        experiment_id, evaluation_count, last_evaluated_at
       FROM feature_flags
       WHERE id = $1`,
      [flagId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const flag = await this.buildFlagFromRow(result.rows[0]);

    // Cache the flag
    if (this.cacheEnabled && this.redis) {
      await this.cacheFlag(flag);
    }

    return flag;
  }

  /**
   * List all flags with optional filters
   */
  async listFlags(filters?: {
    environment?: string;
    state?: FlagState;
    type?: FlagType;
    tags?: string[];
  }): Promise<FlagDefinition[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.environment) {
      conditions.push(`environment = $${paramIndex++}`);
      values.push(filters.environment);
    }

    if (filters?.state) {
      conditions.push(`state = $${paramIndex++}`);
      values.push(filters.state);
    }

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(`tags @> $${paramIndex++}`);
      values.push(JSON.stringify(filters.tags));
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await this.pool.query(
      `SELECT
        id, name, description, type, state,
        created_at, updated_at, created_by,
        environment, tags, default_value, kill_switch_enabled,
        kill_switch_reason, rollout_percentage, rollout_strategy,
        experiment_id, evaluation_count, last_evaluated_at
       FROM feature_flags
       ${whereClause}
       ORDER BY created_at DESC`,
      values
    );

    const flags: FlagDefinition[] = [];
    for (const row of result.rows) {
      flags.push(await this.buildFlagFromRow(row));
    }

    return flags;
  }

  /**
   * Get flag statistics
   */
  async getFlagStats(flagId: string): Promise<FlagStatistics> {
    const result = await this.pool.query(
      `SELECT
        evaluation_count,
        COALESCE(true_count, 0) as true_count,
        COALESCE(false_count, 0) as false_count,
        COALESCE(avg_evaluation_time, 0) as avg_evaluation_time,
        last_evaluated_at
       FROM feature_flag_stats
       WHERE flag_id = $1`,
      [flagId]
    );

    if (result.rows.length === 0) {
      return {
        flagId,
        evaluationCount: 0,
        trueCount: 0,
        falseCount: 0,
        avgEvaluationTime: 0,
        lastEvaluatedAt: new Date()
      };
    }

    const row = result.rows[0];
    return {
      flagId,
      evaluationCount: row.evaluation_count,
      trueCount: row.true_count,
      falseCount: row.false_count,
      avgEvaluationTime: row.avg_evaluation_time,
      lastEvaluatedAt: row.last_evaluated_at
    };
  }

  /**
   * Record flag evaluation
   */
  async recordEvaluation(
    flagId: string,
    value: any,
    evaluationTime: number
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO feature_flag_evaluations (flag_id, value, evaluation_time)
       VALUES ($1, $2, $3)`,
      [flagId, value, evaluationTime]
    );

    // Update stats asynchronously
    this.updateFlagStats(flagId, value, evaluationTime).catch(console.error);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.pool.end();

    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Private: Build flag object from database row
   */
  private async buildFlagFromRow(row: any): Promise<FlagDefinition> {
    // Get rules
    const rulesResult = await this.pool.query(
      `SELECT id, name, condition, value, priority, enabled
       FROM flag_rules
       WHERE flag_id = $1
       ORDER BY priority DESC`,
      [row.id]
    );

    // Get variants
    const variantsResult = await this.pool.query(
      `SELECT id, name, description, weight, payload, is_control
       FROM flag_variants
       WHERE flag_id = $1`,
      [row.id]
    );

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      state: row.state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      environment: row.environment,
      tags: row.tags || [],
      defaultValue: row.default_value,
      rules: rulesResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        condition: r.condition,
        value: r.value,
        priority: r.priority,
        enabled: r.enabled
      })),
      variants: variantsResult.rows.map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        weight: v.weight,
        payload: v.payload,
        isControl: v.is_control
      })),
      killSwitchEnabled: row.kill_switch_enabled,
      killSwitchReason: row.kill_switch_reason,
      rolloutPercentage: row.rollout_percentage,
      rolloutStrategy: row.rollout_strategy,
      experimentId: row.experiment_id,
      evaluationCount: row.evaluation_count,
      lastEvaluatedAt: row.last_evaluated_at
    };
  }

  /**
   * Private: Cache flag in Redis
   */
  private async cacheFlag(flag: FlagDefinition): Promise<void> {
    if (!this.redis) return;

    const key = `feature_flag:${flag.id}`;
    await this.redis.setex(
      key,
      this.cacheTTL,
      JSON.stringify(flag)
    );
  }

  /**
   * Private: Get cached flag from Redis
   */
  private async getCachedFlag(flagId: string): Promise<FlagDefinition | null> {
    if (!this.redis) return null;

    const key = `feature_flag:${flagId}`;
    const cached = await this.redis.get(key);

    if (!cached) return null;

    return JSON.parse(cached);
  }

  /**
   * Private: Invalidate flag cache
   */
  private async invalidateFlagCache(flagId: string): Promise<void> {
    if (!this.redis) return;

    const key = `feature_flag:${flagId}`;
    await this.redis.del(key);
  }

  /**
   * Private: Update flag statistics
   */
  private async updateFlagStats(
    flagId: string,
    value: any,
    evaluationTime: number
  ): Promise<void> {
    const isTrue = Boolean(value);

    await this.pool.query(
      `INSERT INTO feature_flag_stats (flag_id, true_count, false_count, avg_evaluation_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (flag_id)
       DO UPDATE SET
         true_count = feature_flag_stats.true_count + $2,
         false_count = feature_flag_stats.false_count + $3,
         avg_evaluation_time = (feature_flag_stats.avg_evaluation_time * feature_flag_stats.evaluation_count + $4) / (feature_flag_stats.evaluation_count + 1),
         evaluation_count = feature_flag_stats.evaluation_count + 1,
         last_evaluated_at = NOW()`,
      [flagId, isTrue ? 1 : 0, isTrue ? 0 : 1, evaluationTime]
    );
  }

  /**
   * Private: Subscribe to PostgreSQL notifications
   */
  private subscribeToNotifications(): void {
    this.pool.on('notification', (msg) => {
      if (msg.channel === 'feature_flag_changes') {
        try {
          const event = JSON.parse(msg.payload);
          this.emit(event.type, event);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      }
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    postgresql: boolean;
    redis: boolean;
  }> {
    const postgresql = await this.pool.query('SELECT 1').then(() => true).catch(() => false);
    const redis = this.redis ? await this.redis.ping().then(() => true).catch(() => false) : false;

    return { postgresql, redis };
  }
}
