import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";
import { RAISE, formatUSD, raisePercent, daysUntil, formatDate } from "./lib/raiseConfig";

/**
 * PitchTimeline — /pitch/timeline raise timeline + milestone gates.
 *
 * Creates the time-bound urgency VCs need to move from "interesting" to
 * "commit." Shows first-close vs final-close dates, days remaining, and
 * what each dollar tranche unlocks operationally.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchTimeline() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Raise Timeline (Confidential)",
    description: "Pre-seed timeline for RizeAI — first close, final close, and milestone gates.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_timeline_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · TIMELINE</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const daysToFirst = daysUntil(RAISE.firstCloseTarget);
  const daysToFinal = daysUntil(RAISE.finalCloseTarget);

  return (
    <div className="tl-wrap">
      <style>{CSS}</style>

      <div className="tl-topbar">
        <a href="/pitch" className="tl-logo">Real <span>Deal</span></a>
        <span className="tl-tag">▸ TIMELINE · CONFIDENTIAL</span>
        <button className="tl-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="tl-body">
        {/* HEADER */}
        <div className="tl-header">
          <div className="tl-eyebrow">
            <span className="tl-eyebrow-dot" />
            RAISE TIMELINE · {RAISE.roundType.toUpperCase()}
          </div>
          <h1 className="tl-h1">
            {RAISE.CLOSED ? "Round closed." : (
              <>Round <span>open now.</span></>
            )}
          </h1>
          <p className="tl-sub">
            {RAISE.CLOSED
              ? "The pre-seed round has closed. Series-A intros are welcome — book any time."
              : `${formatUSD(RAISE.committedUSD)} of ${formatUSD(RAISE.targetUSD)} committed · ${raisePercent()}% · ${RAISE.backers.length} backers.`}
          </p>
        </div>

        {/* KEY DATES */}
        {!RAISE.CLOSED && (
          <section className="tl-section">
            <div className="tl-section-tag">▸ KEY DATES</div>
            <div className="tl-dates-grid">
              <div className="tl-date">
                <div className="tl-date-lbl">Raise opened</div>
                <div className="tl-date-val">{formatDate(RAISE.raiseStarted)}</div>
                <div className="tl-date-note">Materials live · investor conversations underway</div>
              </div>
              <div className="tl-date brass">
                <div className="tl-date-lbl">First close target</div>
                <div className="tl-date-val">{formatDate(RAISE.firstCloseTarget)}</div>
                <div className="tl-date-note">
                  {daysToFirst != null && daysToFirst > 0 && (
                    <><b>{daysToFirst}</b> days · minimum 50% commit threshold to trigger first close</>
                  )}
                  {daysToFirst != null && daysToFirst <= 0 && (
                    <>Target reached · first close executing</>
                  )}
                </div>
              </div>
              <div className="tl-date">
                <div className="tl-date-lbl">Final close</div>
                <div className="tl-date-val">{formatDate(RAISE.finalCloseTarget)}</div>
                <div className="tl-date-note">
                  {daysToFinal != null && daysToFinal > 0 && (
                    <><b>{daysToFinal}</b> days · hard cap at 100% target</>
                  )}
                  {daysToFinal != null && daysToFinal <= 0 && (
                    <>Round closed to new capital</>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MILESTONE LADDER */}
        <section className="tl-section">
          <div className="tl-section-tag">▸ MILESTONE GATES</div>
          <h2 className="tl-h2">What each dollar tranche unlocks.</h2>
          <div className="tl-ladder">
            {RAISE.milestones.map((m, i) => {
              const reached = RAISE.committedUSD >= m.at;
              const percentOfTarget = Math.round((m.at / RAISE.targetUSD) * 100);
              return (
                <div key={i} className={`tl-rung ${reached ? "reached" : ""}`}>
                  <div className="tl-rung-marker">
                    <div className="tl-rung-dot">{reached ? "✓" : String(i + 1).padStart(2, "0")}</div>
                    {i < RAISE.milestones.length - 1 && <div className="tl-rung-line" />}
                  </div>
                  <div className="tl-rung-body">
                    <div className="tl-rung-head">
                      <span className="tl-rung-amount">{formatUSD(m.at)}</span>
                      <span className="tl-rung-pct">{percentOfTarget}% of target</span>
                    </div>
                    <div className="tl-rung-label">{m.label}</div>
                    <div className="tl-rung-desc">{m.desc}</div>
                    {reached && <div className="tl-rung-reached">✓ REACHED</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* DECISION SPEED */}
        {!RAISE.CLOSED && (
          <section className="tl-section">
            <div className="tl-section-tag">▸ DECISION VELOCITY</div>
            <h2 className="tl-h2">How fast this moves.</h2>
            <div className="tl-velocity-grid">
              <div className="tl-vel">
                <div className="tl-vel-num">1</div>
                <div className="tl-vel-lbl">Intro call</div>
                <div className="tl-vel-p">20-min conversation. Book directly on the calendar.</div>
              </div>
              <div className="tl-vel">
                <div className="tl-vel-num">2</div>
                <div className="tl-vel-lbl">Deep-dive</div>
                <div className="tl-vel-p">Model + data room + reference checks · target 5 business days end-to-end.</div>
              </div>
              <div className="tl-vel">
                <div className="tl-vel-num">3</div>
                <div className="tl-vel-lbl">Term sheet</div>
                <div className="tl-vel-p">Standard YC SAFE · no side letters · same terms as everyone else in the round.</div>
              </div>
              <div className="tl-vel">
                <div className="tl-vel-num">4</div>
                <div className="tl-vel-lbl">Wire</div>
                <div className="tl-vel-p">Sign → wire within 14 days · funds start deploying immediately.</div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        {!RAISE.CLOSED && (
          <div className="tl-cta-block">
            <div className="tl-cta-h">Serious about a check?</div>
            <div className="tl-cta-p">The calendar link below books directly to a 20-min intro. Fastest path from "interested" to "in."</div>
            <div className="tl-cta-row">
              <a href={bookingHref()} target="_blank" rel="noreferrer" className="tl-cta">{BOOKING_LABEL}</a>
              <button className="tl-cta ghost" onClick={() => navigate("/pitch/backers")}>See who's in</button>
              <button className="tl-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
  .tl-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .tl-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .tl-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .tl-logo span { color: var(--brass); }
  .tl-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .tl-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .tl-body { max-width: 1000px; margin: 0 auto; padding: 44px 24px 80px; }
  .tl-header { text-align: center; margin-bottom: 34px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .tl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .tl-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .tl-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 12px; }
  .tl-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .tl-sub { font-size: 14.5px; color: var(--sub); line-height: 1.6; max-width: 640px; margin: 0 auto; font-family: 'Geist Mono', monospace; }

  .tl-section { margin-bottom: 40px; }
  .tl-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .tl-h2 { font-size: clamp(22px, 3vw, 28px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.25; margin: 0 0 20px; }

  .tl-dates-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:720px){ .tl-dates-grid { grid-template-columns: 1fr; } }
  .tl-date { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .tl-date.brass { border-left: 4px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.05), transparent); }
  .tl-date-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; margin-bottom: 8px; }
  .tl-date-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; line-height: 1; margin-bottom: 8px; }
  .tl-date.brass .tl-date-val { color: var(--brass); }
  .tl-date-note { font-size: 12px; color: var(--sub); line-height: 1.55; }
  .tl-date-note b { color: var(--text); font-weight: 800; }

  .tl-ladder { display: flex; flex-direction: column; }
  .tl-rung { display: grid; grid-template-columns: 60px 1fr; gap: 16px; }
  .tl-rung-marker { display: flex; flex-direction: column; align-items: center; }
  .tl-rung-dot { width: 44px; height: 44px; border-radius: 50%; background: var(--card); border: 2px solid var(--borderf); display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: var(--sub); flex-shrink: 0; }
  .tl-rung.reached .tl-rung-dot { background: rgba(22,163,74,0.10); border-color: #16a34a; color: #16a34a; }
  .tl-rung-line { flex: 1; width: 2px; background: var(--borderf); margin: 4px 0; min-height: 30px; }
  .tl-rung.reached .tl-rung-line { background: rgba(22,163,74,0.4); }
  .tl-rung-body { padding: 6px 0 26px; }
  .tl-rung-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
  .tl-rung-amount { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--brass); letter-spacing: -0.5px; }
  .tl-rung-pct { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); letter-spacing: 0.4px; }
  .tl-rung-label { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .tl-rung-desc { font-size: 13px; color: var(--sub); line-height: 1.55; }
  .tl-rung-reached { display: inline-block; margin-top: 8px; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: #16a34a; letter-spacing: 1px; padding: 3px 7px; background: rgba(22,163,74,0.10); border: 1px solid rgba(22,163,74,0.30); border-radius: 3px; }

  .tl-velocity-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .tl-velocity-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .tl-velocity-grid { grid-template-columns: 1fr; } }
  .tl-vel { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .tl-vel-num { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: var(--brass); letter-spacing: -0.5px; line-height: 1; margin-bottom: 6px; }
  .tl-vel-lbl { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .tl-vel-p { font-size: 12.5px; color: var(--sub); line-height: 1.55; }

  .tl-cta-block { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-top: 32px; }
  .tl-cta-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .tl-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .tl-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .tl-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .tl-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .tl-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
