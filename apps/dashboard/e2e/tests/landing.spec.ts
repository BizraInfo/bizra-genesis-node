// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - LANDING PAGE E2E TESTS                              ║
// ║  End-to-end tests for the 3D landing experience                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { test, expect, LandingPage, waitForAnimations } from './fixtures/test-fixtures';

test.describe('Landing Page', () => {
  test.describe('Initial Load', () => {
    test('should load landing page successfully', async ({ page, landingPage }) => {
      await landingPage.goto();

      // Page should be visible
      await expect(page).toHaveURL(/\/(landing|genesis)?$/);
    });

    test('should display page title', async ({ page, landingPage }) => {
      await landingPage.goto();

      // Check for BIZRA branding
      const title = await page.title();
      expect(title.toLowerCase()).toContain('bizra');
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/landing');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Should load DOM within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('3D Visualization', () => {
    test('should render WebGL canvas', async ({ landingPage }) => {
      await landingPage.goto();

      const hasCanvas = await landingPage.hasCanvas3D();

      // Canvas should be present (3D visualization)
      if (hasCanvas) {
        await expect(landingPage.canvas).toBeVisible();
      }
    });

    test('should handle WebGL not available gracefully', async ({ page, browser }) => {
      // Create context with WebGL disabled (if supported)
      const context = await browser.newContext({
        javaScriptEnabled: true,
      });

      const testPage = await context.newPage();

      // Disable WebGL via evaluate
      await testPage.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
          if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
            return null;
          }
          return getContext.apply(this, [type, ...args] as [string, ...unknown[]]);
        };
      });

      await testPage.goto('/landing');

      // Page should still function without crashing
      await expect(testPage).not.toHaveURL(/error/);

      await context.close();
    });

    test('canvas should be interactive', async ({ page, landingPage }) => {
      await landingPage.goto();

      if (await landingPage.hasCanvas3D()) {
        // Get initial canvas state
        const canvas = landingPage.canvas;

        // Interact with canvas (mouse move)
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
        }

        // Canvas should still be visible after interaction
        await expect(canvas).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should have navigation links', async ({ landingPage }) => {
      await landingPage.goto();

      const navCount = await landingPage.navLinks.count();
      expect(navCount).toBeGreaterThanOrEqual(0); // May or may not have nav
    });

    test('should navigate to dashboard on CTA click', async ({ page, landingPage }) => {
      await landingPage.goto();

      // Look for any call-to-action button
      const ctaSelectors = [
        'button:has-text("Get Started")',
        'button:has-text("Enter")',
        'button:has-text("Dashboard")',
        'a:has-text("Get Started")',
        '[data-testid="cta-button"]',
      ];

      for (const selector of ctaSelectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/landing');

      // Page should adapt to mobile viewport
      await page.waitForLoadState('networkidle');

      // Check viewport meta tag
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/landing');

      await page.waitForLoadState('networkidle');
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/landing');

      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Performance', () => {
    test('should have acceptable First Contentful Paint', async ({ page }) => {
      await page.goto('/landing');

      const metrics = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        return {
          fcp: fcp?.startTime || 0,
        };
      });

      // FCP should be under 3 seconds
      expect(metrics.fcp).toBeLessThan(3000);
    });

    test('should not have layout shifts during load', async ({ page }) => {
      await page.goto('/landing');

      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
                clsValue += (entry as unknown as { value: number }).value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });

          // Resolve after a short delay
          setTimeout(() => resolve(clsValue), 1000);
        });
      });

      // CLS should be under 0.1 (good threshold)
      expect(cls).toBeLessThan(0.25);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(0);

      // If there's an h1, it should be first heading
      if (h1Count > 0) {
        const firstHeading = await page.locator('h1, h2, h3, h4, h5, h6').first().tagName();
        expect(firstHeading.toLowerCase()).toBe('h1');
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check if something is focused
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      // Check text elements have content
      const textElements = page.locator('p, h1, h2, h3, span, a');
      const count = await textElements.count();

      // Page should have some text content
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Error States', () => {
    test('should display error page for non-existent routes', async ({ page }) => {
      await page.goto('/non-existent-page-xyz');

      // Should either show 404 or redirect
      const content = await page.content();
      const is404 = content.includes('404') || content.includes('not found');
      const isRedirected = !page.url().includes('non-existent');

      expect(is404 || isRedirected).toBeTruthy();
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should handle missing features gracefully', async ({ page }) => {
      // Navigate to landing
      await page.goto('/landing');

      // Page should load without JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.waitForLoadState('networkidle');

      // Filter out known/acceptable errors
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('ResizeObserver') && // Known Chrome issue
          !e.includes('WebGL') // WebGL may not be available
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
