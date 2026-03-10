/**
 * UserSegmenter - User segmentation for feature flags
 *
 * Provides:
 * - User ID-based segmentation
 * - Attribute-based segmentation (plan, role, region)
 * - Percentage-based segmentation (consistent hashing)
 * - Behavior-based segmentation
 * - Custom segmentation rules
 */

import { createHash } from 'crypto';
import { Pool } from 'pg';

/**
 * Segment definition
 */
export interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  userCount?: number;
}

/**
 * Segment rule
 */
export interface SegmentRule {
  type: 'attribute' | 'behavior' | 'custom';
  condition: RuleCondition;
  weight?: number;  // For combining multiple rules
}

/**
 * Rule condition
 */
export interface RuleCondition {
  attribute?: string;
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: any;
  timeWindow?: string;  // For behavior-based rules (e.g., '7d', '24h')
}

/**
 * User attributes for segmentation
 */
export interface UserAttributes {
  userId: string;
  plan?: string;
  role?: string;
  region?: string;
  email?: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  customAttributes?: Record<string, any>;
}

/**
 * User behavior data
 */
export interface UserBehavior {
  userId: string;
  action: string;
  timestamp: Date;
  properties?: Record<string, any>;
}

/**
 * Segment assignment
 */
export interface SegmentAssignment {
  userId: string;
  segmentId: string;
  assignedAt: Date;
  expiresAt?: Date;
  reasons: string[];
}

/**
 * UserSegmenter options
 */
export interface UserSegmenterOptions {
  postgresql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  cacheEnabled?: boolean;
  cacheTTL?: number;  // seconds
}

/**
 * UserSegmenter - Main segmentation class
 */
export class UserSegmenter {
  private pool: Pool;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private segmentCache: Map<string, { segment: Segment; expiresAt: number }>;
  private assignmentCache: Map<string, { assignments: string[]; expiresAt: number }>;

  constructor(options: UserSegmenterOptions) {
    this.pool = new Pool({
      host: options.postgresql.host,
      port: options.postgresql.port,
      database: options.postgresql.database,
      user: options.postgresql.user,
      password: options.postgresql.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 300; // 5 minutes default
    this.segmentCache = new Map();
    this.assignmentCache = new Map();
  }

  /**
   * Create a new segment
   */
  async createSegment(segment: Omit<Segment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Segment> {
    const id = this.generateId();
    const now = new Date();

    const newSegment: Segment = {
      ...segment,
      id,
      createdAt: now,
      updatedAt: now
    };

    await this.pool.query(
      `INSERT INTO user_segments (id, name, description, rules, created_at, updated_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        newSegment.name,
        newSegment.description,
        JSON.stringify(newSegment.rules),
        now,
        now,
        newSegment.isActive
      ]
    );

    return newSegment;
  }

  /**
   * Update a segment
   */
  async updateSegment(segmentId: string, updates: Partial<Segment>): Promise<Segment> {
    const existing = await this.getSegment(segmentId);
    if (!existing) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    const updated: Segment = {
      ...existing,
      ...updates,
      id: segmentId,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    };

    await this.pool.query(
      `UPDATE user_segments
       SET name = $1, description = $2, rules = $3, updated_at = $4, is_active = $5
       WHERE id = $6`,
      [
        updated.name,
        updated.description,
        JSON.stringify(updated.rules),
        updated.updatedAt,
        updated.isActive,
        segmentId
      ]
    );

    this.invalidateCache(segmentId);

    return updated;
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId: string): Promise<void> {
    await this.pool.query('DELETE FROM user_segments WHERE id = $1', [segmentId]);
    this.invalidateCache(segmentId);
  }

  /**
   * Get a segment by ID
   */
  async getSegment(segmentId: string): Promise<Segment | null> {
    // Check cache
    const cached = this.segmentCache.get(segmentId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.segment;
    }

    const result = await this.pool.query(
      `SELECT id, name, description, rules, created_at, updated_at, is_active
       FROM user_segments
       WHERE id = $1`,
      [segmentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const segment: Segment = {
      id: row.id,
      name: row.name,
      description: row.description,
      rules: row.rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
      userCount: row.user_count
    };

    // Cache the segment
    if (this.cacheEnabled) {
      this.segmentCache.set(segmentId, {
        segment,
        expiresAt: Date.now() + (this.cacheTTL * 1000)
      });
    }

    return segment;
  }

  /**
   * List all segments
   */
  async listSegments(activeOnly?: boolean): Promise<Segment[]> {
    const result = await this.pool.query(
      `SELECT id, name, description, rules, created_at, updated_at, is_active
       FROM user_segments
       ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY created_at DESC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rules: row.rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
      userCount: row.user_count
    }));
  }

  /**
   * Get all segments for a user
   */
  async getUserSegments(userId: string): Promise<Segment[]> {
    // Check cache
    const cacheKey = userId;
    const cached = this.assignmentCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const segments: Segment[] = [];
      for (const segmentId of cached.assignments) {
        const segment = await this.getSegment(segmentId);
        if (segment) {
          segments.push(segment);
        }
      }
      return segments;
    }

    const result = await this.pool.query(
      `SELECT segment_id
       FROM user_segment_assignments
       WHERE user_id = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    const segmentIds = result.rows.map((row: any) => row.segment_id);
    const segments: Segment[] = [];

    for (const segmentId of segmentIds) {
      const segment = await this.getSegment(segmentId);
      if (segment && segment.isActive) {
        segments.push(segment);
      }
    }

    // Cache the assignments
    if (this.cacheEnabled) {
      this.assignmentCache.set(cacheKey, {
        assignments: segmentIds,
        expiresAt: Date.now() + (this.cacheTTL * 1000)
      });
    }

    return segments;
  }

  /**
   * Get the primary segment for a user
   */
  async getSegment(userId: string): Promise<string> {
    const segments = await this.getUserSegments(userId);
    return segments.length > 0 ? segments[0].id : 'default';
  }

  /**
   * Check if user is in a specific segment
   */
  async isInSegment(userId: string, segmentId: string): Promise<boolean> {
    const segments = await this.getUserSegments(userId);
    return segments.some(s => s.id === segmentId);
  }

  /**
   * Assign user to segments based on attributes
   */
  async assignUserToSegments(
    userId: string,
    attributes: UserAttributes
  ): Promise<SegmentAssignment[]> {
    const segments = await this.listSegments(true);
    const assignments: SegmentAssignment[] = [];

    for (const segment of segments) {
      const matches = await this.evaluateSegmentRules(segment, userId, attributes);

      if (matches) {
        const assignment: SegmentAssignment = {
          userId,
          segmentId: segment.id,
          assignedAt: new Date(),
          reasons: matches
        };

        // Store assignment
        await this.pool.query(
          `INSERT INTO user_segment_assignments (user_id, segment_id, assigned_at, reasons)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, segment_id)
           DO UPDATE SET assigned_at = $3, reasons = $4`,
          [userId, segment.id, assignment.assignedAt, JSON.stringify(assignment.reasons)]
        );

        assignments.push(assignment);
      }
    }

    // Invalidate cache
    this.assignmentCache.delete(userId);

    return assignments;
  }

  /**
   * Get percentage bucket for a user (0-99)
   * Uses consistent hashing based on userId and flagId
   */
  async getPercentageBucket(userId: string, flagId: string): Promise<number> {
    // Create consistent hash
    const hash = createHash('sha256')
      .update(`${userId}:${flagId}`)
      .digest('hex');

    // Convert to number and get bucket
    const num = BigInt('0x' + hash.substring(0, 16));
    return Number(num % 100n);
  }

  /**
   * Check if user matches specific attribute conditions
   */
  async matchesAttributeCondition(
    userId: string,
    condition: RuleCondition
  ): Promise<boolean> {
    // Get user attributes
    const attributes = await this.getUserAttributes(userId);
    if (!attributes) return false;

    const { attribute, operator, value } = condition;
    if (!attribute) return false;

    const attrValue = this.getNestedValue(attributes, attribute);
    return this.evaluateCondition(attrValue, operator, value);
  }

  /**
   * Get user attributes
   */
  async getUserAttributes(userId: string): Promise<UserAttributes | null> {
    const result = await this.pool.query(
      `SELECT user_id, plan, role, region, email, created_at, last_active_at, custom_attributes
       FROM user_attributes
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      plan: row.plan,
      role: row.role,
      region: row.region,
      email: row.email,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      customAttributes: row.custom_attributes
    };
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(
    userId: string,
    attributes: Partial<UserAttributes>
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_attributes (user_id, plan, role, region, email, custom_attributes, last_active_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         plan = COALESCE($2, user_attributes.plan),
         role = COALESCE($3, user_attributes.role),
         region = COALESCE($4, user_attributes.region),
         email = COALESCE($5, user_attributes.email),
         custom_attributes = COALESCE($6, user_attributes.custom_attributes),
         last_active_at = NOW()`,
      [
        userId,
        attributes.plan ?? null,
        attributes.role ?? null,
        attributes.region ?? null,
        attributes.email ?? null,
        attributes.customAttributes ? JSON.stringify(attributes.customAttributes) : null
      ]
    );

    // Invalidate cache and reassign segments
    this.assignmentCache.delete(userId);
    const userAttrs = await this.getUserAttributes(userId);
    if (userAttrs) {
      await this.assignUserToSegments(userId, userAttrs);
    }
  }

  /**
   * Record user behavior
   */
  async recordBehavior(behavior: UserBehavior): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_behaviors (user_id, action, timestamp, properties)
       VALUES ($1, $2, $3, $4)`,
      [behavior.userId, behavior.action, behavior.timestamp, behavior.properties ? JSON.stringify(behavior.properties) : null]
    );
  }

  /**
   * Get user behavior count
   */
  async getBehaviorCount(
    userId: string,
    action: string,
    timeWindow?: string
  ): Promise<number> {
    let query = `SELECT COUNT(*) as count
                 FROM user_behaviors
                 WHERE user_id = $1 AND action = $2`;
    const params: any[] = [userId, action];

    if (timeWindow) {
      const interval = this.parseTimeWindow(timeWindow);
      query += ` AND timestamp > NOW() - INTERVAL '${interval}'`;
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get segment statistics
   */
  async getSegmentStats(segmentId: string): Promise<{
    userCount: number;
    createdAt: Date;
    avgSessionLength?: number;
    topActions?: Array<{ action: string; count: number }>;
  }> {
    const userCountResult = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM user_segment_assignments
       WHERE segment_id = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [segmentId]
    );

    const segment = await this.getSegment(segmentId);

    return {
      userCount: parseInt(userCountResult.rows[0].count),
      createdAt: segment?.createdAt || new Date()
    };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Private: Evaluate segment rules
   */
  private async evaluateSegmentRules(
    segment: Segment,
    userId: string,
    attributes: UserAttributes
  ): Promise<string[] | null> {
    const reasons: string[] = [];

    for (const rule of segment.rules) {
      const matches = await this.evaluateRule(rule, userId, attributes);
      if (matches) {
        reasons.push(`Matched ${rule.type} rule`);
      } else if (rule.weight && rule.weight > 0.5) {
        // High-weight rules that don't match disqualify the segment
        return null;
      }
    }

    return reasons.length > 0 ? reasons : null;
  }

  /**
   * Private: Evaluate a single rule
   */
  private async evaluateRule(
    rule: SegmentRule,
    userId: string,
    attributes: UserAttributes
  ): Promise<boolean> {
    const { type, condition } = rule;

    switch (type) {
      case 'attribute':
        return this.evaluateAttributeRule(condition, attributes);

      case 'behavior':
        return await this.evaluateBehaviorRule(condition, userId);

      case 'custom':
        // Custom rules would be evaluated by a pluggable function
        return false;

      default:
        return false;
    }
  }

  /**
   * Private: Evaluate attribute rule
   */
  private evaluateAttributeRule(
    condition: RuleCondition,
    attributes: UserAttributes
  ): boolean {
    const { attribute, operator, value } = condition;
    if (!attribute) return false;

    const attrValue = this.getNestedValue(attributes, attribute);
    return this.evaluateCondition(attrValue, operator, value);
  }

  /**
   * Private: Evaluate behavior rule
   */
  private async evaluateBehaviorRule(
    condition: RuleCondition,
    userId: string
  ): Promise<boolean> {
    const action = condition.attribute || 'any';
    const count = await this.getBehaviorCount(userId, action, condition.timeWindow);

    return this.evaluateCondition(count, condition.operator, condition.value);
  }

  /**
   * Private: Evaluate condition
   */
  private evaluateCondition(
    actual: any,
    operator: string,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return Array.isArray(actual)
          ? actual.includes(expected)
          : String(actual).includes(expected);
      case 'matches':
        return new RegExp(expected).test(actual);
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      case 'between':
        return Array.isArray(expected) && actual >= expected[0] && actual <= expected[1];
      default:
        return false;
    }
  }

  /**
   * Private: Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Private: Parse time window string to interval
   */
  private parseTimeWindow(timeWindow: string): string {
    const match = timeWindow.match(/^(\d+)([dhms])$/);
    if (!match) return '7 days';

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return `${value} days`;
      case 'h': return `${value} hours`;
      case 'm': return `${value} minutes`;
      case 's': return `${value} seconds`;
      default: return `${value} days`;
    }
  }

  /**
   * Private: Invalidate cache
   */
  private invalidateCache(segmentId: string): void {
    this.segmentCache.delete(segmentId);
  }

  /**
   * Private: Generate unique ID
   */
  private generateId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
