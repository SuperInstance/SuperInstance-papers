# POLLN Secrets Management

This directory contains documentation and examples for managing secrets in POLLN deployments.

## Overview

POLLN requires several secrets for production deployment:

- JWT authentication secret
- Database credentials
- Redis authentication
- API keys for external services (OpenAI, Anthropic, etc.)

## Kubernetes Secrets

### Generate Secrets

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 16)

# Generate Redis password
REDIS_PASSWORD=$(openssl rand -base64 16)

# Create Kubernetes secret
kubectl create secret generic polln-secret \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=database-url="postgresql://polln:$DB_PASSWORD@polln-postgres:5432/polln" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  -n polln-prod
```

### Update Secrets

```bash
# Update existing secret
kubectl patch secret polln-secret \
  --from-literal=jwt-secret="$NEW_JWT_SECRET" \
  -n polln-prod
```

### Rotate Secrets

```bash
# Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Update deployment
kubectl set env deployment/polln-api \
  -n polln-prod \
  POLLN_AUTH_JWT_SECRET="$NEW_JWT_SECRET"

# Rollout restart
kubectl rollout restart deployment/polln-api -n polln-prod
```

## AWS Secrets Manager (Production)

For production deployments on AWS, use AWS Secrets Manager:

```bash
# Store secret
aws secretsmanager create-secret \
  --name polln/prod \
  --secret-string '{
    "jwt_secret": "your-secret",
    "database_url": "postgresql://...",
    "redis_password": "your-redis-password"
  }'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id polln/prod \
  --query SecretString \
  --output text
```

## Environment Variables

For development, use environment variables:

```bash
# Load from .env file
cp .env.example .env
# Edit .env with your values

# Source in shell
export $(cat .env | grep -v '^#' | xargs)
```

## Best Practices

1. **Never commit secrets to version control**
   - Use `.gitignore` to exclude `.env` files
   - Use secrets management tools

2. **Rotate secrets regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 60 days
   - API keys: Follow provider recommendations

3. **Use different secrets per environment**
   - Development, staging, and production should have different secrets

4. **Limit secret access**
   - Use RBAC to control who can access secrets
   - Audit secret access logs

5. **Encrypt secrets at rest**
   - Kubernetes secrets are etcd encrypted
   - AWS Secrets Manager provides encryption by default

## Secret Templates

### Development (.env.development)
```bash
POLLN_AUTH_ENABLED=false
POLLN_RATE_LIMIT_RPM=100
DATABASE_URL=postgresql://polln:dev_password@localhost:5432/polln_dev
REDIS_URL=redis://localhost:6379
```

### Production (.env.production)
```bash
POLLN_AUTH_ENABLED=true
POLLN_AUTH_JWT_SECRET=CHANGE_THIS
POLLN_RATE_LIMIT_RPM=1000
DATABASE_URL=postgresql://polln:CHANGE_THIS@polln-postgres:5432/polln
REDIS_URL=redis://:CHANGE_THIS@polln-redis:6379
```

## Monitoring Secret Access

Enable Kubernetes audit logging to track secret access:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Request
  verbs: ["get", "list"]
  resources:
  - group: ""
    resources: ["secrets"]
```
