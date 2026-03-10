/**
 * NLP Engine for Natural Language Spreadsheet Queries
 *
 * Integrates with LLM providers (OpenAI, Anthropic, or local) for
 * advanced natural language understanding and formula generation.
 */

import type {
  SpreadsheetIntent,
  Entity,
  ParsedFormula,
  NLPEngineConfig,
  LLMResponse,
  SpreadsheetContext,
  CostTracking,
} from './types.js';

/**
 * LLM Provider Interface
 */
interface LLMProvider {
  generateResponse(prompt: string, config: NLPEngineConfig): Promise<LLMResponse>;
  estimateCost(tokens: number, model: string): number;
}

/**
 * OpenAI Provider
 */
class OpenAIProvider implements LLMProvider {
  async generateResponse(prompt: string, config: NLPEngineConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const tokens = {
      prompt: data.usage.prompt_tokens,
      completion: data.usage.completion_tokens,
      total: data.usage.total_tokens,
    };

    const latency = Date.now() - startTime;
    const cost = this.estimateCost(tokens.total, config.model || 'gpt-4');

    return {
      text: choice.message.content,
      tokens,
      cost,
      model: config.model || 'gpt-4',
      latency,
    };
  }

  estimateCost(tokens: number, model: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.00003,  // per 1k tokens (approximate)
      'gpt-4-turbo': 0.00001,
      'gpt-3.5-turbo': 0.0000015,
    };
    const costPer1k = costs[model] || costs['gpt-4'];
    return (tokens / 1000) * costPer1k;
  }
}

/**
 * Anthropic Provider
 */
class AnthropicProvider implements LLMProvider {
  async generateResponse(prompt: string, config: NLPEngineConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-opus-20240229',
        max_tokens: config.maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const tokens = {
      prompt: data.usage.input_tokens,
      completion: data.usage.output_tokens,
      total: data.usage.input_tokens + data.usage.output_tokens,
    };

    const latency = Date.now() - startTime;
    const cost = this.estimateCost(tokens.total, config.model || 'claude-3-opus-20240229');

    return {
      text,
      tokens,
      cost,
      model: config.model || 'claude-3-opus-20240229',
      latency,
    };
  }

  estimateCost(tokens: number, model: string): number {
    const costs: Record<string, number> = {
      'claude-3-opus-20240229': 0.000015,
      'claude-3-sonnet-20240229': 0.000003,
    };
    const costPer1k = costs[model] || costs['claude-3-opus-20240229'];
    return (tokens / 1000) * costPer1k;
  }
}

/**
 * Mock Provider for testing
 */
class MockProvider implements LLMProvider {
  async generateResponse(prompt: string, config: NLPEngineConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock response
    const text = this.generateMockResponse(prompt);

    const tokens = {
      prompt: Math.floor(prompt.length / 4),
      completion: Math.floor(text.length / 4),
      total: Math.floor((prompt.length + text.length) / 4),
    };

    const latency = Date.now() - startTime;

    return {
      text,
      tokens,
      cost: 0,
      model: 'mock',
      latency,
    };
  }

  private generateMockResponse(prompt: string): string {
    if (prompt.toLowerCase().includes('sum')) {
      return JSON.stringify({
        formula: '=SUM(A1:A10)',
        explanation: 'Calculate the sum of values in range A1 to A10',
      });
    } else if (prompt.toLowerCase().includes('average')) {
      return JSON.stringify({
        formula: '=AVERAGE(A1:A10)',
        explanation: 'Calculate the average of values in range A1 to A10',
      });
    }
    return JSON.stringify({
      formula: '=A1',
      explanation: 'Reference cell A1',
    });
  }

  estimateCost(): number {
    return 0;
  }
}

/**
 * Main NLP Engine
 */
export class NLPEngine {
  private provider: LLMProvider;
  private config: NLPEngineConfig;
  private cache: Map<string, { response: LLMResponse; timestamp: number }> = new Map();
  private costTracking: CostTracking = {
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0,
    costPerRequest: [],
    tokensPerRequest: [],
  };

  constructor(config: NLPEngineConfig) {
    this.config = config;
    this.provider = this.createProvider(config.provider);
  }

  /**
   * Create LLM provider instance
   */
  private createProvider(provider: string): LLMProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'mock':
        return new MockProvider();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate formula from natural language
   */
  async generateFormula(
    text: string,
    context?: SpreadsheetContext
  ): Promise<ParsedFormula> {
    const prompt = this.buildPrompt(text, context);

    // Check cache
    if (this.config.enableCache) {
      const cached = this.getFromCache(prompt);
      if (cached) {
        return this.parseResponse(cached.text, text);
      }
    }

    // Generate response
    const response = await this.provider.generateResponse(prompt, this.config);

    // Track costs
    if (this.config.enableCostTracking) {
      this.trackCost(response);
    }

    // Cache response
    if (this.config.enableCache) {
      this.addToCache(prompt, response);
    }

    return this.parseResponse(response.text, text);
  }

  /**
   * Explain formula in natural language
   */
  async explainFormula(formula: string, context?: SpreadsheetContext): Promise<string> {
    const prompt = this.buildExplainPrompt(formula, context);

    const response = await this.provider.generateResponse(prompt, this.config);

    if (this.config.enableCostTracking) {
      this.trackCost(response);
    }

    return response.text;
  }

  /**
   * Validate and correct formula
   */
  async validateFormula(formula: string, context?: SpreadsheetContext): Promise<{
    isValid: boolean;
    correctedFormula?: string;
    errors: string[];
  }> {
    const prompt = this.buildValidationPrompt(formula, context);

    const response = await this.provider.generateResponse(prompt, this.config);

    if (this.config.enableCostTracking) {
      this.trackCost(response);
    }

    try {
      const result = JSON.parse(response.text);
      return result;
    } catch {
      return {
        isValid: false,
        errors: ['Failed to parse validation response'],
      };
    }
  }

  /**
   * Build prompt for formula generation
   */
  private buildPrompt(text: string, context?: SpreadsheetContext): string {
    let prompt = `You are an Excel formula expert. Convert the following natural language request into an Excel formula.\n\n`;
    prompt += `Request: "${text}"\n\n`;

    if (context) {
      prompt += `Context:\n`;
      prompt += `- Sheet: ${context.sheetName}\n`;
      prompt += `- Available sheets: ${context.sheets.join(', ')}\n`;
      prompt += `- Headers: ${JSON.stringify(context.headers)}\n`;
      prompt += `- Column types: ${JSON.stringify(context.columnTypes)}\n`;
      if (Object.keys(context.namedRanges).length > 0) {
        prompt += `- Named ranges: ${JSON.stringify(context.namedRanges)}\n`;
      }
      prompt += '\n';
    }

    prompt += `Provide your response as a JSON object with the following structure:\n`;
    prompt += `{\n`;
    prompt += `  "formula": "the Excel formula",\n`;
    prompt += `  "explanation": "clear explanation of what the formula does",\n`;
    prompt += `  "complexity": number from 1-10,\n`;
    prompt += `  "warnings": ["any warnings or caveats"]\n`;
    prompt += `}\n\n`;

    return prompt;
  }

  /**
   * Build prompt for formula explanation
   */
  private buildExplainPrompt(formula: string, context?: SpreadsheetContext): string {
    let prompt = `You are an Excel formula expert. Explain the following formula in clear, simple language.\n\n`;
    prompt += `Formula: "${formula}"\n\n`;

    if (context) {
      prompt += `Context:\n`;
      prompt += `- Sheet: ${context.sheetName}\n`;
      prompt += `- Headers: ${JSON.stringify(context.headers)}\n`;
      prompt += '\n';
    }

    prompt += `Provide a clear explanation that someone unfamiliar with Excel formulas would understand.\n`;

    return prompt;
  }

  /**
   * Build prompt for formula validation
   */
  private buildValidationPrompt(formula: string, context?: SpreadsheetContext): string {
    let prompt = `You are an Excel formula expert. Validate the following formula.\n\n`;
    prompt += `Formula: "${formula}"\n\n`;

    if (context) {
      prompt += `Context:\n`;
      prompt += `- Sheet: ${context.sheetName}\n`;
      prompt += `- Available sheets: ${context.sheets.join(', ')}\n`;
      prompt += `- Headers: ${JSON.stringify(context.headers)}\n`;
      prompt += '\n';
    }

    prompt += `Provide your response as a JSON object:\n`;
    prompt += `{\n`;
    prompt += `  "isValid": boolean,\n`;
    prompt += `  "correctedFormula": "corrected formula if invalid, otherwise null",\n`;
    prompt += `  "errors": ["array of error messages"]\n`;
    prompt += `}\n\n`;

    return prompt;
  }

  /**
   * Parse LLM response into ParsedFormula
   */
  private parseResponse(response: string, originalText: string): ParsedFormula {
    try {
      const parsed = JSON.parse(response);

      return {
        formula: parsed.formula,
        explanation: parsed.explanation,
        intent: {
          type: 'create_formula',
          confidence: 0.8,
          action: originalText,
        },
        entities: [],
        complexity: parsed.complexity || 5,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        formula: response,
        explanation: 'Generated from natural language',
        intent: {
          type: 'create_formula',
          confidence: 0.7,
          action: originalText,
        },
        entities: [],
        complexity: 5,
        warnings: ['Failed to parse structured response'],
      };
    }
  }

  /**
   * Get response from cache
   */
  private getFromCache(prompt: string): LLMResponse | null {
    const cached = this.cache.get(prompt);
    if (!cached) return null;

    const ttl = (this.config.cacheTTL || 3600) * 1000;
    const age = Date.now() - cached.timestamp;

    if (age > ttl) {
      this.cache.delete(prompt);
      return null;
    }

    return cached.response;
  }

  /**
   * Add response to cache
   */
  private addToCache(prompt: string, response: LLMResponse): void {
    this.cache.set(prompt, {
      response,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Track costs
   */
  private trackCost(response: LLMResponse): void {
    this.costTracking.totalTokens += response.tokens.total;
    this.costTracking.totalCost += response.cost;
    this.costTracking.requestCount += 1;
    this.costTracking.costPerRequest.push(response.cost);
    this.costTracking.tokensPerRequest.push(response.tokens.total);
  }

  /**
   * Get cost tracking information
   */
  getCostTracking(): CostTracking {
    return { ...this.costTracking };
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking(): void {
    this.costTracking = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      costPerRequest: [],
      tokensPerRequest: [],
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NLPEngineConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.provider) {
      this.provider = this.createProvider(config.provider);
    }
  }
}
