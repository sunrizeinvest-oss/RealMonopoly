/**
 * POST /api/predict-rent
 *
 * CMHC-anchored per-property rent estimator for Canadian rentals.
 * Geocodes the address, looks up the CMHC CMA, runs the heuristic model.
 *
 * Body:
 *   {
 *     address: "2424 Westmount Rd NW, Calgary, AB",
 *     bedrooms: 2,                    // required: 0 (bachelor), 1, 2, 3+
 *     sqft: 950,                      // optional
 *     yearBuilt: 1965,                // optional
 *     condition: "renovated",         // optional: new | renovated | good | fair | poor
 *     neighbourhoodMultiplier: 1.10,  // optional, 0.60–1.80 — UI lets users tune
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     predictedRent: 2140,
 *     range: { low: 1885, high: 2395 },
 *     breakdown: { base, size, age, condition, neighbourhood },
 *     market:    { cma, vacancyRate, yoyChange, universeSize },
 *     geocode:   { city, lat, lng, displayName },
 *     source:    "CMHC Rental Market Survey — October 2023",
 *   }
 */

import { geocode } from "./_lib/geocode.js";
import { lookupCMHC, CMHC_DATA_SOURCE } from "./_lib/cmhc-data.js";
import { predictRent } from "./_lib/rent-model.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  const { address, bedrooms, sqft, yearBuilt, condition, neighbourhoodMultiplier } = body;

  if (!address) return res.status(400).json({ error: "address required" });
  if (bedrooms == null) return res.status(400).json({ error: "bedrooms required (0 for bachelor)" });

  try {
    // ── 1. Geocode the address to identify the CMA ────────────────────────
    const geo = await geocode(address);

    // ── 2. Look up CMHC data for that city ────────────────────────────────
    // Use the geocode's city/county string as the CMHC lookup key. We fall
    // back to the citySlug (which the geocoder already resolves to known
    // metro names) for cases like "sherwood park" → "edmonton".
    const cmhc = lookupCMHC(geo.city, geo.province) || lookupCMHC(geo.citySlug, geo.province);

    if (!cmhc) {
      return res.status(404).json({
        ok: false,
        error: `No CMHC coverage for "${geo.city}". CMHC tracks ~26 major Canadian CMAs.`,
        geocode: { city: geo.city, province: geo.province, displayName: geo.displayName },
      });
    }

    // ── 3. Run the model ──────────────────────────────────────────────────
    const result = predictRent({ cmhc, bedrooms, sqft, yearBuilt, condition, neighbourhoodMultiplier });

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    return res.status(200).json({
      ok: true,
      predictedRent: result.rent,
      range:         { low: result.low, high: result.high, spreadPct: result.spreadPct },
      unitType:      result.unitType,
      breakdown:     result.breakdown,
      market:        result.market,
      geocode: {
        city:        geo.city,
        province:    geo.province,
        lat:         geo.lat,
        lng:         geo.lng,
        displayName: geo.displayName,
      },
      source: CMHC_DATA_SOURCE,
      disclaimer:
        "CMA-level baseline adjusted by structural property inputs. Asking-rent variance can be ±20% for any specific unit. Compare against active rental listings before committing pro-forma.",
    });
  } catch (e) {
    console.error("predict-rent error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
