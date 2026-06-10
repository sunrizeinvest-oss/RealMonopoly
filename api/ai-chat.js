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

// Tolerant JSON extractor for Claude responses. Strips ```json fences AND
// extracts the first balanced {...} object when Claude prepends a sentence
// like "Here are the triggers I found:". Returns parsed object or null.
function extractJSON(text) {
  if (!text) return null;
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(stripped); } catch {}
  // Fallback: find the first { and the matching last }
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch {}
  }
  return null;
}

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
  if (req.body?.mode === "parse-document") {
    return handleParseDocument(req, res);
  }
  if (req.body?.mode === "find-comps") {
    return handleFindComps(req, res);
  }
  if (req.body?.mode === "find-triggers") {
    return handleFindTriggers(req, res);
  }
  if (req.body?.mode === "deal-memo") {
    return handleDealMemo(req, res);
  }
  if (req.body?.mode === "send-digest") {
    return handleSendDigest(req, res);
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

// ─── Parse Document Mode (AI Document Drop) ────────────────────────────────
// Accepts a base64-encoded PDF and asks Claude Sonnet 4.6 to extract the
// fields a residential or multifamily underwriter needs to populate a calc:
// address, price, ARV, repair budget, monthly rent, taxes, unit count, etc.
//
// Body shape:
//   { mode: "parse-document",
//     document: base64Str,         // raw bytes, no "data:..." prefix
//     mediaType: "application/pdf",// or image/png, image/jpeg
//     target?: "residential"|"multifamily" }
//
// Response:
//   { extracted: { address, city, purchasePrice, arv, repairCosts,
//                  monthlyRent, propertyTaxes, unitCount, bedrooms,
//                  bathrooms, sqft, yearBuilt, notes }, source: "claude-sonnet-4-6" }
async function handleParseDocument(req, res) {
  const { document, mediaType = "application/pdf", target = "residential" } = req.body || {};
  if (!document || typeof document !== "string") {
    return res.status(400).json({ error: "Missing 'document' (base64 string)." });
  }
  // Strip any data-URL prefix if the client included it
  const b64 = document.replace(/^data:[^;]+;base64,/, "");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI parsing is not configured on this deployment." });
  }

  const SCHEMA_PROMPT = `You are extracting structured deal data from a real estate document — a listing sheet, rent roll, lease, appraisal, BPO, MLS export, or assessment notice.

Read the attached document carefully. Extract the following fields. **Return null for any you cannot find** — do NOT guess.

Schema:
- address           — full street address (no city)
- city             — "City, Province/State"
- purchasePrice     — list/asking/contract price, in dollars, integer
- appraisedValue    — market value from an appraisal or BPO, in dollars, integer (DIFFERENT from purchasePrice — only populate if this is an appraisal, BPO, or valuation report)
- arv              — after-repair value, in dollars, integer (only if mentioned)
- repairCosts      — estimated rehab budget, in dollars, integer (only if mentioned)
- monthlyRent      — current gross monthly rent OR market rent estimate
- propertyTaxes    — annual property taxes, in dollars
- unitCount        — number of units (1 if single-family, 2+ if multifamily)
- bedrooms, bathrooms — counts
- sqft             — livable square footage
- yearBuilt        — 4-digit year
- notes            — 1-2 sentence summary of what this document is and any salient details that don't fit elsewhere (e.g. "5-unit walkup; 2 units vacant; deferred maintenance on roof")
- units            — ONLY IF the document is a rent roll with per-unit detail: an array of unit-type groupings. Each entry: { "type": "1 Bed / 1 Bath" or similar, "count": integer, "sqft": integer, "currentRent": monthly rent in dollars, "marketRent": estimated market rent if mentioned }. Group identical unit types together (don't list every single unit individually). Omit this field entirely if the document is not a rent roll.

Target: ${target === "multifamily" ? "MULTIFAMILY (5+ units) — if this looks like a rent roll with per-unit detail, populate the units array with the unique unit groupings" : "RESIDENTIAL (1-4 units)"}.

Output STRICT JSON only — no preamble, no markdown code fences, no commentary. Just the JSON object.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: SCHEMA_PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[parse-document] Claude API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `AI parsing failed (${r.status})`, detail: errBody.slice(0, 200) });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const extracted = extractJSON(text);
    if (!extracted) {
      console.error("[parse-document] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response", raw: text.slice(0, 400) });
    }

    return res.status(200).json({ extracted, source: "claude-sonnet-4-6" });
  } catch (e) {
    console.error("[parse-document] timeout or fetch error:", e.message);
    return res.status(504).json({ error: `Parsing failed: ${e.message}` });
  }
}

// ─── Find Comparable Properties Mode ───────────────────────────────────────
// Claude generates 3-4 plausible commercial comps for a given target address.
// Returns structured JSON the UI can drop straight into the matrix table.
// These are AI-suggested directional comps, not verified MLS data — meant as
// a credible starting point an analyst can refine.
async function handleFindComps(req, res) {
  const { address, propertyType = "multifamily", units, sqft } = req.body || {};
  if (!address) return res.status(400).json({ error: "Missing 'address'." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI comp finder is not configured on this deployment." });
  }

  const prompt = `You are an institutional real estate analyst building a comparable-property matrix.

TARGET PROPERTY:
- Address: ${address}
- Type: ${propertyType}
${units ? `- Units: ${units}` : ""}
${sqft ? `- Sqft: ${sqft}` : ""}

Generate 4 PLAUSIBLE comparable sales/leases for this target. Use realistic numbers anchored to the geography and property type — typical $/sqft and cap rates for the city/submarket. The comps should be a mix of recent activity (last 12-18 months).

Each comp returns a JSON object with these fields:
- address     (street + city, plausible nearby address)
- saleDate    (YYYY-MM)
- price       (integer dollars)
- sqft        (integer)
- units       (integer, for multifamily)
- yearBuilt   (4-digit year)
- capRate     (decimal, e.g. 0.058 for 5.8%)
- noi         (annual NOI in dollars — derive from price × cap)
- zoning      (best-guess realistic zone code)
- distanceKm  (decimal, plausible distance from target, 0.2-3.5)
- notes       (1 short sentence — what makes this comp relevant or noteworthy)

Output STRICT JSON only — no preamble, no markdown fences. Format:
{ "comps": [ {...}, {...}, {...}, {...} ] }

These are directional comps for analyst review. Make them plausible, not perfect.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(40_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[find-comps] Claude API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Comp generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[find-comps] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }

    return res.status(200).json({ comps: parsed.comps || [], source: "claude-sonnet-4-6" });
  } catch (e) {
    console.error("[find-comps] timeout or fetch error:", e.message);
    return res.status(504).json({ error: `Comp generation failed: ${e.message}` });
  }
}

// ─── Find Market Triggers Mode ─────────────────────────────────────────────
// Generates plausible "terminated / withdrawn / suspended" listings for a
// search area. Real MLS data requires RETS/Trestle access — this is a
// directional signal layer the user reviews; replace the AI call with a
// real feed when the data deal lands.
async function handleFindTriggers(req, res) {
  const { area, propertyType = "any", minPrice, maxPrice } = req.body || {};
  if (!area) return res.status(400).json({ error: "Missing 'area' (city / neighbourhood)." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI trigger finder is not configured." });
  }

  const prompt = `You are a real-estate market analyst. Generate 8 PLAUSIBLE distressed-listing signals for the search area below — properties that recently failed to sell, were withdrawn, suspended, expired, or terminated. Use realistic addresses, property types, and pricing for the area.

SEARCH AREA: ${area}
PROPERTY TYPE: ${propertyType}
${minPrice ? `MIN PRICE: $${Number(minPrice).toLocaleString()}` : ""}
${maxPrice ? `MAX PRICE: $${Number(maxPrice).toLocaleString()}` : ""}

Each trigger is a JSON object with these fields:
- address       — plausible street + city
- status        — one of: "Terminated", "Withdrawn", "Suspended", "Expired", "Cancelled"
- triggerDate   — YYYY-MM-DD (within last 6 months)
- listedDate    — YYYY-MM-DD (original listing)
- daysOnMarket  — integer
- lastPrice     — integer dollars
- originalPrice — integer dollars (typically higher than lastPrice if there were drops)
- priceDrops    — count of price reductions during the listing
- propertyType  — "Single Family", "Multifamily", "Land", "Commercial", "Mixed-Use"
- units         — integer (1 for SFH, more for MF)
- yearBuilt     — 4-digit
- zoning        — best-guess realistic code
- suspectedReason — 1 SHORT phrase: "Overpriced", "Title issue", "Inspection problems", "Owner withdrew", "Market timing", "Financing fell through", etc.
- redevScore    — integer 0-100 (your assessment of off-market redev/distress acquisition potential, where 100 = excellent)
- notes         — 1 SHORT sentence with the most relevant insight (e.g., "Owner held 12 years; suspected motivated seller", "Tear-down on rare R-CG corner lot")

Output STRICT JSON only — no preamble, no markdown fences:
{ "triggers": [ {...}, {...}, ... ] }

These are directional signals for analyst review. Make them plausible, not perfect. Vary the statuses, reasons, and redev scores.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[find-triggers] Claude API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Trigger generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[find-triggers] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }

    return res.status(200).json({ triggers: parsed.triggers || [], source: "claude-sonnet-4-6" });
  } catch (e) {
    console.error("[find-triggers] timeout or fetch error:", e.message);
    return res.status(504).json({ error: `Trigger generation failed: ${e.message}` });
  }
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "deal-memo"
//   Generate a 1-page institutional deal memo from the full underwriting
//   context — used by Scale users as the narrative cover for the IC Report
//   or as standalone correspondence to LPs / lenders.
// ──────────────────────────────────────────────────────────────────────
async function handleDealMemo(req, res) {
  const { deal = {}, calc = {}, monteCarlo = {}, comps = [] } = req.body || {};
  if (!deal.address && !deal.purchasePrice) {
    return res.status(400).json({ error: "Missing deal context — provide deal.address and deal.purchasePrice." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI deal memo is not configured." });
  }

  // Short snapshot strings the model can quote verbatim.
  const fmtMoney = n => n == null || !Number.isFinite(Number(n)) ? "n/a" : `$${Math.round(Number(n)).toLocaleString()}`;
  const fmtPct = n => n == null || !Number.isFinite(Number(n)) ? "n/a" : `${(Number(n) * 100).toFixed(1)}%`;
  const compSummary = comps.length === 0 ? "(no comparable sales provided)" : comps.slice(0, 6).map((c, i) =>
    `  Comp ${i+1}: ${c.address || "n/a"} · ${fmtMoney(c.price)} · ${c.units || "?"} units · cap ${fmtPct(c.capRate)} · ${c.saleDate || "?"}`
  ).join("\n");

  const prompt = `You are an experienced commercial real-estate analyst writing a tight, institutional 1-page deal memo. Tone: confident, specific, no hedge-y filler, no marketing language. Numbers > adjectives.

DEAL CONTEXT
  Address:          ${deal.address || "(unnamed)"}
  Property type:    ${deal.propertyType || "Multifamily"}
  Purchase price:   ${fmtMoney(deal.purchasePrice)}
  Total units:      ${calc.totalUnits || deal.units || "?"}
  Hold:             ${deal.holdYears || 5} years
  Loan rate:        ${deal.baseInterestRate ?? "?"}%

UNDERWRITING SNAPSHOT
  Cap rate:         ${fmtPct(calc.capRate)}
  NOI:              ${fmtMoney(calc.NOI)}
  Cash-on-cash:     ${fmtPct(calc.CoC)}
  DSCR:             ${calc.DSCR ? Number(calc.DSCR).toFixed(2) + "x" : "n/a"}
  Deterministic IRR: ${fmtPct(calc.irr)}
  Equity multiple:  ${calc.eqMultiple ? Number(calc.eqMultiple).toFixed(2) + "x" : "n/a"}

MONTE CARLO RISK (1,000 sims)
  IRR P10/P50/P90:   ${fmtPct(monteCarlo?.irr?.p10)} / ${fmtPct(monteCarlo?.irr?.p50)} / ${fmtPct(monteCarlo?.irr?.p90)}
  EqMult P10/P50/P90:${monteCarlo?.eqMult ? ` ${(monteCarlo.eqMult.p10||0).toFixed(2)}x / ${(monteCarlo.eqMult.p50||0).toFixed(2)}x / ${(monteCarlo.eqMult.p90||0).toFixed(2)}x` : " n/a"}
  Min DSCR P10/P50/P90:${monteCarlo?.minDSCR ? ` ${(monteCarlo.minDSCR.p10||0).toFixed(2)}x / ${(monteCarlo.minDSCR.p50||0).toFixed(2)}x / ${(monteCarlo.minDSCR.p90||0).toFixed(2)}x` : " n/a"}
  P(DSCR ≥ 1.25):    ${monteCarlo?.probDSCROK != null ? Math.round(monteCarlo.probDSCROK*100)+"%" : "n/a"}
  P(IRR ≥ 15%):      ${monteCarlo?.probIRRMeetsTarget != null ? Math.round(monteCarlo.probIRRMeetsTarget*100)+"%" : "n/a"}

COMPARABLE SALES (${comps.length})
${compSummary}

Write the memo with the following STRICT JSON shape:
{
  "oneLiner": "A single sentence (≤25 words) suitable for an email subject line — punchy, specific, actionable.",
  "executiveSummary": "One paragraph, 4-6 sentences. State what the deal is, what the underwriting says, and why this matters. Cite specific numbers from the snapshot.",
  "investmentThesis": [
    "3-4 bullet points. Each is a single sentence backed by a number from the snapshot. Frame the OPPORTUNITY: cap vs comps, NOI growth potential, DSCR coverage, IRR distribution."
  ],
  "keyRisks": [
    "3-4 bullet points. Each is a single sentence about a specific RISK — Monte Carlo P10 outcomes, DSCR thin spots, cap expansion exposure, comp-relative pricing risk, etc. Be honest, not boilerplate."
  ],
  "recommendation": "One concrete recommendation in 1-2 sentences. Either 'Pursue at asking', 'Bid $X (Y% below asking) given Z', 'Pass — reason', or 'Conditional — proceed if [specific condition]'. State a price, percentage, or condition.",
  "suggestedSubject": "An email subject line: 'IC Memo · [property] · [recommendation summary]'"
}

CRITICAL:
- Output STRICT JSON only — no preamble, no markdown code fences.
- Quote specific numbers from the snapshot in EVERY bullet.
- Don't invent metrics that aren't provided.
- If a metric is "n/a", DO NOT cite it.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[deal-memo] Claude API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Memo generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[deal-memo] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }
    return res.status(200).json({ memo: parsed, source: "claude-sonnet-4-6" });
  } catch (e) {
    console.error("[deal-memo] timeout or fetch error:", e.message);
    return res.status(504).json({ error: `Memo generation failed: ${e.message}` });
  }
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "send-digest"
//   Email a Market-Triggers digest to the requester. Folded into ai-chat
//   to stay under Vercel's 12-function Hobby cap. Uses Resend's REST API
//   directly (no SDK dep). Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL.
// ──────────────────────────────────────────────────────────────────────
async function handleSendDigest(req, res) {
  const { to, area, propertyType, triggers = [] } = req.body || {};
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: "Valid recipient email required ('to' field)." });
  }
  if (!Array.isArray(triggers)) {
    return res.status(400).json({ error: "'triggers' must be an array." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL || "Real Deal <triggers@realdealestate.app>";
  if (!apiKey) {
    return res.status(503).json({ error: "Email digest is not configured. Set RESEND_API_KEY in Vercel." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const fmtMoney = n => n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
  const fmtDate  = s => { try { return new Date(s).toLocaleDateString("en-CA"); } catch { return s || "—"; } };

  // Brand colours mirror the in-app palette.
  const C = { bg:"#07090f", card:"#0d1119", text:"#dde4ef", sub:"#6b7d96", dim:"#3a4a60", blue:"#3b9eff", green:"#34d98a", red:"#f25c5c", amber:"#f0a030" };

  const triggerRowsHtml = triggers.slice(0, 30).map((t, i) => {
    const status = (t.status || "—").toUpperCase();
    const statusColor = /TERMIN|EXPIR|CANCEL/.test(status) ? C.red : /WITHDRAW|SUSPEND/.test(status) ? C.amber : C.sub;
    const drop = (t.originalPrice && t.lastPrice && t.originalPrice > t.lastPrice)
      ? `<span style="color:${C.green};font-weight:700">↓ ${fmtMoney(t.originalPrice - t.lastPrice)}</span>` : "";
    return `
      <tr style="border-top:1px solid #1a2030">
        <td style="padding:14px 16px;font-family:Inter,sans-serif;font-size:14px;color:${C.text};vertical-align:top">
          <div style="font-weight:700;margin-bottom:4px">${escapeHtml(t.address || "—")}</div>
          <div style="font-size:11px;color:${C.dim};letter-spacing:0.5px;text-transform:uppercase">
            ${escapeHtml(t.propertyType || "—")} · ${t.units || "?"} unit${t.units === 1 ? "" : "s"}${t.yearBuilt ? ` · built ${t.yearBuilt}` : ""}${t.zoning ? ` · ${escapeHtml(t.zoning)}` : ""}
          </div>
          ${t.notes ? `<div style="margin-top:8px;font-size:12px;color:${C.sub};line-height:1.45">${escapeHtml(t.notes)}</div>` : ""}
        </td>
        <td style="padding:14px 16px;text-align:right;vertical-align:top;font-family:'SF Mono',Menlo,monospace;font-size:13px;color:${C.text};white-space:nowrap">
          <div style="font-weight:700">${fmtMoney(t.lastPrice)}</div>
          ${drop ? `<div style="font-size:11px;margin-top:3px">${drop}</div>` : ""}
          <div style="font-size:11px;color:${C.dim};margin-top:6px">DOM ${t.daysOnMarket ?? "—"}</div>
        </td>
        <td style="padding:14px 16px;text-align:right;vertical-align:top;font-family:'SF Mono',Menlo,monospace;font-size:11px;white-space:nowrap">
          <div style="color:${statusColor};font-weight:700;letter-spacing:0.5px">${status}</div>
          <div style="color:${C.dim};margin-top:5px">${fmtDate(t.triggerDate)}</div>
          ${t.redevScore != null ? `<div style="color:${C.amber};margin-top:5px;font-weight:700">SCORE ${t.redevScore}</div>` : ""}
        </td>
      </tr>`;
  }).join("");

  const summary = triggers.length === 0
    ? "No new distress signals matched this search."
    : `${triggers.length} distress signal${triggers.length === 1 ? "" : "s"} matched your scan.`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Real Deal · Trigger Digest</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${C.text}">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.card};border:1px solid #1a2030;border-radius:8px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #1a2030">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:11px;font-weight:700;color:${C.blue};letter-spacing:1.6px;margin-bottom:6px">▸ REAL DEAL · TRIGGER DIGEST</div>
        <div style="font-size:22px;font-weight:800;color:${C.text};letter-spacing:-0.5px">${escapeHtml(area || "All areas")}</div>
        <div style="font-size:13px;color:${C.sub};margin-top:5px">${propertyType ? escapeHtml(propertyType) + " · " : ""}Generated ${today}</div>
      </div>
      <div style="padding:18px 28px;background:rgba(59,158,255,0.04);border-bottom:1px solid #1a2030;font-size:13px;color:${C.sub}">
        ${summary}
      </div>
      ${triggers.length > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
        ${triggerRowsHtml}
      </table>
      ${triggers.length > 30 ? `<div style="padding:14px 28px;font-size:12px;color:${C.dim};font-style:italic">…and ${triggers.length - 30} more — open the app to see the full list.</div>` : ""}
      ` : `<div style="padding:36px 28px;text-align:center;color:${C.dim};font-size:14px">Run another scan or widen your area to surface more signals.</div>`}
      <div style="padding:20px 28px;border-top:1px solid #1a2030;background:rgba(255,255,255,0.015)">
        <a href="https://www.realdealestate.app/triggers" style="display:inline-block;background:${C.blue};color:#07090f;text-decoration:none;font-weight:800;font-size:13px;padding:10px 18px;border-radius:5px;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.8px">OPEN MARKET TRIGGERS →</a>
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:${C.dim};margin-top:18px;line-height:1.6">
      Real Deal · realdealestate.app<br>
      Triggers are AI-generated directional signals for analyst review. Verify before acting.
    </div>
  </div>
</body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Real Deal Triggers · ${area || "All areas"} · ${triggers.length} signal${triggers.length === 1 ? "" : "s"}`,
        html,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[send-digest] Resend error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Email send failed (${r.status})` });
    }
    const data = await r.json();
    return res.status(200).json({ ok: true, id: data.id, sentTo: to, count: triggers.length });
  } catch (e) {
    console.error("[send-digest] fetch error:", e.message);
    return res.status(504).json({ error: `Email send failed: ${e.message}` });
  }
}

// Minimal HTML escape — guards against the address / notes fields injecting
// markup into the digest. Fine for the limited fields we send.
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
