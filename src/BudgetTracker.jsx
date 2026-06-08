import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
const num = (v) => parseFloat(v) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "rde_budget_v1";
const PREFILL_KEY = "rde_prefill";

const EXPENSE_CATEGORIES = [
  "Foundation", "Framing", "Roof", "Electrical", "Plumbing", "HVAC",
  "Insulation", "Drywall", "Flooring", "Cabinets", "Countertops", "Fixtures",
  "Paint", "Landscaping", "Windows/Doors", "Appliances", "Labor", "Permits",
  "Contingency", "Other",
];

const PAID_BY_OPTIONS = ["Cash", "Check", "Credit Card", "Transfer"];

const BLANK_EXPENSE = {
  id: null,
  category: "Labor",
  description: "",
  amount: "",
  date: today(),
  paidBy: "Cash",
  receiptNo: "",
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* ── Nav ── */
  .bt-nav{position:sticky;top:0;z-index:200;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .bt-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;flex-shrink:0}
  .bt-logo span{color:var(--blue)}
  .bt-nav-links{display:flex;align-items:center;gap:4px}
  .bt-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 10px;border-radius:7px;transition:color 0.15s,background 0.15s}
  .bt-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.04)}
  .bt-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.08)}

  /* ── Layout ── */
  .bt-wrap{max-width:1100px;margin:0 auto;padding:28px 20px 60px}
  .bt-page-title{font-size:22px;font-weight:800;letter-spacing:-0.4px;margin-bottom:4px}
  .bt-page-sub{font-size:13px;color:var(--sub);margin-bottom:24px}

  /* ── Deal selector bar ── */
  .bt-deal-bar{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px;margin-bottom:24px}
  .bt-deal-bar-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
  .bt-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}
  .bt-field label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .bt-input{background:var(--card2);border:1px solid var(--borderf);border-radius:9px;padding:9px 12px;font-size:14px;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;transition:border-color 0.15s;outline:none}
  .bt-input:focus{border-color:var(--blue)}
  .bt-input::placeholder{color:var(--dim)}
  select.bt-input{cursor:pointer}
  .bt-hint{font-size:11px;color:var(--dim);margin-top:2px}
  .bt-btn{background:var(--blue);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:opacity 0.15s;flex-shrink:0}
  .bt-btn:hover{opacity:0.85}
  .bt-btn-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all 0.15s}
  .bt-btn-ghost:hover{color:var(--text);border-color:rgba(255,255,255,0.18)}
  .bt-btn-green{background:var(--green);color:#07090f}
  .bt-btn-green:hover{opacity:0.85}
  .bt-btn-red{background:var(--red);color:#fff}
  .bt-btn-sm{padding:6px 12px;font-size:12px;border-radius:7px}
  .bt-deal-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .bt-deal-tab{background:var(--card2);border:1px solid var(--borderf);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;color:var(--sub);cursor:pointer;transition:all 0.15s}
  .bt-deal-tab.active{background:rgba(59,158,255,0.12);border-color:rgba(59,158,255,0.35);color:var(--blue)}

  /* ── Dashboard cards ── */
  .bt-dash{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
  @media(max-width:760px){.bt-dash{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:420px){.bt-dash{grid-template-columns:1fr}}
  .bt-dash-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:4px}
  .bt-dash-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .bt-dash-value{font-size:28px;font-weight:800;letter-spacing:-1px;line-height:1.1;color:var(--text)}
  .bt-dash-sub{font-size:12px;color:var(--sub)}
  .bt-dash-card.danger .bt-dash-value{color:var(--red)}
  .bt-dash-card.warning .bt-dash-value{color:var(--amber)}
  .bt-dash-card.good .bt-dash-value{color:var(--green)}

  /* ── Progress bar ── */
  .bt-prog-wrap{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px;margin-bottom:24px}
  .bt-prog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .bt-prog-title{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px}
  .bt-prog-pct{font-size:15px;font-weight:800;color:var(--text)}
  .bt-prog-track{height:12px;background:var(--card2);border-radius:3px;overflow:hidden;border:1px solid var(--borderf)}
  .bt-prog-fill{height:100%;border-radius:3px;transition:width 0.4s cubic-bezier(.4,0,.2,1),background 0.3s}

  /* ── Section header ── */
  .bt-section{background:var(--card);border:1px solid var(--borderf);border-radius:6px;overflow:hidden;margin-bottom:20px}
  .bt-section-head{padding:16px 20px;border-bottom:1px solid var(--borderf);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .bt-section-title{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.2px}
  .bt-section-body{padding:20px}

  /* ── Expense form grid ── */
  .bt-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media(max-width:700px){.bt-form-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:440px){.bt-form-grid{grid-template-columns:1fr}}
  .bt-form-actions{display:flex;gap:10px;margin-top:14px;justify-content:flex-end}

  /* ── Category breakdown table ── */
  .bt-cat-table{width:100%;border-collapse:collapse}
  .bt-cat-table th{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;text-align:left;border-bottom:1px solid var(--borderf)}
  .bt-cat-table td{padding:9px 12px;font-size:13px;color:var(--text);border-bottom:1px solid rgba(255,255,255,0.03)}
  .bt-cat-table tr:last-child td{border-bottom:none}
  .bt-cat-table tr:hover td{background:rgba(255,255,255,0.02)}
  .bt-cat-name{font-weight:600}
  .bt-cat-input{background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 8px;font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;width:110px;transition:border-color 0.15s}
  .bt-cat-input:hover{border-color:var(--borderf)}
  .bt-cat-input:focus{border-color:var(--blue);background:var(--card2);outline:none}
  .pos{color:var(--green)}
  .neg{color:var(--red)}

  /* ── Expense list table ── */
  .bt-exp-table{width:100%;border-collapse:collapse}
  .bt-exp-table th{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;text-align:left;border-bottom:1px solid var(--borderf);cursor:pointer;user-select:none;white-space:nowrap}
  .bt-exp-table th:hover{color:var(--text)}
  .bt-exp-table td{padding:9px 12px;font-size:13px;color:var(--text);border-bottom:1px solid rgba(255,255,255,0.03);vertical-align:middle}
  .bt-exp-table tr:last-child td{border-bottom:none}
  .bt-exp-table tr:hover td{background:rgba(255,255,255,0.02)}
  .bt-exp-actions{display:flex;gap:6px}
  .bt-icon-btn{background:transparent;border:1px solid var(--borderf);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;color:var(--sub);font-family:'DM Sans',sans-serif}
  .bt-icon-btn:hover{color:var(--text);border-color:rgba(255,255,255,0.2)}
  .bt-icon-btn.del:hover{color:var(--red);border-color:var(--red)}
  .bt-total-row td{font-weight:800;color:var(--text);border-top:2px solid var(--borderf) !important;background:rgba(255,255,255,0.02)}
  .bt-empty{text-align:center;padding:40px 20px;color:var(--sub);font-size:14px}
  .bt-sort-arrow{margin-left:4px;opacity:0.5}

  /* ── Bottom bar ── */
  .bt-bottom-bar{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}

  /* ── Badge ── */
  .bt-badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;background:rgba(59,158,255,0.12);color:var(--blue)}

  /* ── Scrollable on mobile ── */
  .bt-table-wrap{overflow-x:auto}
`;

// ─── Default per-category budgets ────────────────────────────────────────────
function makeDefaultCatBudgets() {
  const out = {};
  EXPENSE_CATEGORIES.forEach((c) => (out[c] = ""));
  return out;
}

// ─── Load / save deals ───────────────────────────────────────────────────────
function loadDeals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDeals(deals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BudgetTracker() {
  const navigate = useNavigate();

  // All deals stored as { [address]: { dealName, totalBudget, expenses, catBudgets } }
  const [deals, setDeals] = useState(loadDeals);
  const [activeDeal, setActiveDeal] = useState("");

  // Header inputs
  const [address, setAddress] = useState("");
  const [dealName, setDealName] = useState("");
  const [totalBudget, setTotalBudget] = useState("");

  // Expense form
  const [form, setForm] = useState({ ...BLANK_EXPENSE });
  const [editId, setEditId] = useState(null);

  // Sort
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // ── Prefill from localStorage (coming from Rehab Calculator) ──────────────
  useEffect(() => {
    try {
      const prefill = JSON.parse(localStorage.getItem(PREFILL_KEY));
      if (prefill?.repairCosts) {
        setTotalBudget(String(prefill.repairCosts));
      }
      if (prefill?.address) setAddress(prefill.address);
      if (prefill?.dealName) setDealName(prefill.dealName);
    } catch {}
  }, []);

  // ── When active deal changes, populate header from saved data ─────────────
  useEffect(() => {
    if (activeDeal && deals[activeDeal]) {
      const d = deals[activeDeal];
      setAddress(activeDeal);
      setDealName(d.dealName || "");
      setTotalBudget(String(d.totalBudget || ""));
    }
  }, [activeDeal]); // eslint-disable-line

  // ── Current deal data ─────────────────────────────────────────────────────
  const currentKey = activeDeal || address.trim();
  const currentDeal = deals[currentKey] || {
    dealName: "",
    totalBudget: 0,
    expenses: [],
    catBudgets: makeDefaultCatBudgets(),
  };

  const expenses = currentDeal.expenses || [];
  const catBudgets = currentDeal.catBudgets || makeDefaultCatBudgets();

  // ── Persist changes ───────────────────────────────────────────────────────
  function upsertDeal(key, patch) {
    if (!key) return;
    setDeals((prev) => {
      const existing = prev[key] || {
        dealName: "",
        totalBudget: 0,
        expenses: [],
        catBudgets: makeDefaultCatBudgets(),
      };
      const updated = { ...prev, [key]: { ...existing, ...patch } };
      saveDeals(updated);
      return updated;
    });
  }

  // Save header on blur / change
  function saveHeader() {
    const key = address.trim();
    if (!key) return;
    upsertDeal(key, {
      dealName,
      totalBudget: num(totalBudget),
    });
    if (activeDeal !== key) setActiveDeal(key);
  }

  // ── Computed totals ───────────────────────────────────────────────────────
  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + num(e.amount), 0),
    [expenses]
  );
  const budget = num(totalBudget) || num(currentDeal.totalBudget);
  const remaining = budget - totalSpent;
  const pctSpent = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map = {};
    EXPENSE_CATEGORIES.forEach((c) => (map[c] = 0));
    expenses.forEach((e) => {
      if (map[e.category] !== undefined) map[e.category] += num(e.amount);
    });
    return map;
  }, [expenses]);

  // ── Sorted expenses ───────────────────────────────────────────────────────
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      let av = a[sortCol] ?? "";
      let bv = b[sortCol] ?? "";
      if (sortCol === "amount") {
        av = num(av);
        bv = num(bv);
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [expenses, sortCol, sortDir]);

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  // ── Add / edit expense ────────────────────────────────────────────────────
  function handleAddExpense() {
    if (!form.description || !form.amount) return;
    const key = address.trim();
    if (!key) { alert("Please enter a property address first."); return; }

    const entry = { ...form, id: editId || uid(), amount: num(form.amount) };
    const updated = editId
      ? expenses.map((e) => (e.id === editId ? entry : e))
      : [...expenses, entry];

    upsertDeal(key, {
      dealName,
      totalBudget: num(totalBudget),
      expenses: updated,
      catBudgets,
    });
    if (activeDeal !== key) setActiveDeal(key);
    setForm({ ...BLANK_EXPENSE });
    setEditId(null);
  }

  function handleEdit(exp) {
    setForm({ ...exp, amount: String(exp.amount) });
    setEditId(exp.id);
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  function handleDelete(id) {
    if (!window.confirm("Delete this expense?")) return;
    upsertDeal(currentKey, {
      expenses: expenses.filter((e) => e.id !== id),
    });
  }

  function handleCancelEdit() {
    setForm({ ...BLANK_EXPENSE });
    setEditId(null);
  }

  // ── Category budget inline edit ───────────────────────────────────────────
  function handleCatBudget(cat, val) {
    const updated = { ...catBudgets, [cat]: val };
    upsertDeal(currentKey, { catBudgets: updated });
  }

  // ── Export to Flip Analyzer ───────────────────────────────────────────────
  function exportToFlip() {
    const prefill = { repairCosts: totalSpent };
    localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    navigate("/app");
  }

  // ── Delete deal ───────────────────────────────────────────────────────────
  function deleteDeal(key) {
    if (!window.confirm(`Delete deal "${key}"? This cannot be undone.`)) return;
    setDeals((prev) => {
      const next = { ...prev };
      delete next[key];
      saveDeals(next);
      return next;
    });
    if (activeDeal === key) {
      setActiveDeal("");
      setAddress("");
      setDealName("");
      setTotalBudget("");
    }
  }

  // ── Progress bar color ────────────────────────────────────────────────────
  const progColor =
    pctSpent > 100
      ? "var(--red)"
      : pctSpent > 90
      ? "var(--amber)"
      : "var(--green)";

  const dashClass =
    remaining < 0 ? "danger" : pctSpent > 80 ? "warning" : "";

  const dealKeys = Object.keys(deals);

  return (
    <>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <TopNav />

      <div className="bt-wrap">
        <div className="bt-page-title">Rehab Budget Tracker</div>
        <div className="bt-page-sub">Track actual spending vs your estimated rehab budget — updated live.</div>

        {/* ── Saved deal tabs ── */}
        {dealKeys.length > 0 && (
          <div className="bt-deal-tabs">
            {dealKeys.map((k) => (
              <button
                key={k}
                className={`bt-deal-tab${activeDeal === k ? " active" : ""}`}
                onClick={() => setActiveDeal(k)}
              >
                {deals[k].dealName || k}
              </button>
            ))}
            <button
              className="bt-deal-tab"
              onClick={() => {
                setActiveDeal("");
                setAddress("");
                setDealName("");
                setTotalBudget("");
                setForm({ ...BLANK_EXPENSE });
                setEditId(null);
              }}
            >
              + New Deal
            </button>
          </div>
        )}

        {/* ── Deal header ── */}
        <div className="bt-deal-bar">
          <div className="bt-deal-bar-row">
            <div className="bt-field" style={{ flex: 2, minWidth: 220 }}>
              <label>Property Address</label>
              <input
                className="bt-input"
                placeholder="123 Main St, City, ST"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={saveHeader}
              />
            </div>
            <div className="bt-field" style={{ flex: 1.5 }}>
              <label>Deal Name</label>
              <input
                className="bt-input"
                placeholder="e.g. Main St Flip"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                onBlur={saveHeader}
              />
            </div>
            <div className="bt-field" style={{ flex: 1 }}>
              <label>Total Budget ($)</label>
              <input
                className="bt-input"
                type="number"
                placeholder="75000"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                onBlur={saveHeader}
              />
              <div className="bt-hint">Auto-filled from Rehab Calculator</div>
            </div>
            {activeDeal && (
              <button
                className="bt-btn bt-btn-sm"
                style={{ background: "var(--red)", alignSelf: "flex-end", marginBottom: 2 }}
                onClick={() => deleteDeal(activeDeal)}
              >
                Delete Deal
              </button>
            )}
          </div>
        </div>

        {/* ── Dashboard cards ── */}
        <div className="bt-dash">
          <div className="bt-dash-card">
            <div className="bt-dash-label">Total Budget</div>
            <div className="bt-dash-value">{fmt(budget)}</div>
            <div className="bt-dash-sub">Estimated rehab cost</div>
          </div>
          <div className="bt-dash-card">
            <div className="bt-dash-label">Total Spent</div>
            <div className="bt-dash-value" style={{ color: "var(--blue)" }}>
              {fmt(totalSpent)}
            </div>
            <div className="bt-dash-sub">{expenses.length} expense{expenses.length !== 1 ? "s" : ""} logged</div>
          </div>
          <div className={`bt-dash-card ${dashClass}`}>
            <div className="bt-dash-label">Remaining</div>
            <div className="bt-dash-value">{fmt(remaining)}</div>
            <div className="bt-dash-sub">
              {remaining < 0 ? `Over budget by ${fmt(Math.abs(remaining))}` : "Left to spend"}
            </div>
          </div>
          <div className="bt-dash-card">
            <div className="bt-dash-label">% Complete</div>
            <div
              className="bt-dash-value"
              style={{
                color: pctSpent > 100 ? "var(--red)" : pctSpent > 80 ? "var(--amber)" : "var(--text)",
              }}
            >
              {pctSpent.toFixed(1)}%
            </div>
            <div className="bt-dash-sub">of budget spent</div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="bt-prog-wrap">
          <div className="bt-prog-head">
            <span className="bt-prog-title">Budget Progress</span>
            <span className="bt-prog-pct" style={{ color: progColor }}>
              {pctSpent.toFixed(1)}% — {fmt(totalSpent)} of {fmt(budget)}
              {pctSpent > 90 && pctSpent <= 100 && (
                <span style={{ color: "var(--amber)", marginLeft: 10, fontSize: 12 }}>⚠ Approaching limit</span>
              )}
              {pctSpent > 100 && (
                <span style={{ color: "var(--red)", marginLeft: 10, fontSize: 12 }}>Over budget!</span>
              )}
            </span>
          </div>
          <div className="bt-prog-track">
            <div
              className="bt-prog-fill"
              style={{ width: `${Math.min(pctSpent, 100)}%`, background: progColor }}
            />
          </div>
        </div>

        {/* ── Expense entry form ── */}
        <div className="bt-section">
          <div className="bt-section-head">
            <div className="bt-section-title">
              {editId ? "Edit Expense" : "+ Add Expense"}
            </div>
          </div>
          <div className="bt-section-body">
            <div className="bt-form-grid">
              <div className="bt-field">
                <label>Category</label>
                <select
                  className="bt-input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="bt-field" style={{ gridColumn: "span 2" }}>
                <label>Description</label>
                <input
                  className="bt-input"
                  placeholder="e.g. Hardwood flooring install — main level"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="bt-field">
                <label>Amount ($)</label>
                <input
                  className="bt-input"
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="bt-field">
                <label>Date</label>
                <input
                  className="bt-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="bt-field">
                <label>Paid By</label>
                <select
                  className="bt-input"
                  value={form.paidBy}
                  onChange={(e) => setForm((f) => ({ ...f, paidBy: e.target.value }))}
                >
                  {PAID_BY_OPTIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="bt-field">
                <label>Receipt # (optional)</label>
                <input
                  className="bt-input"
                  placeholder="e.g. INV-0042"
                  value={form.receiptNo}
                  onChange={(e) => setForm((f) => ({ ...f, receiptNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="bt-form-actions">
              {editId && (
                <button className="bt-btn-ghost" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
              <button className="bt-btn" onClick={handleAddExpense}>
                {editId ? "Save Changes" : "+ Add Expense"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Category breakdown ── */}
        <div className="bt-section">
          <div className="bt-section-head">
            <div className="bt-section-title">Category Breakdown</div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              Click Budgeted column to edit per-category budget
            </div>
          </div>
          <div className="bt-table-wrap">
            <table className="bt-cat-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budgeted</th>
                  <th>Spent</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {EXPENSE_CATEGORIES.filter(
                  (c) => catBreakdown[c] > 0 || num(catBudgets[c]) > 0
                ).map((cat) => {
                  const budgeted = num(catBudgets[cat]);
                  const spent = catBreakdown[cat] || 0;
                  const variance = budgeted - spent;
                  return (
                    <tr key={cat}>
                      <td className="bt-cat-name">{cat}</td>
                      <td>
                        <input
                          className="bt-cat-input"
                          type="number"
                          placeholder="—"
                          value={catBudgets[cat] || ""}
                          onChange={(e) => handleCatBudget(cat, e.target.value)}
                          title="Set category budget"
                        />
                      </td>
                      <td>{fmt(spent)}</td>
                      <td className={budgeted > 0 ? (variance >= 0 ? "pos" : "neg") : ""}>
                        {budgeted > 0
                          ? (variance >= 0 ? "+" : "") + fmt(variance)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                {EXPENSE_CATEGORIES.every(
                  (c) => catBreakdown[c] === 0 && !num(catBudgets[c])
                ) && (
                  <tr>
                    <td colSpan={4} className="bt-empty">
                      No expenses logged yet. Add your first expense above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Expense list ── */}
        <div className="bt-section">
          <div className="bt-section-head">
            <div className="bt-section-title">All Expenses</div>
            <span className="bt-badge">{expenses.length} total</span>
          </div>
          <div className="bt-table-wrap">
            <table className="bt-exp-table">
              <thead>
                <tr>
                  {[
                    ["date", "Date"],
                    ["category", "Category"],
                    ["description", "Description"],
                    ["amount", "Amount"],
                    ["paidBy", "Paid By"],
                  ].map(([col, label]) => (
                    <th key={col} onClick={() => handleSort(col)}>
                      {label}
                      <span className="bt-sort-arrow">
                        {sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                      </span>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="bt-empty">
                      No expenses yet. Add one above to get started.
                    </td>
                  </tr>
                )}
                {sortedExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--sub)" }}>
                      {exp.date}
                    </td>
                    <td>
                      <span
                        style={{
                          background: "rgba(59,158,255,0.08)",
                          color: "var(--blue)",
                          borderRadius: 5,
                          padding: "2px 7px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ color: "var(--text)" }}>
                      {exp.description}
                      {exp.receiptNo && (
                        <span style={{ color: "var(--dim)", fontSize: 11, marginLeft: 6 }}>
                          #{exp.receiptNo}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text)" }}>
                      {fmt(exp.amount)}
                    </td>
                    <td style={{ color: "var(--sub)" }}>{exp.paidBy}</td>
                    <td>
                      <div className="bt-exp-actions">
                        <button className="bt-icon-btn" onClick={() => handleEdit(exp)}>
                          Edit
                        </button>
                        <button
                          className="bt-icon-btn del"
                          onClick={() => handleDelete(exp.id)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedExpenses.length > 0 && (
                  <tr className="bt-total-row">
                    <td colSpan={3} style={{ fontWeight: 800 }}>
                      Running Total
                    </td>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>{fmt(totalSpent)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom actions ── */}
        <div className="bt-bottom-bar">
          <button className="bt-btn-ghost" onClick={() => navigate("/pipeline")}>
            View Pipeline
          </button>
          <button className="bt-btn bt-btn-green" onClick={exportToFlip}>
            Export to Flip Analyzer →
          </button>
        </div>
      </div>
    </>
  );
}
