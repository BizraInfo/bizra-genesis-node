// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT CHAT MESSAGE                                 ║
// ║  Individual chat message component with animations                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { motion } from 'framer-motion'
import { Loader } from 'lucide-react'

interface Message {
  id: string
  agentId: string
  content: string
  timestamp: number
  isUser: boolean
  isStreaming?: boolean
}

interface AgentChatMessageProps {
  message: Message
  agentIcon: string
}

export const AgentChatMessage: React.FC<AgentChatMessageProps> = ({
  message,
  agentIcon
}) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      className={`chat-message ${message.isUser ? 'user-message' : 'agent-message'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="message-avatar">{agentIcon}</div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {message.isUser ? 'You' : message.agentId}
          </span>
          <span className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="message-text">
          {message.content}
          {message.isStreaming && (
            <motion.span
              className="streaming-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader className="spinning" size={14} />
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
