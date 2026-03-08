# POLLN Terraform Infrastructure

This directory contains Terraform configurations for deploying POLLN infrastructure on AWS.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- Existing Route53 hosted zone (for production)
- ACM certificate (for production)

## Quick Start

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=environments/dev.tfvars

# Apply deployment
terraform apply -var-file=environments/dev.tfvars
```

## Environment Configuration

Create environment-specific variable files:

```hcl
# environments/dev.tfvars
environment = "dev"
aws_region  = "us-east-1"

# Override defaults for development
node_group_general_size    = 2
database_instance_class    = "db.t3.micro"
redis_node_type            = "cache.t3.micro"
```

## Modules

- **vpc**: VPC, subnets, NAT gateways
- **eks**: EKS cluster and node groups
- **rds**: RDS PostgreSQL database
- **elasticache**: ElastiCache Redis cluster
- **s3**: S3 buckets for artifacts and logs
- **security_groups**: Security groups for all resources
- **alb**: Application Load Balancer
- **eks_addons**: Kubernetes addons (ingress, metrics, etc.)
- **route53**: Route53 DNS records
- **cloudwatch**: CloudWatch logs and alarms

## Outputs

After deployment, Terraform will output:

- Cluster endpoint and credentials
- Database endpoints
- Redis endpoints
- Load balancer DNS name
- S3 bucket names
- kubectl configuration command

## State Management

Terraform state is stored in S3 with DynamoDB locking:

```hcl
backend "s3" {
  bucket         = "polln-terraform-state"
  key            = "polln/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "polln-terraform-locks"
}
```

## Security

- All resources are tagged with project and environment
- Database and Redis are encrypted at rest
- VPC flow logs can be enabled
- Security groups follow least privilege
- Secrets are stored in AWS Secrets Manager

## Upgrading

```bash
# Upgrade Terraform version
terraform init -upgrade

# Plan upgrade
terraform plan -out=tfplan

# Apply upgrade
terraform apply tfplan
```

## Destroy

```bash
# Destroy all resources
terraform destroy -var-file=environments/dev.tfvars
```
