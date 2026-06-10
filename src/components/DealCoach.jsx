import { useState, useRef, useEffect } from "react";

/**
 * DealCoach — floating chat panel that knows the current deal.
 *
 * Props:
 *   property: object with address, valuation, rent (passed to the API as context)
 *   calcs:    object with current strategy + metrics (purchasePrice, arv, irr, dscr, etc.)
 *
 * UX:
 *   - Floating button at bottom-right when collapsed
 *   - Slides up into a 420×620 panel when opened
 *   - Persona pills (Banker / Skeptic / Mentor / Advisor) at top — switches the AI's voice
 *   - Suggested prompts as starter chips
 *   - Chat history below
 *   - Input field at the bottom
 *   - All in the existing terminal aesthetic (Fira Code mono, brand tokens, sharp corners)
 */

const PERSONAS = [
  { id: null,       label: "ADVISOR", glyph: "▸", color: "var(--blue)",   hint: "Balanced read on your deal" },
  { id: "banker",   label: "BANKER",  glyph: "$", color: "var(--green)",  hint: "Conservative lender view — DSCR, LTV, stress test" },
  { id: "skeptic",  label: "SKEPTIC", glyph: "?", color: "var(--red)",    hint: "Sharp IC member trying to poke holes" },
  { id: "mentor",   label: "MENTOR",  glyph: "◆", color: "var(--purple)", hint: "Patient teacher — explains the why" },
];

const SUGGESTED = {
  null: [
    "Is this a good deal?",
    "What's the biggest risk?",
    "What would you change?",
  ],
  banker: [
    "Would you approve this loan?",
    "How does the DSCR hold up if rents drop 10%?",
    "What's my LTV ceiling?",
  ],
  skeptic: [
    "Where am I being optimistic?",
    "What could blow this up?",
    "Why is the exit cap wrong?",
  ],
  mentor: [
    "Explain the IRR like I'm new",
    "Why does DSCR matter to a lender?",
    "What should I learn from this deal?",
  ],
};

export default function DealCoach({ property = {}, calcs = {} }) {
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Auto-scroll on new message
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    // Reset history when persona changes — different voice = clean slate
    setMessages([]);
  }, [persona]);

  async function send(text) {
    const userMsg = { role: "user", content: text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          property,
          calcs,
          persona,
        }),
      });
      const data = await r.json();
      setMessages(m => [...m, { role: "assistant", content: data.content || "Couldn't get a response.", source: data.source }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}`, source: "error" }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input.trim());
  }

  const activePersona = PERSONAS.find(p => p.id === persona);

  return (
    <>
      <style>{css}</style>

      {/* Floating launch button */}
      {!open && (
        <button className="dc-fab" onClick={() => setOpen(true)} aria-label="Open deal coach">
          <span className="dc-fab-dot" />
          <span className="dc-fab-label">DEAL COACH</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="dc-panel">
          {/* Header */}
          <div className="dc-head">
            <div className="dc-head-left">
              <span className="dc-head-dot" />
              <span className="dc-head-title">[ DEAL COACH · {activePersona?.label || "ADVISOR"} ]</span>
            </div>
            <button className="dc-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {/* Persona switcher */}
          <div className="dc-personas">
            {PERSONAS.map(p => (
              <button
                key={String(p.id)}
                className={`dc-persona ${persona === p.id ? "active" : ""}`}
                style={persona === p.id ? { color: p.color, borderColor: p.color, background: `${p.color}15` } : {}}
                onClick={() => setPersona(p.id)}
                title={p.hint}
              >
                <span className="dc-persona-glyph" style={{ color: p.color }}>{p.glyph}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Persona hint */}
          <div className="dc-hint">▸ {activePersona?.hint}</div>

          {/* Messages */}
          <div className="dc-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="dc-empty">
                <div className="dc-empty-label">SUGGESTED PROMPTS</div>
                {(SUGGESTED[persona] || SUGGESTED[null]).map(s => (
                  <button key={s} className="dc-suggest" onClick={() => send(s)} disabled={loading}>
                    <span style={{ color: activePersona?.color }}>▸</span> {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`dc-msg dc-msg-${m.role}`}>
                <div className="dc-msg-author">
                  {m.role === "user" ? "YOU" : (activePersona?.label || "ADVISOR")}
                  {m.source === "rules" && <span className="dc-msg-badge">▸ FALLBACK</span>}
                  {m.source === "error" && <span className="dc-msg-badge err">▸ ERROR</span>}
                </div>
                <div className="dc-msg-body">{m.content}</div>
              </div>
            ))}

            {loading && (
              <div className="dc-msg dc-msg-assistant">
                <div className="dc-msg-author">{activePersona?.label || "ADVISOR"}</div>
                <div className="dc-msg-body dc-loading">
                  <span className="dc-dot" /><span className="dc-dot" /><span className="dc-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form className="dc-form" onSubmit={onSubmit}>
            <input
              className="dc-input"
              placeholder={loading ? "Thinking…" : `Ask the ${(activePersona?.label || "advisor").toLowerCase()}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              className="dc-send"
              type="submit"
              disabled={!input.trim() || loading}
              style={{ color: activePersona?.color, borderColor: activePersona?.color }}
            >
              ▶
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const css = `
.dc-fab{
  position:fixed; right:24px; bottom:24px; z-index:9000;
  display:flex; align-items:center; gap:10px;
  padding:12px 18px; border-radius:6px;
  background:var(--card); color:var(--text);
  border:1px solid var(--border); border-left:3px solid var(--blue);
  font-family:'Geist Mono',ui-monospace,monospace; font-size:12px; font-weight:700;
  letter-spacing:1.4px;
  box-shadow:0 14px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,158,255,0.08) inset;
  cursor:pointer; transition:transform 0.18s, border-color 0.18s, box-shadow 0.15s;
}
.dc-fab:hover{ transform:translateY(-2px); border-color:var(--blue); box-shadow:0 18px 48px rgba(59,158,255,0.35); }
.dc-fab-dot{ width:9px; height:9px; border-radius:50%; background:var(--green); box-shadow:0 0 10px var(--green); animation:dc-blink 2s infinite; }
.dc-fab-label{ font-weight:700; }

@keyframes dc-blink{ 0%,100%{opacity:1} 50%{opacity:0.35} }

.dc-panel{
  position:fixed; right:24px; bottom:24px; z-index:9000;
  width:420px; max-width:calc(100vw - 32px);
  height:640px; max-height:calc(100vh - 64px);
  background:var(--card); color:var(--text);
  border:1px solid var(--border); border-radius: 6px;
  display:flex; flex-direction:column;
  box-shadow:0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,158,255,0.06) inset;
  overflow:hidden;
  font-family:'Geist',sans-serif;
}

.dc-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px;
  background:rgba(15,23,42,0.025);
  border-bottom:1px solid var(--borderf);
}
.dc-head-left{ display:flex; align-items:center; gap:10px; }
.dc-head-dot{ width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); animation:dc-blink 2s infinite; }
.dc-head-title{ font-family:'Geist Mono',ui-monospace,monospace; font-size:11px; font-weight:700; color:var(--blue); letter-spacing:1.2px; }
.dc-close{ background:none; border:none; color:var(--sub); font-size:22px; cursor:pointer; padding:0 4px; line-height:1; }
.dc-close:hover{ color:var(--text); }

.dc-personas{
  display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;
  padding:10px 14px;
  border-bottom:1px solid var(--borderf);
  background:rgba(255,255,255,0.012);
}
.dc-persona{
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
  padding:8px 4px;
  background:transparent; color:var(--sub);
  border:1px solid var(--borderf); border-radius:4px;
  font-family:'Geist Mono',ui-monospace,monospace; font-size:9.5px; font-weight:700;
  letter-spacing:0.8px;
  cursor:pointer; transition:all 0.15s;
}
.dc-persona:hover{ color:var(--text); border-color:var(--border); }
.dc-persona-glyph{ font-size:12px; font-weight:700; }

.dc-hint{
  padding:8px 14px;
  font-family:'Geist Mono',ui-monospace,monospace; font-size:10.5px; color:var(--dim);
  letter-spacing:0.3px;
  border-bottom:1px solid var(--borderf);
  background:rgba(255,255,255,0.008);
}

.dc-messages{
  flex:1; overflow-y:auto;
  padding:14px;
  display:flex; flex-direction:column; gap:14px;
}

.dc-empty{
  display:flex; flex-direction:column; gap:8px;
  padding:8px 0;
}
.dc-empty-label{
  font-family:'Geist Mono',ui-monospace,monospace; font-size:10px; font-weight:700;
  color:var(--dim); letter-spacing:1.2px; margin-bottom:4px;
}
.dc-suggest{
  text-align:left; padding:10px 12px;
  background:rgba(15,23,42,0.025);
  border:1px solid var(--borderf); border-radius:5px;
  color:var(--text); font-family:'Geist',sans-serif; font-size:13px;
  cursor:pointer; transition:background 0.15s, border-color 0.15s;
  display:flex; align-items:center; gap:8px;
}
.dc-suggest:hover{ background:rgba(15,23,42,0.05); border-color:var(--border); }
.dc-suggest:disabled{ opacity:0.5; cursor:not-allowed; }

.dc-msg{ display:flex; flex-direction:column; gap:4px; }
.dc-msg-author{
  font-family:'Geist Mono',ui-monospace,monospace; font-size:9.5px; font-weight:700;
  color:var(--dim); letter-spacing:1.2px;
  display:flex; align-items:center; gap:8px;
}
.dc-msg-badge{
  font-family:'Geist Mono',ui-monospace,monospace; font-size:8.5px; font-weight:700;
  color:var(--amber); border:1px solid var(--amber); border-radius:2px;
  padding:1px 5px; letter-spacing:0.6px;
}
.dc-msg-badge.err{ color:var(--red); border-color:var(--red); }
.dc-msg-body{
  padding:10px 12px; border-radius:6px;
  font-family:'Geist',sans-serif; font-size:13.5px; line-height:1.55;
  color:var(--text);
}
.dc-msg-user .dc-msg-body{
  background:rgba(59,158,255,0.08);
  border:1px solid rgba(59,158,255,0.2);
  border-left:3px solid var(--blue);
}
.dc-msg-assistant .dc-msg-body{
  background:rgba(15,23,42,0.025);
  border:1px solid var(--borderf);
}

.dc-loading{ display:flex; gap:5px; align-items:center; padding:14px 12px; }
.dc-dot{
  width:6px; height:6px; border-radius:50%; background:var(--sub);
  animation:dc-pulse 1.2s infinite;
}
.dc-dot:nth-child(2){ animation-delay:0.2s; }
.dc-dot:nth-child(3){ animation-delay:0.4s; }
@keyframes dc-pulse{ 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }

.dc-form{
  display:flex; gap:6px;
  padding:10px 12px;
  border-top:1px solid var(--borderf);
  background:rgba(255,255,255,0.012);
}
.dc-input{
  flex:1; min-width:0;
  padding:10px 12px;
  background:rgba(15,23,42,0.04);
  border:1px solid var(--borderf); border-radius:5px;
  color:var(--text); font-family:'Geist',sans-serif; font-size:13.5px;
  outline:none; transition:border-color 0.15s;
}
.dc-input:focus{ border-color:var(--blue); }
.dc-input:disabled{ opacity:0.6; }
.dc-send{
  padding:0 16px;
  background:transparent;
  border:1px solid var(--blue); border-radius:5px;
  color:var(--blue); font-family:'Geist Mono',ui-monospace,monospace; font-size:14px; font-weight:700;
  cursor:pointer; transition:background 0.15s, transform 0.15s;
}
.dc-send:hover:not(:disabled){ background:rgba(59,158,255,0.1); transform:translateX(2px); }
.dc-send:disabled{ opacity:0.4; cursor:not-allowed; }

@media(max-width:600px){
  .dc-panel{
    right:0; left:0; bottom:0; width:100%; max-width:100%;
    height:100vh; max-height:100vh; border-radius:0;
  }
  .dc-fab{ right:16px; bottom:16px; }
}
@media(max-width:480px){
  .dc-personas{ grid-template-columns:repeat(2, 1fr); }
}
`;
