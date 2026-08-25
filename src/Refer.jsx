import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * Refer — /refer public broker referral program.
 *
 * Doubles as (a) GTM lever brokers can share with peers and (b) proof-point
 * for investor conversations that we have a distribution loop, not just
 * paid acquisition.
 *
 * The mechanics scaffolded here (30% first-year rev share + 3-friends-free-Pro)
 * are commitments; the payout mechanic executes manually until we have enough
 * volume to warrant automation (post-raise).
 */
export default function Refer() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");

  useDocMeta({
    title: "Referral Program · RizeAI — Send 3 brokers, get Pro free",
    description: "Brokers who refer 3 firm colleagues get RizeAI Pro free for life. Refer paying customers to earn 30% first-year revenue share.",
  });

  const referralLink = "https://www.realdealestate.app/?ref=" + (typeof window !== "undefined" && localStorage.getItem("rde_user_email") ? btoa(localStorage.getItem("rde_user_email")).slice(0, 12) : "yourcode");

  function copyLink() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    track("refer_link_copy");
    setTimeout(() => setCopied(false), 1800);
  }

  function submitEmail(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    track("refer_join", { email });
    window.location.href = `mailto:sunni@rizedevelopments.com?subject=RizeAI%20Referral%20Program%20-%20Join&body=Please%20add%20me%20to%20the%20referral%20program.%20My%20email:%20${encodeURIComponent(email)}`;
  }

  return (
    <div className="rf-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="rf-body">
        {/* HERO */}
        <div className="rf-hero">
          <div className="rf-eyebrow">
            <span className="rf-eyebrow-dot" />
            REFERRAL PROGRAM
          </div>
          <h1 className="rf-h1">Refer 3 brokers. <span>Get RizeAI Pro free.</span></h1>
          <p className="rf-sub">
            Every broker you send who signs up for a paid plan earns you 30% of their first-year subscription — for life. Hit 3 paid referrals, we upgrade you to <b>Pro free permanently</b>.
          </p>

          <div className="rf-cta-row">
            <div className="rf-link-wrap">
              <div className="rf-link-input">
                <span className="rf-link-txt">{referralLink}</span>
                <button className="rf-copy" onClick={copyLink}>{copied ? "✓ COPIED" : "COPY LINK"}</button>
              </div>
              <div className="rf-link-note">Sign in first to get your unique tracking code</div>
            </div>
          </div>
        </div>

        {/* THE ECONOMICS */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ THE ECONOMICS</div>
          <h2 className="rf-h2">The math is deliberately generous.</h2>
          <div className="rf-econ-grid">
            <div className="rf-econ-card">
              <div className="rf-econ-num">30%</div>
              <div className="rf-econ-lbl">First-year revenue share</div>
              <div className="rf-econ-body">Every broker you refer who upgrades to Pro ($99/mo) or Scale ($299/mo) earns you 30% of their subscription revenue for 12 months. Pro referral = $356/yr. Scale referral = $1,076/yr.</div>
            </div>
            <div className="rf-econ-card">
              <div className="rf-econ-num">3 = 🔓</div>
              <div className="rf-econ-lbl">Free Pro for life</div>
              <div className="rf-econ-body">Hit 3 paid referrals in any 12-month window and we lock in your Pro tier permanently — no monthly bill, ever. Keep referring — 30% rev share still lands in your account.</div>
            </div>
            <div className="rf-econ-card">
              <div className="rf-econ-num">$0</div>
              <div className="rf-econ-lbl">Cost to your friends</div>
              <div className="rf-econ-body">Referred brokers get their first 30 days of Pro free — no credit card required. So you're not asking peers to spend money — you're giving them a month of a $99 tool.</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ HOW IT WORKS</div>
          <h2 className="rf-h2">Three steps. Zero friction.</h2>
          <div className="rf-steps">
            <div className="rf-step">
              <div className="rf-step-num">01</div>
              <div className="rf-step-h">Email us to join</div>
              <div className="rf-step-p">Send a note to <b>sunni@rizedevelopments.com</b> with the subject line <code>Referral Program</code>. We reply within 24h with your personal referral code and the peers-only pitch materials to share.</div>
            </div>
            <div className="rf-step">
              <div className="rf-step-num">02</div>
              <div className="rf-step-h">Share the code</div>
              <div className="rf-step-p">Every peer who signs up and mentions your code at checkout gets tagged manually to you. This is founder-tracked for now — the automated dashboard ships post-seed close (Year 1 roadmap).</div>
            </div>
            <div className="rf-step">
              <div className="rf-step-num">03</div>
              <div className="rf-step-h">Get paid quarterly</div>
              <div className="rf-step-p">30% rev share paid on the 1st of every quarter via e-transfer (CAD) or Stripe (USD). Statement emailed with every payment.</div>
            </div>
          </div>
        </section>

        {/* WHO SHOULD REFER */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ WHO THIS IS FOR</div>
          <h2 className="rf-h2">Perfect for you if…</h2>
          <div className="rf-who-grid">
            <div className="rf-who">
              <div className="rf-who-icon">🏢</div>
              <div className="rf-who-h">You work at a brokerage with 10+ agents</div>
              <div className="rf-who-p">Every agent who joins is a referral. Pro tier commissions add up fast at scale.</div>
            </div>
            <div className="rf-who">
              <div className="rf-who-icon">📊</div>
              <div className="rf-who-h">You run an investor group or REIT</div>
              <div className="rf-who-p">Your members already need this. 30% rev share on group signups is meaningful passive income.</div>
            </div>
            <div className="rf-who">
              <div className="rf-who-icon">🎙️</div>
              <div className="rf-who-h">You publish real estate content</div>
              <div className="rf-who-p">Podcasters, newsletter writers, LinkedIn creators — a tracked referral link that converts at 12% is a real ad unit.</div>
            </div>
            <div className="rf-who">
              <div className="rf-who-icon">🤝</div>
              <div className="rf-who-h">You're already a paying customer</div>
              <div className="rf-who-p">Every peer you send effectively covers your subscription. 3 of them and it's free forever.</div>
            </div>
          </div>
        </section>

        {/* JOIN CTA */}
        <div className="rf-join-block">
          <div className="rf-join-h">Ready to join?</div>
          <div className="rf-join-p">Sign up for RizeAI (it's free to start), grab your referral link from your dashboard, and start sending.</div>
          <div className="rf-join-row">
            <button className="rf-cta" onClick={() => navigate("/auth")}>Create account →</button>
            <button className="rf-cta ghost" onClick={() => navigate("/property")}>Try the product</button>
          </div>
        </div>

        {/* NOT A USER YET */}
        <div className="rf-secondary-block">
          <div className="rf-secondary-h">Not a broker yet? Just want early access to the program?</div>
          <form onSubmit={submitEmail} className="rf-secondary-form">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rf-input"
              required
            />
            <button type="submit" className="rf-cta">Notify me</button>
          </form>
        </div>

        {/* FINE PRINT */}
        <div className="rf-fine">
          <div className="rf-fine-h">Fine print</div>
          <ul className="rf-fine-list">
            <li>30% rev share paid on <b>subscription revenue only</b> (Pro/Scale MRR). API overages and one-off transactions excluded.</li>
            <li>Rev share paid for 12 months from the referred user's first paid month.</li>
            <li>Free-Pro-for-life locks in after 3 <b>paying</b> referrals cross 60 days of subscription (to filter refund cycles).</li>
            <li>Self-referrals, family, and same-firm colleagues under the same billing account don't qualify.</li>
            <li>RizeAI reserves the right to cancel accounts engaged in link spam, misleading promotion, or referral fraud.</li>
            <li>Program terms may adjust with 30 days notice; existing earnings honored under the terms at the time of referral.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .rf-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .rf-body { max-width: 940px; margin: 0 auto; padding: 48px 24px 80px; }

  .rf-hero { text-align: center; padding-bottom: 40px; border-bottom: 1px solid var(--borderf); margin-bottom: 40px; }
  .rf-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .rf-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .rf-h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 800; color: var(--text); letter-spacing: -1.8px; line-height: 1.05; margin: 0 0 16px; }
  .rf-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .rf-sub { font-size: 16px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto 28px; }
  .rf-sub b { color: var(--brass-2); font-weight: 800; }

  .rf-cta-row { display: flex; justify-content: center; }
  .rf-link-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; max-width: 560px; }
  .rf-link-input { display: flex; align-items: stretch; width: 100%; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; overflow: hidden; }
  .rf-link-txt { flex: 1; padding: 14px 16px; font-family: 'Geist Mono', monospace; font-size: 12.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
  .rf-copy { background: var(--brass); color: #0a1128; border: 0; padding: 0 20px; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; cursor: pointer; }
  .rf-link-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--sub); letter-spacing: 0.4px; }

  .rf-section { margin-bottom: 44px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .rf-section:last-of-type { border-bottom: none; }
  .rf-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .rf-h2 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.2; margin: 0 0 24px; }

  .rf-econ-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media(max-width:720px){ .rf-econ-grid { grid-template-columns: 1fr; } }
  .rf-econ-card { padding: 22px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 4px solid var(--brass); border-radius: 10px; }
  .rf-econ-num { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; color: var(--brass); letter-spacing: -1px; line-height: 1; margin-bottom: 6px; }
  .rf-econ-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .rf-econ-body { font-size: 13.5px; color: var(--sub); line-height: 1.6; }

  .rf-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media(max-width:720px){ .rf-steps { grid-template-columns: 1fr; } }
  .rf-step { padding: 22px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .rf-step-num { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: var(--sub); letter-spacing: -1px; margin-bottom: 6px; }
  .rf-step-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; }
  .rf-step-p { font-size: 13px; color: var(--sub); line-height: 1.6; }
  .rf-step-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 2px 5px; border-radius: 3px; font-size: 11.5px; color: var(--brass-2); }

  .rf-who-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  @media(max-width:640px){ .rf-who-grid { grid-template-columns: 1fr; } }
  .rf-who { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .rf-who-icon { font-size: 24px; margin-bottom: 8px; }
  .rf-who-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .rf-who-p { font-size: 13px; color: var(--sub); line-height: 1.55; }

  .rf-join-block { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-bottom: 24px; }
  .rf-join-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .rf-join-p { font-size: 14px; color: var(--sub); margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .rf-join-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .rf-cta { padding: 11px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .rf-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .rf-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .rf-secondary-block { padding: 20px 22px; border: 1px dashed var(--borderf); border-radius: 10px; margin-bottom: 30px; }
  .rf-secondary-h { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 12px; text-align: center; }
  .rf-secondary-form { display: flex; gap: 8px; max-width: 460px; margin: 0 auto; }
  .rf-input { flex: 1; padding: 11px 14px; border-radius: 6px; background: var(--card); border: 1px solid var(--borderf); font-size: 13.5px; font-family: 'Geist', sans-serif; color: var(--text); }
  .rf-input:focus { outline: none; border-color: var(--brass); }

  .rf-fine { padding: 22px 24px; background: var(--card2); border: 1px solid var(--borderf); border-radius: 10px; }
  .rf-fine-h { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--sub); text-transform: uppercase; margin-bottom: 10px; }
  .rf-fine-list { font-size: 12px; color: var(--sub); line-height: 1.7; padding-left: 18px; margin: 0; }
  .rf-fine-list li { margin-bottom: 5px; }
  .rf-fine-list b { color: var(--text); font-weight: 700; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
