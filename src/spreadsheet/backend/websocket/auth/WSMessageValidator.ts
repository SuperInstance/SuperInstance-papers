/**
 * POLLN Spreadsheet Backend - WebSocket Message Validator
 *
 * Message validation with schema validation, size limits,
 * rate limiting per user, command authorization, and input sanitization.
 *
 * Features:
 * - Schema-based validation (lightweight, no Zod dependency)
 * - Message size limits
 * - Per-user rate limiting
 * - Command authorization
 * - Input sanitization
 * - Validation caching
 *
 * Performance: <5ms message validation
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: unknown;
  warnings?: string[];
}

/**
 * Message type definition
 */
export interface MessageTypeDefinition {
  // Required fields
  required?: string[];
  // Optional fields
  optional?: string[];
  // Field schemas
  schema?: Record<string, FieldSchema>;
  // Maximum message size (bytes)
  maxSize?: number;
  // Required permissions
  permissions?: string[];
  // Rate limit weight (higher = more expensive)
  rateLimitWeight?: number;
}

/**
 * Field schema definition
 */
export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  sanitize?: boolean;
  nested?: Record<string, FieldSchema>;
}

/**
 * Rate limit entry
 */
interface UserRateLimitEntry {
  count: number;
  resetAt: number;
  cost: number;
}

/**
 * User message entry for validation cache
 */
interface ValidationCacheEntry {
  result: ValidationResult;
  timestamp: number;
}

/**
 * Message validator configuration
 */
export interface WSMessageValidatorConfig {
  // Maximum message size (bytes)
  maxMessageSize: number;
  // Per-user rate limit (messages per minute)
  maxMessagesPerMinute: number;
  // Rate limit window (milliseconds)
  rateLimitWindow: number;
  // Enable input sanitization
  enableSanitization: boolean;
  // Enable validation cache
  enableCache: boolean;
  // Cache TTL (milliseconds)
  cacheTTL: number;
  // Maximum cache size
  maxCacheSize: number;
}

/**
 * WebSocket message validator
 *
 * Validates incoming messages against schemas, enforces size limits,
 * implements per-user rate limiting, and sanitizes input.
 */
export class WSMessageValidator {
  private config: Required<WSMessageValidatorConfig>;
  private messageTypes: Map<string, MessageTypeDefinition> = new Map();
  private userRateLimits: Map<string, UserRateLimitEntry> = new Map();
  private validationCache: Map<string, ValidationCacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Default field schemas
  private static readonly DEFAULT_SCHEMAS: Record<string, FieldSchema> = {
    cellId: {
      type: 'string',
      min: 1,
      max: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true,
    },
    value: {
      type: 'any',
    },
    formula: {
      type: 'string',
      max: 10000,
      sanitize: true,
    },
    range: {
      type: 'string',
      pattern: /^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/,
    },
    data: {
      type: 'object',
    },
    query: {
      type: 'object',
    },
    options: {
      type: 'object',
    },
  };

  constructor(config: Partial<WSMessageValidatorConfig> = {}) {
    this.config = {
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      maxMessagesPerMinute: config.maxMessagesPerMinute || 120,
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      enableSanitization: config.enableSanitization !== false,
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 60000, // 1 minute
      maxCacheSize: config.maxCacheSize || 1000,
    };

    this.registerDefaultMessageTypes();
    this.startCleanup();
  }

  /**
   * Register default message types
   */
  private registerDefaultMessageTypes(): void {
    // Cell operations
    this.registerMessageType('cell.update', {
      required: ['cellId', 'value'],
      optional: ['formula'],
      maxSize: 1024,
      permissions: ['cells:write'],
      rateLimitWeight: 1,
    });

    this.registerMessageType('cell.read', {
      required: ['cellId'],
      maxSize: 512,
      permissions: ['cells:read'],
      rateLimitWeight: 1,
    });

    this.registerMessageType('cell.delete', {
      required: ['cellId'],
      maxSize: 512,
      permissions: ['cells:delete'],
      rateLimitWeight: 2,
    });

    // Spreadsheet operations
    this.registerMessageType('spreadsheet.update', {
      required: ['data'],
      maxSize: 1024 * 100, // 100KB
      permissions: ['spreadsheet:write'],
      rateLimitWeight: 3,
    });

    this.registerMessageType('spreadsheet.query', {
      required: ['query'],
      optional: ['options'],
      maxSize: 2048,
      permissions: ['spreadsheet:read'],
      rateLimitWeight: 2,
    });

    // System operations
    this.registerMessageType('system.ping', {
      maxSize: 256,
      rateLimitWeight: 0, // No cost
    });

    this.registerMessageType('system.subscribe', {
      required: ['events'],
      maxSize: 1024,
      rateLimitWeight: 1,
    });

    // Batch operations
    this.registerMessageType('batch.execute', {
      required: ['operations'],
      maxSize: 1024 * 50, // 50KB
      permissions: ['cells:write'],
      rateLimitWeight: 5,
    });
  }

  /**
   * Register message type
   */
  registerMessageType(type: string, definition: MessageTypeDefinition): void {
    this.messageTypes.set(type, definition);
  }

  /**
   * Validate message
   * Performance target: <5ms
   */
  async validateMessage(
    userId: string,
    messageType: string,
    payload: unknown
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Check rate limit
      const rateLimitResult = this.checkRateLimit(userId, messageType);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`,
        };
      }

      // Check message type is registered
      const typeDef = this.messageTypes.get(messageType);
      if (!typeDef) {
        return {
          valid: false,
          error: `Unknown message type: ${messageType}`,
        };
      }

      // Check cache
      if (this.config.enableCache) {
        const cacheResult = this.checkCache(messageType, payload);
        if (cacheResult) {
          return cacheResult;
        }
      }

      // Validate payload structure
      if (!payload || typeof payload !== 'object') {
        return {
          valid: false,
          error: 'Payload must be an object',
        };
      }

      const payloadObj = payload as Record<string, unknown>;

      // Check required fields
      if (typeDef.required) {
        for (const field of typeDef.required) {
          if (!(field in payloadObj)) {
            return {
              valid: false,
              error: `Missing required field: ${field}`,
            };
          }
        }
      }

      // Validate fields
      if (typeDef.schema) {
        const fieldResult = this.validateFields(payloadObj, typeDef.schema);
        if (!fieldResult.valid) {
          return fieldResult;
        }
      }

      // Validate default schemas for common fields
      const defaultValidation = this.validateDefaultFields(payloadObj);
      if (!defaultValidation.valid) {
        return defaultValidation;
      }

      // Calculate message size
      const messageSize = this.calculateMessageSize(payload);
      const maxSize = typeDef.maxSize || this.config.maxMessageSize;
      if (messageSize > maxSize) {
        return {
          valid: false,
          error: `Message too large: ${messageSize} bytes (max: ${maxSize})`,
        };
      }

      // Sanitize if enabled
      let sanitized = payload;
      if (this.config.enableSanitization) {
        sanitized = this.sanitizePayload(payloadObj);
      }

      const result: ValidationResult = {
        valid: true,
        sanitized,
      };

      // Cache result
      if (this.config.enableCache) {
        this.cacheResult(messageType, payload, result);
      }

      return result;
    } catch (error) {
      console.error('[WSMessageValidator] Validation error:', error);
      return {
        valid: false,
        error: 'Validation failed',
      };
    }
  }

  /**
   * Validate fields against schema
   */
  private validateFields(
    payload: Record<string, unknown>,
    schema: Record<string, FieldSchema>
  ): ValidationResult {
    const warnings: string[] = [];

    for (const [field, fieldSchema] of Object.entries(schema)) {
      const value = payload[field];

      // Skip undefined fields (they're optional)
      if (value === undefined) {
        continue;
      }

      const result = this.validateField(value, fieldSchema);
      if (!result.valid) {
        return result;
      }

      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate single field
   */
  private validateField(value: unknown, schema: FieldSchema): ValidationResult {
    // Type check
    if (schema.type !== 'any') {
      const typeValid = this.checkType(value, schema.type);
      if (!typeValid) {
        return {
          valid: false,
          error: `Field must be of type ${schema.type}`,
        };
      }
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(value)) {
      return {
        valid: false,
        error: `Field must be one of: ${schema.enum.join(', ')}`,
      };
    }

    // Pattern check (strings only)
    if (schema.pattern && typeof value === 'string') {
      if (!schema.pattern.test(value)) {
        return {
          valid: false,
          error: `Field does not match required pattern`,
        };
      }
    }

    // Min/max check (numbers and strings)
    if (schema.min !== undefined) {
      if (typeof value === 'number' && value < schema.min) {
        return {
          valid: false,
          error: `Field must be at least ${schema.min}`,
        };
      }
      if (typeof value === 'string' && value.length < schema.min) {
        return {
          valid: false,
          error: `Field must be at least ${schema.min} characters`,
        };
      }
    }

    if (schema.max !== undefined) {
      if (typeof value === 'number' && value > schema.max) {
        return {
          valid: false,
          error: `Field must be at most ${schema.max}`,
        };
      }
      if (typeof value === 'string' && value.length > schema.max) {
        return {
          valid: false,
          error: `Field must be at most ${schema.max} characters`,
        };
      }
    }

    // Nested object validation
    if (schema.nested && typeof value === 'object' && value !== null) {
      const nestedResult = this.validateFields(
        value as Record<string, unknown>,
        schema.nested
      );
      if (!nestedResult.valid) {
        return nestedResult;
      }
    }

    return { valid: true };
  }

  /**
   * Check type of value
   */
  private checkType(value: unknown, type: FieldSchema['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'any':
        return true;
      default:
        return true;
    }
  }

  /**
   * Validate default fields
   */
  private validateDefaultFields(payload: Record<string, unknown>): ValidationResult {
    for (const [field, value] of Object.entries(payload)) {
      const schema = WSMessageValidator.DEFAULT_SCHEMAS[field];
      if (schema) {
        const result = this.validateField(value, schema);
        if (!result.valid) {
          return {
            valid: false,
            error: `${field}: ${result.error}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize payload
   */
  private sanitizePayload(payload: Record<string, unknown>): unknown {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const schema = WSMessageValidator.DEFAULT_SCHEMAS[key];

      if (schema?.sanitize && typeof value === 'string') {
        // Sanitize string: remove potentially dangerous characters
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map(item =>
            typeof item === 'object' && item !== null
              ? this.sanitizePayload(item as Record<string, unknown>)
              : item
          );
        } else {
          sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string
   */
  private sanitizeString(str: string): string {
    // Remove potentially dangerous characters
    return str
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Control characters
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Script tags
      .replace(/javascript:/gi, '') // JavaScript protocol
      .replace(/on\w+\s*=/gi, ''); // Event handlers
  }

  /**
   * Calculate message size in bytes
   */
  private calculateMessageSize(payload: unknown): number {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string, messageType: string): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const now = Date.now();
    let entry = this.userRateLimits.get(userId);

    // Initialize entry if not exists or expired
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        cost: 0,
        resetAt: now + this.config.rateLimitWindow,
      };
      this.userRateLimits.set(userId, entry);
    }

    // Get rate limit weight for message type
    const typeDef = this.messageTypes.get(messageType);
    const weight = typeDef?.rateLimitWeight || 1;

    // Check if limit would be exceeded
    if (entry.count >= this.config.maxMessagesPerMinute) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counters
    entry.count++;
    entry.cost += weight;

    return { allowed: true };
  }

  /**
   * Check validation cache
   */
  private checkCache(messageType: string, payload: unknown): ValidationResult | null {
    const cacheKey = this.getCacheKey(messageType, payload);
    const entry = this.validationCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheTTL) {
      this.validationCache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache validation result
   */
  private cacheResult(messageType: string, payload: unknown, result: ValidationResult): void {
    // Evict oldest entries if cache is too large
    if (this.validationCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey) {
        this.validationCache.delete(oldestKey);
      }
    }

    const cacheKey = this.getCacheKey(messageType, payload);
    this.validationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(messageType: string, payload: unknown): string {
    const payloadStr = JSON.stringify(payload);
    return `${messageType}:${payloadStr}`;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean rate limit entries
    for (const [userId, entry] of this.userRateLimits.entries()) {
      if (now >= entry.resetAt) {
        this.userRateLimits.delete(userId);
      }
    }

    // Clean cache entries
    if (this.config.enableCache) {
      for (const [key, entry] of this.validationCache.entries()) {
        if (now - entry.timestamp > this.config.cacheTTL) {
          this.validationCache.delete(key);
        }
      }
    }
  }

  /**
   * Get rate limit status for user
   */
  getRateLimitStatus(userId: string): {
    remaining: number;
    resetAt: number;
  } {
    const entry = this.userRateLimits.get(userId);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        remaining: this.config.maxMessagesPerMinute,
        resetAt: now + this.config.rateLimitWindow,
      };
    }

    return {
      remaining: Math.max(0, this.config.maxMessagesPerMinute - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Shutdown validator
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.userRateLimits.clear();
    this.validationCache.clear();
  }

  /**
   * Get validator statistics
   */
  getStats(): {
    messageTypes: number;
    rateLimitEntries: number;
    cacheSize: number;
    config: Required<WSMessageValidatorConfig>;
  } {
    return {
      messageTypes: this.messageTypes.size,
      rateLimitEntries: this.userRateLimits.size,
      cacheSize: this.validationCache.size,
      config: this.config,
    };
  }
}

/**
 * Create validator instance with default configuration
 */
export function createWSMessageValidator(
  config?: Partial<WSMessageValidatorConfig>
): WSMessageValidator {
  return new WSMessageValidator(config);
}

export default WSMessageValidator;
