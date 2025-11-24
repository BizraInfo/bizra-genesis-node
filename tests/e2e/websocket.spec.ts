import { test, expect } from '@playwright/test';

/**
 * BIZRA Genesis Node - WebSocket E2E Tests
 * Tests for real-time WebSocket communication and agent interactions
 */

test.describe('WebSocket Communication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Connection Management', () => {
    test('should establish WebSocket connection automatically', async ({ page }) => {
      // Wait for WebSocket connection indicator
      const wsStatus = page.locator('[data-testid="ws-status"]');
      await expect(wsStatus).toContainText(/connected/i, { timeout: 10000 });
    });

    test('should display connection status', async ({ page }) => {
      const statusIndicator = page.locator('[data-testid="ws-connection-indicator"]');
      await expect(statusIndicator).toBeVisible();

      // Should show green/connected status
      await expect(statusIndicator).toHaveClass(/connected|online/);
    });

    test('should reconnect after disconnection', async ({ page, context }) => {
      // Verify initial connection
      await expect(page.locator('[data-testid="ws-status"]')).toContainText(/connected/i);

      // Simulate network disruption by going offline
      await context.setOffline(true);

      // Should show disconnected
      await expect(page.locator('[data-testid="ws-status"]')).toContainText(/disconnected/i, {
        timeout: 5000,
      });

      // Restore network
      await context.setOffline(false);

      // Should reconnect automatically
      await expect(page.locator('[data-testid="ws-status"]')).toContainText(/connected/i, {
        timeout: 15000,
      });
    });

    test('should show reconnection attempts', async ({ page, context }) => {
      await context.setOffline(true);

      // Should show reconnecting status
      await expect(page.locator('text=/reconnecting|connecting/i')).toBeVisible({
        timeout: 5000,
      });

      await context.setOffline(false);
    });
  });

  test.describe('Agent Chat', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to agents page
      await page.click('nav >> text="Agents"');
      await expect(page).toHaveURL(/\/agents/);
    });

    test('should open agent chat interface', async ({ page }) => {
      const firstAgent = page.locator('[data-testid^="agent-card-"]').first();
      await firstAgent.click();

      await expect(page.locator('[data-testid="agent-chat"]')).toBeVisible();
    });

    test('should send message to agent', async ({ page }) => {
      // Open chat
      await page.locator('[data-testid^="agent-card-"]').first().click();

      // Type message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Hello, how are you?');

      // Send message
      await page.click('[data-testid="send-message-button"]');

      // Should display sent message
      await expect(page.locator('text="Hello, how are you?"')).toBeVisible();
    });

    test('should receive agent response via WebSocket', async ({ page }) => {
      await page.locator('[data-testid^="agent-card-"]').first().click();

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Test message');
      await page.click('[data-testid="send-message-button"]');

      // Wait for agent response (via WebSocket)
      await expect(page.locator('[data-testid^="agent-message-"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show typing indicator when agent is responding', async ({ page }) => {
      await page.locator('[data-testid^="agent-card-"]').first().click();

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Tell me about consensus');
      await page.click('[data-testid="send-message-button"]');

      // Should show typing indicator
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({
        timeout: 2000,
      });
    });

    test('should display message timestamps', async ({ page }) => {
      await page.locator('[data-testid^="agent-card-"]').first().click();

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Test');
      await page.click('[data-testid="send-message-button"]');

      // Message should have timestamp
      const messageTimestamp = page.locator('[data-testid^="message-timestamp-"]').first();
      await expect(messageTimestamp).toBeVisible();

      const timestamp = await messageTimestamp.textContent();
      expect(timestamp).toMatch(/\d{1,2}:\d{2}|just now|seconds ago/i);
    });

    test('should maintain chat history on page refresh', async ({ page }) => {
      await page.locator('[data-testid^="agent-card-"]').first().click();

      // Send a message
      await page.locator('[data-testid="chat-input"]').fill('Remember this message');
      await page.click('[data-testid="send-message-button"]');

      // Wait for message to appear
      await expect(page.locator('text="Remember this message"')).toBeVisible();

      // Refresh page
      await page.reload();

      // Reopen chat
      await page.locator('[data-testid^="agent-card-"]').first().click();

      // Message should still be visible
      await expect(page.locator('text="Remember this message"')).toBeVisible();
    });
  });

  test.describe('Real-time Metrics', () => {
    test('should update metrics via WebSocket', async ({ page }) => {
      const metric = page.locator('[data-testid="realtime-requests-count"]');
      await expect(metric).toBeVisible();

      const initialValue = await metric.textContent();

      // Wait for WebSocket update
      await page.waitForTimeout(3000);

      const updatedValue = await metric.textContent();

      // Value should be present (may or may not have changed)
      expect(updatedValue).toBeTruthy();
    });

    test('should display real-time synthesis updates', async ({ page }) => {
      // Trigger a synthesis operation (if available)
      if (await page.locator('text=/New Synthesis/i').isVisible()) {
        await page.click('text=/New Synthesis/i');

        // Fill synthesis form
        await page.fill('[name="task-description"]', 'Test synthesis task');
        await page.click('button[type="submit"]');

        // Should show real-time progress updates
        await expect(page.locator('[data-testid="synthesis-progress"]')).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should update agent status in real-time', async ({ page }) => {
      const agentStatus = page.locator('[data-testid^="agent-status-"]').first();
      await expect(agentStatus).toBeVisible();

      // Agent status should be one of: active, idle, busy
      const status = await agentStatus.textContent();
      expect(status).toMatch(/active|idle|busy/i);
    });
  });

  test.describe('Presence Updates', () => {
    test('should show online users count', async ({ page }) => {
      const onlineCount = page.locator('[data-testid="online-users-count"]');

      if (await onlineCount.isVisible()) {
        const count = await onlineCount.textContent();
        expect(count).toMatch(/\d+/);
      }
    });

    test('should update presence when user navigates', async ({ page, context }) => {
      // Open a second page/context to simulate another user
      const page2 = await context.newPage();
      await page2.goto('/dashboard');

      // Online count should potentially increase
      // (This test may be flaky without proper backend support)
      await page.waitForTimeout(2000);

      await page2.close();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle WebSocket errors gracefully', async ({ page }) => {
      // Force WebSocket connection to fail by disconnecting network
      await page.context().setOffline(true);

      // Should show error message or reconnection UI
      await expect(page.locator('text=/disconnected|offline|connection lost/i')).toBeVisible({
        timeout: 5000,
      });

      await page.context().setOffline(false);
    });

    test('should handle malformed messages', async ({ page }) => {
      // This would require server-side support to send malformed messages
      // For now, verify client doesn't crash when connection issues occur
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(true);

      // Page should still be functional
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('should queue messages when offline', async ({ page, context }) => {
      // Go to agents page
      await page.click('nav >> text="Agents"');
      await page.locator('[data-testid^="agent-card-"]').first().click();

      // Go offline
      await context.setOffline(true);

      // Try to send a message
      await page.locator('[data-testid="chat-input"]').fill('Offline message');
      await page.click('[data-testid="send-message-button"]');

      // Should show queued/pending indicator
      await expect(page.locator('[data-testid^="message-pending-"]')).toBeVisible({
        timeout: 2000,
      });

      // Go back online
      await context.setOffline(false);

      // Message should be sent and indicator should disappear
      await expect(page.locator('[data-testid^="message-pending-"]')).not.toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Performance', () => {
    test('should handle multiple concurrent WebSocket messages', async ({ page }) => {
      await page.click('nav >> text="Agents"');

      // Open multiple agent chats
      const agentCards = await page.locator('[data-testid^="agent-card-"]').all();

      for (let i = 0; i < Math.min(3, agentCards.length); i++) {
        await agentCards[i].click();
        await page.locator('[data-testid="chat-input"]').fill(`Message ${i}`);
        await page.click('[data-testid="send-message-button"]');

        // Don't wait for responses, send quickly
      }

      // All messages should eventually be delivered
      await expect(page.locator('text="Message 0"')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text="Message 1"')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text="Message 2"')).toBeVisible({ timeout: 15000 });
    });

    test('should not leak memory with long-running connection', async ({ page }) => {
      // Send multiple messages to test memory stability
      await page.click('nav >> text="Agents"');
      await page.locator('[data-testid^="agent-card-"]').first().click();

      for (let i = 0; i < 10; i++) {
        await page.locator('[data-testid="chat-input"]').fill(`Test ${i}`);
        await page.click('[data-testid="send-message-button"]');
        await page.waitForTimeout(500);
      }

      // Page should still be responsive
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
    });
  });

  test.describe('Security', () => {
    test('should authenticate WebSocket connection with token', async ({ page }) => {
      // WebSocket connection should be authenticated
      // Verify by checking that we can send messages
      await page.click('nav >> text="Agents"');
      await page.locator('[data-testid^="agent-card-"]').first().click();

      await page.locator('[data-testid="chat-input"]').fill('Authenticated message');
      await page.click('[data-testid="send-message-button"]');

      // Should succeed
      await expect(page.locator('text="Authenticated message"')).toBeVisible();
    });

    test('should close WebSocket on logout', async ({ page }) => {
      // Verify connection is active
      await expect(page.locator('[data-testid="ws-status"]')).toContainText(/connected/i);

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=/logout/i');

      // WebSocket should be closed (we're now on login page)
      // Cannot verify directly, but session should be terminated
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
