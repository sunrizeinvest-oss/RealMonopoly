/**
 * Loss-to-Lease math module.
 *
 * Pure function. Given a parsed rent-roll unitMix and a CMHC city anchor,
 * compute per-unit market deltas and aggregate stranded-income totals.
 *
 * Imported by:
 *   - api/ai-chat.js (rent-roll-loss-to-lease mode)
 *   - src/lib/tier1Memo.js (IC Memo PDF — adds an LTL page)
 *
 * The math is intentionally simple and explainable:
 *
 *   per-unit market rent  = cmhc.avgRents[bedroomKey]
 *   per-unit delta        = market - actual  (positive = below market = upside)
 *   per-unit delta %      = delta / market
 *   totals.actualMonthly  = Σ actualRent (excluding vacant when computing)
 *   totals.marketMonthly  = Σ marketRent
 *   totals.deltaAnnual    = (totals.marketMonthly - totals.actualMonthly) × 12
 *
 * Stranded 5-year NPV uses an 8% discount rate. Assumes:
 *   - Year 1: 1/3 of upside captured (one lease cycle worth of turnover)
 *   - Year 2: 2/3 captured
 *   - Year 3-5: 100% captured
 *   - Discount rate: 8% — standard real-estate hurdle for upside math
 *
 * Vacant units are surfaced (count + flag) but excluded from rent math
 * since "vacant rent" is $0 and would distort the per-door average.
 *
 * Above-market units (someone overpaying) are kept in the math honestly —
 * their negative delta reduces the aggregate upside. We do NOT clamp to zero.
 */

// Map a bedroom count to the CMHC avgRents key.
function bedroomKey(bedrooms) {
  if (bedrooms == null) return null;
  if (bedrooms === 0) return "bachelor";
  if (bedrooms === 1) return "oneBed";
  if (bedrooms === 2) return "twoBed";
  return "threePlusBed"; // 3+
}

export function computeLossToLease({ unitMix, cmhc }) {
  if (!Array.isArray(unitMix) || unitMix.length === 0) {
    return { ok: false, reason: "No unit mix supplied." };
  }
  if (!cmhc?.avgRents) {
    return { ok: false, reason: "No CMHC anchor for this market." };
  }

  const units = [];
  let actualMonthly = 0;
  let marketMonthly = 0;
  let pricedDoors = 0;
  let missingBedrooms = 0;
  let vacant = 0;
  let aboveMarket = 0;

  for (const u of unitMix) {
    const isVacant = (u?.notes || "").toLowerCase().includes("vacant") || u?.actualRent == null;
    const key = bedroomKey(u?.bedrooms);
    const market = key ? cmhc.avgRents[key] : null;

    if (isVacant) {
      vacant++;
      units.push({ ...u, marketRent: market, deltaMonthly: null, deltaPct: null, status: "vacant" });
      continue;
    }
    if (key == null || market == null) {
      missingBedrooms++;
      units.push({ ...u, marketRent: null, deltaMonthly: null, deltaPct: null, status: "ungraded" });
      continue;
    }

    const actual = Math.round(u.actualRent);
    const delta  = market - actual;
    const deltaPct = market > 0 ? delta / market : null;
    if (delta < 0) aboveMarket++;

    actualMonthly += actual;
    marketMonthly += market;
    pricedDoors++;
    units.push({
      ...u,
      marketRent: market,
      deltaMonthly: delta,
      deltaPct,
      status: delta >= 0 ? "below" : "above",
    });
  }

  const deltaMonthly = marketMonthly - actualMonthly;
  const deltaAnnual  = deltaMonthly * 12;
  const perDoorMonthly = pricedDoors > 0 ? Math.round(deltaMonthly / pricedDoors) : 0;
  const avgUpsidePct = marketMonthly > 0 ? (deltaMonthly / marketMonthly) : 0;

  // 5-year stranded — simple cumulative + NPV at 8%.
  // Capture curve: 33% / 67% / 100% / 100% / 100%.
  const captureCurve = [0.33, 0.67, 1.00, 1.00, 1.00];
  const discount = 0.08;
  let stranded5Year = 0;
  let stranded5YearNPV = 0;
  for (let i = 0; i < captureCurve.length; i++) {
    const annual = deltaAnnual * captureCurve[i];
    stranded5Year += annual;
    stranded5YearNPV += annual / Math.pow(1 + discount, i + 1);
  }

  return {
    ok: true,
    units,
    totals: {
      doors: unitMix.length,
      pricedDoors,
      actualMonthly:    Math.round(actualMonthly),
      marketMonthly:    Math.round(marketMonthly),
      deltaMonthly:     Math.round(deltaMonthly),
      deltaAnnual:      Math.round(deltaAnnual),
      perDoorMonthly,
      avgUpsidePct,                             // 0.146 = 14.6% below market
      stranded5Year:    Math.round(stranded5Year),
      stranded5YearNPV: Math.round(stranded5YearNPV),
    },
    market: {
      city:        cmhc.city,
      province:    cmhc.province,
      cma:         cmhc.cma,
      dataYear:    cmhc.dataYear,
      avgRents:    cmhc.avgRents,
      vacancyRate: cmhc.vacancyRate,
    },
    flags: {
      anyAboveMarket: aboveMarket > 0,
      aboveMarketCount: aboveMarket,
      missingBedrooms,
      vacant,
    },
    methodology: {
      discount:     "8% annual",
      captureCurve: "Year 1: 33% / Y2: 67% / Y3-5: 100%",
      anchor:       `CMHC RMS ${cmhc.dataYear || ""} · ${cmhc.cma || cmhc.city}`,
    },
  };
}
