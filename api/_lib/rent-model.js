/**
 * CMHC-anchored heuristic rent estimator.
 *
 * Takes the CMHC CMA average for the bedroom type and adjusts for:
 *   - Unit size vs typical sqft for that bedroom count
 *   - Building age (with condition override for renovated/new)
 *   - User-supplied condition rating
 *   - User-supplied neighbourhood premium/discount (default 1.0)
 *
 * Returns a structured breakdown so the UI can show users exactly how the
 * number was derived — "$1,893 CMHC 2BR Calgary × 1.05 area × 1.08 size × 1.12 new = $2,401".
 * Explainability is the entire point of this model; nothing here is opaque.
 *
 * Confidence band widens as inputs go missing.
 */

const CURRENT_YEAR = 2026;

const UNIT_TYPE_KEYS = ["bachelor", "oneBed", "twoBed", "threePlusBed"];

// Industry rule-of-thumb median sqft for purpose-built Canadian rentals.
// Used as the baseline against which subject sqft is compared.
const TYPICAL_SQFT = {
  bachelor:     425,
  oneBed:       600,
  twoBed:       850,
  threePlusBed: 1100,
};

const CONDITION_MULTIPLIERS = {
  new:        1.10,
  renovated:  1.10,
  good:       1.00,
  fair:       0.90,
  poor:       0.75,
};

const VALID_CONDITIONS = Object.keys(CONDITION_MULTIPLIERS);

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function bedroomsToKey(bedrooms) {
  if (bedrooms == null) return null;
  const n = Number(bedrooms);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return "bachelor";
  if (n === 1) return "oneBed";
  if (n === 2) return "twoBed";
  return "threePlusBed";
}

function ageMultiplier(yearBuilt) {
  if (!yearBuilt) return { value: 1.00, ageYears: null, reason: "yearBuilt unknown — neutral" };
  const ageYears = CURRENT_YEAR - Number(yearBuilt);
  if (ageYears <= 5)  return { value: 1.20, ageYears, reason: "≤5yr new build" };
  if (ageYears <= 15) return { value: 1.10, ageYears, reason: "6-15yr modern" };
  if (ageYears <= 30) return { value: 1.00, ageYears, reason: "16-30yr typical" };
  if (ageYears <= 50) return { value: 0.92, ageYears, reason: "31-50yr aging" };
  return { value: 0.85, ageYears, reason: "51yr+ legacy stock" };
}

function sizeMultiplier(sqft, unitTypeKey) {
  if (!sqft) return { value: 1.00, ratio: null, reason: "sqft unknown — neutral" };
  const typical = TYPICAL_SQFT[unitTypeKey];
  const ratio = Number(sqft) / typical;
  // Slope 0.4 — every 10% above typical adds ~4% rent. Capped to keep edge cases sane.
  const raw = 1 + 0.4 * (ratio - 1);
  const value = clamp(raw, 0.80, 1.30);
  return { value, ratio, reason: `${Math.round((value - 1) * 100)}% vs ${typical} sqft typical` };
}

export function predictRent({
  cmhc,                       // result of lookupCMHC()
  bedrooms,                   // 0, 1, 2, 3+
  sqft,                       // optional
  yearBuilt,                  // optional
  condition,                  // optional: "new" | "renovated" | "good" | "fair" | "poor"
  neighbourhoodMultiplier,    // optional, default 1.0 — UI can pass premium/discount
}) {
  if (!cmhc) {
    return { ok: false, error: "CMHC city data not provided — caller must look it up first." };
  }

  const unitTypeKey = bedroomsToKey(bedrooms);
  if (!unitTypeKey) {
    return { ok: false, error: "bedrooms is required (0 for bachelor, 1-3+ for one to three-plus bedrooms)." };
  }

  const baseRent = cmhc.avgRents[unitTypeKey];
  if (!baseRent) {
    return { ok: false, error: `CMHC has no average for ${unitTypeKey} in ${cmhc.city}.` };
  }

  // ── Compute each adjustment ─────────────────────────────────────────────
  const size = sizeMultiplier(sqft, unitTypeKey);
  let age = ageMultiplier(yearBuilt);

  let conditionMult = 1.00;
  let conditionReason = "condition not provided — neutral";
  if (condition) {
    const norm = String(condition).toLowerCase().trim();
    if (VALID_CONDITIONS.includes(norm)) {
      conditionMult = CONDITION_MULTIPLIERS[norm];
      conditionReason = `${norm} (${conditionMult.toFixed(2)}×)`;
      // Renovated/new overrides legacy age penalty — the building has been
      // effectively reset, so don't double-discount.
      if ((norm === "renovated" || norm === "new") && age.value < 1.0) {
        age = { value: 1.00, ageYears: age.ageYears, reason: `age penalty neutralized by ${norm} condition` };
      }
    } else {
      conditionReason = `unknown condition "${condition}" — treated as neutral`;
    }
  }

  const neighMult = (neighbourhoodMultiplier != null && Number.isFinite(Number(neighbourhoodMultiplier)))
    ? clamp(Number(neighbourhoodMultiplier), 0.60, 1.80)
    : 1.00;

  // ── Combine ──────────────────────────────────────────────────────────────
  const rawRent = baseRent * size.value * age.value * conditionMult * neighMult;
  const rent = Math.round(rawRent);

  // ── Confidence band ──────────────────────────────────────────────────────
  // Tighter if all per-property inputs were supplied.
  const completeness = (sqft ? 1 : 0) + (yearBuilt ? 1 : 0) + (condition ? 1 : 0);
  const spread = completeness === 3 ? 0.12 : completeness === 2 ? 0.18 : 0.25;
  const low = Math.round(rent * (1 - spread));
  const high = Math.round(rent * (1 + spread));

  return {
    ok: true,
    rent,
    low,
    high,
    unitType: unitTypeKey,
    spreadPct: Math.round(spread * 100),
    breakdown: {
      base:           { value: baseRent, source: `CMHC ${cmhc.city} ${unitTypeKey}` },
      size:           { multiplier: round2(size.value),  reason: size.reason },
      age:            { multiplier: round2(age.value),   reason: age.reason, ageYears: age.ageYears },
      condition:      { multiplier: round2(conditionMult), reason: conditionReason },
      neighbourhood:  { multiplier: round2(neighMult),   reason: neighbourhoodMultiplier != null ? "user override" : "neutral default" },
    },
    market: {
      cma:         cmhc.cma || cmhc.city,
      vacancyRate: cmhc.vacancyRate,
      yoyChange:   cmhc.yoyChange,
      universeSize: cmhc.universeSize,
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
