/**
 * Smart defaults — city-aware "what to start with" values for the calcs.
 *
 * When you detect Calgary, you don't fill the form with generic US BiggerPockets
 * defaults — you fill it with what a Calgary investor would actually start
 * with (5.5% target cap, 40% expense ratio, 2% vacancy, $99 / sqft rehab
 * estimates, etc.). Each calculator can call `getSmartDefaults(address, strategy)`
 * and merge the result into its form state.
 *
 * Returns sensible-for-Canada defaults — much more useful than the existing
 * generic placeholder values.
 */

import { detectCitySlug, getCapRateBenchmark, getOperatingDefaults, getBrrrrRefiDefaults } from "./benchmarks";

// Per-city rehab cost estimates ($/sqft, full reno baseline).
// CAVEAT: these are 2024-2026 contractor estimates, rough. Always verify
// with a real GC quote before committing.
const REHAB_PER_SQFT = {
  calgary:     85,
  edmonton:    78,
  vancouver:   125,
  toronto:     110,
  ottawa:      95,
  hamilton:    85,
  mississauga: 105,
  default:     95,
};

// Typical Canadian property tax rate as % of assessed value (annual).
const PROPERTY_TAX_RATES = {
  calgary:     0.0074,
  edmonton:    0.0094,
  vancouver:   0.0028,    // Vancouver has lowest mill rate but highest values
  toronto:     0.0067,
  ottawa:      0.0117,
  hamilton:    0.0142,    // Hamilton has high tax rate
  mississauga: 0.0086,
  default:     0.0090,
};

// Insurance + utilities are rough national averages — vary widely by building.
const ANNUAL_INSURANCE_PER_UNIT = 800;
const MONTHLY_UTILITIES_PER_UNIT = 180;   // when landlord pays

// Hold period defaults by strategy (months).
const HOLD_MONTHS = {
  brrrr:        6,    // refi after 6 months seasoning
  flip:         6,    // typical Canadian flip cycle
  multifamily:  60,   // 5-year LP hold
  rental:       120,  // 10-year buy-and-hold
};

/**
 * Get a complete starter-defaults object for a given address + strategy.
 *
 * Usage in a calc:
 *   const defaults = getSmartDefaults(form.address, "brrrr");
 *   setForm(prev => ({ ...prev, ...defaults }));
 *
 * Returns shape compatible with BRRRR + Commercial + Flip form keys.
 */
export function getSmartDefaults(address = "", strategy = "rental") {
  const city = detectCitySlug(address);
  const taxRate = PROPERTY_TAX_RATES[city] ?? PROPERTY_TAX_RATES.default;
  const rehabRate = REHAB_PER_SQFT[city] ?? REHAB_PER_SQFT.default;
  const op = getOperatingDefaults(city, strategy === "flip" ? "rental" : (strategy === "multifamily" ? "multifamily" : "rental"));
  const capBench = getCapRateBenchmark(city, strategy === "flip" ? "flip" : (strategy === "multifamily" ? "multifamily" : "rental"));
  const refi = getBrrrrRefiDefaults();
  const hold = HOLD_MONTHS[strategy] ?? HOLD_MONTHS.rental;

  return {
    // City + strategy meta — useful for the UI to show "Defaults for Calgary"
    _smartDefaults: {
      city,
      strategy,
      rehabPerSqft:    rehabRate,
      taxRatePct:      taxRate * 100,
      targetCapPct:    capBench.target * 100,
      lenderFloorDSCR: 1.20,
    },

    // BRRRR / Commercial common fields
    vacancyPct:       (op.vacancy * 100).toFixed(1),
    expenseRatioPct:  (op.expenseRatio * 100).toFixed(1),
    propTaxRatePct:   (taxRate * 100).toFixed(2),
    insurancePerUnit: ANNUAL_INSURANCE_PER_UNIT,
    utilitiesMonthly: MONTHLY_UTILITIES_PER_UNIT,
    targetCapRate:    capBench.target,
    exitCapRate:      capBench.target + 0.005,   // slight cap rate expansion at exit
    holdMonths:       hold,

    // BRRRR-specific
    refiLTV:          refi.conventionalLTV * 100,        // 75
    refiInterestPct:  6.5,                                 // current Canadian portfolio lender baseline
    refiAmortYears:   25,
    seasoningMonths:  refi.seasoningMonths,

    // Flip-specific
    rehabPerSqft:     rehabRate,
    realtorPct:       5,
    closingPct:       2,                                    // % of purchase, Canadian average
    titleTransferPct: 1,                                    // varies by province
    holdInsurance:    150,                                  // monthly during flip
  };
}

/**
 * One-line summary of what defaults will be applied. For UI tooltips.
 */
export function smartDefaultsSummary(address, strategy) {
  const d = getSmartDefaults(address, strategy);
  const m = d._smartDefaults;
  if (m.city === "default") {
    return `Generic Canadian defaults · ${m.targetCapPct.toFixed(1)}% target cap, ${d.vacancyPct}% vacancy, ${d.propTaxRatePct}% property tax`;
  }
  return `${m.city.charAt(0).toUpperCase() + m.city.slice(1)} defaults · ${m.targetCapPct.toFixed(1)}% target cap · ${d.vacancyPct}% vacancy · $${m.rehabPerSqft}/sqft rehab · ${d.propTaxRatePct}% property tax`;
}
