/**
 * Supabase-backed per-IP daily rate limit for expensive endpoints.
 *
 * Strategy:
 *   - Anonymous user → counts against a per-IP-hash, per-day quota
 *   - Authenticated user (Bearer header present) → bypass, unlimited for now
 *
 * Why Supabase and not in-memory? Vercel serverless instances are ephemeral;
 * an in-memory Map gives zero protection across cold starts. Supabase is
 * already wired (Stripe webhook uses it), so the marginal cost is one tiny
 * table + ~50ms per call.
 *
 * Required table (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS anon_rate_limits (
 *     ip_hash    TEXT NOT NULL,
 *     key        TEXT NOT NULL,
 *     count      INT  NOT NULL DEFAULT 0,
 *     updated_at TIMESTAMPTZ DEFAULT now(),
 *     PRIMARY KEY (ip_hash, key)
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_anon_rate_limits_updated
 *     ON anon_rate_limits(updated_at);
 *
 * To prune old rows periodically:
 *   DELETE FROM anon_rate_limits WHERE updated_at < now() - interval '30 days';
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 32);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check whether the request is over the per-IP daily limit.
 * Authenticated users (Bearer header) bypass.
 *
 * @returns { ok: boolean, remaining: number, isAuthed: boolean, note?: string }
 */
export async function checkRateLimit(req, { limit = 3, name = "ai-analyze" } = {}) {
  // Authed user → bypass
  const auth = req.headers.authorization || req.headers.Authorization || "";
  if (/^Bearer\s+\S+/.test(auth)) {
    return { ok: true, remaining: Infinity, isAuthed: true };
  }

  // No persistence configured → fail-open (don't break the product if env is missing)
  if (!supabase) {
    return { ok: true, remaining: limit, isAuthed: false, note: "rate-limit not configured" };
  }

  const ip = clientIp(req);
  if (!ip) {
    return { ok: true, remaining: limit, isAuthed: false, note: "no client ip header" };
  }
  const ipHash = hashIp(ip);
  const key = `${name}:${todayUTC()}`;

  // Read current count
  const { data: row, error: readErr } = await supabase
    .from("anon_rate_limits")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("key", key)
    .maybeSingle();

  if (readErr) {
    // Table missing or permission issue → fail-open with a clear note
    return { ok: true, remaining: limit, isAuthed: false, note: `rate-limit read err: ${readErr.message}` };
  }

  const count = row?.count ?? 0;
  if (count >= limit) {
    return { ok: false, remaining: 0, isAuthed: false };
  }

  // Upsert incremented count
  const { error: writeErr } = await supabase
    .from("anon_rate_limits")
    .upsert(
      { ip_hash: ipHash, key, count: count + 1, updated_at: new Date().toISOString() },
      { onConflict: "ip_hash,key" },
    );

  if (writeErr) {
    return { ok: true, remaining: limit - count - 1, isAuthed: false, note: `rate-limit write err: ${writeErr.message}` };
  }

  return { ok: true, remaining: limit - count - 1, isAuthed: false };
}
