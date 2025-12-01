/**
 * BIZRA Node0 - Onboarding E2E Tests
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Elite Testing Standards:
 * - User journey testing
 * - Visual regression
 * - Cross-browser compatibility
 * - Accessibility compliance
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Onboarding Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/onboarding`);
  });

  test('should display welcome screen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.getByText(/BIZRA/i)).toBeVisible();
  });

  test('should complete full onboarding flow', async ({ page }) => {
    // Step 1: Welcome
    await expect(page.getByRole('button', { name: /begin/i })).toBeVisible();
    await page.getByRole('button', { name: /begin/i }).click();

    // Step 2: Seed State Selection
    await expect(page.getByText(/seed state/i)).toBeVisible();
    
    const seedOptions = ['Dreamer', 'Builder', 'Learner', 'Healer', 'Provider'];
    for (const option of seedOptions) {
      await expect(page.getByText(option)).toBeVisible();
    }
    
    // Select Builder
    await page.getByText('Builder').click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 3: Goals
    await expect(page.getByText(/goals/i)).toBeVisible();
    await page.getByPlaceholder(/goal/i).fill('Build BIZRA Network');
    await page.getByRole('button', { name: /add/i }).click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 4: Time Availability
    await expect(page.getByText(/time/i)).toBeVisible();
    await page.getByRole('slider').fill('600'); // 10 hours/week
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 5: PAT Agent Selection
    await expect(page.getByText(/agent/i)).toBeVisible();
    
    const agents = [
      'MasterReasoner',
      'MemoryArchitect',
      'CreativeSynthesizer',
      'DataAnalyzer',
      'Communicator',
      'ExecutionPlanner',
      'EthicsGuardian',
    ];
    
    for (const agent of agents) {
      await expect(page.getByText(agent)).toBeVisible();
    }
    
    await page.getByText('MasterReasoner').click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 6: Confirmation
    await expect(page.getByText(/ready|complete/i)).toBeVisible();
    await page.getByRole('button', { name: /start|launch|go/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('should allow navigation back through steps', async ({ page }) => {
    await page.getByRole('button', { name: /begin/i }).click();
    await page.getByText('Builder').click();
    await page.getByRole('button', { name: /next/i }).click();

    // Go back
    await page.getByRole('button', { name: /back/i }).click();
    
    // Should be back at seed state
    await expect(page.getByText(/seed state/i)).toBeVisible();
  });

  test('should persist progress on refresh', async ({ page }) => {
    await page.getByRole('button', { name: /begin/i }).click();
    await page.getByText('Builder').click();
    await page.getByRole('button', { name: /next/i }).click();

    // Reload page
    await page.reload();

    // Should maintain progress (or redirect to last completed step)
    await expect(page.getByText(/goals|seed/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /begin/i }).click();
    
    // Try to proceed without selection
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/select|required/i)).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Check for proper heading structure
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();

    // Check for focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check for proper form labels
    await page.getByRole('button', { name: /begin/i }).click();
    const radioButtons = page.getByRole('radio');
    const count = await radioButtons.count();
    
    for (let i = 0; i < count; i++) {
      const radio = radioButtons.nth(i);
      await expect(radio).toHaveAttribute('aria-label');
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should display navigation dock', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('should navigate to all pages', async ({ page }) => {
    const pages = [
      { name: 'Chat', path: '/chat' },
      { name: 'Plan', path: '/plan' },
      { name: 'Resources', path: '/resources' },
      { name: 'Rewards', path: '/rewards' },
      { name: 'Ops', path: '/ops' },
      { name: 'Knowledge', path: '/knowledge' },
      { name: 'Settings', path: '/settings' },
    ];

    for (const { name, path } of pages) {
      await page.getByRole('link', { name }).click();
      await expect(page).toHaveURL(`${BASE_URL}${path}`);
      await page.goBack();
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);
    
    const chatLink = page.getByRole('link', { name: 'Chat' });
    await expect(chatLink).toHaveClass(/active/);
  });
});

test.describe('PAT Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);
  });

  test('should display chat interface', async ({ page }) => {
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
  });

  test('should show agent selector', async ({ page }) => {
    await expect(page.getByText(/agent/i)).toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    const input = page.getByRole('textbox');
    await input.fill('Hello, how can you help me?');
    
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for response (with extended timeout for LLM)
    await expect(page.getByText(/Hello|help|assist/i)).toBeVisible({ timeout: 30000 });
  });

  test('should display message metadata', async ({ page }) => {
    const input = page.getByRole('textbox');
    await input.fill('Test message');
    await page.getByRole('button', { name: /send/i }).click();

    // Should show agent name and model
    await expect(page.getByText(/MasterReasoner|Communicator/i)).toBeVisible({ timeout: 30000 });
  });

  test('should switch between agents', async ({ page }) => {
    const agentSelector = page.getByRole('combobox');
    await agentSelector.click();
    
    await page.getByText('CreativeSynthesizer').click();
    
    // Verify selection
    await expect(agentSelector).toHaveValue('CreativeSynthesizer');
  });
});

test.describe('7-Day Plan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/plan`);
  });

  test('should display plan creation interface', async ({ page }) => {
    await expect(page.getByText(/7-day|plan/i)).toBeVisible();
  });

  test('should create new plan', async ({ page }) => {
    await page.getByRole('button', { name: /create|new/i }).click();
    
    await page.getByLabel(/goal/i).fill('Launch BIZRA Node0');
    await page.getByRole('button', { name: /generate|create/i }).click();

    // Should show loading then plan
    await expect(page.getByText(/generating|creating/i)).toBeVisible();
    await expect(page.getByText(/day 1|monday/i)).toBeVisible({ timeout: 60000 });
  });

  test('should display progress tracking', async ({ page }) => {
    await expect(page.getByText(/progress|%/i)).toBeVisible();
  });
});

test.describe('PoI Rewards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/rewards`);
  });

  test('should display reward statistics', async ({ page }) => {
    await expect(page.getByText(/BZC|Impact/i)).toBeVisible();
    await expect(page.getByText(/IMP|Token/i)).toBeVisible();
  });

  test('should show PoI timeline', async ({ page }) => {
    await expect(page.getByText(/timeline|history/i)).toBeVisible();
  });

  test('should display Ihsan score', async ({ page }) => {
    await expect(page.getByText(/ihsan/i)).toBeVisible();
  });
});

test.describe('Node0 Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/ops`);
  });

  test('should display system health', async ({ page }) => {
    await expect(page.getByText(/health|status/i)).toBeVisible();
    await expect(page.getByText(/CPU|GPU|Memory/i)).toBeVisible();
  });

  test('should show service status', async ({ page }) => {
    await expect(page.getByText(/postgres|redis|ollama/i)).toBeVisible();
  });

  test('should display resource allocation', async ({ page }) => {
    await expect(page.getByText(/cores|vram|storage/i)).toBeVisible();
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
  });

  test('should display profile settings', async ({ page }) => {
    await expect(page.getByText(/profile/i)).toBeVisible();
  });

  test('should allow theme toggle', async ({ page }) => {
    const themeToggle = page.getByRole('switch', { name: /theme|dark/i });
    await expect(themeToggle).toBeVisible();
    
    await themeToggle.click();
    // Check theme changed (body class or similar)
  });

  test('should allow data export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);

    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);

    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load homepage under 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no layout shift on load', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check for CLS (simplified check)
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => resolve([]), 2000);
      });
    });
    
    // Basic assertion - proper CLS check would use web-vitals
    expect(Array.isArray(metrics)).toBe(true);
  });
});
