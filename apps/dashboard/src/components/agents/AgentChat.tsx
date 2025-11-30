// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT CHAT COMPONENT                               ║
// ║  Real-time agent communication interface with live streaming             ║
// ║  Sprint 4.1 Week 31-32: Agent Interaction Interface                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { AgentChatMessage } from './AgentChatMessage'
import { AgentChatInput } from './AgentChatInput'
import type { AgentResponse } from '../../services/websocket'

interface Message {
  id: string
  agentId: string
  content: string
  timestamp: number
  isUser: boolean
  isStreaming?: boolean
}

interface AgentChatProps {
  agentId: string
  agentName: string
  agentIcon?: string
}

export const AgentChat: React.FC<AgentChatProps> = ({
  agentId,
  agentName,
  agentIcon = '🤖'
}) => {
  const { connected, authenticated, sendAgentMessage, onAgentResponse, onTypingIndicator } = useWebSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Set up agent response handler
  useEffect(() => {
    const unsubscribe = onAgentResponse((response: AgentResponse) => {
      // Only handle responses for this agent
      if (response.agent_id !== agentId) {return}

      if (response.is_streaming) {
        // Update streaming message
        setStreamingMessageId(response.message_id)
        setMessages(prev => {
          const existingIndex = prev.findIndex(m => m.id === response.message_id)
          if (existingIndex >= 0) {
            // Update existing streaming message
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: response.content,
              isStreaming: !response.is_complete
            }
            return updated
          } else {
            // Add new streaming message
            return [...prev, {
              id: response.message_id,
              agentId: response.agent_id,
              content: response.content,
              timestamp: Date.now(),
              isUser: false,
              isStreaming: !response.is_complete
            }]
          }
        })

        if (response.is_complete) {
          setStreamingMessageId(null)
          setIsAgentTyping(false)
        }
      } else {
        // Add complete message
        setMessages(prev => [...prev, {
          id: response.message_id,
          agentId: response.agent_id,
          content: response.content,
          timestamp: Date.now(),
          isUser: false,
          isStreaming: false
        }])
        setIsAgentTyping(false)
      }
    })

    return unsubscribe
  }, [agentId, onAgentResponse])

  // Set up typing indicator handler
  useEffect(() => {
    const unsubscribe = onTypingIndicator((indicator) => {
      if (indicator.actor_id === agentId) {
        setIsAgentTyping(indicator.is_typing)
      }
    })

    return unsubscribe
  }, [agentId, onTypingIndicator])

  const handleSendMessage = (content: string) => {
    if (!connected || !authenticated) {
      console.error('Not connected or authenticated')
      return
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      agentId: 'user',
      content,
      timestamp: Date.now(),
      isUser: true
    }
    setMessages(prev => [...prev, userMessage])

    // Send to agent
    try {
      sendAgentMessage(agentId, content)
      setIsAgentTyping(true)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setStreamingMessageId(null)
    setIsAgentTyping(false)
  }

  return (
    <div className="agent-chat">
      {/* Header */}
      <div className="agent-chat-header">
        <div className="agent-info">
          <div className="agent-avatar">{agentIcon}</div>
          <div className="agent-details">
            <h3>{agentName}</h3>
            <div className="agent-status">
              {connected && authenticated ? (
                <>
                  <Wifi className="status-icon online" size={14} />
                  <span className="status-text">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="status-icon offline" size={14} />
                  <span className="status-text">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button className="btn btn-text" onClick={handleClearChat}>
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="agent-chat-messages">
        {!connected || !authenticated ? (
          <div className="chat-notice">
            <AlertCircle size={48} />
            <h4>Not Connected</h4>
            <p>Please ensure you are logged in and the WebSocket server is running.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <MessageSquare size={48} />
            <h4>Start a Conversation</h4>
            <p>Send a message to {agentName} to begin</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <AgentChatMessage
                key={message.id}
                message={message}
                agentIcon={message.isUser ? '👤' : agentIcon}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {isAgentTyping && !streamingMessageId && (
          <motion.div
            className="typing-indicator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="typing-avatar">{agentIcon}</div>
            <div className="typing-bubbles">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AgentChatInput
        onSend={handleSendMessage}
        disabled={!connected || !authenticated}
        agentId={agentId}
      />
    </div>
  )
}
