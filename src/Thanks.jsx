import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * Thanks — /thanks post-booking confirmation page.
 *
 * Set your Cal.com/Calendly redirect URL to /thanks?source=cal after a slot
 * is booked. This page confirms the meeting, sets expectations, and hands
 * off to next-step raise materials while conversion intent is high.
 *
 * Optional param: ?source=cal — fires a distinct analytics event so you can
 * measure booking-to-thanks conversion rate.
 */
export default function Thanks() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useDocMeta({
    title: "Thanks · RizeAI — Meeting booked",
    description: "Thanks for booking a call with RizeAI. Here's what happens next.",
  });

  useEffect(() => {
    const source = params.get("source") || "unknown";
    track("thanks_view", { source });
  }, [params]);

  return (
    <div className="th-wrap">
      <style>{CSS}</style>

      <div className="th-body">
        {/* CHECKMARK HERO */}
        <div className="th-hero">
          <div className="th-check-outer">
            <div className="th-check">✓</div>
          </div>
          <div className="th-eyebrow">
            <span className="th-eyebrow-dot" />
            MEETING BOOKED
          </div>
          <h1 className="th-h1">You're on the calendar.</h1>
          <p className="th-sub">
            Confirmation email lands in your inbox in a few seconds. Meeting details include a video link and a 5-minute prep note.
          </p>
        </div>

        {/* WHAT HAPPENS NEXT */}
        <section className="th-section">
          <div className="th-section-tag">▸ WHAT HAPPENS NEXT</div>
          <div className="th-steps">
            <div className="th-step">
              <div className="th-step-num">01</div>
              <div className="th-step-body">
                <div className="th-step-h">Confirmation email</div>
                <div className="th-step-p">Arrives within 2 minutes. Contains the calendar invite + a 5-min prep note with the 3 things worth reviewing before the call.</div>
              </div>
            </div>
            <div className="th-step">
              <div className="th-step-num">02</div>
              <div className="th-step-body">
                <div className="th-step-h">Pre-call prep (5 min)</div>
                <div className="th-step-p">
                  Optional — but worth it. Skim <a onClick={() => navigate("/pitch/deck")} className="th-inline">the deck</a>, glance at <a onClick={() => navigate("/pitch/unit-economics")} className="th-inline">the unit economics</a>, and think about the 2-3 questions that would move you from "interesting" to "in."
                </div>
              </div>
            </div>
            <div className="th-step">
              <div className="th-step-num">03</div>
              <div className="th-step-body">
                <div className="th-step-h">The call · 20 minutes</div>
                <div className="th-step-p">Fast and specific. Product demo (3 min) → your questions (12 min) → next steps + follow-up materials (5 min). No slides unless you ask for them.</div>
              </div>
            </div>
            <div className="th-step">
              <div className="th-step-num">04</div>
              <div className="th-step-body">
                <div className="th-step-h">Post-call · same day</div>
                <div className="th-step-p">Notes + agreed materials (financial model, data room access, references) hit your inbox within 6 hours of the call. Fast turnaround is the point.</div>
              </div>
            </div>
          </div>
        </section>

        {/* PREP LINKS */}
        <section className="th-section">
          <div className="th-section-tag">▸ PREP MATERIALS (OPTIONAL)</div>
          <div className="th-prep-grid">
            <PrepCard
              onClick={() => navigate("/pitch")}
              title="Pitch overview"
              desc="Full deck flavored as a page · 5 min read"
              icon="📊"
            />
            <PrepCard
              onClick={() => navigate("/pitch/deck")}
              title="Slide deck"
              desc="12 slides · keyboard nav · 3 min read"
              icon="🎬"
            />
            <PrepCard
              onClick={() => navigate("/pitch/unit-economics")}
              title="Unit economics"
              desc="CAC/LTV/margin/burn deep-dive"
              icon="📈"
            />
            <PrepCard
              onClick={() => navigate("/pitch/why-now")}
              title="Why now"
              desc="5-force macro thesis · 2026 window"
              icon="⏰"
            />
            <PrepCard
              onClick={() => navigate("/pitch/comparables")}
              title="Exit comps"
              desc="PropTech / vertical SaaS multiples"
              icon="🎯"
            />
            <PrepCard
              onClick={() => navigate("/pitch/faq")}
              title="FAQ"
              desc="Answers to the 15 most-asked VC questions"
              icon="💬"
            />
            <PrepCard
              onClick={() => navigate("/pitch/data-room")}
              title="Data room"
              desc="Index of everything available on request"
              icon="🗄️"
            />
            <PrepCard
              onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}
              title="Try the product"
              desc="Live verdict on a Calgary R-CG lot · 3 sec"
              icon="⚡"
            />
          </div>
        </section>

        {/* FALLBACK */}
        <div className="th-fallback">
          <div className="th-fallback-h">Didn't get the confirmation email?</div>
          <p className="th-fallback-p">Check spam. Still nothing? Email <a href="mailto:sunni@rizedevelopments.com?subject=Meeting%20confirmation%20-%20not%20received">sunni@rizedevelopments.com</a> and we'll rebook manually.</p>
        </div>

        {/* CTAS */}
        <div className="th-cta-block">
          <div className="th-cta-h">While you wait for the call.</div>
          <div className="th-cta-row">
            <button className="th-cta" onClick={() => navigate("/live")}>See live metrics</button>
            <button className="th-cta ghost" onClick={() => navigate("/updates")}>Read the monthly update</button>
            <button className="th-cta ghost" onClick={() => navigate("/story")}>Read the story</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrepCard({ title, desc, icon, onClick }) {
  return (
    <button className="th-prep" onClick={onClick}>
      <div className="th-prep-icon">{icon}</div>
      <div className="th-prep-body">
        <div className="th-prep-title">{title} →</div>
        <div className="th-prep-desc">{desc}</div>
      </div>
    </button>
  );
}

const CSS = `
  .th-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .th-body { max-width: 880px; margin: 0 auto; padding: 60px 24px 80px; }

  .th-hero { text-align: center; margin-bottom: 48px; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .th-check-outer { display: inline-flex; align-items: center; justify-content: center; width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05)); border: 2px solid #16a34a; margin-bottom: 20px; animation: th-pulse 2.4s infinite; }
  .th-check { font-family: 'Geist', sans-serif; font-size: 42px; font-weight: 800; color: #16a34a; line-height: 1; }
  .th-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .th-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 8px #16a34a; }
  .th-h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 800; color: var(--text); letter-spacing: -1.8px; line-height: 1.1; margin: 0 0 14px; }
  .th-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 540px; margin: 0 auto; }

  .th-section { margin-bottom: 36px; }
  .th-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 14px; text-transform: uppercase; }
  .th-inline { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; }

  .th-steps { display: flex; flex-direction: column; gap: 10px; }
  .th-step { display: grid; grid-template-columns: 60px 1fr; gap: 14px; padding: 16px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .th-step-num { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--brass); letter-spacing: -0.8px; line-height: 1; }
  .th-step-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .th-step-p { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .th-prep-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media(max-width:780px){ .th-prep-grid { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .th-prep-grid { grid-template-columns: 1fr; } }
  .th-prep { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; cursor: pointer; text-align: left; font-family: 'Geist', sans-serif; }
  .th-prep:hover { border-color: var(--brass); background: rgba(212,175,55,0.05); }
  .th-prep-icon { font-size: 22px; }
  .th-prep-title { font-size: 12.5px; font-weight: 800; color: var(--brass-2); letter-spacing: -0.2px; margin-bottom: 2px; }
  .th-prep-desc { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--sub); letter-spacing: 0.2px; line-height: 1.3; }

  .th-fallback { padding: 16px 20px; background: rgba(15,23,42,0.03); border: 1px dashed var(--borderf); border-radius: 8px; margin: 24px 0; text-align: center; }
  .th-fallback-h { font-size: 13.5px; font-weight: 800; color: var(--text); margin-bottom: 4px; letter-spacing: -0.2px; }
  .th-fallback-p { font-size: 12.5px; color: var(--sub); margin: 0; line-height: 1.55; }
  .th-fallback-p a { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  .th-cta-block { padding: 26px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.24); border-radius: 12px; text-align: center; }
  .th-cta-h { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 14px; }
  .th-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .th-cta { padding: 10px 18px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .th-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .th-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes th-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22,163,74,0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(22,163,74,0); } }
`;
