# POLLN Terraform Variables

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "polln"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway"
  type        = bool
  default     = true
}

# Kubernetes Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "Node instance types"
  type        = list(string)
  default     = ["t3.medium", "t3a.medium"]
}

variable "node_capacity_type" {
  description = "Node capacity type (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_capacity_type)
    error_message = "Capacity type must be ON_DEMAND or SPOT."
  }
}

variable "node_disk_size" {
  description = "Node disk size in GB"
  type        = number
  default     = 50
}

variable "node_group_general_size" {
  description = "Desired size of general node group"
  type        = number
  default     = 3
}

variable "node_group_general_min_size" {
  description = "Minimum size of general node group"
  type        = number
  default     = 2
}

variable "node_group_general_max_size" {
  description = "Maximum size of general node group"
  type        = number
  default     = 10
}

variable "node_group_critical_size" {
  description = "Desired size of critical node group"
  type        = number
  default     = 2
}

variable "node_group_critical_min_size" {
  description = "Minimum size of critical node group"
  type        = number
  default     = 2
}

variable "node_group_critical_max_size" {
  description = "Maximum size of critical node group"
  type        = number
  default     = 5
}

# Database Configuration
variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition     = can(regex("^db\\.", var.database_instance_class))
    error_message = "Database instance class must start with 'db.'"
  }
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "database_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 20
}

variable "database_max_storage" {
  description = "Maximum database storage in GB"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "polln"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "polln_admin"
}

variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "database_backup_retention" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

variable "database_backup_window" {
  description = "Database backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "database_maintenance_window" {
  description = "Database maintenance window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

# Redis Configuration
variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition     = can(regex("^cache\\.", var.redis_node_type))
    error_message = "Redis node type must start with 'cache.'"
  }
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

variable "redis_snapshot_retention" {
  description = "Redis snapshot retention limit"
  type        = number
  default     = 1
}

variable "redis_snapshot_window" {
  description = "Redis snapshot window"
  type        = string
  default     = "02:00-03:00"
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "polln.example.com"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = null
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = null
}

# Security Configuration
variable "allowed_cidrs" {
  description = "Allowed CIDR blocks for ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Monitoring Configuration
variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
  default     = null
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable CloudWatch logging"
  type        = bool
  default     = true
}
