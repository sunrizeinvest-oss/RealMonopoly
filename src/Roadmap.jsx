import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * Roadmap — /roadmap public product roadmap.
 *
 * Shows what's shipped, what's next, what's on the horizon. Investor-facing
 * credibility surface — VCs pattern-match on founders who have a clear plan.
 * Also broker-facing: they can see what's coming that solves their pain.
 */
export default function Roadmap() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Product Roadmap · RizeAI",
    description: "What RizeAI has shipped, what's next, and where the platform is heading. Public product roadmap for Canadian real estate underwriting.",
    // Falls back to og-image.png site default until per-page image ships.
    // image: "https://www.realdealestate.app/og-roadmap.png",
    jsonld: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "RizeAI Product Roadmap",
      "description": "Shipped features, 90-day roadmap, and 12-month strategic bets for RizeAI's Canadian real estate underwriting platform.",
      "url": "https://www.realdealestate.app/roadmap",
    },
  });

  return (
    <div className="rm-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="rm-body">
        <div className="rm-header">
          <div className="rm-eyebrow">
            <span className="rm-eyebrow-dot" />
            PRODUCT ROADMAP · UPDATED WEEKLY
          </div>
          <h1 className="rm-h1">Where <span>RizeAI is heading.</span></h1>
          <p className="rm-sub">
            Public roadmap. What's shipped, what's next, what's on the horizon. Updated weekly. Suggestions welcome via <a href="mailto:sunni@rizedevelopments.com" style={{color:"var(--brass-2)"}}>sunni@rizedevelopments.com</a>.
          </p>
        </div>

        <div className="rm-columns">
          <RoadmapColumn
            title="✓ Shipped"
            subtitle="Live in production today"
            color="var(--green)"
            items={[
              { h: "4-strategy verdict panel", p: "Buy&Hold, BRRRR, Flip, Multifamily scored side-by-side against every address." },
              { h: "Dimensional zoning registry", p: "37 codes × 7 Canadian cities. Max height, FAR, coverage, setbacks, permitted uses." },
              { h: "CMHC-anchored rent model", p: "26 Canadian metros with government rent anchors." },
              { h: "our AI thesis", p: "1-page investment memos generated from every verdict." },
              { h: "Buy Box + batch scoring", p: "Save investment criteria, paste 20 addresses, get ranked matches." },
              { h: "Voice-to-Verdict mobile flow", p: "Broker records at the lockbox, Buddy transcribes + underwrites." },
              { h: "Chrome extension v1.1", p: "One-click underwriting from realtor.ca, HouseSigma, Zillow, Redfin." },
              { h: "Public API v1", p: "Scale-tier programmatic access to the verdict engine." },
              { h: "White-label PDFs", p: "Scale-tier brokers get their firm's brand on every export." },
              { h: "Shareable verdict URLs", p: "Every lookup becomes a public /verdict/[hash] link. Viral loop." },
              { h: "7 city SEO pages", p: "Dedicated /canada/[city]-property-analysis for each covered market." },
              { h: "Full CA permit coverage", p: "6 of 7 cities live: Calgary, Edmonton, Toronto, Vancouver, Mississauga, Ottawa, Hamilton." },
            ]}
          />

          <RoadmapColumn
            title="▸ Next 90 days"
            subtitle="Under active development"
            color="var(--brass-2)"
            items={[
              { h: "Weekly Buy Box digest", p: "Cron-driven emails: 'here are 3 new matches for your saved criteria this week.'" },
              { h: "Repliers MLS activation", p: "Live MLS comps replacing RentCast estimates. Broker credibility unlock." },
              { h: "First 5-10 named case studies", p: "Real broker names, real deal numbers, published with permission." },
              { h: "Team accounts", p: "Scale tier: brokerage firms invite team members, share deals + Dashboard." },
              { h: "Ottawa new zoning bylaw", p: "Migration to Zoning By-law 2026-50 once fully published." },
              { h: "Onboarding walkthrough tour", p: "In-app product tour for new signups. Boosts activation." },
              { h: "Improved Buddy chat", p: "Multi-turn context, adversarial-verify mode, market context memory." },
            ]}
          />

          <RoadmapColumn
            title="▸ 6-12 months"
            subtitle="Committed but not yet in flight"
            color="var(--royal)"
            items={[
              { h: "US expansion (NYC, Boston, Austin, LA)", p: "City adapters, zoning codes, MLS data. Requires BuildFax subscription for permits." },
              { h: "BuildFax integration", p: "Nationwide US building permits — ~$500-800/mo data cost." },
              { h: "Advanced portfolio analytics", p: "Track cash flow, IRR, appreciation across multiple properties over time." },
              { h: "Investor waterfall modeling", p: "Multi-tier LP/GP splits, promote structures, preferred returns." },
              { h: "Loom-style embedded demos", p: "Record + share deal walkthroughs from directly inside the app." },
              { h: "Alerts for saved buy boxes", p: "Real-time: 'a new match hit your Calgary duplex box just now.'" },
              { h: "Broker firm marketplace", p: "Investor-facing directory of RizeAI-powered brokers by city + specialty." },
            ]}
          />
        </div>

        <div className="rm-north">
          <div className="rm-north-eyebrow">▸ NORTH STAR · 24+ MONTHS</div>
          <h2 className="rm-north-h">RizeAI becomes <span>the operating system</span> for Canadian residential real estate.</h2>
          <p className="rm-north-p">
            Every deal a Canadian broker or investor touches passes through RizeAI. The verdict engine, the AI thesis,
            the zoning specs, the CMHC anchor, the Buy Box, the API — all wired together as the default underwriting
            layer for a $600B market. Long-term: expand to US, then commercial real estate, then multi-strategy funds.
          </p>
        </div>

        <div className="rm-cta">
          <button className="rm-cta-btn" onClick={() => navigate("/property")}>Try the product free →</button>
          <button className="rm-cta-btn ghost" onClick={() => navigate("/case-studies")}>See case studies</button>
          <button className="rm-cta-btn ghost" onClick={() => navigate("/live")}>Live metrics</button>
        </div>
      </div>
    </div>
  );
}

function RoadmapColumn({ title, subtitle, color, items }) {
  return (
    <div className="rm-col" style={{ borderTopColor: color }}>
      <div className="rm-col-head">
        <div className="rm-col-title" style={{ color }}>{title}</div>
        <div className="rm-col-sub">{subtitle}</div>
      </div>
      <div className="rm-col-items">
        {items.map((it, i) => (
          <div key={i} className="rm-item">
            <div className="rm-item-h" style={{ color }}>{it.h}</div>
            <div className="rm-item-p">{it.p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CSS = `
  .rm-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .rm-body { max-width: 1240px; margin: 0 auto; padding: 40px 24px 80px; }

  .rm-header { text-align: center; margin-bottom: 44px; }
  .rm-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .rm-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .rm-h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--text); letter-spacing: -1.5px; line-height: 1.1; margin: 0 0 14px; }
  .rm-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .rm-sub { font-size: 15px; color: var(--sub); line-height: 1.65; margin: 0; max-width: 640px; margin-left: auto; margin-right: auto; }

  .rm-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 40px; }
  @media (max-width: 900px) { .rm-columns { grid-template-columns: 1fr; } }
  .rm-col { padding: 20px; background: var(--card); border: 1px solid var(--borderf); border-top: 3px solid; border-radius: 10px; }
  .rm-col-head { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--borderf); }
  .rm-col-title { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 4px; }
  .rm-col-sub { font-size: 12px; color: var(--sub); font-family: 'Geist Mono', monospace; letter-spacing: 0.3px; }
  .rm-col-items { display: flex; flex-direction: column; gap: 10px; }
  .rm-item { padding: 12px 14px; background: rgba(15,23,42,0.02); border: 1px solid var(--borderf); border-radius: 6px; }
  .rm-item-h { font-size: 13px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.2px; }
  .rm-item-p { font-size: 12px; color: var(--sub); line-height: 1.55; }

  .rm-north { padding: 40px 32px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-bottom: 32px; text-align: center; }
  .rm-north-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.6px; margin-bottom: 12px; }
  .rm-north-h { font-size: clamp(22px, 3.5vw, 32px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.2; margin: 0 auto 14px; max-width: 800px; }
  .rm-north-h span { color: var(--brass); font-style: italic; }
  .rm-north-p { font-size: 14.5px; color: var(--sub); line-height: 1.65; margin: 0 auto; max-width: 720px; }

  .rm-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .rm-cta-btn { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .rm-cta-btn:hover { transform: translateY(-2px); }
  .rm-cta-btn.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .rm-cta-btn.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
