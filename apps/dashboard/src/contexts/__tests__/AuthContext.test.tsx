import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authService from '../../services/auth';

// Mock the auth service
jest.mock('../../services/auth');

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Test component that uses the Auth context
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button
        onClick={() =>
          register({ email: 'new@example.com', password: 'password', name: 'New User' })
        }
      >
        Register
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should provide initial auth state', async () => {
    (authService.validateToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading should be true
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should handle successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockTokens = { accessToken: 'token123', refreshToken: 'refresh456' };

    (authService.login as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    (authService.validateToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to finish
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Click login button
    await act(async () => {
      screen.getByText('Login').click();
    });

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle login failure', async () => {
    const mockError = new Error('Invalid credentials');
    (authService.login as jest.Mock).mockRejectedValue(mockError);
    (authService.validateToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('should handle logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockTokens = { accessToken: 'token123', refreshToken: 'refresh456' };

    (authService.login as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (authService.validateToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Login first
    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    // Now logout
    await act(async () => {
      screen.getByText('Logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    expect(authService.logout).toHaveBeenCalled();
  });

  it('should handle registration', async () => {
    const mockUser = { id: '2', email: 'new@example.com', name: 'New User' };
    const mockTokens = { accessToken: 'newtoken123', refreshToken: 'newrefresh456' };

    (authService.register as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    (authService.validateToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Register').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('new@example.com');
    });

    expect(authService.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password',
      name: 'New User',
    });
  });

  it('should restore auth state from localStorage on mount', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };

    // Mock localStorage
    localStorage.setItem('bizra_access_token', 'stored-token');

    (authService.validateToken as jest.Mock).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(authService.validateToken).toHaveBeenCalledWith('stored-token');
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
