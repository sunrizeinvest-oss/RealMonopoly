import { useMemo, useState, useEffect } from "react";
import { runMonteCarlo, DEFAULT_DISTRIBUTIONS } from "../lib/monteCarlo";
import { generateTier2Report } from "../lib/tier2Report";

// Institutional-style preset scenarios. Each maps to a delta from DEFAULT_DISTRIBUTIONS.
// Bull = optimistic priors, Bear = stressed priors. Base = the defaults.
const PRESETS = {
  base: {
    label: "BASE",
    description: "Conservative institutional defaults — 3% rent growth, modest cap expansion, 7% vacancy.",
    overrides: {},
  },
  bull: {
    label: "BULL",
    description: "Tight market: stronger rent growth, lower vacancy, cap compression, no rate shock.",
    overrides: {
      rentGrowthMean: 4.5, rentGrowthSigma: 0.8,
      vacancyMean: 5.0, vacancySigma: 1.2,
      rateShockMean: -0.25, rateShockSigma: 0.5,
      exitCapSigma: 0.3,
      constructionMedian: 0.95, constructionSigma: 0.10,
    },
  },
  bear: {
    label: "BEAR",
    description: "Recessionary stress: rate spike risk, elevated vacancy, cap expansion, cost overruns.",
    overrides: {
      rentGrowthMean: 1.0, rentGrowthSigma: 1.5,
      vacancyMean: 11.0, vacancySigma: 3.0,
      rateShockMean: 1.0, rateShockSigma: 1.0,
      exitCapMean: null, exitCapSigma: 1.0,
      opexGrowthMean: 3.5, opexGrowthSigma: 0.8,
      constructionMedian: 1.15, constructionSigma: 0.25,
    },
  },
};

const PRIOR_FIELDS = [
  { key: "rentGrowthMean",     label: "Rent growth · mean",       suffix: "%/yr", min: -5, max: 12, step: 0.1 },
  { key: "rentGrowthSigma",    label: "Rent growth · σ",          suffix: "%/yr", min: 0, max: 5, step: 0.1 },
  { key: "vacancyMean",        label: "Vacancy · mean",           suffix: "%", min: 0, max: 25, step: 0.5 },
  { key: "vacancySigma",       label: "Vacancy · σ",              suffix: "%", min: 0, max: 8, step: 0.25 },
  { key: "rateShockMean",      label: "Rate shock · mean",        suffix: "%/yr", min: -2, max: 4, step: 0.1 },
  { key: "rateShockSigma",     label: "Rate shock · σ",           suffix: "%/yr", min: 0, max: 3, step: 0.1 },
  { key: "exitCapSigma",       label: "Exit cap · σ",             suffix: "%", min: 0, max: 2, step: 0.05 },
  { key: "opexGrowthMean",     label: "OpEx growth · mean",       suffix: "%/yr", min: 0, max: 8, step: 0.1 },
  { key: "opexGrowthSigma",    label: "OpEx growth · σ",          suffix: "%/yr", min: 0, max: 3, step: 0.1 },
  { key: "constructionMedian", label: "Construction · multiplier", suffix: "x",   min: 0.7, max: 1.5, step: 0.01 },
  { key: "constructionSigma",  label: "Construction · log-σ",      suffix: "",    min: 0, max: 0.5, step: 0.01 },
];

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

export default function RiskSimulator({ deal, calcSummary }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(1000);
  const [activePreset, setActivePreset] = useState("base");
  const [priors, setPriors] = useState(() => {
    try {
      const stored = localStorage.getItem("rde_risk_priors");
      if (stored) return { ...DEFAULT_DISTRIBUTIONS, ...JSON.parse(stored) };
    } catch {}
    return { ...DEFAULT_DISTRIBUTIONS };
  });
  const [showPriors, setShowPriors] = useState(false);

  // Saved named scenarios — each is {id, name, priors, savedAt}.
  // Lets a Scale user keep "RBC Stress Test", "LP Conservative", "My Bear
  // Case" side-by-side and swap them in with one click on any deal.
  const SCENARIOS_KEY = "rde_risk_scenarios_v1";
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try {
      const raw = localStorage.getItem(SCENARIOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  useEffect(() => {
    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(savedScenarios)); } catch {}
  }, [savedScenarios]);

  function saveScenario() {
    const name = window.prompt("Name this scenario (e.g. \"RBC Stress Test\", \"LP Conservative\"):");
    if (!name || !name.trim()) return;
    const trimmed = name.trim().slice(0, 40);
    const id = `s_${Math.random().toString(36).slice(2, 9)}`;
    const entry = { id, name: trimmed, priors: { ...priors }, savedAt: new Date().toISOString() };
    setSavedScenarios(s => [entry, ...s].slice(0, 12));
    setActiveScenarioId(id);
  }
  function loadScenario(id) {
    const s = savedScenarios.find(x => x.id === id);
    if (!s) return;
    setPriors({ ...DEFAULT_DISTRIBUTIONS, ...s.priors });
    setActivePreset("custom");
    setActiveScenarioId(id);
  }
  function deleteScenario(id) {
    setSavedScenarios(s => s.filter(x => x.id !== id));
    if (activeScenarioId === id) setActiveScenarioId(null);
  }

  // Persist any prior tweaks
  useEffect(() => {
    try { localStorage.setItem("rde_risk_priors", JSON.stringify(priors)); } catch {}
  }, [priors]);

  const canRun = deal && deal.purchasePrice > 0 && deal.monthlyIncome > 0;

  function run() {
    if (!canRun) return;
    setRunning(true);
    setTimeout(() => {
      const r = runMonteCarlo(deal, { iterations, distributions: priors });
      setResults(r);
      setRunning(false);
    }, 50);
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    setActivePreset(key);
    setActiveScenarioId(null);
    setPriors({ ...DEFAULT_DISTRIBUTIONS, ...p.overrides });
  }
  function tweakPrior(key, value) {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    setActivePreset("custom");
    setActiveScenarioId(null);
    setPriors(p => ({ ...p, [key]: n }));
  }
  function resetPriors() {
    setActivePreset("base");
    setActiveScenarioId(null);
    setPriors({ ...DEFAULT_DISTRIBUTIONS });
  }

  function exportICReport() {
    const doc = generateTier2Report({
      deal: {
        address: deal?.address || "Multifamily Property",
        propertyType: "Multifamily",
        purchasePrice: deal?.purchasePrice,
      },
      calc: calcSummary || {
        capRate: (deal?.monthlyIncome * 12 * 0.62) / (deal?.purchasePrice || 1),
        irr: results?.irr?.p50,
        eqMultiple: results?.eqMult?.p50,
        DSCR: results?.minDSCR?.p50,
      },
      monteCarloResults: results,
      presetName: PRESETS[activePreset]?.label || "CUSTOM",
      priors,
    });
    const fname = `realdeal-ic-report-${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fname);
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
          · MONTE CARLO · {iterations.toLocaleString()} SIMS · {PRESETS[activePreset]?.label || "CUSTOM"} PRIORS
        </div>
        <button
          onClick={() => setShowPriors(v => !v)}
          style={{
            background: "transparent", color: "var(--sub)",
            border: "1px solid var(--borderf)", borderRadius: 4,
            padding: "7px 12px",
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700,
            letterSpacing: "1px",
            cursor: "pointer",
          }}
        >
          {showPriors ? "HIDE PRIORS ▴" : "📊 CUSTOMIZE PRIORS"}
        </button>
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
        {results && (
          <button
            onClick={exportICReport}
            style={{
              background: "transparent", color: "var(--green)",
              border: "1px solid var(--green)", borderRadius: 4,
              padding: "8px 14px",
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: "1px", cursor: "pointer",
            }}
          >
            📄 EXPORT IC REPORT
          </button>
        )}
      </div>

      {/* Priors editor */}
      {showPriors && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--borderf)", background: "rgba(167,130,255,0.02)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: "1.2px" }}>
              ▸ SCENARIO PRESETS
            </div>
            {Object.entries(PRESETS).map(([key, p]) => {
              const active = activePreset === key;
              const color = key === "bull" ? "var(--green)" : key === "bear" ? "var(--red)" : "var(--blue)";
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  style={{
                    background: active ? color : "transparent",
                    color: active ? "#07090f" : color,
                    border: `1px solid ${color}`,
                    borderRadius: 3,
                    padding: "5px 10px",
                    fontFamily: "'Fira Code',ui-monospace,monospace",
                    fontSize: 10, fontWeight: 700, letterSpacing: "1px",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={resetPriors}
              style={{
                background: "transparent", color: "var(--sub)",
                border: "1px solid var(--borderf)", borderRadius: 3,
                padding: "5px 10px",
                fontFamily: "'Fira Code',ui-monospace,monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
                cursor: "pointer", marginLeft: "auto",
              }}
            >
              ↺ RESET
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.5, marginBottom: 14, fontStyle: "italic" }}>
            {PRESETS[activePreset]?.description || "Custom priors — your tuned distributions. Cleared on Reset; saved across sessions in localStorage."}
          </div>

          {/* Saved named scenarios — Scale users save "RBC Stress Test", "LP
              Conservative", "My Bear Case" and swap them in with one click. */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap",
            padding: "10px 12px",
            background: "rgba(74,158,255,0.04)",
            border: "1px solid rgba(74,158,255,0.18)",
            borderLeft: "3px solid var(--blue)",
            borderRadius: 4,
          }}>
            <div style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.2px", flexShrink: 0 }}>
              ▸ MY SCENARIOS
            </div>
            {savedScenarios.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>
                None saved yet. Tune the priors below, then "Save as scenario" to recall later on any deal.
              </span>
            )}
            {savedScenarios.map(s => {
              const active = activeScenarioId === s.id;
              return (
                <div key={s.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 0,
                  background: active ? "var(--blue)" : "transparent",
                  border: `1px solid var(--blue)`,
                  borderRadius: 3,
                  overflow: "hidden",
                }}>
                  <button
                    onClick={() => loadScenario(s.id)}
                    title={`Saved ${new Date(s.savedAt).toLocaleDateString()}`}
                    style={{
                      background: "transparent",
                      color: active ? "#07090f" : "var(--blue)",
                      border: "none",
                      padding: "5px 10px",
                      fontFamily: "'Fira Code',ui-monospace,monospace",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
                      cursor: "pointer", maxWidth: 200,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => deleteScenario(s.id)}
                    title="Delete this scenario"
                    style={{
                      background: "transparent",
                      color: active ? "#07090f" : "var(--blue)",
                      border: "none",
                      borderLeft: `1px solid ${active ? "rgba(7,9,15,0.3)" : "var(--blue)"}`,
                      padding: "5px 8px",
                      fontFamily: "'Fira Code',ui-monospace,monospace",
                      fontSize: 10, fontWeight: 700,
                      cursor: "pointer", opacity: 0.7,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              onClick={saveScenario}
              style={{
                marginLeft: "auto",
                background: "var(--blue)",
                color: "#07090f",
                border: "1px solid var(--blue)",
                borderRadius: 3,
                padding: "5px 11px",
                fontFamily: "'Fira Code',ui-monospace,monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              ＋ SAVE AS SCENARIO
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {PRIOR_FIELDS.map(f => (
              <div key={f.key} style={{
                background: "var(--card2, #0a0e18)",
                border: "1px solid var(--borderf)",
                borderRadius: 4,
                padding: "8px 10px",
              }}>
                <div style={{
                  fontFamily: "'Fira Code',ui-monospace,monospace",
                  fontSize: 9, fontWeight: 700,
                  color: "var(--dim)", letterSpacing: "0.8px",
                  textTransform: "uppercase", marginBottom: 4,
                }}>
                  {f.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <input
                    type="number"
                    value={priors[f.key] ?? ""}
                    onChange={e => tweakPrior(f.key, e.target.value)}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    style={{
                      flex: 1, minWidth: 0,
                      background: "transparent",
                      border: "1px solid var(--borderf)",
                      borderRadius: 3,
                      padding: "4px 7px",
                      fontFamily: "'Fira Code',ui-monospace,monospace",
                      fontSize: 12, fontWeight: 700,
                      color: "var(--text)", outline: "none",
                    }}
                  />
                  {f.suffix && (
                    <span style={{ fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>
                      {f.suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
