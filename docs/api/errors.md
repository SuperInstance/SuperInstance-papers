# Error Handling

## Overview

The POLLN WebSocket API uses structured error responses to communicate failures to clients. All error responses follow a consistent format.

## Error Format

```typescript
{
  type: 'error',
  payload: null,
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable error message',
    details: {
      // Additional error details
    }
  }
}
```

## Error Codes

### UNAUTHORIZED

Authentication is required to access this resource.

```typescript
{
  type: 'error',
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required'
  }
}
```

**Solution**: Send a valid authentication token.

### FORBIDDEN

Client does not have permission to perform this action.

```typescript
{
  type: 'error',
  error: {
    code: 'FORBIDDEN',
    message: 'Insufficient permissions'
  }
}
```

**Solution**: Ensure your token has the required permissions.

### NOT_FOUND

Requested resource does not exist.

```typescript
{
  type: 'error',
  error: {
    code: 'NOT_FOUND',
    message: 'Colony not found'
  }
}
```

**Solution**: Verify the resource exists before requesting.

### INVALID_PAYLOAD

Request payload is invalid or malformed.

```typescript
{
  type: 'error',
  error: {
    code: 'INVALID_PAYLOAD',
    message: 'Invalid request payload',
    details: {
      missing: ['colonyId']
    }
  }
}
```

**Solution**: Check that all required fields are present and correctly formatted.

### RATE_LIMITED

Client has exceeded rate limit.

```typescript
{
  type: 'error',
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
```

**Solution**: Wait before sending more requests. Implement exponential backoff.

### AGENT_NOT_FOUND

Specified agent does not exist.

```typescript
{
  type: 'error',
  error: {
    code: 'AGENT_NOT_FOUND',
    message: 'Agent not found'
  }
}
```

### COLONY_NOT_FOUND

Specified colony does not exist.

```typescript
{
  type: 'error',
  error: {
    code: 'COLONY_NOT_FOUND',
    message: 'Colony not found'
  }
}
```

### COMMAND_FAILED

Command execution failed.

```typescript
{
  type: 'error',
  error: {
    code: 'COMMAND_FAILED',
    message: 'Command execution failed'
  }
}
```

### INTERNAL_ERROR

Internal server error occurred.

```typescript
{
  type: 'error',
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error'
  }
}
```

**Solution**: Contact support if the issue persists.

## Error Handling Best Practices

### 1. Always Check for Errors

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'error') {
    console.error('Error:', message.error);
    return;
  }

  // Handle successful response
  console.log('Success:', message.payload);
};
```

### 2. Handle Specific Error Codes

```typescript
function handleError(error: APIError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Re-authenticate
      reauthenticate();
      break;
    case 'RATE_LIMITED':
      // Wait and retry
      setTimeout(retry, 60000);
      break;
    default:
      // Handle other errors
      console.error('Unknown error:', error);
  }
}
```

### 3. Implement Retry Logic

```typescript
async function sendWithRetry(message: ClientMessage, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await sendAndWait(message);
      return response;
    } catch (error) {
      if (error.code === 'RATE_LIMITED' && i < maxRetries - 1) {
        await delay(1000 * (i + 1));
      } else {
        throw error;
      }
    }
  }
}
```
