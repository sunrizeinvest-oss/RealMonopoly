import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmtCAD = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmtPrice = (n, country) => (country === "CA" ? fmtCAD(n) : fmtUSD(n));
const fmtDate = (iso) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STORAGE_KEY = "rde_alerts_v1";

const PROP_TYPES = ["Any", "Single Family", "Duplex", "Multifamily", "Condo"];
const BED_OPTIONS = [1, 2, 3, 4, "5+"];

const BLANK_FORM = {
  name: "",
  country: "CA",
  city: "",
  maxPrice: "",
  minBeds: 3,
  propType: "Any",
  email: "",
};

function loadAlerts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveAlerts(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* ── Nav ── */
  .da-nav{position:sticky;top:0;z-index:200;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .da-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;flex-shrink:0}
  .da-logo span{color:var(--blue)}
  .da-nav-links{display:flex;align-items:center;gap:4px}
  .da-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 10px;border-radius:7px;transition:color 0.15s,background 0.15s;white-space:nowrap}
  .da-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.04)}
  .da-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.08)}
  .da-nav-right{display:flex;align-items:center;gap:8px}
  .da-signout{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
  .da-signout:hover{color:var(--text);border-color:rgba(255,255,255,0.18)}

  /* ── Layout ── */
  .da-wrap{max-width:820px;margin:0 auto;padding:36px 20px 80px}

  /* ── Hero ── */
  .da-hero{text-align:center;margin-bottom:40px}
  .da-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.25);border-radius:3px;padding:5px 14px;font-size:12px;font-weight:700;color:var(--blue);margin-bottom:16px;letter-spacing:0.2px}
  .da-hero-title{font-size:36px;font-weight:800;letter-spacing:-1px;line-height:1.1;margin-bottom:10px;color:var(--text)}
  .da-hero-sub{font-size:15px;color:var(--sub);line-height:1.6;max-width:520px;margin:0 auto}

  /* ── Section titles ── */
  .da-section-title{font-size:13px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .da-section-title::after{content:'';flex:1;height:1px;background:var(--borderf)}

  /* ── Create form card ── */
  .da-form-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:28px 28px 24px;margin-bottom:40px}
  .da-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  @media(max-width:560px){.da-form-grid{grid-template-columns:1fr}}
  .da-form-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px}
  @media(max-width:640px){.da-form-grid-3{grid-template-columns:1fr 1fr}}
  @media(max-width:420px){.da-form-grid-3{grid-template-columns:1fr}}
  .da-field{display:flex;flex-direction:column;gap:5px}
  .da-field.full{grid-column:1/-1}
  .da-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .da-input{background:var(--card2);border:1px solid var(--borderf);border-radius:6px;padding:10px 14px;font-size:14px;font-weight:500;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border-color 0.15s;-moz-appearance:textfield}
  .da-input::-webkit-outer-spin-button,.da-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .da-input:focus{border-color:var(--blue)}
  .da-input::placeholder{color:var(--dim)}

  /* Country toggle */
  .da-toggle{display:flex;background:var(--card2);border:1px solid var(--borderf);border-radius:6px;padding:3px;gap:3px}
  .da-toggle-btn{flex:1;padding:8px 12px;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;background:transparent;color:var(--sub)}
  .da-toggle-btn.on{background:var(--blue);color:#fff}

  /* Bed buttons */
  .da-bed-row{display:flex;gap:6px;flex-wrap:wrap}
  .da-bed-btn{padding:8px 14px;border:1px solid var(--borderf);border-radius: 6px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;background:transparent;color:var(--sub)}
  .da-bed-btn:hover{color:var(--text);border-color:rgba(255,255,255,0.2)}
  .da-bed-btn.on{background:rgba(59,158,255,0.15);border-color:rgba(59,158,255,0.4);color:var(--blue)}

  /* Property type pills */
  .da-type-row{display:flex;gap:6px;flex-wrap:wrap}
  .da-type-btn{padding:7px 13px;border:1px solid var(--borderf);border-radius: 6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;background:transparent;color:var(--sub)}
  .da-type-btn:hover{color:var(--text);border-color:rgba(255,255,255,0.2)}
  .da-type-btn.on{background:rgba(167,130,255,0.12);border-color:rgba(167,130,255,0.4);color:var(--purple)}

  /* Create button */
  .da-create-btn{width:100%;padding:13px;background:var(--blue);color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:-0.2px;transition:opacity 0.15s;margin-top:8px}
  .da-create-btn:hover{opacity:0.88}
  .da-create-btn:disabled{opacity:0.45;cursor:not-allowed}

  /* ── Toast ── */
  .da-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--green);color:#07090f;border-radius:6px;padding:12px 24px;font-size:14px;font-weight:800;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.5);animation:da-fadein 0.2s ease}
  @keyframes da-fadein{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

  /* ── Alert cards ── */
  .da-empty{text-align:center;padding:48px 20px;color:var(--sub);font-size:14px}
  .da-empty-icon{font-size:36px;margin-bottom:12px}
  .da-alert-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;margin-bottom:16px;overflow:hidden;transition:border-color 0.15s}
  .da-alert-card:hover{border-color:rgba(255,255,255,0.12)}
  .da-alert-head{padding:20px 22px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .da-alert-left{flex:1;min-width:0}
  .da-alert-name{font-size:16px;font-weight:800;color:var(--text);letter-spacing:-0.3px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .da-alert-meta{font-size:13px;color:var(--sub);line-height:1.5}
  .da-alert-meta strong{color:var(--text);font-weight:600}
  .da-alert-badges{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
  .da-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:0.2px}
  .da-badge-green{background:rgba(52,217,138,0.1);color:var(--green);border:1px solid rgba(52,217,138,0.2)}
  .da-badge-blue{background:rgba(59,158,255,0.1);color:var(--blue);border:1px solid rgba(59,158,255,0.15)}
  .da-badge-sub{background:rgba(107,125,150,0.12);color:var(--sub);border:1px solid var(--borderf)}
  .da-badge-purple{background:rgba(167,130,255,0.1);color:var(--purple);border:1px solid rgba(167,130,255,0.2)}
  .da-alert-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
  .da-alert-btns{display:flex;gap:6px}
  .da-btn{padding:7px 14px;border-radius: 6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;border:none}
  .da-btn-blue{background:var(--blue);color:#fff}
  .da-btn-blue:hover{opacity:0.85}
  .da-btn-blue:disabled{opacity:0.5;cursor:not-allowed}
  .da-btn-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf)}
  .da-btn-ghost:hover{color:var(--red);border-color:var(--red)}
  .da-last-checked{font-size:11px;color:var(--dim)}

  /* ── Results section ── */
  .da-results{border-top:1px solid var(--borderf);padding:18px 22px}
  .da-results-loading{display:flex;align-items:center;gap:10px;color:var(--sub);font-size:13px;padding:8px 0}
  .da-spinner{width:18px;height:18px;border:2px solid var(--borderf);border-top-color:var(--blue);border-radius:50%;animation:da-spin 0.7s linear infinite;flex-shrink:0}
  @keyframes da-spin{to{transform:rotate(360deg)}}
  .da-results-count{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .da-results-count .da-count-num{font-size:22px;font-weight:800;color:var(--green);letter-spacing:-0.5px}
  .da-results-none{font-size:13px;color:var(--sub);padding:4px 0 8px}
  .da-listing-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:560px){.da-listing-grid{grid-template-columns:1fr}}
  .da-listing-card{background:var(--card2);border:1px solid var(--borderf);border-radius:6px;padding:14px 16px;transition:border-color 0.15s}
  .da-listing-card:hover{border-color:rgba(59,158,255,0.3)}
  .da-listing-addr{font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .da-listing-city{font-size:11px;color:var(--sub);margin-bottom:8px}
  .da-listing-price{font-size:20px;font-weight:800;letter-spacing:-0.5px;color:var(--green);margin-bottom:6px}
  .da-listing-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
  .da-listing-pill{font-size:11px;font-weight:600;color:var(--sub);background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:6px;padding:2px 8px}
  .da-listing-dom{font-size:11px;color:var(--amber)}
  .da-listing-link{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;font-weight:700;color:var(--blue);text-decoration:none}
  .da-listing-link:hover{text-decoration:underline}
  .da-mls{font-size:10px;color:var(--dim);margin-top:3px}

  /* ── How it works ── */
  .da-how{margin-top:56px}
  .da-how-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:4px}
  @media(max-width:640px){.da-how-cards{grid-template-columns:1fr}}
  .da-how-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:22px 20px}
  .da-how-num{width:32px;height:32px;border-radius:6px;background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--blue);margin-bottom:14px}
  .da-how-title{font-size:14px;font-weight:800;color:var(--text);margin-bottom:6px}
  .da-how-text{font-size:13px;color:var(--sub);line-height:1.6}
  .da-how-note{margin-top:18px;padding:14px 18px;background:rgba(167,130,255,0.06);border:1px solid rgba(167,130,255,0.15);border-radius:6px;font-size:13px;color:var(--sub);line-height:1.6}
  .da-how-note strong{color:var(--purple)}

  /* ── Error state ── */
  .da-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius:6px;padding:12px 16px;font-size:13px;color:var(--red);margin-top:8px}
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function DealAlerts() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [alerts, setAlerts] = useState(() => loadAlerts());
  const [form, setForm] = useState({
    ...BLANK_FORM,
    email: user?.email || "",
  });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkState, setCheckState] = useState({}); // { [alertId]: { loading, results, error } }

  // Keep email in sync when user loads
  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email }));
    }
  }, [user]);

  // Persist alerts
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Give your alert a name"); return; }
    if (!form.city.trim()) { showToast("Enter a city"); return; }
    if (!form.email.trim()) { showToast("Enter an email address"); return; }
    const newAlert = {
      id: Date.now(),
      name: form.name.trim(),
      country: form.country,
      city: form.city.trim(),
      maxPrice: form.maxPrice ? parseInt(form.maxPrice, 10) : null,
      minBeds: form.minBeds,
      propType: form.propType,
      email: form.email.trim(),
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      lastChecked: null,
      lastResults: [],
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setForm({ ...BLANK_FORM, email: user?.email || "" });
    showToast("Alert created!");
  }

  function handleDelete(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setCheckState((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }

  const handleCheckNow = useCallback(async (alert) => {
    setCheckState((s) => ({
      ...s,
      [alert.id]: { loading: true, results: null, error: null },
    }));

    const params = new URLSearchParams({
      country: alert.country,
      city: alert.city,
      ...(alert.maxPrice ? { maxPrice: String(alert.maxPrice) } : {}),
      minBeds: String(typeof alert.minBeds === "number" ? alert.minBeds : 5),
    });

    try {
      const res = await fetch(`/api/check-alerts?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Update lastChecked + lastResults on the alert
      const checkedAt = data.checkedAt || new Date().toISOString();
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, lastChecked: checkedAt, lastResults: data.listings || [] }
            : a
        )
      );
      setCheckState((s) => ({
        ...s,
        [alert.id]: { loading: false, results: data, error: null },
      }));
    } catch (err) {
      setCheckState((s) => ({
        ...s,
        [alert.id]: { loading: false, results: null, error: err.message },
      }));
    }
  }, []);

  function summarizeCriteria(alert) {
    const parts = [];
    if (alert.city) parts.push(alert.city);
    if (alert.minBeds) parts.push(`${alert.minBeds}+ beds`);
    if (alert.maxPrice) parts.push(`under ${fmtPrice(alert.maxPrice, alert.country)}`);
    if (alert.propType && alert.propType !== "Any") parts.push(alert.propType);
    return parts.join(" · ");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <TopNav />

      <div className="da-wrap">
        {/* ── Hero ── */}
        <div className="da-hero">
          <div className="da-hero-tag">🔔 Daily Digest</div>
          <h1 className="da-hero-title">Deal Alerts</h1>
          <p className="da-hero-sub">
            We check Realtor.ca and the MLS daily. When a new property matches
            your criteria, you get an email.
          </p>
        </div>

        {/* ── Create Alert form ── */}
        <div className="da-section-title">Create Alert</div>
        <form className="da-form-card" onSubmit={handleCreate} noValidate>
          {/* Row 1: name + email */}
          <div className="da-form-grid">
            <div className="da-field">
              <label className="da-label">Alert Name</label>
              <input
                className="da-input"
                placeholder="e.g. Calgary 4BR under $600K"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="da-field">
              <label className="da-label">Email for Alerts</label>
              <input
                className="da-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: country + city + max price */}
          <div className="da-form-grid-3">
            <div className="da-field">
              <label className="da-label">Country</label>
              <div className="da-toggle">
                <button
                  type="button"
                  className={`da-toggle-btn${form.country === "CA" ? " on" : ""}`}
                  onClick={() => setField("country", "CA")}
                >
                  🇨🇦 Canada
                </button>
                <button
                  type="button"
                  className={`da-toggle-btn${form.country === "US" ? " on" : ""}`}
                  onClick={() => setField("country", "US")}
                >
                  🇺🇸 USA
                </button>
              </div>
            </div>
            <div className="da-field">
              <label className="da-label">City / Market</label>
              <input
                className="da-input"
                placeholder="e.g. Calgary, AB"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div className="da-field">
              <label className="da-label">Max Price ({form.country === "CA" ? "CAD" : "USD"})</label>
              <input
                className="da-input"
                type="number"
                placeholder="600000"
                value={form.maxPrice}
                onChange={(e) => setField("maxPrice", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: min beds */}
          <div className="da-field" style={{ marginBottom: 16 }}>
            <label className="da-label">Min Bedrooms</label>
            <div className="da-bed-row">
              {BED_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`da-bed-btn${form.minBeds === b ? " on" : ""}`}
                  onClick={() => setField("minBeds", b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: property type */}
          <div className="da-field" style={{ marginBottom: 20 }}>
            <label className="da-label">Property Type</label>
            <div className="da-type-row">
              {PROP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`da-type-btn${form.propType === t ? " on" : ""}`}
                  onClick={() => setField("propType", t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="da-create-btn"
            disabled={creating}
          >
            {creating ? "Creating…" : "Create Alert"}
          </button>
        </form>

        {/* ── Alert cards ── */}
        <div className="da-section-title">My Alerts ({alerts.length})</div>

        {alerts.length === 0 && (
          <div className="da-empty">
            <div className="da-empty-icon">🔔</div>
            No alerts yet — create one above and we'll email you when deals land.
          </div>
        )}

        {alerts.map((alert) => {
          const cs = checkState[alert.id] || {};
          return (
            <div key={alert.id} className="da-alert-card">
              <div className="da-alert-head">
                <div className="da-alert-left">
                  <div className="da-alert-name">{alert.name}</div>
                  <div className="da-alert-meta">
                    <strong>{alert.city}</strong> · {summarizeCriteria(alert)}
                  </div>
                  <div className="da-alert-meta" style={{ marginTop: 2 }}>
                    Alerts → <strong>{alert.email}</strong>
                  </div>
                  <div className="da-alert-badges">
                    <span className="da-badge da-badge-green">● Active</span>
                    <span className="da-badge da-badge-blue">
                      {alert.country === "CA" ? "🇨🇦 Realtor.ca" : "🇺🇸 MLS"}
                    </span>
                    {alert.propType !== "Any" && (
                      <span className="da-badge da-badge-purple">{alert.propType}</span>
                    )}
                    <span className="da-badge da-badge-sub">
                      Created {alert.createdAt}
                    </span>
                  </div>
                </div>
                <div className="da-alert-right">
                  <div className="da-alert-btns">
                    <button
                      className="da-btn da-btn-blue"
                      disabled={cs.loading}
                      onClick={() => handleCheckNow(alert)}
                    >
                      {cs.loading ? "Checking…" : "Check Now"}
                    </button>
                    <button
                      className="da-btn da-btn-ghost"
                      onClick={() => handleDelete(alert.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="da-last-checked">
                    Last checked: {fmtDate(alert.lastChecked)}
                  </div>
                </div>
              </div>

              {/* Results panel */}
              {(cs.loading || cs.results || cs.error) && (
                <div className="da-results">
                  {cs.loading && (
                    <div className="da-results-loading">
                      <div className="da-spinner" />
                      Checking {alert.country === "CA" ? "Realtor.ca" : "MLS"} for {alert.city}…
                    </div>
                  )}

                  {cs.error && (
                    <div className="da-error">
                      Error: {cs.error}
                    </div>
                  )}

                  {cs.results && !cs.loading && (
                    <>
                      {cs.results.count > 0 ? (
                        <>
                          <div className="da-results-count">
                            <span className="da-count-num">{cs.results.count}</span>
                            {cs.results.count === 1
                              ? " new listing matching your criteria"
                              : " new listings matching your criteria"}
                          </div>
                          <div className="da-listing-grid">
                            {cs.results.listings.map((l, i) => (
                              <div key={i} className="da-listing-card">
                                <div className="da-listing-addr">{l.address}</div>
                                <div className="da-listing-city">{l.city}</div>
                                <div className="da-listing-price">
                                  {fmtPrice(l.price, alert.country)}
                                </div>
                                <div className="da-listing-row">
                                  {l.bedrooms != null && (
                                    <span className="da-listing-pill">{l.bedrooms} bd</span>
                                  )}
                                  {l.bathrooms != null && (
                                    <span className="da-listing-pill">{l.bathrooms} ba</span>
                                  )}
                                  {l.sqft && (
                                    <span className="da-listing-pill">
                                      {l.sqft.toLocaleString()} sqft
                                    </span>
                                  )}
                                </div>
                                {l.daysOnMarket != null && (
                                  <div className="da-listing-dom">
                                    {l.daysOnMarket === 0
                                      ? "Listed today"
                                      : `${l.daysOnMarket} days on market`}
                                  </div>
                                )}
                                {l.listingUrl && (
                                  <a
                                    className="da-listing-link"
                                    href={l.listingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View listing ↗
                                  </a>
                                )}
                                {l.mlsNumber && (
                                  <div className="da-mls">MLS® {l.mlsNumber}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="da-results-none">
                          No new listings since last check. We'll email you when
                          something matches.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── How it works ── */}
        <div className="da-how">
          <div className="da-section-title">How It Works</div>
          <div className="da-how-cards">
            <div className="da-how-card">
              <div className="da-how-num">1</div>
              <div className="da-how-title">Set Your Criteria</div>
              <div className="da-how-text">
                Choose your city, max price, minimum bedrooms, and property type.
                Name the alert so you can manage multiple searches at once.
              </div>
            </div>
            <div className="da-how-card">
              <div className="da-how-num">2</div>
              <div className="da-how-title">We Check Daily</div>
              <div className="da-how-text">
                Every morning we scan active listings matching your saved criteria.
                You can also hit "Check Now" to run a manual scan any time.
              </div>
            </div>
            <div className="da-how-card">
              <div className="da-how-num">3</div>
              <div className="da-how-title">Get Your Email Digest</div>
              <div className="da-how-text">
                When new listings land, we bundle them into a clean email with
                price, beds, days on market, and a direct link to the listing.
              </div>
            </div>
          </div>
          <div className="da-how-note">
            <strong>Data sources:</strong> For Canadian properties we check
            Realtor.ca via the MLS feed. For US properties we check active MLS
            listings via Rentcast. Listings are typically refreshed within 24
            hours of going live.
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <div className="da-toast">{toast}</div>}
    </>
  );
}
