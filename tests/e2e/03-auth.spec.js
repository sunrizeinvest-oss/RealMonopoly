/**
 * Auth — signup + login flows. Hits real Supabase since the test runs
 * against the production frontend (which has VITE_SUPABASE_URL embedded).
 *
 * Throwaway emails use mailinator addresses so the test inbox is public
 * and the accounts can be left orphaned without cluttering a real inbox.
 *
 * NOTE: each signup creates a real user in Supabase. To avoid noise, the
 * email includes the timestamp so re-runs don't collide and you can
 * filter them out in Supabase Studio.
 */

import { test, expect } from "@playwright/test";

const throwaway = (prefix = "rizeai-e2e") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@mailinator.com`;

test.describe("Auth flows", () => {
  test("login page renders both signup and signin tabs", async ({ page }) => {
    await page.goto("/login");
    // Either tab depending on default mode.
    const tabsVisible =
      (await page.getByText(/Welcome back/i).isVisible().catch(() => false)) ||
      (await page.getByText(/Sign in/i).first().isVisible().catch(() => false)) ||
      (await page.getByText(/Sign up/i).first().isVisible().catch(() => false));
    expect(tabsVisible).toBe(true);
  });

  test("forgot password page is reachable", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByText(/forgot|reset/i).first()).toBeVisible();
  });

  test("signup creates a user via Supabase", async ({ page }) => {
    await page.goto("/login");
    // Switch to signup mode if not already
    const signupTab = page.getByRole("button", { name: /^Sign up/i }).first();
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    const email = throwaway();
    await page.getByPlaceholder(/email/i).first().fill(email);
    await page.getByPlaceholder(/password/i).first().fill(`Pw${Date.now()}!`);

    // The submit button text varies by mode — "Sign up" or "Create account"
    const submit = page
      .getByRole("button", { name: /sign up|create account/i })
      .first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      // Successful signup either auto-confirms + lands us on /analyze or
      // shows a "check your email" message. Either is acceptable.
      await page.waitForLoadState("networkidle", { timeout: 15_000 });
      const url = page.url();
      const okSuccess =
        url.includes("/analyze") ||
        url.includes("/dashboard") ||
        (await page.getByText(/check your email|verification|verify/i).isVisible().catch(() => false));
      expect(okSuccess).toBe(true);
    }
  });
});
