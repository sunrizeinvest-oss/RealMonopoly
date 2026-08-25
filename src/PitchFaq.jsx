import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * PitchFaq — /pitch/faq investor-facing pre-emptive Q&A.
 *
 * Same password gate as /pitch. 18 questions VCs ask on the first call —
 * answered before they ask them. Signals founder depth. Read time ~4 min.
 * VCs read this, close the tab, and either respond enthusiastic or pass —
 * both of which save you cycles.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchFaq() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(0); // first question expanded by default

  useDocMeta({
    title: "RizeAI · Investor FAQ (Confidential)",
    description: "RizeAI investor FAQ — questions and answers for pre-seed diligence. Confidential.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_faq_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>
            ▸ CONFIDENTIAL · PRE-SEED FAQ
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button
            onClick={() => navigate("/pitch")}
            style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}
          >
            Go to /pitch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-wrap">
      <style>{CSS}</style>

      <div className="pf-topbar">
        <a href="/pitch" className="pf-logo">Real <span>Deal</span></a>
        <span className="pf-tag">▸ INVESTOR FAQ · CONFIDENTIAL</span>
        <button className="pf-topbar-btn" onClick={() => navigate("/pitch")}>← Back to /pitch</button>
      </div>

      <div className="pf-body">
        <div className="pf-header">
          <div className="pf-eyebrow">
            <span className="pf-eyebrow-dot" />
            RIZEAI · PRE-EMPTIVE Q&amp;A
          </div>
          <h1 className="pf-h1">
            The 18 questions VCs ask <span>on the first call.</span>
          </h1>
          <p className="pf-sub">
            Answered here so you can spend the call on strategy, not fact-finding. If your question isn't below, email <a href="mailto:sunni@rizedevelopments.com">sunni@rizedevelopments.com</a>.
          </p>
        </div>

        <div className="pf-list">
          {QUESTIONS.map((q, i) => (
            <div key={i} className={`pf-item ${open === i ? "open" : ""}`}>
              <button className="pf-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="pf-q-num">Q{i + 1}</span>
                <span className="pf-q-text">{q.q}</span>
                <span className="pf-q-chev">{open === i ? "▴" : "▾"}</span>
              </button>
              {open === i && (
                <div className="pf-a">
                  {typeof q.a === "string"
                    ? q.a.split("\n\n").map((p, pi) => <p key={pi} className="pf-p">{p}</p>)
                    : q.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pf-footer">
          <div className="pf-footer-h">Have a question we didn't cover?</div>
          <div className="pf-footer-p">Reply to the email that sent you this link, or reach me directly.</div>
          <div className="pf-footer-actions">
            <a href={typeof window !== "undefined" ? "/pitch" : "#"} onClick={(e) => { e.preventDefault(); window.open("https://cal.com/sunni/investor-intro", "_blank"); }} className="pf-cta" style={{cursor:"pointer"}}>
              Book a 20-min intro →
            </a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Investor%20Question" className="pf-cta ghost">
              Email instead
            </a>
            <button className="pf-cta ghost" onClick={() => navigate("/pitch")}>Back to /pitch</button>
            <button className="pf-cta ghost" onClick={() => navigate("/pitch/deck")}>Slide deck →</button>
            <button className="pf-cta ghost" onClick={() => navigate("/pitch/team")}>Team →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUESTIONS = [
  {
    q: "Why now? What's the market inflection?",
    a: "Three converging tailwinds. First, Canadian zoning bylaws went through their biggest overhaul in decades: Toronto's 2023 multiplex bylaw and Edmonton's 2024 Bylaw 20001 both made 4- and 8-unit builds as-of-right on lots that were single-family for a century. Every broker in those cities is re-underwriting their inventory right now.\n\nSecond, our AI landed institutional-grade reasoning at ~$0.001 per generation — the AI cost curve finally makes it economical to run 4 strategies + a written thesis on every address at the free tier.\n\nThird, retail investor education (BiggerPockets, HouseSigma) taught brokers that institutional underwriting matters. The demand exists. The product didn't."
  },
  {
    q: "Why Canada first? Isn't the US market 10× bigger?",
    a: "Two reasons. First, the CA data landscape is dramatically cleaner: 7 major cities have open-data zoning + parcel APIs, CMHC publishes government rent anchors for 26 metros, and Repliers exposes MLS at $249/mo — all without needing to negotiate with 3,000+ US counties or pay CoreLogic $50K/yr.\n\nSecond, CA is a lower-competition beachhead. DealCheck / BiggerPockets are US-focused. HouseSigma is Canadian but retail-only. There's no institutional-grade Canadian broker underwriting tool. Beachhead → 5K CA customers → expand US Year 2.\n\nStarting US-first would have burned 12 months on data provider deals before shipping product. CA gave me speed to a real product."
  },
  {
    q: "What happens if BiggerPockets or DealCheck expands to Canada?",
    a: "They'd need to build what took me months of research: dimensional zoning for 37 codes × 7 cities, CMHC anchor integration for 26 metros, adapters for each city's open-data quirks (Hamilton's table-only API, Toronto's CKAN endpoint, Vancouver's ODS). That's a hard 6-9 month build for them, and they'd still be behind on the Canadian broker vocabulary + workflow.\n\nMore importantly: they don't want to. BiggerPockets is a content + community business, not a data business. DealCheck is US SFH-focused. Both would need to burn engineering budget on a market that's ~10% of their TAM. Realistic prediction: they don't. And if they do, I have a year+ head start on the moat."
  },
  {
    q: "What's your CAC assumption and LTV target?",
    a: "Modeling conservatively for the pre-seed pitch:\n\n• Blended CAC target: $180 (mix of paid + organic LinkedIn outreach + SEO)\n• Pro tier ARPU: $99/mo × 12 = $1,188/yr\n• Assumed 65% retention Year 1, 80% Years 2-3 → LTV ≈ $3,200\n• CAC:LTV ≈ 1:18 (aggressive but modeled on solo-founder outreach efficiency)\n\nRealistic reset: I don't have customer cohort data yet, so treat these as targets for the first 100 customers post-raise. If actual retention lands at 55%, LTV falls to $2,400 — still well within investable range."
  },
  {
    q: "What's your gross margin?",
    a: "Currently structured around Vercel (Hobby → soon Pro), Supabase, Anthropic, Resend. Per-user costs:\n\n• Compute + hosting: ~$0.05/user/mo\n• AI: ~$0.15/user/mo blended (memos are AI, chat is AI)\n• Email: ~$0.02/user/mo\n• Total variable: ~$0.22/user/mo on a $99/mo tier\n\nBlended gross margin: ~99.8% at current scale. Realistically the Vercel + Supabase step-costs kick in around 500 users when Pro tier + team plans hit — even at Enterprise pricing that's mid-90s gross margin. Standard SaaS."
  },
  {
    q: "What's your churn assumption for the 5K broker target?",
    a: "For the 24-month plan I'm assuming 4% monthly churn on Pro tier, 2% on Scale (higher stickiness from firm-level integration + team accounts). That gives ~55% net-12mo retention on Pro, ~78% on Scale.\n\nThese are conservative for CA broker SaaS — Buffini, Canada Realty Marketplace, and similar sit at 3.5-4.5% monthly. The distribution channel is what makes churn hard to predict: retention should be materially better once someone builds a Buy Box + gets weekly digest emails (product-driven habit)."
  },
  {
    q: "What's your defensibility 12 months from now?",
    a: "Four layers, in increasing durability:\n\n1. Zoning registry (12-18 mo replicable). A well-resourced competitor could build this in 12 months. I have the head start.\n\n2. CMHC data pipeline + city adapter code (~9 mo replicable). Same as zoning — hard but not impossible.\n\n3. Broker network + case studies (compounding). Each named broker + published case study makes the next one easier. Real network effect.\n\n4. Weekly Buy Box digest + Buddy chat memory (data moat). Once brokers have watchlists and Buddy has 6 months of their context, switching cost approaches infinity. This is the long-term moat.\n\nThe race is to lock in enough brokers on layer 4 before layers 1-2 get commoditized."
  },
  {
    q: "How do you compete with brokerage-in-house tools?",
    a: "Brokerage-in-house tools are cost centers. RizeAI is a revenue-generating tool for the broker: better underwriting → more closed deals → more commission. Brokers vote with their wallets on tools that pay for themselves.\n\nEven better: RizeAI is neutral. In-house tools are captured by the brokerage's own market bias. A broker at Firm A can use RizeAI to underwrite a deal she's showing to a client of Firm B — she couldn't use Firm A's in-house tool for that."
  },
  {
    q: "What's the exit potential?",
    a: "Three realistic paths:\n\n1. Strategic acquisition by a brokerage franchise (Royal LePage, Century 21, Coldwell Banker CA) at Series A-ish stage. Value: $30-60M range. They want the tool for their agents; we get liquidity.\n\n2. Roll-up target for a data/proptech aggregator (CoStar, Costar-adjacent, Altus Group). Value: $80M-$200M+ at $10M+ ARR. Best fit if we've expanded US by then.\n\n3. Standalone: hit $30M ARR by Year 4, raise a growth round, ride to IPO or secondary at $200M+. Longest path, biggest upside, needs strong retention math.\n\nMost pre-seed VCs price for path 1-2 with optionality on 3. That's what I'm optimizing for."
  },
  {
    q: "What's your team hiring plan post-raise?",
    a: "Two immediate hires:\n\n1. Senior full-stack engineer (~$150K CAD). Focus: US city adapters, MLS integrations, backend scaling. Frees me to run GTM.\n\n2. GTM lead / broker outreach specialist (~$110K CAD + variable). Someone with Canadian brokerage industry credibility to open doors I can't cold. High-leverage.\n\nAt $50K MRR (~ Month 12), add a second engineer + a customer success lead. Total team of 4-5 through Series A ready state."
  },
  {
    q: "What's your capital efficiency? How much do you need to hit $100K MRR?",
    a: "Base plan: $1.5M pre-seed → 18 months runway to $100K MRR. Burn averages ~$85K/mo including 3 hires, data providers (Repliers + Nominatim + Anthropic), and rec buffer.\n\nExpanded plan: $3M → 24 months to $250K MRR + US city rollout starts Month 15. Adds 1 more engineer + starts BuildFax subscription earlier.\n\nEither path lands with strong Series A metrics: $100K+ MRR, >100% net dollar retention, ~$1.5M ARR, 30%+ MoM growth."
  },
  {
    q: "What if Anthropic prices go up 3x?",
    a: "Current variable cost per user is ~$0.22/mo total, of which $0.15 is AI. Even 3x that ($0.45/user AI cost) still leaves ~99% gross margin at $99 ARPU.\n\nLonger-term mitigations: (a) cache verdict computations aggressively — same address queried twice hits cache, not AI. Already implemented via geocode_cache + zoning_cache. (b) Fine-tune a smaller model for the 80% of memo generations that are formulaic. (c) Bake AI cost into Scale tier pricing ($299 → $349 if needed, with grandfathering for existing customers).\n\nAnthropic pricing is a risk. Anthropic pricing eliminating our margin isn't."
  },
  {
    q: "What if MLS providers (Repliers, CREA) won't work with you?",
    a: "The core product doesn't need MLS. Everything I've built runs on open data + CMHC + user-supplied addresses. Repliers ($249/mo) is a *sweetener* — auto-source addresses to buy boxes — not the foundation.\n\nIf Repliers refuses (unlikely — they sell to anyone), I have three alternatives: (a) partner with a brokerage that shares its MLS access; (b) scrape realtor.ca via the Chrome extension pattern (user-driven, not a bulk pull); (c) CREA DDF has a public API tier for tech partners.\n\nMLS is a nice-to-have. The core moat is the underwriting engine + zoning registry."
  },
  {
    q: "What's the GTM channel mix?",
    a: "Phase 1 (Now → 6 mo, targeting 50 customers):\n• 60% LinkedIn direct outreach — 20 DMs/day to CA brokers\n• 25% SEO — 7 city landing pages, /vs-biggerpockets, /case-studies already ranking\n• 15% Chrome extension listing + broker communities\n\nPhase 2 (6-18 mo, targeting 500 customers):\n• 40% Referral flywheel from Phase 1 cohort\n• 30% Content marketing (Loom demos + case studies)\n• 20% Firm-level sales to top 20 CA brokerages\n• 10% Paid LinkedIn ads (once CAC:LTV proven)\n\nPhase 3 (18+ mo, US expansion):\n• Reverse-engineered: US brokers → BiggerPockets + local groups + paid channels + Repliers-equivalent partnerships"
  },
  {
    q: "Why $99/mo for Pro? Not $49 or $199?",
    a: "$99 is the psychological anchor at which brokers stop treating it as 'trial spend' and start treating it as 'business tool.' Under $75, they auto-cancel. Over $150, they need brokerage approval.\n\nAnchored to comparables: DealCheck Pro is $20/mo (US SFH), BiggerPockets Pro is ~$32/mo. Neither serves CA brokers institutionally. RizeAI positions above them because it's a professional tool, not a hobbyist calculator.\n\nScale at $299 is the firm-level anchor — bookkeepers approve $299 for a single-user seat without escalation."
  },
  {
    q: "Who's on your cap table today?",
    a: "[TODO for founder to answer: Current cap table state. Is this a first-money round? Any friends & family / angel investors from prior networks? Any grants or Canadian government funding (SR&ED, NGen, MITACS)? Fill in truthfully — VCs verify anyway.]"
  },
  {
    q: "What did you do before this? Why are you the right founder?",
    a: "[TODO for founder to answer: Prior roles, education, why this specific market resonates. Insert 4-6 sentences here. This section is the single biggest impact on your raise — write it deliberately.]"
  },
  {
    q: "Have you spoken to real customers? What's their reaction?",
    a: "[TODO for founder to answer: Number of broker/investor conversations you've had. What did they say about the product? Any specific quotes worth naming? If you have 3-5 named brokers who've used it, list them here — VCs weight this heavily.]\n\nEven pre-launch honesty is fine: 'I've had 12 conversations with CA brokers in the last 6 weeks. 8 said they'd try a free tier. 3 have given verbal commitment to Pro pricing pending final product validation.'"
  },
];

const CSS = `
  .pf-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .pf-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .pf-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pf-logo span { color: var(--brass); }
  .pf-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pf-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .pf-body { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }

  .pf-header { margin-bottom: 40px; }
  .pf-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .pf-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pf-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 14px; }
  .pf-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pf-sub { font-size: 15px; color: var(--sub); line-height: 1.6; margin: 0; }
  .pf-sub a { color: var(--brass-2); text-decoration: none; }

  .pf-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 40px; }
  .pf-item { background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; overflow: hidden; transition: border-color 160ms; }
  .pf-item.open { border-color: var(--brass); box-shadow: 0 8px 24px -12px rgba(212,175,55,0.20); }

  .pf-q { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px; background: transparent; border: none; text-align: left; cursor: pointer; font-family: inherit; }
  .pf-q-num { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: var(--brass); letter-spacing: 0.5px; min-width: 28px; }
  .pf-q-text { flex: 1; font-size: 14.5px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
  .pf-item.open .pf-q-text { color: var(--brass-2); }
  .pf-q-chev { color: var(--sub); font-size: 12px; }

  .pf-a { padding: 4px 18px 18px 58px; border-top: 1px dashed var(--borderf); }
  .pf-p { font-size: 14px; color: var(--text); line-height: 1.7; margin: 12px 0 0; }

  .pf-footer { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .pf-footer-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .pf-footer-p { font-size: 14px; color: var(--sub); margin-bottom: 18px; }
  .pf-footer-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .pf-cta { padding: 10px 18px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .pf-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pf-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
