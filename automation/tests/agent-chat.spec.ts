import { test, expect } from '@playwright/test';

test.describe('Agent Chat and Context Inspector Integration', () => {
  test('should connect to WebSocket, send a message, and update context inspector', async ({ page }) => {
    // 0. Mock the WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        url: string;
        readyState: number = 0;
        listeners: Record<string, Function[]> = {};
        onmessage: ((event: MessageEvent) => void) | null = null;
        onopen: ((event: Event) => void) | null = null;

        constructor(url: string) {
          this.url = url;
          setTimeout(() => {
            this.readyState = 1;
            const event = new Event('open');
            if (this.onopen) this.onopen(event);
            this.dispatchEvent('open', event);
          }, 100);
        }

        addEventListener(type: string, listener: Function) {
          if (!this.listeners[type]) this.listeners[type] = [];
          this.listeners[type].push(listener);
        }

        dispatchEvent(type: string, event: any = {}) {
          if (this.listeners[type]) {
            this.listeners[type].forEach((l: Function) => l(event));
          }
        }

        send(data: string) {
          // Simulate server processing delay
          setTimeout(() => {
            const responses = [
              { type: 'TOKEN', stream_id: 'mock-stream', text: 'Hello, I am the agent.' },
              { type: 'CONTEXT_SNAPSHOT', data: { report: 'Q3', status: 'summarized' } }
            ];

            responses.forEach(res => {
              const msgEvent = new MessageEvent('message', { data: JSON.stringify(res) });
              if (this.onmessage) this.onmessage(msgEvent);
              this.dispatchEvent('message', msgEvent);
            });
          }, 300);
        }
      }
      (window as any).WebSocket = MockWebSocket;
    });

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