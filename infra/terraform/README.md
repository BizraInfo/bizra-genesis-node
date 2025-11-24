# BIZRA Genesis Node - Terraform Infrastructure

Enterprise-grade Infrastructure-as-Code for multi-cloud deployment of BIZRA Genesis Node.

## 📋 Overview

This Terraform configuration provides production-ready infrastructure for deploying BIZRA Genesis Node across multiple cloud providers (AWS, GCP, Azure) with:

- **Multi-cloud support**: AWS (primary), GCP, Azure
- **Kubernetes orchestration**: EKS, GKE, AKS
- **Database**: PostgreSQL on RDS with Multi-AZ
- **Caching**: Redis on ElastiCache with replication
- **Storage**: S3 buckets with lifecycle policies
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Security**: KMS encryption, Secrets Manager, GuardDuty
- **GitOps**: ArgoCD application definitions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MULTI-CLOUD INFRASTRUCTURE              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   COMPUTE    │  │   DATABASE   │  │    CACHE     │     │
│  │              │  │              │  │              │     │
│  │  EKS/GKE     │  │  RDS Postgres│  │  ElastiCache │     │
│  │  Cluster     │  │  Multi-AZ    │  │  Redis       │     │
│  │  Auto-scaling│  │  Read Replica│  │  Replication │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   STORAGE    │  │  MONITORING  │  │   SECURITY   │     │
│  │              │  │              │  │              │     │
│  │  S3 Buckets  │  │  Prometheus  │  │  KMS Keys    │     │
│  │  Lifecycle   │  │  Grafana     │  │  Secrets Mgr │     │
│  │  Encryption  │  │  AlertMgr    │  │  GuardDuty   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
infra/terraform/
├── main.tf                      # Root module configuration
├── variables.tf                 # Input variables
├── outputs.tf                   # Output values
├── terraform.tfvars.example     # Example variable values
├── providers.tf                 # Provider configurations
├── README.md                    # This file
│
├── modules/
│   ├── networking/              # VPC, subnets, security groups
│   │   ├── main.tf
│   │   └── variables.tf
│   │
│   ├── compute/                 # EKS cluster and node groups
│   │   ├── main.tf
│   │   └── variables.tf
│   │
│   ├── database/                # RDS PostgreSQL
│   │   ├── main.tf
│   │   └── variables.tf
│   │
│   ├── cache/                   # ElastiCache Redis
│   │   ├── main.tf
│   │   └── variables.tf
│   │
│   ├── storage/                 # S3 buckets
│   │   ├── main.tf
│   │   └── variables.tf
│   │
│   ├── monitoring/              # Prometheus, Grafana
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── values/              # Helm values
│   │   ├── dashboards/          # Grafana dashboards
│   │   └── configs/             # AlertManager configs
│   │
│   └── security/                # KMS, Secrets Manager
│       ├── main.tf
│       └── variables.tf
│
└── environments/
    ├── dev.tfvars
    ├── staging.tfvars
    └── production.tfvars
```

## 🚀 Quick Start

### Prerequisites

- Terraform >= 1.6.0
- AWS CLI configured with credentials
- kubectl installed
- helm installed

### 1. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

### 2. Create Environment Variables File

```bash
cp terraform.tfvars.example environments/dev.tfvars
```

Edit `environments/dev.tfvars` with your values:

```hcl
environment     = "dev"
cloud_provider  = "aws"
aws_region      = "us-east-1"

# VPC Configuration
vpc_cidr              = "10.0.0.0/16"
private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnet_cidrs = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# Compute
kubernetes_version      = "1.28"
node_group_desired_size = 3
node_group_min_size     = 2
node_group_max_size     = 10

# Database
db_instance_class        = "db.t3.large"
db_allocated_storage     = 100
db_max_allocated_storage = 1000

# Feature Flags
enable_multi_region      = false
enable_disaster_recovery = false
enable_auto_scaling      = true
enable_monitoring        = true
```

### 3. Plan Deployment

```bash
terraform plan -var-file=environments/dev.tfvars
```

### 4. Apply Infrastructure

```bash
terraform apply -var-file=environments/dev.tfvars
```

### 5. Configure kubectl

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name bizra-genesis-node-dev
```

## 🔐 Security Best Practices

### 1. Secrets Management

Never commit sensitive values to git. Use:

- **AWS Secrets Manager**: For application secrets
- **Environment variables**: For Terraform variables
- **Encrypted tfstate**: Store state in S3 with encryption

```bash
# Set sensitive variables via environment
export TF_VAR_grafana_admin_password="<secure-password>"
export TF_VAR_slack_webhook_url="<webhook-url>"
export TF_VAR_pagerduty_key="<integration-key>"
```

### 2. Remote State Backend

Configure S3 backend for state storage:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "bizra-terraform-state"
    key            = "genesis-node/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID"
    dynamodb_table = "terraform-state-lock"
  }
}
```

### 3. State Locking

Create DynamoDB table for state locking:

```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## 🌍 Multi-Cloud Deployment

### AWS (Primary)

```bash
terraform apply -var-file=environments/production.tfvars -var="cloud_provider=aws"
```

### GCP

```bash
terraform apply -var-file=environments/production.tfvars -var="cloud_provider=gcp"
```

### Azure

```bash
terraform apply -var-file=environments/production.tfvars -var="cloud_provider=azure"
```

## 📊 Monitoring & Observability

After deployment, access monitoring stack:

```bash
# Port-forward Grafana
kubectl port-forward -n bizra-monitoring svc/prometheus-stack-grafana 3000:80

# Access Grafana at http://localhost:3000
# Default credentials: admin / <grafana_admin_password>

# Port-forward Prometheus
kubectl port-forward -n bizra-monitoring svc/prometheus-stack-kube-prom-prometheus 9090:9090
```

## 🔄 Disaster Recovery

### Database Backups

Automated backups are enabled:

- **Backup window**: 03:00-04:00 UTC
- **Retention**: 7 days (dev/staging), 30 days (production)
- **Point-in-time recovery**: Enabled for production

### Cross-Region Replication

Enable for production:

```hcl
enable_disaster_recovery = true
enable_multi_region      = true
```

## 📈 Cost Optimization

### Development Environment

```hcl
# Use smaller instances
db_instance_class = "db.t3.medium"
redis_node_type   = "cache.t3.small"

# Enable spot instances
use_spot_instances = true

# Scheduled shutdown (weekdays only)
schedule_shutdown = {
  enabled    = true
  start_time = "09:00"
  stop_time  = "18:00"
}
```

### Production Environment

```hcl
# Use production-grade instances
db_instance_class = "db.r6g.xlarge"
redis_node_type   = "cache.r6g.large"

# Enable reserved instances for cost savings
# Purchase via AWS Console

# Enable auto-scaling
enable_auto_scaling = true
```

## 🧪 Testing Infrastructure

### Validation

```bash
terraform validate
terraform fmt -check
```

### Security Scanning

```bash
# Install tfsec
brew install tfsec

# Scan for security issues
tfsec .
```

### Cost Estimation

```bash
# Install infracost
brew install infracost

# Estimate costs
infracost breakdown --path .
```

## 🔧 Maintenance

### Updating Modules

```bash
# Update all modules
terraform get -update

# Refresh state
terraform refresh
```

### Destroying Infrastructure

```bash
# Destroy specific environment
terraform destroy -var-file=environments/dev.tfvars

# WARNING: This will delete ALL resources
# Production requires confirmation prompts
```

## 📚 Module Documentation

### Networking Module

Creates VPC with public, private, and database subnets across 3 availability zones.

**Inputs:**
- `vpc_cidr`: VPC CIDR block
- `private_subnet_cidrs`: Private subnet CIDRs
- `public_subnet_cidrs`: Public subnet CIDRs
- `database_subnet_cidrs`: Database subnet CIDRs

**Outputs:**
- `vpc_id`: VPC ID
- `private_subnet_ids`: Private subnet IDs
- `public_subnet_ids`: Public subnet IDs

### Compute Module

Deploys EKS cluster with general and compute-optimized node groups.

**Inputs:**
- `kubernetes_version`: Kubernetes version
- `node_group_desired_size`: Desired node count
- `enable_spot_instances`: Use spot instances

**Outputs:**
- `cluster_id`: EKS cluster ID
- `cluster_endpoint`: Kubernetes API endpoint

### Database Module

Provisions RDS PostgreSQL with Multi-AZ, backups, and monitoring.

**Inputs:**
- `db_instance_class`: RDS instance type
- `db_allocated_storage`: Storage in GB
- `enable_read_replica`: Create read replica

**Outputs:**
- `db_instance_endpoint`: Database connection endpoint
- `db_password_secret_arn`: Secrets Manager ARN

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run validation: `terraform validate && terraform fmt`
4. Test in dev environment
5. Submit pull request

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/BizraInfo/bizra-genesis-node/issues
- Documentation: https://docs.bizra.ai

## 📄 License

Copyright © 2025 BIZRA. All rights reserved.
