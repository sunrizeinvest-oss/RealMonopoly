import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { bookingHref } from "./lib/booking";

/**
 * ForFirms — /for-firms enterprise/firm-tier landing.
 *
 * Landing currently speaks to individual brokers + investors + VCs. Firms
 * are the biggest MRR unit ($299/mo Scale tier per firm-of-30) and deserve
 * their own dedicated page. Also doubles as proof to VCs that we've built
 * firm-level distribution surface.
 */
export default function ForFirms() {
  const navigate = useNavigate();

  useDocMeta({
    title: "RizeAI for Firms · Underwriter for every agent in your brokerage",
    description: "Give every agent + broker at your firm institutional-grade Canadian deal underwriting. White-label PDFs, firm-branded reports, public API for CRM embedding, single billing.",
  });

  useEffect(() => { track("for_firms_view"); }, []);

  return (
    <div className="ff-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="ff-body">
        {/* HERO */}
        <div className="ff-hero">
          <div className="ff-eyebrow">
            <span className="ff-eyebrow-dot" />
            RIZEAI FOR FIRMS · SCALE TIER
          </div>
          <h1 className="ff-h1">Underwriting infrastructure for <span>every agent in your brokerage.</span></h1>
          <p className="ff-sub">
            One firm subscription. Every agent gets institutional-grade Canadian deal underwriting. White-labeled with your logo. Available via API for your CRM. Single line-item invoice, not 30.
          </p>
          <div className="ff-hero-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="ff-cta big" onClick={() => track("firms_book_click")}>
              Book a 20-min firm demo →
            </a>
            <button className="ff-cta ghost" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>Try it as an individual first</button>
          </div>
        </div>

        {/* PRICING BLOCK */}
        <div className="ff-price">
          <div className="ff-price-tag">▸ FIRM-TIER PRICING</div>
          <div className="ff-price-row">
            <div className="ff-price-cell brass">
              <div className="ff-price-lbl">Scale tier</div>
              <div className="ff-price-val">$299<span>/mo</span></div>
              <div className="ff-price-note">Per firm · unlimited agents · white-label · API access</div>
            </div>
            <div className="ff-price-cell">
              <div className="ff-price-lbl">Per-agent equivalent</div>
              <div className="ff-price-val">$10<span>/mo</span></div>
              <div className="ff-price-note">At 30-agent firm · vs $99/mo for individual Pro tier</div>
            </div>
            <div className="ff-price-cell">
              <div className="ff-price-lbl">Payback per agent</div>
              <div className="ff-price-val">1<span> deal/mo</span></div>
              <div className="ff-price-note">One closed transaction pays firm sub for the year</div>
            </div>
          </div>
        </div>

        {/* WHAT'S INCLUDED */}
        <section className="ff-section">
          <div className="ff-section-tag">▸ WHAT'S INCLUDED IN SCALE</div>
          <h2 className="ff-h2">Every agent seat gets the full institutional stack.</h2>
          <div className="ff-features">
            <Feature icon="🏢" title="Unlimited agents" body="Every agent + broker on your roster gets a seat. No per-seat overages, no fine-print quotas. Onboard new hires the day they sign." />
            <Feature icon="📄" title="White-label PDFs" body="Every deal report exports with your firm's logo, colors, and disclaimer at the top. Your agents deliver reports that look like they came from your firm, not ours." />
            <Feature icon="🔌" title="Public API access" body="Embed RizeAI verdicts in your CRM, your intranet, your listing feed. Full REST API with docs at /api-docs — your dev team ships the integration in a weekend." />
            <Feature icon="📬" title="Weekly Buy Box digest" body="Every agent saves their own Buy Box (city + strategy + price). Monday morning digest emails match new listings. Fills your agents' pipelines automatically." />
            <Feature icon="🎯" title="Firm-level analytics" body="Firm dashboard shows: total lookups across your team, verdict distribution, most-active agents, top-performing zoning codes. Underwriting activity as a leading indicator of deal flow." />
            <Feature icon="🎥" title="Founder-led onboarding" body="30-minute Zoom with the founder to walk your team through the product + answer questions. Runs same-day or next-day for signed Scale customers." />
            <Feature icon="🚨" title="Priority support" body="Named point of contact. Same-day response Monday-Friday. Feature requests get a real conversation, not a ticket queue." />
            <Feature icon="🔒" title="Firm-controlled billing" body="One invoice per month. Auto-renewal or annual pre-pay (5% discount). Managed by your ops person, not each agent expensing." />
          </div>
        </section>

        {/* WHY FIRMS BUY */}
        <section className="ff-section">
          <div className="ff-section-tag">▸ WHY FIRMS BUY IT</div>
          <h2 className="ff-h2">Three problems the Scale tier solves.</h2>
          <div className="ff-problems">
            <div className="ff-problem">
              <div className="ff-problem-num">01</div>
              <div className="ff-problem-body">
                <div className="ff-problem-h">Your agents underwrite inconsistently.</div>
                <div className="ff-problem-p">Every broker builds their own spreadsheet. Some are excellent; some make math errors. RizeAI standardizes the underwriting layer — every agent uses the same math, backed by the same zoning + CMHC data. Consistency at scale.</div>
              </div>
            </div>
            <div className="ff-problem">
              <div className="ff-problem-num">02</div>
              <div className="ff-problem-body">
                <div className="ff-problem-h">Your agents lose deals to faster underwriters.</div>
                <div className="ff-problem-p">In a compressed market, the broker who sends the client an underwritten verdict within the hour wins the mandate. RizeAI cuts underwriting from 3 hours to 3 seconds. Your agents beat competitors to the client callback.</div>
              </div>
            </div>
            <div className="ff-problem">
              <div className="ff-problem-num">03</div>
              <div className="ff-problem-body">
                <div className="ff-problem-h">Your firm's tech stack has no underwriting layer.</div>
                <div className="ff-problem-p">You have a CRM, a listing feed, a marketing tool, an accounting system. The deal-analysis workflow lives in Excel or nowhere. RizeAI plugs in as the underwriting layer — via UI for individual agents, via API for firm-wide integration.</div>
              </div>
            </div>
          </div>
        </section>

        {/* SIZE FIT */}
        <section className="ff-section">
          <div className="ff-section-tag">▸ SIZE FIT</div>
          <h2 className="ff-h2">Best-fit firm size + shape.</h2>
          <div className="ff-fit-grid">
            <div className="ff-fit">
              <div className="ff-fit-icon">✓</div>
              <div className="ff-fit-h">10-50 agents</div>
              <div className="ff-fit-p">Sweet spot. Big enough that per-seat economics work; small enough that the founder can personally onboard the team.</div>
            </div>
            <div className="ff-fit">
              <div className="ff-fit-icon">✓</div>
              <div className="ff-fit-h">50-200 agents</div>
              <div className="ff-fit-p">API-first integrations become primary. We embed in your existing tools rather than adding another login for each agent.</div>
            </div>
            <div className="ff-fit">
              <div className="ff-fit-icon">✓</div>
              <div className="ff-fit-h">Investment / commercial specialty</div>
              <div className="ff-fit-p">Firms with an investor-client focus underwrite way more per agent. RizeAI ROI scales with lookup volume.</div>
            </div>
            <div className="ff-fit">
              <div className="ff-fit-icon">◐</div>
              <div className="ff-fit-h">200+ agents</div>
              <div className="ff-fit-p">Contact us for enterprise terms. Volume pricing + SSO + custom onboarding available above the 200-agent threshold.</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="ff-cta-block">
          <div className="ff-cta-h">Ready to underwrite as a firm?</div>
          <div className="ff-cta-p">20-min demo covers: your specific market, your CRM/tech stack, how onboarding works, and pricing that fits your agent count.</div>
          <div className="ff-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="ff-cta big">Book firm demo →</a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20Scale%20-%20Enterprise%20inquiry" className="ff-cta ghost">Email sunni@rizedevelopments.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div className="ff-feature">
      <div className="ff-feature-icon">{icon}</div>
      <div className="ff-feature-title">{title}</div>
      <div className="ff-feature-body">{body}</div>
    </div>
  );
}

const CSS = `
  .ff-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ff-body { max-width: 1020px; margin: 0 auto; padding: 44px 24px 80px; }

  .ff-hero { text-align: center; margin-bottom: 32px; padding-bottom: 30px; border-bottom: 1px solid var(--borderf); }
  .ff-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .ff-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ff-h1 { font-size: clamp(30px, 4.5vw, 46px); font-weight: 800; color: var(--text); letter-spacing: -1.7px; line-height: 1.08; margin: 0 0 16px; }
  .ff-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .ff-sub { font-size: 16px; color: var(--sub); line-height: 1.65; max-width: 720px; margin: 0 auto 24px; }
  .ff-hero-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .ff-price { padding: 24px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-bottom: 44px; }
  .ff-price-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 14px; text-align: center; }
  .ff-price-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media(max-width:720px){ .ff-price-row { grid-template-columns: 1fr; } }
  .ff-price-cell { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; text-align: center; }
  .ff-price-cell.brass { border-left: 4px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.06), var(--card)); }
  .ff-price-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
  .ff-price-val { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1; margin-bottom: 6px; }
  .ff-price-cell.brass .ff-price-val { color: var(--brass); }
  .ff-price-val span { font-size: 14px; color: var(--sub); font-weight: 600; margin-left: 2px; }
  .ff-price-note { font-size: 11.5px; color: var(--sub); line-height: 1.5; }

  .ff-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .ff-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .ff-h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -0.7px; line-height: 1.2; margin: 0 0 20px; }

  .ff-features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:900px){ .ff-features { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:560px){ .ff-features { grid-template-columns: 1fr; } }
  .ff-feature { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .ff-feature-icon { font-size: 22px; margin-bottom: 8px; }
  .ff-feature-title { font-size: 13.5px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; margin-bottom: 6px; }
  .ff-feature-body { font-size: 12px; color: var(--sub); line-height: 1.55; }

  .ff-problems { display: flex; flex-direction: column; gap: 12px; }
  .ff-problem { display: grid; grid-template-columns: 60px 1fr; gap: 14px; padding: 18px 22px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 10px; }
  .ff-problem-num { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: var(--royal); letter-spacing: -0.8px; }
  .ff-problem-h { font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .ff-problem-p { font-size: 13px; color: var(--sub); line-height: 1.65; }

  .ff-fit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(max-width:640px){ .ff-fit-grid { grid-template-columns: 1fr; } }
  .ff-fit { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .ff-fit-icon { font-size: 20px; color: #16a34a; font-weight: 800; margin-bottom: 6px; }
  .ff-fit-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .ff-fit-p { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .ff-cta-block { padding: 34px 30px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-top: 32px; }
  .ff-cta-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 8px; }
  .ff-cta-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin-bottom: 22px; max-width: 560px; margin-left: auto; margin-right: auto; }
  .ff-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .ff-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .ff-cta.big { padding: 14px 28px; font-size: 13px; }
  .ff-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .ff-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
