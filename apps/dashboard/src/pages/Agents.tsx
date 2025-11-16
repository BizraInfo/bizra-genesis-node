// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENTS PAGE                                    ║
// ║  Enterprise-grade agent interaction and management interface         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Bot,
  Settings,
  MessageCircle,
  Clock,
  Search,
  UserCheck,
  TrendingUp,
  Target
} from 'lucide-react'
import { AgentChat } from '../components/agents/AgentChat'

interface Agent {
  id: string
  name: string
  type: 'pat' | 'sat' | 'tat'
  status: 'online' | 'busy' | 'offline'
  description: string
  capabilities: string[]
  performance: {
    successRate: number
    avgResponseTime: number
    totalInteractions: number
    uptime: number
  }
  avatar?: string
}


const Agents: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'pat' | 'sat' | 'tat'>('all')

  // Mock agents data - in production this would come from API
  const agents: Agent[] = [
    // Personal Agentic Team (PAT)
    {
      id: 'pat-planner',
      name: 'Planner',
      type: 'pat',
      status: 'online',
      description: 'Strategic planning and task breakdown specialist',
      capabilities: ['Planning', 'Strategy', 'Task Management', 'Roadmapping'],
      performance: {
        successRate: 98.5,
        avgResponseTime: 1.2,
        totalInteractions: 15420,
        uptime: 99.9
      }
    },
    {
      id: 'pat-researcher',
      name: 'Researcher',
      type: 'pat',
      status: 'online',
      description: 'Information gathering and analysis expert',
      capabilities: ['Research', 'Analysis', 'Data Collection', 'Insights'],
      performance: {
        successRate: 97.8,
        avgResponseTime: 2.1,
        totalInteractions: 12890,
        uptime: 99.8
      }
    },
    {
      id: 'pat-coder',
      name: 'Coder',
      type: 'pat',
      status: 'busy',
      description: 'Code generation and implementation specialist',
      capabilities: ['Coding', 'Development', 'Debugging', 'Optimization'],
      performance: {
        successRate: 96.2,
        avgResponseTime: 3.5,
        totalInteractions: 9876,
        uptime: 99.7
      }
    },
    {
      id: 'pat-ethicist',
      name: 'Ethicist',
      type: 'pat',
      status: 'online',
      description: 'Ethics and Ihsan compliance advisor',
      capabilities: ['Ethics', 'Compliance', 'Ihsan', 'Governance'],
      performance: {
        successRate: 99.1,
        avgResponseTime: 1.8,
        totalInteractions: 7654,
        uptime: 99.9
      }
    },
    {
      id: 'pat-publisher',
      name: 'Publisher',
      type: 'pat',
      status: 'online',
      description: 'Result formatting and presentation expert',
      capabilities: ['Publishing', 'Formatting', 'Presentation', 'Documentation'],
      performance: {
        successRate: 98.9,
        avgResponseTime: 1.5,
        totalInteractions: 11234,
        uptime: 99.8
      }
    },
    {
      id: 'pat-integrator',
      name: 'Integrator',
      type: 'pat',
      status: 'online',
      description: 'Multi-agent output synthesis specialist',
      capabilities: ['Integration', 'Synthesis', 'Coordination', 'Optimization'],
      performance: {
        successRate: 97.5,
        avgResponseTime: 2.8,
        totalInteractions: 8765,
        uptime: 99.6
      }
    },
    {
      id: 'pat-evaluator',
      name: 'Evaluator',
      type: 'pat',
      status: 'online',
      description: 'Quality evaluation and assessment expert',
      capabilities: ['Evaluation', 'Assessment', 'Quality Control', 'Metrics'],
      performance: {
        successRate: 98.7,
        avgResponseTime: 1.9,
        totalInteractions: 9234,
        uptime: 99.8
      }
    },

    // System Agentic Team (SAT)
    {
      id: 'sat-infrastructure',
      name: 'Infrastructure',
      type: 'sat',
      status: 'online',
      description: 'System resource management and infrastructure specialist',
      capabilities: ['Infrastructure', 'Resources', 'Scaling', 'Monitoring'],
      performance: {
        successRate: 99.5,
        avgResponseTime: 1.1,
        totalInteractions: 5678,
        uptime: 99.9
      }
    },
    {
      id: 'sat-performance',
      name: 'Performance',
      type: 'sat',
      status: 'online',
      description: 'Performance tracking and optimization expert',
      capabilities: ['Performance', 'Optimization', 'Benchmarking', 'Profiling'],
      performance: {
        successRate: 98.3,
        avgResponseTime: 2.2,
        totalInteractions: 6789,
        uptime: 99.7
      }
    },
    {
      id: 'sat-security',
      name: 'Security',
      type: 'sat',
      status: 'online',
      description: 'Security compliance and auditing specialist',
      capabilities: ['Security', 'Compliance', 'Auditing', 'Protection'],
      performance: {
        successRate: 99.8,
        avgResponseTime: 1.3,
        totalInteractions: 3456,
        uptime: 99.9
      }
    },
    {
      id: 'sat-backup',
      name: 'Backup',
      type: 'sat',
      status: 'online',
      description: 'Disaster recovery and backup management expert',
      capabilities: ['Backup', 'Recovery', 'Disaster Planning', 'Data Protection'],
      performance: {
        successRate: 99.9,
        avgResponseTime: 1.0,
        totalInteractions: 2345,
        uptime: 99.9
      }
    },
    {
      id: 'sat-resources',
      name: 'Resources',
      type: 'sat',
      status: 'busy',
      description: 'Computational resource allocation specialist',
      capabilities: ['Resource Allocation', 'Load Balancing', 'Capacity Planning', 'Efficiency'],
      performance: {
        successRate: 97.9,
        avgResponseTime: 2.5,
        totalInteractions: 4567,
        uptime: 99.5
      }
    },

    // Trading Agentic Team (TAT)
    {
      id: 'tat-market-analyzer',
      name: 'Market Analyzer',
      type: 'tat',
      status: 'online',
      description: 'Real-time market data analysis specialist',
      capabilities: ['Market Analysis', 'Data Processing', 'Trend Analysis', 'Insights'],
      performance: {
        successRate: 96.8,
        avgResponseTime: 3.2,
        totalInteractions: 7890,
        uptime: 99.4
      }
    },
    {
      id: 'tat-risk-manager',
      name: 'Risk Manager',
      type: 'tat',
      status: 'online',
      description: 'Portfolio risk assessment and management expert',
      capabilities: ['Risk Assessment', 'Portfolio Management', 'Hedging', 'Compliance'],
      performance: {
        successRate: 98.1,
        avgResponseTime: 2.3,
        totalInteractions: 6543,
        uptime: 99.6
      }
    },
    {
      id: 'tat-portfolio-optimizer',
      name: 'Portfolio Optimizer',
      type: 'tat',
      status: 'busy',
      description: 'Asset allocation and portfolio optimization specialist',
      capabilities: ['Portfolio Optimization', 'Asset Allocation', 'Risk-Return Analysis', 'Rebalancing'],
      performance: {
        successRate: 95.7,
        avgResponseTime: 4.1,
        totalInteractions: 5432,
        uptime: 99.2
      }
    },
    {
      id: 'tat-signal-generator',
      name: 'Signal Generator',
      type: 'tat',
      status: 'online',
      description: 'Trading opportunity identification expert',
      capabilities: ['Signal Generation', 'Pattern Recognition', 'Technical Analysis', 'Prediction'],
      performance: {
        successRate: 94.5,
        avgResponseTime: 4.8,
        totalInteractions: 4321,
        uptime: 98.9
      }
    },
    {
      id: 'tat-execution-engine',
      name: 'Execution Engine',
      type: 'tat',
      status: 'online',
      description: 'Automated trade execution specialist',
      capabilities: ['Trade Execution', 'Order Management', 'Market Access', 'Settlement'],
      performance: {
        successRate: 99.2,
        avgResponseTime: 1.7,
        totalInteractions: 3210,
        uptime: 99.8
      }
    },
    {
      id: 'tat-compliance-monitor',
      name: 'Compliance Monitor',
      type: 'tat',
      status: 'online',
      description: 'Regulatory compliance and monitoring specialist',
      capabilities: ['Compliance Monitoring', 'Regulatory Reporting', 'Audit Trails', 'Risk Oversight'],
      performance: {
        successRate: 99.6,
        avgResponseTime: 1.4,
        totalInteractions: 2109,
        uptime: 99.9
      }
    }
  ]

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERED AGENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterType === 'all' || agent.type === filterType
    return matchesSearch && matchesFilter
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getAgentStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online': return 'var(--color-success)'
      case 'busy': return 'var(--color-warning)'
      case 'offline': return 'var(--color-error)'
      default: return 'var(--color-text-secondary)'
    }
  }

  const getAgentTypeIcon = (type: Agent['type']) => {
    switch (type) {
      case 'pat': return <UserCheck size={16} />
      case 'sat': return <Settings size={16} />
      case 'tat': return <TrendingUp size={16} />
      default: return <Bot size={16} />
    }
  }

  const getAgentTypeName = (type: Agent['type']) => {
    switch (type) {
      case 'pat': return 'Personal Agent'
      case 'sat': return 'System Agent'
      case 'tat': return 'Trading Agent'
      default: return 'Agent'
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="agents-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1><Users /> AI Agents</h1>
        <p>Interact with our 18 specialized AI agents across Personal, System, and Trading teams</p>
      </motion.div>

      <div className="agents-content">
        {/* Agent List Sidebar */}
        <motion.div
          className="agents-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Search and Filter */}
          <div className="agents-controls">
            <div className="search-bar">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({agents.length})
              </button>
              <button
                className={`filter-tab ${filterType === 'pat' ? 'active' : ''}`}
                onClick={() => setFilterType('pat')}
              >
                PAT (7)
              </button>
              <button
                className={`filter-tab ${filterType === 'sat' ? 'active' : ''}`}
                onClick={() => setFilterType('sat')}
              >
                SAT (5)
              </button>
              <button
                className={`filter-tab ${filterType === 'tat' ? 'active' : ''}`}
                onClick={() => setFilterType('tat')}
              >
                TAT (6)
              </button>
            </div>
          </div>

          {/* Agent List */}
          <div className="agents-list">
            {filteredAgents.map((agent) => (
              <motion.div
                key={agent.id}
                className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                onClick={() => handleAgentSelect(agent)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="agent-header">
                  <div className="agent-avatar">
                    {agent.avatar ? (
                      <img src={agent.avatar} alt={agent.name} />
                    ) : (
                      <Bot size={24} />
                    )}
                  </div>
                  <div className="agent-info">
                    <h3>{agent.name}</h3>
                    <div className="agent-meta">
                      <span className="agent-type">
                        {getAgentTypeIcon(agent.type)}
                        {getAgentTypeName(agent.type)}
                      </span>
                      <div
                        className="agent-status"
                        style={{ backgroundColor: getAgentStatusColor(agent.status) }}
                      />
                    </div>
                  </div>
                </div>

                <p className="agent-description">{agent.description}</p>

                <div className="agent-capabilities">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                    <span key={capability} className="capability-tag">
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="capability-more">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>

                <div className="agent-performance">
                  <div className="performance-item">
                    <Target size={14} />
                    <span>{agent.performance.successRate}% success</span>
                  </div>
                  <div className="performance-item">
                    <Clock size={14} />
                    <span>{agent.performance.avgResponseTime}s avg</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          className="agents-chat"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {selectedAgent ? (
            <AgentChat
              agentId={selectedAgent.id}
              agentName={selectedAgent.name}
              agentIcon={selectedAgent.avatar || '🤖'}
            />
          ) : (
            <div className="chat-placeholder">
              <MessageCircle size={64} />
              <h3>Select an Agent</h3>
              <p>Choose an AI agent from the sidebar to start a conversation</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Agents
