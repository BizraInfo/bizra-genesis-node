# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - TERRAFORM VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# GENERAL
# ─────────────────────────────────────────────────────────────────────────────

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production"
  }
}

variable "cloud_provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string
  default     = "aws"

  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be aws, gcp, or azure"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# AWS CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# ─────────────────────────────────────────────────────────────────────────────
# GCP CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = "bizra-genesis-node"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

# ─────────────────────────────────────────────────────────────────────────────
# KUBERNETES CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_group_desired_size" {
  description = "Desired number of nodes in the default node group"
  type        = number
  default     = 3
}

variable "node_group_min_size" {
  description = "Minimum number of nodes in the default node group"
  type        = number
  default     = 2
}

variable "node_group_max_size" {
  description = "Maximum number of nodes in the default node group"
  type        = number
  default     = 10
}

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"

  validation {
    condition     = can(regex("^db\\.", var.db_instance_class))
    error_message = "Instance class must start with 'db.'"
  }
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 and 65536 GB"
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in GB"
  type        = number
  default     = 1000
}

variable "db_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# REDIS CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2

  validation {
    condition     = var.redis_num_nodes >= 1 && var.redis_num_nodes <= 6
    error_message = "Number of nodes must be between 1 and 6"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# MONITORING CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = null
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pagerduty_key" {
  description = "PagerDuty integration key"
  type        = string
  sensitive   = true
  default     = ""
}

# ─────────────────────────────────────────────────────────────────────────────
# FEATURE FLAGS
# ─────────────────────────────────────────────────────────────────────────────

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

variable "enable_disaster_recovery" {
  description = "Enable disaster recovery setup"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for compute resources"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

# ─────────────────────────────────────────────────────────────────────────────
# COST OPTIMIZATION
# ─────────────────────────────────────────────────────────────────────────────

variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "use_spot_instances" {
  description = "Use spot instances for non-critical workloads"
  type        = bool
  default     = true
}

variable "schedule_shutdown" {
  description = "Schedule for automatic shutdown (dev/staging only)"
  type = object({
    enabled    = bool
    start_time = string
    stop_time  = string
  })
  default = {
    enabled    = false
    start_time = "09:00"
    stop_time  = "18:00"
  }
}
