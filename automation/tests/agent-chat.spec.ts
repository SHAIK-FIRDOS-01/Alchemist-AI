import { test, expect } from '@playwright/test';

test.describe('Agent Chat and Context Inspector Integration', () => {
  test('should connect to WebSocket, send a message, and update context inspector', async ({ page }) => {


    // 1. Navigate to application
    await page.goto('/');

    // 2. Connection Check
    await expect(page.getByText('connected', { exact: true })).toBeVisible({ timeout: 15000 });

    // 3. Send message
    await page.getByPlaceholder('Type your message...').fill('Summarise the Q3 report');
    await page.getByRole('button', { name: 'Send' }).click();

    // 4. Verify agent response (MATCHING EXACT STRING FROM MOCK)
    await expect(page.getByText('Hello, I am the agent.')).toBeVisible({ timeout: 15000 });

    // 5. Verify Context Inspector
    // Verify the empty state is gone
    await expect(page.getByText('Waiting for context snapshots...')).toBeHidden({ timeout: 15000 });

    // Verify specific JSON data exists in the inspector
    await expect(page.getByText('"report": "Q3"')).toBeVisible({ timeout: 15000 });
  });
});