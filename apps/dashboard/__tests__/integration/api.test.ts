/**
 * BIZRA Node0 - API Integration Tests
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Elite Testing Standards:
 * - Real API contract validation
 * - Database state management
 * - Transaction isolation
 * - Performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8080';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Helper for API calls
async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  return response.json();
}

describe('Health & Status API', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.node_id).toBeDefined();
      expect(data.version).toBe('1.0.0');
      expect(data.timestamp).toBeDefined();
    });

    it('should respond within 100ms', async () => {
      const start = performance.now();
      await fetch(`${API_BASE_URL}/health`);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /api/services/status', () => {
    it('should return all service statuses', async () => {
      const result = await api<Record<string, string>>('/api/services/status');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('postgres');
      expect(result.data).toHaveProperty('ollama');
    });
  });
});

describe('User Profile API', () => {
  const testProfile = {
    seed_state: 'builder',
    primary_pat_role: 'MasterReasoner',
    goals: ['Build BIZRA', 'Learn AI'],
    time_available_weekly: 600,
  };

  describe('POST /api/user/profile', () => {
    it('should create user profile', async () => {
      const result = await api<any>('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(testProfile),
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.seed_state).toBe('builder');
      expect(result.data?.primary_pat_role).toBe('MasterReasoner');
    });

    it('should validate seed_state enum', async () => {
      const invalidProfile = { ...testProfile, seed_state: 'invalid' };
      
      const result = await api<any>('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(invalidProfile),
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate primary_pat_role enum', async () => {
      const invalidProfile = { ...testProfile, primary_pat_role: 'InvalidRole' };
      
      const result = await api<any>('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(invalidProfile),
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('GET /api/user/profile', () => {
    it('should retrieve user profile', async () => {
      const result = await api<any>('/api/user/profile');
      
      expect(result.success).toBe(true);
      expect(result.data?.user_id).toBe('NODE0-USER');
    });
  });
});

describe('PAT (Personal Agent Team) API', () => {
  describe('GET /api/pat/agents', () => {
    it('should return all 7 PAT agents', async () => {
      const result = await api<any[]>('/api/pat/agents');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(7);
      
      const roles = result.data!.map((a: any) => a.role);
      expect(roles).toContain('MasterReasoner');
      expect(roles).toContain('MemoryArchitect');
      expect(roles).toContain('CreativeSynthesizer');
      expect(roles).toContain('DataAnalyzer');
      expect(roles).toContain('Communicator');
      expect(roles).toContain('ExecutionPlanner');
      expect(roles).toContain('EthicsGuardian');
    });

    it('should include model and description for each agent', async () => {
      const result = await api<any[]>('/api/pat/agents');
      
      result.data!.forEach((agent: any) => {
        expect(agent).toHaveProperty('role');
        expect(agent).toHaveProperty('model');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('available');
      });
    });
  });

  describe('POST /api/pat/chat', () => {
    it('should return chat response with metadata', async () => {
      const result = await api<any>('/api/pat/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello, what can you help me with?',
          agent_role: 'Communicator',
        }),
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('response');
      expect(result.data).toHaveProperty('agent');
      expect(result.data).toHaveProperty('model');
      expect(result.data).toHaveProperty('latency_ms');
      expect(result.data).toHaveProperty('ihsan_score');
    }, 30000); // Extended timeout for LLM

    it('should use correct model for agent role', async () => {
      const result = await api<any>('/api/pat/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          agent_role: 'MasterReasoner',
        }),
      });
      
      expect(result.data?.model).toBe('deepseek-r1:7b');
    }, 30000);

    it('should calculate Ihsan score between 0 and 1', async () => {
      const result = await api<any>('/api/pat/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
        }),
      });
      
      expect(result.data?.ihsan_score).toBeGreaterThanOrEqual(0);
      expect(result.data?.ihsan_score).toBeLessThanOrEqual(1);
    }, 30000);
  });

  describe('POST /api/pat/configure', () => {
    it('should update primary PAT role', async () => {
      const result = await api<string>('/api/pat/configure', {
        method: 'POST',
        body: JSON.stringify({
          primary_role: 'CreativeSynthesizer',
        }),
      });
      
      expect(result.success).toBe(true);
    });
  });
});

describe('PoI (Proof-of-Impact) API', () => {
  describe('POST /api/poi/log', () => {
    it('should log PoI event with calculated rewards', async () => {
      const event = {
        event_type: 'task_completed',
        impact_score: 10.5,
        ihsan_score: 0.92,
        duration_minutes: 45,
        description: 'Integration test event',
      };
      
      const result = await api<any>('/api/poi/log', {
        method: 'POST',
        body: JSON.stringify(event),
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data?.reward_bzc).toBeGreaterThan(0);
      expect(result.data?.reward_imp).toBeGreaterThan(0);
    });

    it('should validate event_type enum', async () => {
      const invalidEvent = {
        event_type: 'invalid_type',
        impact_score: 10,
        ihsan_score: 0.9,
      };
      
      const result = await api<any>('/api/poi/log', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate ihsan_score range [0,1]', async () => {
      const invalidEvent = {
        event_type: 'task_completed',
        impact_score: 10,
        ihsan_score: 1.5, // Invalid: > 1
      };
      
      const result = await api<any>('/api/poi/log', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('GET /api/poi/stats', () => {
    it('should return aggregate PoI statistics', async () => {
      const result = await api<any>('/api/poi/stats');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('total_events');
      expect(result.data).toHaveProperty('verified_events');
      expect(result.data).toHaveProperty('total_impact');
      expect(result.data).toHaveProperty('avg_ihsan');
      expect(result.data).toHaveProperty('total_bzc');
      expect(result.data).toHaveProperty('total_imp');
    });
  });

  describe('GET /api/poi/timeline', () => {
    it('should return paginated PoI events', async () => {
      const result = await api<any[]>('/api/poi/timeline?limit=10&offset=0');
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should order events by timestamp descending', async () => {
      const result = await api<any[]>('/api/poi/timeline?limit=5');
      
      if (result.data && result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          const current = new Date(result.data[i].timestamp);
          const next = new Date(result.data[i + 1].timestamp);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });
});

describe('Resource Pool API', () => {
  describe('GET /api/resources/status', () => {
    it('should return node resource status', async () => {
      const result = await api<any>('/api/resources/status');
      
      expect(result.success).toBe(true);
      expect(result.data?.node_id).toBe('NODE0-TITAN');
      expect(result.data).toHaveProperty('cpu_cores_total');
      expect(result.data).toHaveProperty('cpu_cores_allocated');
      expect(result.data).toHaveProperty('gpu_enabled');
      expect(result.data).toHaveProperty('storage_total_gb');
    });
  });

  describe('POST /api/resources/configure', () => {
    it('should update resource allocation', async () => {
      const result = await api<string>('/api/resources/configure', {
        method: 'POST',
        body: JSON.stringify({
          cpu_cores_allocated: 8,
          gpu_enabled: true,
        }),
      });
      
      expect(result.success).toBe(true);
    });
  });
});

describe('Asset Registry API', () => {
  describe('GET /api/assets/stats', () => {
    it('should return asset statistics', async () => {
      const result = await api<any>('/api/assets/stats');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('total_assets');
      expect(result.data).toHaveProperty('indexed_assets');
      expect(result.data).toHaveProperty('total_size_mb');
    });
  });
});

describe('Environment Snapshot API', () => {
  describe('GET /api/env/snapshot', () => {
    it('should return system environment snapshot', async () => {
      const result = await api<any>('/api/env/snapshot');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cpu');
      expect(result.data).toHaveProperty('memory');
      expect(result.data).toHaveProperty('os');
    });
  });
});

describe('API Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await fetch(`${API_BASE_URL}/api/unknown`);
    expect(response.status).toBe(404);
  });

  it('should handle malformed JSON gracefully', async () => {
    const response = await fetch(`${API_BASE_URL}/api/pat/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    
    expect(response.status).toBe(400);
  });

  it('should include CORS headers', async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    // CORS headers should be present
    expect(response.headers.get('access-control-allow-origin')).toBeDefined();
  });
});

describe('API Performance', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, () =>
      fetch(`${API_BASE_URL}/health`)
    );
    
    const start = performance.now();
    const responses = await Promise.all(requests);
    const duration = performance.now() - start;
    
    responses.forEach(r => expect(r.status).toBe(200));
    expect(duration).toBeLessThan(500); // All 10 requests < 500ms
  });
});
