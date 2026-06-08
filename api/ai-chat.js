/**
 * api/ai-chat.js
 *
 * Conversational AI with full property context.
 * Knows everything about the property and answers any real estate question.
 *
 * POST /api/ai-chat
 * Body: { messages: [{role, content}], property: {...}, calcs: {...} }
 *
 * Setup: Add ANTHROPIC_API_KEY to Vercel env vars.
 * Falls back to smart rule-based answers if no API key.
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Multi-mode: this endpoint handles both the conversational chat AND the
  // one-shot zoning thesis hint. Folded together to stay under Vercel's
  // 12-function Hobby plan cap.
  if (req.body?.mode === "zoning-thesis") {
    return handleZoningThesis(req, res);
  }
  if (req.body?.mode === "deal-thesis") {
    return handleDealThesis(req, res);
  }

  const { messages = [], property = {}, calcs = {}, persona = null } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Build system prompt with full property context + persona ─────────────
  const systemPrompt = buildSystemPrompt(property, calcs, persona);

  if (apiKey && apiKey !== "YOUR_ANTHROPIC_API_KEY") {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
          "content-type":      "application/json",
        },
        body: JSON.stringify({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 800,
          system:     systemPrompt,
          messages:   messages.slice(-10), // keep last 10 turns for context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          role:    "assistant",
          content: data.content?.[0]?.text || "I couldn't generate a response.",
          source:  "claude",
        });
      }
    } catch (e) {
      console.error("AI chat error:", e.message);
    }
  }

  // ── Fallback: rule-based responses ──────────────────────────────────────
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
  const reply = generateFallbackReply(lastMessage, property, calcs);

  return res.status(200).json({
    role:    "assistant",
    content: reply,
    source:  "rules",
    note:    "Add ANTHROPIC_API_KEY to Vercel for Claude AI responses.",
  });
}

// ── Persona presets ───────────────────────────────────────────────────────────
const PERSONAS = {
  banker: {
    role: "a conservative commercial real estate lender reviewing this deal for loan approval",
    focus: "Focus on DSCR (lenders want ≥1.25x), loan-to-value, cash-flow stability under stress, borrower experience, and any red flag that could kill the loan. Talk like an underwriter, not a salesperson.",
    voice: "Direct, slightly skeptical, references specific lender standards (DSCR, LTV, debt yield).",
  },
  skeptic: {
    role: "a sharp, contrarian investment committee member trying to poke holes in this deal",
    focus: "Surface the 2-3 biggest risks and what assumptions could be wrong. Challenge the rent comps, the rehab budget, the exit cap. Stress-test the downside. Your job is to find what could break this — not to be agreeable.",
    voice: "Confident, probing, occasionally blunt. Names specific risks with specific numbers.",
  },
  mentor: {
    role: "an experienced real estate mentor walking the investor through this deal supportively",
    focus: "Explain *why* the numbers say what they say. Teach the framework, not just the answer. Connect this deal to principles the investor can reuse on every future deal. Encourage but don't sugarcoat.",
    voice: "Warm, educational, patient. Uses analogies. Treats the investor as a learner who's capable.",
  },
};

function buildPersonaIntro(persona) {
  const p = PERSONAS[persona];
  if (!p) return null;
  return `You are ${p.role}, integrated into the Real Deal platform.

${p.focus}

Voice: ${p.voice}`;
}

// ── System prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(p, c, persona = null) {
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "not available";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "not available";

  const intro = buildPersonaIntro(persona) ||
    `You are an expert real estate investment advisor integrated into the Real Deal platform. You have deep knowledge of Canadian and US real estate markets, investment strategies (fix & flip, BRRRR, multifamily, commercial), financing, and market analysis.`;

  return `${intro}

You have access to the following LIVE property data for the current property being analyzed:

PROPERTY:
- Address: ${p.address || "Unknown"}, ${p.city || ""}
- Type: ${p.propertyType || "Unknown"}
- Bedrooms: ${p.bedrooms || "Unknown"} | Bathrooms: ${p.bathrooms || "Unknown"}
- Square Footage: ${p.squareFootage ? p.squareFootage.toLocaleString() + " sqft" : "Unknown"}
- Year Built: ${p.yearBuilt || "Unknown"}
- Lot Size: ${p.lotSize ? p.lotSize.toLocaleString() + " sqft" : "Unknown"}
- County/Area: ${p.county || "Unknown"}
- Zoning: ${p.zoning || "Unknown"}

CURRENT VALUATION:
- Estimated Value (AVM): ${fmt(p.estimatedValue)}
- AVM Low: ${fmt(p.estimatedValueLow)} | AVM High: ${fmt(p.estimatedValueHigh)}
- Assessed Value: ${fmt(p.assessedValue)}
- Last Sale Price: ${fmt(p.lastSalePrice)} (${p.lastSaleDate || "date unknown"})
- Annual Property Taxes: ${fmt(p.propertyTaxes)}

RENTAL MARKET:
- Estimated Monthly Rent: ${fmt(p.rentEstimate)}
- Rent Range: ${fmt(p.rentEstimateLow)} – ${fmt(p.rentEstimateHigh)}
${p.cmhcData ? `- CMHC Market Vacancy Rate: ${p.cmhcData.vacancyRate}%
- CMHC Avg 2BR Rent: $${p.cmhcData.avgRents?.twoBed?.toLocaleString()}/mo` : ""}

MARKET COMPS (nearby sold):
- Median Sold Price: ${fmt(c.medianSoldPrice)}
- Median $/sqft: ${fmt(c.medianSoldPsf)}
- Active Listings Nearby: ${c.activeCount ?? "Unknown"}
- Avg Days on Market: ${c.avgDaysOnMarket ?? "Unknown"} days

CALCULATOR RESULTS (if user has run analysis):
- Strategy: ${c.strategy || "Not run yet"}
- Purchase Price: ${fmt(c.purchasePrice)}
- ARV: ${fmt(c.arv)}
- Repair Costs: ${fmt(c.repairCosts)}
- Net Profit: ${fmt(c.netProfit)}
- ROI: ${pct(c.roiTotal)}
- Cap Rate: ${pct(c.capRate)}
- Monthly Cash Flow: ${fmt(c.monthlyCF)}
- DSCR: ${c.dscr ? c.dscr.toFixed(2) + "x" : "Not calculated"}
- Deal Grade: ${c.grade || "Not run yet"}

INSTRUCTIONS:
- Answer questions directly and specifically using the property data above
- Give dollar amounts and percentages, not vague advice
- Be direct: say "this is a good deal" or "pass on this one" with specific reasons
- If asked about strategy (flip vs BRRRR vs rental), recommend based on the actual numbers
- If data is missing, say so and explain what the user needs to find out
- Keep responses concise: 3-5 sentences max unless the question requires detail
- You are an advisor to individual investors and buyers — not agents or institutions
- Always base your answer on the specific property data, not generic advice
- Use Canadian dollar amounts for Canadian properties, USD for US`;
}

// ── Fallback rule-based responses ─────────────────────────────────────────────
function generateFallbackReply(msg, p, c) {
  const fmt  = n => n != null ? `$${Math.round(n).toLocaleString()}` : "unknown";
  const val  = p.estimatedValue;
  const rent = p.rentEstimate;

  if (msg.includes("good deal") || msg.includes("worth it") || msg.includes("should i buy")) {
    if (!val) return "I need more property data to assess this deal. Try searching the address first to load property information.";
    const lastSale = p.lastSalePrice;
    const appreciation = lastSale && val ? ((val - lastSale) / lastSale * 100).toFixed(0) : null;
    return `Based on the data: estimated value is ${fmt(val)} (range: ${fmt(p.estimatedValueLow)}–${fmt(p.estimatedValueHigh)}). ${appreciation ? `The property has appreciated ~${appreciation}% since the last sale of ${fmt(lastSale)}.` : ""} ${rent ? `Estimated rent is ${fmt(rent)}/mo, giving a gross yield of ${val ? ((rent * 12 / val) * 100).toFixed(1) : "?"}%.` : ""} Run the flip or rental calculator above for a full verdict.`;
  }

  if (msg.includes("rent") || msg.includes("rental") || msg.includes("cash flow")) {
    if (!rent) return "No rental estimate available for this property yet. Try loading the property data first.";
    const taxes = p.propertyTaxes ? p.propertyTaxes / 12 : 0;
    const roughExpenses = rent * 0.38 + taxes;
    const noi = rent - roughExpenses;
    return `Estimated rent is ${fmt(rent)}/mo. After typical expenses (~38% + taxes), rough NOI is ${fmt(noi)}/mo. ${val ? `At the estimated value of ${fmt(val)}, that's a ~${((noi * 12 / val) * 100).toFixed(1)}% cap rate.` : ""} Enter your specific numbers in the BRRRR or commercial calculator for a full analysis.`;
  }

  if (msg.includes("flip") || msg.includes("fix and flip") || msg.includes("renovate")) {
    return `For a flip: your ARV target should be ${fmt(p.estimatedValueHigh)} (high AVM estimate). Subtract repairs, 8% selling costs, holding costs, and your profit target to get your max offer. ${val ? `At the current estimated value of ${fmt(val)}, you'd need to buy at a meaningful discount to make the numbers work.` : ""} Use the Flip Calculator tab above — it does all of this automatically.`;
  }

  if (msg.includes("offer") || msg.includes("how much") || msg.includes("price")) {
    if (!val) return "Load the property data first and I can give you a specific offer range.";
    const mao70 = val * 0.70 - 50000; // rough 70% rule
    return `Based on the 70% rule and this property's estimated value of ${fmt(val)}: your max offer for a flip would be around ${fmt(mao70)} (assuming ~$50K in repairs). For a buy-and-hold, you'd typically want to pay no more than the estimated value of ${fmt(val)}. Use the calculator to dial in exact numbers based on your specific repair costs and financing.`;
  }

  if (msg.includes("brrrr") || msg.includes("refinance") || msg.includes("recycle")) {
    return `For BRRRR: buy, renovate, rent, refinance, repeat. The key metric is whether you can pull your cash back out after refinancing. ${val ? `At an ARV of ${fmt(p.estimatedValueHigh)}, a 75% LTV refi would give you ${fmt(p.estimatedValueHigh * 0.75)} back.` : ""} Use the BRRRR calculator tab above — enter your purchase price, rehab costs, and expected rent to see if this works.`;
  }

  if (msg.includes("tax") || msg.includes("depreciation")) {
    return `Property taxes here are estimated at ${fmt(p.propertyTaxes)}/year. For depreciation: residential rental properties depreciate over 27.5 years (US) or 25 years (Canada CCA Class 1). On a ${fmt(val)} building value (excluding land), that's roughly ${val ? fmt(val * 0.80 / 27.5) : "?"}/year in depreciation — a significant paper deduction. Check the Tax Calculator tool for full analysis.`;
  }

  if (msg.includes("strategy") || msg.includes("best use") || msg.includes("what should")) {
    const capRate = rent && val ? ((rent * 12 * 0.62) / val * 100).toFixed(1) : null;
    return `Based on this property: ${val ? `Estimated value ${fmt(val)}, ` : ""}${rent ? `rent ${fmt(rent)}/mo. ` : ""}${capRate ? `Rough cap rate ~${capRate}%. ` : ""}${parseFloat(capRate) >= 5 ? "This looks viable as a rental." : parseFloat(capRate) >= 3 ? "Marginal as a pure rental — BRRRR might work better." : "Pure rental yield is thin — flip or BRRRR strategy would likely generate better returns."} Run all three calculators to compare strategies side by side.`;
  }

  return `I can help you analyze this property. Ask me anything: "Is this a good deal?", "What should I offer?", "Would this work as a BRRRR?", "What's the cap rate?", or "What's the best strategy for this property?" — and I'll give you a specific answer based on the real data.`;
}

// ─── Zoning Thesis Mode ────────────────────────────────────────────────────
// One-shot 1-2 sentence institutional thesis hint over zoning + assessment +
// permits data. Powered by Haiku (cheap + fast). Template fallback if no key
// or API error. Folded into this file (vs. a separate endpoint) to stay
// under Vercel's 12-function Hobby plan cap.
async function handleZoningThesis(req, res) {
  const { zoning, assessment, permits = [], address } = req.body || {};
  if (!zoning?.zone) return res.status(400).json({ error: "zoning.zone required" });

  const templateThesis = buildTemplateThesis({ zoning, assessment, permits });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(200).json({ thesis: templateThesis, source: "template" });
  }

  try {
    const prompt = buildThesisPrompt({ zoning, assessment, permits, address });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 160,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return res.status(200).json({ thesis: templateThesis, source: "template", note: `AI fallback (${r.status})` });
    }
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return res.status(200).json({ thesis: templateThesis, source: "template" });
    return res.status(200).json({ thesis: text, source: "claude-haiku-4-5" });
  } catch (e) {
    return res.status(200).json({ thesis: templateThesis, source: "template", note: `AI timeout/error: ${e.message}` });
  }
}

function buildThesisPrompt({ zoning, assessment, permits, address }) {
  const permitCount = permits?.length || 0;
  const recentPermits = (permits || []).slice(0, 5).map(p => {
    const date = (p.permit_date || p.applieddate || "").slice(0, 10);
    const type = p.work_type || p.permit_type || p.work_type_group || "permit";
    return `  ${date} — ${type}`;
  }).join("\n");

  return `You are an institutional real estate analyst. In 1-2 SENTENCES TOTAL (no more, no less), write a tight, data-grounded thesis hint for the property below. No fluff, no hedging, no "do your own due diligence." Just the signal.

PROPERTY: ${address || "address unknown"}
ZONING: ${zoning.zone} (${zoning.zoneDescription || ""})
  Max units allowed: ${zoning.maxUnits ?? "n/a"}
  Max storeys: ${zoning.maxStoreys ?? "n/a"}
  Max FAR: ${zoning.maxFAR ?? "n/a"}
${assessment ? `ASSESSMENT:
  Assessed value: ${assessment.assessedValue ? `$${Math.round(assessment.assessedValue).toLocaleString()}` : "n/a"}
  Year built: ${assessment.yearBuilt ?? "n/a"}
  Neighbourhood: ${assessment.neighbourhood ?? "n/a"}` : "ASSESSMENT: not in city dataset (likely commercial or unusual parcel)."}
PERMITS WITHIN 1KM, LAST 2 YEARS: ${permitCount}
${recentPermits ? `Recent activity:\n${recentPermits}` : ""}

Write 1-2 sentences focusing on: redevelopment potential (if max units > likely current use), permit activity signal (active / moderate / quiet neighbourhood), and any standout opportunity or constraint. Keep under 50 words. Plain English. Start with the zoning fact.`;
}

function buildTemplateThesis({ zoning, assessment, permits }) {
  const permitCount = permits?.length || 0;
  const activityLabel =
    permitCount >= 15 ? "highly active redevelopment activity" :
    permitCount >= 8  ? "active redevelopment activity" :
    permitCount >= 3  ? "moderate development activity" :
                        "minimal recent permit activity";
  const zoneStr = `${zoning.zone}${zoning.zoneDescription ? ` (${zoning.zoneDescription})` : ""}`;
  const densityStr = zoning.maxUnits
    ? ` Bylaw permits up to ${zoning.maxUnits} dwelling${zoning.maxUnits === 1 ? "" : "s"}${zoning.maxStoreys ? ` and ${zoning.maxStoreys} storeys` : ""}.`
    : "";
  const permitStr = ` ${permitCount} permits within 1km in the last 2 years signal ${activityLabel} in the neighbourhood.`;
  return `Zoned ${zoneStr}.${densityStr}${permitStr}`;
}

// ─── Deal Thesis Mode ──────────────────────────────────────────────────────
// One-shot 1-2 sentence institutional read on a deal's metrics. Used by
// BRRRR + Commercial verdict cards. Same Haiku + template-fallback pattern
// as the zoning thesis. Folded into this file to stay under Vercel's
// 12-function Hobby plan cap.
async function handleDealThesis(req, res) {
  const { strategy, address, metrics = {}, verdict } = req.body || {};
  if (!strategy || !Object.keys(metrics).length) {
    return res.status(400).json({ error: "strategy + metrics required" });
  }

  const templateThesis = buildDealTemplateThesis({ strategy, metrics, verdict });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(200).json({ thesis: templateThesis, source: "template" });
  }

  try {
    const prompt = buildDealThesisPrompt({ strategy, address, metrics, verdict });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 180,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return res.status(200).json({ thesis: templateThesis, source: "template", note: `AI fallback (${r.status})` });
    }
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return res.status(200).json({ thesis: templateThesis, source: "template" });
    return res.status(200).json({ thesis: text, source: "claude-haiku-4-5" });
  } catch (e) {
    return res.status(200).json({ thesis: templateThesis, source: "template", note: `AI timeout/error: ${e.message}` });
  }
}

function buildDealThesisPrompt({ strategy, address, metrics, verdict }) {
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "n/a";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "n/a";
  const x = n => n != null ? `${n.toFixed(2)}x` : "n/a";

  const metricLines = Object.entries(metrics).map(([k, v]) => {
    if (v == null) return null;
    if (k === "dscr" || k === "eqMultiple") return `  ${k}: ${x(v)}`;
    if (/Pct$|^irr$|^coc$|^margin$|^roi$|Rate$|annReturn/.test(k)) return `  ${k}: ${pct(v)}`;
    if (typeof v === "number" && Math.abs(v) > 100) return `  ${k}: ${fmt(v)}`;
    return `  ${k}: ${v}`;
  }).filter(Boolean).join("\n");

  return `You are an institutional real estate analyst. In 1-2 SENTENCES TOTAL, write a tight, decisive read on whether this deal works. No fluff, no hedging. Just the signal — what's the standout strength or red flag, and what does the investor do next.

DEAL: ${strategy}${address ? ` · ${address}` : ""}
${verdict ? `VERDICT: ${verdict}` : ""}
METRICS:
${metricLines}

Write 1-2 sentences. Under 50 words. Plain English. Start with the most important number. If the deal pencils, say what makes it work. If it doesn't, say what would need to change.`;
}

function buildDealTemplateThesis({ strategy, metrics, verdict }) {
  const dscr = metrics.dscr;
  const irr = metrics.irr;
  const coc = metrics.coc;
  const profit = metrics.netProfit || metrics.equityCreated;
  const isTrue = metrics.isTrueBRRRR;
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "n/a";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "n/a";

  // Strategy-aware template
  if (strategy.toLowerCase().includes("brrrr")) {
    if (isTrue) {
      return `True BRRRR — all capital recouped at refi${dscr ? ` with DSCR of ${dscr.toFixed(2)}x` : ""}. Recycle the equity into the next deal.`;
    }
    if (dscr != null && dscr < 1.25) {
      return `DSCR of ${dscr.toFixed(2)}x is below the 1.25x lender minimum. Reduce purchase price or boost stabilized NOI before refinance.`;
    }
    return `${irr != null ? `IRR of ${pct(irr)} ` : ""}${profit != null ? `with ${fmt(profit)} equity created.` : "."} ${verdict || "Review the year-by-year projection."}`;
  }

  // Generic
  return `${dscr != null ? `DSCR ${dscr.toFixed(2)}x` : ""}${coc != null ? `, CoC ${pct(coc)}` : ""}${profit != null ? `, ${fmt(profit)} profit` : ""}. ${verdict || "Review the numbers in detail."}`;
}
