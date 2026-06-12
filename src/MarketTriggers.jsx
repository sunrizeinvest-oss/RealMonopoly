import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import TierGate from "./components/TierGate";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabase";
import { cachedThesisFetch } from "./lib/aiReadCache";

/**
 * MarketTriggers — distressed-listing radar.
 *
 * Search by area; AI returns 8 plausible "terminated / withdrawn / suspended"
 * listings for the user to review. Each card shows last price, drops, days on
 * market, suspected reason, and a redev-potential score. User can save signals
 * to a watch list (localStorage) and deep-link the address into any calculator.
 *
 * Architecture is ready to plug in real RETS/Trestle/MLS feeds when the data
 * deal lands — same component, just swap the fetch.
 */

const STORAGE_KEY = "rde_market_triggers_v1";
const SEARCHES_KEY = "rde_market_searches_v1";

// Stable per-trigger key so "new since last visit" detection isn't fooled
// by AI rewording the same property. Compare by address + status + listed date.
const triggerKey = (t) =>
  `${(t.address || "").toLowerCase().trim()}|${t.status || ""}|${t.listedDate || ""}`;

const STATUS_META = {
  Terminated:  { color: "var(--red)",    icon: "✗" },
  Withdrawn:   { color: "var(--amber)",  icon: "↩" },
  Suspended:   { color: "var(--purple)", icon: "⏸" },
  Expired:     { color: "var(--blue)",   icon: "⌛" },
  Cancelled:   { color: "var(--red)",    icon: "✕" },
};
const fmtMoney = n => n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
const fmtMoneyK = n => {
  if (n == null) return "—";
  const v = Number(n);
  return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${Math.round(v/1000)}K`;
};

export default function MarketTriggers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("any");
  const [maxPrice, setMaxPrice] = useState("");
  const [triggers, setTriggers] = useState([]);
  const [running, setRunning]  = useState(false);
  const [error, setError]      = useState(null);
  // Email digest state — kept tight so it doesn't pollute the scan flow.
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus]   = useState(null); // null | {kind:'ok',msg} | {kind:'err',msg}
  // MLS grounding provenance for the current trigger list (when present).
  const [mlsSource, setMlsSource]       = useState(null); // null | {provider, anchors}
  // AI Read on the scan — debounced 600ms after triggers land. Same
  // deal-thesis pattern used on /property and /screen bulk lookup.
  const [scanThesis, setScanThesis]     = useState(null);
  const [scanThesisLoading, setScanThesisLoading] = useState(false);

  // Auto-fire when triggers land (≥3 needed to make a "scan" meaningful).
  // Aggregate distress signal: status mix, DOM range, price-drop count,
  // top redev scores → Claude condenses into 1-2 sentences.
  useEffect(() => {
    if (!triggers || triggers.length < 3) return;
    let cancelled = false;
    setScanThesisLoading(true);
    setScanThesis(null);
    const timeoutId = setTimeout(() => {
      const statusCounts = triggers.reduce((acc, t) => {
        const s = (t.status || "Other").toUpperCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      const doms = triggers.map(t => Number(t.daysOnMarket)).filter(v => Number.isFinite(v));
      const drops = triggers.map(t => Number(t.priceDrops)).filter(v => Number.isFinite(v));
      const scores = triggers.map(t => Number(t.redevScore)).filter(v => Number.isFinite(v)).sort((a, b) => b - a);
      const topScore = scores[0] || null;
      const avg = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;
      // Top 3 by redev score, by address only — keep prompt tight.
      const top3 = [...triggers]
        .sort((a, b) => (Number(b.redevScore) || 0) - (Number(a.redevScore) || 0))
        .slice(0, 3)
        .map(t => `${t.address || "?"} (score ${t.redevScore ?? "?"}, ${t.status || "?"})`);

      const fingerprintInput = {
        area, triggerCount: triggers.length,
        statusCounts, topScore, avgDOM: avg(doms),
        groundedByMls: !!mlsSource,
      };
      cachedThesisFetch("scan", fingerprintInput, () =>
        fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "deal-thesis",
            strategy: `Market Triggers scan · ${area || "area"}`,
            verdict: Object.entries(statusCounts).map(([s, n]) => `${n} ${s}`).join(" · "),
            metrics: {
              triggerCount:  triggers.length,
              avgDOM:        avg(doms),
              maxDOM:        doms.length ? Math.max(...doms) : null,
              avgPriceDrops: avg(drops),
              topRedevScore: topScore,
              avgRedevScore: avg(scores),
              topCandidates: top3.join(" | "),
              groundedByMls: !!mlsSource,
            },
          }),
        }).then(r => r.json())
      ).then(result => {
        if (cancelled) return;
        if (result) setScanThesis(result);
        setScanThesisLoading(false);
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [triggers.length, mlsSource?.anchors, area]);

  async function sendEmailDigest() {
    if (!user?.email) {
      setEmailStatus({ kind: "err", msg: "Sign in to send the digest to your email." });
      setTimeout(() => setEmailStatus(null), 4000);
      return;
    }
    if (!triggers.length) {
      setEmailStatus({ kind: "err", msg: "Run a scan first — there's nothing to email." });
      setTimeout(() => setEmailStatus(null), 4000);
      return;
    }
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "send-digest",
          to: user.email,
          area: area || "All areas",
          propertyType: propertyType !== "any" ? propertyType : null,
          triggers,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      setEmailStatus({ kind: "ok", msg: `Sent to ${user.email} · ${triggers.length} signal${triggers.length === 1 ? "" : "s"}` });
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (e) {
      setEmailStatus({ kind: "err", msg: e.message });
      setTimeout(() => setEmailStatus(null), 6000);
    } finally {
      setEmailSending(false);
    }
  }
  const [watch, setWatch]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });
  // Saved searches: { id, name, area, propertyType, maxPrice, lastScanAt, lastScanKeys: [triggerKey,...] }
  const [savedSearches, setSavedSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SEARCHES_KEY) || "[]"); }
    catch { return []; }
  });
  // Keys of triggers seen on the previous run of the currently-loaded search
  const [previousKeys, setPreviousKeys] = useState(new Set());
  // Currently active saved-search id (so we know which one to update on next run)
  const [activeSearchId, setActiveSearchId] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watch)); } catch {}
  }, [watch]);
  useEffect(() => {
    try { localStorage.setItem(SEARCHES_KEY, JSON.stringify(savedSearches)); } catch {}
  }, [savedSearches]);

  async function runSearch() {
    if (!area.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "find-triggers",
          area,
          propertyType,
          maxPrice: maxPrice ? Number(maxPrice) : null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      const j = await r.json();
      const newTriggers = j.triggers || [];
      setTriggers(newTriggers);
      // Surface MLS grounding so the user knows these are real listings
      // (stale active, DOM ≥ 60d) and not pure AI speculation.
      setMlsSource(j.groundedByMls ? { provider: j.mlsProvider, anchors: j.mlsAnchorCount } : null);
      // If this run was launched from a saved search, update its last-scan record
      if (activeSearchId) {
        const keys = newTriggers.map(triggerKey);
        setSavedSearches(s => s.map(x =>
          x.id === activeSearchId
            ? { ...x, lastScanAt: Date.now(), lastScanKeys: keys }
            : x
        ));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  // Pull Supabase saved searches on auth so the weekly cron auto-digest can
  // find them. Local-only when offline / unauthed. Supabase wins on conflict.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("id, name, area, property_type, max_price, last_scan_at, last_scan_keys")
        .order("created_at", { ascending: false });
      if (cancelled || error || !data) return;
      const mapped = data.map(r => ({
        id: r.id,
        name: r.name,
        area: r.area,
        propertyType: r.property_type || "any",
        maxPrice: r.max_price || "",
        lastScanAt: r.last_scan_at ? new Date(r.last_scan_at).getTime() : null,
        lastScanKeys: r.last_scan_keys || [],
        remote: true,
      }));
      if (mapped.length) setSavedSearches(mapped);
    })();
    return () => { cancelled = true; };
  }, [user]);

  function saveCurrentSearch() {
    if (!area.trim()) return;
    const id = `s_${Date.now().toString(36)}`;
    const keys = triggers.map(triggerKey);
    setSavedSearches(s => [
      { id, name: area.trim(), area: area.trim(), propertyType, maxPrice, lastScanAt: Date.now(), lastScanKeys: keys },
      ...s.filter(x => x.area.toLowerCase() !== area.trim().toLowerCase())
    ]);
    setActiveSearchId(id);
    // Mirror to Supabase when signed in — cron reads from there.
    if (user) {
      supabase.from("saved_searches").insert({
        user_id: user.id,
        name: area.trim(),
        area: area.trim(),
        property_type: propertyType,
        max_price: maxPrice ? Number(maxPrice) : null,
        email_enabled: true,
        last_scan_at: new Date().toISOString(),
        last_scan_keys: keys,
      }).then(({ error }) => {
        if (error) console.warn("[saved_searches] insert failed:", error.message);
      });
    }
  }
  function loadSavedSearch(s) {
    setArea(s.area);
    setPropertyType(s.propertyType || "any");
    setMaxPrice(s.maxPrice || "");
    setPreviousKeys(new Set(s.lastScanKeys || []));
    setActiveSearchId(s.id);
    setTriggers([]);
    // Run immediately so the user sees the diff
    setTimeout(() => {
      // Trick: setArea is async; runSearch uses the closure's `area` value.
      // Run the actual fetch directly to avoid the race.
      runWithArea(s.area, s.propertyType || "any", s.maxPrice || "");
    }, 50);
  }
  function deleteSavedSearch(id) {
    setSavedSearches(s => s.filter(x => x.id !== id));
    if (activeSearchId === id) { setActiveSearchId(null); setPreviousKeys(new Set()); }
    // Mirror delete to Supabase when the id looks like a UUID (remote row).
    if (user && /^[0-9a-f-]{36}$/i.test(id)) {
      supabase.from("saved_searches").delete().eq("id", id).then(({ error }) => {
        if (error) console.warn("[saved_searches] delete failed:", error.message);
      });
    }
  }

  async function runWithArea(a, pType, maxP) {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "find-triggers",
          area: a,
          propertyType: pType,
          maxPrice: maxP ? Number(maxP) : null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      const j = await r.json();
      const newTriggers = j.triggers || [];
      setTriggers(newTriggers);
      if (activeSearchId) {
        const keys = newTriggers.map(triggerKey);
        setSavedSearches(s => s.map(x =>
          x.id === activeSearchId
            ? { ...x, lastScanAt: Date.now(), lastScanKeys: keys }
            : x
        ));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function inWatch(t) { return watch.some(w => w.address === t.address); }
  function toggleWatch(t) {
    setWatch(w => inWatch(t) ? w.filter(x => x.address !== t.address) : [{ ...t, savedAt: Date.now() }, ...w]);
  }
  function clearWatch() { setWatch([]); }

  function openInCalc(t, route) {
    const params = new URLSearchParams();
    params.set("addr", t.address);
    if (t.lastPrice) params.set("purchase", String(t.lastPrice));
    navigate(`${route}?${params.toString()}`);
  }

  // Tag each trigger as "new" if its key wasn't in the previous run for this saved search.
  const sortedTriggers = useMemo(() => {
    return [...triggers]
      .map(t => ({ ...t, _isNew: previousKeys.size > 0 && !previousKeys.has(triggerKey(t)) }))
      .sort((a, b) => {
        // New triggers float to the top within the redev-score sort
        if (a._isNew !== b._isNew) return b._isNew - a._isNew;
        return (b.redevScore || 0) - (a.redevScore || 0);
      });
  }, [triggers, previousKeys]);
  const newCount = sortedTriggers.filter(t => t._isNew).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Geist',sans-serif" }}>
      <TopNav />

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 12, fontWeight: 700, color: "var(--red)", letterSpacing: "1.8px", marginBottom: 6 }}>
            ▸ MARKET TRIGGERS · OFF-MARKET RADAR
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 6 }}>
            Find what didn't sell.
          </div>
          <div style={{ fontSize: 15, color: "var(--sub)", lineHeight: 1.55, maxWidth: 680 }}>
            Listings that were terminated, withdrawn, suspended, expired, or cancelled often signal distressed sellers, motivated owners, or undervalued land. Most agents and investors never see these. Search by area to surface them.
          </div>
        </div>

        {/* Tier gate wraps the entire scanning UI; logged-in Scale users see the search */}
        <TierGate
          tier="scale"
          feature="Market Triggers"
          description="Surface terminated, withdrawn & suspended listings by area — distressed sellers, motivated owners, undervalued land that most investors never see. Search any city or neighbourhood."
        >

        {/* Search */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--borderf)",
          borderLeft: "3px solid var(--red)", borderRadius: 6,
          padding: 16, marginBottom: 20,
          // Auto-fit lets the 4 controls reflow gracefully on narrow viewports
          // — 1 column on phones, 2 on small tablets, 4 on desktop.
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10, alignItems: "end",
        }}>
          <div>
            <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>SEARCH AREA</div>
            <input
              type="text"
              placeholder="e.g. West Hillhurst, Calgary OR Sherbrooke, Edmonton OR Williamsburg, Brooklyn"
              value={area}
              onChange={e => setArea(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !running) runSearch(); }}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>PROPERTY TYPE</div>
            <select value={propertyType} onChange={e => setPropertyType(e.target.value)} style={inputStyle}>
              <option value="any">Any</option>
              <option value="Single Family">Single Family</option>
              <option value="Multifamily">Multifamily</option>
              <option value="Land">Land</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed-Use">Mixed-Use</option>
            </select>
          </div>
          <div>
            <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>MAX PRICE</div>
            <input
              type="number"
              placeholder="any"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={runSearch}
            disabled={!area.trim() || running}
            style={{
              background: running ? "rgba(242,92,92,0.15)" : "var(--red)",
              color: running ? "var(--red)" : "#ffffff",
              border: "none", borderRadius: 5,
              padding: "11px 18px",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: "1.2px",
              cursor: area.trim() && !running ? "pointer" : "not-allowed",
              opacity: area.trim() ? 1 : 0.5,
              height: 42,
            }}
          >
            {running ? "SCANNING…" : "▶ SCAN AREA"}
          </button>
        </div>

        {/* Email digest — only meaningful once a scan has run and there's
            something to send. Stays minimal: 1 button + ephemeral status line. */}
        {triggers.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", marginBottom: 14,
            background: "rgba(59,158,255,0.04)",
            border: "1px solid rgba(59,158,255,0.18)",
            borderLeft: "3px solid var(--blue)",
            borderRadius: 4, flexWrap: "wrap",
          }}>
            <button
              onClick={sendEmailDigest}
              disabled={emailSending || !user?.email}
              title={!user?.email ? "Sign in to email yourself the digest" : `Send digest to ${user.email}`}
              style={{
                background: emailSending ? "rgba(59,158,255,0.15)" : "var(--blue)",
                color: emailSending ? "var(--blue)" : "#ffffff",
                border: "none", borderRadius: 4,
                padding: "8px 14px",
                fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: "1px",
                cursor: emailSending ? "wait" : !user?.email ? "not-allowed" : "pointer",
                opacity: !user?.email ? 0.45 : 1,
              }}
            >
              {emailSending ? "SENDING…" : "📧 EMAIL ME THIS DIGEST"}
            </button>
            <span style={{ fontSize: 11.5, color: "var(--sub)" }}>
              {user?.email ? <>Sends to <strong style={{ color: "var(--text)" }}>{user.email}</strong></> : "Sign in to receive"}
            </span>
            {emailStatus && (
              <span style={{
                marginLeft: "auto", fontSize: 11.5, fontWeight: 600,
                color: emailStatus.kind === "ok" ? "var(--green)" : "var(--red)",
              }}>
                {emailStatus.kind === "ok" ? "✓ " : "⚠ "}{emailStatus.msg}
              </span>
            )}
          </div>
        )}

        {/* MLS grounding badge — tells the user these triggers are real
            stale active listings (DOM ≥ 60d), not pure AI guesses. */}
        {mlsSource && triggers.length > 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 12px", marginBottom: 14,
            background: "rgba(255,204,0,0.15)",
            border: "1px solid var(--gold)",
            borderRadius: 3,
            fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 800,
            color: "#0f172a", letterSpacing: "1px",
          }}>
            ⌖ GROUNDED · {mlsSource.provider.toUpperCase()} · {mlsSource.anchors} STALE LISTING{mlsSource.anchors === 1 ? "" : "S"} ANCHORED
          </div>
        )}

        {/* ── AI Read on the scan — auto-fires after triggers land.
            Sweeping 1-2 sentence interpretation of the distress signal
            distribution: "12 stale Calgary listings, mostly Terminated
            with avg 95 DOM; top redev candidate is 425 Centre Ave at
            score 88." */}
        {(scanThesisLoading || scanThesis?.thesis) && (
          <div style={{
            marginBottom: 16,
            padding: "13px 16px",
            background: "rgba(0,102,204,0.05)",
            border: "1px solid rgba(0,102,204,0.22)",
            borderLeft: "3px solid var(--blue)",
            borderRadius: 6,
          }}>
            <div style={{
              fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700,
              color: "var(--blue)", letterSpacing: "1.3px", marginBottom: 7,
            }}>
              ▸ AI READ · SCAN SUMMARY {scanThesis?.source && scanThesis.source !== "template" && (
                <span style={{ color: "var(--dim)", fontWeight: 500, marginLeft: 4 }}>
                  · {scanThesis.source}
                </span>
              )}
              {scanThesis?.cached && (
                <span style={{ color: "var(--dim)", fontWeight: 500, marginLeft: 4, fontStyle: "italic" }}>
                  · via cache
                </span>
              )}
            </div>
            {scanThesisLoading && !scanThesis ? (
              <div style={{ fontSize: 12.5, color: "var(--sub)", fontStyle: "italic" }}>
                Claude is reading the distress signals…
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                {scanThesis.thesis}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: "12px 14px",
            background: "rgba(242,92,92,0.08)",
            border: "1px solid rgba(242,92,92,0.3)",
            borderLeft: "3px solid var(--red)",
            borderRadius: 4,
            fontSize: 13, color: "var(--red)", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Saved Searches panel */}
        {savedSearches.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.4px" }}>
                ▸ MY SEARCHES · {savedSearches.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)" }}>
                Re-scan to see what's new since your last visit
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {savedSearches.map(s => {
                const isActive = activeSearchId === s.id;
                const daysAgo = s.lastScanAt ? Math.floor((Date.now() - s.lastScanAt) / 86400000) : null;
                return (
                  <div key={s.id} style={{
                    background: "var(--card)",
                    border: `1px solid ${isActive ? "var(--blue)" : "var(--borderf)"}`,
                    borderLeft: `3px solid var(--blue)`,
                    borderRadius: 5, padding: "10px 12px",
                    display: "flex", flexDirection: "column", gap: 4,
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                    onClick={() => loadSavedSearch(s)}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.45)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSavedSearch(s.id); }}
                        style={{ background: "transparent", border: "none", color: "var(--dim)", cursor: "pointer", padding: "0 4px", fontSize: 13 }}
                        title="Remove saved search"
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, color: "var(--dim)", letterSpacing: "0.4px" }}>
                      <span>{s.propertyType !== "any" ? s.propertyType.toUpperCase() : "ANY"}</span>
                      {s.maxPrice && <span>· ≤ ${Math.round(Number(s.maxPrice)/1000)}K</span>}
                      <span style={{ marginLeft: "auto", color: daysAgo > 7 ? "var(--amber)" : "var(--green)" }}>
                        {daysAgo == null ? "—" : daysAgo === 0 ? "today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Watch list */}
        {watch.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--amber)", letterSpacing: "1.4px" }}>
                ▸ MY WATCH LIST · {watch.length}
              </div>
              <button onClick={clearWatch} style={{ background: "transparent", border: "1px solid var(--borderf)", borderRadius: 3, padding: "4px 8px", color: "var(--sub)", fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px", cursor: "pointer" }}>
                CLEAR
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {watch.map((t, i) => (
                <TriggerCard key={`watch-${i}`} t={t} compact saved onToggle={() => toggleWatch(t)} onOpenBRRRR={() => openInCalc(t, "/brrrr")} onOpenMF={() => openInCalc(t, "/commercial")} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!running && triggers.length === 0 && !error && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--dim)", fontSize: 13.5, lineHeight: 1.6 }}>
            Enter a search area above to surface distressed listings.
          </div>
        )}

        {running && (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(242,92,92,0.2)", borderTopColor: "var(--red)", animation: "rde-mt-spin 0.8s linear infinite" }} />
            <style>{`@keyframes rde-mt-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--sub)" }}>
              Scanning for terminated &amp; suspended listings…
            </div>
          </div>
        )}

        {sortedTriggers.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--red)", letterSpacing: "1.4px" }}>
                ▸ {triggers.length} SIGNALS · SORTED BY REDEV POTENTIAL
              </div>
              {newCount > 0 && (
                <div style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
                  color: "var(--green)", letterSpacing: "1px",
                  padding: "2px 8px", background: "rgba(52,217,138,0.1)",
                  border: "1px solid var(--green)", borderRadius: 3,
                }}>
                  🆕 {newCount} NEW SINCE LAST SCAN
                </div>
              )}
              <div style={{ fontSize: 11.5, color: "var(--dim)" }}>
                AI-suggested · directional only — verify with MLS before contacting
              </div>
              {!savedSearches.some(s => s.area.toLowerCase() === area.trim().toLowerCase()) && (
                <button
                  onClick={saveCurrentSearch}
                  style={{
                    marginLeft: "auto",
                    background: "rgba(59,158,255,0.08)", color: "var(--blue)",
                    border: "1px solid var(--blue)", borderRadius: 4,
                    padding: "6px 12px",
                    fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
                    letterSpacing: "1px", cursor: "pointer",
                  }}
                >
                  ⭐ SAVE THIS SEARCH
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {sortedTriggers.map((t, i) => (
                <TriggerCard
                  key={i} t={t}
                  saved={inWatch(t)}
                  onToggle={() => toggleWatch(t)}
                  onOpenBRRRR={() => openInCalc(t, "/brrrr")}
                  onOpenMF={() => openInCalc(t, "/commercial")}
                />
              ))}
            </div>
          </>
        )}

        </TierGate>
      </div>
    </div>
  );
}

function TriggerCard({ t, compact, saved, onToggle, onOpenBRRRR, onOpenMF }) {
  const meta = STATUS_META[t.status] || { color: "var(--sub)", icon: "•" };
  const redevColor =
    t.redevScore >= 80 ? "var(--green)" :
    t.redevScore >= 60 ? "var(--blue)" :
    t.redevScore >= 40 ? "var(--amber)" : "var(--red)";
  const isMF = t.propertyType === "Multifamily" || t.units > 4;
  return (
    <div style={{
      background: t._isNew ? "rgba(52,217,138,0.04)" : "var(--card)",
      border: `1px solid ${t._isNew ? "rgba(52,217,138,0.35)" : "var(--borderf)"}`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 6, padding: 12,
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative",
    }}>
      {t._isNew && (
        <span style={{
          position: "absolute", top: -8, right: 10,
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700,
          color: "#ffffff", background: "var(--green)",
          letterSpacing: "0.9px",
          padding: "2px 6px", borderRadius: 3,
          boxShadow: "0 4px 12px rgba(52,217,138,0.4)",
        }}>
          🆕 NEW
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
          color: meta.color, letterSpacing: "0.8px",
          padding: "2px 6px", border: `1px solid ${meta.color}`, borderRadius: 3,
        }}>
          {meta.icon} {t.status?.toUpperCase()}
        </span>
        <span style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, color: "var(--dim)" }}>
          {t.triggerDate}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: redevColor, letterSpacing: "0.8px" }}>
          REDEV {t.redevScore}/100
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
        {t.address}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
        fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11,
      }}>
        <div>
          <div style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase" }}>Last Price</div>
          <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{fmtMoneyK(t.lastPrice)}</div>
          {t.priceDrops > 0 && t.originalPrice && (
            <div style={{ color: "var(--amber)", fontSize: 10, marginTop: 1 }}>
              ▼ {t.priceDrops} drops from {fmtMoneyK(t.originalPrice)}
            </div>
          )}
        </div>
        <div>
          <div style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase" }}>Days on Market</div>
          <div style={{ color: t.daysOnMarket > 90 ? "var(--amber)" : "var(--text)", fontWeight: 700, fontSize: 13 }}>{t.daysOnMarket}</div>
        </div>
        <div>
          <div style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase" }}>Type</div>
          <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 11.5 }}>{t.propertyType}{t.units ? ` · ${t.units}u` : ""}</div>
        </div>
        <div>
          <div style={{ color: "var(--dim)", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase" }}>Zoning · Built</div>
          <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 11.5 }}>{t.zoning || "—"} · {t.yearBuilt || "—"}</div>
        </div>
      </div>

      {t.suspectedReason && (
        <div style={{
          padding: "6px 8px",
          background: "rgba(167,130,255,0.05)",
          border: "1px solid rgba(167,130,255,0.18)",
          borderRadius: 3,
          fontSize: 11, color: "var(--text)", lineHeight: 1.4,
        }}>
          <span style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700, color: "var(--purple)", letterSpacing: "0.8px", marginRight: 4 }}>WHY:</span>
          {t.suspectedReason}
        </div>
      )}

      {t.notes && !compact && (
        <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.45, fontStyle: "italic" }}>
          {t.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button onClick={onToggle} style={{
          background: saved ? "rgba(240,160,48,0.1)" : "transparent",
          border: `1px solid ${saved ? "var(--amber)" : "var(--borderf)"}`,
          color: saved ? "var(--amber)" : "var(--sub)",
          borderRadius: 4, padding: "5px 9px",
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
          cursor: "pointer", flexShrink: 0,
        }}>
          {saved ? "★ SAVED" : "☆ WATCH"}
        </button>
        <button onClick={isMF ? onOpenMF : onOpenBRRRR} style={{
          marginLeft: "auto",
          background: "rgba(59,158,255,0.08)",
          border: "1px solid var(--blue)",
          color: "var(--blue)",
          borderRadius: 4, padding: "5px 9px",
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
          cursor: "pointer",
        }}>
          ▶ ANALYZE {isMF ? "AS MF" : "AS BRRRR"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--card2, #f1f5f9)",
  border: "1px solid var(--borderf)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "'Geist',sans-serif",
  color: "var(--text)",
  outline: "none",
};
