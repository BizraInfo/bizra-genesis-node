// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - E2E TEST FIXTURES                                   ║
// ║  Reusable test fixtures and page objects                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { test as base, expect, Page, Locator } from '@playwright/test';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// Page Object Models
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Landing Page Object Model
 */
export class LandingPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly ctaButton: Locator;
  readonly navLinks: Locator;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('[data-testid="hero-title"], h1').first();
    this.ctaButton = page.locator('[data-testid="cta-button"], .cta-button').first();
    this.navLinks = page.locator('nav a, [data-testid="nav-link"]');
    this.canvas = page.locator('canvas');
  }

  async goto() {
    await this.page.goto('/landing');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForCanvasLoad() {
    // Wait for 3D canvas to be ready
    await this.canvas.waitFor({ state: 'visible', timeout: 30000 });
  }

  async hasCanvas3D(): Promise<boolean> {
    return await this.canvas.isVisible().catch(() => false);
  }
}

/**
 * Dashboard Page Object Model
 */
export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly mainContent: Locator;
  readonly metricsPanel: Locator;
  readonly agentCards: Locator;
  readonly searchInput: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"], aside, nav.sidebar');
    this.mainContent = page.locator('[data-testid="main-content"], main');
    this.metricsPanel = page.locator('[data-testid="metrics-panel"], .metrics');
    this.agentCards = page.locator('[data-testid="agent-card"], .agent-card');
    this.searchInput = page.locator('[data-testid="search"], input[type="search"]');
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async getAgentCount(): Promise<number> {
    return await this.agentCards.count();
  }

  async selectAgent(agentName: string) {
    await this.agentCards.filter({ hasText: agentName }).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }
}

/**
 * Authentication Page Object Model
 */
export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error"], .error-message, [role="alert"]');
    this.forgotPasswordLink = page.locator('a[href*="forgot"], [data-testid="forgot-password"]');
    this.registerLink = page.locator('a[href*="register"], [data-testid="register-link"]');
  }

  async goto() {
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  async getErrorText(): Promise<string> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }
}

/**
 * Settings Page Object Model
 */
export class SettingsPage {
  readonly page: Page;
  readonly profileSection: Locator;
  readonly securitySection: Locator;
  readonly notificationsSection: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileSection = page.locator('[data-testid="profile-settings"], #profile');
    this.securitySection = page.locator('[data-testid="security-settings"], #security');
    this.notificationsSection = page.locator('[data-testid="notifications-settings"], #notifications');
    this.saveButton = page.locator('button:has-text("Save"), [data-testid="save-btn"]');
    this.cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-btn"]');
  }

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async save() {
    await this.saveButton.click();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Custom Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════

type TestFixtures = {
  landingPage: LandingPage;
  dashboardPage: DashboardPage;
  authPage: AuthPage;
  settingsPage: SettingsPage;
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  landingPage: async ({ page }, use) => {
    const landingPage = new LandingPage(page);
    await use(landingPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../.auth/user.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wait for API response with optional validation
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { status?: number; timeout?: number }
) {
  const { status, timeout = 30000 } = options || {};

  const response = await page.waitForResponse(
    (response) => {
      const urlMatch = typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url());

      const statusMatch = status ? response.status() === status : true;

      return urlMatch && statusMatch;
    },
    { timeout }
  );

  return response;
}

/**
 * Mock API endpoint
 */
export async function mockApiEndpoint(
  page: Page,
  url: string,
  response: { status?: number; body?: unknown; headers?: Record<string, string> }
) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      headers: response.headers,
      body: JSON.stringify(response.body || {}),
    });
  });
}

/**
 * Take visual snapshot
 */
export async function takeSnapshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
  });
}

/**
 * Check accessibility
 */
export async function checkAccessibility(page: Page, options?: { includedImpacts?: string[] }) {
  // This would integrate with @axe-core/playwright
  // For now, we'll do basic checks
  const accessibilityIssues: string[] = [];

  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    accessibilityIssues.push(`${imagesWithoutAlt} images missing alt text`);
  }

  // Check for buttons without accessible names
  const buttonsWithoutLabels = await page.locator('button:not([aria-label]):not(:has-text(*))').count();
  if (buttonsWithoutLabels > 0) {
    accessibilityIssues.push(`${buttonsWithoutLabels} buttons without accessible names`);
  }

  // Check for form inputs without labels
  const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([id])').count();
  if (inputsWithoutLabels > 0) {
    accessibilityIssues.push(`${inputsWithoutLabels} inputs without associated labels`);
  }

  return {
    passed: accessibilityIssues.length === 0,
    issues: accessibilityIssues,
  };
}

/**
 * Wait for animations to complete
 */
export async function waitForAnimations(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      document.getAnimations().map((animation) => animation.finished)
    );
  });
}

/**
 * Simulate network conditions
 */
export async function simulateNetworkConditions(
  page: Page,
  profile: 'slow3g' | 'fast3g' | 'offline'
) {
  const cdp = await page.context().newCDPSession(page);

  const profiles = {
    slow3g: {
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
      latency: 400,
    },
    fast3g: {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    },
    offline: {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    },
  };

  await cdp.send('Network.emulateNetworkConditions', profiles[profile]);
}

/**
 * Generate test data
 */
export const testData = {
  users: {
    valid: {
      email: 'test@bizra.ai',
      password: 'SecurePass123!',
      name: 'Test User',
    },
    invalid: {
      email: 'invalid-email',
      password: '123', // Too short
      name: '',
    },
  },
  agents: {
    planner: { id: 'planner-001', name: 'Strategic Planner', role: 'Planner' },
    researcher: { id: 'researcher-001', name: 'Research Assistant', role: 'Researcher' },
    coder: { id: 'coder-001', name: 'Code Generator', role: 'Coder' },
  },
  messages: {
    simple: 'Hello, this is a test message',
    complex: 'Create a comprehensive project plan including timeline, resources, and milestones',
    unicode: 'مرحبا 你好 こんにちは 🌍',
  },
};
