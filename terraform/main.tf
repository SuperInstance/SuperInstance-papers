# POLLN Terraform Configuration
# Main configuration file

terraform {
  required_version = ">= 1.5.0"

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "polln-terraform-state"
    key            = "polln/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "polln-terraform-locks"
  }
}

# Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "polln"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

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
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

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

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix       = local.name_prefix
  cidr              = var.vpc_cidr
  availability_zones = var.availability_zones

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.environment == "dev"

  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_group_defaults = {
    instance_types = var.node_instance_types
    capacity_type  = var.node_capacity_type

    disk_size = var.node_disk_size

    labels = {
      Environment = var.environment
      Project     = var.project_name
    }
  }

  node_groups = {
    general = {
      desired_size = var.node_group_general_size
      min_size     = var.node_group_general_min_size
      max_size     = var.node_group_general_max_size

      labels = {
        workload = "general"
      }

      taints = []
    }

    critical = {
      desired_size = var.node_group_critical_size
      min_size     = var.node_group_critical_min_size
      max_size     = var.node_group_critical_max_size

      instance_types = ["m6i.xlarge", "m5.xlarge"]

      labels = {
        workload = "critical"
      }

      taints = [{
        key    = "workload"
        value  = "critical"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  tags = local.common_tags
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  identifier = "${local.name_prefix}-postgres"

  instance_class = var.database_instance_class
  engine_version = var.database_version

  allocated_storage     = var.database_storage
  max_allocated_storage = var.database_max_storage
  storage_encrypted     = true

  database_name   = var.database_name
  master_username = var.database_username

  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.database_subnet_ids
  security_group_ids = [module.security_groups.rds_security_group_id]

  backup_retention_period = var.database_backup_retention
  backup_window          = var.database_backup_window
  maintenance_window     = var.database_maintenance_window

  multi_az               = var.environment != "dev"
  deletion_protection    = var.environment == "production"

  tags = local.common_tags
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id      = "${local.name_prefix}-redis"
  engine_version  = var.redis_version

  node_type       = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes

  port = 6379

  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.redis_subnet_ids
  security_group_ids = [module.security_groups.redis_security_group_id]

  automatic_failover_enabled = var.environment != "dev"
  multi_az_enabled           = var.environment != "dev"

  snapshot_retention_limit = var.redis_snapshot_retention
  snapshot_window         = var.redis_snapshot_window

  tags = local.common_tags
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  bucket_prefix = local.name_prefix

  # Artifacts bucket
  artifacts_bucket = {
    enabled    = true
    versioning = true

    lifecycle_rules = [
      {
        id      = "delete-old-versions"
        enabled = true

        noncurrent_version_expiration_days = 90
      }
    ]
  }

  # Logs bucket
  logs_bucket = {
    enabled    = true
    versioning = false

    lifecycle_rules = [
      {
        id      = "delete-old-logs"
        enabled = true

        expiration_days = 30
      }
    ]
  }

  # State bucket
  state_bucket = {
    enabled    = true
    versioning = true

    lifecycle_rules = []
  }

  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id

  # Allowed ingress CIDRs
  allowed_cidrs = var.allowed_cidrs

  tags = local.common_tags
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  name       = "${local.name_prefix}-alb"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  security_group_ids = [module.security_groups.alb_security_group_id]

  certificate_arn = var.acm_certificate_arn

  tags = local.common_tags
}

# EKS Addons
module "eks_addons" {
  source = "./modules/eks_addons"

  cluster_name    = module.eks.cluster_name
  cluster_version = module.eks.cluster_version

  vpc_id = module.vpc.vpc_id

  # Enable ALB ingress controller
  enable_aws_load_balancer_controller = true
  alb_ingress_controller_chart_version = "1.5.4"

  # Enable external DNS
  enable_external_dns = true
  external_dns_domain_filters = [var.domain_name]

  # Enable cert-manager
  enable_cert_manager = true
  cert_manager_chart_version = "1.13.0"

  # Enable metrics server
  enable_metrics_server = true

  # Enable Cluster Autoscaler
  enable_cluster_autoscaler = true
  cluster_autoscaler_chart_version = "9.29.0"

  tags = local.common_tags
}

# Route53 Module
module "route53" {
  source = "./modules/route53"

  domain_name = var.domain_name
  zone_id     = var.route53_zone_id

  # DNS records
  records = {
    api = {
      name = "api"
      type = "A"
      alias = {
        name                   = module.alb.dns_name
        zone_id                = module.alb.zone_id
        evaluate_target_health = true
      }
    }

    ws = {
      name = "ws"
      type = "A"
      alias = {
        name                   = module.alb.dns_name
        zone_id                = module.alb.zone_id
        evaluate_target_health = true
      }
    }
  }

  tags = local.common_tags
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  prefix = local.name_prefix

  # Log groups
  log_groups = {
    polln-api = {
      retention_in_days = var.environment == "production" ? 30 : 7
    }

    polln-nginx = {
      retention_in_days = var.environment == "production" ? 30 : 7
    }
  }

  # Alarms
  alarms = {
    high_cpu = {
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = "2"
      metric_name         = "CPUUtilization"
      namespace           = "AWS/EKS"
      period              = "300"
      statistic           = "Average"
      threshold           = "80"

      alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
    }

    high_memory = {
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = "2"
      metric_name         = "MemoryUtilization"
      namespace           = "ContainerInsights"
      period              = "300"
      statistic           = "Average"
      threshold           = "85"

      alarm_actions = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []
    }
  }

  tags = local.common_tags
}

# Outputs are defined in outputs.tf
