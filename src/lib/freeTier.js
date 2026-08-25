/**
 * freeTier.js — client-side metering for the free plan.
 *
 * Free-tier users get 5 /property lookups per calendar month. Pro and Scale
 * are unlimited. Anonymous browsers also count as "free" so a visitor can
 * try before signup — but they'll be prompted after 2 uses.
 *
 * Storage: localStorage.rde_free_lookups = { month: "YYYY-MM", count: N }
 * Reset:   automatic when month rolls over (checked on every read).
 *
 * Trust model: this is CLIENT-SIDE metering. A determined user can clear
 * localStorage or open Incognito to reset. That's OK — the free tier is a
 * marketing funnel, not a security boundary. The Pro-gated writes (save,
 * PDF, rent-roll) are the real revenue guardrails.
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const STORAGE_KEY  = "rde_free_lookups";
const FREE_LIMIT   = 5;
const ANON_SOFT_LIMIT = 2;  // signup prompt threshold for anonymous users

function monthKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function readUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: monthKey(), count: 0 };
    const parsed = JSON.parse(raw);
    // Rolled over into new month → reset silently.
    if (parsed.month !== monthKey()) return { month: monthKey(), count: 0 };
    return { month: parsed.month, count: Number(parsed.count) || 0 };
  } catch {
    return { month: monthKey(), count: 0 };
  }
}

function writeUsage(usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {}
}

/**
 * Read-only usage snapshot. Doesn't include the auth-tier logic — that
 * lives in useFreeTier() below.
 */
export function getFreeTierUsage() {
  return readUsage();
}

/**
 * React hook that combines the auth tier + free lookup counter into one
 * bundle. Components should call this rather than reading localStorage
 * directly, so the metering + upgrade logic stays consistent everywhere.
 *
 * Returns:
 *   tier          — "free" | "pro" | "scale" (from AuthContext)
 *   isPaid        — true if tier is pro or scale
 *   loading       — while auth resolves
 *   count         — lookups used this month
 *   limit         — FREE_LIMIT (5) for free, Infinity for pro/scale
 *   remaining     — max(0, limit - count) — Infinity for paid
 *   canLookup     — false if free-tier count >= limit
 *   canSave       — false for free tier (save is Pro-only)
 *   canExportPDF  — false for free tier (PDF is Pro-only)
 *   canRentRoll   — false for free tier (LTL parser is Scale-only, so free/pro can't)
 *   anonSoftGate  — true if anonymous AND count >= ANON_SOFT_LIMIT (prompt signup)
 *   incrementLookup() — call after a successful /property lookup
 *   monthKey      — current month for display ("2026-07")
 */
export function useFreeTier() {
  const { user, loading, userTier } = useAuth();
  const [usage, setUsage] = useState(readUsage);

  // Refresh the usage counter if we come back to a stale tab and the month
  // rolled over between paints.
  useEffect(() => {
    const onFocus = () => setUsage(readUsage());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const isPaid = userTier === "pro" || userTier === "scale";

  const incrementLookup = useCallback(() => {
    if (isPaid) return;                    // don't burn counter for paid users
    // Re-read from storage rather than trusting React state. If the tab has
    // been open across a month boundary the state's `usage.month` is stale and
    // we'd wrongly increment last-month's count. readUsage() checks month
    // rollover on every call and resets to { count: 0 } when the month flips.
    const current = readUsage();
    const next = { month: monthKey(), count: Math.min(current.count + 1, 999) };
    writeUsage(next);
    setUsage(next);
  }, [isPaid]);

  return useMemo(() => {
    const limit = isPaid ? Infinity : FREE_LIMIT;
    const remaining = isPaid ? Infinity : Math.max(0, FREE_LIMIT - usage.count);
    const canLookup = isPaid || usage.count < FREE_LIMIT;
    const anonSoftGate = !user && !isPaid && usage.count >= ANON_SOFT_LIMIT;

    return {
      tier: userTier,
      isPaid,
      loading,
      isAnonymous: !user,
      count: usage.count,
      limit,
      remaining,
      canLookup,
      canSave: isPaid,
      canExportPDF: isPaid,
      canRentRoll: userTier === "scale",
      anonSoftGate,
      incrementLookup,
      monthKey: usage.month,
    };
  }, [user, loading, userTier, isPaid, usage, incrementLookup]);
}
