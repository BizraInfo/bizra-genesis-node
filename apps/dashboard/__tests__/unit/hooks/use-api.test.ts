/**
 * BIZRA Node0 - useApi Hook Unit Tests
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Elite Testing Standards:
 * - Hook isolation with renderHook
 * - Async state management
 * - Error boundary testing
 * - Cache invalidation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi, useApiMutation, ApiProvider } from '@/hooks/use-api';
import React from 'react';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Create wrapper with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider baseUrl="http://localhost:8080">{children}</ApiProvider>
);

describe('useApi Hook', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  describe('GET Requests', () => {
    it('should fetch data successfully', async () => {
      const mockData = { success: true, data: { id: 1, name: 'Test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(
        () => useApi('/api/test'),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useApi('/api/test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(
        () => useApi('/api/test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('404');
    });

    it('should support manual refetch', async () => {
      const mockData = { success: true, data: { count: 1 } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(
        () => useApi('/api/test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect enabled option', async () => {
      const { result } = renderHook(
        () => useApi('/api/test', { enabled: false }),
        { wrapper }
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache responses', async () => {
      const mockData = { success: true, data: { cached: true } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result: result1 } = renderHook(
        () => useApi('/api/cached'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      // Second hook should use cache
      const { result: result2 } = renderHook(
        () => useApi('/api/cached'),
        { wrapper }
      );

      // Should have cached data immediately
      expect(result2.current.data).toEqual(mockData);
    });
  });
});

describe('useApiMutation Hook', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('POST Requests', () => {
    it('should post data successfully', async () => {
      const mockResponse = { success: true, data: { id: 1 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(
        () => useApiMutation('/api/create'),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(
        () => useApiMutation('/api/create', { onSuccess }),
        { wrapper }
      );

      await act(async () => {
        await result.current.mutate({});
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });

    it('should call onError callback on failure', async () => {
      const onError = jest.fn();
      mockFetch.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(
        () => useApiMutation('/api/create', { onError }),
        { wrapper }
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch (e) {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should support different HTTP methods', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(
        () => useApiMutation('/api/update', { method: 'PUT' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.mutate({ id: 1 });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Loading States', () => {
    it('should track loading state during mutation', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(
        () => useApiMutation('/api/slow'),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
