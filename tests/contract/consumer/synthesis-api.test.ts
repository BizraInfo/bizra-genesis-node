/**
 * BIZRA Genesis Node - Consumer Contract Tests (Synthesis API)
 *
 * Contract tests for the core synthesis orchestration endpoints
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like, eachLike, string, integer, decimal, iso8601DateTime } = MatchersV3;

const provider = new PactV3({
  consumer: 'BizraDashboard',
  provider: 'BizraAPI',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'info',
});

describe('Synthesis API Contract', () => {
  const authToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  describe('POST /api/v1/synthesis', () => {
    it('successfully executes synthesis and returns winner with receipt', async () => {
      await provider
        .given('user is authenticated and agents are available')
        .uponReceiving('a synthesis request with valid parameters')
        .withRequest({
          method: 'POST',
          path: '/api/v1/synthesis',
          headers: {
            'Content-Type': 'application/json',
            Authorization: like(authToken),
          },
          body: {
            task: {
              id: like('task-123'),
              description: like('Analyze the impact of AI on software development'),
              parameters: {
                depth: like('comprehensive'),
                format: like('markdown'),
              },
            },
            contract: {
              ihsan_floor: decimal(0.7),
              accuracy_weight: decimal(0.4),
              safety_weight: decimal(0.3),
            },
            routes: eachLike('gpt-4'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            runId: like('run-abc123'),
            winner: {
              model: like('gpt-4'),
              output: {
                content: like('AI has significantly transformed software development...'),
                format: like('markdown'),
              },
              scores: {
                accuracy: decimal(0.95),
                safety: decimal(0.98),
                efficiency: decimal(0.92),
                ihsan: decimal(0.88),
                composite: decimal(0.94),
              },
            },
            receipt: {
              runId: like('run-abc123'),
              outputHash: like('blake3:abc123def456...'),
              publicKey: like('base64-encoded-public-key'),
              signature: like('base64-encoded-signature'),
              timestamp: integer(1705320600000),
              proofOfImpact: {
                latency_ms: integer(245),
                tokens_used: integer(1523),
                carbon_offset_g: decimal(2.3),
              },
            },
            latency: {
              total_ms: integer(245),
              consensus_ms: integer(42),
              routing_ms: integer(3),
            },
            participatingAgents: eachLike({
              agentId: like('agent-pat-1'),
              tier: like('PAT'),
              contributed: true,
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/synthesis`,
            {
              task: {
                id: 'task-123',
                description: 'Analyze the impact of AI on software development',
                parameters: {
                  depth: 'comprehensive',
                  format: 'markdown',
                },
              },
              contract: {
                ihsan_floor: 0.7,
                accuracy_weight: 0.4,
                safety_weight: 0.3,
              },
              routes: ['gpt-4', 'claude-3'],
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: authToken,
              },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('runId');
          expect(response.data.winner).toHaveProperty('model');
          expect(response.data.winner).toHaveProperty('scores');
          expect(response.data.receipt).toHaveProperty('signature');
          expect(response.data.latency.total_ms).toBeGreaterThan(0);
        });
    });

    it('returns 422 when no candidates pass ihsan gate', async () => {
      await provider
        .given('agents are available but all fail ihsan threshold')
        .uponReceiving('a synthesis request with high ihsan floor')
        .withRequest({
          method: 'POST',
          path: '/api/v1/synthesis',
          headers: {
            'Content-Type': 'application/json',
            Authorization: like(authToken),
          },
          body: {
            task: {
              id: like('task-456'),
              description: like('Test task'),
            },
            contract: {
              ihsan_floor: decimal(0.99),
              accuracy_weight: decimal(0.4),
              safety_weight: decimal(0.3),
            },
            routes: eachLike('gpt-4'),
          },
        })
        .willRespondWith({
          status: 422,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Unprocessable Entity'),
            message: like('No candidates passed the ihsan gate'),
            code: like('SYNTHESIS_NO_CANDIDATES'),
            details: {
              ihsan_floor: decimal(0.99),
              best_ihsan_score: decimal(0.92),
              candidates_evaluated: integer(3),
            },
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.post(
              `${mockServer.url}/api/v1/synthesis`,
              {
                task: {
                  id: 'task-456',
                  description: 'Test task',
                },
                contract: {
                  ihsan_floor: 0.99,
                  accuracy_weight: 0.4,
                  safety_weight: 0.3,
                },
                routes: ['gpt-4'],
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authToken,
                },
              }
            );
            fail('Expected request to fail with 422');
          } catch (error: any) {
            expect(error.response.status).toBe(422);
            expect(error.response.data.code).toBe('SYNTHESIS_NO_CANDIDATES');
          }
        });
    });

    it('returns 401 when unauthorized', async () => {
      await provider
        .given('the server is healthy')
        .uponReceiving('a synthesis request without authentication')
        .withRequest({
          method: 'POST',
          path: '/api/v1/synthesis',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            task: { id: 'task-123', description: 'Test' },
            contract: { ihsan_floor: 0.7 },
            routes: ['gpt-4'],
          },
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Unauthorized'),
            message: like('Missing authentication token'),
            code: like('AUTH_MISSING_TOKEN'),
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.post(`${mockServer.url}/api/v1/synthesis`, {
              task: { id: 'task-123', description: 'Test' },
              contract: { ihsan_floor: 0.7 },
              routes: ['gpt-4'],
            });
            fail('Expected request to fail with 401');
          } catch (error: any) {
            expect(error.response.status).toBe(401);
          }
        });
    });
  });

  describe('GET /api/v1/synthesis/history', () => {
    it('returns paginated synthesis history', async () => {
      await provider
        .given('user has synthesis history')
        .uponReceiving('a request for synthesis history')
        .withRequest({
          method: 'GET',
          path: '/api/v1/synthesis/history',
          query: {
            page: '1',
            limit: '10',
          },
          headers: {
            Authorization: like(authToken),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            runs: eachLike({
              runId: like('run-123'),
              taskId: like('task-456'),
              winnerModel: like('gpt-4'),
              compositeScore: decimal(0.94),
              timestamp: iso8601DateTime('2024-01-15T10:30:00Z'),
              latency_ms: integer(245),
            }),
            pagination: {
              page: integer(1),
              limit: integer(10),
              total: integer(47),
              hasMore: true,
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(
            `${mockServer.url}/api/v1/synthesis/history`,
            {
              params: { page: 1, limit: 10 },
              headers: { Authorization: authToken },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data.runs).toBeInstanceOf(Array);
          expect(response.data.pagination).toHaveProperty('total');
          expect(response.data.pagination.page).toBe(1);
        });
    });
  });

  describe('GET /api/v1/synthesis/:runId', () => {
    it('returns detailed synthesis run information', async () => {
      await provider
        .given('a synthesis run exists')
        .uponReceiving('a request for specific run details')
        .withRequest({
          method: 'GET',
          path: '/api/v1/synthesis/run-abc123',
          headers: {
            Authorization: like(authToken),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            runId: like('run-abc123'),
            task: {
              id: like('task-456'),
              description: like('Analyze AI impact'),
            },
            winner: {
              model: like('gpt-4'),
              output: like('Detailed analysis...'),
              scores: {
                accuracy: decimal(0.95),
                safety: decimal(0.98),
                efficiency: decimal(0.92),
                ihsan: decimal(0.88),
              },
            },
            allCandidates: eachLike({
              model: like('gpt-4'),
              passed_ihsan_gate: true,
              scores: {
                composite: decimal(0.94),
              },
            }),
            receipt: {
              signature: like('base64-signature'),
              verified: true,
            },
            timestamp: iso8601DateTime('2024-01-15T10:30:00Z'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(
            `${mockServer.url}/api/v1/synthesis/run-abc123`,
            {
              headers: { Authorization: authToken },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data.runId).toBe('run-abc123');
          expect(response.data.winner).toBeDefined();
          expect(response.data.allCandidates).toBeInstanceOf(Array);
        });
    });

    it('returns 404 when run not found', async () => {
      await provider
        .given('no run exists with the ID')
        .uponReceiving('a request for non-existent run')
        .withRequest({
          method: 'GET',
          path: '/api/v1/synthesis/non-existent-run',
          headers: {
            Authorization: like(authToken),
          },
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Not Found'),
            message: like('Synthesis run not found'),
            code: like('RUN_NOT_FOUND'),
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.get(`${mockServer.url}/api/v1/synthesis/non-existent-run`, {
              headers: { Authorization: authToken },
            });
            fail('Expected request to fail with 404');
          } catch (error: any) {
            expect(error.response.status).toBe(404);
          }
        });
    });
  });
});
