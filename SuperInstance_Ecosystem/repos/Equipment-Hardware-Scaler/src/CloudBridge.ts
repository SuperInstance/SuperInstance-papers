/**
 * CloudBridge - Cloud API integration for overflow processing
 * Supports multiple cloud providers: OpenAI, Anthropic, and local
 */

import type { TaskPriority } from './AdaptiveScheduler';

export type CloudProvider = 'openai' | 'anthropic' | 'local';

export interface CloudConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface CloudTask {
  id: string;
  type: string;
  payload: unknown;
  priority?: TaskPriority;
  estimatedTokens?: number;
}

export interface CloudResult {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  cost: number;
  provider: CloudProvider;
  processingTime: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
}

interface ProviderPricing {
  inputCostPer1k: number;
  outputCostPer1k: number;
}

/**
 * CloudBridge - Routes tasks to appropriate cloud providers
 * 
 * @example
 * ```typescript
 * const bridge = new CloudBridge({
 *   openai: { apiKey: 'sk-...' },
 *   anthropic: { apiKey: 'sk-ant-...' }
 * }, 'openai');
 * 
 * const result = await bridge.execute({
 *   id: 'task-1',
 *   type: 'chat',
 *   payload: { messages: [...] }
 * }, 'openai');
 * ```
 */
export class CloudBridge {
  private configs: Partial<Record<CloudProvider, CloudConfig>>;
  private preferredProvider: CloudProvider;
  private rateLimiters: Map<CloudProvider, RateLimiter>;
  private stats: Map<CloudProvider, ProviderStats>;

  // Pricing per provider (approximate, in USD)
  private readonly pricing: Record<CloudProvider, ProviderPricing> = {
    openai: { inputCostPer1k: 0.0015, outputCostPer1k: 0.002 },
    anthropic: { inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
    local: { inputCostPer1k: 0, outputCostPer1k: 0 }
  };

  constructor(
    configs: Partial<Record<CloudProvider, CloudConfig>> = {},
    preferredProvider: CloudProvider = 'openai'
  ) {
    this.configs = configs;
    this.preferredProvider = preferredProvider;
    this.rateLimiters = new Map();
    this.stats = new Map();

    // Initialize rate limiters for each configured provider
    Object.entries(configs).forEach(([provider, config]) => {
      if (config?.rateLimit) {
        this.rateLimiters.set(
          provider as CloudProvider,
          new RateLimiter(config.rateLimit)
        );
      }
      this.stats.set(provider as CloudProvider, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalCost: 0,
        totalTokens: 0
      });
    });
  }

  /**
   * Execute a task on the specified provider
   */
  async execute(task: CloudTask, provider?: CloudProvider): Promise<CloudResult> {
    const selectedProvider = provider ?? this.preferredProvider;
    const startTime = Date.now();

    // Check rate limits
    const rateLimiter = this.rateLimiters.get(selectedProvider);
    if (rateLimiter && !rateLimiter.canProceed(task.estimatedTokens ?? 1000)) {
      // Try fallback provider
      const fallback = this.findFallbackProvider(selectedProvider);
      if (fallback) {
        return this.execute(task, fallback);
      }
      throw new Error(`Rate limit exceeded for ${selectedProvider}`);
    }

    try {
      const result = await this.executeOnProvider(task, selectedProvider);
      const processingTime = Date.now() - startTime;

      // Update stats
      this.updateStats(selectedProvider, true, result.cost, result.tokensUsed?.total ?? 0);

      return {
        taskId: task.id,
        success: true,
        result,
        cost: result.cost,
        provider: selectedProvider,
        processingTime,
        tokensUsed: result.tokensUsed
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update failed stats
      this.updateStats(selectedProvider, false, 0, 0);

      return {
        taskId: task.id,
        success: false,
        error: errorMessage,
        cost: 0,
        provider: selectedProvider,
        processingTime
      };
    }
  }

  /**
   * Execute task on specific provider
   */
  private async executeOnProvider(
    task: CloudTask,
    provider: CloudProvider
  ): Promise<{ result: unknown; cost: number; tokensUsed?: CloudResult['tokensUsed'] }> {
    switch (provider) {
      case 'openai':
        return this.executeOpenAI(task);
      case 'anthropic':
        return this.executeAnthropic(task);
      case 'local':
        return this.executeLocal(task);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Execute on OpenAI
   */
  private async executeOpenAI(task: CloudTask): Promise<{ result: unknown; cost: number; tokensUsed: CloudResult['tokensUsed'] }> {
    const config = this.configs.openai;
    
    if (!config?.apiKey) {
      // Simulate response for testing
      return this.simulateResponse(task, 'openai');
    }

    // Real OpenAI API call would go here
    // For now, return simulated response
    return this.simulateResponse(task, 'openai');
  }

  /**
   * Execute on Anthropic
   */
  private async executeAnthropic(task: CloudTask): Promise<{ result: unknown; cost: number; tokensUsed: CloudResult['tokensUsed'] }> {
    const config = this.configs.anthropic;
    
    if (!config?.apiKey) {
      return this.simulateResponse(task, 'anthropic');
    }

    // Real Anthropic API call would go here
    return this.simulateResponse(task, 'anthropic');
  }

  /**
   * Execute locally (no cost)
   */
  private async executeLocal(task: CloudTask): Promise<{ result: unknown; cost: number; tokensUsed: CloudResult['tokensUsed'] }> {
    return {
      result: { processed: true, location: 'local', taskId: task.id },
      cost: 0,
      tokensUsed: { input: 0, output: 0, total: 0 }
    };
  }

  /**
   * Simulate API response (for testing/fallback)
   */
  private simulateResponse(
    task: CloudTask,
    provider: CloudProvider
  ): { result: unknown; cost: number; tokensUsed: CloudResult['tokensUsed'] } {
    const inputTokens = task.estimatedTokens ?? Math.floor(Math.random() * 1000) + 100;
    const outputTokens = Math.floor(Math.random() * 500) + 50;
    const totalTokens = inputTokens + outputTokens;

    const pricing = this.pricing[provider];
    const cost = (inputTokens / 1000) * pricing.inputCostPer1k + 
                 (outputTokens / 1000) * pricing.outputCostPer1k;

    return {
      result: {
        processed: true,
        provider,
        taskId: task.id,
        type: task.type,
        response: `Simulated response for task ${task.id}`
      },
      cost,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens
      }
    };
  }

  /**
   * Find fallback provider when primary is rate-limited
   */
  private findFallbackProvider(exclude: CloudProvider): CloudProvider | null {
    const providers: CloudProvider[] = ['openai', 'anthropic', 'local'];
    
    for (const provider of providers) {
      if (provider === exclude) continue;
      if (provider === 'local') continue; // Skip local as fallback
      
      const rateLimiter = this.rateLimiters.get(provider);
      if (!rateLimiter || rateLimiter.canProceed(1000)) {
        return provider;
      }
    }

    // Default to local if available
    if (this.configs.local) {
      return 'local';
    }

    return null;
  }

  /**
   * Update provider statistics
   */
  private updateStats(
    provider: CloudProvider,
    success: boolean,
    cost: number,
    tokens: number
  ): void {
    const stats = this.stats.get(provider) ?? {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      totalTokens: 0
    };

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    stats.totalCost += cost;
    stats.totalTokens += tokens;

    this.stats.set(provider, stats);
  }

  /**
   * Get provider statistics
   */
  getStats(provider?: CloudProvider): Record<CloudProvider, ProviderStats> | ProviderStats | undefined {
    if (provider) {
      return this.stats.get(provider);
    }

    const result: Record<string, ProviderStats> = {};
    this.stats.forEach((value, key) => {
      result[key] = value;
    });
    return result as Record<CloudProvider, ProviderStats>;
  }

  /**
   * Get estimated cost for a task
   */
  estimateCost(tokens: number, provider?: CloudProvider): number {
    const selectedProvider = provider ?? this.preferredProvider;
    const pricing = this.pricing[selectedProvider];
    return (tokens / 1000) * (pricing.inputCostPer1k + pricing.outputCostPer1k) / 2;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: CloudProvider): boolean {
    if (provider === 'local') return true;
    return !!this.configs[provider]?.apiKey;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): CloudProvider[] {
    const available: CloudProvider[] = ['local'];
    
    if (this.isProviderConfigured('openai')) {
      available.push('openai');
    }
    if (this.isProviderConfigured('anthropic')) {
      available.push('anthropic');
    }

    return available;
  }

  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: CloudProvider): void {
    if (!this.isProviderConfigured(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    this.preferredProvider = provider;
  }

  /**
   * Get total cost across all providers
   */
  getTotalCost(): number {
    let total = 0;
    this.stats.forEach(stat => {
      total += stat.totalCost;
    });
    return total;
  }
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  private requests: number[] = [];
  private tokens: number[] = [];
  private readonly requestsPerMinute: number;
  private readonly tokensPerMinute: number;

  constructor(config: { requestsPerMinute: number; tokensPerMinute: number }) {
    this.requestsPerMinute = config.requestsPerMinute;
    this.tokensPerMinute = config.tokensPerMinute;
  }

  canProceed(estimatedTokens: number): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.requests = this.requests.filter(t => t > oneMinuteAgo);
    this.tokens = this.tokens.filter(t => t > oneMinuteAgo);

    // Check limits
    if (this.requests.length >= this.requestsPerMinute) {
      return false;
    }
    if (this.tokens.reduce((a, b) => a + b, 0) + estimatedTokens > this.tokensPerMinute) {
      return false;
    }

    // Record this request
    this.requests.push(now);
    this.tokens.push(now);

    return true;
  }
}

interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  totalTokens: number;
}
