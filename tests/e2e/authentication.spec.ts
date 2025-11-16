import { test, expect } from '@playwright/test';

/**
 * BIZRA Genesis Node - Authentication E2E Tests
 * Tests for login, registration, logout, and password reset flows
 */

test.describe('Authentication Flow', () => {
  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('h1')).toContainText(/login/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/valid email/i')).toBeVisible();
    });

    test('should show validation errors for short password', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'short');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/at least 8 characters/i')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('[aria-label*="password"]').first();

      await expect(passwordInput).toHaveAttribute('type', 'password');

      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL('**/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);

      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid credentials/i')).toBeVisible({ timeout: 5000 });
    });

    test('should remember user when "Remember Me" is checked', async ({ page, context }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123!');
      await page.check('input[name="rememberMe"]');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/dashboard');

      // Check that refresh token is stored
      const cookies = await context.cookies();
      const hasRefreshToken = cookies.some(c => c.name === 'bizra_refresh_token');
      expect(hasRefreshToken).toBeTruthy();
    });
  });

  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      await expect(page.locator('h1')).toContainText(/sign up|register/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="name"]', 'New User');
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/password.*strong/i')).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', 'StrongPassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
    });

    test('should register successfully with valid data', async ({ page }) => {
      await page.goto('/register');

      const timestamp = Date.now();
      await page.fill('input[name="email"]', `test${timestamp}@example.com`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should redirect to onboarding or dashboard
      await page.waitForURL(/\/(dashboard|onboarding)/);
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      await page.goto('/dashboard');

      // Click user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('text=/logout/i');

      // Should redirect to login
      await page.waitForURL('**/login');
      await expect(page).toHaveURL(/\/login/);

      // Should not be able to access protected routes
      await page.goto('/dashboard');
      await page.waitForURL('**/login');
    });

    test('should clear authentication tokens on logout', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Get cookies before logout
      const cookiesBefore = await context.cookies();

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=/logout/i');
      await page.waitForURL('**/login');

      // Check that auth tokens are cleared
      const cookiesAfter = await context.cookies();
      const hasAccessToken = cookiesAfter.some(c => c.name === 'bizra_access_token');
      const hasRefreshToken = cookiesAfter.some(c => c.name === 'bizra_refresh_token');

      expect(hasAccessToken).toBeFalsy();
      expect(hasRefreshToken).toBeFalsy();
    });
  });

  test.describe('Password Reset', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(page.locator('h1')).toContainText(/forgot password/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should send password reset email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/reset link sent/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      await page.goto('/dashboard');

      // Verify we're authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Refresh page
      await page.reload();

      // Should still be authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should redirect to login when session expires', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Clear all cookies to simulate expired session
      await context.clearCookies();

      // Try to navigate to protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL('**/login');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
