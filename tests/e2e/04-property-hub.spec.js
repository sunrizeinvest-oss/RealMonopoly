/**
 * PropertyHub (/analyze) — the search-anything address surface. Most users
 * land here after signing up. Smoke-tests that the page renders without a
 * crash and the search box accepts input.
 */

import { test, expect } from "@playwright/test";

test.describe("PropertyHub /analyze", () => {
  test("renders the search box", async ({ page }) => {
    await page.goto("/analyze");
    const search = page.getByPlaceholder(/123 Main St|address/i).first();
    await expect(search).toBeVisible();
  });

  test("typing an address into search updates the input", async ({ page }) => {
    await page.goto("/analyze");
    const search = page.getByPlaceholder(/123 Main St|address/i).first();
    await search.fill("2424 Westmount Rd NW, Calgary AB");
    await expect(search).toHaveValue(/Westmount/i);
  });

  test("autocomplete dropdown does not crash the page on blank input", async ({ page }) => {
    await page.goto("/analyze");
    const search = page.getByPlaceholder(/123 Main St|address/i).first();
    await search.click();
    await search.press("Space");
    await search.press("Backspace");
    // Page should still be functional — search visible.
    await expect(search).toBeVisible();
  });
});
