# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - DATABASE MODULE (RDS PostgreSQL)
# Production-grade PostgreSQL database with high availability
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# DB SUBNET GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.db_name}-${var.environment}"
  subnet_ids = var.database_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.db_name}-${var.environment}"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# SECURITY GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_security_group" "database" {
  name        = "${var.db_name}-${var.environment}-db-sg"
  description = "Security group for RDS PostgreSQL database"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "PostgreSQL access from allowed security groups"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name        = "${var.db_name}-${var.environment}-db-sg"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# DB PARAMETER GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_parameter_group" "main" {
  name   = "${var.db_name}-${var.environment}-pg16"
  family = "postgres16"

  # Performance tuning parameters
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of instance memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2048}" # 50% of instance memory
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "1048576" # 1GB in KB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16384" # 16MB in 8KB units
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1" # Assuming SSD storage
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200" # SSD-optimized
  }

  parameter {
    name  = "work_mem"
    value = "10485" # ~10MB per operation
  }

  parameter {
    name  = "min_wal_size"
    value = "1024" # 1GB
  }

  parameter {
    name  = "max_wal_size"
    value = "4096" # 4GB
  }

  # Logging and monitoring
  parameter {
    name  = "log_min_duration_statement"
    value = var.environment == "production" ? "1000" : "500" # Log slow queries
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_temp_files"
    value = "0" # Log all temp file usage
  }

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# RANDOM PASSWORD GENERATION
# ─────────────────────────────────────────────────────────────────────────────

resource "random_password" "master_password" {
  length  = 32
  special = true
  # Exclude characters that might cause issues in connection strings
  override_special = "!#$%^&*()-_=+[]{}:?"
}

# ─────────────────────────────────────────────────────────────────────────────
# SECRETS MANAGER SECRET
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.db_name}-${var.environment}-master-password"
  description             = "Master password for ${var.db_name} ${var.environment} database"
  recovery_window_in_days = var.environment == "production" ? 30 : 7
  kms_key_id              = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.master_password.result
}

# ─────────────────────────────────────────────────────────────────────────────
# RDS INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier     = "${var.db_name}-${var.environment}"
  engine         = "postgres"
  engine_version = var.db_engine_version

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn
  iops                  = var.db_iops
  storage_throughput    = 125 # MB/s for gp3

  db_name  = var.db_database_name
  username = var.db_username
  password = random_password.master_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  # High Availability
  multi_az               = var.environment == "production" ? true : false
  availability_zone      = var.environment == "production" ? null : var.availability_zone
  publicly_accessible    = false
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  # Backup configuration
  backup_retention_period   = var.db_backup_retention_days
  backup_window             = "03:00-04:00" # UTC
  maintenance_window        = "Mon:04:00-Mon:05:00" # UTC
  delete_automated_backups  = var.environment == "production" ? false : true
  copy_tags_to_snapshot     = true
  skip_final_snapshot       = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.db_name}-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Enhanced monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn             = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? 7 : null
  performance_insights_kms_key_id       = var.enable_performance_insights ? var.kms_key_arn : null

  # Maintenance
  auto_minor_version_upgrade = var.environment == "production" ? false : true
  allow_major_version_upgrade = false
  apply_immediately          = var.environment == "production" ? false : true
  deletion_protection        = var.environment == "production" ? true : false

  tags = merge(var.tags, {
    Name        = "${var.db_name}-${var.environment}"
    Environment = var.environment
  })

  lifecycle {
    ignore_changes = [
      password, # Managed by Secrets Manager
    ]
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# IAM ROLE FOR ENHANCED MONITORING
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${var.db_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ─────────────────────────────────────────────────────────────────────────────
# READ REPLICA (Production only)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_instance" "replica" {
  count = var.environment == "production" && var.enable_read_replica ? 1 : 0

  identifier             = "${var.db_name}-${var.environment}-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = var.db_instance_class
  publicly_accessible    = false
  skip_final_snapshot    = true
  backup_retention_period = 0 # Replicas don't need independent backups

  # Performance Insights
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? 7 : null
  performance_insights_kms_key_id       = var.enable_performance_insights ? var.kms_key_arn : null

  # Enhanced monitoring
  monitoring_interval = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  auto_minor_version_upgrade = false
  apply_immediately          = false

  tags = merge(var.tags, {
    Name        = "${var.db_name}-${var.environment}-replica"
    Environment = var.environment
    Role        = "read-replica"
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDWATCH ALARMS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.db_name}-${var.environment}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${var.db_name}-${var.environment}-free-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "${var.db_name}-${var.environment}-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "536870912" # 512MB in bytes
  alarm_description   = "This metric monitors RDS freeable memory"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_endpoint" {
  description = "RDS instance connection endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "db_instance_address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the database password"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_security_group_id" {
  description = "Security group ID for the database"
  value       = aws_security_group.database.id
}

output "db_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.environment == "production" && var.enable_read_replica ? aws_db_instance.replica[0].endpoint : null
}

output "connection_string" {
  description = "PostgreSQL connection string (password from Secrets Manager)"
  value       = "postgresql://${aws_db_instance.main.username}:<PASSWORD>@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}
