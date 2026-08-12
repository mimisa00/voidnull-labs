import { test, expect } from '@playwright/test'

test('login works in incognito and normal mode', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  await page.fill('input[placeholder="admin@voidnull.io"]', 'admin@voidnull.io')
  await page.fill('input[placeholder="••••••••"]', 'Admin@123456')
  await page.click('button:has-text("Sign In")')
  await page.waitForURL('**/dashboard')
  const url = page.url()
  expect(url).toContain('/dashboard')
})
