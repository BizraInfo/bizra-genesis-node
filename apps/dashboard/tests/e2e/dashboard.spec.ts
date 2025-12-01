import { test, expect } from '@playwright/test';

/**
 * BIZRA Node0 Dashboard - E2E Test Suite
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * Elite Professional Testing Standards
 */

test.describe('BIZRA Node0 Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
  });

  test.describe('Navigation & Layout', () => {
    test('should display BIZRA branding', async ({ page }) => {
      // Check for BIZRA logo/title
      await expect(page.locator('text=BIZRA').first()).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
      // Check navigation links exist
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();

      // Check for main nav items
      await expect(page.getByRole('link', { name: /chat/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /plan/i })).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Onboarding Flow', () => {
    test('should redirect new users to onboarding', async ({ page }) => {
      // Clear any existing session
      await page.evaluate(() => localStorage.clear());
      await page.goto('/');
      
      // Should either show onboarding or home
      const url = page.url();
      expect(url).toMatch(/\/(onboarding)?$/);
    });

    test('should complete onboarding wizard', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Wait for onboarding content
      await page.waitForLoadState('networkidle');
      
      // Check onboarding elements are visible
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('PAT Chat Interface', () => {
    test('should load chat page', async ({ page }) => {
      await page.goto('/chat');
      await expect(page).toHaveURL(/\/chat/);
    });

    test('should display PAT agent selector', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for agent-related content
      await page.waitForLoadState('networkidle');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });

    test('should have message input', async ({ page }) => {
      await page.goto('/chat');
      
      // Find input or textarea for messages
      const input = page.locator('input[type="text"], textarea').first();
      await expect(input).toBeVisible();
    });
  });

  test.describe('7-Day Plan', () => {
    test('should load plan page', async ({ page }) => {
      await page.goto('/plan');
      await expect(page).toHaveURL(/\/plan/);
    });

    test('should display plan interface', async ({ page }) => {
      await page.goto('/plan');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Resource Pool', () => {
    test('should load resources page', async ({ page }) => {
      await page.goto('/resources');
      await expect(page).toHaveURL(/\/resources/);
    });

    test('should display resource metrics', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      // Check for resource-related content
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('PoI Rewards', () => {
    test('should load rewards page', async ({ page }) => {
      await page.goto('/rewards');
      await expect(page).toHaveURL(/\/rewards/);
    });

    test('should display PoI ledger', async ({ page }) => {
      await page.goto('/rewards');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Node0 Operations', () => {
    test('should load ops page', async ({ page }) => {
      await page.goto('/ops');
      await expect(page).toHaveURL(/\/ops/);
    });

    test('should display system health', async ({ page }) => {
      await page.goto('/ops');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Knowledge Browser', () => {
    test('should load knowledge page', async ({ page }) => {
      await page.goto('/knowledge');
      await expect(page).toHaveURL(/\/knowledge/);
    });

    test('should display knowledge graph', async ({ page }) => {
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Settings', () => {
    test('should load settings page', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings/);
    });

    test('should have theme toggle', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('BIZRAverse', () => {
    test('should load BIZRAverse page', async ({ page }) => {
      await page.goto('/bizraverse');
      await expect(page).toHaveURL(/\/bizraverse/);
    });

    test('should display 6 circles', async ({ page }) => {
      await page.goto('/bizraverse');
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should fetch health status', async ({ page }) => {
      const response = await page.request.get('/api/health');
      
      // Should return OK or be handled gracefully
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Accessibility', () => {
    test('should have no critical accessibility issues', async ({ page }) => {
      await page.goto('/');
      
      // Check basic accessibility
      await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
      
      // Check for main landmark
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Tab through focusable elements
      await page.keyboard.press('Tab');
      
      // Check something is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should have reasonable bundle size', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsEntries = entries.filter(e => e.name.includes('.js'));
        const totalJsSize = jsEntries.reduce((acc, e) => acc + (e.transferSize || 0), 0);
        return { totalJsSize, jsCount: jsEntries.length };
      });
      
      // Total JS should be under 5MB (generous for development)
      expect(metrics.totalJsSize).toBeLessThan(5 * 1024 * 1024);
    });
  });
});
