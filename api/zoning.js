/**
 * GET /api/zoning?address=<full address>
 *
 * Returns normalized zoning + assessment + recent development activity
 * for any property in Edmonton, Calgary, Vancouver, or Toronto.
 *
 * Response shape:
 * {
 *   address: "...",
 *   geocode: { lat, lng, city, displayName },
 *   zoning: {
 *     city, zone, zoneDescription, permittedUses, maxHeightM, maxStoreys,
 *     maxFAR, maxUnits, minLotAreaM2, setbacks
 *   },
 *   assessment: { assessedValue, yearBuilt, buildingClass, lotSizeSqM },
 *   nearbyPermits: [...]   // last 2yrs within 1km, max 100
 * }
 */

import { geocode, isSupported } from "./_lib/geocode.js";
import * as edmonton from "./_lib/cities/edmonton.js";
import * as calgary from "./_lib/cities/calgary.js";
import * as vancouver from "./_lib/cities/vancouver.js";  // stub — reference data only
import * as toronto from "./_lib/cities/toronto.js";      // stub — reference data only
import * as ottawa from "./_lib/cities/ottawa.js";        // live — Zoning By-law 2008-250
import * as mississauga from "./_lib/cities/mississauga.js"; // live — Zoning By-law 0225-2007

const ADAPTERS = {
  edmonton,
  calgary,
  vancouver,
  toronto,
  ottawa,
  mississauga,
};

// Adapters that actually fetch live data. Each does its own best-effort
// query against the city's open-data API and silently falls back to
// {found:false} on schema drift, network failure, or dataset rename —
// so adding a new city here is low-risk.
const LIVE_ADAPTERS = new Set(["edmonton", "calgary", "vancouver", "toronto", "ottawa", "mississauga"]);

// ─── CORS ────────────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "address required" });

  try {
    // 1. Geocode
    const geo = await geocode(address);
    if (!isSupported(geo.citySlug) || !ADAPTERS[geo.citySlug] || !LIVE_ADAPTERS.has(geo.citySlug)) {
      return res.status(200).json({
        address,
        geocode: geo,
        zoning: null,
        error: `city "${geo.city}" not yet supported. Currently: Edmonton, Calgary, Vancouver, Toronto, Ottawa, Mississauga.`,
      });
    }
    const adapter = ADAPTERS[geo.citySlug];

    // 2. Fetch zoning + assessment + permits in parallel
    const [zoning, assessment, nearbyPermits] = await Promise.all([
      adapter.getZoning({ lat: geo.lat, lng: geo.lng, address }),
      adapter.getAssessment ? adapter.getAssessment({ address, lat: geo.lat, lng: geo.lng }).catch(() => null) : null,
      adapter.getPermits ? adapter.getPermits({ lat: geo.lat, lng: geo.lng }).catch(() => []) : [],
    ]);

    // 3. Build response
    res.status(200).json({
      address,
      geocode: {
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city,
        displayName: geo.displayName,
      },
      zoning,
      assessment,
      nearbyPermits: (nearbyPermits || []).slice(0, 20),
      _meta: {
        adapter: geo.citySlug,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("zoning api error:", e);
    res.status(500).json({ error: e.message });
  }
}
