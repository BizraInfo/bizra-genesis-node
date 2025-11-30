// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SERVICE                                  ║
// ║  API client for Alpha-100 invite code management                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import { API_BASE as CONFIG_API_BASE } from '../config'

const API_BASE = CONFIG_API_BASE

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface InviteValidationResult {
  valid: boolean
  code: string
  email?: string
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked'
  expires_at?: string
  message?: string
}

export interface InviteAcceptRequest {
  email: string
  password: string
  username: string
  firstName: string
  lastName: string
}

export interface InviteAcceptResponse {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    username: string
    first_name: string
    last_name: string
    program: string
  }
  token?: string
  expires_in?: number
}

export interface InviteError {
  code: InviteErrorCode
  message: string
  details?: Record<string, unknown>
}

export type InviteErrorCode =
  | 'INVITE_NOT_FOUND'
  | 'INVITE_EXPIRED'
  | 'INVITE_ALREADY_USED'
  | 'INVITE_REVOKED'
  | 'EMAIL_MISMATCH'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

// ═══════════════════════════════════════════════════════════════════════════
// INVITE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class InviteService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  /**
   * Validate an invite code before registration
   * GET /api/invite/:code/validate
   */
  async validateInvite(code: string): Promise<InviteValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invite/${encodeURIComponent(code)}/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createInviteError(
          this.mapHttpStatusToInviteError(response.status, errorData),
          errorData.message || 'Failed to validate invite code'
        )
      }

      const data = await response.json()
      return {
        valid: data.valid ?? true,
        code: data.code || code,
        email: data.email,
        status: data.status || 'pending',
        expires_at: data.expires_at,
        message: data.message,
      }
    } catch (error) {
      if (this.isInviteError(error)) {
        throw error
      }
      throw this.createInviteError('NETWORK_ERROR', 'Network error while validating invite')
    }
  }

  /**
   * Accept an invite and create an account
   * POST /api/invite/:code/accept
   */
  async acceptInvite(code: string, userData: InviteAcceptRequest): Promise<InviteAcceptResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invite/${encodeURIComponent(code)}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createInviteError(
          this.mapHttpStatusToInviteError(response.status, errorData),
          errorData.message || 'Failed to accept invite'
        )
      }

      const data = await response.json()
      return {
        success: true,
        message: data.message || 'Account created successfully',
        user: data.user,
        token: data.token,
        expires_in: data.expires_in,
      }
    } catch (error) {
      if (this.isInviteError(error)) {
        throw error
      }
      throw this.createInviteError('NETWORK_ERROR', 'Network error while accepting invite')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private createInviteError(
    code: InviteErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): InviteError {
    return { code, message, details }
  }

  private isInviteError(error: unknown): error is InviteError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    )
  }

  private mapHttpStatusToInviteError(
    status: number,
    errorData?: Record<string, unknown>
  ): InviteErrorCode {
    // Check for specific error codes from backend
    const backendCode = errorData?.code as string | undefined
    if (backendCode) {
      switch (backendCode) {
        case 'INVITE_NOT_FOUND':
          return 'INVITE_NOT_FOUND'
        case 'INVITE_EXPIRED':
          return 'INVITE_EXPIRED'
        case 'INVITE_ALREADY_USED':
          return 'INVITE_ALREADY_USED'
        case 'INVITE_REVOKED':
          return 'INVITE_REVOKED'
        case 'EMAIL_MISMATCH':
          return 'EMAIL_MISMATCH'
      }
    }

    // Fall back to HTTP status mapping
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR'
      case 404:
        return 'INVITE_NOT_FOUND'
      case 409:
        return 'INVITE_ALREADY_USED'
      case 410:
        return 'INVITE_EXPIRED'
      case 500:
        return 'UNKNOWN_ERROR'
      default:
        return 'UNKNOWN_ERROR'
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const inviteService = new InviteService()
export { InviteService }
export default inviteService
