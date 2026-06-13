/**
 * GET /api/property-lookup?address=...
 *
 * Unified property lookup with two paths:
 *   - Canadian addresses → free city open-data adapters (Calgary / Edmonton /
 *     Vancouver / Toronto) for assessment + zoning, plus CMHC + predict-rent
 *     for rent estimates. NO RentCast call — Canadian users never pay the
 *     RentCast bill or get the 403 when RentCast billing is inactive.
 *   - US addresses → RentCast (properties + AVM + rent). Falls back to a
 *     clear "configure RENTCAST_API_KEY" error when not set.
 *
 * Returns a unified shape so the frontend doesn't care which path ran:
 *   { address, source, country,
 *     bedrooms, bathrooms, squareFootage, yearBuilt, lotSize, propertyType,
 *     assessedValue, propertyTaxes, lastSalePrice, lastSaleDate,
 *     estimatedValue, estimatedValueLow, estimatedValueHigh,
 *     rentEstimate, rentEstimateLow, rentEstimateHigh,
 *     zoning: { code, description, maxStoreys, maxFAR, maxUnits },
 *     attribution: [ ... ] }
 */

import { geocode } from "./_lib/geocode.js";
import { lookupCMHC, CMHC_DATA_SOURCE } from "./_lib/cmhc-data.js";
import { predictRent } from "./_lib/rent-model.js";

// Canadian-address heuristic. Province code anywhere in the string, OR
// a Canadian postal code anywhere.
const CA_PROVINCES = /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/i;
const CA_POSTAL    = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
function isCanadianAddress(addr) {
  return CA_PROVINCES.test(addr) || CA_POSTAL.test(addr);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address is required" });

  try {
    if (isCanadianAddress(address)) {
      return await lookupCanadian({ address, res });
    }
    return await lookupUS({ address, res });
  } catch (err) {
    console.error("[property-lookup] fatal:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────
//   Canadian path — city open data + CMHC + predict-rent
// ─────────────────────────────────────────────────────────────────────────
async function lookupCanadian({ address, res }) {
  let geo;
  try {
    geo = await geocode(address);
  } catch (e) {
    return res.status(404).json({
      error: `Could not geocode "${address}". Try adding the city and province (e.g. "123 Main St, Calgary, AB").`,
    });
  }

  let cityMod = null;
  if (geo.citySlug === "calgary")        cityMod = await import("./_lib/cities/calgary.js");
  else if (geo.citySlug === "edmonton")  cityMod = await import("./_lib/cities/edmonton.js");
  else if (geo.citySlug === "vancouver") cityMod = await import("./_lib/cities/vancouver.js");
  else if (geo.citySlug === "toronto")   cityMod = await import("./_lib/cities/toronto.js");

  // ── CMHC + predict-rent: call helpers DIRECTLY ──
  // Previously these self-fetched over HTTP via process.env.VERCEL_URL, which
  // silently failed in production (deployment URL + serverless cold starts +
  // the rewrite to index.html on non-matching paths combined to leave cmhc
  // null on every response). Now we import the helpers and call them in-process
  // — faster, more reliable, and works for every Canadian city CMHC covers
  // (~26 CMAs), regardless of whether we have a city-data adapter.
  const cmhc = lookupCMHC(geo.cityRaw || geo.citySlug, geo.province) || null;

  let rent = null;
  if (cmhc) {
    // 2BR / 900sqft is the default "show-me-something" preview. The frontend
    // can call /api/predict-rent directly with the real unit details once the
    // user enters them.
    const r = predictRent({ cmhc, bedrooms: 2, sqft: 900 });
    if (r?.ok) {
      rent = {
        ok: true,
        predictedRent: r.rent,
        range:         { low: r.low, high: r.high, spreadPct: r.spreadPct },
        unitType:      r.unitType,
        breakdown:     r.breakdown,
        market:        r.market,
      };
    }
  }

  // City open-data calls — only fire if we have an adapter for the city.
  // Promise.allSettled so a single failure doesn't take the whole response.
  const [assessR, zoningR] = await Promise.allSettled([
    cityMod?.getAssessment ? cityMod.getAssessment({ address, lat: geo.lat, lng: geo.lng }) : Promise.resolve(null),
    cityMod?.getZoning     ? cityMod.getZoning({ lat: geo.lat, lng: geo.lng, address })     : Promise.resolve(null),
  ]);

  const assess  = assessR.status === "fulfilled" ? assessR.value : null;
  const zoning  = zoningR.status === "fulfilled" ? zoningR.value : null;

  const attribution = [];
  if (assess)              attribution.push(`${geo.citySlug} open data`);
  if (zoning?.found)       attribution.push(`${geo.citySlug} zoning`);
  if (cmhc?.dataYear)      attribution.push(`CMHC ${cmhc.dataYear}`);
  if (rent?.ok)            attribution.push("Predict-rent (CMHC-anchored)");

  // Calgary's lot size is sqm — convert to sqft for the unified shape.
  const sqmToSqft = sm => (sm == null ? null : Math.round(sm * 10.7639));

  return res.status(200).json({
    address,
    source: `${geo.citySlug || "unknown"}-open-data`,
    country: "CA",

    // Bedrooms / baths / sqft are NOT in Canadian city open data — null.
    // yearBuilt + lot size + assessed value DO come through.
    bedrooms:      null,
    bathrooms:     null,
    squareFootage: null,
    yearBuilt:     assess?.yearBuilt ?? null,
    lotSize:       sqmToSqft(assess?.lotSizeSqM) ?? null,
    propertyType:  assess?.buildingClass || assess?.taxClass || null,

    assessedValue:  assess?.assessedValue ?? null,
    assessmentYear: assess?.assessmentYear ?? null,
    propertyTaxes:  null,

    lastSalePrice: null,
    lastSaleDate:  null,

    // Assessed value as the value proxy. Range ± 8% / 10% bracket.
    estimatedValue:     assess?.assessedValue ?? null,
    estimatedValueLow:  assess?.assessedValue ? Math.round(assess.assessedValue * 0.92) : null,
    estimatedValueHigh: assess?.assessedValue ? Math.round(assess.assessedValue * 1.10) : null,

    // Rent from predict-rent (CMHC-anchored).
    rentEstimate:     rent?.predictedRent  ?? null,
    rentEstimateLow:  rent?.range?.low     ?? null,
    rentEstimateHigh: rent?.range?.high    ?? null,

    zoning: zoning?.found ? {
      code:        zoning.zone || null,
      description: zoning.zoneDescription || null,
      maxStoreys:  zoning.maxStoreys || null,
      maxFAR:      zoning.maxFAR || null,
      maxUnits:    zoning.maxUnits || null,
      maxHeightM:  zoning.maxHeightM || null,
    } : null,

    cmhc: cmhc?.dataYear ? {
      city:        cmhc.city,
      province:    cmhc.province,
      dataYear:    cmhc.dataYear,
      vacancyRate: cmhc.vacancyRate,
      avgRents:    cmhc.avgRents,
    } : null,

    geocode: { lat: geo.lat, lng: geo.lng, citySlug: geo.citySlug, province: geo.province },
    attribution,
    notes: "Canadian open-data adapter. Bedrooms / baths / sqft are not published by city assessment datasets — enter manually in the underwriter.",
  });
}

// ─────────────────────────────────────────────────────────────────────────
//   US path — RentCast
// ─────────────────────────────────────────────────────────────────────────
async function lookupUS({ address, res }) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "US property lookup needs RENTCAST_API_KEY in Vercel. For Canadian addresses, include the province (e.g. Calgary, AB).",
      country: "US",
    });
  }

  const headers = { "X-Api-Key": apiKey, "Accept": "application/json" };
  const enc = encodeURIComponent(address);

  const [propRes, avmRes, rentRes] = await Promise.all([
    fetch(`https://api.rentcast.io/v1/properties?address=${enc}&limit=1`, { headers }),
    fetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, { headers }),
    fetch(`https://api.rentcast.io/v1/avm/rent/long-term?address=${enc}`, { headers }),
  ]);

  let prop = null;
  if (propRes.ok) {
    const data = await propRes.json();
    prop = Array.isArray(data) ? data[0] : data;
  } else if (propRes.status === 403) {
    return res.status(503).json({
      error: "RentCast subscription is inactive. Reactivate at https://app.rentcast.io to restore US lookups.",
      country: "US",
    });
  } else if (propRes.status !== 404) {
    const errText = await propRes.text().catch(() => "");
    return res.status(propRes.status).json({ error: `Rentcast error ${propRes.status}: ${errText.slice(0, 200)}` });
  }

  let avmData = {};
  if (avmRes.ok) {
    const avm = await avmRes.json();
    avmData = {
      estimatedValue:     avm.price          || null,
      estimatedValueLow:  avm.priceRangeLow  || null,
      estimatedValueHigh: avm.priceRangeHigh || null,
    };
  }

  let rentData = {};
  if (rentRes.ok) {
    const rd = await rentRes.json();
    rentData = {
      rentEstimate:     rd.rent          || null,
      rentEstimateLow:  rd.rentRangeLow  || null,
      rentEstimateHigh: rd.rentRangeHigh || null,
    };
  }

  if (!prop && !avmData.estimatedValue && !rentData.rentEstimate) {
    return res.status(404).json({
      error: "No property data found. Try including city, state, and zip.",
      country: "US",
    });
  }

  return res.status(200).json({
    address:       prop?.formattedAddress || address,
    source:        "rentcast",
    country:       "US",

    propertyType:  prop?.propertyType     || null,
    bedrooms:      prop?.bedrooms         || null,
    bathrooms:     prop?.bathrooms        || null,
    squareFootage: prop?.squareFootage    || null,
    yearBuilt:     prop?.yearBuilt        || null,
    lotSize:       prop?.lotSize          || null,
    county:        prop?.county           || null,
    propertyTaxes: prop?.taxAmount        || prop?.propertyTaxes || null,
    assessedValue: prop?.assessedValue    || null,
    lastSalePrice: prop?.lastSalePrice    || null,
    lastSaleDate:  prop?.lastSaleDate     || null,
    ...avmData,
    ...rentData,
    attribution: ["RentCast"],
  });
}

// Defensive fetch — returns null on any error so Promise.allSettled never
// sees a rejection. Skips internal calls when no baseUrl is set (dev).
async function fetchJSON(url, opts) {
  try {
    if (!url || url.startsWith("/")) return null;
    const r = await fetch(url, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
