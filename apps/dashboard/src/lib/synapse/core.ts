// apps/dashboard/lib/synapse/core.ts
// BIZRA Synapse Core - Professional State Management Framework
// Provides consistent FSM pattern for complex frontend journeys

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { z } from 'zod';

// =============================================================================
// CORE TYPES & ENUMS
// =============================================================================

/**
 * Standardized Synapse FSM States
 * Follows finite state machine pattern with clear transitions
 */
export enum SynapseStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  BLOCKED = 'blocked'
}

// Alias for backwards compatibility
export { SynapseStatus as SynapseState };
export type { SynapseStatus as SynapseStateType };

/**
 * API Error Response - Matches Rust/Node error envelopes
 * Provides consistent error handling across the entire stack
 */
export interface ApiError {
  code: string;
  message: string;
  traceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Auth Data - User authentication information
 */
export interface AuthData {
  user: {
    id: string;
    email: string;
    roles: string[];
    profileComplete: boolean;
  } | null;
  sessionToken: string;
  refreshToken?: string;
}

/**
 * Auth Actions - Authentication-specific actions
 */
export interface AuthActions extends SynapseActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

/**
 * Registration Data
 */
export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  firstName?: string;
  lastName?: string;
}

/**
 * Synapse Metadata - Tracking operational state
 */
export interface SynapseMetadata {
  lastAttemptAt?: Date;
  attempts: number;
  traceId?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Runtime validation for ApiError - Ensures type safety
 */
export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  traceId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Standard Synapse Actions
 * Guarantee that all synapses have consistent lifecycle management
 */
export interface SynapseActions {
  reset: () => void;
  retry: () => void;
  setBlocked: (reason: string) => void;
}

// =============================================================================
// JOURNEY CONFIGURATION & EXECUTION
// =============================================================================

/**
 * Journey Configuration - Defines behavior for complex operations
 */
export interface JourneyConfig<TData, TParams> {
  /** Unique journey identifier for monitoring/debugging */
  id: string;

  /** Initial data state */
  initialData: TData | null;

  /** Maximum retry attempts */
  maxAttempts: number;

  /** Optional parameter validation */
  validateParams?: (params: TParams) => boolean;

  /** The actual journey execution logic */
  execute: (params: TParams, context: JourneyExecutionContext) => Promise<TData>;

  /** Success callback - side effects and global state updates */
  onSuccess?: (result: TData) => void;

  /** Error callback - logging, monitoring, cleanup */
  onError?: (error: ApiError) => void;
}

/**
 * Journey Execution Context - Passed to execute function
 */
export interface JourneyExecutionContext {
  signal: AbortSignal;
  attemptNumber: number;
  traceId: string;
}

/**
 * Journey Execution Result
 */
export interface JourneyResult<TData> {
  success: boolean;
  data: TData | null;
  error: ApiError | null;
  attempts: number;
  duration: number;
  traceId: string;
}

// =============================================================================
// CORE EXECUTION ENGINE - moved to bottom as unified executeJourney
// =============================================================================

/**
 * Normalize any error to ApiError format
 */
function normalizeError(error: Error | ApiError, attempt: number, traceId: string): ApiError {
  // If already an ApiError, use it
  if ('code' in error && 'message' in error) {
    return error;
  }

  // If AbortError (timeout), special handling
  if (error.name === 'AbortError') {
    return {
      code: 'TIMEOUT_ERROR',
      message: 'Operation timed out',
      traceId,
      details: { attempt }
    };
  }

  // If network error, special handling
  if (error.message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
      traceId,
      details: { attempt, originalError: error.message }
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    traceId,
    details: { attempt, errorType: error.constructor.name }
  };
}

// =============================================================================
// UTILITY FUNCTIONs
// =============================================================================

/**
 * Create standard RPC-style journey config
 */
export function createRpcJourney<TData, TParams extends Record<string, unknown>>(
  config: {
    id: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    extractData?: (response: unknown) => TData;
  }
): JourneyConfig<TData, TParams> {
  return {
    id: config.id,
    initialData: null,
    maxAttempts: 3,

    async execute(params, context) {

      // Prepare fetch options
      const options: RequestInit = {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-ID': context.traceId,
          ...config.headers
        },
        body: config.method !== 'GET' ? JSON.stringify(params) : undefined,
        signal: context.signal
      };

      // Make request
      const response = await fetch(config.url, options);

      if (!response.ok) {
        // Try to parse as ApiError
        let errorData;
        try {
          errorData = await response.json();
          const parsedError = ApiErrorSchema.parse(errorData);
          throw new Error(JSON.stringify(parsedError));
        } catch {
          // Not a valid ApiError, create generic one
          const genericError: ApiError = {
            code: `HTTP_${response.status}`,
            message: `HTTP ${response.status}: ${response.statusText}`,
            traceId: context.traceId
          };
          throw new Error(JSON.stringify(genericError));
        }
      }

      const data = await response.json();
      return config.extractData ? config.extractData(data) : data;
    }
  };
}

/**
 * Type guard for checking SynapseStatus
 */
export function isSynapseStatus(value: string): value is SynapseStatus {
  return Object.values(SynapseStatus).includes(value as SynapseStatus);
}

// Alias for backwards compatibility
export const isSynapseState = isSynapseStatus;

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {return `${ms}ms`;}
  return `${(ms / 1000).toFixed(1)}s`;
}

// =============================================================================
// ZUSTAND STORE-BASED API (for backward compatibility with controllers/journeys)
// =============================================================================

/**
 * Synapse Store State - Base state shape for all Synapse stores
 */
export interface SynapseStoreState<T> {
  status: SynapseStatus;
  data: T | null;
  error: ApiError | null;
  message: string | null;
  metadata: SynapseMetadata;
  
  // Actions
  setLoading: () => void;
  setSuccess: (data: T, message?: string) => void;
  setError: (error: ApiError) => void;
  reset: () => void;
  succeed: (data: T) => void; // Alias for setSuccess
}

/**
 * Synapse Store Type - The Zustand store hook type
 */
export type SynapseStore<T> = ReturnType<typeof createSynapseStore<T>>;

/**
 * Options for createSynapse
 */
export interface CreateSynapseOptions<T> {
  clearOnReset?: boolean;
  clearOnFail?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
}

/**
 * Create a Synapse Store - Creates a Zustand store with FSM pattern
 * This is the primary store creation function for journeys and controllers
 */
export function createSynapseStore<T>(initialData: T | null) {
  return create<SynapseStoreState<T>>()(
    subscribeWithSelector((set, get) => ({
      status: SynapseStatus.IDLE,
      data: initialData,
      error: null,
      message: null,
      metadata: {
        attempts: 0,
      },
      
      setLoading: () => set({
        status: SynapseStatus.LOADING,
        error: null,
        message: null,
        metadata: {
          ...get().metadata,
          lastAttemptAt: new Date(),
          attempts: get().metadata.attempts + 1,
          startedAt: new Date(),
        }
      }),
      
      setSuccess: (data: T, message?: string) => set({
        status: SynapseStatus.SUCCESS,
        data,
        error: null,
        message: message ?? null,
        metadata: {
          ...get().metadata,
          completedAt: new Date(),
        }
      }),
      
      setError: (error: ApiError) => set({
        status: SynapseStatus.ERROR,
        error,
        message: error.message,
        metadata: {
          ...get().metadata,
          completedAt: new Date(),
        }
      }),
      
      reset: () => set({
        status: SynapseStatus.IDLE,
        data: initialData,
        error: null,
        message: null,
        metadata: {
          attempts: 0,
        }
      }),
      
      // Alias for setSuccess (used by some controllers)
      succeed: (data: T) => get().setSuccess(data),
    }))
  );
}

/**
 * Create Synapse - Named store creation with options
 * Provides additional lifecycle callbacks and configuration
 */
export function createSynapse<T>(
  name: string,
  initialData: T | null,
  options: CreateSynapseOptions<T> = {}
) {
  const store = create<SynapseStoreState<T>>()(
    subscribeWithSelector((set, get) => ({
      status: SynapseStatus.IDLE,
      data: initialData,
      error: null,
      message: null,
      metadata: {
        attempts: 0,
      },
      
      setLoading: () => {
        set({
          status: SynapseStatus.LOADING,
          error: null,
          message: null,
          metadata: {
            ...get().metadata,
            lastAttemptAt: new Date(),
            attempts: get().metadata.attempts + 1,
            startedAt: new Date(),
          }
        });
      },
      
      setSuccess: (data: T, message?: string) => {
        set({
          status: SynapseStatus.SUCCESS,
          data,
          error: null,
          message: message ?? null,
          metadata: {
            ...get().metadata,
            completedAt: new Date(),
          }
        });
        options.onSuccess?.(data);
      },
      
      setError: (error: ApiError) => {
        const newState: Partial<SynapseStoreState<T>> = {
          status: SynapseStatus.ERROR,
          error,
          message: error.message,
          metadata: {
            ...get().metadata,
            completedAt: new Date(),
          }
        };
        
        // Optionally clear data on fail
        if (options.clearOnFail) {
          newState.data = null;
        }
        
        set(newState as SynapseStoreState<T>);
        options.onError?.(error.message);
      },
      
      reset: () => {
        const newState: Partial<SynapseStoreState<T>> = {
          status: SynapseStatus.IDLE,
          error: null,
          message: null,
          metadata: {
            attempts: 0,
          }
        };
        
        // Optionally clear data on reset
        if (options.clearOnReset) {
          newState.data = null;
        }
        
        set(newState as SynapseStoreState<T>);
      },
      
      succeed: (data: T) => get().setSuccess(data),
    }))
  );
  
  // Log store creation for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SYNAPSE] Created store: ${name}`);
  }
  
  return store;
}

// =============================================================================
// SIMPLE EXECUTE JOURNEY (for store-based API)
// =============================================================================

/**
 * Execute Journey - Unified function that handles multiple patterns:
 * 1. Promise + Store pattern: executeJourney(promise, storeState, successMessage?) - used by journeys
 * 2. Store + Fetch pattern: executeJourney(storeState, fetchFn) - used by controllers
 * 3. JourneyConfig pattern: executeJourney(config, params) - advanced usage
 * 
 * Pattern detection is automatic based on argument types.
 */
export async function executeJourney<T, TParams = void>(
  firstArg: JourneyConfig<T, TParams> | Promise<T> | SynapseStoreState<T>,
  secondArg?: TParams | Pick<SynapseStoreState<T>, 'setLoading' | 'setSuccess' | 'setError'> | (() => Promise<T>),
  successMessage?: string
): Promise<JourneyResult<T> | { success: boolean; data?: T; error?: ApiError; message?: string }> {
  
  // Pattern 1: Promise + Store (used by journeys like agents.ts)
  // executeJourney(promise, storeState, successMessage?)
  if (firstArg instanceof Promise) {
    const storeState = secondArg as Pick<SynapseStoreState<T>, 'setLoading' | 'setSuccess' | 'setError'>;
    storeState.setLoading();
    
    try {
      const data = await firstArg;
      storeState.setSuccess(data);
      return { success: true, data, message: successMessage };
    } catch (err) {
      const error: ApiError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message }
        : { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
      storeState.setError(error);
      return { success: false, error };
    }
  }
  
  // Pattern 2: Store + Fetch function (used by controllers)
  // executeJourney(storeState, () => fetchAPI())
  if (typeof secondArg === 'function' && 'setLoading' in (firstArg as object)) {
    const storeState = firstArg as Pick<SynapseStoreState<T>, 'setLoading' | 'setSuccess' | 'setError'>;
    const fetchFn = secondArg as () => Promise<T>;
    storeState.setLoading();
    
    try {
      const data = await fetchFn();
      storeState.setSuccess(data);
      return { success: true, data };
    } catch (err) {
      const error: ApiError = err instanceof Error
        ? { code: 'UNKNOWN_ERROR', message: err.message }
        : { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
      storeState.setError(error);
      return { success: false, error };
    }
  }
  
  // Pattern 3: JourneyConfig (full journey with retries, monitoring, etc.)
  const config = firstArg as JourneyConfig<T, TParams>;
  const params = secondArg as TParams;
  
  const startTime = Date.now();
  const traceId = `journey-${config.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Parameter validation
  if (config.validateParams && !config.validateParams(params)) {
    const validationError: ApiError = {
      code: 'VALIDATION_ERROR',
      message: 'Parameter validation failed',
      traceId
    };

    config.onError?.(validationError);

    return {
      success: false,
      data: null,
      error: validationError,
      attempts: 0,
      duration: Date.now() - startTime,
      traceId
    };
  }

  // Retry logic with exponential backoff
  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const attemptStartTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30s timeout

    try {
      const context: JourneyExecutionContext = {
        signal: controller.signal,
        attemptNumber: attempt,
        traceId
      };

      // Execute the journey
      const result = await config.execute(params, context);
      clearTimeout(timeoutId);

      // Success!
      const journeyResult: JourneyResult<T> = {
        success: true,
        data: result,
        error: null,
        attempts: attempt,
        duration: Date.now() - startTime,
        traceId
      };

      config.onSuccess?.(result);

      // Log successful journey for monitoring
      console.log(`[JOURNEY:${config.id}] SUCCESS`, {
        attempts: attempt,
        duration: `${Date.now() - startTime}ms`,
        traceId
      });

      return journeyResult;

    } catch (error) {
      const attemptDuration = Date.now() - attemptStartTime;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Normalize error to ApiError format
      lastError = normalizeError(error as Error, attempt, traceId);

      // Log failed attempt
      console.warn(`[JOURNEY:${config.id}] ATTEMPT ${attempt} FAILED`, {
        error: lastError,
        duration: `${attemptDuration}ms`,
        remainingAttempts: config.maxAttempts - attempt
      });

      // Exponential backoff before retry (except on last attempt)
      if (attempt < config.maxAttempts) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All attempts failed
  config.onError?.(lastError!);

  console.error(`[JOURNEY:${config.id}] ALL ATTEMPTS FAILED`, {
    finalError: lastError,
    totalAttempts: config.maxAttempts,
    totalDuration: `${Date.now() - startTime}ms`,
    traceId
  });

  return {
    success: false,
    data: null,
    error: lastError,
    attempts: config.maxAttempts,
    duration: Date.now() - startTime,
    traceId
  };
}
