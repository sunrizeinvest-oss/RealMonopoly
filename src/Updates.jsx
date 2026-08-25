import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";
import { INVESTOR_UPDATES } from "./data/investorUpdates";

/**
 * Updates — /updates public investor updates archive.
 *
 * Every 1st of the month, the founder ships a new update to backers. This
 * page mirrors the redacted-for-public version. Serves both as content
 * marketing AND as proof of operating discipline to prospective VCs.
 */
export default function Updates() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Investor Updates · RizeAI",
    description: "Monthly investor updates from RizeAI — metrics, wins, challenges, and asks. Public archive of what backers see.",
  });

  return (
    <div className="up-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="up-body">
        {/* HEADER */}
        <div className="up-header">
          <div className="up-eyebrow">
            <span className="up-eyebrow-dot" />
            MONTHLY INVESTOR UPDATES
          </div>
          <h1 className="up-h1">The operating cadence, <span>in public.</span></h1>
          <p className="up-sub">
            RizeAI ships a monthly investor update the 1st of every month. Backers see the full version — with numbers. This archive is the public-safe cut. If you want the backer version, <a onClick={() => navigate("/angel")} className="up-link">join the round</a>.
          </p>
        </div>

        {/* SUBSCRIBE */}
        <div className="up-subscribe">
          <div className="up-subscribe-tag">▸ FOLLOW ALONG</div>
          <div className="up-subscribe-h">Get the monthly update in your inbox.</div>
          <p className="up-subscribe-p">Public version. Same day it goes to backers. No spam — one email a month.</p>
          <form className="up-subscribe-form" onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.email.value;
            if (!email) return;
            window.location.href = `mailto:sunni@rizedevelopments.com?subject=Investor%20Updates%20subscribe&body=Please%20add%20me%20to%20the%20monthly%20investor%20updates%20list.%20Email:%20${encodeURIComponent(email)}`;
          }}>
            <input name="email" type="email" placeholder="you@example.com" className="up-subscribe-input" required />
            <button type="submit" className="up-subscribe-btn">Subscribe</button>
          </form>
        </div>

        {/* UPDATES */}
        {INVESTOR_UPDATES.map((u, i) => (
          <article key={i} className="up-update">
            <div className="up-update-head">
              <div>
                <div className="up-update-month">{u.month}</div>
                <div className="up-update-tagline">{u.tagline}</div>
              </div>
              <div className="up-update-date">{u.dateISO}</div>
            </div>

            {/* HIGHLIGHTS */}
            <section className="up-block">
              <div className="up-block-tag">▸ HIGHLIGHTS</div>
              <ul className="up-list">
                {u.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </section>

            {/* METRICS */}
            <section className="up-block">
              <div className="up-block-tag">▸ METRICS</div>
              <div className="up-metrics">
                {u.metrics.map((m, j) => (
                  <div key={j} className="up-metric">
                    <div className="up-metric-lbl">{m.label}</div>
                    <div className="up-metric-val">{m.val}</div>
                    <div className="up-metric-delta">{m.delta}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* WINS + CHALLENGES */}
            <div className="up-two-col">
              <section className="up-block up-block-win">
                <div className="up-block-tag" style={{color:"#16a34a"}}>▸ WINS</div>
                <ul className="up-list">
                  {u.wins.map((w, j) => <li key={j}>{w}</li>)}
                </ul>
              </section>
              <section className="up-block up-block-chal">
                <div className="up-block-tag" style={{color:"#dc2626"}}>▸ CHALLENGES</div>
                <ul className="up-list">
                  {u.challenges.map((c, j) => <li key={j}>{c}</li>)}
                </ul>
              </section>
            </div>

            {/* ASKS */}
            <section className="up-block up-block-ask">
              <div className="up-block-tag" style={{color:"var(--brass-2)"}}>▸ ASKS</div>
              <ul className="up-list">
                {u.asks.map((a, j) => <li key={j}>{a}</li>)}
              </ul>
            </section>

            {/* NEXT MONTH */}
            <section className="up-block up-block-next">
              <div className="up-block-tag">▸ NEXT MONTH</div>
              <p className="up-next-body">{u.nextMonth}</p>
            </section>
          </article>
        ))}

        {/* FOOTER CTA */}
        <div className="up-foot">
          <div className="up-foot-h">Want to be a backer?</div>
          <div className="up-foot-p">Angels welcome from $10K. The full backer version of these updates comes with real numbers, not redacted.</div>
          <div className="up-foot-row">
            <button className="up-cta" onClick={() => navigate("/angel")}>Angel round →</button>
            <button className="up-cta ghost" onClick={() => navigate("/pitch")}>Full pitch materials</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .up-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .up-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }

  .up-header { text-align: center; margin-bottom: 30px; padding-bottom: 24px; border-bottom: 1px solid var(--borderf); }
  .up-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .up-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .up-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .up-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .up-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }
  .up-link { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; }

  .up-subscribe { padding: 22px 24px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.24); border-radius: 10px; margin-bottom: 40px; text-align: center; }
  .up-subscribe-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .up-subscribe-h { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 6px; }
  .up-subscribe-p { font-size: 13px; color: var(--sub); line-height: 1.55; margin-bottom: 14px; }
  .up-subscribe-form { display: flex; gap: 8px; max-width: 460px; margin: 0 auto; flex-wrap: wrap; }
  .up-subscribe-input { flex: 1; min-width: 200px; padding: 11px 14px; border-radius: 6px; background: var(--card); border: 1px solid var(--borderf); font-size: 13.5px; font-family: 'Geist', sans-serif; color: var(--text); outline: none; }
  .up-subscribe-input:focus { border-color: var(--brass); }
  .up-subscribe-btn { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }

  .up-update { padding: 28px 30px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; margin-bottom: 24px; }
  .up-update-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px dashed var(--borderf); flex-wrap: wrap; }
  .up-update-month { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 4px; }
  .up-update-tagline { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.3px; }
  .up-update-date { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); letter-spacing: 0.4px; }

  .up-block { margin-bottom: 20px; }
  .up-block-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .up-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .up-list li { position: relative; padding-left: 16px; font-size: 13.5px; color: var(--text); line-height: 1.6; }
  .up-list li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-weight: 800; }

  .up-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  @media(max-width:560px){ .up-metrics { grid-template-columns: 1fr 1fr; } }
  .up-metric { padding: 12px 14px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); border-radius: 6px; text-align: center; }
  .up-metric-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.9px; text-transform: uppercase; margin-bottom: 4px; }
  .up-metric-val { font-family: 'Geist Mono', monospace; font-size: 20px; font-weight: 800; color: var(--brass); letter-spacing: -0.4px; line-height: 1; margin-bottom: 3px; }
  .up-metric-delta { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.3px; }

  .up-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
  @media(max-width:560px){ .up-two-col { grid-template-columns: 1fr; } }
  .up-block-win { padding: 14px 16px; background: rgba(22,163,74,0.04); border-left: 3px solid #16a34a; border-radius: 4px; margin: 0; }
  .up-block-chal { padding: 14px 16px; background: rgba(220,38,38,0.04); border-left: 3px solid #dc2626; border-radius: 4px; margin: 0; }
  .up-block-ask { padding: 14px 16px; background: rgba(212,175,55,0.05); border-left: 3px solid var(--brass); border-radius: 4px; }
  .up-block-next { padding: 14px 16px; background: rgba(33,85,205,0.05); border-left: 3px solid var(--royal); border-radius: 4px; }
  .up-next-body { font-size: 13.5px; color: var(--text); line-height: 1.65; margin: 0; }

  .up-foot { padding: 30px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 30px; }
  .up-foot-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .up-foot-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .up-foot-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .up-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .up-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .up-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
