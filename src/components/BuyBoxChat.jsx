import { useState, useRef } from "react";

/**
 * BuyBoxChat — natural-language Buy Box builder at the top of /buybox.
 *
 * User describes their buy box in a sentence or two ("I want Calgary duplexes
 * under $900K for BRRRR"), or pastes a longer criteria doc, or drops a text
 * file. our AI via /api/ai-chat mode=parse-buybox extracts structured
 * fields and passes them back to the parent, which auto-fills the editor.
 *
 * Deliberately conversational — feels like talking to Buddy, not filling a
 * form. Uses the same brass/navy palette as the rest of /buybox.
 */
const EXAMPLES = [
  {
    label: "Calgary duplex BRRRR",
    text: "I'm looking for Calgary duplexes under $900K where I can BRRRR. Prefer R-C2 or R-CG zoning. Anything with 4+ units is a bonus.",
  },
  {
    label: "Toronto small MF",
    text: "GTA small multifamily, 4-12 units, value-add plays. Target 5.5% cap rate minimum. Willing to pay up to $2.5M for the right building.",
  },
  {
    label: "Edmonton 8-unit RS",
    text: "Edmonton RS-zone lots that can support the 8-unit multiplex under Bylaw 20001. Under $700K. Long-term hold.",
  },
];

export default function BuyBoxChat({ onExtracted }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setExtracted(null);
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "parse-buybox", text }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error || "Buddy couldn't parse that. Try describing your criteria in one or two sentences.");
        return;
      }
      setExtracted(data.extracted);
      if (typeof onExtracted === "function") onExtracted(data.extracted);
    } catch (e) {
      setError("Network hiccup. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    // Text files only for now — PDF parse is roadmap.
    if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
      const content = await file.text();
      setText((prev) => (prev ? prev + "\n\n" + content : content));
    } else {
      setError("For now Buddy reads plain text. Paste your criteria directly, or upload a .txt / .md file. PDF parsing coming.");
    }
  };

  const applyExample = (ex) => {
    setText(ex.text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="bbc-wrap">
      <style>{CSS}</style>

      <div className="bbc-head">
        <div className="bbc-eyebrow">
          <span className="bbc-eyebrow-dot" />
          BUDDY · NATURAL LANGUAGE BUY BOX
        </div>
        <h2 className="bbc-h2">Tell Buddy what you're looking for.</h2>
        <p className="bbc-sub">Describe your buy box in plain English — asset class, cities, price range, strategy. Or paste your criteria doc. Buddy extracts the structured version and fills the form below.</p>
      </div>

      <div
        className={`bbc-drop ${dragActive ? "active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <textarea
          ref={inputRef}
          className="bbc-input"
          rows={5}
          placeholder={`e.g. "Looking for Calgary duplexes under $900K for BRRRR. R-C2 or R-CG zoning preferred. 4+ units is a bonus."\n\n(paste a longer doc, drag a .txt file — anything that describes what you're buying)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          disabled={loading}
        />
        {dragActive && <div className="bbc-drop-overlay">Drop your criteria file</div>}
      </div>

      <div className="bbc-actions">
        <div className="bbc-examples">
          <span className="bbc-examples-label">▸ Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} className="bbc-example" onClick={() => applyExample(ex)} type="button">
              {ex.label}
            </button>
          ))}
        </div>
        <button
          className="bbc-submit"
          onClick={submit}
          disabled={loading || !text.trim()}
          type="button"
        >
          {loading ? "Buddy parsing…" : "Extract with Buddy →"}
        </button>
      </div>

      {error && <div className="bbc-error">⚠ {error}</div>}

      {extracted && (
        <div className="bbc-extracted">
          <div className="bbc-extracted-head">
            <span className="bbc-extracted-tag">▸ EXTRACTED CRITERIA</span>
            <span className="bbc-extracted-source">Applied to editor below</span>
          </div>
          <div className="bbc-extracted-chips">
            {extracted.name && <Chip label="Name" val={extracted.name} />}
            {extracted.assetClasses?.length > 0 && <Chip label="Asset class" val={extracted.assetClasses.join(", ")} />}
            {extracted.cities?.length > 0 && <Chip label="Cities" val={extracted.cities.join(", ")} />}
            {extracted.priceMin && <Chip label="Min price" val={`$${(extracted.priceMin/1000).toFixed(0)}K`} />}
            {extracted.priceMax && <Chip label="Max price" val={`$${(extracted.priceMax/1000).toFixed(0)}K`} />}
            {extracted.capRateMin && <Chip label="Min cap" val={`${extracted.capRateMin}%`} />}
            {extracted.unitsMin && <Chip label="Min units" val={extracted.unitsMin} />}
            {extracted.strategy && <Chip label="Strategy" val={extracted.strategy} />}
          </div>
          {extracted.notes && (
            <div className="bbc-extracted-notes">
              <b>Notes:</b> {extracted.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, val }) {
  return (
    <div className="bbc-chip">
      <div className="bbc-chip-label">{label}</div>
      <div className="bbc-chip-val">{val}</div>
    </div>
  );
}

const CSS = `
  .bbc-wrap {
    padding: 28px 28px 24px;
    background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05));
    border: 1px solid rgba(212,175,55,0.28);
    border-left: 4px solid var(--brass);
    border-radius: 12px;
    margin-bottom: 28px;
  }

  .bbc-head { margin-bottom: 18px; }
  .bbc-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Geist Mono', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
    color: var(--brass-2);
    background: rgba(212,175,55,0.10); border: 1px solid rgba(212,175,55,0.28);
    padding: 5px 10px; border-radius: 4px; margin-bottom: 12px;
  }
  .bbc-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .bbc-h2 { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin: 0 0 8px; }
  .bbc-sub { font-size: 13.5px; color: var(--sub); line-height: 1.6; max-width: 720px; margin: 0; }

  .bbc-drop { position: relative; }
  .bbc-drop.active .bbc-input { border-color: var(--brass); background: rgba(212,175,55,0.08); }
  .bbc-drop-overlay {
    position: absolute; inset: 0;
    background: rgba(212,175,55,0.10); border: 2px dashed var(--brass); border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800;
    color: var(--brass-2); letter-spacing: 0.6px; pointer-events: none;
  }
  .bbc-input {
    width: 100%; padding: 14px 16px; border-radius: 8px;
    background: #ffffff; border: 1px solid var(--borderf);
    color: var(--text); font-family: inherit; font-size: 14px; line-height: 1.6;
    outline: none; resize: vertical; transition: border-color 120ms, background 120ms;
  }
  .bbc-input:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }
  .bbc-input:disabled { opacity: 0.6; cursor: wait; }

  .bbc-actions {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    margin-top: 12px; flex-wrap: wrap;
  }
  .bbc-examples { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .bbc-examples-label {
    font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700;
    color: var(--sub); letter-spacing: 1px; text-transform: uppercase;
  }
  .bbc-example {
    padding: 5px 10px; border-radius: 4px;
    background: rgba(255,255,255,0.6); border: 1px solid var(--borderf);
    color: var(--sub); font-family: inherit; font-size: 11.5px; font-weight: 600;
    cursor: pointer; transition: all 120ms;
  }
  .bbc-example:hover { border-color: var(--brass); color: var(--brass-2); background: rgba(212,175,55,0.06); }

  .bbc-submit {
    padding: 10px 18px; border-radius: 6px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase;
    cursor: pointer; transition: transform 120ms, box-shadow 200ms;
  }
  .bbc-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px -8px rgba(212,175,55,0.5); }
  .bbc-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .bbc-error {
    margin-top: 14px; padding: 10px 14px;
    background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.20);
    border-left: 3px solid var(--red);
    border-radius: 6px;
    font-size: 12.5px; color: var(--text);
  }

  .bbc-extracted {
    margin-top: 18px; padding: 16px 18px;
    background: rgba(52,217,138,0.05); border: 1px solid rgba(52,217,138,0.24);
    border-left: 3px solid var(--green);
    border-radius: 8px;
  }
  .bbc-extracted-head {
    display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
    margin-bottom: 12px; flex-wrap: wrap;
  }
  .bbc-extracted-tag {
    font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800;
    color: var(--green); letter-spacing: 1.2px;
  }
  .bbc-extracted-source { font-size: 11.5px; color: var(--sub); font-style: italic; }
  .bbc-extracted-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .bbc-chip {
    display: flex; flex-direction: column; gap: 2px;
    padding: 6px 10px;
    background: #ffffff; border: 1px solid var(--borderf); border-radius: 5px;
  }
  .bbc-chip-label {
    font-family: 'Geist Mono', monospace; font-size: 8.5px; font-weight: 700;
    color: var(--sub); letter-spacing: 0.6px; text-transform: uppercase;
  }
  .bbc-chip-val {
    font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700;
    color: var(--text); letter-spacing: -0.2px;
  }
  .bbc-extracted-notes { margin-top: 10px; font-size: 12.5px; color: var(--sub); line-height: 1.55; }
  .bbc-extracted-notes b { color: var(--text); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
