import { useEffect, useMemo, useState } from "react";

/**
 * CommercialLeaseMatrix — side-by-side comparable-property table.
 *
 * Stacks the target deal against N comparable sales/leases. Best value in
 * each row is highlighted green (✓), worst red (✗). The Average column
 * normalises each metric. Add comps manually or click "🤖 GENERATE WITH AI"
 * to pull 4 plausible starter comps from Claude.
 *
 * Architecture is ready to plug in real CoStar / Reonomy / MLS data in
 * future — same component, just different source for the comps prop.
 *
 * Props:
 *   target: { address, propertyType, price, sqft, units, yearBuilt,
 *             capRate, noi, zoning }
 *   onChange?: (comps) => void   — optional, fires when user adds/edits
 */

const fmtMoney = n => n == null ? "—" : `$${Math.round(Number(n)).toLocaleString()}`;
const fmtMoneyK = n => n == null ? "—" : Number(n) >= 1_000_000
  ? `$${(Number(n)/1_000_000).toFixed(2)}M`
  : `$${Math.round(Number(n)/1000)}K`;
const fmtPct  = n => n == null ? "—" : `${(Number(n)*100).toFixed(1)}%`;
const fmtNum  = n => n == null ? "—" : Number(n).toLocaleString();
const fmtFloat = n => n == null ? "—" : Number(n).toFixed(1);

// Rows: which metric, which key on the comp object, formatter,
// and "best" direction (low / high / none).
const ROWS = [
  { key: "address",     label: "Address",          fmt: v => v || "—",        best: null },
  { key: "saleDate",    label: "Date",             fmt: v => v || "—",        best: null },
  { key: "price",       label: "Price",            fmt: fmtMoneyK,            best: null },
  { key: "sqft",        label: "Building Sqft",    fmt: fmtNum,               best: null },
  { key: "psf",         label: "$/sqft",           fmt: v => v == null ? "—" : `$${Math.round(v)}`, best: "low", derived: true },
  { key: "units",       label: "Units",            fmt: fmtNum,               best: null },
  { key: "ppu",         label: "$/Unit",           fmt: fmtMoneyK,            best: "low",  derived: true },
  { key: "capRate",     label: "Cap Rate",         fmt: fmtPct,               best: "high" },
  { key: "noi",         label: "NOI",              fmt: fmtMoneyK,            best: "high" },
  { key: "noiPerSqft",  label: "NOI / sqft",       fmt: v => v == null ? "—" : `$${Number(v).toFixed(2)}`, best: "high", derived: true },
  { key: "yearBuilt",   label: "Year Built",       fmt: v => v || "—",        best: "high" },
  { key: "zoning",      label: "Zoning",           fmt: v => v || "—",        best: null },
  { key: "distanceKm",  label: "Distance (km)",    fmt: v => v == null ? "—" : fmtFloat(v), best: "low" },
];

const fmtForRow = (row, comp) => {
  // Compute derived fields on the fly
  if (row.derived) {
    if (row.key === "psf"        && comp.price && comp.sqft) return row.fmt(comp.price / comp.sqft);
    if (row.key === "ppu"        && comp.price && comp.units) return row.fmt(comp.price / comp.units);
    if (row.key === "noiPerSqft" && comp.noi && comp.sqft)    return row.fmt(comp.noi / comp.sqft);
    return row.fmt(null);
  }
  return row.fmt(comp[row.key]);
};

const numericForRow = (row, comp) => {
  if (row.derived) {
    if (row.key === "psf"        && comp.price && comp.sqft)  return comp.price / comp.sqft;
    if (row.key === "ppu"        && comp.price && comp.units) return comp.price / comp.units;
    if (row.key === "noiPerSqft" && comp.noi && comp.sqft)    return comp.noi / comp.sqft;
    return null;
  }
  const v = comp[row.key];
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function CommercialLeaseMatrix({ target, onCompsChange, persistKey }) {
  // persistKey (typically the deal address) keys this matrix's comps in
  // localStorage so coming back to the same deal restores prior comps without
  // having to re-generate from Claude. Empty / falsy persistKey disables it.
  const storageKey = persistKey ? `rde_matrix_comps_${persistKey.trim().toLowerCase()}` : null;
  const [comps, setComps] = useState(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  // True the first render after we re-hydrated comps from localStorage. Used
  // to flash a "RESTORED" badge so the user knows where the data came from.
  const [restored, setRestored] = useState(() => {
    if (!storageKey) return false;
    try { return !!localStorage.getItem(storageKey); } catch { return false; }
  });
  const [generating, setGenerating] = useState(false);
  // When the AI grounded comps in real MLS listings, surface a tasteful pill
  // telling the user which provider supplied the anchors and how many.
  const [mlsSource, setMlsSource] = useState(null);  // null | { provider, anchors }
  const [error, setError] = useState(null);

  // Mirror the comps array up to the parent so siblings (e.g. RiskSimulator's
  // IC Report PDF) can include them. Parent stays out of comp ownership.
  useEffect(() => { onCompsChange?.(comps); }, [comps]);

  // Persist comps whenever they change for the current persistKey.
  useEffect(() => {
    if (!storageKey) return;
    try {
      if (comps.length) localStorage.setItem(storageKey, JSON.stringify(comps));
      else localStorage.removeItem(storageKey);
    } catch {}
  }, [comps, storageKey]);

  // When the user switches to a different deal address, swap the comps to
  // whatever's stored under the new key (or empty if nothing's stored).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setComps(raw ? JSON.parse(raw) : []);
    } catch { setComps([]); }
  }, [storageKey]);

  const hasTarget = target && (target.address || target.price);
  const targetAsComp = useMemo(() => target ? { ...target } : null, [target]);

  // Build the column set: target + comps
  const columns = useMemo(() => {
    const cols = [];
    if (targetAsComp) cols.push({ kind: "target", deal: targetAsComp, label: "TARGET" });
    comps.forEach((c, i) => cols.push({ kind: "comp", deal: c, label: `COMP ${i + 1}`, idx: i }));
    return cols;
  }, [targetAsComp, comps]);

  // For each row, compute best / worst numeric values for highlighting.
  // Skip the Target so we don't penalise the user's own deal against the comps.
  const rowExtremes = useMemo(() => {
    const out = {};
    for (const row of ROWS) {
      if (!row.best) { out[row.key] = {}; continue; }
      const values = columns
        .map(col => ({ col, n: numericForRow(row, col.deal) }))
        .filter(x => x.n != null);
      if (!values.length) { out[row.key] = {}; continue; }
      const vs = values.map(x => x.n);
      const max = Math.max(...vs), min = Math.min(...vs);
      out[row.key] = { min, max, dir: row.best };
    }
    return out;
  }, [columns]);

  const avgRow = useMemo(() => {
    // Average of comps only (not target)
    const avg = {};
    for (const row of ROWS) {
      const vs = comps.map(c => numericForRow(row, c)).filter(v => v != null);
      if (!vs.length) { avg[row.key] = null; continue; }
      avg[row.key] = vs.reduce((s, x) => s + x, 0) / vs.length;
    }
    return avg;
  }, [comps]);

  async function generateAI() {
    if (!target?.address) {
      setError("Add a target address to the analyzer first.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "find-comps",
          address: target.address,
          propertyType: target.propertyType || "multifamily",
          units: target.units,
          sqft: target.sqft,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      const j = await r.json();
      setComps(prev => [...prev, ...(j.comps || [])].slice(0, 6));
      // Surface whether comps were grounded in real MLS data vs pure AI.
      if (j.groundedByMls) {
        setMlsSource({ provider: j.mlsProvider, anchors: j.mlsAnchorCount });
      } else {
        setMlsSource(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function addBlankComp() {
    setComps(c => [...c, {}]);
  }
  function removeComp(idx) {
    setComps(c => c.filter((_, i) => i !== idx));
  }
  function editComp(idx, key, value) {
    setComps(c => c.map((deal, i) => i === idx ? { ...deal, [key]: value } : deal));
  }

  // CSV importer — counterpart to exportCSV. Handles two input shapes:
  //   1. WIDE  — same layout this component exports (first column "Metric",
  //              comps are columns). Round-trips cleanly.
  //   2. LONG  — one comp per row, with header (case-insensitive matched on
  //              address, price, saleDate, sqft, units, yearBuilt, capRate,
  //              noi, zoning, distanceKm). What CoStar / MLS exports look
  //              like; what users paste from their own spreadsheets.
  // Detection is by header: column 1 = "metric" → wide; "address" → long.
  function importCSV(text) {
    if (!text || !text.trim()) { setError("File is empty."); return; }
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) { setError("Need at least a header row + one data row."); return; }

    // Minimal CSV parser — handles quoted fields with commas and "" escapes.
    const parseLine = line => {
      const out = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
          if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
          else if (c === '"') inQ = false;
          else cur += c;
        } else {
          if (c === ',') { out.push(cur); cur = ""; }
          else if (c === '"') inQ = true;
          else cur += c;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ""));
    const dataRows = lines.slice(1).map(parseLine);

    const newComps = [];

    if (headers[0] === "metric") {
      // WIDE format — our own export shape. Columns 2..N are comps (skip Target
      // and ComAvg). Rebuild each comp by walking the metric rows.
      // Find which column index is target (skip) vs comps (keep) vs avg (skip).
      const headerRow = parseLine(lines[0]);  // original-case
      const colSpec = headerRow.slice(1).map(h => {
        const u = h.toLowerCase().trim();
        if (u === "target")          return { kind: "skip" };
        if (u === "comp avg")        return { kind: "skip" };
        if (u.startsWith("comp"))    return { kind: "comp", label: h };
        return { kind: "comp", label: h };
      });
      colSpec.forEach(() => newComps.push({}));
      for (const dataRow of dataRows) {
        const metricKey = (dataRow[0] || "").toLowerCase();
        const matchingRow = ROWS.find(r => r.label.toLowerCase() === metricKey);
        if (!matchingRow) continue;
        const valuesByCol = dataRow.slice(1);
        valuesByCol.forEach((val, i) => {
          if (colSpec[i]?.kind !== "comp") return;
          if (val === "" || val == null) return;
          const n = Number(String(val).replace(/[$,%\s]/g, ""));
          newComps[i][matchingRow.key] = Number.isFinite(n) ? n : val;
        });
      }
    } else {
      // LONG format — one comp per row. Match flexible headers.
      const map = {};
      headers.forEach((h, i) => {
        if (h.includes("address"))                       map.address = i;
        else if (h === "saledate" || h === "date")       map.saleDate = i;
        else if (h === "price" || h === "saleprice")     map.price = i;
        else if (h === "sqft" || h.includes("squarefeet")|| h.includes("buildingsqft")) map.sqft = i;
        else if (h === "units")                          map.units = i;
        else if (h === "yearbuilt" || h === "built")     map.yearBuilt = i;
        else if (h === "caprate" || h === "cap")         map.capRate = i;
        else if (h === "noi")                            map.noi = i;
        else if (h === "zoning" || h === "zone")         map.zoning = i;
        else if (h.includes("distance"))                 map.distanceKm = i;
      });
      if (map.address == null && map.price == null) {
        setError("Couldn't recognise this CSV. Header row should include either 'Address' or 'Price' as column names.");
        return;
      }
      for (const dataRow of dataRows) {
        const comp = {};
        for (const [key, idx] of Object.entries(map)) {
          const raw = dataRow[idx];
          if (raw == null || raw === "") continue;
          if (["price","sqft","units","yearBuilt","noi"].includes(key)) {
            const n = Number(String(raw).replace(/[$,\s]/g, ""));
            if (Number.isFinite(n)) comp[key] = n;
          } else if (key === "capRate" || key === "distanceKm") {
            // Cap rate: accept 5.5, 5.5%, 0.055 — normalize to decimal.
            const cleaned = String(raw).replace(/[%\s]/g, "");
            const n = Number(cleaned);
            if (Number.isFinite(n)) {
              comp[key] = (key === "capRate" && n > 1) ? n / 100 : n;
            }
          } else {
            comp[key] = String(raw).trim();
          }
        }
        if (Object.keys(comp).length) newComps.push(comp);
      }
    }

    if (!newComps.length) {
      setError("No comps parsed. Check the column headers match a recognised format.");
      return;
    }
    // Append (don't replace) so users can mix imported + AI-generated comps.
    // Cap at 6 total to match the AI generator's cap.
    setComps(prev => [...prev, ...newComps].slice(0, 6));
    setError(null);
  }

  function exportCSV() {
    if (!columns.length) return;
    const esc = v => {
      if (v == null || v === "") return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Metric", ...columns.map(c => c.label), comps.length ? "Comp Avg" : null].filter(Boolean);
    const lines = [header.map(esc).join(",")];
    for (const row of ROWS) {
      const cells = [row.label];
      for (const col of columns) {
        const n = numericForRow(row, col.deal);
        // Use the raw value when numeric (spreadsheet-friendly), the string when not.
        cells.push(n != null ? n : (col.deal[row.key] || ""));
      }
      if (comps.length) cells.push(avgRow[row.key] != null ? avgRow[row.key] : "");
      lines.push(cells.map(esc).join(","));
    }
    const csv = lines.join("\n");
    const fname = `realdeal-comps-${new Date().toISOString().slice(0,10)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mf-card" style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--borderf)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.6px" }}>
          ▸ COMMERCIAL LEASE &amp; SALES MATRIX
        </div>
        <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 600, color: "var(--dim)", letterSpacing: "0.7px" }}>
          · {comps.length} COMPS
        </div>
        {restored && comps.length > 0 && (
          <span
            onClick={() => setRestored(false)}
            title="Restored from your previous session — click to dismiss"
            style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
              color: "var(--green)", letterSpacing: "0.8px",
              border: "1px solid rgba(52,217,138,0.35)", borderRadius: 3,
              padding: "2px 7px", cursor: "pointer",
            }}
          >
            ✓ RESTORED
          </span>
        )}
        {mlsSource && (
          <span
            title={`${mlsSource.anchors} live listings from ${mlsSource.provider} anchored the AI-generated comps`}
            style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
              color: "var(--amber)", letterSpacing: "0.8px",
              border: "1px solid rgba(240,160,48,0.4)", borderRadius: 3,
              padding: "2px 7px",
            }}
          >
            ⌖ GROUNDED · {mlsSource.provider.toUpperCase()} ({mlsSource.anchors})
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={generateAI}
            disabled={generating || !target?.address}
            style={{
              background: generating ? "rgba(167,130,255,0.15)" : "transparent",
              color: "var(--purple)",
              border: "1px solid var(--purple)",
              borderRadius: 4,
              padding: "7px 12px",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "1px",
              cursor: target?.address && !generating ? "pointer" : "not-allowed",
              opacity: target?.address ? 1 : 0.4,
            }}
          >
            {generating ? "GENERATING…" : "🤖 GENERATE WITH AI"}
          </button>
          <button
            onClick={addBlankComp}
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--borderf)",
              borderRadius: 4,
              padding: "7px 12px",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            + ADD COMP
          </button>
          {/* Hidden file input — wired to the IMPORT CSV button below. Accepts
              long format (one comp per row, with Address / Price / etc headers)
              or wide format (our own export shape). */}
          <input
            type="file"
            accept=".csv,text/csv"
            id="comp-csv-import"
            style={{ display: "none" }}
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const text = await f.text();
                importCSV(text);
              } catch (err) {
                setError(`Could not read file: ${err.message}`);
              }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => document.getElementById("comp-csv-import")?.click()}
            title="Import a CSV of comps from CoStar / MLS / your spreadsheet. Long format (one comp per row) or our own wide-format export both work."
            style={{
              background: "transparent",
              color: "var(--amber)",
              border: "1px solid rgba(240,160,48,0.5)",
              borderRadius: 4,
              padding: "7px 12px",
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            📥 IMPORT CSV
          </button>
          {columns.length > 0 && (
            <button
              onClick={exportCSV}
              title="Download all comps + the target as CSV for Excel / Google Sheets"
              style={{
                background: "var(--green)",
                color: "#ffffff",
                border: "1px solid var(--green)",
                borderRadius: 4,
                padding: "7px 12px",
                fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
                letterSpacing: "1px",
                cursor: "pointer",
              }}
            >
              📄 EXPORT CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          margin: 14, padding: "10px 12px",
          background: "rgba(242,92,92,0.08)", border: "1px solid rgba(242,92,92,0.3)",
          borderLeft: "3px solid var(--red)", borderRadius: 4,
          fontSize: 12.5, color: "var(--red)",
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {columns.length === 0 && !generating && (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
          Add a target address in the analyzer, then click 🤖 GENERATE WITH AI for 4 starter comps — or + ADD COMP to enter them manually.
        </div>
      )}

      {/* Matrix table */}
      {columns.length > 0 && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 12,
            minWidth: 600 + columns.length * 140,
          }}>
            <thead>
              <tr>
                <th style={thStyleLabel}>METRIC</th>
                {columns.map((col, ci) => (
                  <th key={ci} style={{ ...thStyle, color: col.kind === "target" ? "var(--green)" : "var(--blue)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{col.label}</span>
                      {col.kind === "comp" && (
                        <button
                          onClick={() => removeComp(col.idx)}
                          style={{
                            background: "transparent", border: "none", color: "var(--dim)",
                            cursor: "pointer", padding: "0 4px", fontFamily: "inherit", fontSize: 11,
                          }}
                          title="Remove comp"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {comps.length > 0 && <th style={{ ...thStyle, color: "var(--amber)" }}>AVG</th>}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => {
                const ext = rowExtremes[row.key] || {};
                return (
                  <tr key={row.key}>
                    <td style={tdLabelStyle}>{row.label}</td>
                    {columns.map((col, ci) => {
                      const isTarget = col.kind === "target";
                      const n = numericForRow(row, col.deal);
                      let cellColor = "var(--text)";
                      let cellMark  = "";
                      if (ext.dir && n != null) {
                        if ((ext.dir === "low"  && n === ext.min) || (ext.dir === "high" && n === ext.max)) {
                          cellColor = "var(--green)"; cellMark = " ✓";
                        } else if ((ext.dir === "low" && n === ext.max) || (ext.dir === "high" && n === ext.min)) {
                          cellColor = isTarget ? "var(--amber)" : "var(--dim)";
                          cellMark = isTarget ? " ⚠" : "";
                        }
                      }
                      const editable = !isTarget && !row.derived;
                      return (
                        <td key={ci} style={{ ...tdStyle, color: cellColor, fontWeight: cellMark ? 700 : 500 }}>
                          {editable ? (
                            <input
                              value={col.deal[row.key] ?? ""}
                              onChange={e => editComp(col.idx, row.key, parseInputValue(row.key, e.target.value))}
                              style={inputStyle}
                              placeholder="—"
                            />
                          ) : (
                            <>{fmtForRow(row, col.deal)}{cellMark}</>
                          )}
                        </td>
                      );
                    })}
                    {comps.length > 0 && (
                      <td style={{ ...tdStyle, color: "var(--amber)", fontStyle: "italic" }}>
                        {avgRow[row.key] != null
                          ? row.fmt(avgRow[row.key])
                          : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {/* AI notes row, only when at least one comp has notes */}
              {comps.some(c => c.notes) && (
                <tr>
                  <td style={tdLabelStyle}>Notes</td>
                  {columns.map((col, ci) => (
                    <td key={ci} style={{ ...tdStyle, fontFamily: "'Geist',sans-serif", fontSize: 11.5, color: "var(--sub)", whiteSpace: "normal", lineHeight: 1.4 }}>
                      {col.deal.notes || "—"}
                    </td>
                  ))}
                  {comps.length > 0 && <td style={tdStyle}>—</td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        margin: 14,
        padding: "10px 12px",
        background: "rgba(59,158,255,0.05)",
        border: "1px solid rgba(59,158,255,0.2)",
        borderRadius: 4,
        fontSize: 11.5, color: "var(--sub)", lineHeight: 1.55,
      }}>
        <strong style={{ color: "var(--blue)" }}>▸ READING THIS:</strong>{" "}
        Green ✓ = best in row · Amber ⚠ = worst (target only) · Numeric cells are editable on comp rows.
        AI-generated comps are directional — verify with MLS or commercial data services before underwriting decisions.
      </div>
    </div>
  );
}

function parseInputValue(key, raw) {
  if (raw === "") return "";
  const numericKeys = ["price", "sqft", "units", "yearBuilt", "capRate", "noi", "distanceKm"];
  if (numericKeys.includes(key)) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--borderf)",
  background: "rgba(255,255,255,0.012)",
  whiteSpace: "nowrap",
};
const thStyleLabel = { ...thStyle, color: "var(--dim)", minWidth: 130 };
const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(15,23,42,0.03)",
  whiteSpace: "nowrap",
};
const tdLabelStyle = {
  ...tdStyle,
  fontFamily: "'Geist',sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--sub)",
};
const inputStyle = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--borderf)",
  borderRadius: 3,
  padding: "4px 6px",
  fontFamily: "'Geist Mono',ui-monospace,monospace",
  fontSize: 12,
  color: "inherit",
  width: 100,
  outline: "none",
};
