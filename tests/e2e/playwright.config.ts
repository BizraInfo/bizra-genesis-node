import { defineConfig, devices } from '@playwright/test';

/**
 * BIZRA Genesis Node - Playwright E2E Testing Configuration
 * Enterprise-grade end-to-end testing setup
 */

export default defineConfig({
  testDir: './',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Test match patterns
  testMatch: /.*\.spec\.ts/,

  // Folder for test artifacts
  outputDir: 'test-results/',

  // Web server configuration
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
        cwd: '../../apps/dashboard',
      },

  // Project configurations for different browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // WebKit (Safari)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile Safari
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Unauthenticated tests
    {
      name: 'unauthenticated',
      testMatch: /.*\.unauth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
