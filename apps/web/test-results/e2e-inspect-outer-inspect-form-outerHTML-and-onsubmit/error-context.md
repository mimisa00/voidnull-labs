# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\inspect-outer.spec.ts >> inspect form outerHTML and onsubmit
- Location: e2e\inspect-outer.spec.ts:3:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "Operations" [ref=e4] [cursor=pointer]:
        - /url: /operations/dashboard
      - link "Client" [ref=e5] [cursor=pointer]:
        - /url: /client/home
      - link "Games" [ref=e6] [cursor=pointer]:
        - /url: /games/lobby
    - button "Switch to dark mode" [ref=e7] [cursor=pointer]: 🌙
  - generic [ref=e9]:
    - generic [ref=e10]:
      - heading "VoidNull" [level=1] [ref=e11]
      - paragraph [ref=e12]: Secure Platform Access
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: Email
        - textbox "admin@voidnull.io" [ref=e16]
      - generic [ref=e17]:
        - generic [ref=e18]: Password
        - textbox "••••••••" [ref=e19]
      - button "Sign In" [ref=e20] [cursor=pointer]
    - paragraph [ref=e22]: "Demo: admin@voidnull.io / Admin@123456"
  - alert [ref=e23]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('inspect form outerHTML and onsubmit', async ({ page }) => {
  4  |   await page.goto('http://localhost:3000');
  5  |   const form = await page.$('form');
  6  |   const outerHTML = await form?.evaluate((el: HTMLFormElement) => el.outerHTML);
  7  |   console.log('Form outerHTML:', outerHTML);
  8  |   const hasOnSubmit = await form?.evaluate((el: HTMLFormElement) => !!el.getAttribute('onsubmit'));
  9  |   console.log('Form has onsubmit:', hasOnSubmit);
  10 |   // Expectation: should have onsubmit
> 11 |   expect(hasOnSubmit).toBeTruthy();
     |                       ^ Error: expect(received).toBeTruthy()
  12 | });
```