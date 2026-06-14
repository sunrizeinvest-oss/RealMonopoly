/**
 * GET /api/comps?address=<address>&type=<sale|rental>
 *
 * Unified comp endpoint with two backends, picked by address country:
 *
 *   CANADA (heuristic: province code or postal code) →
 *     Repliers MLS via REPLIERS_API_KEY. Real CREA-feed listings: active,
 *     sold (last 6 months), rentals. If REPLIERS_API_KEY isn't set we
 *     return a clean 200 with empty arrays + a `notConfigured: "repliers"`
 *     flag so the UI can surface a "subscribe to unlock comps" CTA
 *     instead of error toast spam.
 *
 *   US (or any non-CA address) →
 *     RentCast via RENTCAST_API_KEY (the existing implementation).
 *     Returns 500 with a clear message if the key isn't set or the
 *     subscription is inactive.
 *
 * Response shape stays identical across backends so PropertyHub and
 * CommercialAnalyzer don't need a per-source branch.
 *
 *   type=sale   → { avmData,        soldComps,  activeListings,  stats, source }
 *   type=rental → { rentAvmData,    rentComps,  activeRentals,   stats, source }
 *
 * `source` is "repliers" or "rentcast" or "none" depending on which path
 * served the request.
 */

// Canadian-address heuristic — mirrors api/property-lookup.js.
const CA_PROVINCES = /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/i;
const CA_POSTAL    = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
function isCanadianAddress(addr) {
  if (!addr) return false;
  return CA_PROVINCES.test(addr) || CA_POSTAL.test(addr);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { address, type = "sale" } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });
  if (type !== "sale" && type !== "rental") {
    return res.status(400).json({ error: "type must be 'sale' or 'rental'" });
  }

  try {
    if (isCanadianAddress(address)) {
      return await lookupRepliers({ address, type, res });
    }
    return await lookupRentCast({ address, type, res });
  } catch (err) {
    console.error(`${type} comps fatal:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────
//   Repliers (Canadian MLS via the CREA feed)
//
//   Docs: https://docs.repliers.io
//   Auth header: REPLIERS-API-KEY: <key>
//   Base URL:    https://api.repliers.io
// ─────────────────────────────────────────────────────────────────────────
async function lookupRepliers({ address, type, res }) {
  const apiKey = process.env.REPLIERS_API_KEY;
  if (!apiKey) {
    // Feature-flag fall-through. Frontend sees empty arrays + a flag it
    // can use to render an "MLS comps require subscription" upsell card.
    return res.status(200).json(emptyResponse(type, "none", "repliers"));
  }

  // Repliers supports searching by address directly. We ask for live + sold
  // listings within 1km of the matched property in one batch.
  // type=sale → status=A (active) + lastStatus matching sold within 180d
  // type=rental → searchType=for_rent
  const baseUrl = "https://api.repliers.io/listings";
  const enc = encodeURIComponent(address);

  // Active listings for the relevant searchType.
  const activeUrl = type === "sale"
    ? `${baseUrl}?address=${enc}&status=A&searchType=for_sale&radius=1&pageSize=10`
    : `${baseUrl}?address=${enc}&status=A&searchType=for_rent&radius=1&pageSize=10`;

  // Recently sold/leased comps — 180-day window. Repliers exposes a
  // `closedAt` filter via `minSoldDate` (sales) / `minLeasedDate` (rentals).
  const sixMonthsAgoISO = new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10);
  const compsUrl = type === "sale"
    ? `${baseUrl}?address=${enc}&status=U&searchType=for_sale&minSoldDate=${sixMonthsAgoISO}&radius=1&pageSize=15`
    : `${baseUrl}?address=${enc}&status=U&searchType=for_rent&minLeaseDate=${sixMonthsAgoISO}&radius=1&pageSize=15`;

  const headers = {
    "REPLIERS-API-KEY": apiKey,
    "Accept": "application/json",
  };

  const [activeRes, compsRes] = await Promise.all([
    fetch(activeUrl, { headers, signal: AbortSignal.timeout(9000) }).catch(e => ({ ok: false, _err: e.message })),
    fetch(compsUrl,  { headers, signal: AbortSignal.timeout(9000) }).catch(e => ({ ok: false, _err: e.message })),
  ]);

  // Defensive parsing — Repliers returns 401/402/429 with a structured
  // error body when the key is invalid or the rate limit is hit.
  let activeRaw = [], compsRaw = [];
  if (activeRes.ok) {
    const j = await activeRes.json().catch(() => ({}));
    activeRaw = j?.listings || [];
  } else {
    console.warn("[repliers/active]", activeRes.status, activeRes._err || "");
  }
  if (compsRes.ok) {
    const j = await compsRes.json().catch(() => ({}));
    compsRaw = j?.listings || [];
  } else {
    console.warn("[repliers/comps]", compsRes.status, compsRes._err || "");
  }

  const activeListings = activeRaw.map(l => mapReplierListing(l, type));
  const comps          = compsRaw.map(l => mapReplierComp(l, type));

  // AVM: Repliers doesn't ship a per-property AVM. Compute a quick
  // implied AVM from the median of recent solds. Better-than-nothing
  // anchor the UI can show under "Estimated value/rent".
  const priceKey = type === "sale" ? "price" : "rent";
  const avmMedian = median(comps.map(c => c[priceKey]).filter(Boolean));
  const avmLow    = avmMedian ? Math.round(avmMedian * 0.92) : null;
  const avmHigh   = avmMedian ? Math.round(avmMedian * 1.10) : null;
  const avmData = type === "sale"
    ? { price: avmMedian, priceLow: avmLow, priceHigh: avmHigh, source: "repliers-implied" }
    : { rent:  avmMedian, rentLow:  avmLow, rentHigh: avmHigh, source: "repliers-implied" };

  const stats = type === "sale" ? {
    medianSoldPrice:   median(comps.map(c => c.price)),
    medianSoldPsf:     median(comps.map(c => c.psf)),
    medianActivePrice: median(activeListings.map(l => l.price)),
    avgDaysOnMarket:   avgOf(activeListings.map(l => l.daysOnMarket)),
    activeCount:       activeListings.length,
    soldCount:         comps.length,
  } : {
    medianRent:        median([...comps.map(c => c.rent), ...activeListings.map(l => l.rent)]),
    medianCompRent:    median(comps.map(c => c.rent)),
    avgDaysListed:     avgOf(activeListings.map(l => l.daysOnMarket)),
    activeCount:       activeListings.length,
    compsCount:        comps.length,
  };

  if (type === "sale") {
    return res.status(200).json({ avmData,         soldComps: comps, activeListings, stats, source: "repliers" });
  } else {
    return res.status(200).json({ rentAvmData: avmData, rentComps: comps, activeRentals: activeListings, stats, source: "repliers" });
  }
}

// ─────────────────────────────────────────────────────────────────────────
//   RentCast (US fallback — existing implementation)
// ─────────────────────────────────────────────────────────────────────────
async function lookupRentCast({ address, type, res }) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "RENTCAST_API_KEY not configured" });

  const headers = { "X-Api-Key": apiKey, "Accept": "application/json" };
  const enc = encodeURIComponent(address);

  const avmUrl = type === "sale"
    ? `https://api.rentcast.io/v1/avm/value?address=${enc}`
    : `https://api.rentcast.io/v1/avm/rent/long-term?address=${enc}`;
  const listingsUrl = type === "sale"
    ? `https://api.rentcast.io/v1/listings/sale?address=${enc}&radius=0.5&limit=10&status=Active`
    : `https://api.rentcast.io/v1/listings/rent?address=${enc}&radius=0.5&limit=10&status=Active`;

  const [avmRes, listingsRes] = await Promise.all([
    fetch(avmUrl, { headers }),
    fetch(listingsUrl, { headers }),
  ]);

  let comps = [], avmData = {};
  if (avmRes.ok) {
    const avm = await avmRes.json();
    if (type === "sale") {
      avmData = { price: avm.price || null, priceLow: avm.priceRangeLow || null, priceHigh: avm.priceRangeHigh || null };
    } else {
      avmData = { rent: avm.rent || null, rentLow: avm.rentRangeLow || null, rentHigh: avm.rentRangeHigh || null };
    }
    comps = (avm.comparables || []).map(c => mapRentCastComp(c, type));
  } else {
    console.error(`${type} AVM error:`, avmRes.status);
  }

  let activeListings = [];
  if (listingsRes.ok) {
    const raw = await listingsRes.json();
    const arr = Array.isArray(raw) ? raw : (raw.listings || []);
    activeListings = arr.slice(0, 10).map(l => mapRentCastListing(l, type));
  } else {
    console.error(`${type} listings error:`, listingsRes.status);
  }

  const stats = type === "sale" ? {
    medianSoldPrice:   median(comps.map(c => c.price)),
    medianSoldPsf:     median(comps.map(c => c.psf)),
    medianActivePrice: median(activeListings.map(l => l.price)),
    avgDaysOnMarket:   avgOf(activeListings.map(l => l.daysOnMarket)),
    activeCount:       activeListings.length,
    soldCount:         comps.length,
  } : {
    medianRent:        median([...comps.map(c => c.rent), ...activeListings.map(l => l.rent)]),
    medianCompRent:    median(comps.map(c => c.rent)),
    avgDaysListed:     avgOf(activeListings.map(l => l.daysOnMarket)),
    activeCount:       activeListings.length,
    compsCount:        comps.length,
  };

  if (type === "sale") {
    return res.status(200).json({ avmData, soldComps: comps, activeListings, stats, source: "rentcast" });
  } else {
    return res.status(200).json({ rentAvmData: avmData, rentComps: comps, activeRentals: activeListings, stats, source: "rentcast" });
  }
}

// ─── Repliers → unified shape ───────────────────────────────────────────────
function replierAddressLine(l) {
  const a = l?.address || {};
  return [a.streetNumber, a.streetName, a.streetSuffix].filter(Boolean).join(" ").trim()
      || a.formattedAddress
      || "";
}
function replierSqft(l) {
  // Repliers sqft is sometimes "1500-1750" as a range. Take the midpoint.
  const raw = l?.details?.sqft || l?.details?.squareFootage;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const m = String(raw).match(/(\d+(\.\d+)?)\s*[-–to]+\s*(\d+(\.\d+)?)/i);
  if (m) return Math.round((parseFloat(m[1]) + parseFloat(m[3])) / 2);
  const n = parseFloat(String(raw).replace(/[, ]/g, ""));
  return isNaN(n) ? null : n;
}
function replierDaysOnMarket(l) {
  if (l?.daysOnMarket != null) return Number(l.daysOnMarket);
  const ts = l?.listDate ? new Date(l.listDate).getTime() : null;
  if (!ts) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}
function mapReplierListing(l, type) {
  const a = l?.address || {};
  const sqft = replierSqft(l);
  const base = {
    address:       replierAddressLine(l),
    city:          a.city || "",
    state:         a.state || "",
    zipCode:       a.zip || "",
    bedrooms:      l?.details?.numBedrooms ?? null,
    bathrooms:     l?.details?.numBathrooms ?? null,
    squareFootage: sqft,
    daysOnMarket:  replierDaysOnMarket(l),
    listedDate:    l?.listDate || null,
    propertyType:  l?.class || l?.type || null,
    status:        l?.status || "Active",
    mlsNumber:     l?.mlsNumber || null,
    lat:           l?.map?.latitude || null,
    lng:           l?.map?.longitude || null,
  };
  if (type === "sale") {
    const price = Number(l?.listPrice) || null;
    return { ...base, price, psf: price && sqft ? Math.round(price / sqft) : null };
  }
  return { ...base, rent: Number(l?.listPrice) || null,
    rentPsf: l?.listPrice && sqft ? +(Number(l.listPrice) / sqft).toFixed(2) : null };
}
function mapReplierComp(l, type) {
  const a = l?.address || {};
  const sqft = replierSqft(l);
  const base = {
    address:       replierAddressLine(l),
    city:          a.city || "",
    state:         a.state || "",
    zipCode:       a.zip || "",
    bedrooms:      l?.details?.numBedrooms ?? null,
    bathrooms:     l?.details?.numBathrooms ?? null,
    squareFootage: sqft,
    distance:      null,
    daysOld:       l?.soldDate ? Math.floor((Date.now() - new Date(l.soldDate).getTime()) / 86_400_000) : null,
    correlation:   null,
    mlsNumber:     l?.mlsNumber || null,
    soldDate:      l?.soldDate || l?.closeDate || null,
  };
  if (type === "sale") {
    const price = Number(l?.soldPrice) || Number(l?.listPrice) || null;
    return { ...base, price, psf: price && sqft ? Math.round(price / sqft) : null };
  }
  const rent = Number(l?.soldPrice) || Number(l?.listPrice) || null;
  return { ...base, rent, rentPsf: rent && sqft ? +(rent / sqft).toFixed(2) : null };
}

// ─── RentCast → unified shape ───────────────────────────────────────────────
function mapRentCastComp(c, type) {
  const base = {
    address:       c.formattedAddress || "",
    city:          c.city             || "",
    state:         c.state            || "",
    zipCode:       c.zipCode          || "",
    bedrooms:      c.bedrooms         || null,
    bathrooms:     c.bathrooms        || null,
    squareFootage: c.squareFootage    || null,
    distance:      c.distance         || null,
    daysOld:       c.daysOld          || null,
    correlation:   c.correlation      || null,
  };
  if (type === "sale") {
    return { ...base, price: c.price || null,
      psf: c.squareFootage && c.price ? Math.round(c.price / c.squareFootage) : null };
  }
  return { ...base, rent: c.price || null,
    rentPsf: c.squareFootage && c.price ? +(c.price / c.squareFootage).toFixed(2) : null };
}
function mapRentCastListing(l, type) {
  const base = {
    address:       l.formattedAddress || "",
    city:          l.city             || "",
    state:         l.state            || "",
    zipCode:       l.zipCode          || "",
    bedrooms:      l.bedrooms         || null,
    bathrooms:     l.bathrooms        || null,
    squareFootage: l.squareFootage    || null,
    daysOnMarket:  l.daysOnMarket     || null,
    listedDate:    l.listedDate       || null,
    propertyType:  l.propertyType     || null,
    status:        l.status           || "Active",
  };
  if (type === "sale") {
    return { ...base, price: l.price || null,
      psf: l.squareFootage && l.price ? Math.round(l.price / l.squareFootage) : null };
  }
  return { ...base, rent: l.price || null,
    rentPsf: l.squareFootage && l.price ? +(l.price / l.squareFootage).toFixed(2) : null };
}

// ─── shared helpers ────────────────────────────────────────────────────────
function median(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
function avgOf(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
function emptyResponse(type, source, notConfigured) {
  const avmEmpty = type === "sale"
    ? { price: null, priceLow: null, priceHigh: null }
    : { rent:  null, rentLow: null, rentHigh: null };
  const statsEmpty = type === "sale" ? {
    medianSoldPrice: null, medianSoldPsf: null, medianActivePrice: null,
    avgDaysOnMarket: null, activeCount: 0, soldCount: 0,
  } : {
    medianRent: null, medianCompRent: null, avgDaysListed: null,
    activeCount: 0, compsCount: 0,
  };
  const payload = type === "sale"
    ? { avmData: avmEmpty, soldComps: [], activeListings: [], stats: statsEmpty, source, notConfigured }
    : { rentAvmData: avmEmpty, rentComps: [], activeRentals: [], stats: statsEmpty, source, notConfigured };
  return payload;
}
