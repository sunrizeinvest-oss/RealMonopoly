import { useMemo, useState } from "react";

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

export default function CommercialLeaseMatrix({ target }) {
  const [comps, setComps] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="mf-card" style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--borderf)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.6px" }}>
          ▸ COMMERCIAL LEASE &amp; SALES MATRIX
        </div>
        <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 600, color: "var(--dim)", letterSpacing: "0.7px" }}>
          · {comps.length} COMPS
        </div>
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
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
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
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            + ADD COMP
          </button>
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
            fontFamily: "'Fira Code',ui-monospace,monospace",
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
                    <td key={ci} style={{ ...tdStyle, fontFamily: "'DM Sans',sans-serif", fontSize: 11.5, color: "var(--sub)", whiteSpace: "normal", lineHeight: 1.4 }}>
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
  borderBottom: "1px solid rgba(255,255,255,0.03)",
  whiteSpace: "nowrap",
};
const tdLabelStyle = {
  ...tdStyle,
  fontFamily: "'DM Sans',sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--sub)",
};
const inputStyle = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--borderf)",
  borderRadius: 3,
  padding: "4px 6px",
  fontFamily: "'Fira Code',ui-monospace,monospace",
  fontSize: 12,
  color: "inherit",
  width: 100,
  outline: "none",
};
