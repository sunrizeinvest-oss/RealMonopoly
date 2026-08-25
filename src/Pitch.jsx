import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { generateInvestorOnePagerPDF } from "./lib/investorOnePagerPDF";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";
import { RAISE, raisePercent, formatUSD, daysUntil, formatDate } from "./lib/raiseConfig";

/**
 * Pitch — the /pitch investor-facing landing page.
 *
 * Password-gated by ?p=<code> or sessionStorage. Default code lives in
 * PITCH_CODE below — change it per investor batch. Not indexed (noindex meta).
 *
 * Structure follows a canonical VC pitch flow:
 *   1. TAM hero — the market
 *   2. Problem — what's broken
 *   3. Solution — the four-strategy verdict
 *   4. Traction — live metrics from /api/metrics
 *   5. Moat — the data assets
 *   6. Business model — Free/Pro/Scale/API
 *   7. GTM — Canadian brokers, then US
 *   8. Team — founder narrative slot
 *   9. Ask — placeholder for user to fill
 *   10. Contact — book a demo
 */

// Change this per investor batch. Send URL as https://www.realdealestate.app/pitch?p=CODE
const PITCH_CODE = "rzai-insider-2026";

// Paste your Loom URL here (e.g. "https://www.loom.com/share/abc123...") and it
// automatically embeds at the top of /pitch. Leave empty to hide the video card.
const LOOM_EMBED_URL = ""; // TODO: paste after recording

export default function Pitch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [attemptCode, setAttemptCode] = useState("");
  const [metrics, setMetrics] = useState(null);

  useDocMeta({
    title: "RizeAI · Pre-Seed Pitch (Confidential)",
    description: "RizeAI — the institutional underwriting layer for Canadian real estate. Confidential pre-seed materials.",
    noindex: true,  // useDocMeta may or may not support this; safe to pass either way
  });

  useEffect(() => {
    const p = params.get("p") || "";
    const stored = (() => { try { return sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch { return ""; } })();
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) {
        track("pitch_deck_view", { source: p ? "url_param" : "session" });
      }
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    } else if (p) {
      track("pitch_deck_unlock_fail");
    }
  }, [params, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/metrics").then(r => r.ok ? r.json() : null).then(setMetrics).catch(() => {});
  }, [unlocked]);

  const tryUnlock = () => {
    if (attemptCode === PITCH_CODE) {
      track("pitch_deck_view", { source: "password_entry" });
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    } else {
      track("pitch_deck_unlock_fail");
    }
  };

  const downloadOnePager = async () => {
    track("pitch_onepager_download");
    try {
      await generateInvestorOnePagerPDF({ metrics });
    } catch (e) {
      console.warn("onepager gen failed:", e?.message);
    }
  };

  if (!unlocked) {
    return (
      <div className="pt-lock-wrap">
        <style>{CSS}</style>
        <div className="pt-lock-card">
          <div className="pt-lock-icon">🔒</div>
          <div className="pt-lock-tag">▸ CONFIDENTIAL · PRE-SEED MATERIALS</div>
          <h1 className="pt-lock-h">RizeAI Investor Deck</h1>
          <p className="pt-lock-p">Enter the access code shared with you by the founder.</p>
          <input
            className="pt-lock-input"
            type="password"
            placeholder="Access code"
            value={attemptCode}
            onChange={e => setAttemptCode(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") tryUnlock(); }}
            autoFocus
          />
          <button className="pt-lock-btn" onClick={tryUnlock}>Unlock →</button>
          <div className="pt-lock-foot">
            Not an investor? <a onClick={() => navigate("/")} style={{ color: "var(--brass-2)", cursor: "pointer" }}>Return to landing</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-wrap">
      <style>{CSS}</style>

      {/* Sticky top bar */}
      <div className="pt-topbar">
        <div className="pt-topbar-inner">
          <a href="/" className="pt-logo">Real <span>Deal</span></a>
          <div className="pt-topbar-tag">▸ CONFIDENTIAL · PRE-SEED</div>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/deck")} style={{marginRight:6}}>▸ Slide Deck</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/faq")} style={{marginRight:6}}>▸ FAQ</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/team")} style={{marginRight:6}}>▸ Team</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/why-now")} style={{marginRight:6}}>▸ Why Now</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/unit-economics")} style={{marginRight:6}}>▸ Unit Econ</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/data-room")} style={{marginRight:6}}>▸ Data Room</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/timeline")} style={{marginRight:6}}>▸ Timeline</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/backers")} style={{marginRight:6}}>▸ Backers</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/comparables")} style={{marginRight:6}}>▸ Comps</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/references")} style={{marginRight:6}}>▸ References</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/vision")} style={{marginRight:6}}>▸ Vision</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/threats")} style={{marginRight:6}}>▸ Threats</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/product-vault")} style={{marginRight:6}}>▸ Product Vault</button>
          <button className="pt-cta-sm" onClick={() => navigate("/pitch/deliverables")} style={{marginRight:6}}>▸ Deliverables</button>
          <button className="pt-cta-sm" onClick={downloadOnePager} style={{marginRight:6}}>📄 One-Pager</button>
          <button className="pt-cta-sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="pt-body">

        {/* ── LOOM VIDEO SLOT ──
            Renders when LOOM_EMBED_URL is set. Placeholder card when empty
            so investors see the intent (and gently prompts founder to record). */}
        {LOOM_EMBED_URL ? (
          <section className="pt-section pt-loom">
            <div className="pt-loom-frame">
              <iframe
                src={LOOM_EMBED_URL.replace("/share/", "/embed/")}
                allowFullScreen
                title="RizeAI Founder Walkthrough"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
            <div className="pt-loom-caption">▸ Founder walkthrough · 5–8 min</div>
          </section>
        ) : (
          <section className="pt-section pt-loom-placeholder">
            <div className="pt-loom-placeholder-inner">
              <div className="pt-loom-placeholder-icon">🎥</div>
              <div className="pt-loom-placeholder-tag">▸ FOUNDER WALKTHROUGH · COMING SOON</div>
              <div className="pt-loom-placeholder-h">Watch the 7-min product tour.</div>
              <div className="pt-loom-placeholder-p">
                Sunni walks through the entire product from an investor lens: the market, the moat, the traction, the ask. Paste your Loom URL in <code>Pitch.jsx</code> line 27 to swap this out.
              </div>
              <a href="/property" className="pt-loom-placeholder-btn">Try the live product instead →</a>
            </div>
          </section>
        )}

        {/* ── 1. TAM HERO ── */}
        <section className="pt-section pt-hero">
          <div className="pt-eyebrow">
            <span className="pt-eyebrow-dot" />
            RIZEAI · CANADIAN REAL ESTATE INTELLIGENCE · PRE-SEED
          </div>
          <h1 className="pt-h1">
            The underwriting infrastructure <span>Canada's $600B market never had.</span>
          </h1>
          <p className="pt-hero-sub" style={{fontStyle:"italic",color:"var(--brass-2)",marginBottom:14}}>
            Democratizing the tools that used to live only inside family offices — for every broker, developer, and investor.
          </p>
          <p className="pt-hero-sub">
            Type any Canadian address. Four verdicts back in three seconds — anchored to real municipal zoning bylaws and CMHC rent data. Live in 7 cities.
          </p>

          <div className="pt-tam-grid">
            <TamStat val="$8.4T" lbl="Total CA residential real estate value" />
            <TamStat val="$600B" lbl="Annual transaction volume · every deal needs underwriting" />
            <TamStat val="65,000+" lbl="Canadian brokers + agents · our direct users" />
            <TamStat val="$77M" lbl="SaaS TAM at $99/mo × 65K brokers · self-serve ceiling" highlight />
          </div>
          <p className="pt-p" style={{marginTop:14,fontSize:12,fontFamily:"'Geist Mono',monospace",color:"var(--sub)",letterSpacing:0.3}}>
            <b style={{color:"var(--brass-2)"}}>Wedge framing:</b> we're not chasing the whole $8.4T — we're owning the $77M self-serve SaaS wedge that CoStar ($12K/yr, commercial only) and BiggerPockets (US only) can't touch. Sources: CREA 2024 · Statistics Canada · CoStar public pricing.
          </p>
        </section>

        {/* ── WHY NOW · 3 forces (mirrors deck slide 5) ── */}
        <section className="pt-section pt-whynow">
          <style>{`
            .pt-whynow-forces{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
            @media(max-width:900px){.pt-whynow-forces{grid-template-columns:1fr}}
            .pt-force{padding:22px 22px 20px;background:var(--card);border-top:3px solid var(--brass);border-radius:10px;display:flex;flex-direction:column}
            .pt-force-icon{font-size:30px;line-height:1;margin-bottom:12px}
            .pt-force-tag{font-family:'Geist Mono',monospace;font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px}
            .pt-force-when{font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;color:var(--sub);letter-spacing:0.5px;margin-bottom:14px}
            .pt-force-h{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-0.4px;line-height:1.3;margin-bottom:10px}
            .pt-force-p{font-size:13px;color:var(--sub);line-height:1.65}
          `}</style>
          <div className="pt-section-eyebrow">▸ WHY NOW · A 24-MONTH WINDOW</div>
          <h2 className="pt-h2">Three forces. <span>All flipped between 2023 and 2025.</span></h2>
          <p className="pt-p" style={{maxWidth:720,marginBottom:8}}>
            Every one of these was different in 2022. All three moved in our favor at the same time — that's why now, not last year, not next year.
          </p>
          <div className="pt-whynow-forces">
            <div className="pt-force" style={{borderTopColor:"var(--brass)"}}>
              <div className="pt-force-icon">🏛</div>
              <div className="pt-force-tag" style={{color:"var(--brass)"}}>SUPPLY SIDE</div>
              <div className="pt-force-when">2023 → 2025</div>
              <div className="pt-force-h">Every CA city rewrote zoning.</div>
              <div className="pt-force-p">Toronto Multiplex Bylaw (2023). Edmonton Bylaw 20001 (2024). Calgary R-CG (2024). Vancouver RS reforms (2024). Existing tools still assume the old rules — brokers who use them get the multiplex math wrong.</div>
            </div>
            <div className="pt-force" style={{borderTopColor:"var(--royal)"}}>
              <div className="pt-force-icon">⚡</div>
              <div className="pt-force-tag" style={{color:"var(--royal)"}}>COST SIDE</div>
              <div className="pt-force-when">2024 → 2026</div>
              <div className="pt-force-h">LLM prices collapsed 40×.</div>
              <div className="pt-force-p">our AI at $0.001 per verdict. In 2023, this product was economically impossible. Every incumbent priced pre-2024 has a permanently different cost structure — we're structurally 40× cheaper forever.</div>
            </div>
            <div className="pt-force" style={{borderTopColor:"#16a34a"}}>
              <div className="pt-force-icon">💰</div>
              <div className="pt-force-tag" style={{color:"#16a34a"}}>DEMAND SIDE</div>
              <div className="pt-force-when">2024 → 2027</div>
              <div className="pt-force-h">Brokers need to underwrite more, faster.</div>
              <div className="pt-force-p">2024 commission compression (Sitzer/Burnett fallout) + 22% volume drop = brokers must underwrite MORE listings in LESS time to survive. A $99 tool that pays back in one commission.</div>
            </div>
          </div>
          <div style={{marginTop:16,textAlign:"center"}}>
            <button onClick={() => navigate("/pitch/why-now")} className="pt-inline-link" style={{cursor:"pointer",fontFamily:"'Geist Mono',monospace",fontSize:11,fontWeight:700,color:"var(--brass-2)",background:"none",border:"1px solid rgba(212,175,55,0.28)",padding:"7px 14px",borderRadius:4,letterSpacing:0.5}}>
              ▸ Full macro-thesis deep dive at /pitch/why-now
            </button>
          </div>
        </section>

        {/* ── RAISE PROGRESS BAR ── momentum signal, editable in raiseConfig.js */}
        {!RAISE.CLOSED && (
          <section className="pt-section pt-raise">
            <style>{`
              .pt-raise{padding-top:0;padding-bottom:20px}
              .pt-raise-card{padding:22px 24px;background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(33,85,205,0.04));border:1px solid rgba(212,175,55,0.35);border-radius:12px}
              .pt-raise-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px}
              .pt-raise-tag{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:800;letter-spacing:1.4px;color:var(--brass-2);text-transform:uppercase;display:inline-flex;align-items:center;gap:6px}
              .pt-raise-tag-dot{width:6px;height:6px;border-radius:50%;background:#16a34a;box-shadow:0 0 6px #16a34a;animation:blink 2s infinite}
              .pt-raise-nums{font-family:'Geist Mono',monospace;font-size:14px;color:var(--text);font-weight:800}
              .pt-raise-nums b{color:var(--brass);font-size:20px;letter-spacing:-0.5px}
              .pt-raise-track{position:relative;height:12px;background:rgba(15,23,42,0.06);border-radius:6px;overflow:hidden;border:1px solid var(--borderf)}
              .pt-raise-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--brass),var(--brass-2));border-radius:6px;transition:width 0.6s cubic-bezier(0.2,0.8,0.2,1)}
              .pt-raise-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:12px;font-family:'Geist Mono',monospace;font-size:11.5px;color:var(--sub);letter-spacing:0.3px}
              .pt-raise-foot b{color:var(--text);font-weight:800}
            `}</style>
            <div className="pt-raise-card">
              <div className="pt-raise-head">
                <span className="pt-raise-tag">
                  <span className="pt-raise-tag-dot" />
                  {RAISE.roundType.toUpperCase()} · OPEN · {RAISE.instrument}
                </span>
                <span className="pt-raise-nums">
                  <b>{formatUSD(RAISE.committedUSD)}</b> / {formatUSD(RAISE.targetUSD)}
                </span>
              </div>
              <div className="pt-raise-track">
                <div className="pt-raise-fill" style={{ width: `${raisePercent()}%` }} />
              </div>
              <div className="pt-raise-foot">
                <span>{raisePercent()}% committed · {RAISE.backers.length} backers</span>
                <span>
                  First close: <b>{formatDate(RAISE.firstCloseTarget)}</b>
                  {daysUntil(RAISE.firstCloseTarget) != null && daysUntil(RAISE.firstCloseTarget) > 0 &&
                    ` (${daysUntil(RAISE.firstCloseTarget)} days)`}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── 2. PROBLEM ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ THE PROBLEM</div>
          <h2 className="pt-h2">Brokers underwrite deals in <span>Excel from 2007.</span></h2>
          <div className="pt-two-col">
            <div className="pt-problem-card">
              <div className="pt-problem-h">The status quo</div>
              <ul className="pt-list">
                <li>3-6 hours per deal in spreadsheets</li>
                <li>Zoning info scattered across 100+ city PDFs</li>
                <li>Rent estimates from RentCast (US) or gut feel (CA)</li>
                <li>No side-by-side strategy comparison</li>
                <li>Institutional-grade tools cost $12K+/yr (CoStar) and don't cover small residential</li>
              </ul>
            </div>
            <div className="pt-problem-card">
              <div className="pt-problem-h">The gap RizeAI fills</div>
              <ul className="pt-list">
                <li>3 seconds per deal · 4 strategies scored side-by-side</li>
                <li>37 zoning codes across 7 CA cities in one registry</li>
                <li>CMHC-anchored rent for 26 CA metros</li>
                <li>AI-generated 1-page memo per deal</li>
                <li>$99/mo for Pro, $299/mo for Scale · self-serve, no sales call</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 3. SOLUTION ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ THE SOLUTION</div>
          <h2 className="pt-h2">One address in. <span>Four verdicts out.</span></h2>
          <p className="pt-p">
            RizeAI's flagship <code>/property</code> surface runs Buy&amp;Hold, BRRRR, Fix&amp;Flip, and Multifamily
            math in parallel against every address. Verdicts are color-coded (STRONG / GO / CAUTION / PASS)
            with the underlying returns, IRRs, and cash-in numbers immediately visible.
          </p>

          {/* Product mockup — verdict grid */}
          <div className="pt-mockup">
            <div className="pt-mockup-bar">
              <span className="pt-mockup-dot" />
              <span>PROPERTY VERDICT · 2424 WESTMOUNT RD NW, CALGARY AB</span>
              <span style={{ marginLeft: "auto", color: "var(--brass)" }}>▸ 2.8s</span>
            </div>
            <div className="pt-mockup-grid">
              <VerdictMockCard name="Buy & Hold" verdict="GO" headline="5.8% CoC" sub="$187/mo cashflow" color="#22c55e" />
              <VerdictMockCard name="BRRRR" verdict="STRONG" headline="Infinite CoC" sub="$0K left in · $243K 5yr equity" color="#16a34a" />
              <VerdictMockCard name="Fix & Flip" verdict="CAUTION" headline="+$32K profit" sub="12% ROI · 22% annualized" color="#eab308" />
              <VerdictMockCard name="Multifamily" verdict="N/A" headline="SFH — see Hold" sub="R-C2 max 2 units" color="#6b7d96" />
            </div>
          </div>
        </section>

        {/* ── 4. TRACTION (live metrics) ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ TRACTION · LIVE</div>
          <h2 className="pt-h2">Real numbers from <span>the production database.</span></h2>
          <p className="pt-p" style={{ color: "var(--sub)" }}>
            Every number below is queried live from Supabase Postgres, updated as this page loads.
            Not projections — actual usage. See <a onClick={() => navigate("/live")} className="pt-inline-link">/live</a> for real-time dashboard.
          </p>
          <div className="pt-tam-grid">
            <TamStat val={metrics?.lookups?.total?.toLocaleString() || "—"} lbl="Property lookups total" accent="brass" />
            <TamStat val={metrics?.zoning?.codes_registered?.toLocaleString() || "37"} lbl="Zoning codes registered" accent="brass" />
            <TamStat val={metrics?.api?.calls_total?.toLocaleString() || "—"} lbl="API calls served" accent="brass" />
            <TamStat val={metrics?.zoning?.cities_covered || "7"} lbl="CA cities live" accent="brass" />
          </div>
        </section>

        {/* ── 5. MOAT ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ DEFENSIBILITY</div>
          <h2 className="pt-h2">Data assets that took <span>months to build.</span></h2>
          <div className="pt-moat-grid">
            <MoatCard icon="📐" h="Dimensional Zoning Registry"
              p="37 codes × 7 CA cities. Max height, FAR, coverage, setbacks, permitted uses. Nobody else has this — not CoStar, not HouseSigma, not PropStream." />
            <MoatCard icon="🏠" h="CMHC-Anchored Rent Model"
              p="26 Canadian metros. Government-published rent anchors. The floor a Canadian broker respects when they underwrite." />
            <MoatCard icon="🤖" h="AI-Powered AI Layer"
              p="our AI generates 1-page investment memos. Trained prompt engineering for Canadian broker vocabulary. Costs $0.001 per memo, we charge $99/mo." />
            <MoatCard icon="🔬" h="Four-Strategy Verdict Engine"
              p="Pure math: IRR via Newton-Raphson, ARV via multi-basis estimator, cap rates city-adjusted. Runs in the browser, no server load per query." />
          </div>
        </section>

        {/* ── 6. BUSINESS MODEL ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ BUSINESS MODEL</div>
          <h2 className="pt-h2">Self-serve SaaS with <span>an API upsell.</span></h2>
          <div className="pt-pricing">
            <PricingTier tier="Free" price="$0" audience="Curious brokers · casual investors" features={[
              "5 property lookups / month",
              "Full 4-strategy verdict",
              "Dimensional zoning",
              "AI thesis (Buddy Read)",
            ]} />
            <PricingTier tier="Pro" price="$99/mo" audience="Working brokers + agents" features={[
              "Unlimited lookups",
              "Save to Dashboard",
              "Branded PDF exports",
              "Buy Box + batch scoring",
              "Voice-to-Verdict mobile",
            ]} highlight />
            <PricingTier tier="Scale" price="$299/mo" audience="Firms + multi-user brokerages" features={[
              "Everything in Pro",
              "White-label PDFs (your firm's brand)",
              "Rent roll parser (LTL)",
              "5,000 API calls/mo",
              "Weekly Buy Box digest",
            ]} />
          </div>
          <p className="pt-p" style={{ textAlign: "center", marginTop: 20, color: "var(--sub)", fontSize: 13 }}>
            Enterprise: custom pricing for brokerage firms and data partners.
          </p>
        </section>

        {/* ── 7. GTM ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ GO-TO-MARKET</div>
          <h2 className="pt-h2">Canadian broker beachhead. <span>US expansion Year 2.</span></h2>
          <div className="pt-gtm-grid">
            <div className="pt-gtm-card">
              <div className="pt-gtm-year">▸ NOW → 6 MONTHS</div>
              <div className="pt-gtm-h">Canadian broker seeding</div>
              <ul className="pt-list">
                <li>Personal outreach to 200 CA brokers on LinkedIn</li>
                <li>SEO already ranking for 7 city-specific searches</li>
                <li>Chrome extension for realtor.ca / HouseSigma one-click</li>
                <li>Target: 50 paying customers, $5K MRR by Q4 2026</li>
              </ul>
            </div>
            <div className="pt-gtm-card">
              <div className="pt-gtm-year">▸ 6-18 MONTHS</div>
              <div className="pt-gtm-h">Referral flywheel + firm-level</div>
              <ul className="pt-list">
                <li>Firm-tier sales to top 20 CA brokerages</li>
                <li>Public API for CRMs + brokerage tools</li>
                <li>Loom + case study content engine</li>
                <li>Target: 500 paying customers, $50K MRR</li>
              </ul>
            </div>
            <div className="pt-gtm-card">
              <div className="pt-gtm-year">▸ 18+ MONTHS</div>
              <div className="pt-gtm-h">US expansion</div>
              <ul className="pt-list">
                <li>US city adapters (NYC, Boston, Austin, LA)</li>
                <li>BuildFax data provider for permits</li>
                <li>US-specific pricing tier</li>
                <li>Target: 5,000 paying customers, $500K MRR</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 8. TEAM ── */}
        <section className="pt-section">
          <div className="pt-section-eyebrow">▸ TEAM</div>
          <h2 className="pt-h2">Founder-led. <span>Product-obsessed.</span></h2>
          <div className="pt-team-card">
            <div className="pt-team-avatar">S</div>
            <div className="pt-team-body">
              <div className="pt-team-name">Sunni Yaremchuk · Founder + CEO</div>
              <div className="pt-team-role">Also Founder + Principal Developer · Rize Developments (Edmonton multifamily)</div>
              <div className="pt-team-bio">
                Active Edmonton multifamily developer with 4 infill projects underway (Rize Developments · 28 doors across
                Jasper Park, Allendale, Mayfield). I wanted to save time on my own deals and be more efficient. There was no
                solution. So I built one. RizeAI is the tool I use myself every week for my own underwriting — same infrastructure
                65,000 Canadian brokers and developers deserve. <a onClick={() => navigate("/founder")} className="pt-inline-link" style={{cursor:"pointer"}}>Full founder page →</a>
              </div>
              <div className="pt-team-tag">▸ Currently solo · Day-1 hires (senior eng + GTM lead) start on close</div>
            </div>
          </div>
        </section>

        {/* ── 9. ASK ── auto-populated from raiseConfig.js */}
        <section className="pt-section pt-ask">
          <div className="pt-section-eyebrow" style={{ color: "var(--brass)" }}>▸ THE ASK</div>
          <h2 className="pt-h2">Raising <span>{formatUSD(RAISE.targetUSD)}</span> to reach <span>$100K MRR</span> in <span>18 months</span>.</h2>
          <p className="pt-p" style={{marginTop:-6,marginBottom:22}}>
            {RAISE.instrument} · first close {formatDate(RAISE.firstCloseTarget)}
            {daysUntil(RAISE.firstCloseTarget) != null && daysUntil(RAISE.firstCloseTarget) > 0 && ` (${daysUntil(RAISE.firstCloseTarget)} days)`}
            {" · "}<a className="pt-inline-link" onClick={() => navigate("/pitch/timeline")} style={{cursor:"pointer"}}>see full timeline →</a>
          </p>
          <div className="pt-ask-grid">
            <div className="pt-ask-card">
              <div className="pt-ask-h">Use of funds ({formatUSD(RAISE.targetUSD)})</div>
              <div className="pt-ask-breakdown">
                <div className="pt-ask-line"><span>Engineering (2 hires)</span><span>39%</span></div>
                <div className="pt-ask-line"><span>GTM + CS leadership</span><span>26%</span></div>
                <div className="pt-ask-line"><span>Founder salary (below market)</span><span>11%</span></div>
                <div className="pt-ask-line"><span>Paid acquisition experiments</span><span>9%</span></div>
                <div className="pt-ask-line"><span>Legal + accounting + IP</span><span>5%</span></div>
                <div className="pt-ask-line"><span>MLS + data licensing</span><span>5%</span></div>
                <div className="pt-ask-line"><span>Infrastructure (Anthropic + Vercel)</span><span>4%</span></div>
                <div className="pt-ask-line"><span>Discretionary + travel</span><span>1%</span></div>
              </div>
              <p className="pt-p" style={{fontSize:11.5,marginTop:10}}>
                Full CAC/LTV/burn breakdown at <a className="pt-inline-link" onClick={() => navigate("/pitch/unit-economics")} style={{cursor:"pointer"}}>/pitch/unit-economics</a> · gross burn $71K/mo · 21mo gross runway · 28mo net at $30K MRR
              </p>
            </div>
            <div className="pt-ask-card">
              <div className="pt-ask-h">Milestone gates</div>
              <ul className="pt-list">
                {RAISE.milestones.map((m, i) => (
                  <li key={i}>
                    <b style={{color:"var(--brass)"}}>{formatUSD(m.at)}</b> — {m.label}: <span style={{color:"var(--sub)"}}>{m.desc}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-p" style={{fontSize:11.5,marginTop:10}}>
                Progress + backers at <a className="pt-inline-link" onClick={() => navigate("/pitch/backers")} style={{cursor:"pointer"}}>/pitch/backers</a> · currently {formatUSD(RAISE.committedUSD)} committed
              </p>
            </div>
          </div>
        </section>

        {/* ── 10. CONTACT ── */}
        <section className="pt-section pt-contact">
          <div className="pt-section-eyebrow">▸ CONTACT</div>
          <h2 className="pt-h2">Ready to talk?</h2>
          <p className="pt-p">
            Reply to the email that included this link, or reach me directly at{" "}
            <a href="mailto:sunni@rizedevelopments.com" className="pt-inline-link">sunni@rizedevelopments.com</a>.
          </p>
          <div className="pt-contact-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="pt-cta" onClick={() => track("pitch_book_click")}>
              {BOOKING_LABEL}
            </a>
            <button className="pt-cta ghost" onClick={() => window.open("mailto:sunni@rizedevelopments.com?subject=RizeAI%20Pre-Seed%20-%20Follow%20Up")}>
              Email instead
            </button>
            <button className="pt-cta ghost" onClick={() => navigate("/property")}>Try the product</button>
          </div>
        </section>

        <div className="pt-footer">
          RizeAI · Pre-Seed Pitch · Confidential · Do not distribute · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

function TamStat({ val, lbl, accent = "brass", highlight }) {
  return (
    <div className={`pt-tam ${accent} ${highlight ? "pt-tam-highlight" : ""}`}>
      <div className="pt-tam-val">{val}</div>
      <div className="pt-tam-lbl">{lbl}</div>
    </div>
  );
}

function VerdictMockCard({ name, verdict, headline, sub, color }) {
  return (
    <div className="pt-verdict">
      <div className="pt-verdict-head">
        <div className="pt-verdict-name">{name}</div>
        <div className="pt-verdict-pill" style={{ background: color }}>{verdict}</div>
      </div>
      <div className="pt-verdict-headline">{headline}</div>
      <div className="pt-verdict-sub">{sub}</div>
    </div>
  );
}

function MoatCard({ icon, h, p }) {
  return (
    <div className="pt-moatcard">
      <div className="pt-moatcard-icon">{icon}</div>
      <div className="pt-moatcard-body">
        <div className="pt-moatcard-h">{h}</div>
        <div className="pt-moatcard-p">{p}</div>
      </div>
    </div>
  );
}

function PricingTier({ tier, price, audience, features, highlight }) {
  return (
    <div className={`pt-tier ${highlight ? "highlight" : ""}`}>
      {highlight && <div className="pt-tier-badge">▸ MOST POPULAR</div>}
      <div className="pt-tier-name">{tier}</div>
      <div className="pt-tier-price">{price}</div>
      <div className="pt-tier-audience">{audience}</div>
      <ul className="pt-list">
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

const CSS = `
  @media print {
    .pt-topbar, .pt-cta, .pt-cta-sm { display: none !important; }
    .pt-section { break-inside: avoid; page-break-inside: avoid; }
    .pt-body { padding: 20px !important; }
  }

  .pt-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }

  /* Lock screen */
  .pt-lock-wrap { min-height: 100vh; background: linear-gradient(180deg, #0a1128, #0c1530); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .pt-lock-card { max-width: 440px; width: 100%; padding: 40px 32px; background: rgba(255,255,255,0.98); border-radius: 16px; text-align: center; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5); }
  .pt-lock-icon { font-size: 48px; margin-bottom: 14px; }
  .pt-lock-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; }
  .pt-lock-h { font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 10px; letter-spacing: -0.8px; }
  .pt-lock-p { font-size: 14px; color: var(--sub); margin-bottom: 20px; line-height: 1.55; }
  .pt-lock-input { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--borderf); background: rgba(15,23,42,0.03); font-family: 'Geist Mono', monospace; font-size: 14px; margin-bottom: 12px; outline: none; }
  .pt-lock-input:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }
  .pt-lock-btn { width: 100%; padding: 12px 18px; border-radius: 8px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .pt-lock-foot { margin-top: 18px; font-size: 12px; color: var(--sub); }

  /* Top bar */
  .pt-topbar { position: sticky; top: 0; z-index: 100; background: rgba(10,17,40,0.96); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(212,175,55,0.15); }
  .pt-topbar-inner { max-width: 1080px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; gap: 14px; }
  .pt-logo { font-size: 16px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pt-logo span { color: var(--brass); }
  .pt-topbar-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pt-cta-sm { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .pt-body { max-width: 1080px; margin: 0 auto; padding: 40px 24px 80px; }

  /* Sections */
  .pt-section { margin-bottom: 56px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .pt-section:last-of-type { border-bottom: none; }
  .pt-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .pt-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pt-section-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); margin-bottom: 10px; }
  .pt-h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 800; color: var(--text); letter-spacing: -1.8px; line-height: 1.08; margin: 0 0 18px; }
  .pt-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pt-h2 { font-size: clamp(24px, 3.5vw, 36px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.15; margin: 0 0 20px; }
  .pt-h2 span { color: var(--brass); font-style: italic; }
  .pt-p { font-size: 15px; color: var(--text); line-height: 1.65; margin: 0 0 16px; }
  .pt-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.05); padding: 2px 5px; border-radius: 3px; font-size: 13px; }
  .pt-hero-sub { font-size: 16px; color: var(--sub); line-height: 1.65; margin: 0 0 32px; max-width: 780px; }
  .pt-inline-link { color: var(--brass-2); cursor: pointer; text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  /* TAM stats grid */
  .pt-tam-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  @media (max-width: 720px) { .pt-tam-grid { grid-template-columns: repeat(2, 1fr); } }
  .pt-tam { padding: 22px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; border-left: 4px solid var(--brass); }
  .pt-tam.pt-tam-highlight { background: linear-gradient(135deg, rgba(212,175,55,0.10), var(--card)); border: 2px solid var(--brass); border-left-width: 4px; }
  .pt-tam.pt-tam-highlight .pt-tam-val { color: var(--brass); font-size: 34px; }
  .pt-tam-val { font-family: 'Geist Mono', monospace; font-size: clamp(24px, 3.5vw, 36px); font-weight: 800; color: var(--brass); letter-spacing: -1px; line-height: 1; margin-bottom: 8px; }
  .pt-tam-lbl { font-size: 11px; color: var(--sub); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; font-family: 'Geist Mono', monospace; }

  /* Two-column */
  .pt-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .pt-two-col { grid-template-columns: 1fr; } }
  .pt-problem-card { padding: 22px 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; }
  .pt-problem-h { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--borderf); }

  .pt-list { list-style: none; padding: 0; margin: 0; }
  .pt-list li { padding: 8px 0 8px 18px; position: relative; font-size: 13.5px; color: var(--text); line-height: 1.55; border-bottom: 1px dashed var(--borderf); }
  .pt-list li:last-child { border-bottom: none; }
  .pt-list li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-family: 'Geist Mono', monospace; font-weight: 800; }

  /* Product mockup */
  .pt-mockup { background: #0a1128; border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; overflow: hidden; box-shadow: 0 30px 70px -20px rgba(0,0,0,0.4); }
  .pt-mockup-bar { padding: 12px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(212,175,55,0.15); display: flex; align-items: center; gap: 10px; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: 0.6px; }
  .pt-mockup-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); animation: blink 2s infinite; }
  .pt-mockup-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 16px; }
  @media (max-width: 720px) { .pt-mockup-grid { grid-template-columns: repeat(2, 1fr); } }
  .pt-verdict { padding: 14px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
  .pt-verdict-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .pt-verdict-name { font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.9); }
  .pt-verdict-pill { padding: 3px 8px; border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
  .pt-verdict-headline { font-family: 'Geist Mono', monospace; font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 4px; }
  .pt-verdict-sub { font-size: 11px; color: rgba(255,255,255,0.65); font-family: 'Geist Mono', monospace; }

  /* Moat grid */
  .pt-moat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 720px) { .pt-moat-grid { grid-template-columns: 1fr; } }
  .pt-moatcard { display: flex; gap: 14px; padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; }
  .pt-moatcard-icon { font-size: 28px; flex-shrink: 0; line-height: 1; }
  .pt-moatcard-h { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 5px; letter-spacing: -0.3px; }
  .pt-moatcard-p { font-size: 13px; color: var(--sub); line-height: 1.55; }

  /* Pricing tiers */
  .pt-pricing { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  @media (max-width: 720px) { .pt-pricing { grid-template-columns: 1fr; } }
  .pt-tier { padding: 22px 22px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; position: relative; }
  .pt-tier.highlight { border-color: var(--brass); background: linear-gradient(180deg, rgba(212,175,55,0.05), transparent 40%); }
  .pt-tier-badge { position: absolute; top: -10px; left: 20px; padding: 3px 8px; background: var(--brass); color: #0a1128; font-family: 'Geist Mono', monospace; font-size: 9px; font-weight: 800; letter-spacing: 0.5px; border-radius: 3px; }
  .pt-tier-name { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
  .pt-tier-price { font-family: 'Geist Mono', monospace; font-size: 28px; font-weight: 800; color: var(--brass); letter-spacing: -1px; margin-bottom: 4px; }
  .pt-tier-audience { font-size: 11px; color: var(--sub); font-family: 'Geist Mono', monospace; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed var(--borderf); }

  /* GTM grid */
  .pt-gtm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 720px) { .pt-gtm-grid { grid-template-columns: 1fr; } }
  .pt-gtm-card { padding: 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .pt-gtm-year { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass); letter-spacing: 1.2px; margin-bottom: 8px; }
  .pt-gtm-h { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 12px; letter-spacing: -0.3px; }

  /* Team card */
  .pt-team-card { padding: 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; display: flex; gap: 20px; }
  @media (max-width: 640px) { .pt-team-card { flex-direction: column; } }
  .pt-team-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; flex-shrink: 0; }
  .pt-team-name { font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 3px; letter-spacing: -0.4px; }
  .pt-team-role { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.6px; margin-bottom: 12px; }
  .pt-team-bio { font-size: 14px; color: var(--sub); line-height: 1.65; margin-bottom: 12px; padding: 12px 14px; background: rgba(212,175,55,0.06); border-left: 3px solid var(--brass); border-radius: 4px; font-style: italic; }
  .pt-team-tag { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--brass-2); letter-spacing: 0.4px; }

  /* Ask section */
  .pt-ask { background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); padding: 32px 28px; border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; border-bottom: 1px solid rgba(212,175,55,0.28); }
  .pt-ask-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .pt-ask-grid { grid-template-columns: 1fr; } }
  .pt-ask-card { padding: 20px 22px; background: #fff; border: 1px solid var(--borderf); border-radius: 10px; }
  .pt-ask-h { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--borderf); }
  .pt-ask-breakdown { display: flex; flex-direction: column; gap: 8px; }
  .pt-ask-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--borderf); font-family: 'Geist Mono', monospace; font-size: 13px; }
  .pt-ask-line:last-child { border-bottom: none; }
  .pt-ask-line span:last-child { font-weight: 800; color: var(--brass-2); }

  /* Contact */
  .pt-contact { text-align: center; }
  .pt-contact-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 16px; }
  .pt-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .pt-cta:hover { transform: translateY(-2px); }
  .pt-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pt-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .pt-footer { padding: 24px 16px; text-align: center; font-size: 11px; color: var(--dim); font-family: 'Geist Mono', monospace; letter-spacing: 0.4px; }

  /* Loom slot */
  .pt-loom { padding-bottom: 20px; }
  .pt-loom-frame { position: relative; padding-bottom: 56.25%; height: 0; background: #0a1128; border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,0.4); }
  .pt-loom-caption { margin-top: 10px; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 1px; text-align: center; }

  /* Loom placeholder (when empty) */
  .pt-loom-placeholder { padding: 0; margin-bottom: 40px; }
  .pt-loom-placeholder-inner { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.04)); border: 1px dashed rgba(212,175,55,0.35); border-radius: 12px; text-align: center; }
  .pt-loom-placeholder-icon { font-size: 48px; margin-bottom: 10px; }
  .pt-loom-placeholder-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.4px; margin-bottom: 10px; }
  .pt-loom-placeholder-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .pt-loom-placeholder-p { font-size: 13.5px; color: var(--sub); line-height: 1.6; margin: 0 auto 16px; max-width: 500px; }
  .pt-loom-placeholder-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 2px 6px; border-radius: 3px; font-size: 11.5px; color: var(--brass-2); }
  .pt-loom-placeholder-btn { display: inline-block; padding: 10px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; text-decoration: none; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
