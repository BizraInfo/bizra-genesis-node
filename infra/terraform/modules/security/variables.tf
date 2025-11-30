# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - SECURITY MODULE VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "bizra-genesis-node"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "enable_multi_region" {
  description = "Enable multi-region KMS keys"
  type        = bool
  default     = false
}

variable "enable_secret_rotation" {
  description = "Enable automatic secret rotation"
  type        = bool
  default     = false
}

variable "rotation_lambda_arn" {
  description = "ARN of Lambda function for secret rotation"
  type        = string
  default     = ""
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "cloudtrail_bucket_name" {
  description = "S3 bucket name for CloudTrail logs"
  type        = string
  default     = ""
}

variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_aws_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "config_role_arn" {
  description = "IAM role ARN for AWS Config"
  type        = string
  default     = ""
}

variable "config_bucket_name" {
  description = "S3 bucket name for AWS Config snapshots"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
