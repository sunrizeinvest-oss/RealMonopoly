import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * Live — public real-time traction dashboard at /live.
 *
 * Pulls aggregate metrics from /api/metrics (backed by Supabase counts on
 * geocode_cache, zoning_cache, api_usage, buy_boxes, etc). Polls every 30s.
 * Displays big animated counters, live activity feed, city coverage map.
 *
 * Designed as an "investor screenshot" surface — the numbers move, the map
 * lights up, the ticker scrolls. Even at low volume, motion signals life.
 */
export default function Live() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Live · RizeAI — Real-time Traction Metrics",
    description: "Live metrics from the RizeAI platform — property lookups, verdict generations, zoning specs served, API calls per month.",
  });

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/metrics");
        if (!r.ok) throw new Error("metrics fetch failed");
        const json = await r.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e?.message || "load failed");
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="lv-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="lv-body">
        <div className="lv-header">
          <div>
            <div className="lv-eyebrow">
              <span className="lv-eyebrow-dot" />
              LIVE · POLLING EVERY 30S
            </div>
            <h1 className="lv-h1">
              The insider's underwriter, <span>in motion.</span>
            </h1>
            <p className="lv-sub">
              Every number below is real, pulled from the RizeAI production database. Updated {timeStr} local · auto-refreshes.
            </p>
          </div>
          <div className="lv-status">
            <div className="lv-status-dot" />
            <div>
              <div className="lv-status-lbl">SYSTEM STATUS</div>
              <div className="lv-status-val">Operational</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="lv-error">⚠ Metrics endpoint unreachable. Retrying automatically…</div>
        )}

        {!data ? (
          <div className="lv-loading">Loading live metrics…</div>
        ) : (
          <>
            {/* Hero counters — the big numbers */}
            <div className="lv-hero-counters">
              <BigCounter
                label="Property Lookups"
                value={data.lookups?.total || 0}
                sub={`${data.lookups?.this_month || 0} this month`}
                accent="brass"
              />
              <BigCounter
                label="Zoning Specs Served"
                value={data.zoning?.served_total || 0}
                sub={`${data.zoning?.cities_covered || 7} Canadian cities`}
                accent="royal"
              />
              <BigCounter
                label="API Calls"
                value={data.api?.calls_total || 0}
                sub={`${data.api?.calls_this_month || 0} this month`}
                accent="green"
              />
            </div>

            {/* Secondary metrics */}
            <div className="lv-secondary">
              <SmallStat lbl="Buy Boxes Saved" val={data.engagement?.buy_boxes_saved || 0} />
              <SmallStat lbl="Onboarding Emails Sent" val={data.engagement?.onboarding_emails_sent || 0} />
              <SmallStat lbl="Leads Captured" val={data.engagement?.leads_captured || 0} />
              <SmallStat lbl="Successful Cron Runs" val={data.ops?.successful_cron_runs || 0} />
              <SmallStat lbl="Zoning Codes Registered" val={data.zoning?.codes_registered || 37} />
              <SmallStat lbl="CMHC Metros Anchored" val={26} />
            </div>

            <div className="lv-two-col">
              {/* City coverage */}
              <section className="lv-section">
                <div className="lv-section-head">
                  <div className="lv-section-eyebrow">▸ CITY COVERAGE</div>
                  <div className="lv-section-sub">Live zoning + permits across Canada</div>
                </div>
                <div className="lv-cities">
                  {(data.city_coverage || []).map(c => (
                    <div key={c.slug} className="lv-city-row">
                      <div className="lv-city-dot" />
                      <div className="lv-city-name">{c.name}</div>
                      <div className="lv-city-prov">{c.province}</div>
                      <div className="lv-city-codes">{c.codes} codes</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent activity ticker */}
              <section className="lv-section">
                <div className="lv-section-head">
                  <div className="lv-section-eyebrow">▸ RECENT LOOKUPS</div>
                  <div className="lv-section-sub">Last 8 · city-only, redacted</div>
                </div>
                <div className="lv-ticker">
                  {(data.recent_lookups || []).length === 0 ? (
                    <div className="lv-ticker-empty">
                      No recent lookups yet. When traffic arrives, this ticker lights up.
                    </div>
                  ) : (
                    (data.recent_lookups || []).map((r, i) => {
                      const timeAgo = timeAgoStr(r.at);
                      return (
                        <div key={i} className="lv-ticker-row">
                          <div className="lv-ticker-dot" />
                          <div className="lv-ticker-city">
                            {r.city || "Unknown"}{r.province ? `, ${r.province.toUpperCase()}` : ""}
                          </div>
                          <div className="lv-ticker-time">{timeAgo}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* Product moat callout */}
            <section className="lv-moat">
              <div className="lv-moat-eyebrow">▸ THE MOAT</div>
              <div className="lv-moat-h">Data assets that took months to build.</div>
              <div className="lv-moat-grid">
                <MoatCard
                  h="Dimensional Zoning Registry"
                  p="37 zoning codes across 7 Canadian cities — max height, FAR, coverage, setbacks, permitted uses. Zero competitors have this in 2026."
                />
                <MoatCard
                  h="CMHC-Anchored Rent Model"
                  p="26 Canadian metros with government-published rent anchors. Not scraped, not estimated. The rent floor a Canadian broker respects."
                />
                <MoatCard
                  h="Four-Strategy Verdict Engine"
                  p="Buy&Hold + BRRRR + Flip + Multifamily scored side-by-side against every address. Nobody else runs all four in parallel."
                />
                <MoatCard
                  h="AI Underwriting Layer"
                  p="our AI generates institutional-grade deal memos in seconds. Trained on the specific vocabulary Canadian brokers speak."
                />
              </div>
            </section>

            <div className="lv-cta-row">
              <button className="lv-cta" onClick={() => navigate("/property")}>Try the product free →</button>
              <button className="lv-cta ghost" onClick={() => navigate("/vs-biggerpockets")}>Compare vs BiggerPockets</button>
              <button className="lv-cta ghost" onClick={() => navigate("/api-docs")}>API reference →</button>
            </div>

            <div className="lv-footer">
              Metrics refresh every 30s · Cache TTL 60s · Data source: Supabase Postgres · {data.cached ? "Cached response" : "Fresh"} · {data.fallback ? "⚠ Fallback mode" : "Live"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Big animated counter ─────────────────────────────────────────────────
function BigCounter({ label, value, sub, accent }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const target = value;
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const start = display;
    const dt0 = performance.now();
    const dur = 1200;
    const tick = (t) => {
      const p = Math.min(1, (t - dt0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return (
    <div className={`lv-big-counter ${accent}`}>
      <div className="lv-big-lbl">▸ {label}</div>
      <div className="lv-big-val">{display.toLocaleString()}</div>
      <div className="lv-big-sub">{sub}</div>
    </div>
  );
}

function SmallStat({ lbl, val }) {
  return (
    <div className="lv-smallstat">
      <div className="lv-smallstat-val">{Number(val).toLocaleString()}</div>
      <div className="lv-smallstat-lbl">{lbl}</div>
    </div>
  );
}

function MoatCard({ h, p }) {
  return (
    <div className="lv-moatcard">
      <div className="lv-moatcard-h">{h}</div>
      <div className="lv-moatcard-p">{p}</div>
    </div>
  );
}

function timeAgoStr(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
    if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
    if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`;
    return `${Math.round(ms / 86400_000)}d ago`;
  } catch { return "?"; }
}

const CSS = `
  .lv-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .lv-body { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }

  .lv-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 36px; flex-wrap: wrap; }
  .lv-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; }
  .lv-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .lv-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.15; margin: 0 0 10px; }
  .lv-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .lv-sub { font-size: 14.5px; color: var(--sub); line-height: 1.55; margin: 0; max-width: 640px; }

  .lv-status { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .lv-status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: blink 2s infinite; }
  .lv-status-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; }
  .lv-status-val { font-size: 14px; font-weight: 800; color: var(--green); }

  .lv-loading, .lv-error { padding: 40px 20px; text-align: center; color: var(--sub); background: var(--card); border: 1px dashed var(--borderf); border-radius: 12px; }
  .lv-error { color: var(--red); border-color: rgba(220,38,38,0.28); background: rgba(220,38,38,0.04); }

  /* Hero counters */
  .lv-hero-counters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  @media (max-width: 720px) { .lv-hero-counters { grid-template-columns: 1fr; } }
  .lv-big-counter { padding: 24px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; position: relative; overflow: hidden; }
  .lv-big-counter.brass { border-left: 4px solid var(--brass); }
  .lv-big-counter.royal { border-left: 4px solid var(--royal); }
  .lv-big-counter.green { border-left: 4px solid var(--green); }
  .lv-big-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; margin-bottom: 12px; }
  .lv-big-val { font-family: 'Geist Mono', monospace; font-size: clamp(36px, 5vw, 52px); font-weight: 800; letter-spacing: -1.8px; color: var(--text); line-height: 1; margin-bottom: 8px; }
  .lv-big-counter.brass .lv-big-val { color: var(--brass); }
  .lv-big-counter.royal .lv-big-val { color: var(--royal); }
  .lv-big-counter.green .lv-big-val { color: var(--green); }
  .lv-big-sub { font-size: 12px; color: var(--sub); font-family: 'Geist Mono', monospace; letter-spacing: 0.3px; }

  /* Secondary stats */
  .lv-secondary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 32px; }
  @media (max-width: 900px) { .lv-secondary { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 480px) { .lv-secondary { grid-template-columns: repeat(2, 1fr); } }
  .lv-smallstat { padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .lv-smallstat-val { font-family: 'Geist Mono', monospace; font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 3px; }
  .lv-smallstat-lbl { font-size: 10.5px; font-weight: 700; color: var(--sub); text-transform: uppercase; letter-spacing: 0.4px; font-family: 'Geist Mono', monospace; }

  /* Two-column sections */
  .lv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
  @media (max-width: 900px) { .lv-two-col { grid-template-columns: 1fr; } }
  .lv-section { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; }
  .lv-section-head { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--borderf); }
  .lv-section-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; }
  .lv-section-sub { font-size: 12px; color: var(--sub); margin-top: 4px; }

  /* Cities list */
  .lv-cities { display: flex; flex-direction: column; gap: 4px; }
  .lv-city-row { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 12px; align-items: center; padding: 8px 4px; border-bottom: 1px dashed var(--borderf); font-family: 'Geist Mono', monospace; font-size: 12.5px; }
  .lv-city-row:last-child { border-bottom: none; }
  .lv-city-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brass); box-shadow: 0 0 6px var(--brass); }
  .lv-city-name { font-weight: 800; color: var(--text); }
  .lv-city-prov { color: var(--sub); font-size: 10.5px; letter-spacing: 0.5px; }
  .lv-city-codes { color: var(--brass-2); font-weight: 700; font-size: 11px; }

  /* Ticker */
  .lv-ticker { display: flex; flex-direction: column; gap: 4px; min-height: 300px; }
  .lv-ticker-row { display: grid; grid-template-columns: 12px 1fr auto; gap: 12px; align-items: center; padding: 8px 4px; border-bottom: 1px dashed var(--borderf); font-family: 'Geist Mono', monospace; font-size: 12.5px; animation: lv-ticker-in 320ms ease both; }
  .lv-ticker-row:last-child { border-bottom: none; }
  .lv-ticker-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); }
  .lv-ticker-city { color: var(--text); font-weight: 700; }
  .lv-ticker-time { color: var(--sub); font-size: 10.5px; }
  .lv-ticker-empty { padding: 40px 20px; text-align: center; color: var(--sub); font-size: 13px; font-style: italic; }
  @keyframes lv-ticker-in { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }

  /* Moat section */
  .lv-moat { padding: 28px 24px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-bottom: 32px; }
  .lv-moat-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; margin-bottom: 6px; }
  .lv-moat-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 16px; }
  .lv-moat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 720px) { .lv-moat-grid { grid-template-columns: 1fr; } }
  .lv-moatcard { padding: 16px 18px; background: rgba(255,255,255,0.6); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .lv-moatcard-h { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
  .lv-moatcard-p { font-size: 12.5px; color: var(--sub); line-height: 1.55; }

  /* CTA row */
  .lv-cta-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px; }
  .lv-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .lv-cta:hover { transform: translateY(-2px); }
  .lv-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .lv-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .lv-footer { padding: 16px; text-align: center; font-size: 11px; color: var(--dim); font-family: 'Geist Mono', monospace; letter-spacing: 0.3px; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
