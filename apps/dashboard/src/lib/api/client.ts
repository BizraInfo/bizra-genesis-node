/**
 * BIZRA Genesis Node - Advanced API Client
 * 
 * Elite Practitioner Implementation featuring:
 * - Circuit Breaker Pattern for fault tolerance
 * - Exponential backoff retry mechanism
 * - Request queuing and batching
 * - Real-time WebSocket integration
 * - Comprehensive error handling
 * - Performance metrics collection
 * 
 * @module BIZRAAPIClient
 * @version 2.0.0
 */

import { SACRED_FREQUENCIES } from '../design-system';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface APIResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  cached: boolean;
}

export interface APIError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  priority?: 'high' | 'normal' | 'low';
  signal?: AbortSignal;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: number | null;
  successCount: number;
}

export interface MetricsData {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  circuitBreakerTrips: number;
  cacheHits: number;
  cacheMisses: number;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'CLOSED',
    failures: 0,
    lastFailure: null,
    successCount: 0,
  };

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(
    failureThreshold = 5,
    resetTimeout = 30000,
    halfOpenSuccessThreshold = 3
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'HALF_OPEN';
        this.state.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - request blocked');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.state.lastFailure) {return true;}
    return Date.now() - this.state.lastFailure >= this.resetTimeout;
  }

  private onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++;
      if (this.state.successCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.failureThreshold) {
      this.state.state = 'OPEN';
    }
  }

  private reset(): void {
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailure: null,
      successCount: 0,
    };
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// =============================================================================
// RETRY MECHANISM
// =============================================================================

class RetryMechanism {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: unknown, attempt: number) => boolean = () => true
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries && shouldRetry(error, attempt)) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// REQUEST QUEUE
// =============================================================================

interface QueuedRequest {
  id: string;
  priority: number;
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly concurrency: number;
  private activeRequests = 0;

  constructor(concurrency = 6) {
    this.concurrency = concurrency;
  }

  async add<T>(
    execute: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const priorityValue = { high: 3, normal: 2, low: 1 }[priority];

      this.queue.push({
        id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        priority: priorityValue,
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      });

      // Sort by priority (descending) and timestamp (ascending)
      this.queue.sort((a, b) => {
        if (b.priority !== a.priority) {return b.priority - a.priority;}
        return a.timestamp - b.timestamp;
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {return;}
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.concurrency) {
      const request = this.queue.shift();
      if (!request) {break;}

      this.activeRequests++;

      request
        .execute()
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.processing = false;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.activeRequests;
  }
}

// =============================================================================
// CACHE MANAGER
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL: number;

  constructor(defaultTTL = 60000) {
    this.defaultTTL = defaultTTL;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {return null;}

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      etag,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getETag(key: string): string | undefined {
    const entry = this.cache.get(key);
    return entry?.etag;
  }

  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// =============================================================================
// MAIN API CLIENT
// =============================================================================

export class BIZRAAPIClient {
  private readonly baseURL: string;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryMechanism: RetryMechanism;
  private readonly requestQueue: RequestQueue;
  private readonly cacheManager: CacheManager;
  private readonly defaultHeaders: Record<string, string>;

  // Metrics
  private metrics: MetricsData = {
    requestCount: 0,
    errorCount: 0,
    avgResponseTime: 0,
    circuitBreakerTrips: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  // WebSocket
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private readonly maxWsReconnectAttempts = 10;
  private wsListeners = new Map<string, Set<(data: unknown) => void>>();

  // Event emitter for internal events
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || '/api',
    options: {
      timeout?: number;
      retries?: number;
      cacheEnabled?: boolean;
      wsURL?: string;
    } = {}
  ) {
    this.baseURL = baseURL;
    this.circuitBreaker = new CircuitBreaker(5, 30000, 3);
    this.retryMechanism = new RetryMechanism(options.retries ?? 3, 1000, 30000);
    this.requestQueue = new RequestQueue(6);
    this.cacheManager = new CacheManager(60000);

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': '2.0.0',
      'X-Request-ID': '',
    };

    // Start cache pruning interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.cacheManager.prune(), 60000);

      // Connect WebSocket if URL provided
      if (options.wsURL) {
        this.connectWebSocket(options.wsURL);
      }
    }
  }

  // ===========================================================================
  // CORE REQUEST METHOD
  // ===========================================================================

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      cache = method === 'GET',
      priority = 'normal',
      signal,
    } = config;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = this.cacheManager.get<T>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return {
          data: cached,
          status: 200,
          headers: {},
          timing: { start: Date.now(), end: Date.now(), duration: 0 },
          cached: true,
        };
      }
      this.metrics.cacheMisses++;
    }

    // Queue and execute request
    return this.requestQueue.add(async () => {
      const startTime = Date.now();
      this.metrics.requestCount++;

      try {
        const result = await this.circuitBreaker.execute(async () => {
          return this.retryMechanism.execute(
            async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeout);

              try {
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                  method,
                  headers: {
                    ...this.defaultHeaders,
                    ...headers,
                    'X-Request-ID': requestId,
                  },
                  body: body ? JSON.stringify(body) : undefined,
                  signal: signal || controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                  const error: APIError = {
                    code: `HTTP_${response.status}`,
                    message: response.statusText,
                    status: response.status,
                    timestamp: Date.now(),
                    requestId,
                  };
                  throw error;
                }

                const data = await response.json();
                const endTime = Date.now();

                // Update metrics
                this.updateAvgResponseTime(endTime - startTime);

                // Cache successful GET responses
                if (cache && method === 'GET') {
                  const etag = response.headers.get('ETag') || undefined;
                  this.cacheManager.set(cacheKey, data, 60000, etag);
                }

                // Get response headers
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                  responseHeaders[key] = value;
                });

                return {
                  data: data as T,
                  status: response.status,
                  headers: responseHeaders,
                  timing: {
                    start: startTime,
                    end: endTime,
                    duration: endTime - startTime,
                  },
                  cached: false,
                };
              } catch (error) {
                clearTimeout(timeoutId);
                throw error;
              }
            },
            (error, _attempt) => {
              // Retry on network errors and 5xx status codes
              if (error instanceof Error && error.name === 'AbortError') {
                return false; // Don't retry aborted requests
              }
              const apiError = error as APIError;
              return !apiError.status || apiError.status >= 500;
            }
          );
        });

        return result;
      } catch (error) {
        this.metrics.errorCount++;

        if ((error as Error).message?.includes('Circuit breaker')) {
          this.metrics.circuitBreakerTrips++;
        }

        this.emit('error', { error, endpoint, requestId });
        throw error;
      }
    }, priority) as Promise<APIResponse<T>>;
  }

  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================

  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  // ===========================================================================
  // BIZRA-SPECIFIC API METHODS
  // ===========================================================================

  /**
   * Fetch consciousness metrics
   */
  async getConsciousnessMetrics(): Promise<APIResponse<{
    consciousness_level: number;
    coherence_score: number;
    frequency: number;
    resonance: number;
  }>> {
    return this.get('/metrics');
  }

  /**
   * Fetch agent status (PAT & SAT)
   */
  async getAgentStatus(): Promise<APIResponse<{
    pat: { status: string; efficiency: number; tasks_completed: number };
    sat: { status: string; wisdom_index: number; consultations: number };
  }>> {
    return this.get('/agents');
  }

  /**
   * Submit consciousness alignment
   */
  async submitAlignment(frequency: number = SACRED_FREQUENCIES.love): Promise<APIResponse<{
    aligned: boolean;
    new_level: number;
    message: string;
  }>> {
    return this.post('/consciousness/align', { frequency });
  }

  /**
   * Get system health
   */
  async getHealth(): Promise<APIResponse<{
    status: string;
    backend: string;
    timestamp: string;
  }>> {
    return this.get('/health');
  }

  /**
   * Get blockchain state
   */
  async getBlockchainState(): Promise<APIResponse<{
    blocks_processed: number;
    transactions: number;
    integrity: number;
    network_status: string;
  }>> {
    return this.get('/blockchain/state');
  }

  /**
   * Get impact metrics
   */
  async getImpactMetrics(): Promise<APIResponse<{
    global_reach: number;
    consciousness_raised: number;
    communities_served: number;
    transformation_index: number;
  }>> {
    return this.get('/impact');
  }

  // ===========================================================================
  // WEBSOCKET METHODS
  // ===========================================================================

  connectWebSocket(url?: string): void {
    if (typeof window === 'undefined') {return;}

    const wsURL = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

    try {
      this.ws = new WebSocket(wsURL);

      this.ws.onopen = () => {
        console.log('[BIZRA API] WebSocket connected');
        this.wsReconnectAttempts = 0;
        this.emit('ws:connected', { url: wsURL });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          // Notify specific listeners
          const listeners = this.wsListeners.get(type);
          if (listeners) {
            listeners.forEach((callback) => callback(payload));
          }

          // Emit general message event
          this.emit('ws:message', data);
        } catch (error) {
          console.error('[BIZRA API] WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[BIZRA API] WebSocket disconnected');
        this.emit('ws:disconnected', {});
        this.attemptWsReconnect(wsURL);
      };

      this.ws.onerror = (error) => {
        console.error('[BIZRA API] WebSocket error:', error);
        this.emit('ws:error', { error });
      };
    } catch (error) {
      console.error('[BIZRA API] WebSocket connection error:', error);
    }
  }

  private attemptWsReconnect(url: string): void {
    if (this.wsReconnectAttempts >= this.maxWsReconnectAttempts) {
      console.error('[BIZRA API] Max WebSocket reconnect attempts reached');
      return;
    }

    this.wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`[BIZRA API] WebSocket reconnect attempt ${this.wsReconnectAttempts}`);
      this.connectWebSocket(url);
    }, delay);
  }

  subscribeToChannel<T>(channel: string, callback: (data: T) => void): () => void {
    if (!this.wsListeners.has(channel)) {
      this.wsListeners.set(channel, new Set());
    }

    const listeners = this.wsListeners.get(channel)!;
    listeners.add(callback as (data: unknown) => void);

    // Send subscription message
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }

    // Return unsubscribe function
    return () => {
      listeners.delete(callback as (data: unknown) => void);
      if (listeners.size === 0) {
        this.wsListeners.delete(channel);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
        }
      }
    };
  }

  sendWsMessage(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[BIZRA API] WebSocket not connected');
    }
  }

  // ===========================================================================
  // EVENT EMITTER
  // ===========================================================================

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // ===========================================================================
  // METRICS & STATUS
  // ===========================================================================

  private updateAvgResponseTime(duration: number): void {
    const { avgResponseTime, requestCount } = this.metrics;
    this.metrics.avgResponseTime =
      (avgResponseTime * (requestCount - 1) + duration) / requestCount;
  }

  getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  getQueueStatus(): { pending: number; active: number } {
    return {
      pending: this.requestQueue.pendingCount,
      active: this.requestQueue.activeCount,
    };
  }

  isWebSocketConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  clearCache(): void {
    this.cacheManager.clear();
  }

  invalidateCache(pattern: string): void {
    // Simple pattern matching - could be enhanced with regex
    const keys = Array.from((this.cacheManager as unknown as { cache: Map<string, unknown> }).cache?.keys() || []);
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cacheManager.delete(key);
      }
    });
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsListeners.clear();
    this.eventListeners.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: BIZRAAPIClient | null = null;

export function getBIZRAClient(): BIZRAAPIClient {
  if (!clientInstance) {
    clientInstance = new BIZRAAPIClient();
  }
  return clientInstance;
}

export function createBIZRAClient(
  baseURL?: string,
  options?: {
    timeout?: number;
    retries?: number;
    cacheEnabled?: boolean;
    wsURL?: string;
  }
): BIZRAAPIClient {
  return new BIZRAAPIClient(baseURL, options);
}

// =============================================================================
// REACT HOOK FOR CLIENT
// =============================================================================

export function useBIZRAClient(): BIZRAAPIClient {
  // In a real implementation, this would use React context
  return getBIZRAClient();
}

export default BIZRAAPIClient;
