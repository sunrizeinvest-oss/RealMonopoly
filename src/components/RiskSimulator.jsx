import { useMemo, useState } from "react";
import { runMonteCarlo, DEFAULT_DISTRIBUTIONS } from "../lib/monteCarlo";

/**
 * RiskSimulator — institutional Monte Carlo: drives the deal through 1000
 * independent randomised scenarios and surfaces:
 *   - P10 / P50 / P90 of IRR, Equity Multiple, Min DSCR
 *   - Probability of meeting DSCR ≥ 1.25
 *   - Probability of positive IRR
 *   - Probability of IRR ≥ target
 *   - Histogram of the IRR distribution
 *
 * Props:
 *   deal: simplified deal spec — see lib/monteCarlo for shape
 *
 * No external lib. Pure SVG histogram. ~50ms / 1000 sims on a mid-laptop.
 */

const fmtPct = n => n == null ? "—" : `${(n * 100).toFixed(1)}%`;
const fmtX   = n => n == null ? "—" : `${n.toFixed(2)}x`;
const fmtProb = p => `${Math.round(p * 100)}%`;

export default function RiskSimulator({ deal }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(1000);

  const canRun = deal && deal.purchasePrice > 0 && deal.monthlyIncome > 0;

  function run() {
    if (!canRun) return;
    setRunning(true);
    // Defer to next paint so the spinner shows before the 50-200ms sim block
    setTimeout(() => {
      const r = runMonteCarlo(deal, { iterations });
      setResults(r);
      setRunning(false);
    }, 50);
  }

  return (
    <div className="mf-card" style={{ marginTop: 16 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--borderf)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
          color: "var(--purple)", letterSpacing: "1.6px",
        }}>
          ▸ INSTITUTIONAL RISK SIMULATOR
        </div>
        <div style={{
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 600,
          color: "var(--dim)", letterSpacing: "0.7px",
        }}>
          · MONTE CARLO · {iterations.toLocaleString()} SIMULATIONS
        </div>
        <button
          onClick={run}
          disabled={!canRun || running}
          style={{
            marginLeft: "auto",
            background: running ? "rgba(167,130,255,0.15)" : "var(--purple)",
            color: running ? "var(--purple)" : "#07090f",
            border: "none", borderRadius: 4,
            padding: "8px 16px",
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
            letterSpacing: "1px",
            cursor: canRun && !running ? "pointer" : "not-allowed",
            opacity: canRun ? 1 : 0.4,
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => { if (canRun && !running) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
        >
          {running ? "RUNNING…" : results ? "▶ RE-RUN SIMULATION" : "▶ RUN SIMULATION"}
        </button>
      </div>

      {/* Body */}
      {!canRun ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
          Enter a purchase price and monthly income in the assumptions above to run a Monte Carlo simulation.
        </div>
      ) : !results ? (
        <div style={{ padding: "22px 20px", color: "var(--sub)", fontSize: 13, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--purple)" }}>What this does:</strong> runs your deal through
            {" "}{iterations.toLocaleString()} randomised scenarios. Each scenario draws:
          </p>
          <ul style={{ paddingLeft: 18, marginBottom: 12, color: "var(--sub)" }}>
            <li style={{ marginBottom: 4 }}>Rent growth ~ N(3%, 1%)</li>
            <li style={{ marginBottom: 4 }}>Vacancy ~ N(7%, 2%)</li>
            <li style={{ marginBottom: 4 }}>Interest-rate shock ~ N(0%, 0.75%) — a 1.5% rate move = 2σ</li>
            <li style={{ marginBottom: 4 }}>Exit cap ~ N(entry + 0.25, 0.5%) — modest cap expansion</li>
            <li style={{ marginBottom: 4 }}>Construction overrun ~ LogNormal (median on-budget, σ=0.15)</li>
          </ul>
          <p>
            Outputs are <strong style={{color:"var(--text)"}}>P10 / P50 / P90</strong> for IRR, equity multiple, and minimum DSCR, plus the probability of meeting your DSCR &amp; IRR thresholds.
          </p>
        </div>
      ) : (
        <Results results={results} target={deal.targetIRR ?? 0.15} />
      )}
    </div>
  );
}

function Results({ results, target }) {
  const { irr, eqMult, minDSCR, probabilities, distributions } = results;

  return (
    <div style={{ padding: 18 }}>
      {/* Percentile table */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: 1,
        background: "var(--borderf)",
        border: "1px solid var(--borderf)",
        borderRadius: 5,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <Cell head>METRIC</Cell>
        <Cell head right>P10 · DOWNSIDE</Cell>
        <Cell head right>P50 · MEDIAN</Cell>
        <Cell head right>P90 · UPSIDE</Cell>

        <Cell label>IRR (5-yr)</Cell>
        <Cell right value={fmtPct(irr.p10)} color={pickColorIRR(irr.p10)}/>
        <Cell right value={fmtPct(irr.p50)} color={pickColorIRR(irr.p50)} bold/>
        <Cell right value={fmtPct(irr.p90)} color={pickColorIRR(irr.p90)}/>

        <Cell label>Equity Multiple</Cell>
        <Cell right value={fmtX(eqMult.p10)}  color={pickColorMult(eqMult.p10)}/>
        <Cell right value={fmtX(eqMult.p50)}  color={pickColorMult(eqMult.p50)} bold/>
        <Cell right value={fmtX(eqMult.p90)}  color={pickColorMult(eqMult.p90)}/>

        <Cell label>Min DSCR (over hold)</Cell>
        <Cell right value={fmtX(minDSCR.p10)} color={pickColorDSCR(minDSCR.p10)}/>
        <Cell right value={fmtX(minDSCR.p50)} color={pickColorDSCR(minDSCR.p50)} bold/>
        <Cell right value={fmtX(minDSCR.p90)} color={pickColorDSCR(minDSCR.p90)}/>
      </div>

      {/* Probability bars */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1.2px", marginBottom: 8 }}>
          ▸ PROBABILITY OF OUTCOME
        </div>
        <Bar label="Positive IRR"             p={probabilities.positiveIRR} good={0.95}/>
        <Bar label="DSCR ≥ 1.25 throughout"   p={probabilities.meetsDSCR125} good={0.90}/>
        <Bar label={`IRR ≥ ${fmtPct(target)} target`} p={probabilities.meetsIRRTarget} good={0.70}/>
      </div>

      {/* IRR distribution histogram */}
      <div>
        <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1.2px", marginBottom: 8 }}>
          ▸ IRR DISTRIBUTION · {distributions.irr.length.toLocaleString()} SIMS
        </div>
        <Histogram values={distributions.irr} target={target} median={irr.p50}/>
      </div>

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "rgba(167,130,255,0.05)",
        border: "1px solid rgba(167,130,255,0.2)",
        borderRadius: 4,
        fontSize: 12, color: "var(--sub)", lineHeight: 1.55,
      }}>
        <strong style={{color:"var(--purple)"}}>▸ READING THIS:</strong>{" "}
        The <span style={{color:"var(--text)",fontWeight:700}}>P50 row</span> is the median outcome — half of scenarios do better, half worse.{" "}
        The <span style={{color:"var(--text)",fontWeight:700}}>P10 row</span> is your "things went wrong" downside.{" "}
        For an institutional LP, the median should hit target and the P10 should stay above 0.
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────
function Cell({ children, value, head, label, right, bold, color }) {
  return (
    <div style={{
      background: "var(--card)",
      padding: "9px 14px",
      fontFamily: "'Fira Code',ui-monospace,monospace",
      fontSize: head ? 9.5 : (bold ? 16 : 14),
      fontWeight: head ? 700 : (bold ? 700 : 500),
      color: head ? "var(--dim)" : (color || "var(--text)"),
      letterSpacing: head ? "1px" : "-0.3px",
      textTransform: head ? "uppercase" : "none",
      textAlign: right ? "right" : "left",
    }}>
      {value != null ? value : (label != null ? <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: "var(--sub)", fontWeight: 500, letterSpacing: 0 }}>{label}</span> : children)}
    </div>
  );
}

function Bar({ label, p, good }) {
  const pct = Math.max(0, Math.min(1, p));
  const color = pct >= good ? "var(--green)" : pct >= good * 0.7 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 50px", gap: 12, alignItems: "center", marginBottom: 6 }}>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "var(--text)" }}>{label}</div>
      <div style={{ height: 16, background: "rgba(255,255,255,0.04)", border: "1px solid var(--borderf)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: color, transition: "width 0.6s" }} />
      </div>
      <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 13, fontWeight: 700, color, textAlign: "right" }}>
        {fmtProb(pct)}
      </div>
    </div>
  );
}

function Histogram({ values, target, median }) {
  const bins = useMemo(() => {
    if (!values.length) return [];
    const min = values[0];
    const max = values[values.length - 1];
    const N = 30;
    const w = (max - min) / N || 1;
    const out = new Array(N).fill(0);
    for (const v of values) {
      const i = Math.min(N - 1, Math.max(0, Math.floor((v - min) / w)));
      out[i]++;
    }
    return out.map((count, i) => ({ x0: min + i * w, x1: min + (i + 1) * w, count }));
  }, [values]);

  if (!bins.length) return null;
  const maxCount = Math.max(...bins.map(b => b.count));

  const W = 600, H = 140, PAD = 26;
  const bw = (W - PAD * 2) / bins.length;
  const xScale = (v) => PAD + ((v - bins[0].x0) / (bins[bins.length - 1].x1 - bins[0].x0)) * (W - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Bars */}
      {bins.map((b, i) => {
        const h = (b.count / maxCount) * H;
        const negative = b.x1 <= 0;
        const aboveTarget = b.x0 >= target;
        const color = negative ? "rgba(242,92,92,0.7)" : aboveTarget ? "rgba(52,217,138,0.7)" : "rgba(167,130,255,0.55)";
        return (
          <rect
            key={i}
            x={PAD + i * bw + 0.5}
            y={H - h}
            width={Math.max(1, bw - 1)}
            height={h}
            fill={color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Zero baseline if present */}
      {bins[0].x0 < 0 && bins[bins.length-1].x1 > 0 && (
        <line x1={xScale(0)} y1={0} x2={xScale(0)} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="2 2"/>
      )}

      {/* Target line */}
      {target >= bins[0].x0 && target <= bins[bins.length-1].x1 && (
        <>
          <line x1={xScale(target)} y1={0} x2={xScale(target)} y2={H} stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="4 2"/>
          <text x={xScale(target)} y={H + 16} textAnchor="middle" fill="var(--amber)" style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
            TARGET {fmtPct(target)}
          </text>
        </>
      )}

      {/* Median line */}
      {median != null && (
        <>
          <line x1={xScale(median)} y1={0} x2={xScale(median)} y2={H} stroke="var(--blue)" strokeWidth="1.5"/>
        </>
      )}

      {/* X-axis labels */}
      <text x={PAD}        y={H + 16} textAnchor="start" fill="var(--dim)" style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 600 }}>
        {fmtPct(bins[0].x0)}
      </text>
      <text x={W - PAD}    y={H + 16} textAnchor="end"   fill="var(--dim)" style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9, fontWeight: 600 }}>
        {fmtPct(bins[bins.length-1].x1)}
      </text>
    </svg>
  );
}

// ── Color thresholds ────────────────────────────────────────────────────
function pickColorIRR(v)  { if (v == null) return "var(--sub)"; if (v >= 0.18) return "var(--green)"; if (v >= 0.12) return "var(--blue)"; if (v >= 0.06) return "var(--amber)"; return "var(--red)"; }
function pickColorMult(v) { if (v == null) return "var(--sub)"; if (v >= 2.0)  return "var(--green)"; if (v >= 1.5)  return "var(--blue)"; if (v >= 1.0)  return "var(--amber)"; return "var(--red)"; }
function pickColorDSCR(v) { if (v == null) return "var(--sub)"; if (v >= 1.25) return "var(--green)"; if (v >= 1.0)  return "var(--amber)"; return "var(--red)"; }
