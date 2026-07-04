import { test, expect } from '@playwright/test';

test.describe('Agent Chat and Context Inspector Integration', () => {
  test('should connect to WebSocket, send a message, and update context inspector', async ({ page }) => {
    // 0. Mock the WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        url: string;
        readyState: number = 0;
        listeners: Record<string, Function[]> = {};

        constructor(url: string) {
          this.url = url;
          setTimeout(() => {
            this.readyState = 1;
            this.dispatchEvent('open');
          }, 50);
        }

        addEventListener(type: string, listener: Function) {
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type].push(listener);
        }

        removeEventListener(type: string, listener: Function) {
          if (this.listeners[type]) {
            this.listeners[type] = this.listeners[type].filter((l: Function) => l !== listener);
          }
        }

        dispatchEvent(type: string, event: any = {}) {
          if (this.listeners[type]) {
            this.listeners[type].forEach((l: Function) => l(event));
          }
          const handler = (this as any)[`on${type}`];
          if (handler) handler(event);
        }

        send(data: string) {
          setTimeout(() => {
            this.dispatchEvent('message', {
              data: JSON.stringify({
                type: 'TOKEN',
                stream_id: 'mock-stream',
                text: 'Here is the mocked response.'
              })
            });
            this.dispatchEvent('message', {
              data: JSON.stringify({
                type: 'CONTEXT_SNAPSHOT',
                data: { report: 'Q3', status: 'summarized' }
              })
            });
          }, 50);
        }

        close() {
          this.readyState = 3;
          this.dispatchEvent('close');
        }
      }
      (window as any).WebSocket = MockWebSocket;
    });

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
    const agentBubble = page.getByText('Hello, I am the agent.');
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
