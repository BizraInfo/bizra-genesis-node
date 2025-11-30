# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - SECURITY MODULE
# KMS encryption keys and Secrets Manager
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# DATA SOURCES
# ─────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ─────────────────────────────────────────────────────────────────────────────
# KMS KEY FOR DATA ENCRYPTION
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_kms_key" "data" {
  description             = "${var.project_name} ${var.environment} data encryption key"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  enable_key_rotation     = true
  multi_region            = var.enable_multi_region

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-data"
    Environment = var.environment
    Purpose     = "Data encryption (RDS, S3, EBS)"
  })

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = [
            "rds.amazonaws.com",
            "s3.amazonaws.com",
            "ec2.amazonaws.com",
            "elasticache.amazonaws.com",
            "logs.amazonaws.com",
            "secretsmanager.amazonaws.com",
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "rds.${data.aws_region.current.name}.amazonaws.com",
              "s3.${data.aws_region.current.name}.amazonaws.com",
              "ec2.${data.aws_region.current.name}.amazonaws.com",
              "elasticache.${data.aws_region.current.name}.amazonaws.com",
            ]
          }
        }
      },
    ]
  })
}

resource "aws_kms_alias" "data" {
  name          = "alias/${var.project_name}-${var.environment}-data"
  target_key_id = aws_kms_key.data.key_id
}

# ─────────────────────────────────────────────────────────────────────────────
# KMS KEY FOR SECRETS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_kms_key" "secrets" {
  description             = "${var.project_name} ${var.environment} secrets encryption key"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  enable_key_rotation     = true
  multi_region            = var.enable_multi_region

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-secrets"
    Environment = var.environment
    Purpose     = "Secrets encryption (Secrets Manager)"
  })

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager to use the key"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ─────────────────────────────────────────────────────────────────────────────
# SECRETS MANAGER - APPLICATION SECRETS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}-${var.environment}-jwt-secret"
  description             = "JWT signing secret for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  kms_key_id              = aws_kms_key.secrets.arn

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-jwt-secret"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${var.project_name}-${var.environment}-api-keys"
  description             = "API keys for external services (OpenAI, Anthropic, etc.)"
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  kms_key_id              = aws_kms_key.secrets.arn

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-api-keys"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${var.project_name}-${var.environment}-redis-auth-token"
  description             = "Redis authentication token"
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  kms_key_id              = aws_kms_key.secrets.arn

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis-auth-token"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# SECRETS ROTATION CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret_rotation" "jwt_secret" {
  count = var.enable_secret_rotation && var.environment == "production" ? 1 : 0

  secret_id           = aws_secretsmanager_secret.jwt_secret.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# IAM POLICY FOR SECRETS ACCESS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_iam_policy" "secrets_read" {
  name        = "${var.project_name}-${var.environment}-secrets-read"
  description = "Allow reading secrets for ${var.project_name} ${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = [
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.api_keys.arn,
          aws_secretsmanager_secret.redis_auth_token.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
        ]
        Resource = aws_kms_key.secrets.arn
      },
    ]
  })

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDTRAIL FOR AUDIT LOGGING
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudtrail" "main" {
  count = var.enable_cloudtrail ? 1 : 0

  name                          = "${var.project_name}-${var.environment}-audit-trail"
  s3_bucket_name                = var.cloudtrail_bucket_name
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.data.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${var.cloudtrail_bucket_name}/*"]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-audit-trail"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# GUARDDUTY (Threat detection)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0

  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-guardduty"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# AWS CONFIG (Compliance monitoring)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_config_configuration_recorder" "main" {
  count = var.enable_aws_config ? 1 : 0

  name     = "${var.project_name}-${var.environment}-config"
  role_arn = var.config_role_arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  count = var.enable_aws_config ? 1 : 0

  name           = "${var.project_name}-${var.environment}-config-delivery"
  s3_bucket_name = var.config_bucket_name
  s3_key_prefix  = "config"

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  count = var.enable_aws_config ? 1 : 0

  name       = aws_config_configuration_recorder.main[0].name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

output "data_kms_key_id" {
  description = "KMS key ID for data encryption"
  value       = aws_kms_key.data.key_id
}

output "data_kms_key_arn" {
  description = "KMS key ARN for data encryption"
  value       = aws_kms_key.data.arn
}

output "secrets_kms_key_id" {
  description = "KMS key ID for secrets encryption"
  value       = aws_kms_key.secrets.key_id
}

output "secrets_kms_key_arn" {
  description = "KMS key ARN for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "jwt_secret_arn" {
  description = "ARN of JWT secret in Secrets Manager"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "api_keys_secret_arn" {
  description = "ARN of API keys secret in Secrets Manager"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "redis_auth_token_secret_arn" {
  description = "ARN of Redis auth token secret in Secrets Manager"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
}

output "secrets_read_policy_arn" {
  description = "ARN of IAM policy for reading secrets"
  value       = aws_iam_policy.secrets_read.arn
}
