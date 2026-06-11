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
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours

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
 * quota exceeded, etc.).
 */
export function setCachedRead(scope, input, thesis, source = null) {
  if (!thesis) return;
  try {
    localStorage.setItem(key(scope, input), JSON.stringify({
      thesis,
      source,
      savedAt: Date.now(),
    }));
  } catch { /* best-effort */ }
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
