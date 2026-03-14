/**
 * CostOptimizer - Track and optimize API costs
 * 
 * Implements caching, budget management, and cost tracking
 */

import { RoutingTier } from './EscalationRouter';

/**
 * Cost tracking entry
 */
export interface CostTracker {
  tier: RoutingTier;
  amount: number;
  tokens: number;
  cached: boolean;
  timestamp: Date;
  query?: string;
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  dailyLimit: number;
  alertThreshold: number; // 0-1, percentage of budget
  hardStop: boolean; // Stop when budget exceeded
  notificationCallback?: (usage: number, limit: number) => void;
}

/**
 * Cost metrics summary
 */
export interface CostMetrics {
  totalCost: number;
  costsByTier: Record<RoutingTier, number>;
  requestCount: number;
  requestsByTier: Record<RoutingTier, number>;
  cacheHitRate: number;
  averageCostPerRequest: number;
  budgetRemaining: number;
  budgetUtilization: number;
  projectedDailyCost: number;
  costReduction: number; // Estimated savings from routing
}

/**
 * Pattern cache entry
 */
export interface PatternCache {
  pattern: string;
  tier: RoutingTier;
  response?: unknown;
  hitCount: number;
  lastAccessed: Date;
  createdAt: Date;
  cost: number;
}

/**
 * CostOptimizer configuration
 */
export interface CostOptimizerConfig {
  enableCaching: boolean;
  maxCacheSize: number;
  budget: BudgetConfig;
  cacheTTL?: number; // Cache time-to-live in milliseconds
}

/**
 * CostOptimizer class
 * Manages cost tracking, caching, and budget optimization
 */
export class CostOptimizer {
  private config: CostOptimizerConfig;
  private costHistory: CostTracker[];
  private cache: Map<string, PatternCache>;
  private currentCacheSize: number;
  private budget: BudgetConfig;
  private dailySpend: number;
  private lastReset: Date;

  constructor(config: Partial<CostOptimizerConfig> = {}) {
    this.config = {
      enableCaching: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB default
      budget: {
        dailyLimit: 100,
        alertThreshold: 0.8,
        hardStop: false
      },
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours default
      ...config
    };
    this.budget = this.config.budget;
    this.costHistory = [];
    this.cache = new Map();
    this.currentCacheSize = 0;
    this.dailySpend = 0;
    this.lastReset = new Date();
  }

  /**
   * Track a cost entry
   */
  trackCost(entry: CostTracker): void {
    this.costHistory.push(entry);
    
    if (!entry.cached) {
      this.dailySpend += entry.amount;
      this.checkBudgetAlert();
    }

    // Trim history to prevent memory issues
    if (this.costHistory.length > 10000) {
      this.costHistory = this.costHistory.slice(-5000);
    }
  }

  /**
   * Check if a cost is within budget
   */
  checkBudget(cost: number, override?: number): { allowed: boolean; remainingBudget: number } {
    const limit = override ?? this.budget.dailyLimit;
    const remaining = limit - this.dailySpend;
    
    if (this.budget.hardStop && remaining < cost) {
      return { allowed: false, remainingBudget: Math.max(0, remaining) };
    }

    return { allowed: true, remainingBudget: remaining };
  }

  /**
   * Check cache for a pattern
   */
  checkCache(query: string): { tier: RoutingTier; decision: unknown; cost: number } | null {
    if (!this.config.enableCaching) return null;

    const pattern = this.extractPattern(query);
    const cached = this.cache.get(pattern);

    if (!cached) return null;

    // Check TTL
    if (this.config.cacheTTL) {
      const age = Date.now() - cached.createdAt.getTime();
      if (age > this.config.cacheTTL) {
        this.cache.delete(pattern);
        this.currentCacheSize -= this.estimateEntrySize(cached);
        return null;
      }
    }

    // Update access stats
    cached.hitCount++;
    cached.lastAccessed = new Date();

    return {
      tier: cached.tier,
      decision: cached.response,
      cost: cached.cost
    };
  }

  /**
   * Cache a pattern
   */
  async cachePattern(query: string, result: {
    tier: RoutingTier;
    decision: unknown;
    cost: number;
  }): Promise<void> {
    if (!this.config.enableCaching) return;

    const pattern = this.extractPattern(query);
    
    // Estimate size
    const entry: PatternCache = {
      pattern,
      tier: result.tier,
      response: result.decision,
      hitCount: 1,
      lastAccessed: new Date(),
      createdAt: new Date(),
      cost: result.cost
    };

    const entrySize = this.estimateEntrySize(entry);

    // Evict if necessary
    while (this.currentCacheSize + entrySize > this.config.maxCacheSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(pattern, entry);
    this.currentCacheSize += entrySize;
  }

  /**
   * Get current cost metrics
   */
  getMetrics(): CostMetrics {
    const costsByTier: Record<RoutingTier, number> = { bot: 0, brain: 0, human: 0 };
    const requestsByTier: Record<RoutingTier, number> = { bot: 0, brain: 0, human: 0 };
    let cacheHits = 0;
    let totalTokens = 0;

    for (const entry of this.costHistory) {
      if (!entry.cached) {
        costsByTier[entry.tier] += entry.amount;
      } else {
        cacheHits++;
      }
      requestsByTier[entry.tier]++;
      totalTokens += entry.tokens;
    }

    const requestCount = this.costHistory.length;
    const totalCost = Object.values(costsByTier).reduce((a, b) => a + b, 0);
    
    // Calculate cost reduction (savings from using bot tier instead of brain)
    const botRequests = requestsByTier.bot;
    const brainRequests = requestsByTier.brain;
    const humanRequests = requestsByTier.human;
    
    // Without routing, all would go to brain (or human for high stakes)
    const hypotheticalCost = 
      (botRequests + brainRequests) * 0.03 + // Brain cost
      humanRequests * 30; // Human cost
    
    const costReduction = Math.max(0, hypotheticalCost - totalCost);

    // Project daily cost based on current rate
    const hoursSinceReset = (Date.now() - this.lastReset.getTime()) / (1000 * 60 * 60);
    const projectedDailyCost = hoursSinceReset > 0 
      ? (this.dailySpend / hoursSinceReset) * 24 
      : 0;

    return {
      totalCost,
      costsByTier,
      requestCount,
      requestsByTier,
      cacheHitRate: requestCount > 0 ? cacheHits / requestCount : 0,
      averageCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
      budgetRemaining: Math.max(0, this.budget.dailyLimit - this.dailySpend),
      budgetUtilization: this.dailySpend / this.budget.dailyLimit,
      projectedDailyCost,
      costReduction
    };
  }

  /**
   * Update budget configuration
   */
  updateBudget(config: Partial<BudgetConfig>): void {
    this.budget = { ...this.budget, ...config };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Reset daily spend counter
   */
  resetDailySpend(): void {
    this.dailySpend = 0;
    this.lastReset = new Date();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    entries: number;
    totalHits: number;
    averageHitCount: number;
    cacheSizeBytes: number;
    topPatterns: Array<{ pattern: string; hits: number; tier: RoutingTier }>;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    
    const topPatterns = entries
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(e => ({ pattern: e.pattern, hits: e.hitCount, tier: e.tier }));

    return {
      entries: this.cache.size,
      totalHits,
      averageHitCount: entries.length > 0 ? totalHits / entries.length : 0,
      cacheSizeBytes: this.currentCacheSize,
      topPatterns
    };
  }

  /**
   * Optimize cache by removing low-value entries
   */
  optimizeCache(): { removed: number; freedBytes: number } {
    const entries = Array.from(this.cache.entries());
    const toRemove: string[] = [];
    let freedBytes = 0;

    for (const [key, entry] of entries) {
      // Remove entries with no hits that are older than 1 hour
      const age = Date.now() - entry.createdAt.getTime();
      if (entry.hitCount === 0 && age > 60 * 60 * 1000) {
        toRemove.push(key);
        freedBytes += this.estimateEntrySize(entry);
      }
    }

    for (const key of toRemove) {
      this.cache.delete(key);
    }

    this.currentCacheSize -= freedBytes;

    return { removed: toRemove.length, freedBytes };
  }

  /**
   * Generate cost report
   */
  generateCostReport(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [
      '=== Cost Optimization Report ===',
      '',
      'Daily Spend Summary:',
      `  Total Cost: $${metrics.totalCost.toFixed(4)}`,
      `  Budget Remaining: $${metrics.budgetRemaining.toFixed(2)}`,
      `  Budget Utilization: ${(metrics.budgetUtilization * 100).toFixed(1)}%`,
      '',
      'Cost by Tier:',
      `  Bot Tier: $${metrics.costsByTier.bot.toFixed(4)} (${metrics.requestsByTier.bot} requests)`,
      `  Brain Tier: $${metrics.costsByTier.brain.toFixed(4)} (${metrics.requestsByTier.brain} requests)`,
      `  Human Tier: $${metrics.costsByTier.human.toFixed(4)} (${metrics.requestsByTier.human} requests)`,
      '',
      'Efficiency Metrics:',
      `  Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      `  Average Cost/Request: $${metrics.averageCostPerRequest.toFixed(4)}`,
      `  Projected Daily Cost: $${metrics.projectedDailyCost.toFixed(2)}`,
      `  Cost Reduction: $${metrics.costReduction.toFixed(2)} saved`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Extract pattern from query
   */
  private extractPattern(query: string): string {
    return query.toLowerCase()
      .replace(/[0-9]+/g, '#NUM#')
      .replace(/[a-zA-Z]+\@[a-zA-Z]+\.[a-zA-Z]+/g, '#EMAIL#')
      .replace(/https?:\/\/[^\s]+/g, '#URL#')
      .trim()
      .substring(0, 100); // Limit pattern length
  }

  /**
   * Estimate size of cache entry
   */
  private estimateEntrySize(entry: PatternCache): number {
    // Rough estimation: string length + overhead
    const patternSize = entry.pattern.length * 2; // UTF-16
    const responseSize = JSON.stringify(entry.response || {}).length * 2;
    return patternSize + responseSize + 200; // Overhead for metadata
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed.getTime() < lruTime) {
        lruTime = entry.lastAccessed.getTime();
        lruKey = key;
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        this.currentCacheSize -= this.estimateEntrySize(entry);
      }
      this.cache.delete(lruKey);
    }
  }

  /**
   * Check and trigger budget alert
   */
  private checkBudgetAlert(): void {
    const utilization = this.dailySpend / this.budget.dailyLimit;
    
    if (utilization >= this.budget.alertThreshold && this.budget.notificationCallback) {
      this.budget.notificationCallback(this.dailySpend, this.budget.dailyLimit);
    }
  }
}

export default CostOptimizer;
