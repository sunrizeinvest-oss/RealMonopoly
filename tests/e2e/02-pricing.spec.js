/**
 * Pricing page — the prices on the page MUST match the Stripe live products
 * ($0 / $99 / $299). Drift here means customers see one price and Stripe
 * charges another. Investor demos die fast when this gets out of sync.
 */

import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("shows three tiers with correct prices", async ({ page }) => {
    await expect(page.getByText(/\$0/).first()).toBeVisible();
    await expect(page.getByText(/\$99/).first()).toBeVisible();
    await expect(page.getByText(/\$299/).first()).toBeVisible();
  });

  test("Pro tier blurb identifies the segment", async ({ page }) => {
    await expect(page.getByText(/Independent residential investors/i)).toBeVisible();
  });

  test("Scale tier blurb identifies the segment", async ({ page }) => {
    await expect(page.getByText(/Commercial brokers, land developers, wholesalers/i)).toBeVisible();
  });

  test("Free tier mentions all 4 main calculators", async ({ page }) => {
    await expect(page.getByText(/20\+ underwriting calculators/i)).toBeVisible();
  });

  test("Scale tier lists building quality grading", async ({ page }) => {
    await expect(page.getByText(/Building quality grading/i)).toBeVisible();
  });

  test("upgrade buttons are visible for paid tiers", async ({ page }) => {
    // Both Pro and Scale should have CTAs.
    const proCta = page.getByRole("button", { name: /Upgrade to Pro/i });
    const scaleCta = page.getByRole("button", { name: /Upgrade to Scale/i });
    await expect(proCta).toBeVisible();
    await expect(scaleCta).toBeVisible();
  });

  test("no stale Real Deal branding", async ({ page }) => {
    // Brand sweep regression. Realdealestate.app references in domain are
    // fine for now (DNS hasn't moved); the *product name* must read RizeAI.
    const html = await page.content();
    expect(html).not.toMatch(/Real Deal Estate/i);
    expect(html).not.toMatch(/RentCast sold comps/i);
  });
});
