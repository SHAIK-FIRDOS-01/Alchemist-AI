import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Update with your actual title assertion
  // await expect(page).toHaveTitle(/Your Title/);
});
