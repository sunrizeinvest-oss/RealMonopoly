/**
 * Bank of Canada Valet API — key mortgage / rate observations.
 *
 * Free, no key. Returns the most recent observation for:
 *   - Prime lending rate (V80691311)
 *   - Conventional 5-year mortgage rate (V80691335)
 *   - Overnight rate (V39079)
 *
 * Cached in-process for the lifetime of the serverless invocation. Fail-open
 * on any error — the caller wraps in Promise.allSettled.
 */

const VALET_BASE = "https://www.bankofcanada.ca/valet/observations";

const SERIES = {
  prime:          "V80691311",  // Chartered bank prime rate
  mortgage5yr:    "V80691335",  // Conventional 5-year mortgage rate
  overnight:      "V39079",     // Target overnight rate
};

// Simple module-scoped cache. Rates only change on Bank of Canada rate decision
// days (~8/yr); a serverless cold start refetching is fine.
let cachedRates = null;
let cachedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;  // 6 hours

async function fetchSeries(seriesId) {
  const url = `${VALET_BASE}/${seriesId}/json?recent=1`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const obs = data?.observations?.[0];
  if (!obs) return null;
  const rateStr = obs[seriesId]?.v;
  const dateStr = obs.d;
  const rate = parseFloat(rateStr);
  return {
    rate: isFinite(rate) ? rate : null,
    date: dateStr || null,
  };
}

export async function getBankOfCanadaRates() {
  if (cachedRates && Date.now() - cachedAt < CACHE_TTL_MS) return cachedRates;

  const [prime, mortgage5yr, overnight] = await Promise.all([
    fetchSeries(SERIES.prime),
    fetchSeries(SERIES.mortgage5yr),
    fetchSeries(SERIES.overnight),
  ]);

  const result = {
    prime,
    mortgage5yr,
    overnight,
    source: "Bank of Canada",
    fetchedAt: new Date().toISOString(),
  };
  cachedRates = result;
  cachedAt = Date.now();
  return result;
}
