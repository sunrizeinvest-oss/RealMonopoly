import { useEffect, useRef, useState } from "react";

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

// Concurrency cap for parallel parse calls. Each parse-document call is
// heavy (~10-30 sec Claude vision pass); 2 in flight is a safe ceiling
// before we'd risk hitting Anthropic rate limits on small org accounts.
const PARSE_CONCURRENCY = 2;
const MAX_QUEUE = 8;

// Per-file shape: { id, file, name, size, type, stage, extracted, error, applied }
let __fileIdCounter = 0;
const nextFileId = () => `f_${++__fileIdCounter}_${Date.now().toString(36)}`;

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const CHUNK = 32768;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export default function AIDocumentDrop({ target = "residential", onApply, maxSizeMB = 3 }) {
  // Queue of files being / about to be parsed. Each row is independent.
  const [files, setFiles]       = useState([]);
  // Top-level dropzone error (validation feedback for the most recent add).
  const [pickError, setPickError] = useState(null);
  // Active parse count — drives the concurrency-limited worker loop.
  const inputRef = useRef(null);
  const activeRef = useRef(0);

  function validateFile(f) {
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `${f.name}: ${(f.size/1024/1024).toFixed(1)}MB — max ${maxSizeMB}MB. Split larger PDFs first.`;
    }
    if (!/pdf|image\/(png|jpeg)/.test(f.type)) {
      return `${f.name}: only PDF, PNG, or JPG supported.`;
    }
    return null;
  }

  // Add one or more files to the queue. Each gets a per-row record.
  function addFiles(fileList) {
    setPickError(null);
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const errors = [];
    const accepted = [];
    for (const f of incoming) {
      const e = validateFile(f);
      if (e) { errors.push(e); continue; }
      accepted.push(f);
    }
    if (errors.length) setPickError(errors.join("  ·  "));
    if (!accepted.length) return;

    setFiles(curr => {
      const room = MAX_QUEUE - curr.length;
      if (room <= 0) {
        setPickError(`Queue full (max ${MAX_QUEUE} files). Clear some before adding more.`);
        return curr;
      }
      const slice = accepted.slice(0, room);
      if (slice.length < accepted.length) {
        setPickError(`Queue cap hit — accepted ${slice.length} of ${accepted.length}.`);
      }
      return [
        ...curr,
        ...slice.map(f => ({
          id: nextFileId(),
          file: f,
          name: f.name,
          size: f.size,
          type: f.type,
          stage: "queued",
          extracted: null,
          error: null,
          applied: {},
        })),
      ];
    });
  }

  // Parse a single queued file. Mutates the row's stage as it progresses.
  async function parseOne(id) {
    setFiles(curr => curr.map(r => r.id === id ? { ...r, stage: "uploading", error: null } : r));
    let row;
    setFiles(curr => { row = curr.find(r => r.id === id); return curr; });
    // Wait one tick so React commits — then grab the real file ref
    await Promise.resolve();
    const target_row = files.find(r => r.id === id);
    const file = (target_row || row)?.file;
    if (!file) {
      setFiles(curr => curr.map(r => r.id === id ? { ...r, stage: "error", error: "File ref lost" } : r));
      return;
    }

    try {
      const b64 = await fileToBase64(file);
      setFiles(curr => curr.map(r => r.id === id ? { ...r, stage: "parsing" } : r));

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
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Parse failed (${r.status})`);
      setFiles(curr => curr.map(rr => rr.id === id ? {
        ...rr, stage: "done", extracted: j.extracted || {}, error: null,
      } : rr));
    } catch (e) {
      setFiles(curr => curr.map(rr => rr.id === id ? {
        ...rr, stage: "error", error: e.message || "Parsing failed",
      } : rr));
    }
  }

  // Worker loop: at most PARSE_CONCURRENCY active parses at once. Picks the
  // oldest "queued" row, runs it, repeats. Runs whenever queue + slots permit.
  useEffect(() => {
    const queued = files.filter(r => r.stage === "queued");
    if (!queued.length) return;
    const room = PARSE_CONCURRENCY - activeRef.current;
    if (room <= 0) return;
    queued.slice(0, room).forEach(r => {
      activeRef.current++;
      parseOne(r.id).finally(() => { activeRef.current--; });
    });
  }, [files]);

  function removeFile(id) {
    setFiles(curr => curr.filter(r => r.id !== id));
  }
  function clearAll() {
    setFiles([]);
    setPickError(null);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    addFiles(e.dataTransfer?.files);
  }
  function onDragOver(e) { e.preventDefault(); e.stopPropagation(); }

  // Apply a field from a specific file's extracted result up to the parent.
  function applyField(rowId, field) {
    const row = files.find(r => r.id === rowId);
    if (!row?.extracted) return;
    const v = row.extracted[field];
    if (v == null) return;
    onApply?.({ field, value: v });
    setFiles(curr => curr.map(r => r.id === rowId ? { ...r, applied: { ...r.applied, [field]: true } } : r));
  }
  function applyAllFromRow(rowId) {
    const row = files.find(r => r.id === rowId);
    if (!row?.extracted) return;
    Object.keys(FIELD_LABELS).forEach(f => {
      if (row.extracted[f] != null) applyField(rowId, f);
    });
  }

  // "Apply all from all docs" — takes the FIRST non-null value across every
  // parsed row for each field. Later rows don't overwrite earlier values.
  // Useful when multiple docs cover overlapping fields (e.g. appraisal + MLS).
  function applyAllFromAllRows() {
    const taken = {};
    for (const row of files) {
      if (row.stage !== "done" || !row.extracted) continue;
      for (const f of Object.keys(FIELD_LABELS)) {
        if (taken[f]) continue;
        const v = row.extracted[f];
        if (v == null) continue;
        onApply?.({ field: f, value: v });
        taken[f] = row.id;
      }
    }
    if (Object.keys(taken).length) {
      setFiles(curr => curr.map(row => {
        const fieldsForThisRow = Object.entries(taken).filter(([, id]) => id === row.id).map(([f]) => f);
        if (!fieldsForThisRow.length) return row;
        const nextApplied = { ...row.applied };
        fieldsForThisRow.forEach(f => { nextApplied[f] = true; });
        return { ...row, applied: nextApplied };
      }));
    }
  }

  // Apply a single rent roll (one file) to the unit mix.
  function applyRentRoll(rowId) {
    const row = files.find(r => r.id === rowId);
    if (!row?.extracted?.units?.length) return;
    onApply?.({ field: "units", value: row.extracted.units });
    setFiles(curr => curr.map(r => r.id === rowId ? { ...r, applied: { ...r.applied, units: true } } : r));
  }

  // Combine rent rolls from MULTIPLE parsed files into one merged unit array.
  // Same-type rows aggregate counts; averages currentRent / marketRent when
  // both rows have them. Aggregator is opt-in — only fires when user clicks.
  const rowsWithUnits = files.filter(r => r.stage === "done" && Array.isArray(r.extracted?.units) && r.extracted.units.length);
  function combineRentRolls() {
    if (rowsWithUnits.length < 2) return;
    const merged = new Map();  // key: type string → accumulated row
    for (const row of rowsWithUnits) {
      for (const u of row.extracted.units) {
        const key = (u.type || "Unit").trim().toLowerCase();
        const prev = merged.get(key);
        const count = Number(u.count) || 0;
        const cur = Number(u.currentRent) || 0;
        const mkt = Number(u.marketRent) || cur || 0;
        const sqft = Number(u.sqft) || 0;
        if (!prev) {
          merged.set(key, { type: u.type || "Unit", count, sqft, currentRent: cur, marketRent: mkt, _wcur: count, _wmkt: count });
        } else {
          // Count-weighted average of rent + sqft
          const totalCount = prev.count + count;
          prev.sqft       = totalCount ? (prev.sqft * prev.count + sqft * count) / totalCount : prev.sqft;
          prev.currentRent= totalCount ? (prev.currentRent * prev.count + cur * count) / totalCount : prev.currentRent;
          prev.marketRent = totalCount ? (prev.marketRent * prev.count + mkt * count) / totalCount : prev.marketRent;
          prev.count      = totalCount;
        }
      }
    }
    const out = Array.from(merged.values()).map(u => ({
      type: u.type,
      count: Math.round(u.count),
      sqft: Math.round(u.sqft) || null,
      currentRent: Math.round(u.currentRent) || null,
      marketRent: Math.round(u.marketRent) || null,
    }));
    onApply?.({ field: "units", value: out });
    // Mark every contributor's units cell as applied so the UI reflects state.
    setFiles(curr => curr.map(r =>
      rowsWithUnits.some(x => x.id === r.id)
        ? { ...r, applied: { ...r.applied, units: true } }
        : r
    ));
  }

  const doneCount = files.filter(r => r.stage === "done").length;
  const parsingCount = files.filter(r => r.stage === "parsing" || r.stage === "uploading").length;
  const errorCount = files.filter(r => r.stage === "error").length;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--borderf)",
      borderLeft: "3px solid var(--purple)", borderRadius: 6,
      padding: 14, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
          color: "var(--purple)", letterSpacing: "1.4px",
        }}>
          ▸ AI DOCUMENT DROP
        </div>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 600,
          color: "var(--dim)", letterSpacing: "0.6px",
        }}>
          · CLAUDE SONNET 4.6 · {target.toUpperCase()} · MULTI-FILE
        </div>
        {files.length > 0 && (
          <div style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10,
            color: "var(--sub)", fontWeight: 600,
          }}>
            <span>{doneCount} done</span>
            {parsingCount > 0 && <span style={{ color: "var(--purple)" }}>· {parsingCount} parsing</span>}
            {errorCount > 0 && <span style={{ color: "var(--red)" }}>· {errorCount} failed</span>}
            <button onClick={clearAll} style={{
              background: "transparent", border: "1px solid var(--borderf)",
              borderRadius: 3, padding: "3px 9px", cursor: "pointer",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700,
              color: "var(--sub)", letterSpacing: "0.8px",
            }}>CLEAR ALL</button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.55, marginBottom: 12 }}>
        Drop one or many PDFs — listing sheet, rent roll, lease, appraisal, MLS export.
        AI extracts every number across the batch and fills the calculator. Up to {MAX_QUEUE} files per run; {PARSE_CONCURRENCY} parse in parallel.
      </div>

      {/* Drop zone — always available until queue cap is hit */}
      {files.length < MAX_QUEUE && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => inputRef.current?.click()}
          style={{
            border: "2px dashed rgba(167,130,255,0.35)",
            borderRadius: 6,
            padding: files.length === 0 ? "26px 18px" : "16px 18px",
            textAlign: "center",
            cursor: "pointer",
            background: "rgba(167,130,255,0.03)",
            transition: "background 0.15s, border-color 0.15s",
            marginBottom: files.length > 0 ? 10 : 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(167,130,255,0.08)"; e.currentTarget.style.borderColor = "rgba(167,130,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(167,130,255,0.03)"; e.currentTarget.style.borderColor = "rgba(167,130,255,0.35)"; }}
        >
          {files.length === 0 && <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>}
          <div style={{
            fontFamily: "'Geist',sans-serif", fontSize: files.length === 0 ? 14 : 12.5, fontWeight: 700,
            color: "var(--text)", marginBottom: 4,
          }}>
            {files.length === 0 ? "Drop one or many PDFs here" : `+ Add more files (${MAX_QUEUE - files.length} slot${MAX_QUEUE - files.length === 1 ? "" : "s"} left)`}
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>
            PDF, PNG, JPG · max {maxSizeMB}MB each
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Pick-time errors */}
      {pickError && (
        <div style={{
          padding: "10px 12px", marginBottom: 10,
          background: "rgba(242,92,92,0.08)",
          border: "1px solid rgba(242,92,92,0.3)",
          borderLeft: "3px solid var(--red)",
          borderRadius: 4,
          fontSize: 12.5, color: "var(--red)", lineHeight: 1.5,
        }}>{pickError}</div>
      )}

      {/* Aggregate action bar — only when 2+ rows are done */}
      {doneCount >= 2 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "10px 14px", marginBottom: 12,
          background: "rgba(52,217,138,0.05)",
          border: "1px solid rgba(52,217,138,0.3)",
          borderLeft: "3px solid var(--green)",
          borderRadius: 5,
        }}>
          <span style={{
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
            color: "var(--green)", letterSpacing: "1.2px",
          }}>▸ BATCH ACTIONS · {doneCount} DOCS PARSED</span>
          <button onClick={applyAllFromAllRows} style={{
            background: "var(--green)", border: "none", color: "#07090f",
            borderRadius: 4, padding: "6px 12px", cursor: "pointer",
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.9px",
          }}>▶ APPLY ALL FROM ALL DOCS</button>
          {rowsWithUnits.length >= 2 && (
            <button onClick={combineRentRolls} title="Aggregates units from every rent roll into one unit mix; same-type rows combine counts and use count-weighted average rent." style={{
              background: "var(--amber)", border: "none", color: "#07090f",
              borderRadius: 4, padding: "6px 12px", cursor: "pointer",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.9px",
            }}>⌖ COMBINE {rowsWithUnits.length} RENT ROLLS</button>
          )}
          <span style={{ fontSize: 11, color: "var(--sub)", flexBasis: "100%", lineHeight: 1.4 }}>
            "Apply all from all docs" takes the first non-null value for each field across the batch. Per-file apply still works below.
          </span>
        </div>
      )}

      {/* Per-file rows */}
      <style>{`@keyframes rde-spin{to{transform:rotate(360deg)}}`}</style>
      {files.map(row => {
        const isDone = row.stage === "done" && row.extracted;
        const fieldsWithData = isDone ? Object.keys(FIELD_LABELS).filter(f => row.extracted[f] != null) : [];
        const hasRentRoll = isDone && Array.isArray(row.extracted?.units) && row.extracted.units.length > 0;
        const isActive = row.stage === "uploading" || row.stage === "parsing";

        return (
          <div key={row.id} style={{
            marginBottom: 10,
            background: "var(--card2)",
            border: "1px solid var(--borderf)",
            borderLeft: `3px solid ${
              row.stage === "error"   ? "var(--red)"    :
              isDone                  ? "var(--green)"  :
              isActive                ? "var(--purple)" :
                                        "var(--borderf)"
            }`,
            borderRadius: 5, overflow: "hidden",
          }}>
            {/* Row header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px",
              borderBottom: isDone || row.stage === "error" ? "1px solid var(--borderf)" : "none",
            }}>
              <span style={{ fontSize: 16 }}>{row.stage === "error" ? "⚠" : isDone ? "✓" : "📄"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.name}
                </div>
                <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, color: "var(--dim)", letterSpacing: "0.4px" }}>
                  {(row.size / 1024).toFixed(0)} KB · {
                    row.stage === "queued"     ? "QUEUED"            :
                    row.stage === "uploading"  ? "READING…"          :
                    row.stage === "parsing"    ? "CLAUDE EXTRACTING…":
                    row.stage === "done"       ? `${fieldsWithData.length} FIELDS${hasRentRoll ? " · RENT ROLL" : ""}` :
                    row.stage === "error"      ? "FAILED"            : ""
                  }
                </div>
              </div>
              {isActive && (
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(167,130,255,0.2)",
                  borderTopColor: "var(--purple)",
                  animation: "rde-spin 0.8s linear infinite",
                  flexShrink: 0,
                }} />
              )}
              {isDone && fieldsWithData.length > 0 && (
                <button onClick={() => applyAllFromRow(row.id)} style={{
                  background: "rgba(52,217,138,0.15)", border: "1px solid rgba(52,217,138,0.35)",
                  color: "var(--green)", borderRadius: 3,
                  padding: "4px 10px", cursor: "pointer",
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
                  letterSpacing: "0.8px",
                }}>▶ APPLY ALL</button>
              )}
              <button onClick={() => removeFile(row.id)} title="Remove from queue" style={{
                background: "transparent", border: "1px solid var(--borderf)",
                color: "var(--dim)", borderRadius: 3,
                padding: "4px 8px", cursor: "pointer",
                fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: "0.8px",
              }}>✕</button>
            </div>

            {/* Error detail */}
            {row.stage === "error" && row.error && (
              <div style={{
                padding: "10px 14px",
                fontSize: 12, color: "var(--red)", lineHeight: 1.5,
              }}>
                {row.error}
              </div>
            )}

            {/* Extracted result */}
            {isDone && (
              <div style={{ padding: "12px 14px" }}>
                {fieldsWithData.length === 0 && !hasRentRoll ? (
                  <div style={{
                    padding: "10px 12px",
                    background: "rgba(240,160,48,0.05)",
                    border: "1px solid rgba(240,160,48,0.25)",
                    borderLeft: "3px solid var(--amber)",
                    borderRadius: 4, fontSize: 12.5, color: "var(--text)", lineHeight: 1.5,
                  }}>
                    <strong>No fields recognised.</strong> The document may not contain financial data, or it may be image-heavy / handwritten.
                  </div>
                ) : (
                  <>
                    {fieldsWithData.length > 0 && (
                      <div style={{
                        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 5,
                      }}>
                        {fieldsWithData.map(field => {
                          const meta = FIELD_LABELS[field];
                          const v = row.extracted[field];
                          const isApplied = row.applied[field];
                          return (
                            <div key={field} style={{
                              background: isApplied ? "rgba(52,217,138,0.06)" : "var(--card)",
                              border: `1px solid ${isApplied ? "rgba(52,217,138,0.3)" : "var(--borderf)"}`,
                              borderRadius: 4,
                              padding: "7px 10px",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 8.5, fontWeight: 700, color: "var(--dim)", letterSpacing: "1px" }}>
                                  {meta.label.toUpperCase()}
                                </div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {fmtVal(meta.kind, v)}
                                </div>
                              </div>
                              <button
                                onClick={() => applyField(row.id, field)}
                                disabled={isApplied}
                                style={{
                                  background: isApplied ? "transparent" : "rgba(52,217,138,0.12)",
                                  border: `1px solid ${isApplied ? "rgba(52,217,138,0.4)" : "rgba(52,217,138,0.3)"}`,
                                  borderRadius: 3,
                                  padding: "3px 7px",
                                  cursor: isApplied ? "default" : "pointer",
                                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 8.5, fontWeight: 700,
                                  color: "var(--green)", letterSpacing: "0.5px",
                                }}
                              >
                                {isApplied ? "✓" : "APPLY"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Rent roll per-row */}
                    {hasRentRoll && (
                      <div style={{
                        marginTop: 12,
                        background: "rgba(52,217,138,0.04)",
                        border: "1px solid rgba(52,217,138,0.3)",
                        borderLeft: "3px solid var(--green)",
                        borderRadius: 5, overflow: "hidden",
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px",
                          background: "rgba(52,217,138,0.07)",
                          borderBottom: "1px solid var(--borderf)",
                        }}>
                          <span style={{
                            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
                            color: "var(--green)", letterSpacing: "1.1px",
                          }}>
                            ▸ RENT ROLL · {row.extracted.units.length} TYPES · {row.extracted.units.reduce((s, u) => s + (Number(u.count) || 0), 0)} UNITS
                          </span>
                          <button
                            onClick={() => applyRentRoll(row.id)}
                            disabled={row.applied.units}
                            style={{
                              marginLeft: "auto",
                              background: row.applied.units ? "transparent" : "var(--green)",
                              color: row.applied.units ? "var(--green)" : "#07090f",
                              border: `1px solid var(--green)`, borderRadius: 3,
                              padding: "4px 10px",
                              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
                              letterSpacing: "0.7px",
                              cursor: row.applied.units ? "default" : "pointer",
                            }}
                          >
                            {row.applied.units ? "✓ APPLIED" : "▶ APPLY UNITS"}
                          </button>
                        </div>
                        <div style={{ padding: 8, overflowX: "auto" }}>
                          <table style={{
                            width: "100%", borderCollapse: "collapse",
                            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5,
                            minWidth: 460,
                          }}>
                            <thead>
                              <tr style={{ color: "var(--dim)", fontWeight: 700, fontSize: 8.5, letterSpacing: "0.7px" }}>
                                <th style={{ textAlign: "left", padding: "3px 7px" }}>TYPE</th>
                                <th style={{ textAlign: "right", padding: "3px 7px" }}>CT</th>
                                <th style={{ textAlign: "right", padding: "3px 7px" }}>SQFT</th>
                                <th style={{ textAlign: "right", padding: "3px 7px" }}>CURR</th>
                                <th style={{ textAlign: "right", padding: "3px 7px" }}>MKT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.extracted.units.map((u, i) => (
                                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                  <td style={{ padding: "4px 7px", color: "var(--text)", fontWeight: 600 }}>{u.type || "—"}</td>
                                  <td style={{ padding: "4px 7px", textAlign: "right", color: "var(--text)" }}>{u.count != null ? u.count : "—"}</td>
                                  <td style={{ padding: "4px 7px", textAlign: "right", color: "var(--sub)" }}>{u.sqft != null ? u.sqft : "—"}</td>
                                  <td style={{ padding: "4px 7px", textAlign: "right", color: "var(--text)", fontWeight: 700 }}>{u.currentRent != null ? `$${u.currentRent}` : "—"}</td>
                                  <td style={{ padding: "4px 7px", textAlign: "right", color: "var(--green)" }}>{u.marketRent != null ? `$${u.marketRent}` : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {row.extracted.notes && (
                      <div style={{
                        marginTop: 10, padding: "9px 11px",
                        background: "rgba(167,130,255,0.05)",
                        border: "1px solid rgba(167,130,255,0.2)",
                        borderRadius: 4, fontSize: 11.5, color: "var(--sub)", lineHeight: 1.5,
                      }}>
                        <span style={{ fontWeight: 700, color: "var(--purple)" }}>▸ AI NOTE:</span> {row.extracted.notes}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
