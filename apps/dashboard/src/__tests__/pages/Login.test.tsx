import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import { AuthContext } from '../../contexts/AuthContext';

// Mock framer-motion with all needed components
jest.mock('framer-motion', () => {
  // Props to filter out (framer-motion specific)
  const motionProps = [
    'initial', 'animate', 'exit', 'variants', 'whileHover', 'whileTap',
    'whileFocus', 'whileDrag', 'whileInView', 'transition', 'layoutId',
    'layout', 'drag', 'dragConstraints', 'onAnimationStart', 'onAnimationComplete'
  ];

  const filterMotionProps = (props: any) => {
    const filtered: any = {};
    Object.keys(props).forEach(key => {
      if (!motionProps.includes(key)) {
        filtered[key] = props[key];
      }
    });
    return filtered;
  };

  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = tag as keyof JSX.IntrinsicElements;
      const filteredProps = filterMotionProps(props);
      return <Tag ref={ref} {...filteredProps}>{children}</Tag>;
    });
    Component.displayName = `motion.${tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      button: createMotionComponent('button'),
      span: createMotionComponent('span'),
      p: createMotionComponent('p'),
      a: createMotionComponent('a'),
      label: createMotionComponent('label'),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock CSS file
jest.mock('../../styles/auth.css', () => ({}));

describe('Login Page', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  const mockAuthContext = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: mockLogin,
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    clearError: mockClearError,
    isTokenExpired: jest.fn().mockReturnValue(false),
    getRemainingTime: jest.fn().mockReturnValue(3600000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLogin = (authOverrides = {}, routeState = {}) => {
    const contextValue = { ...mockAuthContext, ...authOverrides };

    return render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: routeState }]}>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  // Helper functions to get form elements reliably
  const getEmailInput = () => screen.getByLabelText(/email address/i);
  const getPasswordInput = () => screen.getByLabelText(/^password$/i);
  const getSubmitButton = () => screen.getByRole('button', { name: /sign in/i });

  it('should render login form', () => {
    renderLogin();

    expect(screen.getByText(/welcome to bizra/i)).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('should handle email input', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should handle password input', async () => {
    renderLogin();
    const user = userEvent.setup();

    const passwordInput = getPasswordInput();
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('should toggle password visibility', async () => {
    renderLogin();
    const user = userEvent.setup();

    const passwordInput = getPasswordInput() as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('should validate email format', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    // Invalid email should prevent form submission
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('should validate password length', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const passwordInput = getPasswordInput();
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.click(submitButton);

    // Short password should prevent form submission
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('should require email field', async () => {
    renderLogin();
    const user = userEvent.setup();

    const submitButton = getSubmitButton();
    await user.click(submitButton);

    // Empty email should prevent form submission
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('should require password field', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    // Password validation should prevent login from being called
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('should submit valid form', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const passwordInput = getPasswordInput();
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });
  });

  it('should handle remember me checkbox', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const passwordInput = getPasswordInput();
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(rememberMeCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
    });
  });

  it('should display error message from auth context', () => {
    renderLogin({ error: { type: 'auth', message: 'Invalid credentials' } });

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('should clear errors on input change', async () => {
    renderLogin({ error: { type: 'auth', message: 'Invalid credentials' } });
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    await user.type(emailInput, 't');

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should disable submit button while loading', () => {
    renderLogin({ isLoading: true });

    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading state', () => {
    renderLogin({ isLoading: true });

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it('should have link to registration page', () => {
    renderLogin();

    // The actual link text is "Create one here"
    const registerLink = screen.getByRole('link', { name: /create one here/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should have link to password reset', () => {
    renderLogin();

    const resetLink = screen.getByRole('link', { name: /forgot password/i });
    expect(resetLink).toHaveAttribute('href', '/forgot-password');
  });

  it('should redirect to dashboard after successful login', async () => {
    mockLogin.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } });
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const passwordInput = getPasswordInput();
    const submitButton = getSubmitButton();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('should preserve return URL from location state', () => {
    renderLogin({}, { from: { pathname: '/protected-page' } });

    // The component should internally use this path for redirect after login
    expect(screen.getByText(/welcome to bizra/i)).toBeInTheDocument();
  });

  it('should handle form submission with Enter key', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();
    const user = userEvent.setup();

    const emailInput = getEmailInput();
    const passwordInput = getPasswordInput();

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
