/**
 * api/cmhc-rental.js
 *
 * Returns CMHC rental market data for a given Canadian city:
 *   - Average market rents by bedroom type
 *   - Vacancy rate
 *   - Universe size (total rental units surveyed)
 *   - Year-over-year rent change
 *
 * Data + lookup live in ./_lib/cmhc-data.js so /api/predict-rent can reuse
 * them without an HTTP roundtrip.
 *
 * Query params:
 *   ?city=Vancouver         — city name (fuzzy matched)
 *   ?province=BC            — optional province filter for disambiguation
 */

import { RENTAL_DATA, CMHC_DATA_SOURCE, lookupCMHC } from "./_lib/cmhc-data.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { city, province } = req.query;

  if (!city) {
    return res.status(200).json({
      source: CMHC_DATA_SOURCE,
      cities: RENTAL_DATA.map(d => ({
        city: d.city, province: d.province, vacancyRate: d.vacancyRate,
        avgTwoBedRent: d.avgRents.twoBed,
      })),
    });
  }

  const match = lookupCMHC(city, province);

  if (!match) {
    return res.status(404).json({
      error: `No CMHC rental data found for "${city}". Covered cities: ${RENTAL_DATA.map(d => d.city).join(", ")}`,
    });
  }

  return res.status(200).json({
    source:        CMHC_DATA_SOURCE,
    city:          match.city,
    province:      match.province,
    cma:           match.cma || match.city,
    vacancyRate:   match.vacancyRate,
    avgRents:      match.avgRents,
    yoyChange:     match.yoyChange || null,
    universeSize:  match.universeSize || null,
    notes:         match.notes || null,
    dataYear:      2023,
    disclaimer:    "Data from CMHC Rental Market Survey. Updated annually. For latest figures visit cmhc-schl.gc.ca",
  });
}
