# AWS Secrets Manager Configuration for POLLN
# This module creates and manages secrets in AWS Secrets Manager

# =============================================================================
# Random Password Generator
# =============================================================================
resource "random_password" "postgres_password" {
  length  = 32
  special = true
  override_special = "_%@"
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
  override_special = "_%@"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
  override_special = "_%@"
}

resource "random_password" "grafana_admin_password" {
  length  = 32
  special = true
  override_special = "_%@"
}

# =============================================================================
# AWS Secrets Manager Secrets
# =============================================================================
# Database credentials
resource "aws_secretsmanager_secret" "postgres_password" {
  name = "polln/${var.environment}/postgres-password"

  description = "PostgreSQL password for POLLN ${var.environment} environment"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "postgres_password" {
  secret_id = aws_secretsmanager_secret.postgres_password.id
  secret_string = jsonencode({
    POSTGRES_PASSWORD = random_password.postgres_password.result
  })

  rotation_enabled = true
  rotation_rules {
    automatically_after_days = 90
  }
}

# Database URL
resource "aws_secretsmanager_secret" "database_url" {
  name = "polln/${var.environment}/database-url"

  description = "Database connection URL for POLLN ${var.environment} environment"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://polln:${random_password.postgres_password.result}@${module.rds.db_instance_endpoint}:5432/polln"
  })
}

# Redis credentials
resource "aws_secretsmanager_secret" "redis_password" {
  name = "polln/${var.environment}/redis-password"

  description = "Redis password for POLLN ${var.environment} environment"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_password" {
  secret_id = aws_secretsmanager_secret.redis_password.id
  secret_string = jsonencode({
    REDIS_PASSWORD = random_password.redis_password.result
  })

  rotation_enabled = true
  rotation_rules {
    automatically_after_days = 90
  }
}

# JWT credentials
resource "aws_secretsmanager_secret" "jwt_credentials" {
  name = "polln/${var.environment}/jwt-credentials"

  description = "JWT credentials for POLLN ${var.environment} environment"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt_credentials" {
  secret_id = aws_secretsmanager_secret.jwt_credentials.id
  secret_string = jsonencode({
    JWT_SECRET    = random_password.jwt_secret.result
    JWT_ISSUER    = "polln-${var.environment}"
    JWT_AUDIENCE  = "polln-api"
  })

  rotation_enabled = true
  rotation_rules {
    automatically_after_days = 90
  }
}

# Monitoring credentials
resource "aws_secretsmanager_secret" "grafana_credentials" {
  name = "polln/${var.environment}/grafana-credentials"

  description = "Grafana admin credentials for POLLN ${var.environment} environment"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "grafana_credentials" {
  secret_id = aws_secretsmanager_secret.grafana_credentials.id
  secret_string = jsonencode({
    GRAFANA_ADMIN_USER     = var.grafana_admin_user
    GRAFANA_ADMIN_PASSWORD = random_password.grafana_admin_password.result
  })

  rotation_enabled = true
  rotation_rules {
    automatically_after_days = 90
  }
}

# API Keys (to be populated manually)
resource "aws_secretsmanager_secret" "api_keys" {
  name = "polln/${var.environment}/api-keys"

  description = "External API keys for POLLN ${var.environment} environment"

  tags = local.common_tags
}

# =============================================================================
# IAM Role for External Secrets Operator
# =============================================================================
resource "aws_iam_role" "external_secrets_role" {
  name = "${local.name_prefix}-external-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(module.eks.cluster_oidc_issuer, "https://", "")}"
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer, "https://", "")}:sub" = "system:serviceaccount:polln:external-secrets-sa"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "external_secrets_policy" {
  name = "${local.name_prefix}-external-secrets-policy"
  role = aws_iam_role.external_secrets_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.postgres_password.arn,
          aws_secretsmanager_secret.redis_password.arn,
          aws_secretsmanager_secret.jwt_credentials.arn,
          aws_secretsmanager_secret.grafana_credentials.arn,
          aws_secretsmanager_secret.api_keys.arn
        ]
      }
    ]
  })
}

# =============================================================================
# Security Group for Redis with AUTH
# =============================================================================
# Update the security group to only allow authenticated access
resource "aws_security_group_rule" "redis_ingress" {
  description              = "Redis access from VPC with authentication"
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = module.security_group.security_group_id
  security_group_id        = module.security_group.security_group_id
}

# =============================================================================
# Outputs
# =============================================================================
output "postgres_password_arn" {
  description = "ARN of the PostgreSQL password secret"
  value       = aws_secretsmanager_secret.postgres_password.arn
  sensitive   = true
}

output "redis_password_arn" {
  description = "ARN of the Redis password secret"
  value       = aws_secretsmanager_secret.redis_password.arn
  sensitive   = true
}

output "jwt_credentials_arn" {
  description = "ARN of the JWT credentials secret"
  value       = aws_secretsmanager_secret.jwt_credentials.arn
  sensitive   = true
}

output "grafana_credentials_arn" {
  description = "ARN of the Grafana credentials secret"
  value       = aws_secretsmanager_secret.grafana_credentials.arn
  sensitive   = true
}

output "external_secrets_role_arn" {
  description = "ARN of the IAM role for External Secrets Operator"
  value       = aws_iam_role.external_secrets_role.arn
}
