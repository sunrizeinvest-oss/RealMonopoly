import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import TierGate from "./components/TierGate";

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
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("any");
  const [maxPrice, setMaxPrice] = useState("");
  const [triggers, setTriggers] = useState([]);
  const [running, setRunning]  = useState(false);
  const [error, setError]      = useState(null);
  const [watch, setWatch]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watch)); } catch {}
  }, [watch]);

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
      setTriggers(j.triggers || []);
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

  const sortedTriggers = useMemo(
    () => [...triggers].sort((a, b) => (b.redevScore || 0) - (a.redevScore || 0)),
    [triggers]
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans',sans-serif" }}>
      <TopNav />

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 12, fontWeight: 700, color: "var(--red)", letterSpacing: "1.8px", marginBottom: 6 }}>
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
          display: "grid", gridTemplateColumns: "1.6fr 0.8fr 0.8fr auto", gap: 10, alignItems: "end",
        }}>
          <div>
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>SEARCH AREA</div>
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
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>PROPERTY TYPE</div>
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
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px", marginBottom: 5 }}>MAX PRICE</div>
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
              color: running ? "var(--red)" : "#07090f",
              border: "none", borderRadius: 5,
              padding: "11px 18px",
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: "1.2px",
              cursor: area.trim() && !running ? "pointer" : "not-allowed",
              opacity: area.trim() ? 1 : 0.5,
              height: 42,
            }}
          >
            {running ? "SCANNING…" : "▶ SCAN AREA"}
          </button>
        </div>

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

        {/* Watch list */}
        {watch.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--amber)", letterSpacing: "1.4px" }}>
                ▸ MY WATCH LIST · {watch.length}
              </div>
              <button onClick={clearWatch} style={{ background: "transparent", border: "1px solid var(--borderf)", borderRadius: 3, padding: "4px 8px", color: "var(--sub)", fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px", cursor: "pointer" }}>
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--red)", letterSpacing: "1.4px" }}>
                ▸ {triggers.length} SIGNALS · SORTED BY REDEV POTENTIAL
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dim)" }}>
                AI-suggested · directional only — verify with MLS before contacting
              </div>
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
      background: "var(--card)", border: "1px solid var(--borderf)",
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 6, padding: 12,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
          color: meta.color, letterSpacing: "0.8px",
          padding: "2px 6px", border: `1px solid ${meta.color}`, borderRadius: 3,
        }}>
          {meta.icon} {t.status?.toUpperCase()}
        </span>
        <span style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, color: "var(--dim)" }}>
          {t.triggerDate}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: redevColor, letterSpacing: "0.8px" }}>
          REDEV {t.redevScore}/100
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
        {t.address}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
        fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11,
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
          <span style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 700, color: "var(--purple)", letterSpacing: "0.8px", marginRight: 4 }}>WHY:</span>
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
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
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
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
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
  background: "var(--card2, #0a0e18)",
  border: "1px solid var(--borderf)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "'DM Sans',sans-serif",
  color: "var(--text)",
  outline: "none",
};
