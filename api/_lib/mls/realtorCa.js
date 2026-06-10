/**
 * Realtor.ca adapter — unofficial public API.
 *
 * Works today, no API key needed. Caveats:
 *   - Realtor.ca's api2 is undocumented; could change layouts.
 *   - Only returns ACTIVE listings. No terminated / expired / withdrawn
 *     (those need formal MLS member access via CREA DDF).
 *   - Sold history is restricted by Realtor.ca; usually returns []
 *
 * Use this provider when neither CREA DDF nor Repliers is configured.
 * Marked groundedByMls=true because the data IS real, just unofficial.
 */

const REALTOR_API = "https://api2.realtor.ca/Listing.svc/PropertySearch_Post";

// Convert "/Date(1730000000000)/" string into ms epoch.
function parseMsDate(s) {
  if (!s) return null;
  const m = /\((\d+)\)/.exec(String(s));
  return m ? Number(m[1]) : null;
}

function parsePrice(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseSqft(s) {
  if (!s) return null;
  const m = /(\d{2,5})/.exec(String(s).replace(/,/g, ""));
  return m ? Number(m[1]) : null;
}

function parseRange(s) {
  if (!s) return null;
  const m = /(\d+(?:\.\d+)?)/.exec(String(s));
  return m ? Number(m[1]) : null;
}

function normalize(l, lat, lng) {
  const addrRaw = l.Property?.Address?.AddressText || "";
  const [streetRaw, cityProvRaw] = addrRaw.split("|").map(s => (s || "").trim());

  const insertedMs = parseMsDate(l.InsertedDateUTC);
  const daysOnMarket = insertedMs ? Math.round((Date.now() - insertedMs) / 86400000) : null;
  const listedDate = insertedMs ? new Date(insertedMs).toISOString().slice(0, 10) : null;

  const relUrl = l.RelativeDetailsURL || "";
  return {
    address:      streetRaw || addrRaw,
    cityProvince: cityProvRaw || "",
    mlsNumber:    l.MlsNumber || null,
    price:        l.Property?.PriceUnformatted || parsePrice(l.Property?.Price),
    bedrooms:     parseRange(l.Building?.BedRange  || l.Property?.Building?.BedRange  || ""),
    bathrooms:    parseRange(l.Building?.BathRange || l.Property?.Building?.BathRange || ""),
    sqft:         parseSqft(l.Building?.SizeInterior || l.Property?.Building?.SizeInterior || ""),
    lotSize:      parseSqft(l.Land?.SizeTotal || ""),
    propertyType: l.Building?.Type || l.Property?.Type || null,
    status:       "Active",
    listedDate,
    daysOnMarket,
    listingUrl:   relUrl ? `https://www.realtor.ca${relUrl}` : null,
    photoUrl:     l.Property?.Photo?.[0]?.LargePhotoUrl || null,
    latitude:     parseFloat(l.Property?.Address?.Latitude  ?? lat),
    longitude:    parseFloat(l.Property?.Address?.Longitude ?? lng),
  };
}

async function fetchListings({ latMin, latMax, lngMin, lngMax, limit = 25 }) {
  const body = new URLSearchParams({
    CultureId:           "1",
    ApplicationId:       "1",
    PropertySearchTypeId: "1",
    TransactionTypeId:   "2",
    SortOrder:           "A",
    SortBy:              "1",
    LatitudeMin:         String(latMin),
    LatitudeMax:         String(latMax),
    LongitudeMin:        String(lngMin),
    LongitudeMax:        String(lngMax),
    RecordsPerPage:      String(limit),
    CurrentPage:         "1",
  });
  const res = await fetch(REALTOR_API, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "User-Agent":    "Mozilla/5.0",
      "Accept":        "application/json, text/plain, */*",
      "Origin":        "https://www.realtor.ca",
      "Referer":       "https://www.realtor.ca/",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return { results: [], status: res.status };
  const data = await res.json().catch(() => ({}));
  return { results: data.Results || [], status: 200 };
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByPoint({ lat, lng, radiusKm = 1.5, limit = 25 }) {
  if (lat == null || lng == null) {
    return { provider: "realtor-ca", groundedByMls: false, activeListings: [], note: "lat/lng required" };
  }
  // Approx degrees per km in Calgary/Vancouver/Toronto latitude range.
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const { results, status } = await fetchListings({
    latMin: lat - dLat,
    latMax: lat + dLat,
    lngMin: lng - dLng,
    lngMax: lng + dLng,
    limit,
  });
  return {
    provider:        "realtor-ca",
    groundedByMls:   results.length > 0,
    activeListings:  results.map(l => normalize(l, lat, lng)),
    soldListings:    [],   // restricted by Realtor.ca
    searchUrl:       `https://www.realtor.ca/map#view=list&lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&zoom=14`,
    note:            status !== 200 ? `Realtor.ca returned ${status}` : null,
  };
}

/** @returns {Promise<import('./types.js').MlsResult>} */
export async function searchByArea({ area, limit = 25 }) {
  // Geocode area → fall back to searchByPoint at the centre.
  const { geocode } = await import("../geocode.js");
  let geo;
  try { geo = await geocode(area); }
  catch (e) {
    return { provider: "realtor-ca", groundedByMls: false, activeListings: [], note: `geocode failed: ${e.message}` };
  }
  return searchByPoint({ lat: geo.lat, lng: geo.lng, radiusKm: 4.0, limit });
}
