/**
 * Generates docs/sample-ic-memo.pdf — the institutional deliverable an
 * investor can download as proof-of-output for the pitch package.
 *
 * Uses tier1Memo.generateTier1Memo with realistic Calgary 24-unit multifamily
 * data, including the Loss-to-Lease analysis that renders as page 2.
 *
 * Run:
 *   node scripts/generate-sample-memo.mjs
 *
 * Re-run after material changes to tier1Memo.js so the sample PDF stays
 * representative of current output.
 */

import { generateTier1Memo } from "../src/lib/tier1Memo.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../docs/sample-ic-memo.pdf");

// ── Sample deal: 24-unit Calgary multifamily (Bridgeland) ──
const deal = {
  address:       "412-422 Edmonton Trail NE, Calgary AB",
  purchasePrice: 4_800_000,
  yearBuilt:     1968,
  beds:          24,
  baths:         24,
  sqft:          22_400,
};

// ── Underwriting summary ──
const fmtM = n => n == null ? "—" : `$${Math.round(n).toLocaleString()}`;
const fmtP = n => n == null ? "—" : `${(Number(n) * 100).toFixed(1)}%`;

const tiles = [
  { label: "NOI",       value: fmtM(268_400) },
  { label: "Cap rate",  value: "5.6%",        color: "#16a34a" },
  { label: "DSCR",      value: "1.31x",       color: "#16a34a" },
  { label: "Cash flow", value: fmtM(34_200),  color: "#16a34a" },
];

const rows = [
  { label: "Purchase price",       value: fmtM(4_800_000) },
  { label: "Down payment (30%)",   value: fmtM(1_440_000) },
  { label: "Total cash in",        value: fmtM(1_540_000), emphasis: true },
  { break: true },
  { label: "Gross potential rent", value: fmtM(389_400) },
  { label: "Vacancy loss (4.6%)",  value: fmtM(17_912) },
  { label: "Effective gross income", value: fmtM(371_488) },
  { label: "Total OpEx",           value: fmtM(103_088) },
  { label: "Net operating income", value: fmtM(268_400), emphasis: true, color: "#16a34a" },
  { break: true },
  { label: "Annual debt service",  value: fmtM(204_960) },
  { label: "Before-tax cash flow", value: fmtM(34_200), color: "#16a34a" },
  { label: "Cash-on-cash return",  value: "2.22%" },
  { label: "Cap rate (actual)",    value: "5.6%" },
  { label: "DSCR",                 value: "1.31x" },
];

// ── Sample LTL data — renders as page 2 ──
const ltl = {
  ok: true,
  totals: {
    doors:           24,
    pricedDoors:     22,
    actualMonthly:   25_120,
    marketMonthly:   40_700,
    deltaMonthly:    15_580,
    deltaAnnual:     186_960,
    perDoorMonthly:  708,
    avgUpsidePct:    0.383,
    stranded5Year:   560_880,
    stranded5YearNPV: 460_120,
  },
  units: [
    { unit: "101", bedrooms: 2, sqft: 850, actualRent: 1180, marketRent: 1893, deltaMonthly: 713, deltaPct: 0.377, status: "below" },
    { unit: "102", bedrooms: 2, sqft: 850, actualRent: 1250, marketRent: 1893, deltaMonthly: 643, deltaPct: 0.340, status: "below" },
    { unit: "103", bedrooms: 1, sqft: 620, actualRent: 1050, marketRent: 1553, deltaMonthly: 503, deltaPct: 0.324, status: "below" },
    { unit: "104", bedrooms: 2, sqft: 850, actualRent: 1320, marketRent: 1893, deltaMonthly: 573, deltaPct: 0.303, status: "below" },
    { unit: "105", bedrooms: 1, sqft: 620, actualRent: 1080, marketRent: 1553, deltaMonthly: 473, deltaPct: 0.304, status: "below" },
    { unit: "201", bedrooms: 2, sqft: 850, actualRent: 1280, marketRent: 1893, deltaMonthly: 613, deltaPct: 0.324, status: "below" },
    { unit: "202", bedrooms: 2, sqft: 850, actualRent: 1350, marketRent: 1893, deltaMonthly: 543, deltaPct: 0.287, status: "below" },
    { unit: "203", bedrooms: 3, sqft: 1100, actualRent: 1750, marketRent: 2137, deltaMonthly: 387, deltaPct: 0.181, status: "below" },
    { unit: "204", bedrooms: 1, sqft: 620, actualRent: 1150, marketRent: 1553, deltaMonthly: 403, deltaPct: 0.260, status: "below" },
    { unit: "205", bedrooms: 2, sqft: 850, actualRent: 1400, marketRent: 1893, deltaMonthly: 493, deltaPct: 0.260, status: "below" },
  ],
  market: {
    city:     "Calgary",
    province: "AB",
    cma:      "Calgary CMA",
    dataYear: 2023,
  },
  flags: {
    anyAboveMarket:    false,
    aboveMarketCount:  0,
    missingBedrooms:   0,
    vacant:            2,
  },
  methodology: {
    discount:     "8% annual",
    captureCurve: "Year 1: 33% / Y2: 67% / Y3-5: 100%",
    anchor:       "CMHC RMS 2023 · Calgary CMA",
  },
  aiRead:
    "24-unit walkup at 412-422 Edmonton Trail NE with average per-door loss-to-lease of $708/mo against CMHC Calgary 2023 anchor. " +
    "The 2-bedroom stack is 32% under market across 14 units; 1-bedrooms run 27% under. Annual reset captures $187K; over a 36-month " +
    "natural turnover the discounted upside lands at ~$460K NPV. Strong value-add candidate: stabilize at market rent and the building " +
    "re-prices at $5.4M+ on a 6.0% cap, vs. $4.8M ask — a 13% acquisition discount funds the renovation runway with margin to spare.",
};

const doc = generateTier1Memo({
  type:    "rental",
  deal,
  summary: {
    tiles,
    rows,
    verdict: "Lender-financable (DSCR 1.31x) at cap 5.6%.",
    notes:
      "For the institutional 4-page IC Report with Monte Carlo + comps, use Run Simulation → Export IC Report on the Risk Simulator. " +
      "Sample deal for demo purposes; numbers are illustrative.",
    ltl,
  },
});

// jsPDF in Node: use output('arraybuffer') → write as Buffer.
const buf = Buffer.from(doc.output("arraybuffer"));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buf);
console.log(`✓ Sample IC memo written to ${outputPath} (${buf.length} bytes, 2 pages)`);
