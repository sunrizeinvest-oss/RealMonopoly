import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * PitchPipeline — /pitch/pipeline founder-only investor pipeline CRM.
 *
 * NOT gated by the same pitch code as investor-facing pages. Uses a
 * separate FOUNDER_CODE that only the founder knows. Data stored in
 * localStorage — private to the browser. No backend, no analytics.
 *
 * The whole point: give the founder a workflow tool that fits raise cadence
 * (Named investor → stage → last-touched → next-step → notes) so they don't
 * miss follow-ups during the sprint.
 *
 * TODO: when the raise closes, either archive this in localStorage or
 * migrate to a Supabase table + Auth-guarded page.
 */
const FOUNDER_CODE = "rzai-founder-2026"; // Change this to something only you know.
const STORAGE_KEY = "rde_pipeline_investors";

const STAGES = [
  { key: "intro", label: "Intro sent", color: "#94a3b8" },
  { key: "first-meeting", label: "First meeting", color: "#3b82f6" },
  { key: "diligence", label: "Diligence", color: "#eab308" },
  { key: "term-sheet", label: "Term sheet", color: "#a855f7" },
  { key: "committed", label: "Committed", color: "#16a34a" },
  { key: "passed", label: "Passed", color: "#94a3b8" },
];

function makeId() {
  return "inv_" + Math.random().toString(36).slice(2, 10);
}

export default function PitchPipeline() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [investors, setInvestors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState({ name: "", firm: "", stage: "intro", lastTouched: "", nextStep: "", checkSize: "", notes: "" });
  const [editingId, setEditingId] = useState(null);

  useDocMeta({
    title: "RizeAI · Investor Pipeline (Founder-only)",
    description: "Private founder-only raise CRM.",
  });

  // Unlock check
  useEffect(() => {
    let stored = "";
    try { stored = sessionStorage.getItem("rde_founder_unlocked") || ""; } catch {}
    if (stored === FOUNDER_CODE) setUnlocked(true);
  }, []);

  // Load pipeline from localStorage
  useEffect(() => {
    if (!unlocked) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInvestors(JSON.parse(raw));
    } catch (e) { console.warn("pipeline load failed", e); }
  }, [unlocked]);

  // Save pipeline to localStorage
  function persist(next) {
    setInvestors(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.warn("pipeline save failed", e); }
  }

  function tryUnlock() {
    if (codeInput === FOUNDER_CODE) {
      try { sessionStorage.setItem("rde_founder_unlocked", FOUNDER_CODE); } catch {}
      setUnlocked(true);
      track("pipeline_unlocked");
    } else {
      alert("Wrong code.");
    }
  }

  function addOrUpdate() {
    if (!draft.name.trim()) return;
    if (editingId) {
      const next = investors.map(i => i.id === editingId ? { ...draft, id: editingId } : i);
      persist(next);
    } else {
      persist([{ ...draft, id: makeId(), createdAt: new Date().toISOString() }, ...investors]);
    }
    setDraft({ name: "", firm: "", stage: "intro", lastTouched: "", nextStep: "", checkSize: "", notes: "" });
    setShowAdd(false);
    setEditingId(null);
  }

  function startEdit(inv) {
    setDraft({ ...inv });
    setEditingId(inv.id);
    setShowAdd(true);
  }

  function deleteInvestor(id) {
    if (!confirm("Delete this investor from the pipeline?")) return;
    persist(investors.filter(i => i.id !== id));
  }

  function exportCSV() {
    const rows = [
      ["Name", "Firm", "Stage", "Last Touched", "Next Step", "Check Size", "Notes"],
      ...investors.map(i => [i.name, i.firm, i.stage, i.lastTouched, i.nextStep, i.checkSize, (i.notes || "").replace(/\n/g, " · ")]),
    ];
    const csv = rows.map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RizeAI-Pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    track("pipeline_export");
  }

  // Stats
  const stats = STAGES.map(s => ({ ...s, count: investors.filter(i => i.stage === s.key).length }));
  const totalCommitted = investors
    .filter(i => i.stage === "committed")
    .reduce((sum, i) => sum + (parseInt((i.checkSize || "").replace(/[^0-9]/g, ""), 10) || 0), 0);

  const filtered = filter === "all" ? investors : investors.filter(i => i.stage === filter);

  if (!unlocked) {
    return (
      <div className="pl-wrap">
        <style>{CSS}</style>
        <div className="pl-gate">
          <div className="pl-gate-inner">
            <div className="pl-gate-icon">🔐</div>
            <div className="pl-gate-eyebrow">▸ FOUNDER-ONLY</div>
            <h1 className="pl-gate-h">Investor Pipeline</h1>
            <p className="pl-gate-p">Private CRM for tracking raise conversations. Data stays in your browser — never uploaded.</p>
            <form onSubmit={(e) => { e.preventDefault(); tryUnlock(); }} className="pl-gate-form">
              <input
                type="password"
                placeholder="Founder code"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                className="pl-gate-input"
                autoFocus
              />
              <button type="submit" className="pl-gate-btn">Unlock</button>
            </form>
            <div className="pl-gate-hint">
              <b>Hint (change this):</b> the founder code is set in <code>PitchPipeline.jsx</code> line 15 — <code>rzai-founder-2026</code> by default. Rotate it after skimming this page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-wrap">
      <style>{CSS}</style>

      <div className="pl-topbar">
        <a href="/pitch" className="pl-logo">Real <span>Deal</span></a>
        <span className="pl-tag">▸ PIPELINE · FOUNDER-ONLY</span>
        <button className="pl-topbar-btn ghost" onClick={exportCSV}>↓ CSV</button>
        <button className="pl-topbar-btn" onClick={() => { setShowAdd(true); setEditingId(null); setDraft({ name: "", firm: "", stage: "intro", lastTouched: "", nextStep: "", checkSize: "", notes: "" }); }}>+ Add</button>
        <button className="pl-topbar-btn ghost" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="pl-body">
        {/* HEADER */}
        <div className="pl-header">
          <h1 className="pl-h1">Raise pipeline.</h1>
          <div className="pl-header-row">
            <div className="pl-header-stat">
              <span className="pl-header-stat-val">{investors.length}</span>
              <span className="pl-header-stat-lbl">investors</span>
            </div>
            <div className="pl-header-stat">
              <span className="pl-header-stat-val brass">${totalCommitted.toLocaleString()}</span>
              <span className="pl-header-stat-lbl">committed</span>
            </div>
            <div className="pl-header-stat">
              <span className="pl-header-stat-val">{stats.find(s => s.key === "term-sheet")?.count || 0}</span>
              <span className="pl-header-stat-lbl">term sheet stage</span>
            </div>
          </div>
        </div>

        {/* STAGE FILTER PILLS */}
        <div className="pl-filter-row">
          <button
            className={`pl-filter ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({investors.length})
          </button>
          {stats.map(s => (
            <button
              key={s.key}
              className={`pl-filter ${filter === s.key ? "active" : ""}`}
              onClick={() => setFilter(s.key)}
              style={filter === s.key ? { borderColor: s.color, color: s.color } : {}}
            >
              <span style={{ background: s.color }} className="pl-filter-dot" />
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* ADD/EDIT FORM */}
        {showAdd && (
          <div className="pl-form">
            <div className="pl-form-h">{editingId ? "Edit investor" : "Add investor"}</div>
            <div className="pl-form-grid">
              <div className="pl-form-field">
                <label>Name</label>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Anita Sharma" />
              </div>
              <div className="pl-form-field">
                <label>Firm</label>
                <input value={draft.firm} onChange={e => setDraft({ ...draft, firm: e.target.value })} placeholder="Version One Ventures" />
              </div>
              <div className="pl-form-field">
                <label>Stage</label>
                <select value={draft.stage} onChange={e => setDraft({ ...draft, stage: e.target.value })}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="pl-form-field">
                <label>Check size ($)</label>
                <input value={draft.checkSize} onChange={e => setDraft({ ...draft, checkSize: e.target.value })} placeholder="250000" />
              </div>
              <div className="pl-form-field">
                <label>Last touched (date)</label>
                <input type="date" value={draft.lastTouched} onChange={e => setDraft({ ...draft, lastTouched: e.target.value })} />
              </div>
              <div className="pl-form-field">
                <label>Next step</label>
                <input value={draft.nextStep} onChange={e => setDraft({ ...draft, nextStep: e.target.value })} placeholder="Follow up next Tuesday re: model" />
              </div>
              <div className="pl-form-field pl-form-field-wide">
                <label>Notes</label>
                <textarea rows={3} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="How met · warm intro from X · concerns raised · thesis fit" />
              </div>
            </div>
            <div className="pl-form-actions">
              <button className="pl-topbar-btn" onClick={addOrUpdate}>{editingId ? "Save" : "Add"}</button>
              <button className="pl-topbar-btn ghost" onClick={() => { setShowAdd(false); setEditingId(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* PIPELINE TABLE */}
        {filtered.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty-icon">📋</div>
            <div className="pl-empty-h">{filter === "all" ? "No investors yet." : `No one at ${STAGES.find(s => s.key === filter)?.label} yet.`}</div>
            <div className="pl-empty-p">{filter === "all" ? "Click + Add above to log your first raise conversation." : "Try a different stage filter."}</div>
          </div>
        ) : (
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Name / Firm</th>
                  <th>Stage</th>
                  <th>Check size</th>
                  <th>Last touched</th>
                  <th>Next step</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const stage = STAGES.find(s => s.key === inv.stage);
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div className="pl-name">{inv.name || "—"}</div>
                        <div className="pl-firm">{inv.firm || "—"}</div>
                      </td>
                      <td>
                        <span className="pl-stage-badge" style={{ background: `${stage?.color}15`, color: stage?.color, borderColor: `${stage?.color}40` }}>
                          {stage?.label}
                        </span>
                      </td>
                      <td>{inv.checkSize ? `$${parseInt(inv.checkSize.replace(/[^0-9]/g, ""), 10).toLocaleString()}` : "—"}</td>
                      <td>{inv.lastTouched || "—"}</td>
                      <td className="pl-next">{inv.nextStep || <span style={{color:"var(--sub)"}}>—</span>}</td>
                      <td className="pl-actions-cell">
                        <button className="pl-icon-btn" onClick={() => startEdit(inv)}>✎</button>
                        <button className="pl-icon-btn danger" onClick={() => deleteInvestor(inv.id)}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SECURITY NOTE */}
        <div className="pl-security">
          <div className="pl-security-tag">▸ PRIVACY NOTE</div>
          <div className="pl-security-body">
            Data is stored in this browser's <code>localStorage</code> only. Nothing is sent to any server. Clearing browser data erases the pipeline — export CSV periodically for backup. When the raise closes, delete this page or replace the founder code.
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .pl-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }

  .pl-gate { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
  .pl-gate-inner { max-width: 460px; text-align: center; padding: 36px 32px; background: var(--card); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; }
  .pl-gate-icon { font-size: 44px; margin-bottom: 12px; }
  .pl-gate-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.4px; margin-bottom: 10px; }
  .pl-gate-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.7px; margin: 0 0 8px; }
  .pl-gate-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin: 0 0 22px; }
  .pl-gate-form { display: flex; gap: 8px; margin-bottom: 16px; }
  .pl-gate-input { flex: 1; padding: 11px 14px; border-radius: 6px; background: var(--card2); border: 1px solid var(--borderf); font-size: 13.5px; font-family: 'Geist Mono', monospace; color: var(--text); }
  .pl-gate-btn { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .pl-gate-hint { font-size: 11.5px; color: var(--sub); line-height: 1.55; padding: 12px 14px; background: rgba(212,175,55,0.05); border-left: 3px solid var(--brass); border-radius: 4px; text-align: left; }
  .pl-gate-hint code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 1px 4px; border-radius: 3px; color: var(--brass-2); }

  .pl-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .pl-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pl-logo span { color: var(--brass); }
  .pl-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pl-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .pl-topbar-btn.ghost { background: transparent; color: var(--text); border-color: rgba(255,255,255,0.15); }

  .pl-body { max-width: 1180px; margin: 0 auto; padding: 32px 24px 60px; }

  .pl-header { margin-bottom: 24px; }
  .pl-h1 { font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -0.8px; margin: 0 0 14px; }
  .pl-header-row { display: flex; gap: 22px; flex-wrap: wrap; }
  .pl-header-stat { display: flex; align-items: baseline; gap: 6px; }
  .pl-header-stat-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
  .pl-header-stat-val.brass { color: var(--brass); }
  .pl-header-stat-lbl { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.4px; text-transform: uppercase; }

  .pl-filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--borderf); }
  .pl-filter { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; background: var(--card); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); letter-spacing: 0.3px; cursor: pointer; }
  .pl-filter:hover { color: var(--text); border-color: var(--sub); }
  .pl-filter.active { color: var(--text); border-color: var(--brass); background: rgba(212,175,55,0.08); }
  .pl-filter-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

  .pl-form { padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; margin-bottom: 20px; }
  .pl-form-h { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 14px; }
  .pl-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
  @media(max-width:640px){ .pl-form-grid { grid-template-columns: 1fr; } }
  .pl-form-field { display: flex; flex-direction: column; gap: 4px; }
  .pl-form-field-wide { grid-column: 1 / -1; }
  .pl-form-field label { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.6px; text-transform: uppercase; }
  .pl-form-field input, .pl-form-field select, .pl-form-field textarea { padding: 9px 12px; border-radius: 5px; background: var(--card2); border: 1px solid var(--borderf); font-size: 13px; font-family: 'Geist', sans-serif; color: var(--text); }
  .pl-form-field input:focus, .pl-form-field select:focus, .pl-form-field textarea:focus { outline: none; border-color: var(--brass); }
  .pl-form-actions { display: flex; gap: 8px; }

  .pl-empty { padding: 60px 20px; text-align: center; }
  .pl-empty-icon { font-size: 36px; margin-bottom: 10px; }
  .pl-empty-h { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .pl-empty-p { font-size: 13px; color: var(--sub); }

  .pl-table-wrap { overflow-x: auto; border: 1px solid var(--borderf); border-radius: 10px; }
  .pl-table { width: 100%; border-collapse: collapse; font-family: 'Geist', sans-serif; min-width: 780px; }
  .pl-table th, .pl-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--borderf); font-size: 13px; color: var(--text); vertical-align: top; }
  .pl-table th { background: var(--card2); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: var(--sub); text-transform: uppercase; }
  .pl-table tr:last-child td { border-bottom: none; }
  .pl-name { font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .pl-firm { font-size: 11.5px; color: var(--sub); font-family: 'Geist Mono', monospace; letter-spacing: 0.2px; }
  .pl-stage-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; border: 1px solid; }
  .pl-next { max-width: 240px; font-size: 12.5px; line-height: 1.4; }
  .pl-actions-cell { white-space: nowrap; }
  .pl-icon-btn { padding: 4px 9px; border-radius: 4px; background: transparent; color: var(--sub); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 12px; cursor: pointer; margin-left: 4px; }
  .pl-icon-btn:hover { color: var(--text); border-color: var(--sub); }
  .pl-icon-btn.danger:hover { color: #dc2626; border-color: rgba(220,38,38,0.4); }

  .pl-security { margin-top: 32px; padding: 16px 18px; background: rgba(212,175,55,0.04); border-left: 3px solid var(--brass); border-radius: 4px; }
  .pl-security-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.2px; margin-bottom: 6px; text-transform: uppercase; }
  .pl-security-body { font-size: 12.5px; color: var(--sub); line-height: 1.65; }
  .pl-security-body code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 1px 5px; border-radius: 3px; font-size: 11.5px; color: var(--brass-2); }
`;
