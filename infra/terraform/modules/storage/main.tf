# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - STORAGE MODULE (S3)
# Object storage for artifacts, backups, and logs
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
# ARTIFACTS BUCKET
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_name}-${var.environment}-artifacts"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-artifacts"
    Environment = var.environment
    Purpose     = "Application artifacts and dependencies"
  })
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "transition-old-versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# BACKUPS BUCKET
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-${var.environment}-backups"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-backups"
    Environment = var.environment
    Purpose     = "Database and application backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "retention-policy"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.environment == "production" ? 2555 : 90 # 7 years for production, 90 days for dev/staging
    }
  }

  rule {
    id     = "delete-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Enable MFA delete for production
resource "aws_s3_bucket_versioning" "backups_mfa" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status    = "Enabled"
    mfa_delete = "Enabled"
  }

  # Note: MFA delete requires bucket owner to configure MFA device
}

# ─────────────────────────────────────────────────────────────────────────────
# LOGS BUCKET
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-${var.environment}-logs"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-logs"
    Environment = var.environment
    Purpose     = "Application and access logs"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "log-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = var.environment == "production" ? 365 : 90
    }
  }
}

# Enable logging for all buckets
resource "aws_s3_bucket_logging" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "artifacts-access-logs/"
}

resource "aws_s3_bucket_logging" "backups" {
  bucket = aws_s3_bucket.backups.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "backups-access-logs/"
}

# ─────────────────────────────────────────────────────────────────────────────
# STATIC ASSETS BUCKET (for frontend if needed)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "static_assets" {
  count = var.enable_static_website ? 1 : 0

  bucket = "${var.project_name}-${var.environment}-static-assets"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-static-assets"
    Environment = var.environment
    Purpose     = "Static website assets"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  count = var.enable_static_website ? 1 : 0

  bucket = aws_s3_bucket.static_assets[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  count = var.enable_static_website ? 1 : 0

  bucket = aws_s3_bucket.static_assets[0].id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "static_assets" {
  count = var.enable_static_website ? 1 : 0

  bucket = aws_s3_bucket.static_assets[0].id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_cors_configuration" "static_assets" {
  count = var.enable_static_website ? 1 : 0

  bucket = aws_s3_bucket.static_assets[0].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# BUCKET POLICIES
# ─────────────────────────────────────────────────────────────────────────────

# Policy to allow CloudFront to access static assets
resource "aws_s3_bucket_policy" "static_assets" {
  count = var.enable_static_website && var.cloudfront_oai_iam_arn != "" ? 1 : 0

  bucket = aws_s3_bucket.static_assets[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.cloudfront_oai_iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets[0].arn}/*"
      }
    ]
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# INTELLIGENT TIERING
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket_intelligent_tiering_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  name   = "EntireArtifactsBucket"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# REPLICATION (Production disaster recovery)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "backups_replica" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  provider = aws.replica
  bucket   = "${var.project_name}-${var.environment}-backups-replica"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-backups-replica"
    Environment = var.environment
    Purpose     = "Disaster recovery replica of backups"
  })
}

resource "aws_s3_bucket_versioning" "backups_replica" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  provider = aws.replica
  bucket   = aws_s3_bucket.backups_replica[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "backups" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  bucket = aws_s3_bucket.backups.id
  role   = aws_iam_role.replication[0].arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_replica[0].arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [aws_s3_bucket_versioning.backups]
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  name = "${var.project_name}-${var.environment}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_policy" "replication" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  name = "${var.project_name}-${var.environment}-s3-replication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket",
        ]
        Resource = aws_s3_bucket.backups.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
        ]
        Resource = "${aws_s3_bucket.backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
        ]
        Resource = "${aws_s3_bucket.backups_replica[0].arn}/*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0

  role       = aws_iam_role.replication[0].name
  policy_arn = aws_iam_policy.replication[0].arn
}

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

output "artifacts_bucket_id" {
  description = "Artifacts bucket ID"
  value       = aws_s3_bucket.artifacts.id
}

output "artifacts_bucket_arn" {
  description = "Artifacts bucket ARN"
  value       = aws_s3_bucket.artifacts.arn
}

output "backups_bucket_id" {
  description = "Backups bucket ID"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "Backups bucket ARN"
  value       = aws_s3_bucket.backups.arn
}

output "logs_bucket_id" {
  description = "Logs bucket ID"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "Logs bucket ARN"
  value       = aws_s3_bucket.logs.arn
}

output "static_assets_bucket_id" {
  description = "Static assets bucket ID"
  value       = var.enable_static_website ? aws_s3_bucket.static_assets[0].id : null
}

output "static_assets_bucket_website_endpoint" {
  description = "Static assets bucket website endpoint"
  value       = var.enable_static_website ? aws_s3_bucket_website_configuration.static_assets[0].website_endpoint : null
}
