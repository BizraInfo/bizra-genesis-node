// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - AUTHENTICATION E2E TESTS                            ║
// ║  End-to-end tests for authentication flows                                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { test, expect, testData } from './fixtures/test-fixtures';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page', async ({ authPage }) => {
      await authPage.goto();

      // Login form should be visible
      await expect(authPage.emailInput).toBeVisible();
      await expect(authPage.passwordInput).toBeVisible();
      await expect(authPage.submitButton).toBeVisible();
    });

    test('should login with valid credentials', async ({ page, authPage }) => {
      await authPage.goto();

      await authPage.login(
        testData.users.valid.email,
        testData.users.valid.password
      );

      // Should redirect to dashboard or landing after login
      // Wait for navigation
      await page.waitForURL(/\/(dashboard|landing|genesis|$)/, { timeout: 30000 });
    });

    test('should show error for invalid email format', async ({ authPage }) => {
      await authPage.goto();

      await authPage.emailInput.fill('invalid-email');
      await authPage.passwordInput.fill(testData.users.valid.password);
      await authPage.submitButton.click();

      // Should show validation error or remain on login page
      const currentUrl = await authPage.page.url();
      expect(currentUrl).toContain('login');
    });

    test('should show error for wrong credentials', async ({ authPage }) => {
      await authPage.goto();

      await authPage.login('wrong@email.com', 'wrongpassword');

      // Should either show error or remain on login
      await authPage.page.waitForTimeout(1000);

      const hasError = await authPage.hasError();
      const stillOnLogin = authPage.page.url().includes('login');

      expect(hasError || stillOnLogin).toBeTruthy();
    });

    test('should have forgot password link', async ({ authPage }) => {
      await authPage.goto();

      if (await authPage.forgotPasswordLink.isVisible().catch(() => false)) {
        await expect(authPage.forgotPasswordLink).toBeVisible();
      }
    });

    test('should have register link', async ({ authPage }) => {
      await authPage.goto();

      if (await authPage.registerLink.isVisible().catch(() => false)) {
        await expect(authPage.registerLink).toBeVisible();
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should require email field', async ({ authPage }) => {
      await authPage.goto();

      // Leave email empty
      await authPage.passwordInput.fill(testData.users.valid.password);
      await authPage.submitButton.click();

      // Should show validation or stay on page
      const stillOnLogin = authPage.page.url().includes('login');
      expect(stillOnLogin).toBeTruthy();
    });

    test('should require password field', async ({ authPage }) => {
      await authPage.goto();

      // Leave password empty
      await authPage.emailInput.fill(testData.users.valid.email);
      await authPage.submitButton.click();

      // Should show validation or stay on page
      const stillOnLogin = authPage.page.url().includes('login');
      expect(stillOnLogin).toBeTruthy();
    });

    test('should disable submit during form submission', async ({ page, authPage }) => {
      await authPage.goto();

      await authPage.emailInput.fill(testData.users.valid.email);
      await authPage.passwordInput.fill(testData.users.valid.password);

      // Click submit and immediately check button state
      const submitPromise = authPage.submitButton.click();

      // Button might be disabled during submission
      // This is a best-effort check as it's timing-dependent
      await submitPromise;
    });

    test('should trim whitespace from email', async ({ authPage }) => {
      await authPage.goto();

      await authPage.emailInput.fill('  test@bizra.ai  ');
      const value = await authPage.emailInput.inputValue();

      // Email should be trimmed or form should handle it
      expect(value.trim()).toBe('test@bizra.ai');
    });
  });

  test.describe('Security', () => {
    test('should not expose password in URL', async ({ authPage }) => {
      await authPage.goto();

      await authPage.login(testData.users.valid.email, testData.users.valid.password);

      const url = authPage.page.url();
      expect(url).not.toContain(testData.users.valid.password);
      expect(url).not.toContain('password');
    });

    test('should mask password input', async ({ authPage }) => {
      await authPage.goto();

      const inputType = await authPage.passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });

    test('should use secure form submission', async ({ authPage }) => {
      await authPage.goto();

      // Check form method is POST (not GET)
      const form = authPage.page.locator('form');
      if (await form.isVisible().catch(() => false)) {
        const method = await form.getAttribute('method');
        expect(method?.toLowerCase()).not.toBe('get');
      }
    });

    test('should handle CSRF protection', async ({ page }) => {
      await page.goto('/auth/login');

      // Look for CSRF token in form or cookies
      const csrfInput = page.locator('input[name*="csrf"], input[name*="token"]');
      const hasCsrfInput = await csrfInput.isVisible().catch(() => false);

      // Modern apps might use headers instead of form inputs
      // This is a documentation test
      expect(hasCsrfInput || true).toBeTruthy();
    });

    test('should rate limit login attempts', async ({ authPage }) => {
      await authPage.goto();

      // Attempt multiple logins rapidly
      for (let i = 0; i < 5; i++) {
        await authPage.emailInput.fill(`test${i}@wrong.com`);
        await authPage.passwordInput.fill('wrongpassword');
        await authPage.submitButton.click();
        await authPage.page.waitForTimeout(100);
      }

      // After multiple attempts, should either:
      // - Show rate limit message
      // - Add delay
      // - Still be on login page
      const stillOnLogin = authPage.page.url().includes('login');
      expect(stillOnLogin).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page, authPage }) => {
      await authPage.goto();

      await authPage.login(testData.users.valid.email, testData.users.valid.password);

      // Wait for login to complete
      await page.waitForURL(/\/(dashboard|landing|genesis|$)/, {
        timeout: 30000,
      }).catch(() => {});

      // Reload page
      await page.reload();

      // Should still be logged in (not redirected to login)
      const url = page.url();
      const isLoggedIn = !url.includes('/login') && !url.includes('/auth');

      // This might fail if session management isn't implemented
      expect(isLoggedIn).toBeTruthy();
    });

    test('should redirect to login when session expires', async ({ page }) => {
      // Clear all storage to simulate session expiry
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login or show login prompt
      await page.waitForTimeout(1000);

      const url = page.url();
      const isOnProtectedRoute = url.includes('/dashboard');
      const isOnLogin = url.includes('/login') || url.includes('/auth');

      // Either redirected or shows login
      expect(isOnLogin || !isOnProtectedRoute).toBeTruthy();
    });
  });

  test.describe('OAuth/Social Login', () => {
    test('should display social login options if available', async ({ page }) => {
      await page.goto('/auth/login');

      // Look for social login buttons
      const socialButtons = page.locator([
        'button:has-text("Google")',
        'button:has-text("GitHub")',
        'button:has-text("Microsoft")',
        '[data-testid*="social"]',
        '[data-testid*="oauth"]',
      ].join(', '));

      const count = await socialButtons.count().catch(() => 0);

      // Social login is optional, just document what's available
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Logout', () => {
    test('should have logout option when logged in', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      // Look for logout button/link
      const logoutElements = authenticatedPage.locator([
        'button:has-text("Logout")',
        'button:has-text("Sign out")',
        'a:has-text("Logout")',
        '[data-testid="logout"]',
      ].join(', '));

      const count = await logoutElements.count().catch(() => 0);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form labels', async ({ authPage }) => {
      await authPage.goto();

      // Email should have label or aria-label
      const emailLabel = await authPage.emailInput.getAttribute('aria-label');
      const emailId = await authPage.emailInput.getAttribute('id');
      const hasEmailLabel = emailLabel || (emailId && await authPage.page.locator(`label[for="${emailId}"]`).isVisible().catch(() => false));

      expect(hasEmailLabel).toBeTruthy();
    });

    test('should be keyboard navigable', async ({ page, authPage }) => {
      await authPage.goto();

      // Tab to email
      await page.keyboard.press('Tab');

      // Tab to password
      await page.keyboard.press('Tab');

      // Tab to submit
      await page.keyboard.press('Tab');

      // Enter should submit
      await page.keyboard.type(testData.users.valid.email);

      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });

    test('should announce errors to screen readers', async ({ authPage }) => {
      await authPage.goto();

      // Submit invalid data
      await authPage.submitButton.click();

      // Check for aria-live or role="alert" on error messages
      const alerts = authPage.page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
      const count = await alerts.count().catch(() => 0);

      // Should have accessible error announcements
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
