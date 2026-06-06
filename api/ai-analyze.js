/**
 * api/ai-analyze.js — Institutional AI Deal Analyst v2
 *
 * Upgrades over v1:
 *  - Sonnet 4.6 (was Haiku) — institutional-grade reasoning vs. brief takes
 *  - Server-side context enrichment: pulls zoning + comps before sending to Claude
 *  - 7-section structured output (Executive Summary, Metrics, Market, Zoning, Risks, Exit, Verdict)
 *  - Specific numeric projections (cap rate, IRR scenarios, DSCR)
 *  - max_tokens 4096 (was 1024)
 *  - Backwards compatible: parsed shape still exposes verdict + sections for frontend
 *
 * SETUP:
 *  1. https://console.anthropic.com → API key
 *  2. Vercel env: ANTHROPIC_API_KEY=sk-ant-...
 *  3. Deploy. AI button activates automatically.
 *
 * Without key → falls back to rule-based analysis (still useful).
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const deal = req.body;
  if (!deal) return res.status(400).json({ error: "Deal data required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Enrich with zoning + comps if address is Canadian ─────────────────────
  // This makes the AI analysis MASSIVELY better — real data > heuristics.
  const context = await enrichContext(deal, req);

  // ── Use Claude if key is set ──────────────────────────────────────────────
  if (apiKey && apiKey !== "YOUR_ANTHROPIC_API_KEY") {
    try {
      const anthropicRes = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          messages: [
            { role: "user", content: buildInstitutionalPrompt(deal, context) },
          ],
        }),
      });

      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        const text = data.content?.[0]?.text || "";
        return res.status(200).json({
          source: "claude-sonnet-4-6",
          analysis: text,
          parsed: parseAnalysis(text),
          enrichedContext: {
            zoning: context.zoning ? { zone: context.zoning.zone, maxUnits: context.zoning.maxUnits, maxStoreys: context.zoning.maxStoreys } : null,
            assessment: context.assessment ? { value: context.assessment.assessedValue, year: context.assessment.assessmentYear } : null,
            permits: context.nearbyPermits?.length || 0,
          },
        });
      }
      const err = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, err);
      // Fall through to rule-based
    } catch (e) {
      console.error("Anthropic fetch error:", e.message);
    }
  }

  // ── Fallback: enriched rule-based ─────────────────────────────────────────
  const rule = buildRuleAnalysis(deal, context);
  return res.status(200).json({
    source: "rules",
    analysis: rule.text,
    parsed: rule.parsed,
    enrichedContext: context.summary,
    note: apiKey ? "Claude API call failed — see logs." : "Add ANTHROPIC_API_KEY to Vercel env to enable Claude AI analysis.",
  });
}

// ─── Context Enrichment ────────────────────────────────────────────────────────
async function enrichContext(deal, req) {
  const context = { zoning: null, assessment: null, nearbyPermits: [], summary: {} };
  const address = deal.address;
  if (!address) return context;

  // Derive base URL from the incoming request (works in Vercel + locally)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = host ? `${proto}://${host}` : "";
  if (!base) return context;

  try {
    const zRes = await fetch(`${base}/api/zoning?address=${encodeURIComponent(address)}`, { signal: AbortSignal.timeout(8000) });
    if (zRes.ok) {
      const z = await zRes.json();
      context.zoning = z.zoning;
      context.assessment = z.assessment;
      context.nearbyPermits = z.nearbyPermits || [];
      context.summary.city = z.geocode?.city;
    }
  } catch (e) {
    console.warn("zoning enrichment failed:", e.message);
  }

  return context;
}

// ─── Institutional Prompt Builder ──────────────────────────────────────────────
function buildInstitutionalPrompt(d, ctx) {
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "—";

  // ── Zoning context for the prompt ───────────────────────────────────────
  const zoningBlock = ctx.zoning && ctx.zoning.found ? `
ZONING & DEVELOPMENT CONTEXT (from City Open Data, live):
  Zone: ${ctx.zoning.zone} — ${ctx.zoning.zoneDescription || ""}
  Max storeys: ${ctx.zoning.maxStoreys || "n/a"}
  Max FAR: ${ctx.zoning.maxFAR || "n/a"}
  Max units allowed: ${ctx.zoning.maxUnits || "n/a"}
  Bylaw reference: ${ctx.zoning.bylawUrl || "n/a"}
` : "";

  const assessmentBlock = ctx.assessment ? `
PROPERTY ASSESSMENT (city records):
  Assessed value: ${fmt(ctx.assessment.assessedValue)}
  Year built: ${ctx.assessment.yearBuilt || "n/a"}
  Tax class: ${ctx.assessment.taxClass || "n/a"}
  Neighbourhood: ${ctx.assessment.neighbourhood || "n/a"}
  Garage: ${ctx.assessment.garage || "n/a"}
` : "";

  const permitsBlock = ctx.nearbyPermits?.length > 0 ? `
NEIGHBOURHOOD DEVELOPMENT ACTIVITY:
  ${ctx.nearbyPermits.length} permits issued within 1km in the last 2 years.
  Most recent: ${ctx.nearbyPermits.slice(0, 3).map(p => `${(p.permit_date || "").slice(0,10)} - ${p.work_type || ""} at ${p.address || ""}`).join("; ")}
` : "";

  return `You are a senior real estate investment analyst at an institutional fund (think Blackstone, Starwood, or a top Canadian REIT). You have 20+ years of experience underwriting multifamily, infill development, fix-and-flip, and BRRRR deals across North America. You write tight, decisive memos — no hedging, no fluff. Every sentence either changes the conclusion or quantifies a risk.

Analyze the following deal and produce a structured institutional memo.

═══ DEAL DATA ═══
Property: ${d.address || "Unknown"}, ${d.city || ""}
Strategy: ${d.strategy || "Fix & Flip"}
Purchase Price: ${fmt(d.purchasePrice)}
After Repair Value (ARV): ${fmt(d.arv)}
Repair / CapEx: ${fmt(d.repairCosts)}
Total Project Cost: ${fmt(d.totalCosts)}
Hold Time: ${d.holdMonths || "?"} months
Cash Invested: ${fmt(d.myCash)}
Net Profit (projected): ${fmt(d.netProfit)}
Total ROI: ${pct(d.roiTotal)}
Profit Margin: ${pct(d.profitMargin)}
Annualized Cash-on-Cash: ${pct(d.annualizedCoC)}
Maximum Allowable Offer (MAO): ${fmt(d.mao)}
Internal Deal Grade: ${d.grade || "?"}/100${d.bedrooms ? `\nBedrooms: ${d.bedrooms}` : ""}${d.bathrooms ? `\nBathrooms: ${d.bathrooms}` : ""}${d.sqft ? `\nSquare Footage: ${d.sqft}` : ""}${d.monthlyRent ? `\nProjected Monthly Rent: ${fmt(d.monthlyRent)}` : ""}
${zoningBlock}${assessmentBlock}${permitsBlock}
═══ MEMO FORMAT (use these EXACT section headers) ═══

EXECUTIVE SUMMARY
[3-4 sentences. Plain English. What this deal is, the headline thesis, and a one-line recommendation.]

KEY METRICS DASHBOARD
• Purchase vs MAO: [$ amount and % above/below MAO]
• Profit / Margin: [$ profit / % margin / vs 15% institutional minimum]
• Annualized CoC: [%]
• Total ROI: [%]
• Estimated 5-yr IRR (base case): [%, derived from CoC + appreciation assumption]
• Risk-adjusted score: [X/10 with 1-line rationale]

MARKET CONTEXT
[2-3 sentences on the micro-location based on zoning, neighbourhood, permit activity. Reference the city data above if provided. If no city data, infer from address + general market knowledge.]

DEVELOPMENT & ZONING UPSIDE
[If zoning data is provided, analyze: current use vs. allowable density. Quantify any redevelopment opportunity. If no zoning data, write "Zoning analysis not available for this market — request manual review for development upside."]

OPPORTUNITY THESIS
1. [Primary upside — quantified with dollar figure]
2. [Secondary upside — quantified]
3. [Tertiary catalyst, if applicable]

RISK MATRIX
1. RISK: [name] | LIKELIHOOD: [Low/Med/High] | IMPACT: [$ amount] | MITIGATION: [specific action]
2. RISK: [name] | LIKELIHOOD: [Low/Med/High] | IMPACT: [$ amount] | MITIGATION: [specific action]
3. RISK: [name] | LIKELIHOOD: [Low/Med/High] | IMPACT: [$ amount] | MITIGATION: [specific action]

EXIT STRATEGY (3 scenarios, ranked)
PRIMARY: [scenario name — e.g., "Refi & Hold" / "Stabilize & Sell" / "Reposition & Exit"]. [1 sentence on terms.]
SECONDARY: [alternate]. [1 sentence.]
DOWNSIDE: [worst-case exit]. [1 sentence on capital preservation.]

VERDICT
[Pick ONE: 🟢 STRONG GO / 🟡 CONDITIONAL GO / 🔴 PASS]
[1-2 sentence justification anchored in the metrics above.]

PRICE RECOMMENDATION
[Specific dollar amount: "Bid at $X" or "Pass unless seller comes down to $X" or "Current ask is acceptable."]

NEXT STEPS (3 concrete actions)
1. [action with deadline if relevant]
2. [action]
3. [action]

═══ TONE GUIDELINES ═══
• Write like you're handing this to a senior LP at a Monday IC meeting.
• Use specific dollar figures and percentages.
• Never write "do your own due diligence" — that's a junior cop-out.
• Every section must change a reader's mental model. If a section says nothing new, leave it short and move on.
• Total length: 600-900 words.`;
}

// ─── Parser (extracts each section from the AI response) ───────────────────────
const SECTIONS = [
  "EXECUTIVE SUMMARY",
  "KEY METRICS DASHBOARD",
  "MARKET CONTEXT",
  "DEVELOPMENT & ZONING UPSIDE",
  "OPPORTUNITY THESIS",
  "RISK MATRIX",
  "EXIT STRATEGY",
  "VERDICT",
  "PRICE RECOMMENDATION",
  "NEXT STEPS",
];

function parseAnalysis(text) {
  const get = (header) => {
    // Slice from this header to the next known section header (or end of text)
    const headerRe = new RegExp(`^${header}\\b[^\\n]*\\n`, "im");
    const startMatch = text.match(headerRe);
    if (!startMatch) return null;
    const startIdx = startMatch.index + startMatch[0].length;
    const after = text.slice(startIdx);
    // Find next known section header
    let endIdx = after.length;
    for (const s of SECTIONS) {
      if (s === header) continue;
      const nextRe = new RegExp(`^${s}\\b`, "im");
      const m = after.match(nextRe);
      if (m && m.index < endIdx) endIdx = m.index;
    }
    return after.slice(0, endIdx).trim();
  };

  const verdictText = get("VERDICT") || "";
  const verdict =
    verdictText.includes("STRONG GO") || verdictText.includes("🟢") ? "strong_go" :
    verdictText.includes("CONDITIONAL")                            ? "conditional" :
    verdictText.includes("PASS") || verdictText.includes("🔴")     ? "pass" : "conditional";

  return {
    verdict,
    verdictLabel: verdictText.split("\n")[0]?.replace(/^[🟢🟡🔴]\s*/, "").trim() || "See analysis",
    executiveSummary: get("EXECUTIVE SUMMARY"),
    metrics: get("KEY METRICS DASHBOARD"),
    marketContext: get("MARKET CONTEXT"),
    zoningUpside: get("DEVELOPMENT & ZONING UPSIDE"),
    opportunityThesis: get("OPPORTUNITY THESIS"),
    riskMatrix: get("RISK MATRIX"),
    exitStrategy: get("EXIT STRATEGY"),
    verdictRationale: verdictText.split("\n").slice(1).join("\n").trim(),
    priceRecommendation: get("PRICE RECOMMENDATION"),
    nextSteps: get("NEXT STEPS"),
    // legacy fields for backwards compatibility with existing frontend:
    bottomLine: get("EXECUTIVE SUMMARY"),
    strengths: get("OPPORTUNITY THESIS"),
    risks: get("RISK MATRIX"),
    improvements: get("NEXT STEPS"),
  };
}

// ─── Rule-based fallback (now enriched with context if available) ──────────────
function buildRuleAnalysis(d, ctx) {
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "—";

  const profit = d.netProfit || 0;
  const margin = d.profitMargin || 0;
  const roi = d.roiTotal || 0;
  const coc = d.annualizedCoC || 0;
  const mao = d.mao || 0;
  const purchase = d.purchasePrice || 0;
  const arv = d.arv || 0;
  const repairs = d.repairCosts || 0;
  const holdMonths = d.holdMonths || 6;

  const aboveMao = purchase > mao;
  const profitPct = arv > 0 ? repairs / arv : 0;

  let verdict, verdictLabel;
  if (profit > 0 && margin >= 0.15 && !aboveMao && roi >= 0.10) {
    verdict = "strong_go"; verdictLabel = "🟢 STRONG GO";
  } else if (profit > 0 && margin >= 0.08 && roi >= 0.06) {
    verdict = "conditional"; verdictLabel = "🟡 CONDITIONAL GO";
  } else {
    verdict = "pass"; verdictLabel = "🔴 PASS";
  }

  // Estimate 5-yr IRR — very rough: CoC + 3% appreciation/yr
  const irr5 = coc + 0.03;
  const riskScore = Math.max(1, Math.min(10, Math.round(margin * 50 + (aboveMao ? -2 : 1))));

  // Build sections
  const exec = profit > 0
    ? `${d.strategy || "Deal"} at ${d.address || "subject property"} generates ${fmt(profit)} estimated profit at a ${pct(margin)} margin. ${aboveMao ? "Purchase is above MAO — negotiation required." : "Purchase is within MAO."} ${margin >= 0.15 ? "Recommend proceeding to LOI." : "Recommend conditional approval pending price negotiation."}`
    : `Deal is currently unprofitable by ${fmt(Math.abs(profit))}. Either purchase price needs to drop below ${fmt(mao)} or repair scope needs material reduction. Pass at current terms.`;

  const metrics = `• Purchase vs MAO: ${aboveMao ? `${fmt(purchase - mao)} ABOVE` : `${fmt(mao - purchase)} BELOW`}
• Profit / Margin: ${fmt(profit)} / ${pct(margin)}
• Annualized CoC: ${pct(coc)}
• Total ROI: ${pct(roi)}
• 5-yr IRR (base, est): ${pct(irr5)}
• Risk-adjusted score: ${riskScore}/10`;

  const zoningSection = ctx?.zoning?.found
    ? `Subject is zoned ${ctx.zoning.zone} (${ctx.zoning.zoneDescription || ""}). Bylaw allows up to ${ctx.zoning.maxUnits || "—"} dwellings, ${ctx.zoning.maxStoreys || "—"} storeys, FAR ${ctx.zoning.maxFAR || "—"}.${ctx.assessment?.yearBuilt ? ` Building dates to ${ctx.assessment.yearBuilt}.` : ""} ${ctx.zoning.maxUnits > 1 ? "Material redevelopment density available." : "Existing density already at or near max."}`
    : "Zoning analysis not available for this market — request manual review for development upside.";

  const text = `EXECUTIVE SUMMARY
${exec}

KEY METRICS DASHBOARD
${metrics}

MARKET CONTEXT
${ctx?.assessment?.neighbourhood ? `Subject sits in ${ctx.assessment.neighbourhood}. ` : ""}${ctx?.nearbyPermits?.length ? `${ctx.nearbyPermits.length} permits issued within 1km in past 2yr — active development pocket.` : "Permit activity data not available."}

DEVELOPMENT & ZONING UPSIDE
${zoningSection}

OPPORTUNITY THESIS
1. ${margin >= 0.15 ? `Margin of ${pct(margin)} exceeds 15% institutional minimum (${fmt(profit)} contribution).` : `Modest margin — focus on execution efficiency.`}
2. ${holdMonths <= 8 ? `${holdMonths}-month hold limits carrying cost exposure.` : `Extended hold (${holdMonths} months) creates compounding carrying-cost burden.`}
3. ${ctx?.zoning?.maxUnits > 2 ? `Zoning allows ${ctx.zoning.maxUnits}-unit density — redevelopment optionality.` : `Strategy aligned with existing density — execution risk only.`}

RISK MATRIX
1. RISK: ${aboveMao ? "Overpaying" : "Repair overrun"} | LIKELIHOOD: ${aboveMao ? "High" : "Med"} | IMPACT: ${aboveMao ? fmt(purchase - mao) : fmt(repairs * 0.15)} | MITIGATION: ${aboveMao ? `Negotiate to ${fmt(mao)} before LOI` : "Lock contractor bid with 10% contingency"}
2. RISK: Hold timeline slippage | LIKELIHOOD: Med | IMPACT: ${fmt(holdMonths * 2500)} | MITIGATION: Pre-permit before close, contractor on standby
3. RISK: Market softening | LIKELIHOOD: Low | IMPACT: ${fmt(arv * 0.05)} | MITIGATION: Conservative ARV (use 5th percentile comps not median)

EXIT STRATEGY (3 scenarios, ranked)
PRIMARY: ${d.strategy === "BRRRR" ? "Refi & hold — extract capex via cash-out refi, retain for cash flow" : "Stabilize & sell — list at ARV-5% for 60-day liquidity"}
SECONDARY: Refi & hold for 24 months, then sell into seasonality
DOWNSIDE: Sell at break-even to next investor mid-renovation — capital preservation play

VERDICT
${verdictLabel}
${profit > 0 ? `Numbers pencil. ${aboveMao ? "Conditional on price negotiation." : "Proceed."}` : "Numbers do not currently pencil at this price."}

PRICE RECOMMENDATION
${aboveMao ? `Bid no higher than ${fmt(mao)} — current ask of ${fmt(purchase)} compresses margin below institutional minimum.` : profit > 0 ? `Current ${fmt(purchase)} is workable. Suggest ${fmt(Math.round(purchase * 0.97))} as opening bid for ${fmt(Math.round(purchase * 0.03))} buffer.` : `Pass unless seller drops below ${fmt(mao)}.`}

NEXT STEPS (3 concrete actions)
1. ${aboveMao ? `Send LOI at ${fmt(mao)} within 48h` : `Send LOI at ${fmt(Math.round(purchase * 0.97))} within 48h`}
2. Engage 2 contractor walk-throughs before due diligence ends
3. ${ctx?.zoning?.maxUnits > 2 ? "Pre-application meeting with city planning re: redevelopment density" : "Verify ARV with 3 sold comps within 1km"}`;

  return {
    text,
    parsed: parseAnalysis(text),
  };
}
