/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - E2E TEST RUNNER                                   ║
 * ║  Automated test execution with service management                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ServiceHealthChecker } from './test-utils.spec';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..', '..');

/**
 * Automated Service Manager for E2E Tests
 */
class AutomatedServiceManager {
  private backendProcess: ChildProcess | null = null;
  private frontendProcess: ChildProcess | null = null;
  private servicesStarted = false;

  async startFullStack(): Promise<void> {
    if (this.servicesStarted) return;

    console.log('🚀 Starting BIZRA full-stack for automated E2E testing...');

    // Start backend
    console.log('📡 Starting backend service...');
    this.backendProcess = spawn('node', ['backend/server.js'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Start frontend
    console.log('🌐 Starting dashboard service...');
    this.frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(ROOT_DIR, 'apps', 'dashboard'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for services to be ready
    await this.waitForServices();

    this.servicesStarted = true;
    console.log('✅ Full-stack services ready for testing');
  }

  private async waitForServices(): Promise<void> {
    console.log('⏳ Waiting for services to become healthy...');

    for (let attempt = 1; attempt <= 30; attempt++) {
      const backendHealthy = await ServiceHealthChecker.checkBackendHealth();
      const frontendHealthy = await ServiceHealthChecker.checkFrontendHealth();

      if (backendHealthy && frontendHealthy) {
        console.log(`✅ Services ready after ${attempt} attempts`);
        return;
      }

      console.log(`⏳ Attempt ${attempt}/30 - Backend: ${backendHealthy ? '✅' : '❌'}, Frontend: ${frontendHealthy ? '✅' : '❌'}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Services failed to start within timeout');
  }

  async stopServices(): Promise<void> {
    console.log('🛑 Stopping services...');

    const stop = (process: ChildProcess | null, name: string) => {
      return new Promise<void>(resolve => {
        if (!process) return resolve();

        process.kill('SIGTERM');
        setTimeout(() => {
          if (!process.killed) process.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    };

    await Promise.all([
      stop(this.backendProcess, 'Backend'),
      stop(this.frontendProcess, 'Frontend')
    ]);

    this.servicesStarted = false;
    console.log('✅ Services stopped');
  }
}

const serviceManager = new AutomatedServiceManager();

test.describe('BIZRA E2E Test Runner', () => {
  test.beforeAll(async () => {
    await serviceManager.startFullStack();
  });

  test.afterAll(async () => {
    await serviceManager.stopServices();
  });

  test('Execute comprehensive smoke test suite', async ({ page }) => {
    console.log('🧪 Running comprehensive E2E smoke tests...');

    // Basic health check
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/BIZRA|Dashboard/i);

    // Verify critical components
    const navDock = page.locator('[data-testid="nav-dock"]').first();
    await expect(navDock).toBeVisible();

    console.log('✅ Comprehensive smoke tests completed successfully');
  });

  test('Validate login flow end-to-end', async ({ page }) => {
    console.log('🔐 Testing login flow...');

    await page.goto('http://localhost:5173/login');

    // Mock login API
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            user: { id: 'test-user', username: 'testuser' },
            tokens: { accessToken: 'fake-token' }
          }
        }
      });
    });

    // Perform login
    await page.getByTestId('login-email').fill('test@biza.test');
    await page.getByTestId('login-password').fill('Test123!');
    await page.getByTestId('login-submit').click();

    // Verify dashboard access
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✅ Login flow validated');
  });

  test('Validate health monitoring integration', async ({ page }) => {
    console.log('🏥 Testing health monitoring...');

    await page.goto('http://localhost:5173');

    // Check health endpoint
    const healthResponse = await page.request.get('http://localhost:3002/health');
    expect(healthResponse.ok()).toBe(true);

    // Verify health display in UI
    const healthElement = page.locator('text=/healthy|status/i').first();
    await expect(healthElement).toBeVisible();

    console.log('✅ Health monitoring validated');
  });

  test('Validate telemetry data streaming', async ({ page }) => {
    console.log('📊 Testing telemetry streaming...');

    await page.goto('http://localhost:5173');

    // Check metrics API
    const metricsResponse = await page.request.get('http://localhost:3002/api/v1/metrics');
    expect(metricsResponse.ok()).toBe(true);

    // Verify telemetry display
    const telemetryElement = page.locator('text=/consciousness|metrics/i').first();
    await expect(telemetryElement).toBeVisible();

    console.log('✅ Telemetry streaming validated');
  });
});