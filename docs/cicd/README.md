# POLLN CI/CD Documentation

Complete CI/CD pipeline configuration for POLLN spreadsheets with GitHub Actions, Docker, Kubernetes, and Terraform.

## Overview

The POLLN CI/CD pipeline provides:

- **Automated Testing**: Unit, integration, and spreadsheet tests with 90%+ coverage requirement
- **Pull Request Validation**: Coverage checks, bundle size limits, breaking change detection
- **Automated Releases**: Docker image builds, npm publishing, GitHub releases
- **Multi-Environment Deployment**: Staging (automatic) and Production (manual approval)
- **Blue-Green Deployments**: Zero-downtime production deployments with rollback
- **Infrastructure as Code**: Terraform for AWS resources (EKS, RDS, ElastiCache)
- **Monitoring**: Prometheus, Grafana, Jaeger integration

## Directory Structure

```
.github/
  workflows/
    ci.yml                    # Main CI pipeline
    pr.yml                    # Pull request validation
    release.yml               # Automated releases
    deploy-staging.yml        # Staging deployment
    deploy-production.yml     # Production deployment (blue-green)
  labeler.yml                # Automatic PR labeling

scripts/
  build.sh                   # Production build script
  test.sh                    # Test runner with coverage
  deploy.sh                  # Deployment orchestration
  smoke-test.sh              # Post-deployment validation

kubernetes/
  deployment.yaml            # Deployment, Service, HPA, PDB
  configmap.yaml             # Environment configuration

terraform/
  main.tf                    # Infrastructure configuration
  variables.tf               # Infrastructure variables

Dockerfile                   # Multi-stage build
docker-compose.yml           # Local development stack
```

## Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request:

```yaml
Jobs:
  - lint                     # ESLint and Prettier
  - type-check               # TypeScript compilation
  - test                     # Unit tests (sharded)
  - integration-test         # Integration tests with services
  - api-test                 # API endpoint tests
  - security                 # Security scanning
  - build                    # Production build
  - docker-build             # Docker image build
  - performance              # Performance benchmarks
```

**Triggers**: Push to main/develop, Pull requests

**Artifacts**: Build dist/, coverage reports, Docker images

### PR Validation (`.github/workflows/pr.yml`)

Validates pull requests:

```yaml
Checks:
  - Semantic PR title        # Conventional commits
  - PR description quality   # Minimum length
  - License headers          # MIT in source files
  - Coverage thresholds      # 90% minimum
  - Bundle size limits       # 50MB maximum
  - Breaking changes         # API surface diff
  - Dependency review        # Vulnerability scanning
  - Code quality             # Complexity, duplication
```

**Actions**: Comments PR with coverage report, bundle size, and breaking changes.

### Release Pipeline (`.github/workflows/release.yml`)

Automated release on version tag:

```yaml
Jobs:
  - validate                 # Version format validation
  - test                     # Full test suite
  - build                    # Production build
  - docker                   # Multi-platform image
  - npm-publish              # Publish to npm
  - github-release           # Create GitHub release
  - changelog                # Update CHANGELOG.md
  - smoke-test               # Post-release validation
  - notify                   # Slack notification
```

**Triggers**: Git tag `v*.*.*`, Manual workflow dispatch

**Artifacts**: Docker image, npm package, GitHub release, changelog

### Staging Deployment (`.github/workflows/deploy-staging.yml`)

Automatic deployment on merge to main:

```yaml
Jobs:
  - pre-deploy               # Safety checks
  - build                    # Build artifacts
  - docker-build             # Build and push image
  - migrate                  # Database migrations
  - deploy-k8s               # Kubernetes deployment
  - smoke-test               # Health checks
  - integration-test         # Full integration tests
  - rollback                 # Automatic on failure
```

**Triggers**: Push to main branch

**Environment**: `https://staging.polln.ai`

### Production Deployment (`.github/workflows/deploy-production.yml`)

Manual production deployment with blue-green strategy:

```yaml
Jobs:
  - validate                 # Version and approval checks
  - build                    # Production image
  - deploy-blue-green        # Deploy to new color
  - health-check             # Pre-traffic validation
  - migrate                  # Database migrations
  - switch-traffic           # Route to new deployment
  - post-deploy-validation   # Smoke and integration tests
  - rollback                 # Automatic rollback on failure
  - cleanup                  # Scale down old deployment
  - dr-replicate             # Replicate to DR region
```

**Triggers**: Manual workflow dispatch with `--force` flag

**Environment**: `https://polln.ai`

## Scripts

### Build Script (`scripts/build.sh`)

Optimized production build:

```bash
# Full production build
./scripts/build.sh

# Development build with watch
./scripts/build.sh --watch

# Build with source maps
./scripts/build.sh --source-map

# Bundle analysis
./scripts/build.sh --analyze

# Clean build
./scripts/build.sh --clean
```

**Features**:
- TypeScript compilation
- Asset optimization (minification, compression)
- Source map generation
- Bundle size checking (50MB limit)
- Asset manifest with hashes

### Test Script (`scripts/test.sh`)

Run all tests with coverage:

```bash
# Run all tests
./scripts/test.sh

# Unit tests only
./scripts/test.sh --unit

# Integration tests only
./scripts/test.sh --integration

# Spreadsheet tests only
./scripts/test.sh --spreadsheet

# Without coverage
./scripts/test.sh --no-coverage

# Watch mode
./scripts/test.sh --watch

# Sharded execution (CI)
./scripts/test.sh --shard 1/4
```

**Coverage Thresholds**:
- Lines: 90%
- Branches: 90%
- Functions: 90%
- Statements: 90%

### Deploy Script (`scripts/deploy.sh`)

Deployment orchestration:

```bash
# Deploy to staging
./scripts/deploy.sh --staging

# Deploy to production (requires --force)
./scripts/deploy.sh --production --force

# Deploy specific version
./scripts/deploy.sh --production --version v1.2.3 --force

# Dry run
./scripts/deploy.sh --staging --dry-run

# Skip smoke tests
./scripts/deploy.sh --staging --skip-tests
```

**Features**:
- Pre-deployment validation
- Health check after deployment
- Automatic rollback on failure
- Slack notifications

### Smoke Test Script (`scripts/smoke-test.sh`)

Post-deployment validation:

```bash
# Test staging
./scripts/smoke-test.sh --env staging

# Test production
./scripts/smoke-test.sh --env production --api-key $API_KEY

# Test custom URL
./scripts/smoke-test.sh --url https://polln.ai

# Verbose output
./scripts/smoke-test.sh --staging --verbose
```

**Tests**:
- Health endpoint
- Status endpoint
- WebSocket connection
- API authentication
- Colony creation
- Spreadsheet operations
- Performance benchmarks
- Concurrent requests
- Error handling
- Rate limiting

## Docker

### Multi-Stage Build

```dockerfile
Stages:
  1. builder     - Compile TypeScript
  2. production  - Optimized runtime image
  3. development - Development image
  4. test        - Test execution
```

### Build Commands

```bash
# Production image
docker build -t polln/polln:latest .

# Development image
docker build --target development -t polln/polln:dev .

# Test image
docker build --target test -t polln/polln:test .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t polln/polln:latest .
```

### Docker Compose

Local development stack:

```bash
# Start all services
docker-compose up -d

# Start with monitoring tools
docker-compose --profile monitoring up -d

# Start with database tools
docker-compose --profile tools up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop with volumes
docker-compose down -v
```

**Services**:
- `api` - POLLN API server (port 3000)
- `postgres` - PostgreSQL database (port 5432)
- `redis` - Redis cache (port 6379)
- `grafana` - Monitoring dashboards (port 3001)
- `prometheus` - Metrics collection (port 9090)
- `jaeger` - Distributed tracing (port 16686)
- `pgadmin` - Database management (port 5050)
- `redis-commander` - Redis management (port 8081)
- `mailhog` - Email testing (port 8025)

## Kubernetes

### Deployment Manifests

```bash
# Apply all manifests
kubectl apply -f kubernetes/

# Apply to specific namespace
kubectl apply -f kubernetes/deployment.yaml -n polln-production

# Watch rollout
kubectl rollout status deployment/polln-api -n polln-production

# Check pods
kubectl get pods -n polln-production

# Check logs
kubectl logs -f deployment/polln-api -n polln-production
```

### Key Resources

**Deployment**:
- 3 replicas (production)
- Rolling update strategy
- Resource limits: 512Mi, 500m CPU
- Health checks: liveness, readiness, startup

**Service**:
- ClusterIP type
- HTTP port: 3000
- Debug port: 9229

**Horizontal Pod Autoscaler**:
- Min replicas: 3
- Max replicas: 10
- Target CPU: 70%
- Target memory: 80%

**PodDisruptionBudget**:
- Min available: 2

**Ingress**:
- ALB with SSL/TLS
- Health check: /health
- HTTPS redirect

**ConfigMap**:
- Environment-specific configuration
- Feature flags
- Rate limiting
- Cache settings

## Terraform

### Infrastructure as Code

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan infrastructure
terraform plan -var="environment=production"

# Apply infrastructure
terraform apply -var="environment=production" -auto-approve

# Destroy infrastructure
terraform destroy -var="environment=production"
```

### AWS Resources

**VPC**:
- CIDR: 10.0.0.0/16
- 3 AZs with public/private/database subnets
- NAT gateways
- Flow logs enabled

**EKS Cluster**:
- Kubernetes 1.27
- Managed node groups
- IRSA enabled
- Cluster autoscaler

**RDS PostgreSQL**:
- Multi-AZ (production)
- Encryption at rest
- Automated backups
- Performance insights

**ElastiCache Redis**:
- Cluster mode enabled
- Encryption in transit/at rest
- Automatic failover
- Multi-AZ (production)

**ALB**:
- SSL/TLS termination
- Health checks
- WAF integration

**S3**:
- Assets bucket with versioning
- Logs bucket
- Backups bucket with lifecycle

**Route53**:
- Hosted zone
- Alias records to ALB

**ACM**:
- SSL/TLS certificates
- Auto-renewal

## PR Labels

Automatic PR labeling based on changed files:

### Language Labels
- `lang:typescript` - TypeScript files
- `lang:javascript` - JavaScript files
- `lang:python` - Python files
- `lang:yaml` - YAML files
- `lang:shell` - Shell scripts
- `lang:docker` - Docker files
- `lang:markdown` - Markdown files

### Area Labels
- `area:spreadsheet` - Spreadsheet components
- `area:api` - API endpoints
- `area:cli` - CLI tools
- `area:agents` - Agent logic
- `area:colony` - Colony management
- `area:learning` - Learning components
- `area:tests` - Test files
- `area:documentation` - Documentation
- `area:infrastructure` - CI/CD and infrastructure

### Size Labels
- `size:xs` - < 5 files, < 20 additions/deletions
- `size:s` - < 10 files, < 100 additions/deletions
- `size:m` - < 30 files, < 500 additions/deletions
- `size:l` - < 100 files, < 2000 additions/deletions
- `size:xl` - > 100 files or > 2000 additions/deletions

### Impact Labels
- `impact:high` - Core changes (index.ts, package.json)
- `impact:medium` - Multiple file changes
- `impact:low` - Documentation only

### Type Labels
- `type:feature` - New features
- `type:bug` - Bug fixes
- `type:refactor` - Code refactoring
- `type:docs` - Documentation changes
- `type:chore` - Maintenance tasks
- `type:test` - Test changes
- `type:perf` - Performance improvements

## Environment Variables

### Required Secrets

Configure these in GitHub repository settings:

```
# API Keys
DEEPSEEK_API_KEY          - DeepSeek AI API key
NPM_TOKEN                 - npm authentication token

# Docker
DOCKER_USERNAME           - Docker Hub username
DOCKER_PASSWORD           - Docker Hub password

# AWS
AWS_ACCESS_KEY_ID         - AWS access key
AWS_SECRET_ACCESS_KEY     - AWS secret key
AWS_DR_ACCESS_KEY_ID      - AWS DR access key
AWS_DR_SECRET_ACCESS_KEY  - AWS DR secret key

# Kubernetes
KUBE_CONFIG_PROD          - Production kubeconfig (base64)
KUBE_CONFIG_STAGING       - Staging kubeconfig (base64)

# Notifications
SLACK_WEBHOOK_URL         - Slack webhook for notifications
SLACK_WEBHOOK_CRITICAL    - Critical alerts webhook

# Security
SNYK_TOKEN                - Snyk security scanner token

# Database (optional, for local testing)
DATABASE_URL              - PostgreSQL connection string
REDIS_URL                 - Redis connection string
JWT_SECRET                - JWT signing secret
```

## Monitoring

### Metrics

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Tracing

- **Jaeger UI**: http://localhost:16686

### Health Checks

- **Staging**: https://staging.polln.ai/health
- **Production**: https://polln.ai/health

## Troubleshooting

### CI Failures

**Build fails**:
- Check Node version (20)
- Verify `npm ci` succeeds locally
- Check TypeScript compilation

**Tests fail**:
- Run tests locally: `npm test`
- Check test logs in GitHub Actions
- Verify test environment variables

**Coverage below 90%**:
- Run `npm run test:coverage`
- Check `coverage/index.html` for details
- Add tests for uncovered code

### Deployment Failures

**Staging deployment fails**:
- Check workflow logs
- Verify Docker image build
- Check Kubernetes pods: `kubectl get pods -n polln-staging`
- View pod logs: `kubectl logs -f deployment/polln-api -n polln-staging`

**Production deployment fails**:
- Manual approval required
- Check smoke test results
- Verify health checks pass
- Automatic rollback on failure

**Rollback needed**:
- Automatic rollback is built-in
- Manual rollback: `kubectl rollout undo deployment/polln-api -n polln-production`

### Docker Issues

**Build fails**:
- Check Docker daemon is running
- Verify Dockerfile syntax
- Check for base image issues

**Image too large**:
- Check bundle size: `du -sh dist/`
- Optimize dependencies: `npm prune --production`
- Use multi-stage builds

## Best Practices

1. **Always test locally before pushing**: Run `npm test` and `npm run build`
2. **Write descriptive PR titles**: Use conventional commits (feat:, fix:, docs:)
3. **Keep PRs focused**: One logical change per PR
4. **Review CI logs**: Check all workflow steps pass
5. **Monitor staging**: Verify staging deployment before production
6. **Test smoke tests**: Run smoke tests after deployment
7. **Monitor metrics**: Check Grafana dashboards regularly
8. **Update dependencies**: Keep dependencies up to date
9. **Security first**: Run security scans regularly
10. **Document changes**: Update CHANGELOG.md

## Contributing

When contributing to POLLN CI/CD:

1. Follow the existing workflow patterns
2. Add tests for new features
3. Update documentation
4. Use appropriate labels
5. Ensure coverage remains above 90%
6. Test in staging before production

## Support

For issues or questions:

- GitHub Issues: https://github.com/SuperInstance/polln/issues
- Slack: #polln-dev
- Email: team@polln.ai

---

**Last Updated**: 2026-03-09
**Version**: 1.0.0
