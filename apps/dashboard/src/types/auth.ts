// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTHENTICATION TYPES                           ║
// ║  Enterprise-grade type definitions for authentication system         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  role: UserRole
  preferences: UserPreferences
  createdAt: Date
  lastLoginAt: Date
  isEmailVerified: boolean
  isActive: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: NotificationSettings
  privacy: PrivacySettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  synthesisComplete: boolean
  agentActivity: boolean
  systemAlerts: boolean
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team'
  dataSharing: boolean
  analytics: boolean
}

export type UserRole = 'user' | 'premium' | 'admin' | 'super_admin'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  username: string
  firstName: string
  lastName: string
  acceptTerms: boolean
  acceptPrivacy: boolean
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  lastActivity: number
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: Record<string, any>
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'REFRESH_FAILED'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR'

export interface AuthContextType {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>

  // Utilities
  clearError: () => void
  isTokenExpired: () => boolean
  getRemainingTime: () => number
}

export interface AuthProviderProps {
  children: React.ReactNode
  config?: AuthConfig
}

export interface AuthConfig {
  apiBaseUrl: string
  tokenRefreshThreshold: number // minutes before expiry to refresh
  maxRetryAttempts: number
  retryDelay: number
  sessionTimeout: number // minutes of inactivity
  enableAutoRefresh: boolean
  enableSessionTimeout: boolean
}
