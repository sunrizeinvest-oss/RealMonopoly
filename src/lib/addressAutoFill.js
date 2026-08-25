/**
 * useAddressAutoFill(address) — debounced hook that fetches
 * /api/property-lookup for a typed address and returns the unified
 * property data (year built, assessed value, sqft, beds/baths, property
 * taxes, CMHC rent estimate, zoning code + description).
 *
 * Behavior:
 *   - 700ms debounce on address change
 *   - Skips fetch when address is <8 chars (not worth calling)
 *   - Cancels in-flight request when address changes again
 *   - In-memory cache — retyping the same address hits cache, no roundtrip
 *   - Returns { data, loading, error, fromCache }
 *
 * The caller decides which fields to auto-fill. This hook never mutates
 * form state directly.
 */

import { useEffect, useRef, useState } from "react";

const CACHE = new Map(); // address (lowercase, trimmed) → { data, ts }
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

function normalize(addr) {
  return String(addr || "").toLowerCase().replace(/\s+/g, " ").trim();
}

async function fetchLookup(address, signal) {
  const key = normalize(address);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { data: cached.data, fromCache: true };
  }
  const r = await fetch(`/api/property-lookup?address=${encodeURIComponent(address)}`, { signal });
  if (!r.ok) throw new Error(`Lookup failed (${r.status})`);
  const data = await r.json();
  CACHE.set(key, { data, ts: Date.now() });
  return { data, fromCache: false };
}

export function useAddressAutoFill(address, { enabled = true, minLength = 8 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const ctrlRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setError(null);
    if (!enabled) return;
    if (!address || address.length < minLength) {
      setData(null);
      return;
    }

    clearTimeout(timerRef.current);
    ctrlRef.current?.abort();

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetchLookup(address, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setData(res.data);
        setFromCache(res.fromCache);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Lookup failed");
        setData(null);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 700);

    return () => {
      clearTimeout(timerRef.current);
      ctrlRef.current?.abort();
    };
  }, [address, enabled, minLength]);

  return { data, loading, error, fromCache };
}

/**
 * Given the property-lookup response + the current form state, return an
 * object with fields that SHOULD be filled (i.e., the lookup has a value
 * AND the current form field is empty/zero). Never overwrites user input.
 *
 * Usage:
 *   const patch = derivePatch(lookup, form, { strategy: "brrrr" });
 *   if (Object.keys(patch).length) setForm(prev => ({ ...prev, ...patch }));
 */
export function derivePatch(lookup, form, { strategy = "rental" } = {}) {
  if (!lookup) return {};
  const patch = {};
  const isEmpty = (v) => v == null || v === "" || v === 0 || v === "0";

  // Direct mappings — same field name across property-lookup + form
  if (lookup.yearBuilt && isEmpty(form.yearBuilt))
    patch.yearBuilt = String(lookup.yearBuilt);

  if (lookup.squareFootage && (isEmpty(form.sqft) && isEmpty(form.squareFootage))) {
    // Different calcs use different keys — set both, callers ignore unknown ones
    patch.sqft = String(lookup.squareFootage);
    patch.squareFootage = String(lookup.squareFootage);
  }

  if (lookup.bedrooms && isEmpty(form.bedrooms))
    patch.bedrooms = String(lookup.bedrooms);
  if (lookup.bathrooms && isEmpty(form.bathrooms))
    patch.bathrooms = String(lookup.bathrooms);

  if (lookup.propertyTaxes && isEmpty(form.propTax) && isEmpty(form.propertyTax) && isEmpty(form.propertyTaxes)) {
    // Store annual $ — same across calcs
    patch.propTax = String(Math.round(lookup.propertyTaxes));
    patch.propertyTaxes = String(Math.round(lookup.propertyTaxes));
  }

  // Rent estimate — used by BRRRR + rental. Not by flip (flip cares about ARV).
  if (strategy !== "flip" && lookup.rentEstimate && isEmpty(form.monthlyRent)) {
    patch.monthlyRent = String(Math.round(lookup.rentEstimate));
  }

  // ARV suggestion — flip only. Use assessed value × 1.35 as a rough starting
  // point IF flip form has no ARV yet.
  if (strategy === "flip" && lookup.assessedValue && isEmpty(form.arv)) {
    patch.arv = String(Math.round(lookup.assessedValue * 1.35));
  }

  return patch;
}
