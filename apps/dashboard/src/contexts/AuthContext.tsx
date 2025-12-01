// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTHENTICATION CONTEXT                         ║
// ║  Enterprise-grade React context for authentication state management  ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  User,
  AuthState,
  AuthError,
  LoginCredentials,
  RegisterData,
  AuthContextType,
  AuthProviderProps
} from '../types/auth'
import { authService } from '../services/auth'

// ═══════════════════════════════════════════════════════════════════════════
// AUTH REDUCER
// ═══════════════════════════════════════════════════════════════════════════

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'UPDATE_ACTIVITY' }

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading to check existing auth
  error: null,
  lastActivity: Date.now()
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastActivity: Date.now()
      }

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }

    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastActivity: Date.now()
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }

    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        lastActivity: Date.now()
      }

    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        lastActivity: Date.now()
      }

    default:
      return state
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ═══════════════════════════════════════════════════════════════════════════
// AUTH PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, config }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  const updateActivity = useCallback(() => {
    dispatch({ type: 'UPDATE_ACTIVITY' })
  }, [])

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      updateActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [updateActivity])

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION TIMEOUT
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL AUTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser()
          dispatch({ type: 'AUTH_SUCCESS', payload: { user } })
        } else {
          dispatch({ type: 'AUTH_LOGOUT' })
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        dispatch({ type: 'AUTH_LOGOUT' })
      }
    }

    void checkExistingAuth()
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'AUTH_START' })

    try {
      const { user } = await authService.login(credentials)
      dispatch({ type: 'AUTH_SUCCESS', payload: { user } })
      toast.success(`Welcome back, ${user.firstName}!`)
    } catch (error) {
      const authError = error as AuthError
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      toast.error(authError.message)
      throw error
    }
  }, [])

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' })

    try {
      const { user } = await authService.register(data)
      dispatch({ type: 'AUTH_SUCCESS', payload: { user } })
      toast.success(`Welcome to BIZRA, ${user.firstName}!`)
    } catch (error) {
      const authError = error as AuthError
      dispatch({ type: 'AUTH_ERROR', payload: authError })
      toast.error(authError.message)
      throw error
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
      dispatch({ type: 'AUTH_LOGOUT' })
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if server logout fails
      dispatch({ type: 'AUTH_LOGOUT' })
      toast.success('Logged out locally')
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION TIMEOUT
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!state.isAuthenticated || !config?.enableSessionTimeout) {return}

    const checkSessionTimeout = () => {
      const sessionTimeout = config.sessionTimeout || 30 * 60 * 1000 // 30 minutes
      const timeSinceActivity = Date.now() - state.lastActivity

      if (timeSinceActivity > sessionTimeout) {
        void logout()
        toast.error('Session expired due to inactivity')
      }
    }

    const interval = setInterval(checkSessionTimeout, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [state.isAuthenticated, state.lastActivity, config, logout])

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await authService.refreshToken()
      // Token refresh successful, user state remains the same
    } catch (error) {
      console.error('Token refresh failed:', error)
      dispatch({ type: 'AUTH_LOGOUT' })
      toast.error('Session expired, please log in again')
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!state.user) {throw new Error('No authenticated user')}

    try {
      const updatedUser = await authService.updateProfile(updates)
      dispatch({ type: 'UPDATE_USER', payload: updatedUser })
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
      throw error
    }
  }, [state.user])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await authService.changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Password change error:', error)
      toast.error('Failed to change password')
      throw error
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const isTokenExpired = useCallback(() => {
    return authService.isTokenExpired()
  }, [])

  const getRemainingTime = useCallback(() => {
    return authService.getRemainingTime()
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO TOKEN REFRESH
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!state.isAuthenticated || !config?.enableAutoRefresh) {return}

    const checkTokenRefresh = () => {
      if (authService.isTokenExpired()) {
        void refreshToken()
      }
    }

    // Check every 5 minutes
    const interval = setInterval(checkTokenRefresh, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [state.isAuthenticated, config?.enableAutoRefresh, refreshToken])

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const contextValue: AuthContextType = {
    // State
    user: state.user,
    token: state.tokens?.accessToken || null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,

    // Utilities
    clearError,
    isTokenExpired,
    getRemainingTime
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HOOK
// ═══════════════════════════════════════════════════════════════════════════

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default AuthContext
