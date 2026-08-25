import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { RAISE, formatUSD, daysUntil, formatDate } from "./lib/raiseConfig";
import { bookingHref } from "./lib/booking";
import { track } from "./lib/analytics";

/**
 * PitchDeck v2 — /pitch/deck presenter-grade slide deck.
 *
 * 14 slides · keyboard-nav (← →) · speaker-notes toggle (N) · overview grid
 * (O or ESC) · fullscreen (F) · PDF download button (D) · deep-link (?s=N).
 *
 * Print CSS collapses to one slide per page → Cmd+P → Save as PDF ships a
 * shareable file investors can forward.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchDeck() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [idx, setIdx] = useState(() => {
    const s = parseInt(params.get("s") || "0", 10);
    return Number.isFinite(s) && s >= 0 && s < 14 ? s : 0;
  });
  const [showNotes, setShowNotes] = useState(false);
  const [overview, setOverview] = useState(false);

  useDocMeta({
    title: "RizeAI · Investor Deck (Confidential)",
    description: "RizeAI investor deck — pre-seed materials, confidential.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) {
        // Fires once per session unlock — signals a real deck-view
        try { track("pitch_deck_unlocked", { via: p === PITCH_CODE ? "url" : "session" }); } catch {}
      }
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Fire slide-view events so we can see which slides investors linger on
  // (via the deep-link ?s=N param — appears in analytics dashboards as
  // pitch_deck_slide_view with slide_num tag).
  useEffect(() => {
    if (!unlocked) return;
    try { track("pitch_deck_slide_view", { slide_num: idx + 1 }); } catch {}
  }, [idx, unlocked]);

  const slides = useMemo(() => buildSlides(), []);

  const next = useCallback(() => setIdx(i => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIdx(i => Math.max(i - 1, 0)), []);
  const goTo = useCallback((n) => setIdx(Math.max(0, Math.min(n, slides.length - 1))), [slides.length]);

  // Keep URL in sync so investors can send "here's slide 6" links.
  useEffect(() => {
    if (!unlocked) return;
    const nextParams = new URLSearchParams(params);
    nextParams.set("s", String(idx));
    setParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, unlocked]);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch {}
  }, []);

  const downloadPDF = useCallback(() => {
    // Bulletproof: use the browser's native print dialog. Our print CSS
    // collapses each slide into one page. User picks "Save as PDF" as the
    // destination, gets a shareable file. Zero server round-trip.
    try { track("pitch_deck_pdf_download", { slide_at_download: idx + 1 }); } catch {}
    window.print();
  }, [idx]);

  useEffect(() => {
    if (!unlocked) return;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (overview) {
        if (e.key === "Escape" || e.key === "o" || e.key === "O") { setOverview(false); }
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") setOverview(true);
      else if (e.key === "n" || e.key === "N") setShowNotes(v => !v);
      else if (e.key === "o" || e.key === "O") setOverview(v => !v);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "d" || e.key === "D") downloadPDF();
      else if (e.key === "Home") setIdx(0);
      else if (e.key === "End") setIdx(slides.length - 1);
      else if (/^[1-9]$/.test(e.key)) goTo(parseInt(e.key, 10) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked, next, prev, goTo, overview, toggleFullscreen, downloadPDF, slides.length]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · PRE-SEED</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const slide = slides[idx];

  return (
    <div className="pd-wrap">
      <style>{CSS}</style>

      {/* Top chrome */}
      <div className="pd-chrome pd-chrome-top no-print">
        <div className="pd-chrome-left">
          <a href="/pitch" className="pd-logo">Real <span>Deal</span></a>
          <span className="pd-tag">▸ INVESTOR DECK · CONFIDENTIAL</span>
        </div>
        <div className="pd-chrome-right">
          <button className="pd-chrome-btn" onClick={() => setShowNotes(v => !v)} title="Toggle speaker notes (N)">{showNotes ? "▸ Hide notes" : "▸ Notes (N)"}</button>
          <button className="pd-chrome-btn" onClick={() => setOverview(v => !v)} title="Overview grid (O)">▦ Overview (O)</button>
          <button className="pd-chrome-btn" onClick={toggleFullscreen} title="Fullscreen (F)">⛶ Full</button>
          <button className="pd-chrome-btn primary" onClick={downloadPDF} title="Download as PDF (D)">↓ Download PDF</button>
          <span className="pd-counter">{idx + 1} / {slides.length}</span>
          <button className="pd-chrome-btn" onClick={() => navigate("/pitch")}>Exit</button>
        </div>
      </div>

      {/* Overview grid */}
      {overview && (
        <div className="pd-overview no-print" onClick={(e) => { if (e.target === e.currentTarget) setOverview(false); }}>
          <div className="pd-overview-inner">
            <div className="pd-overview-head">
              <span className="pd-overview-tag">▸ OVERVIEW · CLICK ANY SLIDE</span>
              <button className="pd-chrome-btn" onClick={() => setOverview(false)}>Close (ESC)</button>
            </div>
            <div className="pd-overview-grid">
              {slides.map((s, i) => (
                <button key={i} className={`pd-overview-cell ${i === idx ? "active" : ""}`} onClick={() => { setIdx(i); setOverview(false); }}>
                  <div className="pd-overview-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="pd-overview-eyebrow">{s.eyebrow}</div>
                  <div className="pd-overview-title">{typeof s.title === "string" ? s.title : "—"}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide */}
      <div className="pd-slide-wrap">
        <div className={`pd-slide pd-slide-${slide.kind}`} key={idx}>
          {slide.eyebrow && <div className="pd-eyebrow">{slide.eyebrow}</div>}
          {slide.title && <h1 className={`pd-h ${slide.kind}`}>{slide.title}</h1>}
          {slide.subtitle && <div className="pd-sub">{slide.subtitle}</div>}
          {slide.content && <div className="pd-content">{slide.content}</div>}
          {slide.footer && <div className="pd-slide-footer">{slide.footer}</div>}
        </div>
      </div>

      {/* Speaker notes drawer */}
      {showNotes && slide.notes && (
        <div className="pd-notes no-print">
          <div className="pd-notes-tag">▸ SPEAKER NOTES · SLIDE {idx + 1}</div>
          <div className="pd-notes-body">{slide.notes}</div>
        </div>
      )}

      {/* Progress bar */}
      <div className="pd-progress no-print">
        <div className="pd-progress-fill" style={{ width: `${((idx + 1) / slides.length) * 100}%` }} />
      </div>

      {/* Bottom chrome */}
      <div className="pd-chrome pd-chrome-bot no-print">
        <button className="pd-nav-btn" onClick={prev} disabled={idx === 0}>← Previous</button>
        <div className="pd-hint">← → · SPACE · N notes · O overview · F full · D PDF · 1–9 jump · ESC overview</div>
        <button className="pd-nav-btn primary" onClick={next} disabled={idx === slides.length - 1}>Next →</button>
      </div>

      {/* Print-only footer stamped on every page */}
      <div className="pd-print-footer print-only">
        RizeAI · Pre-Seed · Confidential · realdealestate.app/pitch · Generated {new Date().toISOString().slice(0, 10)}
      </div>
    </div>
  );
}

// ─── Slide builder ───────────────────────────────────────────────────────
function buildSlides() {
  const targetFmt = formatUSD(RAISE.targetUSD);
  const firstCloseDays = daysUntil(RAISE.firstCloseTarget);

  return [
    // 01 — TITLE
    {
      kind: "title",
      eyebrow: "▸ RIZEAI · CANADIAN REAL ESTATE INTELLIGENCE · PRE-SEED " + new Date().getFullYear(),
      title: "The underwriting infrastructure Canada's $600B market never had.",
      subtitle: (
        <>
          <div className="pd-mission-line">Democratizing the tools that used to live only inside family offices — for every broker, developer, and investor.</div>
          <div className="pd-proof-line">Live in 7 cities · 37 zoning codes hand-verified · shipping in production today.</div>
        </>
      ),
      footer: (
        <div className="pd-title-meta">
          <div>Sunni Yaremchuk · Founder · realdealestate.app/pitch</div>
          <div>{`${targetFmt} on ${RAISE.instrument}${firstCloseDays > 0 ? ` · first close in ~${firstCloseDays} days` : ""}`}</div>
        </div>
      ),
      notes: "Open confident. Slow. Say the tagline exactly — pause after 'market' to let the hook ('never had') land. Then: 'I'm an active Edmonton multifamily developer. Built RizeAI because the tool I needed for my own deals didn't exist. Live in 7 cities. Raising $1.5M pre-seed to hit $100K MRR.' Raise details are the SMALLEST text on the slide — that's deliberate. Lead with what we do, not what we're asking for.",
    },

    // 02 — MARKET
    {
      kind: "content",
      eyebrow: "▸ THE MARKET",
      title: "A trillion-dollar market. A hundred-million-dollar wedge.",
      subtitle: "Canadian residential real estate is huge, fragmented, and underserved by workflow tools. The market shape, in four numbers:",
      content: (
        <>
          <div className="pd-market-hero">
            <div className="pd-market-hero-num">$8.4T</div>
            <div className="pd-market-hero-lbl">Total Canadian residential real estate value · CREA 2024</div>
          </div>
          <div className="pd-market-grid">
            <MarketStat val="$600B" lbl="Annual transaction volume" note="Every deal needs underwriting" />
            <MarketStat val="65,000+" lbl="Canadian brokers + agents" note="Our direct users" />
            <MarketStat val="$77M" lbl="SaaS TAM at $99/mo × 65K brokers" note="Ceiling of self-serve alone" highlight />
            <MarketStat val="3–6 hrs" lbl="Broker underwriting time per deal" note="Every hour lost in Excel is a call not made" />
          </div>
        </>
      ),
      footer: <div className="pd-source">Sources: CREA 2024 broker registry · Statistics Canada residential transaction data · broker interviews.</div>,
      notes: "Say 'trillion with a T' — pause. Then walk the four numbers: 8.4 trillion total, 600 billion annual, 65,000 brokers, 77 million TAM even at self-serve alone, 3-6 hours per deal in Excel. Emphasize the last stat — this is the PAIN. Every hour a broker loses in Excel is an hour they're not on the phone with a client. That's what we sell against — not a competitor, the status quo.",
    },

    // 03 — PROBLEM
    {
      kind: "content",
      eyebrow: "▸ THE PROBLEM",
      title: "3–6 hours in Excel. Every deal.",
      subtitle: "The 4 pain points every Canadian broker names when asked what's broken.",
      content: (
        <div className="pd-problem-grid">
          <ProblemCard num="01" h="Zoning specs scattered" p="Each city ships 100+ zoning codes across 10-year-old PDFs. Nobody has a unified layer." />
          <ProblemCard num="02" h="Rent guessed, not sourced" p="RentCast covers US only. Canadian brokers use gut feel or one comp — leads to 20-30% error." />
          <ProblemCard num="03" h="No side-by-side strategy" p="Underwriting one strategy at a time in Excel. Broker can't say 'here's BRRRR vs Hold vs Build side-by-side.'" />
          <ProblemCard num="04" h="CoStar priced them out" p="$12,000/year enterprise seat. Skips residential under 20 units. Not built for the actual daily broker workflow." />
        </div>
      ),
      notes: "Land the emotional beat: brokers KNOW the deal is good in 30 seconds. They can't PROVE it for 3 hours. That gap kills conversations. Every hour spent in Excel is an hour not making the next call. This is the market gap.",
    },

    // 04 — SOLUTION
    {
      kind: "content",
      eyebrow: "▸ THE SOLUTION",
      title: "One address in. Four verdicts out. 3 seconds.",
      subtitle: "Sample: 2424 Westmount Rd NW, Calgary AB · asking $607K · R-CG zoning · 5,500 sqft lot",
      content: (
        <div className="pd-verdicts">
          <VerdictCard name="Buy & Hold"  label="GO"      color="#22c55e" headline="5.8% CoC"    sub="$187/mo cashflow" />
          <VerdictCard name="BRRRR"       label="STRONG"  color="#16a34a" headline="∞ CoC"       sub="$0K left in · $243K 5yr equity" />
          <VerdictCard name="Fix & Flip"  label="CAUTION" color="#eab308" headline="+$32K"       sub="12% ROI · 22% annualized" />
          <VerdictCard name="Multiplex"   label="STRONG"  color="#16a34a" headline="22% IRR"     sub="$1.05M ARV · $2,200/door" />
        </div>
      ),
      footer: <div className="pd-source">Live at realdealestate.app/property?addr=2424+Westmount+Rd+NW+Calgary+AB — no signup required.</div>,
      notes: "This is the demo moment. If pitching over Zoom, share the browser tab RIGHT HERE and run this exact address live. It hits in 3 seconds. If pitching in-person, this static grid does the work. Emphasize: real R-CG zoning specs, real CMHC rent anchors, real IRR math. Not a mockup.",
    },

    // 05 — WHY NOW
    {
      kind: "content",
      eyebrow: "▸ WHY NOW · A 24-MONTH WINDOW",
      title: "Three forces. All flipped between 2023 and 2025.",
      subtitle: "Every one of these was different in 2022. All three moved in our favor at the same time.",
      content: (
        <div className="pd-forces-v2">
          <ForceCardV2
            icon="🏛"
            tag="SUPPLY SIDE"
            when="2023 → 2025"
            h="Every CA city rewrote zoning."
            body="Toronto Multiplex Bylaw (2023). Edmonton Bylaw 20001 (2024). Calgary R-CG (2024). Vancouver RS reforms (2024). Existing tools still assume the OLD rules — brokers who use them get the multiplex math wrong."
            accent="var(--brass)"
          />
          <ForceCardV2
            icon="⚡"
            tag="COST SIDE"
            when="2024 → 2026"
            h="LLM prices collapsed 40×."
            body="our AI at $0.001 per verdict. In 2023, this product was economically impossible. Every incumbent priced pre-2024 has a permanently different cost structure — we're structurally 40× cheaper forever."
            accent="#2155cd"
          />
          <ForceCardV2
            icon="💰"
            tag="DEMAND SIDE"
            when="2024 → 2027"
            h="Brokers need to underwrite more, faster."
            body="2024 commission compression (Sitzer/Burnett fallout) + 22% volume drop = brokers must underwrite MORE listings in LESS time to survive. A $99 tool that pays back in one commission."
            accent="#16a34a"
          />
        </div>
      ),
      notes: "Say: 'Every one of these was different in 2022. All three moved in our favor at the same time. That's why this year, not last year, not next year.' Pause before Force 2 (LLM prices) — this is the one VCs pattern-match on. Then Force 3 is the one brokers pattern-match on. All three lock in.",
    },

    // 06 — MOAT
    {
      kind: "content",
      eyebrow: "▸ THE MOAT",
      title: "Data assets that took months to hand-build.",
      subtitle: "Anyone catching up burns 6+ months on data assembly alone. That gap widens as we ship more cities.",
      content: (
        <div className="pd-moat">
          <MoatCard k="Zoning" v="37 codes" desc="Hand-verified against city bylaw PDFs across 7 CA cities. Toronto RD 2023 Multiplex, Edmonton RS Bylaw 20001, Calgary R-CG, Vancouver RS, Ottawa R1-R4, Mississauga R3-R6, Hamilton D3-D6." />
          <MoatCard k="Rent" v="26 metros" desc="CMHC government-published rent anchors. Refreshed quarterly. Legally defensible in IC memos." />
          <MoatCard k="Engine" v="4 strategies" desc="Custom verdict math — BRRRR, Hold, Flip, Multiplex Build — running in parallel. Not a general LLM wrapper." />
          <MoatCard k="Margin" v="99.8%" desc="$0.001 marginal cost per verdict. Structural pricing advantage vs. every incumbent priced pre-LLM." />
        </div>
      ),
      notes: "The moat is data + speed. Any well-funded competitor could try to catch up but 6 months is a long time in a founder-led sprint. By the time they finish city #3 we're in city #12. Also emphasize: 99.8% margin is not a rounding trick — it's structural. Every unit we sell is nearly pure profit.",
    },

    // 07 — BUSINESS MODEL
    {
      kind: "content",
      eyebrow: "▸ BUSINESS MODEL",
      title: "Self-serve SaaS + firm-tier + API.",
      subtitle: "Broker pays with credit card. Firm pays with invoice. API tier plugs into the CRM.",
      content: (
        <>
          <div className="pd-pricing">
            <PriceTier name="Free" price="$0" note="5 lookups/mo · full verdict" />
            <PriceTier name="Pro" price="$99/mo" note="Unlimited · saved deals · white-label PDF" highlight />
            <PriceTier name="Scale" price="$299/mo" note="Firm-tier · unlimited agents · API access" />
          </div>
          <div className="pd-econ-strip">
            <EconStat k="CAC" v="$180" note="blended · founder outreach" />
            <EconStat k="LTV" v="$3,200" note="30-mo tenure · Pro tier" />
            <EconStat k="LTV : CAC" v="18 : 1" note="benchmark: 5:1 great" />
            <EconStat k="Payback" v="1.8 mo" note="first check recovers CAC" />
          </div>
        </>
      ),
      notes: "Pro is where the volume MRR lives. Scale is where the leverage lives — 30-agent firm at $299 is $10/agent. API is enterprise. All three price points work. The unit economics are strong: 18:1 LTV:CAC (SaaS benchmark is 5:1) and 1.8-month payback. This is not a break-even business at scale.",
    },

    // 08 — TRACTION
    {
      kind: "content",
      eyebrow: "▸ TRACTION · SHIPPING VELOCITY",
      title: "In production. Live now.",
      subtitle: "Every number pulled from Supabase Postgres in real time. See realdealestate.app/live for the dashboard.",
      content: (
        <div className="pd-traction">
          <Tstat val="7" lbl="CA cities live" />
          <Tstat val="37" lbl="zoning codes registered" />
          <Tstat val="26" lbl="CMHC metros integrated" />
          <Tstat val="<3s" lbl="verdict latency (P95)" />
          <Tstat val="1" lbl="Chrome extension shipped" />
          <Tstat val="v1" lbl="Public API live" />
        </div>
      ),
      footer: <div className="pd-source">Chrome extension supports Realtor.ca, HouseSigma, Zillow, Redfin. Public API at realdealestate.app/api-docs.</div>,
      notes: "BE HONEST if asked about paying customers. Right answer: 'Focus this quarter is 20 paying brokers before we close. Every raise commitment is contingent on that.' Then pivot to what IS shipping. Product velocity is the traction story at pre-seed — I've shipped a live production stack solo in 8 weeks.",
    },

    // 09 — GTM
    {
      kind: "content",
      eyebrow: "▸ GO-TO-MARKET",
      title: "Canadian broker beachhead. US expansion Year 2.",
      content: (
        <div className="pd-gtm">
          <GtmPhase phase="Now → 6 mo" tag="Founder-led" bullets={["20 broker DMs/day (LinkedIn)", "3 walkthrough demos/week", "SEO ranking for 7 CA city queries", "Target: 50 paying Pro · $5K MRR"]} />
          <GtmPhase phase="6 → 18 mo" tag="GTM Lead hires" bullets={["Firm-tier (Scale) direct sales", "First MLS partnerships", "Real customer case studies", "Target: 500 paying · $50K MRR"]} />
          <GtmPhase phase="18+ mo" tag="US expansion" bullets={["Seattle → Portland → Denver → Austin", "BuildFax integration", "Public API scale-out", "Target: 5,000 paying · $500K MRR"]} />
        </div>
      ),
      notes: "The founder outreach is real and working. Two hires post-close specifically address scaling this: senior engineer for US adapters, GTM lead for firm sales. Emphasize this is a build-and-sell company, not a marketing-driven one. Brokers want a tool their peers use. That's word-of-mouth compounding.",
    },

    // 10 — COMPETITION
    {
      kind: "content",
      eyebrow: "▸ COMPETITION",
      title: "Nobody covers all four axes.",
      content: (
        <table className="pd-table">
          <thead>
            <tr>
              <th>Capability</th><th className="rz">RizeAI</th><th>BiggerPockets</th><th>CoStar</th><th>DealCheck</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Canadian residential</td><td className="rz">✓</td><td>US only</td><td>Commercial 20+ units</td><td>US only</td></tr>
            <tr><td>Zoning bylaw layer</td><td className="rz">✓ · 37 codes</td><td>✗</td><td>Commercial only</td><td>✗</td></tr>
            <tr><td>4-strategy verdict (parallel)</td><td className="rz">✓ · 3 seconds</td><td>1 at a time</td><td>✗</td><td>1 at a time</td></tr>
            <tr><td>CMHC-anchored rent</td><td className="rz">✓</td><td>✗</td><td>Different source</td><td>✗</td></tr>
            <tr><td>Chrome extension</td><td className="rz">✓</td><td>✗</td><td>✗</td><td>✗</td></tr>
            <tr><td>Starting price</td><td className="rz">$99/mo</td><td>$390/yr</td><td>$12,000/yr</td><td>$36/mo</td></tr>
          </tbody>
        </table>
      ),
      notes: "The comparison table is designed to concede where competitors win (CoStar for commercial, BiggerPockets for US) and highlight the sweet spot they leave open. Canadian residential under 20 units, delivered as a workflow tool at a broker-price point. Nobody serves this.",
    },

    // 11 — TEAM
    {
      kind: "content",
      eyebrow: "▸ TEAM",
      title: "Founder-led. Shipping. Hiring next.",
      content: (
        <div className="pd-team">
          <div className="pd-founder-card">
            <div className="pd-founder-avatar"><img src="/founder-sunni.jpg" alt="Sunni Yaremchuk" /></div>
            <div>
              <div className="pd-founder-name">Sunni Yaremchuk</div>
              <div className="pd-founder-role">Founder + CEO · Also Founder at Rize Developments</div>
              <div className="pd-founder-bio">
                Active Edmonton multifamily developer — 4 infill projects, 28 doors under Rize Developments. I wanted to save time on my own deals and be more efficient. There was no solution. So I built one. RizeAI is the tool I use myself every week — same infrastructure 65,000 Canadian brokers deserve.
              </div>
            </div>
          </div>
          <div className="pd-hires">
            <div className="pd-hires-tag">▸ DAY-1 POST-RAISE HIRES</div>
            <div className="pd-hire-card">
              <strong>Senior Full-Stack Engineer</strong>
              <span>$140–160K + 1.0–1.5% equity · Month 1</span>
              <em>US city adapters · MLS integrations · firm-tier features</em>
            </div>
            <div className="pd-hire-card">
              <strong>GTM Lead / Broker Sales</strong>
              <span>$95–110K + variable + 0.5–1% equity · Month 1</span>
              <em>Broker outreach · firm-tier sales · case-study production</em>
            </div>
          </div>
        </div>
      ),
      notes: "Bio slot needs your real 3 sentences before you present. Prior role, why you specifically, one anchor of credibility. On the hires: both are pre-identified. Say the names if the VC asks. Both start Month 1 post-close.",
    },

    // 12 — ASK
    {
      kind: "content",
      eyebrow: "▸ THE ASK",
      title: `Raising ${targetFmt} to reach $100K MRR in 18 months.`,
      subtitle: `${RAISE.instrument} · First close ${formatDate(RAISE.firstCloseTarget)} · Rolling to ${formatDate(RAISE.finalCloseTarget)}`,
      content: (
        <div className="pd-ask-v2">
          <div className="pd-ask-block">
            <div className="pd-ask-h">Use of funds ({targetFmt})</div>
            <div className="pd-ask-rows">
              <AskRow k="Engineering (2 hires)" v="39%" />
              <AskRow k="GTM + CS leadership" v="26%" />
              <AskRow k="Founder salary (below market)" v="11%" />
              <AskRow k="Paid acquisition tests" v="9%" />
              <AskRow k="Legal + IP + insurance" v="5%" />
              <AskRow k="MLS + data licensing" v="5%" />
              <AskRow k="Infra + buffer" v="5%" />
            </div>
          </div>
          <div className="pd-ask-block">
            <div className="pd-ask-h">Milestone gates</div>
            <div className="pd-ask-rows">
              {RAISE.milestones.map((m, i) => (
                <AskRow key={i} k={m.label} v={formatUSD(m.at)} />
              ))}
            </div>
          </div>
        </div>
      ),
      footer: <div className="pd-source">21-month gross runway · 28-month net at $30K MRR. Angels welcome from $10K at realdealestate.app/angel.</div>,
      notes: "The ask is auto-populated from raiseConfig.js. Update once, updates everywhere. 21 months of gross runway is generous — enough to hit $100K MRR without a bridge. If asked about the pre-money cap: 'YC SAFE post-money — happy to talk cap in the diligence stage.'",
    },

    // 13 — MOMENTUM / TIMELINE
    {
      kind: "content",
      eyebrow: "▸ TIMELINE",
      title: "The seed → Series A bridge.",
      content: (
        <div className="pd-timeline">
          <TimelineRow q="Q4 2026" mo="Mo 1-3" body="Team foundation · first US city · first firm-tier customer · first real customer name replaces composite" />
          <TimelineRow q="Q1 2027" mo="Mo 4-6" body="10 firm accounts · $10K firm-tier MRR · 1,000 paying broker users · $30K total MRR" />
          <TimelineRow q="Q2 2027" mo="Mo 7-9" body="$50K MRR · 2,500 paying · 25 firm accounts · first press mention · Chrome ext 25K+ WAU" />
          <TimelineRow q="Q3 2027" mo="Mo 10-12" body="$100K MRR · $1.2M ARR · 6 real customer references · Series-A materials refreshed · warm intros open" highlight />
        </div>
      ),
      notes: "This slide answers 'what does the seed produce?' The Series A is a raise materials refresh, not a new pitch. Every seed backer becomes an active supporter. This is what compounding companies look like.",
    },

    // 14 — CLOSE
    {
      kind: "final",
      eyebrow: "▸ CONTACT",
      title: "Let's talk.",
      subtitle: "20 min · fastest path from 'interested' to 'in'",
      content: (
        <div className="pd-final-v2">
          <div className="pd-final-item">
            <div className="pd-final-lbl">Book directly</div>
            <div className="pd-final-val">{bookingHref()}</div>
          </div>
          <div className="pd-final-item">
            <div className="pd-final-lbl">Full materials</div>
            <div className="pd-final-val">realdealestate.app/pitch</div>
          </div>
          <div className="pd-final-item">
            <div className="pd-final-lbl">Email</div>
            <div className="pd-final-val">sunni@rizedevelopments.com</div>
          </div>
          <div className="pd-final-item">
            <div className="pd-final-lbl">Try the product</div>
            <div className="pd-final-val">realdealestate.app/property</div>
          </div>
        </div>
      ),
      footer: <div className="pd-source" style={{textAlign:"center",marginTop:20}}>Sunni Yaremchuk · Founder + CEO · Vancouver, BC · realdealestate.app</div>,
      notes: "Close with 'Materials are all at /pitch. Book on the calendar link directly. I close within 14 days of a signed SAFE. Thanks for your time.' Then STOP TALKING. Silence sells at close.",
    },
  ];
}

// ─── Presentational components ───────────────────────────────────────────
function ProblemCard({ num, h, p }) {
  return (
    <div className="pd-problem">
      <div className="pd-problem-num">{num}</div>
      <div className="pd-problem-h">{h}</div>
      <div className="pd-problem-p">{p}</div>
    </div>
  );
}

function VerdictCard({ name, label, headline, sub, color }) {
  return (
    <div className="pd-verdict-v2" style={{ borderLeftColor: color }}>
      <div className="pd-verdict-name">{name}</div>
      <div className="pd-verdict-label" style={{ color, borderColor: color }}>{label}</div>
      <div className="pd-verdict-headline">{headline}</div>
      <div className="pd-verdict-sub">{sub}</div>
    </div>
  );
}

function ForceCard({ num, h, body }) {
  return (
    <div className="pd-force">
      <div className="pd-force-num">{num}</div>
      <div className="pd-force-h">{h}</div>
      <div className="pd-force-p">{body}</div>
    </div>
  );
}

function ForceCardV2({ icon, tag, when, h, body, accent }) {
  return (
    <div className="pd-force-v2" style={{ borderTopColor: accent }}>
      <div className="pd-force-v2-icon">{icon}</div>
      <div className="pd-force-v2-tag" style={{ color: accent }}>{tag}</div>
      <div className="pd-force-v2-when">{when}</div>
      <div className="pd-force-v2-h">{h}</div>
      <div className="pd-force-v2-p">{body}</div>
    </div>
  );
}

function MarketStat({ val, lbl, note, highlight }) {
  return (
    <div className={`pd-market-stat ${highlight ? "highlight" : ""}`}>
      <div className="pd-market-stat-val">{val}</div>
      <div className="pd-market-stat-lbl">{lbl}</div>
      <div className="pd-market-stat-note">{note}</div>
    </div>
  );
}

function MoatCard({ k, v, desc }) {
  return (
    <div className="pd-moat-cell">
      <div className="pd-moat-k">{k}</div>
      <div className="pd-moat-v">{v}</div>
      <div className="pd-moat-desc">{desc}</div>
    </div>
  );
}

function PriceTier({ name, price, note, highlight }) {
  return (
    <div className={`pd-tier ${highlight ? "highlight" : ""}`}>
      <strong>{name}</strong>
      <span className="pd-price">{price}</span>
      <span>{note}</span>
    </div>
  );
}

function EconStat({ k, v, note }) {
  return (
    <div className="pd-econ-cell">
      <div className="pd-econ-lbl">{k}</div>
      <div className="pd-econ-val">{v}</div>
      <div className="pd-econ-note">{note}</div>
    </div>
  );
}

function Tstat({ val, lbl }) {
  return (
    <div className="pd-tstat">
      <strong>{val}</strong>
      <span>{lbl}</span>
    </div>
  );
}

function GtmPhase({ phase, tag, bullets }) {
  return (
    <div className="pd-gtm-cell">
      <div className="pd-gtm-phase">{phase}</div>
      <div className="pd-gtm-tag">{tag}</div>
      <ul className="pd-gtm-list">
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}

function AskRow({ k, v }) {
  return (
    <div className="pd-ask-row">
      <span className="pd-ask-k">{k}</span>
      <span className="pd-ask-v">{v}</span>
    </div>
  );
}

function TimelineRow({ q, mo, body, highlight }) {
  return (
    <div className={`pd-tl-row ${highlight ? "highlight" : ""}`}>
      <div className="pd-tl-side">
        <div className="pd-tl-q">{q}</div>
        <div className="pd-tl-mo">{mo}</div>
      </div>
      <div className="pd-tl-body">{body}</div>
    </div>
  );
}

const CSS = `
  /* ─── Print CSS · one slide per page ─── */
  @page { size: landscape; margin: 0; }
  @media print {
    body { background: #0a1128 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .pd-wrap { min-height: auto; }
    .pd-slide-wrap { padding: 40px 48px !important; min-height: 100vh; page-break-after: always; break-after: page; }
    .pd-slide-wrap:last-of-type { page-break-after: auto; break-after: auto; }
    .pd-print-footer { position: fixed; bottom: 12px; left: 24px; right: 24px; font-family: 'Geist Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.35); letter-spacing: 0.4px; text-align: center; }
  }
  .print-only { display: none; }

  /* ─── Root ─── */
  .pd-wrap { min-height: 100vh; background: #0a1128; color: #fff; font-family: 'Geist', ui-sans-serif, sans-serif; display: flex; flex-direction: column; overflow-x: hidden; }

  /* ─── Chrome ─── */
  .pd-chrome { display: flex; align-items: center; justify-content: space-between; padding: 12px 22px; background: rgba(0,0,0,0.45); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); gap: 12px; }
  .pd-chrome-bot { border-top: 1px solid rgba(212,175,55,0.15); border-bottom: none; }
  .pd-chrome-left { display: flex; align-items: center; gap: 14px; }
  .pd-chrome-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pd-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pd-logo span { color: #d4af37; }
  .pd-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: #d4af37; }
  .pd-counter { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; color: #d4af37; letter-spacing: 0.4px; padding: 5px 10px; background: rgba(212,175,55,0.06); border-radius: 3px; }
  .pd-chrome-btn { padding: 6px 12px; border-radius: 4px; background: transparent; color: #d4d8e0; border: 1px solid rgba(212,175,55,0.28); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
  .pd-chrome-btn:hover { color: #fff; border-color: #d4af37; background: rgba(212,175,55,0.06); }
  .pd-chrome-btn.primary { background: #d4af37; color: #0a1128; border-color: #d4af37; font-weight: 800; }
  .pd-chrome-btn.primary:hover { background: #b58900; border-color: #b58900; color: #0a1128; }

  /* ─── Slide ─── */
  .pd-slide-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative; overflow: hidden; }
  .pd-slide-wrap::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 1200px; height: 600px; background: radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 65%); pointer-events: none; }
  .pd-slide { max-width: 1100px; width: 100%; position: relative; z-index: 1; animation: pd-slide-in 300ms cubic-bezier(0.4, 0, 0.2, 1) both; }
  @keyframes pd-slide-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

  .pd-eyebrow { display: inline-block; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 1.7px; color: #d4af37; background: rgba(212,175,55,0.10); border: 1px solid rgba(212,175,55,0.30); padding: 6px 12px; border-radius: 4px; margin-bottom: 24px; }
  .pd-h { font-weight: 800; color: #fff; letter-spacing: -1.5px; line-height: 1.05; margin: 0 0 18px; }
  .pd-h.title { font-size: clamp(32px, 5.5vw, 62px); }
  .pd-h.big-number { font-size: clamp(100px, 16vw, 200px); color: #d4af37; letter-spacing: -6px; line-height: 0.95; }
  .pd-h.content { font-size: clamp(28px, 4vw, 44px); }
  .pd-h.final { font-size: clamp(48px, 8vw, 80px); color: #d4af37; font-style: italic; }
  .pd-sub { font-size: clamp(15px, 2vw, 20px); color: #d4d8e0; line-height: 1.55; margin-bottom: 30px; max-width: 900px; }
  .pd-content { margin-top: 22px; }
  .pd-source { margin-top: 22px; font-family: 'Geist Mono', monospace; font-size: 11.5px; color: rgba(212,216,224,0.60); letter-spacing: 0.3px; line-height: 1.5; }
  .pd-slide-footer { margin-top: 24px; }

  .pd-title-meta { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(212,175,55,0.20); display: flex; justify-content: space-between; font-family: 'Geist Mono', monospace; font-size: 12px; color: #d4d8e0; letter-spacing: 0.3px; flex-wrap: wrap; gap: 12px; }

  /* Mission + proof lines on Slide 1 (title slide subtitle) */
  .pd-mission-line { font-family: 'Geist', ui-sans-serif, sans-serif; font-size: clamp(16px, 1.9vw, 22px); font-style: italic; color: #d4af37; line-height: 1.5; margin-bottom: 14px; max-width: 900px; letter-spacing: -0.2px; }
  .pd-proof-line { font-family: 'Geist Mono', monospace; font-size: clamp(12px, 1.4vw, 15px); color: #d4d8e0; letter-spacing: 0.3px; }

  /* ─── Problem grid ─── */
  .pd-problem-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .pd-problem { padding: 22px 24px; background: rgba(255,255,255,0.05); border-left: 3px solid #d4af37; border-radius: 8px; }
  .pd-problem-num { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: #d4af37; letter-spacing: -0.6px; margin-bottom: 8px; }
  .pd-problem-h { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.3px; margin-bottom: 8px; }
  .pd-problem-p { font-size: 14px; color: #d4d8e0; line-height: 1.65; }

  /* ─── Verdicts ─── */
  .pd-verdicts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media(max-width:900px){ .pd-verdicts { grid-template-columns: repeat(2, 1fr); } }
  .pd-verdict-v2 { padding: 18px 18px 20px; background: rgba(255,255,255,0.06); border-left: 4px solid; border-radius: 8px; }
  .pd-verdict-name { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.75); letter-spacing: 0.9px; text-transform: uppercase; margin-bottom: 10px; }
  .pd-verdict-label { display: inline-block; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 3px 8px; border: 1px solid; border-radius: 3px; margin-bottom: 14px; }
  .pd-verdict-headline { font-family: 'Geist Mono', monospace; font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.8px; line-height: 1; margin-bottom: 6px; }
  .pd-verdict-sub { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 600; color: #d4d8e0; letter-spacing: 0.2px; line-height: 1.4; }

  /* ─── Forces (legacy) ─── */
  .pd-forces { display: flex; flex-direction: column; gap: 12px; }
  .pd-force { padding: 20px 24px; background: rgba(255,255,255,0.05); border-left: 3px solid #d4af37; border-radius: 8px; display: grid; grid-template-columns: 60px 1fr; gap: 16px; align-items: start; }
  @media(max-width:720px){ .pd-force { grid-template-columns: 1fr; } }
  .pd-force-num { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; color: #d4af37; letter-spacing: -1px; line-height: 1; }
  .pd-force-h { font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.3px; margin-bottom: 6px; }
  .pd-force-p { font-size: 13.5px; color: #d4d8e0; line-height: 1.6; }

  /* ─── Forces V2 · 3-column horizontal ─── */
  .pd-forces-v2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media(max-width:900px){ .pd-forces-v2 { grid-template-columns: 1fr; } }
  .pd-force-v2 { padding: 22px 22px 20px; background: rgba(255,255,255,0.05); border-top: 3px solid; border-radius: 10px; display: flex; flex-direction: column; }
  .pd-force-v2-icon { font-size: 32px; line-height: 1; margin-bottom: 12px; }
  .pd-force-v2-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 4px; }
  .pd-force-v2-when { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.55); letter-spacing: 0.5px; margin-bottom: 14px; }
  .pd-force-v2-h { font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 12px; }
  .pd-force-v2-p { font-size: 13px; color: #d4d8e0; line-height: 1.65; flex: 1; }

  /* ─── Market slide (slide 02) ─── */
  .pd-market-hero { padding: 28px 32px; background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(33,85,205,0.06)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-bottom: 16px; }
  .pd-market-hero-num { font-family: 'Geist Mono', monospace; font-size: clamp(72px, 12vw, 128px); font-weight: 800; color: #d4af37; letter-spacing: -4px; line-height: 0.95; margin-bottom: 8px; text-shadow: 0 4px 30px rgba(212,175,55,0.25); }
  .pd-market-hero-lbl { font-family: 'Geist Mono', monospace; font-size: 12.5px; font-weight: 700; color: #d4d8e0; letter-spacing: 0.5px; }

  .pd-market-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:900px){ .pd-market-grid { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .pd-market-grid { grid-template-columns: 1fr; } }
  .pd-market-stat { padding: 16px 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,55,0.15); border-radius: 8px; }
  .pd-market-stat.highlight { border-color: #d4af37; background: rgba(212,175,55,0.10); border-width: 2px; padding: 15px 17px; }
  .pd-market-stat-val { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: #d4af37; letter-spacing: -0.6px; line-height: 1; margin-bottom: 6px; }
  .pd-market-stat.highlight .pd-market-stat-val { font-size: 28px; }
  .pd-market-stat-lbl { font-size: 12.5px; font-weight: 800; color: #fff; letter-spacing: -0.2px; margin-bottom: 4px; line-height: 1.3; }
  .pd-market-stat-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: rgba(212,216,224,0.65); letter-spacing: 0.2px; line-height: 1.45; }

  /* ─── Moat ─── */
  .pd-moat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media(max-width:900px){ .pd-moat { grid-template-columns: repeat(2, 1fr); } }
  .pd-moat-cell { padding: 20px 20px 18px; background: rgba(255,255,255,0.05); border-radius: 8px; border-top: 2px solid #d4af37; }
  .pd-moat-k { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: rgba(255,255,255,0.65); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .pd-moat-v { font-family: 'Geist Mono', monospace; font-size: 28px; font-weight: 800; color: #d4af37; letter-spacing: -0.8px; line-height: 1; margin-bottom: 10px; }
  .pd-moat-desc { font-size: 12px; color: #d4d8e0; line-height: 1.55; }

  /* ─── Pricing ─── */
  .pd-pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
  @media(max-width:720px){ .pd-pricing { grid-template-columns: 1fr; } }
  .pd-tier { padding: 22px 20px; background: rgba(255,255,255,0.05); border-radius: 10px; text-align: center; border: 1px solid transparent; }
  .pd-tier.highlight { background: rgba(212,175,55,0.10); border-color: #d4af37; }
  .pd-tier strong { display: block; font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 8px; }
  .pd-tier .pd-price { font-family: 'Geist Mono', monospace; font-size: 30px; font-weight: 800; color: #d4af37; letter-spacing: -1.2px; margin-bottom: 8px; display: block; line-height: 1; }
  .pd-tier span:last-child { font-size: 12.5px; color: #d4d8e0; }

  .pd-econ-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 14px 16px; background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.28); border-radius: 8px; }
  @media(max-width:720px){ .pd-econ-strip { grid-template-columns: 1fr 1fr; } }
  .pd-econ-cell { text-align: center; }
  .pd-econ-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.65); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .pd-econ-val { font-family: 'Geist Mono', monospace; font-size: 20px; font-weight: 800; color: #d4af37; letter-spacing: -0.5px; line-height: 1; margin-bottom: 3px; }
  .pd-econ-note { font-family: 'Geist Mono', monospace; font-size: 10px; color: rgba(212,216,224,0.65); letter-spacing: 0.2px; }

  /* ─── Traction ─── */
  .pd-traction { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
  @media(max-width:900px){ .pd-traction { grid-template-columns: repeat(3, 1fr); } }
  @media(max-width:560px){ .pd-traction { grid-template-columns: repeat(2, 1fr); } }
  .pd-tstat { padding: 26px 16px; background: rgba(255,255,255,0.05); border-radius: 10px; text-align: center; }
  .pd-tstat strong { display: block; font-family: 'Geist Mono', monospace; font-size: 40px; font-weight: 800; color: #d4af37; letter-spacing: -1.5px; margin-bottom: 6px; line-height: 1; }
  .pd-tstat span { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: #d4d8e0; letter-spacing: 0.5px; text-transform: uppercase; }

  /* ─── GTM ─── */
  .pd-gtm { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:900px){ .pd-gtm { grid-template-columns: 1fr; } }
  .pd-gtm-cell { padding: 20px 22px; background: rgba(255,255,255,0.05); border-left: 3px solid #d4af37; border-radius: 8px; }
  .pd-gtm-phase { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: #d4af37; letter-spacing: -0.2px; margin-bottom: 4px; }
  .pd-gtm-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: rgba(255,255,255,0.65); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; }
  .pd-gtm-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .pd-gtm-list li { position: relative; padding-left: 16px; font-size: 12.5px; color: #d4d8e0; line-height: 1.55; }
  .pd-gtm-list li::before { content: "▸"; position: absolute; left: 0; color: #d4af37; font-weight: 800; }

  /* ─── Table ─── */
  .pd-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .pd-table th, .pd-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(212,175,55,0.15); color: #d4d8e0; }
  .pd-table th { font-family: 'Geist Mono', monospace; font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #d4d8e0; font-weight: 800; background: rgba(0,0,0,0.25); }
  .pd-table th.rz { color: #d4af37; background: rgba(212,175,55,0.10); }
  .pd-table td.rz { color: #d4af37; font-weight: 800; background: rgba(212,175,55,0.04); }
  .pd-table td:first-child { color: #fff; font-weight: 600; }

  /* ─── Team ─── */
  .pd-team { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; }
  @media(max-width:900px){ .pd-team { grid-template-columns: 1fr; } }
  .pd-founder-card { padding: 22px; background: rgba(255,255,255,0.05); border-left: 3px solid #d4af37; border-radius: 10px; display: grid; grid-template-columns: 76px 1fr; gap: 16px; }
  .pd-founder-avatar { width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #b58900); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; overflow: hidden; border: 2px solid #d4af37; }
  .pd-founder-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .pd-founder-name { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 4px; }
  .pd-founder-role { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; color: #d4af37; letter-spacing: 0.4px; margin-bottom: 12px; }
  .pd-founder-bio { font-size: 12.5px; color: #d4d8e0; line-height: 1.65; font-style: italic; }
  .pd-hires { padding: 20px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(212,175,55,0.30); border-radius: 10px; }
  .pd-hires-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: #d4af37; letter-spacing: 1.2px; margin-bottom: 12px; text-transform: uppercase; }
  .pd-hire-card { padding: 12px 14px; background: rgba(255,255,255,0.04); border-radius: 6px; margin-bottom: 8px; }
  .pd-hire-card strong { display: block; font-size: 13.5px; font-weight: 800; color: #fff; margin-bottom: 3px; }
  .pd-hire-card span { display: block; font-family: 'Geist Mono', monospace; font-size: 11px; color: #d4af37; margin-bottom: 4px; }
  .pd-hire-card em { font-size: 11.5px; color: #d4d8e0; line-height: 1.5; }

  /* ─── Ask ─── */
  .pd-ask-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:720px){ .pd-ask-v2 { grid-template-columns: 1fr; } }
  .pd-ask-block { padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; }
  .pd-ask-h { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: #d4af37; letter-spacing: 1.2px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(212,175,55,0.20); text-transform: uppercase; }
  .pd-ask-rows { display: flex; flex-direction: column; gap: 4px; }
  .pd-ask-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed rgba(212,175,55,0.10); font-size: 13px; }
  .pd-ask-row:last-child { border-bottom: none; }
  .pd-ask-k { color: #d4d8e0; }
  .pd-ask-v { font-family: 'Geist Mono', monospace; font-weight: 800; color: #d4af37; letter-spacing: -0.2px; }

  /* ─── Timeline ─── */
  .pd-timeline { display: flex; flex-direction: column; gap: 10px; }
  .pd-tl-row { display: grid; grid-template-columns: 130px 1fr; gap: 16px; padding: 14px 18px; background: rgba(255,255,255,0.05); border-left: 3px solid rgba(212,175,55,0.30); border-radius: 8px; }
  .pd-tl-row.highlight { border-left-color: #d4af37; background: rgba(212,175,55,0.08); }
  .pd-tl-q { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: #d4af37; letter-spacing: -0.3px; margin-bottom: 3px; }
  .pd-tl-mo { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65); letter-spacing: 0.4px; }
  .pd-tl-body { font-size: 13.5px; color: #d4d8e0; line-height: 1.6; align-self: center; }

  /* ─── Final slide ─── */
  .pd-final-v2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 24px; }
  @media(max-width:720px){ .pd-final-v2 { grid-template-columns: 1fr; } }
  .pd-final-item { padding: 16px 20px; background: rgba(255,255,255,0.05); border-left: 3px solid #d4af37; border-radius: 8px; }
  .pd-final-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.65); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .pd-final-val { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 700; color: #d4af37; letter-spacing: -0.1px; word-break: break-all; }

  /* ─── Speaker notes drawer ─── */
  .pd-notes { position: fixed; bottom: 60px; left: 0; right: 0; padding: 16px 24px; background: rgba(0,0,0,0.90); border-top: 2px solid #d4af37; backdrop-filter: blur(20px); z-index: 50; }
  .pd-notes-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: #d4af37; letter-spacing: 1.4px; margin-bottom: 6px; }
  .pd-notes-body { font-size: 13.5px; color: #d4d8e0; line-height: 1.65; max-width: 1100px; margin: 0 auto; }

  /* ─── Progress ─── */
  .pd-progress { height: 3px; background: rgba(212,175,55,0.10); position: relative; }
  .pd-progress-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #d4af37, #b58900); transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1); }

  /* ─── Overview grid ─── */
  .pd-overview { position: fixed; inset: 0; background: rgba(10,17,40,0.96); backdrop-filter: blur(20px); z-index: 100; padding: 24px; overflow-y: auto; }
  .pd-overview-inner { max-width: 1200px; margin: 0 auto; }
  .pd-overview-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(212,175,55,0.20); }
  .pd-overview-tag { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 1.4px; color: #d4af37; text-transform: uppercase; }
  .pd-overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media(max-width:900px){ .pd-overview-grid { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:560px){ .pd-overview-grid { grid-template-columns: 1fr; } }
  .pd-overview-cell { padding: 16px 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,55,0.15); border-radius: 8px; cursor: pointer; text-align: left; font-family: 'Geist', sans-serif; transition: all 0.15s; min-height: 130px; }
  .pd-overview-cell:hover { border-color: #d4af37; background: rgba(212,175,55,0.08); transform: translateY(-1px); }
  .pd-overview-cell.active { border-color: #d4af37; background: rgba(212,175,55,0.14); }
  .pd-overview-num { font-family: 'Geist Mono', monospace; font-size: 26px; font-weight: 800; color: #d4af37; letter-spacing: -0.6px; line-height: 1; margin-bottom: 8px; }
  .pd-overview-eyebrow { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800; color: rgba(212,175,55,0.90); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
  .pd-overview-title { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: -0.2px; line-height: 1.35; }

  /* ─── Bottom nav ─── */
  .pd-nav-btn { padding: 8px 18px; border-radius: 5px; background: transparent; color: #d4d8e0; border: 1px solid rgba(212,175,55,0.28); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; }
  .pd-nav-btn:hover:not(:disabled) { color: #fff; border-color: #d4af37; background: rgba(212,175,55,0.06); }
  .pd-nav-btn.primary { background: #d4af37; color: #0a1128; border-color: #d4af37; }
  .pd-nav-btn.primary:hover:not(:disabled) { background: #b58900; border-color: #b58900; }
  .pd-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pd-hint { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: #94a3b8; letter-spacing: 0.4px; text-align: center; flex: 1; padding: 0 10px; }

  .pd-print-footer { display: none; }
`;
