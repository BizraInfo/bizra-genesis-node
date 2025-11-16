import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * BIZRA Genesis Node - Authentication Setup for E2E Tests
 * This runs once before all tests to authenticate and save the session
 */

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate', async ({ page, request }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page).toHaveTitle(/BIZRA/);

  // Fill in login credentials
  await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
  await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123!');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for successful authentication and redirect
  await page.waitForURL('**/dashboard');

  // Verify we're logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });

  console.log('✅ Authentication successful - session saved');
});

setup('verify API health', async ({ request }) => {
  // Verify API is accessible
  const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:3000/api/v1';

  const response = await request.get(`${apiBaseUrl}/health`);
  expect(response.ok()).toBeTruthy();

  const health = await response.json();
  expect(health.status).toBe('healthy');

  console.log('✅ API health check passed');
});
