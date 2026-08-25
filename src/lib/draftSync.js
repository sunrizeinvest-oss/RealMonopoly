/**
 * Draft auto-save + cross-device sync hook.
 *
 *   useDraftSync({ strategy, form, setForm, enabled })
 *     → returns { status, restoredAt, lastSavedAt, clearDraft }
 *
 * Auto-saves form state to localStorage with a 700ms debounce so users
 * never lose work even if they close the tab mid-edit. When the user is
 * authenticated, the same payload is mirrored to Supabase `deal_drafts`
 * (one row per user × strategy) so picking up on another device works.
 *
 * Restoration runs once on mount. If a draft exists AND the form looks
 * "empty" (no URL params, no recent prefill), we prompt the user with a
 * "Restored from X ago · Start fresh" banner driven by the returned
 * `restoredAt` timestamp.
 *
 * Local-only callers (signed-out users) still get the localStorage benefit
 * with zero changes — the Supabase calls just no-op.
 *
 * Requires: supabase/migrations/006_deal_drafts.sql
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";

const LS_PREFIX = "rde_draft_";
const DEBOUNCE_MS = 700;
// Minimum form-shape "is this worth saving" heuristic — at least one
// meaningful field must be set. Prevents writing empty drafts every
// time a user lands on a calc.
function isMeaningful(form) {
  if (!form || typeof form !== "object") return false;
  const candidates = [
    form.address, form.propertyAddress, form.dealName,
    form.purchasePrice, form.arv, form.repairCosts,
    form.monthlyRent, form.purchase,
  ];
  return candidates.some(v => v != null && v !== "" && v !== 0);
}

function lsRead(strategy) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + strategy);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function lsWrite(strategy, payload) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_PREFIX + strategy, JSON.stringify(payload)); } catch {}
}
function lsClear(strategy) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LS_PREFIX + strategy); } catch {}
}

async function cloudRead(strategy) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("deal_drafts")
      .select("form_state, address, updated_at")
      .eq("user_id", user.id)
      .eq("strategy", strategy)
      .maybeSingle();
    if (error || !data) return null;
    return { form: data.form_state, address: data.address, savedAt: data.updated_at };
  } catch { return null; }
}

async function cloudWrite(strategy, form, address) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    await supabase
      .from("deal_drafts")
      .upsert({
        user_id:    user.id,
        strategy,
        form_state: form,
        address:    address || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,strategy" });
    return true;
  } catch { return false; }
}

async function cloudClear(strategy) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("deal_drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("strategy", strategy);
  } catch {}
}

/**
 * @param {object} args
 * @param {string} args.strategy   - 'brrrr' | 'multifamily' | 'flip'
 * @param {object} args.form        - current form state
 * @param {Function} args.setForm   - setter for the form state
 * @param {boolean} [args.enabled]  - default true; pass false to disable
 */
export function useDraftSync({ strategy, form, setForm, enabled = true }) {
  const [restoredAt, setRestoredAt] = useState(null);   // ISO string when restored, null if not
  const [lastSavedAt, setLastSavedAt] = useState(null); // ISO string of last successful save
  const [status, setStatus] = useState("idle");         // 'idle' | 'saving' | 'saved' | 'error'

  // Prevent restoring over a form that already has URL-param or prefill data.
  const restoreAttempted = useRef(false);
  const writeTimer = useRef(null);
  const lastSerialized = useRef("");

  // ── On-mount restore (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!enabled || restoreAttempted.current) return;
    restoreAttempted.current = true;

    if (isMeaningful(form)) {
      // Form already has data from URL params or localStorage prefill —
      // don't overwrite. The user explicitly came here with intent.
      return;
    }

    let cancelled = false;
    (async () => {
      // Cloud first (most recent across devices), then localStorage fallback.
      const cloud = await cloudRead(strategy);
      if (cancelled) return;
      const candidate = cloud || lsRead(strategy);
      if (!candidate || !candidate.form || !isMeaningful(candidate.form)) return;

      setForm(prev => ({ ...prev, ...candidate.form }));
      setRestoredAt(candidate.savedAt || new Date().toISOString());
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy, enabled]);

  // ── Debounced auto-save on form changes ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (!isMeaningful(form)) return;

    const serialized = JSON.stringify(form);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    clearTimeout(writeTimer.current);
    setStatus("saving");
    writeTimer.current = setTimeout(async () => {
      const now = new Date().toISOString();
      const addr = form.address || form.propertyAddress || "";
      lsWrite(strategy, { form, address: addr, savedAt: now });
      const ok = await cloudWrite(strategy, form, addr);
      setLastSavedAt(now);
      setStatus(ok ? "saved" : "saved"); // both work locally — cloud failure is silent
    }, DEBOUNCE_MS);

    return () => clearTimeout(writeTimer.current);
  }, [form, strategy, enabled]);

  // Manual clear — used by the "Start fresh" button.
  const clearDraft = useCallback(async () => {
    lsClear(strategy);
    await cloudClear(strategy);
    setRestoredAt(null);
    setLastSavedAt(null);
    setStatus("idle");
    lastSerialized.current = "";
  }, [strategy]);

  return { status, restoredAt, lastSavedAt, clearDraft };
}
