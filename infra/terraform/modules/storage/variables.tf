# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - STORAGE MODULE VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

variable "project_name" {
  description = "Project name for bucket naming"
  type        = string
  default     = "bizra-genesis-node"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of KMS key for encryption"
  type        = string
}

variable "enable_static_website" {
  description = "Enable static website hosting bucket"
  type        = bool
  default     = false
}

variable "enable_replication" {
  description = "Enable cross-region replication for backups (production only)"
  type        = bool
  default     = false
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for static assets"
  type        = list(string)
  default     = ["*"]
}

variable "cloudfront_oai_iam_arn" {
  description = "IAM ARN of CloudFront Origin Access Identity"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
