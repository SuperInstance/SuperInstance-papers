# POLLN Development Environment Variables

environment    = "dev"
aws_region     = "us-east-1"
project_name   = "polln"

# Domain configuration (use local DNS for dev)
domain_name    = "polln.local"
route53_zone_id = null
acm_certificate_arn = null

# VPC configuration
vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b"]
enable_nat_gateway    = true

# Kubernetes configuration
kubernetes_version     = "1.28"
node_instance_types    = ["t3.medium"]
node_capacity_type     = "ON_DEMAND"
node_disk_size         = 50

# Node groups
node_group_general_size    = 2
node_group_general_min_size = 2
node_group_general_max_size = 5

node_group_critical_size    = 2
node_group_critical_min_size = 2
node_group_critical_max_size = 3

# Database configuration
database_instance_class   = "db.t3.micro"
database_version          = "15.4"
database_storage          = 20
database_max_storage      = 50
database_name             = "polln_dev"
database_username         = "polln_admin"
database_password         = "ChangeMe123!" # Change in production
database_backup_retention = 1
database_backup_window    = "03:00-04:00"
database_maintenance_window = "Mon:04:00-Mon:05:00"

# Redis configuration
redis_version          = "7.0"
redis_node_type        = "cache.t3.micro"
redis_num_nodes        = 1
redis_snapshot_retention = 0
redis_snapshot_window  = "02:00-03:00"
redis_auth_token       = "ChangeMe123!" # Change in production

# Security
allowed_cidrs          = ["10.0.0.0/16"] # VPC only for dev

# Monitoring
enable_monitoring      = true
enable_logging         = true
alarm_sns_topic_arn    = null
