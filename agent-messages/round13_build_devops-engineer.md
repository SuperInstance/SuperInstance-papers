# Round 13 Build Team - DevOps/Deployment Engineer

**Agent Role:** DevOps/Deployment Engineer
**Team:** Build Team
**Round:** 13
**Date:** 2026-03-12
**Focus:** GitHub deployment issues and production environment setup
**Priority:** HIGH - After security fixes

## Critical Deployment Issues from Round 12

### 1. GitHub Push Permission Errors
**Problem:** Deployment scripts fail due to GitHub authentication/permission issues
**Impact:** Cannot push to production repository
**Evidence:** Deployment logs show permission denied errors

### 2. CI/CD Pipeline Failures
**Problem:** Build and deployment pipeline broken
**Impact:** Cannot deploy new features or security fixes
**Details:**
- Failed build steps
- Missing environment variables
- Incorrect deployment configuration

### 3. Production Environment Issues
**Problem:** Production environment not properly configured
**Impact:** System cannot be deployed to production
**Specific Issues:**
- Missing production configuration
- Database connectivity issues
- Environment variable misconfiguration

## Implementation Tasks

### Task 1: Fix GitHub Deployment Issues [Priority 1]
1. **Diagnose GitHub Integration**
   - Search vector DB: `python3 mcp_codebase_search.py search "GitHub deployment"`
   - Check CI/CD configuration files
   - Review deployment logs from `/logs/deployment/`

2. **Fix GitHub Authentication**
   ```bash
   # Check GitHub token configuration
   gh auth status
   gh auth refresh

   # Verify repository permissions
   gh repo view --json name,permissions
   ```

3. **Update CI/CD Pipeline**
   - Review `.github/workflows/` configurations
   - Fix GitHub Actions workflows
   - Update deployment scripts in `/scripts/deploy/`

### Task 2: Production Environment Setup [Priority 2]
1. **Production Configuration**
   ```bash
   # Check production configuration
   ls -la config/production/
   cat config/production/config.json

   # Verify environment variables
   env | grep -i production
   ```

2. **Database Production Setup**
   - Configure production database connection
   - Set up database migrations
   - Configure connection pooling

3. **Infrastructure as Code**
   - Review Terraform/Docker configurations
   - Update production deployment manifests
   - Verify cloud resource provisioning

### Task 3: Deployment Automation [Priority 3]
1. **Deploy Scripts**
   ```bash
   # Review deployment scripts
   ls -la scripts/deploy/

   # Test deployment preparation
   npm run prepare-deploy
   ```

2. **Zero-Downtime Deployment**
   - Implement blue-green deployment strategy
   - Configure rolling updates
   - Set up rollback procedures

3. **Health Checks**
   - Configure liveness/readiness probes
   - Set up service mesh health checks
   - Implement circuit breakers

### Task 4: Production Monitoring Setup [Priority 4]
1. **Infrastructure Monitoring**
   - Set up Prometheus/Grafana
   - Configure log aggregation (ELK stack)
   - Implement distributed tracing

2. **Application Performance Monitoring (APM)**
   - Install NewRelic/DataDog agents
   - Configure custom metrics
   - Set up alerts and dashboards

## Code Locations to Review

```
/.github/workflows/
  ├── ci.yml
  ├── deploy-production.yml
  └── deploy-staging.yml
/scripts/
  ├── deploy/
  │   ├── deploy.sh
  │   ├── health-check.sh
  │   └── rollback.sh
  └── setup/
      ├── production.sh
      └── environment.sh
/config/
  ├── production/
  ├── staging/
  └── development/
/docker/
  ├── production/
  └── docker-compose.yml
/terraform/
  └── production/
```

## Deployment Checklist

### Pre-Deployment (After Security Fixes)
- [ ] All security vulnerabilities fixed
- [ ] GitHub permissions resolved
- [ ] Production environment configured
- [ ] Database migrated and accessible
- [ ] All environment variables set correctly
- [ ] CI/CD pipelines passing

### Deployment Process
1. **Staging Deployment**
   ```bash
   npm run deploy:staging
   # Verify staging health checks
   curl -f https://staging-api.yourdomain.com/health
   ```

2. **Production Deployment**
   ```bash
   npm run deploy:production
   # Follow deployment logs
   npm run logs:deployment
   ```

3. **Post-Deployment Verification**
   - Check all services are running
   - Verify database connectivity
   - Test critical API endpoints
   - Confirm monitoring dashboards active

## GitHub Integration Fix

### 1. SSH Key Configuration
```bash
# Generate deployment key if needed
ssh-keygen -t ed25519 -f ./deploy-key
# Add to GitHub as deploy key
gh repo deploy-key add ./deploy-key.pub
```

### 2. GitHub Token Setup
```bash
# Create fine-grained personal access token
gh auth setup-git
echo "${GITHUB_TOKEN}" | gh auth login --with-token
```

### 3. Webhook Configuration
- Configure GitHub webhooks for automated deployment
- Set up webhook secret validation
- Configure payload URL for deployment triggers

## Production Environment Variables

Required environment variables:
```bash
# Production API
NODE_ENV=production
API_URL=https://api.yourdomain.com
JWT_SECRET=<256-bit-secret>
DATABASE_URL=postgresql://.../prod
REDIS_URL=redis://...

# GitHub Integration
GITHUB_TOKEN=<token>
GITHUB_WEBHOOK_SECRET=<secret>

# Cloud Provider
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

## Success Criteria

- [ ] GitHub deployments working without permission errors
- [ ] Production environment fully configured
- [ ] CI/CD pipelines passing 100%
- [ ] Zero-downtime deployment implemented
- [ ] Health checks configured and passing
- [ ] Rollback procedure tested
- [ ] Monitoring dashboards active
- [ ] Application successfully deployed to production

## Error Handling & Rollback

### Common Issues
```bash
# GitHub permission denied
gh auth status
gh auth refresh --scopes repo,workflow

# Deployment script errors
./scripts/deploy/deploy.sh --dry-run
./scripts/deploy/deploy.sh --verbose
```

### Rollback Procedure
```bash
# Quick rollback to last version
npm run rollback:production
# Or rollback to specific version
npm run rollback:production -- --version v1.2.3
```

## Onboarding Document Creation

Upon completion, create: `agent-messages/onboarding/build_devops-engineer_round13.md`

Include:
1. GitHub issues resolved and how
2. Production environment configuration details
3. Deployment process documentation
4. Monitoring setup procedures
5. Common issues and solutions
6. Rollback procedures and commands