// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE SERVICE TESTS                            ║
// ║  Unit tests for invite API client                                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import { inviteService, InviteService, InviteError } from '../invite'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('InviteService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('validateInvite', () => {
    it('should return valid result for valid invite code', async () => {
      const mockResponse = {
        valid: true,
        code: 'ABC123XYZ456',
        email: 'test@example.com',
        status: 'pending',
        expires_at: '2025-12-31T23:59:59Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await inviteService.validateInvite('ABC123XYZ456')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invite/ABC123XYZ456/validate'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result.valid).toBe(true)
      expect(result.code).toBe('ABC123XYZ456')
      expect(result.email).toBe('test@example.com')
      expect(result.status).toBe('pending')
    })

    it('should throw error for invalid invite code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ 
          code: 'INVITE_NOT_FOUND',
          message: 'Invite code not found' 
        }),
      })

      await expect(inviteService.validateInvite('INVALID')).rejects.toMatchObject({
        code: 'INVITE_NOT_FOUND',
        message: 'Invite code not found',
      })
    })

    it('should throw error for expired invite', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        json: async () => ({ 
          code: 'INVITE_EXPIRED',
          message: 'Invite has expired' 
        }),
      })

      await expect(inviteService.validateInvite('EXPIRED123')).rejects.toMatchObject({
        code: 'INVITE_EXPIRED',
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(inviteService.validateInvite('TEST123')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      })
    })
  })

  describe('acceptInvite', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    }

    it('should return success for valid invite acceptance', async () => {
      const mockResponse = {
        success: true,
        message: 'Account created successfully',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          program: 'alpha-100',
        },
        token: 'jwt-token-here',
        expires_in: 3600,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await inviteService.acceptInvite('ABC123XYZ456', validUserData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invite/ABC123XYZ456/accept'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: validUserData.email,
            password: validUserData.password,
            username: validUserData.username,
            first_name: validUserData.firstName,
            last_name: validUserData.lastName,
          }),
        })
      )
      expect(result.success).toBe(true)
      expect(result.token).toBe('jwt-token-here')
      expect(result.user?.email).toBe('test@example.com')
    })

    it('should throw error for already used invite', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          code: 'INVITE_ALREADY_USED',
          message: 'This invite has already been used' 
        }),
      })

      await expect(
        inviteService.acceptInvite('USED123', validUserData)
      ).rejects.toMatchObject({
        code: 'INVITE_ALREADY_USED',
      })
    })

    it('should throw error for email mismatch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          code: 'EMAIL_MISMATCH',
          message: 'Email does not match invite' 
        }),
      })

      await expect(
        inviteService.acceptInvite('ABC123', {
          ...validUserData,
          email: 'wrong@example.com',
        })
      ).rejects.toMatchObject({
        code: 'EMAIL_MISMATCH',
      })
    })
  })

  describe('URL encoding', () => {
    it('should properly encode special characters in invite code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, code: 'TEST+CODE', status: 'pending' }),
      })

      await inviteService.validateInvite('TEST+CODE')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invite/TEST%2BCODE/validate'),
        expect.any(Object)
      )
    })
  })
})

describe('InviteService instance', () => {
  it('should use custom base URL', async () => {
    const customService = new InviteService('https://custom-api.bizra.ai')
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, code: 'TEST', status: 'pending' }),
    })

    await customService.validateInvite('TEST')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom-api.bizra.ai/api/invite/TEST/validate',
      expect.any(Object)
    )
  })
})
