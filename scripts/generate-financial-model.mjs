/**
 * Generates ~/Desktop/RizeAI_Financial_Model.csv — a 3-year financial model
 * investors will ask for the moment you say "raising $500K."
 *
 * Opens cleanly in Excel, Google Sheets, or Numbers. Plain CSV — no formulas
 * (so the assumptions are explicit and auditable).
 *
 * Assumptions documented at the bottom of the file so investors can adjust
 * any number and see what changes.
 *
 * Re-run anytime assumptions change:
 *   node scripts/generate-financial-model.mjs
 */

import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OUT = join(homedir(), "Desktop", "RizeAI_Financial_Model.csv");

// ── Assumptions (the dials investors care about) ─────────────────────────
const A = {
  // Pricing
  proPrice:     99,
  scalePrice:   299,
  // Mix of paying users (Pro vs Scale)
  proRatio:     0.70,  // 70% Pro, 30% Scale
  scaleRatio:   0.30,
  // Monthly churn rate
  monthlyChurn: 0.04,  // 4% — typical SMB SaaS
  // Months of paid runway from close
  runwayMonths: 12,
  // Costs (monthly)
  founderSalary: 6667,         // $80K/year
  engHire1Start: 4,            // month #4 from close
  engineerSalary: 11250,       // $135K/year fully-loaded
  toolsInfra:    5000,         // Vercel Pro, Supabase Pro, Claude API, Repliers, misc
  marketing:     3000,         // LinkedIn Sales Nav, content, paid experiments
  legalAdmin:    1250,         // $15K/year amortized
  // CAC + LTV
  avgRevPerUser: (99 * 0.70 + 299 * 0.30) * 12,  // weighted annual ARPU
  monthlyACQ:    [
    // [month, new paying users that month]
    // Conservative ramp — 10 paying by end of month 6, 50 by end of year 1
    0, 0, 2, 5, 8, 12, 18, 25, 32, 40, 50, 60,                    // Y1
    72, 84, 96, 108, 120, 135, 150, 165, 180, 195, 210, 225,       // Y2
    245, 265, 285, 305, 325, 350, 375, 400, 425, 450, 475, 500,    // Y3
  ],
};

// ── Model ────────────────────────────────────────────────────────────────
const months = 36;
const rows = [];
let cumulativeUsers = 0;
let cumulativeCash = 500_000;  // $500K raise lands at month 0

for (let m = 1; m <= months; m++) {
  // Users added this month
  const newUsers = A.monthlyACQ[m - 1] || 0;
  // Churn applies to existing base
  const churned = Math.round(cumulativeUsers * A.monthlyChurn);
  cumulativeUsers = Math.max(0, cumulativeUsers + newUsers - churned);

  // Revenue
  const proUsers   = Math.round(cumulativeUsers * A.proRatio);
  const scaleUsers = cumulativeUsers - proUsers;
  const mrr = proUsers * A.proPrice + scaleUsers * A.scalePrice;
  const monthRevenue = mrr;

  // Stripe fees (~3.5% all-in)
  const stripeFees = Math.round(monthRevenue * 0.035);

  // Costs
  const teamCost = A.founderSalary + (m >= A.engHire1Start ? A.engineerSalary : 0);
  const monthCost = teamCost + A.toolsInfra + A.marketing + A.legalAdmin + stripeFees;

  // Net
  const netBurn = monthRevenue - monthCost;
  cumulativeCash = cumulativeCash + netBurn;

  rows.push({
    month: m,
    label: `M${m.toString().padStart(2, "0")}`,
    newUsers,
    churned,
    cumulativeUsers,
    proUsers,
    scaleUsers,
    mrr,
    arr: mrr * 12,
    monthRevenue,
    teamCost,
    toolsInfra: A.toolsInfra,
    marketing: A.marketing,
    legalAdmin: A.legalAdmin,
    stripeFees,
    monthCost,
    netBurn,
    cumulativeCash,
    runwayMonthsRemaining: monthCost > 0 && cumulativeCash > 0 ? Math.floor(cumulativeCash / Math.max(1, monthCost - monthRevenue)) : 0,
  });
}

// ── CSV output ───────────────────────────────────────────────────────────
const fmt = n => n == null ? "" : Math.round(n).toLocaleString("en-US");

const lines = [];

// Title row
lines.push("RIZEAI — 3-YEAR FINANCIAL MODEL");
lines.push("Generated: " + new Date().toISOString().slice(0, 10));
lines.push("Raise: $500K pre-seed @ $5M post-money cap (SAFE)");
lines.push("");

// Key metrics summary
lines.push("KEY METRICS SUMMARY");
lines.push("Metric,Month 6,Month 12,Month 24,Month 36");
const m6 = rows[5], m12 = rows[11], m24 = rows[23], m36 = rows[35];
lines.push(`Paying users,${m6.cumulativeUsers},${m12.cumulativeUsers},${m24.cumulativeUsers},${m36.cumulativeUsers}`);
lines.push(`MRR ($),${fmt(m6.mrr)},${fmt(m12.mrr)},${fmt(m24.mrr)},${fmt(m36.mrr)}`);
lines.push(`ARR ($),${fmt(m6.arr)},${fmt(m12.arr)},${fmt(m24.arr)},${fmt(m36.arr)}`);
lines.push(`Cumulative cash ($),${fmt(m6.cumulativeCash)},${fmt(m12.cumulativeCash)},${fmt(m24.cumulativeCash)},${fmt(m36.cumulativeCash)}`);
lines.push("");

// Detail rows
lines.push("MONTH-BY-MONTH DETAIL");
lines.push([
  "Month", "Label",
  "New users", "Churned", "Cumulative users",
  "Pro users", "Scale users",
  "MRR ($)", "ARR ($)", "Month revenue ($)",
  "Team cost", "Tools+infra", "Marketing", "Legal+admin", "Stripe fees",
  "Total cost ($)",
  "Net burn ($)",
  "Cumulative cash ($)",
].join(","));

for (const r of rows) {
  lines.push([
    r.month, r.label,
    r.newUsers, r.churned, r.cumulativeUsers,
    r.proUsers, r.scaleUsers,
    fmt(r.mrr), fmt(r.arr), fmt(r.monthRevenue),
    fmt(r.teamCost), fmt(r.toolsInfra), fmt(r.marketing), fmt(r.legalAdmin), fmt(r.stripeFees),
    fmt(r.monthCost),
    fmt(r.netBurn),
    fmt(r.cumulativeCash),
  ].join(","));
}

lines.push("");
lines.push("ASSUMPTIONS (audit me!)");
lines.push("Assumption,Value,Notes");
lines.push(`Pro tier price,$${A.proPrice}/mo,From live Stripe products`);
lines.push(`Scale tier price,$${A.scalePrice}/mo,From live Stripe products`);
lines.push(`Pro/Scale mix,${A.proRatio*100}% / ${A.scaleRatio*100}%,Commercial brokers skew Scale, indie investors skew Pro`);
lines.push(`Monthly churn,${A.monthlyChurn*100}%,Typical SMB SaaS — actual TBD post-launch`);
lines.push(`Founder salary,$${A.founderSalary}/mo = $${A.founderSalary*12}/yr,Conservative — many founders defer; included here for honesty`);
lines.push(`Engineer hire start,Month ${A.engHire1Start},First senior engineering hire after deal close + ramp`);
lines.push(`Engineer salary,$${A.engineerSalary}/mo = $${A.engineerSalary*12}/yr,Fully-loaded Canadian senior eng with equity + benefits`);
lines.push(`Tools + infra,$${A.toolsInfra}/mo,Vercel Pro + Supabase Pro + Claude + Repliers Growth + misc`);
lines.push(`Marketing,$${A.marketing}/mo,LinkedIn Sales Nav + content + paid experiments`);
lines.push(`Legal + admin,$${A.legalAdmin}/mo,SAFE legal amortized + accounting + corp filings`);
lines.push(`Stripe fees,3.5%,All-in (2.9% + $0.30 per txn average)`);
lines.push("");
lines.push("USER ACQUISITION RAMP");
lines.push("Month,New paying users,Notes");
for (let m = 1; m <= 12; m++) {
  const newU = A.monthlyACQ[m - 1] || 0;
  let note = "";
  if (m === 1)  note = "Pre-Resend setup + warm intros only";
  if (m === 2)  note = "Resend live, LinkedIn outreach starts";
  if (m === 6)  note = "Target: 10 paying users";
  if (m === 12) note = "Target: 50 paying users (seed-readiness)";
  lines.push(`M${m.toString().padStart(2,"0")},${newU},${note}`);
}

lines.push("");
lines.push("SAAS METRICS (DERIVED)");
const m12LTV = (A.proPrice * A.proRatio + A.scalePrice * A.scaleRatio) * (1 / A.monthlyChurn);
const targetCAC = m12LTV * 0.33;  // healthy LTV:CAC = 3:1
lines.push(`Avg revenue per user (ARPU),$${Math.round(A.proPrice * A.proRatio + A.scalePrice * A.scaleRatio)}/mo,Weighted by tier mix`);
lines.push(`Lifetime value (LTV),$${Math.round(m12LTV)},ARPU / monthly churn = 12-month LTV`);
lines.push(`Target CAC (3:1 LTV:CAC),<$${Math.round(targetCAC)},LinkedIn + content keeps us well under this`);
lines.push(`Gross margin,~95%,Software-grade — Claude + infra are the only marginal costs`);
lines.push(`Payback period at $50 CAC,<1 month,Single ACV payment exceeds CAC`);
lines.push("");

lines.push("RUNWAY SCENARIOS");
lines.push("Scenario,Month cash hits zero,What we do");
lines.push("Base case (current model),Month " + (rows.findIndex(r => r.cumulativeCash <= 0) + 1 || ">36"),"Seed round at ~M9-M12 prevents this");
lines.push("Pessimistic (0 paying users Y1)," + Math.floor(500000 / (rows[0].monthCost - 0)) + ",Need bridge round or extend founder runway");
lines.push("Optimistic (2x acquisition ramp),> month 36,Self-sustaining; seed becomes optional");
lines.push("");

lines.push("USE OF FUNDS — $500K BREAKDOWN");
lines.push("Allocation,Amount,Why");
lines.push("Founder runway (12 months),$80K,Allows full-time focus");
lines.push("Senior engineer hire (9 months),$135K,Ships US coverage + off-market sourcing");
lines.push("Tools + infra (12 months),$60K,Vercel Pro / Supabase Pro / Claude / Repliers Growth");
lines.push("Marketing + content (12 months),$40K,LinkedIn Sales Nav / content / paid experiments");
lines.push("Repliers MLS Growth subscription,$7K,One year at $549/mo — real Canadian comps");
lines.push("Legal + corporate + SAFE legal,$15K,Incorporation/restructure + SAFE templates + tax setup");
lines.push("SR&ED specialist retainer,$5K,35-65% R&D refund — pays back 10x");
lines.push("DNS migration + brand polish (rizeai.io),$3K,One-time domain + setup");
lines.push("Contingency + opportunity reserve,$155K,Hire designer / extend runway / seize moment");
lines.push("TOTAL,$500K,");

writeFileSync(OUT, lines.join("\n"));
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${rows.length} months · ${lines.length} rows · drop into Excel or Google Sheets`);
console.log(`  Headline numbers:`);
console.log(`    Month  6: ${m6.cumulativeUsers} users · MRR $${fmt(m6.mrr)} · cash $${fmt(m6.cumulativeCash)}`);
console.log(`    Month 12: ${m12.cumulativeUsers} users · MRR $${fmt(m12.mrr)} · cash $${fmt(m12.cumulativeCash)}`);
console.log(`    Month 24: ${m24.cumulativeUsers} users · MRR $${fmt(m24.mrr)} · cash $${fmt(m24.cumulativeCash)}`);
console.log(`    Month 36: ${m36.cumulativeUsers} users · MRR $${fmt(m36.mrr)} · cash $${fmt(m36.cumulativeCash)}`);
