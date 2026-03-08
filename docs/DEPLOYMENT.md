# POLLN Deployment Guide

This guide covers deploying POLLN to production environments using Docker, Kubernetes, and Terraform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Terraform Infrastructure](#terraform-infrastructure)
7. [CI/CD Pipelines](#cicd-pipelines)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development environment
docker-compose up

# Run tests
npm test

# Access API at http://localhost:3000
```

### Production Deployment

```bash
# Build and push Docker image
docker build -t polln:latest .
docker tag polln:latest registry.example.com/polln:latest
docker push registry.example.com/polln:latest

# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=polln-api
```

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0
- **Docker**: >= 20.10.0
- **kubectl**: >= 1.28.0
- **Terraform**: >= 1.5.0
- **Helm**: >= 3.0.0 (optional)

### Required Services

- **Container Registry**: Docker Hub, ECR, GCR, or ACR
- **Kubernetes Cluster**: EKS, GKE, AKS, or self-hosted
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Object Storage**: S3, GCS, or Azure Blob
- **DNS Provider**: Route53, Cloud DNS, or similar

### Cloud Providers

POLLN supports deployment to:

- **AWS**: EKS + RDS + ElastiCache + S3
- **GCP**: GKE + Cloud SQL + Memorystore + GCS
- **Azure**: AKS + Database for PostgreSQL + Cache for Redis + Blob Storage

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Clean up volumes
docker-compose down -v
```

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API Server | http://localhost:3000 | None (dev mode) |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | None |
| Jaeger | http://localhost:16686 | None |

### Development Tools

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests in watch mode
npm run test:watch

# Generate API docs
npm run docs:api

# Build for production
npm run build
```

## Docker Deployment

### Build Image

```bash
# Production build
docker build -t polln:latest -f Dockerfile .

# Development build
docker build -t polln:dev -f Dockerfile.dev .
```

### Run Container

```bash
# Basic run
docker run -d \
  --name polln-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e POLLN_AUTH_JWT_SECRET=your-secret \
  polln:latest

# With volume mounts
docker run -d \
  --name polln-api \
  -p 3000:3000 \
  -v polln-data:/app/.polln \
  -v polln-agents:/app/.agents \
  -e NODE_ENV=production \
  polln:latest
```

### Push to Registry

```bash
# Docker Hub
docker tag polln:latest username/polln:latest
docker push username/polln:latest

# AWS ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker tag polln:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/polln:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/polln:latest

# Google GCR
docker tag polln:latest gcr.io/project-id/polln:latest
docker push gcr.io/project-id/polln:latest
```

### Docker Compose Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale API servers
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Deploy to Kubernetes

```bash
# Set namespace
export NAMESPACE=polln-prod
kubectl create namespace $NAMESPACE

# Update secrets
kubectl create secret generic polln-secret \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-password="$(openssl rand -base64 16)" \
  -n $NAMESPACE

# Apply manifests
kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
kubectl apply -f k8s/secret.yaml -n $NAMESPACE
kubectl apply -f k8s/deployment.yaml -n $NAMESPACE
kubectl apply -f k8s/service.yaml -n $NAMESPACE
kubectl apply -f k8s/ingress.yaml -n $NAMESPACE
kubectl apply -f k8s/hpa.yaml -n $NAMESPACE
kubectl apply -f k8s/pdb.yaml -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/polln-api -n $NAMESPACE
```

### Using Deployment Scripts

```bash
# Deploy to development
./scripts/deploy.sh --environment dev

# Deploy to production
./scripts/deploy.sh --environment production --timeout 600

# Dry run
./scripts/deploy.sh --environment staging --dry-run

# Health check
./scripts/health-check.sh --namespace polln-prod

# Rollback
./scripts/rollback.sh --namespace polln-prod
```

### Kubernetes Operations

```bash
# Get pods
kubectl get pods -l app=polln-api -n polln-prod

# Get logs
kubectl logs -f deployment/polln-api -n polln-prod

# Exec into pod
kubectl exec -it $(kubectl get pod -l app=polln-api -n polln-prod -o jsonpath='{.items[0].metadata.name}') -n polln-prod -- sh

# Scale deployment
kubectl scale deployment/polln-api --replicas=5 -n polln-prod

# Update image
kubectl set image deployment/polln-api polln-api=polln:v1.0.1 -n polln-prod

# Port forward
kubectl port-forward deployment/polln-api 3000:3000 -n polln-prod
```

## Terraform Infrastructure

### Initialize Terraform

```bash
cd terraform

# Initialize
terraform init

# Format configuration
terraform fmt

# Validate configuration
terraform validate
```

### Plan Deployment

```bash
# Plan for development
terraform plan -var-file=environments/dev.tfvars -out=tfplan

# Plan for production
terraform plan -var-file=environments/production.tfvars -out=tfplan

# Show plan details
terraform show tfplan
```

### Apply Infrastructure

```bash
# Apply development
terraform apply -var-file=environments/dev.tfvars

# Apply production
terraform apply -var-file=environments/production.tfvars

# Apply with auto-approve (use with caution)
terraform apply -var-file=environments/production.tfvars -auto-approve
```

### Manage Infrastructure

```bash
# Import existing resources
terraform import aws_vpc.main vpc-0123456789abcdef0

# Destroy infrastructure
terraform destroy -var-file=environments/dev.tfvars

# Refresh state
terraform refresh -var-file=environments/dev.tfvars

# Output values
terraform output -json
```

### AWS-Specific Deployment

```bash
# Configure AWS credentials
aws configure

# Set up EKS cluster
terraform apply -var-file=environments/production.tfvars -target=module.eks

# Configure kubectl
aws eks update-kubeconfig --name polln-prod-cluster --region us-east-1

# Deploy application
kubectl apply -f k8s/
```

## CI/CD Pipelines

### GitHub Actions

The following workflows are available:

- **CI**: Runs on every push and PR
  - Linting and type checking
  - Unit tests
  - Integration tests
  - Security scanning

- **Release**: Triggers on version tags
  - Full test suite
  - Creates GitHub release
  - Builds and pushes Docker images
  - Publishes to npm

- **Deploy**: Runs on main branch merge
  - Builds and pushes images
  - Deploys to Kubernetes
  - Runs smoke tests
  - Automatic rollback on failure

- **Security Scan**: Runs daily
  - Dependency vulnerability scanning
  - CodeQL analysis
  - Container scanning
  - Secret scanning

### Manual Release

```bash
# Tag version
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will:
# 1. Run full test suite
# 2. Create GitHub release
# 3. Build and push Docker images
# 4. Publish to npm
# 5. Generate documentation
```

### Deployment Environments

- **Development**: Auto-deploy on push to `develop` branch
- **Staging**: Auto-deploy on PR to `main` branch
- **Production**: Manual deployment after approval

## Monitoring & Logging

### Metrics Collection

POLLN exposes Prometheus metrics at `/metrics`:

- `polln_requests_total`: Total requests
- `polln_request_duration_seconds`: Request duration
- `polln_active_agents`: Active agent count
- `polln_dream_episodes_total`: Dream episode count

### Logging

Structured JSON logging is enabled in production:

```json
{
  "level": "info",
  "timestamp": "2024-01-01T00:00:00Z",
  "context": "API",
  "message": "Request received",
  "metadata": {
    "method": "GET",
    "path": "/health",
    "status": 200
  }
}
```

### Monitoring Stack

The deployment includes:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization dashboards
- **Jaeger**: Distributed tracing
- **AlertManager**: Alert routing

### Dashboard Access

```bash
# Port forward Grafana
kubectl port-forward svc/polln-grafana 3000:80 -n polln-prod

# Port forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n polln-prod

# Access Jaeger
kubectl port-forward svc/jaeger-query 16686:16686 -n polln-prod
```

### Log Aggregation

Configure centralized logging:

```bash
# Fluent Bit
kubectl apply -f k8s/logging/fluent-bit.yaml

# Elasticsearch
kubectl apply -f k8s/logging/elasticsearch.yaml

# Kibana
kubectl apply -f k8s/logging/kibana.yaml
```

## Security

### Authentication

Enable JWT authentication:

```yaml
auth:
  enableAuth: true
  jwtSecret: your-secret-key
  tokenExpiresIn: 86400
```

### Network Policies

Restrict pod-to-pod communication:

```bash
kubectl apply -f k8s/network-policy.yaml
```

### RBAC

Configure role-based access control:

```bash
kubectl apply -f k8s/rbac.yaml
```

### Secret Management

Use AWS Secrets Manager for production:

```bash
# Store secret
aws secretsmanager create-secret \
  --name polln/prod \
  --secret-string '{"jwt_secret": "..."}'

# Mount as environment variable
envFrom:
  - secretRef:
      name: polln-secret
```

### TLS/SSL

Enable HTTPS with cert-manager:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/certificates/cluster-issuer.yaml

# TLS will be auto-provisioned
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod -l app=polln-api -n polln-prod

# Common causes:
# - Image pull errors: Check image name and registry credentials
# - Resource limits: Increase CPU/memory requests
# - ConfigMap missing: Apply configmap.yaml
```

#### Health Checks Failing

```bash
# Check health endpoint
kubectl exec -it <pod> -n polln-prod -- wget -O- http://localhost:3000/health

# Common causes:
# - Port not exposed: Update service definition
# - Application not ready: Check application logs
# - Dependencies not ready: Check database/redis connectivity
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods -l app=polln-api -n polln-prod

# Solutions:
# - Increase memory limits in deployment.yaml
# - Add more replicas
# - Profile memory usage with Node.js inspector
```

#### Database Connection Issues

```bash
# Test database connection
kubectl exec -it <pod> -n polln-prod -- psql $DATABASE_URL

# Common causes:
# - Wrong credentials: Update secret
# - Network policies: Allow egress to database
# - SSL required: Update connection string
```

### Debug Mode

Enable debug logging:

```bash
kubectl set env deployment/polln-api \
  POLLN_LOG_LEVEL=debug \
  -n polln-prod

kubectl rollout restart deployment/polln-api -n polln-prod
```

### Port Forward Debugging

```bash
# Forward API port
kubectl port-forward deployment/polln-api 3000:3000 -n polln-prod

# Forward debug port
kubectl port-forward deployment/polln-api 9229:9229 -n polln-prod

# Connect with Node.js inspector
chrome-devtools://devtools/bundled/inspector.html?ws=localhost:9229
```

### Emergency Recovery

```bash
# Immediate rollback
./scripts/rollback.sh --namespace polln-prod

# Scale to zero
kubectl scale deployment/polln-api --replicas=0 -n polln-prod

# Emergency maintenance mode
kubectl apply -f k8s/maintenance.yaml
```

## Advanced Topics

### Multi-Region Deployment

```bash
# Deploy to multiple regions
terraform apply -var-file=environments/us-east-1.tfvars
terraform apply -var-file=environments/eu-west-1.tfvars

# Configure DNS routing
kubectl apply -f k8s/multi-region/
```

### Blue-Green Deployment

```bash
# Create green deployment
kubectl apply -f k8s/green-deployment.yaml

# Switch traffic
kubectl patch service polln-api -n polln-prod -p '{"spec":{"selector":{"version":"green"}}}'
```

### Canary Deployment

```bash
# Deploy canary
kubectl apply -f k8s/canary-deployment.yaml

# Route 10% traffic to canary
kubectl patch service polln-api -n polln-prod --type=json -p='[{"op": "add", "path": "/spec/sessionAffinityConfig", "value": {"canary":{"weight":10}}}]'
```

### Disaster Recovery

```bash
# Backup etcd
etcdctl snapshot save /tmp/etcd-backup.db

# Backup PVs
kubectl get pv -o yaml > pv-backup.yaml

# Restore from backup
kubectl apply -f pv-backup.yaml
```

## Support

For issues and questions:

- GitHub Issues: https://github.com/SuperInstance/polln/issues
- Documentation: https://docs.polln.example.com
- Community Slack: https://polln.slack.com
