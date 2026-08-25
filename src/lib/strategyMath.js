/**
 * strategyMath.js — pure "run all 4 strategies against a property" module.
 *
 * Input: a property blob shaped like what /property loads
 *   { purchasePrice, estimatedValue, rentEstimate, sqft, beds, baths,
 *     propertyTaxAnnual, address, city, province, units, zoning }
 *
 * Output: 4 verdict objects (Flip, BRRRR, Buy&Hold, Multifamily) with
 *   headline metrics, viability flag, and a color-coded verdict.
 *
 * Numbers are back-of-envelope — they use city defaults from benchmarks.js
 * and refinance defaults from BRRRR_REFI. The full calculator per strategy
 * has more knobs (holding period, exit cap, capex reserve, etc.) — this
 * module is the "does this deal even work?" first pass.
 */

import { estimateARV } from "./arv.js";
import { irr } from "./finance.js";
import {
  detectCitySlug,
  getCapRateBenchmark,
  getOperatingDefaults,
  getBrrrrRefiDefaults,
} from "./benchmarks.js";

// ── Constants — sane defaults for back-of-envelope math ──
const MORTGAGE_RATE       = 0.065;   // 6.5% — mid-2026 Canadian 5yr fixed
const AMORT_YEARS         = 30;
const REHAB_PSF           = 50;      // $50/sqft light-to-mid rehab
const APPRECIATION_ANNUAL = 0.03;    // 3% annual, conservative
const HOLD_YEARS          = 5;       // for IRR calculations
const MGMT_RATE           = 0.08;    // 8% property management
const INSURANCE_ANNUAL_PSF = 0.75;   // ~$0.75/sqft/yr for SFH
const CLOSING_COSTS_IN    = 0.02;    // 2% land transfer + legal
const CLOSING_COSTS_OUT   = 0.06;    // 5% agent commission + 1% legal

/** Monthly P+I on an amortizing loan */
function mortgagePayment(principal, annualRate = MORTGAGE_RATE, years = AMORT_YEARS) {
  if (!principal || principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Remaining loan balance after N months of payments */
function loanBalanceAfter(principal, months, annualRate = MORTGAGE_RATE, years = AMORT_YEARS) {
  if (!principal || principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  const pmt = mortgagePayment(principal, annualRate, years);
  return principal * Math.pow(1 + r, months) - pmt * ((Math.pow(1 + r, months) - 1) / r);
}

function verdictFrom(score) {
  if (score >= 3) return { label: "STRONG",  color: "#16a34a" };
  if (score >= 2) return { label: "GO",      color: "#22c55e" };
  if (score >= 1) return { label: "CAUTION", color: "#eab308" };
  return              { label: "PASS",    color: "#dc2626" };
}

/** ═══════════════════════════ FIX & FLIP ═══════════════════════════ */
function runFlip(p, citySlug) {
  const purchase = Number(p.purchasePrice || p.estimatedValue || 0);
  const sqft     = Number(p.sqft || 0);

  if (!purchase || !sqft) {
    return { key: "flip", viable: false, reason: "Need purchase price + sqft", route: "/brrrr" };
  }

  const rehab = Math.round(sqft * REHAB_PSF);
  const arv = estimateARV({
    purchasePrice: purchase,
    estimatedValue: p.estimatedValue,
    repairCost: rehab,
    sqft, beds: p.beds,
  });
  if (!arv?.mid) {
    return { key: "flip", viable: false, reason: "Not enough data to project ARV", route: "/brrrr" };
  }

  const closingIn   = purchase * CLOSING_COSTS_IN;
  const closingOut  = arv.mid  * CLOSING_COSTS_OUT;
  const holdMonths  = 6;
  const holdingCost = holdMonths * ((Number(p.propertyTaxAnnual) || purchase * 0.01) / 12 + sqft * INSURANCE_ANNUAL_PSF / 12 + 200);
  const netProfit   = arv.mid - purchase - rehab - closingIn - closingOut - holdingCost;
  const invested    = purchase + rehab + closingIn + holdingCost;
  const roi         = invested > 0 ? netProfit / invested : 0;
  const annualized  = roi * (12 / holdMonths);

  const score = (roi >= 0.20 ? 2 : roi >= 0.10 ? 1 : 0) + (netProfit >= 50_000 ? 1 : 0);

  return {
    key: "flip",
    name: "Fix & Flip",
    icon: "🏚️",
    viable: true,
    verdict: verdictFrom(score),
    headline: `${netProfit >= 0 ? "+" : ""}$${Math.round(netProfit / 1000)}K profit`,
    subhead: `${(roi * 100).toFixed(1)}% ROI in ${holdMonths} mo`,
    metrics: [
      { label: "ARV mid",    value: `$${Math.round(arv.mid / 1000)}K` },
      { label: "Rehab est",  value: `$${Math.round(rehab / 1000)}K` },
      { label: "Net profit", value: `${netProfit >= 0 ? "+" : ""}$${Math.round(netProfit / 1000)}K` },
      { label: "Annualized", value: `${(annualized * 100).toFixed(0)}%` },
    ],
    route: "/flip",
    prefill: { strategy: "flip", purchasePrice: purchase, repairCost: rehab, arv: arv.mid, sqft, address: p.address },
  };
}

/** ═══════════════════════════ BRRRR ═══════════════════════════ */
function runBrrrr(p, citySlug) {
  const purchase = Number(p.purchasePrice || p.estimatedValue || 0);
  const sqft     = Number(p.sqft || 0);
  const rent     = Number(p.rentEstimate || 0);

  if (!purchase || !sqft || !rent) {
    return { key: "brrrr", viable: false, reason: "Need purchase, sqft, and rent estimate", route: "/brrrr" };
  }

  const rehab = Math.round(sqft * REHAB_PSF);
  const arv = estimateARV({
    purchasePrice: purchase,
    estimatedValue: p.estimatedValue,
    repairCost: rehab,
    sqft, beds: p.beds,
  });
  if (!arv?.mid) {
    return { key: "brrrr", viable: false, reason: "Not enough data to project ARV", route: "/brrrr" };
  }

  const refi = getBrrrrRefiDefaults();
  const refiAmount   = arv.mid * (refi?.ltv || 0.75);
  const closingIn    = purchase * CLOSING_COSTS_IN;
  const cashInvested = purchase + rehab + closingIn - refiAmount;

  const opDefaults = getOperatingDefaults(citySlug, "residential");
  const monthlyTax = (Number(p.propertyTaxAnnual) || purchase * 0.01) / 12;
  const monthlyInsurance = (sqft * INSURANCE_ANNUAL_PSF) / 12;
  const monthlyOp = rent * (opDefaults.vacancy + MGMT_RATE + 0.08) + monthlyTax + monthlyInsurance;
  const debtSvc  = mortgagePayment(refiAmount);
  const cashflow = rent - monthlyOp - debtSvc;

  const coc = cashInvested > 0 ? (cashflow * 12) / cashInvested : Infinity;
  const fiveYrAppreciation = arv.mid * (Math.pow(1 + APPRECIATION_ANNUAL, 5) - 1);
  const fiveYrPrincipalPaid = refiAmount - loanBalanceAfter(refiAmount, 60);
  const fiveYrEquityGain = fiveYrAppreciation + fiveYrPrincipalPaid + cashflow * 12 * 5;

  const score =
    (cashInvested <= 0 ? 2 : cashInvested <= purchase * 0.10 ? 1 : 0) +
    (cashflow >= 200 ? 1 : cashflow >= 0 ? 0 : -1);

  return {
    key: "brrrr",
    name: "BRRRR",
    icon: "🔄",
    viable: true,
    verdict: verdictFrom(Math.max(0, score)),
    headline: cashInvested <= 0 ? "Infinite CoC" : `${(coc * 100).toFixed(0)}% CoC`,
    subhead: `$${Math.round(cashflow)}/mo cashflow · $${Math.round(cashInvested / 1000)}K left in`,
    metrics: [
      { label: "ARV mid",    value: `$${Math.round(arv.mid / 1000)}K` },
      { label: "Refi @ 75%", value: `$${Math.round(refiAmount / 1000)}K` },
      { label: "Cash left in", value: cashInvested <= 0 ? "$0 (all out)" : `$${Math.round(cashInvested / 1000)}K` },
      { label: "5-yr equity", value: `$${Math.round(fiveYrEquityGain / 1000)}K` },
    ],
    route: "/brrrr",
    prefill: { strategy: "brrrr", purchasePrice: purchase, repairCost: rehab, arv: arv.mid, monthlyRent: rent, sqft, address: p.address },
  };
}

/** ═══════════════════════════ BUY & HOLD (no rehab) ═══════════════════════════ */
function runBuyHold(p, citySlug) {
  const purchase = Number(p.purchasePrice || p.estimatedValue || 0);
  const rent     = Number(p.rentEstimate || 0);
  const sqft     = Number(p.sqft || 0);

  if (!purchase || !rent) {
    return { key: "hold", viable: false, reason: "Need purchase price + rent", route: "/brrrr" };
  }

  const downPct  = 0.20;
  const down     = purchase * downPct;
  const loan     = purchase - down;
  const closingIn = purchase * CLOSING_COSTS_IN;
  const cashInvested = down + closingIn;

  const opDefaults = getOperatingDefaults(citySlug, "residential");
  const monthlyTax = (Number(p.propertyTaxAnnual) || purchase * 0.01) / 12;
  const monthlyInsurance = (sqft ? sqft * INSURANCE_ANNUAL_PSF / 12 : purchase * 0.005 / 12);
  const monthlyOp = rent * (opDefaults.vacancy + MGMT_RATE + 0.08) + monthlyTax + monthlyInsurance;
  const debtSvc = mortgagePayment(loan);
  const cashflow = rent - monthlyOp - debtSvc;

  const annualCashflow = cashflow * 12;
  const coc  = cashInvested > 0 ? annualCashflow / cashInvested : 0;
  const noi  = (rent - monthlyOp) * 12;
  const capRate = purchase > 0 ? noi / purchase : 0;

  // 5-year IRR: [-cash, y1, y2, y3, y4, y5 + exit equity]
  const salePrice = purchase * Math.pow(1 + APPRECIATION_ANNUAL, HOLD_YEARS);
  const loanBalYr5 = loanBalanceAfter(loan, HOLD_YEARS * 12);
  const exitEquity = salePrice - loanBalYr5 - salePrice * CLOSING_COSTS_OUT;
  const flows = [-cashInvested, annualCashflow, annualCashflow, annualCashflow, annualCashflow, annualCashflow + exitEquity];
  const irrPct = irr(flows) || 0;

  const score = (coc >= 0.08 ? 2 : coc >= 0.04 ? 1 : 0) + (cashflow >= 200 ? 1 : cashflow >= 0 ? 0 : -1);

  return {
    key: "hold",
    name: "Buy & Hold",
    icon: "🏠",
    viable: true,
    verdict: verdictFrom(Math.max(0, score)),
    headline: `${(coc * 100).toFixed(1)}% CoC`,
    subhead: `$${Math.round(cashflow)}/mo · ${(irrPct * 100).toFixed(1)}% 5-yr IRR`,
    metrics: [
      { label: "Down (20%)",   value: `$${Math.round(down / 1000)}K` },
      { label: "Cashflow/mo",  value: `${cashflow >= 0 ? "+" : ""}$${Math.round(cashflow)}` },
      { label: "Cap rate",     value: `${(capRate * 100).toFixed(2)}%` },
      { label: "5-yr IRR",     value: `${(irrPct * 100).toFixed(1)}%` },
    ],
    route: "/brrrr",
    prefill: { strategy: "hold", purchasePrice: purchase, monthlyRent: rent, sqft, address: p.address },
  };
}

/** ═══════════════════════════ MULTIFAMILY (5+ units) ═══════════════════════════ */
function runMultifamily(p, citySlug) {
  const purchase = Number(p.purchasePrice || p.estimatedValue || 0);
  const units    = Number(p.units || 0);
  const rentPerDoor = Number(p.rentEstimate || 0);
  const zoning = String(p.zoning || "").toUpperCase();
  const zoningIsMf = /R-?C[GBM]|R-?M|CC|MU|C-N/.test(zoning);

  const canRun = units >= 4 || (zoningIsMf && rentPerDoor > 0);
  if (!canRun) {
    return {
      key: "mf",
      viable: false,
      reason: units > 0 && units < 4 ? "SFH / small — see Buy & Hold" : "Need unit count (or MF zoning + rent/door)",
      route: "/commercial",
    };
  }
  if (!purchase || !rentPerDoor) {
    return { key: "mf", viable: false, reason: "Need purchase price + rent per door", route: "/commercial" };
  }

  const effectiveUnits = units || 5;
  const grossRent = rentPerDoor * effectiveUnits * 12;
  const vacancy = 0.05;
  const expenseRatio = 0.40;
  const noi = grossRent * (1 - vacancy) * (1 - expenseRatio);
  const capRate = noi / purchase;

  const down = purchase * 0.25;
  const loan = purchase - down;
  const debtAnnual = mortgagePayment(loan) * 12;
  const dscr = debtAnnual > 0 ? noi / debtAnnual : 0;

  const bench = getCapRateBenchmark(citySlug, "multifamily");
  const capInRange = capRate >= (bench?.low || 0.04);

  // 5-year IRR — assume rent + expenses grow 2.5%/yr, exit at same cap
  const flows = [-down];
  let yrNoi = noi;
  for (let y = 1; y <= HOLD_YEARS; y++) {
    yrNoi *= 1.025;
    const cf = yrNoi - debtAnnual;
    if (y === HOLD_YEARS) {
      const exitPrice = yrNoi / (bench?.typical || capRate);
      const balance = loanBalanceAfter(loan, HOLD_YEARS * 12);
      flows.push(cf + exitPrice - balance - exitPrice * CLOSING_COSTS_OUT);
    } else {
      flows.push(cf);
    }
  }
  const irrPct = irr(flows) || 0;

  const score = (dscr >= 1.25 ? 2 : dscr >= 1.10 ? 1 : 0) + (capInRange ? 1 : 0);

  return {
    key: "mf",
    name: "Multifamily",
    icon: "🏢",
    viable: true,
    verdict: verdictFrom(score),
    headline: `${(capRate * 100).toFixed(2)}% cap`,
    subhead: `DSCR ${dscr.toFixed(2)} · ${(irrPct * 100).toFixed(1)}% 5-yr IRR`,
    metrics: [
      { label: "Units",        value: `${effectiveUnits}${units ? "" : " est"}` },
      { label: "NOI",          value: `$${Math.round(noi / 1000)}K` },
      { label: "DSCR",         value: dscr.toFixed(2) },
      { label: "5-yr IRR",     value: `${(irrPct * 100).toFixed(1)}%` },
    ],
    route: "/commercial",
    prefill: { strategy: "mf", purchasePrice: purchase, units: effectiveUnits, rentPerDoor, address: p.address },
  };
}

/**
 * Run all 4 strategies against a property. Returns an array in the display
 * order (Buy&Hold first for SFH, MF first for 4+ units).
 */
export function runAllStrategies(property = {}) {
  const citySlug = detectCitySlug(property.address || `${property.city || ""} ${property.province || ""}`);

  const results = [
    runBuyHold(property, citySlug),
    runBrrrr(property, citySlug),
    runFlip(property, citySlug),
    runMultifamily(property, citySlug),
  ];

  // For 4+ unit / MF-zoned properties, promote MF to the front.
  const units = Number(property.units || 0);
  const zoning = String(property.zoning || "").toUpperCase();
  const zoningIsMf = /R-?C[GBM]|R-?M|CC|MU|C-N/.test(zoning);
  if (units >= 4 || zoningIsMf) {
    const mf = results.find(r => r.key === "mf");
    const others = results.filter(r => r.key !== "mf");
    return [mf, ...others].filter(Boolean);
  }
  return results;
}
