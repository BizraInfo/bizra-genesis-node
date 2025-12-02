# BIZRA Node0 - Terraform Infrastructure
# Elite IaC: Reproducible, Version-Controlled Infrastructure
# Target: Azure (Sovereign Cloud Deployment)

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12.0"
    }
  }
  
  backend "azurerm" {
    resource_group_name  = "bizra-tfstate-rg"
    storage_account_name = "bizratfstate"
    container_name       = "tfstate"
    key                  = "bizra-node0.tfstate"
  }
}

# ============================================
# VARIABLES
# ============================================
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus2"
}

variable "node_count" {
  description = "Number of AKS nodes"
  type        = number
  default     = 3
}

variable "node_vm_size" {
  description = "AKS node VM size"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "gpu_node_count" {
  description = "Number of GPU nodes for AI workloads"
  type        = number
  default     = 1
}

variable "gpu_vm_size" {
  description = "GPU node VM size"
  type        = string
  default     = "Standard_NC6s_v3" # NVIDIA V100
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = "BIZRA-Node0"
    ManagedBy   = "Terraform"
    Sovereignty = "Local-First"
  }
  
  resource_prefix = "bizra-${var.environment}"
}

# ============================================
# PROVIDER CONFIGURATION
# ============================================
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# ============================================
# RESOURCE GROUP
# ============================================
resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ============================================
# NETWORKING
# ============================================
resource "azurerm_virtual_network" "main" {
  name                = "${local.resource_prefix}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "postgres" {
  name                 = "postgres-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
  
  delegation {
    name = "postgres-delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "redis" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]
}

# ============================================
# AZURE KUBERNETES SERVICE (AKS)
# ============================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.resource_prefix}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${local.resource_prefix}-dns"
  kubernetes_version  = "1.28"
  
  default_node_pool {
    name                = "system"
    node_count          = var.node_count
    vm_size             = var.node_vm_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 10
    
    node_labels = {
      "nodepool-type" = "system"
      "workload"      = "general"
    }
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }
  
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }
  
  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }
  
  tags = local.common_tags
}

# GPU Node Pool for AI Workloads
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.gpu_vm_size
  node_count            = var.gpu_node_count
  vnet_subnet_id        = azurerm_subnet.aks.id
  
  node_labels = {
    "nodepool-type" = "gpu"
    "workload"      = "ai"
    "gpu"           = "nvidia"
  }
  
  node_taints = [
    "nvidia.com/gpu=present:NoSchedule"
  ]
  
  tags = local.common_tags
}

# ============================================
# POSTGRESQL FLEXIBLE SERVER
# ============================================
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.resource_prefix}-postgres"
  location               = azurerm_resource_group.main.location
  resource_group_name    = azurerm_resource_group.main.name
  version                = "16"
  delegated_subnet_id    = azurerm_subnet.postgres.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  administrator_login    = "bizra_admin"
  administrator_password = random_password.postgres.result
  zone                   = "1"
  
  storage_mb = 32768
  sku_name   = "GP_Standard_D4s_v3"
  
  backup_retention_days        = 35
  geo_redundant_backup_enabled = var.environment == "production"
  
  high_availability {
    mode                      = var.environment == "production" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.environment == "production" ? "2" : null
  }
  
  tags = local.common_tags
  
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "bizra.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.main.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "azurerm_postgresql_flexible_server_database" "bizra" {
  name      = "bizra_genesis"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ============================================
# REDIS CACHE
# ============================================
resource "azurerm_redis_cache" "main" {
  name                = "${local.resource_prefix}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  
  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
  
  tags = local.common_tags
}

# ============================================
# KEY VAULT
# ============================================
resource "azurerm_key_vault" "main" {
  name                = "${local.resource_prefix}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
  
  enabled_for_disk_encryption     = true
  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  purge_protection_enabled        = true
  soft_delete_retention_days      = 90
  
  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    ip_rules       = []
  }
  
  tags = local.common_tags
}

# ============================================
# CONTAINER REGISTRY
# ============================================
resource "azurerm_container_registry" "main" {
  name                = replace("${local.resource_prefix}acr", "-", "")
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Premium"
  admin_enabled       = false
  
  georeplications {
    location                = "westus2"
    zone_redundancy_enabled = true
  }
  
  tags = local.common_tags
}

# ============================================
# LOG ANALYTICS
# ============================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  
  tags = local.common_tags
}

# ============================================
# APPLICATION INSIGHTS
# ============================================
resource "azurerm_application_insights" "main" {
  name                = "${local.resource_prefix}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  
  tags = local.common_tags
}

# ============================================
# SECRETS
# ============================================
resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-admin-password"
  value        = random_password.postgres.result
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================
# DATA SOURCES
# ============================================
data "azurerm_client_config" "current" {}

# ============================================
# OUTPUTS
# ============================================
output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_fqdn" {
  description = "AKS cluster FQDN"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "acr_login_server" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = azurerm_redis_cache.main.hostname
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}
