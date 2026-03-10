/**
 * ConsciousnessRepository
 *
 * Handles cell consciousness data storage and retrieval:
 * - Time-series consciousness data
 * - Sensation tracking
 * - Anomaly detection
 * - Trend analysis
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type SensationType = 'absolute_change' | 'rate_of_change' | 'acceleration' |
  'presence' | 'pattern' | 'anomaly';

export interface CellConsciousness {
  id: string;
  cellId: string;
  timestamp: Date;
  sensationType: SensationType;
  sensationData: Record<string, any>;
  internalState: Record<string, any>;
  reasoningTrace?: Record<string, any>;
  calculationDurationMs?: number;
  memoryUsedBytes?: number;
}

export interface ConsciousnessTrend {
  timestamp: Date;
  sensationType: SensationType;
  avgValue: number;
  minValue: number;
  maxValue: number;
  stdDev: number;
}

export interface ConsciousnessAnomaly {
  timestamp: Date;
  sensationType: SensationType;
  value: number;
  expectedValue: number;
  deviation: number;
}

export interface CreateConsciousnessInput {
  cellId: string;
  sensationType: SensationType;
  sensationData: Record<string, any>;
  internalState?: Record<string, any>;
  reasoningTrace?: Record<string, any>;
  calculationDurationMs?: number;
  memoryUsedBytes?: number;
}

export class ConsciousnessRepository {
  constructor(private pool: Pool) {}

  /**
   * Record consciousness event
   */
  async record(input: CreateConsciousnessInput): Promise<CellConsciousness> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO cell_consciousness (
        id,
        cell_id,
        timestamp,
        sensation_type,
        sensation_data,
        internal_state,
        reasoning_trace,
        calculation_duration_ms,
        memory_used_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        cell_id as "cellId",
        timestamp,
        sensation_type as "sensationType",
        sensation_data as "sensationData",
        internal_state as "internalState",
        reasoning_trace as "reasoningTrace",
        calculation_duration_ms as "calculationDurationMs",
        memory_used_bytes as "memoryUsedBytes"`,
      [
        id,
        input.cellId,
        now,
        input.sensationType,
        input.sensationData,
        input.internalState || {},
        input.reasoningTrace,
        input.calculationDurationMs,
        input.memoryUsedBytes,
      ]
    );

    return result.rows[0];
  }

  /**
   * Batch record consciousness events
   */
  async batchRecord(inputs: CreateConsciousnessInput[]): Promise<CellConsciousness[]> {
    const client = await this.pool.connect();
    const records: CellConsciousness[] = [];

    try {
      await client.query('BEGIN');

      for (const input of inputs) {
        const id = uuidv4();
        const now = new Date();

        const result = await client.query(
          `INSERT INTO cell_consciousness (
            id,
            cell_id,
            timestamp,
            sensation_type,
            sensation_data,
            internal_state,
            reasoning_trace,
            calculation_duration_ms,
            memory_used_bytes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id,
            cell_id as "cellId",
            timestamp,
            sensation_type as "sensationType",
            sensation_data as "sensationData",
            internal_state as "internalState",
            reasoning_trace as "reasoningTrace",
            calculation_duration_ms as "calculationDurationMs",
            memory_used_bytes as "memoryUsedBytes"`,
          [
            id,
            input.cellId,
            now,
            input.sensationType,
            input.sensationData,
            input.internalState || {},
            input.reasoningTrace,
            input.calculationDurationMs,
            input.memoryUsedBytes,
          ]
        );

        records.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return records;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recent consciousness data for a cell
   */
  async getRecent(
    cellId: string,
    options: {
      sensationType?: SensationType;
      hours?: number;
      limit?: number;
    } = {}
  ): Promise<CellConsciousness[]> {
    const { sensationType, hours = 24, limit = 1000 } = options;

    const conditions: string[] = ['cell_id = $1', 'timestamp > NOW() - $2'];
    const values: any[] = [cellId, `${hours} hours`];
    let paramIndex = 3;

    if (sensationType) {
      conditions.push(`sensation_type = $${paramIndex++}`);
      values.push(sensationType);
    }

    const result = await this.pool.query(
      `SELECT
        id,
        cell_id as "cellId",
        timestamp,
        sensation_type as "sensationType",
        sensation_data as "sensationData",
        internal_state as "internalState",
        reasoning_trace as "reasoningTrace",
        calculation_duration_ms as "calculationDurationMs",
        memory_used_bytes as "memoryUsedBytes"
      FROM cell_consciousness
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++}`,
      [...values, limit]
    );

    return result.rows;
  }

  /**
   * Get consciousness trend for a cell
   */
  async getTrend(
    cellId: string,
    hours = 24
  ): Promise<ConsciousnessTrend[]> {
    const result = await this.pool.query(
      `SELECT
        date_trunc('hour', timestamp) as timestamp,
        sensation_type as "sensationType",
        AVG((sensation_data->>'value')::NUMERIC) as "avgValue",
        MIN((sensation_data->>'value')::NUMERIC) as "minValue",
        MAX((sensation_data->>'value')::NUMERIC) as "maxValue",
        STDDEV((sensation_data->>'value')::NUMERIC) as "stdDev"
      FROM cell_consciousness
      WHERE cell_id = $1
        AND timestamp > NOW() - ($2 || ' hours')::INTERVAL
        AND sensation_data ? 'value'
      GROUP BY date_trunc('hour', timestamp), sensation_type
      ORDER BY timestamp DESC, sensation_type`,
      [cellId, hours]
    );

    return result.rows;
  }

  /**
   * Detect anomalies in consciousness data
   */
  async detectAnomalies(
    cellId: string,
    options: {
      hours?: number;
      stdDevs?: number;
    } = {}
  ): Promise<ConsciousnessAnomaly[]> {
    const { hours = 24, stdDevs = 3 } = options;

    const result = await this.pool.query(
      `WITH stats AS (
        SELECT
          sensation_type,
          AVG((sensation_data->>'value')::NUMERIC) as avg_val,
          STDDEV((sensation_data->>'value')::NUMERIC) as std_dev_val
        FROM cell_consciousness
        WHERE cell_id = $1
          AND timestamp > NOW() - ($2 || ' hours')::INTERVAL
        GROUP BY sensation_type
      ),
      anomalies AS (
        SELECT
          cc.timestamp,
          cc.sensation_type as "sensationType",
          (cc.sensation_data->>'value')::NUMERIC as value,
          s.avg_val as "expectedValue",
          ABS((cc.sensation_data->>'value')::NUMERIC - s.avg_val) / NULLIF(s.std_dev_val, 0) as deviation
        FROM cell_consciousness cc
        JOIN stats s ON cc.sensation_type = s.sensation_type
        WHERE cc.cell_id = $1
          AND cc.timestamp > NOW() - ($2 || ' hours')::INTERVAL
          AND s.std_dev_val IS NOT NULL
      )
      SELECT * FROM anomalies
      WHERE deviation > $3
      ORDER BY timestamp DESC`,
      [cellId, hours, stdDevs]
    );

    return result.rows;
  }

  /**
   * Get consciousness summary for a sheet
   */
  async getSheetSummary(sheetId: string): Promise<{
    cellId: string;
    columnRef: string;
    rowRef: number;
    totalObservations: number;
    lastObservation: Date;
    dominantSensation: SensationType;
    avgCalculationMs: number;
  }[]> {
    const result = await this.pool.query(
      `SELECT
        c.id as "cellId",
        c.column_ref as "columnRef",
        c.row_ref as "rowRef",
        COUNT(cc.id) as "totalObservations",
        MAX(cc.timestamp) as "lastObservation",
        mode() WITHIN GROUP (ORDER BY cc.sensation_type) as "dominantSensation",
        AVG(cc.calculation_duration_ms) as "avgCalculationMs"
      FROM cells c
      LEFT JOIN cell_consciousness cc ON c.id = cc.cell_id
        AND cc.timestamp > NOW() - INTERVAL '24 hours'
      WHERE c.sheet_id = $1
      GROUP BY c.id, c.column_ref, c.row_ref
      ORDER BY c.column_position, c.row_position`,
      [sheetId]
    );

    return result.rows;
  }

  /**
   * Delete old consciousness data
   */
  async cleanup(daysToKeep = 90): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM cell_consciousness
      WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [daysToKeep]
    );

    return result.rowCount || 0;
  }

  /**
   * Get consciousness statistics
   */
  async getStatistics(cellId: string, hours = 24): Promise<{
    totalObservations: number;
    observationsByType: Record<SensationType, number>;
    avgCalculationMs: number;
    maxCalculationMs: number;
    totalMemoryBytes: number;
  }> {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as "totalObservations",
        COUNT(*) FILTER (WHERE sensation_type = 'absolute_change') as "absolute_change",
        COUNT(*) FILTER (WHERE sensation_type = 'rate_of_change') as "rate_of_change",
        COUNT(*) FILTER (WHERE sensation_type = 'acceleration') as "acceleration",
        COUNT(*) FILTER (WHERE sensation_type = 'presence') as "presence",
        COUNT(*) FILTER (WHERE sensation_type = 'pattern') as "pattern",
        COUNT(*) FILTER (WHERE sensation_type = 'anomaly') as "anomaly",
        AVG(calculation_duration_ms) as "avgCalculationMs",
        MAX(calculation_duration_ms) as "maxCalculationMs",
        SUM(memory_used_bytes) as "totalMemoryBytes"
      FROM cell_consciousness
      WHERE cell_id = $1
        AND timestamp > NOW() - ($2 || ' hours')::INTERVAL`,
      [cellId, hours]
    );

    const row = result.rows[0];

    return {
      totalObservations: parseInt(row.totalObservations),
      observationsByType: {
        absolute_change: parseInt(row.absolute_change),
        rate_of_change: parseInt(row.rate_of_change),
        acceleration: parseInt(row.acceleration),
        presence: parseInt(row.presence),
        pattern: parseInt(row.pattern),
        anomaly: parseInt(row.anomaly),
      },
      avgCalculationMs: parseFloat(row.avgCalculationMs) || 0,
      maxCalculationMs: parseInt(row.maxCalculationMs) || 0,
      totalMemoryBytes: parseInt(row.totalMemoryBytes) || 0,
    };
  }

  /**
   * Batch consciousness data for efficient querying
   */
  async batchGet(
    cellIds: string[],
    options: {
      hours?: number;
      limit?: number;
    } = {}
  ): Promise<Record<string, CellConsciousness[]>> {
    const { hours = 24, limit = 1000 } = options;

    const result = await this.pool.query(
      `SELECT
        id,
        cell_id as "cellId",
        timestamp,
        sensation_type as "sensationType",
        sensation_data as "sensationData",
        internal_state as "internalState",
        reasoning_trace as "reasoningTrace",
        calculation_duration_ms as "calculationDurationMs",
        memory_used_bytes as "memoryUsedBytes"
      FROM cell_consciousness
      WHERE cell_id = ANY($1)
        AND timestamp > NOW() - ($2 || ' hours')::INTERVAL
      ORDER BY cell_id, timestamp DESC
      LIMIT $3`,
      [cellIds, hours, limit * cellIds.length]
    );

    // Group by cell_id
    const grouped: Record<string, CellConsciousness[]> = {};
    for (const row of result.rows) {
      if (!grouped[row.cellId]) {
        grouped[row.cellId] = [];
      }
      grouped[row.cellId].push(row);
    }

    return grouped;
  }
}
