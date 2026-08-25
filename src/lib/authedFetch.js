/**
 * authedFetch — thin wrapper around fetch() that injects the current
 * Supabase session JWT as an Authorization: Bearer header.
 *
 * Use this in place of `fetch()` for any /api/ endpoint that server-side
 * gates by tier (via api/_lib/auth.js requireTier). Endpoints that don't
 * require auth (e.g. property-lookup, ai-chat's free modes) can keep using
 * plain fetch() — no behavior change.
 *
 * If the user is anonymous (no session), the request goes out WITHOUT the
 * Authorization header and the server returns 401. Callers should handle
 * 401 / 402 by prompting the user to sign in or upgrade.
 *
 * Never throws on missing session — that lets callers use it defensively
 * even for endpoints that are technically free but might get gated later.
 */

import { supabase } from "../supabase";

export async function authedFetch(url, init = {}) {
  const headers = new Headers(init.headers || {});
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    // Session lookup failed — proceed unauthenticated. Server will 401 if
    // the endpoint is gated; the UI should render an "auth required" state.
  }
  return fetch(url, { ...init, headers });
}
