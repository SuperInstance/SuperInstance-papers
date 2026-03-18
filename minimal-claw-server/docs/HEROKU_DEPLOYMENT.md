# Heroku Deployment Guide for Minimal CLAW Server

This guide covers deploying the Minimal CLAW Server to Heroku.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deploying](#deploying)
5. [Database Setup](#database-setup)
6. [Redis Setup](#redis-setup)
7. [Scaling](#scaling)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying to Heroku, ensure you have:

- Heroku account (free tier available)
- Heroku CLI installed
- Git installed
- GitHub account (optional)

```bash
# Install Heroku CLI
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Linux
# snap install --classic heroku

# Login to Heroku
heroku login
```

---

## Quick Start

### Step 1: Prepare Your Application

```bash
# Clone the repository
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server

# Create Heroku app
heroku create your-app-name

# Add buildpacks
heroku buildpacks:set heroku/nodejs
```

### Step 2: Create Procfile

Create a file named `Procfile` in the root directory:

```procfile
web: node src/index.js
worker: node src/worker.js
```

### Step 3: Deploy

```bash
# Deploy to Heroku
git push heroku main

# Open the application
heroku open
```

---

## Configuration

### Environment Variables

Set environment variables using Heroku CLI:

```bash
# Set Node environment
heroku config:set NODE_ENV=production

# Set port (Heroku sets this automatically)
# PORT is automatically set by Heroku

# Set log level
heroku config:set LOG_LEVEL=info

# Set JWT secret
heroku config:set JWT_SECRET=your-super-secret-jwt-key

# Set CORS origins
heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com
```

### Database Configuration

```bash
# Provision PostgreSQL
heroku addons:create heroku-postgresql:mini

# The DATABASE_URL is automatically set

# Verify connection
heroku pg
```

### Redis Configuration

```bash
# Provision Redis
heroku addons:create heroku-redis:mini

# The REDIS_URL is automatically set

# Verify connection
heroku redis
```

---

## Deploying

### Manual Deployment

```bash
# Commit your changes
git add .
git commit -m "Deploy to Heroku"

# Push to Heroku
git push heroku main

# View logs
heroku logs --tail
```

### Automatic Deployment (GitHub Integration)

1. Connect your GitHub repository to Heroku:
   ```bash
   heroku pipelines:create -a your-app-name
   ```

2. Enable automatic deployments in Heroku dashboard

3. Every push to `main` branch triggers a deployment

---

## Database Setup

### Run Migrations

```bash
# Run database migrations
heroku run npm run migrate

# Open PostgreSQL console
heroku pg:psql
```

### Backup Database

```bash
# Create backup
heroku pg:backups:capture

# List backups
heroku pg:backups

# Restore from backup
heroku pg:backups:restore <backup-id> --confirm your-app-name
```

### Scale Database

```bash
# Upgrade database tier
heroku addons:upgrade heroku-postgresql:standard-0

# Check database stats
heroku pg:info
```

---

## Redis Setup

### Monitor Redis

```bash
# View Redis info
heroku redis:info

# Connect to Redis CLI
heroku redis:cli
```

### Scale Redis

```bash
# Upgrade Redis tier
heroku addons:upgrade heroku-redis:premium-0
```

---

## Scaling

### Scale Dynos

```bash
# Scale web dynos
heroku ps:scale web=2

# Scale worker dynos
heroku ps:scale worker=1

# View dyno status
heroku ps
```

### Auto-Scaling

Install Heroku Auto-Scaling add-on:

```bash
# Install autoscaler add-on
heroku addons:install heroku-autoscaler:standard

# Configure autoscaling
heroku autoscale:set --min=2 --max=10 --app=your-app-name
```

---

## Monitoring

### View Logs

```bash
# Tail logs in real-time
heroku logs --tail

# View logs for specific dyno
heroku logs --tail --dyno web

# View recent logs
heroku logs -n 200
```

### Metrics

```bash
# View app metrics
heroku metrics

# View specific metrics
heroku ps:info
```

### Performance Monitoring

Install performance monitoring add-ons:

```bash
# Install New Relic
heroku addons:create newrelic:wayne

# Install Scout APM
heroku addons:create scoutapm:free
```

---

## Troubleshooting

### Common Issues

**Issue**: Application crashes on startup

```bash
# Check logs
heroku logs --tail

# Check if port is correctly set
heroku config | grep PORT

# Check if all dependencies are installed
heroku run npm list
```

**Issue**: Database connection errors

```bash
# Check DATABASE_URL
heroku config | grep DATABASE_URL

# Test database connection
heroku pg:psql -c "SELECT 1"
```

**Issue**: Redis connection errors

```bash
# Check REDIS_URL
heroku config | grep REDIS_URL

# Test Redis connection
heroku redis:cli ping
```

**Issue**: Out of memory errors

```bash
# Upgrade dyno size
heroku dyno:resize standard-2x

# Check memory usage
heroku ps:info
```

---

## Production Checklist

### Security

- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS (automatic on Heroku)
- [ ] Configure CORS correctly
- [ ] Set secure environment variables
- [ ] Enable Heroku Labs: Dyno Metadata

### Performance

- [ ] Enable caching with Redis
- [ ] Use appropriate dyno size
- [ ] Enable auto-scaling
- [ ] Monitor response times
- [ ] Optimize database queries

### Reliability

- [ ] Enable automatic deployments
- [ ] Set up database backups
- [ ] Configure error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Create runbook for incidents

---

## Cost Optimization

### Free Tier

- 1 web dyno (sleeps after 30 min inactivity)
- 1 worker dyno
- Heroku PostgreSQL (Mini) - 10,000 rows
- Heroku Redis (Mini) - 25 connections

### Paid Tier

- **Basic**: $7/month per dyno (no sleep)
- **Standard**: $25/month per dyno (more memory)
- **Performance**: $500/month per dyno (most powerful)

### Tips

1. **Use Eco dynos** for development ($5/month)
2. **Scale down** during low traffic periods
3. **Use Redis caching** to reduce database load
4. **Monitor usage** to avoid over-provisioning
5. **Use Heroku Dashboard** to track costs

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
```

---

## Next Steps

1. **Set up custom domain** (optional)
   ```bash
   heroku domains:add yourdomain.com
   ```

2. **Enable SSL** (automatic with custom domain)

3. **Set up monitoring** (Sentry, New Relic, etc.)

4. **Configure error tracking**
   ```bash
   heroku addons:create sentry:f3
   ```

5. **Set up logging** (LogDNA, Papertrail, etc.)
   ```bash
   heroku addons:create logtail:beta
   ```

---

## Additional Resources

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku PostgreSQL](https://devcenter.heroku.com/articles/heroku-postgresql)
- [Heroku Redis](https://devcenter.heroku.com/articles/heroku-redis)
- [Heroku CLI Commands](https://devcenter.heroku.com/articles/heroku-cli-commands)
- [Heroku Pricing](https://www.heroku.com/pricing)
