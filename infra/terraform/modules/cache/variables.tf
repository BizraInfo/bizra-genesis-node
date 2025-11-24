# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - CACHE MODULE VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

variable "cache_name" {
  description = "Base name for cache resources"
  type        = string
  default     = "bizra"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the cache will be created"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of database subnet IDs for cache placement"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access the cache"
  type        = list(string)
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes (1 = no replication, 2+ = primary + replicas)"
  type        = number
  default     = 2
}

variable "redis_auth_token" {
  description = "Redis auth token for authentication"
  type        = string
  sensitive   = true
}

variable "enable_persistence" {
  description = "Enable Redis persistence (AOF)"
  type        = bool
  default     = false # Typically false for cache, true for session store
}

variable "kms_key_arn" {
  description = "ARN of KMS key for encryption"
  type        = string
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 7
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = ""
}

variable "notification_sns_topic_arn" {
  description = "SNS topic ARN for ElastiCache notifications"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
