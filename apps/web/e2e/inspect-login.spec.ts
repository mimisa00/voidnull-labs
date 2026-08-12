import { test, expect } from '@playwright/test'

test('inspect login form element', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  // Grab button type
  const buttonType = await page.getAttribute(
    'button:has-text("Sign In")',
    'type',
  )
  console.log('button type:', buttonType)

  // Check if form has submit handler (no attribute but we can trigger submit via code)
  await page.dispatchEvent('form', 'submit', { bubbles: true })
  // Wait a short time to see if network request occurs
  const [response] = await Promise.all([
    page.waitForResponse('**/auth/login', { timeout: 2000 }).catch(() => null),
    // trigger submit again to ensure
    page.click('button:has-text("Sign In")').catch(() => null),
  ])
  console.log('response', response ? response.status() : 'none')
})
