# POLLN Terraform Deployment Guide

## Overview

This Terraform configuration deploys POLLN to AWS with production-grade infrastructure.

## Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or download from https://terraform.io

# Install AWS CLI
brew install awscli     # macOS
# or download from https://aws.amazon.com/cli/

# Install kubectl
brew install kubectl    # macOS
# or download from https://kubernetes.io/docs/tasks/tools/

# Configure AWS credentials
aws configure
```

## Quick Start

### 1. Initialize Terraform

```bash
cd deployment/terraform

# Initialize Terraform backend and providers
terraform init
```

### 2. Set Variables

Create a `terraform.tfvars` file:

```hcl
environment               = "prod"
aws_region                = "us-east-1"
kubernetes_version        = "1.27"
acm_certificate_arn       = "arn:aws:acm:us-east-1:123456789:certificate/xxx"
grafana_admin_password    = "CHANGE_ME"
database_password         = "CHANGE_ME"
redis_auth_token          = "CHANGE_ME"
```

### 3. Plan Deployment

```bash
# Review the plan
terraform plan

# Save plan to file
terraform plan -out=tfplan
```

### 4. Deploy Infrastructure

```bash
# Apply the plan
terraform apply tfplan

# Or apply directly (with confirmation)
terraform apply
```

### 5. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name polln-prod-cluster \
  --region us-east-1

# Verify connection
kubectl get nodes
```

## Architecture

### VPC Configuration

- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
- **Private Subnets**: 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24
- **Database Subnets**: 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24

### EKS Cluster

- **Kubernetes Version**: 1.27
- **Node Groups**:
  - General: t3.large (3-50 nodes)
  - Compute: c5.xlarge spot (2-20 nodes)
  - Memory: r5.large spot (1-10 nodes)

### Database

- **RDS PostgreSQL**: 15.4
  - Production: db.r6g.xlarge (multi-AZ)
  - Development: db.t3.large (single-AZ)
  - Storage: 500-1000 GB
  - Backup: 30 days retention

### Cache

- **ElastiCache Redis**: 7.0
  - Production: cache.r6g.large (3-node cluster)
  - Development: cache.t3.medium (single node)

### Load Balancer

- **ALB**: Application Load Balancer
- **Listeners**: HTTP (80), HTTPS (443)
- **Health Checks**: /health endpoint

## Outputs

After deployment, Terraform outputs important values:

```bash
terraform output
```

Key outputs:
- `cluster_name`: EKS cluster name
- `cluster_endpoint`: API server endpoint
- `rds_instance_endpoint`: Database endpoint
- `elasticache_endpoint`: Redis endpoint
- `alb_dns_name`: Load balancer DNS

## Cost Management

### Estimated Costs (us-east-1)

| Component | Development | Production |
|-----------|-------------|------------|
| EKS Cluster | $73/month | $73/month |
| EC2 Nodes | $100/month | $800/month |
| RDS PostgreSQL | $50/month | $500/month |
| ElastiCache Redis | $30/month | $200/month |
| ALB | $20/month | $20/month |
| **Total** | **~$273/month** | **~$1,593/month** |

### Cost Optimization Tips

1. **Use Spot Instances**: Enable spot instances for non-critical workloads
2. **Right-size Instances**: Monitor CPU/memory usage and adjust
3. **Auto-scaling**: Configure HPA to scale down during low traffic
4. **Reserved Instances**: Commit to 1-3 years for significant savings
5. **S3 Lifecycle**: Use IA/Glacier for old logs

## Security

### Best Practices

1. **Network Security**:
   - Private subnets for EKS nodes
   - Security groups limit ingress/egress
   - Network policies in Kubernetes

2. **Data Security**:
   - RDS encryption at rest
   - ElastiCache encryption in transit
   - S3 bucket encryption
   - Secrets stored in AWS Secrets Manager

3. **Access Control**:
   - IAM roles for EKS
   - RBAC in Kubernetes
   - MFA for AWS console
   - Least privilege access

4. **Compliance**:
   - AWS CloudTrail logging
   - VPC Flow Logs
   - Config rules
   - GuardDuty threat detection

## Monitoring

### CloudWatch

- EKS metrics
- RDS performance
- ElastiCache metrics
- ALB access logs

### Prometheus + Grafana

Deployed via Helm:
- Metrics collection
- Dashboards
- Alerting rules

## Backup & Disaster Recovery

### RDS Automated Backups

- Retention: 30 days
- Window: 3:00-6:00 UTC
- Multi-AZ: Production only

### Snapshot Strategy

```bash
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier polln-prod-postgres \
  --db-snapshot-identifier polln-manual-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier polln-restored \
  --db-snapshot-identifier polln-manual-YYYYMMDD
```

## Maintenance

### Cluster Upgrade

```bash
# Update Kubernetes version
terraform apply -var="kubernetes_version=1.28"
```

### Node Group Updates

```bash
# Change instance types
terraform apply -var="instance_types=[\"t3.xlarge\"]"
```

## Troubleshooting

### Common Issues

**EKS Cluster Access**:
```bash
aws eks update-kubeconfig --name polln-prod-cluster
kubectl get nodes
```

**Pod Cannot Connect to RDS**:
```bash
# Check security group ingress
# Verify VPC CIDR allows traffic
kubectl exec -it <pod> -- nc -zv <rds-endpoint> 5432
```

**ALB Health Checks Failing**:
```bash
# Check health endpoint
kubectl get pods
kubectl logs <pod>
```

## Destroy

```bash
# Destroy all resources
terraform destroy

# Or with plan
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
```

## Support

For issues or questions:
- GitHub: https://github.com/SuperInstance/polln
- Documentation: /deployment/README.md
