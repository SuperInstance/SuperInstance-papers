# SuperInstance API - Cloudflare Workers

Backend API for SuperInstance educational website built with Cloudflare Workers, D1, and KV.

## Architecture

- **Runtime**: Cloudflare Workers (serverless)
- **Framework**: Hono (lightweight web framework)
- **Database**: Cloudflare D1 (SQLite)
- **Cache/Sessions**: Cloudflare KV (key-value store)
- **Authentication**: JWT tokens with session management
- **Validation**: Zod schema validation

## Project Structure

```
functions/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── env.d.ts              # TypeScript environment definitions
│   ├── shared/               # Shared utilities
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── db.ts             # Database operations
│   │   └── validation.ts     # Validation schemas
│   └── api/                  # API routes
│       ├── auth/             # Authentication endpoints
│       ├── progress/         # Progress tracking
│       ├── content/          # Content management
│       └── analytics/        # Analytics tracking
├── scripts/                  # Database scripts
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript configuration
└── wrangler.toml            # Cloudflare Workers configuration
```

## API Endpoints

### Authentication (`/api/auth/*`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Progress Tracking (`/api/progress/*`)
- `GET /api/progress/overview` - Get learning overview
- `GET /api/progress/tutorials` - Get tutorial progress
- `POST /api/progress/tutorials/{id}` - Mark tutorial complete
- `GET /api/progress/pathways` - Get pathway progress
- `POST /api/progress/pathways/{id}` - Update pathway progress
- `GET /api/progress/achievements` - Get user achievements

### Content Management (`/api/content/*`)
- `GET /api/content/whitepapers` - List white papers
- `GET /api/content/whitepapers/{id}` - Get white paper metadata
- `POST /api/content/whitepapers/{id}/access` - Track access
- `GET /api/content/tutorials` - List tutorials
- `GET /api/content/tutorials/{id}` - Get tutorial state
- `PUT /api/content/tutorials/{id}` - Save tutorial state
- `GET /api/content/demos` - List interactive demos
- `POST /api/content/demos/{id}/usage` - Track demo usage

### Analytics (`/api/analytics/*`)
- `POST /api/analytics/pageview` - Track page view
- `POST /api/analytics/event` - Track custom event
- `GET /api/analytics/summary` - Get analytics summary (admin)
- `GET /api/analytics/learning` - Get learning analytics

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ and npm
- Cloudflare account with Workers access
- Wrangler CLI: `npm install -g wrangler`

### 2. Install Dependencies
```bash
cd functions
npm install
```

### 3. Configure Cloudflare

#### Create D1 Database
```bash
npx wrangler d1 create superinstance-db
```
Update `wrangler.toml` with the generated database ID.

#### Create KV Namespaces
```bash
# Sessions namespace
npx wrangler kv:namespace create "sessions"
npx wrangler kv:namespace create "sessions" --preview

# Cache namespace
npx wrangler kv:namespace create "cache"
npx wrangler kv:namespace create "cache" --preview
```
Update `wrangler.toml` with the generated KV IDs.

#### Set Environment Secrets
```bash
# JWT secret for token signing
npx wrangler secret put JWT_SECRET

# Optional: Admin API key
npx wrangler secret put ADMIN_API_KEY
```

### 4. Initialize Database
```bash
# Apply schema
npx wrangler d1 execute superinstance-db --file=scripts/init-db.sql
```

### 5. Development
```bash
# Start local development server
npm run dev

# Or use wrangler directly
npx wrangler dev --env development
```

### 6. Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy

# Or use wrangler directly
npx wrangler deploy --env production
```

## Development

### Local Development
```bash
cd functions
npm run dev
```
Server runs at `http://localhost:8787`

### Testing
```bash
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint
npm run format        # Prettier formatting
```

### Environment Variables
- `ENVIRONMENT`: `development` | `staging` | `production`
- `JWT_SECRET`: Secret for JWT token signing
- `ADMIN_API_KEY`: Optional admin API key

### Database Operations
```bash
# Execute SQL file
npx wrangler d1 execute superinstance-db --file=scripts/init-db.sql

# Run SQL query
npx wrangler d1 execute superinstance-db --command="SELECT * FROM users"

# Export database
npx wrangler d1 export superinstance-db

# Import database
npx wrangler d1 import superinstance-db ./backup.sql
```

## Security

### Authentication Flow
1. User registers/login with email/password
2. Server validates credentials and generates JWT token
3. Token stored in HTTP-only cookie or Authorization header
4. Middleware validates token on protected routes
5. Sessions stored in KV with TTL for revocation

### Password Security
- Passwords hashed with bcrypt (salt rounds: 10)
- Minimum 8 characters with complexity requirements
- Password reset functionality (to be implemented)

### Rate Limiting
- Implemented per endpoint using KV counters
- Configurable limits per endpoint category
- IP-based and user-based limiting

### Data Protection
- Sensitive data encrypted at rest
- SQL injection prevention via parameterized queries
- XSS protection via input validation/sanitization
- CORS configured for specific origins

## Monitoring

### Logging
- Request/response logging via Hono logger middleware
- Error logging to console with structured format
- Cloudflare Workers built-in logging

### Analytics
- Page view tracking
- Custom event tracking
- Learning progress analytics
- User engagement metrics

### Performance
- Response time monitoring
- Error rate tracking
- Database query performance
- Cache hit rates

## Scaling Considerations

### Free Tier Limits (Cloudflare)
- Workers: 100,000 requests/day
- KV: 1 GB storage, 1,000 writes/day
- D1: 5 MB storage, 5 million rows
- Consider upgrading to paid tier when approaching limits

### Optimization Strategies
1. **Caching**: Aggressive KV caching for frequent queries
2. **Batching**: Batch writes to reduce KV/D1 operations
3. **CDN**: Use Cloudflare Pages for static content
4. **Monitoring**: Track usage to plan upgrades

## Integration

### Frontend Integration
```javascript
// Example API client
const API_BASE = 'https://superinstance.ai/api'

async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) throw new Error('Login failed')
  return response.json()
}
```

### Environment Configuration
Update website configuration to point to API endpoints:
```javascript
// In website configuration
const config = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://superinstance.ai/api'
    : 'http://localhost:8787/api'
}
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Verify D1 database exists and is bound in wrangler.toml
   - Check database initialization script ran successfully

2. **Authentication failures**
   - Verify JWT_SECRET is set as environment secret
   - Check token expiration and validation logic

3. **CORS errors**
   - Verify CORS configuration in index.ts
   - Check frontend origin is in allowed origins list

4. **Rate limiting issues**
   - Check KV namespace configuration
   - Verify rate limit counters are being stored correctly

### Debugging
```bash
# Enable verbose logging
WRANGLER_LOG=debug npx wrangler dev

# Check Worker logs in Cloudflare dashboard
# Monitor KV and D1 usage in Cloudflare dashboard
```

## Contributing

1. Follow TypeScript and ESLint rules
2. Write tests for new functionality
3. Update documentation for API changes
4. Use conventional commit messages

## License

Proprietary - SuperInstance.AI