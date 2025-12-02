/**
 * BIZRA Genesis Node - Sovereignty Guard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Runtime enforcement of AI sovereignty principles:
 * - Blocks any attempt to use cloud AI APIs
 * - Validates all AI calls go through local Ollama/LM Studio
 * - Provides sovereignty verification for PoI attestation
 * 
 * Core Principle: "Your AI, Your Data, Your Sovereignty"
 * 
 * @module sovereignty-guard
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGNTY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Blocked cloud AI domains - these should NEVER be called
 */
const BLOCKED_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
  'api.together.xyz',
  'api.replicate.com',
  'api.groq.com',
  'api.mistral.ai',
  'api.perplexity.ai',
  'api.ai21.com',
  'api-inference.huggingface.co',
] as const;

/**
 * Allowed local AI endpoints
 */
const ALLOWED_ENDPOINTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal',
] as const;

/**
 * Standard local AI ports
 */
const KNOWN_LOCAL_PORTS = {
  ollama: 11434,
  lmStudio: 1234,
  localai: 8080,
  textGenWebUI: 7860,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereigntyStatus {
  isSovereign: boolean;
  localEndpoints: LocalEndpoint[];
  violations: SovereigntyViolation[];
  lastCheck: number;
  attestation?: SovereigntyAttestation;
}

export interface LocalEndpoint {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
  models?: string[];
  lastPing?: number;
}

export interface SovereigntyViolation {
  timestamp: number;
  type: 'blocked_request' | 'suspicious_import' | 'config_violation';
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SovereigntyAttestation {
  nodeId: string;
  timestamp: number;
  hash: string;
  endpoints: string[];
  signature?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGNTY GUARD CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class SovereigntyGuard {
  private static instance: SovereigntyGuard;
  private violations: SovereigntyViolation[] = [];
  private localEndpoints: LocalEndpoint[] = [];
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): SovereigntyGuard {
    if (!SovereigntyGuard.instance) {
      SovereigntyGuard.instance = new SovereigntyGuard();
    }
    return SovereigntyGuard.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Install fetch interceptor
    this.installFetchGuard();

    // Discover local endpoints
    await this.discoverLocalEndpoints();

    this.isInitialized = true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FETCH INTERCEPTOR
  // ─────────────────────────────────────────────────────────────────────────────

  private installFetchGuard(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    const guard = this;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Check if this is a blocked cloud AI endpoint
      if (guard.isBlockedEndpoint(url)) {
        const violation: SovereigntyViolation = {
          timestamp: Date.now(),
          type: 'blocked_request',
          details: `Blocked request to cloud AI: ${url}`,
          severity: 'critical',
        };
        guard.violations.push(violation);
        
        console.error(`[SovereigntyGuard] 🛡️ BLOCKED: Request to ${url} violates AI sovereignty`);
        
        // Return a mock error response
        return new Response(
          JSON.stringify({
            error: 'SOVEREIGNTY_VIOLATION',
            message: 'BIZRA enforces local-first AI. Cloud AI endpoints are blocked.',
            suggestion: 'Use Ollama at localhost:11434 or LM Studio at localhost:1234',
          }),
          {
            status: 403,
            statusText: 'Forbidden - Sovereignty Violation',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return originalFetch.call(window, input, init);
    };
  }

  private isBlockedEndpoint(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return BLOCKED_DOMAINS.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOCAL ENDPOINT DISCOVERY
  // ─────────────────────────────────────────────────────────────────────────────

  private async discoverLocalEndpoints(): Promise<void> {
    const endpoints: LocalEndpoint[] = [];

    // Check Ollama
    try {
      const ollamaUrl = `http://localhost:${KNOWN_LOCAL_PORTS.ollama}`;
      const response = await fetch(`${ollamaUrl}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        endpoints.push({
          name: 'Ollama',
          url: ollamaUrl,
          status: 'online',
          models: data.models?.map((m: { name: string }) => m.name) || [],
          lastPing: Date.now(),
        });
      }
    } catch {
      endpoints.push({
        name: 'Ollama',
        url: `http://localhost:${KNOWN_LOCAL_PORTS.ollama}`,
        status: 'offline',
      });
    }

    // Check LM Studio
    try {
      const lmStudioUrl = `http://localhost:${KNOWN_LOCAL_PORTS.lmStudio}`;
      const response = await fetch(`${lmStudioUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        endpoints.push({
          name: 'LM Studio',
          url: lmStudioUrl,
          status: 'online',
          models: data.data?.map((m: { id: string }) => m.id) || [],
          lastPing: Date.now(),
        });
      }
    } catch {
      endpoints.push({
        name: 'LM Studio',
        url: `http://localhost:${KNOWN_LOCAL_PORTS.lmStudio}`,
        status: 'offline',
      });
    }

    this.localEndpoints = endpoints;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate that a URL points to a local endpoint
   */
  validateEndpoint(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ALLOWED_ENDPOINTS.some(allowed => 
        parsed.hostname === allowed || parsed.hostname.endsWith('.local')
      );
    } catch {
      return false;
    }
  }

  /**
   * Get current sovereignty status
   */
  async getStatus(): Promise<SovereigntyStatus> {
    await this.discoverLocalEndpoints();

    const hasActiveLocal = this.localEndpoints.some(e => e.status === 'online');
    const hasViolations = this.violations.length > 0;

    return {
      isSovereign: hasActiveLocal && !hasViolations,
      localEndpoints: [...this.localEndpoints],
      violations: [...this.violations],
      lastCheck: Date.now(),
      attestation: this.generateAttestation(),
    };
  }

  /**
   * Get available local models
   */
  getLocalModels(): string[] {
    return this.localEndpoints
      .filter(e => e.status === 'online')
      .flatMap(e => e.models || []);
  }

  /**
   * Check if any local AI endpoint is available
   */
  isLocalAIAvailable(): boolean {
    return this.localEndpoints.some(e => e.status === 'online');
  }

  /**
   * Get violations
   */
  getViolations(): SovereigntyViolation[] {
    return [...this.violations];
  }

  /**
   * Clear violations (after review)
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Generate sovereignty attestation for PoI
   */
  private generateAttestation(): SovereigntyAttestation {
    const endpoints = this.localEndpoints
      .filter(e => e.status === 'online')
      .map(e => e.url);

    const attestationData = {
      timestamp: Date.now(),
      endpoints,
      violations: this.violations.length,
    };

    // Simple hash for attestation (in production, use proper crypto)
    const hash = btoa(JSON.stringify(attestationData)).slice(0, 32);

    return {
      nodeId: this.getNodeId(),
      timestamp: Date.now(),
      hash,
      endpoints,
    };
  }

  private getNodeId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let nodeId = localStorage.getItem('bizra_node_id');
    if (!nodeId) {
      nodeId = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('bizra_node_id', nodeId);
    }
    return nodeId;
  }

  /**
   * Refresh endpoint discovery
   */
  async refresh(): Promise<void> {
    await this.discoverLocalEndpoints();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const sovereigntyGuard = typeof window !== 'undefined'
  ? SovereigntyGuard.getInstance()
  : null;

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for sovereignty status monitoring
 */
export function useSovereigntyStatus() {
  const [status, setStatus] = useState<SovereigntyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sovereigntyGuard) return;
    
    setLoading(true);
    const newStatus = await sovereigntyGuard.getStatus();
    setStatus(newStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, loading, refresh };
}

/**
 * Hook for local model availability
 */
export function useLocalModels() {
  const [models, setModels] = useState<string[]>([]);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!sovereigntyGuard) return;

    const checkModels = async () => {
      await sovereigntyGuard.refresh();
      setModels(sovereigntyGuard.getLocalModels());
      setAvailable(sovereigntyGuard.isLocalAIAvailable());
    };

    checkModels();
    const interval = setInterval(checkModels, 30000);
    return () => clearInterval(interval);
  }, []);

  return { models, available };
}
