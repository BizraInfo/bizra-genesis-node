import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthContext } from '../../contexts/AuthContext';

// Mock child component
const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  const mockAuthContextValue = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  };

  const renderWithAuth = (isAuthenticated: boolean, isLoading = false) => {
    const contextValue = {
      ...mockAuthContextValue,
      isAuthenticated,
      isLoading,
      user: isAuthenticated ? { id: '1', email: 'test@example.com', name: 'Test User' } : null,
    };

    return render(
      <AuthContext.Provider value={contextValue}>
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

  it('should render children when user is authenticated', () => {
    renderWithAuth(true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    renderWithAuth(false);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should show loading state while authentication is being checked', () => {
    renderWithAuth(false, true);
    // When loading, component typically shows a loading indicator or nothing
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should not render children when loading', () => {
    const contextValue = {
      ...mockAuthContextValue,
      isLoading: true,
      isAuthenticated: false,
    };

    render(
      <AuthContext.Provider value={contextValue}>
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

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
