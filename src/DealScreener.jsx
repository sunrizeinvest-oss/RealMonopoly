import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";

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
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* ── Nav ── */
  .ds-nav{position:sticky;top:0;z-index:200;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 16px;height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .ds-logo{font-size:15px;font-weight:800;color:var(--text);text-decoration:none;flex-shrink:0}
  .ds-logo span{color:var(--blue)}
  .ds-nav-links{display:flex;align-items:center;gap:2px}
  .ds-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 9px;border-radius:7px;transition:color 0.15s,background 0.15s}
  .ds-nav-link:hover{color:var(--text);background:rgba(15,23,42,0.04)}
  .ds-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.08)}

  /* ── Page wrap ── */
  .ds-wrap{max-width:480px;margin:0 auto;padding:20px 16px 60px}

  /* ── Title ── */
  .ds-title{font-size:20px;font-weight:800;letter-spacing:-0.4px;text-align:center;margin-bottom:2px}
  .ds-sub{font-size:13px;color:var(--sub);text-align:center;margin-bottom:22px}

  /* ── Address strip ── */
  .ds-addr-wrap{margin-bottom:16px}
  .ds-addr-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;display:block}
  .ds-addr-input{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:12px 16px;font-size:15px;color:var(--text);font-family:'Geist',sans-serif;width:100%;outline:none;transition:border-color 0.15s}
  .ds-addr-input:focus{border-color:var(--blue)}
  .ds-addr-input::placeholder{color:var(--dim)}

  /* ── Big input card ── */
  .ds-input-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px 20px 18px;margin-bottom:12px;transition:border-color 0.15s}
  .ds-input-card:focus-within{border-color:rgba(59,158,255,0.4)}
  .ds-input-label{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block}
  .ds-input-hint{font-size:11px;color:var(--dim);margin-top:4px}
  .ds-big-input-wrap{display:flex;align-items:center;gap:8px}
  .ds-big-prefix{font-size:32px;font-weight:800;color:var(--dim);line-height:1;padding-top:2px;flex-shrink:0}
  .ds-big-input{background:transparent;border:none;outline:none;font-size:32px;font-weight:800;color:var(--text);font-family:'Geist',sans-serif;width:100%;letter-spacing:-1px;-moz-appearance:textfield}
  .ds-big-input::-webkit-outer-spin-button,.ds-big-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .ds-big-input::placeholder{color:var(--dim)}

  /* ── Details toggle ── */
  .ds-more-btn{background:transparent;border:1px solid var(--borderf);border-radius:6px;padding:10px 16px;font-size:13px;font-weight:700;color:var(--sub);cursor:pointer;width:100%;font-family:'Geist',sans-serif;margin-bottom:12px;transition:all 0.15s;text-align:left;display:flex;align-items:center;justify-content:space-between}
  .ds-more-btn:hover{color:var(--text);border-color:rgba(255,255,255,0.15)}
  .ds-details-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px;margin-bottom:16px}
  .ds-details-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .ds-sm-field{display:flex;flex-direction:column;gap:4px}
  .ds-sm-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px}
  .ds-sm-input{background:var(--card2);border:1px solid var(--borderf);border-radius: 6px;padding:8px 10px;font-size:14px;font-weight:700;color:var(--text);font-family:'Geist',sans-serif;outline:none;width:100%;transition:border-color 0.15s;-moz-appearance:textfield}
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
  .ds-metric-label{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .ds-metric-value{font-family:'Geist Mono',ui-monospace,monospace;font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;color:var(--text)}
  .ds-metric-sub{font-size:11px;color:var(--sub);margin-top:2px}

  /* ── Action buttons ── */
  .ds-actions{display:flex;flex-direction:column;gap:10px;margin-top:8px}
  .ds-btn{border:none;border-radius:6px;padding:16px 20px;font-size:16px;font-weight:800;cursor:pointer;font-family:'Geist',sans-serif;width:100%;letter-spacing:-0.2px;transition:opacity 0.15s,transform 0.1s;-webkit-tap-highlight-color:transparent}
  .ds-btn:active{transform:scale(0.98)}
  .ds-btn:hover{opacity:0.88}
  .ds-btn-primary{background:var(--blue);color:#fff}
  .ds-btn-secondary{background:rgba(167,130,255,0.12);color:var(--purple);border:1px solid rgba(167,130,255,0.25) !important}
  .ds-btn-ghost{background:rgba(15,23,42,0.04);color:var(--sub);border:1px solid var(--borderf) !important}
  .ds-btn-row{display:flex;gap:10px}
  .ds-btn-row .ds-btn{flex:1}

  /* ── Toast ── */
  .ds-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--green);color:#ffffff;border-radius:6px;padding:10px 20px;font-size:13px;font-weight:800;z-index:999;pointer-events:none;animation:ds-fade-in 0.2s ease;white-space:nowrap}
  @keyframes ds-fade-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

  /* ── Rule of thumb callout ── */
  .ds-rule{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--sub);line-height:1.5}
  .ds-rule strong{color:var(--blue)}

  /* ── Divider ── */
  .ds-divider{height:1px;background:var(--borderf);margin:14px 0}

  /* ── Tabs (single vs bulk) ── */
  .ds-tabs{display:flex;background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:3px;gap:3px;margin-bottom:18px}
  .ds-tab{flex:1;padding:9px 12px;border:none;background:transparent;color:var(--sub);font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.2px;cursor:pointer;border-radius:4px;transition:background 0.15s,color 0.15s;display:flex;align-items:center;justify-content:center;gap:6px}
  .ds-tab:hover{color:var(--text)}
  .ds-tab.active{background:rgba(59,158,255,0.12);color:var(--blue)}
  .ds-tab-count{font-size:9px;color:var(--dim);background:rgba(15,23,42,0.04);border-radius:3px;padding:1px 5px;letter-spacing:0.4px;font-weight:600}
  .ds-tab.active .ds-tab-count{color:var(--blue);background:rgba(59,158,255,0.08)}

  /* ── Bulk panel ── */
  .ds-bulk-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px;margin-bottom:14px}
  .ds-bulk-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.2px;color:var(--blue);margin-bottom:6px}
  .ds-bulk-sub{font-size:12.5px;color:var(--sub);line-height:1.5;margin-bottom:12px}
  .ds-csv{width:100%;min-height:160px;background:var(--card2);border:1px solid var(--borderf);border-radius:5px;padding:12px 14px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;color:var(--text);outline:none;resize:vertical;line-height:1.6;letter-spacing:0.2px}
  .ds-csv:focus{border-color:var(--blue)}
  .ds-csv::placeholder{color:var(--dim)}
  .ds-csv-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
  .ds-csv-action{background:transparent;border:1px solid var(--borderf);border-radius:4px;padding:7px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;color:var(--sub);letterspacing:0.8px;cursor:pointer;transition:border-color 0.15s,color 0.15s}
  .ds-csv-action:hover{color:var(--text);border-color:var(--border)}
  .ds-csv-eval{margin-left:auto;background:var(--blue);color:#fff;border:none;border-radius:4px;padding:9px 18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:1px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s}
  .ds-csv-eval:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(59,158,255,0.35)}
  .ds-csv-eval:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none}
  .ds-csv-error{margin-top:10px;padding:10px 12px;background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.25);border-left:3px solid var(--red);border-radius:4px;font-size:12px;color:var(--red);line-height:1.5}

  /* ── Bulk results table ── */
  .ds-bulk-results{background:var(--card);border:1px solid var(--borderf);border-radius:6px;overflow:hidden;margin-bottom:14px}
  .ds-bulk-results-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(15,23,42,0.025);border-bottom:1px solid var(--borderf);flex-wrap:wrap}
  .ds-bulk-results-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:var(--green);letter-spacing:1.2px}
  .ds-bulk-results-count{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px}
  .ds-bulk-filters{margin-left:auto;display:flex;gap:5px;flex-wrap:wrap}
  .ds-bulk-filter{background:transparent;border:1px solid var(--borderf);border-radius:3px;padding:3px 8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--sub);letter-spacing:0.6px;cursor:pointer;transition:all 0.15s}
  .ds-bulk-filter:hover{color:var(--text);border-color:var(--border)}
  .ds-bulk-filter.active{background:rgba(59,158,255,0.1);border-color:var(--blue);color:var(--blue)}
  .ds-bulk-table-scroll{overflow-x:auto}
  .ds-bulk-table{width:100%;border-collapse:collapse;min-width:760px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px}
  .ds-bulk-table thead th{padding:10px 12px;text-align:left;font-size:9.5px;font-weight:700;color:var(--dim);letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--borderf);background:rgba(255,255,255,0.012);user-select:none}
  .ds-bulk-table thead th.num{text-align:right}
  .ds-bulk-table thead th.sortable{cursor:pointer;transition:color 0.15s}
  .ds-bulk-table thead th.sortable:hover{color:var(--text)}
  .ds-bulk-table thead th.sortable.active{color:var(--blue)}
  .ds-bulk-table tbody td{padding:8px 12px;border-bottom:1px solid rgba(15,23,42,0.03);color:var(--text);vertical-align:baseline}
  .ds-bulk-table tbody td.num{text-align:right}
  .ds-bulk-table tbody tr:hover{background:rgba(15,23,42,0.025)}
  .ds-bulk-table tbody tr:last-child td{border-bottom:none}
  .ds-bulk-table .addr{color:var(--text);font-weight:600;font-family:'Geist',sans-serif;font-size:12.5px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ds-bulk-table .ver{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:3px;border:1px solid currentColor;letter-spacing:0.6px;white-space:nowrap}
  .ds-bulk-table .ver.strong{color:var(--green);background:rgba(52,217,138,0.08)}
  .ds-bulk-table .ver.thin{color:var(--amber);background:rgba(240,160,48,0.08)}
  .ds-bulk-table .ver.pass{color:var(--red);background:rgba(242,92,92,0.08)}
  .ds-bulk-table .green{color:var(--green);font-weight:700}
  .ds-bulk-table .red{color:var(--red);font-weight:700}
  .ds-bulk-table .row-num{color:var(--dim);font-size:10px}
  .ds-bulk-export{padding:10px 16px;background:rgba(255,255,255,0.012);border-top:1px solid var(--borderf);display:flex;justify-content:flex-end}
  .ds-bulk-export-btn{background:transparent;border:1px solid var(--borderf);border-radius:4px;padding:6px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--green);letter-spacing:0.8px;cursor:pointer;transition:all 0.15s}
  .ds-bulk-export-btn:hover{background:rgba(52,217,138,0.06);border-color:var(--green)}
`;

// ─── CSV parsing ──────────────────────────────────────────────────────────────
// Handles both comma- and tab-separated. Recognises common header aliases
// (address, asking_price, list_price, arv, after_repair_value, repair, rehab).
// Falls back to positional if headers aren't matched: addr, asking, arv, repair.
function parseCSV(raw) {
  const text = (raw || "").trim();
  if (!text) return { rows: [], error: null };

  // Detect delimiter — count tabs vs commas in the first line
  const firstLine = text.split(/\r?\n/)[0];
  const delim = firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";

  // Parse with naive quoted-field support
  const splitLine = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (!inQ && ch === delim) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return { rows: [], error: "No rows found." };

  const headerCells = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const ALIAS = {
    address: ["address", "addr", "property", "location"],
    asking:  ["askingprice", "asking", "listprice", "price", "askprice"],
    arv:     ["arv", "afterrepairvalue", "afterrepair", "estimatedvalue", "value"],
    repair:  ["repair", "repairs", "rehab", "repaircost", "rehabbudget", "repaircosts"],
  };
  const colOf = (key) => {
    for (const a of ALIAS[key]) {
      const idx = headerCells.indexOf(a);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  let cols = { address: colOf("address"), asking: colOf("asking"), arv: colOf("arv"), repair: colOf("repair") };
  const hasHeader = cols.asking >= 0 || cols.arv >= 0;
  const dataStart = hasHeader ? 1 : 0;
  if (!hasHeader) cols = { address: 0, asking: 1, arv: 2, repair: 3 };

  const num = (s) => {
    if (s == null) return null;
    const m = String(s).replace(/[$,\s]/g, "").match(/-?\d+\.?\d*/);
    return m ? parseFloat(m[0]) : null;
  };

  const rows = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const addr   = cols.address >= 0 ? (cells[cols.address] || "").trim() : "";
    const asking = num(cols.asking >= 0 ? cells[cols.asking] : null);
    const arv    = num(cols.arv    >= 0 ? cells[cols.arv]    : null);
    const repair = num(cols.repair >= 0 ? cells[cols.repair] : null) ?? 0;
    if (!asking && !arv) continue; // skip junk row
    rows.push({ address: addr || `Row ${i}`, asking: asking ?? 0, arv: arv ?? 0, repair });
  }

  if (!rows.length) return { rows: [], error: "Couldn't parse any deals. Expected columns: address, asking, arv, repair." };
  return { rows, error: null };
}

// Score a row using the same MAO/spread/verdict logic as single-deal mode
function scoreRow({ address, asking, arv, repair }, realtorPct = 0.05, closingPct = 0.03) {
  const mao = arv * 0.7 - repair;
  const spread = mao - asking;
  const sellingCosts = arv * (realtorPct + closingPct);
  const profit = arv - asking - repair - sellingCosts;
  const invested = asking + repair;
  const roi = invested > 0 ? profit / invested : 0;
  const spreadPct = mao > 0 ? spread / mao : 0;
  let verdict, verdictClass;
  if (spread > 0 && spreadPct > 0.05) { verdict = "STRONG"; verdictClass = "strong"; }
  else if (spread >= 0)               { verdict = "THIN";   verdictClass = "thin"; }
  else                                { verdict = "PASS";   verdictClass = "pass"; }
  return { address, asking, arv, repair, mao, spread, profit, roi, verdict, verdictClass };
}

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

  // ── Bulk mode state ───────────────────────────────────────────────────────
  const [mode, setMode] = useState("single");      // "single" | "bulk" | "lookup"
  const [csvText, setCsvText] = useState("");
  const [bulkResults, setBulkResults] = useState(null);  // null | { rows: [...] }
  const [bulkError, setBulkError] = useState(null);
  const [bulkSort, setBulkSort] = useState({ key: "profit", dir: -1 });
  const [bulkFilter, setBulkFilter] = useState("all");   // "all" | "strong" | "thin" | "pass"

  // ── Address bulk-lookup state ─────────────────────────────────────────────
  // Paste one address per line; system runs property-lookup on each and scores
  // by implied cap rate. Tier 2 wholesaler / commercial broker workflow.
  const [lookupText, setLookupText] = useState("");
  const [lookupRows, setLookupRows] = useState([]);
  const [lookupRunning, setLookupRunning] = useState(false);
  const [lookupProgress, setLookupProgress] = useState({ done: 0, total: 0 });
  const [lookupError, setLookupError] = useState(null);
  const [lookupSort, setLookupSort] = useState({ key: "cap", dir: -1 });
  const LOOKUP_MAX = 30;
  const LOOKUP_CONCURRENCY = 5;

  // Score a lookup row by implied cap rate. Assumes ~35% expense ratio for
  // small residential income property — STRONG ≥ 6%, OK 4.5-6%, THIN < 4.5%.
  function scoreLookup(row) {
    const v = Number(row.value), r = Number(row.rent);
    if (!v || !r) return { ...row, cap: null, grm: null, verdict: "DATA", verdictClass: "skip" };
    const noi = r * 12 * 0.65;          // crude — same heuristic the IC report uses
    const cap = noi / v;
    const grm = v / (r * 12);
    let verdict, verdictClass;
    if (cap >= 0.06)      { verdict = "STRONG"; verdictClass = "strong"; }
    else if (cap >= 0.045){ verdict = "OK";     verdictClass = "thin";   }
    else                  { verdict = "THIN";   verdictClass = "pass";   }
    return { ...row, cap, grm, verdict, verdictClass };
  }

  async function runLookup() {
    setLookupError(null);
    const lines = (lookupText || "")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 4);  // drop blanks + obvious junk
    const deduped = [...new Set(lines)];
    if (!deduped.length) {
      setLookupError("Paste at least one address (one per line).");
      return;
    }
    if (deduped.length > LOOKUP_MAX) {
      setLookupError(`Capped at ${LOOKUP_MAX} addresses per run — got ${deduped.length}. Trim the list and try again.`);
      return;
    }
    setLookupRunning(true);
    setLookupProgress({ done: 0, total: deduped.length });
    setLookupRows(deduped.map(a => ({ address: a, status: "pending" })));

    // Concurrency-bounded worker pool
    let cursor = 0;
    const results = new Array(deduped.length);
    async function worker() {
      while (true) {
        const i = cursor++;
        if (i >= deduped.length) return;
        const addr = deduped[i];
        try {
          const r = await fetch(`/api/property-lookup?address=${encodeURIComponent(addr)}`);
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            results[i] = scoreLookup({ address: addr, status: "error", error: j.error || `HTTP ${r.status}` });
          } else {
            results[i] = scoreLookup({
              address:   j.address || addr,
              status:    "ok",
              country:   j.country || null,
              value:     j.estimatedValue,
              rent:      j.rentEstimate,
              yearBuilt: j.yearBuilt,
              sqft:      j.squareFootage,
              zone:      j.zoning?.code || null,
              source:    j.source,
            });
          }
        } catch (e) {
          results[i] = scoreLookup({ address: addr, status: "error", error: e.message });
        }
        // Update progress + visible row in place
        setLookupProgress(p => ({ ...p, done: p.done + 1 }));
        setLookupRows(rows => {
          const next = [...rows];
          next[i] = results[i];
          return next;
        });
      }
    }
    await Promise.all(Array.from({ length: LOOKUP_CONCURRENCY }, worker));
    setLookupRunning(false);
  }

  const sortedLookupRows = useMemo(() => {
    const { key, dir } = lookupSort;
    return [...lookupRows].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return ((av ?? 0) - (bv ?? 0)) * dir;
    });
  }, [lookupRows, lookupSort]);

  function exportLookupCSV() {
    if (!lookupRows.length) return;
    const esc = v => {
      if (v == null || v === "") return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ["Address", "Status", "Country", "Est. Value", "Rent Est.", "Implied Cap", "GRM", "Year Built", "Sqft", "Zoning", "Verdict"];
    const lines = [headers.join(",")];
    for (const r of lookupRows) {
      lines.push([
        r.address, r.status, r.country || "",
        r.value || "", r.rent || "",
        r.cap != null ? (r.cap * 100).toFixed(2) + "%" : "",
        r.grm != null ? r.grm.toFixed(2) : "",
        r.yearBuilt || "", r.sqft || "", r.zone || "",
        r.verdict || "",
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `realdeal-bulk-lookup-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const sortedFilteredBulk = useMemo(() => {
    if (!bulkResults?.rows?.length) return [];
    const filtered = bulkFilter === "all"
      ? bulkResults.rows
      : bulkResults.rows.filter(r => r.verdictClass === bulkFilter);
    const { key, dir } = bulkSort;
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return ((av ?? 0) - (bv ?? 0)) * dir;
    });
  }, [bulkResults, bulkSort, bulkFilter]);

  function runBulk() {
    const { rows, error } = parseCSV(csvText);
    if (error) { setBulkError(error); setBulkResults(null); return; }
    setBulkError(null);
    setBulkResults({ rows: rows.map(r => scoreRow(r)) });
  }

  function loadBulkSample() {
    setCsvText([
      "address,asking,arv,repair",
      "142 Birchwood Dr, Calgary, AB,250000,385000,40000",
      "58 Maple Ct, Edmonton, AB,180000,295000,55000",
      "903 Elm St, Vancouver, BC,720000,820000,30000",
      "17 Sunrise Blvd, Toronto, ON,520000,720000,80000",
      "334 Oak Ave, Ottawa, ON,310000,420000,45000",
      "2201 Palm Ln, Halifax, NS,420000,640000,70000",
      "76 Cedar Ridge, Winnipeg, MB,195000,310000,35000",
      "441 River Rd, Phoenix, AZ,265000,395000,42000",
      "1804 Lakeview Dr, Austin, TX,295000,395000,55000",
      "992 Westgate, Denver, CO,360000,540000,55000",
    ].join("\n"));
    setBulkError(null);
  }

  function exportBulkCSV() {
    if (!sortedFilteredBulk.length) return;
    const lines = [
      "address,asking,arv,repair,mao,profit,roi,verdict",
      ...sortedFilteredBulk.map(r =>
        `"${r.address}",${r.asking},${r.arv},${r.repair},${Math.round(r.mao)},${Math.round(r.profit)},${(r.roi * 100).toFixed(1)}%,${r.verdict}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screened-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported CSV");
  }

  function toggleSort(key) {
    setBulkSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: -1 });
  }

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

      <TopNav />

      <div className="ds-wrap" style={mode === "bulk" ? { maxWidth: 1140 } : undefined}>
        <div className="ds-title">Deal Screener</div>
        <div className="ds-sub">{mode === "single" ? "3 numbers → instant pass/fail in 5 seconds" : "Paste a CSV of deals → instant pass/fail across the whole list"}</div>

        {/* ── Mode tabs ── */}
        <div className="ds-tabs">
          <button className={`ds-tab ${mode === "single" ? "active" : ""}`} onClick={() => setMode("single")}>
            ▸ SINGLE DEAL
          </button>
          <button className={`ds-tab ${mode === "bulk" ? "active" : ""}`} onClick={() => setMode("bulk")}>
            ▸ BULK IMPORT {bulkResults?.rows?.length ? <span className="ds-tab-count">{bulkResults.rows.length}</span> : null}
          </button>
          <button className={`ds-tab ${mode === "lookup" ? "active" : ""}`} onClick={() => setMode("lookup")}>
            ▸ ADDRESS LOOKUP {lookupRows.length ? <span className="ds-tab-count">{lookupRows.length}</span> : null}
          </button>
        </div>

        {mode === "lookup" ? (<>
          {/* ── Address Bulk Lookup ── */}
          <div className="ds-bulk-card">
            <div className="ds-bulk-h">▸ PASTE ADDRESSES · ONE PER LINE</div>
            <div className="ds-bulk-sub">
              System runs <code style={{color:"var(--blue)"}}>/api/property-lookup</code> on each (free for Canadian addresses via open-data, RentCast for US). Computes implied cap rate + GRM, scores each row. Max <strong>{LOOKUP_MAX}</strong> addresses per run.
            </div>
            <textarea
              className="ds-csv"
              value={lookupText}
              onChange={e => setLookupText(e.target.value)}
              placeholder={`123 Main St, Calgary, AB\n456 Oak Ave, Vancouver, BC\n789 Pine Rd, Edmonton, AB\n...`}
              spellCheck={false}
            />
            <div className="ds-csv-actions">
              <button className="ds-csv-action" onClick={() => setLookupText("425 W Cordova St, Vancouver, BC\n8814 99 St NW, Edmonton, AB\n2424 Westmount Rd NW, Calgary, AB")}>▸ LOAD SAMPLE</button>
              <button className="ds-csv-action" onClick={() => { setLookupText(""); setLookupRows([]); setLookupError(null); }}>▸ CLEAR</button>
              <button
                className="ds-csv-eval"
                onClick={runLookup}
                disabled={lookupRunning || !lookupText.trim()}
              >
                {lookupRunning ? `LOOKING UP · ${lookupProgress.done} / ${lookupProgress.total}` : "▶ RUN LOOKUP"}
              </button>
            </div>
            {lookupRunning && (
              <div style={{ marginTop: 10, height: 6, background: "rgba(15,23,42,0.04)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: lookupProgress.total ? `${(lookupProgress.done / lookupProgress.total) * 100}%` : "0%",
                  background: "var(--blue)", transition: "width 0.3s",
                }} />
              </div>
            )}
            {lookupError && <div className="ds-csv-error">{lookupError}</div>}
          </div>

          {lookupRows.length > 0 && (
            <div className="ds-bulk-results">
              <div className="ds-bulk-results-head">
                <span className="ds-bulk-results-tag">▸ RESULTS</span>
                <span className="ds-bulk-results-count">
                  {lookupRows.filter(r => r.status === "ok").length} found · {lookupRows.filter(r => r.status === "error").length} failed · {lookupRows.filter(r => r.verdictClass === "strong").length} STRONG
                </span>
                <button onClick={exportLookupCSV} className="ds-csv-action" style={{ marginLeft: "auto" }}>📄 EXPORT CSV</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{
                  width: "100%", borderCollapse: "collapse",
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 12,
                }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      {[
                        { k: "address", l: "Address",    align: "left" },
                        { k: "value",   l: "Est. Value", align: "right" },
                        { k: "rent",    l: "Rent",       align: "right" },
                        { k: "cap",     l: "Cap Rate",   align: "right" },
                        { k: "grm",     l: "GRM",        align: "right" },
                        { k: "yearBuilt", l: "Built",    align: "right" },
                        { k: "zone",    l: "Zoning",     align: "left" },
                        { k: "verdict", l: "Verdict",    align: "center" },
                      ].map(col => (
                        <th
                          key={col.k}
                          onClick={() => setLookupSort(s => ({ key: col.k, dir: s.key === col.k ? -s.dir : -1 }))}
                          style={{
                            textAlign: col.align, padding: "9px 12px",
                            fontSize: 9.5, fontWeight: 700, color: "var(--dim)",
                            letterSpacing: "1.1px", cursor: "pointer",
                            borderBottom: "1px solid var(--borderf)",
                            userSelect: "none",
                          }}
                        >
                          {col.l.toUpperCase()}
                          {lookupSort.key === col.k && <span style={{ marginLeft: 4, color: "var(--blue)" }}>{lookupSort.dir === -1 ? "▼" : "▲"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookupRows.map((r, i) => {
                      const verdictColor =
                        r.verdictClass === "strong" ? "var(--green)" :
                        r.verdictClass === "thin"   ? "var(--amber)" :
                        r.verdictClass === "pass"   ? "var(--red)"   : "var(--dim)";
                      return (
                        <tr key={i} style={{ borderTop: "1px solid rgba(15,23,42,0.03)" }}>
                          <td style={{ padding: "9px 12px", color: "var(--text)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.address}>
                            {r.address}
                            {r.country && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--dim)" }}>· {r.country}</span>}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text)" }}>
                            {r.status === "pending" ? <span style={{ color: "var(--dim)" }}>…</span>
                             : r.status === "error" ? <span style={{ color: "var(--red)" }} title={r.error}>—</span>
                             : r.value ? `$${Math.round(r.value/1000)}K` : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text)" }}>
                            {r.rent ? `$${Math.round(r.rent).toLocaleString()}` : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: r.cap >= 0.06 ? "var(--green)" : r.cap >= 0.045 ? "var(--amber)" : "var(--text)", fontWeight: 700 }}>
                            {r.cap != null ? `${(r.cap * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--sub)" }}>
                            {r.grm != null ? r.grm.toFixed(1) : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--sub)" }}>{r.yearBuilt || "—"}</td>
                          <td style={{ padding: "9px 12px", color: "var(--sub)", fontSize: 10.5 }}>{r.zone || "—"}</td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            <span style={{
                              display: "inline-block", padding: "3px 10px",
                              border: `1px solid ${verdictColor}`,
                              color: verdictColor,
                              borderRadius: 3,
                              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
                            }}>
                              {r.verdict || (r.status === "pending" ? "…" : r.status === "error" ? "ERR" : "—")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>) : mode === "bulk" ? (
          <>
            {/* ── Bulk CSV input ── */}
            <div className="ds-bulk-card">
              <div className="ds-bulk-h">▸ PASTE CSV OR TYPE</div>
              <div className="ds-bulk-sub">
                Columns: <code style={{color:"var(--blue)"}}>address, asking, arv, repair</code>. Comma or tab separated. Headers optional — first row can be data if you skip them.
              </div>
              <textarea
                className="ds-csv"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`address,asking,arv,repair\n142 Birchwood Dr,250000,385000,40000\n58 Maple Ct,180000,295000,55000\n...`}
                spellCheck={false}
              />
              <div className="ds-csv-actions">
                <button className="ds-csv-action" onClick={loadBulkSample}>▸ LOAD SAMPLE</button>
                <label className="ds-csv-action" style={{cursor:"pointer"}}>
                  ▸ UPLOAD .CSV
                  <input
                    type="file"
                    accept=".csv,text/csv,.tsv,text/tab-separated-values"
                    style={{display:"none"}}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setCsvText(String(reader.result || ""));
                      reader.readAsText(file);
                    }}
                  />
                </label>
                <button className="ds-csv-action" onClick={() => { setCsvText(""); setBulkResults(null); setBulkError(null); }}>▸ CLEAR</button>
                <button className="ds-csv-eval" onClick={runBulk} disabled={!csvText.trim()}>
                  ▶ EVALUATE
                </button>
              </div>
              {bulkError && <div className="ds-csv-error">{bulkError}</div>}
            </div>

            {/* ── Bulk results table ── */}
            {bulkResults?.rows?.length > 0 && (
              <div className="ds-bulk-results">
                <div className="ds-bulk-results-head">
                  <span className="ds-bulk-results-tag">▸ EVALUATED · {bulkResults.rows.length} DEALS</span>
                  <span className="ds-bulk-results-count">
                    {bulkResults.rows.filter(r => r.verdictClass === "strong").length} STRONG ·{" "}
                    {bulkResults.rows.filter(r => r.verdictClass === "thin").length} THIN ·{" "}
                    {bulkResults.rows.filter(r => r.verdictClass === "pass").length} PASS
                  </span>
                  <div className="ds-bulk-filters">
                    {[
                      { id: "all",    label: "ALL" },
                      { id: "strong", label: "🟢 STRONG" },
                      { id: "thin",   label: "🟡 THIN" },
                      { id: "pass",   label: "🔴 PASS" },
                    ].map(f => (
                      <button
                        key={f.id}
                        className={`ds-bulk-filter ${bulkFilter === f.id ? "active" : ""}`}
                        onClick={() => setBulkFilter(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ds-bulk-table-scroll">
                  <table className="ds-bulk-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="sortable" onClick={() => toggleSort("address")}>Address</th>
                        <th className="num sortable" onClick={() => toggleSort("asking")}>Asking</th>
                        <th className="num sortable" onClick={() => toggleSort("arv")}>ARV</th>
                        <th className="num sortable" onClick={() => toggleSort("repair")}>Repair</th>
                        <th className="num sortable" onClick={() => toggleSort("mao")}>MAO (70%)</th>
                        <th className={`num sortable ${bulkSort.key === "profit" ? "active" : ""}`} onClick={() => toggleSort("profit")}>
                          Profit {bulkSort.key === "profit" ? (bulkSort.dir === -1 ? "▼" : "▲") : ""}
                        </th>
                        <th className="num sortable" onClick={() => toggleSort("roi")}>ROI</th>
                        <th>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFilteredBulk.map((r, i) => (
                        <tr key={`${r.address}-${i}`}>
                          <td className="row-num">{i + 1}</td>
                          <td className="addr" title={r.address}>{r.address}</td>
                          <td className="num">${r.asking.toLocaleString()}</td>
                          <td className="num">${r.arv.toLocaleString()}</td>
                          <td className="num">${r.repair.toLocaleString()}</td>
                          <td className="num">${Math.round(r.mao).toLocaleString()}</td>
                          <td className={`num ${r.profit >= 0 ? "green" : "red"}`}>
                            {r.profit >= 0 ? "+" : ""}${Math.round(r.profit).toLocaleString()}
                          </td>
                          <td className={`num ${r.roi >= 0 ? "green" : "red"}`}>
                            {(r.roi * 100).toFixed(1)}%
                          </td>
                          <td><span className={`ver ${r.verdictClass}`}>{r.verdict}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ds-bulk-export">
                  <button className="ds-bulk-export-btn" onClick={exportBulkCSV}>▶ EXPORT RESULTS CSV</button>
                </div>
              </div>
            )}

            {toast && <div className="ds-toast">{toast}</div>}
          </>
        ) : (<>

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

        </>)}
      </div>

      {/* ── Toast ── */}
      {toast && <div className="ds-toast">{toast}</div>}
    </>
  );
}
