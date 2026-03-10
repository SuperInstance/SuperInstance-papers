/**
 * TILE MEMORY SYSTEM
 * ===================
 *
 * L1: Register Memory (Current execution only)
 * L2: Working Memory (Fast access, limited capacity)
 * L3: Session Memory (Current spreadsheet session)
 * L4: Long-term Memory (Persistent, learns over time)
 *
 * This ain't rocket science - it's a fisherman's tackle box.
 * You keep what you need handy, the rest goes in storage.
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

interface MemoryEntry<T = any> {
  /** Unique identifier for this memory */
  id: string;

  /** The actual data being stored */
  data: T;

  /** When this memory was created (Unix timestamp) */
  timestamp: number;

  /** Last time this memory was accessed (Unix timestamp) */
  last_accessed: number;

  /** How many times this memory has been accessed */
  access_count: number;

  /** Importance score (0-1). Higher = less likely to forget */
  importance: number;

  /** Optional tags for filtering and retrieval */
  tags?: string[];

  /** Size in bytes (for memory limit tracking) */
  size: number;
}

interface MemoryConfig {
  /** Maximum capacity in bytes (-1 for unlimited) */
  max_capacity: number;

  /** Default importance score (0-1) */
  default_importance: number;

  /** Whether to persist across executions */
  persistent: boolean;

  /** Storage key for persistence */
  storage_key?: string;
}

interface ConsolidationResult {
  entries_consolidated: number;
  bytes_consolidated: number;
  entries_discarded: number;
  bytes_freed: number;
}

// ============================================================================
// FORGETTING STRATEGIES
// ============================================================================

enum ForgettingStrategy {
  /** Decay based on time - older memories fade out */
  TEMPORAL_DECAY = 'temporal_decay',

  /** Keep recently accessed, forget the rest */
  RECENCY_BIASED = 'recency_biased',

  /** Keep important memories, forget trivial ones */
  IMPORTANCE_BASED = 'importance_based',

  /** Combined: recency + importance (recommended) */
  HYBRID = 'hybrid'
}

/**
 * Calculate forget score for a memory entry.
 * Lower score = more likely to forget.
 */
function calculateForgetScore(
  entry: MemoryEntry,
  strategy: ForgettingStrategy,
  current_time: number = Date.now()
): number {
  const age_hours = (current_time - entry.timestamp) / (1000 * 60 * 60);
  const access_frequency = entry.access_count / (age_hours + 1); // accesses per hour

  switch (strategy) {
    case ForgettingStrategy.TEMPORAL_DECAY:
      // Exponential decay: newer = higher score
      return Math.exp(-age_hours / 24); // 24-hour half-life

    case ForgettingStrategy.RECENCY_BIASED:
      // Weight recency heavily, but reward frequent access
      const recency_score = Math.exp(-age_hours / 12); // 12-hour half-life
      const access_score = Math.min(access_frequency / 10, 1); // cap at 10 accesses/hour
      return recency_score * 0.7 + access_score * 0.3;

    case ForgettingStrategy.IMPORTANCE_BASED:
      // Importance is king
      return entry.importance;

    case ForgettingStrategy.HYBRID:
      // The kitchen sink - balances all factors
      const temporal_score = Math.exp(-age_hours / 48); // 48-hour half-life
      const recency_weight = 0.3;
      const importance_weight = 0.5;
      const access_weight = 0.2;

      return (
        temporal_score * recency_weight +
        entry.importance * importance_weight +
        Math.min(access_frequency / 5, 1) * access_weight
      );

    default:
      return entry.importance;
  }
}

// ============================================================================
// WORKING MEMORY (L2)
// ============================================================================

/**
 * Working Memory - Fast, limited capacity
 * Like your deck on a fishing boat. Only what you need right now.
 */
class WorkingMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      max_capacity: config.max_capacity ?? 10 * 1024 * 1024, // 10MB default
      default_importance: config.default_importance ?? 0.5,
      persistent: config.persistent ?? false,
      storage_key: config.storage_key ?? 'working_memory'
    };

    if (this.config.persistent) {
      this.load();
    }
  }

  /**
   * Store data in working memory
   */
  store<T>(
    id: string,
    data: T,
    importance?: number,
    tags?: string[]
  ): boolean {
    const now = Date.now();
    const size = this.calculateSize(data);

    // Check if we have space
    if (this.config.max_capacity > 0) {
      const current_usage = this.getCurrentUsage();
      if (current_usage + size > this.config.max_capacity) {
        // Try to free up space by forgetting low-value entries
        if (!this.freeSpace(size)) {
          console.warn(`WorkingMemory: Cannot store ${id} - not enough space`);
          return false;
        }
      }
    }

    const entry: MemoryEntry<T> = {
      id,
      data,
      timestamp: now,
      last_accessed: now,
      access_count: 0,
      importance: importance ?? this.config.default_importance,
      tags,
      size
    };

    this.entries.set(id, entry);

    if (this.config.persistent) {
      this.save();
    }

    return true;
  }

  /**
   * Retrieve data from working memory
   */
  retrieve<T>(id: string): T | null {
    const entry = this.entries.get(id);

    if (!entry) {
      return null;
    }

    // Update access metadata
    entry.last_accessed = Date.now();
    entry.access_count++;

    if (this.config.persistent) {
      this.save();
    }

    return entry.data as T;
  }

  /**
   * Check if memory exists
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Remove specific entry
   */
  forget(id: string): boolean {
    const deleted = this.entries.delete(id);

    if (deleted && this.config.persistent) {
      this.save();
    }

    return deleted;
  }

  /**
   * Get all entries, sorted by forget score
   */
  getEntries(strategy: ForgettingStrategy = ForgettingStrategy.HYBRID): MemoryEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => {
      const scoreA = calculateForgetScore(a, strategy);
      const scoreB = calculateForgetScore(b, strategy);
      return scoreA - scoreB; // Lowest scores first (most forgettable)
    });
  }

  /**
   * Get current memory usage in bytes
   */
  getCurrentUsage(): number {
    let total = 0;
    for (const entry of this.entries.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Free up space by forgetting low-value entries
   */
  private freeSpace(required_bytes: number): boolean {
    const sorted_entries = this.getEntries(ForgettingStrategy.HYBRID);
    let freed = 0;

    for (const entry of sorted_entries) {
      if (freed >= required_bytes) {
        break;
      }

      this.entries.delete(entry.id);
      freed += entry.size;
    }

    return freed >= required_bytes;
  }

  /**
   * Estimate size of data in bytes (rough approximation)
   */
  private calculateSize(data: any): number {
    if (data === null || data === undefined) {
      return 0;
    }

    if (typeof data === 'string') {
      return data.length * 2; // Unicode chars ~2 bytes
    }

    if (typeof data === 'number') {
      return 8; // 64-bit number
    }

    if (typeof data === 'boolean') {
      return 1;
    }

    if (Array.isArray(data)) {
      return data.reduce((sum, item) => sum + this.calculateSize(item), 0);
    }

    if (typeof data === 'object') {
      return JSON.stringify(data).length * 2;
    }

    return 0;
  }

  /**
   * Persist to localStorage (browser) or similar
   */
  private save(): void {
    try {
      const serializable = Array.from(this.entries.entries());
      localStorage.setItem(this.config.storage_key!, JSON.stringify(serializable));
    } catch (e) {
      console.error('WorkingMemory: Failed to save', e);
    }
  }

  /**
   * Load from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.config.storage_key!);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.entries = new Map(parsed);
      }
    } catch (e) {
      console.error('WorkingMemory: Failed to load', e);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();

    if (this.config.persistent) {
      this.save();
    }
  }
}

// ============================================================================
// LONG-TERM MEMORY (L4)
// ============================================================================

/**
 * Long-term Memory - Persistent, unlimited, learns over time
 * Like the shed where you keep the good gear. Stuff you'll need again.
 */
class LongTermMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private index: Map<string, Set<string>> = new Map(); // Tag index
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      max_capacity: config.max_capacity ?? -1, // Unlimited by default
      default_importance: config.default_importance ?? 0.3, // Lower default
      persistent: config.persistent ?? true, // Usually persistent
      storage_key: config.storage_key ?? 'longterm_memory'
    };

    if (this.config.persistent) {
      this.load();
    }
  }

  /**
   * Store data in long-term memory
   */
  store<T>(
    id: string,
    data: T,
    importance?: number,
    tags?: string[]
  ): boolean {
    const now = Date.now();
    const size = this.calculateSize(data);

    const entry: MemoryEntry<T> = {
      id,
      data,
      timestamp: now,
      last_accessed: now,
      access_count: 0,
      importance: importance ?? this.config.default_importance,
      tags,
      size
    };

    this.entries.set(id, entry);

    // Update tag index
    if (tags) {
      for (const tag of tags) {
        if (!this.index.has(tag)) {
          this.index.set(tag, new Set());
        }
        this.index.get(tag)!.add(id);
      }
    }

    if (this.config.persistent) {
      this.save();
    }

    return true;
  }

  /**
   * Retrieve data from long-term memory
   */
  retrieve<T>(id: string): T | null {
    const entry = this.entries.get(id);

    if (!entry) {
      return null;
    }

    // Update access metadata
    entry.last_accessed = Date.now();
    entry.access_count++;

    if (this.config.persistent) {
      this.save();
    }

    return entry.data as T;
  }

  /**
   * Query by tags (AND logic - all tags must match)
   */
  queryByTags(tags: string[]): MemoryEntry[] {
    if (tags.length === 0) {
      return Array.from(this.entries.values());
    }

    let matching_ids: Set<string> | null = null;

    for (const tag of tags) {
      const tag_ids = this.index.get(tag);
      if (!tag_ids) {
        return []; // Tag doesn't exist, no matches
      }

      if (!matching_ids) {
        matching_ids = new Set(tag_ids);
      } else {
        // Intersection
        for (const id of matching_ids) {
          if (!tag_ids.has(id)) {
            matching_ids.delete(id);
          }
        }
      }
    }

    return (matching_ids ? Array.from(matching_ids) : [])
      .map(id => this.entries.get(id)!)
      .filter(Boolean);
  }

  /**
   * Query by time range
   */
  queryByTimeRange(start: number, end: number): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  /**
   * Forget specific entry
   */
  forget(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    // Remove from tag index
    if (entry.tags) {
      for (const tag of entry.tags) {
        this.index.get(tag)?.delete(id);
      }
    }

    const deleted = this.entries.delete(id);

    if (deleted && this.config.persistent) {
      this.save();
    }

    return deleted;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_entries: number;
    total_bytes: number;
    tags: { tag: string; count: number }[];
    oldest_entry: number | null;
    newest_entry: number | null;
  } {
    const entries = Array.from(this.entries.values());

    return {
      total_entries: entries.length,
      total_bytes: entries.reduce((sum, e) => sum + e.size, 0),
      tags: Array.from(this.index.entries())
        .map(([tag, ids]) => ({ tag, count: ids.size }))
        .sort((a, b) => b.count - a.count),
      oldest_entry: entries.length > 0
        ? Math.min(...entries.map(e => e.timestamp))
        : null,
      newest_entry: entries.length > 0
        ? Math.max(...entries.map(e => e.timestamp))
        : null
    };
  }

  /**
   * Estimate size of data
   */
  private calculateSize(data: any): number {
    if (data === null || data === undefined) {
      return 0;
    }

    if (typeof data === 'string') {
      return data.length * 2;
    }

    if (typeof data === 'number') {
      return 8;
    }

    if (typeof data === 'boolean') {
      return 1;
    }

    if (Array.isArray(data)) {
      return data.reduce((sum, item) => sum + this.calculateSize(item), 0);
    }

    if (typeof data === 'object') {
      return JSON.stringify(data).length * 2;
    }

    return 0;
  }

  /**
   * Persist to storage
   */
  private save(): void {
    try {
      const serializable = {
        entries: Array.from(this.entries.entries()),
        index: Array.from(this.index.entries()).map(([tag, ids]) => [
          tag,
          Array.from(ids)
        ])
      };
      localStorage.setItem(this.config.storage_key!, JSON.stringify(serializable));
    } catch (e) {
      console.error('LongTermMemory: Failed to save', e);
    }
  }

  /**
   * Load from storage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.config.storage_key!);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.entries = new Map(parsed.entries);
        this.index = new Map(
          parsed.index.map(([tag, ids]: [string, string[]]) => [tag, new Set(ids)])
        );
      }
    } catch (e) {
      console.error('LongTermMemory: Failed to load', e);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.index.clear();

    if (this.config.persistent) {
      this.save();
    }
  }
}

// ============================================================================
// MEMORY CONSOLIDATION
// ============================================================================

/**
 * Consolidate working memory into long-term memory
 * Like cleaning your tackle box at the end of the season.
 * Keep what matters, store it properly, toss the rest.
 */
function consolidateMemory(
  working: WorkingMemory,
  longterm: LongTermMemory,
  options: {
    min_importance?: number; // Only consolidate above this score
    min_access_count?: number; // Only consolidate accessed this many times
    max_age_hours?: number; // Only consolidate entries newer than this
    strategy?: ForgettingStrategy;
  } = {}
): ConsolidationResult {
  const {
    min_importance = 0.3,
    min_access_count = 1,
    max_age_hours = 72, // 3 days
    strategy = ForgettingStrategy.HYBRID
  } = options;

  const entries = working.getEntries(strategy);
  const now = Date.now();

  let consolidated = 0;
  let bytes_consolidated = 0;
  let discarded = 0;
  let bytes_freed = 0;

  for (const entry of entries) {
    const age_hours = (now - entry.timestamp) / (1000 * 60 * 60);
    const forget_score = calculateForgetScore(entry, strategy, now);

    // Decide: consolidate, discard, or keep in working memory
    if (
      entry.importance >= min_importance ||
      entry.access_count >= min_access_count ||
      forget_score > 0.5
    ) {
      // Consolidate to long-term memory
      if (age_hours < max_age_hours) {
        longterm.store(
          entry.id,
          entry.data,
          entry.importance,
          entry.tags
        );
        consolidated++;
        bytes_consolidated += entry.size;
      }
    }

    // Remove from working memory
    if (working.forget(entry.id)) {
      discarded++;
      bytes_freed += entry.size;
    }
  }

  return {
    entries_consolidated: consolidated,
    bytes_consolidated,
    entries_discarded: discarded,
    bytes_freed
  };
}

// ============================================================================
// EXAMPLE: FRAUD DETECTION TILE
// ============================================================================

/**
 * FRAUD DETECTION TILE WITH MEMORY
 * ================================
 *
 * Real-world example: A tile that learns fraud patterns over 30 days.
 * It remembers what it saw, adapts to new threats, and gets smarter.
 */

interface TransactionPattern {
  transaction_id: string;
  amount: number;
  merchant_category: string;
  location: { lat: number; lng: number };
  timestamp: number;
  user_age_days: number;
  is_fraud: boolean;
}

interface FraudStatistics {
  total_transactions: number;
  fraud_count: number;
  fraud_rate: number;
  high_risk_merchants: string[];
  avg_fraud_amount: number;
  common_fraud_times: number[]; // Hour of day
}

class FraudDetectionTile {
  private working: WorkingMemory;
  private longterm: LongTermMemory;
  private tile_id: string;

  constructor(tile_id: string) {
    this.tile_id = tile_id;

    // Working memory: Recent transactions (last 1000)
    this.working = new WorkingMemory({
      max_capacity: 1024 * 1024, // 1MB for recent transactions
      default_importance: 0.4,
      persistent: false // Session-only
    });

    // Long-term memory: Learned patterns over 30 days
    this.longterm = new LongTermMemory({
      max_capacity: -1, // Unlimited
      default_importance: 0.7,
      persistent: true, // Survives across sessions
      storage_key: `fraud_detection_${tile_id}`
    });
  }

  /**
   * Process a transaction and learn from it
   */
  processTransaction(tx: TransactionPattern): { is_fraud: boolean; confidence: number } {
    const tx_id = `tx_${tx.transaction_id}`;

    // Store in working memory
    this.working.store(
      tx_id,
      tx,
      tx.is_fraud ? 0.9 : 0.3, // Fraud cases are more important
      ['transaction', tx.merchant_category, tx.is_fraud ? 'fraud' : 'legit']
    );

    // Analyze against historical patterns
    const fraud_stats = this.getFraudStatistics();
    const confidence = this.assessFraudRisk(tx, fraud_stats);

    // Learn: If this is fraud, store the pattern
    if (tx.is_fraud) {
      this.learnFraudPattern(tx);
    }

    // Periodic consolidation (every 100 transactions)
    if (fraud_stats.total_transactions % 100 === 0) {
      this.consolidateLearning();
    }

    return {
      is_fraud: confidence > 0.7,
      confidence
    };
  }

  /**
   * Assess fraud risk based on historical patterns
   */
  private assessFraudRisk(tx: TransactionPattern, stats: FraudStatistics): number {
    let risk_score = 0.0;

    // Factor 1: Merchant category risk
    if (stats.high_risk_merchants.includes(tx.merchant_category)) {
      risk_score += 0.3;
    }

    // Factor 2: Amount anomaly
    if (tx.amount > stats.avg_fraud_amount * 2) {
      risk_score += 0.2;
    }

    // Factor 3: Time of day
    const hour = new Date(tx.timestamp).getHours();
    if (stats.common_fraud_times.includes(hour)) {
      risk_score += 0.15;
    }

    // Factor 4: User behavior pattern
    const recent_txs = this.working.getEntries().filter(e =>
      e.tags?.includes('transaction') &&
      (e.data as TransactionPattern).transaction_id.startsWith(tx.transaction_id.substring(0, 8))
    );

    if (recent_txs.length > 5) {
      // Frequent transactions - could be fraud
      risk_score += 0.2;
    }

    return Math.min(risk_score, 1.0);
  }

  /**
   * Learn from confirmed fraud cases
   */
  private learnFraudPattern(tx: TransactionPattern): void {
    const pattern_id = `fraud_pattern_${tx.merchant_category}_${Date.now()}`;

    this.longterm.store(
      pattern_id,
      {
        merchant_category: tx.merchant_category,
        amount_range: { min: tx.amount * 0.8, max: tx.amount * 1.2 },
        location_region: `${tx.location.lat.toFixed(2)},${tx.location.lng.toFixed(2)}`,
        hour: new Date(tx.timestamp).getHours(),
        timestamp: tx.timestamp
      },
      0.8, // High importance - this is a learned pattern
      ['fraud_pattern', tx.merchant_category, 'learned']
    );
  }

  /**
   * Get fraud statistics from long-term memory
   */
  private getFraudStatistics(): FraudStatistics {
    const fraud_entries = this.longterm.queryByTags(['fraud_pattern']);
    const recent_entries = this.working.getEntries().filter(e =>
      e.tags?.includes('fraud')
    );

    const all_fraud = [...fraud_entries, ...recent_entries];

    if (all_fraud.length === 0) {
      return {
        total_transactions: 0,
        fraud_count: 0,
        fraud_rate: 0,
        high_risk_merchants: [],
        avg_fraud_amount: 0,
        common_fraud_times: []
      };
    }

    const fraud_amounts = all_fraud
      .map(e => (e.data as TransactionPattern).amount)
      .filter(a => a > 0);

    const merchant_counts: Record<string, number> = {};
    const hour_counts: Record<number, number> = {};

    for (const entry of all_fraud) {
      const data = entry.data as TransactionPattern;
      merchant_counts[data.merchant_category] = (merchant_counts[data.merchant_category] || 0) + 1;
      const hour = new Date(data.timestamp).getHours();
      hour_counts[hour] = (hour_counts[hour] || 0) + 1;
    }

    const high_risk_merchants = Object.entries(merchant_counts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([merchant, _]) => merchant);

    const common_fraud_times = Object.entries(hour_counts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([hour, _]) => parseInt(hour))
      .slice(0, 5); // Top 5 hours

    return {
      total_transactions: this.working.getEntries().length + all_fraud.length,
      fraud_count: all_fraud.length,
      fraud_rate: all_fraud.length / (this.working.getEntries().length + all_fraud.length),
      high_risk_merchants,
      avg_fraud_amount: fraud_amounts.reduce((a, b) => a + b, 0) / fraud_amounts.length,
      common_fraud_times
    };
  }

  /**
   * Consolidate learning from working to long-term memory
   */
  private consolidateLearning(): void {
    const result = consolidateMemory(this.working, this.longterm, {
      min_importance: 0.5, // Only keep important patterns
      min_access_count: 2, // Or frequently accessed
      max_age_hours: 24, // Only recent patterns
      strategy: ForgettingStrategy.HYBRID
    });

    console.log(`FraudDetectionTile [${this.tile_id}] Consolidated:`, result);
  }

  /**
   * Get learned insights
   */
  getInsights(): {
    total_patterns_learned: number;
    high_risk_categories: string[];
    peak_fraud_hours: number[];
    detection_accuracy: number;
  } {
    const stats = this.longterm.getStats();
    const fraud_entries = this.longterm.queryByTags(['fraud_pattern']);

    const category_counts: Record<string, number> = {};
    const hour_counts: Record<number, number> = {};

    for (const entry of fraud_entries) {
      const data = entry.data as TransactionPattern;
      category_counts[data.merchant_category] = (category_counts[data.merchant_category] || 0) + 1;
      const hour = new Date(data.timestamp).getHours();
      hour_counts[hour] = (hour_counts[hour] || 0) + 1;
    }

    return {
      total_patterns_learned: fraud_entries.length,
      high_risk_categories: Object.entries(category_counts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, _]) => cat)
        .slice(0, 5),
      peak_fraud_hours: Object.entries(hour_counts)
        .sort((a, b) => b[1] - a[1])
        .map(([hour, _]) => parseInt(hour))
        .slice(0, 3),
      detection_accuracy: 0.0 // Would be calculated from validation set
    };
  }

  /**
   * Clear all learned patterns (reset button)
   */
  reset(): void {
    this.working.clear();
    this.longterm.clear();
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * How to use the Fraud Detection Tile:
 *
 * ```typescript
 * // Initialize the tile
 * const fraud_tile = new FraudDetectionTile('fraud_detector_001');
 *
 * // Process transactions (streaming)
 * for (const tx of transaction_stream) {
 *   const result = fraud_tile.processTransaction(tx);
 *
 *   if (result.is_fraud) {
 *     console.log(`FRAUD DETECTED: ${tx.transaction_id} (${result.confidence})`);
 *     // Block transaction, alert user, etc.
 *   }
 * }
 *
 * // Check what the tile has learned
 * const insights = fraud_tile.getInsights();
 * console.log('Learned patterns:', insights);
 *
 * // The tile remembers across sessions - it gets smarter over time
 * ```
 */

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MemoryEntry,
  MemoryConfig,
  ForgettingStrategy,
  WorkingMemory,
  LongTermMemory,
  consolidateMemory,
  FraudDetectionTile
};

export type {
  ConsolidationResult,
  TransactionPattern,
  FraudStatistics
};
