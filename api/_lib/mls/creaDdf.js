/**
 * CREA DDF (Data Distribution Facility) adapter — STUB.
 *
 * This is the OFFICIAL Canadian MLS data feed. Once activated it replaces
 * the unofficial Realtor.ca scraper and unlocks:
 *   - Sold listings (full historical)
 *   - Terminated / expired / withdrawn status
 *   - Price drop history per listing
 *   - DOM, list date, expiration date, all official MLS fields
 *
 * Activation path:
 *   1. You need to be a CREA member OR partner with a member brokerage
 *      that grants you DDF access.
 *   2. Apply at https://www.crea.ca/dataandstats/data-distribution-facility/
 *      (you'll provide intended use, app description, license terms).
 *   3. CREA issues you DDF_USERNAME + DDF_PASSWORD (OAuth-style auth).
 *   4. Set DDF_USERNAME + DDF_PASSWORD env vars in Vercel.
 *   5. mls/index.js will start picking this provider automatically.
 *
 * API: RETS over OAuth 2.0. Reference:
 *   https://docs.crea.ca/ddf/
 *
 * Implementation notes for when this lights up:
 *   - DDF uses RETS query syntax (not REST/JSON natively). Each query
 *     returns XML; parse with the existing parseRSS-style regex helper
 *     or add a dedicated XML parser.
 *   - Rate limit: ~5 req/sec per credential. Cache aggressively.
 *   - Standard fields: ListPrice, OriginalListPrice, DaysOnMarket,
 *     StandardStatus, StatusContractualSearchDate, BedroomsTotal,
 *     BathroomsTotalInteger, LivingArea, YearBuilt, PropertyType, etc.
 */

function isConfigured() {
  return !!(process.env.DDF_USERNAME && process.env.DDF_PASSWORD);
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByPoint({ lat, lng }) {
  if (!isConfigured()) {
    return {
      provider:       "crea-ddf",
      groundedByMls:  false,
      activeListings: [],
      note:           "CREA DDF not configured — set DDF_USERNAME + DDF_PASSWORD env vars.",
    };
  }
  // TODO: implement OAuth handshake + RETS Search query.
  return {
    provider:       "crea-ddf",
    groundedByMls:  false,
    activeListings: [],
    note:           "DDF adapter implementation pending — credentials configured but adapter not yet wired.",
  };
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByArea({ area }) {
  return searchByPoint({ lat: null, lng: null });
}
