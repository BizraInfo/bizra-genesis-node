/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Growth Metrics Dashboard                                              ║
 * ║  Comprehensive analytics and growth flywheel visualization             ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import analytics from '../services/analytics';

const API_BASE = 'http://localhost:3001/api/v1';

/**
 * Metric card component
 */
function MetricCard({ title, value, subtitle, icon, trend, color = '#d4af37', loading = false }) {
  return (
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      style={{ '--metric-color': color }}
    >
      <div className="metric-card-header">
        <span className="metric-icon">{icon}</span>
        <h3 className="metric-title">{title}</h3>
      </div>

      {loading ? (
        <div className="metric-loading">
          <div className="loading-spinner-small"></div>
        </div>
      ) : (
        <>
          <div className="metric-value">{value}</div>
          {subtitle && <div className="metric-subtitle">{subtitle}</div>}
          {trend && (
            <div className={`metric-trend ${trend.direction}`}>
              <span className="trend-icon">{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span className="trend-value">{trend.value}</span>
              <span className="trend-label">{trend.label || 'vs last period'}</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

/**
 * Chart placeholder (would integrate with charting library in production)
 */
function ChartPlaceholder({ title, subtitle, height = '300px' }) {
  return (
    <div className="chart-container" style={{ height }}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      </div>
      <div className="chart-placeholder">
        <p>Chart visualization would go here</p>
        <p className="chart-placeholder-note">
          Integrate with Chart.js, Recharts, or D3.js for production
        </p>
      </div>
    </div>
  );
}

/**
 * Cohort table component
 */
function CohortTable({ cohorts, loading = false }) {
  if (loading) {
    return (
      <div className="cohort-table-loading">
        <div className="loading-spinner"></div>
        <p>Loading cohort data...</p>
      </div>
    );
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="cohort-table-empty">
        <p>No cohort data available</p>
      </div>
    );
  }

  return (
    <div className="cohort-table-wrapper">
      <table className="cohort-table">
        <thead>
          <tr>
            <th>Cohort</th>
            <th>Users</th>
            <th>Viral Coefficient</th>
            <th>Avg. Rewards (TZT)</th>
            <th>Avg. Network Size</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.id}>
              <td className="cohort-name">
                <span className="cohort-icon">{cohort.icon}</span>
                {cohort.name}
              </td>
              <td className="cohort-count">{cohort.userCount.toLocaleString()}</td>
              <td className="cohort-coefficient">
                <span className={`coefficient ${cohort.viralCoefficient >= 1 ? 'viral' : ''}`}>
                  {cohort.viralCoefficient.toFixed(2)}x
                </span>
              </td>
              <td className="cohort-rewards">{cohort.avgRewards.toLocaleString()}</td>
              <td className="cohort-network">{cohort.avgNetworkSize.toFixed(1)}</td>
              <td className="cohort-status">
                <span className={`status-badge ${cohort.status}`}>
                  {cohort.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Funnel visualization component
 */
function FunnelVisualization({ funnelData, loading = false }) {
  if (loading) {
    return (
      <div className="funnel-loading">
        <div className="loading-spinner"></div>
        <p>Loading funnel data...</p>
      </div>
    );
  }

  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="funnel-empty">
        <p>No funnel data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...funnelData.map((stage) => stage.count));

  return (
    <div className="funnel-visualization">
      {funnelData.map((stage, index) => {
        const widthPercent = (stage.count / maxValue) * 100;
        const conversionRate = index === 0 ? 100 : (stage.count / funnelData[0].count) * 100;

        return (
          <motion.div
            key={stage.name}
            className="funnel-stage"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="funnel-stage-header">
              <span className="funnel-stage-name">{stage.name}</span>
              <span className="funnel-stage-count">{stage.count.toLocaleString()}</span>
              <span className="funnel-stage-rate">{conversionRate.toFixed(1)}%</span>
            </div>
            <div className="funnel-stage-bar-wrapper">
              <motion.div
                className="funnel-stage-bar"
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              />
            </div>
            {index < funnelData.length - 1 && (
              <div className="funnel-stage-arrow">↓</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Main Growth Metrics Dashboard component
 */
export default function GrowthMetrics() {
  const [userId] = useState('demo-user');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  // Metrics state
  const [overviewMetrics, setOverviewMetrics] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchAllMetrics();
  }, [userId, timeRange]);

  const fetchAllMetrics = async () => {
    setLoading(true);

    try {
      // Fetch overview metrics
      const metricsRes = await fetch(`${API_BASE}/growth/metrics?timeRange=${timeRange}`, {
        headers: { 'x-user-id': userId }
      });
      const metricsJson = await metricsRes.json();

      if (metricsJson.success) {
        setOverviewMetrics(metricsJson.data);
      }

      // Fetch cohorts
      const cohortsRes = await fetch(`${API_BASE}/growth/cohorts`, {
        headers: { 'x-user-id': userId }
      });
      const cohortsJson = await cohortsRes.json();

      if (cohortsJson.success) {
        setCohorts(cohortsJson.data);
      }

      // Fetch funnel data
      const funnelRes = await fetch(`${API_BASE}/growth/funnel?timeRange=${timeRange}`, {
        headers: { 'x-user-id': userId }
      });
      const funnelJson = await funnelRes.json();

      if (funnelJson.success) {
        setFunnelData(funnelJson.data);
      }

      // Track dashboard view
      analytics.trackEvent('Engagement', 'growth_metrics_viewed', null, null, {
        time_range: timeRange
      });
    } catch (error) {
      console.error('Error fetching growth metrics:', error);
      toast.error('Failed to load growth metrics');
      analytics.trackError('growth_metrics_fetch', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    analytics.trackEvent('Engagement', 'time_range_changed', range, null);
  };

  return (
    <div className="growth-metrics-container">
      {/* Header */}
      <motion.header
        className="growth-metrics-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1>📊 Growth Metrics</h1>
          <p className="subtitle">Track your viral growth flywheel performance</p>
        </div>

        <div className="header-controls">
          {/* Time Range Selector */}
          <div className="time-range-selector">
            {['24h', '7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange(range)}
              >
                {range === '24h' && '24 Hours'}
                {range === '7d' && '7 Days'}
                {range === '30d' && '30 Days'}
                {range === '90d' && '90 Days'}
                {range === 'all' && 'All Time'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            className="refresh-btn"
            onClick={fetchAllMetrics}
            disabled={loading}
          >
            <span className="refresh-icon">{loading ? '⟳' : '↻'}</span>
            Refresh
          </button>
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <div className="growth-metrics-tabs">
        {['overview', 'cohorts', 'funnel', 'trends'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="growth-metrics-content">
        {selectedTab === 'overview' && (
          <div className="overview-tab">
            {/* Key Metrics Grid */}
            <div className="metrics-grid">
              <MetricCard
                title="Total Users"
                value={overviewMetrics?.totalUsers?.toLocaleString() || '0'}
                subtitle="Registered accounts"
                icon="👥"
                trend={{
                  direction: 'up',
                  value: '+12%',
                  label: 'vs last week'
                }}
                loading={loading}
              />

              <MetricCard
                title="Viral Coefficient"
                value={overviewMetrics?.viralCoefficient?.toFixed(2) || '0.00'}
                subtitle="Average per user"
                icon="🚀"
                trend={{
                  direction: overviewMetrics?.viralCoefficient >= 1 ? 'up' : 'down',
                  value: overviewMetrics?.viralCoefficient >= 1 ? 'Viral!' : 'Growing',
                  label: 'Target: 1.0+'
                }}
                color={overviewMetrics?.viralCoefficient >= 1 ? '#32cd32' : '#d4af37'}
                loading={loading}
              />

              <MetricCard
                title="Total Referrals"
                value={overviewMetrics?.totalReferrals?.toLocaleString() || '0'}
                subtitle="Invitations sent"
                icon="📧"
                trend={{
                  direction: 'up',
                  value: '+45',
                  label: 'today'
                }}
                loading={loading}
              />

              <MetricCard
                title="Network Growth"
                value={overviewMetrics?.networkGrowthRate?.toFixed(1) + '%' || '0%'}
                subtitle="Week over week"
                icon="📈"
                trend={{
                  direction: 'up',
                  value: '+8.5%',
                  label: 'vs last week'
                }}
                loading={loading}
              />

              <MetricCard
                title="Active Users"
                value={overviewMetrics?.activeUsers?.toLocaleString() || '0'}
                subtitle="Last 7 days"
                icon="⚡"
                loading={loading}
              />

              <MetricCard
                title="Avg. Network Size"
                value={overviewMetrics?.avgNetworkSize?.toFixed(1) || '0.0'}
                subtitle="Per user"
                icon="🌐"
                loading={loading}
              />
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <ChartPlaceholder
                title="Growth Over Time"
                subtitle="User registrations and network expansion"
                height="400px"
              />

              <div className="charts-grid">
                <ChartPlaceholder
                  title="Referral Sources"
                  subtitle="Where new users come from"
                  height="300px"
                />

                <ChartPlaceholder
                  title="Viral Coefficient Trend"
                  subtitle="Daily viral coefficient tracking"
                  height="300px"
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'cohorts' && (
          <div className="cohorts-tab">
            <div className="cohorts-header">
              <h2>User Cohorts</h2>
              <p>Segmentation based on viral coefficient and network size</p>
            </div>

            <CohortTable cohorts={cohorts} loading={loading} />

            <div className="cohorts-insights">
              <h3>Cohort Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <span className="insight-icon">🏆</span>
                  <h4>Top Performers</h4>
                  <p>Viral Whales driving {cohorts.find((c) => c.id === 'viral_whale')?.percentage || 0}% of growth</p>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">🎯</span>
                  <h4>Growth Opportunity</h4>
                  <p>
                    {cohorts.find((c) => c.id === 'network_builder')?.userCount || 0} Network Builders
                    can be activated
                  </p>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">💡</span>
                  <h4>Recommendation</h4>
                  <p>Focus on converting Solo Operators to Emerging Networkers</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'funnel' && (
          <div className="funnel-tab">
            <div className="funnel-header">
              <h2>Conversion Funnel</h2>
              <p>User journey from invitation to active participation</p>
            </div>

            <FunnelVisualization funnelData={funnelData} loading={loading} />

            <div className="funnel-insights">
              <h3>Optimization Opportunities</h3>
              <div className="optimization-list">
                <div className="optimization-item">
                  <span className="optimization-icon">⚠️</span>
                  <div className="optimization-content">
                    <h4>Largest Drop-Off: Invitation to Registration</h4>
                    <p>
                      Only {funnelData.length > 1 ? ((funnelData[1].count / funnelData[0].count) * 100).toFixed(1) : 0}% conversion rate
                    </p>
                    <span className="optimization-action">Improve invitation email messaging</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'trends' && (
          <div className="trends-tab">
            <div className="trends-header">
              <h2>Growth Trends</h2>
              <p>Historical performance and projections</p>
            </div>

            <ChartPlaceholder
              title="Monthly Active Users (MAU)"
              subtitle="User engagement over time"
              height="400px"
            />

            <div className="trends-grid">
              <ChartPlaceholder
                title="Retention Curves"
                subtitle="Day 1, 7, 30 retention rates"
                height="300px"
              />

              <ChartPlaceholder
                title="Network Effects"
                subtitle="Value creation from network growth"
                height="300px"
              />
            </div>

            <div className="projections-section">
              <h3>Growth Projections</h3>
              <p className="projections-disclaimer">
                Based on current viral coefficient and network effects
              </p>

              <ChartPlaceholder
                title="6-Month Projection"
                subtitle="Expected user growth trajectory"
                height="350px"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
