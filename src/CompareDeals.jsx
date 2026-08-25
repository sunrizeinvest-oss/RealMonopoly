import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";
import { track } from "./lib/analytics";

/**
 * CompareDeals — side-by-side matrix of 2-5 saved deals from Dashboard.
 *
 * Selection passthrough: Dashboard sets sessionStorage.rde_compare_ids as a
 * JSON array of deal IDs. This page reads it on mount, loads matching deals
 * from localStorage.rde_brrrr_deals, and renders the matrix.
 *
 * Row categories:
 *   • Property — address, city, saved date, verdict
 *   • Purchase & Rehab — purchase price, ARV, rehab budget, total cash in
 *   • Income & Cashflow — monthly rent, NOI, monthly CF, annual CF
 *   • Returns — cap rate, CoC, DSCR, 5-yr IRR
 *   • Flip-specific — net profit, ROI, margin
 *   • BRRRR-specific — cash left in, cash pulled out, equity created
 *
 * For each numeric row with 2+ real values, best is highlighted brass,
 * worst red. Free-tier access (viewing local data, no API cost).
 */
export default function CompareDeals() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Compare Deals · RizeAI",
    description: "Side-by-side comparison of your saved real estate deals — verdict, cashflow, cap rate, DSCR, IRR. Pick the best.",
  });

  const [deals, setDeals] = useState([]);

  useEffect(() => {
    let ids = [];
    try {
      const raw = sessionStorage.getItem("rde_compare_ids");
      if (raw) ids = JSON.parse(raw);
    } catch {}
    try {
      const all = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
      const picked = ids.length
        ? ids.map(id => all.find(d => d.id === id)).filter(Boolean)
        : all.slice(0, 3);        // fallback: first 3 saved deals if no selection
      setDeals(picked.slice(0, 5)); // cap at 5 columns
    } catch {}
    track("deals_compared", { count: ids.length });
  }, []);

  const removeDeal = (id) => setDeals(prev => prev.filter(d => d.id !== id));

  const openDeal = (deal) => {
    track("compare_open_deal", { type: deal.type });
    if (deal.type === "flip") navigate("/flip");
    else if (deal.type === "brrrr") navigate("/brrrr");
    else if (deal.type === "multifamily") navigate("/commercial");
    else if (deal.type === "property") navigate(`/property?addr=${encodeURIComponent(deal.address || deal.name || "")}`);
    else navigate("/dashboard");
  };

  const rows = useMemo(() => buildRows(deals), [deals]);

  return (
    <div className="cd-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="cd-body">
        <div className="cd-header">
          <div>
            <div className="cd-eyebrow">
              <span className="cd-eyebrow-dot" />
              INSIDER TOOL · SIDE-BY-SIDE
            </div>
            <h1 className="cd-h1">Compare your saved deals.</h1>
            <p className="cd-sub">
              {deals.length === 0
                ? "No deals selected. Head to your Dashboard and pick 2-5 saved deals to compare."
                : `${deals.length} deal${deals.length === 1 ? "" : "s"} · best value per row highlighted brass, weakest red.`}
            </p>
          </div>
          <button className="cd-btn-ghost" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        {deals.length === 0 && (
          <div className="cd-empty">
            <div className="cd-empty-icon">📊</div>
            <div className="cd-empty-title">Nothing to compare yet</div>
            <div className="cd-empty-sub">Save 2 or more deals via /property, /brrrr, /flip, or /commercial. Then check them off on your Dashboard and hit Compare.</div>
            <button className="cd-btn-primary" onClick={() => navigate("/dashboard")}>Go to Dashboard →</button>
          </div>
        )}

        {deals.length > 0 && (
          <div className="cd-matrix-wrap">
            <div
              className="cd-matrix"
              style={{
                gridTemplateColumns: `220px repeat(${deals.length}, minmax(180px, 1fr))`,
              }}
            >
              {/* Column headers — one per deal */}
              <div className="cd-cell cd-header-cell metric-header">Metric</div>
              {deals.map(deal => (
                <div key={deal.id} className="cd-cell cd-header-cell">
                  <div className="cd-col-type-pill" style={{ background: typePillBg(deal.type), color: typePillColor(deal.type) }}>
                    {typePillEmoji(deal.type)} {typePillLabel(deal.type)}
                  </div>
                  <div className="cd-col-name" title={deal.name || deal.address}>{deal.name || deal.address || "Untitled"}</div>
                  <div className="cd-col-date">
                    {deal.savedAt ? new Date(deal.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </div>
                  <div className="cd-col-actions">
                    <button className="cd-col-btn primary" onClick={() => openDeal(deal)}>Open →</button>
                    <button className="cd-col-btn" onClick={() => removeDeal(deal.id)}>×</button>
                  </div>
                </div>
              ))}

              {/* Data rows grouped by section */}
              {rows.map((section, si) => (
                <RowSection key={si} section={section} deals={deals} />
              ))}
            </div>
          </div>
        )}

        {deals.length > 0 && (
          <div className="cd-legend">
            <span className="cd-legend-item"><span className="cd-legend-swatch best" /> Best in row</span>
            <span className="cd-legend-item"><span className="cd-legend-swatch worst" /> Worst in row</span>
            <span className="cd-legend-item">Only rows with 2+ real values get color-coded.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row rendering (with best/worst color-coding) ─────────────────────────

function RowSection({ section, deals }) {
  return (
    <>
      <div
        className="cd-cell cd-section-header"
        style={{ gridColumn: `1 / span ${1 + deals.length}` }}
      >
        ▸ {section.title}
      </div>
      {section.rows.map((row, ri) => {
        const values = deals.map(d => row.get(d));
        // Determine best/worst for numeric coloring
        const nums = values.filter(v => v != null && typeof v === "number");
        const canColor = nums.length >= 2;
        const max = canColor ? Math.max(...nums) : null;
        const min = canColor ? Math.min(...nums) : null;
        // For rows where LOWER is better (e.g., total cash in), invert
        const lowerIsBetter = row.lowerIsBetter === true;

        return (
          <>
            <div key={`label-${ri}`} className="cd-cell cd-row-label">
              {row.label}
              {row.hint && <span className="cd-row-hint" title={row.hint}> ⓘ</span>}
            </div>
            {values.map((v, ci) => {
              const isBest =
                canColor && typeof v === "number" && (
                  (lowerIsBetter && v === min) ||
                  (!lowerIsBetter && v === max)
                );
              const isWorst =
                canColor && typeof v === "number" && (
                  (lowerIsBetter && v === max) ||
                  (!lowerIsBetter && v === min)
                );
              return (
                <div
                  key={`v-${ci}`}
                  className={`cd-cell cd-value ${isBest ? "best" : ""} ${isWorst ? "worst" : ""}`}
                >
                  {v == null ? "—" : row.format ? row.format(v) : v}
                </div>
              );
            })}
          </>
        );
      })}
    </>
  );
}

// ─── Data adapter — extracts uniform values from disparate deal shapes ────

function buildRows(deals) {
  if (!deals.length) return [];

  return [
    {
      title: "Property",
      rows: [
        { label: "Address",   get: d => d.address || d.name || "—" },
        { label: "Verdict",   get: d => d.verdict || d.results?.verdict || "—" },
        { label: "Grade",     get: d => d.results?.grade || d.grade || "—" },
      ],
    },
    {
      title: "Purchase & Rehab",
      rows: [
        { label: "Purchase price", get: d => firstNum(d.inputs?.purchasePrice, d.results?.purchasePrice), format: fmtDollar },
        { label: "ARV",            get: d => firstNum(d.inputs?.arv, d.results?.arv), format: fmtDollar },
        { label: "Rehab budget",   get: d => firstNum(d.inputs?.rehabBudget, d.inputs?.repairCost, d.results?.repairCosts), format: fmtDollar },
        { label: "Total cash in",  get: d => firstNum(d.results?.totalCashIn, d.results?.tci), format: fmtDollar, lowerIsBetter: true, hint: "Lower is better — less capital locked" },
      ],
    },
    {
      title: "Income & Cashflow",
      rows: [
        { label: "Monthly rent",   get: d => firstNum(d.inputs?.monthlyRent, d.results?.monthlyRent), format: fmtDollar },
        { label: "NOI",            get: d => firstNum(d.results?.noi, d.results?.NOI), format: fmtDollar },
        { label: "Monthly cashflow", get: d => firstNum(d.results?.monthlyCF, d.results?.monthlyCf), format: fmtDollar },
        { label: "Annual cashflow", get: d => firstNum(d.results?.annualCF, d.results?.annCF), format: fmtDollar },
      ],
    },
    {
      title: "Returns",
      rows: [
        { label: "Cap rate",     get: d => firstNum(d.results?.capRate), format: fmtPct },
        { label: "Cash-on-cash", get: d => firstNum(d.results?.coc, d.results?.CoC), format: fmtPct },
        { label: "DSCR",         get: d => firstNum(d.results?.dscr, d.results?.DSCR), format: v => v.toFixed(2) + "x" },
        { label: "5-yr IRR",     get: d => firstNum(d.results?.irr), format: fmtPct },
        { label: "Equity multiple", get: d => firstNum(d.results?.eqMultiple, d.results?.eqMul), format: v => v.toFixed(2) + "x" },
      ],
    },
    {
      title: "Flip-specific",
      rows: [
        { label: "Net profit",   get: d => firstNum(d.results?.netProfit, d.results?.profit), format: fmtDollar },
        { label: "ROI",          get: d => firstNum(d.results?.roiTotal, d.results?.margin), format: fmtPct },
        { label: "Margin",       get: d => firstNum(d.results?.margin), format: fmtPct },
      ],
    },
    {
      title: "BRRRR-specific",
      rows: [
        { label: "Cash left in",     get: d => firstNum(d.results?.cashLeftInDeal, d.results?.cli), format: fmtDollar, lowerIsBetter: true, hint: "Lower is better — closer to true BRRRR" },
        { label: "Cash pulled out",  get: d => firstNum(d.results?.cashPulledOut, d.results?.cpo), format: fmtDollar },
        { label: "Equity created",   get: d => firstNum(d.results?.equityCreated, d.results?.eq), format: fmtDollar },
        { label: "Refi loan",        get: d => firstNum(d.results?.refiLoanAmount), format: fmtDollar },
      ],
    },
  ];
}

function firstNum(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return null;
}

function fmtDollar(n) {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n) {
  if (n == null) return "—";
  // heuristic: values > 1 are already percent, values <= 1 are decimals
  const pct = n > 1 ? n : n * 100;
  return `${pct.toFixed(1)}%`;
}

function typePillBg(type) {
  return type === "flip" ? "rgba(59,158,255,0.12)"
    : type === "brrrr" ? "rgba(167,130,255,0.12)"
    : type === "multifamily" ? "rgba(52,217,138,0.12)"
    : type === "property" ? "rgba(212,175,55,0.15)"
    : "rgba(107,125,150,0.12)";
}
function typePillColor(type) {
  return type === "flip" ? "var(--blue)"
    : type === "brrrr" ? "var(--purple)"
    : type === "multifamily" ? "var(--green)"
    : type === "property" ? "var(--brass-2)"
    : "var(--sub)";
}
function typePillEmoji(type) {
  return type === "flip" ? "🏚️"
    : type === "brrrr" ? "🔄"
    : type === "multifamily" ? "🏢"
    : type === "property" ? "🗺️"
    : "🏠";
}
function typePillLabel(type) {
  return type === "flip" ? "Flip"
    : type === "brrrr" ? "BRRRR"
    : type === "multifamily" ? "MF"
    : type === "property" ? "Property"
    : "Deal";
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
  .cd-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .cd-body { max-width: 1400px; margin: 0 auto; padding: 40px 24px 96px; }

  .cd-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
  .cd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; }
  .cd-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .cd-h1 { font-size: clamp(24px, 3.5vw, 36px); font-weight: 800; color: var(--text); letter-spacing: -1.1px; line-height: 1.15; margin: 0 0 8px; }
  .cd-sub { font-size: 14px; color: var(--sub); line-height: 1.5; margin: 0; max-width: 720px; }

  .cd-btn-primary { padding: 10px 18px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .cd-btn-primary:hover { background: var(--brass-2); }
  .cd-btn-ghost { padding: 8px 14px; border-radius: 5px; background: transparent; color: var(--sub); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .cd-btn-ghost:hover { color: var(--text); border-color: var(--sub); }

  /* Empty state */
  .cd-empty { text-align: center; padding: 64px 24px; background: var(--card); border: 1px dashed var(--borderf); border-radius: 12px; }
  .cd-empty-icon { font-size: 44px; margin-bottom: 14px; }
  .cd-empty-title { font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 8px; letter-spacing: -0.4px; }
  .cd-empty-sub { font-size: 14px; color: var(--sub); max-width: 480px; margin: 0 auto 22px; line-height: 1.6; }

  /* Matrix */
  .cd-matrix-wrap { overflow-x: auto; border: 1px solid var(--borderf); border-radius: 12px; background: var(--card); }
  .cd-matrix { display: grid; min-width: 720px; }
  .cd-cell { padding: 12px 14px; border-bottom: 1px solid var(--borderf); border-right: 1px solid var(--borderf); font-size: 13.5px; color: var(--text); }
  .cd-matrix > .cd-cell:nth-last-child(-n+1) { border-right: none; }

  .cd-header-cell { background: var(--card2); padding: 16px; position: sticky; top: 0; z-index: 2; }
  .cd-header-cell.metric-header { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); text-transform: uppercase; letter-spacing: 1.2px; }
  .cd-col-type-pill { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.4px; margin-bottom: 8px; }
  .cd-col-name { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 3px; letter-spacing: -0.3px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; }
  .cd-col-date { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--dim); margin-bottom: 10px; }
  .cd-col-actions { display: flex; gap: 6px; }
  .cd-col-btn { padding: 5px 10px; border-radius: 4px; background: transparent; border: 1px solid var(--borderf); color: var(--sub); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; cursor: pointer; }
  .cd-col-btn.primary { background: var(--brass); color: #0a1128; border-color: var(--brass); flex: 1; }
  .cd-col-btn.primary:hover { background: var(--brass-2); }
  .cd-col-btn:not(.primary):hover { color: var(--red); border-color: var(--red); }

  .cd-section-header { padding: 10px 14px; background: rgba(212,175,55,0.05); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); text-transform: uppercase; letter-spacing: 1.4px; border-bottom: 1px solid var(--borderf); border-right: none; }

  .cd-row-label { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--sub); letter-spacing: 0.2px; background: var(--card2); }
  .cd-row-hint { color: var(--dim); cursor: help; margin-left: 4px; }

  .cd-value { font-family: 'Geist Mono', monospace; font-weight: 700; color: var(--text); }
  .cd-value.best { background: rgba(52, 217, 138, 0.10); color: var(--green); border-left: 3px solid var(--green); padding-left: 11px; }
  .cd-value.worst { background: rgba(220, 38, 38, 0.06); color: var(--red); border-left: 3px solid var(--red); padding-left: 11px; }

  .cd-legend { display: flex; gap: 20px; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--borderf); flex-wrap: wrap; font-size: 12px; color: var(--sub); }
  .cd-legend-item { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist Mono', monospace; }
  .cd-legend-swatch { width: 12px; height: 12px; border-radius: 3px; }
  .cd-legend-swatch.best { background: rgba(52, 217, 138, 0.35); border-left: 3px solid var(--green); }
  .cd-legend-swatch.worst { background: rgba(220, 38, 38, 0.20); border-left: 3px solid var(--red); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }

  @media (max-width: 720px) { .cd-body { padding: 24px 16px 60px; } }
`;
