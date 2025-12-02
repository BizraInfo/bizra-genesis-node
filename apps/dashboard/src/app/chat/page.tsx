'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Brain,
  BookOpen,
  Palette,
  BarChart2,
  MessageCircle,
  Target,
  Shield,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api, PatAgent, PatMessage, PatResponse } from '@/lib/api';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';
import { BizraLogoAnimated, GridBackground } from '@/components/brand';

const patAgentMeta: Record<PatAgent, { icon: React.ElementType; color: string; gradient: string }> = {
  MasterReasoner: { icon: Brain, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5' },
  MemoryArchitect: { icon: BookOpen, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-500/5' },
  CreativeSynthesizer: { icon: Palette, color: 'text-pink-400', gradient: 'from-pink-500/20 to-pink-500/5' },
  DataAnalyzer: { icon: BarChart2, color: 'text-green-400', gradient: 'from-green-500/20 to-green-500/5' },
  Communicator: { icon: MessageCircle, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
  ExecutionPlanner: { icon: Target, color: 'text-orange-400', gradient: 'from-orange-500/20 to-orange-500/5' },
  EthicsGuardian: { icon: Shield, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-yellow-500/5' },
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: PatAgent;
  contributors?: PatAgent[];
  timestamp: Date;
  poi_generated?: number;
}

export default function ChatPage() {
  const { synapse, connected } = useGenesisSynapse();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<PatAgent>('MasterReasoner');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.patChat({
        message: userMessage.content,
        agent: selectedAgent,
        session_id: sessionId || undefined,
        context: {
          recent_messages: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });
      
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        agent: response.primary_agent,
        contributors: response.contributing_agents,
        timestamp: new Date(),
        poi_generated: response.poi_generated,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedAgent, sessionId, messages]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  const copyToClipboard = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);
  
  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);
  
  return (
    <div className={`min-h-screen flex flex-col ${isExpanded ? 'fixed inset-0 z-50 bg-bizra-black' : ''}`}>
      <GridBackground />
      {/* Header */}
      <header className="glass-panel border-t-0 border-x-0 rounded-none sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/landing" className="flex items-center gap-2">
              <BizraLogoAnimated size="sm" />
            </Link>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${patAgentMeta[selectedAgent].gradient} flex items-center justify-center border border-white/10`}>
              {(() => {
                const Icon = patAgentMeta[selectedAgent].icon;
                return <Icon className={`w-5 h-5 ${patAgentMeta[selectedAgent].color}`} />;
              })()}
            </div>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                PAT Console
                <span className={`text-xs ${patAgentMeta[selectedAgent].color}`}>
                  {selectedAgent}
                </span>
              </h1>
              <p className="text-xs text-white/40">
                {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'New Session'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Agent Selector */}
            <div 
              className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10"
              role="toolbar"
              aria-label="Select PAT agent"
            >
              {(Object.keys(patAgentMeta) as PatAgent[]).map((agent) => {
                const Icon = patAgentMeta[agent].icon;
                const isSelected = selectedAgent === agent;
                return (
                  <button
                    key={agent}
                    onClick={() => setSelectedAgent(agent)}
                    aria-label={`Select ${agent} agent${isSelected ? ' (currently selected)' : ''}`}
                    aria-pressed={isSelected}
                    className={`p-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-1 focus:ring-offset-bizra-black ${
                      isSelected 
                        ? `${patAgentMeta[agent].color} bg-white/10` 
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={clearChat}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-1 focus:ring-offset-bizra-black"
              aria-label="Clear chat history and start new session"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-1 focus:ring-offset-bizra-black"
              aria-label={isExpanded ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" aria-hidden="true" /> : <Maximize2 className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto scrollbar-sovereign"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Welcome message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-bizra-gold/20 to-bizra-gold/5 flex items-center justify-center border border-bizra-gold/20">
                <Sparkles className="w-8 h-8 text-bizra-gold" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to PAT Console</h2>
              <p className="text-white/50 max-w-md mx-auto mb-6">
                Your Personal AI Team is ready to assist. Select an agent above or start 
                typing to begin your sovereign AI experience.
              </p>
              
              {/* Quick prompts */}
              <div 
                className="flex flex-wrap justify-center gap-2"
                role="group"
                aria-label="Suggested prompts to get started"
              >
                {[
                  'Help me plan my day',
                  'Analyze this data',
                  'Write a creative story',
                  'Explain quantum computing',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 hover:border-bizra-gold/50 hover:text-bizra-gold transition-all focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-1 focus:ring-offset-bizra-black"
                    aria-label={`Use prompt: ${prompt}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-bizra-gold/20' 
                        : message.agent 
                          ? `bg-gradient-to-br ${patAgentMeta[message.agent].gradient}`
                          : 'bg-white/10'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-bizra-gold" />
                      ) : message.agent ? (
                        (() => {
                          const Icon = patAgentMeta[message.agent].icon;
                          return <Icon className={`w-4 h-4 ${patAgentMeta[message.agent].color}`} />;
                        })()
                      ) : (
                        <Bot className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                    
                    {/* Message content */}
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-bizra-gold/20 border border-bizra-gold/30'
                        : 'glass-panel'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                      
                      {/* Message footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                          {message.agent && (
                            <span className={patAgentMeta[message.agent].color}>
                              {message.agent}
                            </span>
                          )}
                          {message.poi_generated && (
                            <span className="text-bizra-gold">
                              +{message.poi_generated.toFixed(2)} PoI
                            </span>
                          )}
                        </div>
                        
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => copyToClipboard(message.id, message.content)}
                            className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-bizra-gold"
                            aria-label={copiedId === message.id ? 'Message copied to clipboard' : 'Copy message to clipboard'}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3 h-3 text-green-400" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3 h-3" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Contributing agents */}
                      {message.contributors && message.contributors.length > 1 && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-white/30">Also consulted:</span>
                          {message.contributors.filter(a => a !== message.agent).map((agent) => {
                            const Icon = patAgentMeta[agent].icon;
                            return (
                              <div 
                                key={agent}
                                className={`w-5 h-5 rounded flex items-center justify-center ${patAgentMeta[agent].color} bg-white/5`}
                                title={agent}
                              >
                                <Icon className="w-3 h-3" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 mb-4"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${patAgentMeta[selectedAgent].gradient}`}>
                {(() => {
                  const Icon = patAgentMeta[selectedAgent].icon;
                  return <Icon className={`w-4 h-4 ${patAgentMeta[selectedAgent].color}`} />;
                })()}
              </div>
              <div className="glass-panel px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-bizra-gold" />
                  <span className="text-sm text-white/50">
                    {selectedAgent} is thinking...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-sm text-white/70">{error}</p>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className="sticky bottom-0 glass-panel border-b-0 border-x-0 rounded-none">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* System status */}
          {synapse && (
            <div className="flex items-center gap-4 text-xs text-white/30 mb-3">
              <span>CPU: {synapse.resources.cpuUsage.toFixed(0)}%</span>
              <span>GPU: {(synapse.resources.gpuUsage || 0).toFixed(0)}%</span>
              <span className="text-bizra-gold">PAT Active: {synapse.activeAgents.PAT}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="relative">
            <label htmlFor="chat-input" className="sr-only">Type your message to PAT</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={1}
              className="w-full resize-none rounded-xl bg-white/5 border border-white/10 pl-4 pr-12 py-3 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 transition-all text-sm placeholder:text-white/30"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              title="Send message"
              aria-label="Send message"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-bizra-gold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bizra-gold-light transition-colors"
            >
              <Send className="w-4 h-4 text-bizra-black" />
            </button>
          </form>
          
          <p className="text-xs text-white/20 text-center mt-2">
            All processing happens locally on your hardware. Your data never leaves your machine.
          </p>
        </div>
      </div>
    </div>
  );
}
