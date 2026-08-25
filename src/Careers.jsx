import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { RAISE } from "./lib/raiseConfig";

/**
 * Careers — /careers Day-1 post-raise hiring page.
 *
 * Doubles as (a) recruiting funnel for the two Day-1 hires and (b) proof
 * to VCs that the founder has identified critical hires + will deploy the
 * money into people who move the metrics.
 */
export default function Careers() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Careers · RizeAI — Building the Canadian residential underwriter",
    description: "RizeAI is hiring senior engineer + GTM lead for post-Series-Seed shipping. Remote Canada-friendly, real ownership, Day-1 impact on a shipping product.",
  });

  useEffect(() => { track("careers_view"); }, []);

  const daysToClose = (() => {
    try {
      const d = Math.round((new Date(RAISE.firstCloseTarget).getTime() - Date.now()) / 86400000);
      return d > 0 ? d : null;
    } catch { return null; }
  })();

  return (
    <div className="cr-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="cr-body">
        {/* HERO */}
        <div className="cr-hero">
          <div className="cr-eyebrow">
            <span className="cr-eyebrow-dot" />
            HIRING · POST-SEED (DAY 1)
          </div>
          <h1 className="cr-h1">Build the Canadian residential underwriter <span>with us.</span></h1>
          <p className="cr-sub">
            RizeAI is closing pre-seed and hiring two Day-1 roles the moment the round lands. If you're a senior full-stack engineer or a GTM lead who's built Canadian real estate distribution before, this is your seat.
          </p>
          {daysToClose && (
            <div className="cr-status">
              <span className="cr-status-dot" />
              First close targeted in ~{daysToClose} days · applications open now
            </div>
          )}
        </div>

        {/* WHY US */}
        <section className="cr-section">
          <div className="cr-section-tag">▸ WHY THIS SEAT MATTERS</div>
          <div className="cr-why-grid">
            <div className="cr-why">
              <div className="cr-why-icon">🎯</div>
              <div className="cr-why-h">Founding hire</div>
              <div className="cr-why-p">Employee #2 or #3. You're not joining a team; you're building it. Direct-report to founder, no middle layer.</div>
            </div>
            <div className="cr-why">
              <div className="cr-why-icon">📦</div>
              <div className="cr-why-h">Shipping product</div>
              <div className="cr-why-p">Live in 7 cities today with real users. Not a "pre-launch stealth mode" pitch — real production, real metrics, real customers.</div>
            </div>
            <div className="cr-why">
              <div className="cr-why-icon">💰</div>
              <div className="cr-why-h">Real equity</div>
              <div className="cr-why-p">0.5% – 1.5% equity vested over 4 years with 1-year cliff. Standard Y Combinator terms; no games.</div>
            </div>
            <div className="cr-why">
              <div className="cr-why-icon">🌎</div>
              <div className="cr-why-h">Remote-Canada friendly</div>
              <div className="cr-why-p">Founder in Vancouver. Team can be anywhere in Canada. In-person quarterly for planning + shipping intense.</div>
            </div>
          </div>
        </section>

        {/* OPEN ROLES */}
        <section className="cr-section">
          <div className="cr-section-tag">▸ OPEN ROLES (2)</div>
          <div className="cr-roles">
            {/* Role 1 */}
            <div className="cr-role">
              <div className="cr-role-head">
                <div>
                  <div className="cr-role-tag">▸ ENGINEERING · MO 1</div>
                  <h3 className="cr-role-h">Senior Full-Stack Engineer</h3>
                </div>
                <div className="cr-role-salary">
                  <div className="cr-role-salary-val">$140–160K CAD</div>
                  <div className="cr-role-salary-note">+ 1.0–1.5% equity</div>
                </div>
              </div>

              <div className="cr-role-body">
                <div className="cr-role-block">
                  <div className="cr-role-block-tag">WHAT YOU'LL BUILD</div>
                  <ul className="cr-list">
                    <li>US city adapters (Seattle → Nashville) — same math engine, new bylaw layers</li>
                    <li>MLS partnership integrations (PropTx, DDF) — moving Chrome extension usage to first-party data</li>
                    <li>Firm-tier features — SSO, RBAC, white-label PDFs at scale, API rate-limiting</li>
                    <li>Backend perf hardening — currently at ~200ms P95 verdict time; target 100ms</li>
                  </ul>
                </div>

                <div className="cr-role-block">
                  <div className="cr-role-block-tag">STACK</div>
                  <p className="cr-p">React + Vite + Supabase (Postgres + Auth + Storage) + Vercel serverless + Anthropic. TypeScript-ish JS (JSDoc for types today).</p>
                </div>

                <div className="cr-role-block">
                  <div className="cr-role-block-tag">YOU HAVE</div>
                  <ul className="cr-list">
                    <li>5+ years shipping production web apps — bonus for real estate, fintech, or LLM-integrated products</li>
                    <li>Judgment on when to build vs when to buy — we don't have time for premature abstractions</li>
                    <li>Comfort with founder-led feedback velocity (weekly product changes, not quarterly)</li>
                    <li>Existing right-to-work in Canada (or willingness + capacity to relocate)</li>
                  </ul>
                </div>

                <div className="cr-role-block">
                  <div className="cr-role-block-tag">FIRST 30 DAYS</div>
                  <p className="cr-p">Ship one US city adapter end-to-end (Seattle). Read the whole codebase. Onboard with the founder in a 3-day co-work sprint. Ship one production feature by Day 30.</p>
                </div>
              </div>

              <div className="cr-role-cta">
                <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Senior%20Engineer%20application&body=Attach%20resume%20%2B%20link%20to%20recent%20shipping%20work.%20Bonus:%201%20paragraph%20on%20why%20Canadian%20real%20estate." className="cr-cta">
                  Apply · sunni@rizedevelopments.com →
                </a>
              </div>
            </div>

            {/* Role 2 */}
            <div className="cr-role">
              <div className="cr-role-head">
                <div>
                  <div className="cr-role-tag">▸ GTM · MO 1</div>
                  <h3 className="cr-role-h">GTM Lead / Broker Sales</h3>
                </div>
                <div className="cr-role-salary">
                  <div className="cr-role-salary-val">$95–110K CAD</div>
                  <div className="cr-role-salary-note">+ variable · 0.5–1% equity</div>
                </div>
              </div>

              <div className="cr-role-body">
                <div className="cr-role-block">
                  <div className="cr-role-block-tag">WHAT YOU'LL OWN</div>
                  <ul className="cr-list">
                    <li>Broker outreach — target 100 warm touches/week, convert to Pro tier at 3-5%</li>
                    <li>Firm-tier (Scale) sales — direct outreach to brokerage principals, 6-mo cycle → close 5+ firms Y1</li>
                    <li>Broker conference presence (RE/MAX, Royal LePage, etc.) — 4 events/year</li>
                    <li>Case study production — real customer wins for /case-studies + investor updates</li>
                  </ul>
                </div>

                <div className="cr-role-block">
                  <div className="cr-role-block-tag">YOU HAVE</div>
                  <ul className="cr-list">
                    <li>3+ years in Canadian real estate industry — brokerage, PropTech sales, or firm-level BD</li>
                    <li>Existing broker network you'd tap on Day 1 (this is the biggest single hiring criterion)</li>
                    <li>Consultative sales rhythm — comfortable with 30-min demos + 2-week close cycles for individuals, 3-mo cycles for firms</li>
                    <li>Willingness to travel to broker conferences quarterly</li>
                  </ul>
                </div>

                <div className="cr-role-block">
                  <div className="cr-role-block-tag">Y1 KPIs</div>
                  <ul className="cr-list">
                    <li>200+ Pro tier signups from your outreach (of the 1,000 target)</li>
                    <li>5+ firm-tier Scale accounts closed</li>
                    <li>2 real named customer references produced (replaces composite case studies)</li>
                  </ul>
                </div>
              </div>

              <div className="cr-role-cta">
                <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20GTM%20Lead%20application&body=Attach%20LinkedIn%20%2B%20specific%20broker%20network%20examples.%20Bonus:%201%20paragraph%20on%20a%20firm%20sale%20you'd%20close%20in%20the%20first%2090%20days." className="cr-cta">
                  Apply · sunni@rizedevelopments.com →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* MO 6-12 ROLES */}
        <section className="cr-section">
          <div className="cr-section-tag">▸ MONTH 6-12 · OPENING LATER</div>
          <div className="cr-later-grid">
            <div className="cr-later">
              <div className="cr-later-h">Second Engineer</div>
              <div className="cr-later-note">$120–140K · triggers at $30K MRR · US expansion focus</div>
            </div>
            <div className="cr-later">
              <div className="cr-later-h">Customer Success Lead</div>
              <div className="cr-later-note">$80–95K + variable · triggers at $30K MRR · onboarding + retention</div>
            </div>
          </div>
          <p className="cr-p" style={{marginTop:14,fontSize:13}}>
            Applying early is worth it. We queue candidates + reach out 30 days before the trigger fires.
          </p>
        </section>

        {/* HOW WE HIRE */}
        <section className="cr-section">
          <div className="cr-section-tag">▸ HOW WE HIRE</div>
          <div className="cr-hire">
            <div className="cr-hire-step">
              <div className="cr-hire-num">01</div>
              <div className="cr-hire-body">
                <div className="cr-hire-h">Email application</div>
                <div className="cr-hire-p">Send resume + one paragraph on why you specifically. No cover letters. Reply within 3 business days.</div>
              </div>
            </div>
            <div className="cr-hire-step">
              <div className="cr-hire-num">02</div>
              <div className="cr-hire-body">
                <div className="cr-hire-h">30-min founder call</div>
                <div className="cr-hire-p">Two-way conversation. You interview us as much as we interview you.</div>
              </div>
            </div>
            <div className="cr-hire-step">
              <div className="cr-hire-num">03</div>
              <div className="cr-hire-body">
                <div className="cr-hire-h">Paid trial (Engineering) or reference calls (GTM)</div>
                <div className="cr-hire-p">Engineering: $2K for a 2-day paid trial shipping a real feature. GTM: 3 reference calls with prior colleagues.</div>
              </div>
            </div>
            <div className="cr-hire-step">
              <div className="cr-hire-num">04</div>
              <div className="cr-hire-body">
                <div className="cr-hire-h">Offer within 7 days of trial</div>
                <div className="cr-hire-p">Fast decisions. Start dates flexible around your notice period.</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cr-cta-block">
          <div className="cr-cta-h">Interested?</div>
          <div className="cr-cta-p">All applications route through <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20Careers" className="cr-inline">sunni@rizedevelopments.com</a>. Reply within 3 business days on all threads.</div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .cr-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .cr-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }

  .cr-hero { text-align: center; margin-bottom: 34px; padding-bottom: 30px; border-bottom: 1px solid var(--borderf); }
  .cr-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .cr-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .cr-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .cr-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .cr-sub { font-size: 15.5px; color: var(--sub); line-height: 1.65; max-width: 660px; margin: 0 auto 16px; }
  .cr-status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.28); border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: #16a34a; letter-spacing: 0.4px; }
  .cr-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 6px #16a34a; animation: blink 2s infinite; }

  .cr-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .cr-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 14px; text-transform: uppercase; }
  .cr-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; margin: 0 0 8px; }

  .cr-why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .cr-why-grid { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .cr-why-grid { grid-template-columns: 1fr; } }
  .cr-why { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .cr-why-icon { font-size: 24px; margin-bottom: 8px; }
  .cr-why-h { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .cr-why-p { font-size: 12px; color: var(--sub); line-height: 1.55; }

  .cr-roles { display: flex; flex-direction: column; gap: 20px; }
  .cr-role { padding: 26px 28px; background: var(--card); border: 1px solid var(--borderf); border-left: 4px solid var(--brass); border-radius: 12px; }
  .cr-role-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed var(--borderf); flex-wrap: wrap; }
  .cr-role-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 4px; }
  .cr-role-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin: 0; }
  .cr-role-salary { text-align: right; }
  .cr-role-salary-val { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 800; color: var(--brass); letter-spacing: -0.3px; margin-bottom: 3px; }
  .cr-role-salary-note { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.3px; }
  .cr-role-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
  .cr-role-block { padding: 14px 16px; background: rgba(15,23,42,0.03); border-left: 2px solid var(--borderf); border-radius: 4px; }
  .cr-role-block-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: var(--brass-2); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
  .cr-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .cr-list li { position: relative; padding-left: 16px; font-size: 13px; color: var(--text); line-height: 1.55; }
  .cr-list li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-weight: 800; }
  .cr-role-cta { text-align: center; }
  .cr-cta { display: inline-block; padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; text-decoration: none; }
  .cr-cta:hover { background: var(--brass-2); }

  .cr-later-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media(max-width:560px){ .cr-later-grid { grid-template-columns: 1fr; } }
  .cr-later { padding: 14px 18px; background: rgba(15,23,42,0.03); border: 1px dashed var(--borderf); border-radius: 8px; }
  .cr-later-h { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .cr-later-note { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.3px; }

  .cr-hire { display: flex; flex-direction: column; gap: 10px; }
  .cr-hire-step { display: grid; grid-template-columns: 44px 1fr; gap: 14px; padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 8px; }
  .cr-hire-num { font-family: 'Geist Mono', monospace; font-size: 18px; font-weight: 800; color: var(--royal); letter-spacing: -0.5px; }
  .cr-hire-h { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .cr-hire-p { font-size: 12.5px; color: var(--sub); line-height: 1.6; }

  .cr-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .cr-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .cr-cta-p { font-size: 14px; color: var(--sub); line-height: 1.65; margin: 0; }
  .cr-inline { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
