/**
 * BIZRA Genesis Node - Consumer Contract Tests (Authentication API)
 *
 * These tests define the contract from the consumer's (Dashboard) perspective.
 * They verify that the backend API provides the expected responses.
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like, eachLike, string, integer, boolean, iso8601DateTime } = MatchersV3;

// Configure Pact
const provider = new PactV3({
  consumer: 'BizraDashboard',
  provider: 'BizraAPI',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'info',
});

describe('Authentication API Contract', () => {
  describe('POST /api/v1/auth/login', () => {
    it('returns a valid authentication response on successful login', async () => {
      await provider
        .given('a user exists with valid credentials')
        .uponReceiving('a login request with valid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'test@example.com',
            password: 'ValidPassword123!',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            user: {
              id: like('user-123'),
              email: like('test@example.com'),
              name: like('Test User'),
              createdAt: iso8601DateTime('2024-01-15T10:30:00Z'),
            },
            tokens: {
              accessToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              refreshToken: like('refresh-token-abc123'),
              expiresIn: integer(86400),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/auth/login`,
            {
              email: 'test@example.com',
              password: 'ValidPassword123!',
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data.user).toHaveProperty('id');
          expect(response.data.user).toHaveProperty('email');
          expect(response.data.tokens).toHaveProperty('accessToken');
          expect(response.data.tokens).toHaveProperty('refreshToken');
          expect(response.data.tokens.expiresIn).toBeGreaterThan(0);
        });
    });

    it('returns 401 for invalid credentials', async () => {
      await provider
        .given('no user exists with the provided credentials')
        .uponReceiving('a login request with invalid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'wrong@example.com',
            password: 'WrongPassword123!',
          },
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Unauthorized'),
            message: like('Invalid credentials'),
            code: like('AUTH_INVALID_CREDENTIALS'),
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.post(`${mockServer.url}/api/v1/auth/login`, {
              email: 'wrong@example.com',
              password: 'WrongPassword123!',
            });
            fail('Expected request to fail with 401');
          } catch (error: any) {
            expect(error.response.status).toBe(401);
            expect(error.response.data).toHaveProperty('error');
            expect(error.response.data).toHaveProperty('message');
          }
        });
    });

    it('returns 400 for malformed request', async () => {
      await provider
        .given('the server is healthy')
        .uponReceiving('a login request with missing email')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            password: 'ValidPassword123!',
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Bad Request'),
            message: like('Email is required'),
            code: like('VALIDATION_ERROR'),
            details: {
              field: 'email',
            },
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.post(`${mockServer.url}/api/v1/auth/login`, {
              password: 'ValidPassword123!',
            });
            fail('Expected request to fail with 400');
          } catch (error: any) {
            expect(error.response.status).toBe(400);
            expect(error.response.data.error).toBe('Bad Request');
          }
        });
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user and returns authentication tokens', async () => {
      await provider
        .given('no user exists with the email')
        .uponReceiving('a registration request with valid data')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'newuser@example.com',
            password: 'SecurePassword123!',
            name: 'New User',
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            user: {
              id: like('user-456'),
              email: like('newuser@example.com'),
              name: like('New User'),
              createdAt: iso8601DateTime('2024-01-15T10:30:00Z'),
            },
            tokens: {
              accessToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              refreshToken: like('refresh-token-xyz789'),
              expiresIn: integer(86400),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(`${mockServer.url}/api/v1/auth/register`, {
            email: 'newuser@example.com',
            password: 'SecurePassword123!',
            name: 'New User',
          });

          expect(response.status).toBe(201);
          expect(response.data.user.email).toBe('newuser@example.com');
          expect(response.data.tokens.accessToken).toBeTruthy();
        });
    });

    it('returns 409 when user already exists', async () => {
      await provider
        .given('a user already exists with the email')
        .uponReceiving('a registration request with existing email')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'existing@example.com',
            password: 'Password123!',
            name: 'Existing User',
          },
        })
        .willRespondWith({
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: like('Conflict'),
            message: like('User already exists'),
            code: like('USER_ALREADY_EXISTS'),
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.post(`${mockServer.url}/api/v1/auth/register`, {
              email: 'existing@example.com',
              password: 'Password123!',
              name: 'Existing User',
            });
            fail('Expected request to fail with 409');
          } catch (error: any) {
            expect(error.response.status).toBe(409);
            expect(error.response.data.code).toBe('USER_ALREADY_EXISTS');
          }
        });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user information with valid token', async () => {
      await provider
        .given('a user is authenticated')
        .uponReceiving('a request for current user information')
        .withRequest({
          method: 'GET',
          path: '/api/v1/auth/me',
          headers: {
            Authorization: like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id: like('user-123'),
            email: like('test@example.com'),
            name: like('Test User'),
            createdAt: iso8601DateTime('2024-01-15T10:30:00Z'),
            preferences: {
              theme: like('dark'),
              notifications: boolean(true),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(`${mockServer.url}/api/v1/auth/me`, {
            headers: {
              Authorization: 'Bearer valid-token-123',
            },
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('id');
          expect(response.data).toHaveProperty('email');
          expect(response.data).toHaveProperty('preferences');
        });
    });

    it('returns 401 with invalid or missing token', async () => {
      await provider
        .given('the server is healthy')
        .uponReceiving('a request without authentication token')
        .withRequest({
          method: 'GET',
          path: '/api/v1/auth/me',
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
            await axios.get(`${mockServer.url}/api/v1/auth/me`);
            fail('Expected request to fail with 401');
          } catch (error: any) {
            expect(error.response.status).toBe(401);
          }
        });
    });
  });
});
