export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address is required' });

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Property lookup not configured yet. Add your RENTCAST_API_KEY in Vercel.' });

  const headers = { 'X-Api-Key': apiKey, 'Accept': 'application/json' };
  const enc = encodeURIComponent(address);

  try {
    // Fire all three endpoints in parallel for speed
    const [propRes, avmRes, rentRes] = await Promise.all([
      fetch(`https://api.rentcast.io/v1/properties?address=${enc}&limit=1`, { headers }),
      fetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, { headers }),
      fetch(`https://api.rentcast.io/v1/avm/rent/long-term?address=${enc}`, { headers }),
    ]);

    // ── Property record ────────────────────────────────────────────────────
    let prop = null;
    if (propRes.ok) {
      const data = await propRes.json();
      prop = Array.isArray(data) ? data[0] : data;
    } else {
      const errText = await propRes.text().catch(() => '');
      console.error('Rentcast properties error:', propRes.status, errText);
      // 404 from Rentcast = not found; other codes = real errors
      if (propRes.status !== 404) {
        return res.status(propRes.status).json({ error: `Rentcast error ${propRes.status}: ${errText.slice(0, 200)}` });
      }
    }

    // ── AVM (estimated value) ──────────────────────────────────────────────
    let avmData = {};
    if (avmRes.ok) {
      const avm = await avmRes.json();
      avmData = {
        estimatedValue:     avm.price          || null,
        estimatedValueLow:  avm.priceRangeLow  || null,
        estimatedValueHigh: avm.priceRangeHigh || null,
      };
    } else {
      console.error('AVM error:', avmRes.status);
    }

    // ── Rent AVM ───────────────────────────────────────────────────────────
    let rentData = {};
    if (rentRes.ok) {
      const rd = await rentRes.json();
      rentData = {
        rentEstimate:     rd.rent          || null,
        rentEstimateLow:  rd.rentRangeLow  || null,
        rentEstimateHigh: rd.rentRangeHigh || null,
      };
    } else {
      console.error('Rent AVM error:', rentRes.status);
    }

    // If we found no data at all, return 404
    if (!prop && !avmData.estimatedValue && !rentData.rentEstimate) {
      return res.status(404).json({
        error: 'No property data found. Try including city, state, and zip — US addresses only.',
      });
    }

    // ── Merge and return ───────────────────────────────────────────────────
    return res.status(200).json({
      // Property facts (may be null if only AVM worked)
      address:       prop?.formattedAddress || address,
      propertyType:  prop?.propertyType     || null,
      bedrooms:      prop?.bedrooms         || null,
      bathrooms:     prop?.bathrooms        || null,
      squareFootage: prop?.squareFootage    || null,
      yearBuilt:     prop?.yearBuilt        || null,
      lotSize:       prop?.lotSize          || null,
      county:        prop?.county           || null,
      // Taxes (Rentcast field is taxAmount)
      propertyTaxes: prop?.taxAmount        || prop?.propertyTaxes || null,
      assessedValue: prop?.assessedValue    || null,
      // Last sale history
      lastSalePrice: prop?.lastSalePrice    || null,
      lastSaleDate:  prop?.lastSaleDate     || null,
      // AVM value estimate
      ...avmData,
      // Rent estimate
      ...rentData,
    });

  } catch (err) {
    console.error('Property lookup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
