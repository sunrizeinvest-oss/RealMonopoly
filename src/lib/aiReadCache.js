/**
 * AI Read cache — persist Claude thesis responses to localStorage so
 * revisiting a page doesn't re-cost the API call.
 *
 * Used by all 7 AI Read surfaces (property hero, dev potential, risk sim,
 * comp matrix, bulk screener, market triggers, portfolio).
 *
 * Cache strategy:
 *   - Key:  `rde_ai_read_${scope}_${fingerprint}` — scope is the surface
 *           (e.g. "property", "scan", "portfolio"); fingerprint is a stable
 *           hash of the input metrics so changing data invalidates.
 *   - TTL:  24 hours by default. Real estate data is fairly static
 *           day-to-day; reads stay relevant overnight.
 *   - Value: { thesis, source, savedAt }
 *
 * Why localStorage, not Supabase: zero server roundtrip on cache hit,
 * works for unauthed users, no schema migration. A future "AI read
 * history" feature could mirror these to Supabase for cross-device.
 */

const KEY_PREFIX = "rde_ai_read_";
const HISTORY_KEY = "rde_ai_read_history_v1";
const HISTORY_MAX = 20;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours

// Derive a short human-readable label for a history entry. Falls back to
// the scope name if no obvious context field is present.
function deriveLabel(scope, input) {
  if (!input || typeof input !== "object") return scope;
  if (input.address) return String(input.address).slice(0, 60);
  if (input.area)    return String(input.area).slice(0, 60);
  if (scope === "portfolio" && input.totalDeals)
    return `${input.totalDeals} saved deal${input.totalDeals === 1 ? "" : "s"}`;
  if (scope === "batch" && input.totalAddresses)
    return `${input.totalAddresses} address${input.totalAddresses === 1 ? "" : "es"}`;
  if (scope === "scan" && input.triggerCount)
    return `${input.triggerCount} trigger${input.triggerCount === 1 ? "" : "s"}`;
  if (scope === "comps" && input.compCount)
    return `${input.compCount} comp${input.compCount === 1 ? "" : "s"}`;
  if (scope === "risk")
    return `Monte Carlo · IRR P50 ${input.irrP50 ? (input.irrP50 * 100).toFixed(1) + "%" : "—"}`;
  if (scope === "sens")
    return "Sensitivity grids";
  return scope;
}

// Read the recent-reads list (most recent first). Returns array of
// { scope, label, thesis, source, savedAt }. Never throws.
export function getRecentReads(limit = 5) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  } catch { return []; }
}

// Append (most-recent-first) to the rolling history list. Dedupes by
// (scope + label) so back-to-back identical reads don't crowd the list.
function pushHistory(entry) {
  try {
    const existing = (() => {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    })();
    const dedupe = existing.filter(e =>
      !(e.scope === entry.scope && e.label === entry.label)
    );
    const next = [entry, ...dedupe].slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch { /* best-effort */ }
}

// Stable, compact hash for an object — used to key reads by metric shape.
// We don't need cryptographic strength; just collision-resistant enough to
// distinguish "this property" from "that property". 32-bit FNV-1a is fine.
function fingerprint(obj) {
  if (obj == null) return "0";
  const str = typeof obj === "string" ? obj : JSON.stringify(obj);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

function key(scope, input) {
  return `${KEY_PREFIX}${scope}_${fingerprint(input)}`;
}

/**
 * Read a cached thesis. Returns null on miss / expired / parse error.
 * Never throws.
 */
export function getCachedRead(scope, input, ttlMs = DEFAULT_TTL_MS) {
  try {
    const raw = localStorage.getItem(key(scope, input));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.thesis || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return { thesis: parsed.thesis, source: parsed.source || "cache", cached: true };
  } catch { return null; }
}

/**
 * Save a fresh thesis to the cache. No-op on storage error (private mode,
 * quota exceeded, etc.). Also appends to the rolling history list.
 */
export function setCachedRead(scope, input, thesis, source = null) {
  if (!thesis) return;
  const savedAt = Date.now();
  try {
    localStorage.setItem(key(scope, input), JSON.stringify({
      thesis,
      source,
      savedAt,
    }));
  } catch { /* best-effort */ }
  pushHistory({
    scope,
    label: deriveLabel(scope, input),
    thesis,
    source,
    savedAt,
  });
}

/**
 * Convenience: wrap a fetch with cache check + write-on-success.
 * Pass a thunk that returns the fetch promise. Returns { thesis, source,
 * cached } or null. Used by the AI Read useEffects.
 *
 *   const result = await cachedThesisFetch(
 *     "property", fingerprintInput,
 *     () => fetch("/api/ai-chat", {...}).then(r => r.json())
 *   );
 */
export async function cachedThesisFetch(scope, input, fetcher, ttlMs = DEFAULT_TTL_MS) {
  const cached = getCachedRead(scope, input, ttlMs);
  if (cached) return cached;
  try {
    const j = await fetcher();
    if (j?.thesis) {
      setCachedRead(scope, input, j.thesis, j.source);
      return { thesis: j.thesis, source: j.source, cached: false };
    }
    return null;
  } catch { return null; }
}

/** Wipe all cached reads — for debugging / privacy controls. */
export function clearAllCachedReads() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* best-effort */ }
}
