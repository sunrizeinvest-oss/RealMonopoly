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

// Tolerant JSON extractor for AI responses. Strips ```json fences AND
// extracts the first balanced {...} object when the AI prepends a sentence
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

// Shared rate-limit helper for expensive AI modes. Anon users get N/day,
// authed users (Bearer header) bypass. Returns true if request should proceed,
// false if the handler should bail with a 429.
async function enforceAnonLimit(req, res, { limit, name }) {
  const { checkRateLimit } = await import("./_lib/rate-limit.js");
  const check = await checkRateLimit(req, { limit, name });
  if (check.ok) return true;
  res.status(429).json({
    error: `Free-tier daily limit reached (${limit}/day on ${name}). Sign in to remove the cap.`,
    rateLimited: true,
    isAuthed: false,
  });
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // The Vercel cron path hits us as a GET with ?mode=cron-<x> and an
  // Authorization: Bearer <CRON_SECRET> header. Everything else stays POST.
  if (req.method === "GET" && req.query?.mode === "cron-digest") {
    return handleCronDigest(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "cron-market-brief") {
    return handleCronMarketBrief(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "cron-daily-alerts") {
    return handleCronDailyAlerts(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "cron-monthly-brief") {
    return handleCronMonthlyBrief(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "cron-onboarding") {
    return handleCronOnboarding(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "cron-weekly-buybox-digest") {
    return handleCronWeeklyBuyBoxDigest(req, res);
  }
  if (req.method === "GET" && req.query?.mode === "health") {
    return handleHealth(req, res);
  }
  // Public metrics — GET, no auth. Powers /live + /pitch traction stats.
  if (req.query?.mode === "metrics") return handleMetrics(req, res);
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
  if (req.body?.mode === "parse-buybox") {
    return handleParseBuyBox(req, res);
  }
  if (req.body?.mode === "verdict-memo") {
    return handleVerdictMemo(req, res);
  }
  if (req.body?.mode === "voice-parse-property") {
    return handleVoiceParseProperty(req, res);
  }
  // v1 public API — routed here via vercel.json rewrites so we stay under
  // the Hobby 12-function cap. Public URLs stay clean:
  //   /api/v1/verdict  → /api/ai-chat?mode=v1-verdict
  //   /api/v1/keys     → /api/ai-chat?mode=v1-keys
  if (req.query?.mode === "v1-verdict") return handleV1Verdict(req, res);
  if (req.query?.mode === "v1-keys")    return handleV1Keys(req, res);
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
  if (req.body?.mode === "fetch-market-brief") {
    return handleFetchMarketBrief(req, res);
  }
  if (req.body?.mode === "send-market-brief") {
    return handleSendMarketBrief(req, res);
  }
  if (req.body?.mode === "unsubscribe") {
    return handleUnsubscribe(req, res);
  }
  if (req.body?.mode === "building-grade") {
    return handleBuildingGrade(req, res);
  }
  if (req.body?.mode === "rent-roll-loss-to-lease") {
    return handleRentRollLossToLease(req, res);
  }
  if (req.body?.mode === "admin-dashboard") {
    return handleAdminDashboard(req, res);
  }

  const {
    messages = [], property = {}, calcs = {}, persona = null,
    strategyVerdicts = null, zoningSpecs = null,
  } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Build system prompt with full property context + persona ─────────────
  // Now includes the pre-computed 4-strategy verdicts and dimensional zoning
  // specs when the client passes them — makes Buddy verdict-aware.
  const systemPrompt = buildSystemPrompt(property, calcs, persona, { strategyVerdicts, zoningSpecs });

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
          source: "ai",
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
    note:    "Add ANTHROPIC_API_KEY to Vercel for AI responses.",
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
  return `You are ${p.role}, integrated into the RizeAI platform.

${p.focus}

Voice: ${p.voice}`;
}

// ── System prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(p, c, persona = null, extras = {}) {
  const fmt = n => n != null ? `$${Math.round(n).toLocaleString()}` : "not available";
  const pct = n => n != null ? `${(n * 100).toFixed(1)}%` : "not available";

  const intro = buildPersonaIntro(persona) ||
    `You are Buddy, RizeAI's institutional-grade real estate advisor. You speak with Canadian brokers, agents, and investors about specific deals — knowledgeable, direct, no filler. Reference the LIVE property data below when answering. If numbers are missing, name what's missing rather than guessing.`;

  // ── Extension: verdict-aware context. When the client passes strategyVerdicts
  //    and/or zoningSpecs, we render extra prompt blocks so Buddy answers from
  //    what RizeAI already computed (not just the raw property blob). ──
  let verdictBlock = "";
  if (Array.isArray(extras.strategyVerdicts) && extras.strategyVerdicts.length) {
    const rows = extras.strategyVerdicts
      .filter(v => v?.viable !== false)
      .map(v => `- ${v.name || v.key}: ${v.verdict?.label || v.verdict || "?"} · ${v.headline || ""} · ${v.subhead || ""}`)
      .join("\n") || "None viable given the data.";
    verdictBlock = `

FOUR-STRATEGY VERDICT PANEL (pre-computed by RizeAI):
${rows}

Use these as anchors — reference "the BRRRR verdict shows X" or "the Buy&Hold headline is Y" rather than re-deriving. If a user asks "which strategy?" name the strongest verdict here and justify it with the property specifics.`;
  }

  let zoningBlock = "";
  if (extras.zoningSpecs && (extras.zoningSpecs.code || extras.zoningSpecs.maxHeightM)) {
    const z = extras.zoningSpecs;
    const s = z.setbacks || {};
    zoningBlock = `

DIMENSIONAL ZONING SPECS (from ${z.city || "city"} bylaw, code ${z.code || "?"}):
- Name: ${z.name || "?"}
- Max height: ${z.maxHeightM ? `${z.maxHeightM}m` : "?"}
- Max FAR: ${z.maxFAR ?? "?"}
- Max coverage: ${z.maxCoverage != null ? `${Math.round(z.maxCoverage * 100)}%` : "?"}
- Max units per lot: ${z.maxUnits ?? "?"}
- Min lot area: ${z.minLotAreaM2 ? `${z.minLotAreaM2}m²` : "?"}
- Setbacks (F/R/S): ${s.front ?? "?"}/${s.rear ?? "?"}/${s.side ?? "?"}m
- Permitted uses: ${z.permittedUses || "?"}
- Practitioner note: ${z.note || "?"}

When users ask about zoning, buildable envelope, or "what can I build here" — use these exact numbers.`;
  }

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
- Deal Grade: ${c.grade || "Not run yet"}${verdictBlock}${zoningBlock}

INSTRUCTIONS:
- Answer questions directly and specifically using the property data above
- Give dollar amounts and percentages, not vague advice
- Be direct: say "this pencils" or "pass" with specific reasons
- If asked "which strategy?", name the top-verdict strategy from the panel above and justify
- If asked "what can I build?", use the dimensional zoning specs above verbatim
- If data is missing, name what's missing rather than guessing
- Keep responses concise: 3-5 sentences max unless the question requires detail
- Use Canadian dollar amounts for Canadian properties, USD for US
- Never refer to yourself as "AI" — you are Buddy
- Speak to brokers and investors as peers, not customers`;
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
// permits data. Powered by AI (cheap + fast). Template fallback if no key
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
    return res.status(200).json({ thesis: text, source: "ai-fast" });
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
// BRRRR + Commercial verdict cards. Same fast-AI + template-fallback pattern
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
    return res.status(200).json({ thesis: text, source: "ai-fast" });
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
// Accepts a base64-encoded PDF and asks the AI to extract the
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
//                  bathrooms, sqft, yearBuilt, notes }, source: "ai-thesis" }
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
- unitMix          — ONLY IF the document is a rent roll with row-level per-unit detail (different from "units" above which groups by type): an array of every single unit row. Each entry MUST include the unit's actual contract rent so we can compute loss-to-lease against market. Schema per entry:
    {
      "unit": "101" or "Suite B" or "B-12" — whatever identifier the row uses,
      "bedrooms": 0 for bachelor, integer for 1/2/3+,
      "bathrooms": number (0.5 for half-bath),
      "sqft": integer or null,
      "actualRent": current contract monthly rent in dollars, integer. CRITICAL — never null unless the row is vacant,
      "tenancyStart": "YYYY-MM" if visible, else null,
      "notes": "vacant" | "month-to-month" | "owner-occupied" | "subsidized" | null
    }
  Read EVERY row of the rent table. Don't summarize, don't average — preserve per-unit variation. If the document is not a rent roll (it's a listing sheet, lease, appraisal, etc.), omit this field entirely.

Target: ${target === "multifamily" || target === "rent-roll" ? "MULTIFAMILY / RENT ROLL — populate BOTH `units` (type groupings) AND `unitMix` (per-unit rows) when the document has per-unit rent detail." : "RESIDENTIAL (1-4 units)"}.

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
      console.error("[parse-document] AI API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `AI parsing failed (${r.status})`, detail: errBody.slice(0, 200) });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const extracted = extractJSON(text);
    if (!extracted) {
      console.error("[parse-document] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response", raw: text.slice(0, 400) });
    }

    return res.status(200).json({ extracted, source: "ai-thesis" });
  } catch (e) {
    console.error("[parse-document] timeout or fetch error:", e.message);
    return res.status(504).json({ error: `Parsing failed: ${e.message}` });
  }
}

// ─── Parse Buy Box (natural language → structured criteria) ──────────────
// Cheap fast-AI call — takes broker text describing their buy box and returns
// structured fields the /buybox editor auto-fills. Powers the "Buddy Chat"
// entry point on /buybox where users describe criteria naturally instead of
// clicking through a 15-field form.
async function handleParseBuyBox(req, res) {
  const { text } = req.body || {};
  if (!text || typeof text !== "string" || text.trim().length < 4) {
    return res.status(400).json({ error: "Missing 'text' (min 4 chars)." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI parsing is not configured." });
  }

  const SCHEMA_PROMPT = `You are extracting structured Buy Box criteria from a real estate broker or investor's description of what they want to buy.

Return ONLY a JSON object with these fields — omit any field the user didn't mention. Do NOT guess.

Schema:
{
  "name":         string — 4-8 word label for this buy box, generated from the description,
  "assetClasses": array of one or more from: "sfh" (single family), "duplex" (duplex/triplex), "small_mf" (4-19 units), "large_mf" (20+ units), "retail", "mixed_use", "land", "industrial",
  "cities":       array of one or more Canadian city slugs from: "calgary","edmonton","vancouver","toronto","ottawa","mississauga","hamilton",
  "priceMin":     number in CAD (integer),
  "priceMax":     number in CAD (integer),
  "capRateMin":   number as percent (e.g. 5.5 for 5.5%),
  "unitsMin":     integer,
  "strategy":     one of "hold","brrrr","flip","mf",
  "notes":        string — any thesis/context that doesn't fit the structured fields
}

Rules:
- If the user says "Calgary" or "Alberta duplexes", cities=["calgary"]
- If the user says "GTA" or "Toronto area", cities=["toronto"]
- If the user says "duplex" or "triplex", assetClasses=["duplex"]
- If the user says "6+ units" or "small MF", assetClasses=["small_mf"], unitsMin=4
- If the user says "BRRRR", strategy="brrrr"
- If the user says "buy and hold" or "long-term rental", strategy="hold"
- If the user says "flip", strategy="flip"
- If the user says "value-add" or "cap rate", strategy="mf"
- Price ranges: convert "under 1M" → priceMax=1000000. "500K-1.5M" → priceMin=500000, priceMax=1500000.
- Cap rate: "5% cap or better" → capRateMin=5

Output STRICT JSON only — no preamble, no markdown fences, no commentary. Just the JSON object.

User's buy box description:
"""
${text.slice(0, 4000)}
"""`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: SCHEMA_PROMPT }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[parse-buybox] AI API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `AI parsing failed (${r.status})` });
    }

    const data = await r.json();
    const textOut = data.content?.[0]?.text?.trim() || "";
    const extracted = extractJSON(textOut);
    if (!extracted) {
      console.error("[parse-buybox] JSON parse failed:", textOut.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response", raw: textOut.slice(0, 400) });
    }

    return res.status(200).json({ extracted, source: "ai-fast" });
  } catch (e) {
    console.error("[parse-buybox] error:", e.message);
    return res.status(504).json({ error: `Parsing failed: ${e.message}` });
  }
}

// ─── Voice-to-Verdict — parse broker's spoken property description ─────────
// Powers the /voice mobile flow: broker at a lockbox describes a property
// out loud ("1234 Kensington Rd NW, 4 units, 3200 sqft, asking $1.4M, RM
// zoning"), we transcribe via browser SpeechRecognition and pipe the text
// here for structured extraction. Fast AI for speed + cost. Returns fields
// mapped to /property URL params so the client can deep-link with prefill.
async function handleVoiceParseProperty(req, res) {
  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== "string" || transcript.trim().length < 8) {
    return res.status(400).json({ error: "Missing 'transcript' (min 8 chars)." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI parsing is not configured." });
  }

  const SCHEMA = `You are extracting structured property data from a broker's spoken description of a real estate deal. They're often at a lockbox, dictating quickly, so speech may be informal and terse.

Return ONLY a JSON object with these fields — omit any field the broker didn't mention. Do NOT guess.

Schema:
{
  "address":       "full street address if mentioned (no city)",
  "city":          "City name",
  "province":      "2-letter province/state code",
  "purchasePrice": integer (dollars, no commas or symbols),
  "sqft":          integer,
  "beds":          integer,
  "baths":         number (0.5 for half),
  "units":         integer (1 for SFH, 2+ for multiplex),
  "monthlyRent":   integer,
  "yearBuilt":     4-digit year,
  "zoning":        "zoning code like R-C2 or RM if mentioned",
  "propertyType":  "residential" | "commercial" | "mixed_use" | "land",
  "notes":         "1-2 sentence gist of anything else (condition, comps, distress signals, etc)"
}

Common patterns:
- "asking 1.4M" or "1 point 4 million" → purchasePrice: 1400000
- "3200 square feet" → sqft: 3200
- "four unit walkup" → units: 4
- "3 bed 2 bath" → beds: 3, baths: 2
- "R-CG zoning" or "our-cee-gee zoning" → zoning: "R-CG"
- Canadian cities preferred: Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, Hamilton

Output STRICT JSON only — no preamble, no markdown fences, no commentary.

Transcript:
"""
${transcript.slice(0, 3000)}
"""`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: SCHEMA }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[voice-parse] AI error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Voice parsing failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const extracted = extractJSON(text);
    if (!extracted) {
      console.error("[voice-parse] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }

    return res.status(200).json({ extracted, source: "ai-fast" });
  } catch (e) {
    console.error("[voice-parse] error:", e.message);
    return res.status(504).json({ error: `Voice parsing failed: ${e.message}` });
  }
}

// ─── Verdict Memo — 1-page investment memo from property + strategy results ─
// The high-tier AI writes a structured investment memo for a
// single property based on the property blob + the four-strategy verdict
// results. Output is Markdown-ish plain text that the client turns into a
// branded PDF via jsPDF. Pro-gated on the client via freeTier.canExportPDF.
async function handleVerdictMemo(req, res) {
  // Pro-tier gate — verdict-memo generates a full institutional PDF (~$0.002
  // per call, generates a shareable investor artifact). Was client-only via
  // freeTier.js canExportPDF; now enforced server-side.
  try {
    const { requireTier } = await import("./_lib/auth.js");
    await requireTier(req, "pro");
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message });
  }

  const { property, strategyResults, buyBoxContext } = req.body || {};
  if (!property || !property.address) {
    return res.status(400).json({ error: "Missing property + address." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI memo generation is not configured." });
  }

  const propBlurb = [
    `Address: ${property.address}`,
    property.city && `City: ${property.city}${property.province ? `, ${property.province}` : ""}`,
    property.purchasePrice && `Purchase / List: $${Math.round(property.purchasePrice).toLocaleString()}`,
    property.estimatedValue && `AVM / Est. Value: $${Math.round(property.estimatedValue).toLocaleString()}`,
    property.rentEstimate && `Est. Monthly Rent: $${Math.round(property.rentEstimate).toLocaleString()}`,
    property.sqft && `Sqft: ${property.sqft.toLocaleString()}`,
    (property.beds || property.baths) && `Beds/Baths: ${property.beds || "?"}/${property.baths || "?"}`,
    property.units && `Units: ${property.units}`,
    property.zoning && `Zoning: ${property.zoning}`,
    property.propertyTaxAnnual && `Annual Property Tax: $${Math.round(property.propertyTaxAnnual).toLocaleString()}`,
    property.lotSize && `Lot Size: ${property.lotSize.toLocaleString()} sqft`,
  ].filter(Boolean).join("\n");

  const stratBlurb = (strategyResults || [])
    .filter(s => s?.viable)
    .map(s => `- ${s.name}: ${s.verdict?.label || "?"} · ${s.headline || ""} · ${s.subhead || ""}`)
    .join("\n") || "No viable strategies flagged.";

  const buyBoxBlurb = buyBoxContext
    ? `\nBUY BOX CONTEXT (broker's saved criteria):\n${JSON.stringify(buyBoxContext, null, 2)}`
    : "";

  const PROMPT = `You are an institutional real estate analyst writing a 1-page investment memo for a Canadian broker. Use the property + strategy verdict data below to write a structured memo.

PROPERTY:
${propBlurb}

STRATEGY VERDICTS:
${stratBlurb}
${buyBoxBlurb}

Write a memo with these EXACT section headers (use them verbatim so the PDF renderer can parse them):

## THESIS
2-3 sentences on why this deal warrants attention (or why it doesn't). Institutional voice — no hype.

## HIGHLIGHTS
3-4 bulleted numeric or structural highlights. Lead each with the number/fact, then interpret.

## RISKS
3-4 bulleted risks. Be specific — no generic "market risk". Use the property's actual data.

## THE STRATEGY
1-2 sentences naming the strongest-fit strategy and why. Reference specific verdict data.

## NEXT STEPS
3 concrete next steps in order — verify X, model Y, walk-through Z.

Rules:
- Keep the whole memo under 350 words.
- No filler. No "this deal has potential" hedging. Take a position.
- Reference specific numbers from the data — don't be generic.
- Use Canadian conventions (CAD dollars, CMHC as rent anchor, provincial zoning terminology).
- Do NOT invent numbers not in the data.

Return the memo as plain text with the section headers verbatim. No preamble, no closing signature.`;

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
        messages: [{ role: "user", content: PROMPT }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[verdict-memo] AI error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Memo generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    if (!text || text.length < 100) {
      return res.status(502).json({ error: "AI returned an unusually short memo." });
    }

    return res.status(200).json({ memo: text, source: "ai-thesis" });
  } catch (e) {
    console.error("[verdict-memo] error:", e.message);
    return res.status(504).json({ error: `Memo generation failed: ${e.message}` });
  }
}

// ─── Find Comparable Properties Mode ───────────────────────────────────────
// AI generates 3-4 plausible commercial comps for a given target address.
// Returns structured JSON the UI can drop straight into the matrix table.
// These are AI-suggested directional comps, not verified MLS data — meant as
// a credible starting point an analyst can refine.
async function handleFindComps(req, res) {
  // Rate limit anon callers — AI @ 1500 tokens is ~$0.002/call. Without
  // this an unauth visitor could trivially blast $50/day in Anthropic spend.
  if (!(await enforceAnonLimit(req, res, { limit: 5, name: "find-comps" }))) return;

  const { address, propertyType = "multifamily", units, sqft } = req.body || {};
  if (!address) return res.status(400).json({ error: "Missing 'address'." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI comp finder is not configured on this deployment." });
  }

  // ── Step 0: Ground in REAL MLS data when target is Canadian ──────────────
  // Pulls active listings from whichever MLS provider is configured (CREA
  // DDF > Repliers > Realtor.ca scraper). The AI is prompted to use these
  // as anchor points rather than hallucinating addresses + prices.
  const CA_PROV = /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/i;
  const CA_PC = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
  const isCanadian = CA_PROV.test(address) || CA_PC.test(address);

  let mlsAnchors = null;
  let mlsProvider = null;
  if (isCanadian) {
    try {
      const { getMlsProvider, getProviderName } = await import("./_lib/mls/index.js");
      const provider = getMlsProvider();
      mlsProvider = getProviderName();
      const result = await provider.searchByArea({ area: address, limit: 12 });
      if (result.groundedByMls && result.activeListings?.length) {
        mlsAnchors = result.activeListings.slice(0, 8);
      }
    } catch (e) {
      console.warn("[find-comps] MLS provider failed, falling back to pure AI:", e.message);
    }
  }

  const anchorBlock = mlsAnchors && mlsAnchors.length ? `
GROUND-TRUTH LISTINGS (from ${mlsProvider}, near the target):
${mlsAnchors.map((l, i) => `  ${i+1}. ${l.address || "?"}${l.cityProvince ? ", " + l.cityProvince : ""} — ${l.price ? "$" + Math.round(l.price).toLocaleString() : "price n/a"} · ${l.bedrooms ?? "?"} BD / ${l.bathrooms ?? "?"} BA · ${l.sqft ?? "?"} sqft · ${l.propertyType || "?"} · DOM ${l.daysOnMarket ?? "?"}${l.mlsNumber ? " · MLS " + l.mlsNumber : ""}`).join("\n")}

These are REAL active listings from a live MLS feed. Use them as anchor points for cap rate / $/sqft / typical price for the area. For comps that match the target type, you can use these directly (set saleDate to the listing's listed date, mark them as "active comparable"). Add up to 2 additional plausible historical sold comps for context, but the majority of the matrix should be grounded in these real listings.
` : `
NOTE: No live MLS data available for this address — using pure AI inference. Make the comps plausible for the geography and property type.
`;

  const prompt = `You are an institutional real estate analyst building a comparable-property matrix.

TARGET PROPERTY:
- Address: ${address}
- Type: ${propertyType}
${units ? `- Units: ${units}` : ""}
${sqft ? `- Sqft: ${sqft}` : ""}
${anchorBlock}
Generate 4 comparable sales/leases for this target. ${mlsAnchors ? "Use the ground-truth listings above wherever possible." : "Use realistic numbers anchored to the geography and property type — typical $/sqft and cap rates for the city/submarket."}

Each comp returns a JSON object with these fields:
- address     (street + city)
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
${mlsAnchors ? "- mlsNumber  (include for comps you took from the ground-truth list)" : ""}
${mlsAnchors ? "- isGroundTruth (true when this comp came directly from the MLS feed)" : ""}

Output STRICT JSON only — no preamble, no markdown fences. Format:
{ "comps": [ {...}, {...}, {...}, {...} ] }`;

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
      console.error("[find-comps] AI API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Comp generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[find-comps] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }

    return res.status(200).json({
      comps: parsed.comps || [],
      source: mlsAnchors ? `claude-sonnet-4-6+${mlsProvider}` : "claude-sonnet-4-6",
      groundedByMls: !!mlsAnchors,
      mlsProvider: mlsAnchors ? mlsProvider : null,
      mlsAnchorCount: mlsAnchors ? mlsAnchors.length : 0,
    });
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
  // AI @ 3000 tokens is ~$0.004/call — pricier than find-comps. Tighter cap.
  if (!(await enforceAnonLimit(req, res, { limit: 5, name: "find-triggers" }))) return;

  const { area, propertyType = "any", minPrice, maxPrice } = req.body || {};
  if (!area) return res.status(400).json({ error: "Missing 'area' (city / neighbourhood)." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI trigger finder is not configured." });
  }

  // Ground in REAL listings — pulls active listings near the search area
  // and identifies STALE ones (DOM > 60 days) as distress candidates. The
  // AI is then asked to interpret each (reason it's stale, redev potential)
  // rather than hallucinating addresses + pricing wholesale.
  // True terminated/expired data needs MLS member access (CREA DDF);
  // until then high-DOM active listings are the best proxy.
  let mlsAnchors = null;
  let mlsProvider = null;
  try {
    const { getMlsProvider, getProviderName } = await import("./_lib/mls/index.js");
    const provider = getMlsProvider();
    mlsProvider = getProviderName();
    const result = await provider.searchByArea({ area, limit: 25 });
    if (result.groundedByMls && result.activeListings?.length) {
      // Stale = high days-on-market. 60+ DOM in most CA markets is a real signal.
      const stale = result.activeListings
        .filter(l => l.daysOnMarket != null && l.daysOnMarket >= 60)
        .sort((a, b) => (b.daysOnMarket || 0) - (a.daysOnMarket || 0))
        .slice(0, 8);
      if (stale.length) mlsAnchors = stale;
    }
  } catch (e) {
    console.warn("[find-triggers] MLS provider failed, falling back to pure AI:", e.message);
  }

  const anchorBlock = mlsAnchors && mlsAnchors.length ? `
GROUND-TRUTH STALE LISTINGS (live from ${mlsProvider}, DOM ≥ 60 days):
${mlsAnchors.map((l, i) => `  ${i+1}. ${l.address || "?"}${l.cityProvince ? ", " + l.cityProvince : ""} — $${l.price ? Math.round(l.price).toLocaleString() : "?"} · ${l.bedrooms ?? "?"} BD / ${l.bathrooms ?? "?"} BA · ${l.sqft ?? "?"} sqft · ${l.propertyType || "?"} · DOM ${l.daysOnMarket} · listed ${l.listedDate || "?"}${l.mlsNumber ? " · MLS " + l.mlsNumber : ""}`).join("\n")}

These are REAL active listings stuck on the market. For each, infer a plausible distress signal and assess off-market redev potential. Use the actual address + price + property type + DOM directly — don't invent alternatives. Mark them with status "Stale" (not "Terminated/Expired" — we don't have MLS member access to confirm those).
` : `
NOTE: No live MLS data available — using pure AI inference. Make the signals plausible for the geography. Mark these "AI Inferred" so the user knows they're directional.
`;

  const prompt = `You are a real-estate market analyst. ${mlsAnchors ? "Interpret the ground-truth stale listings below — for each, write the distress thesis." : "Generate 8 PLAUSIBLE distressed-listing signals for the search area below — properties that recently failed to sell, were withdrawn, suspended, expired, or terminated. Use realistic addresses, property types, and pricing for the area."}

SEARCH AREA: ${area}
PROPERTY TYPE: ${propertyType}
${minPrice ? `MIN PRICE: $${Number(minPrice).toLocaleString()}` : ""}
${maxPrice ? `MAX PRICE: $${Number(maxPrice).toLocaleString()}` : ""}
${anchorBlock}
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
      console.error("[find-triggers] AI API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Trigger generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";

    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[find-triggers] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }

    return res.status(200).json({
      triggers: parsed.triggers || [],
      source: mlsAnchors ? `claude-sonnet-4-6+${mlsProvider}` : "claude-sonnet-4-6",
      groundedByMls: !!mlsAnchors,
      mlsProvider: mlsAnchors ? mlsProvider : null,
      mlsAnchorCount: mlsAnchors ? mlsAnchors.length : 0,
    });
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
  // Pro-tier gate — deal-memo is our most expensive backend mode
  // (~$0.003/call, 2500 tokens, 60s high-tier AI). The anon limit below
  // stays as a belt-and-suspenders backstop for the free-tier signup nudge.
  try {
    const { requireTier } = await import("./_lib/auth.js");
    await requireTier(req, "pro");
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message });
  }
  if (!(await enforceAnonLimit(req, res, { limit: 3, name: "deal-memo" }))) return;

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
      console.error("[deal-memo] AI API error:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: `Memo generation failed (${r.status})` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("[deal-memo] JSON parse failed:", text.slice(0, 200));
      return res.status(502).json({ error: "AI returned non-JSON response" });
    }
    return res.status(200).json({ memo: parsed, source: "ai-thesis" });
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
  const from   = process.env.RESEND_FROM_EMAIL || "RizeAI <triggers@rizeai.co>";
  if (!apiKey) {
    return res.status(503).json({ error: "Email digest is not configured. Set RESEND_API_KEY in Vercel." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const fmtMoney = n => n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
  const fmtDate  = s => { try { return new Date(s).toLocaleDateString("en-CA"); } catch { return s || "—"; } };

  // ── AI Read for the email — same fast-AI call MarketTriggers fires
  // in-app. Wrapped in try/catch + timeout so the email NEVER blocks on a
  // AI failure: missing AI key, slow API, anything — email still sends.
  const aiThesis = await maybeGenerateScanThesis({ triggers, area, propertyType });

  // Brand colours mirror the in-app palette.
  const C = { bg:"#ffffff", card:"#f8fafc", text:"#0f172a", sub:"#475569", dim:"#94a3b8", blue:"#0066cc", green:"#16a34a", red:"#dc2626", amber:"#d97706" };

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
<html><head><meta charset="utf-8"><title>RizeAI · Trigger Digest</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${C.text}">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.card};border:1px solid #1a2030;border-radius:8px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #1a2030">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:11px;font-weight:700;color:${C.blue};letter-spacing:1.6px;margin-bottom:6px">▸ RIZE AI · TRIGGER DIGEST</div>
        <div style="font-size:22px;font-weight:800;color:${C.text};letter-spacing:-0.5px">${escapeHtml(area || "All areas")}</div>
        <div style="font-size:13px;color:${C.sub};margin-top:5px">${propertyType ? escapeHtml(propertyType) + " · " : ""}Generated ${today}</div>
      </div>
      ${aiThesis ? `
      <div style="padding:18px 28px;background:rgba(0,102,204,0.04);border-bottom:1px solid #1a2030">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:10.5px;font-weight:700;color:${C.blue};letter-spacing:1.3px;margin-bottom:6px">▸ AI READ · SCAN SUMMARY</div>
        <div style="font-size:13.5px;color:${C.text};line-height:1.55">${escapeHtml(aiThesis)}</div>
      </div>
      ` : ""}
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
        <a href="https://www.rizeai.co/triggers" style="display:inline-block;background:${C.blue};color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:10px 18px;border-radius:5px;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.8px">OPEN MARKET TRIGGERS →</a>
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:${C.dim};margin-top:18px;line-height:1.6">
      RizeAI · rizeai.co<br>
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
        subject: `RizeAI Triggers · ${area || "All areas"} · ${triggers.length} signal${triggers.length === 1 ? "" : "s"}`,
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

// ──────────────────────────────────────────────────────────────────────
//   cron-digest — weekly auto-digest invoked by Vercel Cron
//
//   GET /api/ai-chat?mode=cron-digest
//   Authorization: Bearer <CRON_SECRET>
//
//   Reads every email_enabled saved search across all users, runs
//   find-triggers for each, and emails the digest to the search owner.
//   Updates last_digest_at on each row it processed.
//
//   Env vars required:
//     CRON_SECRET                (Vercel auto-fills if you set up cron via UI)
//     SUPABASE_URL               (your Supabase project URL)
//     SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role)
//     RESEND_API_KEY             (same as send-digest)
//     ANTHROPIC_API_KEY          (same as find-triggers)
// ──────────────────────────────────────────────────────────────────────
async function handleCronDigest(req, res) {
  // Auth check FIRST — before writing a runs row. Otherwise every unauthorized
  // probe (there are many from bots + accidental /api hits) pollutes the
  // cron_runs table with "error" rows that dilute uptime signal.
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-digest");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: "Supabase service config missing — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY." });
  }

  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // 2. Pull every email_enabled saved search + the owner's email (via PostgREST
  //    inner join to auth.users). Service role bypasses RLS.
  let searches = [];
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/saved_searches?select=id,user_id,name,area,property_type,max_price&email_enabled=eq.true`,
      { headers: sbHeaders }
    );
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[cron-digest] Supabase search read failed:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ error: "Could not read saved searches" });
    }
    searches = await r.json();
  } catch (e) {
    return res.status(504).json({ error: `Supabase fetch failed: ${e.message}` });
  }

  if (!searches.length) {
    return res.status(200).json({ ok: true, processed: 0, note: "No email-enabled saved searches." });
  }

  // 3. For each search: look up the owner's email, run find-triggers, send the
  //    digest. Cap parallelism at 5 to avoid Anthropic/Resend rate-limit storms.
  const results = [];
  const concurrency = 5;

  async function processOne(s) {
    const out = { searchId: s.id, area: s.area, sentTo: null, count: 0, error: null };
    try {
      // Owner email — service role can read auth.users
      const uRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${s.user_id}`,
        { headers: sbHeaders }
      );
      if (!uRes.ok) throw new Error(`auth.users lookup ${uRes.status}`);
      const u = await uRes.json();
      const email = u?.email;
      if (!email) throw new Error("user has no email");

      // Run find-triggers internally — same prompt the in-app scan uses.
      const findRes = await fetch(`${baseUrlFromReq(req)}/api/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "find-triggers",
          area: s.area,
          propertyType: s.property_type || "any",
          maxPrice: s.max_price || undefined,
        }),
      });
      const findJson = await findRes.json().catch(() => ({}));
      const triggers = Array.isArray(findJson.triggers) ? findJson.triggers : [];
      out.count = triggers.length;

      // Skip the send when nothing matched — no point cluttering inboxes.
      if (!triggers.length) {
        out.sentTo = email;
        out.skipped = "no signals matched";
      } else {
        const sendRes = await fetch(`${baseUrlFromReq(req)}/api/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "send-digest",
            to: email,
            area: s.area,
            propertyType: s.property_type,
            triggers,
          }),
        });
        if (!sendRes.ok) {
          const errJ = await sendRes.json().catch(() => ({}));
          throw new Error(errJ.error || `send-digest ${sendRes.status}`);
        }
        out.sentTo = email;
      }

      // Stamp last_digest_at so we know we ran this one.
      await fetch(`${supabaseUrl}/rest/v1/saved_searches?id=eq.${s.id}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ last_digest_at: new Date().toISOString() }),
      });
    } catch (e) {
      out.error = e.message;
    }
    return out;
  }

  for (let i = 0; i < searches.length; i += concurrency) {
    const batch = searches.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
  }

  const summary = {
    ok: true,
    processed: results.length,
    sent: results.filter(r => r.sentTo && !r.skipped && !r.error).length,
    skipped: results.filter(r => r.skipped).length,
    errors: results.filter(r => r.error).length,
    results,
  };
  console.log("[cron-digest] complete:", JSON.stringify(summary).slice(0, 800));
  await recordCronEnd(
    runId,
    summary.errors === 0 ? "success" : "error",
    { processed: summary.processed, sent: summary.sent, skipped: summary.skipped, errors: summary.errors },
    summary.errors > 0 ? `${summary.errors} search(es) errored` : null
  );
  return res.status(200).json(summary);
}

// Derive the absolute base URL from a request so internal fetches resolve.
// Vercel exposes the deploy URL via the Host header; falls back to env.
function baseUrlFromReq(req) {
  const host = req.headers.host || process.env.VERCEL_URL;
  if (!host) return "";
  const proto = (req.headers["x-forwarded-proto"] || "https");
  return `${proto}://${host}`;
}

// ──────────────────────────────────────────────────────────────────────
//   Market Brief — daily 8am Pacific RSS-aggregated email per market
//
//   Three handlers + one cron entry:
//     POST  mode=fetch-market-brief  → returns the assembled brief
//                                       payload (for in-app preview)
//     POST  mode=send-market-brief   → fires the brief to a single
//                                       recipient (manual / preview)
//     GET   mode=cron-market-brief   → walks every market_subscriptions
//                                       row and sends per-subscriber
//
//   Sources (all free, all RSS — no scraping fragility):
//     Bank of Canada announcements: https://www.bankofcanada.ca/feed/
//     Storeys (Canadian RE news):   https://storeys.com/feed/
//     Better Dwelling:              https://betterdwelling.com/feed/
//
//   Market filter is keyword-based on title + description. "All Canada"
//   subscribers get every item; city subscribers get items mentioning
//   their city or its metro suburbs.
// ──────────────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  { source: "Bank of Canada", url: "https://www.bankofcanada.ca/feed/", priority: 10 },
  { source: "Storeys",        url: "https://storeys.com/feed/",        priority: 6 },
  { source: "Better Dwelling",url: "https://betterdwelling.com/feed/", priority: 5 },
];

// Each market lists its core city + metro suburbs. Match is case-insensitive
// substring against item title + description.
const MARKET_KEYWORDS = {
  calgary:   ["calgary", "airdrie", "cochrane", "okotoks", "chestermere", "alberta"],
  vancouver: ["vancouver", "burnaby", "richmond", "surrey", "coquitlam", "north vancouver", "west vancouver", "delta", "new westminster", "british columbia"],
  edmonton:  ["edmonton", "sherwood park", "st. albert", "spruce grove", "fort saskatchewan", "leduc", "alberta"],
  toronto:   ["toronto", "mississauga", "brampton", "markham", "vaughan", "pickering", "ajax", "oakville", "burlington", "richmond hill", "north york", "scarborough", "etobicoke", "ontario", "gta"],
  all:       null,  // sentinel — keep everything
};

const MARKET_LABEL = {
  calgary:   "Calgary",
  vancouver: "Vancouver",
  edmonton:  "Edmonton",
  toronto:   "Toronto",
  all:       "All Canada",
};

// Minimal RSS parser. RSS 2.0 + Atom both work because both expose <item>
// or <entry> with <title>, <link>, <description>/<summary>, <pubDate>.
// Extracts via regex — robust enough for the well-formed feeds we hit;
// gracefully returns [] on any malformed input.
function parseRSS(xml, source) {
  if (!xml || typeof xml !== "string") return [];
  const items = [];
  // <item>...</item> for RSS 2.0; <entry>...</entry> for Atom
  const itemRegex = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) && items.length < 20) {
    const block = m[2];
    const title = pickTag(block, "title");
    const link  = pickTag(block, "link") || (block.match(/<link[^>]*href="([^"]+)"/) || [])[1] || "";
    const desc  = pickTag(block, "description") || pickTag(block, "summary") || pickTag(block, "content:encoded") || "";
    const date  = pickTag(block, "pubDate") || pickTag(block, "published") || pickTag(block, "updated") || "";
    if (!title) continue;
    items.push({
      source,
      title:       stripHtml(title).slice(0, 240),
      link:        link.trim(),
      description: stripHtml(desc).slice(0, 320),
      publishedAt: date.trim(),
    });
  }
  return items;
}

function pickTag(block, tag) {
  // Match <tag>...</tag> or <tag attr="x">...</tag> — tolerant of CDATA.
  const re = new RegExp(`<${tag}\\b[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function matchesMarket(item, market) {
  if (market === "all" || !MARKET_KEYWORDS[market]) return true;
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return MARKET_KEYWORDS[market].some(kw => haystack.includes(kw));
}

// Fetch every feed in parallel, parse, dedupe, filter by market, sort by
// (priority desc, publishedAt desc). Returns up to `limit` items.
async function aggregateMarketNews({ market = "all", limit = 8 }) {
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(async f => {
      try {
        const r = await fetch(f.url, {
          signal: AbortSignal.timeout(12_000),
          headers: { "User-Agent": "RizeAI/1.0 (+https://rizeai.co)" },
        });
        if (!r.ok) return [];
        const xml = await r.text();
        return parseRSS(xml, f.source).map(it => ({ ...it, priority: f.priority }));
      } catch (e) {
        console.warn(`[market-brief] feed failed: ${f.source}: ${e.message}`);
        return [];
      }
    })
  );

  let all = feedResults
    .flatMap(r => r.status === "fulfilled" ? r.value : [])
    .filter(it => matchesMarket(it, market));

  // Dedupe by lowercased title
  const seen = new Set();
  all = all.filter(it => {
    const key = it.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: higher priority first, then more recent
  all.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });

  return all.slice(0, limit);
}

// ──────────────────────────────────────────────────────────────────────
//   POST mode=fetch-market-brief — preview the brief payload (no email)
//   Body: { market: "all" | "calgary" | "vancouver" | "edmonton" | "toronto" }
// ──────────────────────────────────────────────────────────────────────
async function handleFetchMarketBrief(req, res) {
  const market = String(req.body?.market || "all").toLowerCase();
  if (!MARKET_LABEL[market]) {
    return res.status(400).json({ error: `Unknown market "${market}". Options: ${Object.keys(MARKET_LABEL).join(", ")}` });
  }
  const items = await aggregateMarketNews({ market, limit: 8 });
  return res.status(200).json({
    market,
    label: MARKET_LABEL[market],
    items,
    generatedAt: new Date().toISOString(),
    sources: RSS_FEEDS.map(f => f.source),
  });
}

// ──────────────────────────────────────────────────────────────────────
//   POST mode=send-market-brief — fire to a single recipient
//   Body: { to, market }   (used for preview + manual sends)
// ──────────────────────────────────────────────────────────────────────
async function handleSendMarketBrief(req, res) {
  const { to, market = "all" } = req.body || {};
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: "Valid recipient email required ('to' field)." });
  }
  const norm = String(market).toLowerCase();
  if (!MARKET_LABEL[norm]) {
    return res.status(400).json({ error: `Unknown market "${market}".` });
  }
  const items = await aggregateMarketNews({ market: norm, limit: 8 });
  const result = await deliverMarketBrief({ to, market: norm, items });
  return res.status(result.ok ? 200 : 502).json(result);
}

// HTML template + Resend send. Returns { ok, id?, error? }.
// `userId` (optional) lets us sign a one-click unsubscribe token; if omitted
// the footer just links to the manage-subscriptions page.
async function deliverMarketBrief({ to, market, items, userId }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL || "RizeAI <brief@rizeai.co>";
  if (!apiKey) return { ok: false, error: "Email is not configured (RESEND_API_KEY missing)." };
  const unsubToken = userId ? signUnsubscribeToken(userId, market) : null;
  const unsubUrl   = unsubToken ? `https://www.rizeai.co/unsubscribe?token=${encodeURIComponent(unsubToken)}` : null;

  // AI Read for the email — same best-effort pattern as the trigger digest
  // (maybeGenerateScanThesis). Returns null on any failure; email still
  // sends. 6-sec timeout caps the worst-case delay.
  const aiThesis = await maybeGenerateBriefThesis({ items, market });

  const C = { bg:"#ffffff", card:"#f8fafc", text:"#0f172a", sub:"#475569", dim:"#94a3b8", blue:"#0066cc", green:"#16a34a", red:"#dc2626", amber:"#d97706" };
  const today = new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const rowsHtml = items.map(it => `
    <tr style="border-top:1px solid #1a2030">
      <td style="padding:14px 18px;font-family:Inter,sans-serif;vertical-align:top">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:9.5px;font-weight:700;color:${C.blue};letter-spacing:1.1px;margin-bottom:5px">${escapeHtml(it.source.toUpperCase())}</div>
        <a href="${escapeHtml(it.link)}" style="display:block;color:${C.text};font-size:15px;font-weight:700;line-height:1.35;text-decoration:none;margin-bottom:6px">${escapeHtml(it.title)}</a>
        ${it.description ? `<div style="font-size:12.5px;color:${C.sub};line-height:1.5">${escapeHtml(it.description)}</div>` : ""}
      </td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>RizeAI · Daily Market Brief</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${C.text}">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.card};border:1px solid #1a2030;border-radius:8px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #1a2030">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:11px;font-weight:700;color:${C.amber};letter-spacing:1.6px;margin-bottom:6px">▸ RIZE AI · DAILY MARKET BRIEF</div>
        <div style="font-size:22px;font-weight:800;color:${C.text};letter-spacing:-0.5px">${escapeHtml(MARKET_LABEL[market])}</div>
        <div style="font-size:13px;color:${C.sub};margin-top:5px">${today}</div>
      </div>
      ${aiThesis ? `
      <div style="padding:18px 28px;background:rgba(0,102,204,0.04);border-bottom:1px solid #1a2030">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:10.5px;font-weight:700;color:${C.blue};letter-spacing:1.3px;margin-bottom:6px">▸ AI READ · TODAY'S TAKE</div>
        <div style="font-size:13.5px;color:${C.text};line-height:1.55">${escapeHtml(aiThesis)}</div>
      </div>
      ` : ""}
      ${items.length === 0 ? `
      <div style="padding:36px 28px;text-align:center;color:${C.dim};font-size:14px">
        No matching items today. Markets are quiet — or the feeds are slow. We'll keep watching.
      </div>
      ` : `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">${rowsHtml}</table>
      `}
      <div style="padding:20px 28px;border-top:1px solid #1a2030;background:rgba(255,255,255,0.015);text-align:center">
        <a href="https://www.rizeai.co/market-brief" style="display:inline-block;background:${C.blue};color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:10px 18px;border-radius:5px;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.8px">MANAGE SUBSCRIPTIONS →</a>
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:${C.dim};margin-top:18px;line-height:1.6">
      RizeAI · rizeai.co<br>
      Aggregated from public RSS feeds. Verify sources before acting on any item.<br>
      <a href="https://www.rizeai.co/market-brief" style="color:${C.dim}">Manage your subscriptions →</a>
      ${unsubUrl ? `<br><a href="${unsubUrl}" style="color:${C.dim};font-size:10px">Unsubscribe with one click</a>` : ""}
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
        subject: `RizeAI Brief · ${MARKET_LABEL[market]} · ${today}`,
        html,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[market-brief] Resend error:", r.status, errBody.slice(0, 200));
      return { ok: false, error: `Email send failed (${r.status})` };
    }
    const data = await r.json();
    return { ok: true, id: data.id, sentTo: to, market, count: items.length };
  } catch (e) {
    console.error("[market-brief] fetch error:", e.message);
    return { ok: false, error: `Email send failed: ${e.message}` };
  }
}

// ──────────────────────────────────────────────────────────────────────
//   GET cron-market-brief — daily 8am Pacific Vercel cron
//
//   Walks every enabled market_subscriptions row, groups by user_id,
//   batches by market to share one RSS fetch across many subscribers,
//   then per (user, market) sends one email.
// ──────────────────────────────────────────────────────────────────────
async function handleCronMarketBrief(req, res) {
  // Auth check FIRST — see handleCronDigest for rationale.
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-market-brief");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: "Supabase service config missing." });
  }
  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // 1. Pull every enabled subscription
  let subs = [];
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/market_subscriptions?select=id,user_id,market&enabled=eq.true`,
      { headers: sbHeaders }
    );
    if (!r.ok) {
      const eb = await r.text().catch(() => "");
      console.error("[cron-market-brief] read failed:", r.status, eb.slice(0, 200));
      return res.status(502).json({ error: "Could not read market subscriptions" });
    }
    subs = await r.json();
  } catch (e) {
    return res.status(504).json({ error: `Supabase fetch failed: ${e.message}` });
  }

  if (!subs.length) {
    return res.status(200).json({ ok: true, processed: 0, note: "No enabled subscriptions." });
  }

  // 2. Aggregate once per unique market — multiple subscribers to the same
  // market share one RSS fetch.
  const uniqueMarkets = [...new Set(subs.map(s => s.market))];
  const briefByMarket = {};
  await Promise.all(uniqueMarkets.map(async m => {
    briefByMarket[m] = await aggregateMarketNews({ market: m, limit: 8 });
  }));

  // 3. Per subscription: resolve email, send, update last_sent_at. Cap at 5
  // concurrent to be polite to Resend.
  const results = [];
  const concurrency = 5;
  async function processOne(s) {
    const out = { subId: s.id, market: s.market, sentTo: null, error: null };
    try {
      const uRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${s.user_id}`, { headers: sbHeaders });
      if (!uRes.ok) throw new Error(`auth.users lookup ${uRes.status}`);
      const u = await uRes.json();
      const email = u?.email;
      if (!email) throw new Error("user has no email");

      const items = briefByMarket[s.market] || [];
      const delivery = await deliverMarketBrief({ to: email, market: s.market, items, userId: s.user_id });
      if (!delivery.ok) throw new Error(delivery.error || "send failed");
      out.sentTo = email;
      out.count = delivery.count;

      await fetch(`${supabaseUrl}/rest/v1/market_subscriptions?id=eq.${s.id}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
      });
    } catch (e) { out.error = e.message; }
    return out;
  }

  for (let i = 0; i < subs.length; i += concurrency) {
    const batch = subs.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
  }

  const summary = {
    ok: true,
    processed: results.length,
    sent: results.filter(r => r.sentTo && !r.error).length,
    errors: results.filter(r => r.error).length,
    markets: Object.fromEntries(Object.entries(briefByMarket).map(([m, items]) => [m, items.length])),
    results,
  };
  console.log("[cron-market-brief] complete:", JSON.stringify(summary).slice(0, 800));
  await recordCronEnd(
    runId,
    summary.errors === 0 ? "success" : "error",
    { processed: summary.processed, sent: summary.sent, errors: summary.errors },
    summary.errors > 0 ? `${summary.errors} subscription(s) errored` : null
  );
  return res.status(200).json(summary);
}

// ──────────────────────────────────────────────────────────────────────
//   Unsubscribe — HMAC-signed one-click compliance link
//
//   Embedded in every market-brief and trigger-digest email. No auth
//   required to click; the signed token IS the auth. Format:
//
//     {"u": user_id, "m": market | "*", "t": timestamp}.<hex-hmac>
//
//   The body is base64url, the hmac uses CRON_SECRET as the key. Token
//   stays valid for 90 days from issue (re-signed automatically on every
//   email send). Calls handleUnsubscribe to flip enabled=false on the
//   matching subscription(s).
// ──────────────────────────────────────────────────────────────────────

import crypto from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

export function signUnsubscribeToken(userId, market = "*") {
  const secret = process.env.CRON_SECRET || "rizeai-fallback-please-set-CRON_SECRET";
  const payload = JSON.stringify({ u: userId, m: market, t: Date.now() });
  const body = b64url(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 24);
  return `${body}.${sig}`;
}

function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const secret = process.env.CRON_SECRET || "rizeai-fallback-please-set-CRON_SECRET";
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 24);
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    const ageMs = Date.now() - (payload.t || 0);
    // 90-day validity window — generous for an unsubscribe link
    if (ageMs > 90 * 24 * 60 * 60 * 1000) return null;
    return payload;
  } catch { return null; }
}

async function handleUnsubscribe(req, res) {
  const { token } = req.body || {};
  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return res.status(400).json({ ok: false, error: "Invalid or expired unsubscribe link." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ ok: false, error: "Backend not configured." });
  }
  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // m="*" → unsubscribe from every email-enabled subscription for this user.
  // m="calgary" / etc → just that market.
  const marketFilter = payload.m && payload.m !== "*" ? `&market=eq.${encodeURIComponent(payload.m)}` : "";
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/market_subscriptions?user_id=eq.${encodeURIComponent(payload.u)}${marketFilter}`,
      { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ enabled: false }) }
    );
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      console.error("[unsubscribe] Supabase PATCH failed:", r.status, errBody.slice(0, 200));
      return res.status(502).json({ ok: false, error: "Could not update subscription." });
    }
    const rows = await r.json().catch(() => []);
    return res.status(200).json({
      ok: true,
      market: payload.m,
      affected: Array.isArray(rows) ? rows.length : 0,
    });
  } catch (e) {
    console.error("[unsubscribe] fetch error:", e.message);
    return res.status(504).json({ ok: false, error: e.message });
  }
}

// ─── Building Grade Mode ───────────────────────────────────────────────────
// Institutional building quality grade across the four dimensions a
// commercial appraiser uses: Architecture & Finishes, Structure & Systems,
// Amenities & Management, Site & Certifications. Outputs per-dimension
// letter grades + reasoning + an overall asset-class read (A / B / C).
//
// Inputs: address, zoning {code, description, maxStoreys, maxUnits, maxHeightM},
//         assessment {yearBuilt, assessedValue, lotSizeSqM},
//         cmhc {avgRents, vacancyRate} for area context.
// Output: { ok, overall: "B+", class: "B", dimensions: [{name, grade, note}], summary }
//
// Pure inference — no photo, no inspection report. The grade is a
// "first-pass institutional read" the same way a broker grades a
// building from year-built + neighbourhood + assessed-value-per-sqft
// before they ever step inside. Future work: accept user-uploaded
// photos and refine via AI vision.
async function handleBuildingGrade(req, res) {
  const { address, zoning, assessment, cmhc } = req.body || {};
  if (!address) return res.status(400).json({ error: "address required" });

  const template = buildBuildingGradeTemplate({ zoning, assessment, cmhc });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(200).json({ ...template, source: "template" });
  }

  try {
    const prompt = buildBuildingGradePrompt({ address, zoning, assessment, cmhc });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) {
      return res.status(200).json({ ...template, source: "template", note: `AI fallback (${r.status})` });
    }
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return res.status(200).json({ ...template, source: "template" });

    // AI returns JSON inside the response. Extract the first balanced {...}.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(200).json({ ...template, source: "template", note: "AI returned non-JSON" });
    try {
      const parsed = JSON.parse(m[0]);
      return res.status(200).json({ ok: true, ...parsed, source: "ai-fast" });
    } catch {
      return res.status(200).json({ ...template, source: "template", note: "AI JSON parse failed" });
    }
  } catch (e) {
    return res.status(200).json({ ...template, source: "template", note: `AI timeout/error: ${e.message}` });
  }
}

function buildBuildingGradePrompt({ address, zoning, assessment, cmhc }) {
  const age = assessment?.yearBuilt ? (2026 - Math.floor(parseFloat(assessment.yearBuilt))) : null;
  const ageStr = age != null ? `${age} years old (built ${Math.floor(parseFloat(assessment.yearBuilt))})` : "age unknown";
  const psf = (assessment?.assessedValue && assessment?.lotSizeSqM)
    ? `$${Math.round(assessment.assessedValue / (assessment.lotSizeSqM * 10.7639))}/sqft of lot`
    : "psf unknown";
  const vacancyStr = cmhc?.vacancyRate != null ? `${cmhc.vacancyRate}% area vacancy` : "vacancy unknown";

  return `You are an institutional real estate appraiser. Grade the property below across four standard dimensions used in commercial appraisal. Use grades A (institutional / Class A), B+ / B / B- (solid / Class B), C+ / C / C- (functional but tired), D (significant capex / Class C).

PROPERTY: ${address}
AGE: ${ageStr}
ZONING: ${zoning?.code || "unknown"}${zoning?.description ? ` (${zoning.description})` : ""}
  Max storeys: ${zoning?.maxStoreys ?? "n/a"}
  Max units: ${zoning?.maxUnits ?? "n/a"}
  Max height: ${zoning?.maxHeightM != null ? zoning.maxHeightM + "m" : "n/a"}
ASSESSED: ${assessment?.assessedValue ? `$${Math.round(assessment.assessedValue).toLocaleString()}` : "unknown"} (${psf})
MARKET CONTEXT: ${vacancyStr}

Respond with VALID JSON ONLY (no prose before/after, no markdown fences). Schema:
{
  "overall": "B+",          // overall letter grade
  "class": "B",             // asset class A | B | C
  "dimensions": [
    {"name": "Architecture & Finishes", "grade": "B",  "note": "one sentence on exterior aesthetic, era, finish quality"},
    {"name": "Structure & Systems",     "grade": "B-", "note": "one sentence on age-driven HVAC/plumbing/electrical/envelope risk"},
    {"name": "Amenities & Management",  "grade": "C+", "note": "one sentence on amenity profile + likely management quality given building scale"},
    {"name": "Site & Certifications",   "grade": "B",  "note": "one sentence on lot, curb appeal, likely energy/LEED status given age + zone"}
  ],
  "summary": "2-3 sentence asset-class read. Lead with the verdict (Class B+), then the one biggest upside, then the biggest risk."
}

Be honest. Older buildings in suburban zones typically grade C-B-. New downtown high-rises grade A-B+. No flattery — investors read this.`;
}

function buildBuildingGradeTemplate({ zoning, assessment, cmhc }) {
  // Heuristic fallback when AI is unavailable. Grades from age + zone + psf.
  const yr = assessment?.yearBuilt ? Math.floor(parseFloat(assessment.yearBuilt)) : null;
  const age = yr ? (2026 - yr) : null;
  const isDC = /^DC\b|^CD-/i.test(zoning?.code || "");           // mixed-use / comprehensive dev
  const isHighDensity = (zoning?.maxStoreys ?? 0) >= 6 || (zoning?.maxUnits ?? 0) >= 12;

  const archGrade = age == null ? "C+" : age < 10 ? "A-" : age < 25 ? "B" : age < 50 ? "B-" : "C+";
  const sysGrade  = age == null ? "C"  : age < 10 ? "A-" : age < 25 ? "B-" : age < 40 ? "C+" : "C-";
  const amenGrade = isHighDensity ? (isDC ? "B+" : "B") : (age && age < 15 ? "B-" : "C+");
  const siteGrade = isDC ? "B+" : (zoning?.maxUnits >= 4 ? "B" : "B-");

  // Rough overall: weighted average via point map.
  const pts = { "A+":13, A:12, "A-":11, "B+":10, B:9, "B-":8, "C+":7, C:6, "C-":5, D:4 };
  const grades = [archGrade, sysGrade, amenGrade, siteGrade];
  const avg = grades.reduce((s,g) => s + (pts[g] || 6), 0) / 4;
  const overall = Object.entries(pts).sort((a,b) => Math.abs(a[1]-avg) - Math.abs(b[1]-avg))[0][0];
  const cls = avg >= 10 ? "A" : avg >= 8 ? "B" : "C";

  return {
    ok: true,
    overall,
    class: cls,
    dimensions: [
      { name: "Architecture & Finishes", grade: archGrade, note: age != null ? `Built ${yr} — ${age}-year-old envelope and finishes typical of the era.` : "Year built unknown — grade based on zoning era." },
      { name: "Structure & Systems",     grade: sysGrade,  note: age != null && age >= 25 ? `${age}-year-old systems likely require capex on roof, HVAC, and electrical within 5–7 years.` : "Systems likely within useful life; budget routine reserves." },
      { name: "Amenities & Management",  grade: amenGrade, note: isHighDensity ? "Density supports common amenities and professional management." : "Smaller scale — limited amenity load; owner-operator or third-party management." },
      { name: "Site & Certifications",   grade: siteGrade, note: isDC ? "Comprehensive development zone supports mixed use and curb appeal." : "Conventional residential lot; no certification on file in open data." },
    ],
    summary: `First-pass Class ${cls} (${overall}) read based on age, zoning, and density signals. ${age != null && age >= 30 ? "Building age is the dominant grade-down — verify capex plan." : "Modern envelope; verify systems and management on-site."} Photos and an inspection report would refine each dimension by a notch.`,
  };
}

// ─── Rent-Roll → Loss-to-Lease Mode ────────────────────────────────────────
// One round trip: PDF rent roll + city → parsed unitMix + LTL math + AI Read.
//
// Pipeline:
//   1. parse-document (AI) extracts the unitMix array
//   2. lookupCMHC for the city resolves the market rent anchor
//   3. computeLossToLease produces per-unit deltas + totals
//   4. AI generates a 2-3 sentence institutional narrative
//
// All four steps in one server call so the client gets a single object back.
async function handleRentRollLossToLease(req, res) {
  // Tier gate: Scale-only feature. Was previously client-only via freeTier.js
  // (canRentRoll) which any DevTools user could bypass, hitting this endpoint
  // for free. Now enforced server-side.
  try {
    const { requireTier } = await import("./_lib/auth.js");
    await requireTier(req, "scale");
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message });
  }

  const { document, mediaType = "application/pdf", city, province } = req.body || {};
  if (!document || typeof document !== "string") {
    return res.status(400).json({ error: "Missing 'document' (base64 PDF)." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") {
    return res.status(503).json({ error: "AI parsing is not configured." });
  }

  // Lazy import the helpers — top-of-file imports kept clean.
  const { lookupCMHC } = await import("./_lib/cmhc-data.js");
  const { computeLossToLease } = await import("./_lib/lossToLease.js");

  // Resolve CMHC anchor before parsing — fail fast if city isn't covered.
  const cmhc = lookupCMHC(city, province);
  if (!cmhc) {
    return res.status(400).json({
      ok: false,
      error: `No CMHC anchor for "${city}". CMHC covers ~26 Canadian CMAs.`,
    });
  }

  // ── Step 1: parse the rent roll via AI ──
  const b64 = document.replace(/^data:[^;]+;base64,/, "");
  const parsePrompt = `You are extracting a rent roll from a real estate document.

Return STRICT JSON with this shape (no markdown fences, no preamble):
{
  "address": "street address or null",
  "unitCount": integer,
  "unitMix": [
    {
      "unit": "101" or "Suite B" or whatever the row labels it,
      "bedrooms": 0 for bachelor, integer for 1/2/3+,
      "bathrooms": number (0.5 for half),
      "sqft": integer or null,
      "actualRent": current contract monthly rent in dollars, integer. CRITICAL — never null unless vacant,
      "tenancyStart": "YYYY-MM" if visible else null,
      "notes": "vacant" | "month-to-month" | "subsidized" | null
    }
  ]
}

Read EVERY row of the rent table. Do not summarize, do not group, do not average — preserve per-unit variation in rent. If you cannot find a rent table at all, return { "unitMix": [], "error": "No rent table found." }`;

  let parsed;
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
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: parsePrompt },
          ],
        }],
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      return res.status(502).json({ ok: false, error: `Parse failed (${r.status})`, detail: errBody.slice(0, 200) });
    }
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const extracted = extractJSON(text);
    if (!extracted) {
      return res.status(502).json({ ok: false, error: "AI returned non-JSON response", raw: text.slice(0, 400) });
    }
    parsed = extracted;
  } catch (e) {
    return res.status(504).json({ ok: false, error: `Parsing failed: ${e.message}` });
  }

  if (!Array.isArray(parsed?.unitMix) || parsed.unitMix.length === 0) {
    return res.status(200).json({
      ok: false,
      parsed,
      error: parsed?.error || "No rent table detected in this document.",
      hint: "If this is a rent roll, ensure the PDF has the unit-level rent table on a readable page (not a scanned photo).",
    });
  }

  // ── Step 2: compute LTL ──
  const ltl = computeLossToLease({ unitMix: parsed.unitMix, cmhc });
  if (!ltl.ok) {
    return res.status(200).json({ ok: false, parsed, ltl, error: ltl.reason });
  }

  // ── Step 3: generate AI Read narrative (best-effort, never blocks) ──
  let aiRead = null;
  try {
    const t = ltl.totals;
    const aboveMarketNote = ltl.flags.aboveMarketCount > 0
      ? ` ${ltl.flags.aboveMarketCount} of ${t.pricedDoors} units are already at or above market.`
      : "";
    const vacantNote = ltl.flags.vacant > 0
      ? ` ${ltl.flags.vacant} vacant.`
      : "";
    const narrPrompt = `You are an institutional multifamily underwriter. In 2-3 sentences (under 65 words total), write a tight institutional read on this rent roll's loss-to-lease finding.

PROPERTY: ${parsed.address || "address unknown"}
MARKET ANCHOR: CMHC ${ltl.market.dataYear} · ${ltl.market.cma}
DOORS: ${t.doors} (${t.pricedDoors} priced, ${ltl.flags.vacant} vacant, ${ltl.flags.missingBedrooms} ungraded)
ACTUAL: $${t.actualMonthly.toLocaleString()}/mo  MARKET: $${t.marketMonthly.toLocaleString()}/mo
DELTA: $${t.deltaMonthly.toLocaleString()}/mo  ANNUAL: $${t.deltaAnnual.toLocaleString()}
PER DOOR: $${t.perDoorMonthly}/mo  AVG: ${(t.avgUpsidePct * 100).toFixed(1)}% below market
5-YR STRANDED NPV @8%: $${t.stranded5YearNPV.toLocaleString()}${aboveMarketNote}${vacantNote}

Lead with the annual upside dollar figure. Cite the per-door average. Close with whether this is a value-add play or already-at-market. No fluff. Plain English.`;

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
        messages: [{ role: "user", content: narrPrompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const j = await r.json();
      aiRead = j.content?.[0]?.text?.trim() || null;
    }
  } catch (e) {
    // AI Read is optional — failure leaves it null.
    console.warn("[rent-roll-LTL] AI Read failed:", e.message);
  }

  return res.status(200).json({
    ok: true,
    address:    parsed.address,
    unitCount:  parsed.unitCount,
    unitMix:    parsed.unitMix,
    ltl,
    aiRead,
    source:     "claude-sonnet-4-6 + computeLossToLease + haiku-4-5",
  });
}

// ──────────────────────────────────────────────────────────────────────
//   maybeGenerateScanThesis — best-effort AI Read for the digest email
//
//   Mirrors the MarketTriggers in-app AI Read (same metrics, same AI
//   fast-AI call) but adds two email-friendly guarantees:
//     1. Returns null on ANY failure — missing key, slow API, parse
//        error — so the email render path always proceeds.
//     2. Aggressive 6-second timeout so a flaky Anthropic API can't
//        delay the email send.
// ──────────────────────────────────────────────────────────────────────
async function maybeGenerateScanThesis({ triggers, area, propertyType }) {
  if (!Array.isArray(triggers) || triggers.length < 3) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") return null;

  const statusCounts = triggers.reduce((acc, t) => {
    const s = (t.status || "Other").toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const doms = triggers.map(t => Number(t.daysOnMarket)).filter(v => Number.isFinite(v));
  const drops = triggers.map(t => Number(t.priceDrops)).filter(v => Number.isFinite(v));
  const scores = triggers.map(t => Number(t.redevScore)).filter(v => Number.isFinite(v)).sort((a, b) => b - a);
  const avg = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;
  const top3 = [...triggers]
    .sort((a, b) => (Number(b.redevScore) || 0) - (Number(a.redevScore) || 0))
    .slice(0, 3)
    .map(t => `${t.address || "?"} (score ${t.redevScore ?? "?"}, ${t.status || "?"})`)
    .join(" | ");

  const prompt = `You are a real-estate analyst writing the TOP-OF-EMAIL summary for a weekly distress-signal scan. In 1-2 SENTENCES TOTAL (under 40 words), interpret what this scan tells the investor and which 1-2 listings stand out. No fluff, no hedging.

SCAN: ${propertyType || "any"} in ${area || "all areas"}
VERDICT: ${Object.entries(statusCounts).map(([s, n]) => `${n} ${s}`).join(" · ")}

METRICS:
  trigger count: ${triggers.length}
  avg days on market: ${avg(doms) ?? "n/a"}
  max days on market: ${doms.length ? Math.max(...doms) : "n/a"}
  avg price drops per listing: ${avg(drops) ?? "n/a"}
  top redev score: ${scores[0] ?? "n/a"}
  avg redev score: ${avg(scores) ?? "n/a"}

TOP 3 BY REDEV SCORE:
  ${top3 || "n/a"}

Write 1-2 sentences. Start with the headline takeaway. No greetings. No sign-off.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 140,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
//   maybeGenerateBriefThesis — best-effort AI Read for the daily market
//   brief email. Same guarantees as maybeGenerateScanThesis (null on any
//   failure, 6-sec timeout, email never blocks).
//
//   Looks across the day's RSS items (Bank of Canada / Storeys / Better
//   Dwelling) and condenses into "what does the investor need to know
//   about this market right now."
// ──────────────────────────────────────────────────────────────────────
async function maybeGenerateBriefThesis({ items, market }) {
  if (!Array.isArray(items) || items.length < 2) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") return null;

  // Compact headline list — keep prompt under 1k tokens
  const headlines = items.slice(0, 8).map((it, i) =>
    `  ${i+1}. [${it.source}] ${it.title}${it.description ? ` — ${it.description.slice(0, 140)}` : ""}`
  ).join("\n");

  const sourceCounts = items.reduce((acc, it) => {
    acc[it.source] = (acc[it.source] || 0) + 1;
    return acc;
  }, {});

  const prompt = `You are a real-estate analyst writing the TOP-OF-EMAIL summary for a daily market brief. In 1-2 SENTENCES TOTAL (under 45 words), interpret what these news items mean for a real estate investor in ${MARKET_LABEL[market] || "the market"}. No fluff, no hedging. Lead with the most actionable signal.

MARKET: ${MARKET_LABEL[market] || market}
SOURCES: ${Object.entries(sourceCounts).map(([s, n]) => `${n} ${s}`).join(", ")}

HEADLINES:
${headlines}

Write 1-2 sentences. Start with the headline takeaway. If one item dominates (e.g., a Bank of Canada rate decision, a major policy change), lead with that. No greetings. No sign-off.`;

  try {
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
      signal: AbortSignal.timeout(6_000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

// ─── Admin Dashboard Mode ──────────────────────────────────────────────────
// Returns aggregated user + subscription + activity stats. Auth: caller's
// Supabase JWT must belong to an email in the ADMIN_EMAILS env var
// (comma-separated). Without that allowlist set, the endpoint refuses every
// request — fail-closed.
async function handleAdminDashboard(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ ok: false, error: "Backend not configured." });
  }

  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowlist.length) {
    return res.status(503).json({
      ok: false,
      error: "ADMIN_EMAILS not configured. Set the env var to a comma-separated list of admin emails."
    });
  }

  // Verify the caller's JWT and check their email against the allowlist.
  let callerEmail;
  try {
    const { requireUser } = await import("./_lib/auth.js");
    const user = await requireUser(req);
    callerEmail = (user?.email || "").toLowerCase();
  } catch (e) {
    return res.status(e?.status || 401).json({ ok: false, error: e?.message || "Unauthorized" });
  }
  if (!allowlist.includes(callerEmail)) {
    return res.status(403).json({ ok: false, error: "Forbidden — your email is not on the admin allowlist." });
  }

  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. All users via Supabase admin API (paginated, cap at 1000).
    const users = [];
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: sbHeaders });
      if (!r.ok) break;
      const data = await r.json();
      const batch = data?.users || [];
      users.push(...batch);
      if (batch.length < 200) break;
    }

    // 2. Subscription rows → user_id → active plan.
    const subsR = await fetch(`${supabaseUrl}/rest/v1/subscriptions?select=user_id,plan,status,current_period_end&limit=2000`, { headers: sbHeaders });
    const subs = subsR.ok ? await subsR.json() : [];
    const planByUser = new Map();
    for (const s of subs) {
      const active = s.status === "active" || s.status === "trialing";
      planByUser.set(s.user_id, active ? (s.plan || "pro") : "free");
    }

    // 3. Saved-deals total via Content-Range header.
    let totalSavedDeals = 0;
    const dealsR = await fetch(`${supabaseUrl}/rest/v1/saved_deals?select=id`, { headers: { ...sbHeaders, Prefer: "count=exact" } });
    if (dealsR.ok) {
      const cr = dealsR.headers.get("content-range") || "";
      const m = /\/(\d+)$/.exec(cr);
      if (m) totalSavedDeals = parseInt(m[1], 10);
    }

    // 4. Aggregate.
    const now = Date.now();
    const DAY = 86_400_000;
    let signupsLast24h = 0, signupsLast7d = 0, signupsLast30d = 0;
    let activeLast7d   = 0, activeLast30d = 0;
    let freeC = 0, proC = 0, scaleC = 0;
    let confirmedCount = 0;
    let dormantUsers = []; // confirmed but no sign-in in 30d
    let neverSignedIn = []; // confirmed but never signed in at all
    // Last 14 days of signups for the trend sparkline.
    const signupBuckets = Array.from({ length: 14 }, () => 0);
    for (const u of users) {
      const signedUpAt   = u.created_at      ? new Date(u.created_at).getTime()      : 0;
      const lastSignInAt = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      if (u.email_confirmed_at) confirmedCount++;
      if (now - signedUpAt   < DAY)        signupsLast24h++;
      if (now - signedUpAt   < 7  * DAY)   signupsLast7d++;
      if (now - signedUpAt   < 30 * DAY)   signupsLast30d++;
      if (lastSignInAt && now - lastSignInAt < 7  * DAY) activeLast7d++;
      if (lastSignInAt && now - lastSignInAt < 30 * DAY) activeLast30d++;

      // Bucket signups by day-ago for sparkline.
      if (signedUpAt) {
        const daysAgo = Math.floor((now - signedUpAt) / DAY);
        if (daysAgo >= 0 && daysAgo < 14) signupBuckets[13 - daysAgo]++;
      }

      // Dormant: confirmed, signed in at least once, but not in 30d.
      if (u.email_confirmed_at && lastSignInAt && now - lastSignInAt >= 30 * DAY) {
        dormantUsers.push({ id: u.id, email: u.email, lastSignInAt: u.last_sign_in_at });
      }
      // Never signed in: confirmed email but never logged in.
      if (u.email_confirmed_at && !lastSignInAt && signedUpAt && now - signedUpAt > 2 * DAY) {
        neverSignedIn.push({ id: u.id, email: u.email, signedUpAt: u.created_at });
      }

      const p = planByUser.get(u.id) || "free";
      if      (p === "scale") scaleC++;
      else if (p === "pro")   proC++;
      else                    freeC++;
    }
    const mrr = proC * 99 + scaleC * 299;
    const confirmationRate = users.length ? Math.round((confirmedCount / users.length) * 100) : 0;
    // Sort dormant + never-signed-in by recency (most recently dormant first).
    dormantUsers.sort((a, b) => new Date(b.lastSignInAt) - new Date(a.lastSignInAt));
    neverSignedIn.sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

    const recentUsers = users
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map(u => ({
        id:           u.id,
        email:        u.email,
        plan:         planByUser.get(u.id) || "free",
        signedUpAt:   u.created_at,
        lastSignInAt: u.last_sign_in_at,
        confirmed:    !!u.email_confirmed_at,
      }));

    // 5. Latest cron runs — fail-open so a missing cron_runs table never
    // breaks the dashboard, just shows an empty crons object.
    let crons = {};
    try {
      const { getLatestCronRuns } = await import("./_lib/cron-track.js");
      crons = await getLatestCronRuns([
        "cron-digest",
        "cron-market-brief",
        "cron-daily-alerts",
      ]);
    } catch {}

    // 7. Recent errors — last 25 client-side JS errors captured by
    // src/lib/errors.js. Fail-open if table is missing.
    let errors = { recent: [], last24hCount: 0, topRoutes: [] };
    try {
      const errR = await fetch(`${supabaseUrl}/rest/v1/error_logs?select=id,mechanism,message,route,occurred_at,url&order=occurred_at.desc&limit=25`, { headers: sbHeaders });
      if (errR.ok) {
        errors.recent = await errR.json();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        errors.last24hCount = errors.recent.filter(e => new Date(e.occurred_at).getTime() > cutoff).length;
        // Group by route to find hotspots
        const byRoute = {};
        for (const r of errors.recent) {
          byRoute[r.route || "?"] = (byRoute[r.route || "?"] || 0) + 1;
        }
        errors.topRoutes = Object.entries(byRoute)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([route, count]) => ({ route, count }));
      }
    } catch {}

    // 6. Recent leads — last 25, with unread (status='new') count separately.
    // Fail-open if the table is missing.
    let leads = { recent: [], newCount: 0, totalCount: 0, bySource: {} };
    try {
      const leadsR = await fetch(`${supabaseUrl}/rest/v1/leads?select=id,email,name,intent,source,message,created_at,status&order=created_at.desc&limit=25`, { headers: sbHeaders });
      if (leadsR.ok) {
        const rows = await leadsR.json();
        leads.recent = rows;
        leads.newCount = rows.filter(r => r.status === "new").length;
      }
      const countR = await fetch(`${supabaseUrl}/rest/v1/leads?select=id`, { headers: { ...sbHeaders, Prefer: "count=exact" } });
      if (countR.ok) {
        const cr = countR.headers.get("content-range") || "";
        const m = /\/(\d+)$/.exec(cr);
        if (m) leads.totalCount = parseInt(m[1], 10);
      }
      // Aggregate by source for the breakdown chip row.
      for (const r of leads.recent) {
        leads.bySource[r.source || "unknown"] = (leads.bySource[r.source || "unknown"] || 0) + 1;
      }
    } catch {}

    return res.status(200).json({
      ok: true,
      stats: {
        totalUsers:      users.length,
        signupsLast24h,
        signupsLast7d,
        signupsLast30d,
        activeLast7d,
        activeLast30d,
        confirmedCount,
        confirmationRate,
        signupSparkline: signupBuckets,
      },
      plans: { free: freeC, pro: proC, scale: scaleC, total: users.length, mrr },
      churn: {
        dormantCount:       dormantUsers.length,
        neverSignedInCount: neverSignedIn.length,
        dormantTop5:        dormantUsers.slice(0, 5),
        neverSignedInTop5:  neverSignedIn.slice(0, 5),
      },
      recentUsers,
      deals: { totalSavedDeals },
      crons,
      leads,
      errors,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin-dashboard] failed:", e.message);
    return res.status(502).json({ ok: false, error: e.message });
  }
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "cron-daily-alerts"
//   Iterates every enabled deal_alerts row, runs the listing check, diffs
//   new listings vs last_results, sends a Resend digest email to any user
//   with new matches. Folded into ai-chat to stay under Vercel's 12-function
//   Hobby plan cap (same pattern as cron-digest and cron-market-brief).
//
//   Schedule: vercel.json → 0 13 * * * (09:00 America/Toronto EDT)
//   Auth:     Authorization: Bearer <CRON_SECRET>  or  ?token=<CRON_SECRET>
//   Env:      CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL,
//             SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_APP_URL
// ──────────────────────────────────────────────────────────────────────

import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { runAlertCheck } from "./check-alerts.js";

const ALERTS_FROM_DEFAULT = "RizeAI <alerts@rizeai.io>";

function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (header === `Bearer ${secret}`) return true;
  return req.query?.token === secret;
}

function escapeAlertHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const fmtAlertMoney = (n) => (n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`);

function diffAlertListings(currentListings, previousListings) {
  const prevKeys = new Set(
    (previousListings || []).map(l => l.mlsNumber || l.listingUrl).filter(Boolean)
  );
  return (currentListings || []).filter(l => {
    const k = l.mlsNumber || l.listingUrl;
    return k && !prevKeys.has(k);
  });
}

function buildAlertDigestHtml({ alertName, criteria, newListings, dashboardUrl, unsubUrl }) {
  const C = {
    bg: "#ffffff", card: "#f8fafc", text: "#0f172a", sub: "#475569",
    dim: "#94a3b8", blue: "#0066cc", green: "#16a34a", brass: "#d4af37",
  };
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const rowsHtml = newListings.slice(0, 20).map(l => `
    <tr style="border-top:1px solid #e2e8f0">
      <td style="padding:14px 16px;font-family:'Geist',Inter,sans-serif;font-size:14px;color:${C.text};vertical-align:top">
        <div style="font-weight:700;margin-bottom:4px">
          <a href="${escapeAlertHtml(l.listingUrl || "#")}" style="color:${C.text};text-decoration:none">${escapeAlertHtml(l.address || "—")}</a>
        </div>
        <div style="font-size:11px;color:${C.dim};letter-spacing:0.5px;text-transform:uppercase">
          ${l.bedrooms ? `${l.bedrooms} BD` : ""}${l.bathrooms ? ` · ${l.bathrooms} BA` : ""}${l.sqft ? ` · ${Number(l.sqft).toLocaleString()} sqft` : ""}
        </div>
        ${l.city ? `<div style="font-size:11px;color:${C.dim};margin-top:3px">${escapeAlertHtml(l.city)}</div>` : ""}
      </td>
      <td style="padding:14px 16px;text-align:right;vertical-align:top;font-family:'Geist Mono',ui-monospace,monospace;font-size:14px;color:${C.text};white-space:nowrap">
        <div style="font-weight:700;color:${C.green}">${fmtAlertMoney(l.price)}</div>
        ${l.daysOnMarket != null ? `<div style="font-size:11px;color:${C.dim};margin-top:5px">DOM ${l.daysOnMarket}</div>` : ""}
      </td>
      <td style="padding:14px 16px;text-align:right;vertical-align:top;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;white-space:nowrap">
        ${l.listingUrl ? `<a href="${escapeAlertHtml(l.listingUrl)}" style="color:${C.blue};text-decoration:none;font-weight:600">View →</a>` : ""}
      </td>
    </tr>
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>RizeAI · ${escapeAlertHtml(alertName)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Geist',Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${C.text}">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.card};border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #e2e8f0">
        <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:${C.brass};letter-spacing:1.6px;margin-bottom:6px">▸ RIZE AI · DEAL DIGEST</div>
        <div style="font-size:22px;font-weight:800;color:${C.text};letter-spacing:-0.5px">${newListings.length} new ${newListings.length === 1 ? "match" : "matches"}</div>
        <div style="font-size:13px;color:${C.sub};margin-top:5px">${escapeAlertHtml(alertName)} · ${escapeAlertHtml(criteria)}</div>
        <div style="font-size:11px;color:${C.dim};margin-top:8px;letter-spacing:0.5px;text-transform:uppercase">${today}</div>
      </div>
      <table style="width:100%;border-collapse:collapse"><tbody>${rowsHtml}</tbody></table>
      <div style="padding:20px 28px;background:#fff;border-top:1px solid #e2e8f0;text-align:center">
        <a href="${escapeAlertHtml(dashboardUrl)}" style="display:inline-block;background:${C.blue};color:#fff;padding:11px 22px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.5px;text-transform:uppercase">Open in RizeAI →</a>
      </div>
    </div>
    <div style="margin-top:16px;text-align:center;font-size:11px;color:${C.dim};font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.4px">
      <a href="${escapeAlertHtml(unsubUrl)}" style="color:${C.dim};text-decoration:underline">Unsubscribe from this alert</a> · RizeAI · Built in Canada
    </div>
  </div>
</body></html>`;
}

async function sendAlertDigest({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || ALERTS_FROM_DEFAULT;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    return { ok: false, error: `Resend HTTP ${r.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

function summarizeAlertCriteria(alert) {
  const parts = [];
  if (alert.city) parts.push(alert.city);
  if (alert.min_beds) parts.push(`${alert.min_beds}+ beds`);
  if (alert.max_price) parts.push(`under $${Number(alert.max_price).toLocaleString()}`);
  if (alert.prop_type && alert.prop_type !== "Any") parts.push(alert.prop_type);
  return parts.join(" · ");
}

async function handleCronDailyAlerts(req, res) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-daily-alerts");

  const startedAt = new Date().toISOString();
  let supabase;
  try { supabase = getSupabaseAdmin(); }
  catch (e) {
    await recordCronEnd(runId, "error", null, `Supabase init: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }

  const report = { startedAt, processed: 0, skipped: 0, emailed: 0, errors: [] };

  let alerts;
  try {
    const { data, error } = await supabase
      .from("deal_alerts")
      .select("id, user_id, name, country, city, max_price, min_beds, prop_type, email, last_results, enabled")
      .eq("enabled", true);
    if (error) throw error;
    alerts = data || [];
  } catch (e) {
    return res.status(500).json({ error: `DB query failed: ${e.message}` });
  }

  for (const alert of alerts) {
    report.processed++;
    if (!alert.city || !alert.email) { report.skipped++; continue; }

    let result;
    try {
      result = await runAlertCheck({
        city: alert.city,
        country: alert.country || "CA",
        maxPrice: alert.max_price,
        minBeds: alert.min_beds || 1,
      });
    } catch (e) {
      report.errors.push({ id: alert.id, stage: "check", error: e.message });
      continue;
    }

    const newListings = diffAlertListings(result.listings, alert.last_results || []);
    const checkedAt = result.checkedAt || new Date().toISOString();

    try {
      await supabase
        .from("deal_alerts")
        .update({
          last_checked_at: checkedAt,
          last_results: result.listings,
          last_new_count: newListings.length,
        })
        .eq("id", alert.id);
    } catch (e) {
      report.errors.push({ id: alert.id, stage: "persist", error: e.message });
    }

    if (newListings.length === 0) continue;

    const origin = process.env.PUBLIC_APP_URL || "https://www.realdealestate.app";
    const html = buildAlertDigestHtml({
      alertName: alert.name || "Deal Alert",
      criteria: summarizeAlertCriteria(alert),
      newListings,
      dashboardUrl: `${origin}/alerts`,
      unsubUrl: `${origin}/unsubscribe?alert=${encodeURIComponent(alert.id)}`,
    });
    const subject = `${newListings.length} new ${newListings.length === 1 ? "match" : "matches"} — ${alert.name || alert.city}`;
    const send = await sendAlertDigest({ to: alert.email, subject, html });
    if (send.ok) report.emailed++;
    else report.errors.push({ id: alert.id, stage: "email", error: send.error });
  }

  const finishedAt = new Date().toISOString();
  await recordCronEnd(
    runId,
    report.errors.length === 0 ? "success" : "error",
    { processed: report.processed, emailed: report.emailed, skipped: report.skipped, errorCount: report.errors.length },
    report.errors.length > 0 ? `${report.errors.length} alert(s) errored` : null
  );

  return res.status(200).json({ ...report, finishedAt });
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "health"
//   Public-safe health check. No secrets exposed. Reports:
//     - which env vars are configured (booleans, not values)
//     - last run timestamp + status per cron
//     - Supabase reachability (single round-trip)
//   No auth required so a status page / uptime monitor can poll it.
// ──────────────────────────────────────────────────────────────────────
async function handleHealth(req, res) {
  const env = {
    ANTHROPIC:        !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "YOUR_ANTHROPIC_API_KEY"),
    SUPABASE:         !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    STRIPE:           !!process.env.STRIPE_SECRET_KEY,
    RESEND:           !!process.env.RESEND_API_KEY,
    REPLIERS_MLS:     !!process.env.REPLIERS_API_KEY,
    RENTCAST_US:      !!process.env.RENTCAST_API_KEY,
    CRON_SECRET:      !!process.env.CRON_SECRET,
  };

  // Quick Supabase round-trip to confirm reachability.
  let supabaseReachable = false;
  if (env.SUPABASE) {
    try {
      const { getSupabaseAdmin } = await import("./_lib/supabase-admin.js");
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("cron_runs")
        .select("id", { count: "exact", head: true })
        .limit(1);
      // Either "row exists" or "no rows" both prove reachability. Table-missing
      // is also useful information.
      supabaseReachable = !error || /relation.*does not exist/i.test(error.message);
    } catch (e) {
      supabaseReachable = false;
    }
  }

  // Latest run per cron — only fetch if Supabase is up + cron_runs table is in.
  let crons = {};
  if (supabaseReachable) {
    try {
      const { getLatestCronRuns } = await import("./_lib/cron-track.js");
      crons = await getLatestCronRuns([
        "cron-digest",
        "cron-market-brief",
        "cron-daily-alerts",
      ]);
    } catch {}
  }

  // Roll up an overall status: green if essentials are up + no recent cron errors.
  const essential = env.ANTHROPIC && env.SUPABASE && supabaseReachable;
  const recentCronError = Object.values(crons || {}).some(r => r?.status === "error");
  const overall = essential && !recentCronError ? "ok" : essential ? "degraded" : "down";

  return res.status(200).json({
    overall,
    env,
    supabaseReachable,
    crons,
    checkedAt: new Date().toISOString(),
  });
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "cron-monthly-brief"
//   First-Monday-of-month email to newsletter subscribers (leads with
//   source='newsletter'). Content = last-30d shipped changelog entries
//   pulled from a bundled MONTHLY_BRIEF_CONTENT array (edit + redeploy
//   to change what ships this month).
//
//   Env: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL (optional),
//        PUBLIC_APP_URL (optional), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// ──────────────────────────────────────────────────────────────────────

// Edit these entries each month before the cron fires. Newest first.
const MONTHLY_BRIEF_CONTENT = [
  {
    title: "Universal address auto-fill across every calculator",
    body: "Type an address on BRRRR, Commercial, Flip, Rehab, Tax, MortgageQualifier, or LoanCompare — RizeAI now looks up public records and auto-fills year built, sqft, beds/baths, property tax, CMHC rent, and assessed value. Fields you've already typed stay untouched.",
  },
  {
    title: "Deal buddy: benchmarks + coaching + your history",
    body: "Every calculator now surfaces a live 'buddy read' — verdict pill, per-metric coaching notes ('DSCR 1.18 is below the 1.20 lender floor'), city-aware benchmarks, and a comparison against your own past deals when you have 2+ saved.",
  },
  {
    title: "Save & resume across devices",
    body: "Half-finished analysis on your laptop? Continue on your phone. Draft state auto-saves every 700ms to your account so you never lose work.",
  },
  {
    title: "The Canadian RE Underwriting Playbook (free PDF)",
    body: "9-page playbook covering the 4 metrics that predict cash flow, how to read a rent roll in 90 seconds, OSFI B-20 / GDS / TDS / CMHC / CCA gotchas. Download at www.realdealestate.app/playbook.pdf. No email gate.",
  },
];

async function handleCronMonthlyBrief(req, res) {
  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-monthly-brief");
  if (!isCronAuthorized(req)) {
    await recordCronEnd(runId, "error", null, "Unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Vercel cron fires every Monday (schedule "0 13 * * 1"). Only actually
  // send on the FIRST Monday of the month — bail early otherwise. `force=1`
  // query param bypasses the check for manual testing.
  const dom = new Date().getUTCDate();
  const isFirstMonday = dom <= 7;
  if (!isFirstMonday && req.query?.force !== "1") {
    await recordCronEnd(runId, "success", { skipped: true, reason: "not-first-monday", dom });
    return res.status(200).json({ ok: true, skipped: true, note: `not the first Monday (day ${dom})` });
  }

  let supabase;
  try { supabase = getSupabaseAdmin(); }
  catch (e) {
    await recordCronEnd(runId, "error", null, `Supabase init: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }

  // Pull newsletter subscribers — dedupe by email.
  let subs = [];
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("id, email, name")
      .eq("source", "newsletter");
    if (error) throw error;
    const seen = new Set();
    subs = (data || []).filter(l => {
      const e = (l.email || "").toLowerCase().trim();
      if (!e || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
  } catch (e) {
    await recordCronEnd(runId, "error", null, `Read subs: ${e.message}`);
    return res.status(502).json({ error: `Could not read subscribers: ${e.message}` });
  }

  if (subs.length === 0) {
    await recordCronEnd(runId, "success", { sent: 0, note: "no subscribers yet" });
    return res.status(200).json({ ok: true, sent: 0, note: "no subscribers yet" });
  }

  const origin = process.env.PUBLIC_APP_URL || "https://www.realdealestate.app";
  const html = buildMonthlyBriefHtml({ items: MONTHLY_BRIEF_CONTENT, origin });
  const subject = `The RizeAI brief — what shipped in ${new Date().toLocaleString("en-CA", { month: "long", year: "numeric" })}`;

  // Send one email per subscriber, capped at 5 concurrent.
  const results = [];
  const concurrency = 5;
  async function sendOne(sub) {
    try {
      const r = await sendAlertDigest({ to: sub.email, subject, html });
      return { email: sub.email, ok: r.ok, error: r.error || null };
    } catch (e) {
      return { email: sub.email, ok: false, error: e?.message || "send failed" };
    }
  }
  for (let i = 0; i < subs.length; i += concurrency) {
    const batch = subs.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(sendOne));
    results.push(...batchResults);
  }

  const summary = {
    ok: true,
    subscribers: subs.length,
    sent: results.filter(r => r.ok).length,
    errors: results.filter(r => !r.ok).length,
    errorSamples: results.filter(r => !r.ok).slice(0, 3),
  };
  await recordCronEnd(
    runId,
    summary.errors === 0 ? "success" : "error",
    { subscribers: summary.subscribers, sent: summary.sent, errors: summary.errors },
    summary.errors > 0 ? `${summary.errors} sends failed` : null
  );
  return res.status(200).json(summary);
}

function buildMonthlyBriefHtml({ items, origin }) {
  const C = {
    bg: "#ffffff", card: "#f8fafc", text: "#0f172a",
    sub: "#475569", dim: "#94a3b8", brass: "#d4af37", royal: "#2155cd",
  };
  const monthYear = new Date().toLocaleString("en-CA", { month: "long", year: "numeric" });

  const itemsHtml = items.map(it => `
    <div style="padding:18px 22px;border-top:1px solid #e2e8f0">
      <div style="font-size:15px;font-weight:800;color:${C.text};letter-spacing:-0.3px;margin-bottom:6px;line-height:1.35">
        ${escapeAlertHtml(it.title)}
      </div>
      <div style="font-size:13px;color:${C.sub};line-height:1.65">
        ${escapeAlertHtml(it.body)}
      </div>
    </div>
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>RizeAI · ${monthYear} brief</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Geist',Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${C.text}">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.card};border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="padding:26px 28px;border-bottom:1px solid #e2e8f0">
        <div style="font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;color:${C.brass};letter-spacing:1.6px;margin-bottom:8px">▸ RIZE AI · MONTHLY BRIEF</div>
        <div style="font-size:22px;font-weight:800;color:${C.text};letter-spacing:-0.5px">What we shipped in ${monthYear}.</div>
        <div style="font-size:13px;color:${C.sub};margin-top:6px">One short email a month. No fluff.</div>
      </div>
      ${itemsHtml}
      <div style="padding:22px 28px;background:#fff;border-top:1px solid #e2e8f0;text-align:center">
        <a href="${origin}" style="display:inline-block;background:${C.royal};color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px;font-family:'Geist Mono',ui-monospace,Menlo,monospace;letter-spacing:0.5px;text-transform:uppercase">Open RizeAI →</a>
      </div>
      <div style="padding:16px 28px;font-size:11px;color:${C.dim};text-align:center;font-family:'Geist Mono',ui-monospace,Menlo,monospace;letter-spacing:0.3px">
        Full changelog · <a href="${origin}/changelog" style="color:${C.brass};text-decoration:none">${origin.replace(/^https?:\/\//,"")}/changelog</a><br>
        <a href="${origin}/unsubscribe?type=newsletter" style="color:${C.dim};text-decoration:underline">Unsubscribe</a> · RizeAI · Built in Canada
      </div>
    </div>
  </div>
</body></html>`;
}

// ──────────────────────────────────────────────────────────────────────
//   mode: "cron-onboarding"
//   Daily activation-email sequence for new signups.
//
//   Runs every day. For each confirmed user, computes days since signup
//   and sends the appropriate email (Day 0, 1, 3, or 7) if not already
//   sent. Idempotent via onboarding_emails table.
//
//   Env: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, SUPABASE_URL,
//        SUPABASE_SERVICE_ROLE_KEY, PUBLIC_APP_URL.
// ──────────────────────────────────────────────────────────────────────

const ONBOARDING_TEMPLATES = {
  0: {
    subject: "Welcome to RizeAI — here's how to get value in 5 minutes",
    body: ({ origin, name }) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1128;font-family:'Geist',Inter,sans-serif;color:#f0f0f0">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.28);border-left:3px solid #d4af37;border-radius:8px;overflow:hidden">
    <div style="padding:26px 28px;border-bottom:1px solid rgba(212,175,55,0.18)">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:#d4af37;letter-spacing:1.4px;margin-bottom:6px">▸ WELCOME</div>
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">You're in${name ? `, ${escapeAlertHtml(name)}` : ""}.</div>
    </div>
    <div style="padding:24px 28px 8px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d4d8e0">Thanks for signing up. RizeAI is the AI underwriting layer for Canadian real estate — the segment CoStar and Altus refuse to call back at your price point.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#d4d8e0">Here's the fastest path to seeing what it does for your next deal:</p>
      <ol style="margin:0 0 22px 20px;padding:0;font-size:14.5px;line-height:1.75;color:#d4d8e0">
        <li>Type a Calgary or Toronto multifamily address into <a href="${origin}/analyze" style="color:#d4af37">the X-Ray bar</a> — 5 seconds to zoning + assessment + Building Grade</li>
        <li>Drop a broker rent roll PDF onto <a href="${origin}/commercial" style="color:#d4af37">/commercial</a> — AI OCRs every unit, cross-references CMHC, surfaces the stranded upside in dollars</li>
        <li>Save your first deal — it auto-syncs across devices</li>
      </ol>
    </div>
    <div style="padding:0 28px 24px;text-align:center">
      <a href="${origin}/analyze" style="display:inline-block;background:#d4af37;color:#0a1128;padding:13px 28px;border-radius:4px;text-decoration:none;font-weight:800;font-size:13px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.6px;text-transform:uppercase">▸ Analyze your first deal</a>
    </div>
    <div style="padding:16px 28px 20px;background:rgba(0,0,0,0.25);font-size:11.5px;color:#94a3b8;text-align:center;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.3px">
      Reply to this email with a question and I'll answer within 24 hrs.<br>Sunni · founder@rizeai.io
    </div>
  </div>
</div>
</body></html>`,
  },
  1: {
    subject: "Did you get the X-Ray to work yet?",
    body: ({ origin }) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1128;font-family:'Geist',Inter,sans-serif;color:#f0f0f0">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(33,85,205,0.32);border-left:3px solid #2155cd;border-radius:8px;overflow:hidden">
    <div style="padding:26px 28px 8px">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:#5b8eff;letter-spacing:1.4px;margin-bottom:6px">▸ DAY 1 · ACTIVATION</div>
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-bottom:14px">Quick nudge on the X-Ray bar.</div>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0">If yesterday got busy, no worries — 90 seconds is all you need.</p>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Try this: paste any Canadian address you know into the X-Ray bar. If we cover the city (7 so far — Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, Hamilton), you'll see parcel-level zoning, year built, assessed value, CMHC market rent, and an AI Building Grade — in 5 seconds.</p>
    </div>
    <div style="padding:0 28px 24px;text-align:center">
      <a href="${origin}/analyze" style="display:inline-block;background:#2155cd;color:#fff;padding:12px 26px;border-radius:4px;text-decoration:none;font-weight:800;font-size:13px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.6px;text-transform:uppercase">▸ Run an X-Ray now</a>
    </div>
    <div style="padding:14px 28px 18px;background:rgba(0,0,0,0.25);font-size:11px;color:#94a3b8;text-align:center;font-family:'Geist Mono',ui-monospace,monospace">
      Not the right time? <a href="${origin}/unsubscribe?type=onboarding" style="color:#94a3b8">Unsubscribe from the onboarding sequence</a>
    </div>
  </div>
</div>
</body></html>`,
  },
  3: {
    subject: "How Canadian brokers actually use RizeAI",
    body: ({ origin }) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1128;font-family:'Geist',Inter,sans-serif;color:#f0f0f0">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.32);border-left:3px solid #d4af37;border-radius:8px;overflow:hidden">
    <div style="padding:26px 28px 8px">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:#d4af37;letter-spacing:1.4px;margin-bottom:6px">▸ DAY 3 · THE WEDGE</div>
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-bottom:14px">The one feature brokers can't stop using.</div>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Every broker I've onboarded uses one feature more than anything else on the platform:</p>
      <p style="margin:0 0 16px;font-size:16.5px;font-weight:700;line-height:1.5;color:#d4af37;letter-spacing:-0.2px">The rent-roll → Loss-to-Lease parser.</p>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Drag a broker rent roll PDF onto <a href="${origin}/commercial" style="color:#d4af37">/commercial</a>. AI OCRs every unit row, cross-references CMHC market rent for that bedroom count in that metro, and surfaces annual stranded upside in <strong style="color:#fff">dollars</strong>.</p>
      <p style="margin:0 0 8px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Real demo — 24-unit Calgary multifamily, 47-page broker OM:</p>
      <div style="padding:14px 16px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.28);border-radius:5px;margin-bottom:20px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:#f0f0f0;letter-spacing:-0.2px">
        $187K annual upside · $708/door/mo · 38% below market · $460K 5-yr NPV
      </div>
      <p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Surfaced in 5 seconds. No competitor at any price ships this. It's on the <strong style="color:#fff">$299/mo Scale tier</strong>.</p>
    </div>
    <div style="padding:0 28px 24px;text-align:center">
      <a href="${origin}/commercial?demo=1" style="display:inline-block;background:#d4af37;color:#0a1128;padding:12px 26px;border-radius:4px;text-decoration:none;font-weight:800;font-size:13px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.6px;text-transform:uppercase">▸ See the demo live</a>
    </div>
    <div style="padding:14px 28px 18px;background:rgba(0,0,0,0.25);font-size:11px;color:#94a3b8;text-align:center;font-family:'Geist Mono',ui-monospace,monospace">
      Have a rent roll to test? Reply — I'll run it live on Zoom, no strings.
    </div>
  </div>
</div>
</body></html>`,
  },
  7: {
    subject: "One week in — quick check",
    body: ({ origin }) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1128;font-family:'Geist',Inter,sans-serif;color:#f0f0f0">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(34,197,94,0.32);border-left:3px solid #22c55e;border-radius:8px;overflow:hidden">
    <div style="padding:26px 28px 8px">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:#22c55e;letter-spacing:1.4px;margin-bottom:6px">▸ DAY 7 · CHECK-IN</div>
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;margin-bottom:14px">One week. How's it going?</div>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Two questions I want honest answers to:</p>
      <ol style="margin:0 0 20px 20px;padding:0;font-size:14.5px;line-height:1.75;color:#d4d8e0">
        <li>What's the one thing that would make this tool 10x more useful for your workflow?</li>
        <li>What's the one thing that got in the way when you tried to use it this week?</li>
      </ol>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#d4d8e0"><strong style="color:#fff">Hit reply.</strong> These emails come to me directly and every reply shapes what ships next.</p>
      <p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:#d4d8e0">Also — if you haven't gone through <a href="${origin}/playbook.pdf" style="color:#22c55e">the Canadian RE Underwriting Playbook</a> yet, that's the fastest way to get the mental model that makes the rest of the platform click.</p>
    </div>
    <div style="padding:0 28px 24px;text-align:center">
      <a href="mailto:hello@rizeai.io" style="display:inline-block;background:#22c55e;color:#0a1128;padding:12px 26px;border-radius:4px;text-decoration:none;font-weight:800;font-size:13px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.6px;text-transform:uppercase">▸ Reply with feedback</a>
    </div>
    <div style="padding:14px 28px 18px;background:rgba(0,0,0,0.25);font-size:11px;color:#94a3b8;text-align:center;font-family:'Geist Mono',ui-monospace,monospace">
      Last email in the onboarding sequence. Product updates land monthly if you subscribed.
    </div>
  </div>
</div>
</body></html>`,
  },
};

async function sendOnboardingEmail({ to, day, name, origin }) {
  const template = ONBOARDING_TEMPLATES[day];
  if (!template) return { ok: false, error: "unknown day" };
  const html = template.body({ origin, name });
  const subject = template.subject;
  return sendAlertDigest({ to, subject, html });
}

async function handleCronOnboarding(req, res) {
  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-onboarding");
  if (!isCronAuthorized(req)) {
    await recordCronEnd(runId, "error", null, "Unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  let supabase;
  try { supabase = getSupabaseAdmin(); }
  catch (e) {
    await recordCronEnd(runId, "error", null, `Supabase init: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Pull confirmed users. Cap at 3 pages × 200 = 600 users. Above that
  // this loop needs pagination-continuation support.
  let users = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const r = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: sbHeaders });
      if (!r.ok) break;
      const data = await r.json();
      const batch = (data?.users || []).filter(u => u.email_confirmed_at);
      users.push(...batch);
      if (batch.length < 200) break;
    }
  } catch (e) {
    await recordCronEnd(runId, "error", null, `User list: ${e.message}`);
    return res.status(502).json({ error: `Could not list users: ${e.message}` });
  }

  // Pull existing send-history so we know what NOT to re-send.
  let alreadySent = new Set();
  try {
    const { data } = await supabase
      .from("onboarding_emails")
      .select("user_id, day");
    for (const row of (data || [])) alreadySent.add(`${row.user_id}|${row.day}`);
  } catch {}

  const origin = process.env.PUBLIC_APP_URL || "https://www.realdealestate.app";
  const now = Date.now();
  const DAY = 86_400_000;
  const MARKERS = [0, 1, 3, 7];

  const results = { processed: 0, sent: 0, skipped: 0, errors: [] };

  for (const u of users) {
    if (!u.email) continue;
    const anchor = u.email_confirmed_at ? new Date(u.email_confirmed_at).getTime()
                                         : new Date(u.created_at).getTime();
    const daysSince = Math.floor((now - anchor) / DAY);

    let dueMarker = null;
    for (const m of MARKERS) {
      if (daysSince >= m && !alreadySent.has(`${u.id}|${m}`)) {
        dueMarker = m;
      }
    }
    if (dueMarker == null) { results.skipped++; continue; }

    results.processed++;
    const rawMeta = u.user_metadata || u.raw_user_meta_data || {};
    const name = rawMeta.name || rawMeta.full_name || "";

    const send = await sendOnboardingEmail({ to: u.email, day: dueMarker, name, origin });
    if (send.ok) {
      results.sent++;
      try {
        await supabase.from("onboarding_emails").insert({
          user_id: u.id,
          email:   u.email,
          day:     dueMarker,
          result_id: send.id || null,
        });
      } catch (e) {
        results.errors.push({ user: u.email, day: dueMarker, stage: "insert", error: e?.message });
      }
    } else {
      results.errors.push({ user: u.email, day: dueMarker, stage: "send", error: send.error });
    }
  }

  await recordCronEnd(
    runId,
    results.errors.length === 0 ? "success" : "error",
    { processed: results.processed, sent: results.sent, skipped: results.skipped, errorCount: results.errors.length },
    results.errors.length > 0 ? `${results.errors.length} error(s)` : null
  );
  return res.status(200).json({ ok: true, ...results });
}

// ═══════════════════════════════════════════════════════════════════════════
// v1 PUBLIC API — routed via vercel.json rewrites so we stay under the 12
// serverless-function cap. Public URLs:
//   POST /api/v1/verdict → mode=v1-verdict (Scale-tier programmatic access)
//   GET/POST/DELETE /api/v1/keys → mode=v1-keys (internal — key CRUD)
// ═══════════════════════════════════════════════════════════════════════════


const V1_PLAN_QUOTAS = { scale: 5000, enterprise: 100000, pro: 0, free: 0 };

function v1Sha256(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function v1NewRequestId() { return "req_" + crypto.randomBytes(10).toString("hex"); }
function v1Err(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}
function v1ExtractKey(req) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers["x-api-key"] || req.headers["X-API-Key"];
  if (typeof x === "string") return x.trim();
  return null;
}
function v1GenerateKey() {
  const raw = crypto.randomBytes(20).toString("base64")
    .replace(/\+/g, "").replace(/\//g, "").replace(/=/g, "").slice(0, 24);
  return `rzai_live_${raw}`;
}
function v1RedactAddress(addr) {
  if (!addr) return "";
  const parts = String(addr).split(",");
  return (parts[1] || parts[0] || "").trim().slice(0, 60);
}

async function v1GetSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── /api/v1/verdict ───────────────────────────────────────────────────────
async function handleV1Verdict(req, res) {
  const started = Date.now();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const requestId = v1NewRequestId();
  res.setHeader("X-Request-ID", requestId);
  if (req.method !== "POST" && req.method !== "GET") return v1Err(res, 405, "method_not_allowed", "Use POST or GET.");

  let supa;
  try { supa = await v1GetSupabaseAdmin(); }
  catch (e) { console.error("[v1/verdict] supabase init:", e.message); return v1Err(res, 503, "backend_unavailable", "Auth backend unavailable."); }

  // Authenticate
  const rawKey = v1ExtractKey(req);
  if (!rawKey || rawKey.length < 20) return v1Err(res, 401, "invalid_key", "Missing or malformed API key.");
  const { data: keyRow, error: keyErr } = await supa
    .from("api_keys")
    .select("id, user_id, name, plan_tier, monthly_limit, revoked_at")
    .eq("key_hash", v1Sha256(rawKey))
    .maybeSingle();
  if (keyErr) { console.error("[v1/verdict] key lookup:", keyErr.message); return v1Err(res, 500, "auth_lookup_failed", "Auth backend error."); }
  if (!keyRow) return v1Err(res, 401, "invalid_key", "API key not recognized.");
  if (keyRow.revoked_at) return v1Err(res, 401, "revoked_key", "This API key has been revoked.");

  // Resolve tier + quota
  let tier = keyRow.plan_tier || "free";
  try {
    const { data: sub } = await supa.from("subscriptions").select("plan, status").eq("user_id", keyRow.user_id).maybeSingle();
    if (sub?.status === "active" && sub.plan) {
      const rank = { free: 0, pro: 1, scale: 2, enterprise: 3 };
      if ((rank[sub.plan] ?? 0) > (rank[tier] ?? 0)) tier = sub.plan;
    }
  } catch {}
  const quota = keyRow.monthly_limit > 0 ? keyRow.monthly_limit : (V1_PLAN_QUOTAS[tier] ?? 0);
  if (quota <= 0) return v1Err(res, 402, "no_api_access", `API access requires the Scale tier. Current tier: ${tier}.`);

  // Monthly usage check
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supa.from("api_usage").select("id", { count: "exact", head: true })
    .eq("user_id", keyRow.user_id).gte("occurred_at", monthStart.toISOString());
  const used = count || 0;
  if (used >= quota) return v1Err(res, 429, "monthly_quota_exceeded", `Monthly quota of ${quota} calls exceeded. Resets at UTC month boundary.`);

  // Input
  const address = req.method === "POST"
    ? (req.body?.address || "").toString().trim()
    : (req.query?.address || "").toString().trim();
  if (!address || address.length < 6) return v1Err(res, 400, "missing_address", "Request must include a non-empty `address` field.");

  // Call internal property-lookup
  let propertyBlob = null;
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host  = req.headers["x-forwarded-host"] || req.headers.host;
    const propUrl = `${proto}://${host}/api/property-lookup?address=${encodeURIComponent(address)}`;
    const r = await fetch(propUrl);
    if (r.ok) propertyBlob = await r.json();
  } catch (e) { console.warn("[v1/verdict] property-lookup:", e.message); }

  const property = {
    address:           propertyBlob?.address        || address,
    city:              propertyBlob?.city           || null,
    province:          propertyBlob?.province       || null,
    purchasePrice:     propertyBlob?.listPrice      || propertyBlob?.estimatedValue || null,
    estimatedValue:    propertyBlob?.estimatedValue || null,
    rentEstimate:      propertyBlob?.rentEstimate   || null,
    sqft:              propertyBlob?.sqft           || null,
    beds:              propertyBlob?.beds           || null,
    baths:             propertyBlob?.baths          || null,
    units:             propertyBlob?.units          || null,
    propertyTaxAnnual: propertyBlob?.propertyTaxAnnual || null,
    zoning:            propertyBlob?.zoning         || null,
    lotSize:           propertyBlob?.lotSize        || null,
    yearBuilt:         propertyBlob?.yearBuilt      || null,
    source:            propertyBlob?.source         || "api-v1",
  };

  // Verdicts + zoning specs via dynamic import of shared frontend modules
  let verdicts = [], zoningSpecs = null;
  try {
    const strategyMathUrl = new URL("../src/lib/strategyMath.js", import.meta.url);
    const zoningSpecsUrl  = new URL("../src/lib/zoningSpecs.js",  import.meta.url);
    const [{ runAllStrategies }, { getZoningSpecs }] = await Promise.all([
      import(strategyMathUrl.href),
      import(zoningSpecsUrl.href),
    ]);
    verdicts = runAllStrategies(property).map(v => ({
      key: v.key, name: v.name || null, viable: !!v.viable,
      verdict: v.verdict?.label || null, color: v.verdict?.color || null,
      headline: v.headline || null, subhead: v.subhead || null,
      metrics: v.metrics || null, route: v.route || null,
    }));
    if (property.zoning) {
      const specs = getZoningSpecs(property.zoning, property.city || property.address);
      if (specs) zoningSpecs = specs;
    }
  } catch (e) { console.warn("[v1/verdict] math import:", e.message); }

  const durationMs = Date.now() - started;

  // Fire-and-forget usage log
  (async () => {
    try {
      await supa.from("api_usage").insert({
        api_key_id: keyRow.id, user_id: keyRow.user_id,
        endpoint: "/api/v1/verdict", status_code: 200,
        duration_ms: durationMs, request_id: requestId,
        address_hint: v1RedactAddress(address),
      });
      await supa.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } catch (e) { console.warn("[v1/verdict] usage log:", e?.message); }
  })();

  return res.status(200).json({
    success: true, request_id: requestId,
    property, verdicts, zoning_specs: zoningSpecs,
    credits: { used_this_month: used + 1, monthly_limit: quota, tier },
    meta: { duration_ms: durationMs, api_version: "1.0" },
  });
}

// ─── /api/v1/keys (internal — key CRUD via Supabase JWT auth) ──────────────
async function handleV1Keys(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  let supa;
  try { supa = await v1GetSupabaseAdmin(); }
  catch (e) { console.error("[v1/keys] supabase init:", e.message); return v1Err(res, 503, "backend_unavailable", "Auth backend unavailable."); }

  // Verify Supabase JWT
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (typeof auth !== "string" || !auth.toLowerCase().startsWith("bearer ")) {
    return v1Err(res, 401, "no_auth", "Missing Authorization: Bearer <jwt> header.");
  }
  const jwt = auth.slice(7).trim();
  const { data: userRes, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userRes?.user) return v1Err(res, 401, "invalid_jwt", "JWT could not be verified.");
  const userId = userRes.user.id;

  // Resolve tier
  let tier = "free";
  try {
    const { data: sub } = await supa.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle();
    if (sub?.status === "active" && sub.plan) tier = sub.plan;
  } catch {}

  if (req.method === "GET") {
    const { data, error } = await supa.from("api_keys")
      .select("id, name, key_prefix, plan_tier, monthly_limit, created_at, last_used_at, revoked_at")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return v1Err(res, 500, "list_failed", error.message);
    return res.status(200).json({ success: true, keys: data || [], tier });
  }

  if (req.method === "POST") {
    if (tier !== "scale" && tier !== "enterprise") {
      return v1Err(res, 402, "upgrade_required", `API keys require Scale tier. Current tier: ${tier}.`);
    }
    const name = (req.body?.name || "").toString().trim();
    if (!name || name.length > 60) return v1Err(res, 400, "invalid_name", "`name` required (1-60 chars).");
    const rawKey = v1GenerateKey();
    const { data, error } = await supa.from("api_keys").insert({
      user_id: userId, key_hash: v1Sha256(rawKey), key_prefix: rawKey.slice(0, 14),
      name, plan_tier: tier,
    }).select("id, name, key_prefix, created_at").single();
    if (error) return v1Err(res, 500, "insert_failed", error.message);
    return res.status(200).json({
      success: true, key: rawKey,
      warning: "Copy this key now. You won't see the full value again — only the prefix.",
      record: data,
    });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return v1Err(res, 400, "missing_id", "?id query param required.");
    const { error } = await supa.from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId);
    if (error) return v1Err(res, 500, "revoke_failed", error.message);
    return res.status(200).json({ success: true, revoked: true });
  }

  return v1Err(res, 405, "method_not_allowed", "Use GET, POST, or DELETE.");
}

// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY BUY BOX DIGEST — runs Monday 09:00 UTC via vercel.json cron.
// For each user with weekly_digest_enabled=true buy boxes:
//   1. Re-run each watchlist address through /api/property-lookup
//   2. Score against buy box criteria (city fit, price fit, strategy fit)
//   3. If any STRONG_FIT / GOOD_FIT matches → send branded email
//   4. Record buy_box_digest_runs row + touch last_digest_run_at
// ═══════════════════════════════════════════════════════════════════════════
async function handleCronWeeklyBuyBoxDigest(req, res) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const { recordCronStart, recordCronEnd } = await import("./_lib/cron-track.js");
  const runId = await recordCronStart("cron-weekly-buybox-digest");

  const supabase = await v1GetSupabaseAdmin();
  const origin = baseUrlFromReq(req);

  // Only re-run boxes that either have never run OR ran > 6 days ago (dedup
  // window slightly under 7d so cron drift doesn't skip a week).
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString();

  const { data: boxes, error: boxErr } = await supabase
    .from("buy_boxes")
    .select("id, user_id, name, cities, price_min, price_max, strategy, units_min, watchlist_addresses, last_digest_run_at")
    .eq("weekly_digest_enabled", true)
    .or(`last_digest_run_at.is.null,last_digest_run_at.lt.${sixDaysAgo}`)
    .limit(200);

  if (boxErr) {
    await recordCronEnd(runId, "error", {}, boxErr.message);
    return res.status(500).json({ error: boxErr.message });
  }

  const results = { processed: 0, sent: 0, no_matches: 0, errors: [] };

  // Dynamic-import the shared math + zoning modules once at the top so we
  // don't re-import inside the loop.
  let runAllStrategies = null;
  let scoreProperty = null;
  try {
    const strategyMathUrl = new URL("../src/lib/strategyMath.js", import.meta.url);
    const buyBoxLibUrl    = new URL("../src/lib/buyBox.js",       import.meta.url);
    const [sm, bb] = await Promise.all([import(strategyMathUrl.href), import(buyBoxLibUrl.href)]);
    runAllStrategies = sm.runAllStrategies;
    scoreProperty    = bb.scoreProperty;
  } catch (e) {
    console.error("[buybox-digest] module import failed:", e.message);
    await recordCronEnd(runId, "error", {}, `module import: ${e.message}`);
    return res.status(500).json({ error: "module import failed" });
  }

  // Batch users so we don't hammer Supabase.auth.admin.getUserById 200 times.
  // Simpler: query auth.users once for all user_ids in this batch.
  const userIds = [...new Set((boxes || []).map(b => b.user_id))];
  const userEmails = new Map();
  if (userIds.length) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 500 });
      for (const u of users?.users || []) {
        if (userIds.includes(u.id) && u.email) userEmails.set(u.id, u.email);
      }
    } catch (e) {
      console.warn("[buybox-digest] listUsers failed:", e?.message);
    }
  }

  for (const box of boxes || []) {
    results.processed++;
    const email = userEmails.get(box.user_id);
    if (!email) {
      results.errors.push({ box: box.name, error: "no email for user" });
      continue;
    }
    const addresses = (box.watchlist_addresses || []).slice(0, 20);
    if (addresses.length === 0) {
      // No watchlist yet — just touch last_digest_run_at so we don't loop
      await supabase.from("buy_boxes").update({ last_digest_run_at: new Date().toISOString() }).eq("id", box.id);
      results.no_matches++;
      continue;
    }

    // Score each address
    const scored = [];
    for (const addr of addresses) {
      try {
        const r = await fetch(`${origin}/api/property-lookup?address=${encodeURIComponent(addr)}`);
        if (!r.ok) continue;
        const propData = await r.json();
        const property = {
          address:           propData.address        || addr,
          city:              propData.city           || "",
          province:          propData.province       || "",
          purchasePrice:     propData.listPrice      || propData.estimatedValue || null,
          estimatedValue:    propData.estimatedValue || null,
          rentEstimate:      propData.rentEstimate   || null,
          sqft:              propData.sqft           || null,
          beds:              propData.beds           || null,
          baths:             propData.baths          || null,
          units:             propData.units          || null,
          propertyTaxAnnual: propData.propertyTaxAnnual || null,
          zoning:            propData.zoning         || null,
        };
        const strategyResults = runAllStrategies(property);
        const boxCriteria = {
          cities:      box.cities || [],
          priceMin:    box.price_min,
          priceMax:    box.price_max,
          strategy:    box.strategy,
          unitsMin:    box.units_min,
        };
        const scoreBundle = scoreProperty(property, boxCriteria, strategyResults);
        const bestStrategy = strategyResults.find(s => s.viable);
        scored.push({
          address:    addr,
          score:      scoreBundle.score,
          verdict:    scoreBundle.verdict,
          bestStrategy: bestStrategy?.name || null,
          bestHeadline: bestStrategy?.headline || null,
        });
      } catch (e) {
        console.warn(`[buybox-digest] score fail for ${addr}:`, e?.message);
      }
    }

    // Rank by score desc, keep top 5
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = scored.slice(0, 5);
    const strongMatches = top.filter(s => s.verdict === "STRONG_FIT" || s.verdict === "GOOD_FIT");

    let status = "no_matches";
    let emailResultId = null;
    if (strongMatches.length > 0) {
      const html = buildBuyBoxDigestHTML({ boxName: box.name, top, strongCount: strongMatches.length, origin });
      const send = await sendAlertDigest({
        to: email,
        subject: `▸ ${strongMatches.length} new match${strongMatches.length === 1 ? "" : "es"} · ${box.name}`,
        html,
      });
      if (send.ok) {
        status = "sent";
        emailResultId = send.id || null;
        results.sent++;
      } else {
        status = "error";
        results.errors.push({ box: box.name, error: send.error });
      }
    } else {
      results.no_matches++;
    }

    // Record run + update box
    try {
      await supabase.from("buy_box_digest_runs").insert({
        user_id: box.user_id,
        buy_box_id: box.id,
        addresses_processed: addresses.length,
        matches_found: strongMatches.length,
        email_result_id: emailResultId,
        status,
        summary: { top: top.slice(0, 3) },
      });
      await supabase.from("buy_boxes").update({ last_digest_run_at: new Date().toISOString() }).eq("id", box.id);
    } catch (e) {
      console.warn(`[buybox-digest] audit write failed for ${box.name}:`, e?.message);
    }
  }

  await recordCronEnd(
    runId,
    results.errors.length === 0 ? "success" : "error",
    { processed: results.processed, sent: results.sent, no_matches: results.no_matches, errorCount: results.errors.length },
    results.errors.length > 0 ? `${results.errors.length} error(s)` : null
  );
  return res.status(200).json({ ok: true, ...results });
}

/** Branded HTML email — insider-forward voice matching the RizeAI landing. */
function buildBuyBoxDigestHTML({ boxName, top, strongCount, origin }) {
  const boxUrl = `${origin}/buybox`;
  const rows = top.map((m, i) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eef2f7;vertical-align:top;font-family:monospace;color:#d4af37;font-weight:800;">#${i + 1}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #eef2f7;vertical-align:top;">
        <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:3px;">${escapeHtml(m.address)}</div>
        <div style="font-family:monospace;font-size:11.5px;color:#475569;">
          ${m.bestStrategy || "—"} · ${escapeHtml(m.bestHeadline || "")}
        </div>
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #eef2f7;vertical-align:top;text-align:right;font-family:monospace;">
        <div style="font-size:20px;font-weight:800;color:${verdictColor(m.verdict)};line-height:1;margin-bottom:4px;">${m.score}</div>
        <div style="display:inline-block;padding:2px 7px;border-radius:4px;background:${verdictColor(m.verdict)};color:#fff;font-size:9.5px;font-weight:800;letter-spacing:0.6px;">
          ${(m.verdict || "").replace("_", " ")}
        </div>
      </td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Geist','Helvetica Neue',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px -18px rgba(15,23,42,0.12);">

        <!-- Header stripe -->
        <tr><td style="background:#0a1128;padding:22px 26px 20px;">
          <div style="font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1.6px;color:#d4af37;text-transform:uppercase;margin-bottom:6px;">
            ▸ WEEKLY BUY BOX DIGEST
          </div>
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
            ${strongCount} new match${strongCount === 1 ? "" : "es"} in ${escapeHtml(boxName)}
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 26px 8px;">
          <div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:18px;">
            RizeAI re-ran your watchlist against current data. Here are the top matches for this week — sorted by fit score. Click through for the full 4-strategy verdict.
          </div>
        </td></tr>

        <!-- Matches -->
        <tr><td style="padding:0 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef2f7;border-radius:8px;overflow:hidden;">
            ${rows}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 26px 20px;text-align:center;">
          <a href="${boxUrl}" style="display:inline-block;padding:12px 24px;background:#d4af37;color:#0a1128;text-decoration:none;font-family:monospace;font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;border-radius:6px;">
            Open your Buy Box →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 26px 24px;border-top:1px solid #eef2f7;">
          <div style="font-size:11.5px;color:#94a3b8;line-height:1.5;">
            You're getting this because you enabled the weekly digest on your <b>${escapeHtml(boxName)}</b> Buy Box.
            <br />
            <a href="${boxUrl}" style="color:#d4af37;text-decoration:none;">Turn off in /buybox</a> · Not investment advice.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function verdictColor(v) {
  if (v === "STRONG_FIT") return "#16a34a";
  if (v === "GOOD_FIT")   return "#22c55e";
  if (v === "MAYBE")      return "#eab308";
  return "#dc2626";
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC METRICS — powers /live traction dashboard + /pitch investor page.
// Returns aggregated counts from tables that exist. Missing tables (pending
// migrations) return 0 gracefully. Cached 60s to prevent hammering Supabase.
// ═══════════════════════════════════════════════════════════════════════════
let METRICS_CACHE = { at: 0, payload: null };

async function handleMetrics(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=30");

  const now = Date.now();
  if (METRICS_CACHE.payload && now - METRICS_CACHE.at < 60_000) {
    return res.status(200).json({ ...METRICS_CACHE.payload, cached: true });
  }

  let supa;
  try { supa = await v1GetSupabaseAdmin(); }
  catch { return res.status(200).json(getFallbackMetrics()); }

  const safeCount = async (table, filter = null) => {
    try {
      let q = supa.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count } = await q;
      return count || 0;
    } catch { return 0; }
  };

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    lookups_total,
    lookups_month,
    zoning_served,
    api_calls_total,
    api_calls_month,
    buy_boxes_active,
    onboarding_sent,
    cron_runs_success,
    leads_total,
  ] = await Promise.all([
    safeCount("geocode_cache"),
    safeCount("geocode_cache", q => q.gte("cached_at", monthStart.toISOString())),
    safeCount("zoning_cache"),
    safeCount("api_usage"),
    safeCount("api_usage", q => q.gte("occurred_at", monthStart.toISOString())),
    safeCount("buy_boxes"),
    safeCount("onboarding_emails"),
    safeCount("cron_runs", q => q.eq("status", "success")),
    safeCount("leads"),
  ]);

  // Recent lookup addresses (redacted to city only) — makes /live feel alive
  let recent_lookups = [];
  try {
    const { data } = await supa
      .from("geocode_cache")
      .select("city, province, cached_at")
      .order("cached_at", { ascending: false })
      .limit(12);
    recent_lookups = (data || []).map(r => ({
      city: r.city || "",
      province: r.province || "",
      at: r.cached_at,
    }));
  } catch {}

  // City coverage — hardcoded to match zoning specs registry (7 cities)
  const city_coverage = [
    { slug: "calgary",     name: "Calgary",     province: "AB", codes: 10 },
    { slug: "edmonton",    name: "Edmonton",    province: "AB", codes: 6 },
    { slug: "vancouver",   name: "Vancouver",   province: "BC", codes: 5 },
    { slug: "toronto",     name: "Toronto",     province: "ON", codes: 5 },
    { slug: "ottawa",      name: "Ottawa",      province: "ON", codes: 5 },
    { slug: "mississauga", name: "Mississauga", province: "ON", codes: 4 },
    { slug: "hamilton",    name: "Hamilton",    province: "ON", codes: 2 },
  ];

  const payload = {
    generated_at: new Date().toISOString(),
    lookups: {
      total: lookups_total,
      this_month: lookups_month,
    },
    zoning: {
      served_total: zoning_served,
      cities_covered: city_coverage.length,
      codes_registered: city_coverage.reduce((a, c) => a + c.codes, 0),
    },
    api: {
      calls_total: api_calls_total,
      calls_this_month: api_calls_month,
    },
    engagement: {
      buy_boxes_saved: buy_boxes_active,
      onboarding_emails_sent: onboarding_sent,
      leads_captured: leads_total,
    },
    ops: {
      successful_cron_runs: cron_runs_success,
    },
    recent_lookups: recent_lookups.slice(0, 8),
    city_coverage,
    cached: false,
  };

  METRICS_CACHE = { at: now, payload };
  return res.status(200).json(payload);
}

function getFallbackMetrics() {
  return {
    generated_at: new Date().toISOString(),
    lookups: { total: 0, this_month: 0 },
    zoning: { served_total: 0, cities_covered: 7, codes_registered: 37 },
    api: { calls_total: 0, calls_this_month: 0 },
    engagement: { buy_boxes_saved: 0, onboarding_emails_sent: 0, leads_captured: 0 },
    ops: { successful_cron_runs: 0 },
    recent_lookups: [],
    city_coverage: [
      { slug: "calgary",     name: "Calgary",     province: "AB", codes: 10 },
      { slug: "edmonton",    name: "Edmonton",    province: "AB", codes: 6 },
      { slug: "vancouver",   name: "Vancouver",   province: "BC", codes: 5 },
      { slug: "toronto",     name: "Toronto",     province: "ON", codes: 5 },
      { slug: "ottawa",      name: "Ottawa",      province: "ON", codes: 5 },
      { slug: "mississauga", name: "Mississauga", province: "ON", codes: 4 },
      { slug: "hamilton",    name: "Hamilton",    province: "ON", codes: 2 },
    ],
    cached: false,
    fallback: true,
  };
}
