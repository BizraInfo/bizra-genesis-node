# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - INFRASTRUCTURE AS CODE (Main Configuration)
# Multi-Cloud Terraform Configuration for AWS, GCP, and Azure
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote backend configuration (Terraform Cloud or S3)
  backend "s3" {
    bucket         = "bizra-terraform-state"
    key            = "genesis-node/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "bizra-terraform-locks"
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# PROVIDER CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "BIZRA-Genesis-Node"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# DATA SOURCES
# ═══════════════════════════════════════════════════════════════════════════

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# ═══════════════════════════════════════════════════════════════════════════
# LOCAL VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

locals {
  name_prefix = "bizra-${var.environment}"

  common_tags = {
    Project     = "BIZRA-Genesis-Node"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # Multi-AZ configuration
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# ═══════════════════════════════════════════════════════════════════════════
# MODULE IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

# Networking Module
module "networking" {
  source = "./modules/networking"

  environment = var.environment
  name_prefix = local.name_prefix

  # AWS VPC Configuration
  vpc_cidr             = var.vpc_cidr
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  single_nat_gateway   = var.environment != "production"

  # Multi-AZ deployment
  azs                  = local.azs
  private_subnets      = var.private_subnet_cidrs
  public_subnets       = var.public_subnet_cidrs
  database_subnets     = var.database_subnet_cidrs

  tags = local.common_tags
}

# Kubernetes Cluster Module (EKS on AWS)
module "eks_cluster" {
  source = "./modules/compute"
  count  = var.cloud_provider == "aws" ? 1 : 0

  environment = var.environment
  name_prefix = local.name_prefix

  # Cluster configuration
  cluster_version = var.kubernetes_version

  # Networking
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids

  # Node groups
  node_groups = {
    general = {
      desired_size = var.node_group_desired_size
      max_size     = var.node_group_max_size
      min_size     = var.node_group_min_size

      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "general"
      }

      tags = {
        NodeGroup = "general"
      }
    }

    compute_optimized = {
      desired_size = 2
      max_size     = 10
      min_size     = 2

      instance_types = ["c6i.2xlarge"]
      capacity_type  = "SPOT"

      labels = {
        role = "compute"
        workload = "synthesis"
      }

      taints = [{
        key    = "workload"
        value  = "synthesis"
        effect = "NoSchedule"
      }]
    }
  }

  tags = local.common_tags
}

# Database Module (RDS PostgreSQL)
module "database" {
  source = "./modules/database"

  environment = var.environment
  name_prefix = local.name_prefix

  # Database configuration
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true

  # High availability
  multi_az               = var.environment == "production"
  backup_retention_period = var.db_backup_retention_days

  # Networking
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.database_subnet_ids
  allowed_cidr_blocks = module.networking.private_subnet_cidrs

  # Performance
  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = local.common_tags
}

# Redis Cache Module
module "redis" {
  source = "./modules/cache"

  environment = var.environment
  name_prefix = local.name_prefix

  # Redis configuration
  node_type             = var.redis_node_type
  num_cache_nodes       = var.redis_num_nodes
  parameter_group_family = "redis7"
  engine_version        = "7.1"

  # High availability
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"

  # Networking
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.database_subnet_ids

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = local.common_tags
}

# Storage Module (S3)
module "storage" {
  source = "./modules/storage"

  environment = var.environment
  name_prefix = local.name_prefix

  # Buckets
  create_artifacts_bucket  = true
  create_backups_bucket    = true
  create_logs_bucket       = true

  # Lifecycle policies
  artifacts_lifecycle_days = 90
  backups_lifecycle_days   = 180
  logs_lifecycle_days      = 30

  # Security
  enable_versioning        = var.environment == "production"
  enable_encryption        = true
  block_public_access      = true

  tags = local.common_tags
}

# Monitoring Module (Prometheus, Grafana)
module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment
  name_prefix = local.name_prefix

  # Prometheus
  prometheus_retention_days = 15
  prometheus_storage_size   = "50Gi"

  # Grafana
  grafana_admin_password = var.grafana_admin_password

  # Alert Manager
  enable_alertmanager = true
  alertmanager_config = {
    slack_webhook_url = var.slack_webhook_url
    pagerduty_key    = var.pagerduty_key
  }

  tags = local.common_tags
}

# Security Module (Secrets, Encryption)
module "security" {
  source = "./modules/security"

  environment = var.environment
  name_prefix = local.name_prefix

  # KMS encryption keys
  create_database_key = true
  create_storage_key  = true
  create_secrets_key  = true

  # Key rotation
  enable_key_rotation = true

  # Secrets Manager
  secrets = {
    database_password = {
      description = "PostgreSQL master password"
      length      = 32
    }
    jwt_secret = {
      description = "JWT signing secret"
      length      = 64
    }
    encryption_key = {
      description = "Application encryption key"
      length      = 32
    }
  }

  tags = local.common_tags
}

# ═══════════════════════════════════════════════════════════════════════════
# OUTPUTS
# ═══════════════════════════════════════════════════════════════════════════

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = var.cloud_provider == "aws" ? module.eks_cluster[0].cluster_endpoint : null
  sensitive   = true
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "artifacts_bucket" {
  description = "S3 bucket for artifacts"
  value       = module.storage.artifacts_bucket_name
}

output "monitoring_urls" {
  description = "Monitoring service URLs"
  value = {
    prometheus = module.monitoring.prometheus_url
    grafana    = module.monitoring.grafana_url
  }
}
