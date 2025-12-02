import { test, expect } from '@playwright/test';

/**
 * BIZRA Genesis Node - Landing Page E2E Tests
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * Tests the hero/landing page experience:
 * - Visual rendering
 * - Navigation
 * - Starfield animation
 * - Call-to-action functionality
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section with sovereignty message', async ({ page }) => {
    // Check main headline
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/reclaim|sovereignty|mind/i);
    
    // Check subheadline/manifesto
    await expect(page.locator('text=/AI.*sovereign|local.*AI/i')).toBeVisible();
  });

  test('should have functional CTA button', async ({ page }) => {
    const ctaButton = page.getByRole('button', { name: /begin|start|genesis|join/i });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toBeEnabled();
    
    // Click and verify navigation
    await ctaButton.click();
    await expect(page).toHaveURL(/onboarding|signup|genesis/);
  });

  test('should render starfield background', async ({ page }) => {
    // Check for canvas element (Three.js renders to canvas)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify canvas has dimensions
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(100);
    expect(boundingBox?.height).toBeGreaterThan(100);
  });

  test('should display feature grid', async ({ page }) => {
    // Check for feature cards
    const features = page.locator('[data-testid="feature-card"], .feature-card');
    
    // Should have multiple features displayed
    await expect(features).toHaveCount({ min: 3 });
  });

  test('should have accessible navigation', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
    
    // Check for logo
    const logo = page.locator('a[href="/"], img[alt*="BIZRA"], [data-testid="logo"]');
    await expect(logo).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Hero should still be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // CTA should be accessible
    const ctaButton = page.getByRole('button', { name: /begin|start|genesis|join/i });
    await expect(ctaButton).toBeVisible();
  });

  test('should pass basic accessibility checks', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check for image alt texts
    const images = page.locator('img:not([alt])');
    await expect(images).toHaveCount(0);
    
    // Check for button accessibility
    const buttons = page.locator('button');
    for (const button of await buttons.all()) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should load within performance budget', async ({ page }) => {
    const timing = await page.evaluate(() => {
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        domComplete: performance.timing.domComplete - performance.timing.navigationStart,
      };
    });
    
    // FCP should be under 2.5s (our elite target is 1.8s)
    expect(timing.fcp).toBeLessThan(2500);
    
    // DOM complete should be under 5s
    expect(timing.domComplete).toBeLessThan(5000);
  });
});
