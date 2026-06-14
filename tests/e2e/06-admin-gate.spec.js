/**
 * Admin route — the /admin page should NOT be accessible without a valid
 * session, and even with a valid session it should refuse to render
 * dashboard data unless the user's email is on the ADMIN_EMAILS allowlist.
 *
 * These tests run against whichever backend is configured (local vite
 * preview hits the real prod API; smoke hits prod directly).
 */

import { test, expect } from "@playwright/test";

test.describe("Admin route gating", () => {
  test("unauthenticated /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    // The Admin component navigates to /login?next=/admin when no user.
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
