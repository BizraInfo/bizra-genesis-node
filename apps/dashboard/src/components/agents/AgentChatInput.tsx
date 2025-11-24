// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AGENT CHAT INPUT                                   ║
// ║  Message input component with typing indicators                          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { useWebSocket } from '../../contexts/WebSocketContext'

interface AgentChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  agentId: string
}

export const AgentChatInput: React.FC<AgentChatInputProps> = ({
  onSend,
  disabled = false
}) => {
  const { sendTypingIndicator } = useWebSocket()
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTyping = (value: string) => {
    setMessage(value)

    // Send typing start indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true)
      sendTypingIndicator('user', true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        sendTypingIndicator('user', false)
      }, 1000)
    } else {
      setIsTyping(false)
      sendTypingIndicator('user', false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      setIsTyping(false)
      sendTypingIndicator('user', false)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        sendTypingIndicator('user', false)
      }
    }
  }, [isTyping])

  return (
    <form className="agent-chat-input" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Connect to start chatting...' : 'Type your message...'}
        disabled={disabled}
        rows={1}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled || !message.trim()}
      >
        <Send size={18} />
      </button>
    </form>
  )
}
