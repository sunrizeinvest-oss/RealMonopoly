/**
 * AI year-built estimator — fires when city open-data returns null yearBuilt
 * but we have enough context (address + zoning + assessed value + sqft) to
 * make a defensible inference.
 *
 * Currently active for Edmonton (whose open-data assessment dataset doesn't
 * publish year_of_construction). The same module works for any city where
 * the field is missing — just leaves the result untouched if signals are
 * insufficient.
 *
 * INFERENCE BACKBONE:
 *   1. Heuristic table (fast, $0): Edmonton neighbourhood → typical era
 *   2. Claude haiku-4-5 fallback when the neighbourhood isn't in the table
 *      OR when the heuristic returns "uncertain"
 *
 * Returns null on insufficient signals or any error — caller treats the
 * field as still-unknown rather than guessing wildly.
 *
 * Output shape:
 *   {
 *     estimatedYear: 1968,
 *     confidence:    "medium",   // "low" | "medium" | "high"
 *     reasoning:     "Mature single-family neighbourhood; assessed PSF
 *                     consistent with 1960-1975 stock; zoning RF1 typical
 *                     of post-war infill.",
 *     source:        "heuristic" | "claude-haiku-4-5"
 *   }
 */

// ── Edmonton neighbourhood → typical development era table ─────────────────
// Compiled from City of Edmonton's neighbourhood profiles. Each entry is a
// reasonable midpoint with a ±15 year band; the caller should treat these
// as the AI's "first guess" and surface confidence accordingly.
//
// Most reliable for residential neighbourhoods; commercial / industrial
// parcels skew lopsidedly newer or vary wildly within a neighbourhood,
// so we fall through to Claude for those.
const EDMONTON_NEIGHBOURHOODS = {
  // ── Pre-WW1 / early streetcar suburbs (1900-1920) ──
  "central mcdougall":   { year: 1910, confidence: "medium" },
  "mcdougall":           { year: 1910, confidence: "medium" },
  "rossdale":            { year: 1905, confidence: "medium" },
  "queen mary park":     { year: 1912, confidence: "medium" },
  "westmount":           { year: 1915, confidence: "high"   },
  "highlands":           { year: 1912, confidence: "high"   },
  "strathcona":          { year: 1908, confidence: "high"   },
  "garneau":             { year: 1915, confidence: "high"   },
  "ritchie":             { year: 1918, confidence: "medium" },
  "boyle street":        { year: 1908, confidence: "medium" },

  // ── Interwar / early postwar (1925-1955) ──
  "glenora":             { year: 1935, confidence: "high"   },
  "crestwood":           { year: 1950, confidence: "high"   },
  "parkdale":            { year: 1925, confidence: "medium" },
  "norwood":             { year: 1930, confidence: "medium" },
  "delton":              { year: 1935, confidence: "medium" },
  "alberta avenue":      { year: 1928, confidence: "medium" },
  "calder":              { year: 1935, confidence: "medium" },
  "north glenora":       { year: 1955, confidence: "medium" },
  "queen alexandra":     { year: 1938, confidence: "medium" },
  "bonnie doon":         { year: 1948, confidence: "medium" },
  "hazeldean":           { year: 1948, confidence: "medium" },
  "forest heights":      { year: 1948, confidence: "medium" },
  "holyrood":            { year: 1950, confidence: "medium" },

  // ── Postwar bungalow boom (1955-1970) ──
  "belgravia":           { year: 1960, confidence: "high"   },
  "lansdowne":           { year: 1965, confidence: "high"   },
  "windsor park":        { year: 1955, confidence: "medium" },
  "argyll":              { year: 1968, confidence: "medium" },
  "capilano":            { year: 1965, confidence: "medium" },
  "ottewell":            { year: 1965, confidence: "medium" },
  "fulton place":        { year: 1965, confidence: "medium" },
  "gold bar":            { year: 1968, confidence: "medium" },
  "beverly heights":     { year: 1958, confidence: "medium" },
  "rideau park":         { year: 1965, confidence: "medium" },
  "richfield":           { year: 1968, confidence: "medium" },

  // ── 70s/80s sprawl (1970-1990) ──
  "mill woods":          { year: 1978, confidence: "high"   },
  "millhurst":           { year: 1978, confidence: "medium" },
  "lakewood":            { year: 1980, confidence: "medium" },
  "sakaw":               { year: 1980, confidence: "medium" },
  "tweddle place":       { year: 1982, confidence: "medium" },
  "weinlos":             { year: 1980, confidence: "medium" },
  "wild rose":           { year: 1985, confidence: "medium" },
  "rideau":              { year: 1982, confidence: "medium" },
  "satoo":               { year: 1982, confidence: "medium" },
  "michaels park":       { year: 1985, confidence: "medium" },
  "kameyosek":           { year: 1980, confidence: "medium" },
  "knottwood":           { year: 1985, confidence: "medium" },
  "ekota":               { year: 1985, confidence: "medium" },
  "lee ridge":           { year: 1988, confidence: "medium" },
  "callingwood":         { year: 1982, confidence: "medium" },
  "westridge":           { year: 1985, confidence: "medium" },
  "rio terrace":         { year: 1972, confidence: "medium" },
  "lessard":             { year: 1985, confidence: "medium" },

  // ── 90s/early 2000s (1990-2005) ──
  "summerside":          { year: 2002, confidence: "high"   },
  "ellerslie":           { year: 1998, confidence: "medium" },
  "rutherford":          { year: 2003, confidence: "high"   },
  "macewan":             { year: 2000, confidence: "medium" },
  "twin brooks":         { year: 1995, confidence: "medium" },
  "magrath heights":     { year: 2002, confidence: "high"   },
  "terwillegar towne":   { year: 2001, confidence: "high"   },
  "ozerna":              { year: 1995, confidence: "medium" },
  "klarvatten":          { year: 1995, confidence: "medium" },
  "hollick-kenyon":      { year: 1995, confidence: "medium" },
  "kilkenny":            { year: 1992, confidence: "medium" },

  // ── Post-2005 newer growth ──
  "windermere":          { year: 2010, confidence: "high"   },
  "ambleside":           { year: 2012, confidence: "high"   },
  "callaghan":           { year: 2014, confidence: "high"   },
  "secord":              { year: 2016, confidence: "high"   },
  "stillwater":          { year: 2016, confidence: "high"   },
  "trumpeter":           { year: 2018, confidence: "high"   },
  "rosenthal":           { year: 2014, confidence: "high"   },
  "starling":            { year: 2018, confidence: "high"   },
  "keswick":             { year: 2016, confidence: "high"   },
  "glenridding":         { year: 2014, confidence: "high"   },
  "chappelle":           { year: 2014, confidence: "high"   },
  "walker":              { year: 2014, confidence: "high"   },
  "the hamptons":        { year: 2008, confidence: "high"   },
};

const CURRENT_YEAR = 2026;

/**
 * Try the heuristic neighbourhood table first. Returns null if the address
 * doesn't include a known neighbourhood name.
 */
function heuristicGuess({ address, neighbourhood }) {
  if (!address && !neighbourhood) return null;
  const haystack = `${neighbourhood || ""} ${address || ""}`.toLowerCase();

  // Sort longest-first so "north glenora" matches before "glenora".
  const keys = Object.keys(EDMONTON_NEIGHBOURHOODS).sort((a, b) => b.length - a.length);
  for (const n of keys) {
    if (haystack.includes(n)) {
      const hit = EDMONTON_NEIGHBOURHOODS[n];
      return {
        estimatedYear: hit.year,
        confidence:    hit.confidence,
        reasoning:     `Edmonton neighbourhood "${n}" — typical era ${hit.year - 7}-${hit.year + 7}.`,
        source:        "heuristic",
      };
    }
  }
  return null;
}

/**
 * Claude fallback. Cheap (<150 tokens out). Bounded 6s timeout. Returns
 * null on parse failure, timeout, or missing API key.
 */
async function claudeGuess({ address, zoning, assessedValue, sqft, propertyType, taxClass, neighbourhood }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_ANTHROPIC_API_KEY") return null;

  const psf = (assessedValue && sqft) ? Math.round(assessedValue / sqft) : null;
  const prompt = `You are estimating the year a Canadian building was constructed, with no inspection or photo — just civic data.

PROPERTY: ${address || "address unknown"}
NEIGHBOURHOOD: ${neighbourhood || "unknown"}
ZONING: ${zoning || "unknown"}
ASSESSED VALUE: ${assessedValue ? `$${Math.round(assessedValue).toLocaleString()}` : "unknown"}
SQUARE FEET (if known): ${sqft || "unknown"}
ASSESSED PSF (if computable): ${psf ? `$${psf}/sqft` : "unknown"}
PROPERTY TYPE: ${propertyType || "unknown"}
TAX CLASS: ${taxClass || "unknown"}

Return STRICT JSON ONLY (no markdown, no preamble, no fences). Schema:
{
  "estimatedYear": INT 1880-${CURRENT_YEAR} or null if you genuinely cannot guess,
  "confidence":    "low" | "medium" | "high",
  "reasoning":     1-2 sentence explanation of which signals drove the guess
}

Be honest. A typical Canadian core neighbourhood with $300-500/sqft assessed value and "R" zoning is usually 1965-1985. New suburban developments in cities like Edmonton skew 2005+. If you have no anchor, output null with low confidence.`;

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
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (parsed.estimatedYear == null) return null;
    const year = parseInt(parsed.estimatedYear, 10);
    if (!Number.isFinite(year) || year < 1880 || year > CURRENT_YEAR) return null;
    return {
      estimatedYear: year,
      confidence:    parsed.confidence || "low",
      reasoning:     parsed.reasoning || "Inferred from civic + assessment signals.",
      source:        "claude-haiku-4-5",
    };
  } catch {
    return null;
  }
}

/**
 * Public entry point.
 * Returns null when there's not enough context to attempt an estimate.
 */
export async function estimateYearBuilt({
  address, neighbourhood, zoning, assessedValue, sqft, propertyType, taxClass,
} = {}) {
  // Need at least an address or neighbourhood to anchor.
  if (!address && !neighbourhood) return null;
  // Without an assessed value or zoning, the AI guess is too speculative.
  if (!assessedValue && !zoning && !neighbourhood) return null;

  // 1. Heuristic first (instant, $0).
  const heur = heuristicGuess({ address, neighbourhood });
  if (heur && heur.confidence !== "low") return heur;

  // 2. Claude haiku fallback.
  const ai = await claudeGuess({
    address, zoning, assessedValue, sqft, propertyType, taxClass, neighbourhood,
  });
  if (ai) return ai;

  // 3. If heuristic returned a low-confidence guess and AI failed, return it.
  return heur;
}
