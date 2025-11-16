# ═══════════════════════════════════════════════════════════════════════════
# BIZRA GENESIS NODE - MONITORING MODULE
# Prometheus, Grafana, and alerting infrastructure
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# NAMESPACE
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "bizra-monitoring"

    labels = {
      name        = "bizra-monitoring"
      environment = var.environment
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PROMETHEUS STACK (kube-prometheus-stack)
# ─────────────────────────────────────────────────────────────────────────────

resource "helm_release" "prometheus_stack" {
  name       = "prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    templatefile("${path.module}/values/prometheus-stack.yaml", {
      environment           = var.environment
      grafana_admin_password = var.grafana_admin_password
      retention_days        = var.prometheus_retention_days
      storage_size          = var.prometheus_storage_size
      slack_webhook_url     = var.slack_webhook_url
      pagerduty_service_key = var.pagerduty_service_key
    })
  ]

  set {
    name  = "prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage"
    value = "${var.prometheus_storage_size}Gi"
  }

  set {
    name  = "prometheus.prometheusSpec.retention"
    value = "${var.prometheus_retention_days}d"
  }

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }

  depends_on = [kubernetes_namespace.monitoring]
}

# ─────────────────────────────────────────────────────────────────────────────
# GRAFANA DASHBOARDS
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_config_map" "grafana_dashboards" {
  metadata {
    name      = "grafana-custom-dashboards"
    namespace = kubernetes_namespace.monitoring.metadata[0].name

    labels = {
      grafana_dashboard = "1"
    }
  }

  data = {
    "bizra-overview.json"        = file("${path.module}/dashboards/bizra-overview.json")
    "bizra-consensus.json"       = file("${path.module}/dashboards/bizra-consensus.json")
    "bizra-routing.json"         = file("${path.module}/dashboards/bizra-routing.json")
    "bizra-synthesis.json"       = file("${path.module}/dashboards/bizra-synthesis.json")
    "bizra-infrastructure.json"  = file("${path.module}/dashboards/bizra-infrastructure.json")
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PROMETHEUS RULES (Custom alerts)
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_manifest" "prometheus_rules" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "bizra-alerts"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        prometheus = "kube-prometheus"
      }
    }
    spec = {
      groups = [
        {
          name     = "bizra.synthesis"
          interval = "30s"
          rules = [
            {
              alert = "HighSynthesisLatency"
              expr  = "histogram_quantile(0.95, rate(synthesis_duration_seconds_bucket[5m])) > 2"
              for   = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "High synthesis latency detected"
                description = "P95 synthesis latency is {{ $value }}s (threshold: 2s)"
              }
            },
            {
              alert = "SynthesisFailureRate"
              expr  = "rate(synthesis_errors_total[5m]) / rate(synthesis_requests_total[5m]) > 0.05"
              for   = "5m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary     = "High synthesis failure rate"
                description = "Synthesis error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
              }
            },
          ]
        },
        {
          name     = "bizra.consensus"
          interval = "30s"
          rules = [
            {
              alert = "ConsensusTimeout"
              expr  = "rate(consensus_timeouts_total[5m]) > 0.01"
              for   = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "Consensus timeouts detected"
                description = "Consensus timeout rate: {{ $value }}/s"
              }
            },
            {
              alert = "LowIhsanScore"
              expr  = "avg(ihsan_score) < 0.7"
              for   = "10m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary     = "Ihsan score below threshold"
                description = "Average Ihsan score is {{ $value }} (threshold: 0.7)"
              }
            },
          ]
        },
        {
          name     = "bizra.infrastructure"
          interval = "30s"
          rules = [
            {
              alert = "HighPodMemoryUsage"
              expr  = "container_memory_usage_bytes{namespace=\"bizra-production\"} / container_spec_memory_limit_bytes{namespace=\"bizra-production\"} > 0.9"
              for   = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "Pod memory usage above 90%"
                description = "Pod {{ $labels.pod }} memory usage: {{ $value | humanizePercentage }}"
              }
            },
            {
              alert = "HighCPUUsage"
              expr  = "rate(container_cpu_usage_seconds_total{namespace=\"bizra-production\"}[5m]) > 0.8"
              for   = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "Pod CPU usage above 80%"
                description = "Pod {{ $labels.pod }} CPU usage: {{ $value | humanizePercentage }}"
              }
            },
            {
              alert = "DatabaseConnectionPoolExhaustion"
              expr  = "db_pool_connections_idle / db_pool_connections_max < 0.1"
              for   = "5m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary     = "Database connection pool near exhaustion"
                description = "Only {{ $value | humanizePercentage }} of pool connections idle"
              }
            },
          ]
        },
      ]
    }
  }

  depends_on = [helm_release.prometheus_stack]
}

# ─────────────────────────────────────────────────────────────────────────────
# ALERTMANAGER CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_secret" "alertmanager_config" {
  metadata {
    name      = "alertmanager-custom-config"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  data = {
    "alertmanager.yaml" = templatefile("${path.module}/configs/alertmanager.yaml", {
      slack_webhook_url     = var.slack_webhook_url
      pagerduty_service_key = var.pagerduty_service_key
      environment           = var.environment
    })
  }

  type = "Opaque"
}

# ─────────────────────────────────────────────────────────────────────────────
# SERVICE MONITOR (Custom metrics endpoints)
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_manifest" "bizra_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "bizra-genesis-node"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        app = "bizra-genesis-node"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "bizra-genesis-node"
        }
      }
      namespaceSelector = {
        matchNames = ["bizra-production"]
      }
      endpoints = [
        {
          port     = "metrics"
          interval = "30s"
          path     = "/metrics"
        }
      ]
    }
  }

  depends_on = [helm_release.prometheus_stack]
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDWATCH INTEGRATION (AWS metrics)
# ─────────────────────────────────────────────────────────────────────────────

resource "helm_release" "cloudwatch_exporter" {
  count = var.enable_cloudwatch_integration ? 1 : 0

  name       = "cloudwatch-exporter"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-cloudwatch-exporter"
  version    = "0.25.3"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    templatefile("${path.module}/values/cloudwatch-exporter.yaml", {
      aws_region = var.aws_region
    })
  ]

  depends_on = [helm_release.prometheus_stack]
}

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUTS
# ─────────────────────────────────────────────────────────────────────────────

output "monitoring_namespace" {
  description = "Monitoring namespace name"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

output "prometheus_url" {
  description = "Prometheus URL (internal)"
  value       = "http://prometheus-stack-kube-prom-prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9090"
}

output "grafana_url" {
  description = "Grafana URL (internal)"
  value       = "http://prometheus-stack-grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:80"
}

output "alertmanager_url" {
  description = "Alertmanager URL (internal)"
  value       = "http://prometheus-stack-kube-prom-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9093"
}
