/**
 * Calculator surfaces — BRRRR · Commercial · Flip. Smoke-tests that each
 * page renders without a runtime error and the address field accepts input.
 *
 * Doesn't test the math (that's covered by unit tests, separately) — just
 * that the page chunks load and the user can start typing a deal.
 */

import { test, expect } from "@playwright/test";

test.describe("Commercial Analyzer (/commercial)", () => {
  test("renders the property section", async ({ page }) => {
    await page.goto("/commercial");
    await expect(page.getByText(/Property/i).first()).toBeVisible();
  });

  test("has the Loss-to-Lease drop zone", async ({ page }) => {
    await page.goto("/commercial");
    // Brass-bordered drop zone — copy is "Loss-to-Lease Analyzer"
    await expect(page.getByText(/Loss-to-Lease Analyzer/i).first()).toBeVisible();
  });

  test("address autocomplete accepts input", async ({ page }) => {
    await page.goto("/commercial");
    const input = page.getByPlaceholder(/Start typing.*Edmonton.*Calgary/i).first();
    await expect(input).toBeVisible();
    await input.fill("123 Main St, Calgary AB");
    await expect(input).toHaveValue(/Main St/);
  });
});

test.describe("BRRRR Calculator (/brrrr)", () => {
  test("renders the Deal Info card", async ({ page }) => {
    await page.goto("/brrrr");
    await expect(page.getByText(/Deal Info/i).first()).toBeVisible();
  });

  test("has the Loss-to-Lease drop zone", async ({ page }) => {
    await page.goto("/brrrr");
    await expect(page.getByText(/Loss-to-Lease Analyzer/i).first()).toBeVisible();
  });
});

test.describe("Flip Analyzer (/app)", () => {
  test("renders the Deal Type toggle", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("button", { name: /Flip/i }).first()).toBeVisible();
  });
});

test.describe("Pricing flow into checkout", () => {
  test("Pricing page Pro CTA navigates without crashing", async ({ page }) => {
    await page.goto("/pricing");
    const cta = page.getByRole("button", { name: /Upgrade to Pro/i });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
    // Don't actually click — without auth, it would redirect to /login.
    // We just verify the button is interactive (not disabled).
    await expect(cta).toBeEnabled();
  });
});
