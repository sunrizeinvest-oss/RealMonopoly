import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";

/**
 * Legal — /legal public corporate + IP + terms summary.
 *
 * VC-diligence-readiness signal. Answers the corporate + IP + encumbrance
 * questions without forcing an intro call. Separate from the /terms and
 * /privacy pages (which are the actual agreements) — this is the
 * plain-English summary.
 */
export default function Legal() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Legal · RizeAI — Corporate structure, IP, terms",
    description: "Plain-English summary of RizeAI's corporate structure, IP ownership, terms of service, privacy posture, and third-party providers.",
  });

  useEffect(() => { track("legal_view"); }, []);

  return (
    <div className="lg-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="lg-body">
        {/* HEADER */}
        <div className="lg-header">
          <div className="lg-eyebrow">
            <span className="lg-eyebrow-dot" />
            LEGAL · PLAIN ENGLISH
          </div>
          <h1 className="lg-h1">The corporate + legal summary. <span>No lawyerspeak.</span></h1>
          <p className="lg-sub">
            The <a onClick={() => navigate("/terms")} className="lg-link">Terms of Service</a> and <a onClick={() => navigate("/privacy")} className="lg-link">Privacy Policy</a> are the actual agreements. This page is the plain-English summary that answers the "how is this structured?" question directly. Written for founders, investors, and enterprise buyers who want the shape without wading through legalese.
          </p>
        </div>

        {/* CORPORATE STRUCTURE */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 01 · CORPORATE STRUCTURE</div>
          <h2 className="lg-h2">Who owns what.</h2>
          <div className="lg-facts">
            <Fact label="Legal name" val="RizeAI Inc. (in formation)" note="AB registration in progress · sunni@rizedevelopments.com for docs" />
            <Fact label="Incorporation date" val="2025" note="Federal + BC provincial registration" />
            <Fact label="Founder" val="Sunni Yaremchuk" note="100% owner (pre-round)" />
            <Fact label="Cap table (pre-round)" val="Founder only" note="Clean · no prior investors" />
            <Fact label="Post-round instrument" val="YC SAFE (post-money)" note="Standard uncapped or capped SAFE per investor" />
            <Fact label="Option pool" val="10% (post-close)" note="For Day-1 hires + first year hires" />
          </div>
        </section>

        {/* IP */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 02 · INTELLECTUAL PROPERTY</div>
          <h2 className="lg-h2">All IP owned by the company.</h2>
          <div className="lg-list-block">
            <div className="lg-list-item"><span className="lg-check">✓</span> All source code, product designs, trademarks, and data assets are owned by the corporation, not the founder personally. IP assignment executed at incorporation.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> Trademark applications on "RizeAI" wordmark filed with CIPO (Canada) — pending 2026 registration.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> All 37 zoning-code specs, city-specific bylaw math, and CMHC rent-anchor integrations are proprietary work product owned by the company.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> No open-source encumbrances beyond permissive licenses (MIT, Apache 2.0). No AGPL, no GPL. Verified during 2026 audit.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> No employee IP owned externally — solo founder to date. Future hires will sign IP assignment as part of employment.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> Third-party data (CMHC, municipal open data, zoning bylaws) used under public-data licensing. Attribution shipped on every relevant report.</div>
          </div>
        </section>

        {/* TERMS */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 03 · TERMS OF SERVICE (SUMMARY)</div>
          <h2 className="lg-h2">What users agree to.</h2>
          <div className="lg-list-block">
            <div className="lg-list-item"><b>Not investment advice.</b> Every verdict is a math calculation, not personalized investment advice. Users acknowledge this at signup.</div>
            <div className="lg-list-item"><b>User owns their saved deals.</b> Deal data users save belongs to them. Users can export or delete anytime.</div>
            <div className="lg-list-item"><b>No warranty on third-party data.</b> Zoning bylaws + CMHC data are sourced from public authorities. Accuracy limited to source data accuracy.</div>
            <div className="lg-list-item"><b>Reasonable use policy.</b> Free tier is 5 lookups/month. Pro and Scale tiers have generous limits (thousands of lookups/month) with fair-use throttling above that.</div>
            <div className="lg-list-item"><b>Cancellation.</b> Monthly plans cancel anytime · pro-rated refunds not required but honored case-by-case. Annual plans cancel at renewal.</div>
            <div className="lg-list-item"><b>Governing law.</b> British Columbia, Canada. Disputes resolved in BC courts unless mutually agreed to arbitration.</div>
          </div>
          <p className="lg-p" style={{marginTop:10}}>
            Full terms: <a onClick={() => navigate("/terms")} className="lg-link">realdealestate.app/terms</a>
          </p>
        </section>

        {/* PRIVACY */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 04 · PRIVACY (SUMMARY)</div>
          <h2 className="lg-h2">What we collect + what we don't.</h2>
          <div className="lg-privacy-grid">
            <div className="lg-collect">
              <div className="lg-collect-h">▸ WE COLLECT</div>
              <ul className="lg-mini">
                <li>Email + optional name (for authentication)</li>
                <li>Addresses users search + saved deals (their own account)</li>
                <li>Basic usage analytics (Vercel Analytics — no session recording)</li>
                <li>Payment info (via Stripe — we never touch card data)</li>
              </ul>
            </div>
            <div className="lg-noncollect">
              <div className="lg-noncollect-h">✗ WE DO NOT COLLECT</div>
              <ul className="lg-mini">
                <li>SSN / SIN / government IDs</li>
                <li>Bank account numbers</li>
                <li>Health information (PHI)</li>
                <li>Third-party tracking pixels or ad targeting</li>
                <li>Location data beyond IP-derived country</li>
                <li>Cross-site tracking cookies</li>
              </ul>
            </div>
          </div>
          <p className="lg-p" style={{marginTop:14}}>
            Full policy: <a onClick={() => navigate("/privacy")} className="lg-link">realdealestate.app/privacy</a> · Compliance detail: <a onClick={() => navigate("/pitch/security?p=rzai-insider-2026")} className="lg-link">/pitch/security</a>
          </p>
        </section>

        {/* THIRD-PARTY */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 05 · THIRD-PARTY PROCESSORS</div>
          <h2 className="lg-h2">Where your data physically lives.</h2>
          <div className="lg-processors">
            <div className="lg-proc"><b>Supabase</b><span>Postgres + Auth</span><span>US region · SOC 2 Type II · GDPR + CCPA</span></div>
            <div className="lg-proc"><b>Vercel</b><span>Compute + hosting + analytics</span><span>Global edge · SOC 2 Type II · ISO 27001</span></div>
            <div className="lg-proc"><b>Anthropic</b><span>AI API for AI thesis</span><span>US · SOC 2 Type II · zero data retention per DPA</span></div>
            <div className="lg-proc"><b>Resend</b><span>Transactional email</span><span>US · SOC 2 Type II · used for verification + digests</span></div>
            <div className="lg-proc"><b>Stripe</b><span>Payments</span><span>PCI DSS Level 1 · card data never touches our servers</span></div>
          </div>
        </section>

        {/* ENCUMBRANCES */}
        <section className="lg-section">
          <div className="lg-section-tag">▸ 06 · ENCUMBRANCES + LIABILITIES</div>
          <h2 className="lg-h2">What could hit the cap table.</h2>
          <div className="lg-list-block">
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No prior investors.</b> Founder is sole shareholder. Post-round cap table = founder + round-participants only.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No convertible notes outstanding.</b> Round is being raised on YC SAFE only.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No advisor equity issued yet.</b> Formal advisor agreements + equity execute post-close · budgeted from 10% option pool.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No pending litigation.</b> As of the raise open date, zero legal claims outstanding against the company.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No IP disputes.</b> All product IP originated by the founder and assigned to the company. Zero prior-work overlap.</div>
            <div className="lg-list-item"><span className="lg-check">✓</span> <b>No employee separations.</b> Solo build to date — no former employees, no wrongful termination exposure.</div>
          </div>
        </section>

        {/* CTA */}
        <div className="lg-cta-block">
          <div className="lg-cta-h">Need a specific legal doc?</div>
          <div className="lg-cta-p">Corporate documents (articles, shareholder agreement, cap table, IP assignment) available on 1:1 request under NDA at term-sheet stage.</div>
          <div className="lg-cta-row">
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Legal%20Documents%20Request" className="lg-cta">Request legal docs →</a>
            <button className="lg-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, val, note }) {
  return (
    <div className="lg-fact">
      <div className="lg-fact-lbl">{label}</div>
      <div className="lg-fact-val">{val}</div>
      <div className="lg-fact-note">{note}</div>
    </div>
  );
}

const CSS = `
  .lg-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .lg-body { max-width: 900px; margin: 0 auto; padding: 44px 24px 80px; }

  .lg-header { text-align: center; margin-bottom: 34px; padding-bottom: 30px; border-bottom: 1px solid var(--borderf); }
  .lg-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .lg-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .lg-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 14px; }
  .lg-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .lg-sub { font-size: 15px; color: var(--sub); line-height: 1.7; max-width: 720px; margin: 0 auto; }
  .lg-link { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; }

  .lg-section { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .lg-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .lg-h2 { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin: 0 0 18px; }
  .lg-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; margin: 0 0 8px; }

  .lg-facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media(max-width:640px){ .lg-facts { grid-template-columns: 1fr; } }
  .lg-fact { padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .lg-fact-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .lg-fact-val { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .lg-fact-note { font-size: 11.5px; color: var(--sub); line-height: 1.5; }

  .lg-list-block { display: flex; flex-direction: column; gap: 8px; }
  .lg-list-item { display: flex; gap: 10px; padding: 12px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; font-size: 13px; color: var(--text); line-height: 1.65; }
  .lg-list-item b { color: var(--brass-2); font-weight: 800; }
  .lg-check { color: #16a34a; font-weight: 800; flex-shrink: 0; }

  .lg-privacy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media(max-width:640px){ .lg-privacy-grid { grid-template-columns: 1fr; } }
  .lg-collect, .lg-noncollect { padding: 16px 18px; border-radius: 8px; }
  .lg-collect { background: rgba(22,163,74,0.04); border: 1px solid rgba(22,163,74,0.20); border-left: 3px solid #16a34a; }
  .lg-noncollect { background: rgba(220,38,38,0.04); border: 1px solid rgba(220,38,38,0.20); border-left: 3px solid #dc2626; }
  .lg-collect-h { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: #16a34a; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
  .lg-noncollect-h { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: #dc2626; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
  .lg-mini { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .lg-mini li { position: relative; padding-left: 16px; font-size: 12.5px; color: var(--text); line-height: 1.55; }
  .lg-mini li::before { content: "▸"; position: absolute; left: 0; color: var(--sub); font-weight: 800; }

  .lg-processors { display: flex; flex-direction: column; gap: 6px; }
  .lg-proc { display: grid; grid-template-columns: 100px 1fr auto; gap: 14px; padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; font-size: 12.5px; align-items: center; }
  @media(max-width:640px){ .lg-proc { grid-template-columns: 1fr; } }
  .lg-proc b { font-size: 13.5px; color: var(--text); font-weight: 800; letter-spacing: -0.2px; }
  .lg-proc span { color: var(--sub); font-family: 'Geist Mono', monospace; font-size: 11.5px; letter-spacing: 0.2px; }

  .lg-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .lg-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .lg-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .lg-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .lg-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .lg-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .lg-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
