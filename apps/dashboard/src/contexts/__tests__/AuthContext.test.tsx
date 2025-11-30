// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTH CONTEXT BASIC TEST                          ║
// ║  Essential tests for authentication state management                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { MemoryRouter } from 'react-router-dom'

// Simple test component that uses auth context
const TestAuthComponent: React.FC = () => {
  const auth = useAuth()

  return (
    <div>
      <div data-testid="auth-state">
        {auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="loading-state">
        {auth.isLoading ? 'loading' : 'not-loading'}
      </div>
      <div data-testid="has-user">
        {auth.user ? 'has-user' : 'no-user'}
      </div>
    </div>
  )
}

// Wrapper component for testing
const AuthTestWrapper: React.FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage between tests
    localStorage.clear()
    jest.clearAllMocks()
  })

  test('provides authentication context to child components', () => {
    render(
      <AuthTestWrapper>
        <TestAuthComponent />
      </AuthTestWrapper>
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading')
    expect(screen.getByTestId('has-user')).toHaveTextContent('no-user')
  })

  test('initializes with default authentication state', () => {
    render(
      <AuthTestWrapper>
        <TestAuthComponent />
      </AuthTestWrapper>
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading')
  })

  test('throws error when useAuth is used outside AuthProvider', () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error
    console.error = jest.fn()

    try {
      expect(() => {
        render(<TestAuthComponent />)
      }).toThrow(/useAuth must be used within an AuthProvider/)
    } finally {
      // Restore console.error
      console.error = originalError
    }
  })

  test('hook returns proper function signatures', () => {
    let capturedAuth: any = null

    const CaptureAuthComponent: React.FC = () => {
      capturedAuth = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthTestWrapper>
        <CaptureAuthComponent />
      </AuthTestWrapper>
    )

    // Verify the auth object has expected properties
    expect(capturedAuth).toHaveProperty('isAuthenticated')
    expect(capturedAuth).toHaveProperty('user')
    expect(capturedAuth).toHaveProperty('isLoading')
    expect(capturedAuth).toHaveProperty('error')
    expect(capturedAuth).toHaveProperty('login')
    expect(capturedAuth).toHaveProperty('logout')
    expect(capturedAuth).toHaveProperty('clearError')

    // Verify types
    expect(typeof capturedAuth.isAuthenticated).toBe('boolean')
    expect(typeof capturedAuth.isLoading).toBe('boolean')
    expect(typeof capturedAuth.login).toBe('function')
    expect(typeof capturedAuth.logout).toBe('function')
    expect(typeof capturedAuth.clearError).toBe('function')
  })

  test('context properly wraps child components', () => {
    const { container } = render(
      <AuthTestWrapper>
        <div data-testid="child-component">Child content</div>
      </AuthTestWrapper>
    )

    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })

  test('handles multiple child components', () => {
    render(
      <AuthTestWrapper>
        <TestAuthComponent />
        <TestAuthComponent />
        <TestAuthComponent />
      </AuthTestWrapper>
    )

    const authStates = screen.getAllByTestId('auth-state')
    expect(authStates).toHaveLength(3)

    authStates.forEach(element => {
      expect(element).toHaveTextContent('not-authenticated')
    })
  })
})
