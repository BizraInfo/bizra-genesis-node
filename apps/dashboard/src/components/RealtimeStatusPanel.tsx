// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - REALTIME STATUS PANEL                              ║
// ║  Live agent status and consensus monitoring component                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { useAgentStream, useConsensusStream } from '../hooks'
import { useWebSocket } from '../contexts/WebSocketContext'
import { Activity, TrendingUp, Users, Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react'
// styles import removed - using inline styles instead

const RealtimeStatusPanel: React.FC = () => {
  const agentStatuses = useAgentStream()
  const { currentConsensus, consensusHistory } = useConsensusStream(5)
  const { connected, authenticated } = useWebSocket()

  // Calculate statistics
  const totalAgents = Object.keys(agentStatuses).length
  const activeAgents = Object.values(agentStatuses).filter(
    agent => agent.status === 'processing' || agent.status === 'streaming'
  ).length
  const idleAgents = Object.values(agentStatuses).filter(
    agent => agent.status === 'idle'
  ).length

  // Get agent status icon and color
  const getAgentStatusDisplay = (status: string) => {
    switch (status) {
      case 'processing':
        return { icon: <Activity className="status-icon processing" />, color: '#3b82f6', label: 'Processing' }
      case 'streaming':
        return { icon: <Zap className="status-icon streaming" />, color: '#d4af37', label: 'Streaming' }
      case 'idle':
        return { icon: <CheckCircle className="status-icon idle" />, color: '#10b981', label: 'Idle' }
      case 'error':
        return { icon: <AlertCircle className="status-icon error" />, color: '#ef4444', label: 'Error' }
      default:
        return { icon: <Activity className="status-icon" />, color: '#6b7280', label: 'Unknown' }
    }
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    if (diff < 60000) {return `${Math.floor(diff / 1000)}s ago`}
    if (diff < 3600000) {return `${Math.floor(diff / 60000)}m ago`}
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <div className="realtime-status-panel">
      {/* Connection Status */}
      <div className="connection-status">
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {connected ? (authenticated ? 'Connected' : 'Authenticating...') : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Agent Statistics */}
      <div className="status-cards">
        <div className="status-card">
          <div className="card-icon" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
            <Users size={24} color="#d4af37" />
          </div>
          <div className="card-content">
            <div className="card-label">Total Agents</div>
            <div className="card-value">{totalAgents || 18}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <Activity size={24} color="#3b82f6" />
          </div>
          <div className="card-content">
            <div className="card-label">Active</div>
            <div className="card-value">{activeAgents}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div className="card-content">
            <div className="card-label">Idle</div>
            <div className="card-value">{idleAgents}</div>
          </div>
        </div>

        {currentConsensus && (
          <div className="status-card">
            <div className="card-icon" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
              <TrendingUp size={24} color="#d4af37" />
            </div>
            <div className="card-content">
              <div className="card-label">Consensus</div>
              <div className="card-value">
                {currentConsensus.agents_voted}/{currentConsensus.total_agents}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Consensus Progress */}
      {currentConsensus && currentConsensus.status !== 'completed' && (
        <div className="consensus-progress">
          <div className="consensus-header">
            <h3>Active Consensus</h3>
            <span className="consensus-status">{currentConsensus.status}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(currentConsensus.agents_voted / currentConsensus.total_agents) * 100}%`
              }}
            />
          </div>
          <div className="consensus-info">
            <span>{currentConsensus.agents_voted} of {currentConsensus.total_agents} agents voted</span>
            {currentConsensus.confidence_score && (
              <span className="confidence-score">
                {(currentConsensus.confidence_score * 100).toFixed(1)}% confidence
              </span>
            )}
          </div>
        </div>
      )}

      {/* Agent Status List */}
      <div className="agent-status-list">
        <h3>Agent Activity</h3>
        {Object.values(agentStatuses).length > 0 ? (
          <div className="agent-list">
            {Object.values(agentStatuses)
              .sort((a, b) => b.last_update - a.last_update)
              .slice(0, 8)
              .map((agent) => {
                const display = getAgentStatusDisplay(agent.status)
                return (
                  <div key={agent.agent_id} className="agent-item">
                    <div className="agent-info">
                      {display.icon}
                      <div className="agent-details">
                        <div className="agent-name">{agent.agent_name}</div>
                        {agent.current_task && (
                          <div className="agent-task">{agent.current_task}</div>
                        )}
                      </div>
                    </div>
                    <div className="agent-meta">
                      <span className="agent-status-label" style={{ color: display.color }}>
                        {display.label}
                      </span>
                      <span className="agent-time">
                        <Clock size={12} />
                        {formatTime(agent.last_update)}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="empty-state">
            <Activity size={48} opacity={0.3} />
            <p>No agent activity yet</p>
            <span className="empty-hint">
              {connected ? 'Waiting for agent messages...' : 'Connect to see live updates'}
            </span>
          </div>
        )}
      </div>

      {/* Recent Consensus History */}
      {consensusHistory.length > 0 && (
        <div className="consensus-history">
          <h3>Recent Consensus Results</h3>
          <div className="history-list">
            {consensusHistory.map((consensus) => (
              <div key={consensus.consensus_id} className="history-item">
                <div className="history-header">
                  <span className={`history-status ${consensus.status}`}>
                    {consensus.status === 'completed' ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {consensus.status}
                  </span>
                  <span className="history-time">{formatTime(consensus.timestamp)}</span>
                </div>
                <div className="history-details">
                  <span>{consensus.agents_voted}/{consensus.total_agents} votes</span>
                  {consensus.confidence_score && (
                    <span className="confidence">
                      {(consensus.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RealtimeStatusPanel
