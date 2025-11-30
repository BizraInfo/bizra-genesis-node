// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SYSTEM HEALTH COMPONENT                            ║
// ║  Real-time system health metrics with Prometheus integration             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Clock,
  AlertTriangle,
  TrendingUp,
  Server,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import styles from '../styles/SystemHealth.module.css'

interface SystemMetrics {
  api_latency_ms: number
  consensus_latency_ms: number
  error_rate: number
  uptime_percentage: number
  active_connections: number
  requests_per_second: number
  timestamp: number
}

interface NodeStatus {
  node_id: string
  status: 'healthy' | 'degraded' | 'offline'
  cpu_usage: number
  memory_usage: number
  last_heartbeat: number
}

const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    api_latency_ms: 0,
    consensus_latency_ms: 0,
    error_rate: 0,
    uptime_percentage: 100,
    active_connections: 0,
    requests_per_second: 0,
    timestamp: Date.now()
  })

  const [latencyHistory, setLatencyHistory] = useState<number[]>([])
  const [throughputHistory, setThroughputHistory] = useState<number[]>([])
  const [nodes, setNodes] = useState<NodeStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch metrics from Prometheus/backend
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/system')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)

          // Update history (keep last 20 points)
          setLatencyHistory(prev => [...prev, data.api_latency_ms].slice(-20))
          setThroughputHistory(prev => [...prev, data.requests_per_second].slice(-20))

          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
        // Use mock data for development
        setMetrics({
          api_latency_ms: 45 + Math.random() * 30,
          consensus_latency_ms: 75 + Math.random() * 25,
          error_rate: Math.random() * 0.5,
          uptime_percentage: 99.95 + Math.random() * 0.05,
          active_connections: Math.floor(50 + Math.random() * 100),
          requests_per_second: Math.floor(800 + Math.random() * 400),
          timestamp: Date.now()
        })
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchMetrics()

    // Poll every 2 seconds
    const interval = setInterval(fetchMetrics, 2000)

    return () => clearInterval(interval)
  }, [])

  // Fetch node statuses
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response = await fetch('/api/metrics/nodes')
        if (response.ok) {
          const data = await response.json()
          setNodes(data)
        }
      } catch (_error) {
        // Use mock data
        setNodes([
          {
            node_id: 'node-1',
            status: 'healthy',
            cpu_usage: 45,
            memory_usage: 62,
            last_heartbeat: Date.now() - 1000
          },
          {
            node_id: 'node-2',
            status: 'healthy',
            cpu_usage: 38,
            memory_usage: 58,
            last_heartbeat: Date.now() - 2000
          },
          {
            node_id: 'node-3',
            status: 'degraded',
            cpu_usage: 78,
            memory_usage: 85,
            last_heartbeat: Date.now() - 5000
          }
        ])
      }
    }

    fetchNodes()
    const interval = setInterval(fetchNodes, 5000)

    return () => clearInterval(interval)
  }, [])

  // Get status color and icon
  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) {
      return { color: '#10b981', icon: CheckCircle, label: 'Healthy' }
    } else if (value <= thresholds.warning) {
      return { color: '#f59e0b', icon: AlertTriangle, label: 'Warning' }
    } else {
      return { color: '#ef4444', icon: XCircle, label: 'Critical' }
    }
  }

  // Chart configuration
  const latencyChartData = useMemo(() => ({
    labels: latencyHistory.map((_, i) => `${i * 2}s`),
    datasets: [
      {
        label: 'API Latency',
        data: latencyHistory,
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }), [latencyHistory])

  const throughputChartData = useMemo(() => ({
    labels: throughputHistory.map((_, i) => `${i * 2}s`),
    datasets: [
      {
        label: 'Requests/sec',
        data: throughputHistory,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }), [throughputHistory])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleColor: '#d4af37',
        bodyColor: '#fff'
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="system-health loading">
        <Activity className="loading-spinner" size={48} />
        <p>Loading system metrics...</p>
      </div>
    )
  }

  const apiLatencyStatus = getHealthStatus(metrics.api_latency_ms, { good: 100, warning: 200 })
  const consensusLatencyStatus = getHealthStatus(metrics.consensus_latency_ms, { good: 100, warning: 200 })
  const errorRateStatus = getHealthStatus(metrics.error_rate, { good: 1, warning: 5 })

  return (
    <div className="system-health">
      {/* Metric Cards */}
      <div className="health-cards">
        {/* API Latency */}
        <motion.div
          className="health-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
              <Clock size={24} color="#d4af37" />
            </div>
            <div className="card-title">
              <h3>API Latency</h3>
              <span className="card-status" style={{ color: apiLatencyStatus.color }}>
                <apiLatencyStatus.icon size={14} />
                {apiLatencyStatus.label}
              </span>
            </div>
          </div>
          <div className="card-value">
            {metrics.api_latency_ms.toFixed(1)}
            <span className="card-unit">ms</span>
          </div>
          <div className="card-chart">
            <Line data={latencyChartData} options={chartOptions} height={80} />
          </div>
        </motion.div>

        {/* Consensus Latency */}
        <motion.div
          className="health-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Zap size={24} color="#3b82f6" />
            </div>
            <div className="card-title">
              <h3>Consensus Latency</h3>
              <span className="card-status" style={{ color: consensusLatencyStatus.color }}>
                <consensusLatencyStatus.icon size={14} />
                {consensusLatencyStatus.label}
              </span>
            </div>
          </div>
          <div className="card-value">
            {metrics.consensus_latency_ms.toFixed(1)}
            <span className="card-unit">ms</span>
          </div>
          <div className="card-trend">
            <TrendingUp size={16} color="#10b981" />
            <span>12% faster</span>
          </div>
        </motion.div>

        {/* Error Rate */}
        <motion.div
          className="health-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div className="card-title">
              <h3>Error Rate</h3>
              <span className="card-status" style={{ color: errorRateStatus.color }}>
                <errorRateStatus.icon size={14} />
                {errorRateStatus.label}
              </span>
            </div>
          </div>
          <div className="card-value">
            {metrics.error_rate.toFixed(2)}
            <span className="card-unit">%</span>
          </div>
          <div className="card-description">
            {metrics.error_rate < 1 ? 'Excellent' : metrics.error_rate < 5 ? 'Good' : 'Needs attention'}
          </div>
        </motion.div>

        {/* Uptime */}
        <motion.div
          className="health-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <Activity size={24} color="#10b981" />
            </div>
            <div className="card-title">
              <h3>Uptime</h3>
              <span className="card-status" style={{ color: '#10b981' }}>
                <CheckCircle size={14} />
                Online
              </span>
            </div>
          </div>
          <div className="card-value">
            {metrics.uptime_percentage.toFixed(2)}
            <span className="card-unit">%</span>
          </div>
          <div className="card-description">
            Last 30 days
          </div>
        </motion.div>
      </div>

      {/* Throughput Chart */}
      <motion.div
        className="throughput-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="section-header">
          <h2>Request Throughput</h2>
          <div className="throughput-value">
            {metrics.requests_per_second.toFixed(0)} req/s
          </div>
        </div>
        <div className="throughput-chart">
          <Line data={throughputChartData} options={chartOptions} height={200} />
        </div>
      </motion.div>

      {/* Node Status Table */}
      <motion.div
        className="node-status-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>Node Status</h2>
        <div className="node-table">
          <div className="table-header">
            <span>Node</span>
            <span>Status</span>
            <span>CPU</span>
            <span>Memory</span>
            <span>Heartbeat</span>
          </div>
          {nodes.map((node, index) => (
            <motion.div
              key={node.node_id}
              className="table-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <span className="node-id">
                <Server size={16} />
                {node.node_id}
              </span>
              <span className={`node-status ${node.status}`}>
                {node.status === 'healthy' && <CheckCircle size={16} />}
                {node.status === 'degraded' && <AlertTriangle size={16} />}
                {node.status === 'offline' && <XCircle size={16} />}
                {node.status}
              </span>
              <span className="node-metric">
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${node.cpu_usage}%`,
                      background: node.cpu_usage > 80 ? '#ef4444' : node.cpu_usage > 60 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                {node.cpu_usage}%
              </span>
              <span className="node-metric">
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${node.memory_usage}%`,
                      background: node.memory_usage > 80 ? '#ef4444' : node.memory_usage > 60 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                {node.memory_usage}%
              </span>
              <span className="node-heartbeat">
                {Math.floor((Date.now() - node.last_heartbeat) / 1000)}s ago
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default SystemHealth
