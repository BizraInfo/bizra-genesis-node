import { render, screen, waitFor } from '@testing-library/react';
import { SystemHealth } from '../SystemHealth';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock chart.js to avoid canvas rendering issues
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Chart</div>,
}));

describe('SystemHealth', () => {
  beforeEach(() => {
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            api_latency_ms: 45,
            consensus_latency_ms: 23,
            error_rate: 0.01,
            uptime_percentage: 99.95,
            active_connections: 42,
            requests_per_second: 150,
            timestamp: Date.now(),
          }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the system health component', () => {
    render(<SystemHealth />);
    expect(screen.getByText(/System Health/i)).toBeInTheDocument();
  });

  it('should display initial metrics', async () => {
    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText(/API Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Consensus Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Uptime/i)).toBeInTheDocument();
    });
  });

  it('should render the latency chart', () => {
    render(<SystemHealth />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
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
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should update metrics periodically', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            api_latency_ms: 45,
            consensus_latency_ms: 23,
            error_rate: 0.01,
            uptime_percentage: 99.95,
            active_connections: 42,
            requests_per_second: 150,
            timestamp: Date.now(),
          }),
      })
    ) as jest.Mock;

    global.fetch = fetchMock;

    render(<SystemHealth />);

    // Initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time to trigger interval
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should display healthy status when metrics are good', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            api_latency_ms: 45,
            consensus_latency_ms: 23,
            error_rate: 0.001,
            uptime_percentage: 99.95,
            active_connections: 42,
            requests_per_second: 150,
            timestamp: Date.now(),
          }),
      })
    ) as jest.Mock;

    render(<SystemHealth />);

    await waitFor(() => {
      // Look for healthy indicators
      const healthyElements = screen.queryAllByText(/healthy|operational/i);
      expect(healthyElements.length).toBeGreaterThan(0);
    });
  });
});
