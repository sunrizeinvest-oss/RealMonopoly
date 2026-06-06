/**
 * Origin-allowlist CORS helper.
 *
 * Replace the per-handler `Access-Control-Allow-Origin: *` pattern with
 * `applyCors(req, res)` so only known origins (prod domain + local dev)
 * receive permissive headers. Anyone else's browser request gets blocked
 * by the same-origin policy.
 *
 * Override in Vercel: ALLOWED_ORIGINS="https://foo.com,https://bar.com"
 *
 * Note: CORS only protects browser callers. Server-to-server callers can
 * always reach the endpoint — pair this with `requireUser` from auth.js
 * on anything that costs money.
 */

const DEFAULT_ORIGINS = [
  "https://realdealestate.app",
  "https://www.realdealestate.app",
  "http://localhost:5173", // vite dev
  "http://localhost:3000", // vercel dev
];

function allowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return DEFAULT_ORIGINS;
  return env.split(",").map(s => s.trim()).filter(Boolean);
}

export function applyCors(req, res, { methods = "POST, OPTIONS" } = {}) {
  const origin = req.headers.origin || "";
  const list = allowedOrigins();
  const ok = list.includes(origin);
  if (ok) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  return ok;
}

export function handlePreflight(req, res) {
  if (req.method !== "OPTIONS") return false;
  // Always 204 — don't leak which origins are allowed via differing status codes.
  res.status(204).end();
  return true;
}
