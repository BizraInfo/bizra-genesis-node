/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  BIZRA GENESIS NODE - E2E TEST UTILITIES                               ║
 * ║  Shared utilities for smoke tests and comprehensive failure reporting ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Page, TestInfo } from '@playwright/test';

/**
 * Service health check utilities
 */
export class ServiceHealthChecker {
  static async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3002/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  static async checkWebSocketHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8080/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  static async checkFrontendHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:5173');
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Authentication test helpers
 */
export class AuthHelper {
  static async loginAsTestUser(page: Page, userType: 'smoke' | 'health' | 'settings' | 'ws' = 'smoke'): Promise<void> {
    const userData = {
      smoke: { email: 'smoke@biza.test', password: 'SmokeTest123!', username: 'smokeuser' },
      health: { email: 'health@biza.test', password: 'HealthTest123!', username: 'healthuser' },
      settings: { email: 'settings@biza.test', password: 'SettingsTest123!', username: 'settingsuser' },
      ws: { email: 'ws@biza.test', password: 'WsTest123!', username: 'wsuser' }
    };

    const user = userData[userType];

    // Mock login response
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            user: {
              id: `${userType}-test-user`,
              username: user.username,
              email: user.email,
              firstName: userType.charAt(0).toUpperCase() + userType.slice(1),
              lastName: 'Test'
            },
            tokens: {
              accessToken: 'fake-jwt-token-for-e2e-test',
              refreshToken: 'fake-refresh-token',
              expiresIn: 3600
            }
          }
        }
      });
    });

    // Navigate and login
    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();
  }
}

/**
 * API mocking utilities for consistent test data
 */
export class ApiMockHelper {
  static async mockSystemMetrics(page: Page): Promise<void> {
    await page.route('**/api/v1/metrics', async route => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            consciousness: 87 + Math.random() * 10,
            quantumCoherence: 95 + Math.random() * 5,
            resonanceHz: 432,
            impactScore: 9000 + Math.random() * 1000,
            seedTokens: 3000 + Math.random() * 500,
            bloomTokens: 500 + Math.random() * 200,
            agentsActive: 70 + Math.floor(Math.random() * 10),
            systemUptime: 99.9 + Math.random() * 0.1
          },
          timestamp: Date.now()
        }
      });
    });
  }

  static async mockOmegaState(page: Page): Promise<void> {
    await page.route('**/api/consciousness/state', async route => {
      await route.fulfill({
        status: 200,
        json: {
          Ω: 0.85 + Math.random() * 0.1,
          health_status: 'optimal',
          autonomy: 0.9 + Math.random() * 0.05,
          cooperation: 0.88 + Math.random() * 0.07,
          ethics: 0.92 + Math.random() * 0.06,
          temporal_coherence: 0.89 + Math.random() * 0.08,
          timestamp: Date.now(),
          is_ihsan_coherent: Math.random() > 0.1
        }
      });
    });
  }

  static async mockUserConfig(page: Page): Promise<void> {
    await page.route('**/api/v1/config', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              version: '2.2.0',
              installPath: 'C:\\Program Files\\BIZRA',
              privacyLevel: 'high',
              theme: 'operational',
              firstName: 'Test',
              lastName: 'User',
              email: 'test@biza.test'
            },
            timestamp: Date.now()
          }
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          json: { success: true, message: 'Settings saved successfully' }
        });
      }
    });
  }
}

/**
 * Failure reporting and debugging utilities
 */
export class FailureReporter {
  static async captureFailureArtifacts(page: Page, testInfo: TestInfo): Promise<void> {
    console.log(`❌ Test "${testInfo.title}" failed - capturing artifacts...`);

    // Screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('failure-screenshot', {
      body: screenshot,
      contentType: 'image/png'
    });

    // HTML content
    const html = await page.content();
    await testInfo.attach('failure-html', {
      body: html,
      contentType: 'text/html'
    });

    // Console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any pending console messages
    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      await testInfo.attach('console-errors', {
        body: JSON.stringify(consoleErrors, null, 2),
        contentType: 'application/json'
      });
    }

    // Network failures
    const networkFailures: Array<{url: string, method: string, failure: any}> = [];
    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()
      });
    });

    // Wait a bit for any pending network requests
    await page.waitForTimeout(1000);

    if (networkFailures.length > 0) {
      await testInfo.attach('network-failures', {
        body: JSON.stringify(networkFailures, null, 2),
        contentType: 'application/json'
      });
    }

    // Page performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        totalTime: perf.loadEventEnd - perf.fetchStart
      };
    });

    await testInfo.attach('performance-metrics', {
      body: JSON.stringify(performanceMetrics, null, 2),
      contentType: 'application/json'
    });
  }
}

/**
 * Test data management utilities
 */
export class TestDataManager {
  private static testUsers: Map<string, any> = new Map();

  static createTestUser(type: string): any {
    const user = {
      id: `${type}-user-${Date.now()}`,
      email: `${type}@biza.test`,
      username: `${type}user`,
      firstName: type.charAt(0).toUpperCase() + type.slice(1),
      lastName: 'Test',
      password: `${type}Test123!`
    };

    this.testUsers.set(type, user);
    return user;
  }

  static getTestUser(type: string): any {
    return this.testUsers.get(type);
  }

  static cleanupTestUser(type: string): void {
    this.testUsers.delete(type);
  }

  static cleanupAll(): void {
    this.testUsers.clear();
  }
}

// Export convenience functions for common test patterns
export const setupSmokeTest = async (page: Page, testType: 'smoke' | 'health' | 'settings' | 'ws' = 'smoke') => {
  // Setup API mocks
  await ApiMockHelper.mockSystemMetrics(page);
  await ApiMockHelper.mockOmegaState(page);
  await ApiMockHelper.mockUserConfig(page);

  // Login as test user
  await AuthHelper.loginAsTestUser(page, testType);
};

export const verifyDashboardLoaded = async (page: Page) => {
  await page.waitForURL('/dashboard');
  await page.getByTestId('nav-dock').waitFor({ state: 'visible' });
  await page.getByTestId('impact-metrics-container').waitFor({ state: 'visible' });
  await page.getByTestId('agent-command-center').waitFor({ state: 'visible' });
};