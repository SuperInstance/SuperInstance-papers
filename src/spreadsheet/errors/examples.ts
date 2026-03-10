/**
 * Example Usage of POLLN Error Handling
 *
 * This file demonstrates common patterns for using the error handling system.
 */

import {
  // Error classes
  InvalidCellError,
  InvalidFormulaError,
  CircularDependencyError,
  AccessDeniedError,
  NetworkConnectionError,
  TimeoutError,

  // Error handling
  handleError,
  globalErrorHandler,

  // Retry logic
  retry,
  withBackoff,
  withCircuitBreaker,
  withRetryAndCircuitBreaker,

  // Circuit breaker
  getCircuitBreaker,

  // Logging
  globalErrorLogger,

  // Types
  type ErrorContext,
  type RetryOptions,
  type CircuitBreakerConfig,
  type ErrorResponse,
} from './index.js';

// ============================================================================
// BASIC ERROR THROWING
// ============================================================================

/**
 * Example 1: Throwing validation errors
 */
function validateCellReference(cellRef: string): void {
  // Check if cell reference is valid
  const cellPattern = /^[A-Z]+[0-9]+$/;
  if (!cellPattern.test(cellRef)) {
    throw new InvalidCellError(cellRef);
  }
}

/**
 * Example 2: Throwing formula errors
 */
function parseFormula(formula: string): void {
  if (!formula.startsWith('=')) {
    throw new InvalidFormulaError(formula, 'Formula must start with =');
  }

  // Check for circular dependencies
  const dependencies = ['A1', 'B1', 'A1']; // Circular!
  if (hasCircularDependency(dependencies)) {
    throw new CircularDependencyError(dependencies);
  }
}

function hasCircularDependency(deps: string[]): boolean {
  // Simplified check
  const seen = new Set<string>();
  for (const dep of deps) {
    if (seen.has(dep)) return true;
    seen.add(dep);
  }
  return false;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Example 3: Handling errors with user-friendly messages
 */
async function handleCellOperation(cellRef: string): Promise<string> {
  try {
    validateCellReference(cellRef);
    return `Cell ${cellRef} is valid`;
  } catch (error) {
    const response = handleError(error);

    // Get user-friendly message
    const userMessage = globalErrorHandler.toUserMessage(
      error as any
    );
    console.log('User message:', userMessage);

    // Get suggested actions
    const actions = globalErrorHandler.getSuggestedActions(
      error as any
    );
    console.log('Suggested actions:', actions);

    throw response;
  }
}

/**
 * Example 4: Wrapping functions with error handling
 */
async function safeApiCall(url: string): Promise<unknown> {
  const wrappedFetch = globalErrorHandler.wrap(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NetworkConnectionError(url);
      }
      return response.json();
    },
    { sessionId: 'example-session' }
  );

  return wrappedFetch();
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Example 5: Basic retry with exponential backoff
 */
async function fetchDataWithRetry(url: string): Promise<unknown> {
  return retry(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NetworkConnectionError(url);
      }
      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}:`, error.message);
      },
    }
  );
}

/**
 * Example 6: Retry with custom conditions
 */
async function retryWithCustomLogic(
  operation: () => Promise<unknown>
): Promise<unknown> {
  const options: RetryOptions = {
    maxRetries: 5,
    shouldRetry: (error) => {
      // Only retry network errors
      return error instanceof NetworkError ||
             error instanceof TimeoutError;
    },
    onRetry: (attempt, error) => {
      console.log(`Retrying after ${error.message}`);
    },
  };

  return retry(operation, options);
}

/**
 * Example 7: Retry with exponential backoff (shorthand)
 */
async function simpleRetry(operation: () => Promise<unknown>): Promise<unknown> {
  return withBackoff(operation, 3);
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Example 8: Using circuit breaker for external services
 */
async function callExternalApi(apiName: string): Promise<unknown> {
  return withCircuitBreaker(
    async () => {
      const response = await fetch(`https://api.${apiName}.com/data`);
      if (!response.ok) {
        throw new NetworkConnectionError(`https://api.${apiName}.com`);
      }
      return response.json();
    },
    `${apiName}-breaker`
  );
}

/**
 * Example 9: Custom circuit breaker configuration
 */
function getCustomCircuitBreaker(apiName: string) {
  const config: CircuitBreakerConfig = {
    name: `${apiName}-breaker`,
    failureThreshold: 10,
    timeout: 120000, // 2 minutes
    resetTimeout: 60000, // 1 minute
    successThreshold: 3,
    onOpen: () => {
      console.log(`Circuit opened for ${apiName}`);
      // Send alert to monitoring
    },
    onClose: () => {
      console.log(`Circuit closed for ${apiName}`);
    },
    onHalfOpen: () => {
      console.log(`Circuit half-open for ${apiName} - testing recovery`);
    },
  };

  return getCircuitBreaker(config);
}

/**
 * Example 10: Combining retry and circuit breaker
 */
async function robustApiCall(url: string): Promise<unknown> {
  return withRetryAndCircuitBreaker(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NetworkConnectionError(url);
      }
      return response.json();
    },
    {
      breakerName: 'api-breaker',
      maxRetries: 3,
      initialDelay: 1000,
    }
  );
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Example 11: Logging errors with context
 */
async function operationWithContext(userId: string): Promise<void> {
  try {
    await someOperation();
  } catch (error) {
    const context: Partial<ErrorContext> = {
      location: 'operationWithContext',
      userId,
      sessionId: 'session-123',
      metadata: {
        operation: 'someOperation',
        timestamp: new Date().toISOString(),
      },
    };

    globalErrorLogger.logError(error as any, context);
  }
}

async function someOperation(): Promise<void> {
  // Simulated operation
}

/**
 * Example 12: Getting error statistics
 */
function printErrorStatistics(): void {
  const stats = globalErrorLogger.getErrorStats();

  console.log('Total errors:', stats.total);
  console.log('By code:', stats.byCode);
  console.log('By severity:', stats.bySeverity);

  // Get recent errors
  const recent = globalErrorLogger.getRecentErrors(10);
  console.log('Recent errors:', recent.length);
}

/**
 * Example 13: Redacting sensitive data
 */
function logSensitiveData(): void {
  const data = {
    username: 'user@example.com',
    password: 'secret123',
    token: 'abc123xyz',
    ssn: '123-45-6789',
  };

  const redacted = globalErrorLogger.redactSensitiveData(
    JSON.stringify(data)
  );

  console.log('Redacted:', redacted);
  // Output: {"username":"***@***.***","password":"***REDACTED***",...}
}

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

/**
 * Example 14: Spreadsheet cell calculation
 */
async function calculateCell(cellRef: string): Promise<number> {
  try {
    // Validate cell reference
    validateCellReference(cellRef);

    // Fetch cell value with retry
    const value = await retry(
      async () => {
        const response = await fetch(`/api/cells/${cellRef}`);
        if (!response.ok) {
          throw new NetworkConnectionError(`/api/cells/${cellRef}`);
        }
        return response.json();
      },
      { maxRetries: 2 }
    );

    return value.data;
  } catch (error) {
    globalErrorLogger.logError(error as any, {
      location: 'calculateCell',
      metadata: { cellRef },
    });
    throw error;
  }
}

/**
 * Example 15: Batch cell operations
 */
async function batchUpdateCells(
  updates: Array<{ cellRef: string; value: number }>
): Promise<void> {
  const results = await Promise.allSettled(
    updates.map(async (update) => {
      return withRetryAndCircuitBreaker(
        async () => {
          validateCellReference(update.cellRef);

          const response = await fetch(`/api/cells/${update.cellRef}`, {
            method: 'PUT',
            body: JSON.stringify({ value: update.value }),
          });

          if (!response.ok) {
            if (response.status === 403) {
              throw new AccessDeniedError(update.cellRef, 'current-user');
            }
            throw new NetworkConnectionError(`/api/cells/${update.cellRef}`);
          }

          return response.json();
        },
        {
          breakerName: 'cell-update-breaker',
          maxRetries: 3,
        }
      );
    })
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`${failures.length} updates failed`);
  }
}

/**
 * Example 16: External API integration
 */
class ExternalApiService {
  private apiName: string;
  private breaker: ReturnType<typeof getCircuitBreaker>;

  constructor(apiName: string) {
    this.apiName = apiName;
    this.breaker = getCustomCircuitBreaker(apiName);
  }

  async call(endpoint: string): Promise<unknown> {
    return this.breaker.execute(async () => {
      return retry(
        async () => {
          const url = `https://api.${this.apiName}.com${endpoint}`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 408) {
              throw new TimeoutError('fetch', 30000);
            }
            throw new NetworkConnectionError(url);
          }

          return response.json();
        },
        {
          maxRetries: 3,
          shouldRetry: (error) => {
            return error instanceof NetworkError ||
                   error instanceof TimeoutError;
          },
        }
      );
    });
  }

  getStatus() {
    return this.breaker.getSnapshot();
  }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

/**
 * Run all examples
 */
export async function runExamples(): Promise<void> {
  console.log('=== POLLN Error Handling Examples ===\n');

  // Example 1: Validation error
  console.log('Example 1: Validation error');
  try {
    validateCellReference('INVALID');
  } catch (error) {
    console.log('Caught:', (error as Error).message);
  }

  // Example 3: User-friendly messages
  console.log('\nExample 3: User-friendly messages');
  try {
    await handleCellOperation('INVALID');
  } catch (error) {
    console.log('User message:', (error as ErrorResponse).message);
  }

  // Example 13: Redacting sensitive data
  console.log('\nExample 13: Redacting sensitive data');
  logSensitiveData();

  // Example 14: Cell calculation
  console.log('\nExample 14: Cell calculation');
  try {
    const value = await calculateCell('A1');
    console.log('Cell value:', value);
  } catch (error) {
    console.log('Calculation failed:', (error as Error).message);
  }

  console.log('\n=== Examples Complete ===');
}

/**
 * Run examples if this file is executed directly
 */
// biome-ignore lint/suspicious/noConsoleLog: Example code
console.log('Import examples.ts to run examples');
