/**
 * Monte Carlo simulator for a multifamily deal.
 *
 * Runs N independent simulations of a deal. Each draws rent growth,
 * exit cap, vacancy, interest-rate trajectory, and operating-cost growth
 * from the user's distributions, then runs a simplified cash-flow model
 * to compute IRR / equity multiple / DSCR-over-time / terminal value.
 *
 * Returns the full sorted distributions so the UI can show P10/P50/P90
 * percentiles, probability-of-outcome bars, and a histogram.
 *
 * Distributions:
 *   - rentGrowth, exitCap, vacancy, rateShock — Normal (Box-Muller)
 *   - constructionMultiplier — log-normal (skewed risk of overrun)
 *
 * The model is intentionally simplified vs. the full underwriter — Monte
 * Carlo needs to run 1000× per click in < 200ms. We trade per-sim fidelity
 * for statistical accuracy.
 */
import { irr as solveIRR } from "./finance";

// ── Box-Muller normal sample. Returns one value at a time. ─────────────
function sampleNormal(mean, sigma) {
  // Avoid log(0) by clamping u1 above ε
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Log-normal centred at `median` with σ in log space. Always positive.
function sampleLogNormal(median, sigma) {
  return median * Math.exp(sampleNormal(0, sigma));
}

// ── Default distribution specs ─────────────────────────────────────────
export const DEFAULT_DISTRIBUTIONS = {
  rentGrowthMean:    3.0,   // %/yr
  rentGrowthSigma:   1.0,   // %/yr
  exitCapMean:       null,  // %/yr — if null, uses entryCap + 0.25 (cap expansion)
  exitCapSigma:      0.5,   // %/yr
  vacancyMean:       7.0,   // %
  vacancySigma:      2.0,   // %
  rateShockMean:     0.0,   // %/yr added to base rate
  rateShockSigma:    0.75,  // %/yr (1.5% rate move = 2σ)
  opexGrowthMean:    2.0,   // %/yr
  opexGrowthSigma:   0.5,   // %/yr
  constructionMedian: 1.0,  // multiplier on renoBudget; 1.0 = on-budget
  constructionSigma:  0.15, // log-σ — 15% std-dev in log space
};

// ── Single-deal simulator ──────────────────────────────────────────────
function simulateOnce(deal, sample) {
  const {
    purchasePrice, downPct, renoBudget, monthlyIncome,
    holdYears, baseInterestRate, amortYears, entryCap, targetIRR,
    mgmtPct = 0.09, taxAnnual = 0, insuranceAnnual = 0, otherOpex = 0,
  } = deal;

  const equityIn = purchasePrice * downPct + sample.constructionMultiplier * renoBudget;
  const loanAmount = purchasePrice * (1 - downPct);
  const effectiveRate = (baseInterestRate + sample.rateShock) / 100;
  const monthlyRate = effectiveRate / 12;
  const nMonths = amortYears * 12;
  const monthlyPI = monthlyRate > 0
    ? loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -nMonths))
    : loanAmount / nMonths;
  const annualDebtService = monthlyPI * 12;

  // Year-by-year cash flow
  let rent = monthlyIncome * 12;
  let opex = mgmtPct * rent + taxAnnual + insuranceAnnual + otherOpex;
  const cashFlows = [-equityIn];
  let minDSCR = Infinity;
  let yearOneNOI = 0;

  for (let y = 1; y <= holdYears; y++) {
    const occRent = rent * (1 - sample.vacancy / 100);
    const noi = occRent - opex;
    const cfOps = noi - annualDebtService;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 999;
    if (dscr < minDSCR) minDSCR = dscr;
    if (y === 1) yearOneNOI = noi;

    if (y < holdYears) {
      cashFlows.push(cfOps);
    } else {
      // Exit in year N: terminal value = NOI / exitCap, less sale costs (~4%),
      // less remaining loan balance.
      const exitValue = noi / (sample.exitCap / 100);
      const sellCosts = exitValue * 0.04;
      // Remaining loan balance after holdYears of payments
      const yearsPaid = holdYears;
      const balance = monthlyRate > 0
        ? loanAmount * (Math.pow(1 + monthlyRate, nMonths) - Math.pow(1 + monthlyRate, yearsPaid * 12)) / (Math.pow(1 + monthlyRate, nMonths) - 1)
        : loanAmount * (1 - yearsPaid / amortYears);
      const netExit = exitValue - sellCosts - balance;
      cashFlows.push(cfOps + netExit);
    }
    rent     *= (1 + sample.rentGrowth / 100);
    opex     *= (1 + sample.opexGrowth / 100);
  }

  const irr = solveIRR(cashFlows);
  const totalReturn = cashFlows.slice(1).reduce((s, x) => s + x, 0);
  const eqMultiple = equityIn > 0 ? (totalReturn + equityIn) / equityIn : 0;
  const meetsIRRTarget = irr != null && irr >= (targetIRR ?? 0.15);
  const meetsDSCR = minDSCR >= 1.25;
  const positiveIRR = irr != null && irr > 0;

  return { irr, eqMultiple, minDSCR, yearOneNOI, meetsIRRTarget, meetsDSCR, positiveIRR };
}

// ── Public runner ──────────────────────────────────────────────────────
export function runMonteCarlo(deal, options = {}) {
  const {
    iterations = 1000,
    distributions: distOverrides = {},
  } = options;

  const D = { ...DEFAULT_DISTRIBUTIONS, ...distOverrides };
  const exitCapMean = D.exitCapMean ?? (deal.entryCap + 0.25);

  const irrs = [];
  const eqMults = [];
  const minDSCRs = [];
  let countDSCROk = 0, countIRROk = 0, countPositiveIRR = 0;

  for (let i = 0; i < iterations; i++) {
    const sample = {
      rentGrowth:             sampleNormal(D.rentGrowthMean,  D.rentGrowthSigma),
      exitCap:    Math.max(0.5, sampleNormal(exitCapMean,     D.exitCapSigma)),
      vacancy:    Math.max(0,   sampleNormal(D.vacancyMean,   D.vacancySigma)),
      rateShock:                sampleNormal(D.rateShockMean, D.rateShockSigma),
      opexGrowth:               sampleNormal(D.opexGrowthMean, D.opexGrowthSigma),
      constructionMultiplier:   sampleLogNormal(D.constructionMedian, D.constructionSigma),
    };
    const r = simulateOnce(deal, sample);
    if (r.irr != null) {
      irrs.push(r.irr);
      eqMults.push(r.eqMultiple);
      minDSCRs.push(r.minDSCR);
    }
    if (r.meetsDSCR)     countDSCROk++;
    if (r.meetsIRRTarget) countIRROk++;
    if (r.positiveIRR)   countPositiveIRR++;
  }

  irrs.sort((a, b) => a - b);
  eqMults.sort((a, b) => a - b);
  minDSCRs.sort((a, b) => a - b);

  const pct = (arr, p) => {
    if (!arr.length) return null;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(p * arr.length)));
    return arr[idx];
  };

  return {
    iterations,
    validSimulations: irrs.length,
    irr:     { p10: pct(irrs, 0.10), p50: pct(irrs, 0.50), p90: pct(irrs, 0.90) },
    eqMult:  { p10: pct(eqMults, 0.10), p50: pct(eqMults, 0.50), p90: pct(eqMults, 0.90) },
    minDSCR: { p10: pct(minDSCRs, 0.10), p50: pct(minDSCRs, 0.50), p90: pct(minDSCRs, 0.90) },
    probabilities: {
      meetsDSCR125:  countDSCROk     / iterations,
      meetsIRRTarget: countIRROk      / iterations,
      positiveIRR:   countPositiveIRR / iterations,
    },
    distributions: { irr: irrs, eqMult: eqMults, minDSCR: minDSCRs },
  };
}
