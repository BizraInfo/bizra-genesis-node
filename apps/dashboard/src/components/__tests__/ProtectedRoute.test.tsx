import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext } from '../../contexts/AuthContext';
import type { AuthContextType, User } from '../../types/auth';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// Mock child component
const TestComponent = () => <div>Protected Content</div>;

// Create a complete mock user
const createMockUser = (): User => ({
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  preferences: {
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      synthesisComplete: true,
      agentActivity: false,
      systemAlerts: true,
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analytics: true,
    },
  },
  createdAt: new Date(),
  lastLoginAt: new Date(),
  isEmailVerified: true,
  isActive: true,
});

describe('ProtectedRoute', () => {
  const mockAuthContextValue: AuthContextType = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    clearError: jest.fn(),
    isTokenExpired: jest.fn().mockReturnValue(false),
    getRemainingTime: jest.fn().mockReturnValue(3600000),
  };

  const renderWithAuth = (isAuthenticated: boolean, isLoading = false) => {
    const contextValue: AuthContextType = {
      ...mockAuthContextValue,
      isAuthenticated,
      isLoading,
      user: isAuthenticated ? createMockUser() : null,
      token: isAuthenticated ? 'mock-token' : null,
    };

    return render(
      <AuthContext.Provider value={contextValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('should render children when user is authenticated', async () => {
    renderWithAuth(true);

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should redirect to login when user is not authenticated', async () => {
    renderWithAuth(false);

    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('should show loading state while authentication is being checked', async () => {
    renderWithAuth(false, true);

    // When loading, component shows loading indicator
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should not render children when loading', async () => {
    const contextValue: AuthContextType = {
      ...mockAuthContextValue,
      isLoading: true,
      isAuthenticated: false,
    };

    render(
      <AuthContext.Provider value={contextValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
