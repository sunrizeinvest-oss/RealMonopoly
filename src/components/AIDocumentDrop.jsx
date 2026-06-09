import { useState, useRef } from "react";

/**
 * AIDocumentDrop — drop a PDF (listing sheet, rent roll, lease, MLS export,
 * appraisal, BPO, assessment notice) and Claude Sonnet 4.6 reads it back as
 * structured deal data ready to apply to the calculator.
 *
 * Props:
 *   target?:    "residential" | "multifamily"  — biases the extraction schema
 *   onApply:    ({field, value}) => void       — fires for each field the user clicks "Apply"
 *   maxSizeMB?: number  default 3              — keep below Vercel's 4.5MB body limit
 */

const FIELD_LABELS = {
  address:        { label: "Address",            kind: "text" },
  city:           { label: "City / Region",      kind: "text" },
  purchasePrice:  { label: "Purchase Price",     kind: "currency" },
  appraisedValue: { label: "Appraised Value",    kind: "currency" },
  arv:            { label: "ARV (After-Repair)", kind: "currency" },
  repairCosts:    { label: "Repair Budget",      kind: "currency" },
  monthlyRent:    { label: "Monthly Rent",       kind: "currency" },
  propertyTaxes:  { label: "Annual Taxes",       kind: "currency" },
  unitCount:      { label: "Units",              kind: "int"      },
  bedrooms:       { label: "Bedrooms",           kind: "num"      },
  bathrooms:      { label: "Bathrooms",          kind: "num"      },
  sqft:           { label: "Sq Ft",              kind: "int"      },
  yearBuilt:      { label: "Year Built",         kind: "int"      },
};

const fmtCurrency = n => n != null ? `$${Math.round(Number(n)).toLocaleString()}` : "—";
const fmtVal = (kind, v) => {
  if (v == null || v === "") return "—";
  if (kind === "currency") return fmtCurrency(v);
  if (kind === "int")      return String(Math.round(Number(v)));
  return String(v);
};

export default function AIDocumentDrop({ target = "residential", onApply, maxSizeMB = 3 }) {
  const [file, setFile]         = useState(null);
  const [stage, setStage]       = useState("idle"); // "idle" | "uploading" | "parsing" | "done" | "error"
  const [error, setError]       = useState(null);
  const [extracted, setExtract] = useState(null);
  const [applied, setApplied]   = useState({});      // {field: true}
  const inputRef = useRef(null);

  function handleFile(f) {
    setError(null);
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File is ${(f.size/1024/1024).toFixed(1)}MB — max ${maxSizeMB}MB. PDFs over the limit need to be split first.`);
      return;
    }
    if (!/pdf|image\/(png|jpeg)/.test(f.type)) {
      setError("Only PDF, PNG, or JPG files supported.");
      return;
    }
    setFile(f);
    setExtract(null);
    setApplied({});
    setStage("idle");
  }

  async function parse() {
    if (!file) return;
    setStage("uploading");
    setError(null);

    const arrayBuffer = await file.arrayBuffer();
    // Convert to base64 — avoid stack overflow on large files
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 32768;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const b64 = btoa(binary);

    setStage("parsing");
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "parse-document",
          document: b64,
          mediaType: file.type,
          target,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Parse failed (${r.status})`);
      }
      const j = await r.json();
      setExtract(j.extracted || {});
      setStage("done");
    } catch (e) {
      setError(e.message || "Parsing failed.");
      setStage("error");
    }
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }
  function onDragOver(e) { e.preventDefault(); e.stopPropagation(); }

  function applyField(field) {
    if (!extracted) return;
    const v = extracted[field];
    if (v == null) return;
    onApply?.({ field, value: v });
    setApplied(a => ({ ...a, [field]: true }));
  }
  function applyAll() {
    if (!extracted) return;
    Object.keys(FIELD_LABELS).forEach(f => {
      if (extracted[f] != null) applyField(f);
    });
  }

  const fieldsWithData = extracted
    ? Object.keys(FIELD_LABELS).filter(f => extracted[f] != null)
    : [];

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--borderf)",
      borderLeft: "3px solid var(--purple)", borderRadius: 6,
      padding: 14, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
          color: "var(--purple)", letterSpacing: "1.4px",
        }}>
          ▸ AI DOCUMENT DROP
        </div>
        <div style={{
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 600,
          color: "var(--dim)", letterSpacing: "0.6px",
        }}>
          · CLAUDE SONNET 4.6 · {target.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.55, marginBottom: 12 }}>
        Drop a listing sheet, rent roll, lease, appraisal, or MLS export — AI extracts every number and fills the calculator. Saves 5-10 minutes of typing per deal.
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => inputRef.current?.click()}
          style={{
            border: "2px dashed rgba(167,130,255,0.35)",
            borderRadius: 6,
            padding: "26px 18px",
            textAlign: "center",
            cursor: "pointer",
            background: "rgba(167,130,255,0.03)",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(167,130,255,0.08)"; e.currentTarget.style.borderColor = "rgba(167,130,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(167,130,255,0.03)"; e.currentTarget.style.borderColor = "rgba(167,130,255,0.35)"; }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700,
            color: "var(--text)", marginBottom: 4,
          }}>
            Drop a PDF here or click to upload
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dim)" }}>
            PDF, PNG, JPG · max {maxSizeMB}MB
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* File picked but not parsed yet */}
      {file && stage === "idle" && (
        <div style={{
          background: "var(--card2)", border: "1px solid var(--borderf)",
          borderRadius: 5, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, color: "var(--dim)" }}>
              {(file.size / 1024).toFixed(0)} KB · {file.type || "unknown"}
            </div>
          </div>
          <button onClick={() => { setFile(null); setExtract(null); setApplied({}); }} style={{
            background: "transparent", border: "1px solid var(--borderf)",
            borderRadius: 4, padding: "6px 10px", cursor: "pointer",
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10,
            color: "var(--sub)", letterSpacing: "0.8px",
          }}>CLEAR</button>
          <button onClick={parse} style={{
            background: "var(--purple)", border: "none", color: "#07090f",
            borderRadius: 4, padding: "8px 16px", cursor: "pointer",
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
            letterSpacing: "1px",
          }}>▶ PARSE WITH AI</button>
        </div>
      )}

      {/* Parsing in progress */}
      {(stage === "uploading" || stage === "parsing") && (
        <div style={{
          background: "rgba(167,130,255,0.05)",
          border: "1px solid rgba(167,130,255,0.2)",
          borderRadius: 5, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "2px solid rgba(167,130,255,0.2)",
            borderTopColor: "var(--purple)",
            animation: "rde-spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes rde-spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
              {stage === "uploading" ? "Reading document…" : "Claude is extracting the numbers…"}
            </div>
            <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>
              Typical parse takes 10-20 seconds for a single-page listing, longer for rent rolls or appraisals.
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: file ? 8 : 0,
          padding: "10px 12px",
          background: "rgba(242,92,92,0.08)",
          border: "1px solid rgba(242,92,92,0.3)",
          borderLeft: "3px solid var(--red)",
          borderRadius: 4,
          fontSize: 12.5, color: "var(--red)", lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Extracted results */}
      {stage === "done" && extracted && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 10,
            marginBottom: 10, flexWrap: "wrap",
          }}>
            <div style={{
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
              color: "var(--green)", letterSpacing: "1.2px",
            }}>
              ✓ EXTRACTED · {fieldsWithData.length} FIELDS
            </div>
            {fieldsWithData.length > 0 && (
              <button onClick={applyAll} style={{
                marginLeft: "auto",
                background: "var(--green)", border: "none", color: "#07090f",
                borderRadius: 4, padding: "6px 12px", cursor: "pointer",
                fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
                letterSpacing: "1px",
              }}>▶ APPLY ALL TO CALCULATOR</button>
            )}
          </div>

          {fieldsWithData.length === 0 ? (
            <div style={{ padding: "10px 12px", background: "rgba(240,160,48,0.05)", border: "1px solid rgba(240,160,48,0.25)", borderLeft: "3px solid var(--amber)", borderRadius: 4, fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>
              <strong>No fields recognised.</strong> The document may not contain financial data, or it may be image-heavy / handwritten. Try a different page or upload as a higher-resolution scan.
            </div>
          ) : (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 6,
            }}>
              {fieldsWithData.map(field => {
                const meta = FIELD_LABELS[field];
                const v = extracted[field];
                const isApplied = applied[field];
                return (
                  <div key={field} style={{
                    background: isApplied ? "rgba(52,217,138,0.06)" : "var(--card2)",
                    border: `1px solid ${isApplied ? "rgba(52,217,138,0.3)" : "var(--borderf)"}`,
                    borderRadius: 5,
                    padding: "9px 12px",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px" }}>
                        {meta.label.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fmtVal(meta.kind, v)}
                      </div>
                    </div>
                    <button
                      onClick={() => applyField(field)}
                      disabled={isApplied}
                      style={{
                        background: isApplied ? "transparent" : "rgba(52,217,138,0.12)",
                        border: `1px solid ${isApplied ? "rgba(52,217,138,0.4)" : "rgba(52,217,138,0.3)"}`,
                        borderRadius: 3,
                        padding: "4px 9px",
                        cursor: isApplied ? "default" : "pointer",
                        fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 700,
                        color: "var(--green)", letterSpacing: "0.6px",
                      }}
                    >
                      {isApplied ? "✓ APPLIED" : "APPLY"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {extracted.notes && (
            <div style={{
              marginTop: 10, padding: "10px 12px",
              background: "rgba(167,130,255,0.05)",
              border: "1px solid rgba(167,130,255,0.2)",
              borderRadius: 4, fontSize: 12, color: "var(--sub)", lineHeight: 1.55,
            }}>
              <span style={{ fontWeight: 700, color: "var(--purple)" }}>▸ AI NOTE:</span> {extracted.notes}
            </div>
          )}

          <button onClick={() => { setFile(null); setExtract(null); setApplied({}); setStage("idle"); }} style={{
            marginTop: 10, background: "transparent", border: "1px solid var(--borderf)",
            borderRadius: 4, padding: "6px 12px", cursor: "pointer",
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10,
            color: "var(--sub)", letterSpacing: "0.8px",
          }}>
            ↑ UPLOAD ANOTHER
          </button>
        </div>
      )}
    </div>
  );
}
