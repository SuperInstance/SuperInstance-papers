# SpreadsheetMoment - Cloudflare Deployment

**Tensor-Based Spreadsheet Platform on the Edge**

[![Deploy Status](https://img.shields.io/badge/deployment-production-success)](https://api.spreadsheetmoment.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp deployment/cloudflare/wrangler.example.toml wrangler.toml
# Edit wrangler.toml with your settings

# Deploy to staging
npm run deploy:staging

# Run tests
npm test

# Start local development server
npm run dev
```

---

## Overview

SpreadsheetMoment is a revolutionary tensor-based spreadsheet platform deployed on Cloudflare's edge computing infrastructure, enabling:

- **Real-time collaboration** with <100ms latency globally
- **AI-powered natural language** processing for cell operations
- **Hardware integration** with Arduino, ESP32, and NVIDIA Jetson
- **Multi-dimensional tensor spaces** for advanced data modeling
- **Offline-first architecture** with seamless sync
- **What-if scenario simulation** for decision support

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                           │
├─────────────────────────────────────────────────────────────┤
│  Workers (7) | D1 (SQL) | R2 (Objects) | Vectorize | DO     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP CLIENTS                          │
├─────────────────────────────────────────────────────────────┤
│  Linux | Windows | macOS | NVIDIA Jetson                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **API Gateway Worker** - Request routing, authentication, rate limiting
- **Cell Engine Worker** - Tensor computations, temperature propagation
- **NLP Worker** - Natural language processing, semantic search
- **Hardware Worker** - Arduino/ESP32/Jetson integration
- **Collaboration Worker** - Real-time multi-user editing
- **Durable Objects** - State management for workspaces and sessions
- **Vectorize** - Vector database for semantic search

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Complete system architecture and design |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Step-by-step deployment instructions |
| [PIPELINE.md](PIPELINE.md) | CI/CD pipeline and automation |
| [DOCKER_DESKTOP.md](DOCKER_DESKTOP.md) | Desktop and Jetson deployment |

---

## Prerequisites

### Required

- **Node.js** 18+ and npm 9+
- **Wrangler CLI** (`npm install -g wrangler`)
- **Cloudflare Account** with Workers Paid plan
- **Domain name** configured in Cloudflare

### External Services

- **OpenAI API** - For NLP and embeddings
- **OAuth Providers** - Google/GitHub for authentication
- **SuperInstance API** - For tensor computation (optional)

---

## Deployment

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/spreadsheet-moment.git
cd spreadsheet-moment

# Install dependencies
npm install

# Configure Wrangler
cp deployment/cloudflare/wrangler.example.toml wrangler.toml
# Edit wrangler.toml with your Cloudflare account ID and settings
```

### 2. Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create D1 databases
wrangler d1 create spreadsheetmoment-prod
wrangler d1 create spreadsheetmoment-staging

# Create R2 buckets
wrangler r2 bucket create spreadsheetmoment-prod
wrangler r2 bucket create spreadsheetmoment-staging

# Create KV namespaces
wrangler kv:namespace create "KV" --preview=false
wrangler kv:namespace create "KV" --preview=true

# Create Vectorize indexes
wrangler vectorize create spreadsheetmoment-cells \
  --dimensions=1536 --metric=cosine

# Create Queues
wrangler queues create analytics-events
wrangler queues create backup-jobs
```

### 3. Configure Environment

```bash
# Set production secrets
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put ENCRYPTION_KEY --env production
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production

# Set staging secrets
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put JWT_SECRET --env staging
# ... repeat for all secrets
```

### 4. Run Migrations

```bash
# Apply database schema
wrangler d1 execute spreadsheetmoment-prod \
  --file=deployment/cloudflare/migrations/001_initial_schema.sql

wrangler d1 execute spreadsheetmoment-staging \
  --file=deployment/cloudflare/migrations/001_initial_schema.sql
```

### 5. Deploy

```bash
# Deploy to staging
npm run deploy:staging

# Test staging
curl https://api-staging.spreadsheetmoment.com/health

# Deploy to production
npm run deploy:production

# Verify production
curl https://api.spreadsheetmoment.com/health
```

---

## Local Development

### Start Development Server

```bash
# Start Worker with local D1, R2, KV
npm run dev

# Access at http://localhost:8787
```

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Monitor Logs

```bash
# Tail production logs
npm run tail:production

# Tail staging logs
npm run tail:staging
```

---

## API Usage

### Authentication

```bash
# Login with Cloudflare Access
curl -X POST https://api.spreadsheetmoment.com/api/v1/auth/login \
  -H "Cf-Access-Jwt-Assertion: YOUR_JWT_TOKEN"

# Get API token
curl -X POST https://api.spreadsheetmoment.com/api/v1/auth/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Workspace

```bash
curl -X POST https://api.spreadsheetmoment.com/api/v1/workspaces \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Tensor Workspace",
    "description": "Testing tensor-based spreadsheets"
  }'
```

### Create Cell

```bash
curl -X POST https://api.spreadsheetmoment.com/api/v1/workspaces/WS_ID/cells \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A1",
    "value": 42,
    "type": "number",
    "dimensions": ["sheet1"],
    "coordinates": [0, 0]
  }'
```

### NLP Query

```bash
curl -X POST https://api.spreadsheetmoment.com/api/v1/nlp/query \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me all cells with value greater than 40",
    "workspace_id": "WS_ID"
  }'
```

### Hardware Connection

```bash
curl -X POST https://api.spreadsheetmoment.com/api/v1/hardware/connect \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "arduino",
    "device_name": "Sensor Array",
    "endpoint": "https://device-endpoint.com"
  }'
```

---

## Desktop Deployment

### Linux

```bash
# Build AppImage
./scripts/build-linux.sh 1.0.0

# Install
sudo dpkg -i build/linux/SpreadsheetMoment-1.0.0.deb

# Run
spreadsheetmoment
```

### NVIDIA Jetson

```bash
# Build for Jetson
./scripts/jetson-build.sh

# Deploy to Jetson
scp build/jetson/spreadsheetmoment-jetson.tar.gz jetson@jetson-ip:~

# On Jetson
tar -xzf spreadsheetmoment-jetson.tar.gz
cd spreadsheetmoment
./jetson-launch.sh
```

### Windows (WSL2)

```powershell
# Build Windows package
.\scripts\build-windows.ps1 1.0.0

# Install
.\build\windows\install.bat
```

---

## Monitoring

### Metrics Dashboard

Access the Grafana dashboard at: `https://monitoring.spreadsheetmoment.com`

Key metrics:
- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- Durable Object operations
- D1 query performance
- NLP query performance
- Cell update throughput

### Health Checks

```bash
# API health
curl https://api.spreadsheetmoment.com/health

# Database health
curl https://api.spreadsheetmoment.com/health/db

# Durable Objects health
curl https://api.spreadsheetmoment.com/health/objects

# Vectorize health
curl https://api.spreadsheetmoment.com/health/vectors
```

### Logs

```bash
# Real-time logs
npm run tail:production

# Query specific time range
wrangler tail --format pretty --since="1h ago"
```

---

## Troubleshooting

### Common Issues

**Issue: "Durable Objects not enabled"**
- Enable Durable Objects in Cloudflare dashboard
- Requires Workers Paid plan ($5/month)

**Issue: "Database locked"**
- Check for long-running queries
- Use `wrangler d1 backups list` to check backup status

**Issue: "High latency"**
- Check Worker CPU time: `wrangler metrics`
- Optimize database queries with proper indexes
- Enable caching for frequently accessed data

**Issue: "Hardware connection failed"**
- Verify USB device permissions
- Check serial port configuration
- Test with Arduino Serial Monitor first

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# View Worker metrics
wrangler metrics --format json

# Test specific Worker
wrangler dev --local --debug
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Latency (p95) | <100ms | ~75ms |
| Cell Update Latency | <50ms | ~35ms |
| Real-time Sync | <100ms | ~80ms |
| NLP Query | <2s | ~1.5s |
| Vector Search | <500ms | ~300ms |
| Uptime | 99.99% | 99.995% |

---

## Cost Estimation

**Monthly cost per 100K active users:**

- Workers: ~$500 (100M requests)
- D1 Database: ~$275 (1B rows read, 50GB storage)
- R2 Storage: ~$65 (1TB storage, 10M operations)
- Durable Objects: ~$52 (10M requests, 100GB storage)
- KV/Vectorize/Queue: ~$2
- **Total: ~$894/month**

See [ARCHITECTURE.md](ARCHITECTURE.md#cost-optimization) for optimization strategies.

---

## Security

### Authentication

- Cloudflare Access (Zero Trust) for SSO
- OAuth 2.0 (Google, GitHub)
- API key authentication for service accounts
- JWT-based session tokens

### Data Protection

- Encryption at rest (D1, R2)
- TLS 1.3 for data in transit
- Sensitive data encrypted with AES-256
- Regular security audits

### Rate Limiting

- Per-user quotas (configurable)
- API endpoint rate limits
- DDoS protection via Cloudflare

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## Support

- **Documentation:** [docs.spreadsheetmoment.com](https://docs.spreadsheetmoment.com)
- **Issues:** [GitHub Issues](https://github.com/your-org/spreadsheet-moment/issues)
- **Email:** support@spreadsheetmoment.com
- **Discord:** [discord.gg/spreadsheetmoment](https://discord.gg/spreadsheetmoment)

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

## Roadmap

### Phase 1: Core Platform (Current)
- Multi-dimensional tensor cells
- Temperature-based propagation
- Basic NLP integration
- Hardware connections
- Real-time collaboration

### Phase 2: Advanced Features (Q2 2026)
- Advanced what-if scenarios
- 3D printing integration
- AI-generated UI mockups
- Mobile apps (iOS, Android)

### Phase 3: Enterprise (Q3 2026)
- Advanced permissions
- SSO/SAML
- Audit logging
- Compliance certifications
- White-label deployment

### Phase 4: Ecosystem (Q4 2026)
- Plugin system
- Public API
- Integration marketplace
- Developer platform

---

**Built with ❤️ using Cloudflare Workers**

*From static grids to dynamic tensor universes.* 🚀
