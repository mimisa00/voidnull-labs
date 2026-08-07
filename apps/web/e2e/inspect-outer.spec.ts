import { test, expect } from '@playwright/test';

test('inspect form outerHTML and onsubmit', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const form = await page.$('form');
  const outerHTML = await form?.evaluate((el: HTMLFormElement) => el.outerHTML);
  console.log('Form outerHTML:', outerHTML);
  const hasOnSubmit = await form?.evaluate((el: HTMLFormElement) => !!el.getAttribute('onsubmit'));
  console.log('Form has onsubmit:', hasOnSubmit);
  // Expectation: should have onsubmit
  expect(hasOnSubmit).toBeTruthy();
});