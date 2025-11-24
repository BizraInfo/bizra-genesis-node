/**
 * BIZRA Genesis Node - Provider Contract Verification
 *
 * These tests verify that the Rust backend (Provider) honors
 * the contracts defined by the Dashboard (Consumer)
 */

import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

describe('BIZRA API Provider Verification', () => {
  let serverProcess: ChildProcess;
  const API_PORT = process.env.PACT_PROVIDER_PORT || 3000;
  const API_HOST = process.env.PACT_PROVIDER_HOST || 'localhost';
  const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

  beforeAll(async () => {
    // Start the Rust backend server
    console.log('🚀 Starting BIZRA API server for contract verification...');

    serverProcess = spawn('cargo', ['run', '--release'], {
      cwd: path.resolve(process.cwd(), '../..'),
      env: {
        ...process.env,
        DATABASE_URL: process.env.PACT_DATABASE_URL || 'postgresql://bizra_test:test_password@localhost:5432/bizra_test',
        REDIS_URL: process.env.PACT_REDIS_URL || 'redis://localhost:6379',
        JWT_SECRET: 'test-secret-key-for-pact-verification',
        PORT: String(API_PORT),
      },
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify server is running
    const fetch = (await import('node-fetch')).default;
    const healthCheck = await fetch(`${API_BASE_URL}/api/v1/health`);

    if (!healthCheck.ok) {
      throw new Error('Server failed to start for contract verification');
    }

    console.log('✅ BIZRA API server started successfully');
  }, 30000);

  afterAll(() => {
    // Stop the server
    if (serverProcess) {
      console.log('🛑 Stopping BIZRA API server...');
      serverProcess.kill();
    }
  });

  it('honors all contracts from BizraDashboard', async () => {
    const options = {
      provider: 'BizraAPI',
      providerBaseUrl: API_BASE_URL,

      // Pact files location
      pactUrls: [
        path.resolve(process.cwd(), 'pacts/bizradashboard-bizraapi.json'),
      ],

      // Pact Broker configuration (if using)
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // State handlers
      stateHandlers: {
        'a user exists with valid credentials': async () => {
          // Set up test user in database
          console.log('  📝 Setting up: user with valid credentials');
          // In production, you'd seed the test database here
          return Promise.resolve();
        },

        'no user exists with the provided credentials': async () => {
          console.log('  📝 Setting up: no matching user');
          return Promise.resolve();
        },

        'the server is healthy': async () => {
          console.log('  📝 Setting up: healthy server state');
          return Promise.resolve();
        },

        'no user exists with the email': async () => {
          console.log('  📝 Setting up: email available for registration');
          return Promise.resolve();
        },

        'a user already exists with the email': async () => {
          console.log('  📝 Setting up: email already registered');
          return Promise.resolve();
        },

        'a user is authenticated': async () => {
          console.log('  📝 Setting up: authenticated user session');
          return Promise.resolve();
        },

        'user is authenticated and agents are available': async () => {
          console.log('  📝 Setting up: authenticated user with available agents');
          return Promise.resolve();
        },

        'agents are available but all fail ihsan threshold': async () => {
          console.log('  📝 Setting up: agents that fail ihsan gate');
          return Promise.resolve();
        },

        'user has synthesis history': async () => {
          console.log('  📝 Setting up: user with synthesis run history');
          return Promise.resolve();
        },

        'a synthesis run exists': async () => {
          console.log('  📝 Setting up: existing synthesis run');
          return Promise.resolve();
        },

        'no run exists with the ID': async () => {
          console.log('  📝 Setting up: non-existent run ID');
          return Promise.resolve();
        },
      },

      // Request filters (for authentication, etc.)
      requestFilter: (req: any, res: any, next: any) => {
        // Inject test authentication token
        if (req.headers.authorization) {
          req.headers.authorization = req.headers.authorization.replace(
            /Bearer .*/,
            'Bearer test-token-for-pact-verification'
          );
        }
        next();
      },

      // Verification options
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_COMMIT || 'dev',
      providerVersionTags: process.env.GIT_BRANCH ? [process.env.GIT_BRANCH] : ['dev'],

      // Logging
      logLevel: 'info',
      verbose: true,
    };

    const verifier = new Verifier(options);

    try {
      const output = await verifier.verifyProvider();
      console.log('✅ Pact verification succeeded');
      console.log(output);
    } catch (error) {
      console.error('❌ Pact verification failed');
      throw error;
    }
  }, 60000);
});
