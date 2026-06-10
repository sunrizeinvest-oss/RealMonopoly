// api/realtor-ca.js
// Fetches nearby active listings from Realtor.ca (unofficial API)
// using Nominatim for geocoding and api2.realtor.ca for listings.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address is required' });

  try {
    // ── Step 1: Geocode address with Nominatim ──────────────────────────────
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=ca`;
    const geoRes = await fetch(geoUrl, {
      headers: {
        'User-Agent': 'RealDeal/1.0 (rizeai.co; contact: info@rizeai.co)',
        'Accept-Language': 'en',
      },
    });

    if (!geoRes.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }

    const geoData = await geoRes.json();

    if (!geoData || !geoData.length) {
      return res.status(404).json({
        error: 'Address not found. Try including city and province (e.g. "123 Main St, Toronto, ON").',
      });
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);
    const displayName = geoData[0].display_name || address;

    // ── Step 2: Build bounding box (~1.5 km radius) ─────────────────────────
    const delta = 0.015; // ~1.5 km in degrees
    const latMin = (lat - delta).toFixed(6);
    const latMax = (lat + delta).toFixed(6);
    const lonMin = (lon - delta).toFixed(6);
    const lonMax = (lon + delta).toFixed(6);

    // ── Step 3: Fire active-for-sale and (attempted) recently-sold in parallel
    const baseBody = {
      CultureId:           '1',
      ApplicationId:       '1',
      PropertyTypeGroupID: '1',        // Residential
      LatitudeMin:          latMin,
      LatitudeMax:          latMax,
      LongitudeMin:         lonMin,
      LongitudeMax:         lonMax,
      CurrentPage:          '1',
      RecordsPerPage:       '20',
      SortBy:               '6',       // Price
      SortOrder:            'D',       // Descending
    };

    const [activeRes, soldRes] = await Promise.all([
      fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ ...baseBody, TransactionTypeId: '2' }).toString(), // For Sale
      }),
      fetch('https://api2.realtor.ca/Listing.svc/PropertySearch_Post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ ...baseBody, TransactionTypeId: '3' }).toString(), // Sold / not public
      }),
    ]);

    // ── Step 4: Parse active listings ───────────────────────────────────────
    let activeListings = [];
    let totalActive    = 0;
    if (activeRes.ok) {
      const data   = await activeRes.json();
      const results = data.Results || [];
      totalActive   = data.Paging?.TotalRecords || results.length;

      activeListings = results.map(l => {
        const addrRaw = l.Property?.Address?.AddressText || '';
        const addrParts = addrRaw.split('|');
        const street    = addrParts[0]?.trim() || '';
        const cityProv  = addrParts[1]?.trim() || '';

        const priceRaw  = l.Property?.PriceUnformatted || parsePriceCa(l.Property?.Price);
        const sqftRaw   = parseSqftCa(l.Building?.SizeInterior || l.Property?.Building?.SizeInterior || '');
        const bedsRaw   = parseRangeCa(l.Building?.BedRange   || l.Property?.Building?.BedRange || '');
        const bathsRaw  = parseRangeCa(l.Building?.BathRange  || l.Property?.Building?.BathRange || '');
        const lotRaw    = parseSqftCa(l.Land?.SizeTotal || '');

        // Parse Realtor.ca /Date(ms)/ format
        const insertedMs  = parseMsDate(l.InsertedDateUTC);
        const daysOnMkt   = insertedMs ? Math.round((Date.now() - insertedMs) / 86400000) : null;

        const relUrl = l.RelativeDetailsURL || '';
        const listingUrl = relUrl ? `https://www.realtor.ca${relUrl}` : null;

        return {
          address:      street || addrRaw,
          cityProvince: cityProv,
          mlsNumber:    l.MlsNumber || null,
          price:        priceRaw,
          bedrooms:     bedsRaw,
          bathrooms:    bathsRaw,
          sqft:         sqftRaw,
          lotSize:      lotRaw,
          propertyType: l.Building?.Type || l.Property?.Type || null,
          daysOnMarket: daysOnMkt,
          listingUrl:   listingUrl,
          photoUrl:     l.Property?.Photo?.[0]?.LargePhotoUrl || null,
          latitude:     parseFloat(l.Property?.Address?.Latitude  || lat),
          longitude:    parseFloat(l.Property?.Address?.Longitude || lon),
        };
      });
    } else {
      console.error('Realtor.ca active listings error:', activeRes.status);
    }

    // ── Step 5: Parse sold listings (may be empty — Realtor.ca limits this) ─
    let soldListings = [];
    if (soldRes.ok) {
      const data    = await soldRes.json();
      const results = data.Results || [];
      soldListings  = results.map(l => {
        const addrRaw  = l.Property?.Address?.AddressText || '';
        const addrParts = addrRaw.split('|');
        const priceRaw  = l.Property?.PriceUnformatted || parsePriceCa(l.Property?.Price);
        return {
          address:      addrParts[0]?.trim() || addrRaw,
          cityProvince: addrParts[1]?.trim() || '',
          mlsNumber:    l.MlsNumber || null,
          price:        priceRaw,
          bedrooms:     parseRangeCa(l.Building?.BedRange  || ''),
          bathrooms:    parseRangeCa(l.Building?.BathRange || ''),
          sqft:         parseSqftCa(l.Building?.SizeInterior || ''),
          propertyType: l.Building?.Type || l.Property?.Type || null,
          listingUrl:   l.RelativeDetailsURL ? `https://www.realtor.ca${l.RelativeDetailsURL}` : null,
        };
      });
    }

    // ── Step 6: Build market stats ───────────────────────────────────────────
    const activePrices = activeListings.map(l => l.price).filter(Boolean);
    const activeDoms   = activeListings.map(l => l.daysOnMarket).filter(v => v != null);
    const soldPrices   = soldListings.map(l => l.price).filter(Boolean);

    const stats = {
      medianActivePrice: median(activePrices),
      avgDaysOnMarket:   activeDoms.length ? Math.round(activeDoms.reduce((a, b) => a + b, 0) / activeDoms.length) : null,
      activeCount:       activeListings.length,
      totalActiveArea:   totalActive,
      soldCount:         soldListings.length,
      medianSoldPrice:   median(soldPrices),
    };

    // Realtor.ca search URL for the area
    const realtorCaSearchUrl = `https://www.realtor.ca/map#view=list&lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&zoom=15`;

    return res.status(200).json({
      source:      'realtor-ca',
      geocoded:    { lat, lon, displayName },
      activeListings,
      soldListings,
      stats,
      searchUrl:   realtorCaSearchUrl,
    });

  } catch (err) {
    console.error('realtor-ca error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePriceCa(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseSqftCa(str) {
  if (!str) return null;
  const m = str.match(/[\d,]+/);
  if (!m) return null;
  const n = parseInt(m[0].replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseRangeCa(str) {
  if (!str) return null;
  // "3" or "3-4" → take the lower bound as a number
  const m = str.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseMsDate(msDateStr) {
  if (!msDateStr) return null;
  // Realtor.ca format: "/Date(1704067200000)/"
  const m = msDateStr.match(/\/Date\((\d+)\)\//);
  return m ? parseInt(m[1], 10) : null;
}

function median(arr) {
  const a = arr.filter(Boolean);
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
