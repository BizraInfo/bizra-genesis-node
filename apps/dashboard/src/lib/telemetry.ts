/**
 * BIZRA Genesis Node - Telemetry & Observability Core
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Professional-grade observability layer implementing:
 * - Performance monitoring with Web Vitals
 * - Error boundary telemetry
 * - User journey analytics (privacy-first, local-only)
 * - System health correlation
 * 
 * Architecture: Observer Pattern + Event Sourcing
 * Standard: OpenTelemetry-compatible structure
 * 
 * @module telemetry
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type TelemetryEventType = 
  | 'page_view'
  | 'interaction'
  | 'error'
  | 'performance'
  | 'lifecycle'
  | 'ai_inference'
  | 'poi_recorded'
  | 'system_health';

export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  timestamp: number;
  sessionId: string;
  payload: Record<string, unknown>;
  metadata: {
    locale: string;
    viewport: { width: number; height: number };
    connection?: string;
    deviceMemory?: number;
  };
}

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint
  ttfb?: number; // Time to First Byte
  inp?: number;  // Interaction to Next Paint
  
  // Custom metrics
  hydrationTime?: number;
  routeChangeTime?: number;
  apiLatency?: Record<string, number>;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  gpu?: number;
  ollamaStatus: 'connected' | 'disconnected' | 'error';
  apiStatus: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEMETRY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class TelemetryEngine {
  private static instance: TelemetryEngine;
  private sessionId: string;
  private events: TelemetryEvent[] = [];
  private metrics: PerformanceMetrics = {};
  private health: SystemHealth | null = null;
  private observers: Map<TelemetryEventType, Set<(event: TelemetryEvent) => void>> = new Map();
  private isEnabled: boolean = true;
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
    this.startFlushInterval();
  }

  static getInstance(): TelemetryEngine {
    if (!TelemetryEngine.instance) {
      TelemetryEngine.instance = new TelemetryEngine();
    }
    return TelemetryEngine.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Record a telemetry event
   */
  record(type: TelemetryEventType, payload: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const event: TelemetryEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      payload,
      metadata: this.collectMetadata(),
    };

    this.events.push(event);
    this.notifyObservers(event);

    // Prevent memory bloat
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS / 2);
    }
  }

  /**
   * Record a page view
   */
  pageView(path: string, title?: string): void {
    this.record('page_view', {
      path,
      title: title || document.title,
      referrer: document.referrer || null,
    });
  }

  /**
   * Record a user interaction
   */
  interaction(action: string, target: string, value?: unknown): void {
    this.record('interaction', {
      action,
      target,
      value,
    });
  }

  /**
   * Record an error
   */
  error(error: Error, context?: Record<string, unknown>): void {
    this.record('error', {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 1000),
      ...context,
    });
  }

  /**
   * Record AI inference metrics
   */
  aiInference(agent: string, model: string, latencyMs: number, tokensGenerated?: number): void {
    this.record('ai_inference', {
      agent,
      model,
      latencyMs,
      tokensGenerated,
      tokensPerSecond: tokensGenerated ? (tokensGenerated / latencyMs) * 1000 : undefined,
    });
  }

  /**
   * Record Proof-of-Impact event
   */
  poiRecorded(eventType: string, impactScore: number, ihsanScore: number): void {
    this.record('poi_recorded', {
      eventType,
      impactScore,
      ihsanScore,
    });
  }

  /**
   * Update system health
   */
  updateHealth(health: Partial<SystemHealth>): void {
    this.health = {
      ...this.health,
      ...health,
      lastCheck: Date.now(),
    } as SystemHealth;

    this.record('system_health', { ...this.health });
  }

  /**
   * Subscribe to telemetry events
   */
  subscribe(type: TelemetryEventType, callback: (event: TelemetryEvent) => void): () => void {
    if (!this.observers.has(type)) {
      this.observers.set(type, new Set());
    }
    this.observers.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.observers.get(type)?.delete(callback);
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current system health
   */
  getHealth(): SystemHealth | null {
    return this.health ? { ...this.health } : null;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(): {
    sessionId: string;
    startTime: number;
    eventCount: number;
    pageViews: number;
    interactions: number;
    errors: number;
  } {
    return {
      sessionId: this.sessionId,
      startTime: this.events[0]?.timestamp || Date.now(),
      eventCount: this.events.length,
      pageViews: this.events.filter(e => e.type === 'page_view').length,
      interactions: this.events.filter(e => e.type === 'interaction').length,
      errors: this.events.filter(e => e.type === 'error').length,
    };
  }

  /**
   * Export telemetry data (for local backup/analysis)
   */
  export(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: Date.now(),
      metrics: this.metrics,
      health: this.health,
      events: this.events,
    }, null, 2);
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private generateSessionId(): string {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('bizra_session_id') : null;
    if (stored) return stored;

    const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bizra_session_id', newId);
    }
    return newId;
  }

  private generateEventId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private collectMetadata(): TelemetryEvent['metadata'] {
    if (typeof window === 'undefined') {
      return { locale: 'en', viewport: { width: 0, height: 0 } };
    }

    const nav = navigator as Navigator & { 
      connection?: { effectiveType?: string };
      deviceMemory?: number;
    };

    return {
      locale: localStorage.getItem('bizra-language') || navigator.language || 'en',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: nav.connection?.effectiveType,
      deviceMemory: nav.deviceMemory,
    };
  }

  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Use Performance Observer for Core Web Vitals
    try {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        this.metrics.lcp = lastEntry.startTime;
        this.record('performance', { metric: 'lcp', value: lastEntry.startTime });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };
        const fid = firstEntry.processingStart - firstEntry.startTime;
        this.metrics.fid = fid;
        this.record('performance', { metric: 'fid', value: fid });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // FCP
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
          this.record('performance', { metric: 'fcp', value: fcpEntry.startTime });
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // TTFB from navigation timing
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      }
    } catch {
      // PerformanceObserver not supported
      console.debug('[Telemetry] Web Vitals not supported in this environment');
    }
  }

  private notifyObservers(event: TelemetryEvent): void {
    this.observers.get(event.type)?.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[Telemetry] Observer error:', error);
      }
    });
  }

  private startFlushInterval(): void {
    if (typeof window === 'undefined') return;

    // Periodic flush to IndexedDB for persistence
    setInterval(() => {
      this.persistToStorage();
    }, this.FLUSH_INTERVAL);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.persistToStorage();
    });
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined' || this.events.length === 0) return;

    try {
      // Store in localStorage (limited, but reliable)
      const key = `bizra_telemetry_${this.sessionId}`;
      const data = {
        metrics: this.metrics,
        eventCount: this.events.length,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage full or disabled
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const telemetry = typeof window !== 'undefined' 
  ? TelemetryEngine.getInstance() 
  : null;

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook for automatic page view tracking
 */
export function usePageTracking(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (telemetry && pathname) {
      telemetry.pageView(pathname);
    }
  }, [pathname]);
}

/**
 * Hook for interaction tracking
 */
export function useInteractionTracking() {
  const trackClick = useCallback((action: string, target: string, value?: unknown) => {
    telemetry?.interaction(action, target, value);
  }, []);

  return { trackClick };
}

/**
 * Hook for error tracking
 */
export function useErrorTracking() {
  const trackError = useCallback((error: Error, context?: Record<string, unknown>) => {
    telemetry?.error(error, context);
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      telemetry?.error(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      telemetry?.error(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandledRejection' }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return { trackError };
}

/**
 * Hook for performance metrics
 */
export function usePerformanceMetrics(): PerformanceMetrics {
  return telemetry?.getMetrics() || {};
}
