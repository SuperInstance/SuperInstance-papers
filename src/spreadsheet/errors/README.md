# POLLN Spreadsheet Error Handling

Comprehensive error handling system for POLLN spreadsheets with typed errors, retry logic, circuit breakers, and React integration.

## Features

- **Typed Error Classes**: Hierarchical error system with rich metadata
- **Retry Logic**: Exponential backoff with jitter and circuit breaker integration
- **Circuit Breaker**: Prevent cascading failures with automatic recovery
- **React Error Boundaries**: Catch and handle React component errors
- **Structured Logging**: Correlation tracking and sensitive data redaction
- **User-Friendly Messages**: Clear error messages with suggested actions

## Installation

```bash
npm install @polln/spreadsheet-errors
```

## Quick Start

### Basic Error Handling

```typescript
import {
  InvalidCellError,
  NetworkError,
  handleError,
} from '@polln/spreadsheet-errors';

// Throw typed errors
throw new InvalidCellError('ZZ999');

// Handle any error
try {
  await someOperation();
} catch (error) {
  const response = handleError(error);
  console.log(response.message);
}
```

### Retry with Backoff

```typescript
import { retry } from '@polln/spreadsheet-errors';

const result = await retry(
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  }
);
```

### Circuit Breaker

```typescript
import {
  withCircuitBreaker,
  getCircuitBreaker,
} from '@polln/spreadsheet-errors';

// Execute with circuit breaker protection
const result = await withCircuitBreaker(
  async () => await externalApiCall(),
  'external-api-breaker'
);

// Manual circuit breaker control
const breaker = getCircuitBreaker({
  name: 'api-breaker',
  failureThreshold: 5,
  timeout: 60000,
});

breaker.open(); // Manually open
breaker.close(); // Manually close
breaker.reset(); // Reset to closed
```

### React Error Boundary

```tsx
import { ErrorBoundary } from '@polln/spreadsheet-errors';

function App() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error, errorInfo) => {
        console.error('Caught error:', error, errorInfo);
      }}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Error Classes

### Validation Errors

```typescript
// Invalid cell reference
throw new InvalidCellError('ZZ999');

// Invalid formula syntax
throw new InvalidFormulaError('=SUM(', 'Missing closing parenthesis');

// Type mismatch
throw new TypeMismatchError('text', 'number', 'string');

// Circular dependency
throw new CircularDependencyError(['A1', 'B1', 'A1']);
```

### Permission Errors

```typescript
// Access denied
throw new AccessDeniedError('Sheet1', 'user123');

// Resource not found
throw new ResourceNotFoundError('Spreadsheet', 'abc123');

// Insufficient permissions
throw new InsufficientPermissionsError('write');
```

### Business Logic Errors

```typescript
// Version conflict
throw new VersionConflictError('Sheet1', 2, 3);

// Quota exceeded
throw new QuotaExceededError('cells', 10000, 5000);

// Locked cell
throw new LockedCellError('A1', 'user456');
```

### System Errors

```typescript
// Database error
throw new DatabaseError('query', cause);

// Memory error
throw new MemoryError(1024, 512);

// Service unavailable
throw new ServiceUnavailableError('API', 'Maintenance');
```

### Network Errors

```typescript
// Network connection error
throw new NetworkConnectionError('https://api.example.com');

// Timeout
throw new TimeoutError('fetch', 5000);

// Connection lost
throw new ConnectionLostError('wss://api.example.com');
```

## Error Response Format

All errors are converted to a standard response format:

```typescript
interface ErrorResponse {
  error: string;           // Error type
  code: string;            // Machine-readable code
  message: string;         // Human-readable message
  details?: Record<string, unknown>;  // Additional details
  correlationId: string;   // Unique identifier
  timestamp: string;       // ISO timestamp
  requestId?: string;      // Request ID for tracing
  stack?: string;          // Stack trace (dev only)
}
```

## Retry Options

```typescript
interface RetryOptions {
  maxRetries?: number;              // Maximum retry attempts (default: 3)
  initialDelay?: number;            // Initial delay in ms (default: 1000)
  maxDelay?: number;                // Maximum delay in ms (default: 30000)
  backoffMultiplier?: number;       // Backoff multiplier (default: 2)
  jitterFactor?: number;            // Jitter factor 0-1 (default: 0.1)
  retryableCodes?: string[];        // Retryable error codes
  shouldRetry?: (error: Error) => boolean;  // Custom retry logic
  onRetry?: (attempt: number, error: Error) => void;  // Retry callback
}
```

## Circuit Breaker Configuration

```typescript
interface CircuitBreakerConfig {
  name: string;                     // Circuit breaker name
  failureThreshold?: number;         // Failures before opening (default: 5)
  timeout?: number;                 // Time window for failures (default: 60000ms)
  resetTimeout?: number;            // Time before recovery attempt (default: 30000ms)
  successThreshold?: number;        // Successes to close in half-open (default: 2)
  onOpen?: () => void;              // Callback when circuit opens
  onClose?: () => void;             // Callback when circuit closes
  onHalfOpen?: () => void;          // Callback when transitioning to half-open
}
```

## Error Logging

```typescript
import { globalErrorLogger } from '@polln/spreadsheet-errors';

// Log error with context
globalErrorLogger.logError(error, {
  userId: 'user123',
  sessionId: 'session456',
  severity: 'high',
});

// Get recent errors
const recentErrors = globalErrorLogger.getRecentErrors(10);

// Get error statistics
const stats = globalErrorLogger.getErrorStats();
console.log(stats.total, stats.byCode, stats.bySeverity);

// Redact sensitive data
const redacted = globalErrorLogger.redactSensitiveData(data);
```

## User-Friendly Messages

```typescript
import { globalErrorHandler } from '@polln/spreadsheet/errors';

// Get user-friendly message
const message = globalErrorHandler.toUserMessage(error);

// Get suggested actions
const actions = globalErrorHandler.getSuggestedActions(error);

// Check if error is retryable
const retryable = globalErrorHandler.isRetryable(error);
```

## React Integration

### Error Boundary

```tsx
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  useAsyncErrorHandler,
  ErrorDisplay,
} from '@polln/spreadsheet-errors';

// Using ErrorBoundary component
<ErrorBoundary
  fallback={(error, retry) => (
    <div>
      <p>{error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Log to monitoring service
  }}
>
  <YourComponent />
</ErrorBoundary>

// HOC for functional components
const SafeComponent = withErrorBoundary(YourComponent, {
  fallback: <div>Error occurred</div>,
});

// Hook for throwing errors
function Component() {
  const handleError = useErrorHandler();

  const handleClick = () => {
    try {
      riskyOperation();
    } catch (error) {
      handleError(error);
    }
  };
}

// Hook for async errors
function Component() {
  const [execute, { error, loading }] = useAsyncErrorHandler();

  const fetchData = async () => {
    await execute(async () => {
      const data = await apiCall();
      setState(data);
    });
  };
}

// Error display component
<ErrorDisplay
  error={error}
  onDismiss={() => setError(null)}
/>
```

## Best Practices

1. **Use Typed Errors**: Always use specific error classes for better handling
2. **Set Reasonable Limits**: Configure retry and circuit breaker limits appropriately
3. **Provide Context**: Include relevant context when logging errors
4. **Redact Sensitive Data**: Always redact passwords, tokens, and PII
5. **Monitor Circuits**: Track circuit breaker states for service health
6. **User-Friendly Messages**: Provide clear, actionable error messages

## Error Codes

| Code | Category | Retryable | Description |
|------|----------|-----------|-------------|
| INVALID_CELL | Validation | No | Invalid cell reference |
| INVALID_FORMULA | Validation | No | Invalid formula syntax |
| CIRCULAR_DEPENDENCY | Business Logic | No | Circular reference detected |
| ACCESS_DENIED | Permission | No | Access denied |
| VERSION_CONFLICT | Business Logic | Yes | Version conflict |
| NETWORK_ERROR | Network | Yes | Network error |
| TIMEOUT | Network | Yes | Operation timeout |
| SERVICE_UNAVAILABLE | System | Yes | Service unavailable |

## License

MIT
