/**
 * Finance helpers — IRR + cumulative-flow utilities.
 *
 * The "annualised return" the rest of the codebase currently shows is
 * Equity Multiple^(1/n) − 1 (CAGR). That's NOT IRR. True IRR solves for r
 * in Σ CF_t / (1+r)^t = 0 across actual yearly cash flows, so it correctly
 * accounts for the timing of distributions and the exit hit in year N.
 *
 * For a flat-CF deal CAGR and IRR are close. For deals with growing rents
 * + big exit, IRR is materially higher than CAGR. For deals with operating
 * losses early and a back-end exit, IRR can be lower. Showing both is fine
 * and increasingly standard in institutional decks.
 */

/**
 * Internal Rate of Return.
 *
 * @param {number[]} cashFlows - period-indexed cash flows. cashFlows[0] is
 *   typically the initial outflow (negative). Subsequent entries are net
 *   cash to/from the investor in each period. Mixed signs are required for
 *   a real IRR to exist.
 * @param {number} [guess=0.1] - starting rate for Newton-Raphson.
 * @returns {number|null} the IRR as a decimal (0.18 = 18%), or null if no
 *   real IRR exists (all positive or all negative flows, or solver fails).
 */
export function irr(cashFlows, guess = 0.1) {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) return null;
  const hasPos = cashFlows.some(c => c > 0);
  const hasNeg = cashFlows.some(c => c < 0);
  if (!hasPos || !hasNeg) return null;

  const npv = (rate) => {
    let acc = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      acc += cashFlows[t] / Math.pow(1 + rate, t);
    }
    return acc;
  };
  const npvDeriv = (rate) => {
    let acc = 0;
    for (let t = 1; t < cashFlows.length; t++) {
      acc += -t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    return acc;
  };

  // Newton-Raphson with bounded steps.
  let rate = guess;
  for (let i = 0; i < 60; i++) {
    const f = npv(rate);
    if (Math.abs(f) < 1e-7) return rate;
    const df = npvDeriv(rate);
    if (Math.abs(df) < 1e-12) break;
    let next = rate - f / df;
    if (next <= -0.999) next = -0.95;
    if (next > 10) next = 10;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  // Bisection fallback over a wide range.
  let lo = -0.99, hi = 5;
  const fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fMid * npv(lo) < 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Add a `cumBtcf` running-total field to each row of a per-year projection.
 * Useful for area charts and the "have I recouped my capital?" line.
 */
export function withCumulative(proj, key = "btcfYr", outKey = "cumBtcf") {
  let running = 0;
  return proj.map(row => {
    running += Number(row[key]) || 0;
    return { ...row, [outKey]: running };
  });
}
