# Wave 7 Authentication & Authorization - Quick Start Guide

## Quick Reference

### 1. Default Login Credentials
```
Username: admin
Password: admin123
Role: admin
```

### 2. API Endpoints

#### Register New User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "admin",
    "username": "admin",
    "email": "admin@polln.local",
    "role": "admin",
    "permissions": ["cells:read", "cells:write", ...]
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

#### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

#### Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### 3. Using Authentication

#### With REST API
```bash
# Get cells (authenticated)
curl http://localhost:3000/api/cells/A1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create cell (requires permission)
curl -X POST http://localhost:3000/api/cells \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "row": 1,
    "col": 1,
    "type": "InputCell",
    "value": 42
  }'
```

#### With WebSocket
```javascript
// Connect with authentication
const token = 'YOUR_ACCESS_TOKEN';
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected as authenticated user');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### 4. Role-Based Access Control

#### Roles (in order of privilege)
1. **admin** - Full system access
2. **user** - Read/write cells and spreadsheets
3. **readonly** - Read-only access
4. **guest** - Read-only access

#### Permissions
```typescript
// Cell operations
Permission.CELLS_READ        // Read cell data
Permission.CELLS_WRITE       // Modify cell data
Permission.CELLS_DELETE      // Delete cells
Permission.CELLS_ENTANGLE    // Create entanglements

// Spreadsheet operations
Permission.SPREADSHEET_READ  // Read spreadsheet
Permission.SPREADSHEET_WRITE // Modify spreadsheet
Permission.SPREADSHEET_ADMIN // Admin operations

// User management
Permission.USERS_MANAGE      // Manage users
Permission.USERS_READ        // View users

// System
Permission.SYSTEM_ADMIN      // System administration
Permission.SYSTEM_METRICS    // View metrics
```

### 5. Middleware Examples

```typescript
import {
  requireAuth,
  requireAdmin,
  requirePermissions,
  optionalAuth
} from './auth/index.js';
import { Permission } from './auth/Permissions.js';

// Require authentication
app.get('/api/profile', requireAuth(), getProfile);

// Require admin role
app.delete('/api/users/:id', requireAdmin(), deleteUser);

// Require specific permissions
app.post('/api/cells',
  requirePermissions(Permission.CELLS_WRITE),
  createCell
);

// Allow guests
app.get('/api/public', optionalAuth(), publicEndpoint);
```

### 6. Error Responses

#### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "No authentication token provided"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "required": ["cells:write"],
  "granted": ["cells:read"]
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30
}
```

### 7. Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 | 15 minutes |
| POST /auth/register | 10 | 1 minute |
| /api/* | 100 | 1 minute |
| WebSocket connections | 100 per user | - |

### 8. Testing

```bash
# Run all auth tests
npm test src/spreadsheet/backend/__tests__/auth.test.ts

# Run basic tests
npm test src/spreadsheet/backend/__tests__/auth-basic.test.ts
```

### 9. Configuration

```bash
# .env file
JWT_SECRET=your-secret-key-here-min-32-chars
ACCESS_TOKEN_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800
```

### 10. Common Patterns

#### Check if user has permission
```typescript
import { hasPermission } from './auth/index.js';
import { Permission } from './auth/Permissions.js';

if (hasPermission(req, Permission.CELLS_WRITE)) {
  // Allow operation
}
```

#### Get current user
```typescript
import { getCurrentUser } from './auth/index.js';

const user = getCurrentUser(req);
if (user) {
  console.log(`User ${user.username} is authenticated`);
}
```

#### Create custom rate limiter
```typescript
import { createRateLimiter } from './auth/index.js';

const customLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60000, // 1 minute
  keyGenerator: (req) => req.user?.id || req.ip,
});

app.use('/api/custom', customLimiter, customHandler);
```

## Troubleshooting

### Token Expired
```json
{
  "error": "Authentication failed",
  "message": "Token expired"
}
```
**Solution:** Use refresh token to get new access token.

### Invalid Token
```json
{
  "error": "Authentication failed",
  "message": "Invalid token"
}
```
**Solution:** Login again to get new tokens.

### Rate Limited
```json
{
  "error": "Too many requests",
  "retryAfter": 30
}
```
**Solution:** Wait specified seconds before retrying.

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong JWT_SECRET in environment
- [ ] Enabled HTTPS in production
- [ ] Configured CORS properly
- [ ] Implemented proper logging
- [ ] Set up monitoring for auth failures
- [ ] Configured rate limits appropriately
- [ ] Tested token refresh flow
- [ ] Implemented logout on client side
- [ ] Added audit logging for sensitive operations

## Support

For issues or questions:
1. Check `WAVE_7_AUTH_SUMMARY.md` for detailed documentation
2. Review test files for usage examples
3. Check console logs for error messages
4. Verify JWT_SECRET is set correctly

---

**Last Updated:** March 9, 2026
**Wave:** 7
**Status:** Production Ready
