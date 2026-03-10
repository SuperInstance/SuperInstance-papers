/**
 * ExperimentTracker - A/B testing and experiment management
 *
 * Provides:
 * - Variant assignment with consistent hashing
 * - Conversion tracking
 * - Statistical significance calculation
 * - Winner selection
 * - Experiment lifecycle management
 */

import { createHash } from 'crypto';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { UserSegmenter } from './UserSegmenter.js';
import { VariantConfig } from './FeatureFlagManager.js';

/**
 * Experiment state
 */
export enum ExperimentState {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Experiment definition
 */
export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  successMetric: string;
  targetMetric: string;
  minSampleSize: number;
  confidenceLevel: number;  // 0-1, typically 0.95
  state: ExperimentState;
  variants: ExperimentVariant[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  tags: string[];
  segmentationRules?: any[];
}

/**
 * Experiment variant
 */
export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  allocationWeight: number;  // 0-1
  payload: any;
  settings?: Record<string, any>;
}

/**
 * Variant assignment
 */
export interface VariantAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  variant: ExperimentVariant;
  assignedAt: Date;
  reassignedFrom?: string;
}

/**
 * Conversion event
 */
export interface ConversionEvent {
  id: string;
  userId: string;
  experimentId: string;
  variantId: string;
  eventName: string;
  value?: number;
  timestamp: Date;
  properties?: Record<string, any>;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experimentId: string;
  state: ExperimentState;
  totalParticipants: number;
  totalConversions: number;
  variantResults: VariantResult[];
  statisticalSignificance?: {
    pValue: number;
    isSignificant: boolean;
    confidence: number;
    winner?: string;
    testUsed: 'z-test' | 't-test' | 'chi-square' | 'mann-whitney';
  };
  recommendation?: string;
  generatedAt: Date;
}

/**
 * Variant result
 */
export interface VariantResult {
  variantId: string;
  variantName: string;
  isControl: boolean;
  participants: number;
  conversions: number;
  conversionRate: number;
  avgValue?: number;
  improvement?: number;
  improvementPercentage?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  pValue?: number;
  isSignificant?: boolean;
}

/**
 * ExperimentTracker options
 */
export interface ExperimentTrackerOptions {
  postgresql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  segmenter: UserSegmenter;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * ExperimentTracker - Main experiment tracking class
 */
export class ExperimentTracker extends EventEmitter {
  private pool: Pool;
  private segmenter: UserSegmenter;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private assignmentCache: Map<string, VariantAssignment>;

  constructor(options: ExperimentTrackerOptions) {
    super();

    this.pool = new Pool({
      host: options.postgresql.host,
      port: options.postgresql.port,
      database: options.postgresql.database,
      user: options.postgresql.user,
      password: options.postgresql.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.segmenter = options.segmenter;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 600; // 10 minutes default
    this.assignmentCache = new Map();
  }

  /**
   * Create a new experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    const id = this.generateId();
    const now = new Date();

    const newExperiment: Experiment = {
      ...experiment,
      id,
      createdAt: now,
      updatedAt: now
    };

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert experiment
      await client.query(
        `INSERT INTO experiments (
          id, name, description, hypothesis, success_metric,
          target_metric, min_sample_size, confidence_level,
          state, created_at, updated_at, started_at, completed_at,
          created_by, tags, segmentation_rules
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          id,
          newExperiment.name,
          newExperiment.description,
          newExperiment.hypothesis,
          newExperiment.successMetric,
          newExperiment.targetMetric,
          newExperiment.minSampleSize,
          newExperiment.confidenceLevel,
          newExperiment.state,
          now,
          now,
          newExperiment.startedAt,
          newExperiment.completedAt,
          newExperiment.createdBy,
          JSON.stringify(newExperiment.tags),
          JSON.stringify(newExperiment.segmentationRules || [])
        ]
      );

      // Insert variants
      for (const variant of newExperiment.variants) {
        await client.query(
          `INSERT INTO experiment_variants (
            id, experiment_id, name, description,
            is_control, allocation_weight, payload, settings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            variant.id,
            id,
            variant.name,
            variant.description,
            variant.isControl,
            variant.allocationWeight,
            JSON.stringify(variant.payload),
            variant.settings ? JSON.stringify(variant.settings) : null
          ]
        );
      }

      await client.query('COMMIT');

      this.emit('experimentCreated', newExperiment);
      return newExperiment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an experiment
   */
  async updateExperiment(experimentId: string, updates: Partial<Experiment>): Promise<Experiment> {
    const existing = await this.getExperiment(experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const updated: Experiment = {
      ...existing,
      ...updates,
      id: experimentId,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    };

    await this.pool.query(
      `UPDATE experiments
       SET name = $1, description = $2, hypothesis = $3,
           success_metric = $4, target_metric = $5,
           min_sample_size = $6, confidence_level = $7,
           state = $8, updated_at = $9, tags = $10
       WHERE id = $11`,
      [
        updated.name,
        updated.description,
        updated.hypothesis,
        updated.successMetric,
        updated.targetMetric,
        updated.minSampleSize,
        updated.confidenceLevel,
        updated.state,
        updated.updatedAt,
        JSON.stringify(updated.tags),
        experimentId
      ]
    );

    this.emit('experimentUpdated', updated);
    return updated;
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId: string): Promise<Experiment> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.state !== ExperimentState.DRAFT && experiment.state !== ExperimentState.PAUSED) {
      throw new Error(`Experiment must be in DRAFT or PAUSED state to start`);
    }

    return this.updateExperiment(experimentId, {
      state: ExperimentState.RUNNING,
      startedAt: experiment.startedAt || new Date()
    });
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId: string): Promise<Experiment> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.state !== ExperimentState.RUNNING) {
      throw new Error(`Experiment must be RUNNING to pause`);
    }

    return this.updateExperiment(experimentId, {
      state: ExperimentState.PAUSED
    });
  }

  /**
   * Complete an experiment
   */
  async completeExperiment(experimentId: string, winner?: string): Promise<Experiment> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const updated = await this.updateExperiment(experimentId, {
      state: ExperimentState.COMPLETED,
      completedAt: new Date()
    });

    if (winner) {
      await this.setWinner(experimentId, winner);
    }

    return updated;
  }

  /**
   * Delete an experiment
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM conversion_events WHERE experiment_id = $1', [experimentId]);
      await client.query('DELETE FROM variant_assignments WHERE experiment_id = $1', [experimentId]);
      await client.query('DELETE FROM experiment_variants WHERE experiment_id = $1', [experimentId]);
      await client.query('DELETE FROM experiments WHERE id = $1', [experimentId]);

      await client.query('COMMIT');

      this.emit('experimentDeleted', experimentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get an experiment by ID
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    const result = await this.pool.query(
      `SELECT id, name, description, hypothesis, success_metric,
              target_metric, min_sample_size, confidence_level,
              state, created_at, updated_at, started_at, completed_at,
              created_by, tags, segmentation_rules
       FROM experiments
       WHERE id = $1`,
      [experimentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get variants
    const variantsResult = await this.pool.query(
      `SELECT id, name, description, is_control, allocation_weight, payload, settings
       FROM experiment_variants
       WHERE experiment_id = $1
       ORDER BY is_control DESC, allocation_weight DESC`,
      [experimentId]
    );

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      hypothesis: row.hypothesis,
      successMetric: row.success_metric,
      targetMetric: row.target_metric,
      minSampleSize: row.min_sample_size,
      confidenceLevel: row.confidence_level,
      state: row.state,
      variants: variantsResult.rows.map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        isControl: v.is_control,
        allocationWeight: v.allocation_weight,
        payload: v.payload,
        settings: v.settings
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdBy: row.created_by,
      tags: row.tags,
      segmentationRules: row.segmentation_rules
    };
  }

  /**
   * List all experiments
   */
  async listExperiments(filters?: {
    state?: ExperimentState;
    createdBy?: string;
    tags?: string[];
  }): Promise<Experiment[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.state) {
      conditions.push(`state = $${paramIndex++}`);
      values.push(filters.state);
    }

    if (filters?.createdBy) {
      conditions.push(`created_by = $${paramIndex++}`);
      values.push(filters.createdBy);
    }

    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(`tags @> $${paramIndex++}`);
      values.push(JSON.stringify(filters.tags));
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await this.pool.query(
      `SELECT id FROM experiments ${whereClause} ORDER BY created_at DESC`,
      values
    );

    const experiments: Experiment[] = [];
    for (const row of result.rows) {
      const experiment = await this.getExperiment(row.id);
      if (experiment) {
        experiments.push(experiment);
      }
    }

    return experiments;
  }

  /**
   * Assign a user to a variant
   */
  async getVariant(
    experimentId: string,
    userId: string,
    context?: any
  ): Promise<VariantAssignment> {
    // Check cache first
    const cacheKey = `${experimentId}:${userId}`;
    const cached = this.assignmentCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.state !== ExperimentState.RUNNING) {
      throw new Error(`Experiment is not running`);
    }

    // Check for existing assignment
    const existingResult = await this.pool.query(
      `SELECT variant_id, assigned_at
       FROM variant_assignments
       WHERE experiment_id = $1 AND user_id = $2
       ORDER BY assigned_at DESC
       LIMIT 1`,
      [experimentId, userId]
    );

    if (existingResult.rows.length > 0) {
      const variant = experiment.variants.find(v => v.id === existingResult.rows[0].variant_id);
      if (variant) {
        const assignment: VariantAssignment = {
          userId,
          experimentId,
          variantId: variant.id,
          variant,
          assignedAt: existingResult.rows[0].assigned_at
        };

        this.assignmentCache.set(cacheKey, assignment);
        return assignment;
      }
    }

    // Assign to new variant using consistent hashing
    const bucket = await this.segmenter.getPercentageBucket(userId, experimentId);
    const variant = this.selectVariantByWeight(bucket, experiment.variants);

    const assignment: VariantAssignment = {
      userId,
      experimentId,
      variantId: variant.id,
      variant,
      assignedAt: new Date()
    };

    // Store assignment
    await this.pool.query(
      `INSERT INTO variant_assignments (user_id, experiment_id, variant_id, assigned_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, experiment_id)
       DO UPDATE SET variant_id = $3, assigned_at = $4`,
      [userId, experimentId, variant.id, assignment.assignedAt]
    );

    this.assignmentCache.set(cacheKey, assignment);
    this.emit('variantAssigned', assignment);

    return assignment;
  }

  /**
   * Track a conversion event
   */
  async trackConversion(event: Omit<ConversionEvent, 'id' | 'timestamp'>): Promise<ConversionEvent> {
    const conversion: ConversionEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date()
    };

    await this.pool.query(
      `INSERT INTO conversion_events (
        id, user_id, experiment_id, variant_id,
        event_name, value, timestamp, properties
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        conversion.id,
        conversion.userId,
        conversion.experimentId,
        conversion.variantId,
        conversion.eventName,
        conversion.value ?? null,
        conversion.timestamp,
        conversion.properties ? JSON.stringify(conversion.properties) : null
      ]
    );

    this.emit('conversionTracked', conversion);
    return conversion;
  }

  /**
   * Get experiment results
   */
  async getResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Get participant counts per variant
    const participantResult = await this.pool.query(
      `SELECT variant_id, COUNT(DISTINCT user_id) as participants
       FROM variant_assignments
       WHERE experiment_id = $1
       GROUP BY variant_id`,
      [experimentId]
    );

    // Get conversion counts per variant
    const conversionResult = await this.pool.query(
      `SELECT variant_id,
              COUNT(*) as conversions,
              COALESCE(AVG(value), 0) as avg_value
       FROM conversion_events
       WHERE experiment_id = $1
       GROUP BY variant_id`,
      [experimentId]
    );

    const variantResults: VariantResult[] = [];

    for (const variant of experiment.variants) {
      const participantData = participantResult.rows.find(r => r.variant_id === variant.id);
      const conversionData = conversionResult.rows.find(r => r.variant_id === variant.id);

      const participants = participantData?.participants || 0;
      const conversions = conversionData?.conversions || 0;
      const conversionRate = participants > 0 ? conversions / participants : 0;
      const avgValue = conversionData?.avg_value || 0;

      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        participants,
        conversions,
        conversionRate,
        avgValue
      });
    }

    const totalParticipants = variantResults.reduce((sum, r) => sum + r.participants, 0);
    const totalConversions = variantResults.reduce((sum, r) => sum + r.conversions, 0);

    // Calculate statistical significance
    const statisticalSignificance = this.calculateSignificance(
      variantResults,
      experiment.confidenceLevel
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      experiment,
      variantResults,
      statisticalSignificance
    );

    return {
      experimentId,
      state: experiment.state,
      totalParticipants,
      totalConversions,
      variantResults,
      statisticalSignificance,
      recommendation,
      generatedAt: new Date()
    };
  }

  /**
   * Set the winning variant
   */
  async setWinner(experimentId: string, variantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE experiments SET winner_variant = $1 WHERE id = $2`,
      [variantId, experimentId]
    );

    this.emit('winnerSelected', { experimentId, variantId });
  }

  /**
   * Clean up old experiments
   */
  async cleanupExperiments(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.pool.query(
      `DELETE FROM experiments
       WHERE state = 'archived'
       AND updated_at < $1
       RETURNING id`,
      [cutoffDate]
    );

    return result.rowCount || 0;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Private: Select variant by weight using consistent hashing
   */
  private selectVariantByWeight(bucket: number, variants: ExperimentVariant[]): ExperimentVariant {
    let cumulative = 0;
    const scaledBucket = bucket / 100;

    for (const variant of variants) {
      cumulative += variant.allocationWeight;
      if (scaledBucket <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Private: Calculate statistical significance
   */
  private calculateSignificance(
    variantResults: VariantResult[],
    confidenceLevel: number
  ): ExperimentResults['statisticalSignificance'] {
    if (variantResults.length < 2) {
      return undefined;
    }

    const control = variantResults.find(r => r.isControl);
    if (!control) {
      return undefined;
    }

    const treatments = variantResults.filter(r => !r.isControl);
    if (treatments.length === 0) {
      return undefined;
    }

    // Calculate improvement and p-value for each treatment vs control
    for (const treatment of treatments) {
      const improvement = treatment.conversionRate - control.conversionRate;
      treatment.improvement = improvement;
      treatment.improvementPercentage = control.conversionRate > 0
        ? (improvement / control.conversionRate) * 100
        : 0;

      // Simple z-test for proportions
      const p1 = treatment.conversionRate;
      const p2 = control.conversionRate;
      const n1 = treatment.participants;
      const n2 = control.participants;

      if (n1 > 0 && n2 > 0) {
        const pooledP = (treatment.conversions + control.conversions) / (n1 + n2);
        const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

        if (se > 0) {
          const z = Math.abs(p1 - p2) / se;
          treatment.pValue = 2 * (1 - this.normalCDF(z));
          treatment.isSignificant = treatment.pValue < (1 - confidenceLevel);
        }
      }
    }

    // Determine winner
    const significant = treatments.filter(t => t.isSignificant && t.improvementPercentage && t.improvementPercentage > 0);
    const winner = significant.length > 0
      ? significant.reduce((best, current) =>
          (current.improvementPercentage || 0) > (best.improvementPercentage || 0) ? current : best
        ).variantId
      : undefined;

    return {
      pValue: Math.min(...treatments.map(t => t.pValue || 1)),
      isSignificant: significant.length > 0,
      confidence: confidenceLevel,
      winner,
      testUsed: 'z-test'
    };
  }

  /**
   * Private: Generate recommendation
   */
  private generateRecommendation(
    experiment: Experiment,
    results: VariantResult[],
    significance?: ExperimentResults['statisticalSignificance']
  ): string {
    if (experiment.state !== ExperimentState.RUNNING) {
      return `Experiment is ${experiment.state}. No recommendation available.`;
    }

    const totalParticipants = results.reduce((sum, r) => sum + r.participants, 0);

    if (totalParticipants < experiment.minSampleSize) {
      return `Insufficient sample size. Current: ${totalParticipants}, Required: ${experiment.minSampleSize}`;
    }

    if (!significance) {
      return 'Unable to calculate statistical significance.';
    }

    if (significance.isSignificant && significance.winner) {
      const winner = results.find(r => r.variantId === significance.winner);
      if (winner && winner.improvementPercentage) {
        return `Variant ${winner.variantName} is the winner with ${winner.improvementPercentage.toFixed(2)}% improvement (${significance.confidence * 100}% confidence). Consider stopping the experiment and rolling out the winner.`;
      }
    }

    return 'No statistically significant winner yet. Continue running the experiment.';
  }

  /**
   * Private: Standard normal CDF
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  /**
   * Private: Generate unique ID
   */
  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
