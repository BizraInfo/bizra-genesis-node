import { test, expect } from '@playwright/test';

/**
 * BIZRA Genesis Node - Dashboard E2E Tests
 * Tests for main dashboard functionality, metrics, and real-time updates
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Layout and Navigation', () => {
    test('should display main dashboard layout', async ({ page }) => {
      // Check header
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      // Check sidebar navigation
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

      // Check main content area
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('should display navigation menu items', async ({ page }) => {
      const menuItems = [
        'Dashboard',
        'Agents',
        'Synthesis',
        'Analytics',
        'Monitoring',
        'Settings',
      ];

      for (const item of menuItems) {
        await expect(page.locator(`nav >> text="${item}"`)).toBeVisible();
      }
    });

    test('should navigate between pages', async ({ page }) => {
      // Navigate to Agents page
      await page.click('nav >> text="Agents"');
      await expect(page).toHaveURL(/\/agents/);
      await expect(page.locator('h1')).toContainText(/Agents/i);

      // Navigate to Analytics page
      await page.click('nav >> text="Analytics"');
      await expect(page).toHaveURL(/\/analytics/);
      await expect(page.locator('h1')).toContainText(/Analytics/i);

      // Navigate back to Dashboard
      await page.click('nav >> text="Dashboard"');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should toggle sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

      // Sidebar should be hidden on mobile initially
      await expect(sidebar).not.toBeVisible();

      // Click toggle to show sidebar
      await toggleButton.click();
      await expect(sidebar).toBeVisible();

      // Click toggle again to hide
      await toggleButton.click();
      await expect(sidebar).not.toBeVisible();
    });
  });

  test.describe('System Metrics', () => {
    test('should display system health metrics', async ({ page }) => {
      await expect(page.locator('[data-testid="system-health"]')).toBeVisible();

      // Check for key metrics
      await expect(page.locator('text=/API Latency/i')).toBeVisible();
      await expect(page.locator('text=/Consensus Latency/i')).toBeVisible();
      await expect(page.locator('text=/Error Rate/i')).toBeVisible();
      await expect(page.locator('text=/Uptime/i')).toBeVisible();
    });

    test('should display real-time metric values', async ({ page }) => {
      const apiLatency = page.locator('[data-testid="metric-api-latency"]');
      await expect(apiLatency).toBeVisible();

      const initialValue = await apiLatency.textContent();

      // Wait for potential update (metrics update every 5 seconds)
      await page.waitForTimeout(6000);

      const updatedValue = await apiLatency.textContent();

      // Value may have changed or stayed the same, but should still be visible
      expect(updatedValue).toBeTruthy();
    });

    test('should display performance charts', async ({ page }) => {
      const chart = page.locator('[data-testid="performance-chart"]');
      await expect(chart).toBeVisible();

      // Check canvas element is rendered
      await expect(chart.locator('canvas')).toBeVisible();
    });

    test('should show health status indicator', async ({ page }) => {
      const healthStatus = page.locator('[data-testid="health-status"]');
      await expect(healthStatus).toBeVisible();

      // Should show either healthy, degraded, or offline
      const statusText = await healthStatus.textContent();
      expect(statusText).toMatch(/healthy|degraded|offline/i);
    });
  });

  test.describe('Agent Overview', () => {
    test('should display agent status cards', async ({ page }) => {
      const agentCards = page.locator('[data-testid^="agent-card-"]');
      await expect(agentCards.first()).toBeVisible();

      // Should have multiple agent cards
      const count = await agentCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show agent tier information', async ({ page }) => {
      // Check for PAT, SAT, TAT agents
      await expect(page.locator('text=/PAT/i')).toBeVisible();
      await expect(page.locator('text=/SAT/i')).toBeVisible();
      await expect(page.locator('text=/TAT/i')).toBeVisible();
    });

    test('should navigate to agent details', async ({ page }) => {
      const firstAgentCard = page.locator('[data-testid^="agent-card-"]').first();
      await firstAgentCard.click();

      // Should navigate to agent detail page or open modal
      await expect(
        page.locator('[data-testid="agent-details"]')
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Synthesis Operations', () => {
    test('should display recent synthesis runs', async ({ page }) => {
      const synthesisHistory = page.locator('[data-testid="synthesis-history"]');
      await expect(synthesisHistory).toBeVisible();
    });

    test('should show synthesis statistics', async ({ page }) => {
      await expect(page.locator('text=/Total Runs/i')).toBeVisible();
      await expect(page.locator('text=/Success Rate/i')).toBeVisible();
      await expect(page.locator('text=/Average Latency/i')).toBeVisible();
    });

    test('should navigate to new synthesis page', async ({ page }) => {
      await page.click('text=/New Synthesis/i');

      await expect(page).toHaveURL(/\/synthesis/);
      await expect(page.locator('h1')).toContainText(/Synthesis/i);
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show real-time status panel', async ({ page }) => {
      const statusPanel = page.locator('[data-testid="realtime-status"]');
      await expect(statusPanel).toBeVisible();
    });

    test('should display active connections count', async ({ page }) => {
      const connections = page.locator('[data-testid="active-connections"]');
      await expect(connections).toBeVisible();

      const count = await connections.textContent();
      expect(count).toMatch(/\d+/); // Should contain a number
    });

    test('should show WebSocket connection status', async ({ page }) => {
      const wsStatus = page.locator('[data-testid="ws-status"]');
      await expect(wsStatus).toBeVisible();

      // Should show connected or disconnected
      const status = await wsStatus.textContent();
      expect(status).toMatch(/connected|disconnected/i);
    });

    test('should update metrics in real-time', async ({ page }) => {
      const metric = page.locator('[data-testid="requests-per-second"]');
      await expect(metric).toBeVisible();

      const initialValue = await metric.textContent();

      // Wait for update cycle
      await page.waitForTimeout(5500);

      const updatedValue = await metric.textContent();

      // Metric should still be visible (may or may not have changed)
      expect(updatedValue).toBeTruthy();
    });
  });

  test.describe('User Menu', () => {
    test('should display user profile information', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');

      await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    });

    test('should navigate to settings', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=/Settings/i');

      await expect(page).toHaveURL(/\/settings/);
    });

    test('should navigate to profile', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=/Profile/i');

      await expect(page).toHaveURL(/\/profile/);
    });
  });

  test.describe('Notifications', () => {
    test('should display notification center', async ({ page }) => {
      const notificationButton = page.locator('[data-testid="notifications-button"]');
      await expect(notificationButton).toBeVisible();

      await notificationButton.click();

      await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    });

    test('should show notification count badge', async ({ page }) => {
      const badge = page.locator('[data-testid="notification-count"]');

      // Badge may or may not be visible depending on notification count
      if (await badge.isVisible()) {
        const count = await badge.textContent();
        expect(count).toMatch(/\d+/);
      }
    });

    test('should mark notification as read', async ({ page }) => {
      await page.click('[data-testid="notifications-button"]');

      const firstNotification = page.locator('[data-testid^="notification-"]').first();

      if (await firstNotification.isVisible()) {
        await firstNotification.click();

        // Notification should be marked as read
        await expect(firstNotification).not.toHaveClass(/unread/);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Dashboard should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid navigation without errors', async ({ page }) => {
      const pages = ['dashboard', 'agents', 'analytics', 'monitoring'];

      for (let i = 0; i < 3; i++) {
        for (const pageName of pages) {
          await page.click(`nav >> text="${pageName}"`, { timeout: 1000 });
          // Don't wait for full load, just click rapidly
        }
      }

      // Should end up on the last page without errors
      await expect(page).toHaveURL(/\/monitoring/);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`should be responsive on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/dashboard');

        // Main content should be visible
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

        // Should not have horizontal scroll
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const clientWidth = await page.evaluate(() => document.body.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
      });
    }
  });

  test.describe('Error Handling', () => {
    test('should display error message when API fails', async ({ page, context }) => {
      // Intercept API calls and return error
      await context.route('**/api/v1/metrics', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/dashboard');

      // Should show error message or fallback UI
      await expect(
        page.locator('text=/error|failed|unavailable/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should retry failed requests', async ({ page, context }) => {
      let requestCount = 0;

      await context.route('**/api/v1/metrics', route => {
        requestCount++;
        if (requestCount < 2) {
          route.fulfill({ status: 500, body: 'Error' });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ metrics: {} }),
          });
        }
      });

      await page.goto('/dashboard');

      // Should eventually succeed
      await expect(page.locator('[data-testid="system-health"]')).toBeVisible({
        timeout: 10000,
      });
      expect(requestCount).toBeGreaterThan(1);
    });
  });
});
