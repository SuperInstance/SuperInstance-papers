# POLLN Production Environment Variables

environment    = "production"
aws_region     = "us-east-1"
project_name   = "polln"

# Domain configuration
domain_name        = "polln.example.com" # Change to your domain
route53_zone_id    = "Z1234567890ABC"    # Change to your zone ID
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc123-456def-789ghi" # Change to your certificate

# VPC configuration
vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_nat_gateway    = true

# Kubernetes configuration
kubernetes_version     = "1.28"
node_instance_types    = ["m6i.xlarge", "m5.xlarge"]
node_capacity_type     = "ON_DEMAND"
node_disk_size         = 100

# Node groups
node_group_general_size    = 6
node_group_general_min_size = 4
node_group_general_max_size = 20

node_group_critical_size    = 3
node_group_critical_min_size = 3
node_group_critical_max_size = 10

# Database configuration
database_instance_class   = "db.m6i.xlarge"
database_version          = "15.4"
database_storage          = 100
database_max_storage      = 1000
database_name             = "polln_prod"
database_username         = "polln_admin"
# IMPORTANT: Use AWS Secrets Manager or SSM Parameter Store for production
# database_password         = var.database_password
database_backup_retention = 30
database_backup_window    = "03:00-04:00"
database_maintenance_window = "Mon:04:00-Mon:05:00"

# Redis configuration
redis_version          = "7.0"
redis_node_type        = "cache.m6g.xlarge"
redis_num_nodes        = 3
redis_snapshot_retention = 7
redis_snapshot_window  = "02:00-03:00"
# IMPORTANT: Use AWS Secrets Manager or SSM Parameter Store for production
# redis_auth_token       = var.redis_auth_token

# Security
allowed_cidrs          = ["0.0.0.0/0"] # Restrict to specific IPs in production

# Monitoring
enable_monitoring      = true
enable_logging         = true
alarm_sns_topic_arn    = "arn:aws:sns:us-east-1:123456789012:polln-alerts" # Change to your SNS topic
