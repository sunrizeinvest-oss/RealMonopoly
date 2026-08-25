/**
 * shareVerdict — compact URL-safe encoding of a /property snapshot so any
 * lookup can become a public /verdict/b64:<...> link. No backend round-trip;
 * the recipient's browser decodes the payload, re-runs strategy math via
 * runAllStrategies(), and renders the full 4-strategy verdict + zoning specs.
 *
 * URL form:
 *   https://www.realdealestate.app/verdict/b64:<urlSafeBase64(JSON.stringify(payload))>
 *
 * Compact key names keep URLs under ~800 chars for typical properties.
 * URL-safe base64 (─→ +/= replaced with -_) so pastes into Slack/email don't
 * break on the equals sign.
 */

const PREFIX = "b64:";

// ── URL-safe base64 (handles multi-byte chars in addresses like Montréal) ─
// Uses TextEncoder/TextDecoder instead of the deprecated escape/unescape pair,
// which some modern browsers have removed and which mangled certain Unicode
// codepoints (emoji, extended Latin, non-BMP). btoa/atob still handle only
// byte strings, so we round-trip through Uint8Array explicitly.
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64ToUtf8(b64) {
  let std = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (std.length % 4) std += "=";
  const bin = atob(std);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a property snapshot into the URL-safe payload string.
 * Only includes fields needed to reproduce the verdict grid + zoning specs.
 */
export function encodeVerdict(property, opts = {}) {
  const p = property || {};
  const payload = {
    v:   1,
    addr: p.address       || "",
    city: p.city          || "",
    prov: p.province      || "",
    pp:   num(p.purchasePrice || p.listPrice || p.estimatedValue),
    ev:   num(p.estimatedValue),
    re:   num(p.rentEstimate),
    sf:   num(p.sqft),
    bd:   num(p.beds),
    ba:   num(p.baths),
    un:   num(p.units),
    z:    p.zoning        || "",
    pt:   num(p.propertyTaxAnnual),
    ls:   num(p.lotSize),
    t:    Date.now(),
    by:   opts.attribution || "",
  };
  return PREFIX + utf8ToB64(JSON.stringify(payload));
}

/**
 * Decode a payload string back into a property object shaped like what
 * StrategyVerdicts + ZoningSpecsCard expect.
 */
export function decodeVerdict(payload) {
  if (typeof payload !== "string" || !payload.startsWith(PREFIX)) return null;
  try {
    const json = b64ToUtf8(payload.slice(PREFIX.length));
    const parsed = JSON.parse(json);
    if (parsed.v !== 1) return null;
    return {
      address:           parsed.addr || "",
      city:              parsed.city || "",
      province:          parsed.prov || "",
      purchasePrice:     parsed.pp || null,
      estimatedValue:    parsed.ev || null,
      rentEstimate:      parsed.re || null,
      sqft:              parsed.sf || null,
      beds:              parsed.bd || null,
      baths:             parsed.ba || null,
      units:             parsed.un || null,
      zoning:            parsed.z || "",
      propertyTaxAnnual: parsed.pt || null,
      lotSize:           parsed.ls || null,
      generatedAt:       parsed.t || null,
      attribution:       parsed.by || "",
    };
  } catch {
    return null;
  }
}

/**
 * Build the full share URL. Use in "Copy to clipboard" flow.
 */
export function buildVerdictUrl(property, opts = {}) {
  const base = opts.origin || (typeof window !== "undefined" ? window.location.origin : "https://www.realdealestate.app");
  return `${base}/verdict/${encodeVerdict(property, opts)}`;
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
