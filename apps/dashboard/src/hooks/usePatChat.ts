/**
 * BIZRA Node0 - PAT Chat Hook
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * React hook for interacting with PAT (Personal Agent Team).
 * Provides chat functionality with agent selection and history management.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { bizraApi, PatChatResponse } from '@/lib/api';

export type PATRole =
  | 'MasterReasoner'
  | 'MemoryArchitect'
  | 'CreativeSynthesizer'
  | 'DataAnalyzer'
  | 'Communicator'
  | 'ExecutionPlanner'
  | 'EthicsGuardian';

export interface ChatMessage {
  id: string;
  from: 'user' | 'pat';
  text: string;
  agentRole?: PATRole;
  model?: string;
  ihsanScore?: number;
  latencyMs?: number;
  timestamp: Date;
}

export interface UsePatChatOptions {
  /** Initial agent role (default: MasterReasoner) */
  initialRole?: PATRole;
  /** Maximum messages to keep in history (default: 100) */
  maxHistory?: number;
  /** Session ID for conversation continuity */
  sessionId?: string;
}

export interface UsePatChatReturn {
  /** Chat message history */
  messages: ChatMessage[];
  /** Loading state */
  loading: boolean;
  /** Error message if request failed */
  error: string | null;
  /** Currently active agent role */
  activeRole: PATRole;
  /** Set active agent role */
  setActiveRole: (role: PATRole) => void;
  /** Send a message to PAT */
  sendMessage: (text: string) => Promise<void>;
  /** Clear chat history */
  clearHistory: () => void;
  /** Get available agent roles */
  availableRoles: PATRole[];
  /** Current session ID */
  sessionId: string | null;
}

/** All available PAT roles */
const ALL_ROLES: PATRole[] = [
  'MasterReasoner',
  'MemoryArchitect',
  'CreativeSynthesizer',
  'DataAnalyzer',
  'Communicator',
  'ExecutionPlanner',
  'EthicsGuardian',
] as const;

/** Type guard to validate PATRole */
function isPATRole(value: unknown): value is PATRole {
  return typeof value === 'string' && ALL_ROLES.includes(value as PATRole);
}

/** Agent role metadata */
export const PAT_ROLE_META: Record<PATRole, { description: string; model: string }> = {
  MasterReasoner: {
    description: 'Strategic thinking, complex analysis, planning',
    model: 'deepseek-r1:7b',
  },
  MemoryArchitect: {
    description: 'Knowledge organization, finding connections, recall',
    model: 'qwen2.5:7b',
  },
  CreativeSynthesizer: {
    description: 'Writing, brainstorming, ideation',
    model: 'qwen2.5:7b',
  },
  DataAnalyzer: {
    description: 'Data analysis, pattern recognition, insights',
    model: 'mistral:7b',
  },
  Communicator: {
    description: 'Email drafts, presentations, messaging',
    model: 'mistral:7b',
  },
  ExecutionPlanner: {
    description: 'Schedules, checklists, task sequencing',
    model: 'agentflow-7b',
  },
  EthicsGuardian: {
    description: 'Safety compliance, bias detection, ethical review',
    model: 'qwen2.5:7b',
  },
};

/**
 * Hook for chatting with BIZRA PAT (Personal Agent Team)
 * 
 * @example
 * ```tsx
 * const { messages, loading, sendMessage, activeRole, setActiveRole } = usePatChat();
 * 
 * const handleSubmit = async (e: FormEvent) => {
 *   e.preventDefault();
 *   await sendMessage(input);
 *   setInput('');
 * };
 * 
 * return (
 *   <div>
 *     <div>{messages.map(m => <Message key={m.id} {...m} />)}</div>
 *     <form onSubmit={handleSubmit}>
 *       <input value={input} onChange={e => setInput(e.target.value)} />
 *       <button disabled={loading}>Send</button>
 *     </form>
 *   </div>
 * );
 * ```
 */
export function usePatChat(options: UsePatChatOptions = {}): UsePatChatReturn {
  const { 
    initialRole = 'MasterReasoner',
    maxHistory = 100,
    sessionId: initialSessionId,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PATRole>(initialRole);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  
  const messageIdCounter = useRef(0);

  const generateId = useCallback((prefix: string) => {
    messageIdCounter.current += 1;
    return `${prefix}-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId('user'),
      from: 'user',
      text: text.trim(),
      agentRole: activeRole,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      // Trim history if needed
      if (updated.length > maxHistory) {
        return updated.slice(-maxHistory);
      }
      return updated;
    });

    setLoading(true);

    try {
      const response = await bizraApi.patChat(text.trim(), activeRole);

      // patChat returns PatResponse directly (not wrapped in ApiResponse)
      if (!response.response) {
        throw new Error('PAT request failed - no response received');
      }

      // Store session ID for continuity
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      } else if (!sessionId) {
        setSessionId(generateId('session'));
      }

      // Safely validate the agent role from response
      const agentRole: PATRole = isPATRole(response.primary_agent) 
        ? response.primary_agent 
        : activeRole;

      const patMessage: ChatMessage = {
        id: generateId('pat'),
        from: 'pat',
        text: response.response,
        agentRole,
        model: response.backend_used,
        ihsanScore: response.ihsan_score,
        latencyMs: response.latency_ms,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const updated = [...prev, patMessage];
        if (updated.length > maxHistory) {
          return updated.slice(-maxHistory);
        }
        return updated;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Add error message to chat
      const errMessage: ChatMessage = {
        id: generateId('error'),
        from: 'pat',
        text: `Error: ${errorMessage}`,
        agentRole: activeRole,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errMessage]);
    } finally {
      setLoading(false);
    }
  }, [loading, activeRole, sessionId, maxHistory, generateId]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    messageIdCounter.current = 0;
  }, []);

  return {
    messages,
    loading,
    error,
    activeRole,
    setActiveRole,
    sendMessage,
    clearHistory,
    availableRoles: ALL_ROLES,
    sessionId,
  };
}

export default usePatChat;
