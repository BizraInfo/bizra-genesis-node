// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E GLOBAL SETUP                                    ║
// ║  Authentication and environment setup for E2E tests                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if already authenticated (by checking for dashboard redirect)
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/landing')) {
    // Already logged in, save state
    await page.context().storageState({ path: authFile });
    return;
  }

  // For demo/test environment, use demo credentials
  const email = process.env.E2E_TEST_EMAIL || 'demo@bizra.ai';
  const password = process.env.E2E_TEST_PASSWORD || 'demo_password';

  // Fill in credentials if login form exists
  const emailField = page.locator('input[type="email"], input[name="email"]');
  const passwordField = page.locator('input[type="password"], input[name="password"]');
  const submitButton = page.locator('button[type="submit"]');

  if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailField.fill(email);
    await passwordField.fill(password);
    await submitButton.click();

    // Wait for successful login (redirect to dashboard or landing)
    await page.waitForURL(/\/(dashboard|landing|genesis)/, { timeout: 30000 });
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('verify environment', async ({ request }) => {
  // Verify backend is accessible
  const healthCheck = await request.get('/health').catch(() => null);

  if (healthCheck && healthCheck.ok()) {
    console.log('✅ Backend health check passed');
  } else {
    console.log('⚠️ Backend health check failed or not available');
    // Don't fail - frontend-only tests can still run
  }
});
