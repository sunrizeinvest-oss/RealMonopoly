/**
 * AddressAutocomplete.jsx
 *
 * Drop-in replacement for any address <input>.
 * Provides real-time address suggestions using the Photon geocoder
 * (photon.komoot.io — free, no API key, covers US + Canada globally).
 *
 * Props:
 *   value       {string}   — controlled value
 *   onChange    {fn}       — called with new string on every keystroke
 *   onSelect    {fn}       — called with (fullAddress, { lat, lon, city, state, country })
 *                            when user picks a suggestion. Falls back to onChange if omitted.
 *   placeholder {string}
 *   className   {string}   — CSS class applied to the <input>
 *   style       {object}   — inline style applied to the outer wrapper div
 *   inputStyle  {object}   — inline style applied to the <input> itself
 *   countryCode {string}   — ISO 3166-1 alpha-2 to bias results (e.g. "ca", "us")
 *                            Default: no bias (global results)
 *   disabled    {bool}
 *   onKeyDown   {fn}       — forwarded to the <input>
 */

import { useState, useEffect, useRef, useCallback } from "react";

const SUGGESTION_STYLE = {
  base: {
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    transition: "background 0.1s",
    lineHeight: 1.4,
  },
  hover: { background: "rgba(59,158,255,0.09)" },
};

function formatSuggestion(feature) {
  const p = feature.properties || {};
  const coords = feature.geometry?.coordinates || [];

  // Build a clean formatted address string
  const streetNum  = p.housenumber || "";
  const street     = p.street      || "";
  const name       = p.name        || "";
  const city       = p.city        || p.locality || p.town || p.village || p.county || "";
  const state      = p.state       || p.province || "";
  const postcode   = p.postcode    || "";
  const country    = p.country     || "";
  const countryCode= (p.countrycodes || "").toUpperCase();

  // Line 1: street address
  const line1 = streetNum && street
    ? `${streetNum} ${street}`
    : street || (name !== city ? name : "");

  // Line 2: city, state/province, postal code
  const line2Parts = [city, state, postcode].filter(Boolean);
  const line2 = line2Parts.join(", ");

  // Full address for the input
  const fullAddress = [line1, line2].filter(Boolean).join(", ");

  return {
    label:    fullAddress || feature.properties?.display || "",
    sublabel: country,
    lat:      coords[1] ?? null,
    lon:      coords[0] ?? null,
    city,
    state,
    postcode,
    country,
    countryCode,
    raw: p,
  };
}

export default function AddressAutocomplete({
  value       = "",
  onChange,
  onSelect,
  placeholder = "123 Main St, City, Province / State",
  className   = "",
  style       = {},
  inputStyle  = {},
  countryCode = "",
  disabled    = false,
  onKeyDown,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [hovered,     setHovered]     = useState(-1);
  const [error,       setError]       = useState(null);
  const debounceRef   = useRef(null);
  const wrapRef       = useRef(null);
  const abortRef      = useRef(null);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 4) { setSuggestions([]); setOpen(false); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setError(null);
      try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`;
        if (countryCode) url += `&location_bias_scale=0.2`;

        const res  = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) {
          throw new Error(`Address lookup failed (HTTP ${res.status}). Try again in a moment.`);
        }
        const data = await res.json();

        let features = (data.features || []);

        // Filter by country if requested
        if (countryCode) {
          const cc = countryCode.toLowerCase();
          features = features.filter(f =>
            (f.properties?.countrycodes || "").toLowerCase().includes(cc) ||
            (f.properties?.country     || "").toLowerCase().startsWith(cc === "ca" ? "canada" : cc === "us" ? "united states" : cc)
          );
          // If filter left nothing, use all results (better than empty)
          if (!features.length) features = data.features || [];
        }

        const formatted = features
          .map(formatSuggestion)
          .filter(s => s.label && s.label.length > 3);

        // Deduplicate by label
        const seen = new Set();
        const unique = formatted.filter(s => {
          if (seen.has(s.label)) return false;
          seen.add(s.label);
          return true;
        });

        setSuggestions(unique.slice(0, 6));
        setOpen(unique.length > 0);
        setHovered(-1);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Autocomplete error:", e.message);
          // Surface transient errors — network hiccups, Photon rate-limiting,
          // etc — so the user knows to retry instead of assuming the input is broken.
          setError(e.message || "Address suggestions unavailable — type the full address and continue.");
          setSuggestions([]);
          setOpen(false);
        }
      }

      setLoading(false);
    }, 280);
  }, [countryCode]);

  // Trigger on value change
  useEffect(() => {
    fetchSuggestions(value);
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(suggestion) {
    const addr = suggestion.label;
    if (onSelect) {
      onSelect(addr, suggestion);
    } else if (onChange) {
      onChange(addr);
    }
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (open && suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHovered(h => Math.min(h + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHovered(h => Math.max(h - 1, 0));
        return;
      }
      if (e.key === "Enter" && hovered >= 0) {
        e.preventDefault();
        handleSelect(suggestions[hovered]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={inputStyle}
      />

      {/* Loading spinner */}
      {loading && (
        <div style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: "var(--blue)", borderRadius: "50%",
          animation: "ac-spin 0.7s linear infinite", pointerEvents: "none",
        }} />
      )}

      {/* Error state — Photon down, rate-limited, offline, etc. */}
      {error && !loading && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9998,
          padding: "8px 12px", background: "rgba(251,146,60,0.12)",
          border: "1px solid rgba(251,146,60,0.4)", borderRadius: 6,
          color: "#fb923c", fontSize: 12,
          fontFamily: "'Geist Mono',ui-monospace,monospace",
        }}>
          ▸ {error}
        </div>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
          background: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(-1)}
              style={{
                ...SUGGESTION_STYLE.base,
                ...(i === hovered ? SUGGESTION_STYLE.hover : {}),
                borderBottom: i < suggestions.length - 1
                  ? "1px solid rgba(15,23,42,0.04)"
                  : "none",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📍</span>
              <div>
                <div style={{ color: "var(--text)", fontWeight: 500 }}>{s.label}</div>
                {s.sublabel && (
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{s.sublabel}</div>
                )}
              </div>
            </div>
          ))}
          <div style={{ padding: "5px 14px", borderTop: "1px solid rgba(15,23,42,0.04)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 9, color: "var(--dim)", letterSpacing: 0.3 }}>Powered by OpenStreetMap · Photon</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ac-spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
