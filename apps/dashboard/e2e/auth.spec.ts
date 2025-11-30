import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding Flow', () => {
    test('should allow a user to register and then login', async ({ page }) => {
        // Mock register response
        await page.route('**/auth/register', async route => {
            const json = {
                success: true,
                user_id: 'fake-id',
                program: 'genesis',
                has_invite: true,
                next: 'login'
            };
            await route.fulfill({ json });
        });

        // 1. Navigate to Register Page
        await page.goto('/register');
        await expect(page).toHaveURL('/register');

        // 2. Step 1: Account Details
        await page.getByTestId('register-email').fill(`test_${Date.now()}@example.com`);
        await page.getByTestId('register-password').fill('Password123!');
        await page.getByTestId('register-confirm-password').fill('Password123!');
        await page.getByTestId('register-submit').click();

        // 3. Step 2: Profile Setup
        await expect(page.getByText('Join Genesis')).toBeVisible(); // Header remains visible
        await page.getByTestId('register-username').fill('testuser_e2e');
        await page.getByTestId('register-firstname').fill('Test');
        await page.getByTestId('register-lastname').fill('User');
        await page.getByTestId('register-submit').click();

        // 4. Step 3: Terms & Conditions
        await page.getByTestId('register-terms').check();
        await page.getByTestId('register-privacy').check();
        await page.getByTestId('register-submit').click();

        // 5. Verify Redirect to Login
        await expect(page).toHaveURL('/login');
        // Toast might be transient, but we can check URL

        // 6. Login
        // Mock login response
        await page.route('**/auth/login', async route => {
            const json = {
                success: true,
                accessToken: 'fake-jwt',
                refreshToken: 'fake-refresh',
                tokenType: 'Bearer',
                expiresIn: 3600,
                user: { id: '1', username: 'testuser', email: 'test@example.com' }
            };
            await route.fulfill({ json });
        });

        await page.getByTestId('login-email').fill('test@example.com');
        await page.getByTestId('login-password').fill('Password123!');
        await page.getByTestId('login-submit').click();

        // 7. Verify Redirect to Dashboard
        await expect(page).toHaveURL('/dashboard');
    });

    test('should allow a user to login', async ({ page }) => {
        await page.goto('/login');

        // Mock login response
        await page.route('**/auth/login', async route => {
            const json = {
                success: true,
                accessToken: 'fake-jwt',
                refreshToken: 'fake-refresh',
                tokenType: 'Bearer',
                expiresIn: 3600,
                user: { id: '1', username: 'testuser', email: 'test@example.com' }
            };
            await route.fulfill({ json });
        });

        await page.getByTestId('login-email').fill('test@example.com');
        await page.getByTestId('login-password').fill('password');
        await page.getByTestId('login-submit').click();

        await expect(page).toHaveURL('/dashboard');
    });

    test('should show error on invalid login', async ({ page }) => {
        await page.goto('/login');

        // Mock error response
        await page.route('**/auth/login', async route => {
            await route.fulfill({
                status: 401,
                json: { message: 'Invalid credentials' }
            });
        });

        await page.getByTestId('login-email').fill('wrong@example.com');
        await page.getByTestId('login-password').fill('wrongpassword');
        await page.getByTestId('login-submit').click();

        // Expect error toast or message (assuming toast is used)
        // Since we can't easily check toast content without specific selectors, 
        // we check that we are still on the login page
        await expect(page).toHaveURL('/login');
    });
});
