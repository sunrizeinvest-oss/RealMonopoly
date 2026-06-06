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
