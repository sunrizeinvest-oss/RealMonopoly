/**
 * shareDeal — URL-safe base64 encoding of a compact deal payload so any
 * saved deal can become a sharable /deal/b64:<...> URL without needing a
 * backend round-trip. Works for BRRRR / Multifamily deals saved to
 * localStorage; Supabase-saved Flip deals continue to use UUID share IDs.
 *
 * Payload schema (v1):
 *   {
 *     v:        1,
 *     type:     "brrrr" | "multifamily" | "flip",
 *     name?:    string,           // user-given deal name
 *     addr?:    string,           // street address
 *     date?:    ISO timestamp,
 *     inputs?:  {...},            // calculator inputs (compact subset)
 *     results?: {...},            // computed metrics
 *     verdict?: string,
 *   }
 *
 * URL form:
 *   https://realdealestate.app/deal/b64:<urlSafeBase64(JSON.stringify(payload))>
 */

const PREFIX = "b64:";

// ── URL-safe base64 ────────────────────────────────────────────────────────
function utf8ToB64(str) {
  // Handle multi-byte chars (addresses with é, ô etc.)
  const utf8 = unescape(encodeURIComponent(str));
  return btoa(utf8)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64ToUtf8(b64) {
  // Restore standard base64 and re-pad
  let std = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (std.length % 4) std += "=";
  return decodeURIComponent(escape(atob(std)));
}

// ── Public API ─────────────────────────────────────────────────────────────
export function encodeDeal(payload) {
  return PREFIX + utf8ToB64(JSON.stringify(payload));
}

export function decodeDeal(shareId) {
  if (typeof shareId !== "string" || !shareId.startsWith(PREFIX)) return null;
  try {
    const json = b64ToUtf8(shareId.slice(PREFIX.length));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isB64ShareId(shareId) {
  return typeof shareId === "string" && shareId.startsWith(PREFIX);
}

export function buildShareUrl(payload, origin) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://realdealestate.app");
  return `${base}/deal/${encodeDeal(payload)}`;
}

// ── Shape adapters — keep payloads small (URLs work best under ~1.5KB) ────
export function adaptBRRRR(deal) {
  const inp = deal.inputs || {};
  const res = deal.results || {};
  return {
    v: 1,
    type: "brrrr",
    name: deal.name || null,
    addr: deal.address || null,
    date: deal.savedAt || null,
    inputs: {
      purchase:    num(inp.purchasePrice),
      rehab:       num(inp.rehabBudget),
      arv:         num(inp.arv),
      rent:        num(inp.monthlyRent),
      refiLTV:     num(inp.refinanceLTV),
      refiRate:    num(inp.refiRate),
      holdYears:   num(inp.holdYears),
    },
    results: {
      cf:      num(res.monthlyCF),
      annCF:   num(res.annualCF),
      dscr:    num(res.dscr),
      coc:     num(res.coc),
      eq:      num(res.equityCreated),
      cli:     num(res.cashLeftInDeal),
      cpo:     num(res.cashPulledOut),
      tci:     num(res.totalCashIn),
      isTrue:  !!res.isTrueBRRRR,
    },
    verdict: deal.verdict || null,
  };
}

export function adaptMultifamily(deal) {
  const inp = deal.inputs || {};
  const res = deal.results || {};
  return {
    v: 1,
    type: "multifamily",
    name: deal.name || null,
    addr: deal.address || null,
    date: deal.savedAt || null,
    inputs: {
      purchase: num(inp.purchasePrice),
      down:     num(inp.downPct),
      rate:     num(inp.interestRate),
      cap:      num(inp.entryCap),
      exitCap:  num(inp.exitCap),
    },
    results: {
      noi:    num(res.noi || res.NOI),
      cf:     num(res.monthlyCF),
      annCF:  num(res.annualCF),
      dscr:   num(res.dscr || res.DSCR),
      coc:    num(res.coc || res.CoC),
      cap:    num(res.capRate),
      irr:    num(res.irr),
      eqMul:  num(res.eqMultiple),
      tci:    num(res.totalCashIn),
    },
    verdict: deal.verdict || null,
  };
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
