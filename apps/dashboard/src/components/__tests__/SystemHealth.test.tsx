import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SystemHealth from '../SystemHealth';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      // Filter motion-specific props
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// Mock chart.js to avoid canvas rendering issues
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Chart</div>,
}));

// Mock CSS
jest.mock('../../styles/SystemHealth.css', () => ({}));

// Mock data for different endpoints
const mockSystemMetrics = {
  api_latency_ms: 45,
  consensus_latency_ms: 23,
  error_rate: 0.01,
  uptime_percentage: 99.95,
  active_connections: 42,
  requests_per_second: 150,
  timestamp: Date.now(),
};

const mockNodes = [
  { node_id: 'node-1', status: 'healthy', cpu_usage: 45, memory_usage: 62, last_heartbeat: Date.now() - 1000 },
  { node_id: 'node-2', status: 'healthy', cpu_usage: 38, memory_usage: 58, last_heartbeat: Date.now() - 2000 },
];

describe('SystemHealth', () => {
  beforeEach(() => {
    // Mock fetch for API calls - differentiate by URL
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/nodes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNodes),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSystemMetrics),
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the system health component with metric cards', async () => {
    render(<SystemHealth />);

    // Fast-forward past loading state
    await waitFor(() => {
      // The component shows metric cards like "API Latency", "Consensus Latency", etc.
      expect(screen.getByText(/API Latency/i)).toBeInTheDocument();
    });
  });

  it('should display latency metrics', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText(/API Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Consensus Latency/i)).toBeInTheDocument();
    });
  });

  it('should render latency-related sections', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      // Chart section should exist with latency data being displayed
      expect(screen.getByText(/API Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Consensus Latency/i)).toBeInTheDocument();
    });
  });

  it('should fetch metrics on mount', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    ) as jest.Mock;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<SystemHealth />);

    await waitFor(() => {
      // Component should still render (with fallback data)
      expect(screen.getByText(/API Latency/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should display error rate metric', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText(/Error Rate/i)).toBeInTheDocument();
    });
  });

  it('should display uptime metric', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText(/Uptime/i)).toBeInTheDocument();
    });
  });
});
