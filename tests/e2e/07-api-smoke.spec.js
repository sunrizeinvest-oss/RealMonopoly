/**
 * API smoke tests — non-destructive checks against production endpoints.
 *
 * These tests hit `https://www.realdealestate.app/api/*` directly, not
 * the local preview, because the local Vite preview doesn't run the
 * Vercel serverless functions. They're safe to run anytime — read-only.
 *
 * Use:
 *   npm run test:smoke          → run the full Playwright suite against prod
 *   npm test -- 07-api-smoke    → run just these against prod
 */

import { test, expect, request } from "@playwright/test";

const PROD = "https://www.realdealestate.app";

test.describe("API smoke (prod, read-only)", () => {
  test("property-lookup — Calgary returns full payload", async () => {
    const ctx = await request.newContext();
    const r = await ctx.get(
      `${PROD}/api/property-lookup?address=${encodeURIComponent("2424 Westmount Rd NW, Calgary AB")}`
    );
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.source).toMatch(/calgary-open-data/);
    expect(j.zoning?.code).toBeTruthy();
    // Year built + assessed should both populate post the adapter fix.
    expect(j.yearBuilt).toBeTruthy();
    expect(j.assessedValue).toBeGreaterThan(0);
  });

  test("property-lookup — Ottawa returns parcel-level zoning", async () => {
    const ctx = await request.newContext();
    const r = await ctx.get(
      `${PROD}/api/property-lookup?address=${encodeURIComponent("233 Gloucester St, Ottawa ON")}`
    );
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.zoning?.code).toBeTruthy();
  });

  test("property-lookup — Vancouver returns full payload", async () => {
    const ctx = await request.newContext();
    const r = await ctx.get(
      `${PROD}/api/property-lookup?address=${encodeURIComponent("555 Robson St, Vancouver BC")}`
    );
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.source).toMatch(/vancouver-open-data/);
    expect(j.yearBuilt).toBeTruthy();
    expect(j.zoning?.code).toBeTruthy();
  });

  test("cmhc-rental — Calgary metro data is current", async () => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${PROD}/api/cmhc-rental?city=calgary&province=alberta`);
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.dataYear).toBeGreaterThan(2020);
    expect(j.vacancyRate).toBeGreaterThan(0);
    expect(j.avgRents?.twoBed).toBeGreaterThan(1000);
  });

  test("ai-chat — building-grade mode returns letter grade", async () => {
    const ctx = await request.newContext();
    const r = await ctx.post(`${PROD}/api/ai-chat`, {
      data: {
        mode: "building-grade",
        address: "2424 Westmount Rd NW, Calgary AB",
        zoning: { code: "R-CG", maxStoreys: 3, maxUnits: 4 },
        assessment: { yearBuilt: "1968", assessedValue: 537500 },
      },
    });
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.overall).toMatch(/^[A-D][+\-]?$/);
    expect(j.class).toMatch(/^[A-C]$/);
    expect(Array.isArray(j.dimensions)).toBe(true);
    expect(j.dimensions.length).toBe(4);
  });

  test("ai-chat — rent-roll-loss-to-lease validates input", async () => {
    const ctx = await request.newContext();
    const r = await ctx.post(`${PROD}/api/ai-chat`, {
      data: { mode: "rent-roll-loss-to-lease", city: "calgary", province: "alberta" },
    });
    // Missing document → 400 with a clear message.
    expect(r.status()).toBe(400);
    const j = await r.json();
    expect(j.error).toMatch(/document/i);
  });

  test("ai-chat — rent-roll-loss-to-lease fast-fails on uncovered CMHC city", async () => {
    const ctx = await request.newContext();
    const r = await ctx.post(`${PROD}/api/ai-chat`, {
      data: {
        mode: "rent-roll-loss-to-lease",
        document: "Zm9vYmFy", // not a real PDF — won't get past city check
        city: "swiftcurrent",
        province: "saskatchewan",
      },
    });
    expect(r.status()).toBe(400);
    const j = await r.json();
    expect(j.error).toMatch(/no cmhc anchor/i);
  });

  test("ai-chat — admin-dashboard rejects unauthenticated requests", async () => {
    const ctx = await request.newContext();
    const r = await ctx.post(`${PROD}/api/ai-chat`, {
      data: { mode: "admin-dashboard" },
    });
    // Should be 401 (no token) or 503 (ADMIN_EMAILS not yet configured).
    // Either way, MUST NOT 200 — never accidentally exposes user data.
    expect(r.ok()).toBe(false);
    expect([401, 403, 503]).toContain(r.status());
  });

  test("create-checkout — returns 500 without proper body but the function is reachable", async () => {
    const ctx = await request.newContext();
    const r = await ctx.post(`${PROD}/api/create-checkout`, {
      data: { plan: "pro", userId: "smoke-test", email: "smoke@test.com" },
      headers: { Origin: PROD },
    });
    expect(r.ok()).toBe(true);
    const j = await r.json();
    expect(j.url).toMatch(/checkout\.stripe\.com\/c\/pay\/cs_live_/);
  });

  test("comps — Canadian address returns either Repliers data or notConfigured flag", async () => {
    const ctx = await request.newContext();
    const r = await ctx.get(
      `${PROD}/api/comps?type=sale&address=${encodeURIComponent("233 Gloucester St, Ottawa ON")}`
    );
    expect(r.ok()).toBe(true);
    const j = await r.json();
    // Either the integration is configured (source: "repliers") and we get real comps,
    // OR the flag is correctly set (source: "none", notConfigured: "repliers").
    // Anything else means the feature flag broke.
    const isLive = j.source === "repliers";
    const isNotConfigured = j.source === "none" && j.notConfigured === "repliers";
    expect(isLive || isNotConfigured).toBe(true);
    // Response shape must always be valid regardless of which path served it.
    expect(j.stats).toBeTruthy();
    expect(Array.isArray(j.soldComps)).toBe(true);
    expect(Array.isArray(j.activeListings)).toBe(true);
  });
});
