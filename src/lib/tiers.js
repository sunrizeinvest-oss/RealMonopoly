/**
 * Tier definitions + feature-to-tier mapping.
 *
 * Three tiers:
 *   FREE  — visitors browsing the platform. 3 saved deals max; basic flow.
 *   PRO   — $99/mo (Tier 1 in the two-tier roadmap). Retail residential
 *           investors. Unlimited deals up to 10 properties, all calculators,
 *           predict-rent, all 3 PDF exports.
 *   SCALE — $299/mo (Tier 2). Commercial brokers, land developers,
 *           wholesalers. Everything in PRO unlimited + the AI-heavy Tier 2
 *           features (PDF parsing, comp matrix, risk simulator, market
 *           triggers, advanced city zoning).
 *
 * The existing Supabase `subscriptions.plan` column uses string values:
 *   - null / "free" → FREE
 *   - "pro"         → PRO
 *   - "scale"       → SCALE
 */

export const TIER = {
  FREE:  "free",
  PRO:   "pro",
  SCALE: "scale",
};

export const TIER_ORDER = [TIER.FREE, TIER.PRO, TIER.SCALE];

export function tierRank(t) {
  const i = TIER_ORDER.indexOf(t);
  return i < 0 ? 0 : i;
}

/**
 * Does the user's current tier meet (or exceed) the required tier?
 *   tierMeets("pro",   "free") → true
 *   tierMeets("pro",   "scale") → false
 *   tierMeets("scale", "scale") → true
 */
export function tierMeets(userTier, required) {
  return tierRank(userTier) >= tierRank(required);
}

/**
 * Feature → minimum tier required. Used by both the frontend TierGate and
 * the backend gating middleware so they stay in sync.
 *
 * Adding a new Tier 2 feature? Add the key here, drop a <TierGate
 * tier={requiredTier("...")}> around it in the UI, and add a server-side
 * check in the matching api route.
 */
export const FEATURE_TIER = {
  // Free features — anyone with an account
  "calc.flip":             TIER.FREE,
  "calc.brrrr":            TIER.FREE,
  "calc.commercial":       TIER.FREE,
  "calc.compare":          TIER.FREE,
  "save.deal":             TIER.FREE,   // capped at 3 below

  // Pro ($99/mo) — Tier 1
  "save.deal.unlimited":   TIER.PRO,
  "predict.rent":          TIER.PRO,
  "pdf.export":            TIER.PRO,
  "pdf.offer-letter":      TIER.PRO,
  "pipeline.full":         TIER.PRO,

  // Scale ($299/mo) — Tier 2
  "ai.document-drop":      TIER.SCALE,
  "ai.find-comps":         TIER.SCALE,
  "ai.find-triggers":      TIER.SCALE,
  "matrix.commercial":     TIER.SCALE,
  "simulator.monte-carlo": TIER.SCALE,
  "triggers.market":       TIER.SCALE,
  "zoning.vancouver":      TIER.SCALE,
  "zoning.toronto":        TIER.SCALE,
};

export function requiredTier(featureKey) {
  return FEATURE_TIER[featureKey] || TIER.FREE;
}

// Pretty labels for the UI
export const TIER_LABEL = {
  [TIER.FREE]:  "Free",
  [TIER.PRO]:   "Pro",
  [TIER.SCALE]: "Scale",
};
export const TIER_PRICE_LABEL = {
  [TIER.FREE]:  "$0",
  [TIER.PRO]:   "$99/mo",
  [TIER.SCALE]: "$299/mo",
};

// Color tokens by tier
export const TIER_COLOR = {
  [TIER.FREE]:  "var(--sub)",
  [TIER.PRO]:   "var(--blue)",
  [TIER.SCALE]: "var(--purple)",
};
