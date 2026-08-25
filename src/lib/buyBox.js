/**
 * buyBox.js — pure module for Buy Box definition, storage, and match scoring.
 *
 * A Buy Box is a broker/investor's saved investment criteria:
 *   { name, assetClasses, cities, priceMin, priceMax, capRateMin, unitsMin,
 *     strategy, notes }
 *
 * Users save multiple Buy Boxes (one for infill duplexes, one for MF value-add,
 * etc.) and run batches of candidate addresses against them.
 *
 * Storage: localStorage.rde_buyboxes = [{...}]
 * Scoring: 0-100 numeric per property, weighted by fit dimension.
 */

const STORAGE_KEY = "rde_buyboxes";

export const ASSET_CLASSES = [
  { id: "sfh",         label: "Single Family",   icon: "🏠" },
  { id: "duplex",      label: "Duplex / Triplex",icon: "🏘️" },
  { id: "small_mf",    label: "Small MF (4-19)", icon: "🏢" },
  { id: "large_mf",    label: "Large MF (20+)",  icon: "🏬" },
  { id: "retail",      label: "Retail Strip",    icon: "🏪" },
  { id: "mixed_use",   label: "Mixed-Use",       icon: "🏙️" },
  { id: "land",        label: "Land / Dev Site", icon: "🌾" },
  { id: "industrial",  label: "Industrial",      icon: "🏭" },
];

export const CA_CITIES = [
  { id: "calgary",     label: "Calgary" },
  { id: "edmonton",    label: "Edmonton" },
  { id: "vancouver",   label: "Vancouver" },
  { id: "toronto",     label: "Toronto" },
  { id: "ottawa",      label: "Ottawa" },
  { id: "mississauga", label: "Mississauga" },
  { id: "hamilton",    label: "Hamilton" },
];

export const STRATEGIES = [
  { id: "hold",   label: "Buy & Hold", icon: "🏠" },
  { id: "brrrr",  label: "BRRRR",      icon: "🔄" },
  { id: "flip",   label: "Fix & Flip", icon: "🏚️" },
  { id: "mf",     label: "Multifamily",icon: "🏢" },
];

/** Blank template for the "new buy box" form. */
export const EMPTY_BUYBOX = {
  id: null,
  name: "",
  assetClasses: [],
  cities: [],
  priceMin: "",
  priceMax: "",
  capRateMin: "",
  unitsMin: "",
  strategy: "",
  notes: "",
};

/** Read all saved Buy Boxes. Returns empty array on any error. */
export function loadBuyBoxes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Persist the full array. */
function writeBuyBoxes(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}

/** Save or update — returns the array with the change applied. */
export function saveBuyBox(box) {
  const arr = loadBuyBoxes();
  const now = new Date().toISOString();
  if (!box.id) {
    const nu = { ...box, id: Date.now(), createdAt: now, updatedAt: now };
    arr.unshift(nu);
  } else {
    const i = arr.findIndex(b => b.id === box.id);
    if (i >= 0) arr[i] = { ...arr[i], ...box, updatedAt: now };
    else arr.unshift({ ...box, createdAt: now, updatedAt: now });
  }
  writeBuyBoxes(arr);
  return arr;
}

/** Delete by id — returns the remaining array. */
export function deleteBuyBox(id) {
  const arr = loadBuyBoxes().filter(b => b.id !== id);
  writeBuyBoxes(arr);
  return arr;
}

/**
 * Parse a pasted address list. Splits on newlines, trims, dedupes, caps at
 * 20 entries so runaway pastes don't burn API quota / free-tier limits.
 */
export function parseAddressList(text) {
  const raw = String(text || "").split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of raw) {
    const t = line.trim();
    if (!t) continue;
    if (t.length < 8) continue;                     // "123 St" is too short to be real
    const key = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 20) break;                    // hard cap
  }
  return out;
}

/**
 * Score a property against a Buy Box. Returns a bundle:
 *   { score, verdict, breakdown }
 *
 * score      — 0-100
 * verdict    — "STRONG_FIT" | "GOOD_FIT" | "MAYBE" | "POOR_FIT"
 * breakdown  — per-dimension fit reasons ["City ✓", "Price under max ✓", ...]
 *
 * Buy Box fields with empty / null values contribute NEUTRALLY (no penalty,
 * no bonus). So a Buy Box with only `cities` set only scores city fit.
 */
export function scoreProperty(property, buyBox, strategyResults = []) {
  if (!property || !buyBox) return { score: 0, verdict: "POOR_FIT", breakdown: [] };

  const breakdown = [];
  let score = 0;
  let weight = 0;

  // City fit — 25 pts if buyBox has cities set
  if (buyBox.cities?.length) {
    weight += 25;
    const propCity = String(property.city || "").toLowerCase();
    const match = buyBox.cities.find(c =>
      propCity.includes(c) || propCity.includes(c.replace("_", " "))
    );
    if (match) {
      score += 25;
      breakdown.push({ label: `City: ${match}`, ok: true });
    } else {
      breakdown.push({ label: `City: not in list`, ok: false });
    }
  }

  // Price fit — 25 pts if either min or max is set
  const price = Number(property.purchasePrice || property.estimatedValue || property.listPrice || 0);
  const priceMin = Number(buyBox.priceMin) || 0;
  const priceMax = Number(buyBox.priceMax) || 0;
  if (priceMin || priceMax) {
    weight += 25;
    const okMin = !priceMin || price >= priceMin;
    const okMax = !priceMax || price <= priceMax;
    if (price > 0 && okMin && okMax) {
      score += 25;
      breakdown.push({ label: `Price: $${Math.round(price/1000)}K in range`, ok: true });
    } else if (price === 0) {
      breakdown.push({ label: `Price: not returned`, ok: null });
    } else {
      breakdown.push({ label: `Price: $${Math.round(price/1000)}K out of range`, ok: false });
    }
  }

  // Strategy fit — 30 pts if buyBox has strategy preference
  if (buyBox.strategy && strategyResults.length > 0) {
    weight += 30;
    const preferred = strategyResults.find(r => r.key === buyBox.strategy);
    if (preferred?.viable) {
      const rank = { STRONG: 30, GO: 22, CAUTION: 10, PASS: 0 };
      const points = rank[preferred.verdict?.label] || 0;
      score += points;
      breakdown.push({
        label: `${preferred.name}: ${preferred.verdict?.label || "?"}`,
        ok: points >= 22,
      });
    } else {
      breakdown.push({ label: `${buyBox.strategy}: not viable`, ok: false });
    }
  }

  // Unit count fit — 20 pts for MF-strategy buy boxes
  const unitsMin = Number(buyBox.unitsMin) || 0;
  if (unitsMin > 0) {
    weight += 20;
    const units = Number(property.units) || 0;
    if (units >= unitsMin) {
      score += 20;
      breakdown.push({ label: `Units: ${units} ≥ ${unitsMin}`, ok: true });
    } else if (units === 0) {
      breakdown.push({ label: `Units: unknown`, ok: null });
    } else {
      breakdown.push({ label: `Units: ${units} < ${unitsMin}`, ok: false });
    }
  }

  // Normalize to 0-100 if any weight was applied
  const pct = weight > 0 ? Math.round((score / weight) * 100) : 0;
  const verdict =
    pct >= 80 ? "STRONG_FIT" :
    pct >= 60 ? "GOOD_FIT" :
    pct >= 40 ? "MAYBE" :
    "POOR_FIT";

  return { score: pct, verdict, breakdown };
}

/** Human labels + colors for the fit verdict pills. */
export const VERDICT_STYLES = {
  STRONG_FIT: { label: "STRONG FIT", color: "#16a34a" },
  GOOD_FIT:   { label: "GOOD FIT",   color: "#22c55e" },
  MAYBE:      { label: "MAYBE",      color: "#eab308" },
  POOR_FIT:   { label: "POOR FIT",   color: "#dc2626" },
};
