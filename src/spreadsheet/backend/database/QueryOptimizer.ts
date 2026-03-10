/**
 * QueryOptimizer
 *
 * Optimizes database queries with:
 * - Prepared statements
 * - Batch operations
 * - N+1 query prevention
 * - Materialized view management
 * - Query result caching
 */

import { Pool } from 'pg';

export interface PreparedQuery {
  name: string;
  text: string;
  params?: any[];
}

export interface BatchOperation<T> {
  operation: (items: T[]) => Promise<any>;
  items: T[];
  batchSize: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  hits: number;
}

export class QueryOptimizer {
  private preparedStatements: Map<string, string> = new Map();
  private queryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheEnabled: boolean;
  private cacheTtl: number;
  private maxCacheSize: number;

  constructor(
    private pool: Pool,
    options: {
      cacheEnabled?: boolean;
      cacheTtl?: number;
      maxCacheSize?: number;
    } = {}
  ) {
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTtl = options.cacheTtl ?? 60000; // 1 minute
    this.maxCacheSize = options.maxCacheSize ?? 1000;
  }

  /**
   * Prepare and cache a statement
   */
  async prepareStatement(name: string, text: string): Promise<void> {
    if (this.preparedStatements.has(name)) {
      return;
    }

    try {
      await this.pool.query({ name, text });
      this.preparedStatements.set(name, text);
    } catch (error) {
      console.error(`Failed to prepare statement ${name}:`, error);
      throw error;
    }
  }

  /**
   * Execute prepared statement
   */
  async executePrepared<T = any>(
    name: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.preparedStatements.has(name)) {
      throw new Error(`Prepared statement ${name} not found`);
    }

    try {
      const result = await this.pool.query<T>({ name, values: params });
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      };
    } catch (error) {
      console.error(`Failed to execute prepared statement ${name}:`, error);
      throw error;
    }
  }

  /**
   * Execute query with caching
   */
  async cachedQuery<T = any>(
    cacheKey: string,
    queryFn: () => Promise<{ rows: T[]; rowCount: number }>
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.cacheEnabled) {
      return queryFn();
    }

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < this.cacheTtl) {
        cached.hits++;
        return { rows: cached.data, rowCount: cached.data.length };
      } else {
        // Expired
        this.queryCache.delete(cacheKey);
      }
    }

    // Execute query
    const result = await queryFn();

    // Cache result
    if (this.queryCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = Array.from(this.queryCache.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0][0];
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(cacheKey, {
      data: result.rows,
      timestamp: new Date(),
      hits: 0,
    });

    return result;
  }

  /**
   * Execute batch operations with optimal batch size
   */
  async batch<T, R>(
    items: T[],
    operation: (batch: T[]) => Promise<R>,
    options: {
      batchSize?: number;
      delayMs?: number;
    } = {}
  ): Promise<R[]> {
    const { batchSize = 100, delayMs = 0 } = options;

    const results: R[] = [];
    const batches: T[][] = [];

    // Split into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Execute batches
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const result = await operation(batch);
      results.push(result);

      // Add delay between batches to avoid overwhelming the database
      if (delayMs > 0 && i < batches.length - 1) {
        await this.sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Execute parallel queries with dependency resolution
   */
  async parallel<T extends Record<string, () => Promise<any>>>(
    queries: T
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    const entries = Object.entries(queries);

    const results = await Promise.all(
      entries.map(async ([key, queryFn]) => {
        try {
          const result = await queryFn();
          return [key, result];
        } catch (error) {
          console.error(`Parallel query ${key} failed:`, error);
          return [key, null];
        }
      })
    );

    return Object.fromEntries(results) as any;
  }

  /**
   * Execute query with IN clause optimization
   */
  async optimizedIn<T = any>(
    baseQuery: string,
    paramName: string,
    values: any[],
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (values.length === 0) {
      return { rows: [], rowCount: 0 };
    }

    // For small arrays, use direct IN clause
    if (values.length <= 100) {
      const placeholders = values.map((_, i) => `$${(params?.length || 0) + i + 1}`).join(',');
      const query = baseQuery.replace(`:${paramName}`, `(${placeholders})`);
      return this.pool.query<T>(query, [...(params || []), ...values]);
    }

    // For large arrays, use VALUES clause
    const valuesQuery = `VALUES ${values.map((v, i) => `($${(params?.length || 0) + i * 2 + 1}, $${(params?.length || 0) + i * 2 + 2})`).join(', ')}`;
    const query = baseQuery.replace(
      `:${paramName}`,
      `(SELECT value FROM (${valuesQuery}) AS v(value, ord) ORDER BY ord)`
    );

    const flatValues = values.flatMap((v) => [v, values.indexOf(v)]);
    return this.pool.query<T>(query, [...(params || []), ...flatValues]);
  }

  /**
   * Execute paginated query
   */
  async paginated<T = any>(
    query: string,
    params: any[],
    options: {
      page?: number;
      pageSize?: number;
      countQuery?: string;
    } = {}
  ): Promise<{ rows: T[]; totalCount?: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 50, countQuery } = options;
    const offset = (page - 1) * pageSize;

    const [rowsResult, countResult] = await Promise.all([
      this.pool.query<T>(`${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [
        ...params,
        pageSize,
        offset,
      ]),
      countQuery
        ? this.pool.query<{ count: string }>(countQuery, params)
        : Promise.resolve(null),
    ]);

    return {
      rows: rowsResult.rows,
      totalCount: countResult?.rows[0] ? parseInt(countResult.rows[0].count) : undefined,
      page,
      pageSize,
    };
  }

  /**
   * Upsert multiple rows efficiently
   */
  async upsert<T extends Record<string, any>>(
    tableName: string,
    items: T[],
    conflictColumns: string[],
    options: {
      onUpdate?: string[];
      batchSize?: number;
    } = {}
  ): Promise<void> {
    const { onUpdate, batchSize = 100 } = options;

    if (items.length === 0) {
      return;
    }

    const columns = Object.keys(items[0]);
    const placeholders = items.map(
      (_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',')})`
    ).join(',');

    const conflictTarget = conflictColumns.join(', ');
    const updateClause = onUpdate
      ? `UPDATE SET ${onUpdate.map((col) => `${col} = EXCLUDED.${col}`).join(',')}`
      : 'NOTHING';

    const query = `
      INSERT INTO ${tableName} (${columns.join(',')})
      VALUES ${placeholders}
      ON CONFLICT (${conflictTarget})
      DO ${updateClause}
    `;

    await this.batch(
      items,
      async (batch) => {
        const flatValues = batch.flatMap((item) => columns.map((col) => item[col]));
        await this.pool.query(query, flatValues);
      },
      { batchSize }
    );
  }

  /**
   * Refresh materialized view
   */
  async refreshMaterializedView(
    viewName: string,
    options: { concurrently?: boolean } = {}
  ): Promise<void> {
    const concurrently = options.concurrently ? 'CONCURRENTLY' : '';
    const query = `REFRESH MATERIALIZED VIEW ${concurrently} ${viewName}`;

    try {
      await this.pool.query(query);
    } catch (error) {
      if (options.concurrently) {
        // Fallback to non-concurrent refresh if concurrent fails
        await this.pool.query(`REFRESH MATERIALIZED VIEW ${viewName}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.queryCache.keys()) {
        if (regex.test(key)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    enabled: boolean;
    ttl: number;
    maxSize: number;
  } {
    let totalHits = 0;
    for (const entry of this.queryCache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.queryCache.size,
      hits: totalHits,
      enabled: this.cacheEnabled,
      ttl: this.cacheTtl,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.queryCache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > this.cacheTtl) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Prevent N+1 queries by preloading relations
   */
  async preloadRelations<T extends { id: string }, R>(
    items: T[],
    relationLoader: (ids: string[]) => Promise<Map<string, R>>,
    options: {
      batchSize?: number;
    } = {}
  ): Promise<Map<string, R>> {
    if (items.length === 0) {
      return new Map();
    }

    const { batchSize = 100 } = options;
    const ids = items.map((item) => item.id);
    const relations = new Map<string, R>();

    await this.batch(
      ids,
      async (batch) => {
        const batchRelations = await relationLoader(batch);
        for (const [id, relation] of batchRelations.entries()) {
          relations.set(id, relation);
        }
      },
      { batchSize }
    );

    return relations;
  }

  /**
   * Execute read-only query (hint to query planner)
   */
  async readOnly<T = any>(query: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    return this.pool.query<T>(`SET TRANSACTION READ ONLY; ${query}`, params);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
