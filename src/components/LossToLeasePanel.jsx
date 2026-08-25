/**
 * LossToLeasePanel — visualizes the rent-roll → loss-to-lease output.
 *
 * Headline trio (annual upside · per-door delta · % below market)
 * Per-unit table with status pills (below / above / vacant / ungraded)
 * AI Read narrative (2-3 sentences from AI)
 * Methodology footnote (CMHC anchor + capture curve + discount rate)
 *
 * Props:
 *   data: response from /api/ai-chat?mode=rent-roll-loss-to-lease
 *   onAddToIcMemo?: () => void   — optional "Add to IC Memo" callback
 *   compact?: boolean             — denser layout for the calculator sidebar
 */

import React, { useMemo, useState } from "react";

const fmt$ = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const fmtPct = (n) =>
  typeof n === "number" && Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—";

export default function LossToLeasePanel({ data, onAddToIcMemo, compact = false }) {
  const [showAll, setShowAll] = useState(false);

  if (!data) return null;

  // Failure / no-rent-roll states surface as clean explainers, not crashes.
  if (data.ok === false) {
    return (
      <div className="ltl-panel ltl-panel-err">
        <div className="ltl-err-icon">⚠</div>
        <div className="ltl-err-body">
          <div className="ltl-err-title">Loss-to-lease analysis unavailable</div>
          <div className="ltl-err-msg">{data.error}</div>
          {data.hint && <div className="ltl-err-hint">{data.hint}</div>}
        </div>
        <Styles />
      </div>
    );
  }

  const { ltl, aiRead, address } = data;
  if (!ltl?.ok) return null;
  const t = ltl.totals;
  const units = useMemo(() => {
    const arr = ltl.units || [];
    // Sort: largest below-market delta first, then above-market, then ungraded/vacant.
    return [...arr].sort((a, b) => {
      const da = a.deltaMonthly == null ? -Infinity : a.deltaMonthly;
      const db = b.deltaMonthly == null ? -Infinity : b.deltaMonthly;
      return db - da;
    });
  }, [ltl.units]);

  const displayed = showAll ? units : units.slice(0, 8);
  const hidden    = Math.max(0, units.length - 8);
  const isUpside  = t.deltaAnnual >= 0;

  return (
    <div className={`ltl-panel ${compact ? "ltl-compact" : ""}`}>
      <div className="ltl-head">
        <div className="ltl-eyebrow">
          ▸ LOSS-TO-LEASE · STRANDED UPSIDE
        </div>
        {address && <div className="ltl-addr">{address}</div>}
      </div>

      {/* Headline KPIs */}
      <div className="ltl-kpis">
        <div className={`ltl-kpi ${isUpside ? "ltl-pos" : "ltl-neg"}`}>
          <div className="ltl-kpi-val">{fmt$(t.deltaAnnual)}</div>
          <div className="ltl-kpi-lbl">Annual upside</div>
        </div>
        <div className="ltl-kpi">
          <div className="ltl-kpi-val">{fmt$(t.perDoorMonthly)}</div>
          <div className="ltl-kpi-lbl">Per door / month</div>
        </div>
        <div className="ltl-kpi">
          <div className="ltl-kpi-val">{fmtPct(t.avgUpsidePct)}</div>
          <div className="ltl-kpi-lbl">Below market</div>
        </div>
        <div className="ltl-kpi">
          <div className="ltl-kpi-val">{fmt$(t.stranded5YearNPV)}</div>
          <div className="ltl-kpi-lbl">5-yr stranded NPV @ 8%</div>
        </div>
      </div>

      {/* Per-unit table */}
      <div className="ltl-table-wrap">
        <table className="ltl-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>BR</th>
              <th>SqFt</th>
              <th className="ltl-num">Actual</th>
              <th className="ltl-num">Market</th>
              <th className="ltl-num">Δ /mo</th>
              <th className="ltl-num">% vs market</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((u, i) => (
              <tr key={u.unit ?? i} className={`ltl-row ltl-row-${u.status}`}>
                <td className="ltl-unit">{u.unit ?? `—`}</td>
                <td>{u.bedrooms ?? "?"}</td>
                <td>{u.sqft ?? "—"}</td>
                <td className="ltl-num">{fmt$(u.actualRent)}</td>
                <td className="ltl-num">{fmt$(u.marketRent)}</td>
                <td className={`ltl-num ${u.deltaMonthly == null ? "" : u.deltaMonthly >= 0 ? "ltl-pos" : "ltl-neg"}`}>
                  {u.deltaMonthly == null ? "—" : (u.deltaMonthly >= 0 ? "+" : "") + fmt$(u.deltaMonthly)}
                </td>
                <td className={`ltl-num ${u.deltaPct == null ? "" : u.deltaPct >= 0 ? "ltl-pos" : "ltl-neg"}`}>
                  {u.deltaPct == null ? "—" : `${u.deltaPct >= 0 ? "-" : "+"}${(Math.abs(u.deltaPct) * 100).toFixed(1)}%`}
                </td>
                <td>
                  <StatusPill status={u.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hidden > 0 && !showAll && (
          <button className="ltl-show-all" onClick={() => setShowAll(true)}>
            + Show {hidden} more units
          </button>
        )}
      </div>

      {/* AI Read */}
      {aiRead && (
        <div className="ltl-airead">
          <div className="ltl-airead-tag">AI READ</div>
          <div className="ltl-airead-body">{aiRead}</div>
        </div>
      )}

      {/* Methodology + footer */}
      <div className="ltl-foot">
        <div className="ltl-method">
          <span><strong>Anchor:</strong> {ltl.methodology.anchor}</span>
          <span><strong>Discount:</strong> {ltl.methodology.discount}</span>
          <span><strong>Capture:</strong> {ltl.methodology.captureCurve}</span>
        </div>
        {onAddToIcMemo && (
          <button className="ltl-cta" onClick={onAddToIcMemo}>
            + Add to IC Memo PDF
          </button>
        )}
      </div>

      <Styles />
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    below:    { cls: "ltl-pill-below",  text: "Below market" },
    above:    { cls: "ltl-pill-above",  text: "Above market" },
    vacant:   { cls: "ltl-pill-vacant", text: "Vacant" },
    ungraded: { cls: "ltl-pill-grey",   text: "Ungraded" },
  };
  const s = map[status] || map.ungraded;
  return <span className={`ltl-pill ${s.cls}`}>{s.text}</span>;
}

function Styles() {
  const css = `
    .ltl-panel{background:linear-gradient(180deg,rgba(0,12,31,0.04) 0%,#ffffff 100%);border:1px solid #e2e8f0;border-left:3px solid #d4af37;border-radius:6px;padding:22px;font-family:'Geist',sans-serif;color:#0f172a;margin:18px 0;box-shadow:0 4px 24px rgba(15,23,42,0.06)}
    .ltl-panel-err{display:flex;gap:14px;background:rgba(242,92,92,0.05);border-left-color:#f25c5c}
    .ltl-err-icon{font-size:20px;color:#f25c5c}
    .ltl-err-title{font-size:14px;font-weight:800;margin-bottom:4px}
    .ltl-err-msg{font-size:13px;color:#475569;line-height:1.5}
    .ltl-err-hint{font-size:12px;color:#94a3b8;line-height:1.5;margin-top:6px;font-style:italic}

    .ltl-head{margin-bottom:18px}
    .ltl-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:#d4af37;text-transform:uppercase;margin-bottom:6px}
    .ltl-addr{font-size:13px;color:#475569;font-family:'Geist Mono',ui-monospace,monospace}

    .ltl-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
    .ltl-kpi{background:#ffffff;border:1px solid #e2e8f0;border-radius:4px;padding:14px 16px}
    .ltl-kpi-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.1;margin-bottom:4px}
    .ltl-kpi-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:600;color:#64748b;letter-spacing:1.2px;text-transform:uppercase}
    .ltl-pos .ltl-kpi-val,.ltl-num.ltl-pos{color:#15803d}
    .ltl-neg .ltl-kpi-val,.ltl-num.ltl-neg{color:#dc2626}

    .ltl-table-wrap{margin-bottom:18px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;background:#fff}
    .ltl-table{width:100%;border-collapse:collapse;font-size:12.5px}
    .ltl-table th{background:#f8fafc;color:#475569;text-align:left;padding:9px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border-bottom:1px solid #e2e8f0}
    .ltl-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-family:'Geist Mono',ui-monospace,monospace}
    .ltl-table tr:last-child td{border-bottom:none}
    .ltl-num{text-align:right;font-weight:600}
    .ltl-unit{font-weight:700;color:#0f172a}
    .ltl-row-vacant td,.ltl-row-ungraded td{color:#94a3b8;background:rgba(15,23,42,0.02)}
    .ltl-row-above td.ltl-num.ltl-neg{background:rgba(220,38,38,0.04)}
    .ltl-show-all{width:100%;background:#f8fafc;border:none;border-top:1px dashed #e2e8f0;padding:10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:600;color:#0066cc;cursor:pointer;letter-spacing:0.4px;text-transform:uppercase}
    .ltl-show-all:hover{background:#eff6ff}

    .ltl-pill{display:inline-block;font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:3px 7px;border-radius:3px;text-transform:uppercase;border:1px solid currentColor}
    .ltl-pill-below{color:#15803d;background:rgba(21,128,61,0.06)}
    .ltl-pill-above{color:#dc2626;background:rgba(220,38,38,0.06)}
    .ltl-pill-vacant{color:#64748b;background:rgba(100,116,139,0.06)}
    .ltl-pill-grey{color:#94a3b8;background:rgba(148,163,184,0.06)}

    .ltl-airead{background:rgba(0,102,204,0.04);border:1px solid rgba(0,102,204,0.18);border-left:2px solid #0066cc;border-radius:4px;padding:14px 16px;margin-bottom:18px}
    .ltl-airead-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#0066cc;text-transform:uppercase;margin-bottom:6px}
    .ltl-airead-body{font-size:13px;color:#0f172a;line-height:1.6;font-style:italic}

    .ltl-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .ltl-method{display:flex;flex-direction:column;gap:3px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:#64748b;line-height:1.5}
    .ltl-method strong{color:#0f172a;font-weight:700}
    .ltl-cta{background:#0066cc;color:#fff;border:1px solid #d4af37;border-radius:4px;padding:10px 16px;font-family:'Geist',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;letter-spacing:0.4px;text-transform:uppercase;transition:all 0.15s}
    .ltl-cta:hover{background:#0047ab;box-shadow:0 6px 18px rgba(212,175,55,0.25);transform:translateY(-1px)}

    .ltl-compact .ltl-kpis{grid-template-columns:repeat(2,1fr)}
    .ltl-compact .ltl-kpi-val{font-size:18px}

    @media(max-width:720px){
      .ltl-kpis{grid-template-columns:repeat(2,1fr)}
      .ltl-table th:nth-child(3),.ltl-table td:nth-child(3){display:none}
      .ltl-table th:nth-child(7),.ltl-table td:nth-child(7){display:none}
    }
  `;
  return <style>{css}</style>;
}
