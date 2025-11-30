// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - FRONTEND TEST UTILITIES                             ║
// ║  Professional Elite Test Infrastructure for React Components              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data Generators
// ═══════════════════════════════════════════════════════════════════════════

export const mockUser = {
  id: 'user-test-123',
  email: 'test@bizra.ai',
  name: 'Test User',
  roles: ['user'],
  createdAt: new Date().toISOString(),
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-test-123',
  email: 'admin@bizra.ai',
  name: 'Admin User',
  roles: ['admin', 'user'],
};

export const mockAgent = {
  id: 'agent-test-001',
  name: 'Test Agent',
  role: 'Planner',
  status: 'active',
  metrics: {
    tasksCompleted: 42,
    tasksFailed: 2,
    avgLatencyMs: 150,
    avgConfidence: 0.92,
    totalTokensUsed: 5000,
  },
};

export const mockTask = {
  id: 'task-test-001',
  description: 'Test task for unit testing',
  priority: 'medium',
  status: 'pending',
  createdAt: new Date().toISOString(),
};

export const mockPOIAttestation = {
  id: 'poi-test-001',
  userId: mockUser.id,
  impactType: 'code_contribution',
  impactScore: 85,
  verified: true,
  timestamp: new Date().toISOString(),
};

export const mockReward = {
  id: 'reward-test-001',
  userId: mockUser.id,
  amount: 100,
  currency: 'BIZ',
  status: 'pending',
  epochId: 'epoch-2024-01',
};

// ═══════════════════════════════════════════════════════════════════════════
// Mock API Responses
// ═══════════════════════════════════════════════════════════════════════════

export const mockApiResponses = {
  health: {
    status: 'healthy',
    version: '1.0.0',
    uptime: 86400,
    database: 'connected',
    redis: 'connected',
  },

  agents: [
    { ...mockAgent, id: 'planner-001', name: 'Strategic Planner', role: 'Planner' },
    { ...mockAgent, id: 'researcher-001', name: 'Research Assistant', role: 'Researcher' },
    { ...mockAgent, id: 'coder-001', name: 'Code Generator', role: 'Coder' },
    { ...mockAgent, id: 'evaluator-001', name: 'Quality Evaluator', role: 'Evaluator' },
    { ...mockAgent, id: 'ethicist-001', name: 'Ethics Guardian', role: 'Ethicist' },
    { ...mockAgent, id: 'publisher-001', name: 'Publication Manager', role: 'Publisher' },
    { ...mockAgent, id: 'integrator-001', name: 'System Integrator', role: 'Integrator' },
  ],

  metrics: {
    totalTasks: 1000,
    completedTasks: 950,
    avgResponseTime: 150,
    ihsanScore: 0.92,
    activeAgents: 7,
  },

  telemetry: {
    cpu: 45.2,
    memory: 62.5,
    requests: 1250,
    errors: 5,
    latencyP50: 45,
    latencyP95: 120,
    latencyP99: 250,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Mock Service Functions
// ═══════════════════════════════════════════════════════════════════════════

export const createMockApiService = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
});

export const createMockAuthService = () => ({
  login: jest.fn().mockResolvedValue({ token: 'mock-jwt-token', user: mockUser }),
  logout: jest.fn().mockResolvedValue(undefined),
  register: jest.fn().mockResolvedValue({ user: mockUser }),
  refreshToken: jest.fn().mockResolvedValue({ token: 'refreshed-jwt-token' }),
  getCurrentUser: jest.fn().mockReturnValue(mockUser),
  isAuthenticated: jest.fn().mockReturnValue(true),
});

export const createMockAgentService = () => ({
  getAgents: jest.fn().mockResolvedValue(mockApiResponses.agents),
  getAgent: jest.fn().mockResolvedValue(mockAgent),
  executeTask: jest.fn().mockResolvedValue({ taskId: 'task-001', status: 'processing' }),
  getTaskStatus: jest.fn().mockResolvedValue({ status: 'completed', result: {} }),
});

export const createMockTelemetryService = () => ({
  getMetrics: jest.fn().mockResolvedValue(mockApiResponses.telemetry),
  subscribe: jest.fn().mockReturnValue(() => {}), // Returns unsubscribe function
});

// ═══════════════════════════════════════════════════════════════════════════
// Provider Wrappers
// ═══════════════════════════════════════════════════════════════════════════

interface AllProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

/**
 * Wrapper with all providers for component testing
 */
export const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  initialEntries = ['/']
}) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

/**
 * Router wrapper for testing components that need routing
 */
export const RouterWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Custom Render Functions
// ═══════════════════════════════════════════════════════════════════════════

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  route?: string;
}

/**
 * Custom render with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { initialEntries = ['/'], ...renderOptions } = options;

  const user = userEvent.setup();

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllProviders initialEntries={initialEntries}>
      {children}
    </AllProviders>
  );

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Render with specific route
 */
export function renderWithRoute(
  ui: ReactElement,
  route: string,
  options: Omit<CustomRenderOptions, 'route'> = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  return renderWithProviders(ui, { ...options, initialEntries: [route] });
}

/**
 * Render for testing routes
 */
export function renderRoute(
  routes: ReactElement,
  initialEntry: string = '/'
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();

  return {
    user,
    ...render(
      <MemoryRouter initialEntries={[initialEntry]}>
        {routes}
      </MemoryRouter>
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wait for loading state to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock window.matchMedia for tests
 */
export function mockMatchMedia(matches: boolean = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver for tests
 */
export function mockIntersectionObserver(): void {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
}

/**
 * Mock ResizeObserver for tests
 */
export function mockResizeObserver(): void {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;
}

/**
 * Setup all browser mocks
 */
export function setupBrowserMocks(): void {
  mockMatchMedia();
  mockIntersectionObserver();
  mockResizeObserver();
}

// ═══════════════════════════════════════════════════════════════════════════
// Assertion Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert element has specific text content
 */
export function assertTextContent(element: HTMLElement, text: string): void {
  expect(element.textContent).toContain(text);
}

/**
 * Assert element has specific class
 */
export function assertHasClass(element: HTMLElement, className: string): void {
  expect(element.classList.contains(className)).toBe(true);
}

/**
 * Assert element is visible
 */
export function assertVisible(element: HTMLElement): void {
  expect(element).toBeVisible();
}

/**
 * Assert element is not visible
 */
export function assertNotVisible(element: HTMLElement): void {
  expect(element).not.toBeVisible();
}

/**
 * Assert form field has error
 */
export function assertFieldError(element: HTMLElement, errorMessage: string): void {
  expect(element).toHaveAttribute('aria-invalid', 'true');
  expect(element.parentElement?.textContent).toContain(errorMessage);
}

// ═══════════════════════════════════════════════════════════════════════════
// Async Test Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wait for async operation with timeout
 */
export async function waitForAsync(
  callback: () => void | Promise<void>,
  timeout: number = 1000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Async operation timed out after ${timeout}ms`));
    }, timeout);

    Promise.resolve(callback())
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Flush all promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Everything
// ═══════════════════════════════════════════════════════════════════════════

export * from '@testing-library/react';
export { userEvent };

// ═══════════════════════════════════════════════════════════════════════════
// Minimal Test Suite (satisfies Jest requirement)
// ═══════════════════════════════════════════════════════════════════════════

describe('test-utils', () => {
    test('renderWithProviders is a function', () => {
        expect(typeof renderWithProviders).toBe('function');
    });

    test('mockApiResponses contains expected data', () => {
        expect(mockApiResponses.health.status).toBe('healthy');
        expect(mockApiResponses.agents.length).toBeGreaterThan(0);
    });

    test('mock service creators return objects with expected methods', () => {
        const apiService = createMockApiService();
        expect(typeof apiService.get).toBe('function');
        expect(typeof apiService.post).toBe('function');

        const authService = createMockAuthService();
        expect(typeof authService.login).toBe('function');
        expect(typeof authService.logout).toBe('function');
    });
});
