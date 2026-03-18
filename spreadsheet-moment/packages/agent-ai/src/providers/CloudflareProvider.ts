/**
 * Cloudflare Workers AI Provider
 *
 * Provides access to Cloudflare's Workers AI platform with free tier
 *
 * Models:
 * - @cf/meta/llama-2-7b-chat-int8 (Llama 2 7B)
 * - @cf/meta/llama-2-13b-chat-int8 (Llama 2 13B)
 * - @cf/mistral/mistral-7b-instruct-v0.1 (Mistral 7B)
 *
 * @module agent-ai/providers
 */

import type {
  IAIProvider,
  ModelConfig,
  CompletionRequest,
  CompletionResponse,
  StreamingChunk,
  ProviderMetadata,
  ChatMessage
} from '../types';

/**
 * Cloudflare Workers AI Provider
 */
export class CloudflareProvider implements IAIProvider {
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4/accounts';
  private readonly defaultModel = '@cf/meta/llama-2-7b-chat-int8';

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: 'Cloudflare Workers AI',
      provider: 'cloudflare' as any,
      capabilities: {
        streaming: true,
        functionCalling: false,
        vision: false,
        maxTokens: 4096
      },
      costs: {
        input: 0,
        output: 0,
        currency: 'USD'
      },
      defaultModel: this.defaultModel,
      availableModels: [
        '@cf/meta/llama-2-7b-chat-int8',
        '@cf/meta/llama-2-13b-chat-int8',
        '@cf/mistral/mistral-7b-instruct-v0.1'
      ]
    };
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return typeof process !== 'undefined' &&
           process.env.CLOUDFLARE_API_TOKEN !== undefined &&
           process.env.CLOUDFLARE_ACCOUNT_ID !== undefined;
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: ModelConfig): Promise<boolean> {
    return config.apiKey !== undefined && config.apiKey.length > 0;
  }

  /**
   * Get completion (non-streaming)
   */
  async getCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiKey = request.config.apiKey || process.env.CLOUDFLARE_API_TOKEN || '';
    const model = request.config.model || this.defaultModel;

    // Build messages in Cloudflare format
    const messages = this._formatMessages(request.messages);

    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages,
            stream: false,
            max_tokens: request.config.parameters?.maxTokens || 4096,
            temperature: request.config.parameters?.temperature || 0.7
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.response || data.result?.response || '',
        finishReason: data.result?.finish_reason || 'stop',
        usage: {
          promptTokens: 0, // Cloudflare doesn't return token counts
          completionTokens: 0,
          totalTokens: 0
        },
        model
      };
    } catch (error) {
      throw new Error(`Cloudflare provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get completion (streaming)
   */
  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<CompletionResponse> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiKey = request.config.apiKey || process.env.CLOUDFLARE_API_TOKEN || '';
    const model = request.config.model || this.defaultModel;

    // Build messages in Cloudflare format
    const messages = this._formatMessages(request.messages);

    let fullContent = '';

    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages,
            stream: true,
            max_tokens: request.config.parameters?.maxTokens || 4096,
            temperature: request.config.parameters?.temperature || 0.7
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) {
            continue; // Skip empty lines and comments
          }

          try {
            const data = JSON.parse(line.replace('data: ', '').trim());
            const content = data.response || data.result?.response || '';

            if (content) {
              fullContent += content;
              onChunk({ content, done: false });
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines
          }
        }
      }

      onChunk({ content: '', done: true });

      return {
        content: fullContent,
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        model
      };
    } catch (error) {
      throw new Error(`Cloudflare provider streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format messages for Cloudflare API
   */
  private _formatMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

export default CloudflareProvider;
