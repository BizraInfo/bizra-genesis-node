// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ANALYTICS PAGE                                 ║
// ║  Enterprise-grade analytics dashboard with real-time insights         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Zap,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  Share,
  Settings,
  Calendar,
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2,
  PieChart,
  LineChart,
  BarChart,
  AreaChart
} from 'lucide-react'

interface MetricData {
  timestamp: Date
  value: number
  label: string
}

interface AnalyticsMetric {
  id: string
  name: string
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  unit: string
  description: string
  data: MetricData[]
  category: 'performance' | 'usage' | 'business' | 'system'
  priority: 'high' | 'medium' | 'low'
}

const Analytics: React.FC = () => {

  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'performance' | 'usage' | 'business' | 'system'>('all')
  const [isRealTime, setIsRealTime] = useState(true)
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Mock analytics data - in production this would come from real APIs
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([
    // Performance Metrics
    {
      id: 'response-time',
      name: 'Avg Response Time',
      value: 1.2,
      change: -8.5,
      changeType: 'decrease',
      unit: 'seconds',
      description: 'Average time for agent responses across all interactions',
      category: 'performance',
      priority: 'high',
      data: generateTimeSeriesData(24, 1.0, 1.5, 'Response Time (s)')
    },
    {
      id: 'success-rate',
      name: 'Success Rate',
      value: 98.7,
      change: 2.1,
      changeType: 'increase',
      unit: '%',
      description: 'Percentage of successful synthesis operations',
      category: 'performance',
      priority: 'high',
      data: generateTimeSeriesData(24, 95, 100, 'Success Rate (%)')
    },
    {
      id: 'throughput',
      name: 'System Throughput',
      value: 1250,
      change: 15.3,
      changeType: 'increase',
      unit: 'ops/min',
      description: 'Number of operations processed per minute',
      category: 'performance',
      priority: 'high',
      data: generateTimeSeriesData(24, 1000, 1400, 'Operations/min')
    },

    // Usage Metrics
    {
      id: 'active-users',
      name: 'Active Users',
      value: 1247,
      change: 12.8,
      changeType: 'increase',
      unit: 'users',
      description: 'Number of active users in the last 24 hours',
      category: 'usage',
      priority: 'high',
      data: generateTimeSeriesData(24, 1000, 1300, 'Active Users')
    },
    {
      id: 'agent-interactions',
      name: 'Agent Interactions',
      value: 15420,
      change: 23.5,
      changeType: 'increase',
      unit: 'interactions',
      description: 'Total agent interactions in the selected time period',
      category: 'usage',
      priority: 'medium',
      data: generateTimeSeriesData(24, 12000, 16000, 'Interactions')
    },
    {
      id: 'workflows-created',
      name: 'Workflows Created',
      value: 89,
      change: -5.2,
      changeType: 'decrease',
      unit: 'workflows',
      description: 'Number of new synthesis workflows created',
      category: 'usage',
      priority: 'medium',
      data: generateTimeSeriesData(24, 80, 100, 'Workflows Created')
    },

    // Business Metrics
    {
      id: 'cost-efficiency',
      name: 'Cost Efficiency',
      value: 87.3,
      change: 4.7,
      changeType: 'increase',
      unit: 'score',
      description: 'Overall cost efficiency score (higher is better)',
      category: 'business',
      priority: 'high',
      data: generateTimeSeriesData(24, 80, 90, 'Efficiency Score')
    },
    {
      id: 'value-creation',
      name: 'Value Creation',
      value: 2.8,
      change: 18.2,
      changeType: 'increase',
      unit: 'million USD',
      description: 'Estimated value created through AI synthesis',
      category: 'business',
      priority: 'high',
      data: generateTimeSeriesData(24, 2.0, 3.0, 'Value Created ($M)')
    },

    // System Metrics
    {
      id: 'cpu-usage',
      name: 'CPU Usage',
      value: 68.5,
      change: -3.2,
      changeType: 'decrease',
      unit: '%',
      description: 'Average CPU utilization across all nodes',
      category: 'system',
      priority: 'medium',
      data: generateTimeSeriesData(24, 60, 75, 'CPU Usage (%)')
    },
    {
      id: 'memory-usage',
      name: 'Memory Usage',
      value: 72.1,
      change: 1.8,
      changeType: 'increase',
      unit: '%',
      description: 'Average memory utilization',
      category: 'system',
      priority: 'medium',
      data: generateTimeSeriesData(24, 65, 80, 'Memory Usage (%)')
    },
    {
      id: 'error-rate',
      name: 'Error Rate',
      value: 0.12,
      change: -25.0,
      changeType: 'decrease',
      unit: '%',
      description: 'System error rate (lower is better)',
      category: 'system',
      priority: 'high',
      data: generateTimeSeriesData(24, 0.05, 0.20, 'Error Rate (%)')
    }
  ])

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA GENERATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function generateTimeSeriesData(hours: number, min: number, max: number, label: string): MetricData[] {
    const data: MetricData[] = []
    const now = new Date()

    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
      const value = min + Math.random() * (max - min)
      data.push({
        timestamp,
        value: Math.round(value * 100) / 100,
        label
      })
    }

    return data
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERED METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredMetrics = useMemo(() => {
    return metrics.filter(metric =>
      selectedCategory === 'all' || metric.category === selectedCategory
    )
  }, [metrics, selectedCategory])

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isRealTime) {return}

    const interval = setInterval(() => {
      setMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * 0.1, // Small random changes
          data: [...metric.data.slice(1), {
            timestamp: new Date(),
            value: metric.value + (Math.random() - 0.5) * 0.1,
            label: metric.data[0].label
          }]
        }))
      )
      setLastRefresh(new Date())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isRealTime])

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  const exportData = (format: 'csv' | 'json' | 'pdf') => {
    // In production, this would generate and download actual files
    console.log(`Exporting analytics data as ${format.toUpperCase()}`)
    // Implementation would create downloadable files
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getChangeIcon = (changeType: AnalyticsMetric['changeType']) => {
    switch (changeType) {
      case 'increase': return <TrendingUp size={16} className="change-icon increase" />
      case 'decrease': return <TrendingDown size={16} className="change-icon decrease" />
      default: return <Activity size={16} className="change-icon neutral" />
    }
  }

  const getChangeColor = (changeType: AnalyticsMetric['changeType']) => {
    switch (changeType) {
      case 'increase': return 'var(--color-success)'
      case 'decrease': return 'var(--color-error)'
      default: return 'var(--color-text-secondary)'
    }
  }

  const getPriorityColor = (priority: AnalyticsMetric['priority']) => {
    switch (priority) {
      case 'high': return 'var(--color-error)'
      case 'medium': return 'var(--color-warning)'
      case 'low': return 'var(--color-info)'
      default: return 'var(--color-text-secondary)'
    }
  }

  const getCategoryIcon = (category: AnalyticsMetric['category']) => {
    switch (category) {
      case 'performance': return <Zap size={20} />
      case 'usage': return <Users size={20} />
      case 'business': return <Target size={20} />
      case 'system': return <Activity size={20} />
      default: return <BarChart3 size={20} />
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="analytics-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1><BarChart3 /> Analytics Dashboard</h1>
        <p>Real-time insights and performance metrics for your AI synthesis ecosystem</p>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="analytics-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="control-group">
          <div className="time-range-selector">
            <Calendar size={16} />
            <label htmlFor="time-range-select" className="sr-only">Select time range</label>
            <select
              id="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <div className="category-filter">
            <Filter size={16} />
            <label htmlFor="category-select" className="sr-only">Select category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
            >
              <option value="all">All Categories</option>
              <option value="performance">Performance</option>
              <option value="usage">Usage</option>
              <option value="business">Business</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="real-time-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isRealTime}
                onChange={(e) => setIsRealTime(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              Real-time Updates
            </label>
          </div>
        </div>

        <div className="control-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setLastRefresh(new Date())}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <div className="export-menu">
            <button className="btn btn-secondary">
              <Download size={16} />
              Export
            </button>
            <div className="export-options">
              <button onClick={() => exportData('csv')}>Export as CSV</button>
              <button onClick={() => exportData('json')}>Export as JSON</button>
              <button onClick={() => exportData('pdf')}>Export as PDF</button>
            </div>
          </div>

          <button className="btn btn-secondary">
            <Share size={16} />
            Share Dashboard
          </button>

          <button className="btn btn-secondary">
            <Settings size={16} />
            Configure
          </button>
        </div>

        <div className="last-refresh">
          <Clock size={14} />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Key Metrics Overview */}
      <motion.div
        className="metrics-overview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="metrics-grid">
          {filteredMetrics.slice(0, 8).map((metric, index) => (
            <motion.div
              key={metric.id}
              className="metric-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="metric-header">
                <div className="metric-icon">
                  {getCategoryIcon(metric.category)}
                </div>
                <div className="metric-priority">
                  <div
                    className="priority-indicator"
                    style={{ backgroundColor: getPriorityColor(metric.priority) }}
                  />
                </div>
              </div>

              <div className="metric-content">
                <h3 className="metric-name">{metric.name}</h3>
                <div className="metric-value">
                  {metric.value.toLocaleString()}
                  <span className="metric-unit">{metric.unit}</span>
                </div>

                <div className="metric-change">
                  {getChangeIcon(metric.changeType)}
                  <span
                    className="change-value"
                    style={{ color: getChangeColor(metric.changeType) }}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                  <span className="change-period">vs last period</span>
                </div>
              </div>

              <div className="metric-description">
                {metric.description}
              </div>

              {/* Mini Chart */}
              <div className="metric-chart">
                <div className="mini-chart">
                  <svg width="100%" height="40" viewBox="0 0 100 40">
                    <polyline
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      points={
                        metric.data.slice(-10).map((point, i) =>
                          `${(i / 9) * 100},${40 - ((point.value - Math.min(...metric.data.map(d => d.value))) /
                            (Math.max(...metric.data.map(d => d.value)) - Math.min(...metric.data.map(d => d.value)))) * 30}`
                        ).join(' ')
                      }
                    />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Detailed Analytics */}
      <motion.div
        className="analytics-details"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="details-header">
          <h2>Detailed Analytics</h2>
          <div className="details-controls">
            <button className="view-toggle active">
              <LineChart size={16} />
              Trends
            </button>
            <button className="view-toggle">
              <BarChart size={16} />
              Comparison
            </button>
            <button className="view-toggle">
              <PieChart size={16} />
              Distribution
            </button>
          </div>
        </div>

        <div className="analytics-charts">
          {/* Performance Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <h3><Zap /> Performance Metrics</h3>
              <button
                className="expand-btn"
                onClick={() => setExpandedWidget(expandedWidget === 'performance' ? null : 'performance')}
              >
                {expandedWidget === 'performance' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className={`chart-content ${expandedWidget === 'performance' ? 'expanded' : ''}`}>
              <div className="performance-chart">
                {/* In production, this would be a real charting library like Chart.js or D3 */}
                <div className="chart-placeholder">
                  <AreaChart size={48} />
                  <p>Performance metrics over time</p>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-color response-time"></div>
                      <span>Response Time</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color success-rate"></div>
                      <span>Success Rate</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color throughput"></div>
                      <span>Throughput</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Analytics */}
          <div className="chart-container">
            <div className="chart-header">
              <h3><Users /> Usage Analytics</h3>
              <button
                className="expand-btn"
                onClick={() => setExpandedWidget(expandedWidget === 'usage' ? null : 'usage')}
              >
                {expandedWidget === 'usage' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className={`chart-content ${expandedWidget === 'usage' ? 'expanded' : ''}`}>
              <div className="usage-chart">
                <div className="chart-placeholder">
                  <BarChart size={48} />
                  <p>User activity and engagement metrics</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="chart-container">
            <div className="chart-header">
              <h3><Activity /> System Health</h3>
              <button
                className="expand-btn"
                onClick={() => setExpandedWidget(expandedWidget === 'system' ? null : 'system')}
              >
                {expandedWidget === 'system' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className={`chart-content ${expandedWidget === 'system' ? 'expanded' : ''}`}>
              <div className="system-chart">
                <div className="chart-placeholder">
                  <LineChart size={48} />
                  <p>System performance and health indicators</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts & Insights */}
      <motion.div
        className="analytics-alerts"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="alerts-header">
          <h2><AlertTriangle /> Alerts & Insights</h2>
        </div>

        <div className="alerts-grid">
          <div className="alert-card warning">
            <AlertTriangle size={24} />
            <div className="alert-content">
              <h4>High CPU Usage Detected</h4>
              <p>CPU utilization exceeded 80% for 15 minutes on node-3</p>
              <span className="alert-time">2 minutes ago</span>
            </div>
          </div>

          <div className="alert-card success">
            <CheckCircle size={24} />
            <div className="alert-content">
              <h4>Performance Improvement</h4>
              <p>Response time improved by 12% compared to last week</p>
              <span className="alert-time">1 hour ago</span>
            </div>
          </div>

          <div className="alert-card info">
            <TrendingUp size={24} />
            <div className="alert-content">
              <h4>User Growth Milestone</h4>
              <p>Active users increased by 25% this month</p>
              <span className="alert-time">3 hours ago</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Analytics
