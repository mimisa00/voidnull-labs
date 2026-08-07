import { test, expect } from '@playwright/test';

// This test verifies that visiting the login page, entering credentials, and submitting navigates to the dashboard.

test('login and navigate to dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  // Replace the placeholders with the actual selectors used in the login form.
  // The existing project uses the placeholder attributes for the input fields.
  await page.fill('input[placeholder="admin@voidnull.io"]', 'admin@voidnull.io');
  await page.fill('input[placeholder="••••••••"]', 'Admin@123456');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard');
  const url = page.url();
  expect(url).toContain('/dashboard');
});
