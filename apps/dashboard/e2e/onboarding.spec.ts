import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));

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

        // Mock me response
        await page.route('**/auth/me', async route => {
            const json = {
                success: true,
                data: {
                    id: '1',
                    username: 'testuser',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'user'
                }
            };
            await route.fulfill({ json });
        });

        // Login first
        console.log('Navigating to login...');
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        console.log('Filling email...');
        await page.getByPlaceholder('Email').fill('test@example.com');

        console.log('Filling password...');
        await page.getByPlaceholder('Password').fill('password123');

        console.log('Clicking submit...');
        const submitButton = page.getByRole('button', { name: 'Sign In' });
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        console.log('Waiting for dashboard redirect...');
        await expect(page).toHaveURL('/dashboard');

        console.log('Navigating to onboarding...');
        await page.goto('/onboarding');
    });

    test('should complete the 3-step onboarding wizard', async ({ page }) => {
        try {
            // Step 1: Welcome
            try {
                await expect(page.getByText('Welcome, Initiate.')).toBeVisible({ timeout: 5000 });
            } catch (e) {
                if (await page.getByText('Verifying Access').isVisible()) {
                    console.log('TEST FAILURE: Stuck in loading state (Verifying Access)');
                }
                if (await page.getByText('Sign in to your account').isVisible()) {
                    console.log('TEST FAILURE: Redirected to login page');
                }
                if (await page.getByText('Welcome back').isVisible()) {
                    console.log('TEST FAILURE: On login page (Welcome back)');
                }
                console.log('Current URL:', page.url());
                throw e;
            }

            await expect(page.getByText('Welcome to Genesis')).toBeVisible(); // Sidebar
            await page.getByRole('button', { name: 'Continue' }).click();

            // Step 2: Profile
            await expect(page.getByText('Profile Configuration')).toBeVisible();
            await page.fill('input[placeholder="e.g. Developer, Designer, Manager"]', 'Agent Engineer');
            await page.selectOption('select[title="Experience Level"]', 'expert');
            await page.getByRole('button', { name: 'Continue' }).click();

            // Step 3: Tour
            await expect(page.getByText('System Tour')).toBeVisible();
            await expect(page.getByText('Command Center')).toBeVisible();
            await page.getByRole('button', { name: 'Enter Dashboard' }).click();

            // Verify Redirect
            await expect(page).toHaveURL('/dashboard');
        } catch (e) {
            console.log('Test failed. Page content:');
            // console.log(await page.content()); // Commented out to avoid huge logs
            throw e;
        }
    });
});
