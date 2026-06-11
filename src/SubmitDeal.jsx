import { useState, useMemo } from "react";
import TopNav from "./components/TopNav";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const num = (v) => parseFloat((v || "").toString().replace(/[^0-9.]/g, "")) || 0;
const fmt = (n) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);

const STORAGE_KEY = "rde_pipeline_v1";

function mapPropertyTypeToPipelineType(pt) {
  if (pt === "Single Family") return "flip";
  if (pt === "Duplex" || pt === "Triplex" || pt === "Fourplex") return "multifamily";
  if (pt === "Apartment Building") return "multifamily";
  if (pt === "Commercial") return "wholesale";
  if (pt === "Land") return "wholesale";
  return "flip";
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght;500;600;700;800&family=Geist+Mono:wght;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #ffffff; color: var(--text); font-family: 'Geist', sans-serif; }

.sd-root {
  min-height: 100vh;
  background: #ffffff;
  color: var(--text);
  font-family: 'Geist', sans-serif;
}

/* Nav */
.sd-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(15,23,42,0.07);
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 100;
}
.sd-nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text);
}
.sd-nav-dot {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--blue), var(--purple));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.sd-nav-brand {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.sd-nav-divider {
  width: 1px;
  height: 18px;
  background: rgba(255,255,255,0.12);
}
.sd-nav-tagline {
  font-size: 13px;
  color: var(--sub);
  font-weight: 400;
}

/* Container */
.sd-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

/* Hero */
.sd-hero {
  text-align: center;
  margin-bottom: 36px;
}
.sd-hero h1 {
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 700;
  letter-spacing: -0.8px;
  color: var(--text);
  margin-bottom: 12px;
  line-height: 1.15;
}
.sd-hero-sub {
  font-size: 16px;
  color: var(--sub);
  line-height: 1.6;
  max-width: 480px;
  margin: 0 auto 24px;
}
.sd-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.sd-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  background: #f8fafc;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

/* Card */
.sd-card {
  background: #f8fafc;
  border: 1px solid rgba(15,23,42,0.07);
  border-radius: 16px;
  padding: 28px 28px 24px;
  margin-bottom: 16px;
}
@media (max-width: 500px) {
  .sd-card { padding: 20px 16px; }
}
.sd-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 20px;
}

/* Form grid */
.sd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 520px) {
  .sd-grid { grid-template-columns: 1fr; }
}
.sd-full { grid-column: 1 / -1; }

.sd-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sd-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--sub);
  display: flex;
  align-items: center;
  gap: 4px;
}
.sd-required {
  color: var(--red);
  font-size: 12px;
}
.sd-hint {
  font-size: 11px;
  color: var(--dim);
  margin-top: -2px;
  line-height: 1.4;
}
input.sd-input,
select.sd-input,
textarea.sd-input {
  background: #f1f5f9;
  border: 1px solid rgba(15,23,42,0.07);
  border-radius: 10px;
  color: var(--text);
  font-family: 'Geist', sans-serif;
  font-size: 14px;
  padding: 10px 14px;
  width: 100%;
  transition: border-color 0.15s;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
}
input.sd-input::placeholder,
textarea.sd-input::placeholder { color: var(--dim); }
input.sd-input:focus,
select.sd-input:focus,
textarea.sd-input:focus {
  border-color: rgba(59,158,255,0.45);
  background: #0b1020;
}
input.sd-input.error,
select.sd-input.error,
textarea.sd-input.error {
  border-color: rgba(242,92,92,0.5);
}
select.sd-input option { background: #f8fafc; color: var(--text); }
textarea.sd-input { resize: vertical; min-height: 88px; }

/* Radio group */
.sd-radio-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sd-radio-btn {
  flex: 1;
  min-width: 80px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(15,23,42,0.07);
  background: #f1f5f9;
  color: var(--sub);
  font-family: 'Geist', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.sd-radio-btn.active {
  background: rgba(59,158,255,0.12);
  border-color: rgba(59,158,255,0.4);
  color: var(--blue);
}

/* Deal Score */
.sd-score {
  background: #f1f5f9;
  border: 1px solid rgba(15,23,42,0.07);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.sd-score-label {font-family:'Geist Mono',ui-monospace,monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--sub);
  margin-bottom: 4px;
}
.sd-score-value {font-family:'Geist Mono',ui-monospace,monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.sd-score-pct {
  font-size: 13px;
  margin-left: 8px;
  font-weight: 500;
}
.sd-score-icon {
  font-size: 28px;
  flex-shrink: 0;
}

/* Submit btn */
.sd-submit-btn {
  width: 100%;
  padding: 16px 24px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, var(--blue), var(--purple));
  color: #fff;
  font-family: 'Geist', sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: -0.2px;
  transition: opacity 0.15s, transform 0.1s;
  margin-top: 8px;
  -webkit-tap-highlight-color: transparent;
}
.sd-submit-btn:hover { opacity: 0.9; }
.sd-submit-btn:active { transform: scale(0.98); }
.sd-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Error banner */
.sd-error-banner {
  background: rgba(242,92,92,0.1);
  border: 1px solid rgba(242,92,92,0.3);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--red);
  margin-bottom: 16px;
  line-height: 1.5;
}

/* Success screen */
.sd-success {
  text-align: center;
  padding: 60px 20px;
}
.sd-success-icon {
  font-size: 56px;
  margin-bottom: 20px;
  display: block;
}
.sd-success h2 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.4px;
  margin-bottom: 12px;
  color: var(--text);
}
.sd-success-sub {
  font-size: 15px;
  color: var(--sub);
  max-width: 400px;
  margin: 0 auto 32px;
  line-height: 1.6;
}
.sd-success-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.sd-success-link {
  display: inline-block;
  padding: 13px 28px;
  background: rgba(59,158,255,0.12);
  border: 1px solid rgba(59,158,255,0.3);
  border-radius: 10px;
  color: var(--blue);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}
.sd-success-link:hover { background: rgba(59,158,255,0.2); }
.sd-success-again {
  background: none;
  border: none;
  color: var(--sub);
  font-family: 'Geist', sans-serif;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  padding: 4px;
}
`;

// ─── Blank form state ─────────────────────────────────────────────────────────
const BLANK = {
  address: "",
  city: "",
  propertyType: "",
  bedrooms: "",
  bathrooms: "",
  sqft: "",
  yearBuilt: "",
  lotSize: "",
  askingPrice: "",
  arv: "",
  repairs: "",
  dealNotes: "",
  dealSource: "",
  motivated: "",
  sellerSituation: "",
  urgency: "",
  name: "",
  email: "",
  phone: "",
  isSeller: "",
  finderFee: "",
  heardAbout: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubmitDeal() {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inject CSS once
  useMemo(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("sd-styles")) return;
    const style = document.createElement("style");
    style.id = "sd-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);

  // ─── Deal score preview ──────────────────────────────────────────────────
  const score = useMemo(() => {
    const ask = num(form.askingPrice);
    const arv = num(form.arv);
    if (!ask || !arv || arv <= 0) return null;
    const spread = arv - ask;
    const margin = spread / arv;
    let color = "var(--red)";
    let emoji = "🔴";
    if (margin >= 0.2) { color = "var(--green)"; emoji = "🟢"; }
    else if (margin >= 0.1) { color = "var(--amber)"; emoji = "🟡"; }
    return { spread, margin, color, emoji };
  }, [form.askingPrice, form.arv]);

  // ─── Field helpers ───────────────────────────────────────────────────────
  const set = (key) => (e) => {
    const val = e.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const setRadio = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
  };

  // ─── Validate ────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.address.trim()) e.address = true;
    if (!form.city.trim()) e.city = true;
    if (!form.propertyType) e.propertyType = true;
    if (!form.askingPrice.toString().trim()) e.askingPrice = true;
    if (!form.name.trim()) e.name = true;
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = true;
    return e;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstErr = document.querySelector(".error");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);

    const ask = num(form.askingPrice);
    const arv = num(form.arv);
    const repairs = num(form.repairs);
    const spread = arv && ask ? arv - ask : undefined;

    const deal = {
      id: Date.now(),
      address: form.address.trim(),
      city: form.city.trim(),
      type: mapPropertyTypeToPipelineType(form.propertyType),
      stage: "lead",
      source: "Submitted by " + (form.dealSource || "Other"),
      askingPrice: ask || "",
      arv: arv || "",
      repairCosts: repairs || "",
      projectedProfit: spread !== undefined ? spread : "",
      notes: [
        `Submitted by ${form.name.trim()} (${form.email.trim()}${form.phone ? ", " + form.phone : ""}).`,
        form.sellerSituation ? `Situation: ${form.sellerSituation}.` : "",
        form.urgency ? `Urgency: ${form.urgency}.` : "",
        form.motivated ? `Motivated: ${form.motivated}.` : "",
        form.dealNotes ? `Notes: ${form.dealNotes}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      addedDate: today(),
      stageDate: today(),
      submittedBy: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        finderFee: form.finderFee.trim(),
      },
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      existing.push(deal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (_) {
      // localStorage unavailable — still show success
    }

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  }

  // ─── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="sd-root">
        <Nav />
        <div className="sd-container">
          <div className="sd-success">
            <span className="sd-success-icon">🎉</span>
            <h2>Deal Submitted!</h2>
            <p className="sd-success-sub">
              We'll review it within 24 hours and reach out if we're interested. Keep an eye on your inbox — big things could be coming.
            </p>
            <div className="sd-success-cta">
              <a className="sd-success-link" href="/analyze">
                Want to analyze deals yourself? Try RizeAI free →
              </a>
              <button
                className="sd-success-again"
                onClick={() => {
                  setForm(BLANK);
                  setErrors({});
                  setSubmitted(false);
                }}
              >
                Submit another deal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  // ─── Main form ───────────────────────────────────────────────────────────
  return (
    <div className="sd-root">
      <Nav />
      <div className="sd-container">

        {/* Hero */}
        <div className="sd-hero">
          <h1>Submit a Deal</h1>
          <p className="sd-hero-sub">
            Found an off-market property? Submit it here. If we close, you earn a finder's fee.
          </p>
          <div className="sd-pills">
            <span className="sd-pill">🤝 Finder's Fee Paid</span>
            <span className="sd-pill">🇨🇦 Canada-Wide</span>
            <span className="sd-pill">⚡ 24hr Response</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Property Info ── */}
          <div className="sd-card">
            <div className="sd-card-title">Property Info</div>
            <div className="sd-grid">
              <div className="sd-field sd-full">
                <label className="sd-label">
                  Property Address <span className="sd-required">*</span>
                </label>
                <input
                  className={`sd-input${errors.address ? " error" : ""}`}
                  type="text"
                  placeholder="123 Main St, Edmonton, AB"
                  value={form.address}
                  onChange={set("address")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">
                  City / Market <span className="sd-required">*</span>
                </label>
                <input
                  className={`sd-input${errors.city ? " error" : ""}`}
                  type="text"
                  placeholder="Edmonton"
                  value={form.city}
                  onChange={set("city")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">
                  Property Type <span className="sd-required">*</span>
                </label>
                <select
                  className={`sd-input${errors.propertyType ? " error" : ""}`}
                  value={form.propertyType}
                  onChange={set("propertyType")}
                >
                  <option value="">Select type…</option>
                  {["Single Family","Duplex","Triplex","Fourplex","Apartment Building","Commercial","Land","Other"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="sd-field">
                <label className="sd-label">Bedrooms</label>
                <select className="sd-input" value={form.bedrooms} onChange={set("bedrooms")}>
                  <option value="">Select…</option>
                  {["1","2","3","4","5","6+"].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="sd-field">
                <label className="sd-label">Bathrooms</label>
                <select className="sd-input" value={form.bathrooms} onChange={set("bathrooms")}>
                  <option value="">Select…</option>
                  {["1","1.5","2","2.5","3","3.5","4+"].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="sd-field">
                <label className="sd-label">Square Footage</label>
                <input
                  className="sd-input"
                  type="number"
                  placeholder="1,400"
                  value={form.sqft}
                  onChange={set("sqft")}
                  min="0"
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">Year Built</label>
                <input
                  className="sd-input"
                  type="number"
                  placeholder="1985"
                  value={form.yearBuilt}
                  onChange={set("yearBuilt")}
                  min="1800"
                  max="2030"
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">Lot Size</label>
                <input
                  className="sd-input"
                  type="text"
                  placeholder="5,000 sqft or 0.5 acres"
                  value={form.lotSize}
                  onChange={set("lotSize")}
                />
              </div>
            </div>
          </div>

          {/* ── Deal Economics ── */}
          <div className="sd-card">
            <div className="sd-card-title">Deal Economics</div>
            <div className="sd-grid">
              <div className="sd-field">
                <label className="sd-label">
                  Asking / Seller's Price <span className="sd-required">*</span>
                </label>
                <input
                  className={`sd-input${errors.askingPrice ? " error" : ""}`}
                  type="text"
                  placeholder="$250,000"
                  value={form.askingPrice}
                  onChange={set("askingPrice")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">Your Estimated ARV</label>
                <span className="sd-hint">After Repair Value — what's it worth fixed up?</span>
                <input
                  className="sd-input"
                  type="text"
                  placeholder="$350,000"
                  value={form.arv}
                  onChange={set("arv")}
                />
              </div>

              <div className="sd-field sd-full">
                <label className="sd-label">Estimated Repairs Needed</label>
                <input
                  className="sd-input"
                  type="text"
                  placeholder="$30,000"
                  value={form.repairs}
                  onChange={set("repairs")}
                />
              </div>

              <div className="sd-field sd-full">
                <label className="sd-label">Reason it's a good deal</label>
                <span className="sd-hint">Why is this a deal? Motivated seller? Below market? Development potential?</span>
                <textarea
                  className="sd-input"
                  placeholder="Seller needs to relocate quickly, asking $60k below assessed value…"
                  value={form.dealNotes}
                  onChange={set("dealNotes")}
                />
              </div>

              <div className="sd-field sd-full">
                <label className="sd-label">Deal Source</label>
                <select className="sd-input" value={form.dealSource} onChange={set("dealSource")}>
                  <option value="">Select…</option>
                  {["Off-Market","Driving for Dollars","Direct Mail","MLS","Wholesale","Estate Sale","Pre-foreclosure","Other"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Deal Score Preview */}
          {score && (
            <div className="sd-score">
              <span className="sd-score-icon">{score.emoji}</span>
              <div>
                <div className="sd-score-label">Deal Score Preview</div>
                <div className="sd-score-value" style={{ color: score.color }}>
                  {fmt(score.spread)}
                  <span className="sd-score-pct" style={{ color: score.color }}>
                    ({(score.margin * 100).toFixed(1)}% margin)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>
                  Potential spread between asking price and ARV
                </div>
              </div>
            </div>
          )}

          {/* ── Seller Situation ── */}
          <div className="sd-card">
            <div className="sd-card-title">Seller Situation</div>
            <div className="sd-grid">
              <div className="sd-field sd-full">
                <label className="sd-label">Is the seller motivated?</label>
                <div className="sd-radio-group">
                  {["Yes","Somewhat","Unknown"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`sd-radio-btn${form.motivated === opt ? " active" : ""}`}
                      onClick={() => setRadio("motivated", opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sd-field">
                <label className="sd-label">Seller's situation</label>
                <select className="sd-input" value={form.sellerSituation} onChange={set("sellerSituation")}>
                  <option value="">Select…</option>
                  {["Relocation","Divorce","Estate/Probate","Financial Hardship","Tired Landlord","Job Loss","Other","Unknown"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sd-field">
                <label className="sd-label">How quickly does seller want to close?</label>
                <select className="sd-input" value={form.urgency} onChange={set("urgency")}>
                  <option value="">Select…</option>
                  {["ASAP (<30 days)","30-60 days","60-90 days","Flexible"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Submitter Info ── */}
          <div className="sd-card">
            <div className="sd-card-title">Your Info</div>
            <div className="sd-grid">
              <div className="sd-field">
                <label className="sd-label">
                  Your Name <span className="sd-required">*</span>
                </label>
                <input
                  className={`sd-input${errors.name ? " error" : ""}`}
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">
                  Your Email <span className="sd-required">*</span>
                </label>
                <input
                  className={`sd-input${errors.email ? " error" : ""}`}
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">Your Phone (optional)</label>
                <input
                  className="sd-input"
                  type="tel"
                  placeholder="+1 (780) 555-0100"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>

              <div className="sd-field">
                <label className="sd-label">Finder's fee expectation</label>
                <span className="sd-hint">What are you expecting if we close?</span>
                <input
                  className="sd-input"
                  type="text"
                  placeholder="$5,000"
                  value={form.finderFee}
                  onChange={set("finderFee")}
                />
              </div>

              <div className="sd-field sd-full">
                <label className="sd-label">Are you the seller?</label>
                <div className="sd-radio-group">
                  {["Yes","No","I'm representing the seller"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`sd-radio-btn${form.isSeller === opt ? " active" : ""}`}
                      onClick={() => setRadio("isSeller", opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sd-field sd-full">
                <label className="sd-label">How did you hear about us?</label>
                <div className="sd-radio-group">
                  {["Instagram","TikTok","Friend","Google","Other"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`sd-radio-btn${form.heardAbout === opt ? " active" : ""}`}
                      onClick={() => setRadio("heardAbout", opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {hasErrors && (
            <div className="sd-error-banner">
              Please fill in the required fields: {[
                errors.address && "Property Address",
                errors.city && "City / Market",
                errors.propertyType && "Property Type",
                errors.askingPrice && "Asking Price",
                errors.name && "Your Name",
                errors.email && "Your Email",
              ].filter(Boolean).join(", ")}.
            </div>
          )}

          <button type="submit" className="sd-submit-btn" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Deal →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--dim)", marginTop: 16, lineHeight: 1.5 }}>
            By submitting, you agree that RizeAI Estate may contact you about this property. We respect your privacy and never share your info.
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <TopNav />
  );
}
