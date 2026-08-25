/**
 * analytics.js — thin wrapper around Vercel Analytics' track() so component
 * code doesn't have to import from '@vercel/analytics' + wrap in try/catch
 * every time.
 *
 * Why a wrapper:
 *   • Safe no-op if track() ever fails to import (privacy extensions block
 *     the Vercel Analytics script; without a try/catch every call site
 *     would throw).
 *   • One place to add filtering (e.g. skip in dev, redact PII from
 *     property addresses before sending).
 *   • Consistent naming — snake_case events with a limited vocabulary.
 *
 * Vercel Analytics free tier: 2,500 custom events / month. Events beyond
 * that cap silently drop. We keep the vocabulary small enough to stay in
 * budget while still capturing the funnel.
 */

let trackFn = null;

// Lazy-import track() so the analytics chunk only loads if we actually fire
// an event. Fails silently if the script is blocked or the import errors.
async function getTrack() {
  if (trackFn !== null) return trackFn;
  try {
    const mod = await import("@vercel/analytics");
    trackFn = mod.track || (() => {});
  } catch {
    trackFn = () => {};
  }
  return trackFn;
}

/**
 * Redact anything that might be considered PII from an address string
 * before it hits analytics. Keeps city + street type but strips street
 * number and unit for privacy compliance.
 *
 * "2424 Westmount Rd NW, Calgary AB" → "Westmount Rd NW, Calgary AB"
 * "17 Sunrise Blvd, Toronto ON"      → "Sunrise Blvd, Toronto ON"
 */
export function redactAddress(addr) {
  if (!addr) return "";
  return String(addr).replace(/^\s*(unit\s+)?[#\d\-]+\s+/i, "").trim();
}

/**
 * Track a custom event. Fire-and-forget — never returns a rejected promise,
 * never throws. Extra props must be flat (no nested objects) and values
 * limited to string / number / boolean per Vercel Analytics API.
 */
export async function track(event, props = {}) {
  try {
    const fn = await getTrack();
    // Filter to primitives + strings capped at 200 chars to keep payloads
    // small and avoid the 2KB per-event limit.
    const clean = {};
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      const t = typeof v;
      if (t === "string")      clean[k] = v.slice(0, 200);
      else if (t === "number") clean[k] = Number.isFinite(v) ? v : 0;
      else if (t === "boolean") clean[k] = v;
    }
    fn(event, clean);
  } catch {
    // never throw from analytics
  }
}

// ── Named helpers for the funnel — keeps event names consistent and lets
// TypeScript-inclined future us add typing without touching call sites.

export const trackPropertyLookup = (address, city) =>
  track("property_lookup", { address: redactAddress(address), city });

export const trackVerdictCardClick = (strategy, verdict) =>
  track("verdict_card_click", { strategy, verdict });

export const trackToolClick = (tool) =>
  track("tool_click", { tool });

export const trackSaveToDashboard = (result) =>
  track("save_to_dashboard", { result });   // result: "success" | "error" | "blocked_free"

export const trackUpgradeModalOpen = (reason) =>
  track("upgrade_modal_open", { reason });  // reason: "lookup" | "save" | "pdf" | "rentroll"

export const trackUpgradeCtaClick = (source) =>
  track("upgrade_cta_click", { source });   // source: "banner" | "modal" | "nav"

export const trackWelcomeModalAction = (action) =>
  track("welcome_modal_action", { action }); // action: "shown" | "example_click" | "dismissed"
