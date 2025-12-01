// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTHENTICATION SERVICE                         ║
// ║  Enterprise-grade authentication API client with security features   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthError,
  AuthErrorCode
} from '../types/auth'
import { API_BASE as CONFIG_API_BASE } from '../config'

const API_BASE = `${CONFIG_API_BASE  }/api/v1`

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ApiUserData {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  role?: string
  preferences?: {
    theme?: string
    language?: string
    timezone?: string
    notifications?: {
      email?: boolean
      push?: boolean
      synthesisComplete?: boolean
      agentActivity?: boolean
      systemAlerts?: boolean
    }
    privacy?: {
      profileVisibility?: string
      dataSharing?: boolean
      analytics?: boolean
    }
  }
  createdAt: string
  lastLoginAt: string
  isEmailVerified?: boolean
  isActive?: boolean
}

interface ApiUserResponse {
  success: boolean
  data: ApiUserData
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const safeString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

const safeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
  ENABLE_AUTO_REFRESH: true,
  ENABLE_SESSION_TIMEOUT: true
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

class TokenManager {
  private static instance: TokenManager
  private refreshPromise: Promise<AuthTokens> | null = null

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  getTokens(): AuthTokens | null {
    try {
      const tokensStr = localStorage.getItem('bizra_auth_tokens')
      if (!tokensStr) {return null}

      const tokens: AuthTokens = JSON.parse(tokensStr)

      // Check if access token is expired
      if (Date.now() >= tokens.expiresAt) {
        this.clearTokens()
        return null
      }

      return tokens
    } catch (error) {
      console.error('Error reading auth tokens:', error)
      this.clearTokens()
      return null
    }
  }

  setTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem('bizra_auth_tokens', JSON.stringify(tokens))

      // Set httpOnly cookie for refresh token (server-side)
      document.cookie = `refresh_token=${tokens.refreshToken}; path=/; secure; samesite=strict; max-age=${7 * 24 * 60 * 60}`
    } catch (error) {
      console.error('Error storing auth tokens:', error)
      throw new Error('Failed to store authentication tokens')
    }
  }

  clearTokens(): void {
    try {
      localStorage.removeItem('bizra_auth_tokens')
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    } catch (error) {
      console.error('Error clearing auth tokens:', error)
    }
  }

  isTokenExpired(): boolean {
    const tokens = this.getTokens()
    if (!tokens) {return true}
    return Date.now() >= tokens.expiresAt
  }

  getRemainingTime(): number {
    const tokens = this.getTokens()
    if (!tokens) {return 0}
    return Math.max(0, tokens.expiresAt - Date.now())
  }

  shouldRefresh(): boolean {
    const remainingTime = this.getRemainingTime()
    return remainingTime > 0 && remainingTime <= CONFIG.TOKEN_REFRESH_THRESHOLD
  }

  async refreshToken(): Promise<AuthTokens> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.performTokenRefresh()

    try {
      const tokens = await this.refreshPromise
      return tokens
    } finally {
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const currentTokens = this.getTokens()
    if (!currentTokens) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentTokens.refreshToken}`
      }
    })

    if (!response.ok) {
      this.clearTokens()
      throw new Error('Token refresh failed')
    }

    const data = await response.json()

    if (!data.success) {
      this.clearTokens()
      throw new Error(data.message || 'Token refresh failed')
    }

    const newTokens: AuthTokens = {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresAt: Date.now() + (data.data.expiresIn * 1000),
      tokenType: data.data.tokenType || 'Bearer'
    }

    this.setTokens(newTokens)
    return newTokens
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT WITH AUTH INTERCEPTORS
// ═══════════════════════════════════════════════════════════════════════════

class AuthenticatedHttpClient {
  private tokenManager = TokenManager.getInstance()

  async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers)

    // Add authorization header if we have tokens
    const tokens = this.tokenManager.getTokens()
    if (tokens) {
      // Check if token needs refresh
      if (this.tokenManager.shouldRefresh() && CONFIG.ENABLE_AUTO_REFRESH) {
        try {
          await this.tokenManager.refreshToken()
          const newTokens = this.tokenManager.getTokens()
          if (newTokens) {
            headers.set('Authorization', `${newTokens.tokenType} ${newTokens.accessToken}`)
          }
        } catch (error) {
          console.warn('Token refresh failed, proceeding with current token')
        }
      } else {
        headers.set('Authorization', `${tokens.tokenType} ${tokens.accessToken}`)
      }
    }

    // Add default headers
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const config: RequestInit = {
      ...options,
      headers
    }

    let response: Response
    let attempts = 0

    while (attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
      try {
        response = await fetch(url, config)

        // Handle token expiration
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.code === 'TOKEN_EXPIRED' && CONFIG.ENABLE_AUTO_REFRESH) {
            try {
              await this.tokenManager.refreshToken()
              const newTokens = this.tokenManager.getTokens()
              if (newTokens) {
                headers.set('Authorization', `${newTokens.tokenType} ${newTokens.accessToken}`)
                config.headers = headers
                attempts++ // Retry with new token
                continue
              }
            } catch (refreshError) {
              // Refresh failed, clear tokens and throw
              this.tokenManager.clearTokens()
              throw new Error('Authentication expired')
            }
          }
        }

        break
      } catch (error) {
        attempts++
        if (attempts >= CONFIG.MAX_RETRY_ATTEMPTS) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, CONFIG.RETRY_DELAY * Math.pow(2, attempts - 1))
        )
      }
    }

    if (!response!.ok) {
      const errorData = await response!.json().catch(() => ({
        message: `HTTP ${response!.status}: ${response!.statusText}`
      }))

      throw new Error(errorData.message || `Request failed: ${response!.status}`)
    }

    return response!.json()
  }

  get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class AuthService {
  private httpClient = new AuthenticatedHttpClient()
  private tokenManager = TokenManager.getInstance()

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createAuthError(
          this.mapHttpStatusToAuthError(response.status),
          errorData.message || 'Login failed'
        )
      }

      const data = await response.json()

      if (!data.success) {
        throw this.createAuthError('INVALID_CREDENTIALS', data.message || 'Login failed')
      }

      const tokens: AuthTokens = {
        accessToken: data.data.tokens.accessToken,
        refreshToken: data.data.tokens.refreshToken,
        expiresAt: Date.now() + (data.data.tokens.expiresIn * 1000),
        tokenType: data.data.tokens.tokenType || 'Bearer'
      }

      this.tokenManager.setTokens(tokens)

      return {
        user: this.transformUserData(data.data.user),
        tokens
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('AuthError')) {
        throw error
      }
      throw this.createAuthError('NETWORK_ERROR', 'Network error during login')
    }
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createAuthError(
          this.mapHttpStatusToAuthError(response.status),
          errorData.message || 'Registration failed'
        )
      }

      const responseData = await response.json()

      if (!responseData.success) {
        throw this.createAuthError('INVALID_CREDENTIALS', responseData.message || 'Registration failed')
      }

      const tokens: AuthTokens = {
        accessToken: responseData.data.tokens.accessToken,
        refreshToken: responseData.data.tokens.refreshToken,
        expiresAt: Date.now() + (responseData.data.tokens.expiresIn * 1000),
        tokenType: responseData.data.tokens.tokenType || 'Bearer'
      }

      this.tokenManager.setTokens(tokens)

      return {
        user: this.transformUserData(responseData.data.user),
        tokens
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('AuthError')) {
        throw error
      }
      throw this.createAuthError('NETWORK_ERROR', 'Network error during registration')
    }
  }

  async logout(): Promise<void> {
    try {
      // Attempt server-side logout
      await this.httpClient.post(`${API_BASE}/auth/logout`)
    } catch (error) {
      // Ignore server logout errors, proceed with client cleanup
      console.warn('Server logout failed, proceeding with client cleanup')
    } finally {
      // Always clear local tokens
      this.tokenManager.clearTokens()
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    return this.tokenManager.refreshToken()
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.httpClient.get<ApiUserResponse>(`${API_BASE}/auth/me`)

    if (!data.success) {
      throw new Error('Failed to get current user')
    }

    return this.transformUserData(data.data)
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const data = await this.httpClient.put<ApiUserResponse>(
      `${API_BASE}/auth/profile`,
      updates
    )

    if (!data.success) {
      throw new Error('Failed to update profile')
    }

    return this.transformUserData(data.data)
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const data = await this.httpClient.put<{ success: boolean }>(
      `${API_BASE}/auth/password`,
      { currentPassword, newPassword }
    )

    if (!data.success) {
      throw new Error('Failed to change password')
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to request password reset')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to request password reset')
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, newPassword })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to reset password')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to reset password')
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to verify email')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to verify email')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  isAuthenticated(): boolean {
    return !this.tokenManager.isTokenExpired()
  }

  isTokenExpired(): boolean {
    return this.tokenManager.isTokenExpired()
  }

  getRemainingTime(): number {
    return this.tokenManager.getRemainingTime()
  }

  private createAuthError(code: AuthErrorCode, message: string, details?: Record<string, unknown>): AuthError {
    return { code, message, details }
  }

  private mapHttpStatusToAuthError(status: number): AuthErrorCode {
    switch (status) {
      case 400:
        return 'INVALID_CREDENTIALS'
      case 401:
        return 'TOKEN_INVALID'
      case 403:
        return 'ACCOUNT_DISABLED'
      case 429:
        return 'RATE_LIMITED'
      case 500:
        return 'NETWORK_ERROR'
      default:
        return 'UNKNOWN_ERROR'
    }
  }

  private transformUserData(data: unknown): User {
    const record = isRecord(data) ? data : {}
    const prefs = isRecord(record.preferences) ? record.preferences : {}
    const notifs = isRecord(prefs.notifications) ? prefs.notifications : {}
    const privacy = isRecord(prefs.privacy) ? prefs.privacy : {}

    return {
      id: safeString(record.id, ''),
      email: safeString(record.email, ''),
      username: safeString(record.username, ''),
      firstName: safeString(record.firstName, ''),
      lastName: safeString(record.lastName, ''),
      avatar: typeof record.avatar === 'string' ? record.avatar : undefined,
      role: safeString(record.role, 'user'),
      preferences: {
        theme: safeString(prefs.theme, 'auto'),
        language: safeString(prefs.language, 'en'),
        timezone: safeString(prefs.timezone, 'UTC'),
        notifications: {
          email: safeBoolean(notifs.email, true),
          push: safeBoolean(notifs.push, true),
          synthesisComplete: safeBoolean(notifs.synthesisComplete, true),
          agentActivity: safeBoolean(notifs.agentActivity, false),
          systemAlerts: safeBoolean(notifs.systemAlerts, true)
        },
        privacy: {
          profileVisibility: safeString(privacy.profileVisibility, 'private'),
          dataSharing: safeBoolean(privacy.dataSharing, false),
          analytics: safeBoolean(privacy.analytics, true)
        }
      },
      createdAt: new Date(typeof record.createdAt === 'string' ? record.createdAt : Date.now()),
      lastLoginAt: new Date(typeof record.lastLoginAt === 'string' ? record.lastLoginAt : Date.now()),
      isEmailVerified: safeBoolean(record.isEmailVerified, false),
      isActive: record.isActive !== false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const authService = new AuthService()
export { TokenManager, AuthenticatedHttpClient }
export default authService
