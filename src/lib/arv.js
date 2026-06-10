/**
 * After-Repair Value (ARV) estimator — shared across every calculator,
 * lookup card, and bulk screen that needs to surface what a property
 * should be worth post-rehab. Residential / SFH oriented; multifamily
 * uses stabilized NOI ÷ exit cap (lives in CommercialAnalyzer).
 *
 * Why a shared module: the old per-component estimators each used
 * slightly different formulas and inputs. This one is honest about its
 * signal hierarchy:
 *
 *   1. marketPpsf (most defensible) — "what does $/sqft go for in this
 *      area, post-renovation?" When known, this is the right basis.
 *   2. estimatedValue (good) — an AVM or assessment that already reflects
 *      condition-agnostic value. Apply condition uplift on top.
 *   3. purchasePrice (weakest) — falls back to a heuristic where repair
 *      dollars convert to value at ~70-80% efficiency. Acceptable for
 *      single-input quick estimates but explicitly flagged as low
 *      confidence so the UI can warn the user.
 *
 * Range is ±8% / ±10% around the mid, matching what residential AVM
 * providers like RentCast / HouseSigma typically publish.
 */

function num(v) {
  const n = Number(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const EMPTY = { low: 0, mid: 0, high: 0, ppsf: 0, basis: "none", confidence: "low", methodology: "Not enough data — provide either market $/sqft, an AVM, or purchase price + sqft." };

export function estimateARV(input = {}) {
  const purchasePrice  = num(input.purchasePrice);
  const estimatedValue = num(input.estimatedValue);
  const repairCost     = num(input.repairCost);
  const sqft           = num(input.sqft);
  const beds           = num(input.beds);
  const marketPpsf     = num(input.marketPpsf);

  if (!sqft && !purchasePrice && !estimatedValue && !marketPpsf) return EMPTY;

  // ── Repair-driven uplift multiplier ──
  // Each repair dollar adds ~75¢ to value on a typical renovation. Cap at
  // 1.5x to prevent runaway estimates for over-renovated specs.
  const baseForUplift = estimatedValue || purchasePrice || 0;
  const repairRatio   = baseForUplift > 0 ? repairCost / baseForUplift : 0;
  const repairUplift  = 1 + Math.min(repairRatio * 0.75, 0.5);

  // Bed premium for 3+ BR (mostly relevant for SFH suburban resale).
  const bedPremium = 1 + (beds >= 4 ? 0.05 : beds >= 3 ? 0.03 : 0);

  let mid = 0, ppsf = 0, basis = "none", confidence = "low", methodology = "";

  // ── Path 1: market PPSF anchor (most defensible) ──
  if (marketPpsf > 0 && sqft > 0) {
    ppsf = Math.round(marketPpsf * bedPremium);
    mid  = Math.round(ppsf * sqft);
    basis      = "market-ppsf";
    confidence = repairCost > 0 ? "high" : "med";
    methodology = `Market $${Math.round(marketPpsf)}/sqft × ${sqft.toLocaleString()} sqft${beds >= 3 ? ` × ${((bedPremium - 1) * 100).toFixed(0)}% bed premium` : ""}.`;
  }
  // ── Path 2: estimated value (AVM / assessment) anchor ──
  else if (estimatedValue > 0) {
    mid = Math.round(estimatedValue * repairUplift * bedPremium);
    ppsf = sqft > 0 ? Math.round(mid / sqft) : 0;
    basis      = "estimated-value";
    confidence = repairCost > 0 ? "high" : "med";
    methodology = `Estimated value $${Math.round(estimatedValue).toLocaleString()}${repairRatio > 0 ? ` × ${((repairUplift - 1) * 100).toFixed(0)}% repair uplift` : ""}${beds >= 3 ? ` × bed premium` : ""}.`;
  }
  // ── Path 3: purchase-price-only fallback (weakest signal) ──
  else if (purchasePrice > 0) {
    // Rehab-heavy fallback: assume the purchase reflects a discounted
    // condition. ARV = purchase × (1 + repair efficiency).
    mid = Math.round(purchasePrice * repairUplift * bedPremium);
    ppsf = sqft > 0 ? Math.round(mid / sqft) : 0;
    basis      = "purchase-derived";
    confidence = "low";
    methodology = `Purchase $${Math.round(purchasePrice).toLocaleString()} × ${((repairUplift - 1) * 100).toFixed(0)}% repair uplift — base on AVM or market $/sqft for a stronger estimate.`;
  }
  else return EMPTY;

  return {
    low:  Math.round(mid * 0.92),
    mid,
    high: Math.round(mid * 1.10),
    ppsf,
    basis,
    confidence,
    methodology,
  };
}

// Format helper — for cards / pills that show a single ARV number.
export function formatARV(arv) {
  if (!arv?.mid) return "—";
  return `$${Math.round(arv.mid).toLocaleString()}`;
}
export function formatARVRange(arv) {
  if (!arv?.mid) return "—";
  const k = n => `$${Math.round(n/1000)}K`;
  return `${k(arv.low)} – ${k(arv.high)}`;
}

// Compatibility shim — old DealAnalyzer-style call signature.
// Lets existing code switch to the lib without changing every call site.
export function estimateARVLegacy(purchasePrice, repairCost, sqft, beds, baths) {
  return estimateARV({ purchasePrice, repairCost, sqft, beds, baths });
}
