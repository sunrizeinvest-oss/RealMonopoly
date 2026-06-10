/**
 * Repliers.io adapter — STUB.
 *
 * Repliers is a paid third-party that aggregates DDF + multi-board MLS
 * feeds via partnerships. Easier signup than CREA DDF (~$500+/mo). Good
 * fallback if you don't have CREA membership but need formal MLS data.
 *
 * Activation path:
 *   1. Sign up at https://repliers.io
 *   2. They issue REPLIERS_API_KEY (REST API auth via Bearer token).
 *   3. Set REPLIERS_API_KEY env var in Vercel.
 *   4. mls/index.js picks this provider automatically (preferred over
 *      Realtor.ca scraper, but DDF wins if both are configured).
 *
 * API: REST/JSON. https://docs.repliers.io
 *
 * Implementation notes for when this lights up:
 *   - GET /listings?lat=&long=&radius= for point search
 *   - GET /listings?city=&state= for area search
 *   - Standard MLS fields available: listPrice, originalPrice, status
 *     ("Active" | "Sold" | "Expired" | "Terminated"), listDate,
 *     soldDate, daysOnMarket, etc.
 *   - Returns up to 100 per page; paginate via cursor.
 */

function isConfigured() {
  return !!process.env.REPLIERS_API_KEY;
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByPoint({ lat, lng, radiusKm = 1.5, limit = 25 }) {
  if (!isConfigured()) {
    return {
      provider:       "repliers",
      groundedByMls:  false,
      activeListings: [],
      note:           "Repliers not configured — set REPLIERS_API_KEY env var.",
    };
  }
  // TODO: implement REST call to https://api.repliers.io/listings
  return {
    provider:       "repliers",
    groundedByMls:  false,
    activeListings: [],
    note:           "Repliers adapter implementation pending — credentials configured but adapter not yet wired.",
  };
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByArea({ area }) {
  return searchByPoint({ lat: null, lng: null });
}
