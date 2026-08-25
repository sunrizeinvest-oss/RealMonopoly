import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";
import { RAISE, formatUSD, raisePercent } from "./lib/raiseConfig";

/**
 * PitchBackers — /pitch/backers public wall of committed angels + funds.
 *
 * Renders whatever is in `RAISE.backers[]` from raiseConfig.js. Empty state
 * shows the "be the first" CTA — designed so an empty wall still creates
 * intent, not the feeling of an empty room.
 *
 * Password-gated same as /pitch.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchBackers() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Committed Backers (Confidential)",
    description: "Angels and funds who have committed to the RizeAI pre-seed round.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_backers_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · BACKERS</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const isEmpty = RAISE.backers.length === 0;

  return (
    <div className="bk-wrap">
      <style>{CSS}</style>

      <div className="bk-topbar">
        <a href="/pitch" className="bk-logo">Real <span>Deal</span></a>
        <span className="bk-tag">▸ BACKERS · CONFIDENTIAL</span>
        <button className="bk-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="bk-body">
        {/* HEADER */}
        <div className="bk-header">
          <div className="bk-eyebrow">
            <span className="bk-eyebrow-dot" />
            COMMITTED BACKERS
          </div>
          <h1 className="bk-h1">
            {isEmpty ? "The wall goes up as commits land." : "The room already in."}
          </h1>
          <p className="bk-sub">
            {isEmpty
              ? "This page auto-populates as angels and funds sign SAFEs. Update in real time from raiseConfig.js."
              : `${RAISE.backers.length} committed · ${formatUSD(RAISE.committedUSD)} of ${formatUSD(RAISE.targetUSD)} · ${raisePercent()}%`}
          </p>
        </div>

        {/* PROGRESS STRIP */}
        {!RAISE.CLOSED && (
          <div className="bk-progress">
            <div className="bk-progress-head">
              <span className="bk-progress-lbl">{RAISE.roundType.toUpperCase()} PROGRESS</span>
              <span className="bk-progress-nums">
                <b>{formatUSD(RAISE.committedUSD)}</b> / {formatUSD(RAISE.targetUSD)}
              </span>
            </div>
            <div className="bk-progress-track">
              <div className="bk-progress-fill" style={{ width: `${raisePercent()}%` }} />
            </div>
          </div>
        )}

        {/* BACKERS GRID */}
        {isEmpty ? (
          <div className="bk-empty">
            <div className="bk-empty-icon">🪑</div>
            <div className="bk-empty-h">First-check spots still open.</div>
            <div className="bk-empty-p">
              This wall lights up the moment the first SAFE signs. If you want your name here — as an angel, syndicate, or fund — book below.
            </div>
            <div className="bk-empty-cta">
              <a href={bookingHref()} target="_blank" rel="noreferrer" className="bk-cta">{BOOKING_LABEL}</a>
              <button className="bk-cta ghost" onClick={() => navigate("/angel")}>Angel round terms</button>
            </div>
          </div>
        ) : (
          <div className="bk-grid">
            {RAISE.backers.map((b, i) => (
              <BackerCard key={i} b={b} />
            ))}
          </div>
        )}

        {/* CTA */}
        {!isEmpty && !RAISE.CLOSED && (
          <div className="bk-join-block">
            <div className="bk-join-h">Want to join the wall?</div>
            <div className="bk-join-p">First-check spots still open in the current close window.</div>
            <div className="bk-join-cta-row">
              <a href={bookingHref()} target="_blank" rel="noreferrer" className="bk-cta">{BOOKING_LABEL}</a>
              <button className="bk-cta ghost" onClick={() => navigate("/angel")}>Angel round terms</button>
            </div>
          </div>
        )}

        {RAISE.CLOSED && (
          <div className="bk-closed">
            <div className="bk-closed-tag">▸ ROUND CLOSED</div>
            <div className="bk-closed-h">Thanks to everyone above.</div>
            <div className="bk-closed-p">The pre-seed round is closed. Next-round intros are welcome — book any time.</div>
            <div style={{marginTop:16}}>
              <a href={bookingHref()} target="_blank" rel="noreferrer" className="bk-cta">Book anyway →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BackerCard({ b }) {
  return (
    <div className="bk-card">
      <div className="bk-card-name">{b.name}</div>
      {b.firm && <div className="bk-card-firm">{b.firm}</div>}
      {b.amount != null && (
        <div className="bk-card-amount">{formatUSD(b.amount)}</div>
      )}
      {b.amount == null && (
        <div className="bk-card-amount" style={{color:"var(--sub)"}}>Undisclosed</div>
      )}
      {b.quote && (
        <div className="bk-card-quote">"{b.quote}"</div>
      )}
      {b.url && (
        <a href={b.url} target="_blank" rel="noreferrer" className="bk-card-link">Profile →</a>
      )}
    </div>
  );
}

const CSS = `
  .bk-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .bk-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .bk-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .bk-logo span { color: var(--brass); }
  .bk-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .bk-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .bk-body { max-width: 1020px; margin: 0 auto; padding: 44px 24px 80px; }
  .bk-header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--borderf); }
  .bk-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .bk-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .bk-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .bk-sub { font-size: 14.5px; color: var(--sub); line-height: 1.6; max-width: 620px; margin: 0 auto; font-family: 'Geist Mono', monospace; }

  .bk-progress { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; margin-bottom: 32px; }
  .bk-progress-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
  .bk-progress-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--sub); letter-spacing: 1.2px; }
  .bk-progress-nums { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 700; color: var(--text); }
  .bk-progress-nums b { color: var(--brass); font-size: 18px; letter-spacing: -0.4px; }
  .bk-progress-track { position: relative; height: 10px; background: rgba(15,23,42,0.06); border-radius: 5px; overflow: hidden; border: 1px solid var(--borderf); }
  .bk-progress-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--brass), var(--brass-2)); border-radius: 5px; transition: width 0.6s cubic-bezier(0.2,0.8,0.2,1); }

  .bk-empty { padding: 48px 32px; text-align: center; background: var(--card); border: 1px dashed rgba(212,175,55,0.35); border-radius: 12px; }
  .bk-empty-icon { font-size: 56px; margin-bottom: 14px; }
  .bk-empty-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 10px; }
  .bk-empty-p { font-size: 14.5px; color: var(--sub); line-height: 1.65; max-width: 500px; margin: 0 auto 22px; }
  .bk-empty-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .bk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media(max-width:720px){ .bk-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .bk-grid { grid-template-columns: 1fr; } }

  .bk-card { padding: 22px 22px 18px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; text-align: left; }
  .bk-card-name { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 4px; }
  .bk-card-firm { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; margin-bottom: 12px; }
  .bk-card-amount { font-family: 'Geist Mono', monospace; font-size: 20px; font-weight: 800; color: var(--brass); letter-spacing: -0.5px; margin-bottom: 12px; }
  .bk-card-quote { font-size: 12.5px; color: var(--sub); line-height: 1.55; font-style: italic; margin-bottom: 10px; padding-top: 10px; border-top: 1px dashed var(--borderf); }
  .bk-card-link { display: inline-block; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); text-decoration: none; letter-spacing: 0.4px; margin-top: 4px; }
  .bk-card-link:hover { color: var(--brass-2); }

  .bk-join-block { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .bk-join-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .bk-join-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 460px; margin-left: auto; margin-right: auto; }
  .bk-join-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .bk-closed { padding: 34px 30px; background: rgba(22,163,74,0.05); border: 1px solid rgba(22,163,74,0.25); border-radius: 12px; text-align: center; margin-top: 32px; }
  .bk-closed-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: #16a34a; text-transform: uppercase; margin-bottom: 12px; }
  .bk-closed-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 8px; }
  .bk-closed-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; }

  .bk-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .bk-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .bk-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
