# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - COMPUTE MODULE VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "bizra-genesis-node"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "vpc_id" {
  description = "VPC ID where the cluster will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the cluster"
  type        = list(string)
}

variable "node_group_desired_size" {
  description = "Desired number of nodes in the general node group"
  type        = number
  default     = 3
}

variable "node_group_min_size" {
  description = "Minimum number of nodes in the general node group"
  type        = number
  default     = 2
}

variable "node_group_max_size" {
  description = "Maximum number of nodes in the general node group"
  type        = number
  default     = 10
}

variable "enable_spot_instances" {
  description = "Enable spot instances for compute-intensive workloads"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
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

variable "oidc_provider_arn" {
  description = "ARN of OIDC provider for IRSA (leave empty to create)"
  type        = string
  default     = ""
}

variable "oidc_provider" {
  description = "OIDC provider URL without https:// prefix"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
