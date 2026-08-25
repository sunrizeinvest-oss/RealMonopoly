import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";

/**
 * Community — /community public waitlist for the RizeAI broker community.
 *
 * Doubles as (a) GTM signal for the pitch — "we have inbound broker demand
 * beyond just product signups" — and (b) a real distribution channel once
 * enough brokers join. Slack workspace + weekly digest.
 */
export default function Community() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("broker");
  const [city, setCity] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useDocMeta({
    title: "Community · RizeAI — Canadian broker underwriter network",
    description: "Join the RizeAI community — Slack workspace + weekly digest for Canadian brokers, agents, and residential investors.",
  });

  useEffect(() => { track("community_page_view"); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    track("community_signup", { role, city });
    // Compose an email with the collected fields — routes to founder inbox
    // until a real backend endpoint replaces this.
    const body = `Please add me to the RizeAI community.\n\nEmail: ${email}\nRole: ${role}\nCity: ${city || "not specified"}`;
    window.location.href = `mailto:sunni@rizedevelopments.com?subject=RizeAI%20Community%20Signup&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  }

  return (
    <div className="co-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="co-body">
        {/* HERO */}
        <div className="co-hero">
          <div className="co-eyebrow">
            <span className="co-eyebrow-dot" />
            COMMUNITY · WAITLIST
          </div>
          <h1 className="co-h1">The room where <span>Canadian brokers</span> compare notes.</h1>
          <p className="co-sub">
            RizeAI is opening a private Slack workspace for brokers, agents, and residential investors actively underwriting deals across Canada. Weekly market digest, deal-tear-down channel, city-specific rooms, and direct-line access to the founder.
          </p>
        </div>

        {/* WAITLIST FORM */}
        <div className="co-form-card">
          {submitted ? (
            <div className="co-thanks">
              <div className="co-thanks-icon">✓</div>
              <div className="co-thanks-h">You're on the list.</div>
              <p className="co-thanks-p">Invite email lands within 48 hours. Add <code>sunni@rizedevelopments.com</code> to your contacts so it doesn't get spam-filtered.</p>
              <div style={{marginTop:14}}>
                <button className="co-cta ghost" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>Try the product while you wait →</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="co-form">
              <div className="co-form-h">Request an invite.</div>
              <div className="co-form-p">Invites go out in batches every Monday. Wait time: typically under a week.</div>

              <div className="co-form-field">
                <label>Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@brokerage.com"
                  required
                  className="co-input"
                />
              </div>

              <div className="co-form-row">
                <div className="co-form-field">
                  <label>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="co-input">
                    <option value="broker">Real estate broker</option>
                    <option value="agent">Sales agent / realtor</option>
                    <option value="investor">Investor / operator</option>
                    <option value="mortgage">Mortgage broker</option>
                    <option value="firm">Firm principal / owner</option>
                    <option value="analyst">Analyst / researcher</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="co-form-field">
                  <label>Primary city</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Calgary · Toronto · Vancouver"
                    className="co-input"
                  />
                </div>
              </div>

              <button type="submit" className="co-cta big">Join the waitlist →</button>
              <div className="co-form-note">Free · no credit card · monthly digest included</div>
            </form>
          )}
        </div>

        {/* WHAT YOU GET */}
        <section className="co-section">
          <div className="co-section-tag">▸ WHAT'S INSIDE</div>
          <h2 className="co-h2">Four channels. All value, zero noise.</h2>
          <div className="co-perks-grid">
            <div className="co-perk">
              <div className="co-perk-icon">📈</div>
              <div className="co-perk-h">#weekly-digest</div>
              <div className="co-perk-p">Every Monday. Zoning changes, CMHC updates, city bylaw notes, deal-flow signal — all delivered by the RizeAI weekly Buy Box cron.</div>
            </div>
            <div className="co-perk">
              <div className="co-perk-icon">🏘️</div>
              <div className="co-perk-h">#deal-teardowns</div>
              <div className="co-perk-p">Post a listing URL, get an unfiltered 4-strategy verdict. Members chime in with local intel. Fastest way to sanity-check a deal.</div>
            </div>
            <div className="co-perk">
              <div className="co-perk-icon">🌆</div>
              <div className="co-perk-h">City-specific rooms</div>
              <div className="co-perk-p">One room per city (#calgary, #toronto, #edmonton, etc). Local brokers compare notes on zoning gotchas, permit backlogs, contractor recs.</div>
            </div>
            <div className="co-perk">
              <div className="co-perk-icon">🎯</div>
              <div className="co-perk-h">#founder-direct</div>
              <div className="co-perk-p">Ping the founder directly. Feature requests, bugs, product feedback — replies within 24h. Skip the ticket queue.</div>
            </div>
          </div>
        </section>

        {/* WHO'S IN */}
        <section className="co-section">
          <div className="co-section-tag">▸ WHO'S IN (SO FAR)</div>
          <h2 className="co-h2">Early members skew toward serious operators.</h2>
          <div className="co-members-grid">
            <div className="co-member-stat">
              <div className="co-member-val">Founding</div>
              <div className="co-member-lbl">Currently invite-only · seeding cohort</div>
            </div>
            <div className="co-member-stat">
              <div className="co-member-val">7 cities</div>
              <div className="co-member-lbl">Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, Hamilton</div>
            </div>
            <div className="co-member-stat">
              <div className="co-member-val">Broker + operator focus</div>
              <div className="co-member-lbl">Consumer buyers don't fit — you'll self-select out</div>
            </div>
          </div>
          <p className="co-p" style={{textAlign:"center",marginTop:14,fontSize:12,fontFamily:"'Geist Mono',monospace",color:"var(--sub)",letterSpacing:0.3}}>
            <b>NDA:</b> soft NDA on cross-member deal details · no hard legal agreement · trust-based
          </p>
        </section>

        {/* WHY */}
        <section className="co-section">
          <div className="co-section-tag">▸ WHY WE'RE BUILDING THIS</div>
          <div className="co-why">
            <p className="co-p">
              Canadian brokers don't have a real professional community. Reddit is retail-buyer chatter. LinkedIn is press-release performance. Facebook groups are legal-liability minefields.
            </p>
            <p className="co-p">
              What's missing is the same thing RizeAI ships in the product: <b>real intel, delivered quickly, with signal-to-noise brokers actually respect</b>. That's what the community is. It's also, honestly, how we get product feedback fast.
            </p>
          </div>
        </section>

        {/* FOOT CTA */}
        <div className="co-foot-block">
          <div className="co-foot-h">Not a broker?</div>
          <p className="co-foot-p">
            The product is free at 5 lookups/mo · try it at <button className="co-inline-link" onClick={() => navigate("/property")}>realdealestate.app/property</button> · investors welcome at <button className="co-inline-link" onClick={() => navigate("/pitch")}>/pitch</button>.
          </p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .co-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .co-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }

  .co-hero { text-align: center; margin-bottom: 34px; }
  .co-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .co-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .co-h1 { font-size: clamp(32px, 5vw, 50px); font-weight: 800; color: var(--text); letter-spacing: -1.8px; line-height: 1.05; margin: 0 0 16px; }
  .co-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .co-sub { font-size: 15.5px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }

  .co-form-card { padding: 30px 32px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 14px; margin-bottom: 44px; max-width: 560px; margin-left: auto; margin-right: auto; }
  .co-form-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 6px; }
  .co-form-p { font-size: 13.5px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; }
  .co-form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .co-form-field label { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--sub); letter-spacing: 0.9px; text-transform: uppercase; }
  .co-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  @media(max-width:480px){ .co-form-row { grid-template-columns: 1fr; } }
  .co-form-row .co-form-field { margin-bottom: 0; }
  .co-input { padding: 11px 14px; border-radius: 6px; background: var(--card); border: 1px solid var(--borderf); font-size: 13.5px; font-family: 'Geist', sans-serif; color: var(--text); outline: none; }
  .co-input:focus { border-color: var(--brass); }
  .co-form-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--sub); letter-spacing: 0.4px; text-align: center; margin-top: 10px; }
  .co-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .co-cta.big { width: 100%; padding: 14px 22px; font-size: 13px; margin-top: 4px; }
  .co-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .co-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .co-thanks { text-align: center; padding: 20px 0; }
  .co-thanks-icon { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(22,163,74,0.15); border: 2px solid #16a34a; color: #16a34a; font-size: 32px; font-weight: 800; margin-bottom: 14px; }
  .co-thanks-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .co-thanks-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; max-width: 440px; margin: 0 auto; }
  .co-thanks-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 1px 5px; border-radius: 3px; font-size: 11.5px; color: var(--brass-2); }

  .co-section { margin-bottom: 36px; padding-bottom: 30px; border-bottom: 1px solid var(--borderf); }
  .co-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .co-h2 { font-size: clamp(22px, 3vw, 28px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin: 0 0 20px; }
  .co-p { font-size: 14.5px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .co-p b { color: var(--brass-2); font-weight: 800; }

  .co-perks-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(max-width:640px){ .co-perks-grid { grid-template-columns: 1fr; } }
  .co-perk { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; }
  .co-perk-icon { font-size: 26px; margin-bottom: 8px; }
  .co-perk-h { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: var(--brass); letter-spacing: 0.2px; margin-bottom: 8px; }
  .co-perk-p { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .co-members-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media(max-width:640px){ .co-members-grid { grid-template-columns: 1fr; } }
  .co-member-stat { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; text-align: center; }
  .co-member-val { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 800; color: var(--brass); letter-spacing: -0.3px; margin-bottom: 6px; }
  .co-member-lbl { font-size: 11.5px; color: var(--sub); line-height: 1.5; }

  .co-why .co-p { color: var(--text); }

  .co-foot-block { padding: 24px 26px; background: var(--card); border: 1px dashed var(--borderf); border-radius: 10px; text-align: center; }
  .co-foot-h { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
  .co-foot-p { font-size: 13px; color: var(--sub); margin: 0; line-height: 1.65; }
  .co-inline-link { background: none; border: none; padding: 0; color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; font: inherit; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
