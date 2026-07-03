import { test, expect } from '@playwright/test';

test.describe('Agent Chat and Context Inspector Integration', () => {
  test('should connect to WebSocket, send a message, and update context inspector', async ({ page }) => {
    // 1. Navigate: Open the application
    await page.goto('/');

    // 2. Connection Check: Wait for the connection status badge to change to 'connected'
    // Note: The text is rendered as lowercase 'connected' in the DOM, but styled uppercase via CSS.
    const connectionStatus = page.getByText('connected', { exact: true });
    await expect(connectionStatus).toBeVisible({ timeout: 15000 });

    // 3. Input Interaction: Verify input is enabled, type message, and send
    const chatInput = page.getByPlaceholder('Type your message...');
    await expect(chatInput).toBeEnabled();
    
    await chatInput.fill('Summarise the Q3 report');
    
    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify user message appears in chat
    await expect(page.getByText('Summarise the Q3 report')).toBeVisible();

    // 4. Stream & Context Verification: Wait for response and context update
    
    // Verify that the agent response bubble appears (agent bubbles have white background)
    const agentBubble = page.locator('.bg-white.text-gray-800').first();
    await expect(agentBubble).toBeVisible({ timeout: 15000 });

    // Verify the Context Inspector panel empty state disappears
    const emptyStateText = page.getByText('Waiting for context snapshots...');
    await expect(emptyStateText).toBeHidden({ timeout: 15000 });

    // Verify the Context Inspector populates with JSON data 
    // (indicated by the presence of a JSON bracket or keys)
    const jsonBracket = page.getByText('{').first();
    await expect(jsonBracket).toBeVisible();
  });
});
