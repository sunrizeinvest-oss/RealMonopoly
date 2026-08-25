import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useDocMeta } from "./lib/seo";
import { CITY_CONFIGS, CITY_LIST } from "./data/cityLandingData";
import TopNav from "./components/TopNav";
import { track } from "./lib/analytics";

/**
 * CityLanding — one component that renders 7 SEO-optimized landing pages
 * driven by cityLandingData.js configs. Routes:
 *
 *   /canada/calgary-property-analysis
 *   /canada/edmonton-multiplex-analyzer
 *   /canada/vancouver-r1-1-underwriter
 *   /canada/toronto-multiplex-analyzer
 *   /canada/ottawa-property-analysis
 *   /canada/mississauga-property-analysis
 *   /canada/hamilton-property-analysis
 *
 * Each page targets a distinct high-intent search query. Sample addresses
 * shown are not clickable — they exist only to show the verdict grid shape
 * a real /property lookup produces. CTAs route to /property where the user
 * types their own address.
 */
export default function CityLanding() {
  const { citySlug } = useParams();
  const navigate = useNavigate();

  // Route param resolution: try both direct slug and route-form lookup.
  const config = useMemo(() => {
    if (!citySlug) return null;
    // /canada/calgary-property-analysis → look up by "route"
    const byRoute = CITY_LIST.find(c => c.route === citySlug);
    if (byRoute) return byRoute;
    // /canada/calgary → look up by "slug"
    return CITY_CONFIGS[citySlug] || null;
  }, [citySlug]);

  useDocMeta({
    title: config?.metaTitle || "Canadian City Property Analysis · RizeAI",
    description: config?.metaDesc || "RizeAI's institutional-grade Canadian real estate underwriting — four-strategy verdict, dimensional zoning, CMHC-anchored rent.",
  });

  useEffect(() => {
    if (config?.slug) track("city_landing_view", { city: config.slug });
  }, [config?.slug]);

  if (!config) {
    // Fallback — no city matched. Show the "other cities" grid so the visitor
    // can pick one.
    return (
      <div className="cl-wrap">
        <style>{CSS}</style>
        <TopNav />
        <div className="cl-body" style={{ textAlign: "center", padding: "80px 24px" }}>
          <h1 className="cl-h1" style={{ color: "var(--text)" }}>City page not found.</h1>
          <p style={{ fontSize: 15, color: "var(--sub)", marginTop: 12, marginBottom: 32 }}>
            RizeAI covers 7 Canadian cities. Pick one below.
          </p>
          <div className="cl-other-cities">
            {CITY_LIST.map(c => (
              <button key={c.slug} onClick={() => navigate(`/canada/${c.route}`)} className="cl-city-card">
                <div className="cl-city-name">{c.displayName}</div>
                <div className="cl-city-prov">{c.province}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const otherCities = CITY_LIST.filter(c => c.slug !== config.slug);

  return (
    <div className="cl-wrap">
      <style>{CSS}</style>
      <TopNav />

      {/* ── HERO ── */}
      <section className="cl-hero">
        <div className="cl-hero-inner">
          <div className="cl-eyebrow">
            <span className="cl-eyebrow-dot" />
            {config.hero.eyebrow}
          </div>
          <h1 className="cl-h1">{config.hero.h1Main} <span>{config.hero.h1Span}</span></h1>
          <p className="cl-hero-sub">{config.hero.sub}</p>
          <div className="cl-hero-cta">
            <button className="cl-cta" onClick={() => navigate("/property")}>
              Type a {config.displayName} address →
            </button>
            <button className="cl-cta ghost" onClick={() => navigate("/buybox")}>
              Or run a Buy Box batch →
            </button>
          </div>
        </div>
      </section>

      {/* ── DATA STRIP ── */}
      <section className="cl-datastrip">
        <div className="cl-datastrip-inner">
          <div className="cl-datastrip-label">▸ {config.displayName} Data Sources</div>
          <span className="cl-datastrip-item">CMHC ({config.displayName} Metro)</span>
          <span className="cl-datastrip-sep">·</span>
          <span className="cl-datastrip-item">
            {config.slug === "calgary" || config.slug === "edmonton"
              ? `City of ${config.displayName} Open Data`
              : `${config.displayName} Zoning Bylaw`}
          </span>
          <span className="cl-datastrip-sep">·</span>
          <span className="cl-datastrip-item">Anthropic</span>
          <span className="cl-datastrip-sep">·</span>
          <span className="cl-datastrip-item">Nominatim</span>
        </div>
      </section>

      <div className="cl-body">
        {/* ── ZONING COVERAGE ── */}
        <section className="cl-section">
          <div className="cl-section-eyebrow">▸ ZONING COVERAGE</div>
          <h2 className="cl-h2">{config.zoning.title}</h2>
          <p className="cl-section-sub">{config.zoning.subtitle}</p>

          <div className="cl-zoning-grid">
            {config.zoning.codes.map(z => (
              <div key={z.code} className="cl-zoning-card">
                <div className="cl-zoning-code">{z.code}</div>
                <div className="cl-zoning-role">{z.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CAP RATE BENCHMARKS ── */}
        <section className="cl-section">
          <div className="cl-section-eyebrow">▸ CAP RATE BENCHMARKS</div>
          <h2 className="cl-h2">{config.capRates.title}</h2>
          <p className="cl-section-sub">{config.capRates.subtitle}</p>

          <div className="cl-caps-table-wrap">
            <table className="cl-caps-table">
              <thead>
                <tr>
                  <th>Asset class</th>
                  <th style={{ textAlign: "right" }}>Low</th>
                  <th style={{ textAlign: "right" }}>Typical</th>
                  <th style={{ textAlign: "right" }}>High</th>
                </tr>
              </thead>
              <tbody>
                {config.capRates.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.label}</td>
                    <td style={{ textAlign: "right", color: "var(--red)" }}>{r.low}</td>
                    <td style={{ textAlign: "right", color: "var(--brass-2)", fontWeight: 800 }}>{r.typical}</td>
                    <td style={{ textAlign: "right", color: "var(--green)" }}>{r.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SAMPLE VERDICTS ── */}
        <section className="cl-section">
          <div className="cl-section-eyebrow">▸ SAMPLE VERDICT GRID</div>
          <h2 className="cl-h2">This is what a {config.displayName} lookup returns.</h2>
          <p className="cl-section-sub">Illustrative results only — sample addresses. Type a real address on /property for your own verdict.</p>

          <div className="cl-samples">
            {config.samples.map((s, i) => (
              <div key={i} className="cl-sample-card">
                <div className="cl-sample-rank">#{i + 1}</div>
                <div className="cl-sample-main">
                  <div className="cl-sample-addr">{s.addr}</div>
                  <div className="cl-sample-strat">{s.strat}</div>
                </div>
                <div className="cl-sample-stat">{s.stat}</div>
                <div
                  className={`cl-sample-pill ${s.verdict === "STRONG" ? "strong" : s.verdict === "GO" ? "go" : s.verdict === "CAUTION" ? "caution" : "pass"}`}
                >
                  {s.verdict}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── POSITIONING PARAGRAPH ── */}
        <section className="cl-section">
          <div className="cl-section-eyebrow">▸ WHY {config.displayName.toUpperCase()}</div>
          <h2 className="cl-h2">The market thesis.</h2>
          <p className="cl-positioning">{config.positioning}</p>
        </section>

        {/* ── OTHER CITIES ── */}
        <section className="cl-section">
          <div className="cl-section-eyebrow">▸ OTHER RIZEAI CITIES</div>
          <h2 className="cl-h2">Also covered.</h2>
          <div className="cl-other-cities">
            {otherCities.map(c => (
              <button key={c.slug} onClick={() => navigate(`/canada/${c.route}`)} className="cl-city-card">
                <div className="cl-city-name">{c.displayName}</div>
                <div className="cl-city-prov">{c.province}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ── BIG BOTTOM CTA ── */}
        <div className="cl-bottom-cta">
          <div className="cl-bottom-cta-eyebrow">▸ Try RizeAI on your next {config.displayName} deal</div>
          <div className="cl-bottom-cta-h2">Type an address. <span>See the four-strategy verdict.</span></div>
          <p className="cl-bottom-cta-sub">5 free lookups this month. No credit card. Same institutional-grade underwriting on every {config.displayName} address you type.</p>
          <div className="cl-hero-cta">
            <button className="cl-cta" onClick={() => navigate("/property")}>Try /property free →</button>
            <button className="cl-cta ghost" onClick={() => navigate("/vs-biggerpockets")}>vs BiggerPockets →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .cl-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }

  /* Hero */
  .cl-hero { padding: 72px 24px 56px; background: linear-gradient(180deg, #0a1128 0%, #0c1530 100%); position: relative; overflow: hidden; }
  .cl-hero::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(0,102,204,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,204,0.06) 1px, transparent 1px); background-size: 56px 56px; pointer-events: none; }
  .cl-hero::after { content: ''; position: absolute; top: 20%; left: 50%; transform: translateX(-50%); width: 900px; height: 400px; background: radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 65%); pointer-events: none; }
  .cl-hero-inner { max-width: 900px; margin: 0 auto; position: relative; z-index: 1; text-align: center; }

  .cl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass); background: rgba(10,17,40,0.55); border: 1px solid rgba(212,175,55,0.35); padding: 6px 14px; border-radius: 4px; margin-bottom: 16px; }
  .cl-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }

  .cl-h1 { font-size: clamp(28px, 4.5vw, 48px); font-weight: 800; color: var(--alabaster); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; text-shadow: 0 4px 20px rgba(0,0,0,0.7); }
  .cl-h1 span { color: var(--brass); font-style: italic; font-weight: 700; text-shadow: 0 4px 22px rgba(212,175,55,0.4); }
  .cl-hero-sub { font-size: 16px; color: var(--alabaster-2); line-height: 1.65; max-width: 640px; margin: 0 auto 28px; }

  .cl-hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .cl-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: 6px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase;
    cursor: pointer; transition: transform 160ms, box-shadow 200ms;
  }
  .cl-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -12px rgba(212,175,55,0.4); }
  .cl-cta.ghost { background: transparent; color: var(--alabaster); border-color: rgba(212,175,55,0.35); }
  .cl-cta.ghost:hover { background: rgba(212,175,55,0.10); }

  /* Data strip */
  .cl-datastrip { background: #070b18; border-top: 1px solid rgba(212,175,55,0.10); border-bottom: 1px solid rgba(212,175,55,0.10); padding: 20px 24px; }
  .cl-datastrip-inner { max-width: 1080px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 22px; flex-wrap: wrap; }
  .cl-datastrip-label { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass); padding-right: 14px; border-right: 1px solid rgba(212,175,55,0.20); }
  .cl-datastrip-item { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 600; color: var(--alabaster-2); }
  .cl-datastrip-sep { color: rgba(212,175,55,0.30); font-size: 10px; }

  /* Body */
  .cl-body { max-width: 1080px; margin: 0 auto; padding: 48px 24px 80px; }

  .cl-section { margin-bottom: 56px; }
  .cl-section-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--brass-2); margin-bottom: 8px; }
  .cl-h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.15; margin: 0 0 10px; }
  .cl-section-sub { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin: 0 0 20px; max-width: 720px; }

  /* Zoning grid */
  .cl-zoning-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .cl-zoning-card { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .cl-zoning-code { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: var(--brass-2); letter-spacing: -0.3px; margin-bottom: 6px; }
  .cl-zoning-role { font-size: 13px; color: var(--text); line-height: 1.55; }

  /* Caps table */
  .cl-caps-table-wrap { background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; overflow: hidden; }
  .cl-caps-table { width: 100%; border-collapse: collapse; }
  .cl-caps-table thead { background: var(--card2); }
  .cl-caps-table th { padding: 12px 16px; text-align: left; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--sub); border-bottom: 1px solid var(--borderf); }
  .cl-caps-table td { padding: 12px 16px; font-size: 13.5px; color: var(--text); border-bottom: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-weight: 600; }
  .cl-caps-table tr:last-child td { border-bottom: none; }

  /* Samples */
  .cl-samples { display: flex; flex-direction: column; gap: 8px; }
  .cl-sample-card { display: grid; grid-template-columns: 42px 1fr auto auto; gap: 14px; align-items: center; padding: 12px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .cl-sample-rank { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--brass); }
  .cl-sample-addr { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .cl-sample-strat { font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); }
  .cl-sample-stat { font-family: 'Geist Mono', monospace; font-size: 12px; color: var(--text); font-weight: 700; }
  .cl-sample-pill { padding: 3px 10px; border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 0.6px; color: #fff; }
  .cl-sample-pill.strong { background: #16a34a; }
  .cl-sample-pill.go { background: #22c55e; }
  .cl-sample-pill.caution { background: #eab308; color: #0a1128; }
  .cl-sample-pill.pass { background: #dc2626; }

  /* Positioning */
  .cl-positioning { font-size: 15.5px; color: var(--text); line-height: 1.75; max-width: 780px; }

  /* Other cities grid */
  .cl-other-cities { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .cl-city-card { display: flex; flex-direction: column; padding: 14px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; cursor: pointer; text-align: left; font-family: inherit; transition: border-color 160ms, transform 160ms; }
  .cl-city-card:hover { border-color: var(--brass); transform: translateY(-2px); }
  .cl-city-name { font-size: 15px; font-weight: 800; color: var(--text); }
  .cl-city-prov { font-size: 11.5px; color: var(--sub); font-family: 'Geist Mono', monospace; margin-top: 3px; }

  /* Bottom CTA */
  .cl-bottom-cta { text-align: center; padding: 48px 32px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-top: 20px; }
  .cl-bottom-cta-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 10px; }
  .cl-bottom-cta-h2 { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.2; margin-bottom: 10px; }
  .cl-bottom-cta-h2 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .cl-bottom-cta-sub { font-size: 14px; color: var(--sub); line-height: 1.6; max-width: 520px; margin: 0 auto 22px; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
  @media (max-width: 640px) { .cl-sample-card { grid-template-columns: 32px 1fr auto; } .cl-sample-stat { grid-column: 2 / 3; font-size: 11px; } }
`;
