# Vercel Deployment Guide for Minimal CLAW Server

This guide covers deploying the Minimal CLAW Server to Vercel (serverless deployment).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Serverless Functions](#serverless-functions)
5. [Database Integration](#database-integration)
6. [Monitoring](#monitoring)
7. [Limitations](#limitations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying to Vercel, ensure you have:

- Vercel account (free tier available)
- Vercel CLI installed
- GitHub account
- Existing database (recommended: Supabase, PlanetScale, or Neon)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

---

## Quick Start

### Step 1: Initialize Project

```bash
# Clone the repository
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server

# Install dependencies
npm install

# Deploy to Vercel
vercel
```

### Step 2: Configure Project

```bash
# Link to existing project
vercel link

# Set environment variables
vercel env add NODE_ENV
vercel env add JWT_SECRET
vercel env add DATABASE_URL
```

### Step 3: Deploy to Production

```bash
# Deploy to production
vercel --prod
```

---

## Configuration

### vercel.json

Create `vercel.json` in the root directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/src/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/src/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "PORT": "8080"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

---

## Serverless Functions

Vercel requires adapting your Express app to serverless functions.

### Step 1: Create API Handler

Create `src/api/index.js`:

```javascript
import app from '../index.js';

export default async (req, res) => {
  await app(req, res);
};
```

### Step 2: Create Individual Endpoints

Create `src/api/agents/index.js`:

```javascript
export default async (req, res) => {
  const { method, query } = req;

  if (method === 'GET') {
    // List all agents
    res.json({ success: true, data: [] });
  } else if (method === 'POST') {
    // Create new agent
    res.json({ success: true, data: {} });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
```

Create `src/api/agents/[id].js`:

```javascript
export default async (req, res) => {
  const { method, query } = req;
  const { id } = query;

  if (method === 'GET') {
    // Get agent by ID
    res.json({ success: true, data: { id } });
  } else if (method === 'PATCH') {
    // Update agent
    res.json({ success: true, data: { id } });
  } else if (method === 'DELETE') {
    // Delete agent
    res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
```

---

## Database Integration

### Option 1: Supabase (Recommended)

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

Create `src/lib/db.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default supabase;
```

### Option 2: Neon (Serverless PostgreSQL)

```bash
# Set environment variable
vercel env add DATABASE_URL
```

Create `src/lib/db.js`:

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default sql;
```

### Option 3: PlanetScale (MySQL)

```bash
# Install PlanetScale client
npm install @planetscale/database

# Set environment variables
vercel env add PLANETSCALE_URL
```

Create `src/lib/db.js`:

```javascript
import { Client } from '@planetscale/database';

const client = new Client({
  url: process.env.PLANETSCALE_URL
});

export default client;
```

---

## Monitoring

### Vercel Analytics

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to your app
import { Analytics } from '@vercel/analytics/react';
```

### Environment Variables

```bash
# Set up error tracking (Sentry)
vercel env add SENTRY_DSN

# Set up logging
vercel env add LOG_LEVEL
```

### View Logs

```bash
# View deployment logs
vercel logs

# View real-time logs
vercel logs --follow
```

---

## Limitations

### Vercel Serverless Limitations

1. **Execution Time**: Max 10 seconds (Hobby), 60 seconds (Pro)
2. **WebSocket Support**: Not supported on serverless functions
3. **Background Jobs**: Not supported
4. **Persistent Connections**: Limited support

### Workarounds

**WebSocket Support**: Use Vercel Edge Functions with third-party services:
- Pusher
- Ably
- Supabase Realtime

**Background Jobs**: Use cron jobs or external services:
- Vercel Cron Jobs
- GitHub Actions
- AWS Lambda

---

## Deployment

### Automatic Deployment

Connect your GitHub repository to Vercel:

1. Go to Vercel Dashboard
2. Click "Import Project"
3. Select your GitHub repository
4. Configure build settings
5. Deploy

### Manual Deployment

```bash
# Deploy to preview URL
vercel

# Deploy to production
vercel --prod

# Deploy with custom alias
vercel --alias staging.example.com
```

### Environment-Specific Deployments

```bash
# Deploy to staging
vercel --env=staging

# Deploy to production
vercel --env=production --prod
```

---

## Troubleshooting

### Common Issues

**Issue**: Function execution timeout

```bash
# Optimize function code
# Break into smaller functions
# Use Vercel Edge Functions for faster execution
```

**Issue**: Database connection errors

```bash
# Check DATABASE_URL
vercel env ls

# Test database connection
# Use connection pooling (PgBouncer)
```

**Issue**: Cold start delays

```bash
# Keep functions warm with cron jobs
# Use Vercel Edge Functions
# Minimize dependencies
```

---

## Production Checklist

### Security

- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Configure CORS correctly
- [ ] Set secure environment variables
- [ ] Enable Vercel Analytics

### Performance

- [ ] Optimize function code
- [ ] Use Edge Functions when possible
- [ ] Enable caching with Vercel KV
- [ ] Monitor cold start times
- [ ] Use database connection pooling

### Reliability

- [ ] Enable automatic deployments
- [ ] Set up error tracking (Sentry)
- [ ] Configure monitoring (Vercel Analytics)
- [ ] Set up uptime monitoring
- [ ] Create runbook for incidents

---

## Cost Optimization

### Free Tier

- 100 GB bandwidth
- 100 GB-hours of execution
- Unlimited deployments
- Automatic HTTPS
- Edge Network

### Pro Tier ($20/month)

- 1 TB bandwidth
- 1000 GB-hours of execution
- Team collaboration
- Advanced analytics

### Tips

1. **Optimize function size** to reduce cold starts
2. **Use Edge Functions** for faster execution
3. **Enable caching** to reduce database load
4. **Monitor usage** to avoid overages
5. **Use Vercel KV** for caching

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

---

## Next Steps

1. **Set up custom domain** (optional)
   ```bash
   vercel domains add yourdomain.com
   ```

2. **Enable monitoring** (Vercel Analytics)

3. **Set up error tracking** (Sentry)
   ```bash
   npm install @sentry/nextjs
   ```

4. **Configure logging** (Vercel Logs)

5. **Set up staging environment**
   ```bash
   vercel link --env=staging
   ```

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel Pricing](https://vercel.com/docs/pricing)
