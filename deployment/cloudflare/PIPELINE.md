# SpreadsheetMoment - CI/CD Pipeline

**Version:** 1.0
**Last Updated:** 2026-03-14

---

## Overview

This document describes the complete CI/CD pipeline for SpreadsheetMoment, covering:

- **GitHub Actions** for continuous integration/deployment
- **Terraform** for infrastructure as code
- **Testing** strategies (unit, integration, E2E)
- **Monitoring** and observability
- **Rollback** procedures

---

## GitHub Actions Workflows

### 1. Main CI/CD Pipeline

**.github/workflows/deploy.yml:**

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  NODE_VERSION: '20'
  WRANGLER_VERSION: '3.22.0'

jobs:
  # Security and dependency scanning
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}

  # Lint and type checking
  code-quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Format check
        run: npm run format:check

  # Unit tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [code-quality]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json
          flags: unittests

  # Integration tests with local services
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

      qdrant:
        image: qdrant/qdrant:v1.7.0
        ports:
          - 6333:6333

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Wrangler
        run: npm install -g wrangler@${{ env.WRANGLER_VERSION }}

      - name: Create D1 database (local)
        run: |
          wrangler d1 execute DB --local --file=deployment/cloudflare/migrations/001_initial_schema.sql

      - name: Run integration tests
        run: npm run test:integration
        env:
          REDIS_URL: redis://localhost:6379
          QDRANT_URL: http://localhost:6333
          DATABASE_URL: local

  # E2E tests with Cloudflare Workers
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [integration-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Wrangler
        run: npm install -g wrangler@${{ env.WRANGLER_VERSION }}

      - name: Deploy to staging
        run: wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_ENVIRONMENT: staging
          TEST_URL: https://api-staging.spreadsheetmoment.com

      - name: Upload E2E test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results
          path: playwright-report/

  # Performance tests
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run performance tests
        run: k6 run tests/performance/load-test.js
        env:
          TEST_URL: https://api-staging.spreadsheetmoment.com

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results.json

  # Deploy to staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [security-scan, unit-tests, integration-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/staging'
    environment:
      name: staging
      url: https://api-staging.spreadsheetmoment.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          TEST_ENVIRONMENT: staging

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment complete! https://api-staging.spreadsheetmoment.com'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  # Deploy to production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [security-scan, unit-tests, integration-tests, e2e-tests, performance-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.spreadsheetmoment.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Create deployment tag
        id: tag_version
        uses: anothrNick/github-tag-action@1.67.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DEFAULT_BUMP: patch
          RELEASE_BRANCHES: main

      - name: Deploy to Cloudflare Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          TEST_ENVIRONMENT: production

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.tag_version.outputs.new_tag }}
          release_name: Release ${{ steps.tag_version.outputs.new_tag }}
          body: |
            ## Changes in this Release
            ${{ steps.tag_version.outputs.changelog }}

            ## Deployment Details
            - Environment: Production
            - URL: https://api.spreadsheetmoment.com
            - Deployed at: ${{ github.event.head_commit.timestamp }}

      - name: Notify production deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Production deployment complete!
            Version: ${{ steps.tag_version.outputs.new_tag }}
            URL: https://api.spreadsheetmoment.com
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

      - name: Update deployment status
        uses: chrnorm/deployment-status@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment-url: https://api.spreadsheetmoment.com
          deployment-id: ${{ github.event.deployment }}
          state: ${{ job.status }}
        if: always()

  # Rollback on failure
  rollback-production:
    name: Rollback Production
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: failure()
    environment:
      name: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get previous successful deployment
        id: previous_deploy
        run: |
          PREVIOUS_SHA=$(git log --pretty=format:'%H' --skip=1 -1)
          echo "sha=$PREVIOUS_SHA" >> $GITHUB_OUTPUT

      - name: Deploy previous version
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: rollback --env production

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: 'failure'
          text: |
            Production deployment failed! Rolled back to previous version.
            SHA: ${{ steps.previous_deploy.outputs.sha }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  # Post-deployment monitoring
  monitor-deployment:
    name: Monitor Deployment
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: success()
    steps:
      - name: Wait for deployment to stabilize
        run: sleep 60

      - name: Check API health
        run: |
          curl -f https://api.spreadsheetmoment.com/health || exit 1

      - name: Check error rates
        run: |
          ERROR_RATE=$(curl -s https://api.spreadsheetmoment.com/metrics | jq '.error_rate')
          if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
            echo "Error rate too high: $ERROR_RATE%"
            exit 1
          fi

      - name: Create deployment issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Deployment Monitoring Alert',
              body: 'Post-deployment checks failed. Please investigate.',
              labels: ['deployment', 'alert']
            })
```

### 2. Database Migration Workflow

**.github/workflows/migrate-db.yml:**

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      migration:
        description: 'Migration file name'
        required: true
        default: '001_initial_schema.sql'

env:
  NODE_VERSION: '20'

jobs:
  migrate:
    name: Run Database Migration
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Create backup before migration
        run: |
          wrangler d1 backups create spreadsheetmoment-${{ inputs.environment }} \
            --env ${{ inputs.environment }}

      - name: Run migration
        run: |
          wrangler d1 execute spreadsheetmoment-${{ inputs.environment }} \
            --env ${{ inputs.environment }} \
            --file=deployment/cloudflare/migrations/${{ inputs.migration }}

      - name: Verify migration
        run: |
          wrangler d1 execute spreadsheetmoment-${{ inputs.environment }} \
            --env ${{ inputs.environment }} \
            --command="SELECT name FROM sqlite_master WHERE type='table';"

      - name: Notify migration complete
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Database migration complete!
            Environment: ${{ inputs.environment }}
            Migration: ${{ inputs.migration }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Migration failed. Please restore from backup manually."
          exit 1
```

### 3. Scheduled Maintenance Workflow

**.github/workflows/maintenance.yml:**

```yaml
name: Scheduled Maintenance

on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM UTC
  workflow_dispatch:

jobs:
  cleanup:
    name: Database Cleanup
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Clean up old logs
        run: |
          wrangler d1 execute spreadsheetmoment-prod --command="
            DELETE FROM usage_logs WHERE created_at < datetime('now', '-90 days');
          "

      - name: Clean up old hardware readings
        run: |
          wrangler d1 execute spreadsheetmoment-prod --command="
            DELETE FROM hardware_data WHERE timestamp < datetime('now', '-30 days');
          "

      - name: Archive old data to R2
        run: |
          # Export old data to R2 for long-term storage
          node scripts/archive-old-data.js

      - name: Vacuum database
        run: |
          wrangler d1 execute spreadsheetmoment-prod --command="VACUUM;"

  backups:
    name: Create Backups
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Create D1 backups
        run: |
          wrangler d1 backups create spreadsheetmoment-prod
          wrangler d1 backups create spreadsheetmoment-staging

      - name: Backup R2 to Glacier
        run: |
          # Archive R2 data to cold storage
          node scripts/r2-to-glacier.js

      - name: Verify backups
        run: |
          node scripts/verify-backups.js
```

---

## Terraform Configuration

### Main Terraform Configuration

**terraform/main.tf:**

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.20"
    }
  }

  backend "s3" {
    bucket         = "spreadsheetmoment-terraform-state"
    key            = "cloudflare/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "spreadsheetmoment-terraform-locks"
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Variables
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "domain" {
  type    = string
  default = "spreadsheetmoment.com"
}

variable "environment" {
  type    = string
  default = "production"
}

# Cloudflare Account
data "cloudflare_accounts" "current" {}

# D1 Databases
resource "cloudflare_d1_database" "main" {
  account_id = var.account_id
  name       = "spreadsheetmoment-${var.environment}"
}

resource "cloudflare_d1_database" "backups" {
  account_id = var.account_id
  name       = "spreadsheetmoment-${var.environment}-backups"
}

# R2 Buckets
resource "cloudflare_r2_bucket" "main" {
  account_id = var.account_id
  name       = "spreadsheetmoment-${var.environment}"
  location   = "auto"
}

resource "cloudflare_r2_bucket" "backups" {
  account_id = var.account_id
  name       = "spreadsheetmoment-${var.environment}-backups"
  location   = "auto"
}

# KV Namespaces
resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.account_id
  title      = "spreadsheetmoment-${var.environment}-cache"
}

resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.account_id
  title      = "spreadsheetmoment-${var.environment}-sessions"
}

# Vectorize Indexes
resource "cloudflare_vectorize_index" "cells" {
  account_id   = var.account_id
  name         = "spreadsheetmoment-cells"
  dimension    = 1536
  metric       = "cosine"
  metadata_json = jsonencode({
    workspace_id = "string"
    cell_type    = "string"
    temperature  = "number"
  })
}

resource "cloudflare_vectorize_index" "queries" {
  account_id   = var.account_id
  name         = "spreadsheetmoment-queries"
  dimension    = 1536
  metric       = "cosine"
  metadata_json = jsonencode({
    user_id      = "string"
    workspace_id = "string"
    query_type   = "string"
  })
}

# Workers Queue
resource "cloudflare_queue" "analytics" {
  account_id = var.account_id
  name       = "spreadsheetmoment-analytics-${var.environment}"
}

resource "cloudflare_queue" "backups" {
  account_id = var.account_id
  name       = "spreadsheetmoment-backups-${var.environment}"
}

# Workers Script
resource "cloudflare_worker_script" "main" {
  account_id    = var.account_id
  name          = "spreadsheetmoment-${var.environment}"
  content       = file("${path.module}/../dist/worker.js")
  compatibility_date = "2024-01-01"

  # Bindings
  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.main.id
  }

  r2_bucket_binding {
    name    = "R2"
    bucket_id = cloudflare_r2_bucket.main.id
  }

  kv_namespace_binding {
    name         = "KV"
    namespace_id = cloudflare_workers_kv_namespace.cache.id
  }

  vectorize_index_binding {
    name       = "VECTORS"
    index_name = cloudflare_vectorize_index.cells.name
  }

  queue_binding {
    name = "ANALYTICS_QUEUE"
    queue_id = cloudflare_queue.analytics.id
  }

  # Environment variables
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  secret_text_binding {
    name = "OPENAI_API_KEY"
    text = var.openai_api_key
  }

  secret_text_binding {
    name = "JWT_SECRET"
    text = var.jwt_secret
  }
}

# Custom Domains
resource "cloudflare_workers_custom_domain" "api" {
  account_id = var.account_id
  worker_id  = cloudflare_worker_script.main.id
  hostname   = "api.${var.domain}"
  zone_id    = data.cloudflare_zone.main.id
}

# DNS Records
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api"
  value   = cloudflare_workers_custom_domain.api.hostname
  type    = "CNAME"
  proxied = true
}

data "cloudflare_zone" "main" {
  name = var.domain
}

# Access (Zero Trust) Application
resource "cloudflare_access_application" "api" {
  account_id     = var.account_id
  name           = "SpreadsheetMoment API (${var.environment})"
  type           = "self_hosted"
  domain         = "api.${var.domain}"

  session_duration = "24h"

  # Allow all authenticated users
  policy {
    name           = "Allow All Users"
    decision       = "allow"

    include {
      email_domain = ["*"]
    }
  }
}

# Access Policy - GitHub OAuth
resource "cloudflare_access_identity_provider" "github" {
  account_id = var.account_id
  name       = "GitHub"
  type       = "github"
  config {
    client_id     = var.github_client_id
    client_secret = var.github_client_secret
  }
}

# Access Policy - Google OAuth
resource "cloudflare_access_identity_provider" "google" {
  account_id = var.account_id
  name       = "Google"
  type       = "google"
  config {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
  }
}

# Analytics Engine
resource "cloudflare_workers_analytics_engine" "main" {
  account_id = var.account_id
  name       = "spreadsheetmoment-${var.environment}"
}

# Page Rules (Caching)
resource "cloudflare_page_rule" "cache_api" {
  zone_id = data.cloudflare_zone.main.id
  target  = "api.${var.domain}/api/v1/*"

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 60
  }
}

# WAF Rules
resource "cloudflare_firewall_rule" "block_sqli" {
  zone_id = data.cloudflare_zone.main.id
  description = "Block SQL injection"
  filter {
    expression = "(http.request.uri.path contains \"SELECT\" || http.request.uri.path contains \"DROP\" || http.request.uri.path contains \"INSERT\")"
  }
  action = "block"
}

# SSL Configuration
resource "cloudflare_zone_settings_override" "main" {
  zone_id = data.cloudflare_zone.main.id

  settings {
    ssl {
      value = "strict"
    }

    always_online {
      value = "on"
    }

    automatic_https_rewrites {
      value = "on"
    }
  }
}

# Outputs
output "api_url" {
  value = "https://api.${var.domain}"
}

output "worker_url" {
  value = cloudflare_worker_script.main.url
}

output "database_id" {
  value     = cloudflare_d1_database.main.id
  sensitive = true
}

output "bucket_name" {
  value = cloudflare_r2_bucket.main.name
}
```

### Terraform Variables

**terraform/terraform.tfvars:**

```hcl
# Account
account_id         = "your-cloudflare-account-id"
cloudflare_api_token = "your-api-token"

# Domain
domain             = "spreadsheetmoment.com"
environment        = "production"

# API Keys
openai_api_key     = "sk-..."
jwt_secret         = "your-jwt-secret"
superinstance_api_key = "your-superinstance-key"

# OAuth
github_client_id   = "your-github-client-id"
github_client_secret = "your-github-client-secret"
google_client_id   = "your-google-client-id"
google_client_secret = "your-google-client-secret"
```

---

## Monitoring and Observability

### Prometheus Metrics

**workers/metrics.ts:**

```typescript
export class MetricsCollector {
  private metrics: Map<string, number> = new Map()

  async recordRequest(
    method: string,
    endpoint: string,
    status: number,
    latency: number
  ): Promise<void> {
    // Increment request counter
    this.increment(`requests_total{method="${method}",endpoint="${endpoint}",status="${status}"}`)

    // Record latency
    this.histogram(`request_duration_ms{method="${method}",endpoint="${endpoint}"}`, latency)

    // Send to Cloudflare Analytics Engine
    await this.env.ANALYTICS.writeDataPoint({
      blobs: [method, endpoint],
      doubles: [latency],
      indexes: [status]
    })
  }

  async recordError(error: Error, context: any): Promise<void> {
    this.increment(`errors_total{type="${error.name}",message="${error.message}"}`)

    // Send to error tracking service
    await this.sendToErrorTracking(error, context)
  }

  async recordCellUpdate(workspaceId: string, latency: number): Promise<void> {
    this.histogram(`cell_update_duration_ms{workspace="${workspaceId}"}`, latency)
  }

  async recordNLPQuery(queryType: string, latency: number, tokens: number): Promise<void> {
    this.histogram(`nlp_query_duration_ms{type="${queryType}"}`, latency)
    this.histogram(`nlp_query_tokens{type="${queryType}"}`, tokens)
  }

  private increment(metric: string): void {
    const value = this.metrics.get(metric) || 0
    this.metrics.set(metric, value + 1)
  }

  private histogram(metric: string, value: number): void {
    // Track histogram buckets
    const buckets = [1, 5, 10, 50, 100, 500, 1000, 5000]
    for (const bucket of buckets) {
      if (value <= bucket) {
        this.increment(`${metric}_le_${bucket}`)
      }
    }
    this.increment(`${metric}_le_Inf`)
  }
}
```

### Grafana Dashboard

**monitoring/grafana-dashboard.json:**

```json
{
  "dashboard": {
    "title": "SpreadsheetMoment - Cloudflare Workers",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(requests_total[5m])) by (endpoint)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "P95 Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(request_duration_ms_bucket[5m])) by (endpoint, le))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(errors_total[5m])) by (type)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Durable Objects",
        "targets": [
          {
            "expr": "count(durable_object_active)"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Database Query Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(d1_query_duration_ms_bucket[5m])) by (operation, le))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "NLP Query Performance",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(nlp_query_duration_ms_bucket[5m])) by (type, le))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Cell Update Throughput",
        "targets": [
          {
            "expr": "sum(rate(cell_update_total[1m]))"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

---

## Testing Strategy

### Unit Tests

**tests/unit/cell-engine.test.ts:**

```typescript
import { describe, it, expect } from 'vitest'
import { CellEngine } from '@/workers/cell-engine'

describe('CellEngine', () => {
  it('should calculate temperature correctly', async () => {
    const engine = new CellEngine()
    const cell = {
      id: 'test-cell',
      value: 42,
      temperature: 0.5,
      access_count: 10
    }

    const newTemp = await engine.calculateTemperature(cell, { access_count: 11 })
    expect(newTemp).toBeGreaterThan(0.5)
  })

  it('should propagate heat to connected cells', async () => {
    const engine = new CellEngine()
    await engine.propagateHeat('source-cell', 1.0, ['cell-1', 'cell-2'])

    const cell1 = await engine.getCell('cell-1')
    const cell2 = await engine.getCell('cell-2')

    expect(cell1.temperature).toBeGreaterThan(0)
    expect(cell2.temperature).toBeGreaterThan(0)
  })
})
```

### Integration Tests

**tests/integration/api.test.ts:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { Worker } from '@/index'

describe('API Integration Tests', () => {
  let worker: Worker

  beforeAll(async () => {
    worker = new Worker(env)
  })

  it('should create a workspace', async () => {
    const response = await worker.fetch(new Request('http://localhost/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Workspace' })
    }))

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.name).toBe('Test Workspace')
    expect(data.id).toBeDefined()
  })

  it('should create a cell in workspace', async () => {
    const workspace = await createWorkspace(worker)

    const response = await worker.fetch(new Request(
      `http://localhost/api/v1/workspaces/${workspace.id}/cells`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A1',
          value: 42,
          type: 'number'
        })
      }
    ))

    expect(response.status).toBe(201)
  })

  it('should process NLP query', async () => {
    const response = await worker.fetch(new Request('http://localhost/api/v1/nlp/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Show me all cells with value greater than 40'
      })
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.results).toBeDefined()
  })
})
```

### E2E Tests

**tests/e2e/workflow.spec.ts:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('SpreadsheetMoment E2E', () => {
  test('complete workflow: create workspace, add cells, run NLP query', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000')

    // Create workspace
    await page.click('[data-testid="create-workspace-btn"]')
    await page.fill('[data-testid="workspace-name-input"]', 'Test Workspace')
    await page.click('[data-testid="save-workspace-btn"]')

    // Wait for workspace creation
    await expect(page.locator('[data-testid="workspace-title"]')).toHaveText('Test Workspace')

    // Add cell
    await page.click('[data-testid="add-cell-btn"]')
    await page.fill('[data-testid="cell-name-input"]', 'A1')
    await page.fill('[data-testid="cell-value-input"]', '42')
    await page.click('[data-testid="save-cell-btn"]')

    // Verify cell created
    await expect(page.locator('[data-testid="cell-A1"]')).toBeVisible()

    // Run NLP query
    await page.click('[data-testid="nlp-query-btn"]')
    await page.fill('[data-testid="nlp-input"]', 'What is the value of A1?')
    await page.click('[data-testid="submit-nlp-btn"]')

    // Verify NLP response
    await expect(page.locator('[data-testid="nlp-response"]')).toContainText('42')
  })

  test('real-time collaboration', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Navigate both to same workspace
    await page1.goto('http://localhost:3000/workspace/test-workspace')
    await page2.goto('http://localhost:3000/workspace/test-workspace')

    // Update cell on page1
    await page1.fill('[data-testid="cell-A1"]', '100')

    // Verify update appears on page2
    await expect(page2.locator('[data-testid="cell-A1"]')).toHaveValue('100')
  })
})
```

---

## Rollback Procedures

### Automated Rollback

**scripts/rollback.sh:**

```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-"production"}
VERSION=${2:-"previous"}

echo "Rolling back $ENVIRONMENT to $VERSION"

# Get current deployment info
CURRENT_VERSION=$(wrangler deployments list --env $ENVIRONMENT | head -n 1 | awk '{print $1}')
echo "Current version: $CURRENT_VERSION"

# Rollback to previous version
wrangler rollback --env $ENVIRONMENT

# Verify rollback
NEW_VERSION=$(wrangler deployments list --env $ENVIRONMENT | head -n 1 | awk '{print $1}')
echo "New version: $NEW_VERSION"

# Run smoke tests
npm run test:smoke -- --environment=$ENVIRONMENT

# Notify team
curl -X POST $SLACK_WEBHOOK -d "{
  \"text\": \"Rollback complete: $CURRENT_VERSION → $NEW_VERSION\",
  \"username\": \"Deploy Bot\",
  \"icon_emoji\": \":warning:\"
}"

echo "Rollback complete!"
```

### Database Rollback

**scripts/rollback-db.sh:**

```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-"production"}
BACKUP_ID=${2:-""}

if [ -z "$BACKUP_ID" ]; then
  echo "Usage: ./rollback-db.sh <environment> <backup_id>"
  echo ""
  echo "Available backups:"
  wrangler d1 backups list spreadsheetmoment-$ENVIRONMENT --env $ENVIRONMENT
  exit 1
fi

echo "Rolling back database to backup: $BACKUP_ID"

# Confirm
read -p "Are you sure? This cannot be undone. (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 1
fi

# Restore backup
wrangler d1 backups restore spreadsheetmoment-$ENVIRONMENT \
  --env $ENVIRONMENT \
  $BACKUP_ID

echo "Database rollback complete!"
```

---

## Next Steps

1. Set up GitHub repository secrets
2. Configure Terraform backend
3. Set up monitoring dashboards
4. Configure alerting rules
5. Document runbooks
6. Train team on procedures
7. Test rollback procedures
8. Set up disaster recovery

---

**Document Version:** 1.0
**Last Updated:** 2026-03-14
**Maintained By:** SpreadsheetMoment DevOps Team
