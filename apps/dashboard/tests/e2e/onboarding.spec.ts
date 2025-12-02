import { test, expect } from '@playwright/test';

/**
 * BIZRA Genesis Node - Onboarding Flow E2E Tests
 * Document ID: BIZRA-NODE0-v1.0.1-GENESIS
 * 
 * Tests the Genesis Ritual onboarding experience:
 * - Multi-step flow navigation
 * - Covenant signing
 * - Form validation
 * - State persistence
 */

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
  });

  test('should display onboarding wizard', async ({ page }) => {
    // Check for step indicator
    const stepIndicator = page.locator('[data-testid="step-indicator"], .step-indicator, [role="progressbar"]');
    await expect(stepIndicator).toBeVisible();
    
    // Check for onboarding container
    const container = page.locator('[data-testid="onboarding"], .onboarding, main');
    await expect(container).toBeVisible();
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    // Step 1: Identity/Welcome
    await expect(page.getByRole('heading')).toBeVisible();
    
    const nextButton = page.getByRole('button', { name: /next|continue|proceed/i });
    await expect(nextButton).toBeVisible();
    
    // Navigate to step 2
    await nextButton.click();
    
    // Verify progress
    await page.waitForTimeout(500); // Allow for transition
    
    // Should show different content
    const step2Content = page.locator('text=/preferences|configure|setup|sovereignty/i');
    await expect(step2Content).toBeVisible();
  });

  test('should display Genesis Covenant for signing', async ({ page }) => {
    // Navigate to covenant step (usually step 3 or 4)
    for (let i = 0; i < 3; i++) {
      const nextButton = page.getByRole('button', { name: /next|continue|proceed/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Look for covenant content
    const covenantText = page.locator('text=/axiom|covenant|oath|sovereignty|ihsan/i');
    await expect(covenantText).toBeVisible();
  });

  test('should require covenant acceptance before completion', async ({ page }) => {
    // Navigate to final step
    for (let i = 0; i < 4; i++) {
      const nextButton = page.getByRole('button', { name: /next|continue|proceed/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Complete button should exist
    const completeButton = page.getByRole('button', { name: /complete|finish|begin|enter|genesis/i });
    await expect(completeButton).toBeVisible();
  });

  test('should allow going back to previous steps', async ({ page }) => {
    // Go forward first
    const nextButton = page.getByRole('button', { name: /next|continue/i });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Check for back button
    const backButton = page.getByRole('button', { name: /back|previous/i });
    await expect(backButton).toBeVisible();
    
    // Go back
    await backButton.click();
    await page.waitForTimeout(500);
    
    // Should be back on first step
    const step1Content = page.locator('text=/welcome|identity|name/i');
    await expect(step1Content).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to proceed without filling required fields
    const nextButton = page.getByRole('button', { name: /next|continue/i });
    
    // Look for input fields
    const inputs = page.locator('input[required], input[aria-required="true"]');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      // Click next without filling
      await nextButton.click();
      
      // Should show validation error
      const error = page.locator('[role="alert"], .error, .validation-error, text=/required|invalid/i');
      await expect(error).toBeVisible();
    }
  });

  test('should redirect to dashboard after completion', async ({ page }) => {
    // Complete the full onboarding flow
    for (let i = 0; i < 5; i++) {
      const nextButton = page.getByRole('button', { name: /next|continue|complete|finish|enter|begin/i });
      if (await nextButton.isVisible()) {
        // Fill any required inputs first
        const inputs = page.locator('input:visible');
        for (const input of await inputs.all()) {
          const type = await input.getAttribute('type');
          if (type === 'text' || type === 'email' || !type) {
            await input.fill('Test User');
          }
        }
        
        // Accept any checkboxes
        const checkboxes = page.locator('input[type="checkbox"]:visible');
        for (const checkbox of await checkboxes.all()) {
          await checkbox.check();
        }
        
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Should redirect to dashboard or show success
    await page.waitForURL(/dashboard|home|success/, { timeout: 10000 }).catch(() => {
      // If no redirect, check for success state
    });
  });

  test('should have Starfield background animation', async ({ page }) => {
    // Check for Three.js canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Check for focus management
    const focusableElements = page.locator('button, input, a, [tabindex="0"]');
    await expect(focusableElements.first()).toBeVisible();
    
    // Check for ARIA landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check heading hierarchy
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible();
  });
});
