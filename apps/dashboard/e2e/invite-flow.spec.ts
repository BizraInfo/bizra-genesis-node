// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E INVITE FLOW TEST                               ║
// ║  End-to-end Playwright tests for Alpha-100 invite acceptance journey    ║
// ║  Tests: validate → form fill → submit → success → dashboard redirect    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_INVITE_CODE = 'TEST-CODE-1234';
const TEST_EMAIL = 'alpha@bizra.ai';
const TEST_PASSWORD = 'SecureP@ssw0rd!';
const TEST_FULL_NAME = 'Alpha Tester';

// Mock responses
const MOCK_VALID_INVITE = {
    valid: true,
    status: 'sent',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: 'Welcome to the Alpha-100 program!'
};

const MOCK_EXPIRED_INVITE = {
    valid: false,
    status: 'expired',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: null
};

const MOCK_ACCEPTED_INVITE = {
    valid: false,
    status: 'accepted',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: null
};

const MOCK_NOT_FOUND_INVITE = {
    valid: false,
    status: 'not_found',
    expires_at: new Date().toISOString(),
    email: '',
    inviter_notes: null
};

const MOCK_ACCEPT_SUCCESS = {
    success: true,
    user_id: 'usr_test123',
    email: TEST_EMAIL,
    access_token: 'fake-jwt-token',
    expires_in: 2592000 // 30 days
};

// Helper: Setup API mocks for invite validation
async function mockValidateInvite(page: Page, response: object, status = 200) {
    await page.route('**/invite/*/validate', async route => {
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(response)
        });
    });
}

// Helper: Setup API mocks for invite acceptance
async function mockAcceptInvite(page: Page, response: object, status = 201) {
    await page.route('**/invite/*/accept', async route => {
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(response)
        });
    });
}

test.describe('Invite Code Entry Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/invite');
    });

    test('should display invite code entry form', async ({ page }) => {
        // Page should have title and description
        await expect(page.getByRole('heading', { name: /enter.*invite.*code/i })).toBeVisible();
        
        // Should have input field for code
        const codeInput = page.getByPlaceholder(/enter.*code/i);
        await expect(codeInput).toBeVisible();
        
        // Should have submit button
        const submitButton = page.getByRole('button', { name: /continue|verify|submit/i });
        await expect(submitButton).toBeVisible();
    });

    test('should validate empty code submission', async ({ page }) => {
        // Try to submit without entering code
        const submitButton = page.getByRole('button', { name: /continue|verify|submit/i });
        await submitButton.click();
        
        // Should show validation error
        await expect(page.getByText(/required|enter.*code|invalid/i)).toBeVisible();
    });

    test('should redirect to dynamic invite page with valid format', async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        
        const codeInput = page.getByPlaceholder(/enter.*code/i);
        await codeInput.fill(TEST_INVITE_CODE);
        
        const submitButton = page.getByRole('button', { name: /continue|verify|submit/i });
        await submitButton.click();
        
        // Should redirect to /invite/[code] page
        await expect(page).toHaveURL(new RegExp(`/invite/${TEST_INVITE_CODE}`));
    });
});

test.describe('Invite Acceptance Page - Valid Invite', () => {
    test.beforeEach(async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
    });

    test('should display registration form for valid invite', async ({ page }) => {
        // Wait for validation to complete
        await expect(page.getByRole('heading', { name: /welcome|alpha|genesis/i })).toBeVisible();
        
        // Email should be pre-filled and disabled (from invite)
        const emailInput = page.getByLabel(/email/i);
        await expect(emailInput).toHaveValue(TEST_EMAIL);
        await expect(emailInput).toBeDisabled();
        
        // Full name field should be visible
        await expect(page.getByLabel(/full.*name|name/i)).toBeVisible();
        
        // Password fields should be visible
        await expect(page.getByLabel(/^password$/i)).toBeVisible();
        await expect(page.getByLabel(/confirm.*password/i)).toBeVisible();
        
        // Submit button should be visible
        await expect(page.getByRole('button', { name: /create.*account|join|register/i })).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
        const passwordInput = page.getByLabel(/^password$/i);
        
        // Weak password
        await passwordInput.fill('weak');
        await expect(page.getByText(/weak|too.*short/i)).toBeVisible();
        
        // Strong password
        await passwordInput.fill(TEST_PASSWORD);
        await expect(page.getByText(/strong|excellent|good/i)).toBeVisible();
    });

    test('should validate password match', async ({ page }) => {
        const passwordInput = page.getByLabel(/^password$/i);
        const confirmInput = page.getByLabel(/confirm.*password/i);
        
        await passwordInput.fill(TEST_PASSWORD);
        await confirmInput.fill('DifferentPassword!');
        
        // Blur to trigger validation
        await confirmInput.blur();
        
        // Should show mismatch error
        await expect(page.getByText(/match|same/i)).toBeVisible();
    });

    test('should successfully accept invite and create account', async ({ page }) => {
        await mockAcceptInvite(page, MOCK_ACCEPT_SUCCESS);
        
        // Fill the form
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        // Submit
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show success state
        await expect(page.getByText(/success|welcome|account.*created/i)).toBeVisible();
        
        // Should redirect to dashboard after short delay
        await page.waitForURL(/dashboard/, { timeout: 10000 });
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should show inviter notes when present', async ({ page }) => {
        // Inviter notes should be visible
        await expect(page.getByText(/Welcome to the Alpha-100 program/i)).toBeVisible();
    });
});

test.describe('Invite Acceptance Page - Invalid States', () => {
    test('should show error for expired invite', async ({ page }) => {
        await mockValidateInvite(page, MOCK_EXPIRED_INVITE);
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Should show expired message
        await expect(page.getByText(/expired/i)).toBeVisible();
        
        // Registration form should NOT be visible
        await expect(page.getByLabel(/^password$/i)).not.toBeVisible();
        
        // Should have link to request new invite
        await expect(page.getByRole('link', { name: /request.*new|contact|support/i })).toBeVisible();
    });

    test('should show error for already accepted invite', async ({ page }) => {
        await mockValidateInvite(page, MOCK_ACCEPTED_INVITE);
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Should show already used message
        await expect(page.getByText(/already.*used|accepted|registered/i)).toBeVisible();
        
        // Should have link to login
        await expect(page.getByRole('link', { name: /login|sign.*in/i })).toBeVisible();
    });

    test('should show error for invalid invite code', async ({ page }) => {
        await mockValidateInvite(page, MOCK_NOT_FOUND_INVITE);
        await page.goto('/invite/INVALID-CODE');
        
        // Should show invalid code message
        await expect(page.getByText(/invalid|not.*found|doesn't.*exist/i)).toBeVisible();
        
        // Should have link to enter different code
        await expect(page.getByRole('link', { name: /try.*again|different.*code|back/i })).toBeVisible();
    });

    test('should handle API error gracefully', async ({ page }) => {
        await page.route('**/invite/*/validate', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' })
            });
        });
        
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Should show error state
        await expect(page.getByText(/error|failed|try.*again/i)).toBeVisible();
        
        // Should have retry option
        await expect(page.getByRole('button', { name: /retry|try.*again/i })).toBeVisible();
    });
});

test.describe('Invite Acceptance - Form Validation', () => {
    test.beforeEach(async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
    });

    test('should require full name', async ({ page }) => {
        // Fill password but not name
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show name required error
        await expect(page.getByText(/name.*required|enter.*name/i)).toBeVisible();
    });

    test('should require minimum password length', async ({ page }) => {
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill('short');
        await page.getByLabel(/confirm.*password/i).fill('short');
        
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show password length error
        await expect(page.getByText(/8.*characters|too.*short|minimum/i)).toBeVisible();
    });

    test('should handle acceptance API error', async ({ page }) => {
        await page.route('**/invite/*/accept', async route => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Email does not match invite',
                    code: 'EMAIL_MISMATCH'
                })
            });
        });
        
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show API error
        await expect(page.getByText(/error|failed|email.*mismatch/i)).toBeVisible();
    });

    test('should handle user already exists error', async ({ page }) => {
        await page.route('**/invite/*/accept', async route => {
            await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'User account already exists',
                    code: 'USER_EXISTS'
                })
            });
        });
        
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show conflict error with login link
        await expect(page.getByText(/already.*exists|account.*exists/i)).toBeVisible();
        await expect(page.getByRole('link', { name: /login|sign.*in/i })).toBeVisible();
    });
});

test.describe('Invite Flow - Loading States', () => {
    test('should show loading state during validation', async ({ page }) => {
        // Add delay to mock
        await page.route('**/invite/*/validate', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_VALID_INVITE)
            });
        });
        
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Should show loading indicator
        await expect(page.getByText(/verifying|loading|checking/i)).toBeVisible();
    });

    test('should show submitting state during account creation', async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        
        // Add delay to accept mock
        await page.route('**/invite/*/accept', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_ACCEPT_SUCCESS)
            });
        });
        
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Fill form
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        // Submit
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Should show submitting state
        await expect(page.getByText(/creating|submitting|please.*wait/i)).toBeVisible();
        
        // Button should be disabled during submission
        await expect(page.getByRole('button', { name: /create.*account|join|register/i })).toBeDisabled();
    });
});

test.describe('Invite Flow - Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
    });

    test('should have proper form labels', async ({ page }) => {
        // All inputs should have associated labels
        const emailLabel = page.getByLabel(/email/i);
        await expect(emailLabel).toBeVisible();
        
        const nameLabel = page.getByLabel(/full.*name|name/i);
        await expect(nameLabel).toBeVisible();
        
        const passwordLabel = page.getByLabel(/^password$/i);
        await expect(passwordLabel).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
        // Tab through form elements
        await page.keyboard.press('Tab');
        const nameInput = page.getByLabel(/full.*name|name/i);
        await expect(nameInput).toBeFocused();
        
        await page.keyboard.press('Tab');
        const passwordInput = page.getByLabel(/^password$/i);
        await expect(passwordInput).toBeFocused();
    });

    test('should announce errors to screen readers', async ({ page }) => {
        // Submit empty form
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Error messages should have proper role
        const errorMessage = page.getByRole('alert');
        await expect(errorMessage).toBeVisible();
    });
});

test.describe('Invite Flow - Complete Journey', () => {
    test('should complete full invite acceptance flow', async ({ page }) => {
        // Step 1: Enter code on entry page
        await page.goto('/invite');
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        
        const codeInput = page.getByPlaceholder(/enter.*code/i);
        await codeInput.fill(TEST_INVITE_CODE);
        await page.getByRole('button', { name: /continue|verify|submit/i }).click();
        
        // Step 2: Should be on acceptance page
        await expect(page).toHaveURL(new RegExp(`/invite/${TEST_INVITE_CODE}`));
        
        // Step 3: Fill registration form
        await mockAcceptInvite(page, MOCK_ACCEPT_SUCCESS);
        
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        
        // Step 4: Submit and verify success
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Step 5: Should show success and redirect
        await expect(page.getByText(/success|welcome|account.*created/i)).toBeVisible();
        
        // Step 6: Verify redirect to dashboard
        await page.waitForURL(/dashboard/, { timeout: 10000 });
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should persist JWT token after successful registration', async ({ page }) => {
        await mockValidateInvite(page, MOCK_VALID_INVITE);
        await mockAcceptInvite(page, MOCK_ACCEPT_SUCCESS);
        
        await page.goto(`/invite/${TEST_INVITE_CODE}`);
        
        // Complete registration
        await page.getByLabel(/full.*name|name/i).fill(TEST_FULL_NAME);
        await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
        await page.getByLabel(/confirm.*password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /create.*account|join|register/i }).click();
        
        // Wait for success
        await expect(page.getByText(/success|welcome|account.*created/i)).toBeVisible();
        
        // Verify token is stored (localStorage or cookie)
        const token = await page.evaluate(() => {
            return localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   localStorage.getItem('jwt');
        });
        
        expect(token).toBeTruthy();
    });
});
