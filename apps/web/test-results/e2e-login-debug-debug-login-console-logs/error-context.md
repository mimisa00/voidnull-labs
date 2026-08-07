# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\login-debug.spec.ts >> debug login console logs
- Location: e2e\login-debug.spec.ts:3:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: "Navigating to dashboard"
Received array: ["%cDownload the React DevTools for a better development experience: https://reactjs.org/link/react-devtools font-weight:bold", "Button clicked", "onSubmit called", "Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s admin·
    at div
    at div
    at aside
    at div
    at DashboardLayout (webpack-internal:///(app-pages-browser)/./src/app/dashboard/layout.tsx:39:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at body
    at html
    at RootLayout (Server)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at DevRootNotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/dev-root-not-found-boundary.js:33:11)
    at ReactDevOverlay (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/ReactDevOverlay.js:87:9)
    at HotReload (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:321:11)
    at Router (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:207:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at AppRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:585:13)
    at ServerRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:112:27)
    at Root (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:117:11)", "Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s admin·
    at div
    at div
    at aside
    at div
    at DashboardLayout (webpack-internal:///(app-pages-browser)/./src/app/dashboard/layout.tsx:39:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at body
    at html
    at RootLayout (Server)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at DevRootNotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/dev-root-not-found-boundary.js:33:11)
    at ReactDevOverlay (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/ReactDevOverlay.js:87:9)
    at HotReload (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:321:11)
    at Router (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:207:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at AppRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:585:13)
    at ServerRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:112:27)
    at Root (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:117:11)", …]
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
  - alert [ref=e8]
  - generic [ref=e9]:
    - complementary [ref=e10]:
      - generic [ref=e11]:
        - heading "VoidNull" [level=1] [ref=e12]
        - paragraph [ref=e13]: admin@voidnull.io
        - generic [ref=e14]:
          - generic [ref=e15]: admin
          - generic [ref=e16]: admin
          - generic [ref=e17]: admin
          - generic [ref=e18]: admin
      - navigation [ref=e19]:
        - link "📊 Dashboard" [ref=e20] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e21]: 📊
          - generic [ref=e22]: Dashboard
        - link "👥 Users" [ref=e23] [cursor=pointer]:
          - /url: /dashboard/users
          - generic [ref=e24]: 👥
          - generic [ref=e25]: Users
      - button "🚪 Logout" [ref=e27] [cursor=pointer]
    - main [ref=e28]:
      - button "Collapse sidebar" [ref=e30] [cursor=pointer]: ←
      - generic [ref=e31]:
        - heading "Dashboard" [level=2] [ref=e32]
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]:
              - heading "Your Roles" [level=3] [ref=e36]
              - paragraph [ref=e37]: Assigned roles and permissions
            - paragraph [ref=e39]: admin, admin, admin, admin
          - generic [ref=e40]:
            - generic [ref=e41]:
              - heading "Permissions" [level=3] [ref=e42]
              - paragraph [ref=e43]: Granted permissions count
            - paragraph [ref=e45]: 8 granted
          - generic [ref=e46]:
            - generic [ref=e47]:
              - heading "2FA Status" [level=3] [ref=e48]
              - paragraph [ref=e49]: Two-factor authentication status
            - paragraph [ref=e51]: Check profile
        - generic [ref=e52]:
          - generic [ref=e53]:
            - heading "Tech Stack" [level=3] [ref=e54]
            - paragraph [ref=e55]: Platform technologies and tools
          - generic [ref=e57]:
            - generic [ref=e58]: NestJS
            - generic [ref=e59]: Next.js 14
            - generic [ref=e60]: PostgreSQL
            - generic [ref=e61]: Redis
            - generic [ref=e62]: Socket.io
            - generic [ref=e63]: JWT+TOTP
            - generic [ref=e64]: Prisma
            - generic [ref=e65]: Turborepo
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('debug login console logs', async ({ page }) => {
  4  |   const logs: string[] = [];
  5  |   page.on('console', msg => {
  6  |     logs.push(msg.text());
  7  |     console.log('[PLAY] ' + msg.text());
  8  |   });
  9  | 
  10 |   await page.goto('http://localhost:3000/login');
  11 |   await page.fill('input[placeholder="admin@voidnull.io"]', 'admin@voidnull.io');
  12 |   await page.fill('input[placeholder="••••••••"]', 'Admin@123456');
  13 |   await page.click('button:has-text("Sign In")');
  14 | 
  15 |   // give some time to fire network and console
  16 |   await page.waitForTimeout(5000);
  17 | 
  18 |   console.log('Collected console logs:', logs);
  19 |   // optional: assert we saw navigating log
> 20 |   expect(logs).toContain('Navigating to dashboard');
     |                ^ Error: expect(received).toContain(expected) // indexOf
  21 | });
```