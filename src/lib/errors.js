/**
 * Client-side error capture → Supabase.
 *
 * Wires window.onerror + unhandledrejection + React error-boundary helper to
 * log into Supabase. Vercel logs catch server-side errors; this catches the
 * other half — browser JS errors users would silently endure otherwise.
 *
 * Requires Supabase table (run once in SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS error_logs (
 *     id           BIGSERIAL PRIMARY KEY,
 *     occurred_at  TIMESTAMPTZ DEFAULT now(),
 *     mechanism    TEXT,                  -- 'onerror' | 'unhandledrejection' | 'manual'
 *     message      TEXT,
 *     stack        TEXT,
 *     url          TEXT,
 *     user_agent   TEXT,
 *     user_id      UUID,
 *     route        TEXT,
 *     extra        JSONB
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON error_logs(occurred_at DESC);
 *
 *   -- Allow anon inserts (logging path) but no reads/updates:
 *   ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "anon insert errors" ON error_logs FOR INSERT TO anon WITH CHECK (true);
 *   CREATE POLICY "auth insert errors" ON error_logs FOR INSERT TO authenticated WITH CHECK (true);
 *
 * Fails open — if Supabase is unreachable, errors are still console.error'd.
 */
import { supabase } from "../supabase";

// Dedupe: don't spam Supabase with the same error repeatedly within a session
const seen = new Set();
const MAX_SEEN = 50;

let installed = false;

function ringAdd(key) {
  if (seen.size > MAX_SEEN) {
    // Drop oldest by clearing — simple, good enough at our scale
    seen.clear();
  }
  seen.add(key);
}

function dedupeKey(msg, stack) {
  return `${String(msg || "")}|${String(stack || "").slice(0, 200)}`;
}

export async function logError(payload) {
  const { mechanism = "manual", message, stack, extra } = payload || {};
  const key = dedupeKey(message, stack);
  if (seen.has(key)) return;
  ringAdd(key);

  // Always console.error first — even if Supabase fails, dev sees it
  console.error(`[errlog/${mechanism}]`, message, extra || "");

  try {
    const row = {
      mechanism,
      message: String(message || "").slice(0, 1000),
      stack: stack ? String(stack).slice(0, 4000) : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      extra: extra ?? null,
    };
    // Attach user_id if a session exists — best-effort, don't block on it
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) row.user_id = data.session.user.id;
    } catch {}
    await supabase.from("error_logs").insert(row);
  } catch (e) {
    // Swallow — logging must never throw
    console.warn("error log write failed:", e?.message);
  }
}

export function installGlobalErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev) => {
    // Browser script errors
    logError({
      mechanism: "onerror",
      message: ev.message || (ev.error && ev.error.message) || "Unknown error",
      stack: ev.error?.stack,
      extra: {
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    logError({
      mechanism: "unhandledrejection",
      message: r?.message || String(r),
      stack: r?.stack,
    });
  });
}
