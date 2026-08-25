import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";
import { track } from "./lib/analytics";

/**
 * VoiceVerdict — mobile-first "record at the lockbox" flow.
 *
 * Broker taps the giant Record button → browser SpeechRecognition transcribes
 * in real time → Buddy parses the transcript into structured property fields
 * via /api/ai-chat mode=voice-parse-property → the fields become URL params
 * on /property so the underwriter page loads pre-populated.
 *
 * Fallback for browsers without SpeechRecognition (older iOS Safari, Firefox
 * on some platforms): text input where the broker types what they'd say.
 *
 * Design goal: usable one-handed with the phone at eye level.
 */
export default function VoiceVerdict() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Voice-to-Verdict · RizeAI",
    description: "Describe a property out loud. Buddy extracts the numbers and hands you the four-strategy verdict. Built for brokers at the lockbox.",
  });

  const [supported, setSupported] = useState(true);
  const [state, setState] = useState("idle");   // idle | recording | parsing | ready | error
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      let final = "";
      let intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else intr += t;
      }
      if (final) setTranscript(prev => prev + final);
      setInterim(intr);
    };
    rec.onend = () => {
      // Only flip state if we're still in "recording" (user might've hit Stop)
      setState(prev => prev === "recording" ? "idle" : prev);
    };
    rec.onerror = (e) => {
      console.warn("SpeechRecognition error:", e.error);
      if (e.error === "not-allowed") {
        setError("Microphone permission denied. Enable mic access in your browser settings.");
        setState("error");
      } else if (e.error === "no-speech") {
        // don't surface as error — just stop
        setState("idle");
      }
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const startRecording = () => {
    setTranscript("");
    setInterim("");
    setExtracted(null);
    setError("");
    try {
      recognitionRef.current?.start();
      setState("recording");
      track("voice_verdict_recording_start");
    } catch (e) {
      setError(e?.message || "Couldn't start recording.");
      setState("error");
    }
  };

  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setState("idle");
  };

  const parseTranscript = async () => {
    const text = transcript.trim() + (interim ? " " + interim.trim() : "");
    if (!text || text.length < 8) {
      setError("Say a bit more — Buddy needs at least a sentence.");
      setState("error");
      return;
    }
    setState("parsing");
    setError("");
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "voice-parse-property", transcript: text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Parse failed");
      setExtracted(data.extracted);
      setState("ready");
      track("voice_verdict_parse_success", {
        hasAddress: !!data.extracted?.address,
        hasPrice: !!data.extracted?.purchasePrice,
        hasUnits: !!data.extracted?.units,
      });
    } catch (e) {
      setError(e?.message || "Couldn't parse that. Try again with more detail.");
      setState("error");
    }
  };

  const openInProperty = () => {
    if (!extracted) return;
    const p = new URLSearchParams();
    if (extracted.address) {
      const full = [extracted.address, extracted.city, extracted.province].filter(Boolean).join(", ");
      p.set("addr", full);
    }
    if (extracted.purchasePrice) p.set("purchase", String(extracted.purchasePrice));
    if (extracted.sqft) p.set("sqft", String(extracted.sqft));
    if (extracted.beds) p.set("beds", String(extracted.beds));
    if (extracted.baths) p.set("baths", String(extracted.baths));
    navigate(`/property?${p.toString()}`);
  };

  const displayTranscript = (transcript + " " + interim).trim();

  return (
    <div className="vv-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="vv-body">
        <div className="vv-header">
          <div className="vv-eyebrow">
            <span className="vv-eyebrow-dot" />
            VOICE · LOCKBOX WORKFLOW
          </div>
          <h1 className="vv-h1">Speak the deal. <span>Get the verdict.</span></h1>
          <p className="vv-sub">
            Tap the button. Describe the property — address, price, sqft, beds, units, zoning. Buddy transcribes,
            extracts the numbers, and lands you on the underwriter with everything pre-filled.
          </p>
        </div>

        {/* ── Recording surface ── */}
        <div className={`vv-mic-wrap ${state}`}>
          {supported ? (
            <button
              className={`vv-mic ${state === "recording" ? "recording" : ""}`}
              onClick={state === "recording" ? stopRecording : startRecording}
              disabled={state === "parsing"}
              aria-label={state === "recording" ? "Stop recording" : "Start recording"}
            >
              <div className="vv-mic-icon">
                {state === "recording" ? "⏸" : "🎤"}
              </div>
              <div className="vv-mic-label">
                {state === "recording" ? "TAP TO STOP" : state === "parsing" ? "PARSING…" : "TAP TO SPEAK"}
              </div>
              {state === "recording" && <div className="vv-mic-pulse" />}
            </button>
          ) : (
            <div className="vv-fallback">
              <div className="vv-fallback-icon">⌨️</div>
              <div className="vv-fallback-title">Voice input isn't supported in this browser.</div>
              <div className="vv-fallback-sub">Type the deal below instead — same extraction, no mic needed.</div>
            </div>
          )}
        </div>

        {/* ── Live transcript ── */}
        {(displayTranscript || !supported) && (
          <div className="vv-transcript-wrap">
            <div className="vv-transcript-head">
              <div className="vv-transcript-label">▸ TRANSCRIPT</div>
              {supported && state === "recording" && <div className="vv-recording-tag">● REC</div>}
            </div>
            {supported ? (
              <div className="vv-transcript-text">
                {transcript}
                <span className="vv-interim">{interim}</span>
                {!displayTranscript && <span className="vv-transcript-placeholder">Buddy's listening…</span>}
              </div>
            ) : (
              <textarea
                className="vv-textarea"
                rows={5}
                placeholder="e.g. 2424 Westmount Rd NW, Calgary. Duplex, R-C2 zoning, asking 900K, 1400 sqft, 3 bed 2 bath, rents for 3200 a month."
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
            )}
          </div>
        )}

        {/* ── Extract button ── */}
        {displayTranscript && state !== "ready" && state !== "recording" && (
          <button
            className="vv-parse-btn"
            onClick={parseTranscript}
            disabled={state === "parsing"}
          >
            {state === "parsing" ? "Buddy extracting…" : "Extract fields with Buddy →"}
          </button>
        )}

        {error && <div className="vv-error">⚠ {error}</div>}

        {/* ── Extracted fields ── */}
        {extracted && (
          <div className="vv-extracted">
            <div className="vv-extracted-head">
              <div className="vv-extracted-tag">▸ EXTRACTED</div>
              <div className="vv-extracted-source">Ready for underwriter</div>
            </div>
            <div className="vv-extracted-chips">
              {extracted.address && <Chip label="Address" val={extracted.address} />}
              {extracted.city && <Chip label="City" val={extracted.city} />}
              {extracted.purchasePrice && <Chip label="Purchase" val={`$${Math.round(extracted.purchasePrice).toLocaleString()}`} />}
              {extracted.sqft && <Chip label="Sqft" val={extracted.sqft.toLocaleString()} />}
              {extracted.beds && <Chip label="Beds" val={extracted.beds} />}
              {extracted.baths && <Chip label="Baths" val={extracted.baths} />}
              {extracted.units && <Chip label="Units" val={extracted.units} />}
              {extracted.monthlyRent && <Chip label="Rent/mo" val={`$${Math.round(extracted.monthlyRent).toLocaleString()}`} />}
              {extracted.zoning && <Chip label="Zoning" val={extracted.zoning} />}
              {extracted.yearBuilt && <Chip label="Year built" val={extracted.yearBuilt} />}
            </div>
            {extracted.notes && (
              <div className="vv-extracted-notes">
                <b>Notes:</b> {extracted.notes}
              </div>
            )}
            <button className="vv-underwrite-btn" onClick={openInProperty}>
              Underwrite this →
            </button>
          </div>
        )}

        {/* ── Tips ── */}
        <div className="vv-tips">
          <div className="vv-tips-title">▸ Say something like</div>
          <ul>
            <li>"2424 Westmount Road Northwest, Calgary. R-C2 zoning. Asking nine hundred K. 1400 square feet. Three bed, two bath. Duplex potential."</li>
            <li>"1620 Bloor Street West in Toronto. Mixed use CR zoning. Asking 2.1 million. 4200 square feet, 6 units, current rents around 15K per month total."</li>
            <li>"Just walked 88 Charlton Ave West in Hamilton. D zone. 6 unit walkup. Asking 890K. Some deferred maintenance on the roof."</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, val }) {
  return (
    <div className="vv-chip">
      <div className="vv-chip-label">{label}</div>
      <div className="vv-chip-val">{val}</div>
    </div>
  );
}

const CSS = `
  .vv-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .vv-body { max-width: 640px; margin: 0 auto; padding: 32px 20px 80px; }

  .vv-header { text-align: center; margin-bottom: 32px; }
  .vv-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .vv-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .vv-h1 { font-size: clamp(24px, 4vw, 34px); font-weight: 800; color: var(--text); letter-spacing: -1.1px; line-height: 1.15; margin: 0 0 12px; }
  .vv-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .vv-sub { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin: 0; }

  /* Mic button */
  .vv-mic-wrap { display: flex; justify-content: center; margin: 40px 0 24px; position: relative; }
  .vv-mic {
    width: 200px; height: 200px; border-radius: 50%;
    background: linear-gradient(135deg, var(--brass), var(--brass-2));
    color: #0a1128; border: none;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Geist Mono', monospace; font-weight: 800;
    cursor: pointer; position: relative;
    box-shadow: 0 30px 60px -20px rgba(212,175,55,0.5), 0 0 0 6px rgba(212,175,55,0.08);
    transition: transform 160ms, box-shadow 200ms;
  }
  .vv-mic:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 40px 80px -20px rgba(212,175,55,0.6), 0 0 0 8px rgba(212,175,55,0.12); }
  .vv-mic:disabled { opacity: 0.6; cursor: wait; }
  .vv-mic-icon { font-size: 64px; line-height: 1; margin-bottom: 8px; }
  .vv-mic-label { font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; }
  .vv-mic.recording { animation: vv-mic-throb 1.4s ease-in-out infinite; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; }
  .vv-mic.recording .vv-mic-icon { color: #fff; }
  @keyframes vv-mic-throb {
    0%, 100% { box-shadow: 0 30px 60px -20px rgba(220,38,38,0.6), 0 0 0 6px rgba(220,38,38,0.10); }
    50%      { box-shadow: 0 40px 80px -20px rgba(220,38,38,0.9), 0 0 0 12px rgba(220,38,38,0.15); }
  }
  .vv-mic-pulse { position: absolute; inset: -20px; border-radius: 50%; border: 2px solid var(--red); animation: vv-pulse 1.4s ease-out infinite; pointer-events: none; }
  @keyframes vv-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.35); opacity: 0; } }

  /* Fallback for no-mic browsers */
  .vv-fallback { text-align: center; padding: 32px 20px; background: var(--card); border: 1px dashed var(--borderf); border-radius: 12px; max-width: 480px; margin: 0 auto; }
  .vv-fallback-icon { font-size: 40px; margin-bottom: 10px; }
  .vv-fallback-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .vv-fallback-sub { font-size: 13px; color: var(--sub); line-height: 1.6; }

  /* Transcript */
  .vv-transcript-wrap { background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
  .vv-transcript-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .vv-transcript-label { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: var(--brass-2); }
  .vv-recording-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--red); background: rgba(220,38,38,0.10); padding: 3px 8px; border-radius: 3px; letter-spacing: 0.4px; animation: blink 1s infinite; }
  .vv-transcript-text { font-size: 15px; color: var(--text); line-height: 1.65; min-height: 60px; font-family: 'Geist', sans-serif; }
  .vv-interim { color: var(--dim); font-style: italic; }
  .vv-transcript-placeholder { color: var(--dim); font-style: italic; }

  .vv-textarea { width: 100%; padding: 12px 14px; border-radius: 8px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); color: var(--text); font-family: inherit; font-size: 14.5px; line-height: 1.6; outline: none; resize: vertical; transition: border-color 120ms, background 120ms; }
  .vv-textarea:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }

  /* Parse button */
  .vv-parse-btn {
    width: 100%; padding: 14px 20px; border-radius: 8px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer;
    transition: transform 160ms, box-shadow 200ms;
    margin-bottom: 12px;
  }
  .vv-parse-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 32px -12px rgba(212,175,55,0.5); }
  .vv-parse-btn:disabled { opacity: 0.6; cursor: wait; }

  /* Error */
  .vv-error { padding: 12px 14px; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.20); border-left: 3px solid var(--red); border-radius: 8px; font-size: 13px; color: var(--text); margin-bottom: 12px; }

  /* Extracted */
  .vv-extracted { padding: 20px; background: rgba(52,217,138,0.04); border: 1px solid rgba(52,217,138,0.22); border-left: 3px solid var(--green); border-radius: 10px; margin-bottom: 20px; }
  .vv-extracted-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .vv-extracted-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--green); letter-spacing: 1.2px; }
  .vv-extracted-source { font-size: 11.5px; color: var(--sub); font-style: italic; }
  .vv-extracted-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .vv-chip { padding: 6px 10px; background: #fff; border: 1px solid var(--borderf); border-radius: 5px; }
  .vv-chip-label { font-family: 'Geist Mono', monospace; font-size: 8.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 2px; }
  .vv-chip-val { font-family: 'Geist Mono', monospace; font-size: 12.5px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
  .vv-extracted-notes { font-size: 12.5px; color: var(--sub); line-height: 1.55; margin-bottom: 14px; }
  .vv-extracted-notes b { color: var(--text); }
  .vv-underwrite-btn {
    width: 100%; padding: 14px 20px; border-radius: 8px;
    background: var(--green); color: #fff; border: 1px solid var(--green);
    font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer;
    transition: transform 160ms, box-shadow 200ms;
  }
  .vv-underwrite-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 32px -12px rgba(52,217,138,0.5); }

  /* Tips */
  .vv-tips { margin-top: 32px; padding: 16px 18px; background: var(--card2); border-radius: 10px; border: 1px solid var(--borderf); font-size: 12.5px; color: var(--sub); line-height: 1.6; }
  .vv-tips-title { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px; }
  .vv-tips ul { list-style: none; padding: 0; margin: 0; }
  .vv-tips li { padding: 6px 0 6px 14px; position: relative; border-bottom: 1px dashed var(--borderf); }
  .vv-tips li:last-child { border-bottom: none; }
  .vv-tips li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-family: 'Geist Mono', monospace; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }

  @media (max-width: 480px) {
    .vv-mic { width: 180px; height: 180px; }
    .vv-mic-icon { font-size: 56px; }
  }
`;
