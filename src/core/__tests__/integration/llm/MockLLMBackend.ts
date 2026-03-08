/**
 * Mock LLM Backend for Integration Testing
 *
 * Simulates LLM behavior including:
 * - Token generation with streaming support
 * - Embedding creation
 * - KV-cache behavior
 * - Latency simulation
 * - Error injection
 * - Resource limiting
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LLMConfig {
  modelId: string;
  contextWindowSize: number;
  maxTokens: number;
  embeddingDimension: number;

  // Performance simulation
  baseLatencyMs: number;
  latencyVarianceMs: number;
  tokensPerSecond: number;

  // Error simulation
  errorRate: number;
  timeoutRate: number;
  disableErrorInjection?: boolean; // New flag to disable error injection

  // Resource limits
  maxConcurrentRequests: number;
  maxCacheSize: number;
}

export interface TokenGenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface TokenGenerationResponse {
  text: string;
  tokens: string[];
  finishReason: 'length' | 'stop' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface KVCacheEntry {
  key: string;
  tokens: number[];
  hiddenStates: number[][];
  metadata: {
    timestamp: number;
    accessCount: number;
    size: number;
  };
}

export interface LLMStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  totalTokensGenerated: number;
  totalEmbeddingsCreated: number;
  cacheHits: number;
  cacheMisses: number;
  averageLatencyMs: number;
}

// ============================================================================
// Mock LLM Backend Implementation
// ============================================================================

export class MockLLMBackend extends EventEmitter {
  private config: LLMConfig;
  private stats: LLMStats;

  // KV-cache simulation
  private kvCache: Map<string, KVCacheEntry> = new Map();

  // Request tracking
  private activeRequests: number = 0;
  private requestQueue: Array<() => void> = [];

  // Vocabulary for tokenization
  private vocabulary: string[] = [];
  private embeddingMatrix: Float32Array;

  constructor(config?: Partial<LLMConfig>) {
    super();

    // Auto-disable error injection in test mode unless explicitly enabled
    const testMode = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const defaultDisableErrors = testMode;

    this.config = {
      modelId: 'mock-llm-7b',
      contextWindowSize: 4096,
      maxTokens: 2048,
      embeddingDimension: 4096,
      baseLatencyMs: 100,
      latencyVarianceMs: 50,
      tokensPerSecond: 50,
      errorRate: 0.01,
      timeoutRate: 0.005,
      disableErrorInjection: defaultDisableErrors,
      maxConcurrentRequests: 10,
      maxCacheSize: 1000,
      ...config,
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      totalTokensGenerated: 0,
      totalEmbeddingsCreated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatencyMs: 0,
    };

    // Initialize vocabulary
    this.initializeVocabulary();

    // Initialize embedding matrix
    this.embeddingMatrix = new Float32Array(
      this.vocabulary.length * this.config.embeddingDimension
    );
    this.initializeEmbeddingMatrix();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private initializeVocabulary(): void {
    // Common tokens for testing
    const commonTokens = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'agent', 'policy', 'action', 'state', 'reward', 'value', 'model', 'learn',
      'predict', 'optimize', 'update', 'gradient', 'network', 'layer', 'hidden',
      'output', 'input', 'embedding', 'attention', 'transformer', 'neural',
      'machine', 'learning', 'reinforcement', 'deep', 'train', 'test', 'batch',
      'epoch', 'loss', 'function', 'algorithm', 'data', 'sample', 'feature',
    ];

    this.vocabulary = commonTokens;

    // Add some special tokens
    this.vocabulary.unshift('<PAD>', '<UNK>', '<BOS>', '<EOS>');

    // Add some subwords
    for (let i = 0; i < 1000; i++) {
      this.vocabulary.push(`##subword${i}`);
    }
  }

  private initializeEmbeddingMatrix(): void {
    const { embeddingDimension } = this.config;
    const vocabSize = this.vocabulary.length;

    // Xavier initialization
    const scale = Math.sqrt(2.0 / (vocabSize + embeddingDimension));
    for (let i = 0; i < this.embeddingMatrix.length; i++) {
      this.embeddingMatrix[i] = (Math.random() - 0.5) * 2 * scale;
    }
  }

  // ==========================================================================
  // Tokenization
  // ==========================================================================

  private tokenize(text: string): number[] {
    const tokens: number[] = [];
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
      const tokenIndex = this.vocabulary.indexOf(word);
      if (tokenIndex !== -1) {
        tokens.push(tokenIndex);
      } else {
        // Use subword tokenization for unknown words
        const subwords = this.subwordTokenize(word);
        tokens.push(...subwords);
      }
    }

    return tokens;
  }

  private subwordTokenize(word: string): number[] {
    const tokens: number[] = [];
    let remaining = word;

    while (remaining.length > 0) {
      // Find longest matching subword
      let longestMatch = '';
      let longestIndex = -1;

      for (let i = 0; i < this.vocabulary.length; i++) {
        const token = this.vocabulary[i];
        if (token.startsWith('##') && remaining.startsWith(token.slice(2))) {
          if (token.length > longestMatch.length) {
            longestMatch = token.slice(2);
            longestIndex = i;
          }
        }
      }

      if (longestIndex !== -1) {
        tokens.push(longestIndex);
        remaining = remaining.slice(longestMatch.length);
      } else {
        // Use UNK token
        tokens.push(1); // UNK token index
        break;
      }
    }

    return tokens.length > 0 ? tokens : [1]; // UNK if no subwords
  }

  private detokenize(tokens: number[]): string {
    const words: string[] = [];

    for (const token of tokens) {
      if (token >= 0 && token < this.vocabulary.length) {
        const word = this.vocabulary[token];
        if (word.startsWith('##')) {
          // Append to previous word
          if (words.length > 0) {
            words[words.length - 1] += word.slice(2);
          }
        } else if (!word.startsWith('<')) {
          words.push(word);
        }
      }
    }

    return words.join(' ');
  }

  // ==========================================================================
  // Token Generation
  // ==========================================================================

  async generateTokens(request: TokenGenerationRequest): Promise<TokenGenerationResponse> {
    // Check for errors (can be disabled via config)
    const shouldSimulateErrors = !this.config.disableErrorInjection;
    const effectiveErrorRate = shouldSimulateErrors ? this.config.errorRate : 0;

    if (Math.random() < effectiveErrorRate) {
      this.stats.failedRequests++;
      throw new Error('Simulated LLM error');
    }

    // Check for timeout (can be disabled via config)
    const effectiveTimeoutRate = shouldSimulateErrors ? this.config.timeoutRate : 0;
    if (Math.random() < effectiveTimeoutRate) {
      this.stats.timeoutRequests++;
      await this.simulateTimeout();
      throw new Error('Request timeout');
    }

    // Acquire request slot
    await this.acquireRequestSlot();

    try {
      this.stats.totalRequests++;

      const startTime = Date.now();

      // Tokenize prompt
      const promptTokens = this.tokenize(request.prompt);
      const promptTokenCount = promptTokens.length;

      // Check KV-cache
      const cacheKey = this.computeCacheKey(request.prompt);
      const cachedEntry = this.kvCache.get(cacheKey);

      if (cachedEntry) {
        this.stats.cacheHits++;
        cachedEntry.metadata.accessCount++;
      } else {
        this.stats.cacheMisses++;

        // Store in cache
        if (this.kvCache.size < this.config.maxCacheSize) {
          const hiddenStates = this.computeHiddenStates(promptTokens);
          this.kvCache.set(cacheKey, {
            key: cacheKey,
            tokens: promptTokens,
            hiddenStates,
            metadata: {
              timestamp: Date.now(),
              accessCount: 1,
              size: promptTokens.length,
            },
          });
        }
      }

      // Simulate latency
      const latencyMs = this.simulateLatency(promptTokenCount);

      // Generate completion tokens
      const maxCompletionTokens = request.maxTokens || this.config.maxTokens;
      const completionTokens = this.generateCompletionTokens(
        promptTokens,
        maxCompletionTokens,
        request.temperature || 0.7
      );

      const completionText = this.detokenize(completionTokens);
      const totalTokens = promptTokenCount + completionTokens.length;

      // Update stats
      this.stats.successfulRequests++;
      this.stats.totalTokensGenerated += completionTokens.length;
      this.updateAverageLatency(latencyMs);

      return {
        text: completionText,
        tokens: completionTokens.map(t => this.vocabulary[t] || '<UNK>'),
        finishReason: totalTokens >= this.config.contextWindowSize ? 'length' : 'stop',
        usage: {
          promptTokens: promptTokenCount,
          completionTokens: completionTokens.length,
          totalTokens,
        },
        latencyMs,
      };
    } finally {
      this.releaseRequestSlot();
    }
  }

  private generateCompletionTokens(
    promptTokens: number[],
    maxTokens: number,
    temperature: number
  ): number[] {
    const tokens: number[] = [];
    let currentTokens = [...promptTokens];

    for (let i = 0; i < maxTokens; i++) {
      // Sample next token from vocabulary
      const nextToken = this.sampleNextToken(currentTokens, temperature);
      tokens.push(nextToken);
      currentTokens.push(nextToken);

      // Check for stop sequence
      if (nextToken === 3) { // EOS token
        break;
      }
    }

    return tokens;
  }

  private sampleNextToken(context: number[], temperature: number): number {
    // Simplified language model: bias towards certain tokens based on context
    const vocabSize = this.vocabulary.length;
    const logits = new Array(vocabSize).fill(0);

    // Add context-dependent bias
    for (let i = 0; i < Math.min(context.length, 10); i++) {
      const token = context[context.length - 1 - i];
      if (token >= 0 && token < vocabSize) {
        // Boost related tokens
        logits[token] += 0.1 / (i + 1);
      }
    }

    // Add random noise
    for (let i = 0; i < vocabSize; i++) {
      logits[i] += (Math.random() - 0.5) * 0.1;
    }

    // Apply temperature
    const scaledLogits = logits.map(l => l / temperature);

    // Softmax
    const maxLogit = Math.max(...scaledLogits);
    const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probabilities = expLogits.map(e => e / sumExp);

    // Sample from distribution
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (r <= cumulative) {
        return i;
      }
    }

    return probabilities.length - 1;
  }

  // ==========================================================================
  // Embeddings
  // ==========================================================================

  async createEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Acquire request slot
    await this.acquireRequestSlot();

    try {
      this.stats.totalRequests++;
      const startTime = Date.now();

      const inputs = Array.isArray(request.input) ? request.input : [request.input];
      const embeddings: number[][] = [];

      let totalTokens = 0;

      for (const input of inputs) {
        const tokens = this.tokenize(input);
        totalTokens += tokens.length;

        // Average token embeddings
        const embedding = this.computeEmbedding(tokens);
        embeddings.push(embedding);

        this.stats.totalEmbeddingsCreated++;
      }

      const latencyMs = this.simulateLatency(totalTokens);

      this.stats.successfulRequests++;
      this.updateAverageLatency(latencyMs);

      return {
        embeddings,
        usage: {
          promptTokens: totalTokens,
          totalTokens,
        },
        latencyMs,
      };
    } finally {
      this.releaseRequestSlot();
    }
  }

  private computeEmbedding(tokens: number[]): number[] {
    const { embeddingDimension } = this.config;
    const embedding = new Array(embeddingDimension).fill(0);

    // Average token embeddings
    for (const token of tokens) {
      if (token >= 0 && token < this.vocabulary.length) {
        for (let d = 0; d < embeddingDimension; d++) {
          embedding[d] += this.embeddingMatrix[token * embeddingDimension + d];
        }
      }
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
    if (norm > 0) {
      for (let d = 0; d < embeddingDimension; d++) {
        embedding[d] /= norm;
      }
    }

    return embedding;
  }

  // ==========================================================================
  // KV-Cache Management
  // ==========================================================================

  private computeCacheKey(prompt: string): string {
    // Simple hash-based cache key
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private computeHiddenStates(tokens: number[]): number[][] {
    // Simulate hidden states for each token
    const hiddenStates: number[][] = [];
    const hiddenDim = 512; // Simulated hidden dimension

    for (let i = 0; i < tokens.length; i++) {
      const state = new Array(hiddenDim).fill(0);

      // Simple positional encoding
      for (let d = 0; d < hiddenDim; d++) {
        state[d] = Math.sin(i / Math.pow(10000, (2 * d) / hiddenDim));
      }

      hiddenStates.push(state);
    }

    return hiddenStates;
  }

  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    totalTokens: number;
  } {
    const totalTokens = Array.from(this.kvCache.values()).reduce(
      (sum, entry) => sum + entry.metadata.size,
      0
    );

    return {
      size: this.kvCache.size,
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses || 1),
      totalTokens,
    };
  }

  clearCache(): void {
    this.kvCache.clear();
    // Also reset cache-related stats for test consistency
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }

  // ==========================================================================
  // Latency Simulation
  // ==========================================================================

  private simulateLatency(tokenCount: number): number {
    const { baseLatencyMs, latencyVarianceMs, tokensPerSecond } = this.config;

    // Base latency + token processing time + random variance
    const processingTimeMs = (tokenCount / tokensPerSecond) * 1000;
    const variance = (Math.random() - 0.5) * 2 * latencyVarianceMs;

    return baseLatencyMs + processingTimeMs + variance;
  }

  private async simulateTimeout(): Promise<void> {
    // Simulate timeout with shorter delay for tests
    const testMode = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const timeoutMs = testMode ? 10 : 30000; // 10ms in tests, 30s in production
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
  }

  private updateAverageLatency(latencyMs: number): void {
    const n = this.stats.successfulRequests;
    this.stats.averageLatencyMs =
      (this.stats.averageLatencyMs * (n - 1) + latencyMs) / n;
  }

  // ==========================================================================
  // Resource Management
  // ==========================================================================

  private async acquireRequestSlot(): Promise<void> {
    while (this.activeRequests >= this.config.maxConcurrentRequests) {
      await new Promise<void>(resolve => {
        this.requestQueue.push(resolve);
      });
    }
    this.activeRequests++;
  }

  private releaseRequestSlot(): void {
    this.activeRequests--;
    const next = this.requestQueue.shift();
    if (next) {
      next();
    }
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  getStats(): LLMStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      totalTokensGenerated: 0,
      totalEmbeddingsCreated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatencyMs: 0,
    };
  }

  reset(): void {
    this.resetStats();
    this.clearCache();
    this.requestQueue = [];
    this.activeRequests = 0;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  getVocabularySize(): number {
    return this.vocabulary.length;
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Mock LLM Backend Factory
// ============================================================================

export class MockLLMBackendFactory {
  private static backends: Map<string, MockLLMBackend> = new Map();

  static create(modelId: string, config?: Partial<LLMConfig>): MockLLMBackend {
    const backend = new MockLLMBackend({
      ...config,
      modelId,
    });
    this.backends.set(modelId, backend);
    return backend;
  }

  static get(modelId: string): MockLLMBackend | undefined {
    return this.backends.get(modelId);
  }

  static resetAll(): void {
    for (const backend of this.backends.values()) {
      backend.reset();
    }
    this.backends.clear();
  }
}
