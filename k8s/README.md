# POLLN Kubernetes Deployment

This directory contains Kubernetes manifests for deploying POLLN to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.25+)
- kubectl configured
- NGINX Ingress Controller installed
- Cert-Manager installed (for TLS certificates)
- PVC storage class available

## Quick Start

```bash
# Create namespace
kubectl create namespace polln

# Apply secrets (update secret.yaml first)
kubectl apply -f k8s/secret.yaml -n polln

# Apply configmaps
kubectl apply -f k8s/configmap.yaml -n polln

# Apply deployment
kubectl apply -f k8s/deployment.yaml -n polln

# Apply services
kubectl apply -f k8s/service.yaml -n polln

# Apply ingress (update domain names first)
kubectl apply -f k8s/ingress.yaml -n polln

# Apply autoscaling
kubectl apply -f k8s/hpa.yaml -n polln

# Apply PDB and network policies
kubectl apply -f k8s/pdb.yaml -n polln
```

## Configuration

### Secrets

Update `secret.yaml` with your actual secrets:

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 16)

# Generate Redis password
REDIS_PASSWORD=$(openssl rand -base64 16)

# Create secret
kubectl create secret generic polln-secret \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=database-url="postgresql://polln:$DB_PASSWORD@polln-postgres:5432/polln" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  -n polln
```

### Ingress

Update `ingress.yaml` with your domain names:

```yaml
spec:
  tls:
  - hosts:
    - polln.yourdomain.com
    - api.polln.yourdomain.com
  rules:
  - host: polln.yourdomain.com
```

## Scaling

The deployment includes:

- **Horizontal Pod Autoscaler**: Scales pods based on CPU, memory, and custom metrics
- **Vertical Pod Autoscaler**: Adjusts resource requests/limits automatically
- **Pod Disruption Budget**: Ensures minimum availability during updates

## Monitoring

The deployment includes:

- Prometheus scraping configuration
- Custom metrics endpoint
- Distributed tracing with Jaeger
- Health and readiness probes

## Storage

The deployment uses PersistentVolumeClaims for:

- `/app/.polln` - Polln runtime data (10Gi)
- `/app/.agents` - Agent state data (5Gi)

Update the storage size in `pdb.yaml` based on your needs.

## Security

The deployment includes:

- Non-root user execution
- Read-only root filesystem (where possible)
- Network policies
- RBAC configuration
- Pod security policies

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n polln

# Check logs
kubectl logs -f deployment/polln-api -n polln

# Check events
kubectl get events -n polln

# Describe pod
kubectl describe pod -l app=polln-api -n polln

# Port forward for debugging
kubectl port-forward deployment/polln-api 3000:3000 -n polln
```

## Upgrading

```bash
# Update image
kubectl set image deployment/polln-api polln-api=polln:new-version -n polln

# Check rollout status
kubectl rollout status deployment/polln-api -n polln

# Rollback if needed
kubectl rollout undo deployment/polln-api -n polln
```
