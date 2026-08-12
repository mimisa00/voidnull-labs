import { test, expect } from '@playwright/test'

test('debug login console logs', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (msg) => {
    logs.push(msg.text())
    console.log('[PLAY] ' + msg.text())
  })

  await page.goto('http://localhost:3000/login')
  await page.fill('input[placeholder="admin@voidnull.io"]', 'admin@voidnull.io')
  await page.fill('input[placeholder="••••••••"]', 'Admin@123456')
  await page.click('button:has-text("Sign In")')

  // give some time to fire network and console
  await page.waitForTimeout(5000)

  console.log('Collected console logs:', logs)
  // optional: assert we saw navigating log
  expect(logs).toContain('Navigating to dashboard')
})
