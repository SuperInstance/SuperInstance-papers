# POLLN Terraform Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_ca_certificate
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "node_group_arns" {
  description = "EKS node group ARNs"
  value       = module.eks.node_group_arns
}

output "node_group_role_arns" {
  description = "EKS node group role ARNs"
  value       = module.eks.node_group_role_arns
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS database port"
  value       = module.rds.port
}

output "database_id" {
  description = "RDS database instance ID"
  value       = module.rds.id
}

output "database_arn" {
  description = "RDS database ARN"
  value       = module.rds.arn
}

output "database_username" {
  description = "RDS database master username"
  value       = var.database_username
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.elasticache.port
}

output "redis_cluster_id" {
  description = "ElastiCache Redis cluster ID"
  value       = module.elasticache.cluster_id
}

output "redis_auth_token" {
  description = "ElastiCache Redis auth token"
  value       = var.redis_auth_token
  sensitive   = true
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID"
  value       = module.alb.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = module.alb.arn
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.security_groups.alb_security_group_id
}

output "s3_artifacts_bucket_name" {
  description = "S3 artifacts bucket name"
  value       = module.s3.artifacts_bucket_name
}

output "s3_artifacts_bucket_arn" {
  description = "S3 artifacts bucket ARN"
  value       = module.s3.artifacts_bucket_arn
}

output "s3_logs_bucket_name" {
  description = "S3 logs bucket name"
  value       = module.s3.logs_bucket_name
}

output "s3_logs_bucket_arn" {
  description = "S3 logs bucket ARN"
  value       = module.s3.logs_bucket_arn
}

output "s3_state_bucket_name" {
  description = "S3 state bucket name"
  value       = module.s3.state_bucket_name
}

output "s3_state_bucket_arn" {
  description = "S3 state bucket ARN"
  value       = module.s3.state_bucket_arn
}

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    rds   = module.security_groups.rds_security_group_id
    redis = module.security_groups.redis_security_group_id
    alb   = module.security_groups.alb_security_group_id
  }
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.route53.zone_id
}

output "api_dns_record" {
  description = "API DNS record"
  value       = module.route53.records.api
}

output "ws_dns_record" {
  description = "WebSocket DNS record"
  value       = module.route53.records.ws
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value       = module.cloudwatch.log_group_names
}

output "cloudwatch_log_group_arns" {
  description = "CloudWatch log group ARNs"
  value       = module.cloudwatch.log_group_arns
}

output "cloudwatch_alarm_arns" {
  description = "CloudWatch alarm ARNs"
  value       = module.cloudwatch.alarm_arns
}

# Kubernetes configuration output
output "kubeconfig" {
  description = "Kubeconfig for the EKS cluster"
  value = templatefile("${path.module}/templates/kubeconfig.tpl", {
    cluster_name    = module.eks.cluster_name
    cluster_endpoint = module.eks.cluster_endpoint
    cluster_ca     = module.eks.cluster_ca_certificate
    region         = var.aws_region
  })
  sensitive = true
}

# Useful commands
output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}
