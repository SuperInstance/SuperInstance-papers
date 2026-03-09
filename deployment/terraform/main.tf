# POLLN Production Terraform Configuration
# Infrastructure as Code for AWS deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "polln-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "polln-terraform-locks"
  }
}

# =============================================================================
# Provider Configuration
# =============================================================================
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "POLLN"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      module.eks.cluster_name,
      "--region",
      var.aws_region
    ]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        module.eks.cluster_name,
        "--region",
        var.aws_region
      ]
    }
  }
}

# =============================================================================
# Data Sources
# =============================================================================
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# =============================================================================
# Local Variables
# =============================================================================
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # VPC CIDR blocks
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  database_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# =============================================================================
# VPC Module
# =============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = local.vpc_cidr

  azs             = data.aws_availability_zones.available.names
  public_subnets  = local.public_subnet_cidrs
  private_subnets = local.private_subnet_cidrs
  database_subnets = local.database_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "dev" ? true : false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # PostgreSQL database subnet group
  create_database_subnet_group = true

  # VPC endpoints for private cluster access
  enable_vpc_endpoint = true

  # Tags
  public_subnet_tags = {
    Type = "public"
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    Type = "private"
    "kubernetes.io/role/internal-elb" = "1"
  }

  database_subnet_tags = {
    Type = "database"
  }

  tags = local.common_tags
}

# =============================================================================
# EKS Cluster Module
# =============================================================================
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.17"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cluster endpoint configuration
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    # General purpose node group
    general = {
      name = "${local.name_prefix}-general"

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = 50
      desired_size = 5

      # Disk size
      disk_size = 100

      # Labels
      labels = {
        WorkerType = "GENERAL"
      }

      # Tags
      tags = {
        WorkerType = "GENERAL"
      }
    }

    # Compute optimized node group for API
    compute = {
      name = "${local.name_prefix}-compute"

      instance_types = ["c5.xlarge"]
      capacity_type  = "SPOT"

      min_size     = 2
      max_size     = 20
      desired_size = 3

      disk_size = 100

      labels = {
        WorkerType = "COMPUTE"
      }

      taints = []
    }

    # Memory optimized node group for caching
    memory = {
      name = "${local.name_prefix}-memory"

      instance_types = ["r5.large"]
      capacity_type  = "SPOT"

      min_size     = 1
      max_size     = 10
      desired_size = 2

      disk_size = 200

      labels = {
        WorkerType = "MEMORY"
      }
    }
  }

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # OIDC provider for IRSA
  enable_irsa = true

  # Tags
  tags = local.common_tags
}

# =============================================================================
# RDS PostgreSQL
# =============================================================================
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.environment == "prod" ? "db.r6g.xlarge" : "db.t3.large"

  allocated_storage     = var.environment == "prod" ? 500 : 100
  max_allocated_storage = var.environment == "prod" ? 1000 : 200
  storage_encrypted     = true

  db_name  = "polln"
  username = "polln"
  port     = 5432

  multi_az               = var.environment == "prod" ? true : false
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.security_group.security_group_id]

  # Maintenance window
  maintenance_window = "Mon:03:00-Mon:04:00"
  backup_window      = "03:00-06:00"

  # Backups
  backup_retention_period = var.environment == "prod" ? 30 : 7
  skip_final_snapshot     = var.environment == "dev" ? true : false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"

  # Performance insights
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = var.environment == "prod" ? true : false

  # Deletion protection
  deletion_protection = var.environment == "prod" ? true : false

  # Tags
  tags = local.common_tags
}

# =============================================================================
# ElastiCache Redis
# =============================================================================
module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  cluster_id      = "${local.name_prefix}-redis"
  engine_version  = "7.0"

  # Node type
  node_type       = var.environment == "prod" ? "cache.r6g.large" : "cache.t3.medium"

  # Number of nodes
  num_cache_nodes = var.environment == "prod" ? 3 : 1
  cluster_size    = var.environment == "prod" ? 3 : 1

  # Multi-AZ
  multi_az               = var.environment == "prod" ? true : false
  automatic_failover_enabled = var.environment == "prod" ? true : false

  # Subnets
  subnet_ids = module.vpc.database_subnets

  # Security group
  security_group_ids = [module.security_group.security_group_id]

  # Parameters
  parameter_group_name = "default.redis7"

  # Maintenance window
  maintenance_window = "mon:03:00-mon:04:00"

  # Notification
  notification_topic_arn = ""

  # Tags
  tags = local.common_tags
}

# =============================================================================
# Security Group
# =============================================================================
module "security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name_prefix}-sg"
  description = "Security group for POLLN resources"
  vpc_id      = module.vpc.vpc_id

  # Ingress rules
  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from VPC"
      cidr_blocks = local.vpc_cidr
    },
    {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "Redis access from VPC"
      cidr_blocks = local.vpc_cidr
    }
  ]

  # Egress rules
  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      description = "All outbound traffic"
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  # Tags
  tags = local.common_tags
}

# =============================================================================
# S3 Buckets
# =============================================================================
module "s3" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"

  # Logs bucket
  bucket_prefix = "${local.name_prefix}-logs-"

  # Server-side encryption
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  # Versioning
  versioning = {
    status = true
  }

  # Lifecycle
  lifecycle_rule = [
    {
      id      = "log-expiration"
      enabled = true

      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]

      expiration = {
        days = 365
      }
    }
  ]

  # Logging
  log_target_bucket_suffix = "logs"
  log_target_prefix        = "log/"

  # Tags
  tags = local.common_tags
}

# =============================================================================
# Application Load Balancer
# =============================================================================
module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 8.0"

  name = "${local.name_prefix}-alb"

  load_balancer_type = "application"

  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnets
  security_groups = [module.alb_security_group.security_group_id]

  # Access logs
  access_logs = {
    bucket = module.s3.s3_bucket_id
    prefix = "alb-logs"
    enabled = true
  }

  # Target groups
  target_groups = [
    {
      name_prefix      = "polln-"
      backend_protocol = "HTTP"
      backend_port     = 3000
      target_type      = "instance"

      health_check = {
        enabled             = true
        interval            = 30
        path                = "/health"
        port                = 3000
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        protocol            = "HTTP"
        matcher             = "200"
      }
    }
  ]

  # HTTP listener
  http_tcp_listeners = [
    {
      port               = 80
      protocol           = "HTTP"
      target_group_index = 0
    }
  ]

  # HTTPS listener
  https_listeners = [
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = var.acm_certificate_arn
      target_group_index = 0
    }
  ]

  # Tags
  tags = local.common_tags
}

# =============================================================================
# ALB Security Group
# =============================================================================
module "alb_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      description = "HTTP from anywhere"
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      description = "HTTPS from anywhere"
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      description = "All outbound traffic"
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  tags = local.common_tags
}

# =============================================================================
# Route53
# =============================================================================
module "route53" {
  source  = "terraform-aws-modules/route53/aws"
  version = "~> 2.0"

  zones = {
    "polln.local" = {
      tags = local.common_tags
    }
  }

  records = {
    "polln" = {
      zone_id = module.route53.zones["polln.local"].zone_id
      type    = "A"
      alias   = {
        name                   = module.alb.lb_dns_name
        zone_id                = module.alb.lb_zone_id
        evaluate_target_health = true
      }
    }
  }

  tags = local.common_tags
}

# =============================================================================
# Helm Releases
# =============================================================================
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "helm_release" "monitoring" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  create_namespace = true

  set {
    name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
    value = "false"
  }

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }
}

# =============================================================================
# Outputs
# =============================================================================
