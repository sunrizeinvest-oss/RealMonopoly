import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─── Province Detection ───────────────────────────────────────────────────────
function detectProvince(addr) {
  const a = addr.toUpperCase();
  if (/\bBC\b/.test(a) || /VANCOUVER|VICTORIA|KELOWNA|BURNABY/.test(a)) return "BC";
  if (/\bAB\b/.test(a) || /CALGARY|EDMONTON/.test(a)) return "AB";
  if (/\bON\b/.test(a) || /TORONTO|OTTAWA|HAMILTON/.test(a)) return "ON";
  if (/\bQC\b/.test(a) || /MONTREAL/.test(a)) return "QC";
  return "CA";
}

// ─── Signal Definitions ───────────────────────────────────────────────────────
function buildSignals(province, address) {
  const enc = encodeURIComponent(address);

  const courtLink =
    province === "BC" ? "https://www.courtservicesonline.gov.bc.ca"
    : province === "AB" ? "https://www.albertacourts.ca"
    : province === "ON" ? "https://www.ontario.ca/page/superior-court-justice"
    : "https://www.justice.gc.ca/eng/fl-df/index.html";

  const titleLink =
    province === "BC" ? "https://ltsa.ca/professionals/bc-online/"
    : province === "AB" ? "https://alta.alberta.ca/app/LTO"
    : province === "ON" ? "https://www.ontario.ca/page/ontario-land-registry-access"
    : "https://www.canada.ca/en/services/finance/mortgages.html";

  const corpLink =
    province === "BC" ? "https://www.bcregistry.gov.bc.ca"
    : province === "AB" ? "https://www.alberta.ca/corporate-registries"
    : province === "ON" ? "https://www.ontario.ca/page/business-registry"
    : "https://www.canada.ca/en/services/business/registering.html";

  const probateLink =
    province === "BC" ? "https://www.bclaws.gov.bc.ca/civix/content/complete/statreg/?xsl=/templates/browse.xsl#74"
    : province === "AB" ? "https://www.albertacourts.ca/qb/areas-of-law/surrogate-court"
    : province === "ON" ? "https://www.ontario.ca/page/apply-probate"
    : "https://www.canada.ca/en/public-health/services/publications/death.html";

  const assessmentLink =
    province === "BC" ? "https://www.bcassessment.ca"
    : province === "AB" ? "https://www.alberta.ca/assessment.aspx"
    : province === "ON" ? "https://www.mpac.ca"
    : "https://www.canada.ca/en/services/finance/personal-income-tax/property-tax.html";

  const zoningLink =
    province === "BC" ? "https://vancouver.ca/home-property-development/zoning-and-land-use-policies.aspx"
    : province === "AB" ? "https://www.calgary.ca/pda/pd/land-use-districts/land-use-bylaw.html"
    : province === "ON" ? "https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-review/"
    : "https://www.canada.ca/en/services/environment/land-use.html";

  return [
    {
      id: "tax_delinquent",
      icon: "🏛️",
      name: "Tax Delinquent / Tax Sale",
      desc: "Property taxes in arrears 1+ years",
      url: `https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/provincial-territorial-income-tax-deductions.html`,
      urlLabel: "Municipal Tax Office",
    },
    {
      id: "foreclosure",
      icon: "⚖️",
      name: "Foreclosure / Power of Sale",
      desc: "Filed with provincial court services",
      url: courtLink,
      urlLabel: province === "BC" ? "BC Court Services" : province === "AB" ? "Alberta Courts" : province === "ON" ? "Ontario Superior Court" : "Federal Courts",
    },
    {
      id: "liens",
      icon: "📋",
      name: "Builder's Liens / Judgment Liens",
      desc: "Unpaid contractor or court judgment on title",
      url: titleLink,
      urlLabel: province === "BC" ? "BC Online / LTSA" : province === "AB" ? "Alberta Land Titles" : "Ontario Land Registry",
    },
    {
      id: "over_encumbered",
      icon: "💰",
      name: "3+ Mortgages / Over-Encumbered",
      desc: "Total charges may exceed property value",
      url: titleLink,
      urlLabel: "Title Search Portal",
    },
    {
      id: "numbered_company",
      icon: "🏢",
      name: "Numbered Company — No Recent Filings",
      desc: "Corporate owner with 2+ years no filings",
      url: corpLink,
      urlLabel: province === "BC" ? "BC Registry" : province === "AB" ? "Alberta Corp Registry" : "Ontario Business Registry",
    },
    {
      id: "probate",
      icon: "🪦",
      name: "Probate / Estate Sale",
      desc: "Deceased owner — estate is managing property",
      url: probateLink,
      urlLabel: "Probate Court",
    },
    {
      id: "long_term_owner",
      icon: "👴",
      name: "Long-Term Owner (25+ Yrs) + Senior",
      desc: "High equity, potential motivation to sell",
      url: assessmentLink,
      urlLabel: province === "BC" ? "BC Assessment" : province === "AB" ? "Alberta Assessment" : "MPAC",
    },
    {
      id: "empty_homes",
      icon: "🏚️",
      name: "Empty Homes Tax Declaration (Vancouver)",
      desc: "Vacant 2+ years — EHT or SVT registered",
      url: "https://vancouver.ca/home-property-development/empty-homes-tax.aspx",
      urlLabel: "Vancouver EHT Portal",
    },
    {
      id: "non_resident",
      icon: "🌍",
      name: "Non-Resident / Offshore Owner",
      desc: "FINTRAC and foreign buyer considerations",
      url: "https://www.fintrac-canafe.gc.ca/intro-eng",
      urlLabel: "FINTRAC Registry",
    },
    {
      id: "assembly_potential",
      icon: "🅿️",
      name: "Surface Parking / Gas Station / 1-2 Storey in Tower Zone",
      desc: "Assembly or redevelopment potential",
      url: zoningLink,
      urlLabel: province === "BC" ? "Vancouver Zoning Map" : "City Land Use Map",
    },
    {
      id: "mls_expired",
      icon: "📉",
      name: "MLS Expired or Cancelled (24 Months)",
      desc: "Motivated seller — price reduction likely",
      url: `https://www.realtor.ca/map#view=list&Sort=6-D&GeoIds=&GeoName=${enc}&PropertyTypeGroupID=1&TransactionTypeId=2`,
      urlLabel: "Realtor.ca Search",
    },
    {
      id: "portfolio_seller",
      icon: "🔢",
      name: "Owner Holds 4+ Properties",
      desc: "Portfolio seller — bulk deal potential",
      url: assessmentLink,
      urlLabel: province === "BC" ? "BC Assessment" : "Assessment Portal",
    },
    {
      id: "cra_lien",
      icon: "💸",
      name: "CRA / Tax Lien",
      desc: "Canada Revenue Agency debt registered on title",
      url: "https://www.canada.ca/en/revenue-agency.html",
      urlLabel: "Canada Revenue Agency",
    },
    {
      id: "code_violations",
      icon: "🏗️",
      name: "Active Code Violations / Demo Order",
      desc: "Outstanding building inspection orders",
      url: province === "BC"
        ? "https://vancouver.ca/home-property-development/building-and-renovation-permit-process.aspx"
        : province === "AB"
        ? "https://www.calgary.ca/pda/pd/current-planning/building-safety-approvals/home.html"
        : "https://www.toronto.ca/business-economy/building-construction/building-permit-applications/",
      urlLabel: "City Building Inspection",
    },
    {
      id: "days_on_market",
      icon: "⏰",
      name: "Days on Market 90+",
      desc: "Extended listing — seller may be motivated",
      url: `https://www.realtor.ca/map#view=list&Sort=6-D&GeoIds=&GeoName=${enc}&PropertyTypeGroupID=1&TransactionTypeId=2`,
      urlLabel: "Realtor.ca Search",
    },
  ];
}

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "not_checked", label: "Not Checked", color: "#6b7d96" },
  { value: "clear",       label: "Clear ✓",     color: "#34d98a" },
  { value: "flagged",     label: "⚠️ Flagged",   color: "#f25c5c" },
  { value: "na",          label: "N/A",          color: "#3a4a60" },
];

const STORAGE_KEY   = "rde_distress_v1";
const PIPELINE_KEY  = "rde_pipeline_v1";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#07090f;--card:#0d1119;--card2:#0a0e18;
    --borderf:rgba(255,255,255,0.07);--text:#dde4ef;
    --sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff;
    --green:#34d98a;--red:#f25c5c;--amber:#f0a030;--purple:#a782ff
  }
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* Nav */
  .dc-nav{position:sticky;top:0;z-index:200;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 20px;height:54px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .dc-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;letter-spacing:-0.4px;flex-shrink:0}
  .dc-logo span{color:var(--blue)}
  .dc-nav-links{display:flex;align-items:center;gap:2px}
  .dc-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px;white-space:nowrap;border:1px solid transparent;transition:all 0.15s}
  .dc-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.04)}
  .dc-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.1);border-color:rgba(59,158,255,0.2);font-weight:700}

  /* Page */
  .dc-page{max-width:860px;margin:0 auto;padding:32px 20px 80px}

  /* Hero input */
  .dc-hero{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:28px 28px 24px;margin-bottom:24px}
  .dc-hero-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:4px}
  .dc-hero-sub{font-size:14px;color:var(--sub);margin-bottom:20px;line-height:1.5}
  .dc-addr-row{display:flex;gap:10px}
  .dc-addr-input{flex:1;background:var(--card2);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:14px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s,box-shadow 0.15s}
  .dc-addr-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}
  .dc-addr-input::placeholder{color:var(--dim)}
  .dc-start-btn{background:var(--blue);color:#fff;border:none;border-radius:10px;padding:0 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:background 0.15s;flex-shrink:0}
  .dc-start-btn:hover{background:#5aaeff}
  .dc-start-btn:disabled{background:#2a4a6b;cursor:not-allowed}

  /* Property header */
  .dc-prop-header{display:flex;align-items:center;gap:12px;padding:16px 20px;background:rgba(59,158,255,0.07);border:1px solid rgba(59,158,255,0.2);border-radius:12px;margin-bottom:20px}
  .dc-prop-icon{font-size:22px;flex-shrink:0}
  .dc-prop-addr{font-size:16px;font-weight:700;color:var(--text);letter-spacing:-0.3px}
  .dc-prop-prov{font-size:11px;font-weight:700;color:var(--blue);background:rgba(59,158,255,0.12);border:1px solid rgba(59,158,255,0.25);border-radius:99px;padding:2px 10px;margin-left:4px}
  .dc-prop-change{margin-left:auto;background:transparent;border:1px solid var(--borderf);border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--sub);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;flex-shrink:0}
  .dc-prop-change:hover{color:var(--text);border-color:rgba(255,255,255,0.15)}

  /* Summary bar */
  .dc-summary{display:flex;align-items:center;gap:0;background:var(--card);border:1px solid var(--borderf);border-radius:12px;margin-bottom:16px;overflow:hidden}
  .dc-sum-stat{padding:14px 18px;border-right:1px solid var(--borderf);flex-shrink:0;text-align:center;min-width:90px}
  .dc-sum-stat:last-child{border-right:none}
  .dc-sum-val{font-size:20px;font-weight:800;color:var(--text);line-height:1;letter-spacing:-0.5px}
  .dc-sum-lbl{font-size:10px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;margin-top:3px}
  .dc-save-btn{margin-left:auto;margin-right:14px;background:var(--green);color:#07090f;border:none;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;flex-shrink:0;transition:all 0.15s;white-space:nowrap}
  .dc-save-btn:hover{background:#4febb0}
  .dc-save-btn.saved{background:#1a4a35;color:var(--green);cursor:default}

  /* Checklist */
  .dc-checklist{display:flex;flex-direction:column;gap:6px}

  /* Signal row */
  .dc-row{background:var(--card);border:1px solid var(--borderf);border-radius:12px;padding:14px 16px;transition:border-color 0.15s}
  .dc-row:hover{border-color:rgba(255,255,255,0.12)}
  .dc-row.status-clear{border-color:rgba(52,217,138,0.2);background:rgba(52,217,138,0.03)}
  .dc-row.status-flagged{border-color:rgba(242,92,92,0.25);background:rgba(242,92,92,0.04)}
  .dc-row.status-na{opacity:0.55}
  .dc-row-top{display:flex;align-items:center;gap:10px}
  .dc-row-icon{font-size:18px;flex-shrink:0;width:28px;text-align:center}
  .dc-row-info{flex:1;min-width:0}
  .dc-row-name{font-size:13px;font-weight:700;color:var(--text);line-height:1.3}
  .dc-row-desc{font-size:11px;color:var(--sub);margin-top:1px;line-height:1.4}
  .dc-row-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .dc-status-badge{font-size:10px;font-weight:700;border-radius:99px;padding:3px 10px;white-space:nowrap;border:1px solid;cursor:default}
  .dc-research-btn{font-size:11px;font-weight:700;color:var(--blue);background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:7px;padding:6px 11px;text-decoration:none;white-space:nowrap;transition:all 0.15s;display:inline-flex;align-items:center;gap:4px;cursor:pointer}
  .dc-research-btn:hover{background:rgba(59,158,255,0.18);border-color:rgba(59,158,255,0.4)}
  .dc-row-bottom{display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04)}
  .dc-status-sel{background:var(--card2);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:5px 8px;font-size:11px;font-weight:600;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;cursor:pointer;flex-shrink:0;transition:border-color 0.15s}
  .dc-status-sel:focus{border-color:rgba(59,158,255,0.4)}
  .dc-notes-inp{flex:1;background:var(--card2);border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:5px 10px;font-size:12px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;min-width:0}
  .dc-notes-inp:focus{border-color:rgba(59,158,255,0.35)}
  .dc-notes-inp::placeholder{color:var(--dim)}

  /* Toast */
  .dc-toast{position:fixed;bottom:28px;right:28px;background:#1a4a35;border:1px solid rgba(52,217,138,0.3);border-radius:12px;padding:14px 20px;font-size:13px;font-weight:600;color:var(--green);z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:dcSlideIn 0.25s ease;pointer-events:none}
  @keyframes dcSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

  /* Empty state */
  .dc-empty{text-align:center;padding:60px 20px}
  .dc-empty-icon{font-size:40px;margin-bottom:12px}
  .dc-empty-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px}
  .dc-empty-sub{font-size:14px;color:var(--sub);line-height:1.6}

  /* Province pill */
  .dc-prov-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(167,130,255,0.1);border:1px solid rgba(167,130,255,0.25);border-radius:8px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--purple);margin-top:12px}

  /* Responsive */
  @media(max-width:640px){
    .dc-page{padding:16px 12px 60px}
    .dc-hero{padding:20px 16px 18px}
    .dc-hero-title{font-size:18px}
    .dc-addr-row{flex-direction:column}
    .dc-start-btn{padding:13px 0;width:100%}
    .dc-nav-links{display:none}
    .dc-summary{flex-wrap:wrap}
    .dc-sum-stat{min-width:70px;padding:10px 12px}
    .dc-sum-val{font-size:16px}
    .dc-save-btn{margin:8px 12px 12px;width:calc(100% - 24px)}
    .dc-row-actions{flex-wrap:wrap;justify-content:flex-end}
    .dc-row-bottom{flex-direction:column}
    .dc-status-sel{width:100%}
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function DistressChecker() {
  const navigate = useNavigate();

  const [inputAddr,  setInputAddr]  = useState("");
  const [address,    setAddress]    = useState("");
  const [province,   setProvince]   = useState("CA");
  const [signalState, setSignalState] = useState({}); // { [id]: { status, notes } }
  const [toast,      setToast]      = useState("");
  const [pipeSaved,  setPipeSaved]  = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Signals derived from current address + province
  const signals = useMemo(() => buildSignals(province, address), [province, address]);

  // ── Load persisted research ───────────────────────────────────────────────
  useEffect(() => {
    if (!address) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all = JSON.parse(raw);
      if (all[address]) {
        setSignalState(all[address].signals || {});
      } else {
        setSignalState({});
      }
    } catch {
      setSignalState({});
    }
  }, [address]);

  // ── Auto-save on every signal state change ────────────────────────────────
  useEffect(() => {
    if (!address || Object.keys(signalState).length === 0) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[address] = { signals: signalState, lastUpdated: today };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
  }, [signalState, address, today]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function startResearch() {
    const trimmed = inputAddr.trim();
    if (!trimmed) return;
    const prov = detectProvince(trimmed);
    setAddress(trimmed);
    setProvince(prov);
    setPipeSaved(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") startResearch();
  }

  function resetAddress() {
    setAddress("");
    setInputAddr("");
    setSignalState({});
    setPipeSaved(false);
  }

  function getSignal(id) {
    return signalState[id] || { status: "not_checked", notes: "" };
  }

  function setSignalStatus(id, status) {
    setSignalState(prev => ({
      ...prev,
      [id]: { ...getSignal(id), status },
    }));
  }

  function setSignalNotes(id, notes) {
    setSignalState(prev => ({
      ...prev,
      [id]: { ...getSignal(id), notes },
    }));
  }

  function openResearch(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let checked = 0, flagged = 0, clear = 0;
    signals.forEach(s => {
      const st = getSignal(s.id).status;
      if (st !== "not_checked") checked++;
      if (st === "flagged") flagged++;
      if (st === "clear")   clear++;
    });
    return { checked, flagged, clear, total: signals.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalState, signals]);

  // ── Save to Pipeline ──────────────────────────────────────────────────────
  function saveToPipeline() {
    const flaggedNames = signals
      .filter(s => getSignal(s.id).status === "flagged")
      .map(s => s.name);

    const entry = {
      id: Date.now(),
      address,
      stage: "lead",
      type: "flip",
      notes: flaggedNames.length
        ? `Distress signals: ${flaggedNames.join(", ")}`
        : "Distress research completed — no flags.",
      addedDate: today,
      stageDate: today,
    };

    try {
      const raw = localStorage.getItem(PIPELINE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift(entry);
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(existing));
    } catch {}

    setPipeSaved(true);
    showToast("Saved to Pipeline ✓");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Status badge styles ───────────────────────────────────────────────────
  function statusMeta(status) {
    return STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  }

  function rowClass(status) {
    if (status === "clear")   return "dc-row status-clear";
    if (status === "flagged") return "dc-row status-flagged";
    if (status === "na")      return "dc-row status-na";
    return "dc-row";
  }

  // ── Province label ────────────────────────────────────────────────────────
  const PROV_LABEL = {
    BC: "🏔️ British Columbia",
    AB: "🌾 Alberta",
    ON: "🍁 Ontario",
    QC: "⚜️ Québec",
    CA: "🇨🇦 Canada (generic)",
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <nav className="dc-nav">
        <a href="/" className="dc-logo"><span>Real</span> Deal</a>
        <div className="dc-nav-links">
          {[
            { href: "/analyze",  label: "Tools",    active: false },
            { href: "/pipeline", label: "Pipeline", active: false },
            { href: "/distress", label: "Distress", active: true  },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`dc-nav-link${item.active ? " active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="dc-page">

        {/* ── Hero / Address Input ── */}
        <div className="dc-hero">
          <div className="dc-hero-title">Distress Signal Research Tool</div>
          <div className="dc-hero-sub">
            Enter a Canadian property address to get a structured checklist of 15 distress signals with one-click links to the right data sources.
          </div>
          <div className="dc-addr-row">
            <input
              className="dc-addr-input"
              type="text"
              placeholder="e.g. 1234 Main St, Vancouver BC  or  789 Centre Ave, Calgary AB"
              value={inputAddr}
              onChange={e => setInputAddr(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="dc-start-btn"
              onClick={startResearch}
              disabled={!inputAddr.trim()}
            >
              Start Research →
            </button>
          </div>
          {address && (
            <div className="dc-prov-pill">
              Province detected: {PROV_LABEL[province]}
              &nbsp;— links have been tailored for this province
            </div>
          )}
        </div>

        {/* ── No address yet ── */}
        {!address && (
          <div className="dc-empty">
            <div className="dc-empty-icon">🔍</div>
            <div className="dc-empty-title">Enter a property address above</div>
            <div className="dc-empty-sub">
              The tool will detect your province (BC, AB, ON, QC) and pre-load<br />
              the correct court, title registry, and assessment links for each signal.
            </div>
          </div>
        )}

        {/* ── Researching a property ── */}
        {address && (
          <>
            {/* Property header */}
            <div className="dc-prop-header">
              <div className="dc-prop-icon">🏠</div>
              <div>
                <div className="dc-prop-addr">
                  {address}
                  <span className="dc-prop-prov">{province}</span>
                </div>
              </div>
              <button className="dc-prop-change" onClick={resetAddress}>
                Change Address
              </button>
            </div>

            {/* Summary bar */}
            <div className="dc-summary">
              <div className="dc-sum-stat">
                <div className="dc-sum-val">{stats.checked}<span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600 }}>/{stats.total}</span></div>
                <div className="dc-sum-lbl">Checked</div>
              </div>
              <div className="dc-sum-stat">
                <div className="dc-sum-val" style={{ color: stats.flagged > 0 ? "var(--red)" : "var(--dim)" }}>
                  {stats.flagged}
                </div>
                <div className="dc-sum-lbl">Flagged</div>
              </div>
              <div className="dc-sum-stat">
                <div className="dc-sum-val" style={{ color: stats.clear > 0 ? "var(--green)" : "var(--dim)" }}>
                  {stats.clear}
                </div>
                <div className="dc-sum-lbl">Clear</div>
              </div>
              <div className="dc-sum-stat">
                <div className="dc-sum-val" style={{ color: "var(--sub)" }}>
                  {stats.total - stats.checked}
                </div>
                <div className="dc-sum-lbl">Remaining</div>
              </div>
              <button
                className={`dc-save-btn${pipeSaved ? " saved" : ""}`}
                onClick={pipeSaved ? undefined : saveToPipeline}
              >
                {pipeSaved ? "✓ Saved to Pipeline" : "Save to Pipeline"}
              </button>
            </div>

            {/* Checklist */}
            <div className="dc-checklist">
              {signals.map((sig, idx) => {
                const { status, notes } = getSignal(sig.id);
                const sm = statusMeta(status);
                return (
                  <div key={sig.id} className={rowClass(status)}>
                    {/* Top row */}
                    <div className="dc-row-top">
                      <div className="dc-row-icon">{sig.icon}</div>
                      <div className="dc-row-info">
                        <div className="dc-row-name">
                          <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, marginRight: 5 }}>#{idx + 1}</span>
                          {sig.name}
                        </div>
                        <div className="dc-row-desc">{sig.desc}</div>
                      </div>
                      <div className="dc-row-actions">
                        {/* Status badge */}
                        <span
                          className="dc-status-badge"
                          style={{
                            color: sm.color,
                            borderColor: sm.color + "44",
                            background: sm.color + "11",
                          }}
                        >
                          {sm.label}
                        </span>
                        {/* Research button */}
                        <button
                          className="dc-research-btn"
                          onClick={() => openResearch(sig.url)}
                          title={`Open ${sig.urlLabel}`}
                        >
                          {sig.urlLabel} →
                        </button>
                      </div>
                    </div>

                    {/* Bottom row — status select + notes */}
                    <div className="dc-row-bottom">
                      <select
                        className="dc-status-sel"
                        value={status}
                        onChange={e => setSignalStatus(sig.id, e.target.value)}
                        style={{ color: sm.color }}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        className="dc-notes-inp"
                        type="text"
                        placeholder="Add notes… (e.g. confirmed with LTSA, 2 charges found)"
                        value={notes}
                        onChange={e => setSignalNotes(sig.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom save CTA */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={{ background: "transparent", border: "1px solid var(--borderf)", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "var(--sub)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                onClick={() => navigate("/pipeline")}
              >
                View Pipeline →
              </button>
              <button
                className={`dc-save-btn${pipeSaved ? " saved" : ""}`}
                onClick={pipeSaved ? undefined : saveToPipeline}
                style={{ margin: 0 }}
              >
                {pipeSaved ? "✓ Saved to Pipeline" : "Save to Pipeline"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="dc-toast">{toast}</div>}
    </div>
  );
}
