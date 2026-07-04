import { test, expect } from '@playwright/test';

test.describe('Agent Chat and Context Inspector Integration', () => {
  test('should connect to WebSocket, send a message, and update context inspector', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('/');

    // 2. Wait for the connection to be established
    await expect(page.getByText('connected', { exact: true })).toBeVisible({ timeout: 15000 });

    // 3. Send a message to the agent
    const messageInput = page.getByPlaceholder('Type your message...');
    await messageInput.fill('Hello! Can you summarize the current state?');
    await page.getByRole('button', { name: 'Send' }).click();

    // 4. Verify agent response
    // The agent messages use `justify-start` while user messages use `justify-end`
    const agentMessageBubble = page.locator('.justify-start').first();
    await expect(agentMessageBubble).toBeVisible({ timeout: 30000 });

    // 5. Verify Context Inspector updates
    // The empty state should disappear once the agent responds and updates context
    await expect(page.getByText('Waiting for context snapshots...')).toBeHidden({ timeout: 30000 });
  });
});