import { API_BASE as CONFIG_API_BASE } from '../config'

const API_BASE = CONFIG_API_BASE

export type InviteStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked'

export interface InviteValidationResult {
  valid: boolean
  code: string
  email?: string
  status: InviteStatus
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

export interface InviteUserPayload {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  program: string
}

export interface InviteAcceptResponse {
  success: boolean
  message: string
  user?: InviteUserPayload
  token?: string
  expires_in?: number
}

export interface InviteErrorDetails {
  code?: string
  message?: string
  [key: string]: unknown
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

export class InviteServiceError extends Error {
  code: InviteErrorCode
  details?: InviteErrorDetails

  constructor(code: InviteErrorCode, message: string, details?: InviteErrorDetails) {
    super(message)
    this.code = code
    this.details = details
    this.name = 'InviteServiceError'
  }
}

const asRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pickString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const pickBoolean = (record: Record<string, unknown>, key: string): boolean | undefined => {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

const pickNumber = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

const normalizeStatus = (value?: string): InviteStatus =>
  value === 'sent' || value === 'accepted' || value === 'expired' || value === 'revoked'
    ? value
    : 'pending'

const parseInviteValidation = (data: unknown, fallbackCode: string): InviteValidationResult => {
  const record = asRecord(data) ? data : {}
  return {
    valid: pickBoolean(record, 'valid') ?? true,
    code: pickString(record, 'code') ?? fallbackCode,
    email: pickString(record, 'email'),
    status: normalizeStatus(pickString(record, 'status')),
    expires_at: pickString(record, 'expires_at'),
    message: pickString(record, 'message'),
  }
}

const parseInviteUser = (user: unknown): InviteUserPayload | undefined => {
  if (!asRecord(user)) {
    return undefined
  }
  const id = pickString(user, 'id')
  const email = pickString(user, 'email')
  const username = pickString(user, 'username')
  const firstName = pickString(user, 'first_name')
  const lastName = pickString(user, 'last_name')
  const program = pickString(user, 'program')
  if (!id || !email || !username || !firstName || !lastName || !program) {
    return undefined
  }
  return { id, email, username, first_name: firstName, last_name: lastName, program }
}

const parseInviteAccept = (data: unknown): InviteAcceptResponse => {
  const record = asRecord(data) ? data : {}
  return {
    success: true,
    message: pickString(record, 'message') ?? 'Account created successfully',
    user: parseInviteUser(record.user),
    token: pickString(record, 'token'),
    expires_in: pickNumber(record, 'expires_in'),
  }
}

class InviteService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  async validateInvite(code: string): Promise<InviteValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invite/${encodeURIComponent(code)}/validate`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const body = await this.safeJson(response)
      if (!response.ok) {
        throw this.createInviteError(
          this.mapHttpStatusToInviteError(response.status, body),
          pickString(body, 'message') ?? 'Failed to validate invite code',
          body
        )
      }

      return parseInviteValidation(body, code)
    } catch (error) {
      if (this.isInviteError(error)) {
        throw error
      }
      throw new InviteServiceError('NETWORK_ERROR', 'Network error while validating invite')
    }
  }

  async acceptInvite(code: string, userData: InviteAcceptRequest): Promise<InviteAcceptResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invite/${encodeURIComponent(code)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
        }),
      })

      const body = await this.safeJson(response)
      if (!response.ok) {
        throw this.createInviteError(
          this.mapHttpStatusToInviteError(response.status, body),
          pickString(body, 'message') ?? 'Failed to accept invite',
          body
        )
      }

      return parseInviteAccept(body)
    } catch (error) {
      if (this.isInviteError(error)) {
        throw error
      }
      throw new InviteServiceError('NETWORK_ERROR', 'Network error while accepting invite')
    }
  }

  private async safeJson(response: Response): Promise<Record<string, unknown>> {
    const raw = await response.json().catch(() => ({} as Record<string, unknown>))
    if (asRecord(raw)) {
      return raw
    }
    return {}
  }

  private createInviteError(
    code: InviteErrorCode,
    message: string,
    details?: InviteErrorDetails
  ): InviteServiceError {
    return new InviteServiceError(code, message, details)
  }

  private isInviteError(error: unknown): error is InviteServiceError {
    return error instanceof InviteServiceError
  }

  private mapHttpStatusToInviteError(status: number, errorData?: InviteErrorDetails): InviteErrorCode {
    const backendCode = errorData?.code
    switch (backendCode) {
      case 'INVITE_NOT_FOUND':
      case 'INVITE_EXPIRED':
      case 'INVITE_ALREADY_USED':
      case 'INVITE_REVOKED':
      case 'EMAIL_MISMATCH':
        return backendCode
      default:
        break
    }

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

export const inviteService = new InviteService()
export { InviteService }
export default inviteService
