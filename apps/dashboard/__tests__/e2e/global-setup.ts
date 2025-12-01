/**
 * BIZRA Node0 - Playwright Global Setup
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Runs before all E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 BIZRA Node0 E2E Test Suite');
  console.log(`📍 Testing against: ${baseURL}`);
  console.log('⏳ Starting global setup...\n');

  // Wait for the server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 30;
  while (retries > 0) {
    try {
      await page.goto(baseURL!, { timeout: 5000 });
      console.log('✅ Server is ready\n');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error(`Server at ${baseURL} is not responding`);
      }
      console.log(`⏳ Waiting for server... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Optional: Create test user/data
  // await setupTestData(page);

  await browser.close();

  console.log('✅ Global setup complete\n');
}

export default globalSetup;
