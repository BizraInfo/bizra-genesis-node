# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - CACHE MODULE (ElastiCache Redis)
# High-performance in-memory cache for sessions and data
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# SUBNET GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.cache_name}-${var.environment}"
  subnet_ids = var.database_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.cache_name}-${var.environment}"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# SECURITY GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_security_group" "redis" {
  name        = "${var.cache_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "Redis access from allowed security groups"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name        = "${var.cache_name}-${var.environment}-redis-sg"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# PARAMETER GROUP
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.cache_name}-${var.environment}-redis7"
  family = "redis7"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru" # Evict least recently used keys when memory is full
  }

  # Persistence
  parameter {
    name  = "appendonly"
    value = var.enable_persistence ? "yes" : "no"
  }

  parameter {
    name  = "appendfsync"
    value = var.enable_persistence ? "everysec" : "no" # Balance durability and performance
  }

  # Connection timeout
  parameter {
    name  = "timeout"
    value = "300" # 5 minutes
  }

  # Slow log
  parameter {
    name  = "slowlog-log-slower-than"
    value = "10000" # 10ms in microseconds
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }

  # TCP keepalive
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# REPLICATION GROUP (Cluster Mode Disabled)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.cache_name}-${var.environment}"
  replication_group_description = "Redis cluster for ${var.cache_name} ${var.environment}"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_nodes
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # High availability
  automatic_failover_enabled = var.redis_num_nodes > 1 ? true : false
  multi_az_enabled          = var.environment == "production" && var.redis_num_nodes > 1 ? true : false

  # Maintenance and backup
  maintenance_window         = "mon:03:00-mon:04:00" # UTC
  snapshot_window            = "02:00-03:00" # UTC
  snapshot_retention_limit   = var.environment == "production" ? 7 : 1
  final_snapshot_identifier  = var.environment == "production" ? "${var.cache_name}-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Encryption
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = var.redis_auth_token

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  # Upgrades
  auto_minor_version_upgrade = var.environment == "production" ? false : true
  apply_immediately          = var.environment == "production" ? false : true

  # Notifications
  notification_topic_arn = var.notification_sns_topic_arn != "" ? var.notification_sns_topic_arn : null

  tags = merge(var.tags, {
    Name        = "${var.cache_name}-${var.environment}"
    Environment = var.environment
  })

  lifecycle {
    ignore_changes = [
      auth_token, # Managed externally via Secrets Manager
    ]
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDWATCH LOG GROUPS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.cache_name}-${var.environment}/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.cache_name}-${var.environment}/engine-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDWATCH ALARMS
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.cache_name}-${var.environment}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.cache_name}-${var.environment}-database-memory-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.cache_name}-${var.environment}-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "This metric monitors Redis key evictions"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${var.cache_name}-${var.environment}-current-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000"
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

output "redis_replication_group_id" {
  description = "Redis replication group ID"
  value       = aws_elasticache_replication_group.main.id
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint address (for read replicas)"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint (cluster mode enabled)"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

output "connection_string" {
  description = "Redis connection string (with TLS)"
  value       = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive   = true
}
