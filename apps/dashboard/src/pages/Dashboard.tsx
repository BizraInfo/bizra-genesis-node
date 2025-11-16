// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - DASHBOARD PAGE                                 ║
// ║  Main dashboard with key metrics and quick actions                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { motion } from 'framer-motion'
import { Activity, Users, Zap, TrendingUp, Clock, Star } from 'lucide-react'
import RealtimeStatusPanel from '../components/RealtimeStatusPanel'

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to your AI synthesis workspace</p>
      </motion.div>

      {/* Real-time Agent Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <RealtimeStatusPanel />
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="stats-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="stat-card">
          <Activity className="stat-icon" />
          <div className="stat-content">
            <h3>Active Sessions</h3>
            <div className="stat-value">12</div>
          </div>
        </div>

        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-content">
            <h3>AI Agents</h3>
            <div className="stat-value">18</div>
          </div>
        </div>

        <div className="stat-card">
          <Zap className="stat-icon" />
          <div className="stat-content">
            <h3>Syntheses Today</h3>
            <div className="stat-value">47</div>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp className="stat-icon" />
          <div className="stat-content">
            <h3>Success Rate</h3>
            <div className="stat-value">98.5%</div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        className="dashboard-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <Clock className="activity-icon" />
            <div className="activity-content">
              <p>Completed synthesis: "Market Analysis Report"</p>
              <span className="activity-time">2 minutes ago</span>
            </div>
          </div>

          <div className="activity-item">
            <Star className="activity-icon" />
            <div className="activity-content">
              <p>Earned achievement: "First Synthesis"</p>
              <span className="activity-time">15 minutes ago</span>
            </div>
          </div>

          <div className="activity-item">
            <Users className="activity-icon" />
            <div className="activity-content">
              <p>Agent "Researcher" completed analysis</p>
              <span className="activity-time">1 hour ago</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="dashboard-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button className="action-btn primary">
            <Zap />
            New Synthesis
          </button>
          <button className="action-btn secondary">
            <Users />
            Manage Agents
          </button>
          <button className="action-btn secondary">
            <Activity />
            View Analytics
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
