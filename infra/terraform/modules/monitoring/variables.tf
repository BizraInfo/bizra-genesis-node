# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - MONITORING MODULE VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "prometheus_retention_days" {
  description = "Number of days to retain Prometheus metrics"
  type        = number
  default     = 15
}

variable "prometheus_storage_size" {
  description = "Prometheus storage size in GB"
  type        = number
  default     = 50
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pagerduty_service_key" {
  description = "PagerDuty service integration key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_cloudwatch_integration" {
  description = "Enable CloudWatch metrics integration"
  type        = bool
  default     = true
}

variable "aws_region" {
  description = "AWS region for CloudWatch integration"
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
