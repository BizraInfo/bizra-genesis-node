import { test, expect } from '@playwright/test';

test.describe('Dashboard Critical Components', () => {
    test.beforeEach(async ({ page }) => {
        // Mock login and navigate to dashboard
        await page.goto('/login');
        await page.route('**/auth/login', async route => {
            await route.fulfill({
                json: {
                    success: true,
                    data: {
                        user: { id: '1', username: 'testuser', email: 'test@example.com' },
                        tokens: { accessToken: 'fake-jwt', refreshToken: 'fake-refresh', expiresIn: 3600 }
                    }
                }
            });
        });
        await page.getByTestId('login-email').fill('test@example.com');
        await page.getByTestId('login-password').fill('password');
        await page.getByTestId('login-submit').click();
        await expect(page).toHaveURL('/dashboard');
    });

    test('should display and interact with NavDock', async ({ page }) => {
        // Scroll to make NavDock visible (it appears after 50px scroll)
        await page.evaluate(() => window.scrollTo(0, 100));

        const navDock = page.getByTestId('nav-dock');
        await expect(navDock).toBeVisible();

        const homeLink = page.getByTestId('nav-item-home');
        const pitchDeckLink = page.getByTestId('nav-item-pitch-deck');

        await expect(homeLink).toBeVisible();
        await expect(pitchDeckLink).toBeVisible();

        // Verify active state logic (mocking scroll or click)
        // Click on Pitch Deck
        await pitchDeckLink.click();
        // Since it's a hash link, it should update URL or scroll
        // For this test, we just verify it's clickable and exists
    });

    test('should display Impact Metrics', async ({ page }) => {
        const container = page.getByTestId('impact-metrics-container');
        await expect(container).toBeVisible();

        const totalCard = page.getByTestId('total-impact-card');
        await expect(totalCard).toBeVisible();
        await expect(totalCard).toContainText('Total Impact Score');

        const value = page.getByTestId('total-impact-value');
        await expect(value).toBeVisible();
    });

    test('should interact with Agent Command Center', async ({ page }) => {
        const commandCenter = page.getByTestId('agent-command-center');
        await expect(commandCenter).toBeVisible();

        // Default view is List
        const listViewBtn = page.getByTestId('view-mode-list');
        await expect(listViewBtn).toHaveClass(/bg-gold-500\/20/); // Active class check

        // Switch to Garden view
        const gardenViewBtn = page.getByTestId('view-mode-garden');
        await gardenViewBtn.click();
        await expect(gardenViewBtn).toHaveClass(/bg-gold-500\/20/);
        await expect(listViewBtn).not.toHaveClass(/bg-gold-500\/20/);

        // Switch to Graph view
        const graphViewBtn = page.getByTestId('view-mode-graph');
        await graphViewBtn.click();
        await expect(graphViewBtn).toHaveClass(/bg-gold-500\/20/);
    });
});
