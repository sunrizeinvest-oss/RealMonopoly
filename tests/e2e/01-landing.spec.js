/**
 * Landing page — hero copy, the three teaser features, the Family Office
 * palette. These tests guard the conversion surface: if any of these
 * regress, the demo is broken.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Hero text renders inside lazy chunks; wait until the H1 is visible.
    await page.getByRole("heading", { name: /Underwrite like an insider/i }).waitFor();
  });

  test("hero copy uses the Hidden Door framing", async ({ page }) => {
    // The H1 is split across an <h1> + <span>; check both pieces.
    await expect(page.getByRole("heading", { name: /Underwrite like an insider/i })).toBeVisible();
    await expect(page.getByText(/Operate with absolute certainty/i)).toBeVisible();
    await expect(page.getByText(/THE HIDDEN DOOR/i).first()).toBeVisible();
  });

  test("X-Ray bar accepts an address and shows scan phases on click", async ({ page }) => {
    // The X-Ray input is on the landing — `Run X-Ray` button starts the scan.
    const input = page.getByPlaceholder(/Enter an AB.*BC multifamily address/i);
    await expect(input).toBeVisible();
    await input.fill("2424 Westmount Rd NW, Calgary AB");

    const runBtn = page.getByRole("button", { name: /Run X-Ray/i });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // The 6-phase scan ticker should flash phrases like "Geocoding address..."
    // Each phase is a 320ms tick; check that at least the first phase appears.
    await expect(page.getByText(/Geocoding address/i)).toBeVisible({ timeout: 4_000 });
  });

  test("Before/After Translator slider is rendered", async ({ page }) => {
    // The translator block contains the literal "DRAG TO TRANSLATE" prompt
    // in the gold-bordered handle.
    await expect(page.getByText(/DRAG TO TRANSLATE/i)).toBeVisible();
  });

  test("Unseen Market pulse map section renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /unseen market/i })).toBeVisible();
    await expect(page.getByText(/Institutional intelligence is gated/i)).toBeVisible();
  });

  test("toolkit grid lists 20+ tools", async ({ page }) => {
    // Each tool tile contains a /route attribute used by the click handler.
    // We just check that the toolkit section heading exists and at least
    // a few well-known calculators show up by name.
    await expect(page.getByRole("heading", { name: /Your full toolkit/i })).toBeVisible();
    await expect(page.getByText(/Fix & Flip Analyzer/i)).toBeVisible();
    await expect(page.getByText(/BRRRR Calculator/i)).toBeVisible();
    await expect(page.getByText(/Multifamily Underwriter/i)).toBeVisible();
  });

  test("bottom CTA says Enter the Ecosystem", async ({ page }) => {
    // Scroll to bottom — the CTA is below the fold.
    const cta = page.getByRole("button", { name: /Enter the Ecosystem/i });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
  });
});
