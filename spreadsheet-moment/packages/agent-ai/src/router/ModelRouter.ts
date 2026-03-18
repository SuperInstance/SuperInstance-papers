/**
 * Model Router
 *
 * Intelligently selects the best AI provider based on:
 * - Cost optimization
 * - Provider availability
 * - Request complexity
 * - User preferences
 *
 * @module agent-ai/router
 */

import { CloudflareProvider } from '../providers/CloudflareProvider';
import { DeepSeekProvider } from '../providers/DeepSeekProvider';
import type {
  IAIProvider,
  ModelConfig,
  CompletionRequest,
  CompletionResponse,
  StreamingChunk,
  ProviderMetadata
} from '../types';

/**
 * Routing strategy
 */
export enum RoutingStrategy {
  COST = 'cost',              // Always use cheapest available
  SPEED = 'speed',            // Use fastest (usually local)
  BALANCED = 'balanced',      // Balance cost and quality
  QUALITY = 'quality',        // Use highest quality
  AVAILABILITY = 'availability' // Use whatever is available
}

/**
 * Router configuration
 */
export interface RouterConfig {
  defaultStrategy: RoutingStrategy;
  fallbackOrder: string[];    // Provider order for fallback
  costThreshold?: number;     // Max cost per 1M tokens (in USD)
  preferStreaming?: boolean;  // Prefer streaming providers
}

/**
 * Provider with metadata and availability
 */
interface ProviderInfo {
  provider: IAIProvider;
  metadata: ProviderMetadata;
  available: boolean;
}

/**
 * Model Router
 */
export class ModelRouter {
  private providers: Map<string, ProviderInfo> = new Map();
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      defaultStrategy: config?.defaultStrategy || RoutingStrategy.BALANCED,
      fallbackOrder: config?.fallbackOrder || ['cloudflare', 'deepseek', 'openai', 'anthropic'],
      costThreshold: config?.costThreshold || 1.0, // $1 per 1M tokens
      preferStreaming: config?.preferStreaming ?? true
    };

    this._initializeProviders();
  }

  /**
   * Initialize available providers
   */
  private _initializeProviders(): void {
    // Add Cloudflare (free tier, good for simple tasks)
    const cloudflare = new CloudflareProvider();
    this.providers.set('cloudflare', {
      provider: cloudflare,
      metadata: cloudflare.getMetadata(),
      available: cloudflare.isAvailable()
    });

    // Add DeepSeek (cost-effective reasoning)
    const deepseek = new DeepSeekProvider();
    this.providers.set('deepseek', {
      provider: deepseek,
      metadata: deepseek.getMetadata(),
      available: deepseek.isAvailable()
    });

    console.log('[ModelRouter] Initialized providers:');
    for (const [name, info] of this.providers) {
      console.log(`  - ${name}: ${info.available ? 'AVAILABLE' : 'UNAVAILABLE'} (${info.metadata.name})`);
    }
  }

  /**
   * Select best provider for request
   */
  selectProvider(request: CompletionRequest, strategy?: RoutingStrategy): IAIProvider {
    const routingStrategy = strategy || this.config.defaultStrategy;
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.available);

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Please configure API keys.');
    }

    switch (routingStrategy) {
      case RoutingStrategy.COST:
        return this._selectByCost(availableProviders);

      case RoutingStrategy.SPEED:
        return this._selectBySpeed(availableProviders);

      case RoutingStrategy.QUALITY:
        return this._selectByQuality(availableProviders);

      case RoutingStrategy.AVAILABILITY:
        return availableProviders[0].provider;

      case RoutingStrategy.BALANCED:
      default:
        return this._selectBalanced(availableProviders, request);
    }
  }

  /**
   * Select provider by cost (cheapest first)
   */
  private _selectByCost(providers: ProviderInfo[]): IAIProvider {
    // Sort by total cost (input + output)
    const sorted = [...providers].sort((a, b) => {
      const costA = a.metadata.costs.input + a.metadata.costs.output;
      const costB = b.metadata.costs.input + b.metadata.costs.output;
      return costA - costB;
    });

    return sorted[0].provider;
  }

  /**
   * Select provider by speed (prefer free/local)
   */
  private _selectBySpeed(providers: ProviderInfo[]): IAIProvider {
    // Prefer Cloudflare (free tier, edge computing)
    const cloudflare = providers.find(p => p.metadata.provider === 'cloudflare');
    if (cloudflare) {
      return cloudflare.provider;
    }

    // Otherwise, use first available
    return providers[0].provider;
  }

  /**
   * Select provider by quality
   */
  private _selectByQuality(providers: ProviderInfo[]): IAIProvider {
    // Prefer DeepSeek for reasoning tasks
    const deepseek = providers.find(p => p.metadata.provider === 'deepseek');
    if (deepseek) {
      return deepseek.provider;
    }

    // Fallback to any available
    return providers[0].provider;
  }

  /**
   * Select balanced provider
   */
  private _selectBalanced(providers: ProviderInfo[], request: CompletionRequest): IAIProvider {
    // Estimate complexity from message length
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    const isComplex = totalChars > 1000 || request.messages.length > 5;

    if (isComplex) {
      // Use DeepSeek for complex reasoning
      const deepseek = providers.find(p => p.metadata.provider === 'deepseek');
      if (deepseek) {
        return deepseek.provider;
      }
    }

    // For simple tasks, use free Cloudflare
    const cloudflare = providers.find(p => p.metadata.provider === 'cloudflare');
    if (cloudflare) {
      return cloudflare.provider;
    }

    // Fallback
    return providers[0].provider;
  }

  /**
   * Get completion with automatic provider selection
   */
  async getCompletion(
    request: CompletionRequest,
    strategy?: RoutingStrategy
  ): Promise<CompletionResponse> {
    const provider = this.selectProvider(request, strategy);
    return provider.getCompletion(request);
  }

  /**
   * Get streaming completion with automatic provider selection
   */
  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: StreamingChunk) => void,
    strategy?: RoutingStrategy
  ): Promise<CompletionResponse> {
    // Filter to streaming-capable providers if preferred
    let providers = Array.from(this.providers.values()).filter(p => p.available);

    if (this.config.preferStreaming) {
      providers = providers.filter(p => p.metadata.capabilities.streaming);
      if (providers.length === 0) {
        console.warn('[ModelRouter] No streaming providers available, falling back to non-streaming');
        providers = Array.from(this.providers.values()).filter(p => p.available);
      }
    }

    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }

    // Select provider
    const provider = this.selectProvider(request, strategy);

    // Check if streaming is supported
    const metadata = provider.getMetadata();
    if (!metadata.capabilities.streaming) {
      console.warn('[ModelRouter] Selected provider does not support streaming, using non-streaming');
      return provider.getCompletion(request);
    }

    return provider.streamCompletion(request, onChunk);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values())
      .filter(p => p.available)
      .map(p => p.metadata);
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): IAIProvider | undefined {
    const info = this.providers.get(name.toLowerCase());
    return info?.available ? info.provider : undefined;
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const modelRouter = new ModelRouter();

export default ModelRouter;
