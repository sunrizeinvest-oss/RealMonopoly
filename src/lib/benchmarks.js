/**
 * Canadian real estate benchmarks — city + strategy + metric thresholds.
 *
 * The "what does normal look like for THIS market with THIS strategy"
 * lookup. Used by the DealCoach widget so users see their number against
 * a benchmark instead of staring at a naked metric.
 *
 * Sources (approximate, updated for 2024-2026):
 *   - CBRE Canadian Cap Rate Survey (multifamily, retail, office)
 *   - CMHC Rental Market Report (Oct 2023)
 *   - OSFI B-20 stress test rules (1.25 DSCR floor standard)
 *   - Canadian Real Estate Association (CREA) average sale prices
 *
 * Designed to give honest coaching — these are "what investors actually
 * underwrite to", not aspirational targets.
 */

// ── Cap rate benchmarks by metro + property type (decimal, not percent) ──
// e.g. CALGARY multifamily class B trades at 4.5-6.0% cap as of 2024.
const CAP_RATES = {
  calgary: {
    multifamily: { low: 0.045, target: 0.055, high: 0.065, note: "Class B Calgary multi — wider spread than YYZ/YVR" },
    flip:        { low: 0.000, target: 0.000, high: 0.000, note: "N/A for flips — measure on margin" },
    rental:      { low: 0.050, target: 0.060, high: 0.075, note: "Single-family rentals · YYC inner-city" },
  },
  edmonton: {
    multifamily: { low: 0.050, target: 0.060, high: 0.070, note: "Class B Edmonton — highest cap in major CA metros" },
    rental:      { low: 0.055, target: 0.065, high: 0.080, note: "YEG inner-city · widest spreads" },
  },
  vancouver: {
    multifamily: { low: 0.025, target: 0.035, high: 0.045, note: "Vancouver multi — tightest cap in Canada, lean on IRR" },
    rental:      { low: 0.030, target: 0.040, high: 0.050, note: "YVR inner-city · land-value-dominant" },
  },
  toronto: {
    multifamily: { low: 0.030, target: 0.040, high: 0.050, note: "GTA multifamily — appreciation play, low cap" },
    rental:      { low: 0.035, target: 0.045, high: 0.055, note: "GTA SFR · DSCR-constrained" },
  },
  ottawa: {
    multifamily: { low: 0.040, target: 0.050, high: 0.060, note: "Ottawa multi — government employment anchor" },
    rental:      { low: 0.045, target: 0.055, high: 0.065, note: "YOW rentals" },
  },
  hamilton: {
    multifamily: { low: 0.045, target: 0.055, high: 0.065, note: "Hamilton — GTA spill-over, value play" },
    rental:      { low: 0.050, target: 0.060, high: 0.070, note: "YHM rentals" },
  },
  mississauga: {
    multifamily: { low: 0.035, target: 0.045, high: 0.055, note: "Mississauga — GTA-adjacent, follows YYZ trends" },
    rental:      { low: 0.040, target: 0.050, high: 0.060, note: "Mississauga SFR" },
  },
  // Fallback if city not recognized
  default: {
    multifamily: { low: 0.040, target: 0.050, high: 0.065, note: "Canadian multi-family · broad average" },
    flip:        { low: 0.000, target: 0.000, high: 0.000, note: "N/A for flips" },
    rental:      { low: 0.045, target: 0.055, high: 0.070, note: "Canadian SFR rental · broad average" },
  },
};

// ── DSCR thresholds — what Canadian lenders actually underwrite to ────────
const DSCR = {
  lenderFloor:        1.20,   // Below this, conventional lenders pass
  competitive:        1.25,   // What CMHC / mid-tier lenders prefer
  strong:             1.35,   // What's actually finance-able in tight markets
  excellent:          1.50,   // Comfortable cushion for rate shocks
};

// ── Cash-on-Cash thresholds by strategy ───────────────────────────────────
const COC = {
  brrrr: {
    weak:       0.04,         // <4% post-refi = not really BRRRR
    target:     0.10,         // 10%+ post-refi = solid BRRRR
    strong:     0.18,         // 18%+ = excellent
    note: "Post-refi CoC matters most for BRRRR — pre-refi is just hold math",
  },
  rental: {
    weak:       0.05,
    target:     0.08,
    strong:     0.14,
    note: "Cash-on-cash on stabilized rental, year 1",
  },
  multifamily: {
    weak:       0.05,
    target:     0.08,
    strong:     0.14,
    note: "MF CoC tends to grow with cap rate compression + rent growth",
  },
};

// ── IRR thresholds by strategy ────────────────────────────────────────────
const IRR = {
  multifamily: {
    weak:       0.08,
    target:     0.14,
    strong:     0.20,
    note: "5-year levered IRR · what LP money expects on multifamily",
  },
  flip: {
    weak:       0.20,         // 20% annualized = boring
    target:     0.40,
    strong:     0.80,
    note: "Annualized return on flip — should be 2-3x rental IRR for the risk",
  },
};

// ── Flip margin thresholds (profit / ARV) ─────────────────────────────────
const FLIP_MARGIN = {
  calgary:    { weak: 0.10, target: 0.18, strong: 0.25, note: "Calgary flip margin — 18%+ on ARV is GO territory" },
  edmonton:   { weak: 0.12, target: 0.20, strong: 0.28, note: "YEG flips need higher margin to offset slower exit" },
  vancouver:  { weak: 0.08, target: 0.14, strong: 0.22, note: "YVR flip margins tight but absolute profit large" },
  toronto:    { weak: 0.10, target: 0.16, strong: 0.24, note: "GTA flips — competitive, margin compression" },
  ottawa:     { weak: 0.12, target: 0.18, strong: 0.26, note: "YOW flips — steady market, moderate margins" },
  hamilton:   { weak: 0.14, target: 0.22, strong: 0.30, note: "YHM flips — value play, need bigger margins" },
  default:    { weak: 0.12, target: 0.18, strong: 0.25, note: "Canadian flip margin · broad average" },
};

// ── Operating ratios (expense % of GPR, vacancy %) ────────────────────────
const OPERATING = {
  vacancy: {
    multifamily: { typical: 0.05, calgary: 0.02, vancouver: 0.01, toronto: 0.02, ottawa: 0.025, edmonton: 0.04 },
    rental:      { typical: 0.07 },
  },
  expenseRatio: {
    multifamily: { typical: 0.40, low: 0.30, high: 0.50, note: "Of EGI — includes property tax, insurance, maintenance, mgmt" },
    rental:      { typical: 0.35, low: 0.25, high: 0.45, note: "Single-family expense ratio is lower (no common area, no mgmt fee)" },
  },
};

// ── BRRRR refi LTV (what Canadian lenders will refi to) ───────────────────
const BRRRR_REFI = {
  conventionalLTV:    0.75,   // Standard refi after seasoning
  insuredLTV:         0.80,   // With CMHC insurance (rare on refi)
  conservativeLTV:    0.70,   // What private/portfolio lenders offer
  seasoningMonths:    6,      // Most lenders require 6 months before refi
  note: "Canadian lenders cap refi at 75% LTV for investment properties — 80% requires CMHC insurance on refi which is rare.",
};

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve a city slug from an address string. Best-effort — falls back
 * to "default" if no match.
 */
export function detectCitySlug(address) {
  if (!address) return "default";
  const a = String(address).toLowerCase();
  if (/calgary|airdrie|cochrane|okotoks|chestermere/.test(a)) return "calgary";
  if (/edmonton|sherwood park|st\.? albert|spruce grove|leduc/.test(a)) return "edmonton";
  if (/vancouver|burnaby|richmond|surrey|north van|west van|coquitlam|delta/.test(a)) return "vancouver";
  if (/mississauga|streetsville|cooksville|port credit/.test(a)) return "mississauga";
  if (/hamilton|dundas|ancaster|stoney creek|waterdown/.test(a)) return "hamilton";
  if (/toronto|north york|scarborough|etobicoke|markham|vaughan|brampton|oakville|burlington|richmond hill/.test(a)) return "toronto";
  if (/ottawa|gatineau|kanata|orleans|orléans|nepean/.test(a)) return "ottawa";
  return "default";
}

export function getCapRateBenchmark(citySlug, propertyType = "multifamily") {
  const city = CAP_RATES[citySlug] || CAP_RATES.default;
  return city[propertyType] || city.multifamily || CAP_RATES.default.multifamily;
}

export function getFlipMarginBenchmark(citySlug) {
  return FLIP_MARGIN[citySlug] || FLIP_MARGIN.default;
}

export function getDscrThresholds() {
  return DSCR;
}

export function getCoCThresholds(strategy = "rental") {
  return COC[strategy] || COC.rental;
}

export function getIrrThresholds(strategy = "multifamily") {
  return IRR[strategy] || IRR.multifamily;
}

export function getOperatingDefaults(citySlug, propertyType = "multifamily") {
  const v = OPERATING.vacancy[propertyType] || {};
  const e = OPERATING.expenseRatio[propertyType] || {};
  return {
    vacancy:       v[citySlug] ?? v.typical ?? 0.05,
    expenseRatio:  e.typical ?? 0.40,
    expenseLow:    e.low ?? 0.30,
    expenseHigh:   e.high ?? 0.50,
    note:          e.note,
  };
}

export function getBrrrrRefiDefaults() {
  return BRRRR_REFI;
}

/**
 * Grade a value against a (weak / target / strong) threshold trio.
 * Returns one of: "weak" | "ok" | "target" | "strong" | "excellent"
 * Higher-is-better metrics by default; pass invert: true for the opposite.
 */
export function gradeMetric(value, { weak, target, strong, invert = false } = {}) {
  if (value == null || !isFinite(value)) return "unknown";
  if (invert) {
    if (value > weak)     return "weak";
    if (value > target)   return "ok";
    if (value > strong)   return "target";
    return "strong";
  }
  if (value < weak)     return "weak";
  if (value < target)   return "ok";
  if (value < strong)   return "target";
  return "strong";
}

/**
 * Plain-English coaching note for a metric. The DealCoach surfaces this
 * inline so users learn while they work.
 */
export function coachingNote(metric, value, ctx = {}) {
  if (value == null || !isFinite(value)) return null;
  const fmt$ = n => `$${Math.round(n).toLocaleString()}`;
  const fmtPct = n => `${(n * 100).toFixed(1)}%`;
  const fmtN = n => n.toFixed(2);

  switch (metric) {
    case "dscr": {
      if (value < DSCR.lenderFloor)  return { tone: "warn",    text: `${fmtN(value)} is below the ${DSCR.lenderFloor} lender floor. Most Canadian banks will pass. Either lower the purchase price, increase down payment, or boost rents.` };
      if (value < DSCR.competitive)  return { tone: "caution", text: `${fmtN(value)} clears the lender floor (${DSCR.lenderFloor}) but is below the ${DSCR.competitive} threshold most banks prefer for investment property.` };
      if (value < DSCR.strong)       return { tone: "ok",      text: `${fmtN(value)} is solid — comfortably above the ${DSCR.competitive} bank threshold.` };
      return { tone: "great", text: `${fmtN(value)} is excellent — comfortable cushion against rate shocks.` };
    }
    case "capRate": {
      const bench = getCapRateBenchmark(ctx.citySlug || "default", ctx.propertyType || "multifamily");
      if (value < bench.low)    return { tone: "warn",    text: `${fmtPct(value)} is below the ${fmtPct(bench.low)} floor for ${ctx.citySlug || "this market"}. Either you're paying too much or the NOI is too thin.` };
      if (value > bench.high)   return { tone: "great",   text: `${fmtPct(value)} is above the ${fmtPct(bench.high)} ceiling for ${ctx.citySlug || "this market"} — verify the rents are real and the expenses are full.` };
      return { tone: "ok", text: `${fmtPct(value)} is in the ${fmtPct(bench.low)}-${fmtPct(bench.high)} range typical for ${ctx.citySlug || "this market"} ${ctx.propertyType || "multifamily"}.` };
    }
    case "coc": {
      const t = getCoCThresholds(ctx.strategy || "rental");
      if (value < t.weak)   return { tone: "warn",    text: `${fmtPct(value)} cash-on-cash is below the ${fmtPct(t.weak)} weak threshold. Cash-poor for a ${ctx.strategy || "rental"} deal.` };
      if (value < t.target) return { tone: "caution", text: `${fmtPct(value)} is below the ${fmtPct(t.target)} target for ${ctx.strategy || "rental"}. Year-1 cash flow will be thin.` };
      if (value < t.strong) return { tone: "ok",      text: `${fmtPct(value)} CoC is solid — above the ${fmtPct(t.target)} ${ctx.strategy || "rental"} target.` };
      return { tone: "great", text: `${fmtPct(value)} is excellent — top-quartile ${ctx.strategy || "rental"} CoC.` };
    }
    case "flipMargin": {
      const b = getFlipMarginBenchmark(ctx.citySlug || "default");
      if (value < b.weak)   return { tone: "warn",    text: `${fmtPct(value)} margin is below the ${fmtPct(b.weak)} weak floor for ${ctx.citySlug || "this market"}. Thin for the timeline + hold-cost risk.` };
      if (value < b.target) return { tone: "caution", text: `${fmtPct(value)} margin is below the ${fmtPct(b.target)} target. Margin of safety is small.` };
      if (value < b.strong) return { tone: "ok",      text: `${fmtPct(value)} margin is solid for ${ctx.citySlug || "this market"} — above the ${fmtPct(b.target)} target.` };
      return { tone: "great", text: `${fmtPct(value)} margin is excellent — well above the ${fmtPct(b.strong)} strong threshold.` };
    }
    case "irr": {
      const t = getIrrThresholds(ctx.strategy || "multifamily");
      if (value < t.weak)   return { tone: "warn",    text: `${fmtPct(value)} IRR is below the ${fmtPct(t.weak)} floor. LP capital won't write a check at this return.` };
      if (value < t.target) return { tone: "caution", text: `${fmtPct(value)} is below the ${fmtPct(t.target)} target for ${ctx.strategy || "multifamily"}.` };
      if (value < t.strong) return { tone: "ok",      text: `${fmtPct(value)} IRR is solid — above the ${fmtPct(t.target)} target.` };
      return { tone: "great", text: `${fmtPct(value)} IRR is institutional-grade.` };
    }
    default:
      return null;
  }
}
