# POLLN Terraform Variables

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "polln"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.27"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Auth token for Redis"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_backup" {
  description = "Enable backup for RDS and ElastiCache"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_alerts" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "max_nodes" {
  description = "Maximum number of nodes in EKS node group"
  type        = number
  default     = 50
}

variable "min_nodes" {
  description = "Minimum number of nodes in EKS node group"
  type        = number
  default     = 3
}

variable "desired_nodes" {
  description = "Desired number of nodes in EKS node group"
  type        = number
  default     = 5
}

variable "instance_types" {
  description = "Instance types for EKS nodes"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost savings"
  type        = bool
  default     = true
}
