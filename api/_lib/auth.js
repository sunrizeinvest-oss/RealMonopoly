/**
 * Server-side Supabase JWT verification.
 *
 * Usage in a handler:
 *   try { await requireUser(req); }
 *   catch (e) { return res.status(e.status || 401).json({ error: e.message }); }
 *
 * The frontend pulls the access token from `supabase.auth.getSession()` and
 * passes it as `Authorization: Bearer <token>`. We use the service-role key
 * here because `supabase.auth.getUser(token)` server-side requires it to
 * validate signatures against the JWKS.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function authError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function requireUser(req) {
  if (!client) {
    throw authError("Auth not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)", 500);
  }
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw authError("Authorization header missing", 401);

  const token = match[1].trim();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw authError("Invalid or expired token", 401);
  return data.user;
}

/**
 * Look up the caller's subscription row and return { tier, active, userId }.
 *
 * Tier is the source of truth for which paid modes the user can hit:
 *   - "free"   → cannot hit Pro-only or Scale-only modes
 *   - "pro"    → can hit Pro modes (verdict-memo, building-grade, PDF exports)
 *   - "scale"  → all of Pro + Scale-only modes (rent-roll parsing, batch APIs)
 *
 * Returns { tier: "free" } (no throw) for authenticated users with no
 * subscription row — that's the normal state after signup, before checkout.
 */
export async function getSubscription(req) {
  const user = await requireUser(req);
  const { data, error } = await client
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw authError(`Subscription lookup failed: ${error.message}`, 500);

  const active = data?.status === "active" || data?.status === "trialing";
  const tier = active && (data?.plan === "pro" || data?.plan === "scale")
    ? data.plan
    : "free";

  return { userId: user.id, tier, active, raw: data || null };
}

/**
 * Gate helper — 402 Payment Required if the caller isn't on the required tier.
 * Use at the top of a handler:
 *
 *   try {
 *     await requireTier(req, "pro");
 *   } catch (e) {
 *     return res.status(e.status || 401).json({ error: e.message });
 *   }
 */
export async function requireTier(req, minTier /* "pro" | "scale" */) {
  const sub = await getSubscription(req);
  const rank = { free: 0, pro: 1, scale: 2 };
  if ((rank[sub.tier] ?? 0) < (rank[minTier] ?? 99)) {
    throw authError(
      `This feature requires the ${minTier === "scale" ? "Scale" : "Pro"} plan. ` +
      `You're currently on ${sub.tier}. Upgrade at /pricing to unlock.`,
      402  // Payment Required
    );
  }
  return sub;
}
