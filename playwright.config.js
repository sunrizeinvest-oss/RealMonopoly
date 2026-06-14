/**
 * Playwright config — covers two modes:
 *
 *   1. LOCAL  → tests against `vite preview` (the production build served
 *               locally on http://localhost:4173). No internet round-trips
 *               for the static assets; APIs use the configured BASE_URL.
 *
 *   2. SMOKE  → tests against https://www.realdealestate.app — non-destructive
 *               read-only checks for prod regression detection. Triggered
 *               by `npm run test:smoke`.
 *
 * Chromium-only on CI to keep installs fast. Add WebKit / Firefox by
 * uncommenting the relevant project blocks if cross-browser coverage
 * becomes important.
 */

import { defineConfig, devices } from "@playwright/test";

const isSmoke = process.env.PLAYWRIGHT_MODE === "smoke";
const baseURL = isSmoke
  ? "https://www.realdealestate.app"
  : (process.env.BASE_URL || "http://localhost:4173");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Only spin up `vite preview` in local mode. Smoke mode hits prod directly.
  webServer: isSmoke
    ? undefined
    : {
        command: "npm run preview -- --port 4173",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
