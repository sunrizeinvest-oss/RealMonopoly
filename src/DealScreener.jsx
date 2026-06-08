import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
const num = (v) => parseFloat(String(v).replace(/,/g, "")) || 0;
const fmtPct = (n) =>
  isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;

const PIPELINE_KEY = "rde_pipeline_v1";
const PREFILL_KEY = "rde_prefill";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* ── Nav ── */
  .ds-nav{position:sticky;top:0;z-index:200;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 16px;height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .ds-logo{font-size:15px;font-weight:800;color:var(--text);text-decoration:none;flex-shrink:0}
  .ds-logo span{color:var(--blue)}
  .ds-nav-links{display:flex;align-items:center;gap:2px}
  .ds-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 9px;border-radius:7px;transition:color 0.15s,background 0.15s}
  .ds-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.04)}
  .ds-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.08)}

  /* ── Page wrap ── */
  .ds-wrap{max-width:480px;margin:0 auto;padding:20px 16px 60px}

  /* ── Title ── */
  .ds-title{font-size:20px;font-weight:800;letter-spacing:-0.4px;text-align:center;margin-bottom:2px}
  .ds-sub{font-size:13px;color:var(--sub);text-align:center;margin-bottom:22px}

  /* ── Address strip ── */
  .ds-addr-wrap{margin-bottom:16px}
  .ds-addr-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;display:block}
  .ds-addr-input{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:12px 16px;font-size:15px;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border-color 0.15s}
  .ds-addr-input:focus{border-color:var(--blue)}
  .ds-addr-input::placeholder{color:var(--dim)}

  /* ── Big input card ── */
  .ds-input-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px 20px 18px;margin-bottom:12px;transition:border-color 0.2s}
  .ds-input-card:focus-within{border-color:rgba(59,158,255,0.4)}
  .ds-input-label{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block}
  .ds-input-hint{font-size:11px;color:var(--dim);margin-top:4px}
  .ds-big-input-wrap{display:flex;align-items:center;gap:8px}
  .ds-big-prefix{font-size:32px;font-weight:800;color:var(--dim);line-height:1;padding-top:2px;flex-shrink:0}
  .ds-big-input{background:transparent;border:none;outline:none;font-size:32px;font-weight:800;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;letter-spacing:-1px;-moz-appearance:textfield}
  .ds-big-input::-webkit-outer-spin-button,.ds-big-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .ds-big-input::placeholder{color:var(--dim)}

  /* ── Details toggle ── */
  .ds-more-btn{background:transparent;border:1px solid var(--borderf);border-radius:6px;padding:10px 16px;font-size:13px;font-weight:700;color:var(--sub);cursor:pointer;width:100%;font-family:'DM Sans',sans-serif;margin-bottom:12px;transition:all 0.15s;text-align:left;display:flex;align-items:center;justify-content:space-between}
  .ds-more-btn:hover{color:var(--text);border-color:rgba(255,255,255,0.15)}
  .ds-details-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px;margin-bottom:16px}
  .ds-details-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .ds-sm-field{display:flex;flex-direction:column;gap:4px}
  .ds-sm-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px}
  .ds-sm-input{background:var(--card2);border:1px solid var(--borderf);border-radius:8px;padding:8px 10px;font-size:14px;font-weight:700;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;width:100%;transition:border-color 0.15s;-moz-appearance:textfield}
  .ds-sm-input::-webkit-outer-spin-button,.ds-sm-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .ds-sm-input:focus{border-color:var(--blue)}

  /* ── Verdict block ── */
  .ds-verdict{border-radius:6px;padding:24px 22px;margin-bottom:16px;text-align:center;border:2px solid transparent;transition:all 0.3s}
  .ds-verdict.strong{background:rgba(52,217,138,0.07);border-color:rgba(52,217,138,0.3)}
  .ds-verdict.thin{background:rgba(240,160,48,0.07);border-color:rgba(240,160,48,0.3)}
  .ds-verdict.pass{background:rgba(242,92,92,0.07);border-color:rgba(242,92,92,0.3)}
  .ds-verdict.empty{background:var(--card);border-color:var(--borderf)}

  .ds-verdict-icon{font-size:36px;line-height:1;margin-bottom:8px}
  .ds-verdict-label{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;opacity:0.7}
  .ds-verdict-text{font-size:17px;font-weight:800;line-height:1.3;letter-spacing:-0.3px}
  .verdict-green{color:var(--green)}
  .verdict-amber{color:var(--amber)}
  .verdict-red{color:var(--red)}
  .verdict-dim{color:var(--sub)}

  /* ── MAO number ── */
  .ds-mao-wrap{text-align:center;margin:10px 0 6px}
  .ds-mao-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .ds-mao-num{font-size:52px;font-weight:800;letter-spacing:-2px;line-height:1;transition:color 0.3s}
  .ds-mao-sub{font-size:12px;color:var(--sub);margin-top:4px}

  /* ── Metrics grid ── */
  .ds-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .ds-metric-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:14px 16px}
  .ds-metric-label{font-family:'Fira Code',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .ds-metric-value{font-family:'Fira Code',ui-monospace,monospace;font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;color:var(--text)}
  .ds-metric-sub{font-size:11px;color:var(--sub);margin-top:2px}

  /* ── Action buttons ── */
  .ds-actions{display:flex;flex-direction:column;gap:10px;margin-top:8px}
  .ds-btn{border:none;border-radius:6px;padding:16px 20px;font-size:16px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;width:100%;letter-spacing:-0.2px;transition:opacity 0.15s,transform 0.1s;-webkit-tap-highlight-color:transparent}
  .ds-btn:active{transform:scale(0.98)}
  .ds-btn:hover{opacity:0.88}
  .ds-btn-primary{background:var(--blue);color:#fff}
  .ds-btn-secondary{background:rgba(167,130,255,0.12);color:var(--purple);border:1px solid rgba(167,130,255,0.25) !important}
  .ds-btn-ghost{background:rgba(255,255,255,0.04);color:var(--sub);border:1px solid var(--borderf) !important}
  .ds-btn-row{display:flex;gap:10px}
  .ds-btn-row .ds-btn{flex:1}

  /* ── Toast ── */
  .ds-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--green);color:#07090f;border-radius:6px;padding:10px 20px;font-size:13px;font-weight:800;z-index:999;pointer-events:none;animation:ds-fade-in 0.2s ease;white-space:nowrap}
  @keyframes ds-fade-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

  /* ── Rule of thumb callout ── */
  .ds-rule{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--sub);line-height:1.5}
  .ds-rule strong{color:var(--blue)}

  /* ── Divider ── */
  .ds-divider{height:1px;background:var(--borderf);margin:14px 0}
`;

// ─── Component ───────────────────────────────────────────────────────────────
export default function DealScreener() {
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [arv, setArv] = useState("");
  const [repairs, setRepairs] = useState("");

  // Optional advanced inputs
  const [showMore, setShowMore] = useState(false);
  const [holdMonths, setHoldMonths] = useState("6");
  const [realtorPct, setRealtorPct] = useState("5");
  const [closingPct, setClosingPct] = useState("3");

  const [toast, setToast] = useState("");

  // ── Computed results ──────────────────────────────────────────────────────
  const results = useMemo(() => {
    const asking = num(askingPrice);
    const a = num(arv);
    const r = num(repairs);
    const hold = num(holdMonths) || 6;
    const realtor = num(realtorPct) / 100;
    const closing = num(closingPct) / 100;

    if (!asking && !a && !r) return null;

    // 70% rule MAO
    const mao = a * 0.7 - r;

    // Spread (how much room between asking and MAO)
    const spread = mao - asking;

    // Quick profit estimate
    const sellingCosts = a * (realtor + closing);
    const quickProfit = a - asking - r - sellingCosts;

    // ROI
    const invested = asking + r;
    const roi = invested > 0 ? quickProfit / invested : 0;

    // Verdict
    let verdict, verdictClass, verdictIcon, verdictColor;
    const spreadPct = mao > 0 ? spread / mao : 0;

    if (asking === 0 && a === 0 && r === 0) {
      verdict = null;
    } else if (spread > 0 && spreadPct > 0.05) {
      verdictClass = "strong";
      verdictIcon = "🟢";
      verdictColor = "verdict-green";
      verdict = `STRONG DEAL — Asking is ${fmt(spread)} BELOW your max offer`;
    } else if (spread >= 0) {
      verdictClass = "thin";
      verdictIcon = "🟡";
      verdictColor = "verdict-amber";
      verdict = `THIN DEAL — Asking is within ${fmt(Math.abs(spread))} of max offer`;
    } else {
      verdictClass = "pass";
      verdictIcon = "🔴";
      verdictColor = "verdict-red";
      verdict = `PASS — Asking is ${fmt(Math.abs(spread))} ABOVE your max offer`;
    }

    const maoColor =
      verdictClass === "strong"
        ? "var(--green)"
        : verdictClass === "thin"
        ? "var(--amber)"
        : a > 0 || r > 0
        ? "var(--red)"
        : "var(--sub)";

    return {
      mao,
      spread,
      quickProfit,
      roi,
      verdict,
      verdictClass: verdictClass || "empty",
      verdictIcon: verdictIcon || "—",
      verdictColor: verdictColor || "verdict-dim",
      maoColor,
    };
  }, [askingPrice, arv, repairs, holdMonths, realtorPct, closingPct]);

  // ── Send to Flip Analyzer ─────────────────────────────────────────────────
  function goAnalyze() {
    const prefill = {
      askingPrice: num(askingPrice),
      arv: num(arv),
      repairCosts: num(repairs),
      address,
    };
    localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    navigate("/app");
  }

  // ── Add to Pipeline ───────────────────────────────────────────────────────
  function addToPipeline() {
    try {
      const existing = JSON.parse(localStorage.getItem(PIPELINE_KEY)) || [];
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        address: address || "Unknown Address",
        stage: "lead",
        type: "flip",
        askingPrice: num(askingPrice),
        arv: num(arv),
        repairCosts: num(repairs),
        projectedProfit: results?.quickProfit || 0,
        addedDate: new Date().toISOString().slice(0, 10),
        stageDate: new Date().toISOString().slice(0, 10),
        source: "Deal Screener",
        notes: `Screened via Deal Screener. MAO: ${fmt(results?.mao)}, Spread: ${fmt(results?.spread)}`,
      };
      existing.push(entry);
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(existing));
      showToast("Added to Pipeline!");
    } catch {
      showToast("Error saving to pipeline");
    }
  }

  // ── Share / copy ──────────────────────────────────────────────────────────
  function shareResult() {
    if (!results) return;
    const verdict =
      results.verdictClass === "strong"
        ? "GO"
        : results.verdictClass === "thin"
        ? "THIN"
        : "PASS";
    const text = [
      address ? `Deal at ${address}` : "Deal",
      `Ask: ${fmt(num(askingPrice))}`,
      `ARV: ${fmt(num(arv))}`,
      `Repairs: ${fmt(num(repairs))}`,
      `Quick profit: ${fmt(results.quickProfit)}`,
      `Max offer (70% rule): ${fmt(results.mao)}`,
      `Verdict: ${verdict}`,
    ].join(" | ");
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard!"))
      .catch(() => showToast("Copy failed — try manually"));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const hasInputs = num(askingPrice) > 0 || num(arv) > 0 || num(repairs) > 0;

  return (
    <>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <nav className="ds-nav">
        <a href="/" className="ds-logo">
          Real <span>Deal</span>
        </a>
        <div className="ds-nav-links">
          <a href="/analyze" className="ds-nav-link">Analyze</a>
          <a href="/screen" className="ds-nav-link active">Screener</a>
        </div>
      </nav>

      <div className="ds-wrap">
        <div className="ds-title">Deal Screener</div>
        <div className="ds-sub">3 numbers → instant pass/fail in 5 seconds</div>

        {/* ── Address ── */}
        <div className="ds-addr-wrap">
          <span className="ds-addr-label">Property Address (optional)</span>
          <input
            className="ds-addr-input"
            placeholder="123 Main St, City, ST"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* ── 3 big inputs ── */}
        <div className="ds-input-card">
          <span className="ds-input-label">Asking Price</span>
          <div className="ds-big-input-wrap">
            <span className="ds-big-prefix">$</span>
            <input
              className="ds-big-input"
              type="number"
              inputMode="numeric"
              placeholder="250,000"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
            />
          </div>
          <div className="ds-input-hint">What the seller is asking</div>
        </div>

        <div className="ds-input-card">
          <span className="ds-input-label">After Repair Value (ARV)</span>
          <div className="ds-big-input-wrap">
            <span className="ds-big-prefix">$</span>
            <input
              className="ds-big-input"
              type="number"
              inputMode="numeric"
              placeholder="350,000"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
            />
          </div>
          <div className="ds-input-hint">What it's worth fully renovated</div>
        </div>

        <div className="ds-input-card">
          <span className="ds-input-label">Estimated Repairs</span>
          <div className="ds-big-input-wrap">
            <span className="ds-big-prefix">$</span>
            <input
              className="ds-big-input"
              type="number"
              inputMode="numeric"
              placeholder="45,000"
              value={repairs}
              onChange={(e) => setRepairs(e.target.value)}
            />
          </div>
          <div className="ds-input-hint">Rough rehab cost estimate</div>
        </div>

        {/* ── Optional details ── */}
        <button className="ds-more-btn" onClick={() => setShowMore((v) => !v)}>
          <span>Add more details</span>
          <span>{showMore ? "▲" : "▼"}</span>
        </button>

        {showMore && (
          <div className="ds-details-card">
            <div className="ds-details-grid">
              <div className="ds-sm-field">
                <label className="ds-sm-label">Hold Months</label>
                <input
                  className="ds-sm-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="6"
                  value={holdMonths}
                  onChange={(e) => setHoldMonths(e.target.value)}
                />
              </div>
              <div className="ds-sm-field">
                <label className="ds-sm-label">Realtor %</label>
                <input
                  className="ds-sm-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="5"
                  value={realtorPct}
                  onChange={(e) => setRealtorPct(e.target.value)}
                />
              </div>
              <div className="ds-sm-field">
                <label className="ds-sm-label">Closing %</label>
                <input
                  className="ds-sm-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="3"
                  value={closingPct}
                  onChange={(e) => setClosingPct(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Live results ── */}
        {hasInputs && results && (
          <>
            {/* MAO */}
            <div className="ds-mao-wrap">
              <div className="ds-mao-label">Your Max Offer (70% Rule)</div>
              <div className="ds-mao-num" style={{ color: results.maoColor }}>
                {fmt(results.mao)}
              </div>
              <div className="ds-mao-sub">ARV × 70% − Repairs</div>
            </div>

            {/* Verdict */}
            {results.verdict && (
              <div className={`ds-verdict ${results.verdictClass}`}>
                <div className="ds-verdict-icon">{results.verdictIcon}</div>
                <div className="ds-verdict-label">Quick Verdict</div>
                <div className={`ds-verdict-text ${results.verdictColor}`}>
                  {results.verdict}
                </div>
              </div>
            )}

            {/* 4 quick metrics */}
            <div className="ds-metrics">
              <div className="ds-metric-card">
                <div className="ds-metric-label">Spread</div>
                <div
                  className="ds-metric-value"
                  style={{
                    color:
                      results.spread > 0
                        ? "var(--green)"
                        : results.spread === 0
                        ? "var(--amber)"
                        : "var(--red)",
                  }}
                >
                  {results.spread >= 0 ? "+" : ""}
                  {fmt(results.spread)}
                </div>
                <div className="ds-metric-sub">MAO minus asking price</div>
              </div>

              <div className="ds-metric-card">
                <div className="ds-metric-label">Quick Profit Est.</div>
                <div
                  className="ds-metric-value"
                  style={{
                    color: results.quickProfit > 0 ? "var(--green)" : "var(--red)",
                  }}
                >
                  {fmt(results.quickProfit)}
                </div>
                <div className="ds-metric-sub">After sell costs</div>
              </div>

              <div className="ds-metric-card">
                <div className="ds-metric-label">Quick ROI</div>
                <div
                  className="ds-metric-value"
                  style={{
                    color:
                      results.roi > 0.15
                        ? "var(--green)"
                        : results.roi > 0
                        ? "var(--amber)"
                        : "var(--red)",
                  }}
                >
                  {fmtPct(results.roi)}
                </div>
                <div className="ds-metric-sub">Profit / (Ask + Repairs)</div>
              </div>

              <div className="ds-metric-card">
                <div className="ds-metric-label">70% Rule Says</div>
                <div className="ds-metric-value" style={{ color: "var(--blue)" }}>
                  {fmt(results.mao)}
                </div>
                <div className="ds-metric-sub">Max you should pay</div>
              </div>
            </div>

            {/* Rule of thumb callout */}
            <div className="ds-rule">
              <strong>70% Rule:</strong> Max offer = ARV × 0.70 − Repairs. This
              leaves room for holding costs, financing, and a profit margin. Use
              the full analyzer for a detailed breakdown.
            </div>

            <div className="ds-divider" />

            {/* Action buttons */}
            <div className="ds-actions">
              <button className="ds-btn ds-btn-primary" onClick={goAnalyze}>
                Analyze in Flip Calculator →
              </button>
              <div className="ds-btn-row">
                <button className="ds-btn ds-btn-secondary" onClick={addToPipeline}>
                  + Add to Pipeline
                </button>
                <button className="ds-btn ds-btn-ghost" onClick={shareResult}>
                  Share Result
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!hasInputs && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--dim)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Enter asking price, ARV, and repairs above
            <br />
            to get an instant deal verdict.
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && <div className="ds-toast">{toast}</div>}
    </>
  );
}
