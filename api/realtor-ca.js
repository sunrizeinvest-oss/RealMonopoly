/**
 * GET /api/realtor-ca?address=...
 *
 * Thin wrapper around the MLS provider abstraction (api/_lib/mls/). Returns
 * active listings + sold listings + market stats in the shape PropertyHub
 * and PropertyIntelligence already consume. When CREA DDF or Repliers is
 * configured, those providers run instead; otherwise falls back to the
 * unofficial Realtor.ca scraper.
 *
 * Response shape (preserved for backwards compat with existing UI consumers):
 *   {
 *     source: "realtor-ca" | "crea-ddf" | "repliers",
 *     geocoded: { lat, lon, displayName },
 *     activeListings: [...],
 *     soldListings: [...],
 *     stats: {
 *       medianActivePrice, avgDaysOnMarket, activeCount,
 *       totalActiveArea, soldCount, medianSoldPrice
 *     },
 *     searchUrl: "https://www.realtor.ca/map#..."
 *   }
 *
 * Replaces 200+ lines of duplicated scraping logic with ~50 lines of
 * routing. All real listing fetching now lives in api/_lib/mls/realtorCa.js
 * (or whichever provider is configured).
 */

import { geocode } from "./_lib/geocode.js";
import { getMlsProvider, getProviderName } from "./_lib/mls/index.js";

function median(arr) {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address is required" });

  try {
    // Step 1: Geocode (gives us the lat/lng + display name)
    let geo;
    try {
      geo = await geocode(address);
    } catch (e) {
      return res.status(404).json({
        error: `Could not geocode "${address}". Try adding city + province (e.g. "123 Main St, Toronto, ON").`,
      });
    }

    // Step 2: Hand off to whichever MLS provider has credentials configured.
    // Factory order: CREA DDF > Repliers > Realtor.ca scraper.
    const provider = getMlsProvider();
    const providerName = getProviderName();
    const result = await provider.searchByPoint({
      lat: geo.lat, lng: geo.lng, radiusKm: 1.5, limit: 50,
    });

    const activeListings = result.activeListings || [];
    const soldListings   = result.soldListings || [];

    // Step 3: Compute stats from the active + sold sets
    const activePrices = activeListings.map(l => l.price).filter(Boolean);
    const activeDoms   = activeListings.map(l => l.daysOnMarket).filter(v => v != null);
    const soldPrices   = soldListings.map(l => l.price).filter(Boolean);

    const stats = {
      medianActivePrice: median(activePrices),
      avgDaysOnMarket:   activeDoms.length ? Math.round(activeDoms.reduce((a, b) => a + b, 0) / activeDoms.length) : null,
      activeCount:       activeListings.length,
      totalActiveArea:   activeListings.length,  // provider abstraction doesn't return totals; fallback to count
      soldCount:         soldListings.length,
      medianSoldPrice:   median(soldPrices),
    };

    const searchUrl = result.searchUrl
      || `https://www.realtor.ca/map#view=list&lat=${geo.lat.toFixed(4)}&lng=${geo.lng.toFixed(4)}&zoom=15`;

    return res.status(200).json({
      source:    providerName,
      geocoded:  { lat: geo.lat, lon: geo.lng, displayName: geo.displayName || address },
      activeListings,
      soldListings,
      stats,
      searchUrl,
    });
  } catch (err) {
    console.error("[realtor-ca] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
