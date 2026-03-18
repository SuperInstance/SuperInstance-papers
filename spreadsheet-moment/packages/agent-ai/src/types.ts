/**
 * Agent AI Type Definitions
 *
 * @module agent-ai/types
 */

/**
 * Supported model providers
 */
export enum ModelProvider {
  DEEPSEEK = 'deepseek',
  CLOUDFLARE = 'cloudflare',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic'
}

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  parameters?: ModelParameters;
}

/**
 * Model parameters
 */
export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Completion request
 */
export interface CompletionRequest {
  messages: ChatMessage[];
  config: ModelConfig;
  stream?: boolean;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  content: string;
  finishReason?: 'stop' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

/**
 * Streaming chunk
 */
export interface StreamingChunk {
  content: string;
  done: boolean;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxTokens: number;
}

/**
 * Cost information (per 1M tokens)
 */
export interface CostInfo {
  input: number;
  output: number;
  currency: string;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  name: string;
  provider: ModelProvider;
  capabilities: ProviderCapabilities;
  costs: CostInfo;
  defaultModel: string;
  availableModels: string[];
}

/**
 * AI provider interface
 */
export interface IAIProvider {
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;

  /**
   * Check if provider is available
   */
  isAvailable(): boolean;

  /**
   * Get completion (non-streaming)
   */
  getCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Get completion (streaming)
   */
  streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<CompletionResponse>;

  /**
   * Validate configuration
   */
  validateConfig(config: ModelConfig): Promise<boolean>;
}
