/**
 * BIZRA Genesis Node - Monitoring Service
 * 
 * Elite Practitioner Implementation featuring:
 * - Core Web Vitals tracking (LCP, FID, CLS, FCP, TTFB)
 * - Custom business metrics
 * - Real-time alerting
 * - Performance budgets
 * - Error tracking
 * - User journey analytics
 * - System health monitoring
 * 
 * @module BIZRAMonitoring
 * @version 2.0.0
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface ErrorEvent {
  id: string;
  type: 'error' | 'unhandled-rejection' | 'api-error' | 'validation';
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: number;
  handled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  type: 'performance' | 'error' | 'threshold' | 'anomaly';
  severity: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface UserJourneyEvent {
  id: string;
  type: 'page_view' | 'click' | 'form_submit' | 'custom';
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface PerformanceBudget {
  metric: string;
  warning: number;
  error: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  reportingEndpoint?: string;
  webVitalsEnabled: boolean;
  errorTrackingEnabled: boolean;
  analyticsEnabled: boolean;
  performanceBudgets: PerformanceBudget[];
  alertThresholds: Record<string, number>;
}

// =============================================================================
// THRESHOLDS & BUDGETS
// =============================================================================

const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

const DEFAULT_PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { metric: 'LCP', warning: 2500, error: 4000 },
  { metric: 'FID', warning: 100, error: 300 },
  { metric: 'CLS', warning: 0.1, error: 0.25 },
  { metric: 'bundle-size', warning: 500000, error: 1000000 }, // bytes
  { metric: 'api-response-time', warning: 1000, error: 3000 }, // ms
];

// =============================================================================
// WEB VITALS COLLECTOR
// =============================================================================

class WebVitalsCollector {
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private observers: Set<(metric: WebVitalsMetric) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers(): void {
    // Largest Contentful Paint
    this.observeLCP();
    
    // First Input Delay / Interaction to Next Paint
    this.observeFID();
    
    // Cumulative Layout Shift
    this.observeCLS();
    
    // First Contentful Paint
    this.observeFCP();
    
    // Time to First Byte
    this.observeTTFB();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: this.getRating('LCP', lastEntry.startTime),
          delta: lastEntry.startTime,
          id: `lcp-${Date.now()}`,
          navigationType: this.getNavigationType(),
        });
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('[Monitoring] LCP observer error:', e);
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
          const value = fidEntry.processingStart - fidEntry.startTime;
          
          this.recordMetric({
            name: 'FID',
            value,
            rating: this.getRating('FID', value),
            delta: value,
            id: `fid-${Date.now()}`,
            navigationType: this.getNavigationType(),
          });
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('[Monitoring] FID observer error:', e);
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
            clsEntries.push(entry);
          }
        });

        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          rating: this.getRating('CLS', clsValue),
          delta: clsValue,
          id: `cls-${Date.now()}`,
          navigationType: this.getNavigationType(),
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('[Monitoring] CLS observer error:', e);
    }
  }

  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntriesByName('first-contentful-paint');
        if (entries.length > 0) {
          const fcp = entries[0];
          
          this.recordMetric({
            name: 'FCP',
            value: fcp.startTime,
            rating: this.getRating('FCP', fcp.startTime),
            delta: fcp.startTime,
            id: `fcp-${Date.now()}`,
            navigationType: this.getNavigationType(),
          });
        }
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('[Monitoring] FCP observer error:', e);
    }
  }

  private observeTTFB(): void {
    if (typeof window === 'undefined') return;

    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      
      this.recordMetric({
        name: 'TTFB',
        value: ttfb,
        rating: this.getRating('TTFB', ttfb),
        delta: ttfb,
        id: `ttfb-${Date.now()}`,
        navigationType: this.getNavigationType(),
      });
    }
  }

  private getRating(metric: keyof typeof WEB_VITALS_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = WEB_VITALS_THRESHOLDS[metric];
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private getNavigationType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigationEntry?.type || 'unknown';
  }

  private recordMetric(metric: WebVitalsMetric): void {
    this.metrics.set(metric.name, metric);
    this.observers.forEach((callback) => callback(metric));
  }

  subscribe(callback: (metric: WebVitalsMetric) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  getMetrics(): Map<string, WebVitalsMetric> {
    return new Map(this.metrics);
  }

  getMetric(name: WebVitalsMetric['name']): WebVitalsMetric | undefined {
    return this.metrics.get(name);
  }
}

// =============================================================================
// ERROR TRACKER
// =============================================================================

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private readonly maxErrors = 100;
  private observers: Set<(error: ErrorEvent) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers();
    }
  }

  private setupGlobalHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.track({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        severity: 'high',
        handled: false,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.track({
        type: 'unhandled-rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: {},
        severity: 'high',
        handled: false,
      });
    });
  }

  track(error: Omit<ErrorEvent, 'id' | 'timestamp' | 'handled'> & { handled?: boolean }): void {
    const errorEvent: ErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      handled: error.handled ?? true,
      ...error,
    };

    this.errors.push(errorEvent);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Notify observers
    this.observers.forEach((callback) => callback(errorEvent));
  }

  trackAPIError(endpoint: string, status: number, message: string, context?: Record<string, unknown>): void {
    this.track({
      type: 'api-error',
      message: `API Error: ${endpoint} - ${status} - ${message}`,
      context: { endpoint, status, ...context },
      severity: status >= 500 ? 'critical' : 'medium',
    });
  }

  subscribe(callback: (error: ErrorEvent) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  getErrors(options?: { type?: ErrorEvent['type']; severity?: ErrorEvent['severity'] }): ErrorEvent[] {
    let filtered = [...this.errors];

    if (options?.type) {
      filtered = filtered.filter((e) => e.type === options.type);
    }

    if (options?.severity) {
      filtered = filtered.filter((e) => e.severity === options.severity);
    }

    return filtered;
  }

  getRecentErrors(count = 10): ErrorEvent[] {
    return this.errors.slice(-count);
  }

  clear(): void {
    this.errors = [];
  }
}

// =============================================================================
// ANALYTICS TRACKER
// =============================================================================

class AnalyticsTracker {
  private sessionId: string;
  private userId?: string;
  private events: UserJourneyEvent[] = [];
  private readonly maxEvents = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPageViewTracking();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  private setupPageViewTracking(): void {
    if (typeof window === 'undefined') return;

    // Track initial page view
    this.trackPageView(window.location.pathname);

    // Track navigation changes
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };

    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    this.trackEvent('page_view', path, {
      path,
      referrer: document?.referrer,
      ...properties,
    });
  }

  trackClick(element: string, properties?: Record<string, unknown>): void {
    this.trackEvent('click', element, properties);
  }

  trackFormSubmit(formName: string, properties?: Record<string, unknown>): void {
    this.trackEvent('form_submit', formName, properties);
  }

  trackCustom(name: string, properties?: Record<string, unknown>): void {
    this.trackEvent('custom', name, properties);
  }

  private trackEvent(
    type: UserJourneyEvent['type'],
    name: string,
    properties?: Record<string, unknown>
  ): void {
    const event: UserJourneyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      name,
      properties: properties || {},
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  getEvents(options?: { type?: UserJourneyEvent['type']; since?: number }): UserJourneyEvent[] {
    let filtered = [...this.events];

    if (options?.type) {
      filtered = filtered.filter((e) => e.type === options.type);
    }

    if (options?.since) {
      filtered = filtered.filter((e) => e.timestamp >= options.since);
    }

    return filtered;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clear(): void {
    this.events = [];
  }
}

// =============================================================================
// ALERT MANAGER
// =============================================================================

class AlertManager {
  private alerts: Alert[] = [];
  private readonly maxAlerts = 50;
  private observers: Set<(alert: Alert) => void> = new Set();

  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Alert {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      acknowledged: false,
      ...alert,
    };

    this.alerts.push(newAlert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Notify observers
    this.observers.forEach((callback) => callback(newAlert));

    return newAlert;
  }

  acknowledge(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  acknowledgeAll(): void {
    this.alerts.forEach((alert) => {
      alert.acknowledged = true;
    });
  }

  subscribe(callback: (alert: Alert) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  getAlerts(options?: { severity?: Alert['severity']; acknowledged?: boolean }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter((a) => a.acknowledged === options.acknowledged);
    }

    return filtered;
  }

  getUnacknowledgedCount(): number {
    return this.alerts.filter((a) => !a.acknowledged).length;
  }

  clear(): void {
    this.alerts = [];
  }
}

// =============================================================================
// MAIN MONITORING SERVICE
// =============================================================================

export class BIZRAMonitoring {
  private config: MonitoringConfig;
  private webVitals: WebVitalsCollector;
  private errorTracker: ErrorTracker;
  private analytics: AnalyticsTracker;
  private alertManager: AlertManager;
  private customMetrics: CustomMetric[] = [];
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      webVitalsEnabled: true,
      errorTrackingEnabled: true,
      analyticsEnabled: true,
      performanceBudgets: DEFAULT_PERFORMANCE_BUDGETS,
      alertThresholds: {},
      ...config,
    };

    this.webVitals = new WebVitalsCollector();
    this.errorTracker = new ErrorTracker();
    this.analytics = new AnalyticsTracker();
    this.alertManager = new AlertManager();

    this.setupWebVitalsAlerts();
    this.startReporting();
  }

  // ===========================================================================
  // WEB VITALS
  // ===========================================================================

  private setupWebVitalsAlerts(): void {
    this.webVitals.subscribe((metric) => {
      // Check against performance budgets
      const budget = this.config.performanceBudgets.find((b) => b.metric === metric.name);

      if (budget) {
        if (metric.value >= budget.error) {
          this.alertManager.createAlert({
            type: 'performance',
            severity: 'error',
            title: `${metric.name} exceeded error threshold`,
            message: `${metric.name} is ${metric.value.toFixed(2)}, threshold is ${budget.error}`,
            metric: metric.name,
            value: metric.value,
            threshold: budget.error,
          });
        } else if (metric.value >= budget.warning) {
          this.alertManager.createAlert({
            type: 'performance',
            severity: 'warning',
            title: `${metric.name} exceeded warning threshold`,
            message: `${metric.name} is ${metric.value.toFixed(2)}, threshold is ${budget.warning}`,
            metric: metric.name,
            value: metric.value,
            threshold: budget.warning,
          });
        }
      }
    });
  }

  getWebVitals(): Map<string, WebVitalsMetric> {
    return this.webVitals.getMetrics();
  }

  subscribeToWebVitals(callback: (metric: WebVitalsMetric) => void): () => void {
    return this.webVitals.subscribe(callback);
  }

  // ===========================================================================
  // CUSTOM METRICS
  // ===========================================================================

  recordMetric(name: string, value: number, options?: { unit?: string; tags?: Record<string, string> }): void {
    const metric: CustomMetric = {
      name,
      value,
      unit: options?.unit,
      tags: options?.tags,
      timestamp: Date.now(),
    };

    this.customMetrics.push(metric);

    // Check thresholds
    const threshold = this.config.alertThresholds[name];
    if (threshold && value >= threshold) {
      this.alertManager.createAlert({
        type: 'threshold',
        severity: 'warning',
        title: `Metric ${name} exceeded threshold`,
        message: `${name} is ${value}, threshold is ${threshold}`,
        metric: name,
        value,
        threshold,
      });
    }

    // Keep only recent metrics (last 1000)
    if (this.customMetrics.length > 1000) {
      this.customMetrics = this.customMetrics.slice(-1000);
    }
  }

  getMetrics(name?: string): CustomMetric[] {
    if (name) {
      return this.customMetrics.filter((m) => m.name === name);
    }
    return [...this.customMetrics];
  }

  // ===========================================================================
  // ERROR TRACKING
  // ===========================================================================

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.errorTracker.track({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context: context || {},
      severity: 'high',
    });
  }

  trackAPIError(endpoint: string, status: number, message: string): void {
    this.errorTracker.trackAPIError(endpoint, status, message);
  }

  subscribeToErrors(callback: (error: ErrorEvent) => void): () => void {
    return this.errorTracker.subscribe(callback);
  }

  getErrors(): ErrorEvent[] {
    return this.errorTracker.getErrors();
  }

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    this.analytics.trackPageView(path, properties);
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.analytics.trackCustom(name, properties);
  }

  trackClick(element: string): void {
    this.analytics.trackClick(element);
  }

  setUserId(userId: string): void {
    this.analytics.setUserId(userId);
  }

  getAnalyticsEvents(): UserJourneyEvent[] {
    return this.analytics.getEvents();
  }

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Alert {
    return this.alertManager.createAlert(alert);
  }

  acknowledgeAlert(alertId: string): void {
    this.alertManager.acknowledge(alertId);
  }

  subscribeToAlerts(callback: (alert: Alert) => void): () => void {
    return this.alertManager.subscribe(callback);
  }

  getAlerts(): Alert[] {
    return this.alertManager.getAlerts();
  }

  getUnacknowledgedAlertsCount(): number {
    return this.alertManager.getUnacknowledgedCount();
  }

  // ===========================================================================
  // REPORTING
  // ===========================================================================

  private startReporting(): void {
    if (!this.config.reportingEndpoint) return;

    this.reportingInterval = setInterval(() => {
      this.sendReport();
    }, 60000); // Report every minute
  }

  private async sendReport(): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    const report = {
      timestamp: Date.now(),
      webVitals: Object.fromEntries(this.webVitals.getMetrics()),
      customMetrics: this.customMetrics.slice(-100),
      errors: this.errorTracker.getRecentErrors(20),
      alerts: this.alertManager.getAlerts({ acknowledged: false }),
    };

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to send report:', error);
    }
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================

  getSummary(): {
    webVitals: Record<string, number>;
    errorCount: number;
    alertCount: number;
    pageViews: number;
    avgApiResponseTime: number;
  } {
    const webVitals: Record<string, number> = {};
    this.webVitals.getMetrics().forEach((metric, name) => {
      webVitals[name] = metric.value;
    });

    const apiMetrics = this.customMetrics.filter((m) => m.name === 'api-response-time');
    const avgApiResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;

    return {
      webVitals,
      errorCount: this.errorTracker.getErrors().length,
      alertCount: this.alertManager.getUnacknowledgedCount(),
      pageViews: this.analytics.getEvents({ type: 'page_view' }).length,
      avgApiResponseTime,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let monitoringInstance: BIZRAMonitoring | null = null;

export function getBIZRAMonitoring(): BIZRAMonitoring {
  if (!monitoringInstance) {
    monitoringInstance = new BIZRAMonitoring();
  }
  return monitoringInstance;
}

export function createBIZRAMonitoring(config?: Partial<MonitoringConfig>): BIZRAMonitoring {
  return new BIZRAMonitoring(config);
}

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useMonitoring(): BIZRAMonitoring {
  return getBIZRAMonitoring();
}

export function useWebVitals(): Map<string, WebVitalsMetric> {
  // In production, this would use React state
  return getBIZRAMonitoring().getWebVitals();
}

export function useAlerts(): Alert[] {
  // In production, this would use React state with subscription
  return getBIZRAMonitoring().getAlerts();
}

export default BIZRAMonitoring;
