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
  const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const geoRes = await fetch(geoUrl, {
    headers: { 'User-Agent': 'RizeAI/1.0 (rizeai.co)' },
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

  const listRes = await fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; RizeAI/1.0)',
      'Referer': 'https://www.realtor.ca/',
      'Origin': 'https://www.realtor.ca',
    },
    body: body.toString(),
  });

  if (!listRes.ok) {
    const errText = await listRes.text().catch(() => '');
    throw new Error(`Realtor.ca API error: HTTP ${listRes.status} — ${errText.slice(0, 200)}`);
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
    const beds = parseInt(building?.BathroomTotal || building?.Bedrooms || '0', 10) || null;
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

    const dom = item?.InsertedDateUtc
      ? Math.max(0, Math.floor((Date.now() - new Date(item.InsertedDateUtc).getTime()) / 86400000))
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
    let listings = [];

    if (country === 'CA') {
      listings = await checkRealtorCA({ city, maxPrice, minBeds });
    } else if (country === 'US') {
      listings = await checkRentcastUS({ city, maxPrice, minBeds });
    } else {
      return res.status(400).json({ error: `Unsupported country: ${country}. Use CA or US.` });
    }

    return res.status(200).json({
      count: listings.length,
      city,
      country,
      listings,
      checkedAt: new Date().toISOString(),
    });
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
