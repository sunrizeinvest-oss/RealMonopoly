/**
 * GET /api/comps?address=<address>&type=<sale|rental>
 *
 * Unified comp endpoint — replaces the old separate sale-comps and rental-comps
 * functions to stay under Vercel's free-tier function limit.
 *
 * type=sale   → AVM + active for-sale listings (returns avmData, soldComps, activeListings)
 * type=rental → AVM + active rental listings   (returns rentAvmData, rentComps, activeRentals)
 *
 * Backwards-compatible: if a client still hits /api/sale-comps or /api/rental-comps,
 * the frontend has been updated to call /api/comps?type=... with proper params.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address, type = 'sale' } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });
  if (type !== 'sale' && type !== 'rental') {
    return res.status(400).json({ error: "type must be 'sale' or 'rental'" });
  }

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RENTCAST_API_KEY not configured' });

  const headers = { 'X-Api-Key': apiKey, 'Accept': 'application/json' };
  const enc = encodeURIComponent(address);

  const median = (arr) => {
    const v = arr.filter(Boolean);
    if (!v.length) return null;
    const s = [...v].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  };

  // ── Endpoints differ by type ──────────────────────────────────────────────
  const avmUrl = type === 'sale'
    ? `https://api.rentcast.io/v1/avm/value?address=${enc}`
    : `https://api.rentcast.io/v1/avm/rent/long-term?address=${enc}`;

  const listingsUrl = type === 'sale'
    ? `https://api.rentcast.io/v1/listings/sale?address=${enc}&radius=0.5&limit=10&status=Active`
    : `https://api.rentcast.io/v1/listings/rent?address=${enc}&radius=0.5&limit=10&status=Active`;

  try {
    const [avmRes, listingsRes] = await Promise.all([
      fetch(avmUrl, { headers }),
      fetch(listingsUrl, { headers }),
    ]);

    // ── Parse AVM comps ─────────────────────────────────────────────────────
    let comps = [];
    let avmData = {};
    if (avmRes.ok) {
      const avm = await avmRes.json();
      if (type === 'sale') {
        avmData = { price: avm.price || null, priceLow: avm.priceRangeLow || null, priceHigh: avm.priceRangeHigh || null };
      } else {
        avmData = { rent: avm.rent || null, rentLow: avm.rentRangeLow || null, rentHigh: avm.rentRangeHigh || null };
      }
      comps = (avm.comparables || []).map(c => mapComp(c, type));
    } else {
      console.error(`${type} AVM error:`, avmRes.status);
    }

    // ── Parse active listings ───────────────────────────────────────────────
    let activeListings = [];
    if (listingsRes.ok) {
      const raw = await listingsRes.json();
      const arr = Array.isArray(raw) ? raw : (raw.listings || []);
      activeListings = arr.slice(0, 10).map(l => mapListing(l, type));
    } else {
      console.error(`${type} listings error:`, listingsRes.status);
    }

    // ── Stats (different keys per type, same shape) ─────────────────────────
    const stats = type === 'sale' ? {
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

    // ── Response shape matches the old endpoints for backwards-compat ───────
    if (type === 'sale') {
      return res.status(200).json({ avmData, soldComps: comps, activeListings, stats });
    } else {
      return res.status(200).json({ rentAvmData: avmData, rentComps: comps, activeRentals: activeListings, stats });
    }
  } catch (err) {
    console.error(`${type} comps error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────
function mapComp(c, type) {
  const base = {
    address:       c.formattedAddress || '',
    city:          c.city             || '',
    state:         c.state            || '',
    zipCode:       c.zipCode          || '',
    bedrooms:      c.bedrooms         || null,
    bathrooms:     c.bathrooms        || null,
    squareFootage: c.squareFootage    || null,
    distance:      c.distance         || null,
    daysOld:       c.daysOld          || null,
    correlation:   c.correlation      || null,
  };
  if (type === 'sale') {
    return { ...base, price: c.price || null,
      psf: c.squareFootage && c.price ? Math.round(c.price / c.squareFootage) : null };
  }
  return { ...base, rent: c.price || null,
    rentPsf: c.squareFootage && c.price ? +(c.price / c.squareFootage).toFixed(2) : null };
}

function mapListing(l, type) {
  const base = {
    address:       l.formattedAddress || '',
    city:          l.city             || '',
    state:         l.state            || '',
    zipCode:       l.zipCode          || '',
    bedrooms:      l.bedrooms         || null,
    bathrooms:     l.bathrooms        || null,
    squareFootage: l.squareFootage    || null,
    daysOnMarket:  l.daysOnMarket     || null,
    listedDate:    l.listedDate       || null,
    propertyType:  l.propertyType     || null,
    status:        l.status           || 'Active',
  };
  if (type === 'sale') {
    return { ...base, price: l.price || null,
      psf: l.squareFootage && l.price ? Math.round(l.price / l.squareFootage) : null };
  }
  return { ...base, rent: l.price || null,
    rentPsf: l.squareFootage && l.price ? +(l.price / l.squareFootage).toFixed(2) : null };
}

function avgOf(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
