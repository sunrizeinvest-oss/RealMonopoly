/**
 * Deal history helpers — read the user's saved deals from localStorage
 * (the same source the Comparison + Dashboard pages use) and expose
 * median / percentile helpers so the DealReadout buddy can say things
 * like "your DSCR is 0.18 higher than your last 3 BRRRRs."
 *
 * Storage keys (legacy + current):
 *   rde_brrrr_deals      — array of BRRRR + Multifamily + Flip deals
 *   rde_pipeline_v1      — pipeline kanban cards
 *
 * All reads are safe — return empty arrays on localStorage unavailable
 * or JSON parse failures.
 */

const KEYS = ["rde_brrrr_deals", "rde_pipeline_v1"];

function safeRead(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Read all saved deals, optionally filtered by strategy.
 * Returns newest first.
 */
export function getSavedDeals({ strategy } = {}) {
  const all = KEYS.flatMap(safeRead).filter(d => d && typeof d === "object");
  // Dedup by id (some appear in both stores).
  const seen = new Set();
  const dedupe = [];
  for (const d of all) {
    const id = d.id || `${d.name || d.address || "?"}|${d.savedAt || d.createdAt || ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    dedupe.push(d);
  }
  const filtered = strategy
    ? dedupe.filter(d => (d.type || d.strategy) === strategy)
    : dedupe;
  return filtered.sort((a, b) =>
    new Date(b.savedAt || b.createdAt || 0).getTime() -
    new Date(a.savedAt || a.createdAt || 0).getTime()
  );
}

/**
 * Compute median of an array of numbers, ignoring null/NaN.
 */
export function median(values) {
  const nums = values.filter(v => v != null && isFinite(v));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Find past deals similar to the one the user is starting now.
 *
 * Similarity rule:
 *   1. Same strategy (BRRRR vs BRRRR, not BRRRR vs Flip)
 *   2. Same city (Calgary vs Calgary)
 *   3. Optional price band — if current deal has a purchase price + a
 *      saved deal has one, they must be within ±25% to count
 *
 * Returns top N (default 3) matches, sorted by recency.
 *
 * Usage:
 *   const suggestions = findSimilarDeals({ address, strategy: "brrrr", purchasePrice: 540000 });
 *   suggestions.forEach(s => console.log(s.address, s.summary));
 */
import { detectCitySlug } from "./benchmarks";

export function findSimilarDeals({ address, strategy, purchasePrice, limit = 3 } = {}) {
  if (!address || !strategy) return [];
  const city = detectCitySlug(address);
  if (city === "default") return [];

  const all = getSavedDeals({ strategy });
  if (!all.length) return [];

  const matches = [];
  for (const d of all) {
    const dCity = detectCitySlug(d.address || d.name || "");
    if (dCity !== city) continue;

    const results = d.results || d;
    const dPrice = results.purchasePrice || results.pp || d.purchasePrice;
    // Price band check — only enforce if both prices are known
    if (purchasePrice && dPrice) {
      const ratio = dPrice / purchasePrice;
      if (ratio < 0.75 || ratio > 1.25) continue;
    }

    const summary = buildSummary(d);
    matches.push({
      id:          d.id || `${d.address}|${d.savedAt}`,
      address:     d.address || d.name || "Unnamed deal",
      savedAt:     d.savedAt || d.createdAt,
      summary,
      // Carry the underlying inputs so the caller can apply them as defaults.
      inputs:      d.inputs || d,
      results,
    });
    if (matches.length >= limit) break;
  }
  return matches;
}

/**
 * One-line "DSCR 1.32 · 5.2% cap · 11.4% CoC" summary from a saved deal.
 */
function buildSummary(deal) {
  const r = deal.results || deal;
  const parts = [];
  if (r.dscr != null && isFinite(r.dscr))                                              parts.push(`DSCR ${r.dscr.toFixed(2)}`);
  if (r.capRate != null && isFinite(r.capRate))                                        parts.push(`${(r.capRate * 100).toFixed(1)}% cap`);
  else if (r.entryCap != null && isFinite(r.entryCap))                                 parts.push(`${(r.entryCap * 100).toFixed(1)}% cap`);
  if (r.coc != null && isFinite(r.coc) && r.coc !== Infinity)                          parts.push(`${(r.coc * 100).toFixed(1)}% CoC`);
  if (r.profitMargin != null && isFinite(r.profitMargin))                              parts.push(`${(r.profitMargin * 100).toFixed(1)}% margin`);
  return parts.slice(0, 3).join(" · ") || "Saved deal";
}

/**
 * Pull the comparable metric value out of a saved deal. The save formats
 * vary by strategy — this normalizes them to one shape.
 */
function extractMetric(deal, metric) {
  // BRRRR + Multifamily deals usually store at deal.results.{metric}
  const results = deal.results || deal;
  switch (metric) {
    case "dscr":       return results.dscr ?? results.DSCR ?? null;
    case "capRate":    return results.capRate ?? results.entryCap ?? null;
    case "coc":        {
      const v = results.coc ?? results.CoC ?? null;
      return v === Infinity ? null : v;
    }
    case "irr":        return results.irr ?? null;
    case "flipMargin": return results.profitMargin ?? results.marginPct ?? null;
    default:           return null;
  }
}

/**
 * Compute a comparison summary for the user's CURRENT deal against their
 * past N deals (of the same strategy, by default).
 *
 * Returns an array of:
 *   { metric, label, yourValue, historyMedian, delta, deltaPct, tone, text }
 * for each metric where we have at least 2 past deals to compare against.
 */
export function compareToHistory(currentMetrics, { strategy, minHistory = 2 } = {}) {
  const deals = getSavedDeals({ strategy });
  if (deals.length < minHistory) return null;

  const metrics = ["dscr", "capRate", "coc", "flipMargin", "irr"];
  const labels = {
    dscr: "DSCR",
    capRate: "Cap rate",
    coc: "Cash-on-Cash",
    flipMargin: "Flip margin",
    irr: "IRR",
  };

  const fmt = {
    dscr: v => v.toFixed(2),
    capRate: v => `${(v * 100).toFixed(2)}%`,
    coc: v => `${(v * 100).toFixed(1)}%`,
    flipMargin: v => `${(v * 100).toFixed(1)}%`,
    irr: v => `${(v * 100).toFixed(1)}%`,
  };

  const rows = [];
  for (const key of metrics) {
    const yours = currentMetrics?.[key];
    if (yours == null || !isFinite(yours)) continue;
    const past = deals.map(d => extractMetric(d, key));
    const med = median(past);
    if (med == null) continue;
    const delta = yours - med;
    const deltaPct = med !== 0 ? (delta / med) * 100 : null;
    const better = delta >= 0;
    rows.push({
      metric: key,
      label: labels[key],
      yourValue: fmt[key](yours),
      historyMedian: fmt[key](med),
      delta,
      deltaPct,
      tone: better ? "great" : "caution",
      text: `${fmt[key](yours)} vs ${fmt[key](med)} median across your ${past.filter(v => v != null && isFinite(v)).length} past ${strategy || "deals"}.`,
    });
  }

  return {
    count: deals.length,
    rows,
    summary: rows.length === 0
      ? null
      : `vs your ${deals.length} past ${strategy || "deal"}${deals.length === 1 ? "" : "s"}`,
  };
}
