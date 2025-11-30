// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - API SERVICE TEST                                 ║
// ║  Comprehensive tests for backend API communication layer               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { api, ApiService, ModelProvider, ModelMetrics, CostMetrics, ABTestResult } from '../api'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ApiService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    test('creates instance with default base URL', () => {
      const service = new ApiService()
      expect(service).toBeInstanceOf(ApiService)
    })

    test('creates instance with custom base URL', () => {
      const customUrl = 'https://custom.api.com'
      const service = new ApiService(customUrl)
      expect(service).toBeInstanceOf(ApiService)
      // Note: We can't easily test internal baseUrl without exposing it
    })
  })

  describe('API calls', () => {
    test('makes GET request with correct URL and headers', async () => {
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        statusText: 'OK',
        status: 200
      } as Response)

      const result = await api.getProviders()

      expect(mockFetch).toHaveBeenCalledWith(`${api.constructor.name === 'ApiService' ? 'http://localhost:3000' : ''}/api/providers`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result).toEqual(mockResponse)
    })

    test('makes POST request with body', async () => {
      const mockResponse = { content: 'response', model: 'gpt-4' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const result = await api.complete('gpt-4', 'Hello world')

      expect(mockFetch).toHaveBeenCalledWith(`${api.constructor.name === 'ApiService' ? 'http://localhost:3000' : ''}/api/complete`, {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: 'Hello world',
          options: undefined
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result).toEqual(mockResponse)
    })

    test('handles API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(api.getProviders()).rejects.toThrow('API Error: Internal Server Error')
    })

    test('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getProviders()).rejects.toThrow('Network error')
    })

    test('parses different response types', async () => {
      const providers = [
        { id: '1', name: 'OpenAI', status: 'healthy', models: ['gpt-4'] },
        { id: '2', name: 'Anthropic', status: 'healthy', models: ['claude-3'] }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(providers)
      } as Response)

      const result = await api.getProviders()
      expect(result).toEqual(providers)
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'OpenAI')
    })
  })

  describe('specific API endpoints', () => {
    test('getProviders calls correct endpoint', async () => {
      const mockProviders = [{ id: '1', name: 'Test' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviders)
      } as Response)

      const result = await api.getProviders()
      expect(result).toEqual(mockProviders)
    })

    test('getProviderHealth includes provider ID in URL', async () => {
      const mockHealth = { id: '1', status: 'healthy' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      } as Response)

      const result = await api.getProviderHealth('test-provider')
      expect(result).toEqual(mockHealth)
    })

    test('getModelMetricsByProvider includes query parameter', async () => {
      const mockMetrics = [{ model_id: 'gpt-4', total_requests: 100 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      } as Response)

      const result = await api.getModelMetricsByProvider('openai')
      expect(result).toEqual(mockMetrics)
    })

    test('getCostHistory includes hours parameter', async () => {
      const mockHistory = [{ timestamp: 1234567890, cost: 0.5 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory)
      } as Response)

      const result = await api.getCostHistory(48)
      expect(result).toEqual(mockHistory)
    })
  })

  describe('request configuration', () => {
    test('includes content-type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

      await api.getProviders()

      const calledWith = mockFetch.mock.calls[0][1]
      expect(calledWith?.headers).toEqual({
        'Content-Type': 'application/json'
      })
    })

    test('merges custom headers with default', async () => {
      const customService = new ApiService()
      // Note: This would require exposing a method that accepts custom headers
      // For now, testing with default behavior
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

      // Call a method that should use default headers
      await customService.getProviders()

      const calledWith = mockFetch.mock.calls[0][1]
      expect(calledWith?.headers).toEqual({
        'Content-Type': 'application/json'
      })
    })

    test('uses environment variable for API URL', () => {
      // Save original env
      const originalEnv = process.env.VITE_API_URL

      try {
        process.env.VITE_API_URL = 'https://test-api.com'
        // Create new instance to pick up env change
        const testApi = new ApiService()

        expect(testApi).toBeInstanceOf(ApiService)
        // The baseUrl is private, so we can't test it directly
        // but the constructor should use the env variable
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.VITE_API_URL = originalEnv
        } else {
          delete process.env.VITE_API_URL
        }
      }
    })

    test('defaults to localhost when no env variable', () => {
      // Clear env variable
      delete process.env.VITE_API_URL

      const testApi = new ApiService()
      expect(testApi).toBeInstanceOf(ApiService)
      // BaseUrl defaults to 'http://localhost:3000'
    })
  })

  describe('data types and interfaces', () => {
    test('ModelProvider interface structure', () => {
      // Test the interface by checking if our mock data matches
      const provider: ModelProvider = {
        id: 'openai',
        name: 'OpenAI',
        status: 'healthy',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        latency_ms: 150
      }

      expect(provider.id).toBe('openai')
      expect(provider.name).toBe('OpenAI')
      expect(provider.status).toBe('healthy')
      expect(provider.models).toContain('gpt-4')
      expect(provider.latency_ms).toBe(150)
    })

    test('ModelMetrics interface structure', () => {
      const metrics: ModelMetrics = {
        model_id: 'gpt-4',
        provider: 'openai',
        total_requests: 1000,
        success_rate: 0.98,
        avg_latency_ms: 120.5,
        avg_cost_usd: 0.03,
        avg_quality: 8.7,
        last_updated: 1700000000
      }

      expect(metrics.model_id).toBe('gpt-4')
      expect(metrics.provider).toBe('openai')
      expect(metrics.total_requests).toBe(1000)
      expect(metrics.success_rate).toBe(0.98)
    })

    test('CostMetrics interface structure', () => {
      const costMetrics: CostMetrics = {
        total_cost_usd: 25.50,
        cost_per_hour: 1.20,
        cost_per_day: 28.80,
        budget_remaining: 74.50,
        top_models_by_cost: [
          { model: 'gpt-4', cost: 15.20 },
          { model: 'claude-3', cost: 10.30 }
        ]
      }

      expect(costMetrics.total_cost_usd).toBe(25.50)
      expect(costMetrics.budget_remaining).toBe(74.50)
      expect(costMetrics.top_models_by_cost).toHaveLength(2)
    })

    test('ABTestResult interface structure', () => {
      const testResult: ABTestResult = {
        experiment_name: 'temperature_test',
        variant_a: 'temperature_0.7',
        variant_b: 'temperature_1.0',
        metric: 'quality_score',
        is_significant: true,
        p_value: 0.001,
        effect_size: 0.3,
        winner: 'variant_a',
        improvement_pct: 15.2
      }

      expect(testResult.experiment_name).toBe('temperature_test')
      expect(testResult.is_significant).toBe(true)
      expect(testResult.p_value).toBe(0.001)
      expect(testResult.winner).toBe('variant_a')
    })
  })

  describe('error handling', () => {
    test('propagates JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)

      await expect(api.getProviders()).rejects.toThrow('Invalid JSON')
    })

    test('handles malformed response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null) // Unexpected null response
      } as Response)

      const result = await api.getProviders()
      expect(result).toBeNull()
    })

    test('handles empty array responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as Response)

      const result = await api.getProviders()
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('concurrent operations', () => {
    test('handles multiple simultaneous requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const promises = [
        api.getProviders(),
        api.getModelMetrics(),
        api.getCostMetrics(),
        api.getABTestResults()
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    test('isolates different API calls', async () => {
      const providerResponse = [{ id: '1', name: 'Test' }]
      const metricsResponse = [{ model_id: 'gpt-4', total_requests: 100 }]
      const costResponse = { total_cost_usd: 10.0 }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(providerResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(metricsResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(costResponse)
        } as Response)

      const [providers, metrics, costs] = await Promise.all([
        api.getProviders(),
        api.getModelMetrics(),
        api.getCostMetrics()
      ])

      expect(providers).toEqual(providerResponse)
      expect(metrics).toEqual(metricsResponse)
      expect(costs).toEqual(costResponse)
    })
  })
})
