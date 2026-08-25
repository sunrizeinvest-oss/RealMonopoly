// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function numBeds(val) {
  if (val === '5+' || val === 5) return 5;
  const n = parseInt(val, 10);
  return isNaN(n) ? 1 : n;
}

function sanitizeStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// ─── Realtor.ca (Canada) ──────────────────────────────────────────────────────
async function checkRealtorCA({ city, maxPrice, minBeds }) {
  // Step 1: geocode the city via Nominatim
  // Nominatim REQUIRES a real contact UA per their usage policy — keep this one.
  const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const geoRes = await fetch(geoUrl, {
    headers: { 'User-Agent': 'RizeAI/1.0 (https://www.realdealestate.app)' },
  });

  if (!geoRes.ok) {
    throw new Error(`Geocoding failed: HTTP ${geoRes.status}`);
  }

  const geoData = await geoRes.json();
  if (!geoData || geoData.length === 0) {
    throw new Error(`Could not geocode city: ${city}`);
  }

  const lat = parseFloat(geoData[0].lat);
  const lon = parseFloat(geoData[0].lon);
  const delta = 0.05; // ~5.5 km bounding box

  // Step 2: POST to Realtor.ca unofficial API
  const body = new URLSearchParams({
    LatitudeMin: String(lat - delta),
    LatitudeMax: String(lat + delta),
    LongitudeMin: String(lon - delta),
    LongitudeMax: String(lon + delta),
    TransactionTypeId: '2',          // For Sale
    PropertyTypeGroupID: '1',        // Residential
    RecordsPerPage: '20',
    CurrentPage: '1',
    SortOrder: '6',                  // Date descending (newest first)
    SortBy: '1',
    CultureId: '1',
    ApplicationId: '1',
    PropertySearchTypeId: '0',
    PriceMin: '0',
    ...(maxPrice ? { PriceMax: String(maxPrice) } : {}),
    ...(minBeds >= 1 ? { BedRange: `${minBeds}-0` } : {}),
  });

  // Headers match the working api/_lib/mls/realtorCa.js — Realtor.ca's bot
  // detection 403s any UA that names a non-browser product (was "RizeAI/1.0").
  const listRes = await fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   'Mozilla/5.0',
      'Accept':       'application/json, text/plain, */*',
      'Referer':      'https://www.realtor.ca/',
      'Origin':       'https://www.realtor.ca',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!listRes.ok) {
    // Realtor.ca's bot detection now returns 403 with an HTML page on most
    // scrape attempts. Treat this as "degraded" — empty listings + a flag
    // the UI can render — rather than throwing. This way the daily cron
    // continues iterating other alerts instead of erroring on every CA one.
    const err = new Error(`Realtor.ca blocked (HTTP ${listRes.status}). Subscribe for live MLS comps.`);
    err.degraded = true;
    err.upstreamStatus = listRes.status;
    throw err;
  }

  const data = await listRes.json();
  const results = Array.isArray(data?.Results) ? data.Results : [];

  // Filter and map
  const listings = [];
  for (const item of results) {
    const prop = item?.Property || {};
    const building = item?.Building || {};
    const address = item?.Property?.Address || {};

    const price = parseFloat(prop?.Price?.replace(/[^0-9.]/g, '') || '0') || null;
    // NB: previously `beds` fell back to BathroomTotal (typo/copy-paste bug) so
    // alert emails showed bath counts labeled as beds. Filter (bedsVal below)
    // was correct; the display field wasn't.
    const beds = parseInt(building?.Bedrooms || '0', 10) || null;
    const bedsVal = parseInt(building?.Bedrooms || '0', 10) || 0;
    const baths = parseFloat(building?.BathroomTotal || '0') || null;

    // Apply filters
    if (maxPrice && price && price > maxPrice) continue;
    if (minBeds && bedsVal < minBeds) continue;

    const mlsNum = item?.MlsNumber || '';
    const listingId = item?.Id || '';
    const listingUrl = mlsNum
      ? `https://www.realtor.ca/${mlsNum}`
      : listingId
      ? `https://www.realtor.ca/real-estate/${listingId}`
      : 'https://www.realtor.ca/';

    const sqft = building?.SizeInterior
      ? parseInt(String(building.SizeInterior).replace(/[^0-9]/g, ''), 10) || null
      : null;

    // Realtor.ca's schema uses `InsertedDateUTC` (capital UTC); the older
    // camelCase form silently returned undefined so DOM was always null.
    // Fall back to both spellings just in case they change again upstream.
    const insertedRaw = item?.InsertedDateUTC || item?.InsertedDateUtc || null;
    const dom = insertedRaw
      ? Math.max(0, Math.floor((Date.now() - new Date(insertedRaw).getTime()) / 86400000))
      : null;

    listings.push({
      address: address?.AddressText?.split('|')[0]?.trim() || '',
      city: address?.AddressText?.split('|')[1]?.trim() || city,
      price: price || null,
      bedrooms: bedsVal || null,
      bathrooms: baths || null,
      sqft,
      daysOnMarket: dom,
      listingUrl,
      mlsNumber: mlsNum,
    });

    if (listings.length >= 10) break;
  }

  return listings;
}

// ─── Rentcast (US) ───────────────────────────────────────────────────────────
async function checkRentcastUS({ city, maxPrice, minBeds }) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    throw new Error('RENTCAST_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    city,
    status: 'Active',
    limit: '20',
  });

  const res = await fetch(`https://api.rentcast.io/v1/listings/sale?${params.toString()}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Rentcast API error: HTTP ${res.status} — ${errText.slice(0, 200)}`);
  }

  const raw = await res.json();
  const arr = Array.isArray(raw) ? raw : (raw.listings || []);

  const listings = [];
  for (const l of arr) {
    const price = l.price || l.listPrice || null;
    const beds = l.bedrooms || null;

    // Apply filters
    if (maxPrice && price && price > maxPrice) continue;
    if (minBeds && (beds == null || beds < minBeds)) continue;

    listings.push({
      address: l.formattedAddress || l.addressLine1 || '',
      city: l.city || city,
      price: price || null,
      bedrooms: beds,
      bathrooms: l.bathrooms || null,
      sqft: l.squareFootage || null,
      daysOnMarket: l.daysOnMarket || null,
      listingUrl: l.listingUrl || l.url || `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(city.replace(/,\s*/g, '_'))}`,
      mlsNumber: l.mlsNumber || l.id || null,
    });

    if (listings.length >= 10) break;
  }

  return listings;
}

// ─── Reusable runner ─────────────────────────────────────────────────────────
// Exported so the daily cron can iterate Supabase alerts without paying the
// cost of an HTTP self-call per alert. Same shape as the handler response.
// Degraded source = empty listings + `degraded: true` flag. The cron treats
// degraded as "0 new listings" and skips emailing.
export async function runAlertCheck({ city, country = 'CA', maxPrice = null, minBeds = 1 }) {
  if (!city) throw new Error('city is required');
  const c = String(country).toUpperCase();
  const args = { city, maxPrice, minBeds: numBeds(minBeds) };
  let listings = [];
  let degraded = null;
  try {
    if (c === 'CA')      listings = await checkRealtorCA(args);
    else if (c === 'US') listings = await checkRentcastUS(args);
    else throw new Error(`Unsupported country: ${c}. Use CA or US.`);
  } catch (err) {
    // Only swallow upstream-degraded errors (bot-detection). Configuration
    // / argument errors still throw so the caller knows it was user error.
    if (err.degraded) {
      degraded = {
        reason: err.message,
        upstreamStatus: err.upstreamStatus || null,
      };
      listings = [];
    } else {
      throw err;
    }
  }
  return {
    count: listings.length,
    city,
    country: c,
    listings,
    degraded,
    checkedAt: new Date().toISOString(),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    city: rawCity,
    country: rawCountry,
    maxPrice: rawMaxPrice,
    minBeds: rawMinBeds,
  } = req.query;

  const city = sanitizeStr(rawCity);
  const country = sanitizeStr(rawCountry).toUpperCase() || 'CA';
  const maxPrice = rawMaxPrice ? parseInt(rawMaxPrice, 10) || null : null;
  const minBeds = rawMinBeds ? numBeds(rawMinBeds) : 1;

  if (!city) {
    return res.status(400).json({ error: 'city parameter is required' });
  }

  try {
    const result = await runAlertCheck({ city, country, maxPrice, minBeds });
    return res.status(200).json(result);
  } catch (err) {
    console.error('check-alerts error:', err.message);
    return res.status(500).json({
      error: err.message,
      count: 0,
      city,
      country,
      listings: [],
      checkedAt: new Date().toISOString(),
    });
  }
}
